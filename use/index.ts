import { CommandLine } from 'con-utils/cli';

const root = CommandLine.createGroup('.', 'Root');

CommandLine.run(process.argv, root);
