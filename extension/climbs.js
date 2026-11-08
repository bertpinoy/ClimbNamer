// Turns Hammerhead dashboard API responses into climb geometry.
// Loaded in both the page world (inject.js) and the extension world (content.js / prewarm.js).
(() => {
  if (self.HHClimbs) return;

  function decodePolyline(str, precision = 5) {
    const factor = Math.pow(10, precision);
    const out = [];
    let index = 0, lat = 0, lng = 0;
    while (index < str.length) {
      let result = 0, shift = 0, b;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;
      result = 0; shift = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      out.push([lat / factor, lng / factor]);
    }
    return out;
  }

  function hav(a, b) {
    const R = 6371000, r = (d) => (d * Math.PI) / 180;
    const s = Math.sin(r(b[0] - a[0]) / 2) ** 2 +
      Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function thin(points, max) {
    if (points.length <= max) return points;
    const out = [];
    for (let i = 0; i < max; i++) out.push(points[Math.round((i * (points.length - 1)) / (max - 1))]);
    return out;
  }

  // points: [lat, lng, ele, distAlong]
  function buildClimb(points, startDist, endDist) {
    if (points.length < 2) return null;
    let top = points[0], gain = 0, minEle = Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p[2] > top[2]) top = p;
      if (p[2] < minEle) minEle = p[2];
      if (i && p[2] > points[i - 1][2]) gain += p[2] - points[i - 1][2];
    }
    const length = endDist - startDist;
    const rise = top[2] - points[0][2];
    return {
      startDist, endDist, length,
      gain: Math.round(gain),
      grade: length > 0 ? (rise / length) * 100 : 0,
      maxEle: top[2], minEle,
      start: [points[0][0], points[0][1]],
      top: [top[0], top[1]],
      points: thin(points, 80).map((p) => [p[0], p[1], p[2]]),
    };
  }

  /** Response of POST /v1/routes/elevation */
  function fromRouteElevation(json) {
    if (!json || !Array.isArray(json.climbs)) return null;
    const coords = json.resampledPolyline ? decodePolyline(json.resampledPolyline) : [];
    const eles = json.elevations || [];
    if (!coords.length) return null;
    if (coords.length !== eles.length) {
      console.warn('[Climb names] unexpected route elevation format', coords.length, eles.length);
    }
    const dist = [0];
    for (let i = 1; i < coords.length; i++) dist.push(dist[i - 1] + hav(coords[i - 1], coords[i]));
    const climbs = json.climbs
      .map((c) => {
        const s = Math.max(0, c.startIndex), e = Math.min(coords.length - 1, c.endIndex);
        const pts = [];
        for (let i = s; i <= e; i++) pts.push([coords[i][0], coords[i][1], eles[i] ?? 0, dist[i]]);
        const climb = buildClimb(pts, dist[s], dist[e]);
        if (climb) climb.classification = c.classification;
        return climb;
      })
      .filter(Boolean)
      .sort((a, b) => a.startDist - b.startDist);
    return { kind: 'route', totalDist: dist[dist.length - 1], climbs };
  }

  /** Response of GET /v1/users/{uid}/activities/{id}/details */
  function fromActivityDetails(json) {
    const climbsRaw = json?.activityData?.climbs;
    const rd = json?.recordData;
    if (!Array.isArray(climbsRaw) || !rd || !rd.distance) return null;
    const climbs = climbsRaw
      .map((c) => {
        const pts = [];
        for (let i = 0; i < rd.distance.length; i++) {
          const d = rd.distance[i];
          if (d == null || d < c.startDistance || d > c.endDistance) continue;
          if (rd.lat[i] == null || rd.lng[i] == null) continue;
          pts.push([rd.lat[i], rd.lng[i], rd.elevation?.[i] ?? 0, d]);
        }
        return buildClimb(pts, c.startDistance, c.endDistance);
      })
      .filter(Boolean)
      .sort((a, b) => a.startDist - b.startDist);
    const total = rd.distance.reduce((m, d) => (d != null && d > m ? d : m), 0);
    return { kind: 'activity', totalDist: total, climbs };
  }

  /** Response of GET /v1/users/{uid}/routes?… or /activities?… → [{ kind, uid, id, stamp }] */
  function fromList(url, json) {
    const m = url.match(/\/v1\/users\/([^/]+)\/(routes|activities)\?/);
    if (!m || !json || !Array.isArray(json.data)) return [];
    const kind = m[2] === 'routes' ? 'route' : 'activity';
    return json.data
      .filter((x) => x && x.id)
      .map((x) => ({ kind, uid: m[1], id: x.id, stamp: x.updatedAt || x.createdAt || '' }));
  }

  self.HHClimbs = { fromRouteElevation, fromActivityDetails, fromList };
})();
