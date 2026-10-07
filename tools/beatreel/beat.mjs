// Beat-synced motion-graphics Reel (1080x1920, about 21 seconds, 128 BPM, no voiceover).
// Usage: node tools/beatreel/beat.mjs <reel.json> <outDir>
//        then: (cd <outDir> && npx -y hyperframes check . && npx -y hyperframes render . -q high -o ../reel.mp4 --quiet)
// reel.json:
// { "date": "7 OCT 2026",            // shown small in the corners
//   "topic": "MISTRAL LARGE 4",      // small corner label, 24 characters or fewer
//   "word": "MISTRAL",               // the hook word that types in on the beat, 10 letters or fewer
//   "facts": [ {"big":"1T","label":"parameters","note":"49 billion active at a time"}, ... exactly 3 ],
//             // big: 6 characters or fewer. label: 28 or fewer. note: 40 or fewer.
//   "source": "mistral.ai",
//   "ask": "Open weights or a closed API?" }   // 40 characters or fewer
// Structure in beats: intro 0-4, hook word 4-8, three facts 8-32 (8 beats each), break 32-36, logo and ask 36-44.
// The score and sound effects are synthesized by score.py on the same grid, so cuts land on the beat.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const [,, inPath, outDir] = process.argv;
const R = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const here = path.dirname(new URL(import.meta.url).pathname);
if (!Array.isArray(R.facts) || R.facts.length !== 3) throw new Error('reel.json needs exactly 3 facts');
const BPM = 128, B = 60 / BPM, BEATS = 44, TOTAL = +(BEATS * B + 0.6).toFixed(3);
const W = 1080, H = 1920;
fs.mkdirSync(path.join(outDir, 'audio'), { recursive: true });
fs.cpSync(path.join(here, 'fonts'), path.join(outDir, 'fonts'), { recursive: true });
fs.copyFileSync(path.join(here, 'gsap.min.js'), path.join(outDir, 'gsap.min.js'));

// ---------- sound ----------
const word = String(R.word).toUpperCase().slice(0, 10);
const step = 3.0 / word.length;                         // beats between letters
const ticks = [...word].map((_, i) => +(4 + i * step).toFixed(3)).concat([7.25]);
const plan = { bpm: BPM, beats: BEATS, drop: 4, break: [32, 36], cuts: [4, 8, 16, 24, 32, 36], ticks };
const A = f => path.join(outDir, 'audio', f);
fs.writeFileSync(A('plan.json'), JSON.stringify(plan));
execFileSync('python3', ['-I', path.join(here, 'score.py'), A('plan.json'), A('raw.wav')], { stdio: 'ignore', timeout: 180000 });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', A('raw.wav'), '-af', 'highpass=f=50,loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', A('score.wav')]);
fs.rmSync(A('raw.wav'));

// ---------- picture ----------
const esc = x => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fit = (txt, max, width, k) => Math.round(Math.min(max, width / (Math.max(1, String(txt).length) * k)));
const C = { ink: '#0c0c10', cream: '#ece6d8', blue: '#2447f9', gold: '#f5c84c' };
const scenes = [
  { id: 'intro', b0: 0, b1: 4, bg: C.ink, fg: C.cream, dot: C.gold, name: 'INTRO' },
  { id: 'word', b0: 4, b1: 8, bg: C.gold, fg: C.ink, dot: C.ink, name: 'HEADLINE' },
  { id: 'f0', b0: 8, b1: 16, bg: C.cream, fg: C.ink, dot: C.blue, name: 'FACT 1' },
  { id: 'f1', b0: 16, b1: 24, bg: C.ink, fg: C.cream, dot: C.gold, name: 'FACT 2' },
  { id: 'f2', b0: 24, b1: 32, bg: C.blue, fg: C.cream, dot: C.cream, name: 'FACT 3' },
  { id: 'brk', b0: 32, b1: 36, bg: C.ink, fg: C.cream, dot: C.gold, name: 'SOURCE' },
  { id: 'out', b0: 36, b1: BEATS, bg: C.ink, fg: C.cream, dot: C.gold, name: 'GYROTEX AI' },
];
const T = b => +(b * B).toFixed(4);
let seed = 20261007; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// motif markup
const sphere = (() => { const N = 150, Rr = 300; let s = '';
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963; const x = Math.cos(th) * r, z = Math.sin(th) * r;
    s += `<i style="transform:translate3d(${(x * Rr).toFixed(1)}px,${(y * Rr).toFixed(1)}px,${(z * Rr).toFixed(1)}px)"></i>`; }
  return `<div class="persp"><div class="sph" id="sph">${s}</div></div>`; })();
