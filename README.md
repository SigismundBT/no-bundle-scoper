[![npm version](https://img.shields.io/npm/v/no-bundle-scoper?color=blue)](https://www.npmjs.com/package/no-bundle-scoper)

# no-bundle-scoper

An esbuild plugin for rewriting aliased imports in unbundled output.  
Because `node --no-bundler` needs clean paths too.

---

## ✨ What does it do?

When using `tsconfig` aliases like `@utils/*`, and building with `esbuild` in `bundle: false` mode, the output will still contain raw aliased imports like:

```js
import { log } from '@utils/logger';
```

This plugin rewrites those import paths in the final `.js` files into proper relative paths like:

```js
import { log } from './utils/logger.js';
```

---

## 📦 Installation

```sh
pnpm add -D no-bundle-scoper
```

Or, if you're using npm or yarn:

```sh
npm install -D no-bundle-scoper
# or
yarn add -D no-bundle-scoper
```

---

## 🔌 Peer Dependencies

This plugin requires `esbuild` to be installed in your project:

````bash
pnpm add -D esbuild

````

---

## 🔧 Example usage with esbuild

### in `tsconfig.json`

```ts
{
  "compilerOptions": {
    ...
    "baseUrl": ".", //
    "paths": {
      "@app/*": ["src/*"],
      "@app2": ["src/utils/app2.ts"]
    }
  }
}

````

### in your build sript

```ts
import { build } from 'esbuild';
import { noBundleScoper } from 'no-bundle-scoper';

await build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist', // REQUIRED! This plugin needs a fixed outdir.
  bundle: false, // yes, or why do you want to use this plugin????
  platform: 'node',
  target: 'esnext',
  format: 'esm',
  logLevel: 'info',
  metafile: true, // <-- THIS IS REQUIRED!
  plugins: [noBundleScoper()]
});
```

> 📌 `metafile: true` is required — the plugin relies on esbuild's metafile to rewrite imports accurately.

---


## 📦 Output Directory Requirement

This plugin currently **requires** `esbuild`'s `outdir` option to locate your output files.  
The `outfile` option is **not supported yet**, but may be considered in the future.

---

## ✅ When should you use this?

- You're building a Node.js project with **esbuild**
- You're using `tsconfig` paths / alias (like `@/`, `~`, etc.)
- You're building **without** bundling (`bundle: false`)
- You want to run the output files directly with native ESM support (`node --no-bundler`)

---

## ❌ Not compatible tools

`tsup`, `vite`, `rollup`... and tools that bundle by default

These tools bundle by default, and they all have their own solution.  
You won't need this plugin if you use them.

---

## ⚠ Limitations

This plugin is intentionally limited in scope to stay stable and focused.  
It assumes you're working in a standard single-package setup with a clear `inDir → outDir` compilation structure.

### ✅ Assumptions

- **All source files are located inside a single directory (usually `src/`)**,  
  defined via `baseUrl` in your `tsconfig.json`.

- **All compiled output goes into a single `outDir`**,  
  preserving the folder structure of your source directory.

- **Only aliases that resolve to files within your source tree (`baseUrl`) will be rewritten.**  
  Aliases resolving to files outside of either `inDir` or `outDir` will be skipped.
  This avoids broken imports due to missing `.js` output or nonstandard build setups.

- **This plugin does not touch external imports**,  
  including packages from `node_modules`, native modules (e.g. `fs`, `path`), or anything marked `external: true` by esbuild.

---

### 🚫 Unsupported features

- **Only the first path** in each alias entry will be used.  
  If you define fallback targets like:

  ```json
  {
    "paths": {
      "@lib/*": ["src/lib/*", "src/legacy-lib/*"]
    }
  }
  ```

  Only the first one (`src/lib/*`) will be used for rewriting.  
  _Support for fallback resolution may be added in the future, but is currently not implemented._

- **Alias-to-alias (chained alias) resolution is not supported.**  
  I don't want to make this plugin fall into the void and become a black hole of unstable resolution logic.  
  So no, `no-bundle-scoper` is not going to support it anytime soon.

---

### ⚠️ Important

This plugin **will not handle**:

- Paths that resolve to files outside of your source tree (e.g., `../../shared/xxx.ts`)
- Outputs from external or custom build systems
- Aliases pointing to already-compiled files (e.g., anything inside your `dist/` folder)

If your project uses a multi-package structure (monorepo),  
you must **build each package separately** and **run this plugin within each subpackage**.  
It is intentionally not designed to resolve or transform imports across packages.

_This keeps the plugin lightweight, predictable, and avoids unintended cross-package rewrites._

---



## License

MIT
