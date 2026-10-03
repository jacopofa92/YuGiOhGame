# YuGiOhGame — mappa tecnica persistente

Ultimo aggiornamento verificato: 2026-10-02.

Questo file è la memoria breve e stabile del progetto. Va letto all'inizio di
una nuova sessione prima di scandire di nuovo l'intero repository. Per la
cronologia dettagliata delle decisioni e delle correzioni precedenti resta
valido `CLAUDE.md`; per la separazione e il possibile riuso del motore vedere
`GUIDA_RIUTILIZZO.md`.

## Stato rapido

- Versione dichiarata: `1.0.6` stabile (`package.json` e `js/version.js`).
- Applicazione HTML/CSS/JavaScript puro: nessun framework, bundler o build del
  frontend. Gli script globali devono essere caricati nell'ordine giusto.
- 19 pagine HTML, 92 file JS applicativi sotto `js/`, 1.131 carte,
  116 spec Playwright al momento dell'ultimo inventario.
- PWA tramite `manifest.json`, `sw.js` e `js/pwa-register.js`.
- App Android/Capacitor: nel repository è presente un vecchio APK beta.21;
  non coincide con la versione sorgente 1.0.6; la cache WebView/PWA corrente
  è `ygo-duel-arena-v119`.
- Cloud tramite Supabase; multiplayer tramite relay WebSocket Node nativo.
- Le preferenze utente (`save.settings`: dettagli video, ologrammi, aptica,
  volume e mute musica/SFX) fanno parte del salvataggio unificato e quindi di
  export/import e cloud; le vecchie chiavi locali restano cache e migrazione.
- L'autowin di collaudo dell'admin (`StoryAutowin`) viene applicato sia ai
  duelli della Storia sia a Regno dei Duellanti, Battle City e Torneo Kaiba;
  richiede sempre interruttore locale acceso e `CloudSync.isAdmin()` vero.
- Alla conclusione di un duello `sealDuelModalsForOutcome()` chiude e rende
  inerti tutti i modali; `body.duel-outcome-active` impedisce a callback
  tardivi di riaprire la conferma Abbandona sotto la schermata Vittoria.
- `tornei.html` permette di abbandonare direttamente una scalata in corso;
  azzera solo `save.tournaments[id]`, conservando storico e premi.
- Nel Regno dei Duellanti le Stelle correnti vivono esclusivamente in
  `save.tournaments.duelistKingdom.stars`: partono da 2 e bonus, malus,
  puntate, soglia del Castello e riepilogo leggono lo stesso contatore.
- Il Castello di Pegasus usa una seconda history lineare: all'ingresso azzera
  la sola history grafica dell'isola; il nuovo sfidante compare soltanto dopo
  la vittoria sul precedente, mentre i nodi già battuti nel Castello restano
  visibili. Le tre tappe avanzano da sinistra a destra sul tappeto rosso.
- I duelli del Regno dei Duellanti usano `arenaRegnoDeiDuellanti.jpg`
  sull'isola e `arenaCastelloPegasus.jpg` dal Cancello in avanti.
- Ogni nuova scalata nel Regno apre il momento `prologue` di
  `TournamentDialogues` prima di renderizzare la mappa; viene registrato in
  `intermezziVisti` per non ripetersi dopo un reload.
- Battle City apre il proprio `prologue` su
  `images/maps/storia_anime_battlecity1.jpg`; la fase `city` usa una main
  full-viewport e il fondale `images/fields/citta.jpg` (con variante mobile).
  Le 25 celle logiche non disegnano alcun pannello o reticolo: solo i punti
  d'interesse, leggermente sfalsati, galleggiano sul fondale. I nodi DOM
  restano persistenti durante gli spostamenti e un unico segnalino animato
  scorre fra gli isolati; su movimento ridotto la transizione viene rimossa.
- Le campagne narrative non belliche hanno ulteriori raccordi: 2 scene in
  `anime`, 3 in `forbiddenMemories` e 4 in `freedom`. Le separazioni
  `dalla: 'tappe'` migrano i vecchi contatori lineari senza spostare il punto
  narrativo; WW1 resta deliberatamente esclusa.
- Nel tabellone di Battle City `resolvePendingEncounterIfDone()` tratta anche
  `r32` e `r16` come turni a eliminazione: una vittoria, compreso l'autowin,
  scrive `player` nel relativo array dei vincitori e apre il turno successivo.
- Il roster della prima serie include anche i Rare Hunter Seeker, Strings,
  Lumis e Umbra. Hanno tre mazzi ciascuno, battute personali e iconiche e
  partecipano agli incontri `hunter` di Battle City, quindi una vittoria nel
  torneo li sblocca nel Duello Libero. Finché mancano i relativi JPG sotto
  `images/characters/`, il renderer usa automaticamente il proprio fallback.
  I nodi `hunter` della città restano anonimi: l'avversario viene estratto
  entrando nel nodo, senza ripetizioni finché il pool Rare Hunter non è stato
  esaurito; l'estrazione viene poi conservata nel `pendingEncounter`.
- Nella campagna anime i quattro Rare Hunter compaiono in Battle City Parte 1
  nell'ordine Seeker, Strings, Lumis e Umbra, con dialoghi introduttivi. Tre
  migrazioni `inserite` mantengono allineati i progressi salvati prima della
  loro aggiunta.
