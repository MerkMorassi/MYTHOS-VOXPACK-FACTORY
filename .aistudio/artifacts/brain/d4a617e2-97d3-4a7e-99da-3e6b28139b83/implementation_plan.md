# Implementation Plan - Mythos Voxpack Factory (Revised)

## Core Priority Tasks

1.  **Session History Export (JSON)**: Add a button to the Chat/Lore view that exports the current session as a JSON file. Include: `timestamp`, `role`, `content`, and the `mood` tag associated with each message.
2.  **Voice Studio Clarity**: Update the `VoiceStudio` component to clearly indicate when a voice sample is "Loaded & Active". Display the filename of the analyzed sample so the user knows exactly what the current profile is grounded in.
3.  **Draft Persistence Hook**: Implement `useDraftPersistence(value, key)` hook. It should throttle/debounce saves of the current input box to `localStorage` every 3 seconds, allowing for automatic restoration on page refresh.
4.  **Dynamic Vocal Performance (Pace & Parser)**: Implement the `parseVoxLine` parser to handle mid-sentence mood shifts (e.g., `[curious] Wait, [happy] you're here!`). Introduce the `Pace` vector (`rate`, `pause`, `articulation`) to move beyond simple speed adjustments.
5.  **Emotional Momentum & Hysteresis**: Implement logic to persist `ProsodyState` across turns. Use a scored candidate selection with hysteresis (diff > 0.25) to ensure mood transitions feel organic and earned, not binary.

## Technical Deliverables
- `src/hooks/useDraftPersistence.ts`
- `src/services/historyExporter.ts`
- Updated `VoiceStudio.tsx` and `ChatContainer.tsx`
- Refined `parseVoxLine` in `src/services/voxLineParser.ts`
- Momentum logic in `server.ts`


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
