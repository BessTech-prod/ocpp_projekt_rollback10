# EV CSMS — UI Fine-Tuning Sprint
> Reference: Zaptec Portal, ChargePoint Dashboard, Virta Hub, EGATE CSMS, Recharge App
> Last updated: 2026-03-18

## Scope constraints (applied)
- Keep current login logo size (mobile-approved)
- Do not add new icons to status/UI
- Do not add dark mode work in this sprint

---

## How to use this list
Work top-to-bottom. Each item has:
- **File(s)** to edit
- **What** to change
- **Why** (UX rationale from industry reference)
- **Done** checkbox

---

## 🔴 P0 — Broken / Wrong (fix before anything else)

- [ ] **Logo inconsistency across pages**
  - Files: ALL `.html` files in `web/`, `web/portal/`, `web/org/`, `web/user/`
  - Problem: `login.html` uses `logo_trans_vit.png`, all other pages use `logo.png` (black background, visible halo)
  - Fix: Replace ALL `logo.png` references with `logo_transparent.png`
  - Why: Every OCPP portal (Zaptec, Recharge) has a clean logo on every screen — it anchors brand trust

- [ ] **Navbar logo is too tall (80–86px)**
  - File: `assets/style.css` → `.brand-logo`
  - Problem: 86px logo makes the navbar ~110px tall, eating screen real estate
  - Fix: Set `.navbar .brand-logo { height: 40px; }` on desktop, `32px` on mobile
  - Why: Industry standard navbar height is 56–64px total

- [ ] **Dark mode tasks removed by scope**
  - Status: Explicitly excluded in this sprint

- [ ] **Empty `<footer>` / `<code></code>` tags**
  - File: `web/portal/index.html` (has `<code></code>`), all other pages (completely empty footer)
  - Fix: Either add consistent footer text ("© 2026 TakoramaCharge") or remove the footer tag
  - Why: An empty footer looks unfinished

- [ ] **No favicon set on any page**
  - Files: ALL `.html` files
  - Fix: Add `<link rel="icon" href="/assets/logo_transparent.png" type="image/png">` to every `<head>`
  - Why: Browser tab shows blank icon — immediate sign of an unpolished product

---

## 🟠 P1 — Consistency & Polish (makes it feel professional)

- [ ] **Login logo size accepted (no change)**
  - File: `assets/style.css` → `.brand-logo-login`
  - Status: Keep current size as approved

- [ ] **Login page — no loading state on submit button**
  - File: `assets/login.js` + `web/login.html`
  - Problem: After clicking "Logga in" nothing changes visually while waiting for API
  - Fix: Disable button and show spinner inside it during fetch: `<span class="spinner-border spinner-border-sm">` swap
  - Why: Users re-click thinking it didn't register — causes double API calls

- [ ] **Dashboard CP cards — no "last seen" timestamp**
  - File: `assets/portal_index.js` card template
  - Problem: Cards show status badge but no time context — is "Available" since 5s or 5 days?
  - Fix: Add last update timestamp below connector badges: `<small class="text-muted">Senast: HH:MM</small>`
  - Why: Virta, EGATE always show last heartbeat time on CP cards

- [ ] **Dashboard CP cards — no live pulse / animation for "Charging"**
  - File: `assets/style.css`
  - Problem: A charging session looks identical to static "Available" except badge color
  - Fix: Add a subtle CSS pulse animation on `.badge.status-charging`: `animation: pulse 2s infinite`
  - Why: Immediately signals live activity — used by ChargePoint and Zaptec dashboards

- [ ] **Status badges — keep text-only (no new icons)**
  - File: `assets/portal_index.js` → `statusClass()` and card template
  - Status: Keep current text labels and color coding

- [ ] **Tables — no row hover or click feedback**
  - File: `assets/style.css`
  - Fix: Add `.table tbody tr:hover { background-color: rgba(14,165,233,0.06); cursor: default; }`
  - Why: Tables without hover feel static and hard to track rows on wide screens

- [ ] **Tables — no empty-state row when data is empty**
  - Files: `assets/users_history.js`, `assets/portal_cps.js`, `assets/users.js`
  - Problem: Empty `<tbody>` renders as a collapsed table with no message
  - Fix: Insert a full-width `<tr><td colspan="N" class="text-center text-muted py-4">Ingen data att visa.</td></tr>`
  - Why: Every serious data table needs a clear empty state (Virta, EGATE both do this)

- [ ] **History page — no total kWh summary row at bottom of table**
  - File: `web/users_history.html` + `assets/users_history.js`
  - Problem: Users have to manually sum energy values to see their total
  - Fix: Add a summary `<tfoot>` row: `Totalt: X sessioner | Y kWh`
  - Why: ChargePoint session history always shows period totals — saves the user mental effort

- [ ] **"Min statistik" page — KPI cards show no unit formatting**
  - File: `assets/my.js` (and `assets/org_my.js`)
  - Problem: `display-6` number renders as `12.345` with no formatting
  - Fix: Format with `toLocaleString('sv-SE', {minimumFractionDigits: 2})` and bold the number
  - Why: Numbers without formatting look like raw API data rather than polished UI

