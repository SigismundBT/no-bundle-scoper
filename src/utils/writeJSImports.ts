import fs from 'fs-extra';
import path from 'path';
import { logError } from './logError.js';

export async function writeJSImports(
  importedPath: string,
  outputPath: string,
  importPath: string,
  outputDir: string
) {
  //get relative path
  const relative = path.posix.relative(outputDir, importedPath);

  //parse the path into importable form
  const importPathForReplace = relative.startsWith('.')
    ? relative
    : './' + relative;

  try {
    const code = await fs.readFile(outputPath, 'utf-8');

    function escapeRegExp(str: string) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    //replace static import: import ... from '...'
    const staticImportRegex = new RegExp(
      `from\\s+(['"])${escapeRegExp(importPath)}\\1`,
      'g'
    );

    // replace dynamic import: import('...')
    const dynamicImportRegex = new RegExp(
      `import\\(\\s*(['"])${escapeRegExp(importPath)}\\1\\s*\\)`,
      'g'
    );

    let updatedCode = code
      .replace(staticImportRegex, `from '${importPathForReplace}'`)
      .replace(dynamicImportRegex, `import('${importPathForReplace}')`);

    if (updatedCode !== code) {
      await fs.writeFile(outputPath, updatedCode, 'utf-8');
    }
  } catch (err) {
    logError(
      `❌ Failed to rewrite import "${importPath}" in ${outputPath}`,
      err
    );
  }
}
