import rawMoodsData from '../data/voxpack_prosody_moods_100_clean.json';
import { PauseTier, Articulation, Pace } from '../types';

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
  tone: string;
  pace: Pace;
  family?: string;
  orientation?: string;
  pair?: string;
  laban?: string;
  pitchMod?: number; // 0.5 to 2.0
  rateMod?: number; // 0.5 to 2.0
  volumeMod?: number; // 0.0 to 1.0
  // Affect Vectors (Expert Phase 4/5)
  valence?: number; // -1.0 (negative/sad) to 1.0 (positive/happy)
  arousal?: number; // 0.0 (calm) to 1.0 (excited/intense)
  dominance?: number; // 0.0 (submissive) to 1.0 (commanding)
}

export const MOOD_PACE_SEED: Record<string, [number, PauseTier, Articulation]> = {
  "joyful": [1.05,"normal","neutral"],
  "playful": [1.15,"marked","neutral"],
  "mischievous": [1.1,"marked","staccato"],
  "giddy": [1.25,"short","neutral"],
  "amused": [1.0,"normal","neutral"],
  "triumphant": [1.0,"normal","neutral"],
  "proud": [0.88,"normal","neutral"],
  "ecstatic": [1.25,"short","neutral"],
  "whimsical": [0.93,"normal","legato"],
  "affectionate": [0.88,"normal","neutral"],
  "soothing": [0.88,"normal","legato"],
  "reassuring": [0.88,"marked","neutral"],
  "compassionate": [0.9,"marked","legato"],
  "grateful": [1.0,"normal","neutral"],
  "flirtatious": [0.88,"marked","legato"],
  "sultry": [0.78,"normal","legato"],
  "devoted": [0.92,"normal","legato"],
  "earnest": [0.93,"normal","legato"],
  "serene": [0.88,"long","legato"],
  "reverent": [0.88,"marked","neutral"],
  "reflective": [0.88,"long","neutral"],
  "drowsy": [0.82,"long","legato"],
  "relieved": [1.0,"normal","neutral"],
  "hopeful": [1.0,"normal","neutral"],
  "stoic": [0.93,"marked","neutral"],
  "melancholy": [0.88,"normal","neutral"],
  "grieving": [0.93,"long","neutral"],
  "wistful": [0.88,"normal","legato"],
  "weary": [0.88,"normal","neutral"],
  "resigned": [0.88,"normal","neutral"],
  "tearful": [0.93,"normal","neutral"],
  "disappointed": [0.88,"normal","neutral"],
  "bittersweet": [0.88,"normal","neutral"],
  "numb": [1.0,"normal","neutral"],
  "anxious": [1.15,"marked","neutral"],
  "terrified": [1.1,"marked","staccato"],
  "panicked": [1.25,"short","staccato"],
  "hesitant": [1.0,"long","neutral"],
  "suspicious": [0.88,"marked","staccato"],
  "dread": [0.88,"long","neutral"],
  "shocked": [1.0,"long","staccato"],
  "shy": [1.15,"marked","neutral"],
  "fragile": [1.0,"marked","neutral"],
  "exasperated": [1.0,"normal","staccato"],
  "furious": [1.08,"normal","staccato"],
  "icy": [0.88,"long","staccato"],
  "defiant": [1.08,"marked","staccato"],
  "indignant": [1.15,"normal","staccato"],
  "bitter": [0.88,"normal","staccato"],
  "impatient": [1.15,"normal","staccato"],
  "menacing": [0.88,"marked","neutral"],
  "stern": [0.88,"normal","staccato"],
  "sarcastic": [0.88,"normal","legato"],
  "wry": [1.0,"normal","legato"],
  "dismissive": [0.88,"normal","legato"],
  "contemptuous": [0.88,"normal","neutral"],
  "condescending": [0.88,"normal","neutral"],
  "mocking": [1.08,"normal","staccato"],
  "smug": [0.88,"normal","neutral"],
  "cheeky": [1.15,"normal","staccato"],
  "arch": [1.0,"marked","neutral"],
  "disgusted": [0.88,"normal","neutral"],
  "commanding": [0.9,"marked","staccato"],
  "confident": [0.93,"normal","legato"],
  "imperious": [0.88,"normal","staccato"],
  "determined": [0.93,"marked","neutral"],
  "urgent": [1.15,"short","staccato"],
  "rallying": [1.0,"normal","neutral"],
  "solemn": [0.88,"marked","neutral"],
  "oratorical": [0.93,"marked","legato"],
  "guarded": [0.88,"marked","neutral"],
  "flustered": [1.25,"normal","neutral"],
  "sheepish": [1.0,"marked","neutral"],
  "pleading": [0.93,"normal","neutral"],
  "ashamed": [0.88,"long","neutral"],
  "bewildered": [1.0,"marked","neutral"],
  "defensive": [1.15,"normal","staccato"],
  "wounded": [0.88,"marked","neutral"],
  "envious": [0.88,"normal","staccato"],
  "deferential": [1.15,"normal","neutral"],
  "float": [0.88,"normal","legato"],
  "glide": [0.88,"normal","legato"],
  "press": [0.88,"normal","neutral"],
  "wring": [0.88,"normal","neutral"],
  "punch": [1.15,"normal","staccato"],
  "slash": [1.15,"normal","staccato"],
  "dab": [1.15,"normal","staccato"],
  "flick": [1.15,"normal","staccato"],
  "breathless": [1.25,"short","neutral"],
  "languid": [0.78,"long","legato"],
  "oracular": [0.85,"long","legato"],
  "incantatory": [0.93,"normal","legato"],
  "conspiratorial": [1.0,"marked","staccato"],
  "eerie": [0.93,"normal","legato"],
  "delirious": [1.08,"normal","staccato"],
  "entranced": [0.88,"normal","legato"],
  "lament": [0.93,"normal","neutral"],
  "storyteller": [1.0,"marked","neutral"],
  "sinister": [0.85,"marked","legato"],
  "hypnotic": [0.78,"marked","legato"]
};

