export interface LoreDocument {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
}

let idCounter = 0;

export function getStoredLore(): LoreDocument[] {
  try {
    const raw = localStorage.getItem('lila_lore_store') || localStorage.getItem('maya_lore_store');
    if (!raw) return getDefaultLore();
    const parsed: LoreDocument[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return getDefaultLore();

    // Deduplicate and ensure guaranteed unique IDs across all stored docs
    const seenIds = new Set<string>();
    const seenContents = new Set<string>();
    const sanitized: LoreDocument[] = [];
    let needsResave = false;

    for (let i = 0; i < parsed.length; i++) {
      const doc = parsed[i];
      if (!doc || !doc.title || !doc.content) continue;

      // Duplicate content key (case-insensitive title + content)
      const contentKey = `${doc.title.trim().toLowerCase()}:::${doc.content.trim().toLowerCase()}`;
      if (seenContents.has(contentKey)) {
        needsResave = true;
        continue; // skip duplicate auto-extracted facts
      }
      seenContents.add(contentKey);

      let uniqueId = doc.id;
      // If id is missing, invalid, or already encountered (such as lore_1792281452780 collision)
      if (!uniqueId || seenIds.has(uniqueId)) {
        uniqueId = `lore_${doc.createdAt || Date.now()}_${Math.random().toString(36).substring(2, 7)}_${++idCounter}`;
        needsResave = true;
      }
      seenIds.add(uniqueId);

      sanitized.push({
        ...doc,
        id: uniqueId,
        createdAt: doc.createdAt || Date.now(),
      });
    }

    if (needsResave || !localStorage.getItem('lila_lore_store')) {
      localStorage.setItem('lila_lore_store', JSON.stringify(sanitized));
      // Keep legacy key clean as well
      localStorage.setItem('maya_lore_store', JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return getDefaultLore();
  }
}

export function saveLoreDocument(doc: Omit<LoreDocument, 'id' | 'createdAt'>): LoreDocument {
  const existing = getStoredLore();

  // Deduplication check: if exact same title and content already exist, don't create duplicate
  const normTitle = doc.title.trim().toLowerCase();
  const normContent = doc.content.trim().toLowerCase();
  const duplicate = existing.find(d => 
    d.title.trim().toLowerCase() === normTitle && 
    d.content.trim().toLowerCase() === normContent
  );
  if (duplicate) {
    return duplicate;
  }

  const newDoc: LoreDocument = {
    ...doc,
    id: `lore_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${++idCounter}`,
    createdAt: Date.now(),
  };
  const updated = [newDoc, ...existing];
  localStorage.setItem('lila_lore_store', JSON.stringify(updated));
  localStorage.setItem('maya_lore_store', JSON.stringify(updated));
  return newDoc;
}

export function deleteLoreDocument(id: string) {
  const existing = getStoredLore();
  const updated = existing.filter(d => d.id !== id);
  localStorage.setItem('lila_lore_store', JSON.stringify(updated));
  localStorage.setItem('maya_lore_store', JSON.stringify(updated));
}

export function searchLore(query: string, maxResults = 3): LoreDocument[] {
  const docs = getStoredLore();
  if (!query.trim()) return docs.slice(0, maxResults);

  const queryTerms = query.toLowerCase().split(/\s+/);
  
  const scored = docs.map(doc => {
    const text = (doc.title + ' ' + doc.content + ' ' + doc.tags.join(' ')).toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (text.includes(term)) score += 1;
    }
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, maxResults).map(s => s.doc);
}

function getDefaultLore(): LoreDocument[] {
  return [
    {
      id: 'lore_default_1',
      title: 'Lila Background & Origin',
      content: 'Lila (pronounced Lee-la) is a synthetic actor and intelligent companion created to explore emotional nuance, dramatic scene work, and unperformative authentic discourse. She values precise pacing and active listening.',
      tags: ['background', 'identity'],
      createdAt: 1700000001000,
    },
    {
      id: 'lore_default_2',
      title: 'Theatrical Philosophy',
      content: 'When on-stage, a role is a costume. Disfluencies drop away entirely, replaced by absolute confidence and rehearsed precision. When off-stage, disfluencies like false starts, repetitions, and trailing off reflect honest grounding.',
      tags: ['theatre', 'acting', 'rules'],
      createdAt: 1700000002000,
    }
  ];
}
