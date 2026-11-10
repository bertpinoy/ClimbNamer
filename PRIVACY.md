# ClimbNamer — Privacy Policy

*Effective date: 10 November 2026*

ClimbNamer ("the extension") is a browser extension for Google Chrome and Microsoft
Edge that adds names to the climbs shown on dashboard.hammerhead.io. This policy
explains what data the extension uses, where it goes, and what is stored.

**In short:** the extension has no server of its own, no analytics and no tracking.
The only data that leaves your browser is the location of the climbs on the route
or ride you are looking at, which is sent to public OpenStreetMap services to find
their names.

## 1. Data the extension reads

While you use dashboard.hammerhead.io, the extension reads, inside your browser:

- the climbs the dashboard detects on your routes and rides (their position along the
  route, start/end and elevation profile), from the data the dashboard itself loads;
- for the newest routes and rides in a list you open (only when "Background lookups"
  is switched on), the same route and ride data, requested from the Hammerhead
  dashboard with your existing login session.

The extension does not read or store your Hammerhead login details, and it does not
change anything in your Hammerhead account.

## 2. Data sent to third parties

To find a name for a climb, the extension sends **geographic coordinates of that
climb** (points along the climb and the position of its top, plus a small area around
it) to these public OpenStreetMap services. In addition, the first time you look at
a climb in a new area, the extension downloads the named summits and passes of that
whole area (a rectangle of about 55 × 50 km); that request contains only the
rectangle's coordinates. Climbs in Belgium, the Netherlands and Luxembourg can often
be named from summit data included in the extension itself, without any request.

| Service | Operated by | Used for |
|---|---|---|
| overpass-api.de | FOSSGIS e.V. (Germany) | Named summits, passes, roads and places near the climb |
| overpass.kumi.systems | Kumi Systems (Austria) | Same, as a mirror when the first one is busy |
| nominatim.openstreetmap.org | OpenStreetMap Foundation | Fallback when Overpass is busy (only for the route or ride you open) |

No other information is added to these requests: no name, account, route title,
heart rate, power, speed or timestamps. As with any web request, these services
can see your IP address and browser information. The requests identify the
extension as "ClimbNamer" with a link to this project. Their own privacy policies
apply, for example the
[OpenStreetMap Foundation Privacy Policy](https://osmfoundation.org/wiki/Privacy_Policy).

Clicking ↗ in the climb panel opens openstreetmap.org in a new tab at the top of
that climb; this is a normal link you choose to follow.

The developer of ClimbNamer receives **no data at all**.

## 3. Data stored on your device

The extension stores, using your browser's extension storage:

- **Name cache** (local to this browser): the names found for climbs, keyed by
  rounded coordinates, markers for which routes/rides were already looked up, and the
  named summits and passes of areas you rode or planned in (at most 80 areas).
  This avoids repeating lookups. You can clear it under *Settings → Clear name cache*,
  or by removing the extension.
- **Your settings and custom climb names** (browser *sync* storage): names you gave
  climbs with ✎ (with the coordinates of that climb), whether the panel is collapsed,
  and whether background lookups are on. If you use browser sync, your browser
  provider (Google or Microsoft) syncs this between your devices, under their
  privacy policy.

## 4. What the extension does not do

- No analytics, telemetry, advertising or tracking.
- No selling, renting or sharing of data, and no use of data for any purpose other
  than naming climbs on the Hammerhead dashboard.
- No use of data to determine creditworthiness or for lending purposes.
- No access to any website other than dashboard.hammerhead.io and the
  OpenStreetMap services listed above.

## 5. Children

The extension is not directed at children and does not knowingly collect data from
anyone.

## 6. Changes

If this policy changes, the updated version will be published at
<https://github.com/bertpinoy/ClimbNamer/blob/main/PRIVACY.md> with a new effective date.

## 7. Contact

Questions or concerns: please open an issue at
<https://github.com/bertpinoy/ClimbNamer/issues>.

---

ClimbNamer is an independent project and is not affiliated with, endorsed by or
sponsored by Hammerhead or SRAM. Map data © OpenStreetMap contributors (ODbL).
