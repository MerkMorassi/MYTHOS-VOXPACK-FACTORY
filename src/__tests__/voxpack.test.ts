import { parseVoxLine, classifyTransition } from '../services/voxLineParser';
import { resolvePace, EXHAUSTIVE_MOODS, findMoodByTag } from '../services/moodStore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

console.log('Running Voxpack Unit Tests...');

// 1. Test word-boundary regexes via acoustic modifier inferences
const joyful = EXHAUSTIVE_MOODS.find(m => m.id === 'joyful')!;
assert(joyful.pace.rate === 1.05, 'Joyful pace rate is correct');
// Check that unhurried did not trigger fast rate
const devoted = EXHAUSTIVE_MOODS.find(m => m.id === 'devoted')!;
assert(devoted.pace.rate === 0.92, 'Devoted rate is unhurried (not fast)');

// 2. Test resolvePace
const persona = { rate: 1.1 };
const moodPace = { rate: 0.9, pause: 'normal' as const, articulation: 'neutral' as const };
const resolved = resolvePace(persona, moodPace, { rate: 0.8, pause: 'long' });
assert(Math.abs(resolved.rate - 0.88) < 0.001, 'resolvePace multiplies persona and override rate correctly');
assert(resolved.pause === 'long', 'resolvePace picks override pause');
assert(resolved.articulation === 'neutral', 'resolvePace defaults to mood articulation');

// 3. Test classifyTransition
const wry = findMoodByTag('wry')!;
const icy = findMoodByTag('icy')!;
const joyfulMood = findMoodByTag('joyful')!;
const playMood = findMoodByTag('playful')!;

const t1 = classifyTransition(wry, wry);
assert(t1.kind === 'none', 'Same mood transition is none');

const t2 = classifyTransition(wry, icy);
// Different orientation or family
assert(t2.kind !== undefined, 'Transition between wry and icy is classified');

// 4. Test parseVoxLine
const sample = '[wry] Oh, sure, that will work. [icy |300] Try it again. [pace 0.8] Slowly, this time.';
const line = parseVoxLine(sample, joyfulMood);
assert(line.v === 1, 'VoxLine version is 1');
assert(line.speaker === 'LILA', 'Default speaker is LILA');
assert(line.segments.length > 0, 'Segments parsed successfully');
assert(line.segments.every(s => !/\[|\]/.test(s.text)), 'All bracket directives stripped from text');

// 5. Test audioProcessor micro-silence injection
const { calculateMicroSilences, injectMicroSilences } = await import('../services/audioProcessor');
const shortPace = { rate: 1.2, pause: 'short' as const, articulation: 'staccato' as const };
const microConfig = calculateMicroSilences(shortPace);
assert(microConfig.pauseMs === Math.round(80 / 1.2), 'Short pause calculates scaled micro-pause');
assert(microConfig.articulationStyle === 'staccato', 'Articulation style preserved in micro-silences');

// Overloaded call: injectMicroSilences(pace)
const invokedConfig = injectMicroSilences(shortPace);
assert('inhalationDurationMs' in invokedConfig, 'injectMicroSilences(pace) returns MicroSilenceConfig');

// Test synthetic WAV buffer prepend
const fakeWavHeader = new Uint8Array(44 + 100);
// RIFF header
fakeWavHeader[0] = 0x52; fakeWavHeader[1] = 0x49; fakeWavHeader[2] = 0x46; fakeWavHeader[3] = 0x46; // 'RIFF'
fakeWavHeader[8] = 0x57; fakeWavHeader[9] = 0x41; fakeWavHeader[10] = 0x56; fakeWavHeader[11] = 0x45; // 'WAVE'
const prependedBuffer = injectMicroSilences(fakeWavHeader.buffer, shortPace);
assert(prependedBuffer instanceof ArrayBuffer, 'injectMicroSilences with ArrayBuffer returns ArrayBuffer');
assert(prependedBuffer.byteLength > fakeWavHeader.buffer.byteLength, 'Injected micro-silence increases audio buffer size');

// 6. Test ECHOS Chip Integration
const { parseEchosLine, echos, ECHOS_VOICE_TAGS, ECHOS_EARCONS } = await import('../services/echos');
assert(ECHOS_VOICE_TAGS.length === 12, '12 ECHOS voice tags defined');
assert(ECHOS_EARCONS.includes('floor_ack'), 'floor_ack earcon present');
assert(ECHOS_EARCONS.includes('floor_yield'), 'floor_yield earcon present');
assert(ECHOS_EARCONS.includes('floor_want'), 'floor_want earcon present');

