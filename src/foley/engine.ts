import { PROSODY_SOMATIC_MAPPING } from "./mapping";

/**
 * Non-deterministic screenplay decorator.
 * Randomly injects compliant foley tags based on target rating and active mood matrix.
 */
export function injectStochasticFoleyTags(activeMood: string, rawTextLine: string): string {
  const mapConfig = PROSODY_SOMATIC_MAPPING[activeMood];
  if (!mapConfig) return `${activeMood} ${rawTextLine}`; // Fallback if mood map isn't registered

  let finalLine = rawTextLine;
  
  // Evaluate somatic elements mapped to active state
  mapConfig.allowedSomatics.forEach((somatic) => {
    const rolledValue = Math.random();
    if (rolledValue <= somatic.triggerProbability) {
      if (somatic.preferredPlacement === "prefix") {
        finalLine = `${somatic.tag} ${finalLine}`;
      } else if (somatic.preferredPlacement === "suffix") {
        finalLine = `${finalLine} ${somatic.tag}`;
      } else if (somatic.preferredPlacement === "interleaved") {
        // Splice into the middle section via word split indexes
        const words = finalLine.split(" ");
        if (words.length > 3) {
          const insertionIndex = Math.floor(words.length / 2);
          words.splice(insertionIndex, 0, somatic.tag);
          finalLine = words.join(" ");
        }
      }
    }
  });

  return `${activeMood} ${finalLine}`;
}
