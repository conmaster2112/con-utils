import { CommandLine } from 'con-utils/cli';
import { Format, CREATE_ACCENT, FormatCode } from 'con-utils/general';
import { argv } from 'node:process';
const root = CommandLine.createGroup('.', 'Root');

root.createAction('test', 'COmment', []);
//CommandLine.run(argv, root);

const rgb = FormatCode.createForegroundRGB;
const a = CREATE_ACCENT(rgb(47, 94, 156), rgb(63, 241, 57));
console.log(a`Some interesting guy came up with name of ${'Saliven'} Other Color`);
CommandLine.run(['', '', 'test', '-h'], root);
