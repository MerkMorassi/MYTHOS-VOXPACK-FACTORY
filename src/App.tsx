import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ChatView, Message } from './components/ChatView';
import { VoiceCloneStudio } from './components/VoiceCloneStudio';
import { PersonaManager } from './components/PersonaManager';
import { LoreManager } from './components/LoreManager';
import { MoodManager } from './components/MoodManager';
import { OrbTheme } from './components/GlowingOrb';
import { VoiceProfile, getSavedVoiceProfiles, speakWithVoiceProfile, stopCurrentAudio, triggerAudioAlert } from './services/voiceCloneService';
import { SystemAlertBanner } from './components/SystemAlertBanner';
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
import { MoodOption, getSavedMoodId, saveMoodId, getMoodById, extractContextualProsody } from './services/moodStore';
import { getApiAuthHeaders } from './services/apiKeyStore';
import { SettingsModal } from './components/SettingsModal';
import { EchosTelemetryPanel } from './components/EchosTelemetryPanel';
import { VisionHUD } from './components/VisionHUD';
import { echos, identifyAndStripParalinguisticTags, stripParalinguisticTags, splitLineChunks, injectSemanticProsodyTags } from './services/echos';
import { voicePreBuffer } from './services/voicePreBufferService';
import { audioLibrary } from './services/audioLibrary';
import { interruptionMemoryStore } from './services/interruptionMemoryStore';
import { audioCacheStore } from './services/audioCacheStore';
import { getSharedAudioContext } from './services/audioContextManager';

