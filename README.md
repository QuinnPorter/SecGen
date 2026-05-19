# NATO Secretary General

A single-player browser strategy game built with Next.js. You play as the NATO Secretary General, managing alliance expansion, defence budgets, crises, and collective security across a 20-year term (2024–2044).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/QuinnPorter/SecGen)

---

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The game runs entirely in the browser — no backend required.

---

## Deploying to Vercel

1. Push the repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Next.js — no additional configuration needed beyond what's in `vercel.json`.
4. Click **Deploy**.

The `vercel.json` at the project root sets:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Map | react-simple-maps + world-atlas 110m TopoJSON |
| State | Zustand v5 |
| Deploy | Vercel |

---

## Phase roadmap

| Phase | Name | Goal | Status |
|---|---|---|---|
| 1 | Foundation | Interactive map, country states, turn structure, basic game state | ✅ Complete |
| 2 | Budget system | 2% GDP mechanic, readiness score, quarterly budget panel | 🔜 Next |
| 3 | Expansion | Accession pipeline, member votes, adversary reactions | ⬜ Planned |
| 4 | Crisis engine | Reactive event deck, decision trees, consequence propagation | ⬜ Planned |
| 5 | Polish & scenarios | Scripted events, win/lose states, save system, UI polish | ⬜ Planned |

---

## Project structure

```
nato-sg/
├── app/
│   ├── layout.tsx          # Root layout, metadata
│   ├── page.tsx            # Entry point → <Game />
│   └── globals.css         # Dark theme CSS variables
├── components/
│   ├── Game.tsx            # Root layout component
│   ├── MapView.tsx         # SVG world map (react-simple-maps)
│   ├── Sidebar.tsx         # Turn/year, approval, readiness, End Turn
│   ├── CountryPanel.tsx    # Slide-in country detail panel
│   └── HUD.tsx             # Top bar: title, crisis count, settings
├── lib/
│   ├── gameState.ts        # Zustand store — single source of truth
│   ├── constants.ts        # ISO numeric → alpha-3 lookup, colour maps
│   └── turnEngine.ts       # applyPassiveChanges() — per-turn simulation
└── data/
    └── countries.json      # 52 countries: alignment, stats, flavour text
```
