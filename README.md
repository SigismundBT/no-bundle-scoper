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

## 🔧 Example usage with esbuild

### in `tsconfig.json`

```ts
{
  "compilerOptions": {
    ...
    "baseUrl": ".", //you can set what ever you want
    "paths": {
      "@app/*": ["src/*"],
      "@app2": ["src/utils/app2.ts"]
    }
  }
}

```

### in your build sript

```ts
import { build } from 'esbuild';
import { noBundleScoper } from 'no-bundle-scoper';

await build({
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
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

## 📦 Output Directory Requirement

This plugin requires at least one of the following to locate your output files:

- `tsconfig.compilerOptions.outDir`
- `esbuild`'s `outdir`
- or `outfile` (will use its directory)

> Otherwise, the plugin will throw an error.

---

## ❌ Not compatible tools

`tsup`, `vite`, `rollup... and tools that bundle by default

These tools bundle by default, and they all have their own solution.  
You won't need this plugin if you use them.

---

## ⚠ Limitations

- **Only the first path** in each `tsconfig.json` alias will be used.  
  If you define fallback targets like this:

  ```json
  {
    "paths": {
      "@lib/*": ["src/lib/*", "src/legacy-lib/*"]
    }
  }
  ```

  Only the first one (`src/lib/*`) will be used for rewriting.  
  _Support for fallback paths may be added in the future, but is currently not implemented._

- **Alias-to-alias (chained alias) resolution is not supported.**  
  I don't want to make my plugin fall into the void and make it unstable,  
  so no, I'm not gonna make no-bundle-scoper support it in the near future.

---

## ✅ When should you use this?

- You're building a Node.js project with **esbuild**
- You're using `tsconfig` paths / alias (like `@/`, `~`, etc.)
- You're building **without** bundling (`bundle: false`)
- You want to run the output files directly with native ESM support (`node --no-bundler`)

---

## License

MIT
