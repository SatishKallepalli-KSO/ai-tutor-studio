# Practice Out Loud — Product documentation

**Positioning:** Learn, practice, get AI feedback.  
Slim launchpad homes (Learn + Hire). Flagship: **Practice your own question**. Role packs, timed mocks, weak-spot coach, before/after replay, and shareable scorecards.

**Live:** https://practiceoutloud.com  
**Fallback:** https://ai-tutor-studio.onrender.com  
**Privacy:** https://practiceoutloud.com/privacy  
**For companies:** https://practiceoutloud.com/for-companies  
**GitHub:** https://github.com/SatishKallepalli-KSO/practice-out-loud  

Stack: Vite/React · FastAPI · Neon Postgres · OpenAI · Render · Cloudflare — see [PRODUCTION.md](./PRODUCTION.md)

| Page | Purpose |
|------|---------|
| [Production status](./PRODUCTION.md) | What’s live, stack, env, verified checklist |
| [Deploy free](./DEPLOY-FREE.md) | Render + Neon free path |
| [Database](./DATABASE.md) | Neon IDs, custom questions, scorecards, backup |
| [Go-live](./GO-LIVE.md) | Full cloud + Stripe checklist |
| [Overview](https://satishkallepalli-kso.github.io/practice-out-loud/product/) | Product + plan matrix |
| [Sales playbook](https://satishkallepalli-kso.github.io/practice-out-loud/product/sales-playbook.html) | ICP, 5-min demo, objections |
| [Monetization](https://satishkallepalli-kso.github.io/practice-out-loud/product/monetization.html) | Free / Pro |
| [Architecture](https://satishkallepalli-kso.github.io/practice-out-loud/product/architecture.html) | System design |
| [User flows](https://satishkallepalli-kso.github.io/practice-out-loud/product/user-flows.html) | Launchpad → practice loops |
| [API](https://satishkallepalli-kso.github.io/practice-out-loud/product/api.html) | Feedback, custom questions, scorecards |

```bash
./scripts/publish-pages.sh   # preserves docs/product/
./scripts/backup-db.sh --neon
```
