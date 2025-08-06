import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import { build } from 'esbuild';
import { noBundleScoper } from '../src/index';

const root = path.resolve(__dirname, '../');
const tempDir = path.join(root, 'tempDir');
const outDir = path.join(tempDir, 'dist');
const srcDir = path.join(tempDir, 'src');
// const srcDir = tempDir

describe('esbuild plugin alias', () => {
  beforeEach(async () => {
    await fs.ensureDir(tempDir);
    await fs.emptyDir(tempDir);
    const utilsDir = path.join(srcDir, 'utils');
    await fs.ensureDir(utilsDir);

    // ✅ 呼叫 tsconfig 寫入函式
    async function writeTsconfig(basePath: string) {
      const tsconfig = {
        compilerOptions: {
          target: 'esnext',
          module: 'es2022',
          declaration: true,
          emitDeclarationOnly: true,
          moduleResolution: 'node',
          declarationMap: true,
          outDir: 'dist',
          strict: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          baseUrl: '.',
          paths: {
            '@app/*': ['src/*'],
            '@test': ['src/utils/app3.ts'],
            '@notMapped/*': ['../not-exist/*'],
            '@ghost/*': ['../ghost/*']
          }
        },
        include: ['*'],
        exclude: ['node_modules', 'dist']
      };

      await fs.outputFile(
        path.join(basePath, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );
    }

    // ✅ 實際呼叫
    await writeTsconfig(tempDir);

    await fs.outputFile(
      path.join(srcDir, 'app1.ts'),
      `export const app1 = 'I am app1';`
    );

    await fs.outputFile(
      path.join(utilsDir, 'app2.ts'),
      `export const app2 = 'I am app2';`
    );
    await fs.outputFile(
      path.join(utilsDir, 'app3.ts'),
      `export const app3 = 'I am app2';`
    );

    await fs.outputFile(
      path.join(srcDir, 'index.ts'),
      `
      import { app1 } from '@app/app1';
      import { app2 } from '@app/utils/app2';
      import { app3 } from '@test';
      import { something } from "@notMapped/module";
      import { ghost } from "@ghost/nonexistent";

      console.log(app1);
      console.log(app2);
      console.log(app3);
      console.log(something);
      console.log(ghost);
    `
    );
  });

  afterAll(async () => {
    await fs.remove(tempDir);
    await fs.remove(outDir);
  });

  test('should rewrite @app/ alias to relative path', async () => {
    const entryRelative = await fg('src/**/*.ts', { cwd: tempDir });
    const entryPoints = entryRelative.map((file) => path.join(tempDir, file));

    await build({
      entryPoints,
      outdir: outDir,
      outbase: srcDir,
      bundle: false,
      platform: 'node',
      target: 'esnext',
      format: 'esm',
      logLevel: 'info',
      metafile: true,
      plugins: [noBundleScoper()]
    });

    const outputFiles = await fg('**/*.js', { cwd: outDir, absolute: true });
    expect(outputFiles.length).toBeGreaterThan(0); // 檢查有輸出

    let combinedCode = '';
    for (const file of outputFiles) {
      combinedCode += await fs.readFile(file, 'utf-8');
    }

    expect(combinedCode).toContain(`import { app1 } from './app1.js';`);
    expect(combinedCode).toContain(`import { app2 } from './utils/app2.js';`);
    expect(combinedCode).toContain(`import { app3 } from './utils/app3.js';`);
    expect(combinedCode).toContain(
      `import { something } from "@notMapped/module";`
    );
    expect(combinedCode).toContain(
      `import { ghost } from "@ghost/nonexistent";`
    );
  });
});
