import { MoodOption, findMoodByTag, EXHAUSTIVE_MOODS } from './moodStore';
import { Pace, PauseTier, Articulation } from '../types';
import { ECHOS_VOICE_TAGS, ECHOS_ALIASES } from './echos/echosEngine';

export interface VoxSegment {
  text: string;
  mood: string;
  intensity: number;
  pace: Pace;
  enter: {
    kind: 'none' | 'blend' | 'ramp' | 'beat' | 'cut';
    ms: number;
  };
  echosSound?: {
    tag: string;
    lvl: number;
    under?: boolean;
    offsetMs?: number;
  };
}

export interface VoxLine {
  v: number;
  speaker: string;
  segments: VoxSegment[];
}

/**
 * Classify transition between mood A and mood B according to Phase 3 spec
 */
export function classifyTransition(
  a: MoodOption | undefined,
  b: MoodOption | undefined
): { kind: 'none' | 'blend' | 'ramp' | 'beat' | 'cut'; ms: number } {
  if (!a || !b || a.tag === b.tag) return { kind: 'none', ms: 0 };
  if (a.pair === b.tag || b.pair === a.tag) return { kind: 'beat', ms: 350 };
  const flip = a.orientation !== b.orientation && a.orientation !== 'neutral' && b.orientation !== 'neutral';
  if (flip) return { kind: 'beat', ms: 250 };
  if (a.family === b.family) return { kind: 'blend', ms: 0 };
  return { kind: 'ramp', ms: 600 };
}

/**
 * Parse raw response text containing inline square-bracket directives into canonical voxline.v1 structure.
 */