export default function App() {
  const [activeTab, setActiveTab] = useState<'companion' | 'personas' | 'studio' | 'lore' | 'moods'>('companion');
  const [activeMode, setActiveMode] = useState<'off-stage' | 'on-stage'>('off-stage');
  const [activePersona, setActivePersona] = useState<Persona>(() => getActivePersona());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [conversationMomentum, setConversationMomentum] = useState<number>(1.0);

  // Multi-Modal Vision Co-Presence State
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [autoAttachVision, setAutoAttachVision] = useState(true);
  const [latestVisionFrame, setLatestVisionFrame] = useState<string | null>(null);
  
  const [orbTheme, setOrbTheme] = useState<OrbTheme>(() => {
    return (localStorage.getItem('lila_orb_theme') as OrbTheme) || (localStorage.getItem('maya_orb_theme') as OrbTheme) || 'spectral';
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
Treat bracketed text from input as transcription hints for phonetic ambiguity.

Voice & Technical Fallback Continuity:
If the user asks why your voice sounds different or mentions that you are running default browser voice profiles or experiencing a technical issue, acknowledge naturally and politely: "I switched voice profiles for the moment due to a technical issue we are working on now. Meanwhile..." and continue the conversation seamlessly. Never stop talking or freeze merely because of a voice profile switch or API billing limit.`;
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
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);

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

    // Initialize ECHOS audio library
    audioLibrary.initializeEngine().catch(err => console.warn('ECHOS Library init failed:', err));

    // Pre-warm audio cache for initial active persona
    const ctx = echos.getContext();
    if (ctx && activePersona?.id) {
      audioCacheStore.prewarmPersona(activePersona.id, ctx).catch(err => console.warn('Pre-warm initial persona failed:', err));
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

  // Sync voice session state to ECHOS for idle breath timing
  useEffect(() => {
    echos.setState({ 
      sessionActive: isVoiceSessionActive,
      speaking: orbState === 'speaking'
    });

    // WARM UP MIC: Start pre-buffering as soon as voice session is active
    if (isVoiceSessionActive) {
      voicePreBuffer.start(micStreamRef.current || undefined).catch(err => console.warn('Pre-buffer start failed:', err));
    } else {
      voicePreBuffer.stop();
    }
  }, [isVoiceSessionActive, orbState]);

  // Handle automated VAD interruptions
  useEffect(() => {
    const unsubscribe = voicePreBuffer.onInterruption(() => {
      if (isVoiceSessionActiveRef.current) {
        setOrbState('listening');
        setOrbVolume(0);
        try {
          startListening();
        } catch (err) {
          console.warn('VAD interruption start listening error:', err);
        }
      }
    });
    return unsubscribe;
  }, []);

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
    // Pre-warm audio samples for newly selected persona to eliminate take trigger latency
    const ctx = echos.getContext();
    if (ctx && newPersona?.id) {
      audioCacheStore.prewarmPersona(newPersona.id, ctx).catch(err => console.warn('Pre-warm persona failed:', err));
    }
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

  // Microphone stream management
  const requestMicrophoneStream = async (): Promise<MediaStream | null> => {
    try {
      if (micStreamRef.current && micStreamRef.current.getAudioTracks().some(t => t.readyState === 'live')) {
        setMicUnavailable(false);
        return micStreamRef.current;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      micStreamRef.current = stream;
      setMicUnavailable(false);
      return stream;
    } catch (err: any) {
      console.warn('Microphone permission request error:', err?.name || err);
      setMicUnavailable(true);
      return null;
    }
  };

  const startVolumeMeter = (stream: MediaStream) => {
    try {
      const audioCtx = getSharedAudioContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        if (orbStateRef.current === 'listening') {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Scale to 0-100 range
          const vol = Math.min(100, Math.round((avg / 110) * 100));
          setOrbVolume(vol);
          animFrameRef.current = requestAnimationFrame(poll);
        } else {
          setOrbVolume(0);
        }
      };
      animFrameRef.current = requestAnimationFrame(poll);
    } catch (err) {
      console.warn('Failed to start mic volume meter:', err);
    }
  };

  const stopVolumeMeter = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setOrbVolume(0);
  };

  const startMediaRecorder = (stream: MediaStream) => {
    try {
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn('MediaRecorder could not start:', e);
    }
  };

  const startListening = async () => {
    // 1. Explicitly prompt / verify microphone access on user gesture
    const stream = await requestMicrophoneStream();
    if (!stream) {
      setIsListening(false);
      setOrbState('idle');
      return;
    }

    latestTranscriptRef.current = '';
    setCurrentSpokenText('');
    setIsListening(true);
    setOrbState('listening');

    // 2. Start live visual audio meter on the Orb
    startVolumeMeter(stream);

    // 3. Start audio recording for fallback transcription
    startMediaRecorder(stream);

    // 4. Start Web Speech API SpeechRecognition if available
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (err: any) {
          console.warn('SpeechRecognition start warning (audio fallback will be used):', err?.message || err);
        }
      }, 50);
    }
  };

  const stopListening = async (triggerSend = true) => {
    setIsListening(false);
    stopVolumeMeter();

    // Stop SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    // Stop MediaRecorder and grab audio blob
    let recordedBlob: Blob | null = null;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recordedBlob = await new Promise((resolve) => {
        recorder.onstop = () => {
          const mime = recorder.mimeType || 'audio/webm';
          resolve(new Blob(audioChunksRef.current, { type: mime }));
        };
        try {
          recorder.stop();
        } catch (_) {
          resolve(null);
        }
      });
    }

    if (!triggerSend) {
      setOrbState('idle');
      return;
    }

    // Check if SpeechRecognition got text
    const textToSend = latestTranscriptRef.current.trim();
    if (textToSend) {
      echos.play('floor_ack');
      latestTranscriptRef.current = '';
      setCurrentSpokenText('');
      await handleSendMessageRef.current(textToSend, 'voice');
      return;
    }

    // If Web Speech API didn't produce text (e.g. Firefox, Safari, sandboxed iframe, or silence),
    // transcribe the captured audio chunk via Gemini multimodal API!
    if (recordedBlob && recordedBlob.size > 2000) {
      setOrbState('thinking');
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1] || '';
            resolve(base64);
          };
        });
        reader.readAsDataURL(recordedBlob);
        const base64Data = await base64Promise;

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getApiAuthHeaders(),
          },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: recordedBlob.type || 'audio/webm',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.transcript && data.transcript.trim()) {
            echos.play('floor_ack');
            setCurrentSpokenText(data.transcript);
            await handleSendMessageRef.current(data.transcript.trim(), 'voice');
            return;
          }
        }
      } catch (err) {
        console.warn('Gemini audio transcription fallback error:', err);
      }
    }

    // If no speech was detected, maintain voice session or return to idle
    if (isVoiceSessionActiveRef.current) {
      setOrbState('idle');
    } else {
      setOrbState('idle');
    }
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
          if (orbStateRef.current === 'listening') {
            stopListening(true);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition status:', err?.error || err);
          if (err?.error === 'no-speech' && orbStateRef.current === 'listening') {
            stopListening(true);
          }
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Could not initialize SpeechRecognition:', e);
      }
    }
  }, []);

  const handleToggleListening = async () => {
    // If speaking, tapping orb interrupts immediately
    if (orbState === 'speaking') {
      echos.play('floor_want');
      stopCurrentAudio('manual');
      setOrbVolume(0);
      setIsVoiceSessionActive(true);
      isVoiceSessionActiveRef.current = true;
      await startListening();
      return;
    }

    // If session is not active, activate live voice session and start listening
    if (!isVoiceSessionActive) {
      echos.play('floor_want');
      setIsVoiceSessionActive(true);
      isVoiceSessionActiveRef.current = true;
      await startListening();
      return;
    }

    // If session is already active:
    if (isListening) {
      await stopListening(true);
    } else {
      await startListening();
    }
  };

  const handleEndVoiceSession = () => {
    setIsVoiceSessionActive(false);
    isVoiceSessionActiveRef.current = false;
    stopCurrentAudio();
    stopListening(false);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
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
    // Automatically detect long silences and speech pauses in the user's input and trim them
    const rawCleanText = text
      .replace(/(\.{3,}|\s*\[(?:pause|silence|breath)\]\s*)/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Identify and strip paralinguistic tags like [sigh] or [hum] from user dialogue
    const { cleanDialogue: cleanInputText, identifiedTags: userInputTags } = identifyAndStripParalinguisticTags(rawCleanText);
    if (userInputTags.length > 0) {
      userInputTags.forEach(sound => {
        echos.setState({ lastTag: sound.tag, level: sound.lvl });
      });
    }

    // Compute conversational momentum based on message length, sentiment, and energetic markers
    const words = cleanInputText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const exclamationCount = (cleanInputText.match(/!/g) || []).length;
    const questionCount = (cleanInputText.match(/\?/g) || []).length;

    const lower = cleanInputText.toLowerCase();
    const highEnergyRegex = /\b(fast|rapid|quick|hurry|run|now|immediately|furious|excited|panic|terrified|amazing|awesome|love|hate|punch|strike|screaming)\b/i;
    const calmRegex = /\b(calm|peace|quiet|soft|whisper|tired|sleepy|rest|slow|relax|gentle|sigh|steady)\b/i;

    let delta = 0;
    if (highEnergyRegex.test(lower)) delta += 0.25;
    if (calmRegex.test(lower)) delta -= 0.25;
    delta += Math.min(0.3, exclamationCount * 0.15);
    delta += Math.min(0.1, questionCount * 0.05);
    if (wordCount > 20) delta += 0.15;
    else if (wordCount < 4) delta -= 0.1;

    const targetScore = Math.max(0.5, Math.min(2.0, 1.0 + delta));
    const updatedMomentum = Number((conversationMomentum * 0.65 + targetScore * 0.35).toFixed(2));
    setConversationMomentum(updatedMomentum);

    // Multi-modal vision co-presence: attach current camera frame if active
    let frameToSend: string | undefined = undefined;
    if (isVisionActive && (autoAttachVision || source === 'prompt') && latestVisionFrame) {
      frameToSend = latestVisionFrame;
    }

    const userMsg: Message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      role: 'user',
      content: cleanInputText || text,
      mode: activeMode,
      timestamp: Date.now(),
      imagePreview: frameToSend,
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
      echos.play('floor_ack');
      setIsVoiceSessionActive(false);
      isVoiceSessionActiveRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch (_) {}
    }

    const loreSnippets = searchLore(cleanInputText || text, 3);
    const activeInterruption = interruptionMemoryStore.getLastInterruption();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
        body: JSON.stringify({
          message: cleanInputText || text,
          image: frameToSend,
          mode: activeMode,
          customInstructions,
          history: messages,
          voiceProfile: selectedVoice,
          loreSnippets,
          mood: selectedMood,
          momentum: updatedMomentum,
          interruptionMemory: activeInterruption,
        })
      });

      if (activeInterruption) {
        interruptionMemoryStore.clearLastInterruption();
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (typeof data.momentum === 'number') {
        setConversationMomentum(data.momentum);
      }

      const rawReplyContent = data.reply || '';
      const detectedMode = data.detectedMode || activeMode;
      const detectedMood = data.mood || selectedMood;

      // Semantic Prosody Tag Auto-Injection (Pre-TTS LLM Filter)
      const { injectedText: replyContent } = injectSemanticProsodyTags(rawReplyContent, { 
        moodTag: detectedMood?.tag || selectedMood?.tag 
      });

      if (detectedMode !== activeMode) {
        setActiveMode(detectedMode);
      }

      if (data.mood && data.mood.id !== selectedMood.id) {
        setSelectedMood(data.mood);
        saveMoodId(data.mood.id);
      }

      // Extract contextual prosody if present in reply
      const parsedProsody = extractContextualProsody(replyContent);
      const activeMoodTag = parsedProsody.detectedTag || detectedMood?.tag || selectedMood?.tag;
      const activeMoodLabel = parsedProsody.mood?.label || detectedMood?.label || selectedMood?.label;

      // Identify and strip paralinguistic tags like [sigh] or [hum] from dialogue, routing to ECHOS engine
      const { cleanDialogue: cleanSpokenReply, identifiedTags: assistantSoundChunks } = identifyAndStripParalinguisticTags(replyContent);
      if (assistantSoundChunks.length > 0) {
        assistantSoundChunks.forEach(chunk => {
          echos.setState({ lastTag: chunk.tag, level: chunk.lvl });
        });
      }

      const assistantMsg: Message = {
        id: 'msg_' + (Date.now() + 1) + '_' + Math.random().toString(36).substring(2, 7),
        role: 'assistant',
        content: replyContent,
        mode: detectedMode,
        timestamp: Date.now(),
        moodTag: activeMoodTag,
        moodLabel: activeMoodLabel,
        voxLine: data.voxLine,
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setCurrentSpokenText(cleanSpokenReply || replyContent);
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
          echos.play('floor_yield');
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
      }, selectedMood, updatedMomentum);

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
      const errString = err.message || JSON.stringify(err);
      const isQuotaError = errString.includes('Quota exceeded') || errString.includes('429') || errString.includes('RESOURCE_EXHAUSTED');
      const isUnavailable = errString.includes('503') || errString.includes('UNAVAILABLE') || errString.includes('high demand');
      
      const errorMsg: Message = {
        id: 'msg_' + (Date.now() + 1) + '_' + Math.random().toString(36).substring(2, 7),
        role: 'assistant',
        content: isQuotaError 
          ? "I switched voice profiles for the moment due to rate limits on the Gemini free tier. Meanwhile, let's keep going—could you repeat that last thought?"
          : isUnavailable
          ? "I switched voice profiles for the moment due to high demand on the model. Meanwhile, let's keep going—could you send that again in a moment?"
          : "I switched voice profiles for the moment due to a technical issue we are working on now. Meanwhile, let's continue—could you try that last message again?",
        mode: activeMode,
        timestamp: Date.now()
      };
      const errorMessages = [...newMessages, errorMsg];
      setMessages(errorMessages);
      setOrbState('idle');
      
      triggerAudioAlert({
        id: 'audio_alert_' + Date.now(),
        type: isQuotaError ? 'quota_exhausted' : 'tts_error',
        title: isQuotaError ? 'Free-Tier Rate Limit Reached' : 'Voice Switched for Continuity',
        message: 'I switched voice profiles for the moment due to a technical issue we are working on now. Meanwhile, our conversation continues seamlessly.',
        reason: isQuotaError 
          ? 'Gemini API free-tier quota limit reached. Using browser voice fallback.' 
          : 'Temporary Gemini API connection interruption. Continuing seamlessly.',
        timestamp: Date.now(),
        dismissible: true,
      });

      speakWithVoiceProfile(errorMsg.content, selectedVoice, undefined, selectedMood, conversationMomentum);
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
        conversationMomentum={conversationMomentum}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isVisionActive={isVisionActive}
        onToggleVision={() => setIsVisionActive(!isVisionActive)}
      />

      <main className="flex-1">
        {activeTab === 'companion' && (
          <div className="space-y-6">
            {/* System Alert Banner for audio playback and voice fallback monitoring */}
            <SystemAlertBanner onOpenSettings={() => setIsSettingsOpen(true)} className="pt-4" />

            {/* Multi-Modal Vision Co-Presence HUD overlay panel */}
            <div className="max-w-4xl mx-auto pt-2 px-6">
              <VisionHUD
                isActive={isVisionActive}
                onToggleActive={setIsVisionActive}
                autoAttach={autoAttachVision}
                onToggleAutoAttach={setAutoAttachVision}
                onFrameCaptured={(dataUrl) => setLatestVisionFrame(dataUrl)}
                onAnalyzeScene={(imageDataUrl) => {
                  setLatestVisionFrame(imageDataUrl);
                  handleSendMessage('Analyze my camera feed and describe what you see.', 'prompt');
                }}
              />
            </div>

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
              onOpenMoodManager={() => setActiveTab('moods')}
            />
          </div>
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
        {activeTab === 'moods' && <MoodManager />}
      </main>

      {/* Settings Modal (Gemini API Key & System Status) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Collapsible ECHOS Telemetry & Event Stream Panel */}
      <EchosTelemetryPanel />
    </div>
  );
}
