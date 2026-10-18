export interface MoodOption {
  id: string;
  label: string;
  tag: string;
  category: 'Natural & Conversational' | 'High Energy & Expressive' | 'Dramatic & Theatrical' | 'Somber & Vulnerable' | 'Curious & Analytical' | 'Custom';
  description: string;
  pitchMod?: number; // 0.5 to 2.0
  rateMod?: number; // 0.5 to 2.0
  volumeMod?: number; // 0.0 to 1.0
}

const STORAGE_KEY = 'lila_custom_moods';
const SELECTED_MOOD_KEY = 'lila_selected_mood_id';

export const EXHAUSTIVE_MOODS: MoodOption[] = [
  { id: 'natural', label: 'Natural & Grounded', tag: '[natural]', category: 'Natural & Conversational', description: 'Balanced, spontaneous conversational flow', pitchMod: 1.0, rateMod: 1.0, volumeMod: 1.0 },
  { id: 'excited', label: 'Excited & Electric', tag: '[excited]', category: 'High Energy & Expressive', description: 'Bright pitch elevation, animated', pitchMod: 1.15, rateMod: 1.12, volumeMod: 1.0 },
  { id: 'whisper', label: 'Hushed Whisper', tag: '[whisper]', category: 'Natural & Conversational', description: 'Sub-vocal breathy whisper', pitchMod: 0.95, rateMod: 0.88, volumeMod: 0.7 },
  { id: 'dramatic', label: 'Dramatic & High Tension', tag: '[dramatic]', category: 'Dramatic & Theatrical', description: 'Heightened theatrical gravity', pitchMod: 1.05, rateMod: 0.95, volumeMod: 1.0 },
  { id: 'noir', label: 'Retro Noir & Smoky', tag: '[noir]', category: 'Dramatic & Theatrical', description: 'Smoky, world-weary detective cadence', pitchMod: 0.88, rateMod: 0.9, volumeMod: 0.9 },
  { id: 'playful', label: 'Playful & Teasing', tag: '[playful]', category: 'High Energy & Expressive', description: 'Mischievous upward lilt', pitchMod: 1.08, rateMod: 1.05, volumeMod: 1.0 },
  { id: 'warm', label: 'Warm & Empathetic', tag: '[warm]', category: 'Natural & Conversational', description: 'Soothing resonance, compassionate', pitchMod: 1.02, rateMod: 0.95, volumeMod: 1.0 },
  { id: 'urgent', label: 'Urgent & Crisis', tag: '[urgent]', category: 'Dramatic & Theatrical', description: 'Rapid-fire clipped delivery', pitchMod: 1.12, rateMod: 1.2, volumeMod: 1.1 },
  { id: 'melancholic', label: 'Melancholic & Yearning', tag: '[melancholic]', category: 'Somber & Vulnerable', description: 'Downturned melodic contours', pitchMod: 0.92, rateMod: 0.88, volumeMod: 0.8 },
  { id: 'inquisitive', label: 'Curious & Inquisitive', tag: '[inquisitive]', category: 'Curious & Analytical', description: 'Rising question inflections', pitchMod: 1.06, rateMod: 1.04, volumeMod: 1.0 },
];

export function getSavedMoods(): MoodOption[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EXHAUSTIVE_MOODS;
    return JSON.parse(raw);
  } catch {
    return EXHAUSTIVE_MOODS;
  }
}

export function saveMood(mood: MoodOption) {
  const existing = getSavedMoods();
  const updated = [...existing.filter(m => m.id !== mood.id), mood];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteMood(id: string) {
  const existing = getSavedMoods();
  const updated = existing.filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getSavedMoodId(): string {
  return localStorage.getItem(SELECTED_MOOD_KEY) || 'natural';
}

export function saveMoodId(id: string): void {
  localStorage.setItem(SELECTED_MOOD_KEY, id);
}

export function getMoodById(id: string): MoodOption {
  const moods = getSavedMoods();
  return moods.find(m => m.id === id) || moods[0];
}

export const MOOD_CATEGORIES = [
  'Natural & Conversational',
  'High Energy & Expressive',
  'Dramatic & Theatrical',
  'Somber & Vulnerable',
  'Curious & Analytical',
  'Custom',
] as const;
