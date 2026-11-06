import { getActivePersonaId } from './personaStore';

export interface LoreDocument {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
}

export async function searchLore(query: string, maxResults = 3): Promise<LoreDocument[]> {
  const agentId = getActivePersonaId();
  return await searchTursoLore(query, maxResults, agentId);
}

export async function searchTursoLore(query: string, maxResults = 3, agentId: string): Promise<LoreDocument[]> {
  try {
    console.log(`[RAG] Initiating Turso search: "${query}" for agent: ${agentId}`);
    const response = await fetch('/api/lore-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxResults, agentId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || `Failed to fetch lore (Status: ${response.status})`;
      console.error(`[RAG] Turso search failed (Status: ${response.status}):`, errorMsg);
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    console.log(`[RAG] Turso search successful, returned ${data.length} chunks`);
    return data;
  } catch (error: any) {
    console.error('[RAG] Error fetching lore from Turso:', error.message);
    return []; // Return empty on failure to avoid falling back to potentially mixed local store
  }
}

export async function saveLoreDocument(doc: Omit<LoreDocument, 'id' | 'createdAt'>): Promise<LoreDocument | null> {
  try {
    const agentId = getActivePersonaId();
    const response = await fetch('/api/lore-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc, agentId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save lore to Turso');
    }
    
    return { ...doc, id: 'pending', createdAt: Date.now() } as LoreDocument;
  } catch (error) {
    console.error('Error saving lore to Turso:', error);
    return null;
  }
}

export function deleteLoreDocument(id: string) {
  // Migration to full Turso-based persistence pending
  console.warn('Delete lore operation not implemented for Turso yet');
}
