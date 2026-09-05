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
`data/cards.json`: **901** (l'ultimo esistente è 900).

Colonne: **Nome** (italiano, la forma che avrà nel dataset — verificata
o proposta), **Origine** (set TCG), **Tipo**, **Difficoltà** stimata
(1=banale, 5=complessa), **Stato**, **id** (assegnato quando aggiunta),
**Note**.

## Livello 1 — banali (dati puri o riuso diretto di un pattern esistente)

| Nome (IT) | Nome (EN) | Origine | Tipo | Stato | id | Note |
|---|---|---|---|---|---|---|
| Terraformazione | Terraforming | LOD | Magia Normale | ✅ fatta | 871 | Cerca 1 Magia Campo dal Deck e mettila in mano — `ctx.searchDeckToHand`. Verificato: sposta davvero la carta trovata in mano. |
| Wingweaver | Wingweaver | PSV | Mostro Normale | ✅ fatta | 872 | LUCE/Lv7/Fata/2750/2400, vanilla — nessun effetto da programmare. Nome tenuto invariato (non tradotto): nessuna conferma affidabile trovata di un nome italiano ufficiale diverso, stesso trattamento già riservato ad altri nomi propri di questo dataset (Skull Servant, Thunder Dragon, ecc.). |
| Santa Giovanna | St. Joan | LON | Mostro Fusione | ✅ fatta | 903 | **Chiarito l'ambiguità che l'aveva rimandata**: interrogata direttamente l'API YGOPRODeck per "St. Joan" — i materiali ATTUALI (fonte di verità di questo dataset) sono confermati "The Forgiving Maiden" + "Darklord Marie". "Darklord Marie" è davvero il nome ATTUALE di una carta del 2003 (Labyrinth of Nightmare) originariamente chiamata "Marie the Fallen One" (stesso konami_id, confermato interrogando anche quel nome — l'API lo fa risolvere alla stessa carta), poi rinominata da Konami anni dopo integrandola nell'archetipo Darklord: usato qui nome/testo ATTUALI, non quelli storici, stessa convenzione già seguita per ogni altra carta di questo dataset. Aggiunte anche 901 (La Fanciulla Indulgente/The Forgiving Maiden — Ignition auto-tributo, torna in mano 1 mostro dal Cimitero, SEMPLIFICAZIONE: bersaglio auto-selezionato non necessariamente "distrutto in battaglia in questo turno") e 902 (Darklord Marie — +200 LP dal Cimitero, SEMPLIFICAZIONE: riusa canActivateFromGraveyardMainPhase, l'unico aggancio "dal Cimitero" esistente in questo motore, quindi scatta alla propria Main Phase 1 invece che alla Standby Phase). Santa Giovanna stessa è vanilla (nessun effetto proprio oltre le statistiche), `fusionMaterials: [901, 902]`. Verificato con 4 scenari attraverso il motore reale: tributo di Fanciulla Indulgente confermato, LP guadagnati da Darklord Marie confermati, `getFusableExtraDeckMonsters` trova correttamente l'opzione, `ACTIONS.fusionSummon` la evoca per davvero sul Terreno. |
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
| Necrovalley | Necrovalley | PGD | Magia Campo | ✅ fatta | 890 | +500 ATK/DEF ai mostri Guardiani della Tomba (propedeutica all'archetipo, Livello 5 — innocuo, non fa nulla finché quei mostri non esistono, filtro per NOME come già usato per "Occhi Rossi" in questo file, dato che i Guardiani della Tomba reali non hanno una race dedicata in questo motore); le carte nel Cimitero non possono essere bandite (le altre 2 clausole più esotiche del testo reale — negare uno spostamento di zona diverso dal bando, negare un cambio di Tipo/Attributo nel Cimitero — restano SEMPLIFICAZIONE non implementata, nessun checkpoint generico esiste per nessuna delle due e sono casi di nicchia). La stima precedente ("~11 punti come id 808") si è rivelata quasi doppia nella pratica: ~24 punti reali in card-effects.js banivano dal Cimitero con uno splice scritto a mano, PIÙ 1 in duel-engine.js — ma invece di controllare Necrovalley in ognuno singolarmente, creato un nuovo choke-point condiviso `ACTIONS.banishFromGraveyard(owner, card)` (duel-engine.js, stesso principio di `destroyTargetedMonster`: combina rimozione dal Cimitero + banish in un solo passo, controllando Necrovalley al proprio interno) e MIGRATI tutti i punti esistenti a usarlo — un solo posto da mantenere per qualunque futura carta con lo stesso schema, non ~24 controlli duplicati. Due insidie reali trovate e corrette durante la migrazione: (1) alcuni effetti usavano un `while(...&&grave.length>0)` per bandire "fino a N carte" (Rilascio dell'Anima id 452/609) — se il bando è bloccato senza mai rimuovere nulla dall'array, la condizione di uscita non scatta MAI: loop infinito reale, corretto con un flag `blocked` che esce dal ciclo alla prima chiamata fallita (Necrovalley è un blocco globale, se fallisce una volta fallisce per ogni carta successiva, nessun bisogno di ritentarle); (2) diversi effetti "banisci come costo, POI fai l'effetto vero" (Special Summon dal Cimitero, ritorno in mano, ecc.) non controllavano l'esito del bando prima di proseguire — se Necrovalley lo bloccava, l'effetto principale si risolveva comunque come se il costo fosse stato pagato: corretto propagando il valore di ritorno di `banishFromGraveyard` (false = costo non pagato, l'intero effetto abortisce) in ogni sito toccato. Verificato con 4 scenari attraverso il motore reale: bando normale senza Necrovalley, bando bloccato con Necrovalley scoperta, bonus +500/+500 confermato su un mostro con nome sintetico "Guardiani della Tomba", nessun loop infinito su Rilascio dell'Anima con Necrovalley attiva. Suite 36/36 verde nonostante la portata della migrazione (~25 punti toccati). |
| Iniezione della Fata Giglio | Injection Fairy Lily | LOD | Mostro Effetto | ✅ fatta | 889 | TERRA/Lv3/Stregone/400/1500 — durante il calcolo del danno (Attacco o Difesa), può pagare 2000 LP per +3000 ATK solo per quel calcolo, una volta per Battle Phase. Non serviva un hook nuovo da zero: `def.damageStepBonus(ctx)` (già esistente, usato da Soldati Insetto del Cielo id 311/Soldato Cinetico id 326) copriva già "modifica l'ATK solo per il calcolo del danno" — mancava solo sapere DI CHI sono i LP da pagare, quindi esteso quel ctx condiviso con un nuovo campo `owner` (chi controlla la carta ADESSO, calcolato una volta sola in `getDamageStepBonus`, duel-engine.js) invece di reinventare l'infrastruttura. SEMPLIFICAZIONE (vedi missingEffectNote): decisione di pagare automatica (paga se ha i LP e se il bonus farebbe la differenza tra perdere/pareggiare e vincere lo scontro, mai per pura sicurezza se vincerebbe comunque). Verificato con 2 scenari reali attraverso `resolveAttack`: Lily in Difesa contro un attacco da 2500 ATK paga, sopravvive e distrugge l'attaccante (900 danni all'attaccante per la differenza ATK, regola reale); Lily attacca un 5000 DEF, il bonus non basterebbe (400+3000=3400<5000) e correttamente NON paga, subendo comunque i 4600 danni da differenza ATK/DEF previsti dalla regola reale — non un bug, la carta non può evitare quel danno indipendentemente da come/se paga. |
| Cancello di Fusione | Fusion Gate | LON | Magia Campo | ✅ fatta | 887 | Finché in campo, il giocatore di turno può Evocare per Fusione dall'Extra Deck bandendo i materiali da mano/campo, ignorando le normali condizioni. SEMPLIFICAZIONE (vedi missingEffectNote): materiali al Cimitero invece che banditi, solo dal proprio turno. Riusa interamente `DuelEngine.getFusableExtraDeckMonsters`/`ctx.fusionSummon` (già esistenti per "Fusione" id 38) come Ignition ripetibile (`repeatableWhileContinuous`, schema di Offerta Suprema id 559). **Bug trovato e corretto durante l'implementazione**: il primo `canActivate` gate su "materiali disponibili ORA" bloccava anche il PRIMO piazzamento della Magia Campo (che non dovrebbe mai dipendere dai materiali, solo la riattivazione ripetuta lo fa) — corretto distinguendo `ctx.zone !== 'fieldSpell'` (primo piazzamento, sempre legale) da `ctx.zone === 'fieldSpell'` (riattivazione, lì sì il controllo sui materiali). Verificato: piazzamento sempre legale, riattivazione correttamente bloccata senza materiali e sbloccata con un vero Mostro Fusione (id 254) e i suoi materiali reali in mano. |
| Metamorfosi | Metamorphosis | PGD | Magia Normale | ✅ fatta | 886 | Tributa 1 mostro, Evoca Specialmente dall'Extra Deck 1 Mostro Fusione dello stesso Livello. SEMPLIFICAZIONE (vedi missingEffectNote): tributo auto-selezionato (il più debole con un corrispondente nell'Extra Deck). Usa lo slot appena liberato dal tributo, nessuna ricerca di slot vuoto separata. Verificato: tributo al Cimitero, Mostro Fusione corretto Special Summonato nello stesso slot. |
| Quiz Inverso | Reversal Quiz | PGD | Magia Normale | ✅ fatta | 885 | Manda mano e campo al Cimitero, dichiara il tipo di carta (Magia/Trappola/Mostro) in cima al proprio Deck: se indovina, scambia i propri LP con quelli dell'avversario. SEMPLIFICAZIONE (vedi missingEffectNote): dichiarazione automatica (il tipo più frequente nel proprio Deck rimasto). Verificato: mano/campo/Magie-Trappole/Magia Campo tutte mandate al Cimitero, LP scambiati correttamente quando la dichiarazione automatica indovina. |

