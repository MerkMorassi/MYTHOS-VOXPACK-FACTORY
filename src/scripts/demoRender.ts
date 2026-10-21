import { parseVoxLine } from '../services/voxParser';
import { EXHAUSTIVE_MOODS, findMoodByTag } from '../services/moodStore';

async function runDemo() {
  console.log('--- Voxpack Render A & B Demo ---');
  const defaultMood = findMoodByTag('joyful') || EXHAUSTIVE_MOODS[0];
  const exampleLine = "[wry] Oh, sure, that'll work. [icy |300] Try it again. [pace 0.8] Slowly, this time.";
  
  const voxLine = parseVoxLine(exampleLine, defaultMood, 'MAYA');
  console.log('Parsed VoxLine canonical JSON (voxline.v1):');
  console.log(JSON.stringify(voxLine, null, 2));

  console.log('\n[Render A Simulation]: One generateContent request with N parts, each with speechMetadata.style compiled from tone + pace.');
  voxLine.segments.forEach((seg, idx) => {
    const moodObj = EXHAUSTIVE_MOODS.find(m => m.id === seg.mood);
    const tone = moodObj?.tone || seg.mood;
    console.log(` Part ${idx + 1}: text="${seg.text}", mood=${seg.mood}, intensity=${seg.intensity}, style="${tone}", enter=${seg.enter.kind}(${seg.enter.ms}ms)`);
  });

  console.log('\n[Render B Simulation]: Multi-segment PCM request, silence trimming, loudness carry, and crossfade stitching.');
  console.log('Render A and Render B simulation completed successfully.');
}

runDemo().catch(console.error);
