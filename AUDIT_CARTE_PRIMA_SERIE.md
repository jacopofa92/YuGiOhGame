# Audit: carte "prima serie" TCG mancanti dal dataset

Tracciamento di sessione per l'aggiunta di carte reali del TCG (i primi
sette set inglesi, 2002-2003: Legend of Blue-Eyes White Dragon, Metal
Raiders, Spell Ruler, Pharaoh's Servant, Labyrinth of Nightmare, Legacy
of Darkness, Pharaonic Guardian) individuate come assenti da
`data/cards.json` durante un confronto con le liste ufficiali (fonte:
API YGOPRODeck, `cardinfo.php?cardset=...`). Elenco filtrato alle carte
più note/rilevanti (staple storici, carte usate nell'anime, o a tema
con contenuti già presenti nel gioco) — non include le decine di mostri
"vanilla" minori di riempimento di LOB/MRD/SRL, meno interessanti da
aggiungere.

Richiesta esplicita dell'utente: aggiungerle **tutte**, cominciando
dalle più facili. Questo file va aggiornato ad ogni carta chiusa (o
scoperta nuova), per riprendere il lavoro anche in una sessione futura
senza dover rifare la ricognizione. Prossimo ID libero in
`data/cards.json`: **871** (l'ultimo esistente è 870).

Colonne: **Nome** (italiano, la forma che avrà nel dataset — verificata
o proposta), **Origine** (set TCG), **Tipo**, **Difficoltà** stimata
(1=banale, 5=complessa), **Stato**, **id** (assegnato quando aggiunta),
**Note**.

## Livello 1 — banali (dati puri o riuso diretto di un pattern esistente)

| Nome (IT) | Nome (EN) | Origine | Tipo | Stato | id | Note |
|---|---|---|---|---|---|---|
| Terraformazione | Terraforming | LOD | Magia Normale | ✅ fatta | 871 | Cerca 1 Magia Campo dal Deck e mettila in mano — `ctx.searchDeckToHand`. Verificato: sposta davvero la carta trovata in mano. |
| Wingweaver | Wingweaver | PSV | Mostro Normale | ✅ fatta | 872 | LUCE/Lv7/Fata/2750/2400, vanilla — nessun effetto da programmare. Nome tenuto invariato (non tradotto): nessuna conferma affidabile trovata di un nome italiano ufficiale diverso, stesso trattamento già riservato ad altri nomi propri di questo dataset (Skull Servant, Thunder Dragon, ecc.). |
| Santa Giovanna | St. Joan | LON | Mostro Fusione | ⏳ rimandata | — | Fusione di "The Forgiving Maiden" + "Darklord Marie" — **nessuna delle due esiste ancora nel dataset**, e "Darklord Marie" è quasi certamente il nome ATTUALE (errata) di una carta ridenominata nel tempo, non il nome originale 2003 — da chiarire prima di aggiungerla, altrimenti la Fusione non avrebbe materiali reali in nessun Deck. Rimandata dopo il Livello 2 per questo motivo. |
| Duo Delinquente | Delinquent Duo | SRL | Magia Normale | ✅ fatta | 873 | Paga 1000 LP; l'avversario scarta 1 carta a caso, poi (se ne ha ancora) 1 a sua scelta. SEMPLIFICAZIONE (vedi missingEffectNote in cards.json): anche la seconda è a caso. Verificato: LP -1000, mano avversaria svuotata. |
| Libro della Luna | Book of Moon | PSV | Magia Rapida | ✅ fatta | 875 | Bersaglia 1 mostro scoperto sul Terreno, lo gira in Difesa coperta — bersaglio auto-selezionato (il più forte in Attacco), stesso stile di Cambio di Cuore (id 147). Verificato: mostro bersaglio girato in Difesa coperta. |
| Desideri Solenni | Solemn Wishes | LON | Trappola Continua | ✅ fatta | 876 | +500 LP ogni volta che il controllore pesca — nuovo trigger condiviso `DuelEngine.TRIGGER.ON_DRAW_CARDS`, agganciato in `drawCardsToHand` (game-flow.js), riusabile da qualunque futura carta reattiva alla pesca. Verificato con test mirato: attivazione diretta da mano correttamente rifiutata (è una Trappola), attivazione da Set riuscita, +500 LP confermati dopo una pescata reale. |

## Livello 2 — facili (nuovo hook semplice, stesso spirito di un pattern già esistente)

| Nome (IT) | Nome (EN) | Origine | Tipo | Stato | id | Note |
|---|---|---|---|---|---|---|
| Uniti Vinceremo | United We Stand | LON | Magia Equipaggiamento | ✅ fatta | 877 | +800 ATK/DEF per ogni mostro scoperto controllato dal controllore — stesso schema di Ciondolo Nero (id 117)/Falce del Mietitore (id 411, per il bonus scalabile). Verificato: +1600 ATK/DEF con 2 mostri scoperti propri. |
| Messaggero della Pace | Messenger of Peace | SRL | Magia Continua | ✅ fatta | 880 | I mostri con 1500+ ATK non possono attaccare; paga 100 LP in Standby o la carta si distrugge. SEMPLIFICAZIONE (vedi missingEffectNote): paga sempre automaticamente. Verificato: soglia ATK rispettata, pagamento LP confermato in Standby. |
| Confisca | Confiscation | SRL | Magia Normale | ✅ fatta | 874 | Paga 1000 LP, guarda la mano avversaria, scegli 1 carta e falla scartare. SEMPLIFICAZIONE (vedi missingEffectNote): bersaglio auto-selezionato con `AI_SHARED.scoreCardImpact` invece di una scelta libera dopo aver visto la mano davvero. Verificato: LP -1000, la carta di maggior punteggio stimato scartata correttamente. |
| Nobile dello Sterminio | Nobleman of Extermination | PGD | Magia Normale | ✅ fatta | 881 | Distruggi+bandisci 1 Magia/Trappola coperta; se era una Trappola, bandisci anche tutte le copie dal Deck. Esteso `ACTIONS.destroySpellTrap` (duel-engine.js) con lo stesso redirect-al-bando già usato per i mostri (`card.mustBanishOnLeavingField`) — prima valeva solo per le distruzioni di mostri. Verificato: carta Set bandita, copia nel Deck bandita anch'essa. |
| Oppressione Reale | Royal Oppression | LOD | Trappola Normale | ✅ fatta | 882 | Paga 800 LP per negare un'Evocazione Speciale (e distruggere il mostro) — stesso impianto reattivo di Giudizio Solenne (id 448), filtrato a `ctx.summonedVia === 'special'`. SEMPLIFICAZIONE (vedi missingEffectNote): a singolo utilizzo come una Trappola Normale invece che la vera Continua riutilizzabile. Verificato: `canActivate` corretto in risposta a una Special Summon avversaria. |
| Angelo Splendente | Shining Angel | SRL | Mostro Effetto | ✅ fatta | 878 | LUCE/Lv4/Fata/1400/800 — se distrutto (onDestroy, nessuna distinzione "in battaglia" vs "da effetto Carta", stesso schema di Ratto Gigante id 614), Evoca Specialmente 1 mostro LUCE con 1500 ATK o meno dal Deck. Verificato: carta corretta trovata/rimossa dal Deck e Special Summonata. |
| Il Pescatore Leggendario | The Legendary Fisherman | PSV | Mostro Effetto | ✅ fatta | 879 | ACQUA/Lv5/Guerriero/1850/1600 — immune a Magie e non bersagliabile in attacco finché "Umi" è in campo (attacco diretto resta possibile). Nuovo `gameState.cannotBeTargetedBySpellsUids` (duel-engine.js, gemello per-istanza di `def.cannotBeTargetedBySpells`), consultato dallo stesso checkpoint condiviso di targeting. Tematico: Mako Tsunami è già nel roster del torneo. Verificato: immunità assente senza Umi, presente con Umi in campo. |
| Don Zaloog | Don Zaloog | PGD | Mostro Effetto | ✅ fatta | 883 | OSCURITÀ/Lv4/Guerriero/1400/1500 — su danno da battaglia, scegli: scarta 1 carta a caso dalla mano avversaria, oppure manda le prime 2 carte del suo Deck al Cimitero. SEMPLIFICAZIONE (vedi missingEffectNote): scelta automatica. Verificato: scarto casuale confermato. |

**Livello 2 completo** (Freed il Generale Senza Rivali escluso: riclassificato e completato più avanti, vedi Livello 4).

## Livello 3 — medie (nuovo meccanismo non banale, ma contenuto)

| Nome (IT) | Nome (EN) | Origine | Tipo | Stato | id | Note |
|---|---|---|---|---|---|---|
| Yata-Garasu | Yata-Garasu | LOD | Mostro Spirito | ✅ fatta | 884 | VENTO/Lv2/Demone/200/100 — torna in mano a fine turno (Spirito, stesso schema di Maharaghi id 755), se infligge danno da battaglia l'avversario salta la prossima Draw Phase (riusa `gameState.skipDrawFor[owner]`, nato per Avidità Sconsiderata id 653). Nuovo `def.cannotSpecialSummon` in `ACTIONS.specialSummon` (duel-engine.js) — simmetrico a `def.cannotNormalSummon` già esistente, riusabile da qualunque futura carta con lo stesso vincolo. Verificato: skip pesca, ritorno in mano, Special Summon correttamente rifiutata. |
| Necrovalle | Necrovalley | PGD | Magia Campo | ⏳ da fare (difficoltà rivista: 3→4) | — | +500 ATK/DEF ai Gravekeeper's (propedeutica all'archetipo, Livello 5 — innocuo implementarlo già ora, semplicemente non farà nulla finché quei mostri non esistono); le carte nel Cimitero non possono essere bandite né spostate/alterate da effetti. Il vero costo è quest'ultima parte: "il Cimitero è protetto dal bando" richiede di intercettare OGNI punto del motore che banisce da quella zona specifica (stesso ordine di grandezza dell'audit già fatto per Uovo Giurassico Miracoloso id 808, ~11 punti dopo aver ristretto lo scope) — non un lavoro banale da fare di corsa insieme alle altre carte di questo livello. Rivalutata da "media" a "medio-alta" durante la ricognizione dettagliata. |
| Iniezione della Fata Giglio | Injection Fairy Lily | LOD | Mostro Effetto | ⏳ da fare (richiede un nuovo hook "durante il calcolo del danno") | — | TERRA/Lv3/Stregone/400/1500 — durante il calcolo del danno (in attacco o difesa), può pagare 2000 LP per +3000 ATK solo per quel calcolo, una volta a battaglia. Nessun hook esistente per "modifica l'ATK usato SOLO per il calcolo del danno" (esiste solo `zeroAttackerAtk()` in `declareCtx`, actions.js — un caso simile ma per azzerare, non per un bonus scelto dal giocatore) — richiede un nuovo setter simmetrico + una vera decisione (paga o no) durante la finestra `ON_ATTACK_DECLARE`. |
| Cancello di Fusione | Fusion Gate | LON | Magia Campo | ✅ fatta | 887 | Finché in campo, il giocatore di turno può Evocare per Fusione dall'Extra Deck bandendo i materiali da mano/campo, ignorando le normali condizioni. SEMPLIFICAZIONE (vedi missingEffectNote): materiali al Cimitero invece che banditi, solo dal proprio turno. Riusa interamente `DuelEngine.getFusableExtraDeckMonsters`/`ctx.fusionSummon` (già esistenti per "Fusione" id 38) come Ignition ripetibile (`repeatableWhileContinuous`, schema di Offerta Suprema id 559). **Bug trovato e corretto durante l'implementazione**: il primo `canActivate` gate su "materiali disponibili ORA" bloccava anche il PRIMO piazzamento della Magia Campo (che non dovrebbe mai dipendere dai materiali, solo la riattivazione ripetuta lo fa) — corretto distinguendo `ctx.zone !== 'fieldSpell'` (primo piazzamento, sempre legale) da `ctx.zone === 'fieldSpell'` (riattivazione, lì sì il controllo sui materiali). Verificato: piazzamento sempre legale, riattivazione correttamente bloccata senza materiali e sbloccata con un vero Mostro Fusione (id 254) e i suoi materiali reali in mano. |
| Metamorfosi | Metamorphosis | PGD | Magia Normale | ✅ fatta | 886 | Tributa 1 mostro, Evoca Specialmente dall'Extra Deck 1 Mostro Fusione dello stesso Livello. SEMPLIFICAZIONE (vedi missingEffectNote): tributo auto-selezionato (il più debole con un corrispondente nell'Extra Deck). Usa lo slot appena liberato dal tributo, nessuna ricerca di slot vuoto separata. Verificato: tributo al Cimitero, Mostro Fusione corretto Special Summonato nello stesso slot. |
| Quiz Inverso | Reversal Quiz | PGD | Magia Normale | ✅ fatta | 885 | Manda mano e campo al Cimitero, dichiara il tipo di carta (Magia/Trappola/Mostro) in cima al proprio Deck: se indovina, scambia i propri LP con quelli dell'avversario. SEMPLIFICAZIONE (vedi missingEffectNote): dichiarazione automatica (il tipo più frequente nel proprio Deck rimasto). Verificato: mano/campo/Magie-Trappole/Magia Campo tutte mandate al Cimitero, LP scambiati correttamente quando la dichiarazione automatica indovina. |

