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