## Livello 4 — complesse

| Nome (IT) | Nome (EN) | Origine | Tipo | Stato | id | Note |
|---|---|---|---|---|---|---|
| Freed il Generale Senza Rivali | Freed the Matchless General | LOD | Mostro Effetto | ✅ fatta | 888 | TERRA/Lv5/Guerriero/2300/1700 — nega gli effetti Magia che la bersagliano (`onCardEffectTargetDeclare`+`ctx.cancel()`, stesso schema di Gran Scudo Gardna id 115); in Draw Phase può cercare 1 Guerriero Lv4- dal Deck invece di pescare (hardcoded in `enterDrawPhaseInner`, game-flow.js — una sostituzione della pescata vive per forza lì, stesso schema di `skipDrawFor`/`pendingMaharaghiPeekFor`). SEMPLIFICAZIONI documentate: non distrugge sempre esplicitamente la Magia negata se Continua/Equip; la ricerca in Draw Phase è automatica. Verificato: negazione confermata contro Cambio di Cuore (id 147) del bot, sostituzione della pescata confermata con un vero Guerriero cercato dal Deck. |
| Necropaura Oscura | Dark Necrofear | LON | Mostro Effetto | ✅ fatta | 891 | OSCURITÀ/Lv8/Demone/2200/2800 — **testo attuale via API YGOPRODeck diverso da quello ipotizzato in sessione precedente**: non è più una Fusione (è un Mostro Effetto normale, nessun Extra Deck coinvolto — molto più semplice del previsto), Evocazione Speciale dalla MANO bandendo 3 mostri DEMONE (non "qualunque mostro") dal proprio Cimitero. Se distrutta nella propria Zona Mostro da una carta dell'avversario e mandata al Cimitero in quel turno: alla End Phase, si equipaggia a 1 mostro scoperto avversario e ne prende il controllo finché resta equipaggiata — un mostro che agisce da Equip è un caso più unico che raro in tutto il gioco. Riusa quasi tutto: canSpecialSummonFromHand/paySpecialSummonCost (stesso schema di Stregone del Caos id 740/Drago Megaroccia id 763), ctx.banishFromGraveyard (nuovo di questa sessione, vedi Necrovalley id 890), ctx.takeControl esistente (permanent:true), lo stesso pattern multi-hook onSTDestroyed/onBanished/onReturnedToHandSelf già usato da Abbandonato (id 416) per rilasciare il controllo quando la carta lascia la zona Magia/Trappola. L'UNICO pezzo genuinamente nuovo: una carta nel Cimitero non riceve mai i normali trigger di fase in questo motore (stesso vincolo già noto per Ultimo Turno id 341), quindi la condizione "End Phase dello stesso turno" va armata in onDestroy() (gameState.pendingNecrofearRevival, per uid) e controllata esplicitamente dentro enterEndPhase() (game-flow.js) — stesso identico principio già in uso per id 341, non un meccanismo nuovo inventato da zero. SEMPLIFICAZIONE (vedi missingEffectNote): bersaglio auto-selezionato (ATK più alto); se è il mostro EQUIPAGGIATO a lasciare il campo per conto proprio (es. distrutto in battaglia mentre sotto controllo), questa carta resta orfana e finisce nel Cimitero al controllo successivo, nessun effetto a cascata aggiuntivo (il testo attuale non ne specifica uno). Verificato con 3 scenari attraverso il motore reale: Special Summon con bando di 3 Demoni confermato; distruzione da effetto avversario arma il flag, la End Phase dello STESSO turno esegue equip+controllo (il mostro avversario passa davvero al campo del controllore, sparisce da quello originale); distruggere l'equip fa tornare il controllo al proprietario originale. Suite 36/36 verde. **Lezione per un futuro caso simile**: quando una nota di sessione precedente descrive una carta come "Fusione" o con un meccanismo complesso basandosi solo sulla memoria/wiki, ri-verificare SEMPRE il testo REALE via API prima di stimare la difficoltà — Konami ha aggiornato il testo di questa carta nel tempo, e la versione attuale è sensibilmente più semplice (niente Extra Deck) di quella ipotizzata. |

