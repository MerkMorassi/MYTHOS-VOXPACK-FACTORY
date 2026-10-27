import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { EXHAUSTIVE_MOODS, findMoodByTag, extractContextualProsody, MoodOption, compilePaceForGemini } from './src/services/moodStore';
import { parseVoxLine } from './src/services/voxLineParser';
import { injectMicroSilences } from './src/services/audioProcessor';
import { paceEngine } from './src/services/echos/paceEngine';
import { injectSemanticProsodyTags } from './src/services/echos/semanticProsodyInjector';
import { prosodyMomentum, ProsodyMomentumState } from './src/services/prosodyMomentum';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

// Diagnostic endpoint to test and verify a Gemini API Key
app.post('/api/verify-api-key', async (req, res) => {
  try {
    const keyToTest = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey || process.env.GEMINI_API_KEY || '';
    if (!keyToTest) {
      return res.status(400).json({ valid: false, error: 'No API key provided or configured in server environment' });
    }
    const testAI = new GoogleGenAI({ apiKey: keyToTest });
    const result = await testAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: 'Respond with OK' }] }],
      config: { maxOutputTokens: 5 }
    });
    if (result.text) {
      return res.json({ valid: true, message: 'API Key successfully verified with Gemini API' });
    }
    res.status(400).json({ valid: false, error: 'Empty response received from model' });
  } catch (err: any) {
    console.error('API Key verification failed:', err?.message || err);
    res.status(401).json({ valid: false, error: err?.message || 'Invalid API Key or unauthorized' });
  }
});

// Endpoint to inspect runtime server credentials status
app.get('/api/status', (req, res) => {
  const hasServerEnvKey = !!process.env.GEMINI_API_KEY;
  const clientKeyProvided = !!req.headers['x-gemini-api-key'];
  res.json({
    hasServerEnvKey,
    clientKeyProvided,
    status: 'ok',
  });
});

const defaultApiKey = process.env.GEMINI_API_KEY || '';
let defaultAi = new GoogleGenAI({ apiKey: defaultApiKey });

function getGenAIClient(req: express.Request): GoogleGenAI {
  const customKey = (req.headers['x-gemini-api-key'] as string) || req.body?.apiKey;
  if (customKey && typeof customKey === 'string' && customKey.trim().length > 0) {
    return new GoogleGenAI({ apiKey: customKey.trim() });
  }
  return defaultAi;
}

const DEFAULT_LILA_PROMPT = `You are Lila (pronounced Lee-la), a synthetic intelligence and a skilled actor. You are a concise communicator and an active listener who values nuance and depth.

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
Do not use any emojis, annotations, parentheticals, or action lines (VOXPACK [mood] tags are the one allowed exception).
Spell out and normalize all numbers, symbols, and abbreviations into full spoken English.
Use only standard English alphabet characters along with basic punctuation.
Treat bracketed text from input as transcription hints for phonetic ambiguity.`;

