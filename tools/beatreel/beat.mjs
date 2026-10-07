// Beat-synced motion-graphics Reel (1080x1920, about 19 seconds, no voiceover).
// Usage: node tools/beatreel/beat.mjs <reel.json> <outDir>
//        then: (cd <outDir> && npx -y hyperframes check . && npx -y hyperframes render . -q high -o ../reel.mp4 --quiet)
// reel.json:
// { "date": "7 OCT 2026",            // shown small in the corners; also seeds the look (see below)
//   "topic": "MISTRAL LARGE 4",      // small corner label, 24 characters or fewer
//   "word": "MISTRAL",               // the hook word that types in on the beat, 10 letters or fewer
//   "facts": [ {"big":"1T","label":"parameters","note":"49 billion active at a time"}, ... exactly 3 ],
//             // big: 6 characters or fewer. label: 28 or fewer. note: 40 or fewer.
//   "source": "mistral.ai",
//   "ask": "Open weights or a closed API?",    // 40 characters or fewer
//   "variant": 3 }                              // optional whole number; leave out to derive it from the date
// Structure in beats: intro 0-2, hook word 2-6 (on screen inside the first second), three facts 6-30
// (8 beats each, something new on every beat), break 30-32, logo and ask 32-40.
// Every Reel looks and sounds different: the variant picks one of 3 palettes, 3 of 5 motifs, the colour
// order, the tempo (124/128/132 BPM) and the chord progression. Type, the travelling dot, the corner
// labels and the wordmark stay the same so the account stays recognisable.
// The score and sound effects are synthesized by score.py on the same grid, so cuts land on the beat.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const [,, inPath, outDir] = process.argv;
const R = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const here = path.dirname(new URL(import.meta.url).pathname);
if (!Array.isArray(R.facts) || R.facts.length !== 3) throw new Error('reel.json needs exactly 3 facts');

// ---------- variant ----------
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const V = Number.isInteger(R.variant) ? R.variant : hash(R.date || R.topic || 'x');
let seed = (V * 2654435761) >>> 0;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const PALETTES = [
  { name: 'ink-gold', dark: '#0c0c10', light: '#ece6d8', pop1: '#2447f9', pop2: '#f5c84c' },
  { name: 'forest-lime', dark: '#0d1f17', light: '#eef3e2', pop1: '#1f7a4d', pop2: '#c8f560' },
  { name: 'violet-coral', dark: '#120d1f', light: '#f3efe6', pop1: '#5a3af0', pop2: '#ff8a5c' },
];
const PAL = PALETTES[V % PALETTES.length];
const FG = { dark: PAL.light, light: PAL.dark, pop1: PAL.light, pop2: PAL.dark };
const DOT = { dark: PAL.pop2, light: PAL.pop1, pop1: PAL.light, pop2: PAL.dark };
const ALT = { dark: PAL.pop1, light: PAL.pop2, pop1: PAL.pop2, pop2: PAL.pop1 };   // second accent per background
const BPM = [124, 128, 132][(V >>> 2) % 3], B = 60 / BPM, BEATS = 40, TOTAL = +(BEATS * B + 0.6).toFixed(3);
const motifs = shuffle(['sphere', 'grid', 'rings', 'bars', 'orbit']).slice(0, 3);
const factBg = shuffle(pick([['light', 'dark', 'pop1'], ['light', 'pop1', 'dark'], ['dark', 'light', 'pop2']]));
const wordBg = pick(['pop2', 'pop1', 'light'].filter(k => k !== factBg[0]));
const W = 1080, H = 1920;
fs.mkdirSync(path.join(outDir, 'audio'), { recursive: true });
fs.cpSync(path.join(here, 'fonts'), path.join(outDir, 'fonts'), { recursive: true });
fs.copyFileSync(path.join(here, 'gsap.min.js'), path.join(outDir, 'gsap.min.js'));

