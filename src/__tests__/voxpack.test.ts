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

console.log('All Voxpack unit tests passed successfully!');
