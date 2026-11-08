# Store listing — ClimbNamer

Texts to paste into the Chrome Web Store Developer Dashboard and Microsoft Partner
Center (Edge Add-ons). Keep both stores in sync.

## Basics

| Field | Value |
|---|---|
| Name | ClimbNamer - for Hammerhead Dashboard *(from the manifest)* |
| Category | Chrome: *Productivity* (or *Tools*) · Edge: *Productivity* |
| Language | English |
| Homepage / support URL | https://github.com/bertpinoy/ClimbNamer |
| Support / contact | https://github.com/bertpinoy/ClimbNamer/issues |
| Privacy policy URL | https://github.com/bertpinoy/ClimbNamer/blob/main/PRIVACY.md |
| Icon | `extension/icons/icon-128.png` (from the zip) |
| Small promo tile (Chrome, optional) | `store/promo-tile-440x280.png` |
| Screenshots | `store/screenshots/*.png` (1280×800), see below |

## Short description (manifest, max 132 characters)

> Names the climbs on your routes and rides in the Hammerhead dashboard, using OpenStreetMap. Not affiliated with Hammerhead or SRAM.

## Detailed description

```
The Hammerhead dashboard detects the climbs on your routes and rides, but only shows them as "Climb 1 of 3". ClimbNamer tells you which climb it is: Kemmelberg, Koppenberg, Col du Tourmalet…

FEATURES
• A "Climb names" panel on every route and ride with climbs: name, length, average grade, elevation gain and where the climb starts.
• Click a climb in the panel to open it in the dashboard.
• The name also appears in the dashboard's own climb header ("Climb 3 of 3 · Kemmelberg") and as a tooltip on the climb markers under the elevation profile.
• Rename any climb. Your name is used for that climb on all your routes and rides.
• Fast: names are cached, and the newest routes and rides are looked up in the background so names are ready when you open them (can be switched off).

HOW NAMES ARE FOUND
ClimbNamer uses OpenStreetMap data: a named summit or pass at the top of the climb, otherwise the road the climb follows (in Flanders that is often the climb's name itself), otherwise the nearest village.

PRIVACY
No account, no analytics, no tracking, no server of our own. Only the coordinates of the climbs are sent to public OpenStreetMap services (Overpass API, Nominatim) to look up names. Your custom names and settings are stored in your browser.

ClimbNamer is an independent, open-source project and is not affiliated with, endorsed by or sponsored by Hammerhead or SRAM. Hammerhead and Karoo are trademarks of their respective owners.
Map data © OpenStreetMap contributors, ODbL.
Source code: https://github.com/bertpinoy/ClimbNamer
```

## Chrome: Privacy practices tab

**Single purpose description**

```
ClimbNamer shows names for the climbs that the Hammerhead dashboard (dashboard.hammerhead.io) detects on the user's routes and rides.
```

**Permission justifications**

| Permission | Justification |
|---|---|
| `storage` | Stores the cache of climb names (so each climb is looked up only once), the user's own climb names and the extension's settings. |
| `declarativeNetRequestWithHostAccess` | Sets an identifying User-Agent ("ClimbNamer/version + project URL") on the extension's own requests to the OpenStreetMap services, as their usage policies require. It does not block or modify any other requests. |
| Host permission `https://dashboard.hammerhead.io/*` (content scripts) | Reads the climbs the dashboard detects on routes and rides, and shows their names in the dashboard. |
| Host permissions `https://overpass-api.de/*`, `https://overpass.kumi.systems/*`, `https://nominatim.openstreetmap.org/*` | Looks up the names of summits, passes and roads at the climbs' locations in OpenStreetMap. |

**Remote code:** No, I am not using remote code. *(All JavaScript is in the package.)*

**Data usage: what is collected**

- ☑ **Location**: the coordinates of climbs on the user's routes and rides are sent to
  OpenStreetMap services to look up names.
- ☐ Everything else (personally identifiable info, health info, financial info,
  authentication info, personal communications, web history, user activity, website
  content): not collected.

  *Note: route/ride data is read in the browser only to compute the climbs and is not
  transmitted. If the reviewer considers fitness routes "health" or "website content",
  tick that too; the answer to the certifications below stays the same.*

**Certifications**: tick all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

## Edge: Partner Center

- **Description**: same detailed description as above.
- **Privacy policy**: required ("Yes, it accesses personal information"); use the URL above.
- **Notes for certification**:

```
The extension only runs on https://dashboard.hammerhead.io (a Hammerhead/SRAM account is needed to see routes and rides). To test without an account: the panel appears on any route or ride page that has climbs. Climb names are looked up from OpenStreetMap (Overpass API / Nominatim). No remote code; no data is sent to the developer.
```

## Screenshots

Upload in this order (1280×800 PNG, accepted by both stores):

1. `screenshots/1-route-climb-names.png`: a route with three named climbs
   (Vidaigneberg, Rodeberg, Kemmelberg; summits from OpenStreetMap).
2. `screenshots/2-route-single-climb.png`: a short route where the climb is named
   after the road it follows (Sulferbergstraat).

Possible additions (max 5 on Chrome, 10 on Edge): a climb opened from the panel
("Climb 2 of 3 · Rodeberg"), a ride's Ride Data with the panel, the settings page.

Originals are scaled to 1280 px wide; a thin neutral band above and below fills the
remaining height, so nothing is cropped.