// ---------- sound ----------
const word = String(R.word).toUpperCase().slice(0, 10);
const step = 2.5 / word.length;                         // beats between letters
const ticks = [...word].map((_, i) => +(2 + i * step).toFixed(3)).concat([4.75]);
const plan = { bpm: BPM, beats: BEATS, drop: 2, break: [30, 32], cuts: [2, 6, 14, 22, 30, 32], ticks, prog: (V >>> 4) % 3, seed: V % 1000 };
const A = f => path.join(outDir, 'audio', f);
fs.writeFileSync(A('plan.json'), JSON.stringify(plan));
execFileSync('python3', ['-I', path.join(here, 'score.py'), A('plan.json'), A('raw.wav')], { stdio: 'ignore', timeout: 180000 });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', A('raw.wav'), '-af', 'highpass=f=50,loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', A('score.wav')]);
fs.rmSync(A('raw.wav'));

// ---------- picture ----------
const esc = x => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fit = (txt, max, width, k) => Math.round(Math.min(max, width / (Math.max(1, String(txt).length) * k)));
const scenes = [
  { id: 'intro', b0: 0, b1: 2, bg: 'dark', name: 'INTRO' },
  { id: 'word', b0: 2, b1: 6, bg: wordBg, name: 'HEADLINE' },
  { id: 'f0', b0: 6, b1: 14, bg: factBg[0], name: 'FACT 1' },
  { id: 'f1', b0: 14, b1: 22, bg: factBg[1], name: 'FACT 2' },
  { id: 'f2', b0: 22, b1: 30, bg: factBg[2], name: 'FACT 3' },
  { id: 'brk', b0: 30, b1: 32, bg: 'dark', name: 'SOURCE' },
  { id: 'out', b0: 32, b1: BEATS, bg: 'dark', name: 'GYROTEX AI' },
];
const T = b => +(b * B).toFixed(4);
let js = '';
const P = s => { js += s + '\n'; };

