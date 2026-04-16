## Contributing to PullFund

Thanks for helping make PullFund better.

### Local setup

```bash
npm install
npm run dev
```

Then open:

- App: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

### Adding/updating a directory entry

- Edit `data.js` (the canonical dataset).
- Prefer keeping entries consistent with the existing fields:
  - `name`, `type`, `location`, `sectors`, `apply_url`
  - `app_start`, `app_end`, `is_rolling` (or `deadlines` for multiple windows)
  - `market_scope` when applicable (`Global` / `India`)

### Code style

- Run formatting: `npm run format:write`
- Run lint: `npm run lint`

### Notes on verification overrides

The admin action “Mark Verified” writes to `verification-overrides.json`.

- This works in **local dev** and **self-hosted Node** deployments.
- Many serverless hosts use a read-only filesystem, so the override write may not persist there.

