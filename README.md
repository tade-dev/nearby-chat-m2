# Nearby Chat M2

Disposable prototype for The Active Studios OS experiment. Isolated from other products (including Kept). Temporary rooms only — no accounts, no profiles, no DMs, no media, no location.

**Room expiry default: 45 minutes.** After that the room cannot be rejoined. The host can end the room sooner; ended rooms also cannot be rejoined.

**Live URL:** https://temporary-agile-walnut-b2jg6ip.vercel.app

This is a Vercel anonymous/temporary production deploy (verified with 3 clients). It expires about **60 minutes after deploy** unless claimed:

- Claim (keeps the deployment on your Vercel account): https://vercel.com/claim-deployment?code=e5c8921b-250b-4928-b748-314a8c2997ed
- Durable hosting: import this GitHub repo on Vercel so **main** auto-deploys (no env vars). See Vercel below.

## Stack

- **Next.js 15 (App Router) + React 19 + TypeScript** hosted on **Vercel**
- **Realtime:** MQTT over WebSocket to the public EMQX broker `wss://broker.emqx.io:8084/mqtt` (free prototype tier, no shared prod infra, no Kept credentials)
- **QR:** `qrcode.react` encoding the join URL `/r/{CODE}`
- No database and no Vercel env secrets required for the default prototype

This is intentionally boring and client-side so it deploys cleanly tonight. The public broker is **not private**: anyone who can guess a room topic could read messages. Do not use it for sensitive chat.

## What it does

1. Create a temporary room (you are the host)
2. Share a QR code + 6-character room code
3. Join via QR (same URL) or by typing the room code
4. Enter an anonymous display name (no accounts)
5. See who is currently in the room (presence)
6. Send and receive text in real time
7. Host can end the room
8. Room auto-expires after **45 minutes**
9. Expired or ended rooms cannot be rejoined

## How to test with 2–3 tabs or devices

1. Open the live URL (or `npm run dev` → http://localhost:3000) in **tab A**. Click **Create a temporary room**. Enter a display name.
2. Copy the 6-character code (or scan the QR from a phone).
3. **Tab B** (same browser is fine — each tab is a separate anonymous person): Home → paste the code → Join → display name.
4. **Tab C / phone:** open the share URL `/r/{CODE}` (this is what the QR encodes) → display name.
5. Confirm all three names appear under **In this room**.
6. Send messages from each client; they should show up live for the others.
7. In tab A click **End room**. Tabs B and C should show that the host ended the room. Opening `/r/{CODE}` again must fail (no name prompt).

Expiry: rooms die 45 minutes after creation. The header shows a countdown. A new join after expiry is rejected the same way as an ended room.

## Local run

```bash
npm install
npm run dev
```

```bash
npm test          # unit tests for codes / expiry / join rules
npx playwright install chromium
npm run e2e       # 3-client chat + end + expired-room tests
BASE_URL=https://temporary-agile-walnut-b2jg6ip.vercel.app npm run e2e
```

## Vercel

No environment variables are required. Optional overrides are in `.env.example`.

### Option A — GitHub connected to Vercel (preferred)

1. [Import the repo](https://vercel.com/new) `tade-dev/nearby-chat-m2`
2. Framework: Next.js. Leave env vars empty.
3. Deploy **main**. Production URL will look like `https://nearby-chat-m2.vercel.app` (or a Vercel-assigned alias).

### Option B — CLI

```bash
npm i -g vercel
vercel login
vercel --yes --prod
```

If CLI login is unavailable, `vercel deploy --temporary --yes --prod` still publishes an anonymous URL (this is how the live URL above was created). Claim it or connect GitHub for something that lasts.
