import { FormatCode } from '../general/format-helper';
import { CommandAction, GroupCommand, type ArgumentsLikeTypeMap, type Command } from './command';
import { CommandsParser, ParserError } from './commands-parser';

/**
 * Main entry point for parsing and executing command-line arguments.
 * Handles parsing, flag resolution, and command execution with error handling.
 */
export class CommandLine {
   private constructor() {}

   /**
    * Parses command-line arguments and executes the appropriate command.
    * @param argv - The command-line arguments to parse (typically process.argv)
    * @param command - The root command to parse against
    * @throws {ParserError} If parsing fails or validation errors occur
    */
   public static async run(argv: string[], command: Command): Promise<void> {
      const parser = new CommandsParser(argv, 2);
      try {
         const result = parser.parse(command);
         if (result.flags.has(result.command.uniqueHelpFlag))
            return void console.info(Array.from(result.command.getHelp()).join('\r\n'));

         for (const flag of result.flags.keys())
            for (let command: Command | null = result.command; command; command = command.getParentCommand())
               if (command.flags.hasOwnFlag(flag)) command.onFlags?.(result);

         return void result.getExecutable()?.();
      } catch (err) {
         if (err instanceof ParserError) {
            if (!err.flags?.has(err.command.uniqueHelpFlag))
               console.error(FormatCode.create(31, 39).wrap('->' + err.message));
            console.error('\n', Array.from(err.command.getHelp()).join('\r\n'));
         } else throw err;
      }
   }

   /**
    * Creates a new group command for organizing subcommands.
    * @param name - The name of the command group
    * @param description - A description of what this command group does
    * @returns A new GroupCommand instance
    */
   public static createGroup(name: string, description: string): GroupCommand {
      return GroupCommand.create(name, description, null);
   }

   /**
    * Creates a new action command that executes a handler function.
    * @template T - The tuple type of arguments the action accepts
    * @param name - The name of the command
    * @param description - A description of what this command does
    * @param args - The argument definitions for this command
    * @returns A new CommandAction instance
    */
   public static createAction<T extends unknown[]>(
      name: string,
      description: string,
      args: ArgumentsLikeTypeMap<T>
   ): CommandAction<T> {
      return CommandAction.create<T>(name, description, null, args);
   }
}