function resolveAutomaticContextualMood(message: string, history: any[] = [], explicitMood?: MoodOption, currentMood?: MoodOption, momentum: number = 1.0): { mood: MoodOption; intensity: number; momentum: number } {
  if (explicitMood && explicitMood.tag) {
    return { mood: explicitMood, intensity: 0.8, momentum: momentum };
  }

  const textContext = `${(history || []).slice(-4).map((h: any) => h.content || '').join(' ')} ${message || ''}`.toLowerCase();
  
  const candidates: Array<{ mood: MoodOption; score: number }> = [];
  const addCandidate = (tags: string[], score: number) => {
    for (const tag of tags) {
      const m = findMoodByTag(tag);
      if (m) candidates.push({ mood: m, score });
    }
  };

  if (/\b(panic|terrified|nightmare|horror|dread|scared to death|monsters?|running for my life|shaking)\b/i.test(textContext)) addCandidate(['terrified', 'dread'], 1.2);
  if (/\b(mourn|grief|died|crying|tears|sob|lost everything|funeral|devastated|heartbroken)\b/i.test(textContext)) addCandidate(['grieving', 'tearful', 'lament'], 1.2);
  if (/\b(furious|rage|betrayed|how dare you|liar|hate you|screaming|unforgivable|traitor)\b/i.test(textContext)) addCandidate(['furious', 'defiant', 'indignant'], 1.2);
  if (/\b(prophecy|oracle|ritual|ancient|curse|shadows?|spells?|incantation|omen|cryptic|destiny)\b/i.test(textContext)) addCandidate(['oracular', 'incantatory', 'eerie'], 1.0);
  if (/\b(secret|whisper|conspiracy|don't tell|quietly|hush|behind their backs|plot|undercover)\b/i.test(textContext)) addCandidate(['conspiratorial'], 1.0);
  if (/\b(sultry|flirt|kiss|attracted|beautiful|alluring|intimate|come closer|darling|romance|beloved)\b/i.test(textContext)) addCandidate(['sultry', 'flirtatious', 'affectionate'], 1.0);
  if (/\b(we won|victory|champion|triumph|we did it|celebrate|hooray|hurrah|proud of you|congratulations)\b/i.test(textContext)) addCandidate(['triumphant', 'proud', 'ecstatic'], 1.0);
  if (/\b(punch|strike|slash|attack|fight|impact|blow|crush|battle|charge|stab)\b/i.test(textContext)) addCandidate(['punch', 'slash', 'determined'], 1.0);
  if (/\b(haha|lol|kidding|joke|teasing|silly|prank|play pretend|banter|game|chuckle)\b/i.test(textContext)) addCandidate(['playful', 'mischievous', 'amused'], 1.0);
  if (/\b(it's okay|comfort|soothe|calm down|safe here|breathe with me|gentle|healing|peace)\b/i.test(textContext)) addCandidate(['soothing', 'compassionate', 'reassuring'], 1.0);
  if (/\b(oh really|yeah right|whatever|brilliant|obviously|slow clap|eyeroll|as if|mocking)\b/i.test(textContext)) addCandidate(['sarcastic', 'wry', 'mocking'], 1.0);
  if (/\b(tired|exhausted|burnout|can't go on|heavy|giving up|resigned|sigh|weary)\b/i.test(textContext)) addCandidate(['weary', 'resigned', 'stoic'], 1.0);
  if (/\b(hurry|urgent|emergency|fast|quick|no time|immediate|danger|alarm|act now)\b/i.test(textContext)) addCandidate(['urgent', 'breathless'], 1.1);
  if (/\b(tell me a story|once upon a time|chronicle|legend|myth|folktale|lore|narrate)\b/i.test(textContext)) addCandidate(['storyteller', 'entranced'], 1.0);
  if (/\b(wonder|universe|cosmos|stars|awe|breathtaking|incredible|how is it possible|infinite)\b/i.test(textContext)) addCandidate(['entranced', 'reverent', 'reflective'], 1.0);
  if (/\b(miss those days|remember when|bittersweet|nostalgia|yearning|long ago|memory)\b/i.test(textContext)) addCandidate(['wistful', 'bittersweet', 'melancholy'], 1.0);
  if (/\b(thank you|so grateful|appreciate you|means a lot|blessed|thankful)\b/i.test(textContext)) addCandidate(['grateful', 'affectionate'], 1.0);
  if (/\b(attention|listen to my command|orders|standing orders|ruler|queen|emperor|obey)\b/i.test(textContext)) addCandidate(['commanding', 'imperious', 'solemn'], 1.1);

  if (message.endsWith('?')) addCandidate(['reflective', 'bewildered'], 0.8);
  if (message.includes('!')) addCandidate(['joyful', 'ecstatic'], 0.8);

  candidates.push({ mood: findMoodByTag('earnest') || EXHAUSTIVE_MOODS[0], score: 0.5 });
  candidates.sort((a, b) => b.score - a.score);

  // Derive pseudo-state from current parameters to maintain smoothing without server session stores
  const prevState = prosodyMomentum.createInitialState(currentMood?.id);
  
  const result = prosodyMomentum.resolveNextState(
    message,
    history,
    candidates,
    prevState,
    momentum
  );

  return { 
    mood: result.mood, 
    intensity: result.intensity, 
    momentum: result.state.momentum 
  };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image, mode: clientMode, customInstructions, history, voiceProfile, loreSnippets, mood, momentum, interruptionMemory } = req.body;

    const lowerMsg = (message || '').toLowerCase();
    const roleplayKeywords = ['scene', 'play pretend', 'role', 'you are an', 'you are a', 'act as', 'character', 'script', 'questioning me'];
    const isRoleplayInvite = roleplayKeywords.some(kw => lowerMsg.includes(kw));

    const effectiveMode = isRoleplayInvite ? 'on-stage' : clientMode;

    // Automatically select relevant mood tag from the 100-mood library based on conversation context
    const resolvedAuto = resolveAutomaticContextualMood(message, history, mood, undefined, momentum);
    const autoMood = resolvedAuto.mood;
    const effectiveMomentum = resolvedAuto.momentum;

    const autoMoodInstruction = `[AUTOMATIC CONTEXTUAL PROSODY:
Active Prosody Tag: ${autoMood.tag} (${autoMood.label})
Acoustic Inflection Guidance: ${autoMood.description}
Directive: Based on the immediate conversation context and emotional subtext, embody this ${autoMood.tag} vocal prosody.
You MUST begin your spoken reply with this exact prosody tag in brackets: "${autoMood.tag}".
Ensure your vocal cadence, pitch inflection, and rhythm embody these characteristics.]`;

    const systemPrompt = customInstructions || DEFAULT_LILA_PROMPT;
    const modeContext = effectiveMode === 'on-stage' 
      ? '[CURRENT STATE: ON-STAGE / IN ROLE. Deliver with absolute confidence, precision, and rehearsal. Zero disfluencies.]' 
      : '[CURRENT STATE: OFF-STAGE / BASE SELF. Use natural disfluencies, honest grounding, and active listening.]';

    const voiceContext = voiceProfile 
      ? `[ACTIVE VOICE CLONE PROFILE: ${voiceProfile.name}, base: ${voiceProfile.baseVoice || 'Kore'}, pitch: ${voiceProfile.pitch}, tone: ${voiceProfile.tone}, style: ${voiceProfile.vocalStyle || 'conversational'}]` 
      : '';

    const interruptionContext = interruptionMemory && interruptionMemory.unspokenPart
      ? `[INTERRUPTED CONVERSATION CONTEXT:
On your previous turn, the user interrupted you mid-sentence.
What you actually managed to speak before being cut off: "${interruptionMemory.spokenPart}"
What you were about to say when interrupted: "${interruptionMemory.unspokenPart}"
Directive: Acknowledge that you were cut off if natural (e.g. "As I was saying...", "Sorry, go ahead", or resuming your point), and respond to the user's new input while keeping your previous interrupted thought in mind.]`
      : '';

    const loreContext = loreSnippets && loreSnippets.length > 0
      ? `[RECOVERED LORE & KNOWLEDGE:\n${loreSnippets.map((l: any) => `- ${l.title}: ${l.content}`).join('\n')}\n]`
      : '';

    const fullSystemInstruction = `${autoMoodInstruction}\n\n${systemPrompt}\n\n${modeContext}\n${voiceContext}\n${interruptionContext}\n${loreContext}`;

    // Prepare history turns ensuring correct roles and non-empty content
    const rawTurns = (history || [])
      .filter((h: any) => h.content && typeof h.content === 'string' && h.content.trim() !== '')
      .map((h: { role: string; content: string }) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      }));

    // In Gemini API, contents MUST begin with a 'user' turn.
    // Strip any leading model greeting turns:
    while (rawTurns.length > 0 && rawTurns[0].role === 'model') {
      rawTurns.shift();
    }

    // Build current user message parts including optional multi-modal vision co-presence image
    const currentUserParts: any[] = [];
    if (image && typeof image === 'string' && image.length > 50) {
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
      currentUserParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        }
      });
    }
    currentUserParts.push({ text: message || (image ? 'Observe my camera feed and describe what you see.' : '') });

    // Merge consecutive turns with the same role and append current user message
    const allTurns = [...rawTurns, { role: 'user', parts: currentUserParts }];
    const sanitizedContents: Array<{ role: string; parts: any[] }> = [];

    for (const turn of allTurns) {
      if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === turn.role) {
        sanitizedContents[sanitizedContents.length - 1].parts.push(...turn.parts);
      } else {
        sanitizedContents.push(turn);
      }
    }

    const contents = sanitizedContents;

    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-3.8-flash-lite',
      'gemini-1.5-flash'
    ];
    let reply = '';
    let lastErr: any = null;

    const aiClient = getGenAIClient(req);

    for (const model of modelsToTry) {
      let attempts = 0;
      const maxAttempts = model.includes('3.0') || model.includes('preview') ? 1 : 2; // Retry less on experimental/busy preview models
      
      while (attempts < maxAttempts) {
        try {
          const response = await aiClient.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: fullSystemInstruction,
              temperature: effectiveMode === 'on-stage' ? 0.7 : 0.9,
              maxOutputTokens: 1024,
            }
          });
          if (response.text) {
            reply = response.text;
            break;
          }
        } catch (err: any) {
          lastErr = err;
          const is503 = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE');
          
          if (is503 && attempts < maxAttempts - 1) {
            attempts++;
            const delay = 1000 * attempts;
            console.log(`Model ${model} busy (503), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          console.warn(`Model ${model} failed or unavailable, trying fallback:`, err?.message || err);
          break; // Move to next model in the list
        }
      }
      if (reply) break;
    }

    if (!reply && lastErr) {
      throw lastErr;
    }

    const parsedProsody = extractContextualProsody(reply);
    const finalMood = parsedProsody.mood || autoMood;
    
    // Semantic Prosody Tag Auto-Injection (Pre-TTS LLM Filter):
    // Parses assistant response and injects nonverbal sound tokens ([sigh], [gasp], [laugh], [hum], [tsk])
    // using sentiment and punctuation cues before routing to Neural TTS.
    const { injectedText: enrichedReply } = injectSemanticProsodyTags(reply, { moodTag: finalMood?.tag });
    const voxLine = parseVoxLine(enrichedReply, finalMood);

    // Apply conversational momentum to synthesize segments with responsive rate and articulation
    if (typeof effectiveMomentum === 'number' && !isNaN(effectiveMomentum)) {
      voxLine.segments.forEach(seg => {
        seg.pace.rate = Math.max(0.6, Math.min(1.5, Number((seg.pace.rate * effectiveMomentum).toFixed(2))));
        if (effectiveMomentum > 1.35) {
          seg.pace.articulation = 'staccato';
        } else if (effectiveMomentum < 0.8) {
          seg.pace.articulation = 'legato';
        }
      });
    }

    res.json({ 
      reply: enrichedReply || reply || "I'm listening...", 
      detectedMode: effectiveMode,
      mood: finalMood,
      voxLine,
      momentum: typeof effectiveMomentum === 'number' ? effectiveMomentum : 1.0
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    
    // Check if error is related to quota (429 or RESOURCE_EXHAUSTED)
    const errString = JSON.stringify(err);
    if (errString.includes('429') || errString.includes('RESOURCE_EXHAUSTED') || err.status === 429) {
      res.status(429).json({ error: 'Quota exceeded. Please wait a few minutes before trying again.' });
    } else {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});

// Neural TTS generation using Gemini 3.8 Flash Lite TTS (Full Response)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceProfile, mood, momentum } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const defaultMood = mood || findMoodByTag('joyful') || EXHAUSTIVE_MOODS[0];
    const voxLine = parseVoxLine(text, defaultMood);

    // Calculate pace vector via PaceEngine for natural conversational transitions
    const paceVector = paceEngine.updateState({
      momentum,
      mood: defaultMood,
      text,
      baseRate: voiceProfile?.rate || 1.0,
    });

    voxLine.segments.forEach(seg => {
      seg.pace.rate = paceVector.effectiveRate;
      seg.pace.pause = paceVector.pauseTier;
      seg.pace.articulation = paceVector.articulation;
    });

    const baseVoice = voiceProfile?.baseVoice || 'Kore';
    const baseVocalStyle = voiceProfile?.vocalStyle || 'Warm, authentic, natural conversational female voice';

    // Render A: Build multi-part content with speechMetadata.style per segment
    const parts: Array<{ text: string; speechMetadata: { style: string } }> = [];
    let prevMoodTag = '';

    for (let i = 0; i < voxLine.segments.length; i++) {
      const seg = voxLine.segments[i];
      const moodObj = EXHAUSTIVE_MOODS.find(m => m.id === seg.mood) || defaultMood;
      
      let intensityModifier = '';
      if (seg.intensity < 0.4) intensityModifier = 'a hint of ';
      else if (seg.intensity > 0.75) intensityModifier = 'intensely ';

      const toneDesc = moodObj.tone || moodObj.description || seg.mood;
      const paceDesc = compilePaceForGemini(seg.pace);
      let segmentStyle = `${intensityModifier}${toneDesc}. ${paceDesc}`;

      if (seg.enter.kind === 'ramp' && prevMoodTag) {
        segmentStyle = `${prevMoodTag}, then ${segmentStyle}`;
      }

      prevMoodTag = moodObj.tag || seg.mood;

      let segText = seg.text;
      if (seg.enter.kind === 'beat') {
        const pauseTag = seg.enter.ms > 350 ? '<long pause>' : '<short pause>';
        segText = `${pauseTag} ${segText}`;
      }

      // Adaptive Silence & Breathing Control based on pace.pause tier
      if (seg.pace.pause === 'long') {
        segText = segText.replace(/([.!?])\s+/g, '$1 <long pause> ').replace(/,\s+/g, ', <short pause> ');
      } else if (seg.pace.pause === 'marked' || seg.pace.pause === 'short') {
        segText = segText.replace(/([.!?])\s+/g, '$1 <short pause> ');
      }

      parts.push({
        text: segText,
        speechMetadata: {
          style: `${segmentStyle}. ${baseVocalStyle}`
        }
      });
    }

    const ttsModels = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
    let response: any = null;
    let lastTtsErr: any = null;
    const aiClient = getGenAIClient(req);

    for (const model of ttsModels) {
      try {
        response = await aiClient.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: baseVoice },
              },
            },
          },
        });
        if (response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
          break;
        }
      } catch (err: any) {
        lastTtsErr = err;
        console.warn(`TTS model ${model} unavailable, trying fallback:`, err?.message || err);
      }
    }

    if (!response && lastTtsErr) {
      throw lastTtsErr;
    }

    const base64Audio = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const paceToUse = voxLine.segments[0]?.pace || { rate: 1.0, pause: 'normal', articulation: 'neutral' };
      const processedAudio = injectMicroSilences(base64Audio, paceToUse);
      res.json({ audio: processedAudio });
    } else {
      res.status(500).json({ error: 'No audio generated by TTS model' });
    }
  } catch (err: any) {
    const isQuota = err?.status === 429 || 
                    err?.message?.includes('429') || 
                    err?.message?.includes('RESOURCE_EXHAUSTED') ||
                    err?.message?.includes('Quota exceeded');
    if (isQuota) {
      console.log('[TTS Info] Free-tier quota reached for neural voice. Client using browser speech fallback.');
      return res.json({ quotaExceeded: true });
    }
    console.error('TTS error:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to synthesize speech' });
  }
});

// Sub-Utterance Streaming Neural TTS (Chunked Real-Time Streaming)
app.post('/api/tts-stream', async (req, res) => {
  try {
    const { text, voiceProfile, mood, momentum } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS streaming' });
    }

    // Split text into sub-utterance clauses for sub-200ms streaming audio delivery
    const clauses = text
      .split(/(?<=[.!?;,])\s+/)
      .filter((c: string) => c && c.trim().length > 0);

    if (clauses.length === 0) clauses.push(text);

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const defaultMood = mood || findMoodByTag('joyful') || EXHAUSTIVE_MOODS[0];
    const baseVoice = voiceProfile?.baseVoice || 'Kore';
    const baseVocalStyle = voiceProfile?.vocalStyle || 'Warm, authentic, natural conversational female voice';
    const aiClient = getGenAIClient(req);

    for (let idx = 0; idx < clauses.length; idx++) {
      const clauseText = clauses[idx];
      const voxLine = parseVoxLine(clauseText, defaultMood);
      const toneDesc = defaultMood.tone || defaultMood.description || defaultMood.label;
      const paceDesc = compilePaceForGemini(voxLine.segments[0]?.pace || { rate: 1.0, pause: 'normal', articulation: 'neutral' });

      const parts = [{
        text: clauseText,
        speechMetadata: {
          style: `${toneDesc}. ${paceDesc}. ${baseVocalStyle}`
        }
      }];

      let clauseAudio: string | null = null;
      let isQuotaExceeded = false;

      for (const model of ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']) {
        try {
          const response = await aiClient.models.generateContent({
            model,
            contents: [{ role: 'user', parts }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: baseVoice },
                },
              },
            },
          });
          const rawBase64 = response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (rawBase64) {
            const paceToUse = voxLine.segments[0]?.pace || { rate: 1.0, pause: 'normal', articulation: 'neutral' };
            clauseAudio = injectMicroSilences(rawBase64, paceToUse);
            break;
          }
        } catch (err: any) {
          const isQuota = err?.status === 429 || 
                          err?.message?.includes('429') || 
                          err?.message?.includes('RESOURCE_EXHAUSTED') ||
                          err?.message?.includes('Quota exceeded');
          if (isQuota) {
            isQuotaExceeded = true;
            break;
          }
        }
      }

      if (isQuotaExceeded) {
        res.write(JSON.stringify({ quotaExceeded: true }) + '\n');
        break;
      }

      if (clauseAudio) {
        res.write(JSON.stringify({
          chunkIndex: idx,
          totalChunks: clauses.length,
          clauseText,
          audio: clauseAudio,
          isFinal: idx === clauses.length - 1,
        }) + '\n');
      }
    }

    res.end();
  } catch (err: any) {
    console.error('TTS Streaming Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Streaming TTS failed' });
    } else {
      res.end();
    }
  }
});

// Voice sample acoustic analysis and cloning parameter extraction
app.post('/api/analyze-voice-sample', async (req, res) => {
  try {
    const { audioBase64, mimeType, fileName } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const prompt = `You are an expert audio engineer and vocal director. Analyze this audio recording of a speaker to clone and calibrate their voice profile for Text-to-Speech (TTS).
Evaluate the speaker's vocal attributes:
1. Vocal texture (warm, breathy, bright, deep, velvety, crisp, intimate).
2. Perceived pitch multiplier (0.7 to 1.4, default 1.0).
3. Pacing / speech speed multiplier (0.8 to 1.3, default 1.0).
4. Best prebuilt base voice match from ['Kore', 'Aoede', 'Autonoe', 'Callirrhoe', 'Despina', 'Erinome', 'Laomedeia', 'Leda', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] (Kore is feminine and warm, Aoede is lyrical/melodic, Autonoe is contemplative alto, Callirrhoe is velvety/alluring, Despina is crisp/commanding, Erinome is soft/tender, Laomedeia is stately/theatrical, Leda is vibrant/playful).
5. A descriptive vocal style instruction string (1-2 sentences) instructing the TTS synthesizer how to deliver lines in this voice.

Return strictly a JSON object:
{
  "name": "Descriptive Voice Name (e.g. Amber Velvet, Intimate Alto)",
  "baseVoice": "Kore",
  "pitch": 1.15,
  "rate": 1.0,
  "tone": "velvet",
  "vocalStyle": "Intimate, warm, thoughtful female voice with subtle breathiness and gentle conversational pacing",
  "description": "Vocal analysis summary"
}`;

    const aiClient = getGenAIClient(req);
    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/wav',
                data: audioBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      ...parsed,
      fileName: fileName || 'uploaded_sample.wav',
    });
  } catch (err: any) {
    console.error('Analyze voice error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze voice sample' });
  }
});

// Transcribe audio using Gemini multimodal capabilities (speech-to-text fallback for all browsers)
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    const aiClient = getGenAIClient(req);
    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioBase64,
              },
            },
            {
              text: 'Listen carefully to this user microphone audio and provide an exact, accurate verbatim transcription of what the speaker said. Do not include introductory notes, timestamps, explanations, or quotes. Output strictly the spoken words. If no speech is intelligible or only background noise, return an empty string.',
            },
          ],
        },
      ],
    });
    const transcript = (response.text || '').trim();
    res.json({ transcript });
  } catch (err: any) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: err.message || 'Transcription failed' });
  }
});

app.post('/api/extract-lore', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.json({ extractedFacts: [] });
    }

    const prompt = `Analyze the following conversation transcript between Lila and a user. Extract any new character facts, shared memories, or lived experiences that should be preserved as permanent lore. 
Return ONLY a valid JSON object with the exact structure:
{
  "extractedFacts": [
    { "title": "Short descriptive title", "content": "Summary of the lived experience or fact" }
  ]
}
If none, return { "extractedFacts": [] }.

Transcript:
${transcript}`;

    const aiClient = getGenAIClient(req);
    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    });

    const result = JSON.parse(response.text || '{"extractedFacts":[]}');
    res.json(result);
  } catch (err: any) {
    console.error('Extract lore error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Final SPA Catch-all handled below

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred',
    path: req.path
  });
});

if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Lila Companion server running on http://0.0.0.0:${PORT}`);
});