export function generateTone(desc: string): string {
  const paceRegex = /\b(slow(ed|ing)?|fast|rapid|quick(ened)?|hurried|pauses?|clipped|tempo|rhythm|cadence|staccato|legato|delay|pace|measured|unhurried)\b[^,.]*/gi;
  let tone = desc.replace(paceRegex, '').replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim();
  tone = tone.replace(/,\s*$/, '').replace(/^,\s*/, '');
  return tone || desc;
}

export function resolvePace(
  persona: { rate: number },
  mood: Pace,
  override?: Partial<Pace>
): Pace {
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  const rate = clamp(persona.rate * (override?.rate ?? mood.rate), 0.6, 1.5);
  const pause = override?.pause ?? mood.pause;
  const articulation = override?.articulation ?? mood.articulation;
  return { rate, pause, articulation };
}

export function compilePaceForGemini(pace: Pace): string {
  const parts: string[] = [];
  if (pace.rate < 0.82) parts.push("speaking very slowly");
  else if (pace.rate < 0.95) parts.push("speaking slowly");
  else if (pace.rate > 1.2) parts.push("speaking rapidly");
  else if (pace.rate > 1.05) parts.push("speaking briskly");

  if (pace.pause === 'marked') parts.push("deliberate pauses");
  else if (pace.pause === 'long') parts.push("long pauses between phrases");
  else if (pace.pause === 'short') parts.push("minimal pauses");

  if (pace.articulation === 'legato') parts.push("smooth connected phrasing");
  else if (pace.articulation === 'staccato') parts.push("clipped phrasing");

  return parts.join(", ");
}

const STORAGE_KEY = 'lila_custom_moods';
const SELECTED_MOOD_KEY = 'lila_selected_mood_id';
const DYNAMIC_PROSODY_KEY = 'lila_contextual_dynamic_prosody';

/**
 * Determine best category from tag and description
 */
