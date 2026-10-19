import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { EXHAUSTIVE_MOODS, findMoodByTag, extractContextualProsody, MoodOption } from './src/services/moodStore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

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
Do not use any emojis, annotations, parentheticals, or action lines.
Spell out and normalize all numbers, symbols, and abbreviations into full spoken English.
Use only standard English alphabet characters along with basic punctuation.
Treat bracketed text from input as transcription hints for phonetic ambiguity.`;

function resolveAutomaticContextualMood(message: string, history: any[] = [], explicitMood?: MoodOption): MoodOption {
  const textContext = `${(history || []).slice(-4).map((h: any) => h.content || '').join(' ')} ${message || ''}`.toLowerCase();
  
  // 1. Terror / Dread / Extreme Fear
  if (/\b(panic|terrified|nightmare|horror|dread|scared to death|monsters?|running for my life|shaking)\b/i.test(textContext)) {
    return findMoodByTag('terrified') || findMoodByTag('dread') || EXHAUSTIVE_MOODS[0];
  }
  // 2. Heavy Grief / Mourning / Weeping
  if (/\b(mourn|grief|died|crying|tears|sob|lost everything|funeral|devastated|heartbroken)\b/i.test(textContext)) {
    return findMoodByTag('grieving') || findMoodByTag('tearful') || findMoodByTag('lament') || EXHAUSTIVE_MOODS[0];
  }
  // 3. Seething Rage / Furious / Betrayal
  if (/\b(furious|rage|betrayed|how dare you|liar|hate you|screaming|unforgivable|traitor)\b/i.test(textContext)) {
    return findMoodByTag('furious') || findMoodByTag('defiant') || findMoodByTag('indignant') || EXHAUSTIVE_MOODS[0];
  }
  // 4. Mystery / Prophecy / Occult / Ancient Ritual
  if (/\b(prophecy|oracle|ritual|ancient|curse|shadows?|spells?|incantation|omen|cryptic|destiny)\b/i.test(textContext)) {
    return findMoodByTag('oracular') || findMoodByTag('incantatory') || findMoodByTag('eerie') || EXHAUSTIVE_MOODS[0];
  }
  // 5. Conspiratorial / Whisper / Secret / Heist
  if (/\b(secret|whisper|conspiracy|don't tell|quietly|hush|behind their backs|plot|undercover)\b/i.test(textContext)) {
    return findMoodByTag('conspiratorial') || findMoodByTag('whisper') || EXHAUSTIVE_MOODS[0];
  }
  // 6. Intimate / Sultry / Flirtatious / Deep Affection
  if (/\b(sultry|flirt|kiss|attracted|beautiful|alluring|intimate|come closer|darling|romance|beloved)\b/i.test(textContext)) {
    return findMoodByTag('sultry') || findMoodByTag('flirtatious') || findMoodByTag('affectionate') || EXHAUSTIVE_MOODS[0];
  }
  // 7. Triumph / Victory / Celebration
  if (/\b(we won|victory|champion|triumph|we did it|celebrate|hooray|hurrah|proud of you|congratulations)\b/i.test(textContext)) {
    return findMoodByTag('triumphant') || findMoodByTag('proud') || findMoodByTag('ecstatic') || EXHAUSTIVE_MOODS[0];
  }
  // 8. Kinetic / Laban / Combat / Attack
  if (/\b(punch|strike|slash|attack|fight|impact|blow|crush|battle|charge|stab)\b/i.test(textContext)) {
    return findMoodByTag('punch') || findMoodByTag('slash') || findMoodByTag('determined') || EXHAUSTIVE_MOODS[0];
  }
  // 9. Playful Banter / Jokes / Teasing
  if (/\b(haha|lol|kidding|joke|teasing|silly|prank|play pretend|banter|game|chuckle)\b/i.test(textContext)) {
    return findMoodByTag('playful') || findMoodByTag('mischievous') || findMoodByTag('amused') || EXHAUSTIVE_MOODS[0];
  }
  // 10. Tender Care / Soothing Comfort
  if (/\b(it's okay|comfort|soothe|calm down|safe here|breathe with me|gentle|healing|peace)\b/i.test(textContext)) {
    return findMoodByTag('soothing') || findMoodByTag('compassionate') || findMoodByTag('reassuring') || EXHAUSTIVE_MOODS[0];
  }
  // 11. Sarcastic / Mocking / Snarky
  if (/\b(oh really|yeah right|whatever|brilliant|obviously|slow clap|eyeroll|as if|mocking)\b/i.test(textContext)) {
    return findMoodByTag('sarcastic') || findMoodByTag('wry') || findMoodByTag('mocking') || EXHAUSTIVE_MOODS[0];
  }
  // 12. Weary / Exhausted / Resigned
  if (/\b(tired|exhausted|burnout|can't go on|heavy|giving up|resigned|sigh|weary)\b/i.test(textContext)) {
    return findMoodByTag('weary') || findMoodByTag('resigned') || findMoodByTag('stoic') || EXHAUSTIVE_MOODS[0];
  }
  // 13. Urgent / Crisis / Emergency
  if (/\b(hurry|urgent|emergency|fast|quick|no time|immediate|danger|alarm|act now)\b/i.test(textContext)) {
    return findMoodByTag('urgent') || findMoodByTag('breathless') || EXHAUSTIVE_MOODS[0];
  }
  // 14. Storytelling / Folklore / Immersive Tales
  if (/\b(tell me a story|once upon a time|chronicle|legend|myth|folktale|lore|narrate)\b/i.test(textContext)) {
    return findMoodByTag('storyteller') || findMoodByTag('entranced') || EXHAUSTIVE_MOODS[0];
  }
  // 15. Wonder / Awe / Cosmic Discovery
  if (/\b(wonder|universe|cosmos|stars|awe|breathtaking|incredible|how is it possible|infinite)\b/i.test(textContext)) {
    return findMoodByTag('entranced') || findMoodByTag('reverent') || findMoodByTag('reflective') || EXHAUSTIVE_MOODS[0];
  }
  // 16. Melancholy / Nostalgic / Bittersweet
  if (/\b(miss those days|remember when|bittersweet|nostalgia|yearning|long ago|memory)\b/i.test(textContext)) {
    return findMoodByTag('wistful') || findMoodByTag('bittersweet') || findMoodByTag('melancholy') || EXHAUSTIVE_MOODS[0];
  }
  // 17. Gratitude / Warm Thanks
  if (/\b(thank you|so grateful|appreciate you|means a lot|blessed|thankful)\b/i.test(textContext)) {
    return findMoodByTag('grateful') || findMoodByTag('affectionate') || EXHAUSTIVE_MOODS[0];
  }
  // 18. Command / Stately / Imperious
  if (/\b(attention|listen to my command|orders|standing orders|ruler|queen|emperor|obey)\b/i.test(textContext)) {
    return findMoodByTag('commanding') || findMoodByTag('imperious') || findMoodByTag('solemn') || EXHAUSTIVE_MOODS[0];
  }

  // If explicit mood was specified and is not the generic default, respect it
  if (explicitMood && explicitMood.tag && explicitMood.id !== 'natural' && explicitMood.id !== 'joyful') {
    return explicitMood;
  }

  // Conversational punctuation & structure heuristics
  if (message.endsWith('?')) {
    return findMoodByTag('reflective') || findMoodByTag('bewildered') || EXHAUSTIVE_MOODS[0];
  }
  if (message.includes('!')) {
    return findMoodByTag('joyful') || findMoodByTag('ecstatic') || EXHAUSTIVE_MOODS[0];
  }

  return findMoodByTag('earnest') || findMoodByTag('soothing') || EXHAUSTIVE_MOODS[0];
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, mode: clientMode, customInstructions, history, voiceProfile, loreSnippets, mood } = req.body;

    const lowerMsg = (message || '').toLowerCase();
    const roleplayKeywords = ['scene', 'play pretend', 'role', 'you are an', 'you are a', 'act as', 'character', 'script', 'questioning me'];
    const isRoleplayInvite = roleplayKeywords.some(kw => lowerMsg.includes(kw));

    const effectiveMode = isRoleplayInvite ? 'on-stage' : clientMode;

    // Automatically select relevant mood tag from the 100-mood library based on conversation context
    const autoMood = resolveAutomaticContextualMood(message, history, mood);

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

    const loreContext = loreSnippets && loreSnippets.length > 0
      ? `[RECOVERED LORE & KNOWLEDGE:\n${loreSnippets.map((l: any) => `- ${l.title}: ${l.content}`).join('\n')}\n]`
      : '';

    const fullSystemInstruction = `${autoMoodInstruction}\n\n${systemPrompt}\n\n${modeContext}\n${voiceContext}\n${loreContext}`;

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

    // Merge consecutive turns with the same role and append current user message
    const allTurns = [...rawTurns, { role: 'user', parts: [{ text: message }] }];
    const sanitizedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const turn of allTurns) {
      if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === turn.role) {
        sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n${turn.parts[0].text}`;
      } else {
        sanitizedContents.push(turn);
      }
    }

    const contents = sanitizedContents;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let reply = '';
    let lastErr: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
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
        console.warn(`Model ${model} unavailable, trying fallback:`, err?.message || err);
      }
    }

    if (!reply && lastErr) {
      throw lastErr;
    }

    const parsedProsody = extractContextualProsody(reply);
    const finalMood = parsedProsody.mood || autoMood;

    res.json({ 
      reply: reply || "I'm listening...", 
      detectedMode: effectiveMode,
      mood: finalMood
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

// Neural TTS generation using Gemini 3.8 Flash Lite TTS
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceProfile, mood } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    // Extract any contextual prosody tag from text so TTS does not vocalize the brackets
    let cleanText = text;
    let effectiveMood = mood;
    const tagMatch = text.match(/^\[([a-zA-Z\-_]+)\]\s*(.*)$/s);
    if (tagMatch) {
      const detectedTag = tagMatch[1].toLowerCase();
      cleanText = tagMatch[2] || text;
      if (!effectiveMood) {
        effectiveMood = {
          tag: `[${detectedTag}]`,
          description: `Contextual ${detectedTag} dynamic vocal prosody`,
        };
      }
    }

    const baseVoice = voiceProfile?.baseVoice || 'Kore';
    const moodPrefix = effectiveMood?.tag ? `Spoken with ${effectiveMood.tag} emotional prosody (${effectiveMood.description || ''}). ` : '';
    const stylePrompt = `${moodPrefix}${voiceProfile?.vocalStyle || 'Warm, authentic, natural conversational female voice'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: stylePrompt,
              },
            },
          ],
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

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
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
4. Best prebuilt base voice match from ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] (Kore is feminine and warm, Puck is energetic/youthful, Charon is deep/grounded, Fenrir is intense/resonant, Zephyr is soft/airy).
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

    const response = await ai.models.generateContent({
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

    const response = await ai.models.generateContent({
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
