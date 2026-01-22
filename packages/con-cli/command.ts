import type { IInformative } from './base';
import type { ParseResult } from './commands-parser';

import { DIM } from '../general/format-helper';
import { ArgumentLike } from './arguments';
import { CommandHelpStringBuilder } from './command-help-string-builder';
import { Flag, FlagsGroup } from './flags';

const dim = DIM.wrap;
export abstract class Command implements IInformative {
   protected parent: Command | null;
   public readonly uniqueHelpFlag: Flag;
   public readonly name: string;
   public readonly flags: FlagsGroup;
   public description?: string;
   public onFlags?: (results: ParseResult) => Promise<void> | void;
   // Simplified constructor: only name required
   protected constructor(name: string, description?: string, parent: Command | null = null) {
      this.name = name.toLowerCase();
      this.description = description ?? '';
      this.flags = new FlagsGroup(parent?.flags ?? null);
      this.parent = parent;
      this.uniqueHelpFlag = new Flag('help', {
         description: "Show's help message",
         short: '?',
         long: 'help',
      });
      this.flags.add(this.uniqueHelpFlag);
      this.flags.addShortAlias(this.uniqueHelpFlag, 'h');
   }
   public getParentCommand(): Command | null {
      return this.parent ?? null;
   }
   public *getHelp(): Generator<string> {
      yield* CommandHelpStringBuilder.buildHelp(this, preferredWidth);
   }
   public *getFlags(): Generator<string> {
      yield dim('Flags:');
      yield* this.flags
         .getAll()
         .values()
         .map(e => '  ' + e.toString().padEnd(20) + ' ' + dim(e.description ?? ''));
   }
   public abstract syntax(): string;
   public getFullPathName(): string {
      return `${this.parent ? this.parent.getFullPathName() + ' ' : ''}${this.name}`;
   }
}

export type ArgumentsLikeTypeMap<T> = {
   [K in keyof T]: ArgumentLike<T[K]>;
};
export class CommandAction<A extends unknown[]> extends Command {
   public readonly argumentsTypes: ArgumentsLikeTypeMap<A>;
   public action: ((options: ParseResult, ...params: A) => unknown) | null = null;
   protected constructor(
      name: string,
      opts: { argTypes: ArgumentsLikeTypeMap<A>; description?: string; parent: Command | null }
   ) {
      super(name, opts.description, opts.parent);
      this.argumentsTypes = opts.argTypes;
   }
   public override *getHelp(): Generator<string, void, any> {
      yield* super.getHelp();
      if (!this.argumentsTypes.length) return;
      yield dim('  Arguments:');
      yield* this.argumentsTypes.map(e => `    ${e.toString().padEnd(20)} ${dim(e.description ?? '')}`);
      yield '';
   }
   public static create<T extends unknown[]>(
      name: string,
      description: string,
      parent: Command | null,
      args: ArgumentsLikeTypeMap<T>
   ): CommandAction<T> {
      return new CommandAction<T>(name, { argTypes: args, description, parent: parent });
   }

   public syntax(): string {
      return `${this.getFullPathName()} ${this.argumentsTypes.map(e => (e.isRequired() ? `<${e.name}:${e.validator.name}>` : `[${e.name}:${e.validator.name}]`)).join(' ')}`;
   }
}
export class GroupCommand extends Command {
   public action: ((options: ParseResult) => unknown) | null = null;
   public readonly subcommands: Map<string, Command> = new Map();
   public static create(name: string, description: string, parent: Command | null): GroupCommand {
      return new GroupCommand(name, description, parent);
   }
   public createGroup(name: string, description: string): GroupCommand {
      const cmd = GroupCommand.create(name, description, this);
      this.subcommands.set(name, cmd);
      return cmd;
   }
   public createAction<T extends unknown[]>(
      name: string,
      description: string,
      args: ArgumentsLikeTypeMap<T>
   ): CommandAction<T> {
      const cmd = CommandAction.create<T>(name, description, this, args);
      this.subcommands.set(name, cmd);
      return cmd;
   }
   public syntax(): string {
      return `${this.getFullPathName()} <${this.subcommands.keys().toArray().join('|')}>`;
   }

   public override *getHelp(): Generator<string, void, any> {
      yield* super.getHelp();
      yield dim('  SubCommands:');
      let p = preferredWidth - 25;
      yield* this.subcommands
         .values()
         .map(
            e =>
               `    ${e.name.padEnd(20)} ${dim((e.description?.length ?? 0) > p ? (e.description?.substring(0, p) ?? '') + '...' : (e.description ?? ''))}`
         );
      yield '';
   }
}
export let preferredWidth = 75;
