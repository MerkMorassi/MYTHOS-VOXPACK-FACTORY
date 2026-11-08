export interface FoleyTriggerPayload {
  tag: string;
  timeOffsetSeconds: number;
}

export type FoleyCallback = (payload: FoleyTriggerPayload) => void;

export class MythosBrowserFoleyTransformer {
  private static SOMATIC_REGEX = /<(gasp|gasp-in|gasp-out|sigh|sigh-deep|cough|throat-clear|snicker|chuckle|saliva-click|pant-shallow|gasp-choke|voice-crack)>/g;
  private static MOOD_REGEX = /\[[a-zA-Z0-9\-_ ]+\]/g;
  
  private estimatedSecondsPerChar: number = 0.065; 
  private timelineAccumulatorSeconds: number = 0;
  private onTriggerCallback: FoleyCallback;

  constructor(onTrigger: FoleyCallback) {
    this.onTriggerCallback = onTrigger;
  }

  public processChunk(chunk: string): string {
    let scrubbedChunk = chunk.replace(MythosBrowserFoleyTransformer.SOMATIC_REGEX, (match) => {
      this.onTriggerCallback({
        tag: match,
        timeOffsetSeconds: this.timelineAccumulatorSeconds
      });
      return "";
    });

    scrubbedChunk = scrubbedChunk.replace(/\s+/g, " ");
    
    const semanticCharCount = scrubbedChunk.replace(MythosBrowserFoleyTransformer.MOOD_REGEX, "").length;
    this.timelineAccumulatorSeconds += semanticCharCount * this.estimatedSecondsPerChar;

    return scrubbedChunk;
  }

  public resetTimeline(): void {
    this.timelineAccumulatorSeconds = 0;
  }
}
