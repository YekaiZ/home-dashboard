/*
 * home-dashboard-card
 * A custom Home Assistant card: room tabs, grouped Lighting / Climate / Media
 * sections with stats, per-area light cards with a bottom-sheet / modal,
 * fan, aircon, curtain and media controls.
 * Register as a dashboard resource (type: JavaScript module) and use
 * `type: custom:home-dashboard-card`.
 */

const P = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  bulb: P('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  fan: P('<circle cx="12" cy="12" r="1.4"/>' + [0, 120, 240].map(a => `<path transform="rotate(${a} 12 12)" d="M12 10.6C11.5 6 10.5 3.5 8.5 4.2 6.8 4.9 8.4 8.6 11 10.9"/>`).join('')),
  snow: P('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>'),
  curtain: P('<path d="M3 4h18M5 4c0 5 0 11 .8 16M10 4c0 5 0 11-.8 16M14 4c0 5 0 11 .8 16M19 4c0 5 0 11-.8 16"/>'),
  chev: P('<path d="M9 6l6 6-6 6"/>'),
  x: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  play: P('<path d="M8 5l11 7-11 7z"/>'),
  pause: P('<path d="M8 5v14M16 5v14"/>'),
  prev: P('<path d="M6 5v14M18 5l-9 7 9 7z"/>'),
  next: P('<path d="M18 5v14M6 5l9 7-9 7z"/>'),
  tv: P('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>'),
  vol: P('<path d="M4 9v6h4l5 4V5L8 9H4zM16.5 9a4 4 0 0 1 0 6"/>')
};

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const arr = x => x == null ? [] : Array.isArray(x) ? x : [x];
const norm = x => typeof x === 'string' ? { entity: x } : x;
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_');
const pc = (v, a, b) => (v - a) / (b - a) * 100;
const csub = p => p <= 0 ? 'Closed' : p >= 100 ? 'Open' : Math.round(p) + '% open';
const BAD = ['unavailable', 'unknown'];
const OFFISH = ['off', 'unavailable', 'unknown', 'standby'];
const MODE = { cool: 'Cooling', heat: 'Heating', dry: 'Drying', fan_only: 'Fan only', auto: 'Auto', heat_cool: 'Auto' };

