# AstroScout Interface Study

Reference review: 7 September 2026. These notes explain design decisions; they are not product copy.

## NASA Skywatching

[Reference](https://science.nasa.gov/skywatching/)

The page establishes the subject through a large, credited photograph, a clear title and restrained supporting text. Topic navigation separates monthly highlights, the Moon, meteor showers and guides. Full-width sections have different rhythms, with generous space between subjects. Editorial content does not compete with tool controls.

Applied: a photographic Tonight view, stronger typography, short sections with distinct purposes, image credits, and deeper reading kept below the primary observing activity. NASA imagery is identified as spacecraft imagery or a named landscape, never presented as the current local sky.

## Stellarium Web

[Reference](https://stellarium-web.org/)

The inspected interface gives most of its area to the sky. Search, time and display tools sit around the perimeter, with additional settings separated into a side surface. This makes the observing experience the focus instead of presenting every setting at once.

Applied: a dedicated sky view, a compact location/time strip, optional planning settings, and a focused object selection area. AstroScout's horizon diagram uses its actual calculated Moon/planet positions. It is not a replacement for Stellarium's star catalogue or 3D planetarium; an explicit link opens Stellarium for that experience.

## Go Stargazing

[Reference](https://gostargazing.co.uk/astronomical-events-calendar/)

The site's navigation distinguishes events, locations, advice and community. Its astronomical calendar has its own destination, separate from location discovery and supporting articles. The calendar feed itself was not exposed in the inspected page, so no interaction claims or event data were inferred from it.

Applied: separate Places and Calendar destinations. A month grid and a chronological agenda support scanning by date. AstroScout calculates lunar quarter phases, solstices and equinoxes with Astronomy Engine. It does not copy UK events into a NSW planner or invent event listings.

## Information Architecture

| URL | Main task | Secondary content |
| --- | --- | --- |
| `/` | Explore tonight's sky | Observing guides and links |
| `/places` | Choose a site | Map, concise details, expandable forecast |
| `/calendar` | Browse upcoming astronomical dates | Event details and provenance |
| `/observe` | Check an object with equipment | Conditions and save an attempt |
| `/journal` | Review and report actual attempts | Import and export |
| `/method` | Inspect model evidence | Expandable location preference model |
| `/compare` | Compare shortlisted sites | Available from Places |

The shared Next.js layout preserves planning and observation state between these routes. The settings panel opens on demand. Journal entries and model explanations no longer occupy the main observing screen. Existing site detail pages remain available for access notes and travel information.

## Visual And Interaction Rules

The type pairing is Geist for navigation, controls, data and reading text, with Newsreader for editorial page and section headings. These are real variable fonts, self-hosted through Next.js; the body no longer depends on a platform-specific Segoe UI fallback. Type sizes and reading measures use shared tokens. Text is not scaled continuously with viewport width.

Motion 13 handles small state transitions with reduced-motion support. Radix UI provides tooltips and single-selection groups with keyboard focus management. Functional additions include sky-time playback and scrubbing, directly selectable plot targets, a mobile navigation disclosure, calendar keyboard navigation and a Today shortcut. No new synthetic astronomy or weather data is introduced.

Implementation references: [Next.js font optimization](https://nextjs.org/docs/app/getting-started/fonts), [Motion LazyMotion](https://motion.dev/docs/react-lazy-motion), [Radix Toggle Group](https://www.radix-ui.com/primitives/docs/components/toggle-group), [Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip).

- Use a charcoal navigation band, white reading surfaces, muted green functional accents, and restrained warm image accents.
- Give each destination one main heading and one main task. Avoid equal-weight grids of unrelated metrics.
- Keep real imagery visible and credited. No decorative generated stars or implied live telescope feed.
- Use links for navigation, buttons for actions, selects for choices, and segmented controls for equipment.
- Preserve visible focus, active navigation, browser back/forward, direct URLs and reduced-motion support.
- On narrow screens, stack reading sections, use a collapsible navigation menu, and retain stable calendar cells.
- Forecast outages and missing training evidence remain explicit; visual polish must not create false certainty.
