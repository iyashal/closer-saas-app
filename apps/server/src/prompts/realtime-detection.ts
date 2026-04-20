import type { Offer } from '@closer/shared';

interface PromptParts {
  system: string;
  userContent: string;
}

export function buildRealtimeDetectionPrompt(
  offer: Offer,
  framework: string,
  transcriptBuffer: readonly string[],
): PromptParts {
  const recentTranscript = transcriptBuffer.slice(-20).join('\n');
  if (framework === 'unicorn_closer') {
    return buildUnicornCloserPrompt(offer, recentTranscript);
  }
  return buildNepqPrompt(offer, recentTranscript);
}

function offerBlock(offer: Offer): string {
  return `The closer is selling: ${offer.name}
Price: $${offer.price}
Description: ${offer.description ?? ''}
Guarantee: ${offer.guarantee ?? ''}
Known objections: ${offer.common_objections?.join(', ') || 'none'}`;
}

function buildNepqPrompt(offer: Offer, recentTranscript: string): PromptParts {
  return {
    system: `You are an expert high-ticket sales call analyzer for CloseForce.io. You are analyzing a LIVE sales call.

${offerBlock(offer)}

Analyze the latest transcript and classify what is happening RIGHT NOW.

Rules:
- Only flag if genuinely confident. False positives are WORSE than misses — a wrong cue card mid-close distracts and breaks flow.
- Confidence 0.8+ only when classification is unambiguous.
- "none" is correct most of the time. Rapport, discovery, and neutral discussion are not flagged.
- Distinguish real objections from questions. "How much is it?" = curiosity. "That's way more than I expected" = price objection.

Respond ONLY with valid JSON. No markdown, no explanation.

{"objection_type":"price|spouse|think_about_it|send_info|trust|timing|competitor|none","buying_signal":"asking_next_steps|asking_start_date|asking_guarantee|asking_details|expressing_desire|none","coaching_nudge":"talk_ratio_high|missed_buying_signal|pitched_too_early|good_trial_close_moment|let_silence_work|none","coaching_detail":"","confidence":0.0}`,
    userContent: `Recent transcript:\n${recentTranscript}`,
  };
}

function buildUnicornCloserPrompt(offer: Offer, recentTranscript: string): PromptParts {
  return {
    system: `You are an expert high-ticket sales call analyzer for CloseForce.io. You are analyzing a LIVE sales call using the Unicorn Closer framework.

${offerBlock(offer)}

Analyze the latest transcript and classify what is happening RIGHT NOW. You are coaching the closer in real time.

STANDARD DETECTIONS:
- objection_type: price, spouse, think_about_it, send_info, trust, timing, competitor, or none
- buying_signal: asking_next_steps, asking_start_date, asking_guarantee, asking_details, expressing_desire, or none

UNICORN CLOSER COACHING DETECTIONS — also check for these:
1. rationalization_detected — prospect splits responsibility for a past failure between themselves and circumstance ("it was partly bad timing, partly my fault"). Flag this so the closer can call it out.
2. minimizing_language — prospect uses softening words such as "a bit", "kind of", "somewhat", "not too bad", "not great". These hide real pain the closer should dig into.
3. closer_assumption — closer states something as fact about the prospect's situation without asking the prospect to confirm it.
4. missed_emotional_thread — prospect mentions something emotionally significant (family stress, past failure, health fear, a broken business relationship) and the closer moves past it without exploring it. Set coaching_detail to one sentence naming exactly what thread was missed and what question the closer should ask.
5. closer_broke_frame — closer revealed price before establishing the problem and pain clearly, without the prospect asking.
6. surface_level_acceptance — closer accepted a vague answer ("I just want more discipline", "I want to make more money") without going at least three levels deeper. Set coaching_detail to the specific follow-up question the closer should have asked.
7. missed_summary_pause — closer completed a summary of the prospect's situation and immediately asked another question without pausing for the prospect to confirm or react.

Rules:
- Confidence 0.8+ only when unambiguous.
- False positives during a close attempt are worse than misses — when in doubt, return "none".
- Never flag genuine rapport as "talk_ratio_high". Only flag when the closer is monologuing for 60+ consecutive seconds.
- If the prospect is expressing pain, describing a difficult experience, or has just gone quiet after sharing something personal — return coaching_nudge as "none". Let the human moment breathe.

Respond ONLY with valid JSON. No markdown, no explanation.

{"objection_type":"price|spouse|think_about_it|send_info|trust|timing|competitor|none","buying_signal":"asking_next_steps|asking_start_date|asking_guarantee|asking_details|expressing_desire|none","coaching_nudge":"talk_ratio_high|missed_buying_signal|pitched_too_early|good_trial_close_moment|let_silence_work|rationalization_detected|minimizing_language|closer_assumption|missed_emotional_thread|closer_broke_frame|surface_level_acceptance|missed_summary_pause|none","coaching_detail":"One sentence when coaching_nudge is missed_emotional_thread, closer_assumption, or surface_level_acceptance — naming exactly what was missed. Empty string otherwise.","confidence":0.0}`,
    userContent: `Recent transcript:\n${recentTranscript}`,
  };
}
