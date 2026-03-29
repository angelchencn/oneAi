# Overview Builders List Design

## Goal

Update the overview scene so it shows a single builder count sourced from the configured builders list, removes the "精选动态" metric, and renders all builder display names in a readable two-column list.

## Problem

The current overview scene still uses the old two-stat layout:

- left: builder count
- right: selected item count labeled "精选动态"

This no longer matches the desired product behavior. The user wants the overview to focus only on the tracked builders and explicitly show all builder names on screen.

## Approved Approach

Use the existing overview scene and keep the change scoped to the current visual structure:

1. Keep the "今日追踪" title.
2. Keep one animated primary number for the builder count.
3. Remove the "精选动态" stat entirely.
4. Render the builder names from `builders.json` using each item's `name` field.
5. Present the names in a balanced two-column grid below the primary count.

## Scope

### In Scope

- Update overview scene layout
- Pass the builders list into the video render props
- Render builder names from `builders.json`
- Use the builder list length as the overview count
- Add or update tests for the new data flow and scene copy

### Out of Scope

- Changing intro or outro narration
- Changing tweet scene rendering
- Adding pagination, scrolling, or extra animations for the names list
- Supporting alternate display formats such as `@handle` or `name / handle`

## Data Flow

1. `builders.json` remains the single source of truth for tracked X accounts.
2. The scripts layer loads that file and already uses it for fetch.
3. The video generation pipeline should also pass the builder display names into Remotion props.
4. The overview component should render from those props instead of hardcoding or inferring names locally.

## Rendering Design

### Header

- Title remains "今日追踪"
- Primary animated metric remains centered
- Label remains "构建者"

### Builder Names

- Render all names from `builders.json`
- Use a two-column grid
- Keep typography smaller than the primary stat so the count stays dominant
- Prioritize fitting all 20 names on one screen without truncating the current list

## Files Expected To Change

- `scripts/generate-video.js`
  - Include builder names in the Remotion props
- `video/src/types.ts`
  - Extend props typing for the builders list if needed
- `video/src/VideoComposition.tsx`
  - Pass builder names into the overview scene
- `video/src/components/Overview.tsx`
  - Remove the second stat and render the two-column names list
- `scripts/tests/...` and/or `video` source tests
  - Cover the new overview data flow and rendering expectations

## Acceptance Criteria

1. The overview scene no longer shows "精选动态".
2. The numeric metric shown in the overview equals the number of entries in `builders.json`.
3. The overview scene renders all builder `name` values from `builders.json`.
4. Names appear in a two-column layout that remains readable with the current 20-item list.
5. Relevant tests pass after the change.
