
## Repeat runs (same notice and draft, three times)

Notice 2 (first AI app rules) with the complete draft A, `extract-v1` + `compare-v2`, temperature 0. Run 1 was recorded on Nov 22; runs 2 and 3 on Nov 24 (`scripts/repeat.ts`, raw responses in `runs/repeats/`, processed results in `eval/repeats/`). Rows are matched across runs by the position of the locked quote in the notice. Regenerate with `REPLAY=1 node eval/repeat.ts`.

Items per run: 30, 22, 23. Distinct quote spans across runs: 45. In all three runs: 8. Same level and verdict in all three: 8.
Required items per run: 22, 16, 16.

| Quote (first 70 characters) | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| appropriately credited | required/partial | – | – |
| their use is disclosed | required/partial | – | – |
| explain which tools they used | required/met | – | – |
| identify their own contributions | required/met | – | – |
| Participants are encouraged to use free resources. | recommended/check | – | – |
| clear description | required/met | – | – |
| explanation of the problem it addresses | required/met | – | – |
| demonstration | required/met | – | – |
| Source code | recommended/met | – | – |
| setup instructions | recommended/met | – | – |
| Creativity and originality | scoring/check | – | – |
| Implementation and functionality | scoring/met | – | – |
| Usefulness and real-world impact | scoring/met | – | – |
| Presentation and documentation | scoring/met | – | – |
| malicious software | required/check | – | – |
| illegal content | required/check | – | – |
| stolen intellectual property | required/check | – | – |
| applications designed to harm others | required/check | – | – |
| API keys | required/met | – | – |
| passwords | required/check | – | – |
| confidential data | required/met | – | – |
| agree to follow these rules and Devpost's applicable terms and policie | required/check | – | – |
| provided they are appropriately credited and their use is disclosed. | – | required/met | required/met |
| They must explain which tools they used | – | required/met | required/met |
| identify their own contributions. | – | required/met | required/met |
| Each project must include a clear description | – | required/met | required/met |
| an explanation of the problem it addresses | – | required/met | required/met |
| a demonstration | – | required/met | required/met |
| Source code and setup instructions should be provided where applicable | – | recommended/met | recommended/met |
| Creativity and originality: 25% | – | scoring/partial | scoring/partial |
| Implementation and functionality: 30% | – | scoring/met | scoring/met |
| Usefulness and real-world impact: 25% | – | scoring/met | scoring/met |
| Presentation and documentation: 20% | – | scoring/met | scoring/met |
| Do not submit malicious software, illegal content, stolen intellectual | – | required/check | required/check |
| never publish API keys, passwords, or confidential data. | – | required/met | required/met |
| agree to follow these rules and Devpost's applicable terms and policie | – | required/check | – |
| By participating, you agree to follow these rules and Devpost's applic | – | – | required/check |

Reading: the result is **not stable** by the rule set before the build (two or more items differ). Run 1 split lists into one item per element ("malicious software", "illegal content", ...), runs 2 and 3 kept each sentence as one item, so only 8 quote spans are identical in all three. Runs 2 and 3, made two minutes apart, differ in one quote boundary and agree on every verdict. Temperature 0 did not make the extraction reproducible across days. Verdict differences on the complete draft: run 1 showed 2 Partial rows (credit, disclosure); runs 2 and 3 showed those as Met and showed "Creativity and originality" as Partial. Runs 2 and 3 have not been scored against the answer key yet, so accuracy for them is not stated here.

## One-shot chatbot baseline (3 of 3 pairs run)

Same model, temperature 0, one plain question fixed before the build (`scripts/chatbot.ts`), no schema and no code checks. Full answers: `runs/chatbot/n2_A_gap1.md`, `runs/chatbot/n2_A_complete.md`. The third pair (notice 4 + draft B, `runs/chatbot/n4_B_complete.md`) was run on Nov 25; counts for all three are in "Chatbot answers scored" below.

| Pair | Planted gap | Chatbot answer | ReqLens (`compare-v2`, shown on screen) |
|---|---|---|---|
| notice 2 + A_gap1 (problem paragraph removed) | "an explanation of the problem it addresses" | "MET" (cites the phrase "messy group chat") | Partial |
| notice 2 + A complete | none | not scored yet | 2 rows flagged (see above) |

Three pairs is a very small sample.

## Organizer's own summary as the alternative (no model call)

How many required items of the answer key are stated inside the short guidance section the organizer wrote. Counted by `node eval/guidance.ts` from quote positions; an item counts if its main quote or a listed restatement falls inside the section. Three of the five notices are a single rules page with no such section.

