/**
 * postcss-rename-tw-vars
 * A PostCSS plugin to rename Tailwind CSS custom properties (e.g. --tw-*)
 * with a configurable prefix or mapping function.
 *
 * Strings use single quotes, strict types, and avoid any/unsafe casts.
 */

import type { AtRule, Declaration, Plugin, PluginCreator, Root } from 'postcss'
// PostCSS types are imported above; no runtime import required
import valueParser, { FunctionNode, Node as ValueNode, WordNode } from 'postcss-value-parser'

// ---------- Types

export type IncludeExcludeRule = Array<string | RegExp> | ((name: string) => boolean)

export type RenameTwVarsTargets = {
  atProperty?: boolean
  declarations?: boolean
  values?: boolean
}

export type ConflictPolicy = 'throw' | 'skip' | 'overwrite'

export type RenameTwVarsOptions = {
  prefix?: string | ((originalName: string) => string)
  targets?: RenameTwVarsTargets
  scope?: {
    include?: IncludeExcludeRule
    exclude?: IncludeExcludeRule
  }
  conflictPolicy?: ConflictPolicy
  idempotent?: boolean
}

type NormalizedOptions = Required<Pick<RenameTwVarsOptions, 'conflictPolicy' | 'idempotent'>> & {
  prefix: string | ((originalName: string) => string)
  targets: Required<RenameTwVarsTargets>
  scope: { include: IncludeExcludeRule | undefined; exclude: IncludeExcludeRule | undefined }
}

const defaultOptions: NormalizedOptions = {
  prefix: '--tw-scope-',
  targets: { atProperty: true, declarations: true, values: true },
  scope: { include: [/^--tw-/], exclude: undefined },
  conflictPolicy: 'throw',
  idempotent: true,
}

// ---------- Helpers

const isRegExp = (v: unknown): v is RegExp => Object.prototype.toString.call(v) === '[object RegExp]'

const matchByRule = (name: string, rule: IncludeExcludeRule | undefined): boolean => {
  if (!rule) return false
  if (typeof rule === 'function') return rule(name)
  for (const item of rule) {
    if (typeof item === 'string') {
      if (name === item) return true
    } else if (isRegExp(item)) {
      if (item.test(name)) return true
    }
  }
  return false
}

const shouldProcessName = (name: string, opts: NormalizedOptions): boolean => {
  const inIncluded = opts.scope.include === undefined
    ? true
    : matchByRule(name, opts.scope.include)
  const inExcluded = matchByRule(name, opts.scope.exclude)
  return inIncluded && !inExcluded
}

const computeNewName = (name: string, prefix: NormalizedOptions['prefix']): string => {
  if (typeof prefix === 'function') return prefix(name)
  return name.replace(/^--tw-/, prefix)
}

const isAlreadyPrefixed = (
  original: string,
  computed: string,
  prefix: NormalizedOptions['prefix'],
): boolean => {
  if (typeof prefix === 'string') {
    if (original.startsWith(prefix)) return true
  }
  return original === computed
}

const ensureNoConflictDecl = (
  root: Root,
  current: Declaration,
  oldName: string,
  newName: string,
  policy: ConflictPolicy,
): boolean => {
  if (policy === 'overwrite') return true
  let exists = false
  root.walkDecls((decl: Declaration) => {
    if (decl === current) return
    if (decl.prop === newName) exists = true
  })
  if (!exists) return true
  if (policy === 'skip') return false
  throw new Error(`postcss-rename-tw-vars: conflict detected when renaming ${oldName} -> ${newName}`)
}

const ensureNoConflictAt = (
  root: Root,
  current: AtRule,
  oldName: string,
  newName: string,
  policy: ConflictPolicy,
): boolean => {
  if (policy === 'overwrite') return true
  let exists = false
  root.walkAtRules('property', (at: AtRule) => {
    if (at === current) return
    if (at.params.trim() === newName) exists = true
  })
  if (!exists) return true
  if (policy === 'skip') return false
  throw new Error(`postcss-rename-tw-vars: conflict detected when renaming ${oldName} -> ${newName}`)
}

