# Restock — back-in-stock alerts

An iframe-ready signup form, protected admin desk, and durable email queue. Built with JavaScript, Node 24, SQLite, HTML and CSS; no npm dependencies.

## Run

Create `.env` using `.env.example` and replace the five challenge credentials. Then:

```sh
docker build -t restock-alerts .
docker run --name restock --env-file .env -p 3000:3000 -v restock-data:/app/data restock-alerts
```

The five challenge environment variables are sufficient. `PORT` defaults to 3000 and is respected when supplied. `ADMIN_PASSWORD` is optional: when omitted, a random password is printed in container logs; use username `admin`. Set a stable password for deployments. The named volume survives container replacement; the container's own volume survives a restart. There is no separate database or worker to configure.

Without Docker (Node 24+): `node --env-file=.env server.mjs`. Test with `npm test`.

| Variable | Meaning |
| --- | --- |
| STOCK_API_URL | Stock API base, without trailing SKU |
| STOCK_API_KEY | Bearer credential for the stock service |
| RESEND_BASE_URL | Resend-compatible service base; `/emails` is appended |
| RESEND_API_KEY | Email service Bearer credential |
| WEBHOOK_SECRET | Expected X-Webhook-Secret header |
| ADMIN_PASSWORD | Optional stable password; otherwise generated and logged |
| PORT | HTTP listener; default 3000 |
| DATA_DIR | SQLite location; default ./data, /app/data in Docker |
| EMAIL_FROM | Optional sender; default Restock <onboarding@resend.dev> |
| STORE_URL | Optional real storefront URL for the email CTA |

Use HTTPS at the reverse proxy when publicly hosted. No credentials are shipped in this repository. Only synthetic customers and the challenge sandbox were used during development.

## Routes

- `GET /`: customer landing page.
- `GET /embed?sku=TEE-ORG-WHT-M`: responsive email/SKU widget, permitted in cross-origin iframes.
- `POST /api/requests`: JSON `{ "email": "test@example.com", "sku": "TEE-ORG-WHT-M" }`; returns 202, including an already-open request.
- `POST /webhooks/stock`: JSON `{ "event_id": "evt_1", "sku": "TEE-ORG-WHT-M", "quantity": 5 }` with `X-Webhook-Secret`. Returns 202 only after durable storage.
- `GET /admin`: HTTP Basic authentication (`admin` + configured/generated password); searchable requests, statuses, attempts, errors and notified timestamps.
- `GET /api/admin/requests`: same authentication, latest 500 requests as JSON.
- `POST /api/jobs`: same authentication, processes a batch. Useful for an external scheduler on serverless hosts.
- `GET /healthz`: lightweight health check.

## Preventing duplicate and missed notifications

1. Email and SKU are normalized. A partial unique database index allows only one open request per email/SKU, including concurrent submissions. After completion a customer can intentionally create a new request.
2. Authenticated webhook event IDs are durably deduplicated. Reusing an event ID with a different SKU or quantity returns 409. A webhook is only a hint: the worker checks the authenticated stock API before every send, even on a retry.
3. Each request doubles as its durable outbox record. Workers acquire a conditional SQL lease before processing; concurrent webhook deliveries cannot both claim the same request. Leases expire after 60 seconds, allowing crash recovery.
4. The email body is frozen and saved before the first send. A stable `Idempotency-Key: restock/<request-id>` is sent on every attempt, including after a timeout or crash after the provider accepted the email.
5. The row becomes `notified` only when the provider returns a successful response with a message ID. Network errors, 429s and 5xx responses retry with capped exponential backoff. Permanent 4xx errors are visible as `review` rather than silently discarded.
6. Docker runs an in-process queue poll every second. Waiting requests recheck stock every 15 seconds, so a missed webhook does not lose the request. State is in SQLite WAL, not process memory.
7. **Exactly-once delivery depends on the email provider honoring idempotency keys.** This cannot be guaranteed indefinitely across two independent systems. Ambiguous attempts approaching a 24-hour provider deduplication window are flagged for manual review after 23 hours rather than risking a duplicate. Long provider outages may therefore need operator reconciliation.

## Hosted preview versus Docker

The hosted preview runs the same request handler on a Worker with a D1 database. Signup, webhook and admin traffic wake its queue. A `scheduled` handler is also exported for hosts with cron support. This hosting environment does not configure a native cron trigger: unattended recovery during a completely idle period requires a scheduler to call authenticated `POST /api/jobs`. **The Docker submission includes its own continuous polling and does not have this limitation.**

The live preview is connected to the challenge sandbox, not a production email provider. It must not be used for real customer email addresses.

## Verification

`npm test` covers 15 cases: concurrent signup normalization; invalid inputs and admin/webhook auth; false stock alerts; concurrent duplicate webhooks and workers; email 500 retry; lost success response; stock network outage; partial recipient failure; conflicting event IDs; recovery from a persisted expired lease; a second restock cycle; expired idempotency window review; HTML escaping; iframe policy; and the actual HTTP server through retries and a process restart.

The image build and all 15 tests passed in GitHub Actions. CI also includes a container smoke test on a custom PORT and a container restart. Runtime integration tests exercise the same Node 24 entrypoint used by Docker.

## AI and timing

AI tool: OpenAI Codex (ChatGPT Work), used for implementation, test design, UI and documentation. No subcontractors or delegated agents. Timing and final live integration results are recorded in `SUBMISSION.md` at handoff.
