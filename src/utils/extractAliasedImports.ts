type AliasPaths = Record<string, string[]>;

export function extractAliasedImports(
  imports: string[],
  aliasPaths: AliasPaths
) {
  const results = [];

  for (const imp of imports) {
    for (const [aliasKey, targetPaths] of Object.entries(aliasPaths)) {
      const hasWildcard = aliasKey.includes('*');
      let regexPattern = aliasKey.replace(/\//g, '\\/').replace(/\./g, '\\.');

      let aliasRegex: RegExp;

      if (hasWildcard) {
        regexPattern = regexPattern.replace('*', '(.+)');
        aliasRegex = new RegExp(`^${regexPattern}$`);
      } else {
        aliasRegex = new RegExp(`^${regexPattern}$`);
      }

      const match = imp.match(aliasRegex);

      if (match) {
        const wildcardValue = hasWildcard ? match[1] : undefined;
        const resolved = targetPaths.map((tp) =>
          hasWildcard ? tp.replace('*', wildcardValue!) : tp
        );
        results.push({
          original: imp,
          matchedAlias: aliasKey,
          replacedPart: wildcardValue,
          resolvedPaths: resolved
        });
        break;
      }
    }
  }

  return results;
}
