import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ArgumentLike } from './arguments';
import { Command, CommandAction, GroupCommand } from './command';
import { CommandsParser, ParseResult, ParserError } from './commands-parser';
import { ValueFlag, Flag } from './flags';
import {
   StringTypeValidator,
   NumberTypeValidator,
   BooleanTypeValidator,
   IntegerTypeValidator,
} from './value-type';

describe('CommandsParser', () => {
   let root: GroupCommand;
   let runCommand: CommandAction<any[]>;
   let nameFlag: ValueFlag<string>;

   beforeEach(() => {
      // Setup: Create root command with a simple action command
      root = GroupCommand.create('.', 'Root command', null);
      runCommand = root.createAction('run', 'Run action', []);

      // Add a string flag
      nameFlag = new ValueFlag('name', {
         defaultValue: null,
         validator: new StringTypeValidator(),
         description: 'Name parameter',
         long: 'name',
         short: 'n',
      });
      runCommand.flags.add(nameFlag);
      runCommand.action = vi.fn();
   });

   describe('Basic flag parsing', () => {
      it('should parse long flag with equals syntax (--name=value)', () => {
         const argv = ['run', '--name=Hello'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.command).toBe(runCommand);
         expect(result.getValue(nameFlag)).toBe('Hello');
      });

      it('should parse long flag with space syntax (--name value)', () => {
         const argv = ['run', '--name', 'World'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.command).toBe(runCommand);
         expect(result.getValue(nameFlag)).toBe('World');
      });

      it('should parse short flag with value syntax (-nValue)', () => {
         const argv = ['run', '-nHello'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.command).toBe(runCommand);
         expect(result.getValue(nameFlag)).toBe('Hello');
      });

      it('should parse short flag with space syntax (-n value)', () => {
         const argv = ['run', '-n', 'Hello'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.command).toBe(runCommand);
         expect(result.getValue(nameFlag)).toBe('Hello');
      });

      it('should parse short flag with equals syntax (-n=value)', () => {
         const argv = ['run', '-n=Hello'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.command).toBe(runCommand);
         expect(result.getValue(nameFlag)).toBe('Hello');
      });

      it('should use default value when flag is not provided', () => {
         const defaultFlag = new ValueFlag('optional', {
            defaultValue: 'default_value',
            validator: new StringTypeValidator(),
            long: 'optional',
            short: 'o',
         });
         runCommand.flags.add(defaultFlag);

         const argv = ['run'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(defaultFlag)).toBe('default_value');
      });
   });

   describe('Multiple flags', () => {
      let ageFlag: ValueFlag<number>;
      let activeFlag: Flag;

      beforeEach(() => {
         ageFlag = new ValueFlag('age', {
            defaultValue: null,
            validator: new NumberTypeValidator(),
            long: 'age',
            short: 'a',
         });
         activeFlag = new Flag('active', { long: 'active', short: 'b' });

         runCommand.flags.add(ageFlag);
         runCommand.flags.add(activeFlag);
      });

      it('should parse multiple long flags', () => {
         const argv = ['run', '--name=John', '--age=30'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(nameFlag)).toBe('John');
         expect(result.getValue(ageFlag)).toBe(30);
      });

      it('should parse multiple short flags', () => {
         const argv = ['run', '-nJohn', '-a30'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(nameFlag)).toBe('John');
         expect(result.getValue(ageFlag)).toBe(30);
      });

      it('should parse mixed short and long flags', () => {
         const argv = ['run', '--name=John', '-a', '25'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(nameFlag)).toBe('John');
         expect(result.getValue(ageFlag)).toBe(25);
      });

      it('should parse boolean flags', () => {
         const argv = ['run', '--active'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(activeFlag)).toBe(true);
      });

      it('should handle multiple boolean flags', () => {
         const argv = ['run', '-n', 'Test', '-b', '--age=20'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(nameFlag)).toBe('Test');
         expect(result.getValue(activeFlag)).toBe(true);
         expect(result.getValue(ageFlag)).toBe(20);
      });
   });

   describe('Positional arguments', () => {
      let sourceArg: ArgumentLike<string>;
      let destArg: ArgumentLike<string>;

      beforeEach(() => {
         sourceArg = new ArgumentLike('source', { defaultValue: null, validator: new StringTypeValidator() });
         destArg = new ArgumentLike('dest', { defaultValue: 'output', validator: new StringTypeValidator() });

         runCommand = root.createAction('copy', 'Copy files', [sourceArg, destArg]);
         runCommand.action = vi.fn();
      });

      it('should parse required positional argument', () => {
         const argv = ['copy', 'source.txt'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.args).toEqual(['source.txt', destArg.defaultValue]);
      });

      it('should parse multiple positional arguments', () => {
         const argv = ['copy', 'source.txt', 'dest.txt'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.args).toEqual(['source.txt', 'dest.txt']);
      });

      it('should use default value for optional argument', () => {
         const argv = ['copy', 'source.txt'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.args[0]).toBe('source.txt');
         expect(result.args[1]).toBe('output');
      });

      it("should pass flag as arguments if doesn't exits", () => {
         const argv = ['copy', '--name=test', 'source.txt', 'dest.txt'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.args).toEqual(['--name=test', 'source.txt', 'dest.txt']);
      });

      it('should throw error when required argument is missing', () => {
         const argv = ['copy'];

         expect(() => {
            new CommandsParser(argv, 0).parse(root);
         }).toThrow(ParserError);
      });
   });

   describe('Different argument types', () => {
      it('should parse integer arguments', () => {
         const intArg = new ArgumentLike('count', {
            defaultValue: null,
            validator: new IntegerTypeValidator(),
         });
         const action = root.createAction('repeat', 'Repeat N times', [intArg]);
         action.action = vi.fn();

         const argv = ['repeat', '5'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.args[0]).toBe(5);
      });

      it('should parse number arguments', () => {
         const numArg = new ArgumentLike('value', {
            defaultValue: null,
            validator: new NumberTypeValidator(),
         });
         const action = root.createAction('calc', 'Calculate', [numArg]);
         action.action = vi.fn();

         const argv = ['calc', '3.14'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.args[0]).toBe(3.14);
      });

      it('should throw error for invalid argument type', () => {
         const intArg = new ArgumentLike('count', {
            defaultValue: null,
            validator: new IntegerTypeValidator(),
         });
         const action = root.createAction('repeat', 'Repeat N times', [intArg]);
         action.action = vi.fn();

         const argv = ['repeat', 'not-a-number'];

         expect(() => {
            new CommandsParser(argv, 0).parse(root);
         }).toThrow(ParserError);
      });
   });

   describe('Group commands and subcommands', () => {
      it('should navigate to subcommand in group', () => {
         const sub = root.createAction('build', 'Build project', []);
         sub.action = vi.fn();

         const argv = ['build'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.command.name).toBe('build');
      });

      it('should throw error for unknown subcommand', () => {
         const argv = ['unknown'];

         expect(() => {
            new CommandsParser(argv, 0).parse(root);
         }).toThrow(ParserError);
      });

      it('should handle nested group commands', () => {
         const config = root.createGroup('config', 'Configuration commands');
         const set = config.createAction('set', 'Set config', []);
         set.action = vi.fn();

         const argv = ['config', 'set'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.command.name).toBe('set');
      });

      it('should handle flags on group commands', () => {
         const config = root.createGroup('config', 'Configuration commands');
         const helpFlag = new Flag('verbose', { long: 'verbose', short: 'v' });
         config.flags.add(helpFlag);

         const set = config.createAction('set', 'Set config', []);
         set.action = vi.fn();

         const argv = ['config', '--verbose', 'set'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.command.name).toBe('set');
         expect(result.getValue(helpFlag)).toBe(true);
      });
   });

   describe('Help flags', () => {
      it('should parse help flag on action command', () => {
         const argv = ['run', '--help'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(result.command.uniqueHelpFlag)).toBe(true);
      });

      it('should parse short help flag alias', () => {
         const argv = ['run', '-h'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(result.command.uniqueHelpFlag)).toBe(true);
      });

      it('should parse question mark help alias', () => {
         const argv = ['run', '-?'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(result.command.uniqueHelpFlag)).toBe(true);
      });
   });

   describe('Edge cases', () => {
      it('should handle empty argv', () => {
         const argv: string[] = [];

         expect(() => {
            new CommandsParser(argv, 0).parse(root);
         }).toThrow(ParserError);
      });

      it('should handle flags with special characters in values', () => {
         const argv = ['run', '--name=hello@world.com'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(nameFlag)).toBe('hello@world.com');
      });

      it('should handle flags with empty string values', () => {
         const argv = ['run', '--name='];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(nameFlag)).toBe('');
      });

      it('should handle case-insensitive flag names', () => {
         const argv = ['run', '--NAME=Test'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.getValue(nameFlag)).toBe('Test');
      });

      it('should parse extra positional arguments beyond defined', () => {
         const arg = new ArgumentLike('file', { defaultValue: null, validator: new StringTypeValidator() });
         const action = root.createAction('multi', 'Multi file action', [arg]);
         action.action = vi.fn();

         const argv = ['multi', 'file1.txt', 'file2.txt', 'file3.txt'];
         const result = new CommandsParser(argv, 0).parse(root);

         expect(result.args).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
      });
   });

   describe('ParseResult methods', () => {
      it('should get executable function from action command', () => {
         const argv = ['run', '--name=Test'];
         const result = new CommandsParser(argv, 0).parse(root);
         const executable = result.getExecutable();

         expect(executable).toBeDefined();
         expect(typeof executable).toBe('function');
      });

      it('should execute action with correct parameters', () => {
         const action = vi.fn();
         runCommand.action = action;

         const argv = ['run', '--name=TestValue'];
         const result = new CommandsParser(argv, 0).parse(root);
         const executable = result.getExecutable();

         executable?.();

         expect(action).toHaveBeenCalled();
         expect(action).toHaveBeenCalledWith(result);
      });

      it('should execute action with positional arguments', () => {
         const arg = new ArgumentLike('value', { defaultValue: null, validator: new StringTypeValidator() });
         const action = root.createAction('echo', 'Echo command', [arg]);
         const mockAction = vi.fn();
         action.action = mockAction;

         const argv = ['echo', 'hello'];
         const result = new CommandsParser(argv, 0).parse(root);
         const executable = result.getExecutable();

         executable?.();

         expect(mockAction).toHaveBeenCalledWith(result, 'hello');
      });

      it('should return null executable for group command without action', () => {
         const group = root.createGroup('config', 'Config group');
         group.action = null; // Explicitly no action

         const argv = ['config'];

         expect(() => {
            new CommandsParser(argv, 0).parse(root);
         }).toThrow(ParserError);
      });
   });

   describe('Static parseFlag method', () => {
      it('should parse long flag format', () => {
         const result = CommandsParser.parseFlag('--name');

         expect(result).toEqual({ name: 'name', isLong: true, value: null });
      });

      it('should parse long flag with value', () => {
         const result = CommandsParser.parseFlag('--name=value');

         expect(result).toEqual({ name: 'name', isLong: true, value: 'value' });
      });

      it('should parse short flag format', () => {
         const result = CommandsParser.parseFlag('-n');

         expect(result).toEqual({ name: 'n', isLong: false, value: null });
      });

      it('should parse short flag with value', () => {
         const result = CommandsParser.parseFlag('-nvalue');

         expect(result).toEqual({ name: 'n', isLong: false, value: 'value' });
      });

      it('should parse short flag with equals', () => {
         const result = CommandsParser.parseFlag('-n=value');

         expect(result).toEqual({ name: 'n', isLong: false, value: 'value' });
      });

      it('should return null for non-flag', () => {
         const result = CommandsParser.parseFlag('regular-argument');

         expect(result).toBeNull();
      });

      it('should handle flag names case-insensitive', () => {
         const result = CommandsParser.parseFlag('--NAME');

         expect(result?.name).toBe('name');
      });
   });

   describe('Real-world example from user', () => {
      it('should match the user example usage', () => {
         const ROOT = GroupCommand.create('.', 'Just some cusual command', null);
         const ACTION = ROOT.createAction('run', 'Just running', []);
         const TEST_FLAG_STRING = new ValueFlag('name', {
            defaultValue: null,
            validator: new StringTypeValidator(),
            description: 'Just testing flag',
            long: 'name',
            short: 'n',
         });
         ACTION.flags.add(TEST_FLAG_STRING);
         const actionMock = vi.fn();
         ACTION.action = actionMock;

         const RESULT = new CommandsParser(
            'run --name=Hello'.split(' ').filter(e => e.length > 0),
            0
         ).parse(ROOT);
         const executable = RESULT.getExecutable();
         executable?.();

         expect(actionMock).toHaveBeenCalled();
         expect(RESULT.getValue(TEST_FLAG_STRING)).toBe('Hello');
      });
   });

   describe('Error handling', () => {
      it('should throw ParserError with correct information on invalid command', () => {
         const argv = ['invalid'];

         expect(() => {
            new CommandsParser(argv, 0).parse(root);
         }).toThrow(ParserError);
      });

      it('should throw ParserError on missing required flag value', () => {
         const requiredFlag = new ValueFlag('required', {
            defaultValue: null,
            validator: new StringTypeValidator(),
            long: 'required',
         });
         runCommand.flags.add(requiredFlag);

         const argv = ['run', '--required'];

         expect(() => {
            new CommandsParser(argv, 0).parse(root);
         }).toThrow(ParserError);
      });

      it('should throw ParserError on invalid flag value type', () => {
         const numberFlag = new ValueFlag('count', {
            defaultValue: null,
            validator: new NumberTypeValidator(),
            long: 'count',
         });
         runCommand.flags.add(numberFlag);

         const argv = ['run', '--count=invalid'];

         expect(() => {
            new CommandsParser(argv, 0).parse(root);
         }).toThrow(ParserError);
      });

      it('should include argv and index in ParserError', () => {
         const argv = ['invalid'];

         try {
            new CommandsParser(argv, 0).parse(root);
            expect.fail('Should throw ParserError');
         } catch (e) {
            if (e instanceof ParserError) {
               expect(e.argv).toEqual(argv);
               expect(typeof e.index).toBe('number');
            }
         }
      });
   });
});