## Livello 5 — archetipo Gravekeeper's (propedeutico: Necrovalley sopra)

A tema egizio, coerente con Marik/Ishizu già presenti nel gioco. Da
trattare come blocco unico dopo Necrovalley, non prima.

| Nome (IT) | Nome (EN) | Origine | Tipo | Stato | id | Note |
|---|---|---|---|---|---|---|
| Spia dei Guardiani della Tomba | Gravekeeper's Spy | PGD | Mostro Flip | ✅ fatta | 897 | FLIP: Evoca Specialmente 1 Guardiani della Tomba con 1500 ATK o meno dal Deck — stesso schema di ricerca dal Deck già usato da Angelo Splendente (id 878), su onFlip. Verificato: mostro corretto Special Summonato dal Deck. |
| Guardia dei Guardiani della Tomba | Gravekeeper's Guard | PGD | Mostro Flip | ✅ fatta | 898 | FLIP: 1 mostro avversario torna in mano (bersaglio auto-selezionato, ATK più alto) — ctx.returnMonsterToHand già esistente. Verificato: mostro avversario da 2000 ATK tornato in mano. |
| Capo dei Guardiani della Tomba | Gravekeeper's Chief | PGD | Mostro Effetto | ✅ fatta | 899 | "Il tuo Cimitero non è influenzato da Necrovalley" — nuova `isNecrovalleyProtectingGraveyard(owner)` (duel-engine.js), generalizzazione per-owner di ACTIONS.banishFromGraveyard: controlla se `owner` ha questa carta scoperta in campo prima di applicare il blocco. "Quando Evocata Tributo: Special Summon 1 Guardiani della Tomba dal Cimitero" — onSummon con `ctx.summonedVia==='normal'` (per un Livello 5 un'Evocazione Normale è SEMPRE un'Evocazione Tributo in questo motore, nessuna ambiguità). SEMPLIFICAZIONE: "solo 1 copia scoperta" non applicata (nessun controllo di unicità generico esiste); bersaglio da rianimare auto-selezionato. Verificato: revival dal Cimitero riuscito, banishFromGraveyard riesce per il proprietario di Chief anche con Necrovalley scoperta (mentre resterebbe bloccato per l'avversario). |
| Maledizione dei Guardiani della Tomba | Gravekeeper's Curse | PGD | Mostro Effetto | ✅ fatta | 892 | "Se Evocata: infliggi 500 danni" — onSummon(ctx), nessuna restrizione sul metodo di Evocazione. La più semplice delle 9. Verificato: 500 danni confermati. |
| Assalitore dei Guardiani della Tomba | Gravekeeper's Assailant | PGD | Mostro Effetto | ✅ fatta | 895 | "Quando dichiara un attacco, mentre Necrovalley è sul Terreno: cambia la Posizione di Battaglia di 1 mostro scoperto avversario" — `onOwnAttackDeclare(ctx)`, l'auto-effetto dell'ATTACCANTE su ON_ATTACK_DECLARE. **Scoperta importante**: questo hook esisteva GIÀ da prima di questa sessione (es. Jirai Gumo id 316) — la tabella Livello 4/Note precedente su Spirit Ryu (id 630, ancora aperta) affermava che "oggi esiste solo la risposta del difensore": falso, andrebbe riverificato. Verificato con un test pulito (nome della carta cambiato per isolare l'effetto dal proprio bonus di Necrovalley, che altrimenti confonde i numeri): posizione cambiata da Difesa ad Attacco PRIMA del calcolo danni, poi la battaglia si risolve di conseguenza (distrutto, danno corretto). |
| Artigliere dei Guardiani della Tomba | Gravekeeper's Cannonholder | PGD | Mostro Effetto | ✅ fatta | 896 | Ignition dalla zona Mostro: tributa 1 altro Guardiani della Tomba per infliggere 700 danni — "una volta a turno" già garantito automaticamente da `gameState.usedIgnitionThisTurn` per OGNI Ignition di questo motore. Tributo scritto a mano (field=null + graveyard.push + notifySacrificedForTribute), stesso schema di Metamorfosi (id 886). Verificato: tributo confermato, 700 danni inflitti. |
| Lanciere dei Guardiani della Tomba | Gravekeeper's Spear Soldier | PGD | Mostro Effetto | ✅ fatta | 894 | "Se attacca un mostro in Difesa: danno perforante" — `def.piercing: true`, stesso flag fisso già usato da Parshath il Cavaliere Alato (id 82). Zero codice nuovo. Verificato: 1000 danni perforanti (1500 ATK - 500 DEF) confermati. |
| Vassallo dei Guardiani della Tomba | Gravekeeper's Vassal | PGD | Mostro Effetto | ✅ fatta | 893 | "Il danno da battaglia inflitto da questa carta è trattato come danno da effetto" — nuovo flag `def.treatBattleDamageAsEffect`, consultato in `fireOwnBattleDamageDealt` (actions.js) per saltare le reazioni specifiche al danno da BATTAGLIA (es. Goblin Ladro id 610) quando è questa carta a infliggerlo. Verificato: un vero Goblin Ladro scoperto sul Terreno NON scarta la mano avversaria quando Vassallo infligge danno diretto (mano invariata), mentre i Life Points scendono regolarmente. |
| Sentinella dei Guardiani della Tomba | Gravekeeper's Watcher | PGD | Mostro Effetto | ⏳ SEMPLIFICAZIONE non implementata | 900 | Registrata con dati/statistiche reali ma nessun codice per l'abilità (`CardEffects.register(900, {})`, vanilla di fatto). Richiederebbe una vera finestra di risposta attivabile da una carta ancora in MANO (mai da campo — nessun'altra carta di questo motore ha una finestra del genere: findMonsterQuickEffectCandidates/findSpellTrapQuickEffectCandidates coprono solo carte già scoperte in campo), apribile in QUALUNQUE momento del turno di uno dei due giocatori (non solo quando una Chain è già aperta, a differenza della Categoria B esistente), PIÙ una capacità di riconoscere in anticipo se un'attivazione "potrebbe far scartare" l'avversario — sproporzionato per una carta sola, stesso principio già accettato per Categoria B (id 192/396/459), ma un requisito ancora più ampio (quelle rispondono comunque solo a Chain già aperta). |

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
- Sessione 1 (continua): chiusa Iniezione della Fata Giglio (889) —
  **Livello 3 COMPLETO**, 19 carte totali finora. La stima precedente
  ("serve un hook nuovo da zero") si è rivelata troppo pessimista: il
  hook `damageStepBonus` esisteva già (Soldati Insetto del Cielo id
  311/Soldato Cinetico id 326) e copriva già "modifica l'ATK solo per
  il calcolo del danno" — mancava solo un modo per sapere DI CHI sono i
  LP da scalare quando l'effetto deve anche pagare un costo (non solo
  calcolare un bonus puro come le carte precedenti). Risolto con
  un'estensione minima e riusabile del ctx condiviso (nuovo campo
  `owner`, calcolato una volta in `getDamageStepBonus`), non con
  infrastruttura nuova dedicata a questa carta sola. **Lezione per un
  futuro caso simile**: quando una stima di sessione precedente dice
  "serve un hook nuovo", vale la pena riverificare con più calma prima
  di crederci — a volte l'hook giusto esiste già e serve solo un
  piccolo arricchimento del suo ctx, non una reinvenzione. Verificato
  con 2 scenari reali attraverso `resolveAttack` (non solo l'hook
  isolato): pagamento corretto quando conviene, nessun pagamento
  sprecato quando il bonus non basterebbe comunque. Suite 36/36 verde.
  Anche le 19 carte fatte finora hanno ora una vera illustrazione (non
  solo il fallback CSS generico) — mancavano i file immagine in
  `images/cards/`, scaricati dal ritaglio ufficiale (`image_url_cropped`)
  dell'API YGOPRODeck, stessa fonte/stesso formato già usato per ogni
  altra carta del dataset. **Prossimo passo: Livello 4 (Necrovalle,
  Dark Necrofear).**
