-- Framework cards seed (system defaults — org_id IS NULL)

-- Price Objection
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'price_objection', 'Isolate the Real Concern', ARRAY['expensive','a lot of money','can''t afford','too much','out of my budget','price','cost'], 'I totally hear you. And just so I understand — is it that you don''t see the value in what we''d be doing together, or is it more about finding the right way to make the investment work for you right now?', 'NEPQ — Consequence Question', 1),
(NULL, 'nepq', 'price_objection', 'Paint the Cost of Inaction', ARRAY['too expensive','not sure','need to think about price'], 'Totally fair. Let me ask — what''s the cost to you of staying exactly where you are for the next 12 months? Not just financially — what does it cost you in time, stress, and missed opportunity?', 'NEPQ — Problem Awareness', 2),
(NULL, 'nepq', 'price_objection', 'Reframe Price as Investment', ARRAY['price','cost','money','budget','afford'], 'I hear you. A lot of my best clients said the same thing before we worked together. What ended up being true for them is that it wasn''t a cost — it was the highest-ROI investment they made that year. What would that look like for you?', 'NEPQ — Solution Awareness', 3);

-- Spouse Objection
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'spouse_objection', 'Bring Spouse Into the Conversation', ARRAY['talk to my wife','talk to my husband','ask my partner','check with my spouse','run it by'], 'Of course — that makes total sense, you''re a team. Quick question: if your partner is fully on board, is this something you personally feel is the right move?', 'NEPQ — Isolate the Real Objection', 1),
(NULL, 'nepq', 'spouse_objection', 'Find the Real Blocker', ARRAY['wife','husband','partner','spouse'], 'I respect that. Just so I understand — are they going to have concerns I should know about so I can make sure we address them? Or is it more about keeping them in the loop?', 'NEPQ — Clarifying Question', 2),
(NULL, 'nepq', 'spouse_objection', 'Schedule a Joint Call', ARRAY['wife','husband','partner','spouse','together'], 'That''s completely fair. What if we scheduled a quick 20-minute call and had them on too? That way we can answer any questions they have in real time. Would that work?', 'NEPQ — Next Steps', 3);

-- Think About It
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'think_about_it', 'Uncover the Real Concern', ARRAY['think about it','need time','let me think','sleep on it','not sure yet'], 'Totally — and I appreciate you not wanting to rush. Can I ask: is it that you need more information from me, or is it something specific you''re weighing that we haven''t fully addressed?', 'NEPQ — Root Cause Question', 1),
(NULL, 'nepq', 'think_about_it', 'Create Consequence Awareness', ARRAY['think about it','more time','not ready'], 'That makes sense. Just curious — if you don''t move forward, what changes? Like, what does your situation look like in 90 days if nothing changes?', 'NEPQ — Future Pace', 2),
(NULL, 'nepq', 'think_about_it', 'Prospect-Qualified Urgency', ARRAY['think','time','decide'], 'I respect that. You mentioned earlier that [pain point] was really affecting you. How much longer is that something you''re okay sitting with while you think?', 'NEPQ — Pain Amplification', 3);

-- Send Info
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'send_info', 'Redirect from Info to Decision', ARRAY['send me','email me','send info','send it over','brochure','PDF'], 'I could do that. But honestly, most people who ask that aren''t usually the ones who move forward — because the info never answers the real question they have. What would you specifically need to see to know this is right for you?', 'NEPQ — Objection Behind the Objection', 1),
(NULL, 'nepq', 'send_info', 'Qualify What They Need', ARRAY['send','email','information','details'], 'Happy to send something. Help me understand — what would you be looking for in that information? What question would it need to answer for you to feel confident moving forward?', 'NEPQ — Clarification', 2);

-- Trust Objection
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'trust_objection', 'Address the Trust Gap Directly', ARRAY['seen this before','how do I know','scam','heard that before','not sure if legit','results'], 'I appreciate you being straight with me. That skepticism is healthy — you''ve probably been burned before. What would I need to show you today for you to feel confident this is different?', 'NEPQ — Trust Building', 1),
(NULL, 'nepq', 'trust_objection', 'Use Social Proof Specifically', ARRAY['prove it','show me','evidence','guarantee','skeptical'], 'Fair enough. Let me share something specific — [client name] came in with almost identical doubts. Here''s exactly what happened for them: [result]. Does that resonate with where you are?', 'NEPQ — Story Bridge', 2);

