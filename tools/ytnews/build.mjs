// Narrated AI-news video for YouTube (1920x1080), in the same motion style as the Reels:
// flat colour-block scenes, hard cuts, big type, animated motifs, one travelling dot, corner labels.
// A synthetic host voice reads the script; every scene is timed to her voice; an original
// synthesized score sits underneath and ducks while she speaks.
//
// Usage: node tools/ytnews/build.mjs <episode.json> <outDir>
//        then: (cd <outDir> && npx -y hyperframes check . && npx -y hyperframes render . -q high -o ../video.mp4 --quiet)
// Also writes <outDir>/../chapters.txt, transcript.txt and thumbnail.jpg (1280x720).
//
// episode.json:
// { "date": "7 OCT 2026",
//   "host": "Jenny",                       // the host's name, shown on the opening card
//   "voice": "af_nova", "speed": 1.0,      // Kokoro voice id used for the host
//   "thumb": "1 TRILLION",                 // thumbnail text, 3 words or fewer, must not repeat the title
//   "open":  { "say": "...", "lines": ["short line per story", "...", "..."] },   // say: 10 seconds or more
//   "stories": [ { "word": "MISTRAL",                  // hook word, 10 letters or fewer
//                  "topic": "MISTRAL LARGE 4",        // corner label, 28 characters or fewer
//                  "chapter": "Mistral Large 4",      // optional chapter title; the headline is used if left out
//                  "headline": "one line, 60 characters or fewer",
//                  "say": "what the host says over the headline card",
//                  "facts": [ { "big": "1T", "label": "parameters", "note": "49 billion active at a time", "say": "..." } ],  // 2 or 3
//                  "source": "mistral.ai" } ],        // 2 to 4 stories
//   "close": { "say": "...", "ask": "Which story matters most to you?" },
//   "variant": 3 }                          // optional; otherwise derived from the date
// Write every "say" the way it is spoken: numbers as words, no symbols, short sentences.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const [,, inPath, outDir] = process.argv;
const E = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const here = path.dirname(new URL(import.meta.url).pathname), beatDir = path.join(here, '..', 'beatreel');
const parent = path.dirname(path.resolve(outDir));
const W = 1920, H = 1080, GAP = 0.4;

// ---------- variant ----------
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const V = Number.isInteger(E.variant) ? E.variant : hash('yt' + (E.date || 'x'));
let seed = (V * 2654435761) >>> 0;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const PALETTES = [
  { name: 'ink-gold', dark: '#0c0c10', light: '#ece6d8', pop1: '#2447f9', pop2: '#f5c84c' },
  { name: 'forest-lime', dark: '#0d1f17', light: '#eef3e2', pop1: '#1f7a4d', pop2: '#c8f560' },
  { name: 'violet-coral', dark: '#120d1f', light: '#f3efe6', pop1: '#5a3af0', pop2: '#ff8a5c' },
];
const PAL = PALETTES[V % PALETTES.length];
const FG = { dark: PAL.light, light: PAL.dark, pop1: PAL.light, pop2: PAL.dark };
const DOT = { dark: PAL.pop2, light: PAL.pop1, pop1: PAL.light, pop2: PAL.dark };
const ALT = { dark: PAL.pop1, light: PAL.pop2, pop1: PAL.pop2, pop2: PAL.pop1 };
const BPM = [100, 104, 108][(V >>> 2) % 3], B = 60 / BPM;
const MOTIFS = ['sphere', 'grid', 'rings', 'bars', 'orbit'];
const BGS = ['light', 'dark', 'pop1', 'pop2'];

fs.mkdirSync(path.join(outDir, 'audio'), { recursive: true });
fs.cpSync(path.join(beatDir, 'fonts'), path.join(outDir, 'fonts'), { recursive: true });
fs.copyFileSync(path.join(beatDir, 'gsap.min.js'), path.join(outDir, 'gsap.min.js'));
const A = f => path.join(outDir, 'audio', f);
const env = { ...process.env, HYPERFRAMES_TELEMETRY_DISABLED: '1' };

