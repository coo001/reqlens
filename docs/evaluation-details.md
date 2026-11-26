# Evaluation details

This file holds the experiments and development notes that were cut from the Devpost description to keep it short. The generated numbers are in [`eval/results.md`](../eval/results.md); the day-by-day record is in [`build-log.md`](build-log.md). Nothing here was produced by a new model call: it is the longer version of what the description summarises.

Read every number with these limits in mind: 5 notices, 10 drafts, one run per input at temperature 0, an answer key that no human verified, and prompts adjusted on 8 of the 10 drafts.

## 1. Material about the need

We did not interview or observe users. The description therefore reports only the size of the task, from public material.

- **Length of the rules.** This challenge's rules and resources pages are 3,257 words. The "Getting started" section is 205 words and states 4 of the 17 required items in our answer key (`eval/guidance.ts`, no model call). For an essay contest in the test set, the "at a Glance" section (203 of 576 words) states 10 of 17. The other 3 notices are a single rules page with no summary section.
- **Gallery tally.** [`gallery_tally.tsv`](gallery_tally.tsv) lists the 104 project pages in the public gallery of this organizer's previous hackathon, fetched before the build period. A script looked for an embedded video and a code link on each page: no video on 18 pages, no code link on 34. Nobody checked the pages by hand, and nobody compared them with that event's rules, so this is not a count of rule violations. It shows only what was not visible on the page.

## 2. Comparison with a one-shot chatbot (exploratory)

Same Gemini model, temperature 0, one plain question fixed before the build (`scripts/chatbot.ts`), no schema and no code checks. Three notice and draft pairs. Full answers are in `runs/chatbot/`.

| Pair | Required key items found | Quotes not word for word in the notice | Verdict on the planted gap | "Meets" on items a draft cannot show |
|---|---|---|---|---|
| notice 2 + draft with the problem paragraph removed | 22 of 22 | 10 of 10 | "MET" (ReqLens: Partial) | 3 |
| notice 2 + complete draft | 22 of 22 | 0 of 9 | no gap planted | 2 |
| notice 4 + complete essay | 12 of 12 | 0 of 16 | no gap planted | 0 |

- In the first pair the chatbot put a section title in front of each quote, which is why none of the 10 is word for word in the notice.
- The last column was added after we had read the answers. It is an observation, not a pre-registered measure.
- ReqLens listed 22 of 22 required items on notice 2 and 11 of 12 on notice 4, so it did not find more requirements than the chatbot.
- Time saved was not measured.

## 3. Model choice

| Extraction on 2 notices | Required items found | Time |
|---|---|---|
| `gemini-3.5-flash` (default) | 22 of 22, 11 of 12 | 24 s, 13 s |
| `gemini-3.5-flash-lite` | 21 of 22, 11 of 12 | 4 s, 2 s |

A marker-word rule in code ("must", "required", "should") found 55.4% of required items (51/92) at 51.2% precision. Two notices cannot settle the choice between the two models.

## 4. Prompt history

| Prompt | What changed | Planted gaps shown (of 6) | Note |
|---|---|---|---|
| compare-v1 | first version | 1 | a passing mention was accepted as Met |
| compare-v2 (default) | the cited sentence must itself satisfy the requirement | 4 | by the model alone, before the code steps: 3 (v1: 0) |
| compare-v3 | one quote per part of a requirement | 3 | 1 of 2 on gap drafts it was never tuned on; one call took 97 s and one hit the 100 s timeout |
| extract-v2 | evaluation only | – | all-item recall on this challenge's rules 42.3% to 90.4%, but one more required item missed |

compare-v2 was written after seeing 4 of the 6 planted gaps. On the 2 it had not seen it showed 0 of 2.

Two different denominators appear in the description:
- **1 of 112**: of the 112 items the model extracted over 5 notices, 1 had a quote that is not in the notice. Quote Lock discarded it.
- **108 of 111**: of the 111 items left after that, 108 match an item in the answer key.

## 5. Checks on AI-written code and prompts

All code, prompts and tests were written by an AI coding agent. **No human reviewed the code.** The checks below were run by scripts or by the same AI against values fixed in advance. They are automated checks, not human review.

| AI output | Automated check | Found | Decision |
|---|---|---|---|
| Word-counting code | Counts printed by a separate script for 8 drafts (410 … 537) | All equal | Kept |
| Scorer | The answer key scored against itself, and an empty output | 100% and 0 | Kept |
| Comparison prompt v1 | 6 planted gaps | 1 of 6 | Revised (v2) |
| Comparison prompt v3 | The same 6 and 2 held-out drafts | 3 of 6, slower | Rejected as default |
| Extraction prompt v2 | Answer key, 2 notices | Higher all-item recall, one more required item missed | Rejected as default |
| Day-1 call log | Re-reading the shell command | A quoting mistake had sent a broken URL | Log lines removed, the claim about that model withdrawn |
| "Check yourself" step for prohibitions and judging criteria | Complete drafts and the 6 planted gaps | 2 wrong flags removed, no gap result changed | Kept |

The answer key was written independently by two AI models from different companies (Claude and GPT) and reconciled by quote overlap. For this challenge's own rules a separate AI agent audited the list against the source and corrected 2 items; that auditor is the same model family as one of the two authors.

## 6. Build record

- New project. The first commit is from Nov 21, 20:18 KST, after the build period opened.
- Prepared before the build period, no code: text snapshots of 5 public notices, the answer key of 145 requirements (92 required), 8 made-up drafts (2 complete, 6 with one planted gap). Two more gap drafts were added on Nov 22.
- 20 unit tests (`npm test`).

## 7. Live calls and timing

- Nov 22 to 25: live calls with the default prompts that returned requirements took 12 to 76 s each. On the deployed site one comparison took 75.9 s and finished.
- Nov 26, while recording the video: seven live calls, one answered (76 s), the others ended in 503 or the 100 s timeout. The first cut of the video therefore replayed saved responses in every app scene.
- Nov 27, recording the live scene now in the video: one short test call answered in 51 s. The recorded run then made five calls: the first extraction timed out at 100 s, the automatic retry answered in 94 s, the comparison in 49 s; in the re-check the comparison timed out once and the retry answered in 88 s. The checks took 246 s and 191 s on screen. That run was not saved to `runs/` and is not part of `eval/results.md`.
- Row counts vary: the same short notice gave 30, 22 and 23 rows on different days (all three contain the 22 required items); this challenge's rules gave 30 rows in one run and 54 in another. The same pair checked twice within four minutes gave 2 and then 1 Missing row.
- In the live re-check shown in the video (27 rows), 7 verdicts changed: the AI-details row went from Partial to Met after the added paragraph, 2 rows went from Met to Partial and 4 scoring-criterion rows from Check yourself to Partial. In the replayed version of the same scene used in the first cut, 5 changed: 2 improved and 3 rows the edit did not address went from Met to Partial or Check yourself.

## 8. Model name

The app is set to `gemini-3.5-flash` (`lib/gemini.ts`). The API reports the version that answered as `gemini-3.6-flash`; that reported version is saved with every run and is what `eval/results.md` prints.
