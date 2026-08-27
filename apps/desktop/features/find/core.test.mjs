import assert from 'node:assert/strict'
import test from 'node:test'
import { capSearchGroups } from './cap-evidence.ts'
import {
  buildSearchGroups,
  truncateFilesByMatchBudget,
} from './cluster-search-lines.ts'
import { localRootIdFromPath } from './root-id.ts'
import { createSourceMatchBudget } from './search-budget.ts'

const event = (overrides = {}) => ({
  sourceId: 'local:root',
  sourceLabel: 'root',
  sourceKind: 'local',
  projectName: 'project',
  absolutePath: '/root/project/file.ts',
  relativePath: 'project/file.ts',
  lineNumber: 1,
  lineText: 'const value = true',
  kind: 'match',
  matchRanges: [{ start: 6, end: 11 }],
  ...overrides,
})

test('buildSearchGroups separates non-contiguous lines into clusters', () => {
  const [group] = buildSearchGroups([
    event(),
    event({ lineNumber: 2, kind: 'context', matchRanges: [] }),
    event({ lineNumber: 8, lineText: 'return value' }),
  ])

  assert.equal(group.matchCount, 2)
  assert.equal(group.files[0].clusters.length, 2)
})

test('truncateFilesByMatchBudget never returns a partial cluster', () => {
  const [group] = buildSearchGroups([
    event(),
    event({ lineNumber: 2, lineText: 'return value' }),
  ])

  assert.deepEqual(truncateFilesByMatchBudget(group.files, 1), [])
})

test('createSourceMatchBudget limits matches across files and chunks', () => {
  const budget = createSourceMatchBudget(2)

  assert.equal(budget.accept('context'), true)
  assert.equal(budget.accept('match'), true)
  assert.equal(budget.reached, false)
  assert.equal(budget.accept('match'), true)
  assert.equal(budget.reached, true)
  assert.equal(budget.accept('context'), false)
  assert.equal(budget.accept('match'), false)
})

test('localRootIdFromPath keeps case-distinct Linux paths unique', () => {
  assert.notEqual(
    localRootIdFromPath('/workspace/Project'),
    localRootIdFromPath('/workspace/project'),
  )
})

test('capSearchGroups limits evidence to eight files', () => {
  const groups = Array.from({ length: 9 }, (_, index) => ({
    sourceId: 'local:root',
    sourceLabel: 'root',
    sourceKind: 'local',
    projectName: `project-${index}`,
    matchCount: 1,
    files: [
      {
        relativePath: `project-${index}/file.ts`,
        absolutePath: `/root/project-${index}/file.ts`,
        matchCount: 1,
        clusters: [
          {
            lines: [
              {
                lineNumber: 1,
                lineText: 'match',
                kind: 'match',
                matchRanges: [{ start: 0, end: 5 }],
              },
            ],
          },
        ],
      },
    ],
  }))

  assert.equal(capSearchGroups(groups).length, 8)
})
