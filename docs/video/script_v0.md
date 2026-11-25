# Demo video script, draft v0 (2026-11-26)

Target length 2:40 to 2:55 (the rules ask for 2 to 4 minutes). Captions only, no voice. Everything on screen is the running app.
Footage so far: `scene_fault.mp4` (29 s) and `scene_long.mp4` (60 s), recorded with `record.sh` at 1920x1080. The live scene is not recorded yet (see the note at the end). Time marks for each clip are in `raw/<scene>.marks.json`.

| # | Time | Picture | Caption (shown as written) |
|---|---|---|---|
| 1 | 0:00-0:10 | Title card on the app's own light background | Rules pages are long. One missed line can cost an entry. |
| 2 | 0:10-0:18 | App home, empty boxes | ReqLens puts every requirement next to the part of your draft that answers it. |
| 3 | 0:18-0:30 | LIVE: paste the rules and a draft, press Check my draft | Paste the rules and your draft. This run is live: two calls to Gemini. |
| 4 | 0:30-0:42 | LIVE: the four steps (waiting cut, cut marked on screen) | Gemini lists the requirements. Code keeps a quote only if it is in the rules word for word. |
| 5 | 0:42-1:02 | LIVE: results, slow scroll; stop on the Partial row for AI details | Each row shows the rule's sentence, the verdict and the draft sentence used as proof. Here the AI details are only partly there. |
| 6 | 1:02-1:12 | LIVE: a Check yourself row | What text cannot prove is set aside for you to confirm. No verdict is invented. |
| 7 | 1:12-1:30 | LIVE: add the "How the AI works" paragraph, Re-check draft, changed verdicts | Add the missing paragraph and re-check. Only the comparison runs again, and changed verdicts are marked. |
| 8 | 1:30-1:50 | `scene_long` 0:12-0:33: this hackathon's rules, 30 requirements, fold opened | A harder case: this hackathon's own rules against our own early write-up. Recorded run, replayed. Met rows fold away so the gaps come first. |
| 9 | 1:50-2:05 | `scene_long` 0:44-0:59: "15 verdicts changed", Missing to Partial | After a rewrite, 15 verdicts changed. One requirement was still missing. |
| 10 | 2:05-2:22 | `scene_fault` 0:04-0:20: failure band, then the button again | When the model is overloaded (failure injected here), the list is kept and the next try starts from the comparison. |
| 11 | 2:22-2:40 | Card: test numbers from `eval/results.md` | Tested against a hand-made answer key: [numbers from eval/results.md]. Limits: row counts vary between runs, and some Met verdicts were too generous. |
| 12 | 2:40-2:50 | Closing card: repo and site links | ReqLens checks text against text. It does not predict judging. |

Notes for the edit:
- Scene 11 numbers must be copied from `eval/results.md` at edit time, not from this table.
- Scenes 8 and 9 show "Recorded run" in the header; scene 10 shows "Recorded sample" and the words "injected fault" in the message. Keep those visible.
- Waiting time in the live scene is cut; put a small "wait cut: N s" label on the cut.
- Live scene, first try 2026-11-26 08:19 KST: the requirement call timed out at 100 s, the automatic second try answered after 76 s, and the recording stopped waiting at 150 s. No footage kept. Record again with `docs/video/record.sh live` when the model answers at normal speed (13 to 45 s on earlier days).