const CSS = `
.tk{--bg:#e6eaef;--tile:#fff;--ink:#151a21;--mute:#69737f;--line:#d6dce3;--tile-on:#151a21;--on-ink:#f3f5f7;--on-mute:#a4afbc;--amber:#f2a93b;--blue:#3b8cf0;--violet:#8b83f0;--pink:#e5578a;--green:#2fa16f;--red:#d9534f;--trk:rgba(127,135,145,.3);font:400 16px/1.4 var(--font);color:var(--ink)}
.tk[data-theme=dark]{--bg:#0e1218;--tile:#171d26;--ink:#eef1f5;--mute:#8892a0;--line:#252d38;--tile-on:#eef1f5;--on-ink:#12171e;--on-mute:#5a6572}
*{box-sizing:border-box}
.root{background:var(--bg);padding:24px 20px 48px;min-height:100%;border-radius:var(--ha-card-border-radius,12px)}
.wrap{max-width:880px;margin:0 auto}
button{font:inherit;color:inherit;cursor:pointer}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
svg{width:22px;height:22px;display:block}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.sum{margin:0;color:var(--mute);font-size:15px}
.scenes{display:flex;gap:8px}
.chip{border:1px solid var(--line);background:transparent;border-radius:999px;padding:8px 14px;font-size:14px;font-weight:500;white-space:nowrap}
.chip:hover{border-color:var(--mute)}
.rail{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:6px 0;margin-bottom:10px}
.rail::-webkit-scrollbar{display:none}
.room{flex:0 0 auto;border:0;background:transparent;color:var(--mute);padding:10px 16px;border-radius:999px;font-weight:500;display:flex;align-items:center;gap:8px}
.room[aria-selected=true]{background:var(--ink);color:var(--bg)}
.dot{width:7px;height:7px;border-radius:50%;background:var(--amber)}
h1{margin:6px 0 28px;font-size:clamp(40px,9vw,64px);font-weight:500;letter-spacing:-.035em;line-height:1}
.grp{margin-bottom:32px}
.grp h2{margin:0 0 10px;font-size:22px;font-weight:600;letter-spacing:-.02em}
.stats{display:flex;flex-wrap:wrap;gap:10px 34px;margin-bottom:16px;align-items:center}
.st{min-width:0}
.st .k{display:block;font-size:13px;color:var(--mute)}
.st b{display:flex;align-items:center;gap:7px;font-size:22px;font-weight:500;letter-spacing:-.02em;font-variant-numeric:tabular-nums;white-space:nowrap;max-width:60vw;overflow:hidden;text-overflow:ellipsis}
.st b small{font-size:14px;font-weight:400;color:var(--mute);letter-spacing:0}
.pip{width:8px;height:8px;border-radius:50%;background:var(--mute);flex:none}
.pip.g{background:var(--green)}.pip.m{background:var(--amber)}.pip.p{background:var(--red)}.pip.here{background:var(--blue)}
.stats .sel{margin-left:auto}
.sel select{-webkit-appearance:none;appearance:none;border:0;border-radius:999px;background-color:var(--tile);color:var(--ink);font:inherit;font-weight:500;padding:10px 38px 10px 16px;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238892a0%27 stroke-width=%272%27 stroke-linecap=%27round%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:16px;cursor:pointer}
.grid{--c:var(--cm,2);display:flex;flex-wrap:wrap;gap:12px}
.grid>.tile{flex:1 1 calc((100% - (var(--c) - 1) * 12px) / var(--c) - .5px);min-width:0}
.grid>.tile.wfull{flex-basis:100%}
@media(min-width:760px){.grid{--c:var(--cd,3)}}
.tile{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:16px;min-height:156px;padding:16px;border-radius:26px;background:var(--tile);transition:background .25s,color .25s}
.tile.on{background:var(--tile-on);color:var(--on-ink)}
.hit{display:flex;flex-direction:column;gap:18px;flex:1;background:none;border:0;padding:0;text-align:left}
.ico{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--bg);color:var(--mute);transition:background .25s;flex:none}
.tile.on .ico{color:#fff}
.tile.on[data-k=light] .ico{background:var(--amber);color:#2b1c03}
.tile.on[data-k=fan] .ico,.tile.on[data-k=cool] .ico{background:var(--blue)}
.tile.on[data-k=curtain] .ico{background:var(--violet)}
.tile.on[data-k=media] .ico{background:var(--pink)}
.t{display:block;font-weight:600;font-size:17px}
.s{display:block;font-size:14px;color:var(--mute)}
.tile.on .s,.tile.on .val{color:var(--on-mute)}
.more{position:absolute;top:14px;right:14px;display:flex;align-items:center;gap:2px;border:0;border-radius:999px;padding:8px 8px 8px 14px;font-size:13px;font-weight:500;background:rgba(127,135,145,.18)}
.more svg{width:16px;height:16px}
.lv{display:flex;gap:5px}.lv i{flex:1;height:6px;border-radius:9px;background:var(--trk)}.lv i.f{background:var(--blue)}
.step{display:flex;align-items:center;justify-content:space-between}
.step b{font-size:30px;font-weight:500;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.step button{width:44px;height:44px;border-radius:50%;border:0;background:rgba(127,135,145,.2);font-size:22px;line-height:1}
@keyframes spin{to{transform:rotate(360deg)}}
.tile.on[data-k=fan] .ico svg{animation:spin calc(3s / var(--sp,1)) linear infinite}
input[type=range].sl{--fill:var(--amber);-webkit-appearance:none;appearance:none;width:100%;height:28px;margin:0;background:transparent}
.sl.cv{--fill:var(--violet)}
.sl:disabled{opacity:.35}
.sl::-webkit-slider-runnable-track{height:8px;border-radius:99px;background:linear-gradient(to right,var(--fill) var(--p,0%),var(--trk) var(--p,0%))}
.sl::-moz-range-track{height:8px;border-radius:99px;background:linear-gradient(to right,var(--fill) var(--p,0%),var(--trk) var(--p,0%))}
.sl::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-7px;border-radius:50%;background:#fff;border:3px solid var(--fill);box-shadow:0 1px 4px rgba(0,0,0,.3)}
.sl::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid var(--fill)}
.art{width:84px;height:84px;border-radius:16px;flex:none;object-fit:cover;background:radial-gradient(circle at 28% 22%,hsl(var(--a) 85% 72%),transparent 56%),radial-gradient(circle at 78% 82%,hsl(calc(var(--a) + 70) 80% 58%),transparent 62%),hsl(var(--a) 40% 28%);box-shadow:0 6px 18px rgba(0,0,0,.25)}
.tile[data-k=media] .hit{flex-direction:row;align-items:center;gap:16px}
.mctl{display:flex;justify-content:space-between;align-items:center;gap:12px 20px;flex-wrap:wrap}
.tp,.vb{display:flex;align-items:center;gap:10px}
.vb button,.tp button{width:44px;height:44px;border-radius:50%;border:0;background:rgba(127,135,145,.2);font-size:22px;line-height:1;display:grid;place-items:center}
.tp svg{width:20px;height:20px}
.tp button:nth-child(2){width:54px;height:54px;background:var(--pink);color:#fff}
.tp button:disabled,.vb button:disabled{opacity:.35;cursor:default}
.vl{display:flex;align-items:center;justify-content:center;gap:6px;min-width:70px;font-weight:500;font-variant-numeric:tabular-nums}
.vl svg{width:18px;height:18px}
@media(min-width:760px){.tile[data-k=media]{flex-direction:row;align-items:center;gap:24px}.tile[data-k=media] .hit{flex:1}}
@media(max-width:520px){
.root{padding:16px 14px 40px}
.scenes{overflow-x:auto;scrollbar-width:none;width:calc(100% + 28px);margin:0 -14px;padding:0 14px}
.scenes::-webkit-scrollbar{display:none}
.chip{padding:10px 16px}
.tile{padding:14px;border-radius:24px;min-height:148px}
.step button{width:40px;height:40px}
.step b{font-size:26px}
}
.scrim{position:fixed;inset:0;background:rgba(0,0,0,.5);opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s;z-index:2000}
.scrim.open{opacity:1;visibility:visible}
.sheet{position:fixed;left:0;right:0;bottom:0;max-height:84vh;display:flex;flex-direction:column;background:var(--tile);border-radius:26px 26px 0 0;z-index:2001;transform:translateY(100%);visibility:hidden;transition:transform .3s cubic-bezier(.2,.8,.2,1),visibility .3s;padding-bottom:env(safe-area-inset-bottom,0px)}
.sheet.open{transform:none;visibility:visible}
.grab{width:40px;height:4px;border-radius:9px;background:var(--line);margin:10px auto 0}
.sh-head{display:flex;align-items:center;justify-content:space-between;padding:14px 20px 4px}
.sh-head h2{margin:0;font-size:22px;font-weight:600;letter-spacing:-.02em}
.x{width:40px;height:40px;border-radius:50%;border:0;background:var(--bg);display:grid;place-items:center}
.sh-act{display:flex;gap:8px;padding:8px 20px 6px}
.sh-list{overflow:auto;padding:0 20px 12px}
.row{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;align-items:center;padding:14px 0;border-top:1px solid var(--line)}
.row:first-child{border-top:0}
.row .sl{grid-column:2}.row:not(.on) .sl{opacity:.55}
.name{display:flex;justify-content:space-between;gap:8px}
.val{color:var(--mute);font-variant-numeric:tabular-nums;font-size:14px}
.tog{width:46px;height:28px;border-radius:999px;border:0;background:var(--line);position:relative;transition:background .2s}
.tog::after{content:"";position:absolute;top:4px;left:4px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s}
.tog[aria-pressed=true]{background:var(--amber)}
.tog[aria-pressed=true]::after{transform:translateX(18px)}
@media(min-width:720px){.grab{display:none}.sheet{left:50%;right:auto;bottom:auto;top:50%;width:min(460px,92vw);border-radius:26px;transform:translate(-50%,-44%);opacity:0;transition:transform .3s,opacity .25s,visibility .3s}.sheet.open{transform:translate(-50%,-50%);opacity:1}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

class HomeDashboardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._cur = null; this._sheet = null; this._msel = {}; this._mem = {}; this._lastB = {};
    this._drag = false; this._sig = '';
    this._ov = document.createElement('div');
    this._ov.attachShadow({ mode: 'open' });
    this._onKey = e => { if (e.key === 'Escape' && this._sheet) this._closeSheet(); };
    this._onUp = () => { if (this._drag) setTimeout(() => { this._drag = false; this._sig = ''; this._maybe(); }, 700); };
    for (const r of [this.shadowRoot, this._ov.shadowRoot]) {
      r.addEventListener('click', e => this._click(e));
      r.addEventListener('input', e => this._input(e));
      r.addEventListener('change', e => this._change(e));
      r.addEventListener('pointerdown', e => { if (e.target.type === 'range') this._drag = true; });
    }
  }

  connectedCallback() {
    document.body.appendChild(this._ov);
    document.addEventListener('keydown', this._onKey);
    window.addEventListener('pointerup', this._onUp);
  }
  disconnectedCallback() {
    this._ov.remove();
    document.removeEventListener('keydown', this._onKey);
    window.removeEventListener('pointerup', this._onUp);
  }

  setConfig(cfg) {
    if (!cfg || !Array.isArray(cfg.rooms) || !cfg.rooms.length) throw new Error('home-dashboard-card: "rooms" is required');
    this._cfg = cfg;
    this._rooms = cfg.rooms.map(r => {
      const areas = (r.areas || [{ name: r.name, lights: r.lights }]).map(a => ({ name: a.name || r.name, lights: arr(a.lights).map(norm) }));
      return { ...r, id: r.id || slug(r.name), areas, fans: arr(r.fan).map(norm), covers: arr(r.cover).map(norm), media: arr(r.media).map(norm), doors: arr(r.doors).map(norm) };
    });
    this._scenes = [{ name: 'All off', all_off: true }, ...arr(cfg.scenes)];
    const ids = new Set();
    for (const r of this._rooms) {
      r.areas.forEach(a => a.lights.forEach(l => ids.add(l.entity)));
      [...r.fans, ...r.covers, ...r.media, ...r.doors].forEach(x => ids.add(x.entity));
      ['climate', 'presence', 'temperature', 'humidity', 'pm25', 'co2'].forEach(k => r[k] && ids.add(r[k]));
    }
    this._ids = [...ids];
    this._prefixes = [...new Set(this._rooms.flatMap(r => [r.name, ...r.areas.map(a => a.name)]).map(n => n.toLowerCase()))].sort((a, b) => b.length - a.length);
    this._cur = cfg.default_room || this._rooms[0].id;
    this._sig = '';
  }

  set hass(h) { this._hass = h; this._maybe(); }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 'full', min_columns: 6 }; }

  _maybe() {
    if (!this._hass || !this._rooms || this._drag) return;
    const h = this._hass;
    let s = h.themes && h.themes.darkMode ? 'd' : 'l';
    for (const id of this._ids) {
      const e = h.states[id];
      if (!e) { s += '|-'; continue; }
      const a = e.attributes;
      s += '|' + e.state + [a.brightness, a.percentage, a.current_position, a.temperature, a.current_temperature, a.volume_level, a.media_title, a.entity_picture, a.hvac_action].map(v => v ?? '').join(',');
    }
    if (s === this._sig) return;
    this._sig = s;
    this._render();
  }

  /* ---------- helpers ---------- */
  _S(id) { return this._hass.states[id]; }
  _room(id) { return this._rooms.find(r => r.id === id); }
  _svc(dom, srv, ids, data) { this._hass.callService(dom, srv, data || {}, { entity_id: ids }); }
  _name(s) {
    let n = s.attributes.friendly_name || s.entity_id;
    for (const p of this._prefixes) if (n.toLowerCase().startsWith(p + ' ')) { n = n.slice(p.length + 1); break; }
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  _pct(s) {
    if (s.state === 'on') {
      const b = s.attributes.brightness;
      const p = b == null ? 100 : Math.max(1, Math.round(b / 255 * 100));
      this._lastB[s.entity_id] = p; return p;
    }
    return this._lastB[s.entity_id] || 80;
  }
  _alights(a) {
    return a.lights.map(l => ({ l, s: this._S(l.entity) })).filter(x => x.s && x.s.state !== 'unavailable')
      .map(x => ({ id: x.l.entity, on: x.s.state === 'on', b: this._pct(x.s), name: x.l.name || this._name(x.s) }));
  }
  _num(id) {
    const s = id && this._S(id);
    if (!s || BAD.includes(s.state)) return null;
    const n = parseFloat(s.state); return isNaN(n) ? null : n;
  }
  _stat(k, v) { return `<div class="st"><span class="k">${esc(k)}</span><b>${v}</b></div>`; }
  _group(title, stats, tiles, extra) {
    if (!stats && !tiles && !extra) return '';
    return `<section class="grp"><h2>${esc(title)}</h2>${stats || extra ? `<div class="stats">${stats || ''}${extra || ''}</div>` : ''}${tiles ? `<div class="grid">${tiles}</div>` : ''}</section>`;
  }

  /* ---------- groups ---------- */
  _lighting(r) {
    const S = this._hass.states;
    const areas = r.areas.map((a, i) => ({ a, i, ls: this._alights(a) })).filter(x => x.ls.length);
    const all = areas.flatMap(x => x.ls), on = all.filter(l => l.on), multi = areas.length > 1;
    let stats = '';
    const pr = r.presence && S[r.presence];
    if (pr && !BAD.includes(pr.state)) stats += this._stat('Presence', `<i class="pip ${pr.state === 'on' ? 'here' : ''}"></i>${pr.state === 'on' ? 'Occupied' : 'Empty'}`);
    if (all.length) {
      stats += this._stat('Lights on', `${on.length} <small>of ${all.length}</small>`);
      stats += this._stat('Brightness', on.length ? Math.round(on.reduce((s, l) => s + l.b, 0) / on.length) + '%' : 'Off');
    }
    for (const d of r.doors) {
      const s = S[d.entity];
      if (s && !BAD.includes(s.state)) stats += this._stat((d.name || 'Door') + ' door', `<i class="pip ${s.state === 'on' ? '' : 'here'}"></i>${s.state === 'on' ? 'Open' : 'Closed'}`);
    }
    let tiles = areas.map(({ a, i, ls }) => {
      const o = ls.filter(l => l.on), n = ls.length, avg = o.length ? Math.round(o.reduce((s, l) => s + l.b, 0) / o.length) : 0;
      const nm = multi ? a.name + ' lights' : 'Lights', pre = o.length ? `${o.length} of ${n} on` : 'Off';
      return `<div class="tile ${o.length ? 'on' : ''}" data-k="light"><button class="hit" data-act="ltog" data-room="${r.id}" data-area="${i}"><span class="ico">${IC.bulb}</span><span><span class="t">${esc(nm)}</span><span class="s">${o.length ? pre + ', ' + avg + '%' : 'Off'}</span></span></button><button class="more" data-act="lopen" data-room="${r.id}" data-area="${i}" aria-label="Show ${esc(nm)}">${n} ${n === 1 ? 'light' : 'lights'} ${IC.chev}</button><input type="range" class="sl" min="5" max="100" value="${avg || 80}" style="--p:${pc(avg || 80, 5, 100)}%" data-gb data-pre="${pre}" data-ids="${o.map(l => l.id).join(',')}" aria-label="${esc(nm)} brightness"${o.length ? '' : ' disabled'}></div>`;
    }).join('');
    for (const c of r.covers) {
      const s = S[c.entity]; if (!s || BAD.includes(s.state)) continue;
      const pos = s.attributes.current_position ?? (s.state === 'open' ? 100 : 0), nm = c.name || (r.covers.length > 1 ? this._name(s) : 'Curtain');
      tiles += `<div class="tile ${pos > 0 ? 'on' : ''}" data-k="curtain"><button class="hit" data-act="ctog" data-id="${c.entity}"><span class="ico">${IC.curtain}</span><span><span class="t">${esc(nm)}</span><span class="s">${csub(pos)}</span></span></button><input type="range" class="sl cv" min="0" max="100" step="5" value="${pos}" style="--p:${pos}%" data-c="${c.entity}" aria-label="${esc(nm)} position"></div>`;
    }
    return this._group('Lighting', stats, tiles);
  }

  _climate(r) {
    const S = this._hass.states, cs = r.climate && S[r.climate];
    let stats = '';
    const t = this._num(r.temperature) ?? (cs && cs.attributes.current_temperature != null ? +cs.attributes.current_temperature : null);
    if (t != null) stats += this._stat('Temperature', `${t.toFixed(1)}°C`);
    const hu = this._num(r.humidity); if (hu != null) stats += this._stat('Humidity', `${Math.round(hu)}%`);
    const pm = this._num(r.pm25);
    if (pm != null) { const q = pm <= 12 ? ['g', 'Good'] : pm <= 35 ? ['m', 'Moderate'] : ['p', 'Poor']; stats += this._stat('Air quality', `<i class="pip ${q[0]}"></i>${q[1]} <small>PM2.5 ${Math.round(pm)}</small>`); }
    const co = this._num(r.co2); if (co != null) stats += this._stat('CO₂', `${Math.round(co)} <small>ppm</small>`);
    let tiles = '';
    for (const f of r.fans) {
      const s = S[f.entity]; if (!s || BAD.includes(s.state)) continue;
      const isFan = f.entity.startsWith('fan.'), a = s.attributes;
      let n = 1;
      if (isFan) { n = f.speeds || Math.round(100 / (a.percentage_step || 33.34)); if (n < 1 || n > 6) n = 3; }
      const lv = s.state !== 'on' ? 0 : isFan ? (Math.round((a.percentage || 0) / 100 * n) || 1) : 1;
      const nm = f.name || (r.fans.length > 1 ? this._name(s) : 'Fan');
      tiles += `<div class="tile ${lv ? 'on' : ''}" data-k="fan" style="--sp:${lv || 1}"><button class="hit" data-act="fan" data-id="${f.entity}" data-n="${n}" data-lv="${lv}"><span class="ico">${IC.fan}</span><span><span class="t">${esc(nm)}</span><span class="s">${lv ? (n > 1 ? 'Speed ' + lv : 'On') : 'Off'}</span></span></button>${n > 1 ? `<div class="lv">${Array.from({ length: n }, (_, i) => `<i class="${lv > i ? 'f' : ''}"></i>`).join('')}</div>` : ''}</div>`;
    }
    if (cs && !BAD.includes(cs.state)) {
      const a = cs.attributes, on = cs.state !== 'off', tt = a.temperature;
      const tv = tt == null ? '–' : (Number.isInteger(+tt) ? +tt : (+tt).toFixed(1));
      tiles += `<div class="tile ${on ? 'on' : ''}" data-k="cool"><button class="hit" data-act="ac" data-id="${r.climate}"><span class="ico">${IC.snow}</span><span><span class="t">Aircon</span><span class="s">${on ? (MODE[cs.state] || cs.state) + (tt != null ? ' to ' + tv + '°' : '') : 'Off'}</span></span></button><div class="step"><button data-act="tm" data-id="${r.climate}" aria-label="Cooler">−</button><b>${tv}°</b><button data-act="tp" data-id="${r.climate}" aria-label="Warmer">+</button></div></div>`;
    }
    return this._group('Climate', stats, tiles);
  }

  _media(r) {
    const devs = r.media.filter(m => this._S(m.entity));
    if (!devs.length) return '';
    const sel = Math.min(this._msel[r.id] || 0, devs.length - 1), d = devs[sel], s = this._S(d.entity);
    const a = s.attributes, on = !OFFISH.includes(s.state), pl = s.state === 'playing', title = a.media_title, pic = a.entity_picture;
    const vol = a.volume_level != null ? Math.round(a.volume_level * 100) : null, dis = on ? '' : ' disabled';
    const nm = d.name || this._name(s), hue = [...(title || nm)].reduce((x, c) => x + c.charCodeAt(0), 0) % 360;
    const lead = on && pic ? `<img class="art" src="${esc(this._hass.hassUrl ? this._hass.hassUrl(pic) : pic)}" alt="">` : on && title ? `<span class="art" style="--a:${hue}"></span>` : `<span class="ico">${IC.tv}</span>`;
    const status = on ? (title ? nm + ', ' + (pl ? 'playing' : 'paused') : (pl ? 'Playing' : 'Paused')) : 'Off';
    const sub = a.media_artist ? `<span class="s">${esc(a.media_artist)}</span>` : '';
    const tile = `<div class="tile wfull ${on ? 'on' : ''}" data-k="media"><button class="hit" data-act="mpow" data-id="${d.entity}" data-on="${on ? 1 : 0}">${lead}<span><span class="t">${esc(on && title ? title : nm)}</span>${on && title ? sub : ''}<span class="s">${esc(status)}</span></span></button><div class="mctl"><div class="tp"><button data-act="mprev" data-id="${d.entity}" aria-label="Previous"${dis}>${IC.prev}</button><button data-act="mplay" data-id="${d.entity}" aria-label="${pl ? 'Pause' : 'Play'}"${dis}>${pl ? IC.pause : IC.play}</button><button data-act="mnext" data-id="${d.entity}" aria-label="Next"${dis}>${IC.next}</button></div><div class="vb"><button data-act="vdn" data-id="${d.entity}" aria-label="Volume down"${dis}>−</button><span class="vl">${IC.vol}${vol == null ? '–' : vol + '%'}</span><button data-act="vup" data-id="${d.entity}" aria-label="Volume up"${dis}>+</button></div></div></div>`;
    const select = devs.length > 1 ? `<div class="sel"><select data-msel="${r.id}" aria-label="Media device">${devs.map((m, i) => `<option value="${i}"${i === sel ? ' selected' : ''}>${esc(m.name || this._name(this._S(m.entity)))}</option>`).join('')}</select></div>` : '';
    return this._group('Media', this._stat('Now playing', esc(on ? (title || 'Nothing playing') : 'Off')), tile, select);
  }

  /* ---------- render ---------- */
  _summary() {
    let n = 0, ac = 0; const occ = [];
    for (const r of this._rooms) {
      r.areas.forEach(a => { n += this._alights(a).filter(l => l.on).length; });
      const c = r.climate && this._S(r.climate); if (c && !['off', ...BAD].includes(c.state)) ac++;
      const p = r.presence && this._S(r.presence); if (p && p.state === 'on') occ.push(r.name);
    }
    return [n ? n + (n === 1 ? ' light' : ' lights') + ' on' : 'All lights off', ac ? ac + ' aircon running' : '', occ.length ? occ.join(', ') + ' occupied' : ''].filter(Boolean).join(', ');
  }

  _theme() {
    const t = this._cfg.theme;
    return t === 'light' || t === 'dark' ? t : (this._hass.themes && this._hass.themes.darkMode ? 'dark' : 'light');
  }
  _font() { return this._cfg.font_family || '"Instrument Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; }

  _render() {
    if (!this._hass || !this._rooms) return;
    const r = this._room(this._cur) || this._rooms[0], th = this._theme();
    const rail = this._rooms.map(x => {
      const lit = x.areas.some(a => this._alights(a).some(l => l.on));
      return `<button class="room" role="tab" data-act="room" data-v="${x.id}" aria-selected="${x.id === r.id}">${esc(x.name)}${lit ? '<i class="dot"></i>' : ''}</button>`;
    }).join('');
    const scenes = this._scenes.map((s, i) => `<button class="chip" data-act="scene" data-v="${i}">${esc(s.name)}</button>`).join('');
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="tk root" data-theme="${th}" style="--font:${this._font()}"><div class="wrap">
      <header><p class="sum">${esc(this._summary())}</p><div class="scenes">${scenes}</div></header>
      <nav class="rail" role="tablist" aria-label="Rooms">${rail}</nav>
      <h1>${esc(r.name)}</h1>
      <main>${this._lighting(r)}${this._climate(r)}${this._media(r)}</main></div></div>`;
    this.shadowRoot.querySelectorAll('.grid').forEach(g => {
      const n = g.children.length;
      g.style.setProperty('--cd', n >= 5 ? 3 : n);
      g.style.setProperty('--cm', n === 1 ? 1 : 2);
    });
    this._renderSheet();
  }

  _renderSheet() {
    const sh = this._sheet, root = this._ov.shadowRoot;
    if (!sh) { root.innerHTML = ''; return; }
    const r = this._room(sh.room), a = r.areas[sh.area], ls = this._alights(a);
    const old = root.querySelector('.sh-list'), top = old ? old.scrollTop : 0, o = sh.show ? 'open' : '';
    root.innerHTML = `<style>${CSS}</style><div class="tk" data-theme="${this._theme()}" style="--font:${this._font()}">
      <div class="scrim ${o}" data-act="close"></div>
      <section class="sheet ${o}" role="dialog" aria-modal="true" aria-labelledby="sh-t"><div class="grab"></div>
        <div class="sh-head"><h2 id="sh-t">${esc(a.name)} lights</h2><button class="x" data-act="close" aria-label="Close">${IC.x}</button></div>
        <div class="sh-act"><button class="chip" data-act="aall" data-v="1">All on</button><button class="chip" data-act="aall" data-v="0">All off</button></div>
        <div class="sh-list">${ls.map(l => `<div class="row ${l.on ? 'on' : ''}"><button class="tog" data-act="l" data-id="${l.id}" aria-pressed="${l.on}" aria-label="${esc(l.name)}"></button><div class="name"><span>${esc(l.name)}</span><span class="val">${l.on ? l.b + '%' : 'Off'}</span></div><input type="range" class="sl" min="5" max="100" value="${l.b}" style="--p:${pc(l.b, 5, 100)}%" data-b="${l.id}" aria-label="${esc(l.name)} brightness"></div>`).join('')}</div>
      </section></div>`;
    const nl = root.querySelector('.sh-list'); if (nl) nl.scrollTop = top;
  }

  _open(room, area) {
    this._sheet = { room, area, show: false };
    this._renderSheet();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!this._sheet) return;
      this._sheet.show = true;
      this._ov.shadowRoot.querySelectorAll('.scrim,.sheet').forEach(e => e.classList.add('open'));
      const x = this._ov.shadowRoot.querySelector('.x'); if (x) x.focus();
    }));
  }
  _closeSheet() {
    const sh = this._sheet; if (!sh) return;
    sh.show = false;
    this._ov.shadowRoot.querySelectorAll('.scrim,.sheet').forEach(e => e.classList.remove('open'));
    setTimeout(() => { if (this._sheet === sh) { this._sheet = null; this._ov.shadowRoot.innerHTML = ''; } }, 320);
  }

  /* ---------- events ---------- */
  _click(e) {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const d = t.dataset, S = this._hass.states;
    switch (d.act) {
      case 'room': this._cur = d.v; this._render(); return;
      case 'scene': this._scene(+d.v); return;
      case 'ltog': {
        const r = this._room(d.room), a = r.areas[+d.area], ls = this._alights(a), on = ls.filter(l => l.on), k = d.room + d.area;
        if (on.length) { this._mem[k] = on.map(l => l.id); this._svc('light', 'turn_off', on.map(l => l.id)); }
        else { const m = (this._mem[k] || []).filter(id => ls.some(l => l.id === id)); this._svc('light', 'turn_on', m.length ? m : ls.map(l => l.id)); }
        return;
      }
      case 'lopen': this._open(d.room, +d.area); return;
      case 'close': this._closeSheet(); return;
      case 'l': this._svc('light', S[d.id].state === 'on' ? 'turn_off' : 'turn_on', d.id); return;
      case 'aall': {
        const sh = this._sheet, ids = this._alights(this._room(sh.room).areas[sh.area]).map(l => l.id);
        if (ids.length) this._svc('light', d.v === '1' ? 'turn_on' : 'turn_off', ids); return;
      }
      case 'fan': {
        const n = +d.n, lv = +d.lv;
        if (!d.id.startsWith('fan.')) { this._svc('homeassistant', 'toggle', d.id); return; }
        const next = (lv + 1) % (n + 1);
        if (next === 0) this._svc('fan', 'turn_off', d.id); else this._svc('fan', 'set_percentage', d.id, { percentage: Math.round(next / n * 100) });
        return;
      }
      case 'ac': this._svc('climate', S[d.id].state === 'off' ? 'turn_on' : 'turn_off', d.id); return;
      case 'tm': case 'tp': {
        const a = S[d.id].attributes, step = a.target_temp_step || 1;
        let v = (a.temperature ?? a.current_temperature ?? 24) + (d.act === 'tp' ? step : -step);
        v = Math.round(Math.max(a.min_temp ?? 16, Math.min(a.max_temp ?? 30, v)) * 10) / 10;
        this._svc('climate', 'set_temperature', d.id, { temperature: v }); return;
      }
      case 'ctog': {
        const s = S[d.id], pos = s.attributes.current_position ?? (s.state === 'open' ? 100 : 0);
        this._svc('cover', pos > 0 ? 'close_cover' : 'open_cover', d.id); return;
      }
      case 'mpow': this._svc('media_player', d.on === '1' ? 'turn_off' : 'turn_on', d.id); return;
      case 'mplay': this._svc('media_player', 'media_play_pause', d.id); return;
      case 'mprev': this._svc('media_player', 'media_previous_track', d.id); return;
      case 'mnext': this._svc('media_player', 'media_next_track', d.id); return;
      case 'vup': this._svc('media_player', 'volume_up', d.id); return;
      case 'vdn': this._svc('media_player', 'volume_down', d.id); return;
    }
  }

  _scene(i) {
    const sc = this._scenes[i];
    if (sc.all_off) {
      const ids = this._rooms.flatMap(r => r.areas.flatMap(a => this._alights(a).map(l => l.id)));
      if (ids.length) this._svc('light', 'turn_off', ids);
      return;
    }
    for (const a of arr(sc.actions)) {
      const [dom, srv] = a.service.split('.');
      this._hass.callService(dom, srv, a.data || {}, a.target || {});
    }
  }

  _input(e) {
    const t = e.target; if (t.type !== 'range') return;
    const v = +t.value, d = t.dataset;
    t.style.setProperty('--p', pc(v, +t.min, +t.max) + '%');
    if ('gb' in d) { const s = t.closest('.tile').querySelector('.s'); if (s) s.textContent = d.pre + ', ' + v + '%'; }
    else if ('c' in d) { const s = t.closest('.tile').querySelector('.s'); if (s) s.textContent = csub(v); t.closest('.tile').classList.toggle('on', v > 0); }
    else if ('b' in d) {
      const row = t.closest('.row'); row.classList.add('on');
      row.querySelector('.tog').setAttribute('aria-pressed', 'true');
      row.querySelector('.val').textContent = v + '%';
    }
  }

  _change(e) {
    const t = e.target, d = t.dataset;
    if (t.tagName === 'SELECT' && 'msel' in d) { this._msel[d.msel] = +t.value; this._sig = ''; this._maybe(); return; }
    if (t.type !== 'range') return;
    const v = +t.value;
    if ('gb' in d) { const ids = d.ids.split(',').filter(Boolean); if (ids.length) this._svc('light', 'turn_on', ids, { brightness_pct: v }); }
    else if ('c' in d) this._svc('cover', 'set_cover_position', d.c, { position: v });
    else if ('b' in d) this._svc('light', 'turn_on', d.b, { brightness_pct: v });
  }
}

customElements.define('home-dashboard-card', HomeDashboardCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'home-dashboard-card', name: 'Home dashboard', description: 'Rooms with grouped lighting, climate and media controls.' });