// ---------- scene list ----------
const esc = x => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fit = (txt, max, width, k) => Math.round(Math.min(max, width / (Math.max(1, String(txt).length) * k)));
const scenes = [];
scenes.push({ kind: 'open', say: E.open.say, bg: 'dark', name: 'TODAY', topic: 'AI NEWS' });
let lastBg = 'dark', lastMotif = '';
E.stories.forEach((st, si) => {
  let bg = pick(['pop2', 'pop1'].filter(k => k !== lastBg)); lastBg = bg;
  scenes.push({ kind: 'head', say: st.say, bg, name: `STORY ${si + 1}`, topic: st.topic, st, si });
  st.facts.forEach((f, fi) => { bg = pick(BGS.filter(k => k !== lastBg)); lastBg = bg;
    const motif = pick(MOTIFS.filter(m => m !== lastMotif)); lastMotif = motif;
    scenes.push({ kind: 'fact', say: f.say, bg, name: `STORY ${si + 1} · ${fi + 1}/${st.facts.length}`, topic: st.topic, f, motif, st }); });
});
scenes.push({ kind: 'close', say: E.close.say, bg: 'dark', name: 'GYROTEX AI', topic: 'AI NEWS' });

// ---------- voice ----------
const dur = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
let t = 0.6;                                   // short musical lead-in before the first word
scenes.forEach((s, i) => { const wav = A(`s${i}.wav`);
  if (!fs.existsSync(wav)) execFileSync('npx', ['-y', 'hyperframes', 'tts', s.say, '-v', E.voice || 'af_nova', '-s', String(E.speed || 1.0), '-o', wav], { env, stdio: 'ignore', timeout: 300000 });
  s.i = i; s.vt = +t.toFixed(3); s.vd = dur(wav); t += s.vd + GAP; });
scenes.forEach((s, i) => { s.t0 = i === 0 ? 0 : +(s.vt - GAP / 2).toFixed(3); });
const TOTAL = +(t + 1.6).toFixed(3);
scenes.forEach((s, i) => { s.d = +((i === scenes.length - 1 ? TOTAL : scenes[i + 1].t0) - s.t0).toFixed(3); });
// narration track: each line placed at its start time
const delays = scenes.map((s, k) => `[${k}]aresample=48000,adelay=${Math.round(s.vt * 1000)}:all=1[a${k}]`).join(';');
execFileSync('ffmpeg', ['-v', 'error', '-y', ...scenes.flatMap(s => ['-i', A(`s${s.i}.wav`)]), '-filter_complex',
  `${delays};${scenes.map((s, k) => `[a${k}]`).join('')}amix=inputs=${scenes.length}:normalize=0,apad=whole_dur=${TOTAL}[o]`, '-map', '[o]', '-ac', '1', '-ar', '48000', A('voice.wav')]);
// ---------- score ----------
const beats = Math.ceil(TOTAL / B);
const plan = { bpm: BPM, beats, drop: 2, break: [beats - 4, beats - 2], cuts: scenes.slice(1).map(s => +(s.t0 / B).toFixed(3)), ticks: [], prog: (V >>> 4) % 3, seed: V % 1000 };
fs.writeFileSync(A('plan.json'), JSON.stringify(plan));
execFileSync('python3', ['-I', path.join(beatDir, 'score.py'), A('plan.json'), A('music.wav')], { stdio: 'ignore', timeout: 600000 });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', A('voice.wav'), '-i', A('music.wav'), '-filter_complex',
  '[0]aformat=channel_layouts=stereo,volume=1.6,asplit=2[v][sc];[1]highpass=f=50,volume=0.30[m];[m][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=450[d];[v][d]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[o]',
  '-map', '[o]', '-ar', '48000', A('mix.wav')]);
for (const f of ['voice.wav', 'music.wav', ...scenes.map(s => `s${s.i}.wav`)]) fs.rmSync(A(f));

