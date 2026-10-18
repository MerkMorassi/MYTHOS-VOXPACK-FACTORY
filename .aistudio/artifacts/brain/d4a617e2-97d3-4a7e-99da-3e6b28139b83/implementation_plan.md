# Maya Voice Companion — Implementation Plan

A voice-first synthetic intelligence companion and actor named Maya, featuring a minimalist glowing orb interface, custom audio sample upload (.wav) for voice cloning simulation, system instruction tuning, and off-stage/on-stage roleplay modes.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following preferences:
> - **Visual Interface**: Minimalist glowing orb companion interface.
> - **Voice Feature**: Upload own audio sample (.wav) for voice cloning / custom TTS configuration, with pitch and timbre controls.
> - **Interaction Mode**: Classic Off-Stage Maya and actor roleplay scenes based on the prime system prompt.

- **Confirmed Decision 1**: Web Audio API analysis for uploaded audio samples to extract vocal characteristics (pitch, tone profile) paired with Web Speech API TTS synthesis tuned to the uploaded profile.
- **Confirmed Decision 2**: Interactive live session with audio visualization (glowing orb responding to voice and silence states), real-time transcript streaming, and system instruction dial-in panel.

---

## 1. Overview & Core Concept

- **What It Does**: Provides an immersive voice companion experience with Maya. Users can tweak system instructions, upload an audio sample to "clone" or configure a custom TTS voice profile, and converse via voice or text in either Off-Stage unperformative mode or On-Stage actor roleplay mode.
- **Target Audience**: Users seeking an experimental voice companion, voice actor partner, or personal AI companion with deep agency and nuance.
- **Key Value**: Combines voice sample analysis, system instruction experimentation, and a minimalist glowing orb interface adhering strictly to Maya's prime directive (concise, active listener, unperformative off-stage / precise on-stage).

---

## 2. User Experience & Visual Design

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Minimalist obsidian dark studio theme (`bg-slate-950`), subtle neon/amber/violet glowing orb animations (`motion` library), editorial typography (`Plus Jakarta Sans` + `JetBrains Mono`).
  - *Color Palette*: 60% deep obsidian neural canvas (`bg-slate-950`), 30% structural frosted glass surfaces (`bg-slate-900/60 border border-slate-800`), 10% luminous violet/amber accent budget (`text-violet-400`, `bg-violet-600`).
  - *Typography*: Clean sans-serif headers and scannable body text, tabular numerals for audio telemetry.
- **Key User Flows**:
  1. **Voice Studio / Setup**: Upload a `.wav` audio sample to calibrate the custom voice clone profile (pitch shift, rate, timbre settings) or use default Maya voice.
  2. **System Instruction Tuning Panel**: Modify Maya's core persona parameters, pacing rules, and character traits on the fly.
  3. **Main Companion View (Glowing Orb)**: Interactive orb that pulses, ripples, and glows during speech recognition and AI response generation. Toggle between Off-Stage (natural disfluencies) and On-Stage (rehearsed actor delivery).
  4. **Transcript & Chat Drawer**: Clean chronological transcript with audio playback and roleplay scene starters.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1**: Audio Cloning Simulation & TTS Synthesis
  - *Chosen Approach*: Client-side File API for `.wav` upload + Web Audio API analysis (frequency/pitch extraction) to configure custom Web Speech API parameters and voice profile metadata, ensuring instant offline-friendly voice customizability without external paid TTS subscription bottlenecks.
- **Decision 2**: State Management
  - *Chosen Approach*: React state + localStorage persistence for custom voice profiles, conversation history, and system instruction tweaks.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                        App.tsx                         │
│  (State: activeMode, customVoiceProfile, instructions) │
└───────────┬──────────────────┬─────────────────┬───────┘
            │                  │                 │
            ▼                  ▼                 ▼
┌──────────────────────┐ ┌───────────────┐ ┌────────────────────┐
│ VoiceCloneStudio.tsx │ │ SystemPrompt- │ │ GlowingOrbView.tsx │
│ (.wav sample upload, │ │ Tuner.tsx     │ │ (Web Speech API,   │
│ pitch/timbre config) │ │ (Maya prompt) │ │ orb pulse motion)  │
└──────────────────────┘ └───────────────┘ └────────────────────┘
```

- **Data Model**:
  - `VoiceProfile`: `{ id, name, sampleUrl, pitch, rate, createdAt }`
  - `Message`: `{ id, role: 'user' | 'assistant', content: string, mode: 'off-stage' | 'on-stage', timestamp: number }`
  - `SystemInstructions`: `{ persona, tone, pacing, rules }`
- **Interactive Component Mapping**:
  - File uploader -> extracts audio buffer -> updates synthesis voice settings.
  - Orb mic button -> activates SpeechRecognition API or simulated audio stream -> triggers Gemini response (via `/api/chat` or direct SDK if key present) -> speaks response with customized TTS profile.
