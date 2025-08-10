import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import { renameTwVars } from '../src/index'

const run = async (input: string, opts = {}) => {
  const result = await postcss([renameTwVars(opts)]).process(input, { from: undefined })
  return result.css
}

describe('postcss-rename-tw-vars', () => {
  it('renames @property, declaration and var() with default prefix', async () => {
    const css = `
      @property --tw-foo { syntax: '*'; }
      :root { --tw-foo: 1; }
      .a { x: var(--tw-foo, 0); }
    `
    const out = await run(css)
    expect(out).toContain('@property --tw-scope-foo')
    expect(out).toContain('--tw-scope-foo: 1')
    expect(out).toContain('var(--tw-scope-foo, 0)')
  })

  it('supports custom prefix', async () => {
    const css = `:root{--tw-bar:2}.a{y:var(--tw-bar)}`
    const out = await run(css, { prefix: '--app-tw-' })
    expect(out.replace(/\s+/g, '')).toContain('--app-tw-bar:2')
    expect(out).toContain('var(--app-tw-bar)')
  })

  it('is idempotent', async () => {
    const css = `:root{--tw-baz:3}.a{z:var(--tw-baz)}`
    const first = await run(css, { prefix: '--tw-scope-' })
    const second = await run(first, { prefix: '--tw-scope-' })
    expect(second).toBe(first)
  })
})


