# SUUNS Comms

The crisis-desk web app: delegate orders, a public updates page, a projector board, account freezes and a full audit log.

- **No dependencies.** Node 22.13+ (24 recommended) and its built-in SQLite. There's no `npm install` step.
- **One process, one file of data.** Everything lives in `DB_FILE` (default `data/comms.db`).
- **Readable.** About 1,400 lines in total. `server.js` holds every route and permission rule, top to bottom.

## Who can do what

| | Delegate (character) | Staff |
|---|---|---|
| Send orders and reply in their own threads | ✓ | |
| See all orders; claim, reply, mark actioned, archive, reopen | | ✓ |
| Read updates | ✓ (also public at `/updates`) | ✓ |
| Publish or remove updates | | ✓ |
| Toggle MASTER / SECURE COMMS | | ✓ |
| Create accounts, reset passwords, freeze, deactivate | | ✓ |
| Read and export the audit log | | ✓ |

**MASTER COMMS offline:** delegates and the public `/updates` page see only a blackout screen. The projector shows the status but no posts.
**SECURE COMMS offline:** delegates can't see, send or reply to orders. Updates stay visible.
**Freeze:** the delegate sees a full-screen countdown and the reason, and can't do anything until it ends or staff unfreeze them.
Staff always see everything. Pages refresh themselves within about 3 seconds of any change, unless you're halfway through typing.

## Pages

- `/`: delegate desk (staff are redirected to `/staff`)
- `/staff`: order queue and comms switches
- `/staff/comms`, `/staff/posts`, `/staff/accounts`, `/staff/audit`
- `/projector`: full-screen status board for the room (no login)
- `/updates`: public updates page (no login)

## Run locally

```bash
cd comms
BOOTSTRAP_USERNAME=control BOOTSTRAP_PASSWORD='choose-a-long-one' npm start
```

Open http://localhost:3000 and sign in, then create the other staff and delegate accounts from **Accounts**.
You can also create accounts from the command line:

```bash
npm run create-user -- --role staff --username alex --name "Alex" --password 'long-password'
```

Run the tests (they start a real server against an in-memory database):

```bash
npm test
```

## Deploy on Railway

The app needs **one service** plus **one volume mounted at `/data`**. `railway.json` already sets the Dockerfile build, the `/healthz` health check, restart-on-crash and a single replica.

1. **Create the service.** On [railway.com](https://railway.com), choose **New Project → Deploy from GitHub repo** and pick this repository and the branch that contains `comms/`.
2. **Point it at the app folder.** Open the service's **Settings**:
   - Set **Root Directory** to `/comms`.
   - Set **Config-as-code → Railway Config File** to `/comms/railway.json`.
3. **Add the volume.** Right-click the service (or press ⌘K) → **Attach Volume**, and set the mount path to `/data`. Without it, every deploy wipes all accounts, orders and the audit log.
4. **Set the variables.** Under **Variables**, add:
   - `BOOTSTRAP_USERNAME`, for example `control`
   - `BOOTSTRAP_PASSWORD`: a long password, 8+ characters
   - `BOOTSTRAP_NAME`, for example `Control` (optional)

   These only create the first staff account, on the first start. Changing them later does nothing.
5. **Get a URL.** Go to **Settings → Networking → Generate Domain**, open it, sign in as the bootstrap account, and create the rest of the staff and delegate accounts under **Accounts**.

Every push to that branch redeploys automatically. Expect a few seconds of downtime per deploy, because Railway stops the old copy before starting the new one when a volume is attached. Don't push in the middle of a session.

**Don't** raise the replica count. SQLite is a single file on one volume.

**Back up** before and after the event: run `railway ssh` and copy `/data/comms.db` out, or download the audit CSV from the Audit page.

## Security notes

- Passwords are hashed with scrypt. Session cookies are HttpOnly, SameSite=Lax and expire after 12 hours.
- Every form carries a per-session CSRF token, and cross-site POSTs are rejected.
- Failed logins are rate-limited (10 per IP per 15 minutes).
- All output is HTML-escaped. A strict Content-Security-Policy allows no inline script or styles.
- Deactivating an account or resetting its password signs that user out everywhere.

## Audit log

Every state change is written in the same database transaction as the change itself. That includes sign-ins (and failed attempts), orders, messages, claims, status changes, posts, comms toggles, freezes and account changes. Each entry stores who did it, when, the target and the full detail (including message text).

- The table is **append-only**: database triggers reject `UPDATE` and `DELETE`.
- Entries are **hash-chained**: each one includes the SHA-256 of the previous entry. The Audit page re-verifies the whole chain on every view and shows the first broken entry if anyone edited the file outside the app.
- **Export CSV** downloads the complete log, hashes included.