- Sessione 1 (continua): chiusa Necrovalley (890) — **20 carte totali
  completate finora**, Livello 4 a metà (resta Dark Necrofear). La stima
  precedente ("~11 punti come id 808") si è rivelata quasi doppia nella
  pratica (~25 punti reali tra card-effects.js e duel-engine.js) — ma
  invece di controllare la carta in ognuno singolarmente, creato un
  nuovo choke-point condiviso `ACTIONS.banishFromGraveyard(owner, card)`
  (stesso principio di `destroyTargetedMonster`: combina rimozione dal
  Cimitero + banish in una chiamata sola, controllando Necrovalley al
  proprio interno) e MIGRATI tutti i punti esistenti che banivano dal
  Cimitero con uno splice scritto a mano. **Due insidie reali trovate
  durante la migrazione, entrambe corrette**: (1) un `while(...&&
  grave.length>0)` per bandire "fino a N carte" può andare in loop
  INFINITO se il bando è bloccato e non rimuove mai nulla dall'array —
  serviva un flag di uscita esplicito, non solo il controllo del
  singolo bando; (2) diversi effetti "banisci come costo, POI fai
  l'effetto vero" non controllavano l'esito del bando prima di
  proseguire, rischiando di risolvere l'effetto principale anche a
  costo non pagato. **Lezione per un futuro caso simile**: quando si
  centralizza un pattern ripetuto in un nuovo choke-point condiviso,
  non basta sostituire la chiamata — bisogna anche verificare COSA
  faceva il chiamante SE quella chiamata falliva prima (spesso: niente,
  perché prima non poteva mai fallire), e aggiungere quel controllo
  ovunque manchi. Verificato con 4 scenari attraverso il motore reale
  (bando normale, bando bloccato, bonus Guardiani della Tomba, nessun
  loop infinito). Suite 36/36 verde nonostante la portata della
  migrazione. **Prossimo passo: Dark Necrofear (Livello 4), poi
  l'archetipo Gravekeeper's (Livello 5, ora sbloccato da Necrovalley).**
