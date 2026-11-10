# International Rush Cup 2026 — Live Center

Official Rush Soccer-branded, mobile-first tournament schedule and standings website, designed for Vercel. The original Rush Soccer logo is rendered from the supplied brand artwork; no logo changes.

## Data source

[IRC 2026 Live Scores](https://docs.google.com/spreadsheets/d/1QvyVq5TvFaloM6L4Lsuyhved-CmhtEfV8GWyytOAmHc/edit)

The `api/data.js` Vercel Function fetches **Games**, **Teams**, and **Settings** as CSV from the public Google Sheets visualization endpoint. API responses are cached at the CDN for ~60 seconds. The browser requests the API every 60 seconds while visible and after refocusing the tab. An update may take a little longer if Google's own caches are delayed. No API keys or service-account secrets are needed while the spreadsheet remains shareable to "Anyone with the link can view".

## Deploy to Vercel

1. Unzip this directory and upload it to a new private GitHub repository, or use the Vercel CLI from inside the project directory.
2. Go to Vercel > Add New > Project and import that repository. Framework preset: **Other**. Root directory: repository root. No build command is required.
3. Deploy. Vercel automatically serves the root HTML/JS/CSS files and installs the Node.js API function under `/api/data`.
4. Test the live `/api/data` endpoint first. It must return JSON with `games`, `teams`, `settings` and `fetchedAt`. If it returns HTTP 503, check the Sheet share setting and whether Google serves CSV via its `/gviz/tq` endpoint. If necessary, publish the individual tabs to the web or switch to authenticated Sheets API.
5. In Vercel > Settings > Domains you may add a custom Rush Soccer domain.

Note: There is no real deployed URL until a Vercel deploy succeeds.

## Data entry

- Enter home and away scores in **Games**. Both numbers present = final unless Status is Live, Cancelled or Delayed.
- Set Status to `Live` to show an in-progress game; only completed games feed standings.
- Sunday seeds (`#1`, `#2`, `#1A`, `#1B`) resolve when every group game within the relevant division/pool is final.
- `Notes` are displayed publicly. Edit **Settings** for the title, dates, venue, points, tiebreakers, and announcement banner.
- Tiebreaker order in source currently says **PLACEHOLDER until Jacob confirms**. The site follows the sheet setting for pairwise H2H, then GD/GF etc. Confirm multi-team tie rules before official final rankings.

## Testing

Run `npm test` for CSV parsing and API validation tests. `node --check app.js` checks browser script syntax.

## Limitations

The application does not write to the Sheet; staff edit Google Sheets directly. Do not publish sensitive staff information in the Sheet. Publishing the Sheet to anonymous visitors is intentional for this site. A restricted-sheet alternative requires authenticated Google API credentials stored privately in Vercel.