const renameAtProperty = (root: Root, getNewName: (n: string) => string, shouldProcess: (n: string) => boolean, idempotent: boolean, policy: ConflictPolicy, prefix: NormalizedOptions['prefix']): void => {
  root.walkAtRules('property', (at: AtRule) => {
    const param = at.params.trim()
    if (!param.startsWith('--')) return
    const oldName = param
    if (!shouldProcess(oldName)) return
    const newName = getNewName(oldName)
    if (idempotent && isAlreadyPrefixed(oldName, newName, prefix)) return
    if (!ensureNoConflictAt(root, at, oldName, newName, policy)) return
    at.params = newName
  })
}

const renameDeclarations = (root: Root, getNewName: (n: string) => string, shouldProcess: (n: string) => boolean, idempotent: boolean, policy: ConflictPolicy, prefix: NormalizedOptions['prefix']): void => {
  root.walkDecls((decl: Declaration) => {
    if (!decl.prop.startsWith('--')) return
    const oldName = decl.prop
    if (!shouldProcess(oldName)) return
    const newName = getNewName(oldName)
    if (idempotent && isAlreadyPrefixed(oldName, newName, prefix)) return
    if (!ensureNoConflictDecl(root, decl, oldName, newName, policy)) return
    decl.prop = newName
  })
}

const renameVarInValues = (root: Root, getNewName: (n: string) => string, shouldProcess: (n: string) => boolean, idempotent: boolean, prefix: NormalizedOptions['prefix']): void => {
  root.walkDecls((decl: Declaration) => {
    const parsed = valueParser(decl.value)
    let modified = false
    parsed.walk((node: ValueNode) => {
      if (node.type !== 'function') return
      const fn = node as FunctionNode
      if (fn.value !== 'var') return
      const [first] = fn.nodes
      if (!first) return
      if (first.type === 'word') {
        const word = first as WordNode
        const name = word.value
        if (!name.startsWith('--')) return
        if (!shouldProcess(name)) return
        const newName = getNewName(name)
        if (idempotent && isAlreadyPrefixed(name, newName, prefix)) return
        word.value = newName
        modified = true
      }
    })
    if (modified) {
      decl.value = parsed.toString()
    }
  })
}

// ---------- Core transformer

const createTransformer = (options?: RenameTwVarsOptions) => {
  const scope: { include: IncludeExcludeRule | undefined; exclude: IncludeExcludeRule | undefined } = {
    include: options?.scope?.include ?? defaultOptions.scope.include,
    exclude: options?.scope?.exclude ?? defaultOptions.scope.exclude,
  }

  const opts: NormalizedOptions = {
    ...defaultOptions,
    ...options,
    targets: { ...defaultOptions.targets, ...(options?.targets ?? {}) },
    scope,
  }

  const getNewName = (name: string): string => computeNewName(name, opts.prefix)
  const shouldProcess = (name: string): boolean => shouldProcessName(name, opts)

  return (root: Root): void => {
    if (opts.targets.atProperty) {
      renameAtProperty(root, getNewName, shouldProcess, opts.idempotent, opts.conflictPolicy, opts.prefix)
    }
    if (opts.targets.declarations) {
      renameDeclarations(root, getNewName, shouldProcess, opts.idempotent, opts.conflictPolicy, opts.prefix)
    }
    if (opts.targets.values) {
      renameVarInValues(root, getNewName, shouldProcess, opts.idempotent, opts.prefix)
    }
  }
}

// ---------- Plugin exports

const creator: PluginCreator<RenameTwVarsOptions> = (options: RenameTwVarsOptions = {}): Plugin => ({
  postcssPlugin: 'postcss-rename-tw-vars',
  Once: createTransformer(options),
})
creator.postcss = true as const
export const renameTwVars = creator

export default renameTwVars


