# Waypad — web app

React web app for Waypad: trips, day plans, bookings, wallet, suggestions, place audio guides and the travel book.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
npm run lint
```

- Demo data: `src/data/` (today is fixed at 30 Oct 2026 in `demo.ts`)
- Computed values (readiness, gaps, deadlines): `src/lib/trips.ts`
- Design tokens and dark mode: `src/index.css`

Project documentation lives in [`/docs`](../../docs): [product](../../docs/PRODUCT.md), [screens and routes](../../docs/SCREENS.md), [data model](../../docs/DATA-MODEL.md), [architecture](../../docs/ARCHITECTURE.md) and the [demo script](../../docs/DEMO-SCRIPT.md).
