# Online iOS Activation Starter

A small reference implementation: Node.js + SQLite server, browser admin page, and a Swift client.

## What it does
- Admin creates random keys for 1–3650 days.
- Duration begins at the first successful activation.
- Only a SHA-256 hash of each key is stored.
- A key is bound to the first `deviceId` that activates it.
- Verification checks revocation and expiry on the server.

## Run locally
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Set a long random admin token (at least 24 characters):
   - macOS/Linux: `export ADMIN_TOKEN="$(openssl rand -hex 32)"`
   - PowerShell: `$env:ADMIN_TOKEN = "<long-random-secret>"`
4. Run `npm start`.
5. Open `http://localhost:3000`.

Do not expose the admin token in client apps, source control, or screenshots. Use HTTPS in production. Keep the SQLite database on persistent storage and back it up. Restrict admin access and rotate the token if exposed.

## Deploy
Deploy to a Node.js host with persistent disk storage. Set `ADMIN_TOKEN` as a server-side environment variable and set `DB_PATH` to a persistent file path if required by the host. Configure HTTPS before connecting the iOS app.

## iOS integration
Add `ios/ActivationClient.swift` to your Xcode project and replace `https://YOUR-DOMAIN.example` with your deployed HTTPS domain. Generate a stable random installation identifier and store it in Keychain; do not use a user-editable value. Pass that identifier as `deviceId`.

Example:
```swift
let client = ActivationClient()
let expiry = try await client.verify(key: enteredKey, deviceId: installationID)
```

Show the app's protected content only after successful verification. Re-check with the server when the app starts and periodically while in use. Do not treat a locally cached success as permanent authorization.

## Important limitations
This is a starter, not a production security audit. Add rate limiting, monitoring, admin login/session protection, HTTPS-only deployment, backups, and abuse controls before public release. Device binding is a deterrent, not proof of device identity. A modified client can bypass client-side screens, so protect valuable server-side features with server authorization too.
