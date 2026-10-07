# Daily draft: how to build the day's post

Goal: build today's post for @gyrotex_ai and leave it as a DRAFT in Metricool for Om to approve. Never publish it and never schedule it to go out.

## Which format today (India weekday, from `TZ=Asia/Kolkata date +%A`)

| Day | Build |
|---|---|
| Monday, Wednesday, Friday | A Reel, 20 to 30 seconds (section B) |
| Tuesday, Thursday | A carousel on one story, 6 to 8 slides (section C) |
| Saturday | A carousel of the week's five biggest AI stories (section C, recap variant) |
| Sunday | No post. Report "Sunday: no post planned" and stop. |

Every day except Sunday also gets three Story frames (section D).

## A. Story and facts (every post)

1. Search for AI news from the last 24 hours (48 at most). Pick one story with wide interest: a model or product launch, a big company move, a notable study. Skip politics, lawsuits, rumours, leaks, tragedies, and anything already in `instagram/log.md` or an existing `drafts/` folder.
   Saturday recap: pick the five biggest stories of the last 7 days instead. Stories already posted this week are allowed in the recap.
2. Verify. Fetch the company's own announcement or a reputable outlet's article for every story. Use only facts and numbers you read there. If you cannot open any source page, stop and report which sites were blocked; do not build from search snippets.
3. Folder: `drafts/YYYY-MM-DD-<reel|carousel>-<slug>/` (India date). Put a `README.md` in it with the source URLs, the date and "Status: draft".
4. Never show logos, mascots, product screenshots or pictures of people. Company names appear as text only.

## B. Reel (Mon, Wed, Fri)

The Reel is a beat-synced motion graphic: colour-block scenes cut on a 128 BPM beat, a hook word that types in, three facts with big numbers, a break, then the Gyrotex AI wordmark and the ask. It has an original synthesized score and sound effects and no voiceover. About 21 seconds.

1. Read `.claude/skills/ig-reel/SKILL.md` for the hook rules. Write three candidate hook lines to `hooks.txt`, run `python3 -I .claude/skills/ig-reel/hookscore.py hooks.txt`, and take the hook WORD (10 letters or fewer, usually the company or product name) and the first fact from the top-scoring line.
2. Write `reel.json` in the draft folder. The fields and their length limits are described at the top of `tools/beatreel/beat.mjs`: `date`, `topic`, `word`, exactly three `facts` (each `big`, `label`, `note`), `source`, `ask`. Every `big` is a verified number or short name from the source. Keep to the length limits or the text will not fit.
3. Build and render:
   ```bash
   pip install -q --break-system-packages numpy
   export HYPERFRAMES_TELEMETRY_DISABLED=1 HYPERFRAMES_BROWSER_PATH=/opt/pw-browsers/chromium PRODUCER_HEADLESS_SHELL_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | head -1)
   node tools/beatreel/beat.mjs <folder>/reel.json <folder>/build
   (cd <folder>/build && npx -y hyperframes check . && npx -y hyperframes render . -q high -o ../reel.mp4 --quiet)
   ```
   `check` must pass. Then look at frames at 3.4, 5.5, 9, 13.5 and 19.5 seconds (`ffmpeg -ss <t> -i reel.mp4 -frames:v 1 f.jpg`) for cut-off or overlapping text. If text does not fit, shorten it in `reel.json` and rebuild.
   Before committing, delete `<folder>/build/node_modules` if it exists.
4. Critique pass (one round). One Reel carries one idea: the three facts must all be about the same story. Looking at the frames, check and fix through `reel.json`:
   - no scene has an empty half: if a `note` or `label` is missing the lower part sits blank;
   - nothing is too faint or too small to read on a phone held at arm's length;
   - every number and name on screen matches the source exactly, with its unit;
   - the hook word is the thing a stranger would recognise (company or product), not a generic word.
5. Metricool: `instagramData.type` is `"REEL"`, `media` is the one raw URL of `reel.mp4`.

## C. Carousel (Tue, Thu, Sat)

1. Read `.claude/skills/ig-carousel/SKILL.md`. Write `slides.json` with 6 to 8 slides: a cover of 6 words or fewer, the stake, one idea per slide (headline 3 to 7 words, 25 words or fewer under it), a recap slide naming the source, and a last slide with ONE ask. The slide fields are described at the top of `tools/carousel/make.mjs`.
   Saturday recap: cover, one slide per story (5), a last slide with ONE ask. Each story slide names its source.
2. Build: `node tools/carousel/make.mjs <folder>/slides.json <folder>`. Look at every slide image. Fix anything cut off, overlapping or misspelled.
3. Metricool: `instagramData.type` is `"POST"`, `media` is the slide URLs in order.

## D. Story frames (every day except Sunday)

1. Read `.claude/skills/ig-story/SKILL.md`. Write `stories.json` with three frames in the same fields as carousel slides: frame 1 says what today's post is about, frame 2 gives the one number or fact worth knowing, frame 3 asks a two-option question about the story and says which sticker to add (for example "Add a poll sticker: Yes / No").
2. Build: `node tools/carousel/make.mjs <folder>/stories.json <folder>/stories story`.
3. Stories are NOT sent to Metricool. Stickers can only be added in the Instagram app, so Om posts these by hand. List the three image URLs in the report.

## E. Caption (every post)

Follow `instagram/voice.md` and `.claude/skills/ig-caption/SKILL.md`. Save as `caption.txt` in the draft folder, then run
`python3 -I .claude/skills/ig-human/humanize.py caption.txt --report` and
`python3 -I .claude/skills/ig-caption/caption.py caption.txt --keywords "<company>,<product>"`.
Rewrite until the verdict is READY and nothing is flagged (3 tries at most). The caption's ask must match the last slide or the Reel's `ask`. Never change a fact to pass a check.

## F. Save and queue

1. Commit and push to main. Confirm every media URL `https://raw.githubusercontent.com/omgawande1523/gyrotex-social/main/<folder>/<file>` returns 200.
2. Check `getScheduledPosts` for today. If a draft or post for today already exists, stop and report it.
3. Call createScheduledPost with blogId "7265302", date = today 18:30 India time (+05:30), and info JSON with `"draft": true`, `"autoPublish": false`, `media`, `text` (the caption), `"providers":[{"network":"instagram"}]`, `"instagramData":{"type":"POST" or "REEL","collaborators":[],"showReelOnFeed":true,"isAiGenerated":false}`, `publicationDate` in Asia/Calcutta, and the other fields empty as in the tool description. `draft` must be true.
4. Do not add a line to `instagram/log.md`; that happens when Om approves.

## G. Report

In plain language Om can read on his phone: today's format, what the post is about, the source link, the Metricool plannerUrl to approve it, the caption check result, and the three Story image links. If you stopped, say why in one sentence and quote the exact error.