- La campagna `anime`/“Il Regno delle Ombre” include raccordi narrativi sulla
  notte dell'isola, le dieci Stelle, i finalisti di Battle City, le anime
  prigioniere di Noah, la promessa di Joey, i tre Dei e il vero nome Atem.
  Battle City Parte 1 distribuisce ora i nodi lungo città, parco, porto e
  dirigibile invece di comprimerli a sinistra; ogni nuova scena ha una
  migrazione `inserite` per non arretrare i salvataggi precedenti.
- Controllo sintattico del 2026-09-29: 212 file JS, tutti validi.

## Ordine di lettura consigliato

1. Questo file.
2. Le prime sezioni di `CLAUDE.md`: avvio, struttura, convenzioni e rischi.
3. La sezione pertinente di `CLAUDE.md` cercando la funzionalità interessata.
4. I file sorgente della sola area coinvolta.
5. Gli spec con nome correlato sotto `tests/specs/`.

Non fidarsi dei conteggi scritti nella documentazione storica: contare i file
quando il numero è importante. Alcune sezioni di `CLAUDE.md` descrivono lavori
passati e possono essere state superate dal codice.

## Architettura

```text
Pagine/modalità HTML
        |
        +-- save-manager.js / cloud/* / data/*
        |
        +-- duel-session.js
                |
                +-- engine/duel-engine.js  (stato, chain, trigger, regole)
                +-- engine/actions.js      (azioni di gioco)
                +-- engine/game-flow.js    (fasi, turni, interazione UI)
                +-- engine/card-effects.js (helper degli effetti)
                +-- engine/card-effects-1..8.js (registrazioni per carta)
                |
                +-- ai/* oppure multiplayer/*
                |
                +-- ui/* + audio/* + native/*
```

Il centro del duello è `gameState`, un grande oggetto globale. Molte funzioni
leggono e modificano direttamente questo stato. `duel-session.js` prepara il
contesto della modalità e collega il risultato del duello alle pagine Storia o
Torneo. Le pagine non usano moduli ES: dipendono dai global creati dagli script
precedenti.

## Mappa delle aree

### Motore di duello

- `js/engine/duel-engine.js`: stato, chain, trigger, battaglia, risoluzioni.
- `js/engine/actions.js`: evocazioni, set, attacchi e azioni del giocatore.
- `js/engine/game-flow.js`: fasi, passaggio turno, messaggi e aggiornamenti UI.
- `js/engine/effect-templates.js`: pattern condivisi per gli effetti.
- `js/engine/card-effects.js`: helper e contratto degli handler.
- `js/engine/card-effects-1.js` … `card-effects-8.js`: effetti delle carte.
- `js/engine/duel-sandbox.js`: configurazione particolare della pagina demo.

### Box delle Catene

- `renderChainStack()` mantiene ordine di attivazione e risoluzione LIFO,
  ma assegna a ogni Link una lieve inclinazione alternata e un piano di
  energia dietro la miniatura;
- `#chainStack` e' un espositore semi-3D stratificato: cornice interna,
  base prospettica, carte sollevate e riflesso sulla superficie. Il Link
  in risoluzione avanza, si raddrizza e riceve anello/luce animati, come
  una versione compatta dell'attivazione carta a centro schermo;
- posizione e dimensioni storiche restano invariate; movimento disattivato
  con `prefers-reduced-motion`. Guardrail:
  `tests/specs/chain-stack-semi-3d.spec.js`.
- il contenitore grafico è stato rimosso: intestazione e carte fluttuano
  direttamente sul campo, con overflow visibile per non troncare ombre,
  inclinazioni o il Link che avanza durante la risoluzione.
- su desktop le carte arrivano a 104px; nome e proprietario vivono in una
  targhetta separata davanti al piano animato, con spaziatura verificata per
  non essere coperti dai Link vicini o da quello in risoluzione.

### Priorità cinematiche e distruzione Magie/Trappole

- i video di evocazione usano il livello UI massimo, intercettano ogni input
  e tengono `DUEL_CINEMATIC_LOCK` attivo fino alla fine della dissolvenza;
- Magie, Trappole e Magie Terreno distrutte ricevono una scossa con perdita
  di segnale e smaterializzazione olografica, distinta dalle esplosioni dei
  mostri. Guardrail: `tests/specs/distruzione-magie-trappole.spec.js` e
  `tests/specs/video-evocazione-priorita.spec.js`.

### Audio contestuale Grande Guerra

- nei duelli con `mode=story&campaign=ww1`, `js/audio/audio-library.js`
  cerca prima `audio/standard/ww1/<effetto>`; soltanto dopo un esito
  mancante usa `audio/standard/<effetto>` e infine il fallback sintetico;
- la priorità vale per ogni chiamata `SFX.*`, non solo per gli effetti oggi
  già presenti nella cartella WW1. Guardrail:
  `tests/specs/audio-ww1-priorita.spec.js`.

### Preparazione Duello Libero e morra cinese

- la modale di `duello-libero.html` separa la scheda dell'avversario dalla
  configurazione di arena, musica, carte ammesse e livello; la difficoltà è
  mostrata con tre scelte descrittive;
- desktop, telefono verticale e telefono landscape hanno composizioni
  dedicate. La morra usa una piccola arena rituale e in landscape divide
  confronto e comandi in due colonne. Guardrail:
  `tests/specs/duello-libero-config-responsive.spec.js` e
  `tests/specs/morra-cinese-responsive.spec.js`.

### Battute contestuali dei Duellanti

- `js/ui/duel-dialogues.js` contiene personalità, tre varianti per ciascuno
  dei sei contesti e le evocazioni iconiche obbligatorie. Il motore invia
  soltanto gli eventi, senza conoscere i testi;
