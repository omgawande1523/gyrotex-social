// Narrated AI-news explainer for YouTube (1920x1080), in the "explainer card" format Om approved:
// one flat pastel colour per section with a fast pan between sections, the sentence building word by
// word on the left in time with the voice (key words boxed in a highlight colour), a white outlined
// card on the right that fills in as the host talks, the host's voice badge bottom-left, and small
// mono labels with a running timecode in the corners. An original synthesized score sits underneath
// and ducks while she speaks.
//
// Usage: node tools/ytnews/build.mjs <episode.json> <outDir>
//        then: (cd <outDir> && npx -y hyperframes check . && npx -y hyperframes render . -q high -o ../video.mp4 --quiet)
// Also writes <outDir>/../chapters.txt, transcript.txt and thumbnail.jpg (1280x720).
//
// episode.json:
// { "date": "7 OCT 2026",
//   "host": "Jenny", "voice": "af_heart", "speed": 1.0,     // Kokoro voice id used for the host
//   "thumb": "1 *trillion*",                                // thumbnail text, 3 words or fewer; *word* is boxed
//   "sections": [
//     { "kind": "open",                                     // first section; must run 10 seconds or longer
//       "label": "today",                                   // corner label, 24 characters or fewer, lower case
//       "card": { "type": "list", "title": "AI NEWS · 7 OCT", "rows": ["...", "...", "..."] },
//       "beats": [ { "say": "what the host says", "text": "What appears, with *key words* boxed" } ] },
//     { "kind": "story", "label": "mistral large 4",
//       "chapter": "Mistral Large 4",                       // only on the first section of each story
//       "source": "mistral.ai",
//       "card": { "type": "stat", "title": "MISTRAL LARGE 4", "big": "1T", "sub": "parameters",
//                 "rows": [["active at a time", "49B"]] },
//       "beats": [ ... ] },                                 // 2 to 4 beats per section
//     { "kind": "close", "label": "see you tomorrow", "button": "Subscribe for daily AI news", "beats": [ ... ] } ],
//   "variant": 3 }                                          // optional; otherwise derived from the date
//
// Cards (the right-hand panel). Parts appear one per beat, in order; extra parts arrive on the last beat.
//   stat: { title, big (7 characters or fewer), sub, rows: [[label, value], ...] }      parts: big, then each row
//   bars: { title, rows: [{ k, v, pct (0-100), hot? }] }                                parts: each row
//   list: { title, rows: ["...", ...], mark: "num" | "tick" }                           parts: each row
//   Optional "at": [beat index for each part] puts a part on the beat where the host says it, e.g. "at": [2, 2, 3].
// Beats: "say" is written the way it is spoken (numbers as words, no symbols, one short sentence).
//        "text" is the short on-screen version, 60 characters or fewer.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const [,, inPath, outDir] = process.argv;
const E = JSON.parse(fs.readFileSync(inPath, 'utf8'));
const here = path.dirname(new URL(import.meta.url).pathname), beatDir = path.join(here, '..', 'beatreel');
const parent = path.dirname(path.resolve(outDir));
const W = 1920, H = 1080, BEAT_GAP = 0.22, SEC_GAP = 0.55, PAN = 0.32, FPS_LV = 15;
const warn = [];

// ---------- variant and colours ----------
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const V = Number.isInteger(E.variant) ? E.variant : hash('yt' + (E.date || 'x'));
const INK = '#141414', CREAM = '#f4f1e8', ACC = '#ff6a2b', YEL = '#f6ee55';
const BG = { cream: CREAM, peach: '#ffb98a', peri: '#93a8f4', yellow: '#f3ea4f', mint: '#84e3bd', sky: '#84c4fa', lilac: '#c6adf7', ink: INK };
const HL = { cream: ACC, peach: YEL, peri: ACC, yellow: ACC, mint: YEL, sky: YEL, lilac: YEL, ink: ACC };
const CYCLE = ['peach', 'peri', 'yellow', 'mint', 'sky', 'lilac', 'ink'];
const BPM = [96, 100, 104][(V >>> 2) % 3], B = 60 / BPM;

