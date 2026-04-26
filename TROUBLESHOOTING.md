# Feilsoking: cache og service worker

Kort guide for vanlige PWA/offline-problemer i dette repoet.

## Symptom -> losning

| Symptom | Sannsynlig arsak | Losning |
|---|---|---|
| Nye endringer vises ikke | Gammel cache brukes fortsatt | Unregister service worker + Clear site data + hard reload |
| Du far gammel offline-side | CACHE_NAME er ikke oppdatert etter endringer | Bump CACHE_NAME i service-worker.js (f.eks. alma-v4), deploy pa nytt |
| Offline-fallback virker ikke | Service worker er ikke aktiv eller offline.html er ikke i cache | Sjekk i DevTools Application at SW er aktiv, og test pa nytt etter unregister/reset |
| Manifest/ikoner oppdateres ikke | Nettleseren bruker tidligere cachet metadata | Clear site data og hard reload |
| Lokal test fungerer ikke som forventet | Siden er apnet uten HTTP-server | Kjor via lokal server (npx serve .), ikke direkte filapning |

## Standard reset-prosedyre
1. DevTools > Application > Service Workers > Unregister.
2. DevTools > Application > Storage > Clear site data.
3. Hard reload (Ctrl+F5).

## Nar du ma bump CACHE_NAME
Bump CACHE_NAME nar du endrer filer i CACHE_URLS, typisk:
- index.html
- manifest.webmanifest
- offline.html
- ikoner under /icons/
- /spill/ eller /ukelonn/-sider som precaches

Eksempel:
- fra alma-v3
- til alma-v4
