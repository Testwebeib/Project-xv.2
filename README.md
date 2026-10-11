# PROJECT X — secure upload starter

This project is a mobile-friendly starter, not a one-click production platform.

## What it does
- Mobile-friendly HTML upload form.
- Sends a selected video to a Node.js server.
- The server uses the Bunny Stream API key (server-side only) to create and upload a video.
- Shows an embedded player for accepted uploads.

## Setup
1. Create a Bunny.net account and a Bunny Stream video library. Confirm that your intended use complies with the current acceptable-use policy and all applicable laws.
2. Copy `.env.example` to `.env`, then set `BUNNY_LIBRARY_ID` and `BUNNY_STREAM_API_KEY`. Do not put the API key in `public/index.html`, commit it to Git, or share it in chat.
3. Install Node.js 20+.
4. In this folder run:
   ```sh
   npm install
   npm start
   ```
5. Open `http://localhost:3000`. For phone testing on the same Wi-Fi, use your computer's local IP and port 3000, and ensure the firewall allows it. For internet access, deploy to a Node.js host and set the environment variables in its secrets/settings panel.

## Important limitations before public launch
- Catalog is in-memory and resets on server restart.
- This basic upload route buffers a file to temporary disk and is not ideal for large videos or unreliable mobile connections. Use resumable/chunked direct uploads with short-lived upload authorization for production.
- Add authentication, role checks, rate limits, persistent database, upload quotas, audit logs, moderation and reporting, legal compliance, consent/age/identity documentation, takedown workflow, and signed playback access.
- Set provider library/domain restrictions and keep newly uploaded media private/unlisted until reviewed.
- Do not expose provider API credentials to browsers.
- Never upload illegal content or content without documented consent and rights. Adult-content hosting is subject to provider rules and local law.
