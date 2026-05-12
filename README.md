# Alma root

Kort docs-pakke for forsiden til Alma med PWA/offline-stotte.

## Struktur (kort)
Filer i rot:
- CNAME, favicon.ico, index.html, manifest.webmanifest, offline.html, service-worker.js
- README.md, PWA.md, TROUBLESHOOTING.md

Mapper:
- icons/
- spill/ (2048, breakout, kosekaos, memory, snake, space-invaders, tetris)
- ukelonn/

## Hva er dette?
- Forside pa /
- Lenker til /ukelonn/ og /spill/
- PWA-oppsett via manifest.webmanifest + service-worker.js

## PWA/offline (status na)
- Service worker registreres fra index.html ved page load.
- Precache inkluderer bl.a. /index.html, /manifest.webmanifest, /offline.html, /icons/*, /spill/, /ukelonn/.
- Navigasjon bruker network-first med fallback til /offline.html (og deretter /index.html).
- Statiske same-origin GET-ressurser bruker cache-first + runtime caching ved vellykket nett-svar.
- Cache-versjon styres av CACHE_NAME i service-worker.js. Bump ved endringer i precachede filer.

## Lokal kjoring
Kjor fra repo-roten:

```bash
npx serve .
```

Alternativ (Python):

```bash
python -m http.server 3000
```

## Rask test av PWA/offline
Kjor testflyt:

```bash
npx serve .
# apne URL-en fra terminalen i Chrome/Edge
```

1. Start server og apne siden i Chrome/Edge.
2. Sjekk at Service Worker er aktiv i DevTools > Application.
3. Sett DevTools > Network til Offline.
4. Last siden pa nytt og bekreft at offline.html vises ved navigasjon.

## Videre docs
- Se PWA.md for cache-strategi, fallback og versjonering.
- Se TROUBLESHOOTING.md for cache/service worker-feilsoking.

## Testing (lokalt med npx)

Dette repoet har testpakke for Kosekaos med:
- E2E: Playwright (stabile ende-til-ende-flyter)
- Integrasjon/unit: Vitest + Testing Library + ren logikk

### 1) Installer dev-avhengigheter

```bash
npx --yes npm@latest install
```

### 2) Installer Playwright nettlesere (ved behov)

```bash
npx playwright install
```

### 3) Kjor E2E tester

```bash
npx playwright test
```

Kjor i headed mode:

```bash
npx playwright test --headed
```

### 4) Kjor unit/integrasjonstester

```bash
npx vitest run
```

Watch mode:

```bash
npx vitest
```

### 5) Kjor alt

```bash
npx npm test
```

### Hva som dekkes for Kosekaos
- Lasting og init av /spill/kosekaos/
- Startflyt, dekorflyt, summary/restart
- Keyboard-betjening av kritiske knapper
- Mobil/touch interaksjon (Chromium mobile project)
- localStorage save/load + korrupt data fallback
- Fokus/blur robusthet
- Responsiv resizing under aktiv sesjon
- A11y sanity (roller, labels, aria-live)

## Prod deploy (anbefalt flyt)

### 1) Kjor pre-deploy kvalitetssjekk

```bash
npx npm run prod:check
```

Dette kjorer unit + e2e lokalt og fanger regresjoner for publisering.

### 2) Verifiser PWA-cache bump ved endret precache-liste

Hvis du har endret filer i precache-listen i service-worker.js, oppdater CACHE_NAME for a tvinge ny cache i klientene.

### 3) Publiser

Publiser innholdet via GitHub Pages fra repo-roten (statisk deploy). Ingen build-step er nodvendig.