- [ ] **Page `<title>` separator inconsistency**
  - Files: ALL `.html` files
  - Problem: Some use `–` (en-dash), some use `-` (hyphen)
  - Fix: Standardize all titles to `TakoramaCharge – [Page Name]` with en-dash
  - Why: Small detail, immediately visible in browser tabs and bookmarks

- [ ] **"Tillbaka till dashboard" link — plain text, no button style**
  - Files: `web/portal/cps.html`, `web/users_history.html`, `web/my.html`, org/user equivalents
  - Problem: The back-link is unstyled plain text `← Tillbaka...` — feels like a fallback
  - Fix: Style as `<a class="btn btn-outline-secondary btn-sm">← Tillbaka</a>`
  - Why: Consistent action affordance — users know it's clickable

---

## 🟡 P2 — Visual Refinement (nice to have, high impact)

- [ ] **Dashboard — add a "last refreshed" indicator with live countdown**
  - File: `web/portal/index.html` + `assets/portal_index.js`
  - Problem: Auto-refresh exists but user doesn't know when next refresh is
  - Fix: Show `Uppdateras om: 25s` countdown next to "Senast: HH:MM"
  - Why: Zaptec portal does this — removes uncertainty about data freshness

- [ ] **Dashboard — add CP count summary above card grid**
  - File: `web/portal/index.html` + `assets/portal_index.js`
  - Problem: No at-a-glance count before scrolling cards
  - Fix: Add a small summary bar: `5 laddare | 3 available | 1 charging | 1 faulted`
  - Why: Operators with 20+ chargers need the summary before details

- [ ] **Add a loading skeleton on initial page load**
  - File: `assets/style.css` + dashboard/history HTML
  - Problem: Pages show blank content while JS fetches data — looks broken
  - Fix: Add CSS skeleton cards/rows as placeholders that disappear when data loads
  - Example CSS:
    ```css
    .skeleton { background: linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);
                background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    ```
  - Why: Every modern SaaS dashboard (including Virta, ChargePoint) uses skeleton loading

- [ ] **Navbar — highlight the currently active page link**
  - Files: All page HTML files + `assets/style.css`
  - Problem: No visual indication of which page you are on
  - Fix: Add `active` class to the matching nav-link on each page, style: `.nav-link.active { color: #fff; font-weight: 600; border-bottom: 2px solid var(--bs-primary); }`
  - Why: Basic navigation UX pattern — absent from every current page

- [ ] **Responsive navbar — too many items on mobile**
  - Files: All navbar HTML
  - Problem: 7+ nav items collapse into hamburger menu — fine, but the collapsed menu is unstyled
  - Fix: Add `py-2` spacing between collapsed items and a subtle divider before logout button
  - Why: Mobile UX matters for operators checking dashboards on phones

- [ ] **CP status cards — keep existing icon set**
  - File: `assets/portal_index.js` card template
  - Status: No icon expansion in this sprint

- [ ] **Login card — add subtle brand color top border**
  - File: `assets/style.css`
  - Fix: `.card.login-card { border-top: 4px solid var(--bs-primary); }`
  - Add class `login-card` to the card in `web/login.html`
  - Why: Anchors brand color on first impression — Recharge and Zaptec both do this

- [ ] **Add focus-visible ring to all interactive elements**
  - File: `assets/style.css`
  - Fix:
    ```css
    :focus-visible {
      outline: 2px solid var(--bs-primary);
      outline-offset: 2px;
      border-radius: 4px;
    }
    ```
  - Why: Required for keyboard accessibility and WCAG 2.4.7

- [ ] **Dark mode compatibility fixes removed by scope**
  - Status: Explicitly excluded in this sprint

---

## 🔵 P3 — Future Sprint (scope for next iteration)

- [ ] Add a simple bar chart to "Min statistik" (kWh per week using Chart.js)
- [ ] Add CSV export button to history table
- [ ] Add live websocket status feed instead of 30s poll
- [ ] Add a session detail modal (click a history row → show full session data)
- [ ] Add a "Copy OCPP URL" button on CP detail for easy charger configuration
- [ ] Consider i18n toggle (Swedish ↔ English) since OCPP terminology is English

---

## ✅ Done Criteria Per Sprint
After completing each priority level:
1. Open in Chrome + Firefox private window
2. Test all 3 roles (portal_admin, org_admin, user)
3. Test mobile viewport (375px width)
4. Check browser console — zero new JS errors
5. Run `./run.sh up-local` and verify `/health` still returns `{"status":"healthy"}`

---

## Quick wins you can do right now (< 5 min each)

```bash
# 1. Replace all logo.png references with logo_transparent.png
grep -rl 'logo\.png' web/ | xargs sed -i 's/logo\.png/logo_transparent.png/g'

# 2. Add favicon to all HTML pages
grep -rL 'rel="icon"' web/**/*.html web/*.html | xargs -I{} sed -i 's|</head>|  <link rel="icon" href="/assets/logo_transparent.png" type="image/png">\n</head>|' {}
```

