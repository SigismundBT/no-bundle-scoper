import fs from 'fs-extra';
import path from 'path';
import type { Plugin } from 'esbuild';
import { find } from 'tsconfck';
import { aliasMatcher } from './utils/aliasMatcher.js';
import { writeJSImports } from './utils/writeJSImports.js';
import { logError } from './utils/logError.js';

export function noBundleScoper(tsconfigPath?: string): Plugin {
  return {
    name: 'no-bundle-scoper',
    async setup(build) {
      build.onEnd(async (args) => {
        // Get build options
        const entryPoints = build.initialOptions.entryPoints as string[];
        const tsconfigResults = await Promise.all(
          entryPoints.map(async (entry) => {
            return await find(entry);
          })
        );

        //get alias, baseUrl and target
        type AliasConfig = {
          baseUrl: string;
          target: string[];
          outDir: string;
        };

        type Configs = {
          [alias: string]: AliasConfig;
        };

        const configs: Configs = {};

        for (const tsconfigResult of tsconfigResults) {
          if (!tsconfigResult) continue;

          let readtsconfig: any;
          try {
            readtsconfig = JSON.parse(fs.readFileSync(tsconfigResult, 'utf-8'));
          } catch (err) {
            logError(`❌ Failed to parse tsconfig: ${tsconfigResult}`, err);
            continue;
          }

          const compilerOptions = readtsconfig.compilerOptions ?? {};
          const paths = compilerOptions.paths ?? {};
          const baseUrl = path.resolve(
            path.dirname(tsconfigResult),
            compilerOptions.baseUrl ?? '.'
          );

          const outDir =
            readtsconfig.compilerOptions?.outDir ??
            build.initialOptions.outdir ??
            (build.initialOptions.outfile
              ? path.dirname(build.initialOptions.outfile)
              : undefined);

          if (!outDir) {
            throw new Error(
              '[no-bundle-scoper] Could not determine output directory. Please set compilerOptions.outDir in tsconfig.json or provide outdir/outfile in esbuild options.'
            );
          }

          try {
            await fs.access(outDir);
          } catch (err) {
            logError(
              `❌ Output directory "${outDir}" from ${tsconfigResult} is not accessible.`,
              err
            );
            continue;
          }

          for (const [alias, target] of Object.entries(paths)) {
            const normalizedTarget = Array.isArray(target) ? target : [target];
            configs[alias] = { baseUrl, target: normalizedTarget, outDir };
          }
        }

        //get outputs from metaflies
        const meta = args.metafile;

        if (!meta) return;
        const outputPaths = Object.keys(meta.outputs);

        //config parser
        const matchers = aliasMatcher(configs);

        //parse every output file
        for (const outputPath of outputPaths) {
          //check if output entry point has import(s)
          const outputImports = meta.outputs[outputPath].imports;
          if (!outputImports || outputImports.length === 0) continue;

          //parse each imports from every output file
          for (const { path: importPath } of outputImports) {
            //check if imported path matches config.alias
            const matched = matchers.find(({ regex }) =>
              regex.test(importPath)
            );
            if (!matched) continue;

            //parse matched results
            const matchResult = matched.regex.exec(importPath);
            if (!matchResult) continue;

            const [full, suffix] = matchResult;

            const config = matched.config; // parsed config

            const outputDir = config.outDir;

            //parse outputPath
            const parsedOutput = path.parse(outputPath);
            const outputExt = parsedOutput.ext;

            //check is the scope has *
            const isValid = !!(suffix && full.endsWith(suffix));

            switch (isValid) {
              case true:
                const SuffixImportedPath = path.posix.join(
                  outputDir,
                  suffix + outputExt
                );
                try {
                  await writeJSImports(
                    SuffixImportedPath,
                    outputPath,
                    importPath,
                    outputDir
                  );
                } catch (err) {
                  logError(
                    `❌ Failed to rewrite import "${importPath}" in ${outputPath}`,
                    err
                  );
                }

                break;

              case false:
                const cleanAlias = matched?.alias.replace(/^[@#~]/, '');
                const fullImportedPath = path.posix.join(
                  outputDir,
                  cleanAlias + outputExt
                );

                try {
                  await writeJSImports(
                    fullImportedPath,
                    outputPath,
                    importPath,
                    outputDir
                  );
                } catch (err) {
                  logError(
                    `❌ Failed to rewrite import "${importPath}" in ${outputPath}`,
                    err
                  );
                }

                break;
            }
          }
        }
      });
    }
  };
}
