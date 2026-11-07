# Credentials and reviewer access

## Hosted demo

- Customer page: https://restock-alerts-zunair.fabledeave8.chatgpt.site
- Admin page: https://restock-alerts-zunair.fabledeave8.chatgpt.site/admin
- Admin username: `admin`.
- The live admin password is intentionally absent from source, documentation, issues, and public CI configuration. Obtain it privately from the applicant through your existing private hiring conversation or a password manager.
- The hosted password is configured as the server-side secret `ADMIN_PASSWORD`. The stock key, email key and webhook secret are also server-side hosting secrets. They are not embedded in the signup page or returned by public APIs.
- The separately provided private access note contains only the application-specific demo admin password, not GitHub, ChatGPT, or other personal account credentials. Do not commit that note.

## Run your own copy

1. Obtain your own sandbox credentials from the challenge test server.
2. Copy `.env.example` to an untracked `.env` file and replace its placeholders.
3. Set a unique `ADMIN_PASSWORD` in that file or your host's secret manager. Do not reuse a personal password.
4. Follow the README Docker command and access `/admin` with username `admin` and your chosen password.
5. Keep `.env` and the SQLite data volume private. On Unix, restrict `.env` with `chmod 600 .env`. Use HTTPS for remote access.

For the challenge's five-variable startup requirement, omitting ADMIN_PASSWORD generates a random password at startup and prints it to the container owner's logs. Do not publish those logs. For a stable deployment, explicitly set ADMIN_PASSWORD; the app does not print a configured password.

## Rotation and boundaries

After review, replace ADMIN_PASSWORD in the hosting secret manager and redeploy/restart. Previously shared admin passwords then stop working. Rotate challenge API credentials in the issuer's dashboard if those are ever exposed. This application does not need a GitHub token, ChatGPT token, personal account password, or browser cookie at runtime.

Test fixtures such as `test`, `test-admin`, and `.invalid` URLs are dummy values used only in isolated automated tests; they do not authenticate to the live demo. `.env.example` contains placeholders only.

Before public release, all six existing main-branch commits (20 unique file versions through eddb9be3f8442cc486f5a7f10ad9de00143ecce3) were checked for known live application secrets, common GitHub/OpenAI token formats, private keys, JWTs, and challenge keys. No live credential matches were found. This is a scoped credential review, not a claim of a complete security audit.