const grid = (() => { let s = ''; for (let i = 0; i < 63; i++) s += `<i class="gd g${i % 3}"></i>`; return `<div class="grid" id="grid">${s}</div>`; })();
const rings = (() => { let s = ''; const cols = [C.cream, C.ink, C.cream, C.gold, C.cream, C.ink, C.cream];
  for (let i = 0; i < 7; i++) { const r = 60 + i * 50; s += `<svg class="rg" id="rg${i}" viewBox="0 0 800 800" width="800" height="800"><circle cx="400" cy="400" r="${r}" fill="none" stroke="${cols[i]}" stroke-width="${i % 2 ? 3 : 6}" stroke-dasharray="${(20 + i * 14)} ${(14 + i * 9)}" /></svg>`; }
  return `<div class="rings">${s}</div>`; })();
const shards = (() => { let s = ''; for (let i = 0; i < 28; i++) { const w = 30 + rnd() * 150, h = 10 + rnd() * 26; const col = [C.cream, C.gold, C.blue][i % 3];
  s += `<i class="sh" style="width:${w.toFixed(0)}px;height:${h.toFixed(0)}px;background:${col}"></i>`; } return `<div class="shards">${s}</div>`; })();
const corners = (sc, i) => `<div class="lab tl">GYROTEX AI / AI NEWS</div><div class="lab tr">0${i + 1} / 07</div><div class="lab bl">${esc(sc.name)} · ${esc(String(R.topic || '').toUpperCase().slice(0, 24))}</div><div class="lab br">${esc(String(R.date || '').toUpperCase())}</div>`;
const fact = (f, i) => `<div class="txt"><div class="big" id="big${i}" style="font-size:${fit(f.big, 330, 900, 0.80)}px">${esc(f.big)}</div><div class="label" id="lb${i}">${esc(f.label)}</div><div class="note" id="nt${i}">${esc(f.note)}</div></div>`;
const body = {
  intro: `<div class="mid"><div class="dot" id="d0"></div><div class="line" id="ln0"></div><div class="kick" id="k0">AI NEWS · ${esc(String(R.date || '').toUpperCase())}</div></div>`,
  word: `<div class="mid"><div class="wordrow" style="font-size:${fit(word + '.', 330, 940, 0.80)}px">${[...word].map((ch, i) => `<span class="lt" id="lt${i}">${esc(ch)}</span>`).join('')}<span class="pdot" id="pd"></span></div></div>`,
  f0: `<div class="motif">${sphere}<div class="cdot" id="cd0"></div></div>${fact(R.facts[0], 0)}`,
  f1: `<div class="motif">${grid}</div>${fact(R.facts[1], 1)}`,
  f2: `<div class="motif">${rings}<div class="cdot" id="cd2"></div></div>${fact(R.facts[2], 2)}`,
  brk: `<div class="mid"><div class="ring" id="rr"></div><div class="dot" id="d5"></div><div class="kick" id="k5">SOURCE · ${esc(String(R.source || '').toUpperCase())}</div></div>`,
  out: `<div class="mid">${shards}<div class="wm" id="wm">GYROTEX AI<span class="pdot" id="pd2"></span></div><div class="line" id="ln6"></div><div class="ask" id="ask">${esc(R.ask)}</div><div class="kick" id="k6">FOLLOW @GYROTEX_AI FOR DAILY AI NEWS</div></div>`,
};

