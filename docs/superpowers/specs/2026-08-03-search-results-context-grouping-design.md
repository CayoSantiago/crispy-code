# Search Results: Context Lines & File Grouping

## Goal

Update Find search results so they feel like an IDE find panel: show ripgrep context around matches, group lines by file so the path appears once, and show line numbers in a left gutter.

## Decisions

| Topic | Choice |
| --- | --- |
| Cluster style | Ripgrep-style: one file header; separate clusters when context windows do not overlap |
| Context size | Fixed `±2` for now (`rg --context 2`); leave room for a future UI control |
| Truncation | Still cap by **match** count (10 matches per project in the UI) |
| Data shape | Nest files → clusters → lines under existing project groups |
| Visual layout | Editor gutter: right-aligned line numbers, muted context, light wash on match rows, dashed/spaced gap between clusters |

## Data model

Keep project-level groups. Replace the flat `matches[]` list with nested structure:

```ts
type SearchLine = {
  lineNumber: number
  lineText: string
  kind: 'match' | 'context'
  /** Present only when kind === 'match' */
  matchRanges?: Array<{ start: number; end: number }>
}

type SearchCluster = {
  lines: SearchLine[]
}

type SearchFile = {
  relativePath: string
  absolutePath: string
  matchCount: number
  clusters: SearchCluster[]
}

type SearchGroup = {
  sourceId: string
  sourceLabel: string
  projectName: string
  sourceKind: 'local' | 'github'
  files: SearchFile[]
  /** Total match lines in this group (not context lines) */
  matchCount: number
}
```

Response fields:

- `groups: SearchGroup[]`
- `totalMatches: number` — counts match lines only
- `missingSources` — unchanged

Context lines never count toward `totalMatches` or the UI’s 10-match cap.

## Search pipeline

1. Keep spawning ripgrep with `--json --context 2` (and existing flags for mode/case/glob/max-count).
2. Parse both `type: "match"` and `type: "context"` JSON events (stop skipping context).
3. Within each project group, group events by file (`absolutePath` / `relativePath`).
4. Build clusters in ripgrep order: contiguous context+match lines form one cluster; start a new cluster when rg would insert a gap (non-overlapping context windows / rg’s separator between match regions).
5. Overlapping or adjacent context merges into a single cluster (no divider).
6. Preserve `matchRanges` from rg submatches on match lines for `<mark>` highlighting.

Future: a context-size control can change the `--context N` argument without changing the nested response shape.

## UI

### Structure

Under each project header (`projectName (matchCount)` + `sourceLabel`):

1. **File header** — `relativePath` once. Hover actions on the header: copy path, open in Cursor, open in VS Code.
2. **Clusters** — for each cluster, render lines as a two-column gutter layout:
   - Left: right-aligned line number
   - Right: code text (`<pre>`/`<code>` style, monospace)
   - Match rows: subtle background wash; match tokens via existing `<mark>` ranges
   - Context rows: muted foreground
3. **Gap** — dashed divider between clusters in the same file
4. **Truncation** — stop after 10 **matches** per project; omit later files/clusters as needed. Footer: “Showing 10 of N matches for this project.” when capped.

### Interactions

- Click a line (number or text) → `/find/file?path=<absolutePath>&line=<lineNumber>`
- File header link → same route at the first **visible** match line in that file (after truncation)
- Copy snippet → copy the cluster’s lines (line text joined with newlines), not only the match line

### Out of scope

- UI control for context size (pipeline remains fixed at 2)
- Changing project grouping, filters, or search chrome
- Syntax highlighting beyond match `<mark>`

## Edge cases

- Match at file start/end (fewer than 2 context lines) → render whatever rg returns
- Truncation mid-file → include only clusters whose matches fit in the remaining budget; do not show a match without its already-associated cluster lines; do not partially split a match line
- Same relative path under different sources/projects → separate `SearchFile` entries (key by `sourceId` + `absolutePath`)
- Empty context (only match event) → single-line cluster is valid

## Testing

- Parser/unit: rg match + context event sequences → correct files, clusters, and gaps
- Truncation helper: stops after N matches; does not count context toward the budget
- UI smoke: file path not repeated per line; gutter line numbers; match vs context styling; cluster gaps

## Primary files

- `apps/web/features/find/schemas.ts` — nested response schemas/types
- `apps/web/features/find/search.ts` — parse context events; group into files/clusters
- `apps/web/components/find/search-results.tsx` — editor-gutter UI
- Tests colocated with search parsing if present, or add focused unit coverage for clustering/truncation
