# Portfolio CMS — Database Setup

Four steps to bring the CMS up on Hostinger shared hosting (Apache + PHP 8 + MySQL).

1. **Create the database in hPanel.**
   In hPanel go to *Databases → MySQL Databases*, create a database and a user,
   and grant the user all privileges on it. Note the DB name, user, password, and host
   (usually `localhost`).

2. **Set credentials in `api/config.php`.**
   Copy `api/config.example.php` to `api/config.php` and fill in `DB_HOST`,
   `DB_NAME`, `DB_USER`, `DB_PASS` (keep `DB_CHARSET = utf8mb4`).
   `api/config.php` is gitignored — never commit real credentials.

   > The seed file `api/content.seed.json` is generated from the site copy by
   > `node scripts/export-content.mjs` (run locally before deploying). The installer
   > reads it to populate the content sections.

3. **Run the installer once, in the browser:**

   ```
   https://YOURSITE.com/api/install.php?pw=YOUR_ADMIN_PASSWORD
   ```

   This creates the tables, seeds the 18 content sections (without touching any
   that already exist), initialises the revision counter, and stores the hashed
   admin password. Re-running is safe.

   - Schema reference: `database/schema.sql`.
   - To reset an already-set admin password, append `&force=1`.

4. **Delete `api/install.php` from the server.**
   The installer can set the admin password, so remove it as soon as setup is done.

You can now log in at `/admin/` and the public site reads content from `/api/content.php`.