## Livello 4 — complesse

| Nome (IT) | Nome (EN) | Origine | Tipo | Stato | id | Note |
|---|---|---|---|---|---|---|
| Freed il Generale Senza Rivali | Freed the Matchless General | LOD | Mostro Effetto | ✅ fatta | 888 | TERRA/Lv5/Guerriero/2300/1700 — nega gli effetti Magia che la bersagliano (`onCardEffectTargetDeclare`+`ctx.cancel()`, stesso schema di Gran Scudo Gardna id 115); in Draw Phase può cercare 1 Guerriero Lv4- dal Deck invece di pescare (hardcoded in `enterDrawPhaseInner`, game-flow.js — una sostituzione della pescata vive per forza lì, stesso schema di `skipDrawFor`/`pendingMaharaghiPeekFor`). SEMPLIFICAZIONI documentate: non distrugge sempre esplicitamente la Magia negata se Continua/Equip; la ricerca in Draw Phase è automatica. Verificato: negazione confermata contro Cambio di Cuore (id 147) del bot, sostituzione della pescata confermata con un vero Guerriero cercato dal Deck. |
| Necropaura Oscura | Dark Necrofear | LON | Mostro Fusione Effetto | ⏳ da fare | — | OSCURITÀ/Lv8/Demone/2200/2800 — non Evocabile Normalmente; Evocazione Speciale bandendo 3 mostri Demone dal proprio Cimitero; se distrutta in campo avversario e finisce nel Cimitero questo turno, in End Phase si equipaggia a 1 mostro scoperto avversario e ne prende il controllo finché resta equipaggiata. |

