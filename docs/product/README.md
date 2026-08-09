# AI Tutor Studio — Product documentation

**Magnet:** Practice Staff & EM interviews out loud (Free → Pro).  
**Phase 2:** Hire / jobs / network (don’t lead sales with these).

**Live production:** https://ai-tutor-studio.onrender.com  
(Render Free · Neon Free Postgres · OpenAI `gpt-4o-mini`) — see [PRODUCTION.md](./PRODUCTION.md)

| Page | Purpose |
|------|---------|
| [Production status](./PRODUCTION.md) | What’s live, stack, env, verified checklist |
| [Deploy free](./DEPLOY-FREE.md) | Render + Neon free path |
| [Database](./DATABASE.md) | Neon IDs, backup / restore |
| [Go-live](./GO-LIVE.md) | Full cloud + Stripe checklist |
| [Overview](https://satishkallepalli-kso.github.io/ai-tutor-studio/product/) | Magnet + plan matrix |
| [Sales playbook](https://satishkallepalli-kso.github.io/ai-tutor-studio/product/sales-playbook.html) | ICP, 5-min demo, objections |
| [Monetization](https://satishkallepalli-kso.github.io/ai-tutor-studio/product/monetization.html) | Free / Pro |
| [Architecture](https://satishkallepalli-kso.github.io/ai-tutor-studio/product/architecture.html) | System design |

```bash
./scripts/publish-pages.sh   # preserves docs/product/
./scripts/backup-db.sh --neon
```
