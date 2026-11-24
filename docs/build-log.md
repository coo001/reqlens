# Build log

Short notes written while building: what was checked, by whom, and what changed. Times are KST.

## 2026-11-21 (day 1)

| Time | What | Checked by | Result |
|---|---|---|---|
| 20:18 | First commit. Repository started empty after the build period opened at 17:00 | — | — |
| 20:20 | Quote Lock unit tests (6): verbatim match, whitespace and curly-quote tolerance, one changed letter, stitched text, too-short quote | code | all pass |
| 20:16 | Model list from the API (metadata request, not a generation call): `gemini-flash-latest`, `gemini-flash-lite-latest`, `gemini-3.8-flash`, `gemini-3.5-flash` and others are listed for this key; `gemini-2.5-flash` is listed too | AI (Claude) | — |
| 20:22–20:35 | First live extraction calls on the sample notice | AI (Claude) | all failed, see below |

### First live calls: every model overloaded

| # | Model | Request | Outcome |
|---|---|---|---|
| 1 | gemini-flash-latest | extraction with JSON schema | no answer within 60 s |
| 2 | gemini-flash-latest | same, timeout raised to 240 s to measure | no answer within 240 s |
| 3 | gemini-flash-latest | minimal "reply OK" | HTTP 503 UNAVAILABLE, "currently experiencing high demand" |
| 4 | gemini-3.8-flash | minimal | no answer within 45 s |
| 5 | gemini-3.5-flash | minimal | HTTP 503 UNAVAILABLE |
| 6 | gemini-2.5-flash | minimal | HTTP 404, "no longer available to new users" (still listed by the API) |
| 7 | gemini-flash-latest | extraction with JSON schema | no answer within 60 s |
| 8 | gemini-flash-lite-latest | extraction with JSON schema | HTTP 503 UNAVAILABLE |
| 9 | gemini-flash-latest | extraction with JSON schema | no answer within 60 s |
| 10 | gemini-flash-latest | extraction with JSON schema | HTTP 503 UNAVAILABLE |

What changed because of this:
- 503 now has its own error code and message ("overloaded") instead of a generic model error.
- The timeout became a setting (`GEMINI_TIMEOUT_MS`), default 60 s.
- Three probe lines with a malformed URL (a shell quoting mistake, they never reached a model) were removed from the call log; the ten real attempts are kept.
- Failed calls count against the daily cap of 13.

Stopped at 10 of 13 calls for the day. No live response was obtained on day 1, so `runs/` holds only the call log
and **"Try a sample" has nothing to replay yet**. To record it once the model answers:

```bash
npm run dev
node scripts/check.mjs samples/notice_first_ai_app_rules.txt samples/draft_rotamate_gap.txt   # 2 calls
```

### Screen check without a model

The results screen was checked with a hand-written fixture kept outside the repository (`RUNS_DIR` pointed at a
temp folder, `REPLAY=1`). It included one quote that is not in the notice and one evidence quote that is not in the
draft; both were discarded and counted, and the second row moved to "Check yourself". Screenshots at 1440 px and
500 px were read by the AI that wrote the code (Claude). The fixture is not a model result and is not committed.

## 2026-11-22 (day 2)

| Time | What | Checked by | Result |
|---|---|---|---|
| 10:03 | Live extraction on `gemini-flash-latest` again | AI (Claude) | no answer within 60 s (call 1 of 13) |
| 10:04 | Minimal "reply OK" on `gemini-3.5-flash-lite` | AI (Claude) | HTTP 200 in 0.7 s (call 2). The key works; the problem is the `-latest` alias |
| 10:04–10:05 | Sample pair on `gemini-3.5-flash` (extraction + comparison) | AI (Claude) | both HTTP 200, 24 s and 44 s. The API reports `modelVersion: gemini-3.6-flash`. Default model changed to `gemini-3.5-flash` |
| 10:06 | Sample replay: `scripts/check.mjs … sample` twice and `/?sample=1` in headless Chrome at 1440 px | code + AI (Claude) reading the screenshot | same 30 rows, screen says "Recorded sample", call log did not grow (0 API calls) |
| 10:06–10:09 | Extraction of the other four evaluation notices | AI (Claude) | 4 × HTTP 200, 13–32 s (calls 5–8) |
| 10:09–10:13 | Comparison of five more evaluation drafts, extraction replayed from `runs/` | AI (Claude) | 5 × HTTP 200, 17–44 s (calls 9–13). Daily cap reached, stopped |
| 10:10 | Counted: word limits parsed from the notice quote, words counted by code. Unit tests compare the count with the numbers `eval/make_gaps.py` printed for all 8 drafts | code | pass (410, 325, 318, 367, 420, 324, 327, 537) |
| 10:12 | Scorer self-check: scoring the answer key against itself gives 100 % / 100 %, an empty output gives 0 | code | pass |

