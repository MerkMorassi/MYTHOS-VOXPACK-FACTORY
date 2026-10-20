import rawMoodsData from '../data/voxpack_prosody_moods_100_clean.json';

export interface MoodOption {
  id: string;
  label: string;
  tag: string;
  category: 
    | 'Joy & Playfulness'
    | 'Warmth & Intimacy'
    | 'Calm & Reflection'
    | 'Sorrow & Grief'
    | 'Fear & Anxiety'
    | 'Anger & Defiance'
    | 'Irony & Disdain'
    | 'Command & Authority'
    | 'Insecurity & Submission'
    | 'Laban Movement Efforts'
    | 'Mystical & Atmospheric'
    | 'Natural & Conversational'
    | 'Custom';
  description: string;
  pitchMod?: number; // 0.5 to 2.0
  rateMod?: number; // 0.5 to 2.0
  volumeMod?: number; // 0.0 to 1.0
}

const STORAGE_KEY = 'lila_custom_moods';
const SELECTED_MOOD_KEY = 'lila_selected_mood_id';
const DYNAMIC_PROSODY_KEY = 'lila_contextual_dynamic_prosody';

/**
 * Determine best category from tag and description
 */
function categorizeMood(tag: string, desc: string): MoodOption['category'] {
  const t = tag.replace(/[\[\]]/g, '').toLowerCase();
  
  // Laban Movement Efforts
  if (['float', 'glide', 'press', 'wring', 'punch', 'slash', 'dab', 'flick'].includes(t)) {
    return 'Laban Movement Efforts';
  }
  
  // Mystical & Atmospheric
  if (['oracular', 'incantatory', 'conspiratorial', 'eerie', 'delirious', 'entranced', 'lament', 'storyteller', 'sinister', 'hypnotic', 'languid'].includes(t)) {
    return 'Mystical & Atmospheric';
  }

  // Joy & Playfulness
  if (['joyful', 'playful', 'mischievous', 'giddy', 'amused', 'triumphant', 'proud', 'ecstatic', 'whimsical', 'cheerful'].includes(t)) {
    return 'Joy & Playfulness';
  }

  // Warmth & Intimacy
  if (['affectionate', 'soothing', 'reassuring', 'compassionate', 'grateful', 'flirtatious', 'sultry', 'devoted', 'earnest'].includes(t)) {
    return 'Warmth & Intimacy';
  }

  // Calm & Reflection
  if (['serene', 'reverent', 'reflective', 'drowsy', 'relieved', 'hopeful', 'stoic'].includes(t)) {
    return 'Calm & Reflection';
  }

  // Sorrow & Grief
  if (['melancholy', 'grieving', 'wistful', 'weary', 'resigned', 'tearful', 'disappointed', 'bittersweet', 'numb'].includes(t)) {
    return 'Sorrow & Grief';
  }

  // Fear & Anxiety
  if (['anxious', 'terrified', 'panicked', 'hesitant', 'suspicious', 'dread', 'shocked', 'shy', 'fragile', 'breathless'].includes(t)) {
    return 'Fear & Anxiety';
  }

  // Anger & Defiance
  if (['exasperated', 'furious', 'icy', 'defiant', 'indignant', 'bitter', 'impatient', 'menacing', 'stern'].includes(t)) {
    return 'Anger & Defiance';
  }

  // Irony & Disdain
  if (['sarcastic', 'wry', 'dismissive', 'contemptuous', 'condescending', 'mocking', 'smug', 'cheeky', 'arch', 'disgusted'].includes(t)) {
    return 'Irony & Disdain';
  }

  // Command & Authority
  if (['commanding', 'confident', 'imperious', 'determined', 'urgent', 'rallying', 'solemn', 'oratorical'].includes(t)) {
    return 'Command & Authority';
  }

  // Insecurity & Submission
  if (['guarded', 'flustered', 'sheepish', 'pleading', 'ashamed', 'bewildered', 'defensive', 'wounded', 'envious', 'deferential'].includes(t)) {
    return 'Insecurity & Submission';
  }

  return 'Natural & Conversational';
}

/**
 * Infer acoustic modifiers (pitch, rate, volume) from description text
 */
function inferAcousticModifiers(tag: string, desc: string): { pitchMod: number; rateMod: number; volumeMod: number } {
  const d = desc.toLowerCase();
  const t = tag.replace(/[\[\]]/g, '').toLowerCase();

  let pitch = 1.0;
  let rate = 1.0;
  let volume = 1.0;

  // Pitch calculation with word-boundary checks
  const hasHighPitch = /\b(high(er)?|lifted|soaring|leaping)\b/i.test(d) || t === 'giddy' || t === 'ecstatic';
  const hasLowPitch = /\b(low(ered)?|darker|sinking|flattened|deep)\b/i.test(d) || t === 'stern' || t === 'commanding' || t === 'dread';

  if (hasHighPitch) {
    pitch = 1.15;
  } else if (hasLowPitch) {
    pitch = 0.90;
  }

  // Rate / Tempo calculation with word-boundary checks
  const hasFastRate = (/\b(fast|rapid|quick(ened)?|hurried)\b/i.test(d) && !/\bunhurried\b/i.test(d)) || t === 'panicked' || t === 'urgent' || t === 'breathless';
  const hasSlowRate = /\b(slow(ed|ing)?|measured|unhurried|drifting|languid)\b/i.test(d) || t === 'hypnotic';

  if (hasFastRate) {
    rate = 1.18;
  } else if (hasSlowRate) {
    rate = 0.88;
  }

  // Volume calculation with word-boundary checks
  const hasLowVol = /\b(whisper(ing)?|soft(ened|ly)?|quiet(ly)?|hushed|lowered volume)\b/i.test(d) || t === 'sultry';
  const hasHighVol = /\b(shout(ed|ing)?|loud(er)?|explosive|swelling|projected)\b/i.test(d) || t === 'furious' || t === 'triumphant' || t === 'punch';

  if (hasLowVol) {
    volume = 0.75;
  } else if (hasHighVol) {
    volume = 1.12;
  }

  return { pitchMod: pitch, rateMod: rate, volumeMod: volume };
}

