export type PauseTier = 'short' | 'normal' | 'marked' | 'long';
export type Articulation = 'legato' | 'neutral' | 'staccato';

export interface Pace {
  rate: number;
  pause: PauseTier;
  articulation: Articulation;
}

export interface VoiceProfile {
  id: string;
  name: string;
  sampleUrl?: string;
  pitch: number; // 0.5 to 2.0
  rate: number; // 0.5 to 2.0
  baseVoiceName: string; // 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
  createdAt: number;
}

export interface LoreDocument {
  id: string;
  title: string;
  content: string;
  sizeBytes: number;
  createdAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: 'off-stage' | 'on-stage';
  timestamp: number;
}

export interface SystemInstructions {
  persona: string;
  tone: string;
  pacing: string;
  rules: string[];
}

