# Bimasha Zaman — Portfolio

A fast, editorial single-page portfolio built with **React 19 + Vite**, with a
**dynamic content backend** (PHP + MySQL) and a login-protected admin panel.
Inertia scrolling by **Lenis**; all animation is hand-rolled (IntersectionObserver
+ CSS + a little rAF) — no animation library, so the bundle stays light
(~80 kB gzipped JS).

Warm-paper editorial design with a **light & dark theme**. Honest-by-default
copy: every claim on the site is meant to be verifiable.

## Content is dynamic (database-backed)

Content lives in a **MySQL database** and is served as JSON by a small PHP API in
[`api/`](api). You edit it through the admin panel at **`/admin`** — no code change
or redeploy. Architecture at a glance:

- **`api/`** — PHP REST API (PDO/prepared statements). `content.php` is the public
  read endpoint; `admin/*` and `auth/*` power the editor; `contact.php` saves form
  submissions. Versioned edits with one-click revert.
- **`admin/`** — the login-protected editor UI (a recursive form editor for every
  section, plus a raw-JSON mode, history/revert, and a messages inbox).
- **`src/content/ContentContext.jsx`** — fetches the API at runtime and merges it
  over the bundled defaults.
- **[`src/data/content.js`](src/data/content.js)** — the **bundled fallback / seed**.
  It's the single source of truth for day-one content and the safety net: if the
  API/DB is ever unreachable, the site renders this instead of going blank.
  `scripts/export-content.mjs` exports it to `api/content.seed.json`, which
  `api/install.php` loads into the database on first setup.

**Deploying / first-time setup:** see [DEPLOYMENT.md](DEPLOYMENT.md). CI/CD is wired
in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — push to `main`
and GitHub Actions builds and FTP-deploys to Hostinger automatically.

## Run it

```bash
npm install      # first time only
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## How it's organized

```
src/
├── main.jsx              # entry
├── App.jsx               # page assembly + section order
├── data/
│   └── content.js        # ← ALL copy lives here. Edit text in this one file.
├── styles/
│   └── global.css        # design system: tokens (incl. both themes), layout, components
├── hooks/
│   ├── usePrefersReducedMotion.js
│   ├── useSmoothScroll.js   # Lenis + smooth in-page anchors
│   ├── useScrolled.js       # nav background on scroll
│   ├── useInView.js         # IntersectionObserver (drives all reveals)
│   ├── useCountUp.js        # stat counters
│   └── useTheme.js          # light/dark with localStorage persistence
└── components/
    ├── Reveal.jsx         # fade/lift-into-view wrapper (used everywhere)
    ├── SectionHeading.jsx # the numbered "01 — About" heading
    ├── Cursor.jsx         # custom dot + ring cursor (desktop only)
    ├── ScrollProgress.jsx # top reading-progress bar
    ├── BackToTop.jsx      # floating back-to-top button
    ├── ThemeToggle.jsx    # sun/moon theme switch
    ├── Nav.jsx            # header + animated mobile menu
    ├── ContactForm.jsx    # validated contact form (see below)
    ├── Hero.jsx · Marquee.jsx · Stats.jsx · Clients.jsx · About.jsx
    ├── Services.jsx · Work.jsx · Spotlight.jsx · Stack.jsx · Journey.jsx
    └── Process.jsx · Voices.jsx · Faq.jsx · Engagements.jsx · Contact.jsx · Footer.jsx
```

**To change wording on the live site, use the admin panel at `/admin`** (it edits
the database). **To change the day-one / fallback copy in the repo, edit
[`src/data/content.js`](src/data/content.js)** — then `node scripts/export-content.mjs`
keeps `api/content.seed.json` in sync (CI does this automatically on deploy).
**To change look & feel, edit the CSS variables at the top of
[`src/styles/global.css`](src/styles/global.css)** — `--accent`, fonts, spacing,
and the full DARK + LIGHT token blocks.

## Theme

Light/dark is driven by `data-theme` on `<html>`. An inline script in
[`index.html`](index.html) applies the saved (or system) theme **before paint**
so there's no flash; the toggle in the nav persists the choice to
`localStorage`. Tune either palette in the `:root` / `:root[data-theme="light"]`
blocks of `global.css`.

## Contact form

The form validates inline and shows submitting / success / error states.

- **No setup needed:** by default it opens a prefilled email to you (`mailto:`).
- **Real submissions:** copy `.env.example` → `.env` and set
  `VITE_CONTACT_ENDPOINT` to a Formspree / Web3Forms / Basin / custom URL. The
  form will then POST the fields as JSON and show an in-place success message.

## SEO

Set up in [`index.html`](index.html) and [`public/`](public):

- Descriptive `<title>` + meta description + keywords, `canonical`, and
  `robots: index, follow`.
- Open Graph + Twitter cards with a branded `og-image.png` (1200×630).
- JSON-LD `Person` schema including `sameAs` (LinkedIn + GitHub) so search
  engines link your profiles.
- [`robots.txt`](public/robots.txt) + [`sitemap.xml`](public/sitemap.xml).
- A `<noscript>` fallback so crawlers and no-JS visitors still get real content.

> **Set your domain.** Replace `https://bimashazaman.com` (canonical, `og:url`,
> `og:image`, `robots.txt`, `sitemap.xml`) with your real deployed URL — it's the
> one thing absolute-URL SEO needs to be correct.

Note: this is a client-rendered SPA. Modern crawlers (incl. Google) execute JS
and will index it, but if you want guaranteed crawl-time HTML, add prerendering
(e.g. `vite-react-ssg`) later.

## Accessibility & performance

- Respects `prefers-reduced-motion` — disables the custom cursor, smooth scroll,
  and all reveal/marquee motion.
- Custom cursor only activates on fine-pointer + hover devices.
- Skip-link, focus-visible outlines, semantic landmarks, `scroll-margin` anchors,
  `inert` on the closed mobile menu, labelled form fields with `aria-invalid`.
- ~77 kB gzipped JS / ~7 kB gzipped CSS.

## Before you publish — fill these in

The only placeholders left in [`src/data/content.js`](src/data/content.js)
(search for `OWNER`):

- [ ] **Your domain** — replace `https://bimashazaman.com` in `index.html`,
      `public/robots.txt`, and `public/sitemap.xml` with your deployed URL.
- [ ] **Bizam role + start year** — confirm exact job title and year in `journey`.
- [ ] **Bizam security wording** — confirm with the client what may be stated publicly.
- [ ] **Testimonials** — confirm permission and add each person's role + company in
      `voices`; cut any that can't be verified.
- [ ] **Verified numbers** — if/when you have a proven metric (e.g. a measured drop
      in billing support tickets), add one sentence to the relevant case in `cases`.
      Never invent one.
- [ ] **Keeprate** — only add a writing/blog link once it's actually published; no
      user or revenue claims until true.

## Notes

- A favicon lives at [`public/favicon.svg`](public/favicon.svg). Add an
  `og-image` (1200×630) and reference it in `index.html` for nicer link previews.