A shell mistake repeated from day 1: in zsh `$M:generateContent` is read as a variable modifier and the URL breaks
(HTTP 404 with an empty body in 0.2 s). That request never reached a model, so its line was removed from the call log.
Day 1's "gemini-2.5-flash 404" may have the same cause and should not be quoted as a fact about that model.

### What the first real results show (prompts `extract-v1`, `compare-v1`; full tables in `eval/results.md`)

| Finding | Number | What we do about it |
|---|---|---|
| Extraction finds most required items | required recall 87.0 % (80/92), precision 97.3 % (108/111) over 5 notices; marker-word baseline 55.4 % / 51.2 % | keep |
| Quote Lock had little to remove | 1 of 112 extracted items had a quote that is not in the notice | reported as is: the guarantee matters more than the count |
| The rubric of the hard notice was skipped | n1: 0 of 25 scoring items extracted, 15 of 17 required found | extraction prompt to be revised once; the rerun is recorded as a new prompt version |
| Essay topic instructions were skipped | n5: 10 of 17 required found (the seven misses are the topic prompts) | same |
| **The comparison is too lenient** | 0 of 3 removed-paragraph gaps flagged: a passing mention elsewhere in the draft ("the Gemini API for the two AI calls", the title line) was accepted as Met | comparison prompt to be revised once: Met only when the quoted evidence itself satisfies the requirement, otherwise Partial. The four gap drafts seen so far are development cases from now on; the two not yet run (`B_gap1`, `B_gap2`) are run on `compare-v1` first and stay unseen until the new prompt is fixed |
| The model does not settle word limits | over-length draft (537 words, limit 500): model answered "cannot tell"; code shows "Not met" with the count | Counted stays |
| One wrong flag on a complete draft | `B_complete`: "Submit your contact information" shown as Missing, though it belongs in the application form, not the essay | extraction marked it checkable from text; to be looked at with the prompt revision |

The recorded sample ("Try a sample") is the `A_gap2` pair, so it currently shows 0 missing although one required
part was removed. It is left as recorded until the prompt revision is run.

Who checked: the code was written and the results were read by an AI (Claude). No human review so far.

### Evening: `compare-v2` (10 live calls, 0 failures; quota had reset at 17:00 KST)

`compare-v2` was committed (de9f544) before the two unseen gap drafts were run. Then `B_gap1` and `B_gap2` ran
on `compare-v1` (2 calls), then all 8 drafts on `compare-v2` with the extraction replayed (8 calls). The runs
went through `scripts/compare.ts`, which calls the pipeline directly instead of the dev server.

| | `compare-v1` | `compare-v2` |
|---|---|---|
| Planted gaps flagged (shown, after code steps) | 1 of 6 | 4 of 6 |
| ... by the model alone | 0 of 6 | 3 of 6 |
| The two drafts not seen while writing v2 (`B_gap1`, `B_gap2`) | 0 of 2 | 0 of 2 |
| Rows flagged on the two complete drafts | 1 | 6, then 5 after the conduct-rule step below |
| Comparison call time | 17–68 s | 34–57 s |

What this says, plainly: v2 fixed the three gaps it was written against and did not fix the two it was not.
Its stricter rule also costs wrong flags. Two kinds were seen:

- **Prohibitions read as missing.** `A_complete`: "Do not publish passwords" was shown as Missing because the
  draft never mentions passwords. Silence is not a breach, so the code now shows a conduct rule that the model
  calls missing as "Check yourself" with its own reason (`rule_not_mentioned`). This is a code step, applied the
  same way to every saved run; it removed 1 wrong flag and changed no gap result.
- **Requirements answered in two places.** `A_complete` credits libraries in one paragraph and the AI coding
  assistant in the next; `B_complete` describes the challenge and its effect on the future in separate
  paragraphs. v2 asks for one cited span that satisfies the whole requirement, so both became Partial. The same
  one-span rule is likely why `B_gap1`/`B_gap2` still pass: one paragraph that touches the requirement is
  enough. Next: let the model cite one span per part of the requirement and show Met only when every part
  has a locked span. That would be `compare-v3`, and all 8 drafts are now development cases, so its result
  can only be reported as "tuned on these drafts".

The recorded sample (`A_gap2`) now shows the removed part as Partial and is kept. Screens:
`docs/screens/sample_gap_1440.png` and `docs/screens/sample_wordlimit_390.png` (the 390 px view was taken
inside a 390 px frame because headless Chrome will not open a window that narrow).

Who checked: the code was written and the results were read by an AI (Claude). No human review so far.

### Day 2, late evening: held-out drafts and `compare-v3` (code only, 0 calls)

- **Two held-out gap drafts first.** `A_hold1_ai_tools` (the "AI tools we used while building" paragraph
  removed; key items S2-09, S2-10) and `B_hold1_grandparent` (the grandparent paragraph removed; S5-08,
  recommended) were built with `eval/make_gaps.py` and committed (aefc8cb) before any v3 prompt text existed.
  They are scored only with v3 and later, and `eval/results.md` reports them on their own line.
