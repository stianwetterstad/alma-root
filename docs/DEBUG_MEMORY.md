# DEBUG_MEMORY

## Symptomer
- Forste kort kunne bli staende synlig etter to klikk, uten at sammenligning ble utfort.
- Tid i HUD hoppet fremover etter pause/resume og kunne inkludere tid brukt i pause/fane skjult.

## Hypoteser (prioritert)
1. `first` blir evaluert med truthy/falsy i stedet for eksplisitt `null`-sjekk (index `0` feiler).
2. Timer-resume bruker gammel `t0` uten a trekke fra pausetid.
3. Lock-state (`lock`) resettes ikke i alle mismatch-paths.
4. Pause/hint-overlay forstyrrer klikkflyt slik at state blir inkonsistent.
5. Dobbel registrering av listeners eller flere samtidige timer-kilder.

## Funn (rotarsak)
- Hovedfeil for kort: I `flip(i)` ble `if (!first)` brukt for a avgjore om forste kort er valgt. Nar forste kort har index `0`, blir betingelsen sann pa nytt ved andre klikk. Da blir andre kort feilaktig satt som nytt "forste kort", `tries` okes ikke, og forste kort kan bli staende synlig.
- Hovedfeil for tid: Ved pause stoppes intervallet, men `t0` beholdes. Ved resume brukes fortsatt gammel starttid, sa `Date.now() - t0` inkluderer pauseperioden.

## Endringer gjort (kort diff-beskrivelse)
Fil: `spill/memory/index.html`
- La til enkel instrumentering bak `const DEBUG = false`:
  - `debugLog(event, data)`
  - logging for kortklikk, flip, compare, match/mismatch, lock on/off, pause/visibility, timer start/stop/pause.
- Rettet kortlogikk:
  - Endret `if (!first)` til `if (first === null)`.
- Stabiliserte mismatch-render:
  - Lagrer `firstIndex` lokalt i mismatch-path for robust render/reset i timeout.
- Rettet timer-pause/resume:
  - Ved pause: fryser `elapsedMs` umiddelbart (`elapsedMs = Date.now() - t0`) for a unnga tick-lag.
  - Ved start/resume: setter alltid `t0 = Date.now() - elapsedMs` for korrekt akkumulert tid uten pause-drift.
  - Beholder guard mot flere intervaller via eksisterende `stopTimer()` i `startTimer()`.

## Hvordan teste (konkret)
1. Start nytt spill. Klikk kort med `data-i="0"`, deretter et annet ikke-match.
   - Forventet: `Forsok` oker med 1, begge kort snur tilbake etter ca. 650 ms.
2. Klikk to matchende kort.
   - Forventet: begge blir staende synlige som matched, `Treff` oker med 1.
3. Spam-klikk flere kort mens mismatch-compare pa gar.
   - Forventet: ingen desync; lock hindrer ekstra flip til timeout er ferdig.
4. Trykk `Kikk 2s` under spill.
   - Forventet: kort vises midlertidig, skjules igjen, ingen permanent lock.
5. Start timer (flip et kort), trykk pause i topbar, vent 2-3 sek, fortsett.
   - Forventet: tid star stille under pause og fortsetter fra samme verdi (uten hopp).
6. Bytt fane mens spill gar, vent 2-3 sek, ga tilbake.
   - Forventet: auto-pause trigges, tid teller ikke mens fanen er skjult.
7. Pause mens mismatch-timeout er aktiv.
   - Forventet: ingen krasj eller permanent lock; state forblir konsistent etter resume.
8. Restart via sidepanel og via topbar.
   - Forventet: tid resettes til 0s, ingen dobbel timer, status starter rent.

## Potensiell felles forbedring (andre spill, ikke endret na)
- `spill/tetris/index.html`, `spill/breakout/index.html`, `spill/snake/index.html`, `spill/space-invaders/index.html` bruker alle `requestAnimationFrame`-lokker med pause-guard. Dette er stabilt, men en felles `DEBUG`-toggle for pause/visibility/input-lock ville forenkle regressjonssok.
- `spill/2048/index.html` mangler tids-HUD (ingen timerdrift-risiko), men deler pause/visibility-monsteret. En felles utility for `setPaused`, `autoPausedByHidden` og overlay-state kan redusere copy/paste-regresjoner.
- Alle spill med overlay kan dra nytte av en felles "interaction lock invariant"-sjekk (smatest i dev): "hvis overlay synlig skal gameplay-input ignoreres, og lock-state ma frigjores ved restart".
