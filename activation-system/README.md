# Online Activation Starter

Reference implementation for an app you own: Node.js + SQLite API, browser admin page, and Swift client.

## Local setup
1. Use Node.js 20+ on a server/computer.
2. Run npm install, then set ADMIN_TOKEN to a long random secret (at least 24 characters).
3. Run npm start and open the server URL.
4. In production, use HTTPS and persistent storage; keep ADMIN_TOKEN server-side only.

Keys are stored as SHA-256 hashes. Their duration starts on first activation. Each key is bound to the first device identifier. Admin can list and revoke keys.

## iOS
Add ios/ActivationClient.swift to your Xcode project, replace the placeholder HTTPS domain, and pass a stable random installation ID stored in Keychain. Never embed the admin token in the app.

This is a starter, not a production security audit. Add rate limiting, admin authentication/session protection, monitoring, backups and abuse controls before public launch. A client-side gate alone cannot protect privileged server features.
