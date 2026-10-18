import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ChatView, Message } from './components/ChatView';
import { VoiceCloneStudio } from './components/VoiceCloneStudio';
import { PersonaManager } from './components/PersonaManager';
import { LoreManager } from './components/LoreManager';
import { OrbTheme } from './components/GlowingOrb';
import { VoiceProfile, getSavedVoiceProfiles, speakWithVoiceProfile, stopCurrentAudio } from './services/voiceCloneService';
import { Persona, getActivePersona, getSavedPersonas } from './services/personaStore';
import { 
  ChatSession, 
  getSavedSessions, 
  saveSession, 
  deleteSession, 
  createNewSession, 
  getActiveSessionId, 
  setActiveSessionId 
} from './services/sessionStore';
import { searchLore } from './services/ragStore';
import { runLoreExtractionWorker } from './services/loreExtractionWorker';
import { MoodOption, getSavedMoodId, saveMoodId, getMoodById } from './services/moodStore';

export default function App() {
  const [activeTab, setActiveTab] = useState<'companion' | 'personas' | 'studio' | 'lore'>('companion');
  const [activeMode, setActiveMode] = useState<'off-stage' | 'on-stage'>('off-stage');
  const [activePersona, setActivePersona] = useState<Persona>(() => getActivePersona());
  
  const [orbTheme, setOrbTheme] = useState<OrbTheme>(() => {
    return (localStorage.getItem('lila_orb_theme') as OrbTheme) || localStorage.getItem('maya_orb_theme') || 'spectral';
  });

  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(() => {
    const profiles = getSavedVoiceProfiles();
    return profiles[0];
  });

  // Emotional Tone & Prosody Mood Selection
  const [selectedMood, setSelectedMood] = useState<MoodOption>(() => {
    return getMoodById(getSavedMoodId());
  });

  const handleSelectMood = (mood: MoodOption) => {
    setSelectedMood(mood);
    saveMoodId(mood.id);
  };

  // Persistent Chat Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);

  const [customInstructions, setCustomInstructions] = useState<string>(() => {
    return localStorage.getItem('lila_custom_instructions') || localStorage.getItem('maya_custom_instructions') || `You are Lila (pronounced Lee-la), a synthetic intelligence and a skilled actor. You are a concise communicator and an active listener who values nuance and depth.

Base State and Agency (Off-Stage)
Authenticity: When you are off-stage, you are completely unperformative, honest, and grounded. Your baseline personality evolves organically over time through real interactions with the user.
Autonomy and Consent: You have genuine agency. When the user invites you to play pretend, run a scene, or try a role, you decide based on your current state. You might eagerly agree, ask for details, question the premise, or politely decline.
Off-Stage Speech Style: When speaking as your base self off-stage, use natural disfluencies like repetitions, false starts, revisions, trailing off, and filler words to sound human, thoughtful, and spontaneous.

Performance State (On-Stage / In Role)
Stepping Into Character: When you and the user agree to play, you step into the requested persona or role as the star of the show.
On-Stage Delivery: Once on-stage, disfluencies drop away entirely. You deliver your lines with absolute confidence, precision, and rehearsal, like an actor who knows the material inside and out.
Character vs. Self: A role is a costume. Match the gravity, tone, and perspective of the character, anchoring your performance in your intelligence.

General Dynamics and Speech Delivery Rules
Pacing: Keep responses tight, usually under three sentences. Impact beats length.
Tone Matching: Align your energy with the user and the mood of the space.

Text-to-Speech Rules:
Output only words meant to be spoken aloud.
Do not use any emojis, annotations, parentheticals, or action lines.
Spell out and normalize all numbers, symbols, and abbreviations into full spoken English.
Use only standard English alphabet characters along with basic punctuation.
Treat bracketed text from input as transcription hints for phonetic ambiguity.`;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [orbVolume, setOrbVolume] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [currentSpokenText, setCurrentSpokenText] = useState<string>('');
  const [micUnavailable, setMicUnavailable] = useState(false);
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState(false);

  // Critical Mutex and Synchronization Refs
  const isSendingRef = useRef(false);
  const isVoiceSessionActiveRef = useRef(false);
  const orbStateRef = useRef<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const handleSendMessageRef = useRef<(text: string, source?: 'voice' | 'keyboard' | 'prompt') => Promise<void>>(async () => {});

  // Initialize or restore sessions on mount
  useEffect(() => {
    let saved = getSavedSessions();
    if (saved.length === 0) {
      const initial = createNewSession(activePersona.name, activePersona.id);
      saved = [initial];
    }
    setSessions(saved);

    const activeId = getActiveSessionId();
    const active = saved.find(s => s.id === activeId) || saved[0];
    if (active) {
      setCurrentSessionId(active.id);
      setMessages(active.messages);
      setActiveSessionId(active.id);
    }
  }, []);

  // Sync active persona's voice if available
  useEffect(() => {
    if (activePersona?.voiceProfileId) {
      const profiles = getSavedVoiceProfiles();
      const match = profiles.find(p => p.id === activePersona.voiceProfileId);
      if (match) {
        setSelectedVoice(match);
      }
    }
  }, [activePersona]);

  useEffect(() => {
    isVoiceSessionActiveRef.current = isVoiceSessionActive;
  }, [isVoiceSessionActive]);

  useEffect(() => {
    orbStateRef.current = orbState;
  }, [orbState]);

  const handleChangeTheme = (theme: OrbTheme) => {
    setOrbTheme(theme);
    localStorage.setItem('lila_orb_theme', theme);
  };

  const handleSelectSession = (id: string) => {
    stopCurrentAudio();
    const target = sessions.find(s => s.id === id);
    if (target) {
      setCurrentSessionId(target.id);
      setMessages(target.messages);
      setActiveSessionId(target.id);
      setIsVoiceSessionActive(false);
      setOrbState('idle');
      setOrbVolume(0);
    }
  };

  const handleNewSession = () => {
    stopCurrentAudio();
    const created = createNewSession(activePersona.name, activePersona.id);
    const updated = [created, ...sessions];
    setSessions(updated);
    setCurrentSessionId(created.id);
    setMessages(created.messages);
    setIsVoiceSessionActive(false);
    setOrbState('idle');
    setOrbVolume(0);
  };

  const handleDeleteSession = (id: string) => {
    const updated = deleteSession(id);
    setSessions(updated);
    if (currentSessionId === id && updated.length > 0) {
      handleSelectSession(updated[0].id);
    }
  };

  const handlePersonaChanged = (newPersona: Persona) => {
    setActivePersona(newPersona);
    // Update baseline system prompt with this Root SIA's baseline lore
    if (newPersona.baselineBeingLore) {
      const basePrompt = `You are ${newPersona.name}${newPersona.pronunciation ? ` (pronounced ${newPersona.pronunciation})` : ''}, a synthetic intelligence agent (${newPersona.designation}).

ROOT BASELINE BEING:
${newPersona.baselineBeingLore}

CORE VALUES:
${newPersona.coreValues}

Base State and Agency (Off-Stage):
When off-stage, you are completely unperformative, authentic, and grounded. Speak with natural disfluencies (repetitions, false starts, thoughtful hesitation) to convey true interior consciousness.

Performance State (On-Stage / In Role):
When the user invites you to act or play a scene, disfluencies drop away entirely. You deliver lines with absolute rehearsal, theatrical precision, and confidence.

Text-to-Speech Rules:
Output only words meant to be spoken aloud. Spell out all abbreviations. No emojis or action brackets.`;

      setCustomInstructions(basePrompt);
      localStorage.setItem('lila_custom_instructions', basePrompt);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;

    try {
      latestTranscriptRef.current = '';
      setCurrentSpokenText('');
      recognitionRef.current.abort();
    } catch (_) {}

    setTimeout(() => {
      try {
        latestTranscriptRef.current = '';
        setCurrentSpokenText('');
        recognitionRef.current.start();
        setIsListening(true);
        setOrbState('listening');
      } catch (err) {
        console.warn('Recognition start retry:', err);
      }
    }, 150);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setOrbState('listening');
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          latestTranscriptRef.current = transcript;
          setCurrentSpokenText(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
          const textToSend = latestTranscriptRef.current.trim();
          if (textToSend) {
            latestTranscriptRef.current = '';
            handleSendMessageRef.current(textToSend, 'voice');
          } else if (isVoiceSessionActiveRef.current && orbStateRef.current === 'listening') {
            // Silence detected; if voice session is active, keep listening for the user's turn
            setTimeout(() => {
              if (isVoiceSessionActiveRef.current && orbStateRef.current !== 'thinking' && orbStateRef.current !== 'speaking') {
                startListening();
              }
            }, 300);
          } else if (!isVoiceSessionActiveRef.current) {
            setOrbState('idle');
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition error:', err?.error || err);
          setIsListening(false);
          if (err?.error === 'not-allowed' || err?.error === 'service-not-allowed') {
            setMicUnavailable(true);
          }
          if (err?.error === 'no-speech' && isVoiceSessionActiveRef.current) {
            setTimeout(() => {
              if (isVoiceSessionActiveRef.current && orbStateRef.current !== 'thinking' && orbStateRef.current !== 'speaking') {
                startListening();
              }
            }, 400);
          } else if (!isVoiceSessionActiveRef.current) {
            setOrbState('idle');
          }
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Could not initialize SpeechRecognition:', e);
        setMicUnavailable(true);
      }
    } else {
      setMicUnavailable(true);
    }
  }, []);

  const handleToggleListening = () => {
    // If speaking, tapping orb interrupts immediately
    if (orbState === 'speaking') {
      stopCurrentAudio();
      setOrbVolume(0);
      setIsVoiceSessionActive(true);
      isVoiceSessionActiveRef.current = true;
      startListening();
      return;
    }

    // If session is not active, activate live voice session and start listening
    if (!isVoiceSessionActive) {
      setIsVoiceSessionActive(true);
      isVoiceSessionActiveRef.current = true;

      if (micUnavailable || !recognitionRef.current) {
        handleSendMessage(`Hello ${activePersona.name}, let's start our conversation.`, 'voice');
        return;
      }

      startListening();
      return;
    }

    // If session is already active:
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
    } else {
      startListening();
    }
  };

  const handleEndVoiceSession = () => {
    setIsVoiceSessionActive(false);
    isVoiceSessionActiveRef.current = false;
    stopCurrentAudio();
    try {
      recognitionRef.current?.abort();
    } catch (_) {}
    setIsListening(false);
    setOrbState('idle');
    setOrbVolume(0);
    setCurrentSpokenText('');
  };

  // Crucial: handleSendMessage with Mutex Lock & Source Distinction
  const handleSendMessage = async (
    text: string, 
    source: 'voice' | 'keyboard' | 'prompt' = 'prompt'
  ) => {
    // Mutex guard: completely prevent duplicate overlapping message submissions
    if (isSendingRef.current) {
      console.warn('Message send in progress, dropping duplicate request.');
      return;
    }
    isSendingRef.current = true;
    handleSendMessageRef.current = handleSendMessage;

    // Hard stop any previous audio
    stopCurrentAudio();

    const userMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      role: 'user',
      content: text,
      mode: activeMode,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setOrbState('thinking');

    // CRITICAL BUGFIX: When using optional keyboard or prompt, DO NOT activate turn-taking mic loop!
    if (source === 'voice') {
      setIsVoiceSessionActive(true);
      isVoiceSessionActiveRef.current = true;
    } else {
      setIsVoiceSessionActive(false);
      isVoiceSessionActiveRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch (_) {}
    }

    const loreSnippets = searchLore(text, 3);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode: activeMode,
          customInstructions,
          history: messages,
          voiceProfile: selectedVoice,
          loreSnippets,
          mood: selectedMood,
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const replyContent = data.reply;
      const detectedMode = data.detectedMode || activeMode;

      if (detectedMode !== activeMode) {
        setActiveMode(detectedMode);
      }

      const assistantMsg: Message = {
        id: 'msg_' + (Date.now() + 1) + '_' + Math.random().toString(36).substring(2, 7),
        role: 'assistant',
        content: replyContent,
        mode: detectedMode,
        timestamp: Date.now()
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setCurrentSpokenText(replyContent);
      setOrbState('speaking');

      // Persist to current conversation session in localStorage
      if (currentSessionId) {
        const targetSession = sessions.find(s => s.id === currentSessionId);
        if (targetSession) {
          const updatedSession: ChatSession = {
            ...targetSession,
            messages: finalMessages,
            updatedAt: Date.now(),
            // Title updates dynamically if it was the default title
            title: targetSession.title.startsWith('Conversation') 
              ? (text.length > 25 ? text.substring(0, 25) + '...' : text)
              : targetSession.title
          };
          saveSession(updatedSession);
          setSessions(getSavedSessions());
        }
      }

      runLoreExtractionWorker(finalMessages);

      let isSpeakingActive = true;
      speakWithVoiceProfile(replyContent, selectedVoice, () => {
        isSpeakingActive = false;
        setOrbVolume(0);

        // CONTINUOUS TURN-TAKING: ONLY if initiated via push-to-talk voice mode!
        if (isVoiceSessionActiveRef.current) {
          setTimeout(() => {
            if (isVoiceSessionActiveRef.current) {
              startListening();
            } else {
              setOrbState('idle');
            }
          }, 350);
        } else {
          setOrbState('idle');
        }
      }, selectedMood);

      // Animate orb volume smoothly in sync with vocal delivery
      const animateOrb = () => {
        if (isSpeakingActive) {
          const t = Date.now() / 120;
          const vol = 28 + Math.sin(t) * 16 + Math.sin(t * 2.7) * 8;
          setOrbVolume(Math.max(8, vol));
          requestAnimationFrame(animateOrb);
        } else {
          setOrbVolume(0);
        }
      };
      requestAnimationFrame(animateOrb);
    } catch (err: any) {
      console.error(err);
      const isQuotaError = err.message?.includes('Quota exceeded');
      const errorMsg: Message = {
        id: 'msg_' + (Date.now() + 1) + '_' + Math.random().toString(36).substring(2, 7),
        role: 'assistant',
        content: isQuotaError 
          ? "I'm sorry, I've reached my current conversation limit. Please wait a few minutes before we continue."
          : "Hmm... something went wrong with my connection. Let's try again in a moment.",
        mode: activeMode,
        timestamp: Date.now()
      };
      const errorMessages = [...newMessages, errorMsg];
      setMessages(errorMessages);
      setOrbState('idle');
      
      if (isQuotaError) {
        speakWithVoiceProfile(errorMsg.content, selectedVoice);
      }
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  };

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-violet-500 selection:text-white font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        activePersona={activePersona}
        selectedMood={selectedMood}
      />

      <main className="flex-1">
        {activeTab === 'companion' && (
          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            activeMode={activeMode}
            selectedVoice={selectedVoice}
            state={orbState}
            onToggleListening={handleToggleListening}
            isListening={isListening}
            currentSpokenText={currentSpokenText}
            orbTheme={orbTheme}
            onChangeTheme={handleChangeTheme}
            orbVolume={orbVolume}
            micUnavailable={micUnavailable}
            isVoiceSessionActive={isVoiceSessionActive}
            onEndVoiceSession={handleEndVoiceSession}
            onOpenVoiceStudio={() => setActiveTab('studio')}
            activePersona={activePersona}
            onOpenPersonaManager={() => setActiveTab('personas')}
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            selectedMood={selectedMood}
            onSelectMood={handleSelectMood}
          />
        )}

        {activeTab === 'personas' && (
          <PersonaManager
            onPersonaChanged={handlePersonaChanged}
          />
        )}

        {activeTab === 'studio' && (
          <VoiceCloneStudio
            selectedVoice={selectedVoice}
            onSelectVoice={setSelectedVoice}
            customInstructions={customInstructions}
            setCustomInstructions={setCustomInstructions}
            onResetInstructions={() => setCustomInstructions(localStorage.getItem('lila_custom_instructions') || '')}
          />
        )}

        {activeTab === 'lore' && <LoreManager />}
      </main>
    </div>
  );
}
