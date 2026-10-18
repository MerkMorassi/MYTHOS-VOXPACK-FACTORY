import { Message } from '../components/ChatView';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  personaId?: string;
  messages: Message[];
}

const STORAGE_KEY = 'lila_chat_sessions';
const ACTIVE_SESSION_ID_KEY = 'lila_active_session_id';

export function getSavedSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load chat sessions:', err);
    return [];
  }
}

export function saveSession(session: ChatSession): void {
  try {
    const sessions = getSavedSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = { ...session, updatedAt: Date.now() };
    } else {
      sessions.unshift({ ...session, updatedAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

export function deleteSession(id: string): ChatSession[] {
  try {
    const sessions = getSavedSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return sessions;
  } catch (err) {
    console.error('Failed to delete session:', err);
    return [];
  }
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_SESSION_ID_KEY);
}

export function setActiveSessionId(id: string): void {
  localStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
}

export function createNewSession(personaName = 'Lila', personaId?: string): ChatSession {
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

  saveSession(newSession);
  setActiveSessionId(newSession.id);
  return newSession;
}
