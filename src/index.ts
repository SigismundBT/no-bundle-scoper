import fs from 'fs-extra';
import path from 'path';
import type { Plugin } from 'esbuild';
import { find } from 'tsconfck';
import { extractAliasedImports } from './utils/extractAliasedImports.js';
import { parseImportPath } from './utils/parseImportPath.js';
import { log, logWarn, logError, logInfo } from './utils/log.js';
import { info,success } from './utils/colors.js';

import pLimit from 'p-limit';
const limit = pLimit(10);

export function noBundleScoper(): Plugin {
  return {
    name: 'no-bundle-scoper',
    async setup(build) {
      let outDir: string | null
      build.onStart(() => {
        const options = build.initialOptions;
        const absWorkingDir = options.absWorkingDir ?? process.cwd();

        outDir = options.outdir
          ? path.resolve(absWorkingDir, options.outdir)
          : options.outfile
          ? path.dirname(path.resolve(absWorkingDir, options.outfile))
          : null;

        if (!outDir) {
          logError(new Error(`outdir in build is required.`))
          return
        }
      });

      build.onEnd(async (args) => {
        log('Parsing path alias...' ,'▶️ Start', info, );

        // Set metaflies
        const meta = args.metafile;

        if (!meta) {
          logError(new Error([`'metafile' must be set to true.`].join(' ')));
          return;
        }
        
        const fileAliasMap = new Map<
          string,
          Array<{ originalAlias: string; parsedImportPath: string }>
        >();

        // parsing meta.outputs
        for (const [outputPath, outputMeta] of Object.entries(meta.outputs)) {
          // Get input paths
          const inputPaths = Object.keys(outputMeta.inputs ?? {});
          if (inputPaths.length > 1) {
            logWarn(`Multiple inputs for ${outputPath}, using the first one.`);
          } // rare case handling: if inputPaths has multiple paths

          // set input path as string
          const inputPath = inputPaths[0];
          if (!inputPath) {
            logWarn(`No input found for output: ${outputPath}.`);
            continue;
          } // make sure input path's existence.

          // get imports
          const imports = (outputMeta.imports ?? []).map((i) => i.path);
          if (!imports || imports.length === 0) continue; // Only parsing with imports

          // get tsconfig paths by input path
          const tsconfigPath = await find(inputPath);
          if (!tsconfigPath) {
            logError(
              new Error(
                `Unable to find tsconfig.json for ${inputPath}. Skip parsing this import path.`
              )
            );
            continue;
          } // make sure each outputs match a correlated tsconfig.json file

          // get project root
          const repoRoot = path.dirname(tsconfigPath);


          // Get inDir
          const inDir = path.dirname(inputPath);

          if (!outDir || !inDir) continue;

          // read tsconfig
          let tsconfigRaw: string;

          try {
            tsconfigRaw = await fs.readFile(tsconfigPath, 'utf-8');
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logError(
              new Error(
                `Failed to read tsconfig.json at ${tsconfigPath}: ${errorMsg}`
              )
            );
            continue;
          }

          const tsconfig = JSON.parse(tsconfigRaw);
          const baseUrl = tsconfig.compilerOptions?.baseUrl;

          if(!baseUrl){
            logError(new Error(`Please set BaseUrl in tsconfig.json: ${tsconfigPath}`))
            continue;
          }

          // get import base
          const importBase = path.resolve(
            repoRoot,
            baseUrl
          );

          // get outDirRoot
          const relativeOutDirFromBase = path.relative(importBase, outDir);
          const absoluteOutDir = path.resolve(importBase, relativeOutDirFromBase);

          // get inDirRoot
          const relativeinDirFromBase = path.relative(importBase, inDir);
          const inDirRoot = relativeinDirFromBase.split(path.sep)[0];
          const absoluteInDir = path.resolve(importBase, inDirRoot);

          // get compilerOptions.paths;
          const aliasPaths = tsconfig.compilerOptions?.paths;

          // get parsed alias paths
          const aliased = extractAliasedImports(imports, aliasPaths);
          if (!aliased || aliased.length === 0) continue;

          for (const alias of aliased) {
            const originalAlias = alias.original;
            const resolvedImportPaths = alias.resolvedPaths;
            console.log(`alias: `, alias)

            // parse resolvedPaths
            for (const resolvedImportPath of resolvedImportPaths) {
              
            function withTsExt(filePath: string): string {
              return path.extname(filePath) ? filePath : filePath + '.ts';
            }

            const resolvedTsPath = path.resolve(importBase, withTsExt(resolvedImportPath));

              // access ts files
              try {
                await fs.access(resolvedTsPath);
              } catch {
                logError(
                  new Error(
                    [
                      `Failed to resolve alias: "${alias.original}" → "${resolvedImportPath + '.ts'}".`,
                      `Please check the following:`,
                      `1. The file "${resolvedImportPath + '.ts'}" actually exists.`,
                      `2. The "baseUrl" and "paths" in your tsconfig.json are correctly set.`,
                      ``,
                      `Current baseUrl: "${tsconfig.compilerOptions?.baseUrl}"`,
                      `Alias attempted: "${alias.original}"`,
                      `Resolved path: "${resolvedImportPath}"`,
                      `Parsed ts path: "${resolvedTsPath}"`,
                    ].join('\n')
                  )
                );
                continue;

              }

              // parse import path
              const importPath = parseImportPath(resolvedTsPath, absoluteInDir, absoluteOutDir)

              try {
                await fs.access(importPath)
              } catch {
                logError(new Error(`Fail to parse import path.`));
                continue;
              }

              const absoluteOutputPath = path.resolve(process.cwd(), outputPath);
              const outputDir = path.dirname(absoluteOutputPath)

              // get relative import path
              let relativeParsedImportPath = path.relative(
                outputDir,
                importPath
              );

              function normalizeImportPath(relativeParsedImportPath: string): string {
                const cleaned = relativeParsedImportPath.replace(/\\/g, '/').replace(/\/+/g, '/');
                const normalized = cleaned.replace(/^(\.\/)+/, './').replace(/^(\.\/)?\.\//, '../');
                if (
                  normalized.startsWith('./') ||
                  normalized.startsWith('../') ||
                  normalized.startsWith('/') ||
                  normalized.includes(':') // 防止補到 URL 或 Windows 路徑
                ) {
                  return normalized;
                }
                return './' + normalized;
              }

              const parsedImportPath = normalizeImportPath(relativeParsedImportPath)

              try {
                await fs.access(outputPath);
                await fs.access(importPath);
              } catch {
                logError(new Error(`Fail to access file ${outputPath}`));
                continue;
              }

              if (!fileAliasMap.has(outputPath)) {
                fileAliasMap.set(outputPath, []);
              }

              fileAliasMap.get(outputPath)!.push({
                originalAlias,
                parsedImportPath
              });
            }
          }
        }

        const writeTasks: Promise<any>[] = [];

        for (const [outputPath, aliasList] of fileAliasMap.entries()) {
          writeTasks.push(
            limit(async () => {
              let readCode = await fs.readFile(outputPath, 'utf-8');
              let updatedCode = readCode;

              for (const {
                originalAlias,
                parsedImportPath
              } of aliasList) {
                updatedCode = updatedCode
                  .replace(
                    new RegExp(`from\\s+["']${originalAlias}["']`, 'g'),
                    `from '${parsedImportPath}'`
                  )
                  .replace(
                    new RegExp(`import\\(["']${originalAlias}["']\\)`, 'g'),
                    `import('${parsedImportPath}')`
                  );
              }

              if (updatedCode !== readCode) {
                await fs.writeFile(outputPath, updatedCode, 'utf-8');
                logInfo(`Updated: ${outputPath}`);
              } else {
                logInfo(`No changes for: ${outputPath}`);
              }
            })
          );
        }

        await Promise.all(writeTasks);
        log('Task completed.', '🟢 Finished', success);
      });
    }
  };
}
