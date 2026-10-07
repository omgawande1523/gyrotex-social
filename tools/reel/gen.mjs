// Usage: node tools/reel/gen.mjs <reel.json> <outDir>
// Builds a narrated HyperFrames project: one voice clip per scene, scenes timed to the voice.
// reel.json: {"format":"short","title":"...","handle":"Follow @gyrotex_ai","voice":"af_nova","speed":1.05,
//   "scenes":[{"kind":"title|stat|bullets|steps|outro","kicker":"","heading":"use *word* for the accent","sub":"","big":"","items":[],"say":"what the voice says"}]}
// "short" is 1080x1920 (Reels); anything else is 1920x1080. If the voice cannot be generated the reel is built silent, timed by word count.
// Then render: npx hyperframes render <outDir> -q high -o <outDir>/reel.mp4
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const [,, epPath, outDir] = process.argv;
const ep = JSON.parse(fs.readFileSync(epPath, 'utf8'));
const here = path.dirname(new URL(import.meta.url).pathname);
const short = ep.format === 'short';
const W = short ? 1080 : 1920, H = short ? 1920 : 1080;
const voice = ep.voice || 'af_nova', speed = String(ep.speed || 1.0), GAP = 0.35;
fs.mkdirSync(path.join(outDir, 'audio'), { recursive: true });
fs.cpSync(path.join(here, 'assets'), path.join(outDir, 'assets'), { recursive: true });
const env = { ...process.env, HYPERFRAMES_TELEMETRY_DISABLED: '1' };
const dur = f => parseFloat(execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0', f]).toString());
let t = 0; let silent = false; const scenes = [];
ep.scenes.forEach((s, i) => {
  const wav = path.join(outDir, 'audio', `s${i}.wav`);
  if (!silent && !fs.existsSync(wav)) { try { execFileSync('npx', ['-y','hyperframes','tts', s.say, '-v', voice, '-s', speed, '-o', wav], { env, stdio: 'ignore', timeout: 240000 }); } catch (e) { silent = true; } }
  const d = (silent ? Math.max(2.5, s.say.split(/\s+/).length / 2.6) : dur(wav)) + GAP;
  scenes.push({ ...s, i, start: +t.toFixed(3), dur: +d.toFixed(3) }); t += d;
});
const total = +(t + 0.6).toFixed(3);
// one narration track: each clip followed by GAP of silence
const list = scenes.map(s => `-i ${JSON.stringify(path.join(outDir,'audio',`s${s.i}.wav`))}`);
const fc = scenes.map((s, k) => `[${k}]apad=pad_dur=${GAP}[a${k}]`).join(';') + ';' + scenes.map((s,k)=>`[a${k}]`).join('') + `concat=n=${scenes.length}:v=0:a=1[o]`;
if (!silent) execFileSync('bash', ['-c', `ffmpeg -v error -y ${list.join(' ')} -filter_complex "${fc}" -map "[o]" -ar 48000 ${JSON.stringify(path.join(outDir,'audio','narration.wav'))}`]);
const esc = x => String(x ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\*(.+?)\*/g,'<em>$1</em>');
const body = s => {
  const k = s.kicker ? `<span class="kicker in">${esc(s.kicker)}</span>` : '';
  const h = s.heading ? `<h2 class="heading in">${esc(s.heading)}</h2>` : '';
  const sub = s.sub ? `<p class="sub in">${esc(s.sub)}</p>` : '';
  if (s.kind === 'stat') return `${k}<div class="big in">${esc(s.big)}</div>${h}${sub}`;
  if (s.kind === 'bullets' || s.kind === 'steps') return `${k}${h}<div class="items">${(s.items||[]).map((it, n) => `<div class="item it"><span class="num">${s.kind==='steps' ? n+1 : ''}</span><span class="txt">${esc(it)}</span></div>`).join('')}</div>`;
  if (s.kind === 'outro') return `<h2 class="heading in">${esc(s.heading)}</h2>${sub}<span class="handle in">${esc(ep.handle || '')}</span>`;
  return `${k}<h1 class="title in">${esc(s.heading)}</h1>${sub}`;
};
const tw = scenes.map(s => {
  const n = (s.items||[]).length, lead = Math.min(1.2, s.dur * 0.25), span = Math.max(0.1, s.dur - lead - 0.8);
  let js = `tl.fromTo("#s${s.i} .in",{autoAlpha:0,y:44},{autoAlpha:1,y:0,duration:.55,ease:"power3.out",stagger:.14},${(s.start+0.05).toFixed(3)});\n`;
  for (let k = 0; k < n; k++) js += `tl.fromTo(document.querySelectorAll("#s${s.i} .it")[${k}],{autoAlpha:0,x:-50},{autoAlpha:1,x:0,duration:.45,ease:"power3.out"},${(s.start + lead + k * span / n).toFixed(3)});\n`;
  if (s.i < scenes.length - 1) js += `tl.fromTo("#s${s.i} .wrap",{autoAlpha:1},{autoAlpha:0,duration:.22,ease:"power1.in"},${(s.start + s.dur - 0.24).toFixed(3)});\n`;
  return js;
}).join('');
const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=${W}, height=${H}">
<script src="assets/gsap.min.js"></script>
<style>
@font-face{font-family:"Bebas Neue";src:url("assets/fonts/bebas-neue-latin-400-normal.woff2") format("woff2")}
@font-face{font-family:"Inter";font-weight:500;src:url("assets/fonts/inter-latin-500-normal.woff2") format("woff2")}
@font-face{font-family:"Inter";font-weight:700;src:url("assets/fonts/inter-latin-700-normal.woff2") format("woff2")}
:root{--bg:#050505;--ink:#f6f4ee;--muted:#a09d94;--accent:#f5d76e;--line:rgba(246,244,238,.14);--card:rgba(246,244,238,.06)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bg)}
#root{position:relative;width:100%;height:100%;font-family:"Inter",sans-serif;color:var(--ink)}
#bg{position:absolute;inset:0;background:var(--bg);overflow:hidden}
#glow{position:absolute;left:${short?-250:-200}px;top:${short?300:-200}px;width:${short?1000:1100}px;height:${short?1000:1100}px;border-radius:50%;background:radial-gradient(closest-side,rgba(245,215,110,.17),rgba(245,215,110,0))}
#grid{position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:72px 72px;opacity:.35}
#brand{position:absolute;left:${short?80:96}px;top:${short?230:64}px;display:flex;align-items:center;gap:16px;font-size:${short?30:28}px;font-weight:700;letter-spacing:.18em}
#brand i{display:block;width:14px;height:14px;border-radius:50%;background:var(--accent)}
#track{position:absolute;left:${short?80:96}px;right:${short?80:96}px;bottom:${short?340:56}px;height:6px;border-radius:9px;background:var(--line);overflow:hidden}
#bar{display:block;width:100%;height:100%;background:var(--accent);transform-origin:0 50%}
.scene{position:absolute;inset:0}
.wrap{display:flex;flex-direction:column;justify-content:center;gap:${short?40:34}px;width:100%;height:100%;padding:${short?'330px 80px 420px':'150px 150px 130px'}}
.kicker{display:block;font-size:${short?34:30}px;font-weight:700;letter-spacing:.2em;color:var(--accent);text-transform:uppercase}
.title{display:block;font-family:"Bebas Neue",sans-serif;font-weight:400;font-size:${short?168:176}px;line-height:.95;text-transform:uppercase}
.heading{display:block;font-family:"Bebas Neue",sans-serif;font-weight:400;font-size:${short?112:128}px;line-height:.98;text-transform:uppercase}
.title em,.heading em,.sub em,.txt em{font-style:normal;color:var(--accent)}
.sub{display:block;font-size:${short?46:40}px;font-weight:500;line-height:1.35;color:var(--muted);max-width:${short?900:1300}px}
.big{display:block;font-family:"Bebas Neue",sans-serif;font-size:${short?330:300}px;line-height:.9;color:var(--accent)}
.items{display:flex;flex-direction:column;gap:${short?24:20}px}
.item{display:flex;align-items:center;gap:28px;padding:${short?'30px 34px':'24px 32px'};border:1px solid var(--line);border-radius:24px;background:var(--card)}
.num{flex:0 0 auto;min-width:${short?64:56}px;font-family:"Bebas Neue",sans-serif;font-size:${short?72:76}px;line-height:1;color:var(--accent)}
.num:empty{min-width:14px;width:14px;height:14px;border-radius:50%;background:var(--accent)}
.txt{flex:1;font-size:${short?46:52}px;font-weight:500;line-height:1.3}
.handle{display:block;font-size:${short?54:48}px;font-weight:700;color:var(--accent)}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
<div id="bg" class="clip" data-start="0" data-duration="${total}" data-track-index="0"><div id="grid"></div><div id="glow" data-layout-allow-overflow="true"></div>
<div id="brand"><i></i>${esc(ep.brand || 'GYROTEX AI')}</div><div id="track"><span id="bar"></span></div></div>
${scenes.map(s => `<div id="s${s.i}" class="clip scene" data-start="${s.start}" data-duration="${(s.i===scenes.length-1? total - s.start : s.dur).toFixed(3)}" data-track-index="1"><div class="wrap">${body(s)}</div></div>`).join('\n')}
${silent ? "" : `<audio id="narration" data-start="0" data-duration="${total}" data-track-index="2" data-volume="1" src="audio/narration.wav"></audio>`}
</div>
<script>
const tl = gsap.timeline({ paused: true });
tl.fromTo("#bar",{scaleX:0},{scaleX:1,duration:${total},ease:"none"},0);
tl.fromTo("#glow",{x:0,y:0,scale:1},{x:${short?340:900},y:${short?520:380},scale:1.25,duration:${total},ease:"sine.inOut"},0);
${tw}window.__timelines["main"] = tl; tl.seek(0);
</script></body></html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ id: path.basename(outDir), name: ep.title }, null, 2));
fs.writeFileSync(path.join(outDir, 'hyperframes.json'), '{}');
fs.writeFileSync(path.join(outDir, 'timing.json'), JSON.stringify({ total, scenes: scenes.map(s => ({ i: s.i, start: s.start, dur: s.dur, heading: s.heading })) }, null, 2));
console.log(JSON.stringify({ total, scenes: scenes.length, silent }));
