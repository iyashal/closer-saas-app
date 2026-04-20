import type { Offer } from '@closer/shared';

export function buildPostCallPrompt(transcript: string, offer: Offer, framework: string): string {
  const objectionsContext =
    offer.common_objections?.length > 0
      ? offer.common_objections.join(', ')
      : 'None pre-specified';

  return `You are an expert high-ticket sales coach reviewing a completed sales call for CloseForce.io.

OFFER DETAILS:
- Name: ${offer.name}
- Price: $${offer.price}
- Guarantee: ${offer.guarantee ?? 'None stated'}
- Description: ${offer.description ?? 'Not provided'}
- Known objections: ${objectionsContext}
- Framework: ${framework.toUpperCase()}

FULL TRANSCRIPT:
${transcript}

Analyze this call with honesty and depth. This is private coaching feedback — not a public review. Be direct. Point out what worked, what didn't, and exactly where the closer left money on the table.

Deal health score rubric:
- 90-100: Strong buying intent throughout, objections handled masterfully, clear next steps agreed
- 70-89: Good call, solid rapport, minor missed moments
- 50-69: Average performance, some objections fumbled, unclear close attempt
- 30-49: Weak call, prospect disengaged, closer lost control
- 0-29: Call should not have continued this long — major structural problems

Return ONLY valid JSON. No markdown fences. No explanation outside the JSON object.

{
  "summary": "3-5 paragraph call narrative. Cover: how the call opened, rapport built, key objections raised, how they were handled, close attempt, outcome and why.",
  "objection_log": [
    {
      "timestamp_ms": 0,
      "what_prospect_said": "direct quote or close paraphrase from transcript",
      "how_closer_handled": "what the closer said in response",
      "better_alternative": "a more effective response using the ${framework} framework — specific, not generic"
    }
  ],
  "deal_health_score": 72,
  "deal_health_reasoning": "1-2 sentences explaining the score with specific evidence from the call",
  "next_steps": ["specific action item 1", "specific action item 2", "specific action item 3"],
  "follow_up_email": "email body text — no subject line, no headers, just the message the closer will copy-paste"
}`;
}
