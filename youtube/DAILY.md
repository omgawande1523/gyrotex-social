# Daily YouTube video: how to build it

Goal: one narrated AI-news video (1 minute 30 to 3 minutes, three stories) for the Gyrotex AI YouTube channel, left as a DRAFT in Metricool for Om to approve. Never publish it and never schedule it to go out.

## 1. Stories and facts

1. Search for AI news from the last 24 hours (48 at most). Pick the three stories with the widest interest and put the biggest first: model or product launches, big company moves, notable studies. Prefer stories about named companies. Skip politics and government, lawsuits, rumours, leaks, tragedies, and any story already in `youtube/log.md`.
2. Verify. For every story, fetch the company's own announcement or a reputable outlet's article and use only facts and numbers you read there. Keep the source URL for the description. If you cannot open any source page, stop and report which sites were blocked; do not build from search snippets. If only two stories can be verified, make a two-story video; with fewer than two, stop and report.
3. Folder: `drafts/YYYY-MM-DD-youtube-ai-news/` (India date).

## 2. Script

Read `youtube/voice.md` and `.claude/skills/yt-script/SKILL.md`. The host is Jenny, an AI voice.

1. Hooks: write five opening lines to `hooks.txt` and run `python3 -I .claude/skills/yt-script/hookscore.py hooks.txt`. Build `open.say` from the best one: it names all three stories inside the first 15 seconds, then "I'm Jenny, the AI host at Gyrotex AI, and this is today's AI news." It must run 10 seconds or longer (about 30 words or more).
2. Write `episode.json`. The fields and limits are described at the top of `tools/ytnews/build.mjs`. Per story: a `word`, `topic`, `chapter`, `headline`, a one or two sentence `say`, and two or three `facts` each with one big number or short word, a `label`, a `note` and a `say` of one to three sentences. Close with one ask: a comment question about the day's stories.
3. Every `say` is written the way it is spoken: numbers as words, no symbols or abbreviations that would be read wrongly, short sentences. Name the outlet when the source is not the company itself. Total script: 220 to 420 words.
4. `thumb` is three words or fewer and must not repeat a word from the title.

## 3. Build and render

```bash
pip install -q --break-system-packages kokoro-onnx soundfile numpy
export HYPERFRAMES_TELEMETRY_DISABLED=1 HYPERFRAMES_BROWSER_PATH=/opt/pw-browsers/chromium PRODUCER_HEADLESS_SHELL_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | head -1)
node tools/ytnews/build.mjs <folder>/episode.json <folder>/build      # voice, score, picture, chapters, transcript, thumbnail
(cd <folder>/build && npx -y hyperframes check . && npx -y hyperframes render . -q high -o ../video-full.mp4 --quiet)
(cd <folder> && ffmpeg -v error -y -i video-full.mp4 -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart video.mp4 && rm video-full.mp4 && rm -rf build/audio)
```

The build takes about 2 minutes and the render about 2.5 times the video's length. If the builder prints warnings, fix `episode.json` and rebuild. If the voice cannot be generated, stop and report; do not publish a silent video.

Check: `check` passes; `video.mp4` is 80 to 200 seconds; look at one frame from every scene (`ffmpeg -ss <t> -i video.mp4 -frames:v 1 f.jpg`, times from `transcript.txt`) and at `thumbnail.jpg`. Fix through `episode.json` anything cut off, overlapping, misspelled, or any number that does not match the source exactly.

## 4. Title, description, tags

1. Read `.claude/skills/yt-package/SKILL.md`. Write ten titles to `titles.txt`, run `python3 -I .claude/skills/yt-package/title.py titles.txt`, then check the winner against the thumbnail: `python3 -I .claude/skills/yt-package/title.py --title "<title>" --thumb "<thumb text>"`. It must report no duplicate and stay within 60 characters.
2. Read `.claude/skills/yt-seo/SKILL.md`. Write `description.txt`: two lines saying what the video covers in the words people search; a blank line; the contents of `chapters.txt`; "Sources" with one URL per story; then the standing paragraph: "This is a daily AI news briefing from Gyrotex AI for people who build with AI or run a business that uses it. The host, Jenny, is an AI voice. The graphics and music are generated in code." and the website line `Gyrotex AI builds AI automation, integrations and custom AI agents: https://gyrotex-website.vercel.app/`.
3. Write `meta.json` with `title`, `thumbnail_text`, up to 15 `tags` (names and spellings people type; nothing unrelated), `"category":"SCIENCE_TECHNOLOGY"`, `"madeForKids":false`. Delete `titles.txt` and `hooks.txt`.

## 5. Save and queue

1. Add a `README.md` (date, length, status draft). Commit and push to main. Confirm `video.mp4` and `thumbnail.jpg` return 200 at `https://raw.githubusercontent.com/omgawande1523/gyrotex-social/main/<folder>/<file>`.
2. Check `getScheduledPosts` for today. If a YouTube draft or post for today already exists, stop and report it.
3. Call createScheduledPost with blogId "7265302", date = today 18:00 India time (+05:30), and info JSON with `"draft": true`, `"autoPublish": false`, `"media": ["<raw video URL>"]`, `"videoThumbnailUrl": "<raw thumbnail URL>"`, `"text"`: the description, `"providers":[{"network":"youtube"}]`, `"youtubeData":{"title":"<title>","type":"video","privacy":"public","tags":[...],"category":"SCIENCE_TECHNOLOGY","madeForKids":false,"isAiGeneratedContent":false}`, `publicationDate` in Asia/Calcutta, and the other fields empty as in the tool description. `draft` must be true. If Metricool rejects the thumbnail (VIDEO_THUMBNAIL_NOT_APPLICABLE), call once more without `videoThumbnailUrl` and say in the report that the thumbnail must be set by hand.
4. Do not add a line to `youtube/log.md`; that happens when Om approves.

## 6. Report

In plain language Om can read on his phone: the title, the three stories with their source links, the video length, the Metricool plannerUrl to approve it, and anything that needs his attention (thumbnail, a story dropped, a check that failed). If you stopped, say why in one sentence and quote the exact error.