export function parseVoxLine(raw: string, defaultMood: MoodOption, speaker = 'LILA'): VoxLine {
  if (!raw) {
    return {
      v: 1,
      speaker,
      segments: [{
        text: '',
        mood: defaultMood.id,
        intensity: 0.6,
        pace: defaultMood.pace || { rate: 1.0, pause: 'normal', articulation: 'neutral' },
        enter: { kind: 'none', ms: 0 }
      }]
    };
  }

  // Directive regex matching Phase 2 spec: /\[(\/pace|pace [^\]]+|[a-z_-]+(?::[0-9.]+)?(?: (?:~\d+|\|\d+|!))?)\]/g
  const directiveRegex = /\[(\/pace|pace [^\]]+|[a-z_-]+(?::[0-9.]+)?(?: (?:~\d+|\|\d+|!))?)\]/g;
  
  const segments: Array<{
    text: string;
    mood: MoodOption;
    intensity: number;
    paceOverride?: Partial<Pace>;
    enterExplicit?: { kind: 'none' | 'blend' | 'ramp' | 'beat' | 'cut'; ms: number };
    echosSound?: { tag: string; lvl: number; under?: boolean; offsetMs?: number };
  }> = [];

  let currentMood = defaultMood;
  let currentIntensity = 0.6;
  let currentPaceOverride: Partial<Pace> | undefined = undefined;
  let pendingEchosSound: { tag: string; lvl: number; under?: boolean; offsetMs?: number } | undefined = undefined;
  let pendingEnter: { kind: 'none' | 'blend' | 'ramp' | 'beat' | 'cut'; ms: number } | undefined = undefined;
  
  let match: RegExpExecArray | null;

  const firstDirectiveIndex = raw.search(/\[/);
  const leadingText = firstDirectiveIndex > 0 ? raw.slice(0, firstDirectiveIndex).trim() : '';
  if (leadingText) {
    segments.push({
      text: leadingText,
      mood: currentMood,
      intensity: currentIntensity,
      paceOverride: currentPaceOverride
    });
  }

  while ((match = directiveRegex.exec(raw)) !== null) {
    const directive = match[1].trim();
    const directiveEnd = match.index + match[0].length;

    const nextMatchIndex = raw.indexOf('[', directiveEnd);
    const chunkText = nextMatchIndex !== -1 
      ? raw.slice(directiveEnd, nextMatchIndex).trim()
      : raw.slice(directiveEnd).trim();

    if (directive === '/pace') {
      currentPaceOverride = undefined;
    } else if (directive.startsWith('pace ')) {
      const paceArgs = directive.slice(5).trim();
      const numRate = parseFloat(paceArgs);
      if (!isNaN(numRate)) {
        currentPaceOverride = { rate: numRate };
      } else {
        const overrides: Partial<Pace> = {};
        if (paceArgs.includes('slow')) overrides.rate = 0.85;
        if (paceArgs.includes('fast')) overrides.rate = 1.18;
        if (paceArgs.includes('pause=long')) overrides.pause = 'long';
        if (paceArgs.includes('pause=marked')) overrides.pause = 'marked';
        if (paceArgs.includes('pause=short')) overrides.pause = 'short';
        if (paceArgs.includes('art=staccato')) overrides.articulation = 'staccato';
        if (paceArgs.includes('art=legato')) overrides.articulation = 'legato';
        currentPaceOverride = overrides;
      }
    } else {
      const parts = directive.split(/\s+/);
      const moodPart = parts[0];
      const [tagPart, intensityPart] = moodPart.split(':');
      const found = findMoodByTag(tagPart);

      if (found) {
        currentMood = found;
        if (intensityPart) {
          const parsedInt = parseFloat(intensityPart);
          if (!isNaN(parsedInt)) currentIntensity = Math.max(0, Math.min(1, parsedInt));
        }
        for (let i = 1; i < parts.length; i++) {
          const mod = parts[i];
          if (mod.startsWith('~')) {
            const ms = parseInt(mod.slice(1), 10);
            if (!isNaN(ms)) pendingEnter = { kind: 'ramp', ms };
          } else if (mod.startsWith('|')) {
            const ms = parseInt(mod.slice(1), 10);
            if (!isNaN(ms)) pendingEnter = { kind: 'beat', ms };
          } else if (mod === '!') {
            pendingEnter = { kind: 'cut', ms: 0 };
          }
        }
      } else {
        const cleanTag = tagPart.toLowerCase();
        const alias = ECHOS_ALIASES[cleanTag];
        const isVoiceTag = ECHOS_VOICE_TAGS.includes(cleanTag as any);
        if (isVoiceTag || alias) {
          const effectiveTag = alias ? alias.tag : cleanTag;
          const effectiveLvl = intensityPart ? parseInt(intensityPart, 10) : (alias ? alias.lvl : 2);
          const moodTarget = alias ? alias.mood : (effectiveTag === 'sigh' ? 'disappointed' : effectiveTag === 'laugh' ? 'playful' : effectiveTag === 'gasp' ? 'surprised' : 'intimate');
          const matchedMood = findMoodByTag(moodTarget);
          if (matchedMood) {
            currentMood = matchedMood;
          }
          pendingEchosSound = {
            tag: effectiveTag,
            lvl: Math.max(1, Math.min(3, isNaN(effectiveLvl) ? 2 : effectiveLvl)),
            under: directive.includes('under'),
          };
        } else {
          console.warn(`[VoxLineParser] Unknown tag dropped: [${directive}]`);
        }
      }
    }

    if (chunkText) {
      segments.push({
        text: chunkText,
        mood: currentMood,
        intensity: currentIntensity,
        paceOverride: currentPaceOverride,
        enterExplicit: pendingEnter,
        echosSound: pendingEchosSound
      });
      pendingEchosSound = undefined;
      pendingEnter = undefined;
    }
  }

  if (segments.length === 0 && raw.trim()) {
    segments.push({
      text: raw.replace(/\[[^\]]+\]/g, '').trim(),
      mood: defaultMood,
      intensity: 0.6,
    });
  }

  // Merge any segment under 3 words into its neighbor
  for (let i = 0; i < segments.length; i++) {
    const words = segments[i].text.split(/\s+/).filter(Boolean);
    if (words.length < 3 && segments.length > 1) {
      if (i > 0) {
        segments[i - 1].text += ' ' + segments[i].text;
        segments.splice(i, 1);
        i--;
      } else if (i < segments.length - 1) {
        segments[i + 1].text = segments[i].text + ' ' + segments[i + 1].text;
        segments.splice(i, 1);
        i--;
      }
    }
  }

  const finalSegments: VoxSegment[] = segments.map((seg, idx) => {
    let enter = seg.enterExplicit;
    if (!enter) {
      if (idx === 0) {
        enter = { kind: 'none', ms: 0 };
      } else {
        const prevMood = EXHAUSTIVE_MOODS.find(m => m.id === segments[idx - 1].mood.id);
        const currMood = EXHAUSTIVE_MOODS.find(m => m.id === seg.mood.id);
        const transition = classifyTransition(prevMood, currMood);
        enter = transition;
      }
    }

    const baseRate = seg.mood.pace?.rate || 1.0;
    const finalRate = seg.paceOverride?.rate !== undefined ? seg.paceOverride.rate : baseRate;
    const finalPause = seg.paceOverride?.pause || seg.mood.pace?.pause || 'normal';
    const finalArticulation = seg.paceOverride?.articulation || seg.mood.pace?.articulation || 'neutral';

    return {
      text: seg.text.replace(/\[[^\]]+\]/g, '').trim(),
      mood: seg.mood.id,
      intensity: seg.intensity,
      pace: {
        rate: finalRate,
        pause: finalPause,
        articulation: finalArticulation,
      },
      enter,
      ...(seg.echosSound ? { echosSound: seg.echosSound } : {})
    };
  }).filter(s => s.text.length > 0);

  return {
    v: 1,
    speaker,
    segments: finalSegments.length > 0 ? finalSegments : [{
      text: raw.replace(/\[[^\]]+\]/g, '').trim(),
      mood: defaultMood.id,
      intensity: 0.6,
      pace: defaultMood.pace || { rate: 1.0, pause: 'normal', articulation: 'neutral' },
      enter: { kind: 'none', ms: 0 }
    }],
  };
}
