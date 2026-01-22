import { Command, CommandAction, GroupCommand } from './command';
import { FlagsGroup, ValueFlag } from './flags';

/**
 * Represents the result of parsing a command-line input.
 * Contains the matched command, parsed arguments, and resolved flags.
 */
export class ParseResult {
   public constructor(
      /** The command that was matched */
      public readonly command: Command,
      /** The positional arguments passed to the command */
      public readonly args: any[],
      /** Map of resolved flags and their values */
      public readonly flags: Map<ValueFlag<unknown>, unknown>
   ) {}

   /**
    * Gets the value of a flag, falling back to its default if not provided.
    * @template T - The type of the flag value
    * @param flag - The flag to retrieve
    * @returns The flag value or its default value
    */
   public getValue<T>(flag: ValueFlag<T>): T {
      return (this.flags.get(flag) as T | null) ?? flag.defaultValue!;
   }

   /**
    * Gets the executable function for this command if it's an action command.
    * @returns The bound action function or null if this is a group command
    */
   public getExecutable(): (() => unknown) | null {
      if ('action' in this.command && typeof this.command['action'] === 'function')
         return this.command.action.bind(null, this, ...this.args);

      return null;
   }
}

/**
 * Error thrown during command-line parsing.
 * Contains context about where and why parsing failed.
 */
export class ParserError extends Error {
   public readonly command: Command;
   public readonly argv: string[];
   public readonly index: number;
   public flags: Set<ValueFlag<unknown>> | null;

   public constructor(
      command: Command,
      message: string,
      argv: string[],
      index: number,
      flags?: Set<ValueFlag<unknown>>
   ) {
      super(message);
      this.command = command;
      this.name = new.target.name;
      this.argv = argv;
      this.index = index;
      this.flags = flags ?? null;
   }
}

/**
 * Parses command-line arguments into commands, flags, and positional arguments.
 */
export class CommandsParser {
   private readonly argv: string[];
   private index: number;
   private lastError: string | null = null;

   public constructor(argv: string[], index: number) {
      this.argv = argv;
      this.index = index;
   }

   /**
    * Parses the provided command against the command-line arguments.
    * @param command - The command to parse
    * @returns The parse result containing the matched command and parsed values
    * @throws {ParserError} If parsing fails
    */
   public parse(command: Command): ParseResult {
      if (command instanceof GroupCommand) {
         return this.parseGroupCommand(command);
      } else if (command instanceof CommandAction) {
         return this.parseActionCommand(command);
      } else {
         throw new ParserError(command, 'Unsupported command type', this.argv, this.index);
      }
   }

   private parseGroupCommand(command: GroupCommand): ParseResult {
      const RESULT = new ParseResult(command, [], new Map());
      let argument = this.getArgument();
      if (!argument) {
         if (!command.action)
            throw new ParserError(
               command,
               `Expected subcommand name, received none: ${command.getFullPathName()}`,
               this.argv,
               this.index
            );

         return new ParseResult(command, [], new Map());
      }

      if (argument.startsWith('-')) {
         // Might just ask for help command
         while ((argument = this.getArgument())) {
            const flag = CommandsParser.parseFlag(argument);
            if (!flag) break;

            const result = this.resolveFlag(command.flags, flag, this.getArgument(1));
            if (!result)
               if (this.getLastError())
                  throw new ParserError(
                     command,
                     this.getLastError()!,
                     this.argv,
                     this.index,
                     new Set(RESULT.flags.keys())
                  );
               else
                  throw new ParserError(
                     command,
                     'Failed to resolve tag with name: ' + flag.name,
                     this.argv,
                     this.index,
                     new Set(RESULT.flags.keys())
                  );

            const { flag: FLAG_TYPE, nextValueUsed, value } = result;

            // shift the arguments cursor
            this.index++;
            if (nextValueUsed) this.index++;
            RESULT.flags.set(FLAG_TYPE, value);
         }

         if (!argument) return RESULT;
      }

      const sub = argument.toLowerCase();
      const cmd = command.subcommands.get(sub);
      if (!cmd) {
         throw new ParserError(
            command,
            `Unknown subcommand: ${command.getFullPathName()} >>${sub}<<`,
            this.argv,
            this.index,
            new Set(RESULT.flags.keys())
         );
      }

      this.index++;
      try {
         const HRESULT = this.parse(cmd);
         for (const flag of RESULT.flags.keys())
            if (!HRESULT.flags.has(flag)) HRESULT.flags.set(flag, RESULT.flags.get(flag)!);
         return HRESULT;
      } catch (error) {
         if (error instanceof ParserError) {
            const flags = error.flags;
            if (flags) RESULT.flags.keys().forEach(_ => flags.add(_));
            else error.flags = new Set(RESULT.flags.keys());
         }
         throw error;
      }
   }