// ----- motifs: each returns markup and registers its tweens. i = fact index, b0 = its first beat -----
const MOTIF = {
  sphere(i, b0) { const N = 150, Rr = 300; let s = '';
    for (let k = 0; k < N; k++) { const y = 1 - (k / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = k * 2.399963;
      s += `<i style="transform:translate3d(${(Math.cos(th) * r * Rr).toFixed(1)}px,${(y * Rr).toFixed(1)}px,${(Math.sin(th) * r * Rr).toFixed(1)}px)"></i>`; }
    const dir = rnd() > 0.5 ? 1 : -1;
    P(`tl.fromTo("#m${i} .sph",{rotationY:${-20 * dir},rotationX:-18},{rotationY:${230 * dir},rotationX:14,duration:${T(8)},ease:"none"},${T(b0)});`);
    P(`tl.fromTo("#m${i} .sph",{scale:.2},{scale:1,duration:.5,ease:"back.out(1.6)"},${T(b0)});`);
    for (let k = 0; k < 8; k++) P(`tl.fromTo("#m${i} .cdot",{scale:1},{scale:1.6,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${T(b0 + k)});`);
    return `<div class="persp"><div class="sph">${s}</div></div><div class="cdot"></div>`; },
  grid(i, b0) { let s = ''; for (let k = 0; k < 63; k++) s += `<i class="gd g${k % 3}"></i>`;
    P(`tl.fromTo("#m${i} .gd",{scale:0},{scale:1,duration:.35,ease:"back.out(2)",stagger:{each:.012,from:"${pick(['center', 'edges', 'start'])}",grid:[7,9]}},${T(b0)});`);
    P(`tl.fromTo("#m${i} .gd",{rotation:0,borderRadius:"50%"},{rotation:45,borderRadius:"0%",scale:2.1,duration:.4,ease:"power3.inOut",stagger:{each:.01,from:"center",grid:[7,9]}},${T(b0 + 4)});`);
    P(`tl.fromTo("#m${i} .grid",{scale:1},{scale:1.12,duration:${T(4)},ease:"sine.inOut"},${T(b0 + 4)});`);
    for (const k of [1, 2, 3]) P(`tl.fromTo("#m${i} .g${k % 3}",{scale:1},{scale:1.5,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${T(b0 + k)});`);
    for (const k of [5, 6, 7]) P(`tl.fromTo("#m${i} .g${k % 3}",{scale:2.1},{scale:2.6,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${T(b0 + k)});`);
    return `<div class="grid">${s}</div>`; },
  rings(i, b0) { let s = '';
    for (let k = 0; k < 7; k++) { const r = 60 + k * 50; s += `<svg class="rg rg${k}" viewBox="0 0 800 800" width="800" height="800"><circle cx="400" cy="400" r="${r}" fill="none" class="${k % 3 === 1 ? 'st2' : 'st1'}" stroke-width="${k % 2 ? 3 : 6}" stroke-dasharray="${20 + k * 14} ${14 + k * 9}" /></svg>`;
      P(`tl.fromTo("#m${i} .rg${k}",{rotation:${k * 25}},{rotation:${k * 25 + (k % 2 ? -1 : 1) * (120 + k * 30)},duration:${T(8)},ease:"none"},${T(b0)});`);
      P(`tl.fromTo("#m${i} .rg${k}",{scale:0},{scale:1,duration:.5,ease:"back.out(1.5)"},${(T(b0) + k * 0.04).toFixed(3)});`); }
    for (let k = 0; k < 8; k++) P(`tl.fromTo("#m${i} .cdot",{scale:1},{scale:1.6,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${T(b0 + k)});`);
    return `<div class="rings">${s}</div><div class="cdot"></div>`; },
  bars(i, b0) { const N = 11; let s = ''; for (let k = 0; k < N; k++) s += `<i class="bar b${k}${k === Math.floor(N / 2) ? ' hot' : ''}"></i>`;
    let prev = Array.from({ length: N }, () => 0.04);
    for (let k = 0; k < 8; k++) { const next = prev.map(() => +(0.15 + rnd() * 0.85).toFixed(2));
      for (let n = 0; n < N; n++) P(`tl.fromTo("#m${i} .b${n}",{scaleY:${prev[n]}},{scaleY:${next[n]},duration:${(B * 0.55).toFixed(3)},ease:"expo.out"},${T(b0 + k)});`);
      prev = next; }
    return `<div class="bars">${s}</div>`; },
  orbit(i, b0) { let s = '';
    for (let k = 0; k < 4; k++) { const d = 260 + k * 150; const dir = k % 2 ? -1 : 1;
      s += `<div class="orbw" style="width:${d}px;height:${d}px;margin:${-d / 2}px 0 0 ${-d / 2}px"><div class="orb o${k}"><i></i></div></div>`;
      P(`tl.fromTo("#m${i} .o${k}",{rotation:${k * 70}},{rotation:${k * 70 + dir * (360 + k * 90)},duration:${T(8)},ease:"none"},${T(b0)});`);
      P(`tl.fromTo("#m${i} .o${k}",{scale:0},{scale:1,duration:.5,ease:"back.out(1.4)"},${(T(b0) + k * 0.06).toFixed(3)});`); }
    for (let k = 0; k < 8; k++) P(`tl.fromTo("#m${i} .cdot",{scale:1},{scale:1.6,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${T(b0 + k)});`);
    return `<div class="orbits">${s}</div><div class="cdot"></div>`; },
};
const shards = (() => { let s = ''; for (let i = 0; i < 28; i++) { const w = 30 + rnd() * 150, h = 10 + rnd() * 26;
  s += `<i class="sh" style="width:${w.toFixed(0)}px;height:${h.toFixed(0)}px;background:${[PAL.light, PAL.pop2, PAL.pop1][i % 3]}"></i>`; } return `<div class="shards">${s}</div>`; })();
const corners = (sc, i) => `<div class="lab tl">GYROTEX AI / AI NEWS</div><div class="lab tr">0${i + 1} / 07</div><div class="lab bl">${esc(sc.name)} · ${esc(String(R.topic || '').toUpperCase().slice(0, 24))}</div><div class="lab br">${esc(String(R.date || '').toUpperCase())}</div>`;
const fact = (f, i, b0) => { const html = `<div class="motif" id="m${i}">${MOTIF[motifs[i]](i, b0)}</div><div class="txt"><div class="big" id="big${i}" style="font-size:${fit(f.big, 330, 900, 0.80)}px">${esc(f.big)}</div><div class="label" id="lb${i}">${esc(f.label)}</div><div class="note" id="nt${i}">${esc(f.note)}</div></div>`;
  P(`tl.fromTo("#big${i}",{autoAlpha:0,scale:1.35},{autoAlpha:1,scale:1,duration:.34,ease:"expo.out"},${T(b0)});`);
  P(`tl.fromTo("#lb${i}",{autoAlpha:0,x:-60},{autoAlpha:1,x:0,duration:.3,ease:"power3.out"},${T(b0 + 1)});`);
  P(`tl.fromTo("#nt${i}",{autoAlpha:0,x:-60},{autoAlpha:1,x:0,duration:.3,ease:"power3.out"},${T(b0 + 2)});`);
  for (const k of [4, 6]) P(`tl.fromTo("#big${i}",{scale:1},{scale:1.035,duration:${(B / 2).toFixed(3)},ease:"power1.out",yoyo:true,repeat:1},${T(b0 + k)});`);
  return html; };

const body = {
  intro: `<div class="mid"><div class="dot" id="d0"></div><div class="line" id="ln0"></div><div class="kick" id="k0">AI NEWS · ${esc(String(R.date || '').toUpperCase())}</div></div>`,
  word: `<div class="mid"><div class="wordrow" style="font-size:${fit(word + '.', 330, 940, 0.80)}px">${[...word].map((ch, i) => `<span class="lt" id="lt${i}">${esc(ch)}</span>`).join('')}<span class="pdot" id="pd"></span></div><div class="kick" id="k1">${esc(String(R.topic || '').toUpperCase())}</div></div>`,
  f0: fact(R.facts[0], 0, 6), f1: fact(R.facts[1], 1, 14), f2: fact(R.facts[2], 2, 22),
  brk: `<div class="mid"><div class="ring" id="rr"></div><div class="dot" id="d5"></div><div class="kick" id="k5">SOURCE · ${esc(String(R.source || '').toUpperCase())}</div></div>`,
  out: `<div class="mid">${shards}<div class="wm" id="wm">GYROTEX AI<span class="pdot" id="pd2"></span></div><div class="line" id="ln6"></div><div class="ask" id="ask">${esc(R.ask)}</div><div class="kick" id="k6">FOLLOW @GYROTEX_AI FOR DAILY AI NEWS</div></div>`,
};
// intro: the dot drops onto a line; all inside the first second
P(`tl.fromTo("#d0",{y:-900,scale:.6},{y:0,scale:1,duration:${(B * 1.5).toFixed(3)},ease:"bounce.out"},0.03);`);
P(`tl.fromTo("#ln0",{scaleX:0},{scaleX:1,duration:${(B * 0.9).toFixed(3)},ease:"power3.out"},${T(0.5)});`);
P(`tl.fromTo("#k0",{autoAlpha:0,y:20},{autoAlpha:1,y:0,duration:.25,ease:"power2.out"},${T(0.75)});`);
// hook word: one letter per tick, then the dot lands as the full stop
[...word].forEach((_, i) => P(`tl.fromTo("#lt${i}",{autoAlpha:0,y:40},{autoAlpha:1,y:0,duration:.12,ease:"power2.out"},${T(2 + i * step)});`));
P(`tl.fromTo("#pd",{scale:0},{scale:1,duration:.3,ease:"back.out(3)"},${T(4.75)});`);
P(`tl.fromTo("#k1",{autoAlpha:0,y:20},{autoAlpha:1,y:0,duration:.25,ease:"power2.out"},${T(5)});`);
// break
P(`tl.fromTo("#d5",{scale:.3},{scale:1,duration:.3,ease:"back.out(2)"},${T(30)});`);
P(`tl.fromTo("#rr",{scale:.2,autoAlpha:1},{scale:6,autoAlpha:0,duration:${T(1.9)},ease:"power2.out"},${T(30)});`);
P(`tl.fromTo("#k5",{autoAlpha:0,y:20},{autoAlpha:1,y:0,duration:.25,ease:"power2.out"},${T(30.25)});`);
P(`tl.fromTo("#d5",{scale:1},{scale:.05,duration:${(B * 0.8).toFixed(3)},ease:"power3.in"},${T(31.1)});`);
// logo resolve
for (let i = 0; i < 28; i++) { const a = rnd() * Math.PI * 2, d = 380 + rnd() * 520;
  P(`tl.fromTo(document.querySelectorAll(".sh")[${i}],{x:${(Math.cos(a) * d).toFixed(0)},y:${(Math.sin(a) * d).toFixed(0)},rotation:${(rnd() * 360).toFixed(0)},autoAlpha:1},{x:0,y:0,rotation:0,autoAlpha:0,duration:${(B * 1.2).toFixed(3)},ease:"expo.in"},${T(32 - 1.2)});`); }
P(`tl.fromTo("#wm",{autoAlpha:0,scale:1.25},{autoAlpha:1,scale:1,duration:.45,ease:"expo.out"},${T(32)});`);
P(`tl.fromTo("#pd2",{scale:0},{scale:1,duration:.35,ease:"back.out(3)"},${T(33)});`);
P(`tl.fromTo("#ln6",{scaleX:0},{scaleX:1,duration:.5,ease:"power3.out"},${T(34)});`);
P(`tl.fromTo("#ask",{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.35,ease:"power2.out"},${T(34)});`);
P(`tl.fromTo("#k6",{autoAlpha:0,y:24},{autoAlpha:1,y:0,duration:.35,ease:"power2.out"},${T(36)});`);

const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=${W}, height=${H}">
<script src="gsap.min.js"></script>
<style>
@font-face{font-family:"Archivo";font-weight:100 900;font-stretch:62% 125%;src:url("fonts/archivo-latin-wdth-normal.woff2") format("woff2")}
@font-face{font-family:"JetBrains Mono";font-weight:500;src:url("fonts/jetbrains-mono-latin-500-normal.woff2") format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${PAL.dark}}
#root{position:relative;width:100%;height:100%;font-family:"Archivo",sans-serif}
.scene{position:absolute;inset:0;overflow:hidden}
.lab{position:absolute;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:22px;letter-spacing:.08em}
.tl{left:70px;top:236px}.tr{right:70px;top:236px}.bl{left:70px;bottom:356px}.br{right:70px;bottom:356px}
.mid{position:absolute;left:70px;right:70px;top:300px;bottom:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:46px}
.motif{position:absolute;left:0;right:0;top:290px;height:690px;display:flex;align-items:center;justify-content:center}
.txt{position:absolute;left:80px;right:80px;top:1000px;bottom:440px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px}
.big{display:block;font-weight:900;font-stretch:125%;line-height:.9;letter-spacing:-.02em;transform-origin:0 70%;white-space:nowrap}
.label{display:block;font-weight:800;font-stretch:112%;font-size:62px;line-height:1.02;text-transform:uppercase}
.note{display:block;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:34px;line-height:1.3}
.dot{display:block;width:110px;height:110px;border-radius:50%;background:var(--dot)}
.cdot{position:absolute;display:block;width:72px;height:72px;border-radius:50%;background:var(--dot)}
.pdot{display:inline-block;width:.24em;height:.24em;border-radius:50%;margin-left:.06em;background:var(--dot)}
.line{display:block;width:520px;height:5px;transform-origin:50% 50%;background:var(--fg)}
.kick{display:block;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:30px;letter-spacing:.14em;text-align:center}
.wordrow{display:flex;align-items:baseline;justify-content:center;font-weight:900;font-stretch:125%;line-height:1;letter-spacing:-.02em;white-space:nowrap}
.lt{display:inline-block}
.wm{display:flex;align-items:baseline;justify-content:center;font-weight:900;font-stretch:125%;font-size:124px;line-height:1;letter-spacing:-.02em;white-space:nowrap}
.ask{display:block;font-weight:800;font-stretch:112%;font-size:54px;line-height:1.1;text-align:center;text-transform:uppercase}
.persp{perspective:1400px;width:700px;height:700px;display:flex;align-items:center;justify-content:center}
.sph{position:relative;width:0;height:0;transform-style:preserve-3d}
.sph i{position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:var(--fg)}
.grid{display:grid;grid-template-columns:repeat(9,34px);grid-auto-rows:34px;gap:52px}
.gd{display:block;width:34px;height:34px;border-radius:50%;background:var(--fg)}
.gd.g1{background:var(--dot)}.gd.g2{background:var(--alt)}
.rings{position:relative;display:block;flex:0 0 auto;width:800px;height:800px;transform-origin:50% 50%;scale:.84}
.rg{position:absolute;left:0;top:0;display:block}
.st1{stroke:var(--fg)}.st2{stroke:var(--alt)}
.bars{display:flex;align-items:flex-end;justify-content:center;gap:22px;height:600px;width:900px}
.bar{display:block;flex:0 0 54px;height:600px;border-radius:8px;background:var(--fg);transform-origin:50% 100%}
.bar.hot{background:var(--dot)}
.orbits{position:relative;display:block;flex:0 0 auto;width:720px;height:720px}
.orbw{position:absolute;left:50%;top:50%;display:block}
.orb{position:relative;display:block;width:100%;height:100%;border-radius:50%;border:3px solid var(--fg)}
.orb i{position:absolute;left:50%;top:-14px;margin-left:-14px;display:block;width:28px;height:28px;border-radius:50%;background:var(--alt)}
.ring{position:absolute;display:block;width:160px;height:160px;border-radius:50%;border:4px solid var(--dot)}
.shards{position:absolute;left:50%;top:50%;width:0;height:0}
.sh{position:absolute;display:block;left:0;top:0}
${scenes.map(sc => `#${sc.id}{background:${PAL[sc.bg]};color:${FG[sc.bg]};--fg:${FG[sc.bg]};--dot:${DOT[sc.bg]};--alt:${ALT[sc.bg]}}`).join('\n')}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
${scenes.map((sc, i) => `<div id="${sc.id}" class="clip scene" data-start="${T(sc.b0)}" data-duration="${(i === scenes.length - 1 ? TOTAL - T(sc.b0) : T(sc.b1) - T(sc.b0)).toFixed(4)}" data-track-index="1" data-layout-allow-overflow="true">${corners(sc, i)}${body[sc.id]}</div>`).join('\n')}
<audio id="score" data-start="0" data-duration="${TOTAL}" data-track-index="2" data-volume="1" src="audio/score.wav"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js}window.__timelines["main"] = tl; tl.seek(0);
</script></body></html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ id: path.basename(path.resolve(outDir)), name: R.topic || 'reel' }, null, 2));
fs.writeFileSync(path.join(outDir, 'hyperframes.json'), '{}');
console.log(JSON.stringify({ seconds: TOTAL, bpm: BPM, palette: PAL.name, motifs, wordBg, factBg, variant: V }));
