export interface FoleyTriggerPayload {
  tag: string;
  timeOffsetSeconds: number;
}

export type FoleyCallback = (payload: FoleyTriggerPayload) => void;

/**
 * Browser-safe streaming screenplay text transformer.
 * Strips micro somatic markers on the fly while dispatching precise
 * timeline offsets to the Web Audio scheduler context.
 */
export class MythosBrowserFoleyTransformer {
  private static SOMATIC_REGEX = /<(gasp|gasp-in|gasp-out|sigh|sigh-deep|cough|throat-clear|snicker|chuckle|saliva-click|pant-shallow|gasp-choke|voice-crack|giggle|whoop|mm-hmm|uh-huh|cough-nervous|chuckle-dry|lip-smack|huff|groan|tut-tut|hmmm|throat-clear-light|tskk|giggle-nervous|titter|catch-breath|whimper|exhale-long|grunt-effort|snarl|growl|cackle|hiss|jaw-snap|swallow|sob|snivel|wail|pant-in|cough-dry|pant-out)>/g;
  private static MOOD_REGEX = /\[[a-zA-Z0-9\-_ ]+\]/g;
  
  private estimatedSecondsPerChar: number = 0.065; 
  private timelineAccumulatorSeconds: number = 0;
  private onTrigger: FoleyCallback;

  constructor(onTrigger: FoleyCallback) {
    this.onTrigger = onTrigger;
  }

  public process(text: string): string {
    let scrubbedText = text.replace(MythosBrowserFoleyTransformer.SOMATIC_REGEX, (match) => {
      this.onTrigger({
        tag: match,
        timeOffsetSeconds: this.timelineAccumulatorSeconds
      });
      return "";
    });

    scrubbedText = scrubbedText.replace(/\s+/g, " ");
    
    const semanticCharCount = scrubbedText.replace(MythosBrowserFoleyTransformer.MOOD_REGEX, "").length;
    this.timelineAccumulatorSeconds += semanticCharCount * this.estimatedSecondsPerChar;

    return scrubbedText;
  }

  public resetTimeline(): void {
    this.timelineAccumulatorSeconds = 0;
  }
}
