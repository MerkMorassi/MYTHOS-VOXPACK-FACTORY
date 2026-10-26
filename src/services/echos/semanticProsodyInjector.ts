/**
 * Semantic Prosody Tag Auto-Injection (Pre-TTS LLM Filter)
 * 
 * Automatically analyzes assistant responses before routing to Neural TTS,
 * evaluating sentiment cues, conversational subtext, interjections, and punctuation
 * to inject natural nonverbal sound tokens ([sigh], [gasp], [laugh], [hum], [tsk], [groan])
 * into raw text.
 * 
 * Enforces strict density discipline (maximum 1-2 tags per response) to preserve
 * authentic human vocal delivery without acoustic clutter.
 */

import { ECHOS_VOICE_TAGS, EchosVoiceTag } from './echosEngine';

export interface SemanticProsodyInjectionOptions {
  moodTag?: string;
  maxTags?: number;
  replaceInterjectionWords?: boolean;
}

export interface InjectedProsodyTag {
  tag: EchosVoiceTag;
  lvl: number;
  position: 'onset' | 'mid';
  reason: string;
  matchedText?: string;
}

export interface SemanticProsodyResult {
  originalText: string;
  injectedText: string;
  injectedTags: InjectedProsodyTag[];
  hasInjectedTags: boolean;
}

// Rules for sentiment and punctuation detection
interface ProsodyRule {
  tag: EchosVoiceTag;
  lvl: number;
  position: 'onset' | 'mid';
  regex: RegExp;
  reason: string;
  replaceMatched?: boolean;
  replacementPrefix?: string;
  moodAffinity?: string[];
}