fs.mkdirSync(path.join(outDir, 'audio'), { recursive: true });
fs.cpSync(path.join(beatDir, 'fonts'), path.join(outDir, 'fonts'), { recursive: true });
fs.copyFileSync(path.join(beatDir, 'gsap.min.js'), path.join(outDir, 'gsap.min.js'));
const A = f => path.join(outDir, 'audio', f);
const env = { ...process.env, HYPERFRAMES_TELEMETRY_DISABLED: '1' };
const esc = x => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const two = n => String(n).padStart(2, '0');

// ---------- sections ----------
const S = E.sections;
if (!S?.length || S[0].kind !== 'open') throw new Error('sections must start with a kind "open" section');
let ci = V % CYCLE.length;
S.forEach((s, i) => { s.i = i; s.bg = s.kind === 'story' ? CYCLE[ci++ % CYCLE.length] : 'cream';
  if (!s.beats?.length) throw new Error(`section ${i} has no beats`);
  s.beats.forEach(b => { if (String(b.text).replace(/\*/g, '').length > 60) warn.push(`section ${i}: on-screen text over 60 characters: "${b.text}"`); }); });

// ---------- voice ----------
const dur = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const voice = E.voice || 'af_heart', speed = String(E.speed || 1.0);
let t = 0.7; const clips = [];
S.forEach((s, i) => { if (i) t += SEC_GAP - BEAT_GAP; s.t0 = i === 0 ? 0 : +(t - 0.3).toFixed(3);
  s.beats.forEach(b => { const wav = A(`v${hash(voice + speed + b.say).toString(36)}.wav`);
    if (!fs.existsSync(wav)) execFileSync('npx', ['-y', 'hyperframes', 'tts', b.say, '-v', voice, '-s', speed, '-o', wav], { env, stdio: 'ignore', timeout: 300000 });
    b.vt = +t.toFixed(3); b.vd = dur(wav); clips.push({ wav, at: b.vt }); t += b.vd + BEAT_GAP; }); });
const TOTAL = +(t + 1.8).toFixed(3);
S.forEach((s, i) => { s.end = i === S.length - 1 ? TOTAL : S[i + 1].t0; s.d = +(s.end - s.t0 + (i === S.length - 1 ? 0 : PAN)).toFixed(3);
  s.beats.forEach((b, k) => { b.end = k === s.beats.length - 1 ? s.end + PAN : s.beats[k + 1].vt - 0.06; }); });
