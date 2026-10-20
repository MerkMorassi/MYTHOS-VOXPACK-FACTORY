import { saveLoreDocument } from './ragStore';
import { getApiAuthHeaders } from './apiKeyStore';

let isRunning = false;
let lastProcessedIndex = 0;

export async function runLoreExtractionWorker(messages: Array<{ role: string; content: string }>) {
  if (isRunning || messages.length <= lastProcessedIndex + 4) return;
  
  isRunning = true;
  try {
    const recentMessages = messages.slice(lastProcessedIndex);
    lastProcessedIndex = messages.length;

    const transcript = recentMessages.map(m => `${m.role === 'assistant' ? 'Lila' : 'User'}: ${m.content}`).join('\n');

    const res = await fetch('/api/extract-lore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
      body: JSON.stringify({ transcript }),
    });

    if (!res.ok) return;
    const data = await res.json();

    if (data.extractedFacts && Array.isArray(data.extractedFacts)) {
      for (const fact of data.extractedFacts) {
        if (fact.title && fact.content) {
          saveLoreDocument({
            title: fact.title,
            content: fact.content,
            tags: ['auto-extracted', 'lived-experience'],
          });
        }
      }
    }
  } catch (err) {
    console.error('Lore extraction worker error:', err);
  } finally {
    isRunning = false;
  }
}
