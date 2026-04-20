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

-- ─── Unicorn Closer Framework Cards ──────────────────────────────────────────

-- Price Objection
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'price_objection', 'Isolate the Belief', ARRAY['expensive','a lot of money','can''t afford','too much','out of my budget','price','cost'], 'I hear you — that''s a real investment. Let me ask you: if the money were sitting in your account right now, would you move forward?', 'Unicorn Closer — Isolate the Belief', 1),
(NULL, 'unicorn_closer', 'price_objection', 'Diagnose the Real Objection', ARRAY['price','money','investment','afford','budget','financing'], 'Just so I understand: is it that you genuinely don''t have access to the capital, or are you not 100% sure this will give you the return you''re looking for?', 'Unicorn Closer — Diagnose the Real Objection', 2),
(NULL, 'unicorn_closer', 'price_objection', 'Defer Price Until Value Is Established', ARRAY['how much','what does it cost','what''s the rate','what''s the fee','pricing'], 'I can absolutely walk you through pricing — but right now I don''t even know if we''re a good fit. Can I ask a few more questions first?', 'Unicorn Closer — Defer Price Until Value Is Established', 3);

-- Spouse Objection
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'spouse_objection', 'Isolate Personal Commitment', ARRAY['talk to my wife','talk to my husband','ask my partner','check with my spouse','run it by'], 'I''d highly recommend you speak with them. But let me ask — how do you feel about it personally? Are you a yes?', 'Unicorn Closer — Isolate Personal Commitment', 1),
(NULL, 'unicorn_closer', 'spouse_objection', 'Roleplay the Spouse Conversation', ARRAY['wife','husband','partner','spouse','together','discuss it with'], 'Let''s say you go to your partner right now and they say no. What happens then — do you give up on this, or do you find a way to make it happen?', 'Unicorn Closer — Roleplay the Spouse Conversation', 2),
(NULL, 'unicorn_closer', 'spouse_objection', 'Smokescreen Check', ARRAY['wife','husband','partner','spouse','need to ask'], 'Makes sense. Just to clarify — is talking to your partner the only thing between you and moving forward today?', 'Unicorn Closer — Smokescreen Check', 3);

-- Think About It
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'think_about_it', 'Break the Smokescreen', ARRAY['think about it','need time','let me think','sleep on it','not sure yet','mull it over'], 'Totally understand. Usually when someone says that, it comes down to one of three things: fit, finances, or fear. Which one is it for you?', 'Unicorn Closer — Break the Smokescreen', 1),
(NULL, 'unicorn_closer', 'think_about_it', 'Isolate the Hidden Concern', ARRAY['think','consider','review it','look it over','not ready to decide'], 'Makes sense. Just so I know — what exactly will you be thinking about that we haven''t already covered?', 'Unicorn Closer — Isolate the Hidden Concern', 2),
(NULL, 'unicorn_closer', 'think_about_it', 'Timeline and Next Step', ARRAY['think about it','more time','not ready','decide later','circle back'], 'No problem. When you say you want to think about it — are we talking 24 hours, a week, or longer? I''d like to put something on the calendar so we don''t lose momentum.', 'Unicorn Closer — Timeline and Next Step', 3);

-- Send Info
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'send_info', 'Diagnose the Real Ask', ARRAY['send me','email me','send info','send it over','brochure','PDF','information'], 'I can do that. Just so I use your time well — what specifically are you hoping the information will answer that we haven''t covered yet?', 'Unicorn Closer — Diagnose the Real Ask', 1),
(NULL, 'unicorn_closer', 'send_info', 'Gentle Call-Out', ARRAY['send','email','information','details','review it'], 'Got it. In my experience, when someone asks for information to review, it usually means one of two things: either I didn''t explain something clearly, or there''s a concern you haven''t shared. Which one is it?', 'Unicorn Closer — Gentle Call-Out', 2),
(NULL, 'unicorn_closer', 'send_info', 'Reframe the Value', ARRAY['do my research','look into it','check it out','read about it'], 'Information doesn''t solve this — action does. What''s the specific concern you want addressed before making a decision?', 'Unicorn Closer — Reframe the Value', 3);

-- Trust Objection
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'trust_objection', 'Diagnose the Wound', ARRAY['seen this before','how do I know','skeptical','been burned','sounds too good','not sure if legit'], 'Sounds like you''ve been burned before. What specifically happened, and what would need to be different this time for you to feel confident?', 'Unicorn Closer — Diagnose the Wound', 1),
(NULL, 'unicorn_closer', 'trust_objection', 'Doctor Frame', ARRAY['trust','prove it','doubt','guarantee','results','skeptical'], 'I hear you. And just like a doctor, I''m not going to beg you to take the medicine. I''ll tell you what I see. What would give you the certainty you need to move forward?', 'Unicorn Closer — Doctor Frame', 2),
(NULL, 'unicorn_closer', 'trust_objection', 'Proof Reframe', ARRAY['evidence','show me','testimonials','case studies','proof','show me results'], 'Fair enough. What kind of evidence would actually move you — testimonials, a guarantee, or something specific to your situation?', 'Unicorn Closer — Proof Reframe', 3);

