# AGENTS.md — istruzioni per un agente che lavora su YuGiOhGame

Duello Yu-Gi-Oh in HTML/CSS/JavaScript puro: nessun framework, nessun
bundler, nessuna build. Ogni pagina `.html` si apre anche da `file://`, con
`<script src>` classici in un ordine che fa parte dell'architettura. Autore
unico (Jacopo, jacopofa92). Branch di lavoro: `main` (pubblicato da GitHub
Pages; il server Multiplayer su Render si ridistribuisce col push su `main`).

## Prima di toccare qualcosa, leggi nell'ordine

1. `PROJECT_MAP.md` — la mappa corrente. In cima c'è la sezione
   **«Passaggio di consegne (2026-10-06)»**: cosa è stato rifatto negli
   ultimi giorni, dove sta, cosa resta da fare.
2. `WORK_IN_PROGRESS.md` — il piano di attacco con le voci aperte `[ ]`.
3. `CLAUDE.md` — la memoria lunga delle decisioni e dei bug passati. È un
   diario: cerca la parola chiave dell'area che tocchi invece di leggerlo
   tutto. Dove contraddice il codice, ha ragione il codice.
4. `GUIDA_RIUTILIZZO.md` prima di un refactor ampio.

## Regole dell'utente (non negoziabili)

- **Rispondi e scrivi in italiano**: chat, commenti nel codice, messaggi di
  commit, documentazione.
- **Non lanciare la suite completa** (`npm test`) di tua iniziativa: la
  decide l'utente. Lancia gli spec toccati o a rischio con
  `node tests/run-all.js <parte-del-nome>` e scrivi nel messaggio di commit
  "Suite completa non eseguita."
- Commit mirati, uno per cambiamento logico, **push subito dopo** su `main`.
  Mai `--no-verify`: se il pre-commit ferma un commit, si corregge la causa.
- I refactor grandi o rischiosi vanno su un branch dedicato, e si uniscono a
  `main` solo quando l'utente lo chiede (dopo la suite completa).
- Non fermarti a chiedere "continuo?" a ogni passo di un lavoro già chiesto.
  Chiedi solo per decisioni che spettano davvero all'utente.
- Effetti delle carte: riferimento primario YGOPRODeck. Le Trappole si
  attivano solo dopo essere state Settate. Carte duplicate o imprecise si
  cancellano, non si segnalano.
- Commenti generosi sul PERCHÉ (vincoli nascosti, bug evitati): il codice
  deve restare modificabile a mano senza un assistente.

## Comandi

```text
node scripts/check-syntax.js          # node --check su tutti i .js, 2 secondi
node tests/run-all.js <nome>          # spec mirati (Playwright)
node scripts/sync-script-groups.js    # riscrive i gruppi di <script> nelle pagine
npm run typecheck                     # tsc sui file con // @ts-check
node scripts/build-cards-data.js      # dopo OGNI modifica a data/cards.json
node tools/duello-senza-testa.js      # duelli IA contro IA in Node
node tools/duello-gemello.js          # due motori a passo comune in Node
node tools/impronta-partite.js f.txt  # impronta di 60 partite (prima/dopo un refactor)
```

## Trappole tecniche già pagate

- **PowerShell 5.1**: `Get-Content -Raw` legge in ANSI e riscrivendo in UTF-8
  distrugge ogni accento ("è" diventa "Ã¨"); `Set-Content -Encoding utf8` <!-- [ok-accenti] -->
  aggiunge un BOM. Modifica i file con gli strumenti di modifica, o leggi/scrivi
  con `[IO.File]::ReadAllText/WriteAllText` e UTF-8 senza BOM. I file del
  progetto sono in CRLF.
- Git su questo PC è portatile: `D:\Programmi\PortableGit\bin\git.exe`.
- `js/data/cards-data.generated.js` non si modifica a mano: si rigenera.
- Un `const` a livello di script NON è una proprietà di `window`: un modulo
  che altri leggono da `globalThis` va pubblicato anche lì.
- Le liste di `<script>` delle pagine si cambiano in `scripts/gruppi-script.js`
  e si riscrivono con `sync-script-groups.js` (il pre-commit lo controlla).
- `sw.js` precarica l'app: un file nuovo va nella sua lista, e dopo una
  modifica visibile ai giocatori si alza `CACHE_NAME`.

## Regole del motore che i guardrail fanno rispettare

Un guardrail rosso dopo una tua modifica di solito ha ragione: leggilo prima
di cambiarlo.

- Un file di regola non tocca la pagina (`document.`): usa `PortaUI`.
- Un file di regola non chiama per nome il disegno: avvisa con `EventiDuello`.
- Ogni scelta del duello passa da `Decisioni.chiedi`, con `chi` = il posto
  vero (mai `'player'` scritto a mano).
- Chi controlla un posto si chiede a `Tavolo` (`persona`/`ia`/`remoto`); lo
  stato di un posto si legge con gli accessori `Tavolo.mano(posto)`...
- Ogni mossa di un giocatore (persona o IA) è un comando: `Comandi.esegui`.
- Niente `Math.random()` nelle regole: `Casuale` (o `ctx.random()` nelle carte).
- Niente cicli `['player','bot']` scritti a mano nelle regole: `Tavolo.ordine()`.
- Un timer che fa avanzare le regole: `PassoComune.dopo` (`dopoRegola` nel
  motore), non `setTimeout`.
- `ctx.specialSummon` vuole sempre `fromZone`; un bersaglio su un mostro passa
  dal checkpoint di targeting (`ctx.declareTarget` o simili).
