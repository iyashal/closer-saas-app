import type { Offer } from '@closer/shared';

export function buildFollowUpPrompt(
  transcript: string,
  prospectName: string,
  offer: Offer,
  outcome: string,
): string {
  const toneGuide: Record<string, string> = {
    closed:
      "They just bought. This is a warm welcome/onboarding message. Acknowledge the decision, express genuine excitement, and set clear expectations for what happens next. No selling — they already bought.",
    follow_up:
      "They didn't buy today but expressed interest or said they'd think about it. Gentle, friendly nudge. Reference a specific concern they raised. Give them a clear, low-pressure next step.",
    lost: "They said no or went cold. This is a gracious, zero-pressure door-open. No chasing. Leave a positive impression. If there's a natural opening, suggest reconnecting in the future — but do not ask for a decision.",
  };
  const tone = toneGuide[outcome] ?? 'conversational and warm, one clear CTA';

  return `Write a follow-up email from a closer to their prospect after a sales call.

CONTEXT:
- Prospect: ${prospectName}
- Offer: ${offer.name} ($${offer.price})
- Call outcome: ${outcome}
- Tone/intent: ${tone}

CALL TRANSCRIPT (reference specific details from this — at least 1 personal detail):
${transcript}

RULES:
- Sound like a real person, not a template
- Reference at least one specific thing from the conversation (a problem they mentioned, a goal, something personal)
- One clear CTA only
- 3-4 short paragraphs maximum
- No subject line
- Start directly with the content or a very natural opener — do not start with "Hi ${prospectName},"
- NEVER use: "touching base", "circling back", "as per our conversation", "I hope this email finds you well"

Return ONLY the email body text. No JSON. No subject line. No headers. Just the email the closer will copy and send.`;
}