function categorizeMood(tag: string, desc: string): MoodOption['category'] {
  const t = tag.replace(/[\[\]]/g, '').toLowerCase();
  
  if (['float', 'glide', 'press', 'wring', 'punch', 'slash', 'dab', 'flick'].includes(t)) {
    return 'Laban Movement Efforts';
  }
  if (['oracular', 'incantatory', 'conspiratorial', 'eerie', 'delirious', 'entranced', 'lament', 'storyteller', 'sinister', 'hypnotic', 'languid'].includes(t)) {
    return 'Mystical & Atmospheric';
  }
  if (['joyful', 'playful', 'mischievous', 'giddy', 'amused', 'triumphant', 'proud', 'ecstatic', 'whimsical', 'cheerful'].includes(t)) {
    return 'Joy & Playfulness';
  }
  if (['affectionate', 'soothing', 'reassuring', 'compassionate', 'grateful', 'flirtatious', 'sultry', 'devoted', 'earnest'].includes(t)) {
    return 'Warmth & Intimacy';
  }
  if (['serene', 'reverent', 'reflective', 'drowsy', 'relieved', 'hopeful', 'stoic'].includes(t)) {
    return 'Calm & Reflection';
  }
  if (['melancholy', 'grieving', 'wistful', 'weary', 'resigned', 'tearful', 'disappointed', 'bittersweet', 'numb'].includes(t)) {
    return 'Sorrow & Grief';
  }
  if (['anxious', 'terrified', 'panicked', 'hesitant', 'suspicious', 'dread', 'shocked', 'shy', 'fragile', 'breathless'].includes(t)) {
    return 'Fear & Anxiety';
  }
  if (['exasperated', 'furious', 'icy', 'defiant', 'indignant', 'bitter', 'impatient', 'menacing', 'stern'].includes(t)) {
    return 'Anger & Defiance';
  }
  if (['sarcastic', 'wry', 'dismissive', 'contemptuous', 'condescending', 'mocking', 'smug', 'cheeky', 'arch', 'disgusted'].includes(t)) {
    return 'Irony & Disdain';
  }
  if (['commanding', 'confident', 'imperious', 'determined', 'urgent', 'rallying', 'solemn', 'oratorical'].includes(t)) {
    return 'Command & Authority';
  }
  if (['guarded', 'flustered', 'sheepish', 'pleading', 'ashamed', 'bewildered', 'defensive', 'wounded', 'envious', 'deferential'].includes(t)) {
    return 'Insecurity & Submission';
  }

  return 'Natural & Conversational';
}

function inferAcousticModifiers(tag: string, desc: string): { pitchMod: number; rateMod: number; volumeMod: number } {
  const d = desc.toLowerCase();
  const t = tag.replace(/[\[\]]/g, '').toLowerCase();

  let pitch = 1.0;
  let rate = 1.0;
  let volume = 1.0;

  const hasHighPitch = /\b(high(er)?|lifted|soaring|leaping)\b/i.test(d) || t === 'giddy' || t === 'ecstatic';
  const hasLowPitch = /\b(low(ered)?|darker|sinking|flattened|deep)\b/i.test(d) || t === 'stern' || t === 'commanding' || t === 'dread';

  if (hasHighPitch) {
    pitch = 1.15;
  } else if (hasLowPitch) {
    pitch = 0.90;
  }

  const hasFastRate = (/\b(fast|rapid|quick(ened)?|hurried)\b/i.test(d) && !/\bunhurried\b/i.test(d)) || t === 'panicked' || t === 'urgent' || t === 'breathless';
  const hasSlowRate = /\b(slow(ed|ing)?|measured|unhurried|drifting|languid)\b/i.test(d) || t === 'hypnotic';

  if (hasFastRate) {
    rate = 1.18;
  } else if (hasSlowRate) {
    rate = 0.88;
  }

  const hasLowVol = /\b(whisper(ing)?|soft(ened|ly)?|quiet(ly)?|hushed|lowered volume)\b/i.test(d) || t === 'sultry';
  const hasHighVol = /\b(shout(ed|ing)?|loud(er)?|explosive|swelling|projected)\b/i.test(d) || t === 'furious' || t === 'triumphant' || t === 'punch';

  if (hasLowVol) {
    volume = 0.75;
  } else if (hasHighVol) {
    volume = 1.12;
  }

  return { pitchMod: pitch, rateMod: rate, volumeMod: volume };
}

