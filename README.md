# PullFund

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)

**PullFund** is a community-owned,directory for startup founders to track application windows for Incubators, Accelerators, Grants, and VC funds.

> **Found a fund we missed?** Open a PR and add it to `data.js` to help the community!

---

PullFund is a lightweight directory for incubators, accelerators, grants, and VC funds with:

- category filters (`Incubator`, `Accelerator`, `Grants`, `VC`)
- market scope filters (`Global`, `India`)
- sector search and filtering
- admin dashboard for verification workflows

## Tech Stack

- Next.js (App Router) + React + TypeScript
- File-based data (`data.js`) + helper JSONs in `data/`

## Getting Started

### Prerequisites

- Node.js 18+

### Run locally

```bash
npm install
npm run dev
```

App URL: `http://localhost:3000`  
Admin URL: `http://localhost:3000/admin`

## Project Structure

- `app/` - Next.js routes (UI + API)
- `components/` - React UI components
- `lib/` - shared server-side logic (data loading/merging)
- `styles.css` - global styles (imported by `app/globals.css`)
- `data.js` - main entity dataset (canonical source of truth)
- `data/vc-websites.global.json` - helper mapping to fill missing `apply_url` for Global VCs
- `data/vc-websites.india.json` - helper mapping to fill missing `apply_url` for India VCs

## API

- `GET /api/entities` - list directory entities (merged with verification + availability info when available)
- `GET /api/verification-report` - read `verification-report.json` (if present)
- `POST /api/admin/verify` - mark an entity as verified (writes `verification-overrides.json`)

## Data Model (Entity)

Core fields:

- `name`
- `type` (`Incubator`, `Accelerator`, `Grants`, `VC`)
- `market_scope` (`Global`, `India`) when applicable
- `sectors` (array)
- `app_start`, `app_end`, `is_rolling`
- `apply_url`
- optional verification fields

## Contributing

Contributions are welcome. Please:

1. Open an issue describing the change.
2. Create a feature branch.
3. Make focused, testable updates.
4. Submit a pull request with before/after notes.

## License

MIT - see `LICENSE`.
