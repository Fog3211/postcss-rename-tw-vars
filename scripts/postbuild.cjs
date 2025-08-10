/*
  Ensure CJS build filename matches package.json main field.
  tsup outputs dist/index.js (CJS) and dist/index.mjs (ESM) by default.
  We duplicate CJS file to dist/index.cjs.js so that require() consumers
  (e.g. some PostCSS loaders) can import it reliably.
*/
const fs = require('fs')
const path = require('path')

const distDir = path.join(__dirname, '..', 'dist')
const cjsFrom = path.join(distDir, 'index.js')
const cjsTo = path.join(distDir, 'index.cjs.js')

if (fs.existsSync(cjsFrom)) {
  fs.copyFileSync(cjsFrom, cjsTo)
}


