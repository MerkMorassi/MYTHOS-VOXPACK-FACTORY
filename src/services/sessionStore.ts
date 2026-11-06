import { openDB } from 'idb';
import { Message } from '../components/ChatView';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  personaId?: string; // mapped from AgentID 001-018
  messages: Message[];
}

const DB_NAME = 'chat-db';
const STORE_NAME = 'sessions';
const ACTIVE_SESSION_ID_KEY = 'lila_active_session_id';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
  },
});

export async function getSavedSessions(): Promise<ChatSession[]> {
  try {
    const db = await dbPromise;
    const sessions = await db.getAll(STORE_NAME);
    // Sort by updatedAt descending
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error('Failed to load chat sessions:', err);
    return [];
  }
}

export async function saveSession(session: ChatSession): Promise<void> {
  try {
    const db = await dbPromise;
    const sessionToSave = { ...session, updatedAt: Date.now() };
    await db.put(STORE_NAME, sessionToSave);
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

export async function deleteSession(id: string): Promise<ChatSession[]> {
  try {
    const db = await dbPromise;
    await db.delete(STORE_NAME, id);
    return await getSavedSessions();
  } catch (err) {
    console.error('Failed to delete session:', err);
    return [];
  }
}

export async function getActiveSessionId(): Promise<string | null> {
  return localStorage.getItem(ACTIVE_SESSION_ID_KEY);
}

export async function setActiveSessionId(id: string): Promise<void> {
  localStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
}

export async function createNewSession(personaName = 'Lila', personaId?: string): Promise<ChatSession> {
  const initialMessage: Message = {
    id: 'msg_' + Date.now(),
    role: 'assistant',
    content: `Hey... um, hello. I'm ${personaName}. Let me know if you want to just talk or... well, run a scene together.`,
    mode: 'off-stage',
    timestamp: Date.now(),
  };

  const newSession: ChatSession = {
    id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title: `Conversation ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    personaId,
    messages: [initialMessage],
  };

  await saveSession(newSession);
  await setActiveSessionId(newSession.id);
  return newSession;
}