- le battute normali hanno probabilità e cooldown, quelle speciali partono
  sempre. `js/ui/duel-dialogues.css` disegna i balloon accanto agli avatar
  di giocatore e avversario, anche su mobile;
- il giocatore personale usa il profilo eroico; nella Storia eredita invece
  identità e personalità del protagonista. Guardrail:
  `tests/specs/duel-dialogues.spec.js`.

### Carte e dati

- Fonte di verità: `data/cards.json`.
- File generato caricato dal gioco: `js/data/cards-data.generated.js`.
- Dopo una modifica ai dati: `node scripts/build-cards-data.js`.
- Non modificare manualmente `cards-data.generated.js`.
- `js/data/cards-db.js` espone/normalizza il catalogo.
- `character-decks.js`, `characters-db.js`, `story-campaigns.js` e gli altri
  file sotto `js/data/` contengono i grandi cataloghi di gioco.

### AI

- `ai-controller.js`: facciata.
- `ai-shared.js`: valutazioni comuni.
- `ai-medium.js`, `ai-hard.js`: strategie per difficoltà.
- `bot.js`: esecuzione del turno e orchestrazione.
- `AI_SHARED.shouldHoldForExodia()` esclude sempre i cinque pezzi dalle
  Evocazioni e dai Set del bot: vale per Facile/Normale tramite `AI_MEDIUM` e
  per Difficile tramite `AI_HARD`. Se la mano contiene solo quei pezzi, il bot
  rinuncia all'Evocazione e li conserva per la vittoria automatica.

### Modalità e progressione

- `index.html`: menu e viste principali.
- `duelMonstersCore.html`: arena comune dei duelli.
- `duello-libero.html`: setup del duello libero.
- `storia.html` + `js/story/story-progress.js`: campagne e nodi.
- `tornei.html`: unica pagina canonica per selezione, abbandono e avanzamento
  dei tornei. Il menu di `index.html` la apre come pagina autonoma; non esiste
  più una seconda vista Tornei incorporata nell'index.
- `torneo-regno-duellanti.html`, `torneo-battle-city.html`,
  `torneo-kaiba.html`: stati e flussi autonomi dei tre tornei.
- `js/data/tournament-dialogues.js`: intermezzi narrativi condivisi.
- `js/ui/story-cutscene.js` + `.css`: regia visual-novel condivisa. Durante
  i dialoghi assegna stabilmente gli interlocutori a sinistra/destra,
  collega il bordo del box al lato di chi parla e mostra il progresso della
  conversazione; narratore e layout mobile/orizzontale restano dedicati.
- `sfide.html` + `js/challenges/challenge-tracker.js`: sfide e progressi.
  Il catalogo `js/data/challenges-db.js` contiene 128 sfide persistenti:
  l'ultima espansione ne aggiunge 44 per duellanti dell'anime (inclusi Rare
  Hunters e Mondo Virtuale), mostri iconici, Magie/Trappole e traguardi di
  lungo periodo. Le voci usano soltanto i tipi generici già agganciati al
  motore (`defeatCharacter`, `summonMonster`, `activateCard`, `perfectWin`,
  `winInstantly`, `completeTournament`, `winDuels`).

### Economia e collezione

- `cartoteca.html`, `creazione-deck.html`, `crea-carta.html`.
- `js/economy/rewards.js`: assegnazione premi.
- `shop-catalog.js`, `shop-ui.js`, `pack-opening.js`: negozio e pacchetti.
  Nel Negozio un account admin può riacquistare senza limiti gli
  Starter/Structure Deck già posseduti: il pack resta registrato una sola
  volta, mentre ogni nuovo acquisto paga il prezzo e aggiunge nuovamente le
  carte alla collezione (fino al limite copie globale). Per gli altri account
  resta valido il singolo acquisto.
- `save-manager.js`: salvataggio locale e forma dei dati persistiti.

### Cloud

- `js/cloud/supabase-config.js`: configurazione client.
- `cloud-sync.js`: account, salvataggi e carte personalizzate.
- `auth-gate.js`: accesso obbligatorio alle pagine protette.
- `auto-sync.js`: sincronizzazione durante l'uso.
- `server-date.js`: data autorevole per negozio/bonus.
- `supabase/schema.sql`: tabelle `saves`, `custom_cards`, `profiles`, RLS,
  policy, funzioni account/admin e ora server.

### Multiplayer

- Client: `js/multiplayer/network.js`, `mp-lobby.js`, `multiplayer.js`.
- Server: `server/server.js`, solo moduli Node nativi.
- Messaggi: `create-room`, `join-room`, `rejoin-room`, `game-action`,
  `leave-room`.
- Stanze da due giocatori, TTL 30 minuti, grazia riconnessione 45 secondi,
  20 messaggi/s e messaggi massimi da 64 KiB.
- Il server inoltra le azioni ma non è un motore autorevole: la logica resta
  sui client. Questo è il limite principale per anti-cheat/competitivo.

### UI, asset e piattaforme

- `js/ui/`: rendering carte, topbar, deck switcher, cinematiche, mappe,
  onboarding, effetti visivi e recupero errori.
- `js/ui/page-loader.js` + `js/ui/page-loader.css`: overlay comune durante i
  cambi pagina. Mostra una carta a due facce che ruota in prospettiva 3D, con
  retro a vortice, fronte con sigillo, rune orbitali, scintille e ombra
  dinamica. È interamente CSS (nessun asset da attendere), è adattato al
  landscape mobile e rispetta `prefers-reduced-motion`. API pubblica:
  `PageLoader.show()` / `PageLoader.hide()` / `PageLoader.hideWhenReady()`;
  Negozio e Cartoteca lo riattivano dal router SPA mentre attendono gli asset
  lazy. Opzioni globali:
  `PAGE_LOADER_SKIP` / `PAGE_LOADER_MANUAL_HIDE`.
