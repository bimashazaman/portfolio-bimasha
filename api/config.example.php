<?php
/**
 * config.example.php — placeholder configuration.
 *
 * Copy this file to config.php and fill in the real MySQL credentials on the
 * server. config.php is gitignored and must NEVER contain placeholders in
 * production. This example file ships with the repo so the shape is documented.
 *
 * On Hostinger Single Web Hosting the DB is created in hPanel → Databases;
 * the host is usually "localhost".
 */

return [
    // MySQL host. On Hostinger shared hosting this is almost always "localhost".
    'DB_HOST'    => 'localhost',

    // The database name (often prefixed like u123456789_portfolio).
    'DB_NAME'    => 'CHANGE_ME_db_name',

    // The database user.
    'DB_USER'    => 'CHANGE_ME_db_user',

    // The database password. Keep this out of version control.
    'DB_PASS'    => 'CHANGE_ME_db_password',

    // Connection charset. Leave as utf8mb4 for full unicode/emoji support.
    'DB_CHARSET' => 'utf8mb4',
];
