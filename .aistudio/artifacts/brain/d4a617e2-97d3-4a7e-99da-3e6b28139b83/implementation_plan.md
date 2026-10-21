# Implementation Plan - Mythos Voxpack Factory (Phases 1-4)

## User Requirements & Scope
- **Phase 1: Pace as Its Own Vector**: Add `PauseTier`, `Articulation`, and `Pace` interfaces to `src/types.ts`. Upgrade mood records to `voxpack.mood.v2` with `tone` and `pace`. Seed every mood's pace from the provided table. Implement `resolvePace` and compile pace attributes into Gemini style descriptors.
- **Phase 2: Mid-Line Mood Shifts (`voxline.v1`)**: Implement robust `parseVoxLine(raw, ctx)` parser handling inline tags (`[mood]`, `[mood:intensity]`, `[mood ~ms]`, `[mood |ms]`, `[mood !]`, `[pace ...]`, `[/pace]`). Strip all directives, drop unknown tags safely, snap to word boundaries, merge short segments (< 3 words), and fill enter transitions using `classifyTransition`.
- **Phase 3: Transitions & RENDER A/B**: Implement `classifyTransition` (none, beat, blend, ramp). Build diagnostic test endpoint / component to test Render A (single generateContent with N speechMetadata parts) vs Render B (server-side PCM stitching and audio crossfading).
- **Phase 4: Momentum Across Turns**: Persist per-speaker `ProsodyState` (`mood`, `intensity`, `pace`, `at`) with the session. Implement scored candidate selection with hysteresis (score diff > 0.25). Store rendered `voxline.v1` with every message for identical audio replays.
- **Deliverables**: Unit tests for `parseVoxLine`, `classifyTransition`, `resolvePace`, and word-boundary regexes. Demo script for rendering sample line through Render A and Render B.

---

## Proposed Changes

### 1. Types (`src/types.ts`)
- Define `PauseTier = 'short' | 'normal' | 'marked' | 'long'`
- Define `Articulation = 'legato' | 'neutral' | 'staccato'`
- Define `Pace = { rate: number; pause: PauseTier; articulation: Articulation }`
- Update `MoodOption` and mood schema for v2.

### 2. Mood Store & Parser (`src/services/moodStore.ts`)
- Seed all 100 moods with pace data from the table.
- Implement `resolvePace(persona, mood, override)`.
- Implement `parseVoxLine(raw, ctx)` and `classifyTransition(a, b)`.

### 3. Server-side TTS and Rendering (`server.ts`)
- Update TTS prompt compilation using Gemini style word mappings.
- Add diagnostic endpoint for RENDER A vs B comparison.

### 4. Unit Tests (`src/__tests__/voxpack.test.ts`)
- Add comprehensive Vitest unit tests for parser, pace resolution, transition classification, and word boundary regexes.

---

## Verification Plan
- Run `compile_applet` and `lint_applet` (`tsc --noEmit`).
- Run Vitest unit tests to verify `parseVoxLine`, `resolvePace`, and `classifyTransition`.
