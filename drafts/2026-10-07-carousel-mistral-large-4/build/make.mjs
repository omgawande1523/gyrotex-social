import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const slides = [
 {k:'cover', kicker:'AI NEWS · 6 OCT 2026', h:'Mistral goes to <em>1 trillion</em>', p:'Mistral Large 4 is out. Here is what is in it.'},
 {k:'text', h:'The <em>weights</em> are coming', p:'Mistral says it will release the model weights by the end of this month. A preview is on its API now.'},
 {k:'stat', big:'1T', h:'parameters', p:'Only 49 billion are active at a time. It is a mixture-of-experts model.'},
 {k:'stat', big:'160+', h:'languages', p:'Including every official language of the European Union. It also takes images as input.'},
 {k:'stat', big:'$1.36', h:'per million input tokens', p:'Output costs $4.18 per million tokens.'},
 {k:'list', h:'How it <em>scores</em>', items:[['61.7%','DeepSWE v1.1 coding'],['93%','Cybench security tasks'],['59.9%','AutomationBench agent tasks']], p:'Figures reported by Mistral.'},
 {k:'list', h:'Mistral Large 4 in <em>one slide</em>', items:[['1T','parameters, 49B active'],['160+','languages, plus image input'],['$1.36','in, $4.18 out, per million tokens'],['Oct','weights due by month end']], p:'Source: mistral.ai, 6 Oct 2026'},
 {k:'cta', h:'Open weights or a <em>closed API</em>?', p:'Comment which one you would pick.'},
];
const N = slides.length;
const css = `@font-face{font-family:"Bebas Neue";src:url("fonts/bebas-neue-latin-400-normal.woff2") format("woff2")}
@font-face{font-family:"Inter";font-weight:500;src:url("fonts/inter-latin-500-normal.woff2") format("woff2")}
@font-face{font-family:"Inter";font-weight:700;src:url("fonts/inter-latin-700-normal.woff2") format("woff2")}
:root{--bg:#050505;--ink:#f6f4ee;--muted:#a09d94;--accent:#f5d76e;--line:rgba(246,244,238,.14);--card:rgba(246,244,238,.06)}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1350px;background:var(--bg);overflow:hidden}
#s{position:relative;width:1080px;height:1350px;overflow:hidden;font-family:"Inter",sans-serif;color:var(--ink);
background:radial-gradient(760px 620px at 82% 14%,rgba(245,215,110,.22),transparent 70%),radial-gradient(620px 560px at 6% 92%,rgba(245,215,110,.10),transparent 70%),var(--bg)}
#top{position:absolute;left:120px;right:120px;top:120px;display:flex;justify-content:space-between;align-items:center;font-size:26px;font-weight:700;letter-spacing:.16em}
#top span{color:var(--muted);letter-spacing:.08em}
#main{position:absolute;left:120px;right:120px;top:210px;bottom:230px;display:flex;flex-direction:column;justify-content:center;gap:36px}
.kicker{font-size:30px;font-weight:700;letter-spacing:.2em;color:var(--accent)}
h1{font-family:"Bebas Neue",sans-serif;font-weight:400;font-size:190px;line-height:.92;text-transform:uppercase}
h2{font-family:"Bebas Neue",sans-serif;font-weight:400;font-size:124px;line-height:.95;text-transform:uppercase}
em{font-style:normal;color:var(--accent)}
p{font-size:46px;font-weight:500;line-height:1.32;color:var(--ink)}
p.small{font-size:32px;color:var(--muted)}
.big{font-family:"Bebas Neue",sans-serif;font-size:400px;line-height:.82;color:var(--accent)}
.row{display:flex;align-items:center;gap:30px;padding:26px 32px;border:1px solid var(--line);border-radius:24px;background:var(--card)}
.row b{flex:0 0 230px;font-family:"Bebas Neue",sans-serif;font-weight:400;font-size:84px;line-height:1;color:var(--accent)}
.row span{font-size:38px;font-weight:500;line-height:1.25}
.rows{display:flex;flex-direction:column;gap:20px}
#foot{position:absolute;left:120px;right:120px;bottom:120px;display:flex;justify-content:space-between;align-items:center;font-size:30px;font-weight:700}
#foot .h{color:var(--accent)}#foot .sw{color:var(--muted);font-weight:500}`;
slides.forEach((s, i) => {
  let m = '';
  if (s.k==='cover') m = `<div class="kicker">${s.kicker}</div><h1>${s.h}</h1><p>${s.p}</p>`;
  if (s.k==='text') m = `<h2>${s.h}</h2><p>${s.p}</p>`;
  if (s.k==='stat') m = `<div class="big">${s.big}</div><h2>${s.h}</h2><p>${s.p}</p>`;
  if (s.k==='list') m = `<h2>${s.h}</h2><div class="rows">${s.items.map(([a,b])=>`<div class="row"><b>${a}</b><span>${b}</span></div>`).join('')}</div><p class="small">${s.p}</p>`;
  if (s.k==='cta') m = `<h2>${s.h}</h2><p>${s.p}</p>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><style>${css}</style></head><body><div id="s">
<div id="top">GYROTEX AI<span>${i+1}/${N}</span></div><div id="main">${m}</div>
<div id="foot"><span class="h">@gyrotex_ai</span><span class="sw">${i<N-1?'Swipe →':''}</span></div></div></body></html>`;
  const f = `build/s${i+1}.html`; fs.writeFileSync(f, html);
  execFileSync('/opt/pw-browsers/chromium', ['--headless','--no-sandbox','--hide-scrollbars','--force-device-scale-factor=1','--window-size=1080,1500','--virtual-time-budget=2000',`--screenshot=build/s${i+1}.png`,`file://${process.cwd()}/${f}`], {stdio:'ignore'});
  execFileSync('ffmpeg', ['-v','error','-y','-i',`build/s${i+1}.png`,'-vf','crop=1080:1350:0:0','-q:v','2',`slide-${String(i+1).padStart(2,'0')}.jpg`]);
});
