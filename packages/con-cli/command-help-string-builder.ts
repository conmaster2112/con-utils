import { DIM, Format } from '../format-helper';
import { Command } from './command';

const dim = DIM.wrap;

export class CommandHelpStringBuilder {
   public static *buildHelp(command: Command, preferredWidth: number): Generator<string> {
      yield dim(` Usage of ${command.syntax()}`);
      yield '';
      yield dim('  ' + '-'.repeat(preferredWidth));
      yield* Format.wrapWords(command.description ?? '', preferredWidth).map(e => dim('   ') + e);
      yield dim('  ' + '-'.repeat(preferredWidth));
      yield '';
      yield* this.buildFlags(command);
      yield '';
   }

   public static *buildFlags(command: Command): Generator<string> {
      yield dim('Flags:');
      yield* command.flags
         .getAll()
         .values()
         .map(e => '  ' + e.toString().padEnd(20) + ' ' + dim(e.description ?? ''));
   }
}
