import { createRegex } from './createRegex.js';

type AliasConfig = {
  baseUrl: string;
  target: string[];
  outDir: string;
};

type AliasMatcher = {
  alias: string;
  regex: RegExp;
  config: AliasConfig;
};

export function aliasMatcher(
  configs: Record<string, AliasConfig>
): AliasMatcher[] {
  return Object.entries(configs).map(([alias, config]) => ({
    alias,
    regex: createRegex(alias),
    config
  }));
}
