# Gyrotex AI Instagram workspace

This repository runs the @gyrotex_ai Instagram account with the Instagram agent skills
(https://github.com/Jakeschincariol/instagram-agent-skill, MIT) installed in `.claude/skills/`.

## Start of every session

The skills read their files from `~/.claude/instagram/`. Copy this repo's versions there first:

```bash
mkdir -p ~/.claude/instagram && cp instagram/*.md ~/.claude/instagram/
```

When a skill writes or updates `voice.md`, `swipe.md` or `log.md`, copy it back into `instagram/` and commit.

## Rules

- Nothing is published or scheduled to publish until Om approves that specific post.
- The daily draft task may save a post in Metricool as a DRAFT (`draft: true`) for Om to approve there. It never publishes.
- Drafts go in `drafts/` as `YYYY-MM-DD-<format>-<slug>/` with the script or slide copy, the caption and any image files.
- Every caption goes through `/ig-human` and then `caption.py` before it is shown to Om.
- Never invent a number, client or result. If `instagram/voice.md` has a TODO where a fact is needed, ask.
- Approved posts are scheduled through the Metricool connector (brand id 7265302, timezone Asia/Calcutta), then logged in `instagram/log.md`.

## Layout

- `.claude/skills/ig-*`: the thirteen skills and their Python tools.
- `instagram/voice.md`: the account's voice profile. Fill in the TODO lines first.
- `instagram/log.md`: what has been posted.
- `drafts/`: work waiting for approval.
- `instagram/DAILY.md`: the steps the daily draft task follows.
- `tools/carousel/make.mjs`: builds carousel slides (and Story frames) from a `slides.json`.
- `tools/beatreel/`: builds the beat-synced Reel and its synthesized score from a `reel.json`. This is the Reel style Om approved.
- `tools/reel/`: an older narrated-Reel builder with a voiceover. Not used by the daily task.
- `archive-news-posts/`: images and log from the earlier automated news posts.
