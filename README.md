# IATI Data Quality Dashboard front end

A prototype frontend for a new IATI Dashboard, focused on publisher metrics and data quality assessment, integrating the "exploring the data" section of the existing Dashboard. Built with Nuxt 4 and the IATI Design System.

**Live demo:** https://iati.github.io/dashboard-frontend/

## What's in here

| Section | Route | Description |
|---|---|---|
| Overview | `/` | Aggregate publishing quality scores across availability, characteristics, and added-value fields |
| Country | `/country` | Country-level breakdown of publisher coverage and comprehensiveness |
| Groups | `/group` | Quality metrics grouped by publisher type or region |
| Org views | `/usaid`, `/eu` | Organisation-specific dashboards (USAID, EU) |
| Exploring Data | `/exploring-data` | Raw aggregate statistics fetched live from the dashboard API |
| — Publishers | `/exploring-data/publishers` | Full list of IATI reporting organisations with filtering and sorting |
| — Publisher detail | `/exploring-data/publishers/[slug]` | Per-publisher breakdown: activities, files, budgets, validation |
| — Activities | `/exploring-data/activities` | Activity counts over time, by publisher type |
| — Files | `/exploring-data/files` | File sizes, counts, and distribution |
| — Versions | `/exploring-data/versions` | Publisher counts by IATI version |
| — Organisation files | `/exploring-data/organisation` | Share of publishers with an organisation file |
| — Booleans | `/exploring-data/booleans` | Boolean field value distributions |

## Tech stack

- **[Nuxt 4](https://nuxt.com/)** — Vue 3 framework, static site generation
- **[IATI Design System](https://github.com/IATI/iati-design-system)** — shared styles and components
- **[Bootstrap Vue Next](https://bootstrap-vue-next.github.io/)** — layout and UI components
- **[Chart.js](https://www.chartjs.org/) + [vue-chartjs](https://vue-chartjs.org/)** — time-series and bar charts
- **[@nuxtjs/i18n](https://i18n.nuxtjs.org/)** — English and French translations
- **[PapaParse](https://www.papaparse.com/)** — CSV parsing for flat-file data

Data is fetched at runtime from flat files and JSON stats endpoints on `dashboard.iatistandard.org`.

## Getting started

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

> **Note:** Data on the Exploring Data pages is fetched directly from `dashboard.iatistandard.org`. That server does not currently send CORS headers, so data fetches will fail during local development on client-side navigation (page refreshes work because Nuxt fetches server-side). This is a known limitation pending a CORS fix on the dashboard server.

## Building and previewing

```bash
npm run generate   # builds static site to .output/public/
npm run preview    # serves the built site locally
```

## Deployment

The site deploys automatically to GitHub Pages on push to `main` via the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

The build sets `NUXT_APP_BASE_URL=/iati-dashboard-frontend/` for the GitHub Pages sub-path and uses a Cloudflare Worker (`black-math-8c4c.dashboard-cors-proxy.workers.dev`) as a CORS proxy for `dashboard.iatistandard.org` so that publisher detail pages can fetch data client-side. This proxy can be replaced with a direct URL once CORS headers are added to the dashboard server.

Dynamic publisher routes (`/exploring-data/publishers/[slug]`) are handled by a `404.html` SPA fallback generated at build time.

## Internationalisation

Translation strings live in [`i18n/locales/en.json`](i18n/locales/en.json) and [`i18n/locales/fr.json`](i18n/locales/fr.json). The language switcher is in the site header.