// Test ECHOS parsing
const echosSample = 'That worked [hum:2] really nice. [sigh@-150ms] Finally done.';
const parsedEchos = parseEchosLine(echosSample);
assert(parsedEchos.spoken === 'That worked really nice. Finally done.', 'ECHOS tags stripped from spoken text');
assert(parsedEchos.tags.length === 2, 'Two ECHOS tags parsed');
assert(parsedEchos.tags[0].tag === 'hum' && parsedEchos.tags[0].lvl === 2, 'Parsed hum:2 tag');
assert(parsedEchos.tags[1].tag === 'sigh' && parsedEchos.tags[1].offsetMs === -150, 'Parsed sigh@-150ms tag');

// Test ECHOS plan & round-robin take picker
const planned = echos.plan(echosSample);
assert(planned.v === 1, 'ECHOS plan version is 1');
assert(planned.items.length === 2, 'Two planned sound items');
assert(planned.items[0].take >= 1 && planned.items[0].take <= 5, 'Valid take selected');

// Test VoxLine parser routing ECHOS tags
const voxWithEchos = parseVoxLine('Hey there [hum:2] good to see you.', joyfulMood);
assert(voxWithEchos.segments.length > 0, 'VoxLine with ECHOS parsed');
assert(voxWithEchos.segments.some(s => s.echosSound?.tag === 'hum'), 'ECHOS sound attached to VoxSegment');

// 7. Test ECHOS Parser Layer (parser.ts)
const { splitLineChunks, stripAndRouteParalinguistics, identifyAndStripParalinguisticTags, stripParalinguisticTags } = await import('../services/echos/parser');
const mixedLine = 'Hello there [gasp] what is that? [laugh:1 under] Wonderful!';
const splitResult = splitLineChunks(mixedLine);
assert(splitResult.spoken === 'Hello there what is that? Wonderful!', 'splitLineChunks strips all nonverbal tags');
assert(splitResult.soundChunks.length === 2, 'splitLineChunks extracts exactly 2 sound chunks');
assert(splitResult.soundChunks[0].tag === 'gasp', 'Identified first sound chunk as gasp');
assert(splitResult.soundChunks[1].tag === 'laugh' && splitResult.soundChunks[1].under === true, 'Identified second sound chunk as laugh under');
assert(splitResult.textChunks.length >= 2, 'Extracted text chunks');

const stripped = stripAndRouteParalinguistics('Understood [hum:1]. Let us begin.');
assert(stripped.spokenText === 'Understood . Let us begin.' || stripped.spokenText === 'Understood. Let us begin.', 'stripAndRouteParalinguistics extracts clean spoken dialogue');
assert(stripped.soundChunks[0].tag === 'hum', 'Routed paralinguistic tag captured');

// Test identifyAndStripParalinguisticTags & stripParalinguisticTags
const sampleWithSigh = 'I thought we were done [sigh:2], but one more thing remains.';
const identified = identifyAndStripParalinguisticTags(sampleWithSigh);
assert(identified.hasParalinguisticTags === true, 'identifyAndStripParalinguisticTags flags presence of paralinguistic tags');
assert(identified.cleanDialogue === 'I thought we were done , but one more thing remains.', 'identifyAndStripParalinguisticTags strips [sigh:2]');
assert(identified.identifiedTags[0].tag === 'sigh' && identified.identifiedTags[0].lvl === 2, 'identifyAndStripParalinguisticTags identifies sigh:2');

const cleanOnly = stripParalinguisticTags('Yes [hum], absolutely.');
assert(cleanOnly === 'Yes , absolutely.', 'stripParalinguisticTags returns sanitized text');

// Test prepareMessageForTTS ensuring clean text for TTS service
const { prepareMessageForTTS, identifyParalinguisticTags, routeNonVerbalVocalizations } = await import('../services/echos/parser');
const ttsMsg = 'Indeed [sigh] that is the truth [hum:2].';
const ttsPrep = prepareMessageForTTS(ttsMsg, true);
assert(ttsPrep.cleanTextForTTS === 'Indeed that is the truth .', 'prepareMessageForTTS ensures only clean text for TTS');
assert(ttsPrep.paralinguisticTags.length === 2, 'prepareMessageForTTS extracts both paralinguistic tags');
assert(ttsPrep.paralinguisticTags[0].tag === 'sigh', 'First tag is sigh');
assert(ttsPrep.paralinguisticTags[1].tag === 'hum', 'Second tag is hum');

const identifiedOnly = identifyParalinguisticTags('Look [gasp] right there!');
assert(identifiedOnly.length === 1 && identifiedOnly[0].tag === 'gasp', 'identifyParalinguisticTags extracts gasp tag');

const routed = routeNonVerbalVocalizations('Done [floor_ack].', false);
assert(routed.cleanText === 'Done .', 'routeNonVerbalVocalizations strips tags');
assert(routed.routedTags.length === 1 && routed.routedTags[0].tag === 'floor_ack', 'routeNonVerbalVocalizations routes earcon');

console.log('All Voxpack & ECHOS unit tests passed successfully!');