// timeline code
let js = '';
const P = (s) => { js += s + '\n'; };
// intro: dot drops onto a line
P(`tl.fromTo("#d0",{y:-900,scale:.6},{y:0,scale:1,duration:${(B * 2.6).toFixed(3)},ease:"bounce.out"},0.05);`);
P(`tl.fromTo("#ln0",{scaleX:0},{scaleX:1,duration:${(B * 1.5).toFixed(3)},ease:"power3.out"},${T(1)});`);
P(`tl.fromTo("#k0",{autoAlpha:0,y:20},{autoAlpha:1,y:0,duration:.4,ease:"power2.out"},${T(2)});`);
P(`tl.fromTo("#d0",{scale:1},{scale:2.4,duration:${(B * 0.9).toFixed(3)},ease:"power2.in"},${T(3)});`);
// hook word: one letter per tick
[...word].forEach((_, i) => P(`tl.fromTo("#lt${i}",{autoAlpha:0,y:40},{autoAlpha:1,y:0,duration:.12,ease:"power2.out"},${T(4 + i * step)});`));
P(`tl.fromTo("#pd",{scale:0},{scale:1,duration:.3,ease:"back.out(3)"},${T(7.25)});`);
// facts
[0, 1, 2].forEach(i => { const b0 = 8 + i * 8;
  P(`tl.fromTo("#big${i}",{autoAlpha:0,scale:1.35},{autoAlpha:1,scale:1,duration:.34,ease:"expo.out"},${T(b0)});`);
  P(`tl.fromTo("#lb${i}",{autoAlpha:0,x:-60},{autoAlpha:1,x:0,duration:.3,ease:"power3.out"},${T(b0 + 1)});`);
  P(`tl.fromTo("#nt${i}",{autoAlpha:0,x:-60},{autoAlpha:1,x:0,duration:.3,ease:"power3.out"},${T(b0 + 2)});`);
  for (let k = 4; k < 8; k += 2) P(`tl.fromTo("#big${i}",{scale:1},{scale:1.035,duration:${(B / 2).toFixed(3)},ease:"power1.out",yoyo:true,repeat:1},${T(b0 + k)});`);
});
P(`tl.fromTo("#sph",{rotationY:-20,rotationX:-18},{rotationY:230,rotationX:14,duration:${T(8)},ease:"none"},${T(8)});`);
P(`tl.fromTo("#sph",{scale:.2},{scale:1,duration:.5,ease:"back.out(1.6)"},${T(8)});`);
for (let k = 0; k < 8; k++) P(`tl.fromTo("#cd0",{scale:1},{scale:1.6,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${T(8 + k)});`);
P(`tl.fromTo(".gd",{scale:0},{scale:1,duration:.35,ease:"back.out(2)",stagger:{each:.012,from:"center",grid:[7,9]}},${T(16)});`);
P(`tl.fromTo(".gd",{rotation:0,borderRadius:"50%"},{rotation:45,borderRadius:"0%",scale:2.1,duration:.4,ease:"power3.inOut",stagger:{each:.01,from:"center",grid:[7,9]}},${T(20)});`);
P(`tl.fromTo(".g1",{backgroundColor:"${C.cream}"},{backgroundColor:"${C.gold}",duration:.2},${T(20)});`);
P(`tl.fromTo(".g2",{backgroundColor:"${C.cream}"},{backgroundColor:"${C.blue}",duration:.2},${T(20)});`);
P(`tl.fromTo("#grid",{scale:1},{scale:1.12,duration:${T(4)},ease:"sine.inOut"},${T(20)});`);
for (let i = 0; i < 7; i++) P(`tl.fromTo("#rg${i}",{rotation:${i * 25}},{rotation:${i * 25 + (i % 2 ? -1 : 1) * (120 + i * 30)},duration:${T(8)},ease:"none"},${T(24)});`);
for (let i = 0; i < 7; i++) P(`tl.fromTo("#rg${i}",{scale:0},{scale:1,duration:.5,ease:"back.out(1.5)"},${(T(24) + i * 0.04).toFixed(3)});`);
for (let k = 0; k < 8; k++) P(`tl.fromTo("#cd2",{scale:1},{scale:1.6,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${T(24 + k)});`);
// break
P(`tl.fromTo("#d5",{scale:.3},{scale:1,duration:.3,ease:"back.out(2)"},${T(32)});`);
P(`tl.fromTo("#rr",{scale:.2,autoAlpha:1},{scale:6,autoAlpha:0,duration:${T(3.6)},ease:"power2.out"},${T(32)});`);
P(`tl.fromTo("#k5",{autoAlpha:0,y:20},{autoAlpha:1,y:0,duration:.3,ease:"power2.out"},${T(32.5)});`);
P(`tl.fromTo("#d5",{scale:1},{scale:.05,duration:${(B * 1.2).toFixed(3)},ease:"power3.in"},${T(34.7)});`);
// logo resolve
for (let i = 0; i < 28; i++) { const a = rnd() * Math.PI * 2, d = 380 + rnd() * 520;
  P(`tl.fromTo(document.querySelectorAll(".sh")[${i}],{x:${(Math.cos(a) * d).toFixed(0)},y:${(Math.sin(a) * d).toFixed(0)},rotation:${(rnd() * 360).toFixed(0)},autoAlpha:1},{x:0,y:0,rotation:0,autoAlpha:0,duration:${(B * 1.4).toFixed(3)},ease:"expo.in"},${T(36 - 1.4)});`); }
P(`tl.fromTo("#wm",{autoAlpha:0,scale:1.25},{autoAlpha:1,scale:1,duration:.45,ease:"expo.out"},${T(36)});`);
P(`tl.fromTo("#pd2",{scale:0},{scale:1,duration:.35,ease:"back.out(3)"},${T(37)});`);
P(`tl.fromTo("#ln6",{scaleX:0},{scaleX:1,duration:.5,ease:"power3.out"},${T(38)});`);
P(`tl.fromTo("#ask",{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.35,ease:"power2.out"},${T(38)});`);
P(`tl.fromTo("#k6",{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.35,ease:"power2.out"},${T(40)});`);