   private parseActionCommand(command: CommandAction<unknown[]>): ParseResult {
      const positionals: string[] = [];
      let argument: string | null;
      const FLAGS_MAP: ParseResult['flags'] = new Map();
      // Might just ask for help command
      while ((argument = this.getArgument())) {
         const flag = CommandsParser.parseFlag(argument);
         this.index++;
         if (!flag) {
            positionals.push(argument);
            continue;
         }
         const result = this.resolveFlag(command.flags, flag, this.getArgument());
         if (!result) {
            if (this.getLastError())
               throw new ParserError(
                  command,
                  this.getLastError()!,
                  this.argv,
                  this.index,
                  new Set(FLAGS_MAP.keys())
               );
            else {
               positionals.push(argument);
               continue;
            }
         }

         const { flag: FLAG_TYPE, nextValueUsed, value } = result;

         // shift the arguments cursor
         if (nextValueUsed) this.index++;
         FLAGS_MAP.set(FLAG_TYPE, value);
      }

      const finalArgs: any[] = [];
      for (let idx = 0; idx < command.argumentsTypes.length; idx++) {
         const def = command.argumentsTypes[idx]!;
         const posVal = positionals[idx];
         if (typeof posVal === 'undefined') {
            if (def.isRequired()) {
               throw new ParserError(
                  command,
                  `Missing required argument: ${command.getFullPathName()} ... ${def.toString()}`,
                  this.argv,
                  this.index,
                  new Set(FLAGS_MAP.keys())
               );
            }
            finalArgs.push(def.defaultValue);
         } else {
            if (!def.validator.isValid(posVal)) {
               throw new ParserError(
                  command,
                  `Invalid value: ${posVal}`,
                  this.argv,
                  this.index,
                  new Set(FLAGS_MAP.keys())
               );
            }
            finalArgs.push(def.enforce(posVal));
         }
      }
      for (let j = command.argumentsTypes.length; j < positionals.length; j++) {
         finalArgs.push(positionals[j]);
      }

      return new ParseResult(command, finalArgs, FLAGS_MAP);
   }
   protected resolveFlag(
      group: FlagsGroup,
      flag: FlagParseResult,
      next: string | null
   ): FlagResolutionResult | null {
      const FLAG_TYPE = flag.isLong ? group.getLong(flag.name) : group.getShort(flag.name);
      if (!FLAG_TYPE) return this.setLastError(null);

      let nextValueUsed = false;
      if (FLAG_TYPE.isValueBased()) {
         let { value } = flag;
         if (value === null) {
            nextValueUsed = true;
            value = next;
         }
         if (value === null) {
            if (FLAG_TYPE.defaultValue) return { flag: FLAG_TYPE, value: null, nextValueUsed };

            return this.setLastError(
               'Flag with no default value, requires value to be set explicitly, flag: ' + flag.name
            );
         }

         if (!FLAG_TYPE.validator.isValid(value))
            return this.setLastError(
               'Incorrect type passed as value for flag: ' + flag.name + ' value: ' + value
            );

         // Enforcing value might throw error so just in case lets try-catch it.
         return { flag: FLAG_TYPE, value: FLAG_TYPE.validator.coerce(value), nextValueUsed };
      } else if (flag.value)
         return this.setLastError(
            "Syntax error, this flag doesn't supports values: " + flag.name + ' value: ' + flag.value
         );

      // Flag without values is boolean indicator and if its present then its value is considered as true
      return { flag: FLAG_TYPE, value: true, nextValueUsed };
   }
   protected getLastError(): string | null {
      return this.lastError;
   }
   protected setLastError(error: string | null): null {
      this.lastError = error;
      return null;
   }
   protected getArgument(relative: number = 0): string | null {
      return this.argv[this.index + (relative ?? 0)] ?? null;
   }
   /**
    * Parses a flag string into its components (name, type, and optional value).
    * @param argument - The argument string to parse (e.g., "-f", "--flag=value")
    * @returns The parsed flag result or null if the argument is not a flag
    */
   public static parseFlag(argument: string): FlagParseResult | null {
      if (argument.length < 2 || argument[0] !== '-') return null;

      // Flag Image
      const isLongBit = argument[1] === '-',
         hasValueIndex = argument.indexOf('='),
         hasValueBit = hasValueIndex !== -1;

      // Gather the name of the flag
      let name: string,
         value: string | null = hasValueBit ? argument.substring(hasValueIndex + 1) : null;
      if (isLongBit) name = argument.substring(2, hasValueBit ? hasValueIndex : undefined);
      else {
         name = argument[1]!;
         if (!value && argument.length > 2) value = argument.substring(2);
      }

      // Result
      return { name: name.toLowerCase(), isLong: isLongBit, value: value };
   }
}

/**
 * Result of resolving a flag to its type and value.
 */
export interface FlagResolutionResult<T = unknown> {
   flag: ValueFlag<T>;
   value: T | null;
   nextValueUsed: boolean;
}

/**
 * Parsed components of a flag argument.
 */
export interface FlagParseResult {
   name: string;
   isLong: boolean;
   value: string | null;
}
