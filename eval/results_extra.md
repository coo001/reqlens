
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

## One-shot chatbot baseline (2 of 3 pairs run)

Same model, temperature 0, one plain question fixed before the build (`scripts/chatbot.ts`), no schema and no code checks. Full answers: `runs/chatbot/n2_A_gap1.md`, `runs/chatbot/n2_A_complete.md`. The third pair (notice 4 + draft B) has not been run.

| Pair | Planted gap | Chatbot answer | ReqLens (`compare-v2`, shown on screen) |
|---|---|---|---|
| notice 2 + A_gap1 (problem paragraph removed) | "an explanation of the problem it addresses" | "MET" (cites the phrase "messy group chat") | Partial |
| notice 2 + A complete | none | not scored yet | 2 rows flagged (see above) |

Not counted yet (rules fixed in the plan): required items found, quotes that are not verbatim in the notice, wrong "meets". Two pairs is a very small sample.

## Organizer's own summary as the alternative (no model call)

How many required items of the answer key are stated inside the short guidance section the organizer wrote. Counted by `node eval/guidance.ts` from quote positions; an item counts if its main quote or a listed restatement falls inside the section. Three of the five notices are a single rules page with no such section.

| Notice | Organizer's summary section | Words in section / notice | Required items stated there | Missed |
|---|---|---|---|---|
| n1_gaibc_rules_and_resources | "Getting started" | 205 / 3257 | 4 of 17 | S1-01, S1-02, S1-03, S1-04, S1-05, S1-06, S1-07, S1-08, S1-09, S1-11, S1-14, S1-15, S1-16 |
| n2_first_ai_app_rules | none (the notice is one rules page) | – | – of 22 | – |
| n3_ai_for_medicine_rules | none (the notice is one rules page) | – | – of 24 | – |
| n4_burress_scholarship | none (the notice is one rules page) | – | – of 12 | – |
| n5_stossel_essay_contest | "Essay Contest at a Glance" | 203 / 576 | 10 of 17 | S4-11, S4-12, S4-13, S4-14, S4-15, S4-16, S4-17 |