/**
 * Format tag into clean display title
 */
function formatLabel(tag: string): string {
  const clean = tag.replace(/[\[\]]/g, '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Full 100 baseline prosody moods compiled from voxpack_prosody_moods_100_clean.json
 */
export const EXHAUSTIVE_MOODS: MoodOption[] = rawMoodsData.map((item) => {
  const cleanId = item.tag.replace(/[\[\]]/g, '').toLowerCase();
  const acoustic = inferAcousticModifiers(item.tag, item.description);
  const category = categorizeMood(item.tag, item.description);

  return {
    id: cleanId,
    label: formatLabel(item.tag),
    tag: item.tag,
    category,
    description: item.description,
    pitchMod: acoustic.pitchMod,
    rateMod: acoustic.rateMod,
    volumeMod: acoustic.volumeMod,
  };
});

export const VOXPACK_BASE_MOODS_100 = EXHAUSTIVE_MOODS;

export const MOOD_CATEGORIES = [
  'All',
  'Joy & Playfulness',
  'Warmth & Intimacy',
  'Calm & Reflection',
  'Sorrow & Grief',
  'Fear & Anxiety',
  'Anger & Defiance',
  'Irony & Disdain',
  'Command & Authority',
  'Insecurity & Submission',
  'Laban Movement Efforts',
  'Mystical & Atmospheric',
  'Custom',
] as const;

export function getSavedMoods(): MoodOption[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EXHAUSTIVE_MOODS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < EXHAUSTIVE_MOODS.length) {
      // Merge custom moods created by user with the full 100 baseline
      const customOnes = Array.isArray(parsed)
        ? parsed.filter((p: MoodOption) => !EXHAUSTIVE_MOODS.some(m => m.id === p.id))
        : [];
      return [...EXHAUSTIVE_MOODS, ...customOnes];
    }
    return parsed;
  } catch {
    return EXHAUSTIVE_MOODS;
  }
}

export function saveMood(mood: MoodOption): void {
  const existing = getSavedMoods();
  const updated = [...existing.filter(m => m.id !== mood.id), mood];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteMood(id: string): void {
  const existing = getSavedMoods();
  const updated = existing.filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getSavedMoodId(): string {
  return localStorage.getItem(SELECTED_MOOD_KEY) || 'joyful';
}

export function saveMoodId(id: string): void {
  localStorage.setItem(SELECTED_MOOD_KEY, id);
}

export function getMoodById(id: string): MoodOption {
  const moods = getSavedMoods();
  return moods.find(m => m.id === id) || EXHAUSTIVE_MOODS.find(m => m.id === id) || EXHAUSTIVE_MOODS[0];
}

/**
 * Finds a matching mood by tag (e.g. "[whisper]" or "whisper")
 */
export function findMoodByTag(tagOrText: string): MoodOption | undefined {
  const clean = tagOrText.replace(/[\[\]]/g, '').trim().toLowerCase();
  const target = clean === 'whisper' ? 'conspiratorial' : clean;
  return EXHAUSTIVE_MOODS.find(m => m.id === target || m.tag.replace(/[\[\]]/g, '').toLowerCase() === target);
}

/**
 * Contextual Dynamic Prosody detection from generated model text:
 * Extracts first bracketed tag and strips every [tag] anywhere in the text.
 */
export function extractContextualProsody(text: string): { cleanText: string; mood?: MoodOption; detectedTag?: string } {
  if (!text) return { cleanText: text };
  
  const firstMatch = text.match(/\[([a-zA-Z\-_]+)(?::[0-9.]+)?(?:\s*[^\]]*)?\]/);
  let foundMood: MoodOption | undefined;
  let detectedTag: string | undefined;

  if (firstMatch) {
    const rawTag = firstMatch[1].toLowerCase();
    foundMood = findMoodByTag(rawTag);
    detectedTag = `[${rawTag}]`;
  }

  // Strip every [tag] anywhere in the text so later tags are not read aloud
  const cleanText = text.replace(/\[[^\]]+\]/g, '').replace(/\s{2,}/g, ' ').trim();

  return { cleanText, mood: foundMood, detectedTag };
}

/**
 * Check if Contextual Dynamic Prosody is active
 */
export function isContextualProsodyEnabled(): boolean {
  return localStorage.getItem(DYNAMIC_PROSODY_KEY) !== 'false';
}

export function setContextualProsodyEnabled(enabled: boolean): void {
  localStorage.setItem(DYNAMIC_PROSODY_KEY, enabled ? 'true' : 'false');
}
