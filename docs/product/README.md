# Practice Out Loud — Product documentation

**Positioning:** Learn, practice, and get AI feedback — then get hired.  
Staff / EM are catalog tracks, not the whole pitch. Journey: **Learn → Practice → Get AI feedback → Get hired**.

**Live:** https://practiceoutloud.com  
**Fallback:** https://ai-tutor-studio.onrender.com  
**Privacy:** https://practiceoutloud.com/privacy  
**GitHub:** https://github.com/SatishKallepalli-KSO/practice-out-loud  

Stack: Render Free · Neon Free Postgres · OpenAI `gpt-4o-mini` · Cloudflare DNS — see [PRODUCTION.md](./PRODUCTION.md)

| Page | Purpose |
|------|---------|
| [Production status](./PRODUCTION.md) | What’s live, stack, env, verified checklist |
| [Deploy free](./DEPLOY-FREE.md) | Render + Neon free path |
| [Database](./DATABASE.md) | Neon IDs, backup / restore |
| [Go-live](./GO-LIVE.md) | Full cloud + Stripe checklist |
| [Overview](https://satishkallepalli-kso.github.io/practice-out-loud/product/) | Product + plan matrix |
| [Sales playbook](https://satishkallepalli-kso.github.io/practice-out-loud/product/sales-playbook.html) | ICP, 5-min demo, objections |
| [Monetization](https://satishkallepalli-kso.github.io/practice-out-loud/product/monetization.html) | Free / Pro |
| [Architecture](https://satishkallepalli-kso.github.io/practice-out-loud/product/architecture.html) | System design |

```bash
./scripts/publish-pages.sh   # preserves docs/product/
./scripts/backup-db.sh --neon
```
