importScripts('naming.js');

// Fair use: identify ClimbNamer to the OpenStreetMap services (their usage policies ask
// apps to identify themselves). Applies only to requests made by this extension.
const USER_AGENT = `ClimbNamer/${chrome.runtime.getManifest().version} (+https://github.com/bertpinoy/ClimbNamer)`;
chrome.declarativeNetRequest
  .updateSessionRules({
    removeRuleIds: [1],
    addRules: [{
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [{ header: 'User-Agent', operation: 'set', value: USER_AGENT }],
      },
      condition: {
        requestDomains: ['overpass-api.de', 'overpass.kumi.systems', 'nominatim.openstreetmap.org'],
        initiatorDomains: [chrome.runtime.id],
        resourceTypes: ['xmlhttprequest', 'other'],
      },
    }],
  })
  .catch((e) => console.warn('[ClimbNamer] could not set User-Agent rule', e));

const CACHE_VERSION = 2;
const inflight = new Map(); // cache key -> { p: Promise<result>, prio: { low } }
// Note: names are cached without expiry; names of hills and roads rarely change,
// and "Clear name cache" in the settings forces new lookups.

function climbKey(c) {
  const r = (v) => v.toFixed(3); // ~100 m grid
  return `v${CACHE_VERSION}:${r(c.start[0])},${r(c.start[1])}>${r(c.top[0])},${r(c.top[1])}`;
}

// background: true for prefetch from list pages (lower priority).
async function getNames(climbs, background) {
  const keys = climbs.map(climbKey);
  const cached = await chrome.storage.local.get(keys);
  const results = new Array(climbs.length);
  const todo = [];
  const waits = [];

  climbs.forEach((c, i) => {
    const k = keys[i];
    if (cached[k]) results[i] = cached[k];
    else if (inflight.has(k) && (background || !inflight.get(k).prio.low)) {
      waits.push(inflight.get(k).p.then((r) => (results[i] = r)));
    } else {
      // Not cached, or only queued in a slower background batch: look it up now.
      todo.push(i);
    }
  });

  if (todo.length) {
    const prio = { low: !!background };
    const batch = HHNaming.nameClimbs(todo.map((i) => climbs[i]), prio);
    todo.forEach((i, j) => {
      const k = keys[i];
      const entry = { prio };
      entry.p = batch
        .then(async (arr) => {
          const r = arr[j];
          if (r && !r.error) await chrome.storage.local.set({ [k]: { ...r, at: Date.now() } });
          return r;
        })
        .finally(() => { if (inflight.get(k) === entry) inflight.delete(k); });
      inflight.set(k, entry);
      waits.push(entry.p.then((r) => (results[i] = r)));
    });
  }

  await Promise.all(waits);
  return results;
}

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'nameClimbs') {
    getNames(msg.climbs, !!msg.background)
      .then((names) => sendResponse({ ok: true, names }))
      .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
    return true; // async response
  }
  if (msg?.type === 'clearCache') {
    chrome.storage.local.clear().then(() => sendResponse({ ok: true }));
    return true;
  }
});
