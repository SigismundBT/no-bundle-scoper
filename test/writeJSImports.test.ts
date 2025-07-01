import { describe, it, expect, beforeEach, test, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { build } from 'esbuild';
import { noBundleScoper } from '../src/index';

const tempDir = '../tempDir';

describe('esbuild plugin alias', () => {
  beforeEach(async () => {
    await fs.ensureDir(tempDir);
  });

  test('should rewrite @app/ alias to relative path', async () => {
    const root = path.resolve(__dirname, '../');
    const entry = path.join(root, 'tempDir/src/test.ts');
    const outfile = path.join(root, 'tempDir/dist/test.js');

    await build({
      entryPoints: [entry],
      outfile: outfile,
      bundle: false,
      platform: 'node',
      target: 'esnext',
      format: 'esm',
      logLevel: 'info',
      metafile: true,
      plugins: [noBundleScoper()]
    });

    const outputCode = await fs.readFile(outfile, 'utf-8');
    expect(outputCode).toContain(`import { app1 } from './app1.js'`);
    expect(outputCode).toContain(`import { app2 } from './utils/app2.js'`);
    expect(outputCode).toContain(`from "@notMapped/module"`);
    expect(outputCode).toContain(`from './nonexistent.js'`);
  });
});