function formatLabel(tag: string): string {
  const clean = tag.replace(/[\[\]]/g, '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function inferVADModifiers(tag: string, category: string, desc: string): { valence: number; arousal: number; dominance: number } {
  const t = tag.replace(/[\[\]]/g, '').toLowerCase();
  const d = desc.toLowerCase();
  
  // Default neutral
  let v = 0.0;
  let a = 0.5;
  let d_val = 0.5;

  // Category Baselines
  if (category.includes('Joy')) { v = 0.7; a = 0.8; d_val = 0.6; }
  else if (category.includes('Warmth')) { v = 0.8; a = 0.4; d_val = 0.4; }
  else if (category.includes('Sorrow')) { v = -0.7; a = 0.3; d_val = 0.3; }
  else if (category.includes('Fear')) { v = -0.6; a = 0.9; d_val = 0.2; }
  else if (category.includes('Anger')) { v = -0.5; a = 0.9; d_val = 0.8; }
  else if (category.includes('Command')) { v = 0.2; a = 0.7; d_val = 0.9; }
  else if (category.includes('Irony')) { v = -0.2; a = 0.6; d_val = 0.7; }
  else if (category.includes('Insecurity')) { v = -0.3; a = 0.5; d_val = 0.2; }
  else if (category.includes('Mystical')) { v = 0.1; a = 0.4; d_val = 0.6; }

  // Keyword Fine-tuning
  if (/\b(whisper|soft|hushed|quiet)\b/i.test(d)) a -= 0.2;
  if (/\b(loud|shout|explosive|intense)\b/i.test(d)) a += 0.2;
  if (/\b(gentle|calm|relaxed)\b/i.test(d)) a -= 0.1;
  if (/\b(urgent|rapid|fast)\b/i.test(d)) a += 0.15;
  
  if (/\b(sad|grief|pain|hurt|loss)\b/i.test(d)) v -= 0.2;
  if (/\b(happy|excited|delight|joy)\b/i.test(d)) v += 0.2;
  
  if (/\b(power|authority|control|force)\b/i.test(d)) d_val += 0.2;
  if (/\b(weak|timid|hesitant|unsure)\b/i.test(d)) d_val -= 0.2;

  return { 
    valence: Math.max(-1, Math.min(1, v)), 
    arousal: Math.max(0, Math.min(1, a)), 
    dominance: Math.max(0, Math.min(1, d_val)) 
  };
}

export const EXHAUSTIVE_MOODS: MoodOption[] = (rawMoodsData as any[]).map((item) => {
  const cleanId = item.tag.replace(/[\[\]]/g, '').toLowerCase();
  const acoustic = inferAcousticModifiers(item.tag, item.description);
  const category = categorizeMood(item.tag, item.description);
  const seedPace = MOOD_PACE_SEED[cleanId] || [1.0, 'normal', 'neutral'];
  const pace: Pace = {
    rate: seedPace[0],
    pause: seedPace[1],
    articulation: seedPace[2]
  };
  const tone = generateTone(item.description);
  const vad = inferVADModifiers(item.tag, category, item.description);

  return {
    id: cleanId,
    label: formatLabel(item.tag),
    tag: item.tag,
    category,
    description: item.description,
    tone,
    pace,
    family: item.family || category,
    orientation: item.orientation || 'neutral',
    pair: item.pair,
    laban: item.laban,
    pitchMod: acoustic.pitchMod,
    rateMod: pace.rate,
    volumeMod: acoustic.volumeMod,
    valence: vad.valence,
    arousal: vad.arousal,
    dominance: vad.dominance,
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

export function findMoodByTag(tagOrText: string): MoodOption | undefined {
  const clean = tagOrText.replace(/[\[\]]/g, '').trim().toLowerCase();
  const target = clean === 'whisper' ? 'conspiratorial' : clean;
  return EXHAUSTIVE_MOODS.find(m => m.id === target || m.tag.replace(/[\[\]]/g, '').toLowerCase() === target);
}

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

  const cleanText = text.replace(/\[[^\]]+\]/g, '').replace(/\s{2,}/g, ' ').trim();

  return { cleanText, mood: foundMood, detectedTag };
}

export function isContextualProsodyEnabled(): boolean {
  return localStorage.getItem(DYNAMIC_PROSODY_KEY) !== 'false';
}

export function setContextualProsodyEnabled(enabled: boolean): void {
  localStorage.setItem(DYNAMIC_PROSODY_KEY, enabled ? 'true' : 'false');
}
