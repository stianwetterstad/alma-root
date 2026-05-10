# PWA og offline

## Manifest
manifest.webmanifest beskriver hvordan appen installeres og vises:
- name/short_name: Alma
- start_url og scope: /
- display: standalone
- theme/background color: #f0f7ff
- ikoner: /icons/icon-192.png og /icons/icon-512.png

index.html laster manifest og registrerer service worker ved load.

## Cache-strategi i service-worker.js
CACHE_NAME settes i service-worker.js.

Precache ved install (cache.addAll):
- /index.html, /favicon.ico, /manifest.webmanifest
- /icons/icon-192.png, /icons/icon-512.png
- /offline.html
- /spill/, /spill/index.html
- /ukelonn/, /ukelonn/index.html

Runtime-cache i fetch-handler:
- Kun GET og same-origin handteres.
- Navigasjon (request.mode === navigate): network-first.
- Andre statiske foresporsler: cache-first.
- Ved cache miss pa statiske filer hentes ressursen fra nett og legges i cache ved ok svar.

## Offline-fallback for navigasjon
Ved navigasjon prover service worker nettverket forst.
Hvis nett feiler returneres /offline.html fra cache.
Hvis den ikke finnes, prover den eksplisitt /offline.html igjen.
Hvis fortsatt ingen treff, returneres /index.html som siste fallback.

## Cache-versjonering
Nar du endrer filer som precaches, bump CACHE_NAME (f.eks. alma-v4).
Da slettes gamle cacher i activate-eventet og klienter far ny cache.

## Lokal test
1. Start lokal server (f.eks. npx serve .).
2. Apne siden i Chrome/Edge.
3. DevTools > Application: verifiser manifest og aktiv service worker.
4. DevTools > Network: sett Offline.
5. Last siden pa nytt og bekreft offline-fallback.

## Reset ved stale cache
1. DevTools > Application > Service Workers > Unregister.
2. DevTools > Application > Storage > Clear site data.
3. Hard reload (Ctrl+F5).