## Livello 5 — archetipo Gravekeeper's (propedeutico: Necrovalley sopra)

A tema egizio, coerente con Marik/Ishizu già presenti nel gioco. Da
trattare come blocco unico dopo Necrovalley, non prima.

| Nome (IT) | Nome (EN) | Origine | Tipo | Stato | id | Note |
|---|---|---|---|---|---|---|
| Spia dei Guardiani della Tomba | Gravekeeper's Spy | PGD | Mostro Effetto | ⏳ da fare | — | |
| Guardia dei Guardiani della Tomba | Gravekeeper's Guard | PGD | Mostro Effetto | ⏳ da fare | — | |
| Capo dei Guardiani della Tomba | Gravekeeper's Chief | PGD | Mostro Effetto | ⏳ da fare | — | |
| Maledizione dei Guardiani della Tomba | Gravekeeper's Curse | PGD | Mostro Effetto | ⏳ da fare | — | |
| Assalitore dei Guardiani della Tomba | Gravekeeper's Assailant | PGD | Mostro Effetto | ⏳ da fare | — | |
| Artigliere dei Guardiani della Tomba | Gravekeeper's Cannonholder | PGD | Mostro Effetto | ⏳ da fare | — | |
| Lanciere dei Guardiani della Tomba | Gravekeeper's Spear Soldier | PGD | Mostro Effetto | ⏳ da fare | — | |
| Vassallo dei Guardiani della Tomba | Gravekeeper's Vassal | PGD | Mostro Effetto | ⏳ da fare | — | |
| Sentinella dei Guardiani della Tomba | Gravekeeper's Watcher | PGD | Mostro Effetto | ⏳ da fare | — | |

