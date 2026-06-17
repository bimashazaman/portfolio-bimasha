# Deployment Runbook

Start-to-finish guide for running this site on **Hostinger Single Web Hosting**.
It assumes no DevOps experience — follow the steps in order.

**How it all fits together:**

- The site is a Vite/React app. Its content is **dynamic**, served as JSON by a
  small PHP backend in `api/` and stored in a **MySQL database** on Hostinger.
- You edit content through a login-protected admin panel at `yourdomain.com/admin`
  — no code change or redeploy needed. Edits are live immediately.
- **The first upload is manual** (a one-time zip via File Manager). After that,
  **GitHub Actions** auto-builds and FTP-deploys whenever you push code to `main`.
- If the database or API is ever unreachable, the site falls back to a committed
  snapshot (`api/content.seed.json` → bundled into the app), so visitors always
  see the last-shipped content instead of a blank page.

Throughout, replace **`yourdomain.com`** with your real domain.

---

## 1) First upload (one time, manual)

CI deliberately **never** uploads `install.php` or `config.php` (security — see
step 4), so the very first set of files goes up by hand.

1. Build the deploy bundle locally (or use the `portfolio-hostinger.zip` in the repo):

   ```bash
   npm ci
   node scripts/export-content.mjs   # refresh the content seed
   npm run build                     # → dist/
   # bundle = contents of dist/ + the api/ and admin/ folders
   ```

   The repo's **`portfolio-hostinger.zip`** already contains exactly this layout
   (the built site at the root, plus `api/` and `admin/`).

2. In hPanel go to **Files → File Manager → `public_html/`** and **upload +
   extract** `portfolio-hostinger.zip` there. You should end up with
   `public_html/index.html`, `public_html/api/`, and `public_html/admin/`.

---

## 2) Create the database + config (one time)

### a. Create the MySQL database and user

1. In **hPanel** go to **Databases → MySQL Databases**.
2. Create a database and a user, and attach the user to the database. Write down:
   - **Database name** (Hostinger prefixes it, e.g. `u123456_portfolio`)
   - **Database user** (e.g. `u123456_admin`)
   - **Password** (use a strong, saved one)
   - **Host** — on Hostinger this is almost always `localhost`.

### b. Create `api/config.php` on the server

`api/config.php` holds your live DB credentials. It is **gitignored on purpose** —
it must never be committed and lives ONLY on the server. The repo ships
`api/config.example.php` as the template.

1. In **File Manager → `public_html/api/`**, copy `config.example.php` to
   `config.php` (or upload a filled-in copy).
2. Edit `config.php` and paste in the values from (a): `DB_NAME`, `DB_USER`,
   `DB_PASS`, and `DB_HOST` (usually `localhost`). That's the only file with secrets,
   and deploys never overwrite it.

> Why this dance? Secrets don't belong in Git. Keeping `config.php` only on the
> server (and excluded from the FTP sync) means your DB password is never in your
> repo and never clobbered by a deploy.

---

## 3) Initialize the database (one time)

`api/install.php` creates the tables and loads the starter content from the seed.

1. In a browser, open:

   ```
   https://yourdomain.com/api/install.php
   ```

2. It creates the tables and seeds the 18 content sections, then shows a short
   **form to choose your admin password** (this is the password for `/admin`).
   Enter a strong password twice and submit.

   - The password is sent by POST (never in the URL), and can only be set here
     **while none exists yet** — so a left-behind installer can't hijack the account.
     Re-running is safe: it never overwrites your content or password.

3. **Verify:** open `https://yourdomain.com` (real content loads) and
   `https://yourdomain.com/admin` (login screen appears; log in with your new password).

4. **DELETE `install.php`** in **File Manager → `public_html/api/`**. CI never
   re-uploads it, so once it's gone it stays gone.

---

## 4) GitHub secrets for auto-deploy (one time)

The deploy workflow needs your Hostinger FTP login, stored as encrypted
**repository secrets** (never in code).

### a. Find your FTP credentials

In hPanel go to **Files → FTP Accounts**. Note (or create):

- **FTP host** — e.g. `ftp.yourdomain.com` or an IP → `FTP_SERVER`
- **FTP username** — e.g. `u123456.yourdomain.com` → `FTP_USERNAME`
- **FTP password** — set/reset it here → `FTP_PASSWORD`

### b. Add them to GitHub

In your repo: **Settings → Secrets and variables → Actions → New repository secret**.
Add each (names must match exactly):

| Secret name    | Value                                            |
| -------------- | ------------------------------------------------ |
| `FTP_SERVER`   | your FTP host, e.g. `ftp.yourdomain.com`         |
| `FTP_USERNAME` | your FTP username, e.g. `u123456.yourdomain.com` |
| `FTP_PASSWORD` | your FTP password                                |

### c. Set the server directory

In `.github/workflows/deploy.yml`, the `server-dir:` defaults to `public_html/`
(correct for a primary domain). For a subfolder/addon domain, change it, e.g.
`server-dir: public_html/portfolio/`, and commit.

---

## 5) Daily use

### Change CONTENT (text, projects, copy) — no deploy

1. Go to **`https://yourdomain.com/admin`** and log in.
2. Edit any section and save. **Changes are live immediately** (the site reads
   from the database in real time).

### Change CODE (design, layout, components, features)

1. Edit locally and commit.
2. **Push to `main`.** GitHub Actions runs: export seed → build → FTP deploy.
   Watch the repo's **Actions** tab; a green check (≈1–2 min) means it's live.
3. To redeploy without a commit: **Actions → Build and Deploy to Hostinger →
   Run workflow.**

### Run the app locally against a real backend (optional)

```bash
# terminal 1 — PHP API + a local DB configured in api/config.php
php -S 127.0.0.1:8899

# terminal 2 — Vite, proxying /api to that PHP server
VITE_DEV_API_TARGET=http://127.0.0.1:8899 npm run dev
```

Without `VITE_DEV_API_TARGET`, `npm run dev` just uses the bundled fallback content.

---

## 6) Safety net

- **Deploys never touch your database or `config.php`.** The FTP step excludes
  `**/config.php`, `**/install.php`, `**/.git*`, and `node_modules`.
- **Bad content edit?** In the admin panel open **History → Revert** to roll any
  section back to a previous version. No code or deploy involved.
- **API or database down?** The site serves the last-shipped snapshot from
  `api/content.seed.json` (refreshed on every deploy), so visitors still see real
  content instead of an error.
- **Deploy failed (red X)?** Your live site keeps serving the previous version.
  Open the run logs, fix, and push again.
- **Forgot the admin password?** In hPanel → **phpMyAdmin**, delete the
  `admin_password_hash` row in the `meta_info` table, re-upload `install.php`, and
  visit it again to set a new one (then delete `install.php`).

---

## Quick reference

| I want to...              | Do this                                                         |
| ------------------------- | --------------------------------------------------------------- |
| Change words/projects     | `https://yourdomain.com/admin` → edit → save                    |
| Change design/code        | push to `main` (auto-builds + deploys)                          |
| Redeploy without a commit | GitHub **Actions → Run workflow**                               |
| Undo a content mistake    | admin → **History → Revert**                                    |
| Rotate the FTP password   | hPanel **FTP Accounts** → reset → update `FTP_PASSWORD` secret  |
| Reset admin password      | phpMyAdmin → delete `meta_info.admin_password_hash` → re-install |
| Move site to a subfolder  | edit `server-dir:` in `.github/workflows/deploy.yml`            |
