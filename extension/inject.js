// Runs in the page's own JS world (MAIN), after climbs.js. Observes the dashboard's own
// API responses and forwards what it finds to the extension's content script.
// It never changes requests or responses.
(() => {
  if (window.__hhClimbNamesHooked) return;
  window.__hhClimbNamesHooked = true;

  const { fromRouteElevation, fromActivityDetails, fromList } = self.HHClimbs;
  const ROUTE_ELEVATION = /\/v1\/routes\/elevation(\?|$)/;
  const ACTIVITY_DETAILS = /\/v1\/users\/[^/]+\/activities\/[^/?]+\/details/;
  const LIST = /\/v1\/users\/[^/]+\/(routes|activities)\?/;
  const watched = (url) => ROUTE_ELEVATION.test(url) || ACTIVITY_DETAILS.test(url) || LIST.test(url);

  function post(type, payload) {
    window.postMessage({ __hhClimbNames: true, type, payload }, location.origin);
  }

  /**
   * @param {string} url
   * @param {object} json
   * @param {string} path  page address when the request was made
   * @returns {void}
   */
  function handleJson(url, json, path) {
    try {
      if (ROUTE_ELEVATION.test(url) || ACTIVITY_DETAILS.test(url)) {
        const p = ROUTE_ELEVATION.test(url) ? fromRouteElevation(json) : fromActivityDetails(json);
        if (p) post('climbs', { ...p, path });
      } else if (LIST.test(url)) {
        const items = fromList(url, json);
        if (items.length) post('list', { items });
      }
    } catch (e) {
      console.warn('[Climb names]', e);
    }
  }

  // Report address changes (the dashboard is a single-page app). The content script uses
  // this to forget climbs of an unsaved route: every new route opens at /routes/new.
  /** @type {string} */
  let lastPath = location.pathname;
  /** @returns {void} */
  const reportNavigation = () => {
    const to = location.pathname;
    if (to === lastPath) return;
    post('navigate', { from: lastPath, to });
    lastPath = to;
  };
  for (const method of ['pushState', 'replaceState']) {
    const orig = history[method];
    history[method] = function () {
      const result = orig.apply(this, arguments);
      reportNavigation();
      return result;
    };
  }
  window.addEventListener('popstate', reportNavigation);

  const origFetch = window.fetch;
  window.fetch = function (input) {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    const path = location.pathname;
    const p = origFetch.apply(this, arguments);
    if (watched(url)) {
      p.then((res) => {
        if (res.ok) res.clone().json().then((j) => handleJson(url, j, path)).catch(() => {});
      }).catch(() => {});
    }
    return p;
  };

  // XHR fallback, in case the dashboard switches HTTP clients.
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__hhUrl = String(url);
    return origOpen.apply(this, arguments);
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    const url = this.__hhUrl || '';
    const path = location.pathname;
    if (watched(url)) {
      this.addEventListener('load', () => {
        try {
          if (this.status < 200 || this.status >= 300) return;
          handleJson(url, this.responseType === 'json' ? this.response : JSON.parse(this.responseText), path);
        } catch (e) {}
      });
    }
    return origSend.apply(this, arguments);
  };
})();
