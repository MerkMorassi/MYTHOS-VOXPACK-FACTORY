/**
 * Stochastic text decorator for Perchance runtime integrations.
 * Non-deterministically introduces matching somatic tokens into text streams.
 */
function injectStochasticFoleyTags(activeMood, rawTextLine) {
  const mapConfig = PROSODY_SOMATIC_MAPPING[activeMood];
  if (!mapConfig) return activeMood + " " + rawTextLine;

  let finalLine = rawTextLine;

  mapConfig.allowedSomatics.forEach(function(somatic) {
    const rolledValue = Math.random();
    if (rolledValue <= somatic.triggerProbability) {
      if (somatic.preferredPlacement === "prefix") {
        finalLine = somatic.tag + " " + finalLine;
      } else if (somatic.preferredPlacement === "suffix") {
        finalLine = finalLine + " " + somatic.tag;
      } else if (somatic.preferredPlacement === "interleaved") {
        const words = finalLine.split(" ");
        if (words.length > 3) {
          const insertionIndex = Math.floor(words.length / 2);
          words.splice(insertionIndex, 0, somatic.tag);
          finalLine = words.join(" ");
        }
      }
    }
  });

  return activeMood + " " + finalLine;
}