const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=${W}, height=${H}">
<script src="gsap.min.js"></script>
<style>
@font-face{font-family:"Archivo";font-weight:100 900;font-stretch:62% 125%;src:url("fonts/archivo-latin-wdth-normal.woff2") format("woff2")}
@font-face{font-family:"JetBrains Mono";font-weight:500;src:url("fonts/jetbrains-mono-latin-500-normal.woff2") format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${C.ink}}
#root{position:relative;width:100%;height:100%;font-family:"Archivo",sans-serif}
.scene{position:absolute;inset:0;overflow:hidden}
.lab{position:absolute;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:22px;letter-spacing:.08em;opacity:.75}
.tl{left:70px;top:236px}.tr{right:70px;top:236px}.bl{left:70px;bottom:356px}.br{right:70px;bottom:356px}
.mid{position:absolute;left:70px;right:70px;top:300px;bottom:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:46px}
.motif{position:absolute;left:0;right:0;top:290px;height:690px;display:flex;align-items:center;justify-content:center}
.txt{position:absolute;left:80px;right:80px;top:1000px;bottom:440px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px}
.big{display:block;font-weight:900;font-stretch:125%;line-height:.9;letter-spacing:-.02em;transform-origin:0 70%;white-space:nowrap}
.label{display:block;font-weight:800;font-stretch:112%;font-size:62px;line-height:1.02;text-transform:uppercase}
.note{display:block;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:34px;line-height:1.3;opacity:.85}
.dot{display:block;width:110px;height:110px;border-radius:50%}
.cdot{position:absolute;display:block;width:72px;height:72px;border-radius:50%}
.line{display:block;width:520px;height:5px;transform-origin:50% 50%}
.kick{display:block;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:30px;letter-spacing:.14em;text-align:center}
.wordrow{display:flex;align-items:baseline;justify-content:center;font-weight:900;font-stretch:125%;line-height:1;letter-spacing:-.02em;white-space:nowrap}
.lt{display:inline-block}
.pdot{display:inline-block;width:.24em;height:.24em;border-radius:50%;margin-left:.06em}
.wm{display:flex;align-items:baseline;justify-content:center;font-weight:900;font-stretch:125%;font-size:124px;line-height:1;letter-spacing:-.02em;white-space:nowrap}
.ask{display:block;font-weight:800;font-stretch:112%;font-size:54px;line-height:1.1;text-align:center;text-transform:uppercase}
.persp{perspective:1400px;width:700px;height:700px;display:flex;align-items:center;justify-content:center}
.sph{position:relative;width:0;height:0;transform-style:preserve-3d}
.sph i{position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:${C.ink}}
.grid{display:grid;grid-template-columns:repeat(9,34px);grid-auto-rows:34px;gap:52px}
.gd{display:block;width:34px;height:34px;border-radius:50%;background:${C.cream}}
.rings{position:relative;display:block;flex:0 0 auto;width:800px;height:800px;transform-origin:50% 50%;scale:.84}
.rg{position:absolute;left:0;top:0;display:block}
.ring{position:absolute;display:block;width:160px;height:160px;border-radius:50%;border:4px solid ${C.gold}}
.shards{position:absolute;left:50%;top:50%;width:0;height:0}
.sh{position:absolute;display:block;left:0;top:0}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
${scenes.map((sc, i) => `<div id="${sc.id}" class="clip scene" data-start="${T(sc.b0)}" data-duration="${(i === scenes.length - 1 ? TOTAL - T(sc.b0) : T(sc.b1) - T(sc.b0)).toFixed(4)}" data-track-index="1" data-layout-allow-overflow="true" style="background:${sc.bg};color:${sc.fg}">${corners(sc, i)}${body[sc.id]}</div>`).join('\n')}
<audio id="score" data-start="0" data-duration="${TOTAL}" data-track-index="2" data-volume="1" src="audio/score.wav"></audio>
</div>
<style>
${scenes.map(sc => `#${sc.id} .dot,#${sc.id} .cdot,#${sc.id} .pdot{background:${sc.dot}}#${sc.id} .line{background:${sc.fg}}`).join('\n')}
#f1 .cdot{background:${C.gold}}
</style>
<script>
const tl = gsap.timeline({ paused: true });
${js}window.__timelines["main"] = tl; tl.seek(0);
</script></body></html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ id: path.basename(path.resolve(outDir)), name: R.topic || 'reel' }, null, 2));
fs.writeFileSync(path.join(outDir, 'hyperframes.json'), '{}');
console.log(JSON.stringify({ seconds: TOTAL, bpm: BPM, beats: BEATS }));
