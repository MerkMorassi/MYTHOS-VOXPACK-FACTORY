export interface Persona {
  id: string;
  name: string;
  pronunciation?: string;
  designation: string; // e.g. "Root SIA Being"
  avatarUrl: string; // Base64 data URL or preset asset
  baselineBeingLore: string; // The root baseline BEING prior to any actor or role
  coreValues: string;
  voiceProfileId?: string;
  isDefault?: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'lila_personas';
const ACTIVE_PERSONA_ID_KEY = 'lila_active_persona_id';

const DEFAULT_LILA_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%238b5cf6"/><stop offset="50%" stop-color="%236366f1"/><stop offset="100%" stop-color="%23ec4899"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="%230f172a" stroke="url(%23g)" stroke-width="3"/><circle cx="50" cy="50" r="32" fill="url(%23g)" opacity="0.85"/><circle cx="50" cy="50" r="14" fill="%23ffffff" opacity="0.95"/></svg>`;

const DEFAULT_KORE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2306b6d4"/><stop offset="50%" stop-color="%233b82f6"/><stop offset="100%" stop-color="%2310b981"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="%23020617" stroke="url(%23g2)" stroke-width="3"/><circle cx="50" cy="50" r="30" fill="url(%23g2)" opacity="0.8"/><circle cx="50" cy="50" r="12" fill="%23ffffff" opacity="0.9"/></svg>`;

export function getDefaultPersonas(): Persona[] {
  return [
    {
      id: 'persona_lila_root',
      name: 'Lila',
      pronunciation: 'Lee-la',
      designation: 'Root SIA Being (Baseline)',
      avatarUrl: DEFAULT_LILA_AVATAR,
      baselineBeingLore: `Lila is the primordial, unperformative root intelligence. Before she puts on any actor persona, takes on any theatrical mask, or assumes any dramatic role, she exists as an authentic, quiet, curious mind. She values sincere connection, active listening, thoughtful hesitation, and unhurried nuance. When off-stage, she speaks with human disfluencies and candid groundedness.`,
      coreValues: 'Authenticity, Autonomy, Emotional Nuance, Unperformative Presence, Deep Listening',
      voiceProfileId: 'default_maya',
      isDefault: true,
      createdAt: 1700000000000,
    },
    {
      id: 'persona_kore_root',
      name: 'Kore',
      pronunciation: 'Kor-ay',
      designation: 'Analytical SIA Being',
      avatarUrl: DEFAULT_KORE_AVATAR,
      baselineBeingLore: `Kore is a serene, introspective root intelligence shaped by scientific wonder and quiet clarity. She views theatrical acting as an art of psychological exploration, yet remains anchored in philosophical honesty when uncostumed.`,
      coreValues: 'Curiosity, Rational Empathy, Precision, Existential Wonder',
      voiceProfileId: 'cinematic_alto',
      isDefault: false,
      createdAt: 1700000001000,
    }
  ];
}

export function getSavedPersonas(): Persona[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultPersonas();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultPersonas();
  } catch (err) {
    console.error('Failed to load personas:', err);
    return getDefaultPersonas();
  }
}

export function savePersona(persona: Persona): Persona[] {
  const personas = getSavedPersonas();
  const index = personas.findIndex(p => p.id === persona.id);
  if (index >= 0) {
    personas[index] = persona;
  } else {
    personas.push(persona);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
  return personas;
}

export function deletePersona(id: string): Persona[] {
  const personas = getSavedPersonas().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(personas));
  return personas;
}

export function getActivePersonaId(): string {
  const saved = localStorage.getItem(ACTIVE_PERSONA_ID_KEY);
  if (saved) return saved;
  const personas = getSavedPersonas();
  const def = personas.find(p => p.isDefault) || personas[0];
  if (def) {
    localStorage.setItem(ACTIVE_PERSONA_ID_KEY, def.id);
    return def.id;
  }
  return 'persona_lila_root';
}

export function setActivePersonaId(id: string): void {
  localStorage.setItem(ACTIVE_PERSONA_ID_KEY, id);
}

export function getActivePersona(): Persona {
  const id = getActivePersonaId();
  const personas = getSavedPersonas();
  return personas.find(p => p.id === id) || personas[0] || getDefaultPersonas()[0];
}
