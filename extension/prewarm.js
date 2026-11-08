// Extension world, loaded before content.js. When a Routes, Rides or Home list loads,
// looks up climb names for the newest items in the background, so they are already
// cached when you open one. Items are processed one at a time, and the page you
// actually open always gets priority for name lookups (see naming.js).
(() => {
  const LIMIT = 10;          // newest items per list
  const GAP_MS = 1000;       // pause between items, to stay gentle on Hammerhead's API
  const COOLDOWN_MS = 15 * 60 * 1000; // after a failed lookup, pause background lookups
  const COOLDOWN_KEY = 'pw:cooldownUntil';

  // Background lookups can be switched off in the settings (fair use of OSM services).
  let enabled = true;
  chrome.storage.sync.get({ prefetch: true }, (v) => (enabled = v.prefetch !== false));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.prefetch) enabled = changes.prefetch.newValue !== false;
  });

  async function coolingDown() {
    const until = (await chrome.storage.local.get(COOLDOWN_KEY))[COOLDOWN_KEY] || 0;
    return Date.now() < until;
  }
  const queue = [];
  const queued = new Set();
  let running = false;

  const doneKey = (item) => 'pw:' + item.id;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function getJson(url, init) {
    const res = await fetch(url, { credentials: 'include', ...init });
    if (!res.ok) throw new Error(url + ' HTTP ' + res.status);
    return res.json();
  }

  async function climbsFor(item) {
    if (item.kind === 'route') {
      const route = await getJson(`/v1/users/${item.uid}/routes/${item.id}`);
      if (!route.routePolyline) return [];
      const elev = await getJson('/v1/routes/elevation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ polyline: route.routePolyline }),
      });
      return HHClimbs.fromRouteElevation(elev)?.climbs || [];
    }
    const details = await getJson(`/v1/users/${item.uid}/activities/${item.id}/details`);
    return HHClimbs.fromActivityDetails(details)?.climbs || [];
  }

  function nameInBackground(climbs) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'nameClimbs',
          background: true,
          climbs: climbs.map((c) => ({ start: c.start, top: c.top, maxEle: c.maxEle, points: c.points })),
        },
        (res) => resolve(!chrome.runtime.lastError && res && res.ok && res.names.every((n) => n && !n.error))
      );
    });
  }

  async function run() {
    if (running) return;
    running = true;
    try {
      while (queue.length) {
        if (!enabled || (await coolingDown())) {
          queue.length = 0;
          queued.clear();
          break;
        }
        const item = queue.shift();
        try {
          // Skip what is already done, e.g. when the same list loads again.
          const key = doneKey(item);
          const done = (await chrome.storage.local.get(key))[key];
          if (done === item.stamp) continue;
          const climbs = await climbsFor(item);
          const ok = climbs.length ? await nameInBackground(climbs) : true;
          if (ok) await chrome.storage.local.set({ [key]: item.stamp });
          // Services busy: stop and leave them alone for a while.
          else await chrome.storage.local.set({ [COOLDOWN_KEY]: Date.now() + COOLDOWN_MS });
        } catch (e) {
          console.debug('[Climb names] prefetch skipped', item.id, e);
        } finally {
          queued.delete(item.id);
        }
        await sleep(GAP_MS);
      }
    } finally {
      running = false;
    }
  }

  async function enqueue(items) {
    if (!enabled || (await coolingDown())) return;
    const fresh = items.slice(0, LIMIT).filter((it) => !queued.has(it.id));
    if (!fresh.length) return;
    const done = await chrome.storage.local.get(fresh.map(doneKey));
    for (const it of fresh) {
      if (done[doneKey(it)] === it.stamp) continue;
      queued.add(it.id);
      queue.push(it);
    }
    run();
  }

  // Skip the item that is open right now; its page lookup already covers it.
  self.HHPrewarm = {
    onList(items) {
      enqueue(items.filter((it) => !location.pathname.endsWith(it.id)));
    },
  };
})();
