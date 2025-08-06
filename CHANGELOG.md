chore(release): v2.0.0 – complete functional rewrite & stable alias resolution

BREAKING CHANGE:  
This release introduces a fully functional and tested version of the plugin.  
Previous versions were non-functional due to incomplete alias parsing and incorrect path rewriting.

✅ Highlights:

- Alias paths are now correctly resolved and rewritten to relative paths in output.
- Supports wildcard (`@app/*`) and fixed (`@alias`) style imports.
- Unmatched aliases are preserved as-is (e.g., `@ghost/...`).
- `tsconfig` `paths` mapping and `baseUrl` handling are now robust.
- Fully tested using Vitest and `esbuild` metafile outputs.

⚠️ Note: If you were using v1.x, please migrate with care.  
Old behavior has been removed entirely.
