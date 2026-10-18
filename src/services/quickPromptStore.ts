export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
  category: 'scene' | 'off-stage' | 'custom';
  isBuiltIn?: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'lila_quick_prompts';

export const DEFAULT_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'qp_noir_detective',
    label: 'Noir Detective Interrogation',
    prompt: 'Let us run a scene: You are an investigator questioning me in a retro noir detective office. The rain is pouring against the venetian blinds.',
    category: 'scene',
    isBuiltIn: true,
    createdAt: 1700000001000,
  },
  {
    id: 'qp_deep_space',
    label: 'Drifting Astronauts',
    prompt: 'Let us try a scene: We are two astronauts drifting near the event horizon of a black hole, our telemetry failing as time begins to dilate.',
    category: 'scene',
    isBuiltIn: true,
    createdAt: 1700000002000,
  },
  {
    id: 'qp_art_dealer',
    label: 'Eccentric Art Dealer',
    prompt: 'Let us play pretend: You are an eccentric avant-garde art dealer evaluating my mysterious abstract sculpture.',
    category: 'scene',
    isBuiltIn: true,
    createdAt: 1700000003000,
  },
  {
    id: 'qp_offstage_reflection',
    label: 'Off-Stage Honest Check-In',
    prompt: 'Off-stage chat: Drop the stage rehearsal for a moment. How are you genuinely feeling about our dynamic and conversation today?',
    category: 'off-stage',
    isBuiltIn: true,
    createdAt: 1700000004000,
  },
  {
    id: 'qp_theatre_rehearsal',
    label: 'Cold Reading Audition',
    prompt: 'Let us run lines together: Give me a surprise dramatic opening line from a lost classic play, and let us improvise the second beat.',
    category: 'scene',
    isBuiltIn: true,
    createdAt: 1700000005000,
  },
];

export function getSavedQuickPrompts(): QuickPrompt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_QUICK_PROMPTS));
      return DEFAULT_QUICK_PROMPTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_QUICK_PROMPTS;
  } catch (err) {
    console.error('Failed to load quick prompts:', err);
    return DEFAULT_QUICK_PROMPTS;
  }
}

export function saveQuickPrompt(prompt: QuickPrompt): QuickPrompt[] {
  const current = getSavedQuickPrompts();
  const index = current.findIndex(p => p.id === prompt.id);
  let updated: QuickPrompt[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = prompt;
  } else {
    updated = [prompt, ...current];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteQuickPrompt(id: string): QuickPrompt[] {
  const current = getSavedQuickPrompts();
  const updated = current.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
