# AstroScout Interface Study

References reviewed on 7 September 2026; implementation updated for the unified JPL workflow on 8 September 2026.

## NASA Skywatching
[Reference](https://science.nasa.gov/skywatching/)

The reference separates skywatching topics, photography and deeper reading. AstroScout uses a restrained editorial hierarchy and progressive disclosure. Source definitions and technical details do not compete with the active observing controls. Imagery is never represented as a current local observation.

## Stellarium Web
[Reference](https://stellarium-web.org/)

The sky is the primary working area, with time and observer controls nearby. AstroScout gives the target's altitude timeline the main column, keeps regional weather separate, and places exact observer/time settings in a disclosure. Its graph connects actual JPL samples; it is not a star catalogue or a three-dimensional planetarium.

## Go Stargazing
[Reference](https://gostargazing.co.uk/astronomical-events-calendar/)

Navigation separates dates, places and observing information. The inspected calendar feed was not exposed, so no event data or interaction behaviour was inferred. AstroScout's calendar is now a UTC date selector for JPL night scans, not a locally calculated lunar/seasonal event list.

## Navigation
- Tonight and Night planner share the same JPL observing analysis.
- Observe contains image upload, image-quality analysis, equipment and visitor outcomes.
- Calendar selects an observing date without inventing events.
- Journal presents saved reports and source snapshots.
- The science presents experimental model evidence and source limitations.
- Places and Compare retain geographic discovery and weather-based comparisons, with links into the same JPL planner.

The shared observing layout preserves target, source responses, image and report state across its routes. Places is a separate site-discovery surface. Exact data remain dated while browsing; navigation does not relabel an older response as current.

## Visual Rules
Geist provides interface text; Newsreader provides editorial headings and navigation. Fonts are self-hosted. Layouts use a charcoal navigation band, white reading surfaces, green functional accents and gold/lilac scientific chart lines. No decorative stars or implied telescope feed are generated.

Controls retain visible focus, native keyboard operation, accessible names and active-page indicators. The chart's range input supports keyboard sample selection; each sample has a precise UTC readout. Mobile layouts stack the forecast and astronomy sections without horizontal overflow. Image/report controls are kept off the main night-planning screen.

The minimum scientific evidence takes priority over visual polish: unavailable sources, forecast limitations, five-minute sampling precision and withheld probabilities are explicit.
