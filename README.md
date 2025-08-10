## postcss-rename-tw-vars

PostCSS plugin to safely rename Tailwind CSS custom properties (like `--tw-*`) with a configurable prefix or mapping function. It consistently updates `@property`, custom property declarations, and `var()` usages.

### Installation

```bash
pnpm add -D postcss-rename-tw-vars
```

### Basic usage

```js
// postcss.config.js
const { renameTwVars } = require('postcss-rename-tw-vars')

module.exports = {
  plugins: [
    require('tailwindcss'),
    renameTwVars({ prefix: '--tw-scope-' }),
    require('autoprefixer')
  ]
}
```

CommonJS config (explicit `.cjs`) also works:

```js
// postcss.config.cjs
const { renameTwVars } = require('postcss-rename-tw-vars')
module.exports = { plugins: [renameTwVars({ prefix: '--tw-scope-' })] }
```

### Options

All options are optional.

```ts
type RenameTwVarsOptions = {
  // 1) Prefix or mapping function. Default: '--tw-scope-'
  prefix?: string | ((originalName: string) => string)

  // 2) Which nodes to transform. Default: all true
  targets?: {
    atProperty?: boolean   // @property --tw-...
    declarations?: boolean // --tw-...: value
    values?: boolean       // var(--tw-...[, fallback])
  }

  // 3) Which variable names are eligible
  scope?: {
    include?: Array<string | RegExp> | ((name: string) => boolean) // default [/^--tw-/]
    exclude?: Array<string | RegExp> | ((name: string) => boolean)
  }

  // 4) Name conflict handling. Default: 'throw'
  conflictPolicy?: 'throw' | 'skip' | 'overwrite'

  // 5) Prevent re-prefixing. Default: true
  idempotent?: boolean
}
```

Examples:

```js
renameTwVars({ prefix: '--app-tw-' })

renameTwVars({
  scope: {
    include: [/^--tw-(color|bg|ring)-/],
    exclude: ['--tw-ring-inset'],
  },
})

renameTwVars({
  prefix: (name) => name.replace(/^--tw-/, '--custom-tw-'),
  conflictPolicy: 'skip',
  targets: { values: true, declarations: true, atProperty: true },
})
```

### Compatibility

- PostCSS v8 (peer: `postcss >=7 <9` — typical modern setups are v8)
- Node.js >= 16 recommended