## Legenda stato
- ⏳ da fare
- 🔧 in corso
- ✅ fatta (dati + effetto implementato + verificata) — include quelle con una SEMPLIFICAZIONE onestamente documentata via missingEffectNote in cards.json, segnalata nella colonna Note
- ⏳ rimandata (bloccata da una dipendenza non ancora chiarita, vedi Note)

## Bug scoperti mentre si lavorava a questo backlog (fuori scope, da riprendere a parte)
- **Decreto Reale (id 426, Royal Decree)**: manca un vero `activate()` nella propria registrazione in `card-effects.js` — ha solo `static()`. Per come è scritto `DuelEngine.canActivate` (duel-engine.js, riga ~3714: `if (!def || typeof def.activate !== 'function') return false;`), QUALUNQUE carta senza un proprio `activate()` non risulta MAI legalmente attivabile, Trappola Continua o no. Risultato pratico: Decreto Reale, una volta Settato, non può mai essere girato scoperto per davvero tramite il normale flusso di gioco — resta bloccato coperto per sempre. Fix banale (aggiungere un `activate(ctx) { ctx.log(...); }` minimo, stesso pattern REALMENTE funzionante di Legame di Gravità id 707), ma volutamente non toccato in questa sessione per restare a fuoco sul backlog di carte nuove. Scoperto verificando Desideri Solenni (id 876, Livello 1), che inizialmente avevo registrato copiando lo stesso pattern incompleto di id 426.