const ONSET_RULES: ProsodyRule[] = [
  // 1. Direct laughter interjections
  {
    tag: 'laugh',
    lvl: 1,
    position: 'onset',
    regex: /^(?:ha(?:ha)+|he(?:he)+|heh(?:eh)*|lol|rofl)[,!\s]+/i,
    reason: 'laughter_interjection',
    replaceMatched: true,
  },
  // 2. Playful / amused statements
  {
    tag: 'laugh',
    lvl: 1,
    position: 'onset',
    regex: /^(?:that['’]?s (?:hilarious|too funny|a good one|priceless)|you['’]?re (?:kidding|joking)|i can['’]?t help but smile)/i,
    reason: 'amused_sentiment',
    moodAffinity: ['playful', 'amused', 'mischievous', 'sarcastic', 'wry'],
  },
  // 3. Deliberation / pondering interjections ("Hmm...", "Let's see...")
  {
    tag: 'hum',
    lvl: 1,
    position: 'onset',
    regex: /^(?:h+m+[m.]*|u+m+[m.]*|m+h+[m.]*)[,.\s]+/i,
    reason: 'thinking_interjection',
    replaceMatched: true,
  },
  // 4. Cognitive search / analytical onset
  {
    tag: 'hum',
    lvl: 1,
    position: 'onset',
    regex: /^(?:let(?:['’]s| me) (?:see|think|consider|look at this)|fascinating[,.\s]|curious[,.\s]|come to think of it)/i,
    reason: 'deliberation_onset',
    moodAffinity: ['reflective', 'entranced', 'stoic', 'storyteller'],
  },
  // 5. Shock / surprise / sudden realization ("Wait!", "Hold on!")
  {
    tag: 'gasp',
    lvl: 1,
    position: 'onset',
    regex: /^(?:wait!|hold on!|oh!|no way!|look out!|good heavens!|did you see that\?)/i,
    reason: 'shock_surprise_interjection',
    moodAffinity: ['terrified', 'dread', 'urgent', 'breathless', 'bewildered'],
  },
  // 6. Weary / resigned / melancholic onset ("Alas...", "Oh well...")
  {
    tag: 'sigh',
    lvl: 1,
    position: 'onset',
    regex: /^(?:alas[,.\s]+|oh well[,.\s]+|i suppose (?:so|so,)|if only[,.\s]+|it['’]?s been a long day[,.\s]+)/i,
    reason: 'resignation_weary_onset',
    moodAffinity: ['weary', 'resigned', 'melancholy', 'grieving', 'wistful'],
  },
  // 7. Disapproval / chiding interjections ("Tsk...", "What a pity...")
  {
    tag: 'tsk',
    lvl: 1,
    position: 'onset',
    regex: /^(?:t+s+k+[,.\s]+|what a (?:shame|pity|waste)[,.\s]+|such a shame[,.\s]+)/i,
    reason: 'disapproval_chiding_interjection',
    replaceMatched: true,
  },
  // 8. Cringe / exasperation ("Ugh...")
  {
    tag: 'groan',
    lvl: 1,
    position: 'onset',
    regex: /^(?:u+g+h+[,.\s]+|oh no[,.\s]+not again|why would you)/i,
    reason: 'exasperation_interjection',
    replaceMatched: true,
  },
];

const MID_CLAUSE_RULES: ProsodyRule[] = [
  // 1. Resignation / weary sigh following an ellipsis or heavy clause break
  {
    tag: 'sigh',
    lvl: 1,
    position: 'mid',
    regex: /(?:[.;!?]\s+|\s*\.{2,}\s*)(i (?:wish|suppose|guess)|there['’]?s nothing we can do|we did what we could|it doesn['’]?t matter anymore|so it goes)\b/i,
    reason: 'mid_clause_resignation_sigh',
  },
  // 2. Playful laugh after a teasing sentence
  {
    tag: 'laugh',
    lvl: 1,
    position: 'mid',
    regex: /(?:[.;!?]\s+)(i mean[,.\s]+really|honestly[,.\s]+who does that|just kidding|don['’]?t take it too seriously)\b/i,
    reason: 'mid_clause_playful_chuckle',
  },
  // 3. Cognitive hum before answering a complex question mid-paragraph
  {
    tag: 'hum',
    lvl: 1,
    position: 'mid',
    regex: /(?:[.;!?]\s+)(on the other hand|let['’]?s consider the alternative|come to think of it)\b/i,
    reason: 'mid_clause_reflection_hum',
  },
  // 4. Disapproval tsk mid-sentence
  {
    tag: 'tsk',
    lvl: 1,
    position: 'mid',
    regex: /(?:[.;!?]\s+)(what a waste of time|careless of them|you really shouldn['’]?t have)\b/i,
    reason: 'mid_clause_tsk_chiding',
  },
];

/**
 * Checks if the text already contains explicit square-bracket ECHOS voice tags
 */
export function hasExistingVoiceTags(text: string): boolean {
  const match = text.match(/\[([a-zA-Z_]+)(?::[1-3])?(?:@[+-]?\d+ms?)?(?:\s+under)?\]/g);
  if (!match) return false;
  return match.some(raw => {
    const name = raw.replace(/[\[\]]/g, '').split(/[:@\s]/)[0].toLowerCase();
    return ECHOS_VOICE_TAGS.includes(name as EchosVoiceTag);
  });
}

/**
 * Counts existing voice tags in the string
 */
export function countExistingVoiceTags(text: string): number {
  const matches = text.match(/\[([a-zA-Z_]+)(?::[1-3])?(?:@[+-]?\d+ms?)?(?:\s+under)?\]/g) || [];
  let count = 0;
  for (const raw of matches) {
    const name = raw.replace(/[\[\]]/g, '').split(/[:@\s]/)[0].toLowerCase();
    if (ECHOS_VOICE_TAGS.includes(name as EchosVoiceTag)) {
      count++;
    }
  }
  return count;
}

/**
 * Automatically parses assistant chat responses and injects appropriate nonverbal
 * sound tokens ([sigh], [gasp], [laugh], [hum], [tsk], [groan]) into raw text using
 * sentiment and punctuation cues before routing to Neural TTS.
 */
export function injectSemanticProsodyTags(
  text: string,
  options: SemanticProsodyInjectionOptions = {}
): SemanticProsodyResult {
  if (!text || typeof text !== 'string') {
    return {
      originalText: text || '',
      injectedText: text || '',
      injectedTags: [],
      hasInjectedTags: false,
    };
  }

  const trimmed = text.trim();
  const maxAllowedTags = options.maxTags ?? 2;
  const existingCount = countExistingVoiceTags(trimmed);

  // If text already has sufficient tags, do not over-inject
  if (existingCount >= maxAllowedTags) {
    return {
      originalText: trimmed,
      injectedText: trimmed,
      injectedTags: [],
      hasInjectedTags: false,
    };
  }

  let workingText = trimmed;
  const injected: InjectedProsodyTag[] = [];
  let tagsAdded = 0;

  // -------------------------------------------------------------
  // STEP 1: ONSET INJECTION
  // -------------------------------------------------------------
  // Check if onset already has an explicit tag
  const startsWithTag = /^\[[a-zA-Z_]+(?::[1-3])?[^\]]*\]/.test(workingText);

  if (!startsWithTag && tagsAdded < maxAllowedTags) {
    for (const rule of ONSET_RULES) {
      // Check mood affinity if rule specifies it
      if (rule.moodAffinity && options.moodTag) {
        const matchesAffinity = rule.moodAffinity.includes(options.moodTag.toLowerCase());
        if (!matchesAffinity && !rule.regex.test(workingText)) {
          continue;
        }
      }

      const match = workingText.match(rule.regex);
      if (match) {
        const matchedStr = match[0];
        let replacementText = workingText;

        if (rule.replaceMatched && (options.replaceInterjectionWords !== false)) {
          // Replace raw interjection word (e.g. "Haha, " -> "[laugh:1] ")
          const remainder = workingText.slice(matchedStr.length).trim();
          // Capitalize first letter of remainder if needed
          const capitalizedRemainder = remainder.length > 0 
            ? remainder.charAt(0).toUpperCase() + remainder.slice(1)
            : '';
          replacementText = `[${rule.tag}:${rule.lvl}] ${capitalizedRemainder}`.trim();
        } else {
          // Prepend tag before the utterance
          replacementText = `[${rule.tag}:${rule.lvl}] ${workingText}`;
        }

        workingText = replacementText;
        injected.push({
          tag: rule.tag,
          lvl: rule.lvl,
          position: 'onset',
          reason: rule.reason,
          matchedText: matchedStr,
        });
        tagsAdded++;
        break; // Max 1 onset tag
      }
    }
  }

  // -------------------------------------------------------------
  // STEP 2: MID-CLAUSE INJECTION
  // -------------------------------------------------------------
  if (tagsAdded < maxAllowedTags) {
    for (const rule of MID_CLAUSE_RULES) {
      if (tagsAdded >= maxAllowedTags) break;

      const match = rule.regex.exec(workingText);
      if (match && match.index !== undefined) {
        // Ensure not already tagged right before this match
        const prefixBeforeMatch = workingText.slice(0, match.index + match[0].length);
        if (/\[[a-zA-Z_]+[^\]]*\]\s*$/.test(prefixBeforeMatch)) {
          continue;
        }

        // Inject tag right before the target clause
        const insertIdx = match.index + (match[0].length - match[1].length);
        const before = workingText.slice(0, insertIdx).trimEnd();
        const after = workingText.slice(insertIdx).trimStart();

        workingText = `${before} [${rule.tag}:${rule.lvl}] ${after}`;
        injected.push({
          tag: rule.tag,
          lvl: rule.lvl,
          position: 'mid',
          reason: rule.reason,
          matchedText: match[1],
        });
        tagsAdded++;
        break; // Keep to 1 mid tag max
      }
    }
  }

  // -------------------------------------------------------------
  // STEP 3: MOOD-DRIVEN AMBIENT ONSET (If no tag was matched but mood is strongly indicative)
  // -------------------------------------------------------------
  if (tagsAdded === 0 && !startsWithTag && options.moodTag) {
    const mood = options.moodTag.toLowerCase();
    let ambientTag: EchosVoiceTag | null = null;
    let reason = '';

    if (['playful', 'amused', 'mischievous'].includes(mood) && Math.random() > 0.45) {
      ambientTag = 'laugh';
      reason = 'mood_affinity_playful_laugh';
    } else if (['weary', 'resigned', 'melancholy'].includes(mood) && Math.random() > 0.4) {
      ambientTag = 'sigh';
      reason = 'mood_affinity_weary_sigh';
    } else if (['reflective', 'philosophical', 'storyteller'].includes(mood) && Math.random() > 0.5) {
      ambientTag = 'hum';
      reason = 'mood_affinity_reflective_hum';
    }

    if (ambientTag) {
      workingText = `[${ambientTag}:1] ${workingText}`;
      injected.push({
        tag: ambientTag,
        lvl: 1,
        position: 'onset',
        reason,
      });
      tagsAdded++;
    }
  }

  return {
    originalText: trimmed,
    injectedText: workingText,
    injectedTags: injected,
    hasInjectedTags: injected.length > 0,
  };
}
