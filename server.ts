import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

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

app.post('/api/chat', async (req, res) => {
  try {
    const { message, mode: clientMode, customInstructions, history, voiceProfile, loreSnippets, mood } = req.body;

    const lowerMsg = (message || '').toLowerCase();
    const roleplayKeywords = ['scene', 'play pretend', 'role', 'you are an', 'you are a', 'act as', 'character', 'script', 'questioning me'];
    const isRoleplayInvite = roleplayKeywords.some(kw => lowerMsg.includes(kw));

    const effectiveMode = isRoleplayInvite ? 'on-stage' : clientMode;

    const moodTag = mood?.tag 
      ? `[VOCAL PROSODY & MOOD: ${mood.tag} (${mood.label || ''}) - ${mood.description || ''}. Strongly embody this emotional tone, pitch inflection, pacing, and vocal prosody in your delivery.]` 
      : '';

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

    const dynamicProsodyGuideline = `[CONTEXTUAL DYNAMIC PROSODY: You have access to the 100 Voxpack Prosody tags (e.g. [joyful], [playful], [mischievous], [whisper], [affectionate], [soothing], [furious], [wry], [oracular], [float], [punch], [storyteller], [hypnotic], etc.). Dynamically select and prepend the single most appropriate bracketed prosody tag at the beginning of your response (e.g. "[playful] ...") to steer your acoustic inflection and emotional delivery.]`;

    const fullSystemInstruction = `${moodTag ? moodTag + '\n\n' : ''}${systemPrompt}\n\n${modeContext}\n${voiceContext}\n${dynamicProsodyGuideline}\n${loreContext}`;

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

    res.json({ reply: reply || "I'm listening...", detectedMode: effectiveMode });
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
