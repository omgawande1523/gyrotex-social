# Daily draft: how to build the day's post

Goal: one carousel about the biggest AI news story of the last 24 hours, left as a DRAFT in Metricool for Om to approve. Never publish or schedule it to go out.

1. Story. Search for AI news from the last 24 hours (48 at most). Pick one story with wide interest: a model or product launch, a big company move, a notable study. Skip politics, lawsuits, rumours, leaks, tragedies, and anything already in `instagram/log.md` or an existing `drafts/` folder.
2. Verify. Fetch the company's own announcement or a reputable outlet's article. Use only facts and numbers you read there. If you cannot open any source page, stop and report which sites were blocked; do not build from search snippets.
3. Slides. Write `slides.json` with 6 to 8 slides, following `.claude/skills/ig-carousel/SKILL.md`: a cover of 6 words or fewer, the stake, one idea per slide (headline 3 to 7 words, 25 words or fewer under it), a recap slide naming the source, and a last slide with ONE ask. The slide fields are described at the top of `tools/carousel/make.mjs`.
   Build: `node tools/carousel/make.mjs slides.json drafts/YYYY-MM-DD-carousel-<slug>` (India date). Look at every slide image. Fix anything cut off, overlapping or misspelled.
   No logos, mascots, product screenshots or pictures of people. Company names as text only.
4. Caption. Follow `instagram/voice.md`. Save as `caption.txt` in the draft folder, then run
   `python3 -I .claude/skills/ig-human/humanize.py caption.txt --report` and
   `python3 -I .claude/skills/ig-caption/caption.py caption.txt --keywords "<company>,<product>"`.
   Rewrite until the verdict is READY and nothing is flagged (3 tries at most). The caption's ask must match the last slide. Never change a fact to pass a check.
5. Save. Add a short `README.md` in the draft folder (source URL, date, status). Commit and push to main. Confirm each `https://raw.githubusercontent.com/omgawande1523/gyrotex-social/main/drafts/<folder>/slide-NN.jpg` returns 200.
6. Metricool draft. Call createScheduledPost with blogId "7265302", date = today 18:30 India time (+05:30), and info JSON with `"draft": true`, `"autoPublish": false`, the slide URLs in order in `media`, the caption in `text`, `"providers":[{"network":"instagram"}]`, `"instagramData":{"type":"POST","collaborators":[],"showReelOnFeed":true,"isAiGenerated":false}`, `publicationDate` in Asia/Calcutta, and the other fields empty as in the tool description. `draft` must be true. If a draft or post for today already exists (check getScheduledPosts), stop.
7. Report: headline, source link, the draft folder, the Metricool plannerUrl, and the caption check result. If you stopped, say why and quote the exact error.
