export function createRegex(alias: string): RegExp {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\\\*/g, '(.*)');
  return new RegExp(`^${pattern}$`);
}

export function createRegexes(aliases: string[]): RegExp[] {
  return aliases.map((alias) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.replace(/\\\*/g, '(.*)');
    return new RegExp(`^${pattern}$`);
  });
}
