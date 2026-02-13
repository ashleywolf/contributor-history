# 📈 Contributor History

**The missing GitHub contributor growth chart** — like [star-history.com](https://star-history.com) but for contributors.

Compare how fast open source projects attract contributors over time with beautiful, shareable charts.

## Features

- **📊 Cumulative contributor growth** — see how a project's contributor base grows week by week
- **🔀 Multi-repo comparison** — compare multiple projects side-by-side
- **⏱ Timeline mode** — align repos to Day 0 for fair apples-to-apples comparison
- **✏️ Sketch style** — optional hand-drawn XKCD-style chart rendering
- **🌗 Dark/light theme** — auto-detected from OS, manual toggle available
- **📥 Download as PNG** — one-click high-res chart export
- **🔗 Shareable URLs** — repos encoded in the URL hash for instant sharing
- **🔗 Embeddable** — copy Markdown or HTML snippets for your README
- **🔒 No backend** — 100% client-side, calls GitHub API directly
- **🔑 Optional PAT** — add a GitHub token for 5,000 req/hr (vs 60 unauthenticated)

## Usage

1. Visit the app
2. Type a repo name (e.g. `facebook/react`) and click **Add**
3. Add more repos to compare
4. Toggle **Timeline** to normalize to Day 0
5. Click **PNG** to download or **Share & Embed** to get a link

### URL Format

Repos and settings are encoded in the URL hash:

```
https://contributor-history.dev/#facebook/react&kubernetes/kubernetes&timeline
```

## How It Works

Uses the GitHub REST API endpoint [`/repos/{owner}/{repo}/stats/contributors`](https://docs.github.com/en/rest/metrics/statistics) which returns weekly commit data per contributor. The app derives cumulative unique contributor count by tracking when each contributor made their first commit.

### Limitations

- GitHub caps this endpoint at ~500 contributors per repo
- First request may return 202 (stats being computed) — the app retries automatically
- Unauthenticated rate limit is 60 req/hr; add a token for 5,000/hr

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

### GitHub Pages (automatic)

Push to `main` — the included GitHub Actions workflow builds and deploys automatically.

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/contributor-history)

## Tech Stack

- **Next.js 14** (App Router, static export)
- **TypeScript**
- **D3.js** (scales, shapes, axes)
- **Tailwind CSS v4**
- **html2canvas** (PNG export)

## Inspiration

Built in the spirit of [star-history.com](https://star-history.com) — the de facto star history graph for GitHub projects.

## License

MIT