- **`compare-v3`.** The model now lists the parts of each requirement and gives one draft quote per part
  (quotes may come from different paragraphs). Code locks every quote and decides: every part locked → the
  model's verdict; some → Partial; none and the model quoted nothing → Missing (conduct rules → Check
  yourself); none because its quotes were not in the draft → Check yourself. The screen shows each part with
  its quote, or "No quote in your draft". Logic: `lib/parts.ts`, tests: `lib/parts.test.ts`.
- **Default stays `compare-v2`** until v3 has saved runs, because "Try a sample" replays under the default
  version. `COMPARE_VERSION=compare-v3` switches the app; `scripts/compare.ts` takes the version as an argument.
- Checked: `npm test` (20), typecheck, build. The parts screen was checked on a v3-shaped copy of the saved
  sample response in a temporary runs folder (not committed): a row the model called Met with one unquoted
  part shows as Partial.
- Planned run (after the daily limit resets): 8 tuning drafts + 2 held-out = 10 calls.

### Day 3 (Nov 23): `compare-v3` live runs (10 calls, 9 answers, 1 timeout)

Ran `compare-v3` on the eight tuning drafts, then on the two held-out drafts, with no prompt change in
between. `node eval/score.ts` scores v1, v2 and v3 side by side (`eval/results.md`).

| | compare-v1 | compare-v2 | compare-v3 |
|---|---|---|---|
| Planted gaps detected, tuning drafts (shown) | 1 of 6 | 4 of 6 | 3 of 6 |
| Same, model alone | 0 of 6 | 3 of 6 | 2 of 6 |
| Held-out drafts | not run | not run | 1 of 2 |
| `A_complete`: rows flagged with nothing removed | 0 | 3 | 4 |
| `B_complete`: rows flagged with nothing removed | 1 | 2 | no answer (timeout at 100 s) |
| Draft quotes thrown away by Quote Lock | 0 | 0 | 0 |
| Call time | 17 to 68 s | 34 to 57 s | 26 to 97 s, one over 100 s |

- **v3 is not better than v2, so the app default stays `compare-v2`.** v3 found the two single-paragraph
  gaps as Missing (v2 said Partial) but lost `A_gap3_credits`, and still passes `B_gap1` and `B_gap2`.
- **Why the misses happen (read from the saved quotes).** In every missed case the model quoted a real
  sentence that is still in the draft and touches the requirement: after the credits paragraph is removed,
  another paragraph still says "we used an AI coding assistant to draft the first version of the JSON
  checking code"; after the AI-tools paragraph is removed, "RotaMate sends the pasted chat to the Gemini
  API" is still there; after the "shaped your future" part is removed, "I now know I can handle what comes
  after" remains. The planted-gap key counts these as gaps because the paragraph written for the
  requirement is gone. We do not change the key after seeing results; the write-up reports the count as is
  and shows these quotes, since the tool's claim is "here is the sentence I relied on, judge it yourself".
- **What per-part quoting did do:** the two-paragraph false Partial from v2 (credits + AI tools in
  `A_complete`) is gone. The four rows v3 flags in `A_complete` are judging criteria ("Demonstrate
  creativity and originality" and three more) that the model marks Missing because no sentence states them.
- **Held-out:** `B_hold1_grandparent` detected (Missing, recommended item); `A_hold1_ai_tools` not detected.
- **Speed:** v3 output is longer. One call took 97 s and one hit the 100 s timeout, which is too close to
  the 120 s route limit for a public demo. Another reason to stay on v2.
- `B_complete` under v3 was not retried: the run was capped at 10 calls.

Who checked: the runs were made and read by an AI (Claude). No human review so far.

### Day 4 (Nov 24, morning): `extract-v2` written, 5 calls, 0 answers

- `extract-v2` (lib/prompts.ts) adds two paragraphs to v1: every rubric line is an item with level "scoring", and each instruction inside an essay topic is an item. It was written after seeing what v1 missed on notices 1 and 5, so any result on those two notices is a tuned result.
- Decision: `extract-v2` is evaluation only. The app default stays `extract-v1`, because every saved comparison is keyed by the v1 requirement list. `scripts/extract.ts` runs one extraction with a chosen version; `eval/score.ts` prints a v1/v2 table for the notices v2 has saved runs for.
- Live calls: 5 (notice 1 twice, notice 5 three times, about 3 minutes apart at most). All returned 503 "overloaded" in 1.2 to 1.5 s. No v2 result exists yet. Not retried further in this session.
- Code step added without any model call: when the model says "missing" for a row whose level is "scoring" (a judging criterion), the app shows "Check yourself" (reason `criterion_not_addressed`) instead of "Missing". This was added after looking at the false flags on the tuning draft A_complete. Effect on saved runs: A_complete flagged rows v2 3 -> 2, v3 4 -> 0. Planted-gap counts did not change (v1 1/6, v2 4/6, v3 3/6, held out 1/2).
- `npm test` 20 pass, typecheck pass. Not checked on screen: the new "Check yourself" text.
