# tnguyen.cz — portfolio + CV (CV-as-code)

One data file (`cv.json`) generates both the portfolio site and a one-page,
Harvard-format CV. Edit the data once, rebuild, and both regenerate. Zero runtime
dependencies — the build uses only Node builtins.

Live at **https://tnguyen.cz** (GitHub Pages, served from `/docs`).

## Build

```
node build.mjs      # or: npm run build
```

Writes `docs/index.html` (portfolio), `docs/cv.html` (CV), and `docs/CNAME`.

## Preview

Open `docs/index.html` in any browser — no server needed, all assets are inlined.

## Export the PDF (`docs/cv.pdf`)

The PDF is a committed snapshot. Regenerate it whenever the CV content changes:

- Open `docs/cv.html`, click **Print / Save as PDF**, and save over `docs/cv.pdf`.

Or headless from the terminal (macOS):

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-pdf-header-footer \
  --print-to-pdf="docs/cv.pdf" "file://$PWD/docs/cv.html"
```

## Add metrics later

Each work entry in `cv.json` has a `metrics` array — add lines you can defend in an interview:

```json
{ "company": "Košík.cz", "metrics": ["Cut regression cycle from 2 days to 2 h"] }
```

An empty `"metrics": []` renders nothing — no empty bullets.

## Deploy (GitHub Pages via Actions)

`cv.json` is the single source of truth. To publish a change:

```
# edit cv.json, then:
git add -A && git commit -m "content: update CV"
git push        # GitHub Actions runs `node build.mjs` and deploys — no manual rebuild
```

`.github/workflows/deploy.yml` rebuilds `docs/` on every push to `main` and deploys
to the custom domain in `docs/CNAME` (tnguyen.cz). Pages **Source** must be set to
**GitHub Actions** (Settings → Pages).

`docs/cv.pdf` is a committed asset — CI does **not** regenerate it. Refresh it only when
the **CV text** changes: open `docs/cv.html` → Print → Save as PDF over `docs/cv.pdf`, then commit.

Run `node build.mjs` locally only if you want to preview before pushing.
