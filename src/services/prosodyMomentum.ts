import { MoodOption, EXHAUSTIVE_MOODS } from './moodStore';

/**
 * Interface representing the emotional momentum state.
 */
export interface ProsodyMomentumState {
  valence: number;     // -1.0 to 1.0
  arousal: number;     // 0.0 to 1.0
  dominance: number;   // 0.0 to 1.0
  momentum: number;    // 0.5 to 2.0 (Conversational velocity)
  lastMoodId: string;
  history: Array<{ valence: number; arousal: number; dominance: number; timestamp: number }>;
}

/**
 * Service to calculate emotional momentum and VAD vector smoothing.
 */
export class ProsodyMomentumService {
  private readonly MAX_HISTORY = 5;
  private readonly ALPHA = 0.35; // Smoothing factor

  /**
   * Resolve the next emotional state using hysteresis and VAD vector averaging.
   */
  public resolveNextState(
    currentMessage: string,
    history: any[],
    candidates: Array<{ mood: MoodOption; score: number }>,
    prevState: ProsodyMomentumState,
    clientMomentum: number = 1.0
  ): { mood: MoodOption; intensity: number; state: ProsodyMomentumState } {
    // 1. Calculate weighted average of candidate VAD vectors
    const bestCandidate = candidates[0];
    const topCandidates = candidates.slice(0, 3);
    const totalScore = topCandidates.reduce((sum, c) => sum + c.score, 0);
    
    let targetV = 0, targetA = 0, targetD = 0;
    topCandidates.forEach(c => {
      const weight = c.score / totalScore;
      targetV += (c.mood.valence ?? 0) * weight;
      targetA += (c.mood.arousal ?? 0.5) * weight;
      targetD += (c.mood.dominance ?? 0.5) * weight;
    });

    // 2. Apply inertia (EMA) using previous state
    const nextV = prevState.valence + this.ALPHA * (targetV - prevState.valence);
    const nextA = prevState.arousal + this.ALPHA * (targetA - prevState.arousal);
    const nextD = prevState.dominance + this.ALPHA * (targetD - prevState.dominance);

    // 3. Find the closest mood in the library to the new VAD vector (Hysteresis check)
    // We only switch mood if the distance is significant or the score is very high
    let finalMood = bestCandidate.mood;
    const currentMood = EXHAUSTIVE_MOODS.find(m => m.id === prevState.lastMoodId) || bestCandidate.mood;
    
    const currentScore = candidates.find(c => c.mood.id === currentMood.id)?.score || 0.4;
    
    // Switch only if the best candidate is significantly better (Hysteresis)
    if (bestCandidate.score - currentScore > 0.25) {
      finalMood = bestCandidate.mood;
    } else {
      finalMood = currentMood;
    }

    // 4. Update momentum based on arousal and message intensity
    // Rapid exclamation marks or high arousal increases momentum
    const exclamationCount = (currentMessage.match(/!/g) || []).length;
    const questionCount = (currentMessage.match(/\?/g) || []).length;
    
    let momentumDelta = (nextA - 0.5) * 0.2; // Arousal influence
    momentumDelta += exclamationCount * 0.05;
    momentumDelta += questionCount * 0.02;
    
    const nextMomentum = Math.max(0.6, Math.min(1.6, clientMomentum + momentumDelta));

    // 5. Build new state
    const nextState: ProsodyMomentumState = {
      valence: nextV,
      arousal: nextA,
      dominance: nextD,
      momentum: nextMomentum,
      lastMoodId: finalMood.id,
      history: [...prevState.history, { valence: nextV, arousal: nextA, dominance: nextD, timestamp: Date.now() }].slice(-this.MAX_HISTORY)
    };

    // Calculate intensity based on arousal and score
    const intensity = Math.min(1.0, 0.4 + (nextA * 0.4) + (bestCandidate.score * 0.2));

    return { mood: finalMood, intensity, state: nextState };
  }

  public createInitialState(moodId: string = 'earnest'): ProsodyMomentumState {
    const mood = EXHAUSTIVE_MOODS.find(m => m.id === moodId) || EXHAUSTIVE_MOODS[0];
    return {
      valence: mood.valence ?? 0,
      arousal: mood.arousal ?? 0.5,
      dominance: mood.dominance ?? 0.5,
      momentum: 1.0,
      lastMoodId: mood.id,
      history: []
    };
  }
}

export const prosodyMomentum = new ProsodyMomentumService();
