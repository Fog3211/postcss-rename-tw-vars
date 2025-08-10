import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { renameTwVars } from '../src/index'

const run = async (input: string, opts = {}) => {
  const result = await postcss([renameTwVars(opts)]).process(input, { from: undefined })
  return result.css
}
const squash = (s: string): string => s.replace(/\s+/g, '')

describe('options & behaviors', () => {
  it('renames var() with fallback correctly', async () => {
    const css = `.a{color:var(--tw-color, red)}`
    const out = await run(css)
    expect(out).toContain('var(--tw-scope-color, red)')
  })

  it('include as function only renames matched names', async () => {
    const css = `:root{--tw-foo-x:1;--tw-bar-y:2}.a{a:var(--tw-foo-x);b:var(--tw-bar-y)}`
    const out = await run(css, { scope: { include: (n: string) => /^--tw-foo-/.test(n) } })
    expect(squash(out)).toContain('--tw-scope-foo-x:1')
    expect(out).toContain('var(--tw-scope-foo-x)')
    expect(squash(out)).toContain('--tw-bar-y:2')
    expect(out).toContain('var(--tw-bar-y)')
  })

  it('exclude prevents renaming for excluded names', async () => {
    const css = `:root{--tw-keep:1;--tw-chg:2}.a{a:var(--tw-keep);b:var(--tw-chg)}`
    const out = await run(css, { scope: { exclude: ['--tw-keep'] } })
    expect(squash(out)).toContain('--tw-keep:1')
    expect(out).toContain('var(--tw-keep)')
    expect(squash(out)).toContain('--tw-scope-chg:2')
    expect(out).toContain('var(--tw-scope-chg)')
  })

  it('targets.values=false keeps values unchanged', async () => {
    const css = `:root{--tw-a:1}.a{v:var(--tw-a)}`
    const out = await run(css, { targets: { values: false } })
    expect(squash(out)).toContain('--tw-scope-a:1')
    expect(out).toContain('var(--tw-a)')
  })

  it('targets.atProperty=false keeps @property unchanged', async () => {
    const css = `@property --tw-x{syntax:'*'}:root{--tw-x:1}.a{c:var(--tw-x)}`
    const out = await run(css, { targets: { atProperty: false } })
    expect(out).toContain('@property --tw-x')
    expect(squash(out)).toContain('--tw-scope-x:1')
    expect(out).toContain('var(--tw-scope-x)')
  })

  it('conflictPolicy=skip keeps existing name and skips rename', async () => {
    const css = `:root{--tw-x:1;--tw-scope-x:9}`
    const out = await run(css, { conflictPolicy: 'skip', targets: { values: false } })
    expect(squash(out)).toContain('--tw-x:1')
    expect(squash(out)).toContain('--tw-scope-x:9')
  })

  it('conflictPolicy=overwrite allows duplicate new names', async () => {
    const css = `:root{--tw-x:1;--tw-scope-x:9}`
    const out = await run(css, { conflictPolicy: 'overwrite', targets: { values: false } })
    expect(squash(out)).toContain('--tw-scope-x:1')
    expect(squash(out)).toContain('--tw-scope-x:9')
  })

  it('works inside calc() and nested function', async () => {
    const css = `.a{b:calc(1*var(--tw-ring))}`
    const out = await run(css)
    expect(out).toContain('calc(1*var(--tw-scope-ring))')
  })
})


