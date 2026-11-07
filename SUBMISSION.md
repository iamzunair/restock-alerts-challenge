# Submission status

- AI tool: OpenAI Codex in ChatGPT Work.
- Stack: JavaScript, Node.js 24, SQLite, HTML/CSS; Worker/D1 adapter for preview hosting.
- Build, tests, deployment and handoff preparation: approximately 30 minutes of elapsed session time, including sign-in and verification. Repository public-sharing approval is still pending.
- Automated tests: 15 passed, including concurrent requests/webhooks, retry behavior, ambiguous provider response, and process restart recovery.
- Docker: image build, startup on custom PORT=8080, and container restart passed in GitHub Actions.
- Verified CI: https://github.com/iamzunair/restock-alerts-challenge/actions/runs/42425373539
- GitHub repository: https://github.com/iamzunair/restock-alerts-challenge (currently private; make accessible to the reviewer before submitting).
- Live application: https://restock-alerts-zunair.fabledeave8.chatgpt.site
- Live harness: duplicate signup and phantom-stock checks passed; a restock email was accepted by the sandbox provider and persisted as notified. A complete second live run was not confirmed after the harness returned a transient 502 and local execution review reached a usage limit. No private grader score is claimed.
- Hosting difference: Docker has an independent queue poller. The Worker preview wakes the queue on incoming traffic; idle unattended recovery requires an external scheduler to call authenticated POST /api/jobs. See README.
- Secrets: not included in source. Admin uses username admin and ADMIN_PASSWORD; Docker generates and logs a password if omitted.
