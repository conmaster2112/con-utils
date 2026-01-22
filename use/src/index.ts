import { CommandLine } from 'con-utils/cli';
import { argv } from "node:process";
const root = CommandLine.createGroup('.', 'Root');

CommandLine.run(argv, root);