- `js/ui/game-logo.js` + `js/ui/game-logo.css`: logo condiviso di splash,
  accesso e menu. Il titolo usa Cinzel in forma monumentale e geometrica,
  incluso localmente in `assets/fonts/cinzel/` con licenza OFL e
  inserito nell'app shell del service worker: funziona offline e nell'APK.
  Il trattamento è volutamente sobrio: oro caldo opaco e ombra morbida,
  senza cornici, fregi o rilievi metallici stratificati.
- `js/ui/board-pieces.js`: pedine "3D" in SVG per le mappe dei tornei
  (duellante, Rare Hunter incappucciato, Carta Locazione, evento, negozio,
  decollo, casella ignota, casella risolta, puntina del giocatore).
  `BoardPieces.markup(kind)` torna l'SVG; i gradienti stanno in un solo
  `<svg>` condiviso iniettato una volta (mai in un contenitore
  `display:none`, o non si dipingono). Le usa la città di Battle City al
  posto delle emoji; un tipo sconosciuto torna stringa vuota, mai errore.
  Nella città le caselle raggiungibili sono accese, con percorso+freccia
  dal segnalino (`layoutCityOverlay`, ricalcolato anche al resize) e uniche
  ad avere la targhetta; le altre restano visibili ma attenuate. I Rare
  Hunter restano anonimi anche nella pedina (si estraggono entrando). I
  Duellanti della città mostrano il personaggio RITAGLIATO senza sfondo
  (PNG trasparenti forniti a mano; la rimozione automatica dello sfondo non
  dava risultati puliti). Il PNG ha lo stesso NOME del file avatar del
  personaggio, non il suo id: `joeyWheeler.jpg` → `images/characters/pedine/
  joeyWheeler.png`, `maximillionPegasus.jpg` → `maximillionPegasus.png`. Gli originali a piena risoluzione stanno in `images/characters/avatarTrasparenza/` (non caricati dal gioco); `pedine/` contiene le copie ridimensionate a max 320 px.
  Nessun elenco da tenere: ogni Duellante prova il suo file e, se non c'è,
  `BoardPieces` ripiega da solo sulla pedina standard (`onerror`, con
  memoria dei mancanti). Per aggiungerne uno basta mettere il PNG. Restano
  nella cartella alcune varianti senza avatar corrispondente (Kaiba in vari
  costumi, `yamiYugiV2`, un secondo soldato della Grande Guerra).
- `js/audio/`: musica ed effetti; vendor Howler incluso localmente.
- `js/native/`: back button, aptica, keep-awake e backup Android.
- Asset: `images/`, `audio/`, `video/`.
- Librerie vendorizzate: GSAP, Howler, Pixi e Supabase sotto `js/vendor/`.

## Test e comandi

```text
node scripts/check-syntax.js
node tests/run-all.js <parte-del-nome-spec>
npm test
```

`npm test` esegue l'intera suite. Regola esplicita del progetto: non avviarla
di propria iniziativa; usare gli spec mirati e lasciare all'utente la decisione
di eseguire tutto. La CI è in `.github/workflows/test.yml`.

## Rischi e debito tecnico noti

1. `gameState` è un God Object globale, senza schema o validazione centrale.
2. L'ordine dei tag `<script>` è parte dell'architettura e le liste sono
   duplicate tra molte pagine. Esiste un test guardrail contro il drift.
3. `actions.js` e `game-flow.js` espongono molte funzioni globali.
4. File molto grandi rendono i refactor trasversali rischiosi.
5. Nessun lint, formatter, TypeScript o controllo statico dei tipi.
6. Il server multiplayer non convalida semanticamente le mosse.
7. Persistenza locale/cloud e vecchi salvataggi richiedono modifiche additive
   e valori di default; evitare migrazioni distruttive.

## Stato lavori: Torneo Kaiba

Richiesta attiva del 2026-09-29: «non partire dai quarti, parti da 2
preliminari prima».

Implementazione presente:

- un nuovo torneo parte da `preliminary1`;
- dopo la vittoria passa a `preliminary2`, poi a `quarter`;
- il tabellone ha 32 partecipanti ed e' completamente ramificato: 16 incontri
  nel primo preliminare, 8 nel secondo, 4 quarti, 2 semifinali e 1 finale;
- tutti gli incontri non disputati dal giocatore vengono simulati e i relativi
  vincitori alimentano davvero il turno successivo;
- Yugi Muto e Yami Yugi sono mutuamente esclusivi nello stesso sorteggio;
- probabilita' di avanzamento: Kaiba favorito, poi Yugi/Yami, Marik, Pegasus e
  Bakura; il resto del roster e' graduato per forza narrativa in anime e gioco;
- i due avversari preliminari sono distinti tra loro e dai cinque sfidanti
  casuali del tabellone;
- Pegasus rimane nella metà del giocatore e Kaiba nella metà opposta;
- salvataggi vecchi già in `quarter`, `semi` o `final` restano validi;
- `tornei.html` mostra una progressione di cinque duelli;
- `tournament-dialogues.js` ha apertura delle qualificazioni e intermezzo di
  accesso ai quarti;
- test mirato: `tests/specs/torneo-kaiba-preliminari.spec.js`.

Verifica eseguita il 2026-09-29:

- controllo sintattico: superato;
- test `torneo-kaiba-preliminari`: superato;
- suite completa: non eseguita, secondo la regola del progetto.