- Sessione 1 (continua): chiusa Necropaura Oscura (891) — **Livello 4
  COMPLETO, 21 carte totali finora**. Scoperta importante: il testo
  reale via API (fonte di verità di questo progetto) è cambiato nel
  tempo rispetto a quanto ipotizzato — non è più una Fusione (Mostro
  Effetto normale, niente Extra Deck), molto più semplice del previsto.
  Riusato quasi tutto (canSpecialSummonFromHand/paySpecialSummonCost,
  ctx.banishFromGraveyard appena creato per Necrovalley, ctx.takeControl
  già esistente, lo stesso pattern multi-hook di rilascio di Abbandonato
  id 416): l'unico pezzo genuinamente nuovo è il timing "End Phase dello
  STESSO turno in cui è stata distrutta da una carta avversaria" — una
  carta nel Cimitero non riceve mai i normali trigger di fase in questo
  motore (stesso vincolo già noto per Ultimo Turno id 341), risolto
  armando un flag in onDestroy() e controllandolo esplicitamente dentro
  enterEndPhase() (game-flow.js), stesso identico principio già in uso
  per id 341. Verificato con 3 scenari attraverso il motore reale
  (Special Summon, equip+controllo alla End Phase corretta, rilascio del
  controllo quando l'equip viene distrutta). Suite 36/36 verde.
  **Lezione per un futuro caso simile**: una stima di sessione precedente
  basata su ricordo/wiki va sempre ri-verificata contro il testo REALE
  via API prima di preventivare la difficoltà — Konami aggiorna il testo
  delle carte nel tempo, e la versione più recente può essere
  sensibilmente più semplice di quella "storica" ricordata a memoria.
  **Prossimo passo: l'archetipo Gravekeeper's (Livello 5, 9 carte, ora
  sbloccato da Necrovalley id 890).**
- Sessione 1 (continua): **BACKLOG COMPLETO** — chiuse le 9 carte
  dell'archetipo Guardiani della Tomba (892-900), **30 carte totali
  aggiunte in questa sessione**. 8 su 9 implementate per intero
  riusando quasi esclusivamente meccanismi già esistenti (def.piercing
  per Lanciere id 894, onFlip per Spia/Guardia id 897/898, Ignition da
  zona Mostro con tributo scritto a mano per Artigliere id 896, onSummon
  per Maledizione/Capo id 892/899); solo 2 pezzi genuinamente nuovi:
  `def.treatBattleDamageAsEffect` (nuovo flag, Vassallo id 893, consultato
  in fireOwnBattleDamageDealt per sopprimere le reazioni "sai che era
  danno da battaglia" di altre carte come Goblin Ladro id 610) e
  `isNecrovalleyProtectingGraveyard(owner)` (nuova funzione, Capo id 899,
  generalizzazione per-owner di isNecrovalleyOnField/banishFromGraveyard
  per "il tuo Cimitero non è influenzato da Necrovalley"). **Scoperta
  degna di nota durante Assalitore (id 895)**: l'hook `onOwnAttackDeclare(ctx)`
  (l'auto-effetto dell'ATTACCANTE su una propria dichiarazione d'attacco)
  esiste GIÀ nel motore da prima di questa sessione (es. Jirai Gumo id
  316) — la voce Spirit Ryu (id 630, Categoria A, ancora aperta più
  sotto in questo file) descrive proprio questo come "hook mancante,
  oggi esiste solo la risposta del difensore": affermazione OBSOLETA,
  andrebbe riverificata in una futura sessione prima di continuare a
  trattare id 630 come bloccata per questo motivo. **Sola eccezione**:
  Sentinella (id 900) registrata con dati/statistiche reali ma senza
  codice per l'abilità — richiederebbe una finestra di risposta da MANO
  apribile in qualunque momento del turno di uno dei due giocatori
  (nessun'altra carta di questo motore ne ha una: le uniche finestre da
  campo esistenti rispondono solo a una Chain già aperta), sproporzionato
  per una carta sola, stesso principio già accettato per la Categoria B
  esistente ma un requisito ancora più ampio. Verificato con 9 scenari
  attraverso il motore reale (uno per carta, incluso un test di
  isolamento per Assalitore per separare il suo effetto dal proprio
  bonus di Necrovalley, che altrimenti confondeva i numeri attesi).
  Suite 36/36 verde. **Il backlog "prima serie" di questa sessione è
  ora chiuso**: resta solo Santa Giovanna (rimandata, materiali di
  Fusione da chiarire) e Spirit Ryu (id 630, Categoria A storica, ora
  con un indizio concreto che potrebbe essere meno bloccata del
  previsto).
- Sessione 1 (continua): **chiusa anche Spirit Ryu (id 630)** — l'unica
  Categoria A storica di questo file, verificando subito l'indizio
  trovato implementando Assalitore dei Guardiani della Tomba qui sopra.
  `onOwnAttackDeclare(ctx)` esisteva davvero già (Jirai Gumo id 316):
  bastava usarlo per far scattare lo scarto del mostro Drago nel preciso
  istante in cui QUESTA carta dichiara un attacco, invece del vecchio
  Ignition attivabile a piacere durante la propria Battle Phase. Per la
  durata "fino a fine Battle Phase" (non fine turno): flag per-istanza
  `_spiritRyuBoosted` + static(), azzerato in onBattlePhaseEnd — stesso
  identico schema di `usedInjectionThisBattle` (Iniezione della Fata
  Giglio id 889, chiusa in questa stessa sessione). **Bug reale trovato
  e corretto durante l'implementazione**: il ctx passato a
  `onOwnAttackDeclare` è il declareCtx costruito da `resolveAttack`
  (actions.js) per l'INTERO trigger ON_ATTACK_DECLARE — non ha un
  proprio `ctx.card` (quel campo è riservato al DIFENSORE che risponde,
  es. Suijin/Kazejin), solo `attackerOwner`/`attackerIndex`: un primo
  tentativo che leggeva `ctx.card` falliva SILENZIOSAMENTE (catturato da
  `safeCallCardHandler`, nessun errore in console) — bastava leggere la
  carta vera da `ctx.field(ctx.attackerOwner)[ctx.attackerIndex].card`.
  Verificato con un test attraverso il motore reale (non solo l'hook
  isolato): Spirit Ryu (1000 ATK) attacca un 1500 ATK, scarta un Drago
  dalla mano, sopravvive con 2000 ATK e distrugge l'avversario; dopo la
  End Phase l'ATK torna a 1000 (bonus scaduto a fine Battle Phase, non a
  fine turno). Suite 36/36 verde. **Lezione per una futura sessione**:
  una nota "Categoria A, serve infrastruttura nuova" può diventare
  obsoleta con l'aggiunta di infrastruttura per una carta diversa più
  avanti nella stessa (o in una futura) sessione — vale la pena
  ririverificare periodicamente le carte "genuinamente bloccate" invece
  di darle per scontate per sempre.
- Sessione 1 (continua): **sbloccata e chiusa anche Santa Giovanna** —
  l'ultima voce rimasta "rimandata" del backlog. L'ambiguità che
  l'aveva bloccata ("Darklord Marie" è il nome storico o attuale?) si è
  risolta interrogando direttamente l'API invece di ragionarci a
  memoria: confermato che è davvero lo stesso konami_id di "Marie the
  Fallen One" (2003, Labyrinth of Nightmare), poi rinominata da Konami
  anni dopo nell'archetipo Darklord — usato qui nome/testo ATTUALI,
  stessa convenzione di ogni altra carta di questo dataset. Aggiunte
  901 (La Fanciulla Indulgente) e 902 (Darklord Marie) come materiali,
  903 (Santa Giovanna) come Fusione vanilla. **Il backlog "prima serie"
  di questa sessione è ORA VERAMENTE COMPLETO**: 33 carte nuove
  aggiunte (871-903) più la correzione di Spirit Ryu (id 630) —
  nessuna voce rimasta "da fare" o "rimandata" in questo file, a parte
  le SEMPLIFICAZIONI onestamente documentate (Categoria B esistente +
  Sentinella dei Guardiani della Tomba id 900) che restano scelte
  deliberate, non lavoro dimenticato.
- Sessione 2: aggiunti i 97 mostri vanilla rimanenti dei 7 set (id
  904-1000) — nome/statistiche/immagine reali, nessun effetto da
  programmare per definizione. Non documentati carta per carta in
  questo file (nessuna decisione di design coinvolta, solo dati puri),
  ma l'intervallo di id è ora riservato e chiuso.

## Seconda ondata: le carte NON vanilla rimanenti (effetto/Flip/Fusione/Rituale/Spirito)

Dopo il completamento dei 97 vanilla (id 904-1000), una ricognizione
precedente aveva stimato "133 carte con effetto ancora mancanti" (89
Effetto, 18 Flip, 16 Fusione, 7 Spirito, 3 Rituale) — quella stima **non
era mai stata salvata in un file** (viveva solo nella conversazione) ed
è andata persa a metà lavoro per un cambio di priorità di sessione.
**Lezione per il futuro: ogni ricognizione di questo tipo va salvata QUI
non appena calcolata, mai lasciata solo in conversazione.**

Rifatta da zero in modo riproducibile (script Node, non a memoria):
scaricati tutti i dati dei 7 set via API YGOPRODeck (`cardinfo.php?cardset=...`,
nomi esatti verificati con `cardsets.php` — attenzione, alcuni differiscono
dal nome comune: il set è "Legend of Blue **Eyes** White Dragon", senza
trattino, non "Blue-Eyes"), deduplicati per id, filtrati ai tipi
NON-Normal Monster (Effetto/Flip/Fusione/Rituale/Spirito/Union/Toon/
Gemini — nessuno di questi ultimi 3 esiste ancora in questi 7 set,
compaiono solo in espansioni successive), poi confrontati contro
`card-effects.js`+`cards.json`+questo stesso file+`cards-db.js` cercando
il nome INGLESE esatto (convenzione consolidata: ogni carta bespoke ha
un commento "id — NomeIT / NomeEN"). **Esito: 281 mostri non-vanilla
unici nei 7 set, 176 ancora mancanti** (120 Effetto, 27 Flip, 23
Fusione, 8 Spirito, 3 Rituale) — un conteggio più alto e più affidabile
dei precedenti 133, con l'elenco completo dei nomi stavolta salvato
(vedi tabella sotto).

**Insidie del metodo di confronto per nome, da ricordare se si rifà
questo conteggio in futuro**: (1) un apostrofo tipografico (’) nel
markdown vs uno dritto (') nel JSON dell'API fa fallire un confronto
ingenuo — normalizzare SEMPRE entrambi prima di confrontare; (2) alcune
carte già chiuse in sessioni precedenti hanno un commento che NON
include il nome inglese (es. Freed il Generale Senza Rivali, id 888) —
il confronto va quindi esteso a più file (card-effects.js, cards.json,
questo file, cards-db.js), non fidarsi di un solo file come fonte
esaustiva di "già fatto".

### Chiuse in questa ondata (19 carte, id 1001-1019)

- **8 Mostri Spirito di Legacy of Darkness** (id 1001-1008): stesso
  schema "non Special Summonabile, torna in mano a fine turno se Evocato
  Normalmente o girato scoperto" già rodato da Yata-Garasu (id 884)/
  Maharaghi (id 755). Sacerdote di Asura (1001, Asura Priest — solo lo
  schema base, SEMPLIFICAZIONE per "può attaccare tutti i mostri
  dell'avversario" — un vero attacco multiplo su più bersagli
  simultanei, mai richiesto da nessun'altra carta di questo motore),
  Fushi No Tori (1002 — guadagna LP pari al danno da battaglia
  inflitto: nuovo campo `ctx.damage` aggiunto a `onDealsBattleDamage`,
  actions.js, additivo), Grande Naso Lungo (1003, Great Long Nose —
  l'avversario salta la PROSSIMA Battle Phase: nuovo
  `gameState.skipNextBattlePhaseFor`, booleano che sopravvive al cambio
  turno a differenza di `skipBattlePhaseFor` già esistente, consumato in
  `enterBattlePhase()` game-flow.js), Hino-Kagu-Tsuchi (1004 —
  l'avversario scarta l'intera mano alla prossima Draw Phase PRIMA di
  pescare: nuovo `gameState.discardHandBeforeDrawFor`, stesso principio,
  consumato in `enterDrawPhaseInner()`), Coniglio Bianco di Inaba (1005,
  Inaba White Rabbit — può attaccare direttamente, riusa
  `gameState.directAttackAllowedUids` già esistente), Otohime (1006 —
  quando Evocata/girata: cambia la Posizione di Battaglia di 1 mostro
  avversario, bersaglio auto-selezionato passando dal checkpoint
  condiviso `ctx.declareTarget`), Soldato di Susa (1007, Susa Soldier —
  il proprio danno da battaglia è dimezzato: nuovo
  `def.battleDamageMultiplier`, numero fisso per definizione, applicato
  in actions.js PRIMA di ognuno dei 3 punti che calcolano danno da
  battaglia — 1 se assente, nessun cambiamento per ogni altra carta),
  Drago Yamata (1008, Yamata Dragon — pesca finché non si hanno 5 carte
  in mano dopo aver inflitto danno da battaglia).
- **5 mostri "attacca direttamente" di Metal Raiders** (id 1009-1013:
  Jinzo #7, Lampada Mistica/Mystic Lamp, Ooguchi, Sosia della
  Regina/Queen's Double, Fiore Arcobaleno/Rainbow Flower) — stesso
  `gameState.directAttackAllowedUids` incondizionato già usato da
  Folletto della Fiamma Furente (id 681), zero codice nuovo.
  Coincidenza notata: questo stesso permesso serviva anche a Coniglio
  Bianco di Inaba (1005) qui sopra, quindi 6 carte totali sbloccate
  dalla stessa riga di infrastruttura già pronta.
- **3 coppie Mostro Rituale + Magia Rituale di Spell Ruler** (id
  1014-1019: Hamburger Famelico/Hungry Burger + Ricetta
  dell'Hamburger/Hamburger Recipe, Tartaruga Granchio/Crab Turtle +
  Giuramento della Tartaruga/Turtle Oath, Spettacolo della
  Spada/Performance of Sword + Danza d'Apertura/Commencement Dance) —
  **scoperta importante**: l'Evocazione Rituale NON era affatto
  un'infrastruttura mancante come inizialmente temuto, esiste già da
  tempo (`performRitualTribute`/`maxRitualTributeLevel`, card-effects.js,
  nata per Rito del Guerriero Nero id 56, riusata già da altre 5 carte
  precedenti a questa sessione) — bastava applicare lo stesso schema
  esatto altre 3 volte, zero codice nuovo nel motore.

Verificato con un vero test di regressione attraverso il motore reale
(`tests/specs/lod-mrd-srl-spirit-ritual-cards.spec.js`, non solo gli
hook isolati): battaglie vere via `resolveAttack` per il danno dimezzato/
guadagno LP/skip Battle Phase/scarto pre-pesca, `enterBattlePhase()`/
`enterDrawPhaseInner()` veri per consumare i due nuovi flag "prossimo
turno", `onSummon` vero per Otohime, `canActivate`/`activate` veri per
la Magia Rituale. Suite 37/37 verde (36 preesistenti + 1 nuovo).

### Tabella delle 160 carte ancora mancanti (dopo questa ondata)

Fonte: rigenerabile da capo con lo stesso script (7 chiamate API +
confronto per nome, vedi sopra) — salvata qui stavolta per non perderla
di nuovo. **Nome (EN)** è il nome ufficiale inglese (nessuna traduzione
ancora proposta: va scelta al momento di implementare, seguendo lo
stesso criterio già usato finora — tradurre se il significato è chiaro,
mantenere invariato un nome proprio/giapponese senza una traduzione
italiana ufficiale confermata, es. Wingweaver/Fushi No Tori/Otohime).

| Nome (EN) | Tipo | Set | Razza/Attributo/Lv/ATK/DEF |
|---|---|---|---|
| 4-Starred Ladybug of Doom | Flip | PSV | Insect/WIND/3/800/1200 |
| A Cat of Ill Omen | Flip | PGD | Beast/DARK/2/500/300 |
| An Owl of Luck | Flip | PGD | Winged Beast/WIND/2/300/500 |
| Bite Shoes | Flip | PSV | Fiend/DARK/2/500/300 |
| Bombardment Beetle | Flip | PSV | Insect/WIND/2/400/900 |
| Bubonic Vermin | Flip | PSV | Beast/EARTH/3/900/600 |
| Cobra Jar | Flip | PGD | Reptile/EARTH/2/600/300 |
| Dragon Manipulator | Flip | LOD | Warrior/EARTH/3/700/800 |
| Dragon Piper | Flip | MRD | Pyro/FIRE/3/200/1800 |
| Fiber Jar | Flip | LOD | Plant/EARTH/3/500/500 |
| Fire Sorcerer | Flip | LON | Spellcaster/FIRE/4/1000/1500 |
| Invader of the Throne | Flip | SRL | Warrior/EARTH/4/1350/1700 |
| Jigen Bakudan | Flip | SRL | Pyro/FIRE/2/200/1000 |
| Jowls of Dark Demise | Flip | PGD | Fiend/WATER/2/200/100 |
| Lady Assailant of Flames | Flip | LON | Pyro/FIRE/4/1500/1000 |
| Morphing Jar #2 | Flip | PSV | Rock/EARTH/3/800/700 |
| Mysterious Guard | Flip | LOD | Spellcaster/EARTH/3/800/1200 |
| Parasite Paracide | Flip | PSV | Insect/EARTH/2/500/300 |
| Poison Mummy | Flip | PGD | Zombie/EARTH/4/1000/1800 |
| Reaper of the Cards | Flip | LOB | Fiend/DARK/5/1380/1930 |
| Shadow Tamer | Flip | LOD | Warrior/EARTH/3/800/700 |
| Spear Cretin | Flip | SRL | Fiend/DARK/2/500/500 |
| Summoner of Illusions | Flip | LON | Spellcaster/LIGHT/3/800/900 |
| Supply | Flip | LON | Warrior/EARTH/4/1300/800 |
| The Immortal of Thunder | Flip | MRD | Thunder/LIGHT/4/1500/1300 |
| Tornado Bird | Flip | LON | Winged Beast/WIND/4/1100/1000 |
| Weather Report | Flip | SRL | Aqua/WATER/4/950/1500 |
| 8-Claws Scorpion | Effetto | PGD | Insect/DARK/2/300/200 |
| A Man with Wdjat | Effetto | PGD | Spellcaster/DARK/4/1600/1600 |
| Airknight Parshath | Effetto | LOD | Fairy/LIGHT/5/1900/1400 |
| Ameba | Effetto | SRL | Aqua/WATER/1/300/350 |
| Aqua Spirit | Effetto | LON | Aqua/WATER/4/1600/1200 |
| Arsenal Bug | Effetto | PGD | Insect/EARTH/3/2000/2000 |
| Banisher of the Light | Effetto | SRL | Fairy/LIGHT/3/100/2000 |
| Bazoo the Soul-Eater | Effetto | LON | Beast/EARTH/4/1600/900 |
| Blast Juggler | Effetto | MRD | Machine/FIRE/3/800/900 |
| Boar Soldier | Effetto | SRL | Beast-Warrior/EARTH/4/2000/500 |
| Byser Shock | Effetto | PGD | Fiend/DARK/5/800/600 |
| Cave Dragon | Effetto | LOD | Dragon/WIND/4/2000/100 |
| Ceremonial Bell | Effetto | SRL | Spellcaster/LIGHT/3/0/1850 |
| Charm of Shabti | Effetto | PGD | Rock/EARTH/1/100/100 |
| Cobraman Sakuzy | Effetto | PGD | Reptile/EARTH/3/800/1400 |
| Crimson Sentry | Effetto | LON | Warrior/FIRE/4/1500/1200 |
| Cure Mermaid | Effetto | LON | Fish/WATER/4/1500/800 |
| Dancing Fairy | Effetto | LON | Fairy/WIND/4/1700/1000 |
| Dark Elf | Effetto | MRD | Spellcaster/DARK/4/2000/800 |
| Dark Jeroid | Effetto | PGD | Fiend/DARK/4/1200/1500 |
| Dark Ruler Ha Des | Effetto | LOD | Fiend/DARK/6/2450/1600 |
| Dark Scorpion Burglars | Effetto | PGD | Warrior/DARK/4/1000/1000 |
| Deepsea Warrior | Effetto | PSV | Warrior/WATER/5/1600/1800 |
| Des Lacooda | Effetto | PGD | Zombie/EARTH/3/500/600 |
| Dreamsprite | Effetto | LON | Plant/LIGHT/2/300/200 |
| Drill Bug | Effetto | PSV | Insect/EARTH/2/1100/200 |
| Electric Lizard | Effetto | MRD | Thunder/EARTH/3/850/800 |
| Electric Snake | Effetto | SRL | Thunder/LIGHT/3/800/900 |
| Exodia the Forbidden One | Effetto | LOB | Spellcaster/DARK/3/1000/1000 |
| Fairy Guardian | Effetto | LON | Fairy/WIND/3/1000/1000 |
| Fire Princess | Effetto | LON | Pyro/FIRE/4/1300/1500 |
| Flash Assailant | Effetto | SRL | Fiend/DARK/4/2000/2000 |
| Frontier Wiseman | Effetto | LOD | Spellcaster/EARTH/3/1600/800 |
| Fushioh Richie | Effetto | PGD | Zombie/DARK/7/2600/2900 |
| Garuda the Wind Spirit | Effetto | LON | Winged Beast/WIND/4/1600/1200 |
| Gearfried the Iron Knight | Effetto | PSV | Warrior/EARTH/4/1800/1600 |
| Giant Axe Mummy | Effetto | PGD | Zombie/EARTH/5/1700/2000 |
| Gora Turtle | Effetto | PGD | Aqua/WATER/3/1100/1100 |
| Gradius' Option | Effetto | LOD | Machine/LIGHT/1/-1/-1 |
| Gray Wing | Effetto | LOD | Dragon/WIND/3/1300/700 |
| Great Dezard | Effetto | PGD | Spellcaster/DARK/6/1900/2300 |
| Griggle | Effetto | SRL | Plant/EARTH/1/350/300 |
| Hayabusa Knight | Effetto | PSV | Warrior/EARTH/3/1000/700 |
| Helpoemer | Effetto | PGD | Fiend/DARK/5/2000/1400 |
| Hoshiningen | Effetto | MRD | Fairy/LIGHT/2/500/700 |
| Hysteric Fairy | Effetto | LON | Fairy/LIGHT/4/1800/500 |
| Insect Soldiers of the Sky | Effetto | MRD | Insect/WIND/3/1000/800 |
| Invitation to a Dark Sleep | Effetto | PSV | Spellcaster/DARK/5/1500/1800 |
| Jowgen the Spiritualist | Effetto | LON | Spellcaster/LIGHT/3/200/1300 |
| Karate Man | Effetto | SRL | Warrior/EARTH/3/1000/1000 |
| King Tiger Wanghu | Effetto | PGD | Beast/EARTH/4/1700/1000 |
| Kotodama | Effetto | SRL | Fairy/EARTH/3/0/1600 |
| Kryuel | Effetto | PGD | Fiend/DARK/4/1000/1700 |
| Kycoo the Ghost Destroyer | Effetto | LON | Spellcaster/DARK/4/1800/700 |
| Lady Panther | Effetto | LON | Beast-Warrior/EARTH/4/1400/1300 |
| Lava Golem | Effetto | PGD | Fiend/FIRE/8/3000/2500 |
| Lesser Fiend | Effetto | LOD | Fiend/DARK/5/2100/1000 |
| Mad Sword Beast | Effetto | PSV | Dinosaur/EARTH/4/1400/1200 |
| Maiden of the Aqua | Effetto | PGD | Aqua/WATER/4/700/2000 |
| Maryokutai | Effetto | LON | Aqua/WATER/3/900/900 |
| Minar | Effetto | SRL | Insect/EARTH/3/850/750 |
| Moisture Creature | Effetto | PGD | Fairy/LIGHT/9/2800/2900 |
| Mucus Yolk | Effetto | PGD | Aqua/DARK/3/0/100 |
| Mushroom Man #2 | Effetto | MRD | Warrior/EARTH/3/1250/800 |
| Mystical Knight of Jackal | Effetto | PGD | Beast-Warrior/LIGHT/7/2700/1200 |
| Newdoria | Effetto | PGD | Fiend/DARK/4/1200/800 |
| Nightmare Horse | Effetto | PGD | Zombie/DARK/2/500/400 |
| Nimble Momonga | Effetto | SRL | Beast/EARTH/2/1000/100 |
| Nuvia the Wicked | Effetto | LON | Fiend/DARK/4/2000/800 |
| Patrician of Darkness | Effetto | LOD | Zombie/DARK/5/2000/1400 |
| Penguin Knight | Effetto | SRL | Aqua/WATER/3/900/800 |
| Possessed Dark Soul | Effetto | LOD | Fiend/DARK/3/1200/800 |
| Revival Jam | Effetto | LON | Aqua/WATER/4/1500/500 |
| Royal Keeper | Effetto | PGD | Zombie/EARTH/4/1600/1700 |
| Ryu-Kishin Clown | Effetto | LOD | Fiend/DARK/2/800/500 |
| Sanga of the Thunder | Effetto | MRD | Thunder/LIGHT/7/2600/2200 |
| Sasuke Samurai | Effetto | PGD | Warrior/WIND/2/500/800 |
| Senju of the Thousand Hands | Effetto | SRL | Fairy/LIGHT/4/1400/1000 |
| Serpentine Princess | Effetto | LOD | Reptile/WATER/4/1400/2000 |
| Servant of Catabolism | Effetto | PGD | Aqua/LIGHT/3/700/500 |
| Skull Knight #2 | Effetto | LOD | Fiend/DARK/3/1000/1200 |
| Soul of Purity and Light | Effetto | LON | Fairy/LIGHT/6/2000/1800 |
| Spear Dragon | Effetto | LOD | Dragon/WIND/4/1900/0 |
| Spirit of Flames | Effetto | LON | Pyro/FIRE/4/1700/1000 |
| Spirit of the Breeze | Effetto | LON | Fairy/WIND/3/0/1800 |
| Steel Scorpion | Effetto | MRD | Machine/EARTH/1/250/300 |
| Swarm of Locusts | Effetto | PGD | Insect/DARK/3/1000/500 |
| Swarm of Scarabs | Effetto | PGD | Insect/DARK/3/500/1000 |
| Tainted Wisdom | Effetto | MRD | Fiend/DARK/3/1250/800 |
| The Bistro Butcher | Effetto | MRD | Fiend/DARK/4/1800/1000 |
| The Fiend Megacyber | Effetto | PSV | Warrior/DARK/6/2200/1200 |
| The Hunter with 7 Weapons | Effetto | LOD | Warrior/EARTH/3/1000/600 |
| The Little Swordsman of Aile | Effetto | MRD | Warrior/WATER/3/800/1300 |
| The Rock Spirit | Effetto | LON | Rock/EARTH/4/1700/1000 |
| The Unfriendly Amazon | Effetto | LON | Warrior/EARTH/4/2000/1000 |
| The Unhappy Maiden | Effetto | MRD | Spellcaster/LIGHT/1/0/100 |
| Throwstone Unit | Effetto | LOD | Warrior/EARTH/4/900/2000 |
| Thunder Nyan Nyan | Effetto | LOD | Thunder/LIGHT/4/1900/800 |
| Timeater | Effetto | PGD | Machine/DARK/6/1900/1700 |
| Troop Dragon | Effetto | LOD | Dragon/WIND/2/700/800 |
| Twin-Headed Wolf | Effetto | LOD | Fiend/DARK/4/1500/1000 |
| Tyrant Dragon | Effetto | LOD | Dragon/FIRE/8/2900/2500 |
| Vampire Baby | Effetto | PSV | Zombie/DARK/3/700/1000 |
| Wandering Mummy | Effetto | PGD | Zombie/EARTH/4/1500/1500 |
| Winged Minion | Effetto | LOD | Fiend/DARK/2/700/700 |
| Winged Sage Falcos | Effetto | PGD | Winged Beast/WIND/4/1700/1200 |
| Witch's Apprentice | Effetto | MRD | Spellcaster/DARK/2/550/500 |
| Woodland Sprite | Effetto | LOD | Plant/EARTH/3/900/400 |
| Yado Karu | Effetto | MRD | Aqua/WATER/4/900/1700 |
| Yomi Ship | Effetto | PGD | Aqua/WATER/3/800/1400 |
| Charubin the Fire Knight | Fusione | LOB | Pyro/FIRE/3/1100/800 |
| Cyber Saurus | Fusione | MRD | Machine/EARTH/5/1800/1400 |
| Dark Balter the Terrible | Fusione | LOD | Fiend/DARK/5/2000/1200 |
| Darkfire Dragon | Fusione | LOB | Dragon/DARK/4/1500/1250 |
| Deepsea Shark | Fusione | MRD | Fish/WATER/5/1900/1600 |
| Dragoness the Wicked Knight | Fusione | LOB | Warrior/WIND/3/1200/900 |
| Empress Judge | Fusione | MRD | Warrior/EARTH/6/2100/1700 |
| Fiend Skull Dragon | Fusione | LOD | Dragon/WIND/5/2000/1200 |
| Flame Ghost | Fusione | LOB | Zombie/DARK/3/1000/800 |
| Flower Wolf | Fusione | LOB | Beast/EARTH/5/1800/1400 |
| Fusionist | Fusione | LOB | Beast/EARTH/3/900/700 |
| Giltia the D. Knight | Fusione | MRD | Warrior/LIGHT/5/1850/1500 |
| Kaminari Attack | Fusione | MRD | Thunder/WIND/5/1900/1400 |
| Karbonala Warrior | Fusione | LOB | Warrior/EARTH/4/1500/1200 |
| Metal Dragon | Fusione | LOB | Machine/WIND/6/1850/1700 |
| Musician King | Fusione | MRD | Spellcaster/LIGHT/5/1750/1500 |
| Punished Eagle | Fusione | MRD | Winged Beast/WIND/6/2100/1800 |
| Reaper on the Nightmare | Fusione | PGD | Zombie/DARK/5/800/600 |
| Roaring Ocean Snake | Fusione | MRD | Aqua/WATER/6/2100/1800 |
| Ryu Senshi | Fusione | LOD | Warrior/EARTH/6/2000/1200 |
| Skull Knight | Fusione | MRD | Spellcaster/DARK/7/2650/2250 |
| The Last Warrior from Another Planet | Fusione | LON | Warrior/EARTH/7/2350/2300 |
| Twin-Headed Thunder Dragon | Fusione | MRD | Thunder/LIGHT/7/2800/2100 |

Nota: alcuni Mostri Fusione richiedono i loro materiali (anch'essi
presi dal nome inglese in tabella) — verificare se il materiale è già
nel dataset (spesso sì, sono carte comuni) prima di implementare la
Fusione stessa, stesso schema già rodato per Santa Giovanna (id 903).
Le Magie/Trappole che questi mostri effetto potrebbero richiedere come
riferimento (es. "Umi" per Deepsea Warrior, già presente id 497) vanno
verificate caso per caso allo stesso modo.

Prossimo ID libero in `data/cards.json`: **1020**.