// ---------- picture ----------
let js = '';
const P = s => { js += s + '\n'; };
const pulses = (t0, d) => { const out = []; for (let b = Math.ceil((t0 + 0.4) / B); b * B < t0 + d - 0.3; b++) out.push(+(b * B).toFixed(3)); return out; };
const MOTIF = {
  sphere(id, t0, d) { const N = 150, Rr = 250; let s = '';
    for (let k = 0; k < N; k++) { const y = 1 - (k / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = k * 2.399963;
      s += `<i style="transform:translate3d(${(Math.cos(th) * r * Rr).toFixed(1)}px,${(y * Rr).toFixed(1)}px,${(Math.sin(th) * r * Rr).toFixed(1)}px)"></i>`; }
    const dir = rnd() > 0.5 ? 1 : -1;
    P(`tl.fromTo("#${id} .sph",{rotationY:${-20 * dir},rotationX:-18},{rotationY:${(-20 + 32 * d) * dir},rotationX:14,duration:${d},ease:"none"},${t0});`);
    P(`tl.fromTo("#${id} .sph",{scale:.2},{scale:1,duration:.5,ease:"back.out(1.6)"},${t0});`);
    pulses(t0, d).forEach(p => P(`tl.fromTo("#${id} .cdot",{scale:1},{scale:1.5,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${p});`));
    return `<div class="persp"><div class="sph">${s}</div></div><div class="cdot"></div>`; },
  grid(id, t0, d) { let s = ''; for (let k = 0; k < 63; k++) s += `<i class="gd g${k % 3}"></i>`;
    const half = +(t0 + Math.min(d / 2, 3)).toFixed(3);
    P(`tl.fromTo("#${id} .gd",{scale:0},{scale:1,duration:.35,ease:"back.out(2)",stagger:{each:.012,from:"${pick(['center', 'edges', 'start'])}",grid:[7,9]}},${t0});`);
    P(`tl.fromTo("#${id} .gd",{rotation:0,borderRadius:"50%"},{rotation:45,borderRadius:"0%",scale:2.0,duration:.4,ease:"power3.inOut",stagger:{each:.01,from:"center",grid:[7,9]}},${half});`);
    P(`tl.fromTo("#${id} .grid",{scale:1},{scale:1.1,duration:${Math.max(0.5, t0 + d - half).toFixed(3)},ease:"sine.inOut"},${half});`);
    pulses(half + 0.5, t0 + d - half - 0.5).forEach((p, n) => P(`tl.fromTo("#${id} .g${n % 3}",{scale:2.0},{scale:2.5,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${p});`));
    return `<div class="grid">${s}</div>`; },
  rings(id, t0, d) { let s = '';
    for (let k = 0; k < 7; k++) { const r = 60 + k * 50; s += `<svg class="rg rg${k}" viewBox="0 0 800 800" width="800" height="800"><circle cx="400" cy="400" r="${r}" fill="none" class="${k % 3 === 1 ? 'st2' : 'st1'}" stroke-width="${k % 2 ? 3 : 6}" stroke-dasharray="${20 + k * 14} ${14 + k * 9}" /></svg>`;
      P(`tl.fromTo("#${id} .rg${k}",{rotation:${k * 25}},{rotation:${(k * 25 + (k % 2 ? -1 : 1) * (22 + k * 5) * d).toFixed(0)},duration:${d},ease:"none"},${t0});`);
      P(`tl.fromTo("#${id} .rg${k}",{scale:0},{scale:1,duration:.5,ease:"back.out(1.5)"},${(t0 + k * 0.04).toFixed(3)});`); }
    pulses(t0, d).forEach(p => P(`tl.fromTo("#${id} .cdot",{scale:1},{scale:1.5,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${p});`));
    return `<div class="rings">${s}</div><div class="cdot"></div>`; },
  bars(id, t0, d) { const N = 11; let s = ''; for (let k = 0; k < N; k++) s += `<i class="bar b${k}${k === 5 ? ' hot' : ''}"></i>`;
    let prev = Array.from({ length: N }, () => 0.04);
    [t0 + 0.05, ...pulses(t0, d)].forEach(p => { const next = prev.map(() => +(0.15 + rnd() * 0.85).toFixed(2));
      for (let n = 0; n < N; n++) P(`tl.fromTo("#${id} .b${n}",{scaleY:${prev[n]}},{scaleY:${next[n]},duration:${(B * 0.55).toFixed(3)},ease:"expo.out"},${(+p).toFixed(3)});`);
      prev = next; });
    return `<div class="bars">${s}</div>`; },
  orbit(id, t0, d) { let s = '';
    for (let k = 0; k < 4; k++) { const dd = 220 + k * 130, dir = k % 2 ? -1 : 1;
      s += `<div class="orbw" style="width:${dd}px;height:${dd}px;margin:${-dd / 2}px 0 0 ${-dd / 2}px"><div class="orb o${k}"><i></i></div></div>`;
      P(`tl.fromTo("#${id} .o${k}",{rotation:${k * 70}},{rotation:${(k * 70 + dir * (70 + k * 18) * d).toFixed(0)},duration:${d},ease:"none"},${t0});`);
      P(`tl.fromTo("#${id} .o${k}",{scale:0},{scale:1,duration:.5,ease:"back.out(1.4)"},${(t0 + k * 0.06).toFixed(3)});`); }
    pulses(t0, d).forEach(p => P(`tl.fromTo("#${id} .cdot",{scale:1},{scale:1.5,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${p});`));
    return `<div class="orbits">${s}</div><div class="cdot"></div>`; },
};
const total2 = n => String(n).padStart(2, '0');
const corners = (s) => `<div class="lab tl">GYROTEX AI / AI NEWS</div><div class="lab tr">${total2(s.i + 1)} / ${total2(scenes.length)}</div><div class="lab bl">${esc(s.name)} · ${esc(String(s.topic || '').toUpperCase().slice(0, 28))}</div><div class="lab br">${esc(String(E.date || '').toUpperCase())}</div>`;
const inAt = (sel, at, x = 0, y = 30) => P(`tl.fromTo("${sel}",{autoAlpha:0,x:${x},y:${y}},{autoAlpha:1,x:0,y:0,duration:.35,ease:"power3.out"},${(+at).toFixed(3)});`);
const body = s => { const id = `sc${s.i}`, t0 = s.t0, d = s.d;
  if (s.kind === 'open') { const lines = E.open.lines || [];
    P(`tl.fromTo("#${id} .dot",{y:-700,scale:.6},{y:0,scale:1,duration:.8,ease:"bounce.out"},0.05);`);
    P(`tl.fromTo("#${id} .line",{scaleX:0},{scaleX:1,duration:.5,ease:"power3.out"},0.35);`);
    inAt(`#${id} .kick`, 0.6); inAt(`#${id} .host`, 0.9);
    lines.forEach((_, k) => inAt(`#${id} .ol${k}`, s.vt + (s.vd * (k + 0.6)) / (lines.length + 0.8), -60, 0));
    return `<div class="openL"><div class="dot"></div><div class="line"></div><div class="kick">AI NEWS · ${esc(String(E.date || '').toUpperCase())}</div><div class="host">with ${esc(E.host || 'Jenny')}</div></div><div class="openR">${lines.map((l, k) => `<div class="ol ol${k}"><b>${total2(k + 1)}</b><span>${esc(l)}</span></div>`).join('')}</div>`; }
  if (s.kind === 'head') { const word = String(s.st.word).toUpperCase().slice(0, 10), step = Math.min(0.09, 0.7 / word.length);
    [...word].forEach((_, k) => P(`tl.fromTo("#${id} .lt${k}",{autoAlpha:0,y:40},{autoAlpha:1,y:0,duration:.12,ease:"power2.out"},${(t0 + 0.1 + k * step).toFixed(3)});`));
    P(`tl.fromTo("#${id} .pdot",{scale:0},{scale:1,duration:.3,ease:"back.out(3)"},${(t0 + 0.15 + word.length * step).toFixed(3)});`);
    inAt(`#${id} .num`, t0 + 0.05, 0, -20); inAt(`#${id} .hl`, t0 + 1.0); inAt(`#${id} .src`, t0 + 1.6);
    pulses(t0 + 1.5, d - 1.5).forEach(p => P(`tl.fromTo("#${id} .pdot",{scale:1},{scale:1.35,duration:${(B / 2).toFixed(3)},ease:"power2.out",yoyo:true,repeat:1},${p});`));
    return `<div class="headw"><div class="num">STORY ${total2(s.si + 1)} / ${total2(E.stories.length)}</div><div class="wordrow" style="font-size:${fit(word + '.', 300, 1640, 0.80)}px">${[...word].map((ch, k) => `<span class="lt lt${k}">${esc(ch)}</span>`).join('')}<span class="pdot"></span></div><div class="hl">${esc(s.st.headline)}</div><div class="src">SOURCE · ${esc(String(s.st.source || '').toUpperCase())}</div></div>`; }
  if (s.kind === 'fact') { const f = s.f;
    P(`tl.fromTo("#${id} .big",{autoAlpha:0,scale:1.3},{autoAlpha:1,scale:1,duration:.34,ease:"expo.out"},${(t0 + 0.05).toFixed(3)});`);
    inAt(`#${id} .label`, t0 + 0.5, -60, 0); inAt(`#${id} .note`, Math.min(t0 + 1.4, t0 + d * 0.4), -60, 0);
    return `<div class="factL"><div class="big" style="font-size:${fit(f.big, 300, 860, 0.80)}px">${esc(f.big)}</div><div class="label">${esc(f.label)}</div><div class="note">${esc(f.note)}</div></div><div class="factR" id="m${s.i}">${MOTIF[s.motif](`m${s.i}`, t0, d)}</div>`; }
  // close
  let sh = ''; for (let k = 0; k < 28; k++) { const w = 30 + rnd() * 150, h = 10 + rnd() * 26, a = rnd() * Math.PI * 2, dd = 420 + rnd() * 620;
    sh += `<i class="sh sh${k}" style="width:${w.toFixed(0)}px;height:${h.toFixed(0)}px;background:${[PAL.light, PAL.pop2, PAL.pop1][k % 3]}"></i>`;
    P(`tl.fromTo("#${id} .sh${k}",{x:${(Math.cos(a) * dd).toFixed(0)},y:${(Math.sin(a) * dd).toFixed(0)},rotation:${(rnd() * 360).toFixed(0)},autoAlpha:1},{x:0,y:0,rotation:0,autoAlpha:0,duration:.6,ease:"expo.in"},${(t0 + 0.02).toFixed(3)});`); }
  P(`tl.fromTo("#${id} .wm",{autoAlpha:0,scale:1.25},{autoAlpha:1,scale:1,duration:.45,ease:"expo.out"},${(t0 + 0.6).toFixed(3)});`);
  P(`tl.fromTo("#${id} .pdot",{scale:0},{scale:1,duration:.35,ease:"back.out(3)"},${(t0 + 1.0).toFixed(3)});`);
  P(`tl.fromTo("#${id} .line",{scaleX:0},{scaleX:1,duration:.5,ease:"power3.out"},${(t0 + 1.3).toFixed(3)});`);
  inAt(`#${id} .ask`, t0 + 1.4); inAt(`#${id} .kick`, t0 + 2.2);
  return `<div class="mid"><div class="shards">${sh}</div><div class="wm">GYROTEX AI<span class="pdot"></span></div><div class="line"></div><div class="ask">${esc(E.close.ask)}</div><div class="kick">SUBSCRIBE FOR AI NEWS EVERY DAY</div></div>`; };

const sceneHtml = scenes.map(s => `<div id="sc${s.i}" class="clip scene" data-start="${s.t0}" data-duration="${s.d}" data-track-index="1" data-layout-allow-overflow="true">${corners(s)}${body(s)}</div>`).join('\n');
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
.tl{left:64px;top:52px}.tr{right:64px;top:52px}.bl{left:64px;bottom:52px}.br{right:64px;bottom:52px}
.mid{position:absolute;left:120px;right:120px;top:120px;bottom:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px}
.openL{position:absolute;left:120px;top:120px;bottom:120px;width:640px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:34px}
.openR{position:absolute;left:820px;right:120px;top:120px;bottom:120px;display:flex;flex-direction:column;justify-content:center;gap:34px}
.ol{display:flex;align-items:baseline;gap:30px;padding-bottom:30px;border-bottom:3px solid var(--fg)}
.ol b{flex:0 0 auto;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:34px;color:var(--dot)}
.ol span{flex:1;font-weight:800;font-stretch:112%;font-size:58px;line-height:1.06;text-transform:uppercase}
.host{display:block;font-weight:800;font-stretch:112%;font-size:56px;line-height:1;text-transform:uppercase}
.headw{position:absolute;left:120px;right:120px;top:130px;bottom:130px;display:flex;flex-direction:column;justify-content:center;gap:30px}
.num{display:block;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:32px;letter-spacing:.14em}
.hl{display:block;font-weight:800;font-stretch:112%;font-size:66px;line-height:1.06;text-transform:uppercase;max-width:1500px}
.src{display:block;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:28px;letter-spacing:.14em}
.factL{position:absolute;left:120px;top:130px;bottom:130px;width:900px;display:flex;flex-direction:column;justify-content:center;gap:18px}
.factR{position:absolute;left:1040px;right:60px;top:110px;bottom:110px;display:flex;align-items:center;justify-content:center}
.big{display:block;font-weight:900;font-stretch:125%;line-height:.9;letter-spacing:-.02em;transform-origin:0 70%;white-space:nowrap}
.label{display:block;font-weight:800;font-stretch:112%;font-size:70px;line-height:1.02;text-transform:uppercase}
.note{display:block;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:36px;line-height:1.3}
.dot{display:block;width:110px;height:110px;border-radius:50%;background:var(--dot)}
.cdot{position:absolute;display:block;width:64px;height:64px;border-radius:50%;background:var(--dot)}
.pdot{display:inline-block;width:.24em;height:.24em;border-radius:50%;margin-left:.06em;background:var(--dot)}
.line{display:block;width:520px;height:5px;transform-origin:0 50%;background:var(--fg)}
.mid .line{transform-origin:50% 50%}
.kick{display:block;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:30px;letter-spacing:.14em}
.wordrow{display:flex;align-items:baseline;font-weight:900;font-stretch:125%;line-height:1;letter-spacing:-.02em;white-space:nowrap}
.lt{display:inline-block}
.wm{display:flex;align-items:baseline;justify-content:center;font-weight:900;font-stretch:125%;font-size:190px;line-height:1;letter-spacing:-.02em;white-space:nowrap}
.ask{display:block;font-weight:800;font-stretch:112%;font-size:64px;line-height:1.1;text-align:center;text-transform:uppercase}
.persp{perspective:1400px;width:600px;height:600px;display:flex;align-items:center;justify-content:center}
.sph{position:relative;width:0;height:0;transform-style:preserve-3d}
.sph i{position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;background:var(--fg)}
.grid{display:grid;grid-template-columns:repeat(9,30px);grid-auto-rows:30px;gap:44px}
.gd{display:block;width:30px;height:30px;border-radius:50%;background:var(--fg)}
.gd.g1{background:var(--dot)}.gd.g2{background:var(--alt)}
.rings{position:relative;display:block;flex:0 0 auto;width:800px;height:800px;transform-origin:50% 50%;scale:.86}
.rg{position:absolute;left:0;top:0;display:block}
.st1{stroke:var(--fg)}.st2{stroke:var(--alt)}
.bars{display:flex;align-items:flex-end;justify-content:center;gap:18px;height:560px;width:740px}
.bar{display:block;flex:0 0 46px;height:560px;border-radius:8px;background:var(--fg);transform-origin:50% 100%}
.bar.hot{background:var(--dot)}
.orbits{position:relative;display:block;flex:0 0 auto;width:640px;height:640px}
.orbw{position:absolute;left:50%;top:50%;display:block}
.orb{position:relative;display:block;width:100%;height:100%;border-radius:50%;border:3px solid var(--fg)}
.orb i{position:absolute;left:50%;top:-14px;margin-left:-14px;display:block;width:28px;height:28px;border-radius:50%;background:var(--alt)}
.shards{position:absolute;left:50%;top:50%;width:0;height:0}
.sh{position:absolute;display:block;left:0;top:0}
${scenes.map(s => `#sc${s.i}{background:${PAL[s.bg]};color:${FG[s.bg]};--fg:${FG[s.bg]};--dot:${DOT[s.bg]};--alt:${ALT[s.bg]}}`).join('\n')}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
${sceneHtml}
<audio id="mix" data-start="0" data-duration="${TOTAL}" data-track-index="2" data-volume="1" src="audio/mix.wav"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js}window.__timelines["main"] = tl; tl.seek(0);
</script></body></html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ id: path.basename(path.resolve(outDir)), name: 'AI news ' + (E.date || '') }, null, 2));
fs.writeFileSync(path.join(outDir, 'hyperframes.json'), '{}');