## Stato lavori: effetto Spade Rivelatrici

Revamp grafico eseguito il 2026-09-29 senza modificare la logica della carta:

- `js/ui/effects.css`: la barra piatta e' diventata una spada luminosa
  composta da lama sfaccettata, costola, guardia, impugnatura e gemma;
- `js/ui/effects.js`: anche il fallback CSS costruisce la nuova spada;
- `js/ui/fx-gsap.js`: raggi dall'alto, caduta dal centro verso l'esterno,
  convergenza prospettica, rotazioni 3D, profondita', impatti e scossa finale;
- resta invariata la sincronizzazione con `.field-sword-mark`, che sostituisce
  le lame volanti dopo l'aggiornamento del campo;
- controllo sintattico e spec `swords-of-revealing-light-flip`: superati.

Secondo passaggio dello stesso giorno:

- palette definitiva verde e bianca, coerente con l'illustrazione della carta;
- anche le cinque lame persistenti usano lama, guardia, impugnatura e gemma,
  con un movimento luminoso lento per i turni in cui restano attive;
- alone della fila, carta attiva e contatore turni coordinati sulla palette oro;
- `recomputeStaticEffects()` azzera le lame persistenti appena la carta non e'
  piu' scoperta sul Terreno, sia per scadenza sia per distruzione/rimozione;
- lo spec della carta verifica ora anche presenza e rimozione anticipata dello
  stato persistente.

Rifinitura successiva:

- tutte le spade hanno manico luminoso in alto e punta rivolta verso il basso;
- il manico e' luce piena, senza fasciatura/impugnatura disegnata;
- `playMonsterSummonEffect()` risolve sempre tramite uid il vero elemento della
  carta sul Terreno: la convergenza dei mostri Livello 7+ del bot non puo' piu'
  ancorarsi al suo avatar o a un nodo DOM obsoleto;
- guardrail: `tests/specs/summon-effect-card-anchor.spec.js`.

## Effetto Raigeki

- Raigeki (id 409) usa `FX.playRaigeki(owner, onImpact)` prima di risolvere
  la distruzione: i mostri restano visibili fino al lampo finale;
- il VFX colpisce tutti e cinque gli slot Mostro avversari, anche se vuoti,
  dal centro verso l'esterno, con cielo temporalesco, fulmini ramificati,
  impatti, particelle, scossa del campo e suono sintetizzato dedicato;
- esistono sia fallback CSS sia implementazione GSAP; la facciata ha una
  rete di sicurezza idempotente per non bloccare la risoluzione della carta;
- guardrail: `tests/specs/raigeki-lightning-effect.spec.js`.

## Effetto Buco Nero

- Buco Nero (id 7) conserva la regola esistente: fotografa posizione e carta
  dei mostri, li distrugge e risucchia duplicati grafici senza ritardare la
  risoluzione del duello;
- il vortice GSAP e' una singolarita' 3D stratificata: oscuramento e lente
  gravitazionale, disco di accrescimento, orizzonte degli eventi, tre orbite,
  materia luminosa, carte in spirale inclinate e collasso con onda e scossa;
- il fallback CSS replica lente, disco, nucleo e orbite, mentre il suono ha
  risucchio piu' lungo, frequenze discendenti e impatto finale;
- guardrail: `tests/specs/dark-hole-vortex-revamp.spec.js`.

## Cinematica Evocazione Fusione

- `DuelEngine.actions.fusionSummon()` fotografa i materiali realmente scelti
  prima di mandarli al Cimitero e chiama `FX.playFusionMaterialEffect()`;
- le copie dei materiali orbitano in prospettiva 3D, stringono il raggio nel
  tunnel viola/blu e collassano nel nucleo; solo dopo i 3 secondi parte la
  normale cinematica del Mostro Fusione già presente nel motore;
- i materiali vengono consumati subito, ma lo slot resta realmente vuoto e
  il Mostro Fusione non è ancora in `gameState`; il callback finale lo
  Special Summona soltanto dopo la rimozione del vortice, facendo partire a
  quel punto anche la convergenza di Evocazione se è di Livello 7+;
- lo spazio viene validato prima di pagare i materiali: con il Terreno pieno
  la Fusione e' proponibile solo se almeno un materiale viene preso dal
  Terreno; `fusionSummon()` prenota deterministicamente la prima Zona che
  quel materiale liberera'. Materiali tutti in mano + Terreno pieno viene
  bloccato senza consumare nulla;
- `FX.isCinematicPlaying()` impedisce a fasi e bot di avanzare sotto la
  sequenza.
- all'inizio della convergenza `SFX.fusion()` riproduce
  `audio/standard/fusion.mp3` (precaricato da `audio-library.js`, con
  volume/mute SFX); vale per Fusione normale e combinazioni X/Y/Z;
- per un'Evocazione di Livello 7+ `playMonsterSummonEffect()` aspetta prima
  la ricerca del video: se esiste usa il filmato senza sovrapporre suoni;
  altrimenti la convergenza elementale usa l'audio dedicato della carta o,
  in sua assenza, `audio/standard/evocation.mp3`. I chiamanti usano ancora
  `summon` soltanto sotto il Livello 7;
- guardrail: `tests/specs/fusion-material-cinematic.spec.js` e
  `tests/specs/fusion-space-legality.spec.js`.

### Combinazioni senza Polimerizzazione

- i mostri con `banishFusionMaterials` (oggi Cannone Drago XY/XYZ) usano
  lo stesso `FX.playFusionMaterialEffect()` pur senza attivare la Magia
  Fusione: le copie X/Y/Z vengono fotografate, bandite e convergono;