-- Timing Objection
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'timing_objection', 'Challenge the Timing Logic', ARRAY['bad timing','not the right time','busy','wait until','after the holidays','next quarter'], 'I hear that. Can I ask — when IS a good time? Because most people I talk to who say that end up saying the same thing six months later. What''s going to be different then?', 'NEPQ — Pattern Interrupt', 1),
(NULL, 'nepq', 'timing_objection', 'Connect Timing to Pain', ARRAY['timing','not now','later','wait'], 'That makes sense. You mentioned [problem] is costing you [consequence]. If we push 90 days, what does that cost you? Is the timing objection worth that?', 'NEPQ — Cost of Delay', 2);

-- Competitor Objection
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'competitor_objection', 'Uncover What They''re Comparing', ARRAY['other options','looking at others','competitor','someone else','comparing','shop around'], 'Smart — you should absolutely look at everything. What''s your criteria? Like, what does the right solution need to do for you that the alternatives would have to nail?', 'NEPQ — Criteria Question', 1),
(NULL, 'nepq', 'competitor_objection', 'Highlight Your Differentiation', ARRAY['cheaper','someone else cheaper','other programs','other coaches'], 'Totally fair to compare. The difference you''ll find is [specific differentiator]. Most people who''ve looked at both tell me that mattered most to them because [reason]. Does that factor into what you''re weighing?', 'NEPQ — Differentiation', 2);

-- Buying Signal — Next Steps
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'buying_signal_next_steps', 'Anchor the Next Step', ARRAY['what happens next','how does it work','when do we start','what''s the process','onboarding'], 'Great question. Here''s exactly how it works: [explain onboarding]. The first thing we''d do together is [step 1]. Does that sound like the kind of support you''re looking for?', 'NEPQ — Trial Close', 1),
(NULL, 'nepq', 'buying_signal_next_steps', 'Assume the Sale', ARRAY['next steps','get started','sign up','enroll'], 'To get you started, I''d just need [payment/agreement details]. We can have you set up by [date]. Does that timeline work for you?', 'Straight Line — Assumptive Close', 2);

-- Buying Signal — Desire
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'buying_signal_desire', 'Mirror the Desire and Trial Close', ARRAY['that sounds good','I like that','that''s what I need','exactly what I''m looking for','love that'], 'It sounds like this really resonates with you. On a scale of 1-10, how confident do you feel that this is the right move for you?', 'NEPQ — Temperature Check', 1),
(NULL, 'nepq', 'buying_signal_desire', 'Invite Commitment', ARRAY['interested','want to do it','sounds good','ready'], 'I''m glad this feels right. What would it take for us to move forward today?', 'Straight Line — Permission Close', 2);

-- Coaching — Talk Ratio
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'coaching_talk_ratio', 'Ask a Deep Question and Shut Up', ARRAY[]::text[], 'Ask: "What''s been the biggest impact of [problem] on you personally?" — then stop talking. Let them fill the silence.', 'NEPQ — Problem Awareness Question', 1),
(NULL, 'nepq', 'coaching_talk_ratio', 'Prospect-Centered Redirect', ARRAY[]::text[], 'You''ve been doing the talking. Flip it: "Tell me more about where you''re at with this right now." Then stay quiet until they fully answer.', 'NEPQ — Active Listening', 2);

-- Coaching — Trial Close
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'nepq', 'coaching_trial_close', 'Temperature Check', ARRAY[]::text[], '"Based on everything we''ve talked about, on a scale of 1-10, how does this feel for you right now?" — pause for their number, then ask "What would make it a 10?"', 'NEPQ — Temperature Check', 1),
(NULL, 'nepq', 'coaching_trial_close', 'Soft Trial Close', ARRAY[]::text[], '"If the numbers worked for you, is there anything else that would stop you from moving forward today?"', 'NEPQ — Trial Close', 2);
