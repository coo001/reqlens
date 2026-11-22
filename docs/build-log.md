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
