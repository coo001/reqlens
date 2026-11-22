# ReqLens

Paste a notice (hackathon rules, a contest call, a scholarship posting) and your draft.
ReqLens lists every requirement with the exact sentence it comes from and shows, side by side,
which part of your draft answers it and what is missing.

Built for the Global AI Builder's Challenge. All code in this repository was written during the
build period (from 2026-11-21 17:00 KST). See "What existed before the build period" below.

## How it works

| Step | Done by | What happens |
|---|---|---|
| 1. Extract requirements | Gemini | Each requirement comes back with a quote from the notice, a level (required / recommended / scoring) and whether a written draft can show it |
| 2. Quote Lock | Code | A quote is kept only if it is found word for word in the notice (only whitespace and curly quotes are normalized). Anything else is discarded and counted |
| 3. Compare with the draft | Gemini | One verdict per requirement (met / partial / missing / cannot tell) with a quote from the draft as evidence |
| 4. Counted, not guessed | Code | When the notice quote states a word limit ("500 words or less"), code counts the draft's words and sets the verdict. The model's own answer is saved next to it, not shown |
| 5. Lock evidence, split the list | Code | Evidence quotes go through Quote Lock too. A verdict whose evidence is not in the draft is not shown as a verdict. Requirements that text cannot prove (age, enrollment, deadlines) are never sent to the model and go to "Check yourself" |

A check costs two model calls. Editing only the draft and re-checking costs one.

## Run it locally

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env.local   # then put a free-tier Gemini API key in it
npm run dev                  # http://localhost:3000
```

Without a key you can still press **Try a sample** or **Sample: word limit**, or open
`http://localhost:3000/?sample=1` (`?sample=wordlimit`): the samples replay responses saved in `runs/` and make
no API call. The screen labels every result as
either "Live run" or "Recorded sample".

```bash
npm test          # unit tests: Quote Lock, word counting, scorer self-check
node eval/score.ts  # re-score the saved responses, every prompt version side by side (no API calls)
npm run typecheck
npm run build
```

## Switches (environment variables)

| Variable | Default | Effect |
|---|---|---|
| `GEMINI_API_KEY` | none | Server-side key. Never sent to the browser, never committed |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Model name. The exact version the API reports is saved with every run |
| `REPLAY` | `0` | `1` = never call the model. Answer only from `runs/`; a missing recording is an error, not a silent live call |
| `RECORD` | `1` | Save each live request and raw response to `runs/` |
| `DAILY_CALL_CAP` | `13` | Live calls allowed per day (KST). Failed calls count |
| `GEMINI_TIMEOUT_MS` | `100000` | Per-call timeout. The API routes allow 120 s |
| `IP_DAILY_CAP` | `6` on Vercel, off locally | Live calls per visitor address per day. In memory, so per server instance only |
| `FAULT` | none | Test switch: `compare:overloaded:1` makes the next compare call fail (also on the recorded samples). Codes: `overloaded`, `timeout`, `rate_limited`, `malformed_response` |

## When a step fails

A busy or slow answer (overloaded, timeout, empty or broken JSON) is retried once automatically, and the step list
says so. If it fails again the screen names the step that failed. The requirement list from step 1 is kept, so
checking again resumes from the comparison and costs one call, not two. Quota and cap errors are not retried.

## Recorded runs

`runs/<stage>__<prompt version>__<model>__<hash of the prompt>.json` holds the request body, the raw response,
the model name, the time and the duration. `runs/call-log.jsonl` has one line per live call, including failures.
Prompt versions live in `lib/prompts.ts` and are part of the file name, so a changed prompt never replays an old answer.

## Evaluation

`eval/` holds the fixed inputs (5 notices, 8 drafts of which 6 have a planted gap), the answer key
(`answer_key.json`, 145 items) and the scorer. `eval/results.md` is generated from the saved responses in `runs/`
and is committed as is, including the results that are bad. The notices, drafts and answer key were prepared
before the build period; no human verified the answer key.

## Limits

- English text only. No PDF or image input.
- It checks a draft against the pasted text. It does not predict judging results.
- Requirements that cannot be judged from text are listed for you to confirm; they get no verdict.
- One provider (Gemini free tier). When the model is overloaded or the daily cap is reached, live checks stop and only the recorded samples work.
- Long lists fold the Met rows away (more than 15 requirements). Confirmations you tick are kept in this browser only.

## What existed before the build period

No code. Before 2026-11-21 17:00 KST we prepared evaluation material only: text snapshots of five public notices,
an answer key of requirements written by two AI models independently and reconciled by quote overlap, and eight
made-up drafts (two complete, six with one planted gap). No human verified the answer key. The two sample texts in
`samples/` come from that material.

## Layout

```
app/            UI (app/page.tsx) and the three API routes
lib/            quoteLock.ts, gemini.ts (client, record/replay, call cap), prompts.ts, pipeline.ts
samples/        the notices and drafts used by the two samples
runs/           recorded model responses and the call log
docs/           build log
```
