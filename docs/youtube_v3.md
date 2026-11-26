# YouTube upload sheet (final cut)

Written 2026-11-27. Times are read from `docs/video/demo_v2.timeline.json` and `demo_v2.srt`, the files the cut was made with.

## File

- Video: `docs/video/demo_v2.mp4` (not in git: mp4 files are ignored). On the build machine: `/Users/coo/contest-work/global-ai-builders/app/docs/video/demo_v2.mp4`
- 2 min 38.5 s, 1920x1080, 30 fps, H.264 + silent AAC track, about 47 MB. Captions are burned in.
- Caption file, same text and times: `docs/video/demo_v2.srt` (optional upload as English subtitles)
- Rebuild: `PW=<playwright index.mjs> FF=<ffmpeg> node docs/video/edit.mjs live docs/video/demo_v2.mp4` (needs `docs/video/raw/`, also not in git)
- Earlier cut, every app scene replayed: `docs/video/demo_v1.mp4` (2:39). Use it only if the live scene must be dropped; the description below does not fit it.

## Upload settings

- Visibility: Public or Unlisted. Embedding allowed. Not made for kids. Check that it plays in a signed-out window.
- Contest rule: 2 to 4 minutes, YouTube or Vimeo.

## Title

ReqLens: compare your draft with the rules, requirement by requirement (Global AI Builder's Challenge)

## Description

ReqLens takes a notice (hackathon rules, a contest call, a scholarship posting) and your draft. It lists the requirements it finds, each with the sentence it comes from, and shows next to it the sentence in your draft that answers it, or that it found none.

What is live and what is replayed: the first scene (0:13 to 1:23) is a live run with real calls to Gemini, recorded on Nov 27, 2026. Two of its five calls timed out and the app retried by itself; the waiting (247 s and 192 s) is shortened and labelled on screen. The harder case (1:23) and the failure scene (2:00) replay saved Gemini responses and are labelled "Recorded"; the failure is injected on purpose. Captions only, no narration.

0:00 Why: rules pages are long
0:07 What ReqLens does
0:13 Live run: paste the rules and a draft, check
0:30 Reading a row: rule sentence, verdict, draft sentence
0:50 Add the missing paragraph and re-check
1:03 What changed: 7 verdicts, including 6 the edit was not aimed at
1:23 A harder case: this hackathon's own rules against our own early write-up (recorded)
2:00 When the model is overloaded (recorded, failure injected)
2:17 How it was tested, with limits
2:31 Links

Try it: https://reqlens-two.vercel.app
Code and test results: https://github.com/coo001/reqlens

Built for the Global AI Builder's Challenge (Refactor The World), Nov 21 to 28, 2026.

## Chapter times against the cut

| Chapter | Starts in the timeline (s) | Caption that starts there |
|---|---|---|
| 0:00 | 0.0 | title card, no caption |
| 0:07 | 7.0 | ReqLens puts each requirement it finds next to the part of your draft that answers it. |
| 0:13 | 13.0 | Paste the rules and your draft. This run is live: real calls to Gemini. |
| 0:30 | 30.0 | Each row shows the rule's sentence, the verdict and the draft sentence used as proof. |
| 0:50 | 50.0 | Top row, Partial: the draft names the Gemini API but not how it is used. Add that paragraph and re-check. |
| 1:03 | 63.0 | 7 verdicts changed. Each changed row shows what it was before. |
| 1:23 | 83.4 | A harder case: this hackathon's own rules against our own early write-up. Met rows fold away so the gaps come first. |
| 2:00 | 120.1 | When the model is overloaded, the requirement list is kept and the next try starts from the comparison. |
| 2:17 | 136.5 | numbers card, no caption |
| 2:31 | 150.5 | closing card, no caption |

YouTube shows chapters only when the list starts at 0:00, has at least three entries and each chapter is 10 s or longer. The shortest here is 0:07 to 0:13 (6 s): if chapters do not appear, delete the 0:07 line.

## Not checked

The cut was checked on 16 still frames (cards, captions, corner labels), not played through from start to finish, and the silent track was not listened to.
