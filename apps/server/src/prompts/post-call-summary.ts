import type { Offer } from '@closer/shared';

export function buildPostCallPrompt(transcript: string, offer: Offer, framework: string): string {
  const objectionsContext =
    offer.common_objections?.length > 0
      ? offer.common_objections.join(', ')
      : 'None pre-specified';

  const base = `You are an expert high-ticket sales coach reviewing a completed sales call for CloseForce.io.

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

Return ONLY valid JSON. No markdown fences. No explanation outside the JSON object.`;

  if (framework === 'unicorn_closer') {
    return `${base}

{
  "summary": "3-5 paragraph call narrative. Cover: how the call opened, rapport built, key objections raised, how they were handled, close attempt, outcome and why.",
  "objection_log": [
    {
      "timestamp_ms": 0,
      "what_prospect_said": "direct quote or close paraphrase from transcript",
      "how_closer_handled": "what the closer said in response",
      "better_alternative": "a more effective Unicorn Closer response — specific, not generic"
    }
  ],
  "deal_health_score": 72,
  "deal_health_reasoning": "1-2 sentences explaining the score with specific evidence from the call. Factor in not just what happened but what was MISSED.",
  "next_steps": ["specific action item 1", "specific action item 2", "specific action item 3"],
  "follow_up_email": "email body text — no subject line, no headers, just the message the closer will copy-paste",
  "unicorn_closer_grade": {
    "presence_score": 0,
    "presence_notes": "Was the closer present and listening, asking real questions — or reciting a script? Cite specific moments.",
    "frame_control_score": 0,
    "frame_control_notes": "Did the closer lead the call, or did the prospect lead? Did they give price before establishing pain?",
    "rationalization_catches": 0,
    "rationalizations_missed": [
      {
        "timestamp_ms": 0,
        "what_prospect_said": "exact quote where prospect rationalized",
        "what_closer_should_have_said": "the specific response that would have caught and challenged the rationalization"
      }
    ],
    "talk_ratio_grade": "State closer talk percentage and whether it stayed under 30%",
    "dot_connecting_score": 0,
    "dot_connecting_notes": "Did the closer help the prospect have a realization by connecting patterns the prospect couldn't see themselves?",
    "summary_pauses_used": 0,
    "three_whys_depth": "How deep did the closer go? 1 = surface answer accepted, 5 = root cause reached. Give a specific example.",
    "leadership_energies": {
      "abundance": 0,
      "direction": 0,
      "non_attachment": 0,
      "responsibility": 0,
      "curiosity": 0
    },
    "top_three_improvements": [
      "Specific action the closer must take on the next call — not generic",
      "Second specific action",
      "Third specific action"
    ]
  }
}

Unicorn Closer grading instructions:
- Grade honestly, not generously. This is coaching.
- presence_score: 0-100. High score = the closer was genuinely curious, listening, adapting. Low score = reciting, rushing, not following emotional threads.
- frame_control_score: 0-100. High = closer led the conversation and never chased. Low = closer gave price early, got defensive, let objections derail them.
- dot_connecting_score: 0-100. High = closer reflected the prospect's own words back to them and connected patterns they couldn't see. Low = transactional Q&A with no insight.
- leadership_energies: 0-10 each. Infer from language patterns and pacing in the transcript.
  - abundance: spoke from a place of having plenty of clients, never needy
  - direction: gave clear guidance and moved the call forward with intent
  - non_attachment: not emotionally attached to the outcome — explored without pressure
  - responsibility: took ownership of the conversation, didn't let vague answers slide
  - curiosity: asked real questions to understand, not just to move through a checklist
- rationalizations_missed: quote the exact moment and what the closer should have said.
- If the closer accepted a surface-level answer, point to the three whys they should have asked.
- top_three_improvements must be specific enough that the closer can act on them immediately.`;
  }

  return `${base}

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
