export interface SomaticProbabilityMapping {
  tag: string;
  triggerProbability: number;
  preferredPlacement: "prefix" | "interleaved" | "suffix";
}

export interface ProsodyToSomaticMap {
  mood: string;
  category: string;
  description?: string;
  label?: string;
  pitchMod?: number;
  rateMod?: number;
  volumeMod?: number;
  allowedSomatics: SomaticProbabilityMapping[];
}

export const PROSODY_SOMATIC_MAPPING: Record<string, ProsodyToSomaticMap> = {
  // --- 🟢 RATED G ---
  "[storybook]": {
    mood: "[storybook]",
    category: "Rated G / Family",
    allowedSomatics: [
      { tag: "<gasp>", triggerProbability: 0.40, preferredPlacement: "prefix" },
      { tag: "<giggle>", triggerProbability: 0.35, preferredPlacement: "interleaved" },
      { tag: "<whoop>", triggerProbability: 0.15, preferredPlacement: "suffix" }
    ]
  },
  "[earnest]": {
    mood: "[earnest]",
    category: "Rated G / Family",
    allowedSomatics: [
      { tag: "<mm-hmm>", triggerProbability: 0.25, preferredPlacement: "prefix" },
      { tag: "<uh-huh>", triggerProbability: 0.20, preferredPlacement: "interleaved" }
    ]
  },
  "[sheepish]": {
    mood: "[sheepish]",
    category: "Rated G / Family",
    allowedSomatics: [
      { tag: "<cough-nervous>", triggerProbability: 0.50, preferredPlacement: "prefix" },
      { tag: "<chuckle-dry>", triggerProbability: 0.30, preferredPlacement: "suffix" }
    ]
  },
  // --- 🟡 RATED PG ---
  "[chummy]": {
    mood: "[chummy]",
    category: "Rated PG / Comedy-Drama",
    allowedSomatics: [
      { tag: "<lip-smack>", triggerProbability: 0.60, preferredPlacement: "prefix" },
      { tag: "<uh-huh>", triggerProbability: 0.35, preferredPlacement: "interleaved" },
      { tag: "<chuckle>", triggerProbability: 0.40, preferredPlacement: "suffix" }
    ]
  },
  "[exasperated]": {
    mood: "[exasperated]",
    category: "Rated PG / Comedy-Drama",
    allowedSomatics: [
      { tag: "<huff>", triggerProbability: 0.70, preferredPlacement: "prefix" },
      { tag: "<groan>", triggerProbability: 0.45, preferredPlacement: "interleaved" },
      { tag: "<tut-tut>", triggerProbability: 0.30, preferredPlacement: "prefix" }
    ]
  },
  "[suspicious]": {
    mood: "[suspicious]",
    category: "Rated PG / Comedy-Drama",
    allowedSomatics: [
      { tag: "<hmmm>", triggerProbability: 0.65, preferredPlacement: "prefix" },
      { tag: "<throat-clear-light>", triggerProbability: 0.35, preferredPlacement: "interleaved" },
      { tag: "<tskk>", triggerProbability: 0.25, preferredPlacement: "suffix" }
    ]
  },
  // --- 🟠 RATED PG-13 ---
  "[flirtatious]": {
    mood: "[flirtatious]",
    category: "Rated PG-13 / Romantic",
    description: "Lilting pitch, playful drawn-out vowels, teasing pauses, a smile and breathy laughter under the words",
    label: "Flirtatious",
    pitchMod: 1.05,
    rateMod: 0.88,
    volumeMod: 1.00,
    allowedSomatics: [
      { tag: "<giggle-nervous>", triggerProbability: 0.45, preferredPlacement: "interleaved" },
      { tag: "<titter>", triggerProbability: 0.30, preferredPlacement: "prefix" },
      { tag: "<lip-smack>", triggerProbability: 0.40, preferredPlacement: "prefix" }
    ]
  },
  "[coquettish]": {
    mood: "[coquettish]",
    category: "Rated PG-13 / Romantic",
    description: "Fluttering breathy high register, melodic sing-song giggles interspersed smoothly inside phrases",
    label: "Coquettish",
    pitchMod: 1.18,
    rateMod: 1.08,
    volumeMod: 0.90,
    allowedSomatics: [
      { tag: "<simper>", triggerProbability: 0.55, preferredPlacement: "prefix" },
      { tag: "<giggle>", triggerProbability: 0.40, preferredPlacement: "interleaved" }
    ]
  },
  "[terrified]": {
    mood: "[terrified]",
    category: "Rated PG-13 / Thriller",
    description: "High strained pitch, shaking voice, gasps, broken phrases, volume swinging between whisper and cry",
    label: "Terrified",
    pitchMod: 1.15,
    rateMod: 1.10,
    volumeMod: 0.85,
    allowedSomatics: [
      { tag: "<gasp>", triggerProbability: 0.80, preferredPlacement: "prefix" },
      { tag: "<catch-breath>", triggerProbability: 0.65, preferredPlacement: "interleaved" },
      { tag: "<whimper>", triggerProbability: 0.50, preferredPlacement: "suffix" }
    ]
  },
  "[passive-aggressive]": {
    mood: "[passive-aggressive]",
    category: "Rated PG-13 / Drama",
    description: "Clenched tight throat forcing a tight plastic smile, clipped sentences ending in sharp over-sweet pitches",
    label: "Passive-Aggressive",
    pitchMod: 1.10,
    rateMod: 1.05,
    volumeMod: 1.00,
    allowedSomatics: [
      { tag: "<tut-tut>", triggerProbability: 0.40, preferredPlacement: "prefix" },
      { tag: "<sigh>", triggerProbability: 0.50, preferredPlacement: "suffix" }
    ]
  },
  "[stern]": {
    mood: "[stern]",
    category: "Rated PG-13 / Drama",
    allowedSomatics: [
      { tag: "<throat-clear>", triggerProbability: 0.55, preferredPlacement: "prefix" },
      { tag: "<tskk>", triggerProbability: 0.35, preferredPlacement: "suffix" }
    ]
  },
  // --- 🔴 RATED R ---
  "[sultry]": {
    mood: "[sultry]",
    category: "Rated R / Mature",
    description: "Low slow close-mic intimacy, dark breathy timbre, stretched vowels, soft languid consonants",
    label: "Sultry",
    pitchMod: 0.90,
    rateMod: 0.78,
    volumeMod: 0.75,
    allowedSomatics: [
      { tag: "<saliva-click>", triggerProbability: 0.75, preferredPlacement: "prefix" },
      { tag: "<pant-shallow>", triggerProbability: 0.50, preferredPlacement: "interleaved" },
      { tag: "<sigh>", triggerProbability: 0.45, preferredPlacement: "suffix" }
    ]
  },
  "[amorous]": {
    mood: "[amorous]",
    category: "Rated R / Mature",
    description: "Heavy proximity effect, deeply breathy vocal onsets, low-frequency pitch tracking with lingering vowel elongation",
    label: "Amorous",
    pitchMod: 0.92,
    rateMod: 0.74,
    volumeMod: 0.70,
    allowedSomatics: [
      { tag: "<saliva-click>", triggerProbability: 0.85, preferredPlacement: "prefix" },
      { tag: "<pant-shallow>", triggerProbability: 0.70, preferredPlacement: "interleaved" },
      { tag: "<exhale-long>", triggerProbability: 0.40, preferredPlacement: "suffix" }
    ]
  },
  "[furious]": {
    mood: "[furious]",
    category: "Rated R / Mature",
    description: "Loud strained chest voice, hard consonant attacks, wide pitch peaks, shouting with explosive stresses",
    label: "Furious",
    pitchMod: 1.05,
    rateMod: 1.08,
    volumeMod: 1.15,
    allowedSomatics: [
      { tag: "<grunt-effort>", triggerProbability: 0.60, preferredPlacement: "prefix" },
      { tag: "<snarl>", triggerProbability: 0.40, preferredPlacement: "interleaved" },
      { tag: "<gasp-in>", triggerProbability: 0.50, preferredPlacement: "prefix" }
    ]
  },
  "[bloodthirsty]": {
    mood: "[bloodthirsty]",
    category: "Rated R / Mature",
    description: "Low guttural close-mic texturing, wet dynamic vocal clicks, ragged half-shouted bursts with sharp breath clamps",
    label: "Bloodthirsty",
    pitchMod: 0.88,
    rateMod: 1.05,
    volumeMod: 1.10,
    allowedSomatics: [
      { tag: "<growl>", triggerProbability: 0.55, preferredPlacement: "prefix" },
      { tag: "<cackle>", triggerProbability: 0.30, preferredPlacement: "suffix" },
      { tag: "<saliva-click>", triggerProbability: 0.45, preferredPlacement: "interleaved" }
    ]
  },
  "[sinister]": {
    mood: "[sinister]",
    category: "Rated R / Mature",
    description: "Soft purring unhurried villainy, elongated sibilants, a gentle smiling tone that contradicts the threat",
    label: "Sinister",
    pitchMod: 1.00,
    rateMod: 0.85,
    volumeMod: 0.75,
    allowedSomatics: [
      { tag: "<chuckle-sinister>", triggerProbability: 0.65, preferredPlacement: "prefix" },
      { tag: "<hiss>", triggerProbability: 0.35, preferredPlacement: "interleaved" }
    ]
  },
  "[icy]": {
    mood: "[icy]",
    category: "Rated R / Mature",
    allowedSomatics: [
      { tag: "<jaw-snap>", triggerProbability: 0.50, preferredPlacement: "prefix" },
      { tag: "<swallow>", triggerProbability: 0.45, preferredPlacement: "interleaved" }
    ]
  },
  // --- ❌ RATED NC-17 ---
  "[unhinged]": {
    mood: "[unhinged]",
    category: "NC-17 Extreme",
    description: "Violent uncontrolled swings between sharp high screams and quiet fast whispers, broken asynchronous breathing",
    label: "Unhinged",
    pitchMod: 1.15,
    rateMod: 1.26,
    volumeMod: 1.15,
    allowedSomatics: [
      { tag: "<gasp-choke>", triggerProbability: 0.70, preferredPlacement: "interleaved" },
      { tag: "<cackle>", triggerProbability: 0.50, preferredPlacement: "prefix" },
      { tag: "<pant-out>", triggerProbability: 0.60, preferredPlacement: "suffix" }
    ]
  },
  "[grieving]": {
    mood: "[grieving]",
    category: "NC-17 Extreme",
    description: "Heavy broken phrasing, voice catching and cracking, long silences, breath shaking at the ends of lines",
    label: "Grieving",
    pitchMod: 1.00,
    rateMod: 0.93,
    volumeMod: 1.00,
    allowedSomatics: [
      { tag: "<sob>", triggerProbability: 0.85, preferredPlacement: "interleaved" },
      { tag: "<snivel>", triggerProbability: 0.65, preferredPlacement: "prefix" },
      { tag: "<wail>", triggerProbability: 0.40, preferredPlacement: "suffix" }
    ]
  },
  "[feverish]": {
    mood: "[feverish]",
    category: "NC-17 Extreme",
    description: "Rapid hyper-ventilated pacing, ragged throat textures, erratic spikes in pitch, burning intense emphasis",
    label: "Feverish",
    pitchMod: 1.10,
    rateMod: 1.22,
    volumeMod: 1.00,
    allowedSomatics: [
      { tag: "<pant-in>", triggerProbability: 0.75, preferredPlacement: "prefix" },
      { tag: "<cough-dry>", triggerProbability: 0.50, preferredPlacement: "interleaved" },
      { tag: "<pant-out>", triggerProbability: 0.75, preferredPlacement: "suffix" }
    ]
  }
};
