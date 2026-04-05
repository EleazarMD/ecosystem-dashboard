/**
 * Audio Overlap Analyzer - Phase 2: NotebookLM-Style Natural Overlaps
 * 
 * Analyzes dialogue script for overlap opportunities and adds metadata
 * for audio mixing with FFmpeg
 */

export interface DialogueTurn {
  speaker: string;
  content: string;
  role?: string;
  isBackchannel?: boolean;
  overlapWithPrevious?: boolean;
  overlapStartSeconds?: number;
  overlapDurationSeconds?: number;
  volumeAdjustment?: number;
  fadeIn?: boolean;
  // Emotion/prosody from 5-stage pipeline for TTS guidance
  emotion?: string;      // e.g., "enthusiastic", "thoughtful", "warm"
  prosody?: string;      // e.g., "building excitement", "slower, deliberate"
}

/**
 * Analyze script and detect overlap patterns based on content markers
 * 
 * Patterns detected:
 * 1. Em-dash at start (—) = Interruption → 0.5s overlap, full volume
 * 2. Backchannel responses (Mmhmm, Right, Yeah) → 0.8s overlap, 70% volume, fade in
 * 3. Short exclamations (Oh!, Wait!, Yes!) → 0.3s overlap, 120% volume (excited)
 * 4. Very short turns (<15 chars) after long turn → Likely backchannel → 0.6s overlap
 */
export function analyzeScriptForOverlaps(dialogue: DialogueTurn[]): DialogueTurn[] {
  return dialogue.map((turn, i) => {
    if (i === 0) {
      // First turn never overlaps
      return turn;
    }

    const content = turn.content.trim();
    const contentLower = content.toLowerCase();
    const prevTurn = dialogue[i - 1];
    
    // Already marked as backchannel from script generation
    if (turn.isBackchannel) {
      return {
        ...turn,
        overlapWithPrevious: true,
        overlapDurationSeconds: 0.8,
        volumeAdjustment: 0.7,
        fadeIn: true
      };
    }

    // Pattern 1: Em-dash at start = Interruption (hard cut-in)
    if (content.startsWith('—')) {
      console.log(`🎯 Detected interruption: "${content.substring(0, 30)}..."`);
      return {
        ...turn,
        overlapWithPrevious: true,
        overlapDurationSeconds: 0.5,
        volumeAdjustment: 1.0,  // Full volume (assertive interruption)
        fadeIn: false  // Hard cut for urgency
      };
    }

    // Pattern 2: Backchannel responses (even if not explicitly marked)
    const backchannelPhrases = [
      'mmhmm', 'mm-hmm', 'uh-huh', 'right', 'yeah', 'yep',
      'okay', 'ok', 'sure', 'absolutely', 'exactly', 'precisely',
      'i see', 'oh wow', 'interesting', 'fascinating'
    ];
    
    if (backchannelPhrases.some(phrase => contentLower === phrase || contentLower === phrase + '.' || contentLower === phrase + ',')) {
      console.log(`🎯 Detected backchannel: "${content}"`);
      return {
        ...turn,
        isBackchannel: true,
        overlapWithPrevious: true,
        overlapDurationSeconds: 0.8,
        volumeAdjustment: 0.7,  // Quieter (background agreement)
        fadeIn: true
      };
    }

    // Pattern 3: Short exclamations (excited interruptions)
    const exclamations = ['oh!', 'oh?', 'wait!', 'wait?', 'yes!', 'no!', 'really?', 'wow!', 'what?', 'huh?'];
    if (content.length < 15 && exclamations.some(ex => contentLower.includes(ex))) {
      console.log(`🎯 Detected exclamation: "${content}"`);
      return {
        ...turn,
        overlapWithPrevious: true,
        overlapDurationSeconds: 0.3,
        volumeAdjustment: 1.2,  // Louder (excited interruption)
        fadeIn: false
      };
    }

    // Pattern 4: Very short turn after long turn = Likely spontaneous interjection
    if (content.length < 20 && prevTurn && prevTurn.content.length > 100) {
      console.log(`🎯 Detected short interjection: "${content}"`);
      return {
        ...turn,
        overlapWithPrevious: true,
        overlapDurationSeconds: 0.6,
        volumeAdjustment: 0.9,  // Slightly quieter
        fadeIn: true
      };
    }

    // Pattern 5: Completion phrases (finishing each other's sentences)
    const completionPhrases = ['exactly!', 'precisely!', 'that\'s right!', 'yes!', 'no!'];
    if (completionPhrases.some(phrase => contentLower.startsWith(phrase))) {
      console.log(`🎯 Detected completion: "${content}"`);
      return {
        ...turn,
        overlapWithPrevious: true,
        overlapDurationSeconds: 0.4,
        volumeAdjustment: 1.1,  // Slightly louder (agreement)
        fadeIn: false
      };
    }

    // No overlap detected - normal sequential turn
    return turn;
  });
}

/**
 * Calculate statistics about overlaps in the dialogue
 */
export function getOverlapStats(dialogue: DialogueTurn[]) {
  const overlapping = dialogue.filter(t => t.overlapWithPrevious);
  const backchannels = dialogue.filter(t => t.isBackchannel);
  const interruptions = overlapping.filter(t => !t.fadeIn);
  const blendedOverlaps = overlapping.filter(t => t.fadeIn);

  return {
    totalTurns: dialogue.length,
    overlappingTurns: overlapping.length,
    backchannelResponses: backchannels.length,
    hardInterruptions: interruptions.length,
    blendedOverlaps: blendedOverlaps.length,
    overlapPercentage: ((overlapping.length / dialogue.length) * 100).toFixed(1) + '%'
  };
}