// ---------- chapters, transcript, thumbnail ----------
const ts = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const heads = scenes.filter(s => s.kind === 'head');
const chapters = [`0:00 Today's headlines`, ...heads.map(s => `${ts(s.t0)} ${s.st.chapter || s.st.headline}`)];
const warn = [];
if (heads.length && heads[0].t0 < 10) warn.push(`opening is ${heads[0].t0.toFixed(1)}s; YouTube needs every chapter to be 10 seconds or longer, so lengthen open.say`);
if (chapters.length < 3) warn.push('fewer than 3 chapters; YouTube will not show them');
fs.writeFileSync(path.join(parent, 'chapters.txt'), chapters.join('\n') + '\n');
fs.writeFileSync(path.join(parent, 'transcript.txt'), scenes.map(s => `[${ts(s.vt)}] ${s.say}`).join('\n') + '\n');
const thumb = String(E.thumb || '').toUpperCase(), tw = thumb.split(/\s+/).filter(Boolean);
const thtml = `<!doctype html><html><head><meta charset="UTF-8"><style>
@font-face{font-family:"Archivo";font-weight:100 900;font-stretch:62% 125%;src:url("fonts/archivo-latin-wdth-normal.woff2") format("woff2")}
@font-face{font-family:"JetBrains Mono";font-weight:500;src:url("fonts/jetbrains-mono-latin-500-normal.woff2") format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1280px;height:720px;overflow:hidden;background:${PAL.pop2}}
#t{position:relative;width:1280px;height:720px;background:${PAL.pop2};color:${PAL.dark};font-family:"Archivo",sans-serif}
.k{position:absolute;left:60px;top:44px;font-family:"JetBrains Mono",monospace;font-size:30px;letter-spacing:.12em}
.w{position:absolute;left:60px;right:60px;top:110px;bottom:70px;display:flex;flex-direction:column;justify-content:center;font-weight:900;font-stretch:125%;line-height:.9;letter-spacing:-.02em;text-transform:uppercase}
.w div{white-space:nowrap}.d{display:inline-block;width:.24em;height:.24em;border-radius:50%;background:${PAL.pop1};margin-left:.06em}
.b{position:absolute;right:60px;bottom:44px;font-weight:900;font-stretch:125%;font-size:40px}
</style></head><body><div id="t"><div class="k">AI NEWS · ${esc(String(E.date || '').toUpperCase())}</div>
<div class="w">${tw.map((x, k) => `<div style="font-size:${fit(x + (k === tw.length - 1 ? '.' : ''), tw.length > 2 ? 190 : 270, 1160, 0.80)}px">${esc(x)}${k === tw.length - 1 ? '<span class="d"></span>' : ''}</div>`).join('')}</div>
<div class="b">GYROTEX AI</div></div></body></html>`;
fs.writeFileSync(path.join(outDir, 'thumb.html'), thtml);
try { execFileSync('/opt/pw-browsers/chromium', ['--headless', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1280,870', '--virtual-time-budget=2000', `--screenshot=${path.join(outDir, 'thumb.png')}`, `file://${path.resolve(outDir)}/thumb.html`], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(outDir, 'thumb.png'), '-vf', 'crop=1280:720:0:0', '-q:v', '2', path.join(parent, 'thumbnail.jpg')]); fs.rmSync(path.join(outDir, 'thumb.png')); } catch (e) { warn.push('thumbnail not built: ' + String(e.message).split('\n')[0]); }
console.log(JSON.stringify({ seconds: TOTAL, scenes: scenes.length, bpm: BPM, palette: PAL.name, chapters, warnings: warn }));
