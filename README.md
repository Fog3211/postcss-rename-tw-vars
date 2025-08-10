## postcss-rename-tw-vars

PostCSS plugin to safely rename Tailwind CSS custom properties (like `--tw-*`) with a configurable prefix or mapping function. Handles `@property`, declarations, and `var()` usages consistently.

Installation:

```bash
pnpm add -D postcss-rename-tw-vars
```

Basic usage:

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

Options are documented in `SPEC.local.md`.