- il risultato resta fuori da `gameState` per tutta la cinematica, entra
  solo nel callback finale e soltanto allora avvia la propria animazione
  di Evocazione (compresa quella dei Livelli 7+);

- a campo pieno viene prenotato deterministicamente il primo slot liberato
  dai materiali, anziche' rifiutare erroneamente la combinazione;
- guardrail: `tests/specs/contact-fusion-cinematic.spec.js`.

### Audio contestuale della campagna WW2

- `js/audio/audio-library.js` riconosce `?campaign=ww2` e, per ogni effetto
  standard, prova prima il file omonimo in `audio/standard/ww1/`;
- la cartella bellica copre attualmente `attackSwing`, `lifePointsLost` e
  `lifePointsGained`. Se un nome non e' coperto, non e' ancora caricato o
  il file manca, il resolver usa `audio/standard/` e poi il normale suono
  sintetizzato: nessun effetto resta muto;
- guardrail: `tests/specs/ww2-priorita-audio-ww1.spec.js`.

### Cinematiche acquisti del Negozio

- `js/economy/pack-opening.js` + `.css` riusano l'identita' del prodotto:
  l'apertura riproduce colore, fascia, emblema e conteggio della busta
  metallizzata dello scaffale, con linguetta dentellata che si strappa;
- l'acquisto di uno Starter/Structure Deck usa la vera `DeckBox`, compresa
  la carta di copertina, apre coperchio e faccia superiore e fa emergere
  un ventaglio di carte sopra un'aura prospettica;
- entrambe le sequenze rispettano `prefers-reduced-motion` e restano entro
  il viewport mobile; guardrail: `tests/specs/negozio-animazioni-prodotti.spec.js`.
- al riepilogo della busta le carte arrivano a 108px su desktop e restano
  separate; su mobile mantengono almeno 82px e diventano un carosello
  orizzontale con scroll-snap, senza ridursi o sovrapporsi. La carta scelta
  sale in primo piano. Il messaggio
  finale vive sotto il contatore e sparisce mentre `CardDetail` e' aperto,
  che viene portato sopra la cinematica. Guardrail:
  `tests/specs/sbustamento-striscia-come-mano.spec.js`.

## Stepper delle fasi

- `#phaseStepper` resta tra i due Terreni dentro `.battlefield-main`, con una
  barra a riga singola che riprende la UI dei menu: fondo quasi nero con
  sfumatura bruna, bordi oro sottili, angoli moderati e ombre corte. Le sei
  celle flessibili mantengono le icone SVG; la fase attiva usa ambra calda,
  mentre quelle concluse restano neutre e poco sature. Eliminati scansioni,
  bagliori azzurri e resa da HUD moderno;
- desktop conserva le etichette; sotto `900px` mostra solo badge e numero.
  Un container query sul rail usa etichette compatte complete sotto 860px
  (`Attesa`, `Lotta`) e le nasconde sotto 570px: mai testo con ellissi.
  In ogni breakpoint la larghezza usa la stessa formula di `.field-row`
  (`7 * --field-slot-w + 6 * --field-gap`), quindi i bordi del rail seguono
  gli slot esterni senza superarli; dopo ogni render/resize
  `syncPhaseStepperToFieldWidth()` rifinisce la misura sul rettangolo reale
  della riga (necessario per padding/bordi minimi delle zone speciali su
  mobile) e corregge anche l'offset orizzontale quando campo e colonna
  centrale hanno centri diversi. Sotto `420px` non usa gap fissi capaci di
  produrre overflow;
- `min-width:0`, `flex: 1 1 0`, larghezze massime e `nowrap` tengono stabile
  la geometria durante i resize. `updatePhaseIndicator()` aggiorna anche
  attributi ARIA/tabindex e lo step cliccabile risponde a Invio/Spazio;
- guardrail: `tests/specs/phase-stepper-responsive.spec.js`.

## Waboku: barriera persistente

- Waboku (`id 503`) continua a usare `noBattleDamageFor` e
  `noBattleDestructionFor` per la regola di gioco, ma memorizza anche l'UID
  della copia attiva in `wabokuProtectionUidFor`;
- `renderFields()` aggiunge una sola barriera olografica 3D dietro l'intera
  fila Mostri del proprietario protetto: scudo stratificato, sigillo,
  anelli e scintille, senza coprire o intercettare le carte;
- entrando in End Phase i flag e il visuale vengono rimossi subito; una
  vera distruzione della copia sorgente passa da `onSTDestroyed` e spegne
  allo stesso modo protezione e barriera. Il normale invio al Cimitero di
  una Trappola Normale dopo la risoluzione non e' considerato distruzione;
- guardrail: `tests/specs/waboku-persistent-shield.spec.js`.

## Distruzione Magie/Trappole

- `DuelEngine.actions.destroySpellTrap()` usa
  `FX.playSpellTrapDestroyEffect()` prima di svuotare la zona;
- Magie e Trappole hanno palette verde/rosa distinta, scansione luminosa,
  collasso olografico e frammenti energetici ascendenti: nessuna esplosione
  da mostro e nessun semplice volo della carta al Cimitero;
- coperti anche i redirect di Trappola Fasulla e dei Mostri Union.
- guardrail: `tests/specs/spell-trap-destruction-effect.spec.js`.

## Pescata causata da effetti

- `drawCardsToHand(..., true)` registra gli uid pescati prima di eseguire
  `ON_DRAW_CARDS`; `renderPlayerHand()` assegna quindi `pending-deal` già
  alla creazione del nodo, anche durante render intermedi o trigger annidati;
