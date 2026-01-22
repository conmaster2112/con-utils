import { defineConfig } from 'vitest/config';

export default defineConfig({
   test: {
      include: ['**/*.test.ts'], // Include all *.test.ts files
      coverage: {
         provider: 'istanbul', // Use Istanbul for coverage
      },
   },
});
