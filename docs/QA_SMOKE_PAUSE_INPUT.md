# QA Smoke: Pause, Visibility og Input-lock

Dato: 2026-04-26
Omfang: memory, 2048, breakout, snake, space-invaders, tetris

## Sekvens brukt
1. Apn spillside.
2. Lukk hint-overlay hvis vist.
3. Aktiver pause via topbar.
4. Verifiser at pause-overlay er synlig.
5. Send gameplay-input mens pauset.
6. Verifiser at gameplay ikke fortsetter under pause.
7. Resume via overlay-knapp.
8. Verifiser at gameplay fortsetter etter resume.

## Resultater
- memory: PASS
  - Status gikk til Pauset.
  - Forsok endret seg ikke under pause.
  - Etter resume kunne neste kortklikk oppdatere state normalt.
- 2048: PASS
  - Brett-state endret seg ikke ved piltast under pause.
  - Etter resume ga piltast forventet brett-endring.
- breakout: PASS
  - Status forble Pauset under input mens pause-overlay var aktiv.
  - Resume ga status Spiller.
- snake: PASS
  - Topbar knapp byttet til Fortsett i pause, tilbake til Pause etter resume.
  - Input under pause endret ikke pause-state.
- space-invaders: PASS
  - Status forble Pauset under skyte-input mens pause-overlay var aktiv.
  - Resume ga status Spiller.
- tetris: PASS
  - Status forble Pauset under input mens pause-overlay var aktiv.
  - Resume ga status Spiller.

## Invariant-check i DEBUG
Felles invariant i utility (kun ved DEBUG=true):
- Hvis pause-overlay er synlig mens input-lock rapporterer ulast, logges advarsel:
  - invariant:overlay-visible-input-unlocked
- I denne situasjonen returnerer input-lock blokkert i DEBUG, slik at gameplay-input ikke slipper gjennom.

Fil: spill/shared/game-runtime-utils.js
