import type { RolldownOptions } from 'rolldown';

import { dts } from 'rolldown-plugin-dts';

export default {
   input: { 'con-cli': 'packages/con-cli/index.ts', general: 'packages/general/index.ts' },
   treeshake: true,
   plugins: [dts({ oxc: true })],
   output: { dir: 'dist', cleanDir: true },
} satisfies RolldownOptions;
