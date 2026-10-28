# LinkedIn kit — AXTO Digital Global, axto.io, xaa.es

Owner, 28 Oct 2026 (REQUESTS 122): tidy the company page "from A to Z — logo, header, posts from the axto.io and
xaa.es catalogues and the Muslim site, professional, with hashtags, in English", and make two pages, named with the
dot: **axto.io** and **xaa.es**.

| Page | Folder | What it covers |
|---|---|---|
| **AXTO Digital Global** (existing: linkedin.com/company/axto-digital-global) | `axto-digital-global/` | The parent company, PT AXTO Digital Global, and its three brands. Posts about ulyah.com live here. |
| **axto.io** (new) | `axto.io/` | The 10 self-hosted AI & cybersecurity apps |
| **xaa.es** (new) | `xaa.es/` | The web & software studio |

Each folder holds `logo.png`, `cover.jpg`, `PAGE.md` (every field and the About text) and `posts/` (one image per post;
the post text and hashtags are in `PAGE.md`, same numbers). Images are 2× resolution: logo 800×800, cover 2256×382
(LinkedIn's 1128×191 at 2×), posts 2400×1254 (1200×627 at 2×). Regenerate with `node docs/linkedin/build-kit.mjs`.

## Why these are files, not edits made for you
The LinkedIn connection in the Claude session can only post a job; it has no way to edit a company page, and
linkedin.com is outside the session's network. A page admin uploads these in a few minutes.

## Steps

**1. Tidy AXTO Digital Global** — open the page → *Admin tools* → *Edit page*:
- *Header*: upload `axto-digital-global/logo.png` (logo) and `axto-digital-global/cover.jpg` (cover).
- *Page info*, *Details*, *Specialties*, *Buttons*: paste from `axto-digital-global/PAGE.md`.
- *Manage languages* (optional): add Bahasa Indonesia with the Indonesian About text from the same file.

**2. Create axto.io and xaa.es** — LinkedIn → *For Business* → *Create a Company Page* → *Company*:
- *Name*: `axto.io` / `xaa.es` (a dot is allowed in page names, as monday.com does).
- *LinkedIn public URL*: `linkedin.com/company/axto-io` / `linkedin.com/company/xaa-es` (dots are not allowed in the URL).
- *Website*: https://axto.io / https://xaa.es · then the fields from each `PAGE.md`, the logo and the cover.
- On each new page: *Admin tools* → *Edit page* → *Details* → link it to the parent as an *affiliated page*
  (AXTO Digital Global), and on the parent add both as affiliated pages, so the three show each other.
- Alternative: LinkedIn *Showcase pages* are made for brands of one company. They live under AXTO Digital Global
  and share its admins; a separate company page (the request) has its own followers and can be sold with its brand.

**3. Post** — from each page (*Start a post*), attach the image, paste the text from `PAGE.md`. One post every
2–3 days per page reads as active without flooding followers; pin the first post (*⋯* → *Feature on top*).

**4. Connect the sites** — once the page URLs are final, the footers of axto.io, xaa.es and ulyah.com link to them
(a small change in each site; tell Claude the final URLs).

## Daily auto-post (REQUESTS 123)
Once the pages exist, axto.io posts to them by itself: one post a day for axto.io and one for xaa.es, from a library of 28
promotion posts per brand with images and hashtags. Set it up in **Admin → LinkedIn auto-post** (`/admin/linkedin`). The
steps are in [`docs/admin/LINKEDIN_AUTOPOST.md`](../admin/LINKEDIN_AUTOPOST.md). The library images are drawn with the same
design as this kit (`templates.mjs`) by `build-library.mts`.

## Checklist
- [ ] AXTO Digital Global: logo, cover, tagline, About, details, specialties, button, posts 1–6
- [ ] axto.io: page created, logo, cover, tagline, About, details, specialties, button, posts 1–8
- [ ] xaa.es: page created, logo, cover, tagline, About, details, specialties, button, posts 1–6
- [ ] The three pages linked as affiliated pages
- [ ] Organization size, founded year, headquarters and phone filled in by the owner on all three (not guessed here)
- [ ] Site footers link to the pages
- [ ] Admin → LinkedIn auto-post connected, a page chosen for each brand, daily posting on
