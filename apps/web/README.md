# Practice Out Loud — Web

React + TypeScript + Vite client for **https://practiceoutloud.com**.

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
