# Tweet Scene Blur Background Design

## Goal

Fix tweet scenes so the rendered video shows the captured Twitter screenshot as the foreground while using a blurred image from the repository `background/` directory as the full-screen backdrop.

## Problem

The current tweet scene pipeline already assigns two different assets:

- `backgroundAsset`: the captured tweet screenshot
- `backdropAsset`: a reusable background image from `background/`

But the render layer does not use them correctly:

- `VideoComposition` passes `segment.backgroundAsset` into `VideoBg` for tweet scenes without supplying `segment.backdropAsset`

This produces the wrong structure: the tweet screenshot is reused for both the blurred backdrop and the visible foreground instead of using the assigned background image as the blur source.

## Approved Approach

Use the existing data model and make the smallest rendering change:

1. Tweet scenes keep `segment.backgroundAsset` as the foreground screenshot asset.
2. Tweet scenes use `segment.backdropAsset` as the blurred background image.
3. If `segment.backdropAsset` is missing, fall back to `segment.backgroundAsset` so the scene still renders.
4. Do not restore avatar, QR code, summary card, or other overlay UI.

## Scope

### In Scope

- Update tweet scene rendering to prefer `backdropAsset` for blurred backdrops
- Render the screenshot itself as the tweet foreground
- Preserve current intro, overview, podcast, blog, and outro behavior
- Add or update tests covering the corrected tweet asset flow

### Out of Scope

- Reintroducing tweet metadata cards
- Changing the screenshot capture pipeline
- Changing narration, subtitles, or timing
- Redesigning non-tweet scenes

## Rendering Design

### Tweet Scenes

- Background layer: full-screen blurred image using `segment.backdropAsset ?? segment.backgroundAsset`
- Foreground layer: centered screenshot using `segment.backgroundAsset`
- Framing: screenshot stays fully visible with `object-fit: contain`
- Styling: keep the current cinematic blurred backdrop treatment and a subtle shadow around the screenshot

### Non-Tweet Scenes

- No behavioral change

## Files Expected To Change

- `video/src/VideoComposition.tsx`
  - Route tweet scenes through `backdropAsset ?? backgroundAsset` for the background input
- `video/src/components/VideoBg.tsx`
  - Support rendering a separate backdrop source while keeping the existing centered foreground media layer
- `scripts/tests/video-scene-backgrounds.test.js`
  - Cover tweet backdrop preference and screenshot foreground rendering

## Acceptance Criteria

1. Tweet scenes show the captured tweet screenshot in the foreground.
2. Tweet scenes use images from the `background/` assignment flow as blurred backdrops.
3. If no `backdropAsset` exists, tweet scenes still render by falling back to the screenshot.
4. Existing non-tweet scene rendering stays unchanged.
5. Relevant tests pass after the change.
