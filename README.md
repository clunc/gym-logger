# Gym Logger

A SvelteKit app for logging resistance training workouts with smart defaults and a rest timer.

## Getting started

```sh
npm install
npm run dev -- --open
```

## Scripts

- `npm run dev` — start the dev server
- `npm run dev:host` — start the dev server on 0.0.0.0:5173 for port forwarding
- `npm run check` — type-check the project
- `npm run build` — create a production build
- `npm run preview` — preview the production build locally
- `npm run preview:host` — preview the production build on 0.0.0.0:4173

The dev container forwards ports 5173 and 4173 and will auto-start `npm run dev:host` when you attach.

> To deploy, add the adapter for your target platform. See https://svelte.dev/docs/kit/adapters.

## Documentation

- `docs/1rm-prediction.md` — 1RM prediction formulas with confidence intervals