const delays = clips.map((c, k) => `[${k}]aresample=48000,adelay=${Math.round(c.at * 1000)}:all=1[a${k}]`).join(';');
execFileSync('ffmpeg', ['-v', 'error', '-y', ...clips.flatMap(c => ['-i', c.wav]), '-filter_complex',
  `${delays};${clips.map((c, k) => `[a${k}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad=whole_dur=${TOTAL}[o]`, '-map', '[o]', '-ac', '1', '-ar', '48000', A('voice.wav')], { maxBuffer: 1 << 26 });
// voice level, FPS_LV times a second, drives the host badge
const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', A('voice.wav'), '-f', 's16le', '-ac', '1', '-ar', '8000', '-'], { maxBuffer: 1 << 28 });
const step = Math.round(8000 / FPS_LV), lv = [];
for (let o = 0; o + step * 2 <= pcm.length; o += step * 2) { let sum = 0; for (let k = 0; k < step; k++) { const x = pcm.readInt16LE(o + k * 2) / 32768; sum += x * x; } lv.push(Math.sqrt(sum / step)); }
const peak = Math.max(...lv, 1e-4); const LV = lv.map(x => +Math.min(1, Math.pow(x / peak, 0.6) * 1.15).toFixed(2));

// ---------- score ----------
const beats = Math.ceil(TOTAL / B);
const plan = { bpm: BPM, beats, drop: 2, break: [beats - 4, beats - 2], cuts: S.slice(1).map(s => +(s.t0 / B).toFixed(3)), ticks: [], prog: (V >>> 4) % 3, seed: V % 1000 };
fs.writeFileSync(A('plan.json'), JSON.stringify(plan));
execFileSync('python3', ['-I', path.join(beatDir, 'score.py'), A('plan.json'), A('music.wav')], { stdio: 'ignore', timeout: 600000 });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', A('voice.wav'), '-i', A('music.wav'), '-filter_complex',
  '[0]aformat=channel_layouts=stereo,volume=1.6,asplit=2[v][sc];[1]highpass=f=50,volume=0.22[m];[m][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=450[d];[v][d]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[o]',
  '-map', '[o]', '-ar', '48000', A('mix.wav')]);
for (const f of fs.readdirSync(path.join(outDir, 'audio'))) if (f !== 'mix.wav') fs.rmSync(A(f));

// ---------- picture ----------
let js = '';
const P = s => { js += s + '\n'; };
const n3 = x => (+x).toFixed(3);
const show = (sel, at, x = 0, y = 24, d = 0.3) => P(`tl.fromTo("${sel}",{autoAlpha:0,x:${x},y:${y}},{autoAlpha:1,x:0,y:0,duration:${d},ease:"power3.out"},${n3(at)});`);
const size = len => len <= 12 ? 150 : len <= 24 ? 124 : len <= 40 ? 104 : len <= 60 ? 86 : 72;
const tokens = text => String(text).split(/(\*[^*]+\*)/).flatMap(p => p.startsWith('*') ? [{ w: p.slice(1, -1), h: 1 }] : p.split(/\s+/).filter(Boolean).map(w => ({ w, h: 0 })));
// one beat's text: words appear across the spoken line, then the block is hidden when the next beat starts
const beatText = (s, b, k, cls = 'bt') => { const tk = tokens(b.text), id = `s${s.i}b${k}`, plain = tk.map(x => x.w).join(' ');
  const tot = tk.reduce((a, x) => a + x.w.length + 1, 0), win = Math.max(0.3, b.vd * 0.72); let acc = 0;
  tk.forEach((x, j) => { const at = b.vt + 0.04 + win * (acc / tot); acc += x.w.length + 1;
    P(`tl.fromTo("#${id} .w${j}",{autoAlpha:0,y:22},{autoAlpha:1,y:0,duration:.16,ease:"power2.out"},${n3(at)});`); });
  if (k < s.beats.length - 1) P(`tl.set("#${id}",{autoAlpha:0},${n3(b.end)});`);
  return `<div class="${cls}" id="${id}" style="font-size:${cls === 'bt' ? size(plain.length) : 64}px">${tk.map((x, j) => `<span class="w w${j}${x.h ? ' h' : ''}">${esc(x.w)}</span>`).join(' ')}</div>`; };
// when card part j arrives
const partAt = (s, j) => { const nb = s.beats.length, given = Number.isInteger(s.card.at?.[j]), k = Math.min(given ? s.card.at[j] : j, nb - 1), extra = given ? 0 : j - k; return s.beats[k].vt + (k === 0 ? 0.25 : 0.1) + extra * 0.35; };
const CARD = {
  stat(s, c, id) { const rows = c.rows || [];
    P(`tl.fromTo("#${id} .big",{autoAlpha:0,scale:.6},{autoAlpha:1,scale:1,duration:.4,ease:"back.out(1.8)"},${n3(partAt(s, 0))});`);
    show(`#${id} .sub`, partAt(s, 0) + 0.15, 0, 16);
    rows.forEach((_, j) => show(`#${id} .r${j}`, partAt(s, j + 1), 40, 0));
    return `<div class="big" style="font-size:${Math.round(Math.min(230, 700 / (Math.max(2, String(c.big).length) * 0.62)))}px">${esc(c.big)}</div><div class="sub">${esc(c.sub)}</div><div class="rows">${rows.map((r, j) => `<div class="row r${j}"><span>${esc(r[0])}</span><i></i><b>${esc(r[1])}</b></div>`).join('')}</div>`; },
  bars(s, c, id) { const rows = c.rows || [];
    rows.forEach((r, j) => { const at = partAt(s, j); show(`#${id} .r${j}`, at, 0, 20);
      P(`tl.fromTo("#${id} .r${j} .fill",{scaleX:0},{scaleX:${(Math.max(4, Math.min(100, r.pct)) / 100).toFixed(3)},duration:.7,ease:"power3.out"},${n3(at + 0.1)});`); });
    return `<div class="brs">${rows.map((r, j) => `<div class="br r${j}"><div class="bk"><span>${esc(r.k)}</span><b>${esc(r.v)}</b></div><div class="track"><div class="fill${r.hot ? ' hot' : ''}"></div></div></div>`).join('')}</div>`; },
  list(s, c, id) { const rows = c.rows || [];
    rows.forEach((_, j) => { const at = partAt(s, j); show(`#${id} .r${j}`, at, 40, 0);
      P(`tl.fromTo("#${id} .r${j} .mk",{scale:0},{scale:1,duration:.3,ease:"back.out(3)"},${n3(at + 0.12)});`); });
    return `<div class="lst">${rows.map((r, j) => `<div class="li r${j}"><span class="mk">${c.mark === 'tick' ? '✓' : two(j + 1)}</span><span class="lt">${esc(r)}</span></div>`).join('')}</div>`; },
};
const deco = (s) => { let o = ''; const spots = [[930, 96], [1010, 960], [1790, 990]];
  spots.forEach(([x, y], k) => { const id = `d${s.i}_${k}`, r = (hash(id) % 40) - 20;
    P(`tl.fromTo("#${id}",{y:0,rotation:${r}},{y:${k % 2 ? 26 : -26},rotation:${r + (k % 2 ? 50 : -50)},duration:${n3(s.d)},ease:"sine.inOut"},${n3(s.t0)});`);
    o += `<div class="deco dk${k % 3}" id="${id}" style="left:${x}px;top:${y}px"></div>`; });
  return o; };
const sceneHtml = S.map((s, i) => { const id = `sc${i}`, fg = s.bg === 'ink' ? CREAM : INK;
  if (i > 0) { P(`tl.fromTo("#${id} .wrap",{x:${W}},{x:0,duration:${PAN},ease:"power3.inOut"},${n3(s.t0)});`);
    P(`tl.fromTo("#sc${i - 1} .wrap",{x:0},{x:${-W},duration:${PAN},ease:"power3.inOut",immediateRender:false},${n3(s.t0)});`); }
  P(`tl.set("#tc",{color:"${fg}"},${n3(s.t0 + PAN / 2)});`);
  const label = `<div class="lab tl">// ${two(i + 1)} · ${esc(String(s.label || s.kind).toLowerCase().slice(0, 24))}</div>` +
    `<div class="lab brc">${s.source ? 'SOURCE · ' + esc(String(s.source).toUpperCase()) + ' &nbsp;/&nbsp; ' : ''}${esc(String(E.date || '').toUpperCase())}</div>`;
  let inner;
  if (s.kind === 'close') {
    P(`tl.fromTo("#${id} .wm",{autoAlpha:0,scale:.7},{autoAlpha:1,scale:1,duration:.5,ease:"back.out(1.6)"},${n3(s.t0 + PAN)});`);
    const last = s.beats[s.beats.length - 1];
    P(`tl.fromTo("#${id} .btn",{autoAlpha:0,y:30,scale:.9},{autoAlpha:1,y:0,scale:1,duration:.4,ease:"back.out(2)"},${n3(last.vt + last.vd * 0.5)});`);
    inner = `<div class="closew"><div class="wm">Gyrotex AI<span class="pd"></span></div><div class="cts">${s.beats.map((b, k) => beatText(s, b, k, 'ct')).join('')}</div><div class="btn">${esc(s.button || 'Subscribe for daily AI news')}</div></div>`;
  } else { const c = s.card, cid = `c${i}`, rot = (i % 2 ? 1 : -1) * (0.8 + (hash(id) % 8) / 10);
    P(`tl.fromTo("#${cid}",{autoAlpha:0,y:80,rotation:${rot * 4}},{autoAlpha:1,y:0,rotation:${rot},duration:.5,ease:"back.out(1.4)"},${n3(s.t0 + (i ? PAN * 0.6 : 0.3))});`);
    inner = `<div class="left">${s.beats.map((b, k) => beatText(s, b, k)).join('')}</div>` +
      `<div class="cardw"><div class="card ${c.type}" id="${cid}"><div class="ch"><span>${esc(c.title)}</span>${s.source ? `<em>${esc(s.source)}</em>` : ''}</div>${CARD[c.type](s, c, cid)}</div></div>`; }
  return `<div id="${id}" class="clip scene" data-start="${s.t0}" data-duration="${s.d}" data-track-index="${1 + (i % 2)}" data-layout-allow-overflow="true"><div class="wrap">${label}${deco(s)}${inner}</div></div>`; }).join('\n');
// host badge: five bars that follow the voice level
let prev = 0;
LV.forEach((v, k) => { if (v === prev) return; P(`tl.fromTo("#host",{"--lv":${prev}},{"--lv":${v},duration:${n3(1 / FPS_LV)},ease:"none"},${n3(k / FPS_LV)});`); prev = v; });
show('#host', 0.15, 0, 60, 0.5);

const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=${W}, height=${H}">
<script src="gsap.min.js"></script>
<style>
@font-face{font-family:"Archivo";font-weight:100 900;font-stretch:62% 125%;src:url("fonts/archivo-latin-wdth-normal.woff2") format("woff2")}
@font-face{font-family:"JetBrains Mono";font-weight:500;src:url("fonts/jetbrains-mono-latin-500-normal.woff2") format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${CREAM}}
#root{position:relative;width:100%;height:100%;font-family:"Archivo",sans-serif;color:${INK}}
.scene{position:absolute;inset:0;overflow:hidden}
.wrap{position:absolute;inset:0;background:var(--bg);color:var(--fg)}
.lab{position:absolute;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:24px;letter-spacing:.04em}
.tl{left:124px;top:126px}.brc{right:124px;bottom:60px;font-size:20px;letter-spacing:.1em}
#over{position:absolute;inset:0}
#tc{position:absolute;right:124px;top:126px;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:24px;letter-spacing:.06em;color:${INK}}
.left{position:absolute;left:124px;top:250px;width:800px;height:500px}
.bt{position:absolute;left:0;top:0;width:800px;font-weight:500;line-height:1.08;letter-spacing:-.035em}
.w{display:inline-block}
.w.h{background:var(--hl);color:${INK};padding:0 .1em;margin:0 -.04em}
.cardw{position:absolute;left:960px;right:110px;top:150px;bottom:150px;display:flex;align-items:center;justify-content:center}
.card{position:relative;width:820px;padding:44px 48px 50px;background:#fff;color:${INK};border:6px solid ${INK};border-radius:22px;box-shadow:14px 14px 0 ${INK}}
.wrap.ink .card{box-shadow:14px 14px 0 ${ACC}}
.ch{display:flex;align-items:center;justify-content:space-between;gap:20px;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:26px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:26px}
.ch em{font-style:normal;flex:0 0 auto;padding:8px 18px;border-radius:99px;background:${INK};color:#fff;font-size:20px;text-transform:none;letter-spacing:.04em}
.big{display:block;font-weight:700;line-height:.95;letter-spacing:-.04em;transform-origin:0 60%;white-space:nowrap}
.sub{display:block;font-weight:600;font-size:44px;line-height:1.1;letter-spacing:-.02em;margin-top:10px}
.rows{display:flex;flex-direction:column;gap:18px;margin-top:34px}
.row{display:flex;align-items:baseline;gap:16px;font-family:"JetBrains Mono",monospace;font-weight:500;font-size:30px}
.row i{flex:1;border-bottom:3px dotted ${INK};transform:translateY(-6px)}
.row b{font-weight:500;padding:4px 14px;border-radius:8px;background:var(--hl)}
.brs{display:flex;flex-direction:column;gap:30px}
.bk{display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin-bottom:12px}
.bk span{font-weight:600;font-size:38px;letter-spacing:-.02em}
.bk b{font-family:"JetBrains Mono",monospace;font-weight:500;font-size:32px}
.track{height:54px;border:5px solid ${INK};border-radius:12px;overflow:hidden;background:#fff}
.fill{display:block;width:100%;height:100%;background:${INK};transform-origin:0 50%}
.fill.hot{background:${ACC}}
.lst{display:flex;flex-direction:column}
.li{display:flex;align-items:center;gap:28px;padding:26px 0;border-top:4px solid ${INK}}
.mk{flex:0 0 70px;height:70px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--hl);border:5px solid ${INK};font-family:"JetBrains Mono",monospace;font-weight:500;font-size:28px}
.lt{flex:1;font-weight:600;font-size:46px;line-height:1.08;letter-spacing:-.025em}
.deco{position:absolute;display:block}
.dk0{width:44px;height:44px;border-radius:50%;border:8px solid var(--fg)}
.dk1{width:40px;height:40px;background:var(--hl);border:6px solid var(--fg)}
.dk2{width:46px;height:12px;border-radius:6px;background:var(--fg)}
.closew{position:absolute;left:300px;right:300px;top:150px;bottom:170px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px}
.wm{display:flex;align-items:baseline;font-weight:700;font-size:210px;line-height:1;letter-spacing:-.05em;white-space:nowrap}
.pd{display:inline-block;width:.2em;height:.2em;border-radius:50%;margin-left:.05em;background:${ACC}}
.cts{position:relative;width:1320px;height:80px}
.ct{position:absolute;left:0;top:0;width:1320px;text-align:center;font-weight:500;line-height:1.15;letter-spacing:-.03em;white-space:nowrap}
.btn{display:block;padding:22px 44px;border:5px solid ${INK};border-radius:14px;background:${ACC};box-shadow:8px 8px 0 ${INK};font-weight:600;font-size:38px;letter-spacing:-.01em}
#host{--lv:0;position:absolute;left:110px;bottom:60px;display:flex;align-items:flex-end;gap:22px}
.disc{width:210px;height:210px;border-radius:50%;background:#fff;border:7px solid ${INK};box-shadow:8px 8px 0 ${INK};display:flex;align-items:center;justify-content:center;gap:13px}
.disc i{display:block;width:20px;height:120px;border-radius:10px;background:${INK}}
.disc i:nth-child(1){transform:scaleY(calc(.14 + var(--lv) * .45))}
.disc i:nth-child(2){transform:scaleY(calc(.18 + var(--lv) * .8))}
.disc i:nth-child(3){background:${ACC};transform:scaleY(calc(.22 + var(--lv) * .78))}
.disc i:nth-child(4){transform:scaleY(calc(.18 + var(--lv) * .62))}
.disc i:nth-child(5){transform:scaleY(calc(.14 + var(--lv) * .35))}
.tag{margin-bottom:14px;padding:8px 15px;border-radius:99px;background:#fff;color:${INK};border:4px solid ${INK};font-family:"JetBrains Mono",monospace;font-weight:500;font-size:19px;letter-spacing:.1em;white-space:nowrap}
${S.map(s => `#sc${s.i} .wrap{--bg:${BG[s.bg]};--fg:${s.bg === 'ink' ? CREAM : INK};--hl:${HL[s.bg]}}`).join('\n')}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="${W}" data-height="${H}">
${sceneHtml}
<div id="over" class="clip" data-start="0" data-duration="${TOTAL}" data-track-index="3" data-layout-allow-overflow="true">
<div id="tc">GYROTEX AI &nbsp; <span id="tcv">00:00:00:00</span></div>
<div id="host"><div class="disc"><i></i><i></i><i></i><i></i><i></i></div><div class="tag">${esc(String(E.host || 'Jenny').toUpperCase())} · AI VOICE</div></div>
</div>
<audio id="mix" data-start="0" data-duration="${TOTAL}" data-track-index="4" data-volume="1" src="audio/mix.wav"></audio>
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js}const clock = { v: 0 }, tcv = document.getElementById("tcv"), p2 = n => String(n).padStart(2, "0");
tl.fromTo(clock, { v: 0 }, { v: ${TOTAL}, duration: ${TOTAL}, ease: "none", onUpdate: () => { const f = Math.floor(clock.v * 30); tcv.textContent = "00:" + p2(Math.floor(f / 1800)) + ":" + p2(Math.floor(f / 30) % 60) + ":" + p2(f % 30); } }, 0);
window.__timelines["main"] = tl; tl.seek(0);
</script></body></html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ id: path.basename(path.resolve(outDir)), name: 'AI news ' + (E.date || '') }, null, 2));
fs.writeFileSync(path.join(outDir, 'hyperframes.json'), '{}');

// ---------- chapters, transcript, thumbnail ----------
const ts = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const heads = S.filter(s => s.chapter);
const chapters = [`0:00 Today's headlines`, ...heads.map(s => `${ts(s.t0)} ${s.chapter}`)];
if (heads.length && heads[0].t0 < 10) warn.push(`opening is ${heads[0].t0.toFixed(1)}s; YouTube needs every chapter to be 10 seconds or longer, so lengthen the open section`);
heads.forEach((s, k) => { const nx = heads[k + 1]?.t0 ?? TOTAL; if (nx - s.t0 < 10) warn.push(`chapter "${s.chapter}" is under 10 seconds`); });
if (chapters.length < 3) warn.push('fewer than 3 chapters; YouTube will not show them');
fs.writeFileSync(path.join(parent, 'chapters.txt'), chapters.join('\n') + '\n');
fs.writeFileSync(path.join(parent, 'transcript.txt'), S.flatMap(s => s.beats.map(b => `[${ts(b.vt)}] ${b.say}`)).join('\n') + '\n');
const tk = tokens(String(E.thumb || '')), tlen = tk.map(x => x.w).join(' ').length;
const first = S.find(s => s.kind === 'story');
const thtml = `<!doctype html><html><head><meta charset="UTF-8"><style>
@font-face{font-family:"Archivo";font-weight:100 900;font-stretch:62% 125%;src:url("fonts/archivo-latin-wdth-normal.woff2") format("woff2")}
@font-face{font-family:"JetBrains Mono";font-weight:500;src:url("fonts/jetbrains-mono-latin-500-normal.woff2") format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1280px;height:720px;overflow:hidden;background:${BG[first?.bg || 'peri']}}
#t{position:relative;width:1280px;height:720px;background:${BG[first?.bg || 'peri']};color:${INK};font-family:"Archivo",sans-serif}
.k{position:absolute;left:64px;top:52px;font-family:"JetBrains Mono",monospace;font-size:28px;letter-spacing:.06em}
.w{position:absolute;left:64px;right:64px;top:120px;bottom:200px;display:flex;flex-wrap:wrap;align-content:center;gap:0 .22em;font-weight:700;line-height:1.02;letter-spacing:-.045em;font-size:${Math.round(Math.min(250, 1150 / (Math.max(5, tlen) * 0.5)))}px}
.w span.h{background:${HL[first?.bg || 'peri']};padding:0 .1em}
.disc{position:absolute;left:64px;bottom:50px;width:140px;height:140px;border-radius:50%;background:#fff;border:6px solid ${INK};box-shadow:6px 6px 0 ${INK};display:flex;align-items:center;justify-content:center;gap:9px}
.disc i{display:block;width:13px;border-radius:7px;background:${INK}}
.b{position:absolute;right:64px;bottom:60px;font-weight:700;font-size:54px;letter-spacing:-.04em}
</style></head><body><div id="t"><div class="k">// ai news · ${esc(String(E.date || '').toLowerCase())}</div>
<div class="w">${tk.map(x => `<span class="${x.h ? 'h' : ''}">${esc(x.w)}</span>`).join('')}</div>
<div class="disc"><i style="height:34px"></i><i style="height:70px"></i><i style="height:92px;background:${ACC}"></i><i style="height:56px"></i><i style="height:28px"></i></div>
<div class="b">Gyrotex AI</div></div></body></html>`;
fs.writeFileSync(path.join(outDir, 'thumb.html'), thtml);
try { execFileSync('/opt/pw-browsers/chromium', ['--headless', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1280,870', '--virtual-time-budget=2000', `--screenshot=${path.join(outDir, 'thumb.png')}`, `file://${path.resolve(outDir)}/thumb.html`], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(outDir, 'thumb.png'), '-vf', 'crop=1280:720:0:0', '-q:v', '2', path.join(parent, 'thumbnail.jpg')]); fs.rmSync(path.join(outDir, 'thumb.png')); } catch (e) { warn.push('thumbnail not built: ' + String(e.message).split('\n')[0]); }
console.log(JSON.stringify({ seconds: TOTAL, sections: S.length, bpm: BPM, voice, chapters, warnings: warn }));