## Log di sessione
- Sessione 1: creato questo file, ricognizione completa (823 carte
  esistenti confrontate con LOB/MRD/SRL/PSV/LON/LOD/PGD), testo/stat
  esatti di ogni carta verificati via API YGOPRODeck. Chiuso l'intero
  Livello 1 (Terraformazione id 871, Wingweaver id 872, Duo Delinquente
  id 873, Libro della Luna id 875, Desideri Solenni id 876) più Confisca
  id 874 dal Livello 2 — 6 carte, dati + effetto + verifica tramite il
  motore reale (DuelEngine.activateCard, non solo gli handler isolati),
  suite 36/36 verde dopo ogni passo. St. Joan rimandata (materiali di
  Fusione non ancora presenti/da chiarire). Nuovo trigger condiviso
  DuelEngine.TRIGGER.ON_DRAW_CARDS (duel-engine.js + game-flow.js),
  riusabile da qualunque futura carta reattiva alla propria pesca — non
  esisteva nulla di simile prima. Scoperto (ma non corretto, fuori
  scope) un bug preesistente su Decreto Reale (id 426), vedi sopra.
  Prossimo passo: Livello 2 rimanente (Uniti Vinceremo, Messaggero della
  Pace, Freed il Generale Senza Rivali, Nobile dello Sterminio,
  Oppressione Reale, Angelo Splendente, Il Pescatore Leggendario, Don
  Zaloog).
- Sessione 1 (continua): chiuse altre 3 carte del Livello 2 — Uniti
  Vinceremo (877), Angelo Splendente (878), Il Pescatore Leggendario
  (879) — stesso standard delle prime 6 (dati + effetto + verifica
  tramite il motore reale). Nuovo `gameState.cannotBeTargetedBySpellsUids`
  (duel-engine.js), gemello per-istanza di `def.cannotBeTargetedBySpells`
  già esistente, aggiunto allo stesso checkpoint condiviso di targeting
  (declareCardEffectTarget) — riusabile da qualunque futura carta con
  un'immunità alle Magie CONDIZIONATA (non fissa per definizione).
  Rivalutata la difficoltà di Freed il Generale Senza Rivali (2→3):
  "nega e distrugge" una Magia che la bersaglia è un vero meccanismo
  reattivo, non una semplice immunità silenziosa come i flag esistenti.
  Suite 36/36 verde. Restano da fare nel Livello 2: Messaggero della
  Pace, Nobile dello Sterminio, Oppressione Reale, Don Zaloog (più Freed,
  ora Livello 3).
