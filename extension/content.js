// Isolated-world content script: receives climb geometry from inject.js,
// asks the background worker for names, and shows them in the dashboard.
(() => {
  const byPath = new Map(); // pathname -> { kind, totalDist, climbs: [...with name fields] }
  let current = null;       // entry for location.pathname, or null
  let overrides = [];       // [{ start:[lat,lng], top:[lat,lng], name }]
  let collapsed = false;
  let activeClimb = null;   // climb currently open in the dashboard's climb panel

  // ---------- helpers ----------
  const hav = (a, b) => {
    const R = 6371000, r = (d) => (d * Math.PI) / 180;
    const s = Math.sin(r(b[0] - a[0]) / 2) ** 2 +
      Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  const km = (m) => (m / 1000).toFixed(1) + ' km';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function findOverride(c) {
    return overrides.find((o) => hav(o.top, c.top) < 200 && hav(o.start, c.start) < 500);
  }
  function displayName(c) {
    const o = findOverride(c);
    if (o) return { name: o.name, detail: c.auto?.name && c.auto.name !== o.name ? 'OSM: ' + c.auto.name : '', source: 'custom' };
    if (c.auto) return c.auto;
    if (c.error) return { name: 'Lookup failed', detail: c.error, source: 'error' };
    return { name: 'Looking up name…', detail: '', source: 'pending' };
  }

  // ---------- storage ----------
  chrome.storage.sync.get({ overrides: [], collapsed: false }, (v) => {
    overrides = v.overrides || [];
    collapsed = !!v.collapsed;
    render();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.overrides) {
      overrides = changes.overrides.newValue || [];
      render();
    }
  });

  function rename(c) {
    const cur = displayName(c).name;
    const input = prompt('Name for this climb (leave empty to use the automatic name):', findOverride(c) ? cur : (c.auto?.name || ''));
    if (input === null) return;
    const name = input.trim();
    const rest = overrides.filter((o) => o !== findOverride(c));
    const next = name ? [...rest, { start: c.start, top: c.top, name }] : rest;
    chrome.storage.sync.set({ overrides: next });
  }

  // ---------- data in ----------
  window.addEventListener('message', (ev) => {
    if (ev.source !== window || !ev.data || !ev.data.__hhClimbNames) return;
    if (ev.data.type === 'list') {
      self.HHPrewarm?.onList(ev.data.payload.items || []);
      return;
    }
    if (ev.data.type !== 'climbs') return;
    const p = ev.data.payload;
    const entry = { kind: p.kind, totalDist: p.totalDist, climbs: p.climbs };
    byPath.set(p.path, entry);
    syncCurrent();
    requestNames(entry);
  });

  function requestNames(entry) {
    const todo = entry.climbs.filter((c) => !c.auto);
    if (!todo.length) return;
    todo.forEach((c) => delete c.error);
    render();
    chrome.runtime.sendMessage(
      { type: 'nameClimbs', climbs: todo.map((c) => ({ start: c.start, top: c.top, maxEle: c.maxEle, points: c.points })) },
      (res) => {
        const fail = chrome.runtime.lastError?.message || (!res ? 'no response' : !res.ok ? res.error : null);
        todo.forEach((c, i) => {
          const r = fail ? { error: fail } : res.names[i];
          if (r && r.error) c.error = r.error;
          else c.auto = r;
        });
        render();
      }
    );
  }

  function syncCurrent() {
    const next = byPath.get(location.pathname) || null;
    if (next !== current) { current = next; render(); }
  }
  setInterval(syncCurrent, 600); // SPA navigation

  // ---------- floating panel ----------
  let panel = null;
  function ensurePanel() {
    if (panel && document.body.contains(panel)) return panel;
    panel = document.createElement('div');
    panel.id = 'hhcn-panel';
    panel.addEventListener('click', (e) => {
      if (e.target.closest('a')) return; // the ↗ OpenStreetMap link
      const t = e.target.closest('[data-hhcn]');
      if (!t) return;
      const act = t.dataset.hhcn;
      if (act === 'toggle') {
        collapsed = !collapsed;
        chrome.storage.sync.set({ collapsed });
        render();
      } else if (act === 'rename') {
        rename(current.climbs[+t.dataset.i]);
      } else if (act === 'retry') {
        requestNames(current);
      } else if (act === 'open') {
        openClimb(current.climbs[+t.dataset.i], t);
      }
    });
    document.body.appendChild(panel);
    return panel;
  }

  // Small tag next to the name: where the name comes from.
  const SOURCE_LABEL = { summit: 'summit', road: 'road', place: 'place', custom: 'yours', none: '', pending: '', error: '' };
  const SOURCE_TITLE = {
    summit: 'Named summit or pass in OpenStreetMap',
    road: 'Name of the road the climb follows (OpenStreetMap)',
    place: 'Nearest village or town (OpenStreetMap)',
    custom: 'Your own name for this climb',
  };

  function render() {
    renderPanel();
    decorateDashboard();
  }

  function renderPanel() {
    if (!current || !current.climbs.length) {
      if (panel) panel.style.display = 'none';
      return;
    }
    const el = ensurePanel();
    el.style.display = '';
    const rows = current.climbs.map((c, i) => {
      const d = displayName(c);
      const osm = `https://www.openstreetmap.org/?mlat=${c.top[0]}&mlon=${c.top[1]}#map=15/${c.top[0]}/${c.top[1]}`;
      return `<li class="hhcn-row hhcn-${d.source}${c === activeClimb ? ' hhcn-active' : ''}" data-hhcn="open" data-i="${i}" title="Show this climb in the dashboard">
        <span class="hhcn-num">${i + 1}</span>
        <div class="hhcn-main">
          <div class="hhcn-name-row">
            <span class="hhcn-name" title="${esc(d.name)}">${esc(d.name)}</span>
            ${SOURCE_LABEL[d.source] ? `<span class="hhcn-src" title="${SOURCE_TITLE[d.source]}">${SOURCE_LABEL[d.source]}</span>` : ''}
          </div>
          ${d.detail ? `<div class="hhcn-detail" title="${esc(d.detail)}">${esc(d.detail)}</div>` : ''}
          <div class="hhcn-stats">${km(c.length)} · ${c.grade.toFixed(1)}% · +${c.gain} m · at ${km(c.startDist)}</div>
        </div>
        <div class="hhcn-actions">
          <button data-hhcn="rename" data-i="${i}" title="Rename this climb">✎</button>
          <a href="${osm}" target="_blank" rel="noopener" title="Show the top on OpenStreetMap">↗</a>
        </div>
      </li>`;
    }).join('');
    const anyError = current.climbs.some((c) => c.error && !c.auto);
    el.className = collapsed ? 'hhcn-collapsed' : '';
    el.innerHTML = `
      <button class="hhcn-head" data-hhcn="toggle" title="${collapsed ? 'Show' : 'Hide'} climb names">
        <span class="hhcn-head-title">Climb<b>Namer</b></span>
        <span class="hhcn-count" title="${current.climbs.length} climbs">${current.climbs.length}</span>
        <span class="hhcn-caret">${collapsed ? '▸' : '▾'}</span>
      </button>
      ${collapsed ? '' : `<ol class="hhcn-list">${rows}</ol>`}
      ${!collapsed && anyError ? '<button class="hhcn-retry" data-hhcn="retry">↻ Retry name lookup</button>' : ''}`;
  }

  // ---------- decorate the dashboard's own climb UI ----------
  // Map the visible climb chips under the elevation profile to our climbs.
  // The dashboard can hide small climbs (climb-size filter) and reuses chip elements,
  // so match each chip by its start position, using the distance axis for the scale.
  function chipMapping() {
    const chips = [...document.querySelectorAll('g[data-testid="climbs"]')];
    if (!chips.length) return [];
    const climbs = current.climbs;
    const svg = chips[0].ownerSVGElement;
    let scale = null; // px per metre
    if (svg) {
      for (const t of svg.querySelectorAll('text[x]')) {
        const m = t.textContent.trim().match(/^([\d.,]+)\s*(km|mi)$/i);
        const x = parseFloat(t.getAttribute('x'));
        const v = m && parseFloat(m[1].replace(',', '.')) * (m[2].toLowerCase() === 'mi' ? 1609.34 : 1000);
        if (v > 0 && x > 0) { scale = x / v; break; }
      }
    }
    const items = chips.map((g) => {
      const mm = (g.getAttribute('transform') || '').match(/translate\(\s*([-\d.]+)/);
      return { g, x: mm ? parseFloat(mm[1]) : 0 };
    }).sort((a, b) => a.x - b.x);
    items.forEach((it, i) => {
      if (scale) {
        const d = it.x / scale;
        it.climb = climbs.reduce((best, c) => (Math.abs(c.startDist - d) < Math.abs(best.startDist - d) ? c : best), climbs[0]);
      } else if (chips.length === climbs.length) {
        it.climb = climbs[i];
      }
    });
    return items;
  }

  // ---------- open a climb in the dashboard ----------
  // Uses the dashboard's own controls, the way you would by hand: close an open climb
  // panel, expand the elevation profile, show all climbs if the size filter hides this
  // one, then click the climb's chip.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clickEl = (el) => el && el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  async function waitFor(fn, ms = 2500) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const v = fn();
      if (v) return v;
      await sleep(100);
    }
    return null;
  }
  function headerHost() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (/^\s*Climb \d+ of \d+\s*$/.test(n.textContent) && !n.parentElement.closest('#hhcn-panel')) return n.parentElement;
    }
    return null;
  }
  const chipFor = (climb) => chipMapping().find((it) => it.climb === climb);
  const findText = (text) =>
    [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && e.textContent.trim() === text && !e.closest('#hhcn-panel'));

  let opening = false;
  async function openClimb(climb, rowEl) {
    if (!climb || opening) return;
    opening = true;
    rowEl?.classList.add('hhcn-busy');
    try {
      // Already showing this climb?
      if (activeClimb === climb && headerHost()) return;

      let chip = chipFor(climb);

      // A route's open climb panel replaces the profile: close it first.
      if (!chip && headerHost()) {
        const btns = [...headerHost().querySelectorAll(':scope > button')];
        clickEl(btns.find((b) => /\babsolute\b/.test(b.className)) || btns[btns.length - 1]);
        await waitFor(() => !headerHost() || chipFor(climb));
        chip = await waitFor(() => chipFor(climb), 1500);
      }

      // Profile not shown yet: route → the distance/elevation box; ride → "Ride Data".
      if (!chip && !document.querySelector('g[data-testid="climbs"]')) {
        const routeToggle = document.querySelector('[data-testid="elevation"]')?.closest('.mapbox-custom-control-group');
        clickEl(routeToggle || findText('Ride Data')?.closest('button,[role=button]') || findText('Ride Data'));
        chip = await waitFor(() => chipFor(climb));
      }

      // Hidden by the climb-size filter: switch the filter to "All climbs".
      if (!chip && document.querySelector('button[aria-label="Choose Climbs"]')) {
        clickEl(document.querySelector('button[aria-label="Choose Climbs"]'));
        const opt = await waitFor(() => findText('All climbs'));
        if (opt) {
          clickEl(opt.closest('[role=menuitem],[role=option],li,label,button') || opt);
          await sleep(250);
        }
        clickEl(document.querySelector('.MuiPopover-root .MuiBackdrop-root, .MuiModal-root .MuiBackdrop-root'));
        chip = await waitFor(() => chipFor(climb));
      }

      if (chip) {
        clickEl(chip.g.querySelector('rect') || chip.g);
      } else {
        rowEl?.classList.add('hhcn-failed');
        setTimeout(() => rowEl?.classList.remove('hhcn-failed'), 1500);
      }
    } finally {
      opening = false;
      rowEl?.classList.remove('hhcn-busy');
    }
  }

  function climbForHeader(n, m) {
    const climbs = current.climbs;
    if (m === climbs.length) return climbs[n - 1];
    const chips = chipMapping();
    if (chips.length === m && chips[n - 1]?.climb) return chips[n - 1].climb;
    // Route view with a climb-size filter: match on the "Start distance" shown in the panel.
    const label = [...document.querySelectorAll('body *')].find(
      (e) => e.childElementCount === 0 && e.textContent.trim() === 'Start distance'
    );
    const valEl = label && (label.nextElementSibling || label.parentElement?.nextElementSibling);
    const m2 = valEl && valEl.textContent.match(/([\d.,]+)\s*(km|mi)/i);
    if (!m2) return null;
    let d = parseFloat(m2[1].replace(',', '.')) * (m2[2].toLowerCase() === 'mi' ? 1609.34 : 1000);
    return climbs.reduce((best, c) => (Math.abs(c.startDist - d) < Math.abs(best.startDist - d) ? c : best), climbs[0]);
  }

  function decorateDashboard() {
    // Header "Climb N of M" in the climb detail panel.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node, active = null;
    while ((node = walker.nextNode())) {
      const m = node.textContent.match(/^\s*Climb (\d+) of (\d+)\s*$/);
      if (!m) continue;
      const host = node.parentElement;
      if (!host || host.closest('#hhcn-panel')) continue;
      let tag = host.querySelector(':scope > .hhcn-title');
      const climb = current && current.climbs.length ? climbForHeader(+m[1], +m[2]) : null;
      active = climb || active;
      const text = climb ? displayName(climb).name : '';
      if (!text) { tag?.remove(); continue; }
      if (!tag) {
        tag = document.createElement('span');
        tag.className = 'hhcn-title';
        node.after(tag);
      }
      if (tag.textContent !== ' · ' + text) tag.textContent = ' · ' + text;
    }

    // Highlight the climb that is open in the dashboard.
    if (active !== activeClimb) {
      activeClimb = active;
      panel?.querySelectorAll('.hhcn-row').forEach((row) => {
        row.classList.toggle('hhcn-active', current?.climbs[+row.dataset.i] === activeClimb);
      });
    }

    // Tooltips on the climb chips under the elevation profile.
    if (current && current.climbs.length) {
      chipMapping().forEach(({ g, climb }) => {
        let t = g.querySelector(':scope > title');
        if (!climb) { t?.remove(); return; }
        const label = `${displayName(climb).name} — ${km(climb.length)}, ${climb.grade.toFixed(1)}%`;
        if (!t) {
          t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
          g.prepend(t);
        }
        if (t.textContent !== label) t.textContent = label;
      });
    }
  }

  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      if (current) decorateDashboard();
    });
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
