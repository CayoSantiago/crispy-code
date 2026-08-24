# Rename Ask thread titles

Date: 2026-08-24

## Problem

Ask thread titles are generated from the first question and never change. The sidebar history (`ChatHistory`) can delete a thread from its context menu, but it cannot rename one. Users need to give threads durable names they choose.

## Scope

In:

- A **Rename** item on the existing thread context menu
- Inline title editing in the history row
- A dedicated `ask.renameThread` procedure that persists the new title without changing list order

Out:

- Double-click, keyboard shortcut, or any rename entry point other than the context menu
- A generic `updateThread` patch API
- A new `ChatHistoryItem` component
- Toasts, dialogs, or `window.prompt`
- A test runner or automated tests (this repo has none)
- Showing the title anywhere other than the history list

## Behavior

- **Rename** sits above **Delete** in the row context menu.
- Choosing **Rename** closes the menu, puts that row into edit mode, focuses the input, and selects the current title. Only one row edits at a time.
- In edit mode the title is a single-line input (`maxLength` 80). The relative time stays on the right. That row is not a link (an input inside a `Link` is invalid HTML and would navigate on click or Enter). Other rows stay links.
- **Enter** saves if the trimmed title is non-empty and different from the current title. Otherwise Enter cancels. Unchanged titles do not call the server.
- **Escape** and **click-away (blur)** cancel and restore the previous title. Only Enter saves. Starting Rename on a different row is click-away: the first row cancels, the second enters edit mode.
- While a save is in flight, ignore blur/Escape cancel. The input is disabled; a failed request keeps the draft and edit mode so the user can retry or then press Escape.
- A blank or whitespace-only title is treated as cancel. The previous title stays.
- After save or cancel, the row is a link again.
- Rename does not move the thread in the list. Only new questions change order (`updatedAt`).

## Architecture

Add `ask.renameThread` next to `deleteThread`.

- Input: `{ threadId, title }`
- Output: `{ ok: true }` (same as delete)
- Auth and ownership: signed-in user; thread must belong to that user. Missing or foreign thread: `NOT_FOUND` with message `Chat not found.`
- Title: trim, require at least one character, maximum 80 characters (same cap as auto-generated titles, but user titles are not ellipsized). Empty after trim: `BAD_REQUEST`. Over 80: `BAD_REQUEST`.
- Persistence: write `title` and set `updatedAt` to the value already stored so Prisma `@updatedAt` does not bump the timestamp and the list order does not change.
- After success, the client invalidates `listThreads`, same as start and delete. Title only appears in the history list, so no other query needs a refetch. No optimistic cache write.

## UI

Keep edit state in `ChatHistory`: which thread is being renamed, plus the draft title.

While the request is in flight, disable the input. On success, leave edit mode and let the invalidated query show the new title. On network or other failure, stay in edit mode with the draft kept so the user can retry or press Escape. Do not add a toast system.

## Testing

This repo has no test runner. This feature does not add one.

Seams to test later, if a runner appears:

1. `ask.renameThread` — owner can change the title; `updatedAt` and list order stay the same; missing/foreign threads return `NOT_FOUND`; empty and over-80 titles are rejected.
2. Title input schema — trim, require at least one character, cap at 80.

No ChatHistory component tests.

Verification for this work: typecheck, plus using Rename in the sidebar (save, Escape cancel, click-away cancel, blank title cancels, list order unchanged).