- un solo job a stack concluso esegue il render definitivo e la distribuzione
  sfalsata: le carte non possono più apparire, sparire e riapparire;
- il filtro per uid evita di animare vecchie carte quando l'effetto scarta o
  sposta subito alcune delle carte appena pescate.
- guardrail: `tests/specs/pescata-effetto-nessun-flash-preanimazione.spec.js`.

## Ambienti dei field

- tutti i 36 field di `ArenaOptions.FIELDS` hanno una configurazione
  ambientale individuale in `js/ui/field-ambience.js`; le immagini mobile
  condividono il nome file e quindi la stessa configurazione coerente;
- le configurazioni riusano profili modulari (sabbia, vento, tech, natura,
  acqua, ghiaccio, fuoco, ombra, fumo, energia e citta') e tre coreografie
  (`attraversa`, `scansione`, `atmosfera`), mantenendo nome e variante
  specifici per ogni immagine;
- `VideoQuality.set()` emette `ygo:video-quality-change`: su `normali` il
  modulo elimina immediatamente timeline, timer e strati DOM; su `alti` lo
  riavvia. Resta disabilitato anche con `prefers-reduced-motion`;
- guardrail: `tests/specs/field-ambience-all-fields.spec.js`.
- il vento del Dirigibile non usa pattern lineari ripetuti: genera su canvas
  folate curve e sbuffi irregolari, diversi a ogni ingresso nel field.
- i due field Grande Guerra usano la coreografia dedicata `guerra`: impatti
  casuali nella fascia centrale, fumogeni e raffiche di traccianti, con
  variante giorno/notte e pulizia completa dopo ogni sequenza.
- nei field Grande Guerra l'asse di battaglia è verticale: impatti e
  traccianti garantiscono in ogni sequenza colpi basso→alto e alto→basso;
  anche il fumogeno nasce da uno dei due fronti e deriva verso l'altro.
- densità e frequenza WW1 non sono fisse: ogni evento genera 1–5 impatti,
  1–4 nubi di gas indipendenti, 4–12 traccianti a grappoli irregolari e
  1–5 flash d'artiglieria; il timer alterna contrattacchi rapidi,
  pause ordinarie e rari silenzi lunghi (circa 1,4–17 secondi).
- i traccianti WW1 hanno asse verticale rigoroso: posizione, velocità e
  luminosità restano casuali, ma rotazione e coordinata X non cambiano mai.
- guardrail: `tests/specs/ww1-battlefield-effects.spec.js`.
- le coreografie organiche non percorrono più una sola retta: vento/sabbia
  e profili atmosferici usano più segmenti con deviazioni casuali, cambi di
  scala e rotazione; le scansioni lineari restano solo nei field tecnologici;
- `stadioKaiba.jpg` usa il profilo dedicato `spalti`: gruppi irregolari di
  flash fotografici nascono dalla gradinata alta e lungo entrambi i lati del
  field, a quote diverse, con riflessi brevi
  verso il campo al posto della vecchia griglia di scansione.
- guardrail: `tests/specs/kaiba-stadium-crowd-flashes.spec.js`.
- seconda passata ambientale: i profili condivisi possono aggiungere una
  `firma` per variante (raggi, foglie, petali, spiriti, luna, vortice,
  scariche, lucciole, cristalli, braci, onde o fiamme), così luoghi della
  stessa famiglia non differiscono più soltanto per tinta e velocità.
- guardrail: `tests/specs/field-ambience-distinct-signatures.spec.js`.
- `anticoEgittoTempioOscuro.jpg` non usa più il generico profilo ombra:
  `tempioOscuro` sincronizza bagliori irregolari sui bracieri perimetrali,
  un respiro caldo/freddo sull'Occhio di Horus e scintille laterali, senza
  viola, spiriti o velature astratte.
- guardrail: `tests/specs/dark-egyptian-temple-ambience.spec.js`.
- `industriaKaibaCorp.jpg` estende la scansione tech con la coreografia
  `industria`: 2–5 grappoli di archi elettrici localizzati, ciascuno con
  quantità, posizione, inclinazione, intensità e cadenza casuali.
- guardrail: `tests/specs/kaibacorp-industry-sparks.spec.js`.

## Sandbox: cambio field e uscita

- `duello-sandbox.html` seleziona il field iniziale dal catalogo unico
  `ArenaOptions.FIELDS` e lo salva dentro `ygoSandboxConfig`;
- durante il duello `js/engine/duel-sandbox.js` monta `#sandboxFieldSelect`:
  il cambio è immediato, aggiorna sia lo sfondo desktop/mobile sia
  `FieldAmbience`, e persiste la scelta per la prova successiva;
- “Esci Sandbox” torna direttamente alla configurazione con conferma, senza
  chiamare `endDuel()`, registrare sconfitte o attraversare la schermata finale;
  anche il tasto Indietro hardware usa la stessa conferma.
- guardrail: `tests/specs/sandbox-field-switch-exit.spec.js`.

## Regole operative importanti ereditate da CLAUDE.md

- Conversazione e documentazione operative in italiano.
- Per le regole reali delle carte usare YGOPRODeck come riferimento primario.
- Le Trappole devono essere prima posizionate coperte.
- Eliminare dati carta duplicati/imprecisi invece di mascherarli.
- Le immagini carta devono contenere la sola illustrazione nella cornice CSS.
- Commentare soprattutto invarianti, motivazioni e bug non ovvi.
- Prima di un refactor ampio leggere `GUIDA_RIUTILIZZO.md`.
- Per modifiche al duello, oltre agli spec mirati, la pagina standard di prova
  manuale è `duelMonstersCore.html`.

## UX della mano nel duello

- `renderPlayerHand()` instrada mouse e touch nello stesso ciclo Pointer Event
  (`startHandCardDrag` -> `handleDragEnd`), senza aggiungere un secondo `click`;
- un tap mostra sempre il pannello carta; durante le fasi non compatibili il
  gesto diventa sola ispezione e non può iniziare un drag/drop illegale;
- `selectHandCardForInspection()` mantiene alzata la carta toccata anche quando
  l'azione disponibile apre subito pulsanti flottanti;
- il click/tap esterno passa da `clearHandCardSelection()` e rimette la carta
  in linea senza azzerare scarti, Tributi o altre selezioni bloccanti.
- alcune WebView Android generano un ulteriore `click` dopo il `pointerup`
  touch: `armHandCompatibilityClick()`/`consumeHandCompatibilityClick()`
  consumano esclusivamente quel click alle stesse coordinate, impedendo che
  body o click-catcher richiudano immediatamente carta e pulsanti flottanti.

## Cinematica Evocazione Rituale

- `performRitualTribute()` è il punto condiviso di tutte le Magie Rituale:
  conserva i materiali scelti nel contesto prima di mandarli al Cimitero;
- `ACTIONS.specialSummon()` intercetta quel payload solo per un mostro con
  `category === 'ritual'`, avvia `FX.playRitualSummon()` e rimanda la vera
  comparsa sul Terreno alla callback finale;
- sequenza garantita: materiali/sigillo 3D -> chiusura del rito -> Special
  Summon normale -> eventuale cinematica dedicata o Lv.7+;
- il rito conta come cinematica bloccante (`FX.isCinematicPlaying()`), quindi
  Chain, bot e cambi fase attendono; la successiva Summon non viene confusa
  con una rianimazione dal Cimitero;
- le vecchie Magie Rituale 116, 187, 506 e 517 sono state ricondotte allo
  stesso helper, insieme a tutte quelle che già lo usavano.

## Effetti vento di Magie/Trappole

- Tornado di Polvere (219) usa `FX.playDustTornado()`: vortice prospettico
  localizzato sullo slot scelto; la carta viene distrutta all'impatto, non
  prima, passando comunque da `destroySpellTrap()` per trigger e protezioni;
- Piumino delle Arpie (291) usa `FX.playHarpiesFeatherDuster()`: fronte di
  vento irregolare e piume attraverso tutta la fila Magie/Trappole nemica;
  l'intero lotto viene risolto dopo il passaggio della folata;
- entrambe saltano soltanto la frattura ST generica tramite l'opzione
  `destroySpellTrap(..., { skipVisual: true })`, evitando due animazioni
  sovrapposte senza aggirare la logica di distruzione;
- le due sequenze sono cinematiche bloccanti e mantengono compatibilità con
  scelta bersaglio e Trappola Fasulla/batch di protezione.

## Fedeltà narrativa — Il Regno delle Ombre

- `js/data/story-campaigns.js` segue ora la cronologia della serie anche nei
  cambi di protagonista: Joey affronta Mai, Rex, Keith e Marik; Kaiba affronta
  Ishizu/Lector; Téa, Tristan e Joey coprono le rispettive sfide virtuali;
- il Regno dei Duellanti include viaggio in nave, perdita di Exodia, Fratelli
  Paradosso e le finali complete Mai/Keith/Joey prima di Pegasus;
- Battle City colloca il duello controllato al molo prima dei quarti e il
  dirottamento di Noah dopo i quarti, durante il viaggio verso la Torre;
- nel Mondo dei Ricordi è Yugi a duellare contro Bakura per consegnare il nome
  ad Atem; le scene non anticipano più la scoperta;
- tutti i 53 nodi `duel` hanno un `dialogo` introduttivo; 26 appartengono
  alla linea di Yugi/Atem e 27 sono diramazioni parallele (incluse le quattro
  amichevoli facoltative del prologo richieste come allenamento);
  diramazioni parallele dedicate agli altri personaggi;
- i nodi con `parallelo: true` e `sbloccaDopo` usano il registro persistente
  `progress.laterali`: vincerli non modifica mai `progress.sotto`, quindi il
  sentiero principale può continuare indipendentemente; la mappa li mostra
  in azzurro e collega il ramo alla sua ancora;
- gli allenamenti inventati del prologo e Gozaburo sono scene, non
  combattimenti;
- ogni nuova tappa annidata richiede una voce `dalla: 'inserite'` in
  `separazioni`, perché il progresso interno alle aree è salvato per indice.

## Ritorno da fine duello

- `DuelSession.finish()` usa direttamente `location.replace(returnUrl)`:
  `history.back()` nell'APK poteva riportare alla mappa generale anziché
  all'area; vittoria e sconfitta sono coperte dal test
  `storia-continua-fine-duello.spec.js`, che verifica anche `torneo=<area>`.

## Come mantenere questa memoria

Aggiornare questo file quando cambia uno dei seguenti elementi:

- architettura o responsabilità di una cartella;
- fonte di verità dei dati;
- comandi di sviluppo/test;
- schema persistito o protocollo multiplayer;
- lavoro incompleto che una sessione successiva deve riprendere;
- rischio importante chiuso o appena scoperto.

Non trasformarlo in un diario dettagliato: la cronologia lunga resta in
`CLAUDE.md`. Qui devono rimanere la mappa corrente, le decisioni operative e lo
stato dei lavori ancora rilevante.
