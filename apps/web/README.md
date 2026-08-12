# Practice Out Loud — Web

React + TypeScript + Vite client for **https://practiceoutloud.com**.

## Surfaces

- **Learn home** — slim launchpad: hero → doors → collapsed catalog  
- **Nav** — Home · Practice (hub/continue) · Your question · Agentic AI · More  
- **Practice hub** — role packs, timed mock, weak-spot coach, bank drills, custom questions  
- **Your question** — speak/type any prompt → Content / Clarity / Delivery feedback  
- **Agentic AI** — YouTube watch resume + per-lesson progress; Practice with AI feedback after phases  
- **Learn docs** — **Reviewed** / Mark as reviewed (manual, not auto on click)  
- **Hire** — `/jobs` launchpad + `/for-companies` for hiring teams  
- **Scorecards** — `/scorecard/:id` shareable mock results  

## Local

```bash
npm install
npm run dev
```

Optional: `VITE_API_BASE=https://practiceoutloud.com` to hit production API from local UI (fallback: `https://ai-tutor-studio.onrender.com`).

## Production

Bundled into the root `Dockerfile` and served by FastAPI from `/static` on Render.
Ambient background motion lives in `AmbientField.tsx` + `App.css` (respects reduced motion).

See repo docs: [PRODUCTION.md](../../docs/product/PRODUCTION.md).
