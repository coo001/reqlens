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
