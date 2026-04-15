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

- Vanilla HTML/CSS/JS frontend
- Node.js HTTP server backend
- File-based data (`data.js`) + small helper JSONs in `data/`

## Getting Started

### Prerequisites

- Node.js 18+

### Run locally

```bash
npm start
```

App URL: `http://127.0.0.1:3000`  
Admin URL: `http://127.0.0.1:3000/admin.html`

## Project Structure

- `index.html` - main user-facing UI
- `app.js` - filtering, rendering, calendar logic
- `styles.css` - styles
- `data.js` - main entity dataset (canonical source of truth)
- `data/vc-websites.global.json` - helper mapping to fill missing `apply_url` for Global VCs
- `data/vc-websites.india.json` - helper mapping to fill missing `apply_url` for India VCs
- `server.js` - API and static file server
- `admin.html` / `admin.js` - admin verification dashboard

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
