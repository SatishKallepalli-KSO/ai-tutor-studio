# AI Tutor Studio — Web

React + TypeScript + Vite client for **https://ai-tutor-studio.onrender.com**.

## Local

```bash
npm install
npm run dev
```

Optional: `VITE_API_BASE=https://ai-tutor-studio.onrender.com` to hit production API from local UI.

## Production

Bundled into the root `Dockerfile` and served by FastAPI from `/static` on Render.
Ambient background motion lives in `AmbientField.tsx` + `App.css` (respects reduced motion).

See repo docs: [PRODUCTION.md](../../docs/product/PRODUCTION.md).
