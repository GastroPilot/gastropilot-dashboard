# GastroPilot Dashboard

This package contains the web dashboard for daily restaurant operations and administration.

## Focus Areas
- `/dashboard`: KPI landing page (overview with real-time operational + analytics data)
- `/dashboard/tischplan`: operational floor plan workspace
- `/dashboard/timeline`: timeline view
- `/dashboard/reservations`: reservation management

## Key Files
- `app/dashboard/page.tsx`: landing page UI
- `app/dashboard/tischplan/page.tsx`: floor plan UI
- `lib/hooks/queries/use-dashboard-overview-data.ts`: split query model (`operations` / `analytics`)
- `lib/navigation/dashboard-nav.ts`: navigation model

## Local Development
```bash
npm --prefix dashboard run dev
```

## Quality Commands
```bash
npm --prefix dashboard run lint
npm --prefix dashboard run test
npm --prefix dashboard run build
```

Dashboard-Flow focused checks:
```bash
npm --prefix dashboard run test:dashboard:unit
npm --prefix dashboard run test:dashboard:e2e
npm --prefix dashboard run qa:dashboard
```

E2E (Chromium):
```bash
npm --prefix dashboard run test:e2e -- tests/e2e/dashboard.spec.ts --project=chromium
```

If Playwright browsers are missing:
```bash
cd dashboard
npx playwright install chromium
```

## Handover Docs
- `docs/dashboard-landing-handover.md`