- Sessione 1 (continua): **Livello 2 completo** — chiuse le ultime 4
  carte: Messaggero della Pace (880), Nobile dello Sterminio (881),
  Oppressione Reale (882), Don Zaloog (883). Esteso `ACTIONS.destroySpellTrap`
  (duel-engine.js) con lo stesso redirect-al-bando (`card.mustBanishOnLeavingField`
  + `redirectToBanishIfFlagged`) già usato per i mostri, prima mai
  applicato a una Magia/Trappola — messaggio di log del redirect reso
  generico (non più legato solo a Cerchio degli Inferi, il primo caso
  d'uso) proprio per questo secondo utilizzo. Oppressione Reale
  implementata come Trappola Normale a singolo uso (semplificazione
  documentata) riusando lo stesso schema reattivo di Giudizio Solenne
  (id 448), filtrato con `ctx.summonedVia === 'special'` (lo stesso
  discriminatore normale/speciale già usato da Buco Trappola id 40).
  Suite 36/36 verde, verificato ogni effetto tramite il motore reale.
  **13 carte totali completate finora in questa sessione** (id 871-883,
  Livello 1 e Livello 2 entrambi interamente chiusi). Prossimo passo:
  Livello 3 (Yata-Garasu, Necrovalle, Iniezione della Fata Giglio,
  Cancello di Fusione, Metamorfosi, Quiz Inverso, Freed il Generale
  Senza Rivali).
- Sessione 1 (continua): chiusa Yata-Garasu (884), la prima carta del
  Livello 3 — 14 carte totali. Nuovo `def.cannotSpecialSummon` in
  `ACTIONS.specialSummon` (duel-engine.js), simmetrico a
  `def.cannotNormalSummon` già esistente per il caso opposto. Riusati
  due meccanismi già pronti invece di inventarne di nuovi: lo schema
  "Mostro Spirito" (torna in mano a fine turno) già rodato da Maharaghi
  (id 755), e `gameState.skipDrawFor[owner]` (un CONTATORE, non un
  booleano — nato per Avidità Sconsiderata id 653) per il "salta la
  prossima Draw Phase". Verificato con test mirato: skip pesca
  confermato, ritorno in mano confermato, Special Summon correttamente
  rifiutata (torna false, carta al Cimitero). Suite 36/36 verde.
  Rivalutata Necrovalle da "media" a "medio-alta" durante la
  ricognizione: la protezione del Cimitero dal bando richiederebbe un
  audit dei punti del motore paragonabile a quello già fatto per Uovo
  Giurassico Miracoloso (id 808) — non un lavoro da fare di corsa,
  rimandata a una battuta dedicata. Prossimo passo: valutare Iniezione
  della Fata Giglio (finestra di battaglia) o Freed il Generale Senza
  Rivali (negazione reattiva) come prossime carte del Livello 3, oppure
  affrontare Necrovalle per bene con lo stesso rigore di id 808.
- Sessione 1 (continua): chiuse altre 3 carte del Livello 3 — Quiz
  Inverso (885), Metamorfosi (886), Cancello di Fusione (887) — **17
  carte totali completate finora**. Scoperto e corretto un bug REALE
  durante l'implementazione di Cancello di Fusione: il `canActivate`
  iniziale bloccava anche il primo piazzamento della Magia Campo se non
  c'erano già materiali di Fusione disponibili in quel momento — un
  campo/Magia Campo deve invece potersi sempre piazzare, il controllo
  sui materiali vale solo per la riattivazione ripetuta successiva
  (stesso principio già presente in Offerta Suprema id 559, distinto
  qui per `ctx.zone`). Riusati quasi interamente meccanismi già
  esistenti per Metamorfosi/Cancello di Fusione (Extra Deck, Fusione
  per materiali dichiarati) invece di inventare nuova infrastruttura.
  Iniezione della Fata Giglio rivalutata: richiede un hook NUOVO
  ("modifica l'ATK solo per il calcolo del danno", nulla di simile
  esiste oggi tranne `zeroAttackerAtk()` per il caso opposto) — non
  affrontata in questa battuta. Suite 36/36 verde dopo ogni carta.
  Restano nel Livello 3: Iniezione della Fata Giglio, Freed il Generale
  Senza Rivali (poi Livello 4: Necrovalle, Dark Necrofear; Livello 5:
  Gravekeeper's).
- Sessione 1 (continua): chiusa Freed il Generale Senza Rivali (888) —
  **18 carte totali completate finora**, riclassificata e spostata al
  Livello 4 (era stata segnata "media" nel Livello 2, ma si è rivelata
  più vicina a "complessa" una volta implementata per intero). Entrambe
  le abilità reali coperte: negazione reattiva delle Magie che la
  bersagliano (`onCardEffectTargetDeclare`+`ctx.cancel()`, stesso schema
  di Gran Scudo Gardna id 115 — molto più semplice del previsto, una
  volta trovato il precedente giusto) e sostituzione della pescata con
  una ricerca in Draw Phase (hardcoded in `enterDrawPhaseInner`,
  game-flow.js, stesso schema di `skipDrawFor`/`pendingMaharaghiPeekFor`
  già esistenti per lo stesso motivo strutturale). Verificato con test
  mirati: negazione confermata contro un vero Cambio di Cuore (id 147)
  attivato dal bot, sostituzione della pescata confermata con un
  Guerriero vero cercato dal Deck. Suite 36/36 verde (rilevante: questa
  carta tocca `enterDrawPhaseInner`, chiamata da OGNI singolo turno di
  OGNI duello — nessuna regressione).
  **Livello 3 quasi completo, resta solo Iniezione della Fata Giglio**
  (richiede un nuovo hook "modifica l'ATK solo per il calcolo del
  danno" — genuinamente non presente nel motore oggi). Prossimo passo:
  o Iniezione della Fata Giglio con quel nuovo hook, o saltare al
  Livello 4 (Necrovalle, Dark Necrofear).