-- Timing Objection
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'timing_objection', 'The Consequence Question', ARRAY['bad timing','not the right time','busy','wait until','after the holidays','next quarter','later'], 'Makes sense. Let me ask — what happens if you do nothing and your situation stays exactly the same for another 6 months?', 'Unicorn Closer — The Consequence Question', 1),
(NULL, 'unicorn_closer', 'timing_objection', 'Why Now', ARRAY['timing','not now','later','wait','next year','once things settle'], 'If not now, when? And what specifically will be different then that isn''t true today?', 'Unicorn Closer — Why Now', 2),
(NULL, 'unicorn_closer', 'timing_objection', 'Cost of Waiting', ARRAY['delay','not urgent','can wait','no rush','some other time','put it off'], 'Every month you wait has a cost. What''s the real reason you''d rather delay?', 'Unicorn Closer — Cost of Waiting', 3);

-- Competitor Objection
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'competitor_objection', 'Diagnose Fit', ARRAY['other options','looking at others','competitor','someone else','comparing','shop around','cheaper'], 'That''s a solid option. Just so I''m not wasting your time — what specifically do they offer that has you considering them over what we''ve just talked about?', 'Unicorn Closer — Diagnose Fit', 1),
(NULL, 'unicorn_closer', 'competitor_objection', 'Isolate the Real Reason', ARRAY['other program','other coach','other company','alternative'], 'Got it. If their solution were off the table right now, would you move forward with us?', 'Unicorn Closer — Isolate the Real Reason', 2),
(NULL, 'unicorn_closer', 'competitor_objection', 'Compare on Outcome', ARRAY['versus','comparing','different option','better deal','weighing my options'], 'Fair. Here''s my question: six months from now, which path gets you to your goal faster?', 'Unicorn Closer — Compare on Outcome', 3);

-- Buying Signal — Next Steps
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'buying_signal_next_steps', 'Micro-Commit', ARRAY['what happens next','how does it work','when do we start','what''s the process','onboarding','next steps'], 'Great question. Before I walk you through next steps, can I confirm — if the next steps make sense, are you ready to move forward today?', 'Unicorn Closer — Micro-Commit', 1),
(NULL, 'unicorn_closer', 'buying_signal_next_steps', 'Tie Down', ARRAY['how do I sign up','what do I need to do','ready to start','want to begin'], 'I like that you''re thinking about implementation. That tells me you''re serious. Are you?', 'Unicorn Closer — Tie Down', 2),
(NULL, 'unicorn_closer', 'buying_signal_next_steps', 'Close the Loop', ARRAY['sounds good','let''s do it','I''m in','ready','move forward','let''s go'], 'Let''s get you set up. I''ll grab your details — one moment.', 'Unicorn Closer — Close the Loop', 3);

-- Buying Signal — Desire
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'buying_signal_desire', 'Confirm the Emotion', ARRAY['I love that','that sounds amazing','exactly what I need','that''s exactly it','perfect','this is great'], 'It sounds like you can actually see yourself in this. Is that accurate?', 'Unicorn Closer — Confirm the Emotion', 1),
(NULL, 'unicorn_closer', 'buying_signal_desire', 'Future Pacing', ARRAY['I want that','that would change everything','I need this','that would help so much','this is what I''ve been looking for'], 'If you had this solved today, what''s the first thing that changes in your life?', 'Unicorn Closer — Future Pacing', 2),
(NULL, 'unicorn_closer', 'buying_signal_desire', 'Direct Ask', ARRAY['interested','this is good','makes sense','I like this','this feels right'], 'You sound ready. Are you?', 'Unicorn Closer — Direct Ask', 3);

-- Coaching — Talk Ratio
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'coaching_talk_ratio', 'Ask and Go Silent', ARRAY[]::text[], 'You''re at 65% talk ratio. Let them speak. Ask a question and go silent.', 'Unicorn Closer — Talk Ratio', 1),
(NULL, 'unicorn_closer', 'coaching_talk_ratio', 'Let the Silence Work', ARRAY[]::text[], 'You''ve been talking for 90 seconds. Pause. Let the silence work.', 'Unicorn Closer — Talk Ratio', 2),
(NULL, 'unicorn_closer', 'coaching_talk_ratio', 'Shift to Curiosity', ARRAY[]::text[], 'Shift to curiosity. Your next move: a single question, then mute your mic.', 'Unicorn Closer — Talk Ratio', 3);

-- Coaching — Trial Close
INSERT INTO framework_cards (org_id, framework, category, title, trigger_keywords, suggested_response, framework_reference, sort_order) VALUES
(NULL, 'unicorn_closer', 'coaching_trial_close', 'Buying Signal Detected', ARRAY[]::text[], 'They just gave a buying signal. Trial close now: "Does that make sense so far?"', 'Unicorn Closer — Trial Close', 1),
(NULL, 'unicorn_closer', 'coaching_trial_close', 'Test the Water', ARRAY[]::text[], 'They''re leaning in. Test the water: "If we could solve this, would you want to move forward?"', 'Unicorn Closer — Trial Close', 2),
(NULL, 'unicorn_closer', 'coaching_trial_close', 'Tie Down', ARRAY[]::text[], 'Good moment. Tie down: "Is that something that would work for you?"', 'Unicorn Closer — Trial Close', 3);