| Notice | Organizer's summary section | Words in section / notice | Required items stated there | Missed |
|---|---|---|---|---|
| n1_gaibc_rules_and_resources | "Getting started" | 205 / 3257 | 4 of 17 | S1-01, S1-02, S1-03, S1-04, S1-05, S1-06, S1-07, S1-08, S1-09, S1-11, S1-14, S1-15, S1-16 |
| n2_first_ai_app_rules | none (the notice is one rules page) | – | – of 22 | – |
| n3_ai_for_medicine_rules | none (the notice is one rules page) | – | – of 24 | – |
| n4_burress_scholarship | none (the notice is one rules page) | – | – of 12 | – |
| n5_stossel_essay_contest | "Essay Contest at a Glance" | 203 / 576 | 10 of 17 | S4-11, S4-12, S4-13, S4-14, S4-15, S4-16, S4-17 |

## Scored on Nov 25 (no model call, `node eval/extra_score.ts`)

### Repeat runs scored against the answer key

| Run | Items | Key items found | Required found | Items that match the key | Level agrees | Required items missed |
|---|---|---|---|---|---|---|
| Run 1 (Nov 22) | 30 | 100.0% (30/30) | 100.0% (22/22) | 93.3% (28/30) | 100.0% (28/28) | none |
| Run 2 (Nov 24) | 22 | 96.7% (29/30) | 100.0% (22/22) | 90.9% (20/22) | 100.0% (20/20) | none |
| Run 3 (Nov 24) | 23 | 96.7% (29/30) | 100.0% (22/22) | 91.3% (21/23) | 100.0% (21/21) | none |

### Chatbot answers scored (rules fixed before the build)

| Pair | Answer items | Items with no quote | Distinct quotes | Quotes not verbatim in the notice | Required key items found | "Meets" items under a quote that covers the planted gap | "Meets" on items the key says a draft cannot show |
|---|---|---|---|---|---|---|---|
| n2_A_gap1 | 20 | 0 | 10 | 10 | 100.0% (22/22) | 5 | 3 |
| n2_A_complete | 10 | 1 | 9 | 0 | 100.0% (22/22) | no gap planted | 2 |
| n4_B_complete | 14 | 0 | 16 | 0 | 100.0% (12/12) | no gap planted | 0 |

- n2_A_gap1: required key items not under any quote: none. Not verbatim: "1. Eligibility — Participation is free and open to eligible …"; "2. Team Participation — Participants may work individually o…"; "3. Originality and Attribution — Projects should demonstrate…"; "4. AI Tools — Participants may use AI tools, coding assistan…"; "5. Costs — There is no entry fee. No paid software, paid API…"; "6. Submission Requirements — Each project must include a cle…"; "7. Judging — Projects will be evaluated according to the pub…"; "8. Safety and Privacy — Do not submit malicious software, il…"; "9. Prizes and Recognition — This is a no-cash-prize hackatho…"; "10. Organizer Updates — The organizer may communicate import…".
- n2_A_complete: required key items not under any quote: none. Not verbatim: none.
- n4_B_complete: required key items not under any quote: none. Not verbatim: none.

Reading: all three repeat runs cover every required item of the answer key (22 of 22), so the instability is in how lists are split into rows, not in what is found. The chatbot also put every required item under some quote in all three answers; in the gap pair it quoted whole sections with the heading joined on, so none of its 10 quotes is verbatim in the notice, and several items share one section quote. The gap column counts every "met" item under the section quote that contains the planted gap; read by hand, the one item about that requirement (6.2) says MET. One item in `n2_A_complete` had no quote the parser could read and has not been judged by hand yet. The last column and the parser were written after the answers were seen.

### Lighter model, extraction only (2 notices, Nov 25)

`gemini-3.5-flash-lite`, `extract-v1`, one call each, both succeeded on the first try, no quote discarded by Quote Lock. `GEMINI_MODEL=gemini-3.5-flash-lite REPLAY=1 node eval/extra_score.ts lite`.

| Notice | Items | Key items found | Required found | Items that match the key | Level agrees | Required items missed |
|---|---|---|---|---|---|---|
| n2_first_ai_app_rules (gemini-3.5-flash-lite, 4 s) | 18 | 90.0% (27/30) | 95.5% (21/22) | 88.9% (16/18) | 100.0% (16/16) | S2-08 |
| n4_burress_scholarship (gemini-3.5-flash-lite, 2 s) | 13 | 87.5% (14/16) | 91.7% (11/12) | 100.0% (13/13) | 100.0% (13/13) | S5-13 |

For comparison the default model on the same notices (table above): notice 2 required 22/22 in 24 s, notice 4 required 11/12 in 13 s. On these 2 notices the lighter model was 4 to 6 times faster and found one required item fewer on notice 2 (S2-08) and the same number on notice 4. Two notices only.
