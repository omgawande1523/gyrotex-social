# Gyrotex AI social workspace (Instagram and YouTube)

This repository runs the @gyrotex_ai Instagram account and the Gyrotex AI YouTube channel with the Instagram and
YouTube agent skills (https://github.com/Jakeschincariol/instagram-agent-skill and
https://github.com/Jakeschincariol/youtube-agent-skill, both MIT) installed in `.claude/skills/`.

## Start of every session

The skills read their files from `~/.claude/instagram/`. Copy this repo's versions there first:

```bash
mkdir -p ~/.claude/instagram ~/.claude/youtube && cp instagram/*.md ~/.claude/instagram/ && cp youtube/*.md ~/.claude/youtube/
```

When a skill writes or updates `voice.md`, `swipe.md` or `log.md`, copy it back into `instagram/` and commit.

## Rules

- Nothing is published or scheduled to publish until Om approves that specific post.
- The daily draft tasks (Instagram and YouTube) may save a post in Metricool as a DRAFT (`draft: true`) for Om to approve there. They never publish.
- Jenny is always described as an AI voice. Never present her as a real person.
- Drafts go in `drafts/` as `YYYY-MM-DD-<format>-<slug>/` with the script or slide copy, the caption and any image files.
- Every caption goes through `/ig-human` and then `caption.py` before it is shown to Om.
- Never invent a number, client or result. If `instagram/voice.md` has a TODO where a fact is needed, ask.
- Approved posts are scheduled through the Metricool connector (brand id 7265302, timezone Asia/Calcutta), then logged in `instagram/log.md`.

## Layout

- `.claude/skills/ig-*`: the thirteen Instagram skills and their Python tools.
- `.claude/skills/yt-*`: the eleven YouTube skills and their Python tools.
- `youtube/voice.md`: the channel's voice profile and the host, Jenny (an AI voice).
- `youtube/DAILY.md`: the steps the daily YouTube video task follows.
- `youtube/log.md`: what has been published on YouTube.
- `tools/ytnews/build.mjs`: builds the narrated news video, its score, chapters, transcript and thumbnail from an `episode.json`.
- `instagram/voice.md`: the account's voice profile. Fill in the TODO lines first.
- `instagram/log.md`: what has been posted.
- `drafts/`: work waiting for approval.
- `instagram/DAILY.md`: the steps the daily draft task follows.
- `tools/carousel/make.mjs`: builds carousel slides (and Story frames) from a `slides.json`.
- `tools/beatreel/`: builds the beat-synced Reel and its synthesized score from a `reel.json`. This is the Reel style Om approved.
- `tools/reel/`: an older narrated-Reel builder with a voiceover. Not used by the daily task.
- `archive-news-posts/`: images and log from the earlier automated news posts.
