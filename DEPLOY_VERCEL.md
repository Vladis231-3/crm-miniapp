## Vercel deployment

This project can run on Vercel only in webhook mode.

### Required production changes

- Use an external Postgres database in `DATABASE_URL`.
- Keep `RUN_EMBEDDED_BOT=false`.
- Set `TELEGRAM_DELIVERY_MODE=webhook`.
- Set `SYNC_TELEGRAM_WEBHOOK=true`.
- Set `WEBAPP_URL` to the final Vercel production domain.
- Set `CORS_ORIGINS` to the same Vercel domain if you call the API cross-origin.

### Recommended env values

```env
APP_SECRET=replace-me
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=123456:token
WEBAPP_URL=https://your-project.vercel.app
TELEGRAM_DELIVERY_MODE=webhook
SYNC_TELEGRAM_WEBHOOK=true
TELEGRAM_WEBHOOK_PATH=/api/telegram/webhook
RUN_EMBEDDED_BOT=false
ALLOW_INSECURE_CLIENT_AUTH=false
```

### Deploy steps

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add the environment variables above in the Vercel project settings.
4. Deploy the project.
5. Open `https://your-project.vercel.app/api/health` and verify it returns `{"message":"ok"}`.
6. Send `/start` to the Telegram bot.

### Notes

- Vercel does not work well with long-running polling bots. This repo now uses Telegram webhook mode for production.
- Local SQLite is not suitable for Vercel production because the filesystem is ephemeral.
- If you need to force webhook registration after a domain change, call `POST /api/telegram/webhook/sync` as an owner after login.
