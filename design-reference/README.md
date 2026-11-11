# Focus Dashboard UI

A React reconstruction of the supplied 2048 × 1536 productivity dashboard, with a phone layout and a reusable component entry point.

## Run it

Use Node.js 20.19+ on the 20.x release line, or 22.12+.

```sh
npm ci
npm run dev
```

The terminal prints the local address. For a production build, run `npm run build` and then `npm run preview`. A prebuilt version is also included in `dist/`. From the extracted project directory, run `python -m http.server 8000 --directory dist` and open [localhost:8000](http://localhost:8000).

## Customize it

| Location | What to change |
| --- | --- |
| `src/components/index.js` | Public React exports for the header, goal strip, widget cards, timeline, controls, and dialog |
| `src/tokens.css` | Font stack, surface, typography, and accent colors |
| `src/styles.css` | Layout, scale, component states, chart styling, and breakpoints |
| `src/data.js` | Profile, demo dates, events, priorities, and chart series |
| `public/assets/` | Replaceable portrait, brand mark, avatar, and goal illustration |
| `docs/DESIGN.md` | Screenshot measurements, typography rationale, asset provenance, and mobile behavior |

The timer, date controls, widget settings, and event editor are interactive. Event changes and widget visibility persist in the browser. The invite dialog prepares a local demo message. Dashboard statistics and goal counts use sample data.

For embedding, import the components you need from `src/components/index.js`, import `src/styles.css` and `@fontsource-variable/manrope`, and serve the provided assets from your app’s public assets directory. Keep the `.frame` and `.dashboard` wrappers for the screenshot-scale layout.
