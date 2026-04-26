# Alma root

Kort docs-pakke for forsiden til Alma med PWA/offline-stotte.

## Struktur (kort)
Filer i rot:
- CNAME, favicon.ico, index.html, manifest.webmanifest, offline.html, service-worker.js
- README.md, PWA.md, TROUBLESHOOTING.md

Mapper:
- icons/
- spill/ (2048, breakout, memory, snake, space-invaders, tetris)
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
- Cache-versjon styres av CACHE_NAME (na alma-v3). Bump ved endringer i precachede filer.

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
