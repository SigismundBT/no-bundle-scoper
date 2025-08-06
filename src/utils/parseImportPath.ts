import path from 'path';
export function parseImportPath (resolvedTsPath:string, absoluteInDir:string, absoluteOutDir:string ) {
  const tsPathPart = path.relative(absoluteInDir, resolvedTsPath)
  
  const jsPathPart = path.format({
    ...path.parse(tsPathPart),
    base: undefined,
    ext: '.js',
  });

  const joinedPath = path.resolve(absoluteOutDir, jsPathPart)

  return joinedPath
}
