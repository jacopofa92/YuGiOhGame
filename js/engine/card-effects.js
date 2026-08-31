/**
 * card-effects.js — Gli effetti delle singole carte.
 * =====================================================================
 * QUESTO è il file da aprire per capire/modificare cosa fa una carta, o
 * per aggiungerne una nuova con un effetto. Ogni carta con un effetto
 * meccanico (non solo testo di flavor) ha qui il suo blocchetto
 * `CardEffects.register(idCarta, { ... })`, con un commento sopra che
 * spiega l'effetto in linguaggio naturale prima del codice — copia un
 * blocchetto esistente simile a quello che vuoi creare come punto di
 * partenza.
 *
 * Il "come funziona" (trigger, finestre di risposta, helper come
 * ctx.destroyMonster/ctx.dealDamage/ctx.banishTemporarily/ecc.) è spiegato
 * in js/engine/duel-engine.js, che va caricato PRIMA di questo file. Qui non c'è
 * altro che le regole delle singole carte.
 *
 * Convenzione per un effetto visivo "grosso" dopo l'attivazione (es. id 7
 * Buco Nero, id 8 Spada Rivelatrice): activateCard() in duel-engine.js
 * scatena GIÀ da solo il pulse della carta a centro schermo (~2s, vedi
 * FX.playCardActivateCenterScreen) prima ancora che activate(ctx) qui
 * sotto giri. Un secondo effetto (vortice, spade che calano, ecc.) deve
 * partire solo DOPO che quel pulse è finito, non a metà — altrimenti si
 * accavallano invece di leggersi in due tempi separati. Usa un
 * `setTimeout(..., FX.ACTIVATE_CENTER_DURATION_MS)` per quel ritardo,
 * mai un numero scritto a mano: se la durata del pulse cambia in
 * effects.js, ogni carta che lo aspetta resta comunque sincronizzata.
 *
 * Convenzione per i SEGNALINI su una carta (es. id 131 Distruttore il
 * Guerriero Magico/Segnalino Magia, id 139 Guardia di Carte/Segnalino
 * Guardia): usa sempre il campo generico `card.counters` (un numero),
 * mai un nome specifico come `magicCounters`/`guardCounters` — anche se
 * sulla carta vera il segnalino ha un nome proprio ("Segnalino Magia"
 * ecc., da usare comunque nei messaggi di log), il campo che lo conta va
 * tenuto unico e generico. Il motivo è che renderFields() in
 * js/engine/game-flow.js mostra IN AUTOMATICO un badge tondo con il numero sopra
 * ogni carta con `counters > 0`, per QUALSIASI carta — un solo posto da
 * aggiornare invece di insegnare alla UI ogni nome di segnalino esistente.
 *
 * Convenzione per l'EVOCAZIONE FUSIONE: un mostro nell'Extra Deck (vedi
 * card.extraDeck/category==='fusion' in cards-db.js) NON ha un `activate`/
 * `canActivate` propri — dichiara solo `fusionMaterials: [idA, idB, ...]`,
 * gli ID esatti delle carte richieste come Materiale. "Fusione" (id 38,
 * Polymerization) e qualunque altra carta che Evochi per Fusione in futuro
 * usano DuelEngine.getFusableExtraDeckMonsters(owner) per trovare quali
 * mostri sono fondibili ORA (materiali già in mano/Terreno) e
 * ctx.fusionSummon(owner, extraDeckIndex, materialLocations) per farlo
 * davvero — vedi js/engine/duel-engine.js per i dettagli. Non serve altro codice
 * per-carta finché il Mostro Fusione non ha ANCHE un effetto proprio oltre
 * alla condizione di Evocazione (in quel caso aggiungi pure `static`/
 * `onSummon`/ecc. nello stesso blocco, come qualunque altro mostro).
 * Variante SENZA la Magia "Fusione" (es. id 511/512 Cannone Drago XY/XYZ):
 * `banishFusionMaterials: [idA, idB, ...]` invece di `fusionMaterials` —
 * il giocatore stesso attiva lo Special Summon cliccando la zona Fusion
 * (non serve nessuna carta Magia), e i materiali vanno bandendoli dal
 * proprio Terreno scoperto, mai dalla mano — vedi
 * DuelEngine.getBanishFusableExtraDeckMonsters/banishFusionSummon.
 *
 * ctx.banishTemporarily(owner, card, returnTrigger) — bando TEMPORANEO con
 * ritorno programmato (es. Buco Dimensionale, Ninja d'Assalto): il
 * chiamante toglie `card` dal Terreno PRIMA di chiamarla; `returnTrigger`
 * è 'standby' (torna alla prossima Standby Phase di `owner`) o 'endphase'
 * (torna alla prossima End Phase, di chiunque). Diverso da un bando
 * "vero" (es. Rilascio dell'Anima, che manda dritto al Cimitero
 * bypassando il Terreno): qui la carta torna da sola in campo, scoperta
 * in Posizione di Attacco — vedi processTemporaryBanishmentReturns in
 * duel-engine.js, chiamata da enterStandbyPhase()/enterEndPhase() in
 * game-flow.js.
 *
 * Le proprietà che una carta può definire:
 *   static(ctx)          — effetto continuo, richiamato ad ogni render
 *                           finché la carta resta scoperta sul campo.
 *   canActivate(ctx)      — deve tornare true/false: si può attivare ORA?
 *                           (se assente, si assume sempre true)
 *   activate(ctx)          — cosa succede quando la carta viene attivata
 *                           manualmente: Magie (dalla mano o Set),
 *                           Trappole Set, o l'effetto Ignition di UN
 *                           MOSTRO GIÀ scoperto sul Terreno (es. Soldato
 *                           Cannone) — in quel caso ctx.zone === 'monster'
 *                           e il mostro NON va al Cimitero né si muove,
 *                           solo il suo effetto si risolve, una volta per
 *                           turno per carta (vedi il ramo zone ===
 *                           'monster' di canActivate/activateCard in
 *                           duel-engine.js).
 *   continuous: true      — SOLO per Magie/Trappole: invece di andare
 *                           subito al Cimitero dopo l'attivazione, la
 *                           carta resta scoperta sul Terreno e il suo
 *                           effetto si applica tramite static() (es.
 *                           Spada Rivelatrice).
 *   onAttackDeclare(ctx)  — la carta può rispondere quando l'AVVERSARIO
 *                           di chi la controlla dichiara un attacco
 *                           (Trappole o effetti da mano come Kuriboh).
 *   activatableFromGraveyard: true — la carta può rispondere anche stando
 *                           nel proprio Cimitero (es. Tartaruga
 *                           Elettromagnetica, id 223: si bandisce dal
 *                           Cimitero per terminare la Battle Phase
 *                           avversaria) — opt-in esplicito, altrimenti
 *                           nessuna carta nel Cimitero viene mai offerta
 *                           come risposta a un trigger reattivo (vedi
 *                           findTriggerCandidates in duel-engine.js).
 *                           canActivate(ctx) resta il posto giusto per
 *                           condizioni come "una volta per Duello"
 *                           (ctx.hasUsedOncePerDuel/markUsedOncePerDuel).
 *   onOpponentSummon(ctx) — la carta può rispondere quando l'AVVERSARIO
 *                           di chi la controlla Evoca un mostro (es.
 *                           Buco Trappola).
 *   onOwnMonsterSummoned(ctx) — SOLO per Magie/Trappole Continue (zona
 *                           'st') o la Magia Terreno: reagisce quando un
 *                           mostro del PROPRIO controllore viene Evocato
 *                           Normalmente o Special Summonato, da qualsiasi
 *                           zona (es. Terreno di Caccia delle Arpie id
 *                           788). ctx.summonedCard/summonedVia
 *                           ('normal'\'special') come per
 *                           ON_NORMAL_SUMMON/ON_SPECIAL_SUMMON.
 *                           SEMPLIFICAZIONE: un solo rispondente automatico
 *                           (il primo eleggibile, 'st' prima della Magia
 *                           Terreno), niente vera finestra di priorità —
 *                           stesso schema di onOwnMonsterDestroyed/
 *                           onEnemyMonsterDestroyed.
 *   onBattled(ctx)         — si attiva alla fine del Damage Step se QUESTO
 *                           mostro ha combattuto (attaccando o difendendo)
 *                           ED È SOPRAVVISSUTO a quella battaglia —
 *                           indipendentemente da chi vince/perde/pareggia
 *                           (a differenza di onDealsBattleDamage, solo
 *                           quando l'attaccante infligge danno; MAI per un
 *                           attacco diretto). ctx.card è questa carta
 *                           stessa (per trovare il proprio slot attuale,
 *                           es. per bandirsi — vedi Guerriero D.D. id
 *                           179), ctx.opponentCard è l'altro mostro
 *                           coinvolto, ctx.opponentSurvived se anche lui è
 *                           sopravvissuto alla stessa battaglia (es. Testa
 *                           di Martello Iper id 800).
 *                           SEMPLIFICAZIONE: mai per una carta appena
 *                           distrutta in QUESTA battaglia (niente "ultima
 *                           informazione nota"). Vedi fireOwnBattled in
 *                           actions.js.
 *   onEquippedMonsterBattled(ctx) — SOLO per Carte Equipaggiamento
 *                           (isEquip): come onBattled qui sopra, ma per il
 *                           mostro a cui questa carta è agganciata invece
 *                           che per se stessa (es. Pugno Ingranaggio
 *                           Antico id 840). ctx.equippedCard/opponentCard/
 *                           opponentSurvived come sopra.
 *   onDestroyedInBattle(ctx) — si attiva quando QUESTO mostro viene
 *                           distrutto in QUESTA battaglia (chiamato dal
 *                           lato del suo proprietario, subito dopo la
 *                           distruzione) — a differenza di onDestroy
 *                           (qualunque causa di distruzione), qui
 *                           ctx.destroyerCard è SEMPRE noto: il mostro
 *                           avversario che l'ha appena distrutta in
 *                           battaglia (es. Guerriero di Ardesia id 776:
 *                           "il mostro che l'ha distrutta perde 500
 *                           ATK/DEF"). Vedi fireOwnBattled in actions.js.
 *   onEnemyMonsterSummoned(ctx) — reazione MANDATORIA (non una Chain/
 *                           scelta come onOpponentSummon) di QUESTO
 *                           mostro quando l'AVVERSARIO evoca un mostro,
 *                           Normalmente o Special — es. Slifer il Drago
 *                           del Cielo (id 31). ctx.summonedCard/
 *                           summonedOwner/summonedSlotIndex/
 *                           summonedPosition/summonedVia. SEMPLIFICAZIONE:
 *                           un solo rispondente automatico (il primo
 *                           eleggibile in campo), stesso schema di
 *                           onEnemyMonsterDestroyed.
 *   onFlip(ctx)            — si attiva quando QUESTO mostro viene girato
 *                           scoperto in battaglia (era coperto, l'ha
 *                           attaccato o è sopravvissuto rivelandosi) —
 *                           NON scatta se la carta viene distrutta nello
 *                           stesso momento in cui si rivela.
 *   onDestroy(ctx)         — si attiva quando QUESTO mostro viene
 *                           distrutto e mandato al Cimitero (in battaglia,
 *                           tramite resolveBattleDamage in actions.js, o
 *                           da un effetto, tramite ctx.destroyMonster/
 *                           destroyAllMonsters). ctx.card è la carta stessa
 *                           (già rimossa dal campo, già nel Cimitero).
 *                           SEMPLIFICAZIONE per tutte le carte che lo
 *                           usano: solo distruzione, non ogni possibile
 *                           modo di finire al Cimitero (es. scarto, o un
 *                           effetto che manda al Cimitero senza distruggere).
 *                           ctx.destroyedByOpponentCard: SOLO se distrutto
 *                           in battaglia, l'ALTRO mostro coinvolto in
 *                           quello scontro (chi ha attaccato, se questo
 *                           era il difensore; chi difendeva, se questo
 *                           era l'attaccante) — es. Ossigeddon (id 804):
 *                           "se distrutta in battaglia da un mostro Tipo
 *                           Piroico". null per una distruzione da effetto
 *                           Carta (ACTIONS.destroyMonster/destroyAllMonsters),
 *                           dove non esiste un "altro mostro della
 *                           battaglia" concettualmente.
 *                           ctx.destroyedByOwner: chi ha CAUSATO la
 *                           distruzione (es. Signore dei Vampiri, id 658:
 *                           "distrutta da un effetto DELL'AVVERSARIO") —
 *                           'player'/'bot'/null, letto da `this.owner`
 *                           dentro ACTIONS.destroyMonster (duel-engine.js):
 *                           valido per OGNI distruzione da effetto Carta
 *                           (anche di massa, es. Buco Nero), null per una
 *                           distruzione in battaglia o per una chiamata
 *                           interna senza un vero ctx dietro (es.
 *                           clearTemporaryAtkDefBonus).
 *                           ctx.wasFaceDown/wasPosition: coperta/Posizione
 *                           al momento della distruzione da effetto Carta
 *                           (es. Falena della Sabbia, id 766) — undefined
 *                           per una distruzione in battaglia.
 *   onSentToGraveyardFromHand(ctx) — si attiva quando QUESTA carta, ferma
 *                           in mano, viene scartata a caso e mandata al
 *                           Cimitero tramite ctx.discardRandomFromHand(owner)
 *                           (duel-engine.js) — l'helper condiviso usato da
 *                           ogni "il tuo avversario scarta 1 carta a caso"
 *                           di questo file (es. Cappello Magico Bianco id
 *                           591). NON scatta per ogni altro modo di finire
 *                           al Cimitero dalla mano (scarto come costo di
 *                           attivazione, scarto di una carta SCELTA invece
 *                           che casuale, mandata al Cimitero da un
 *                           effetto che non passa da quell'helper) — vale
 *                           la stessa SEMPLIFICAZIONE già accettata per
 *                           onDestroy qui sopra, ma ancora più stretta.
 *                           ctx.discardedByOwner: chi ha causato lo scarto
 *                           (letto da `this.owner` dentro l'helper, stesso
 *                           schema di ctx.destroyedByOwner sopra) — es.
 *                           Mummia Rigenerante (id 667): "se questa carta
 *                           viene mandata dalla tua mano al Cimitero da un
 *                           effetto dell'AVVERSARIO" si legge come
 *                           `ctx.discardedByOwner === ctx.opponent`.
 *   onSTDestroyed(ctx)     — si attiva quando QUESTA Magia/Trappola (in
 *                           zona 'st', Set o scoperta) viene distrutta
 *                           tramite ctx.destroySpellTrap(owner, index)
 *                           (duel-engine.js) — es. Bara Oscura (id 792):
 *                           "quando questa carta Set viene distrutta e
 *                           mandata al Cimitero...". NON scatta per ogni
 *                           altro modo di finire al Cimitero da quella
 *                           zona (attivazione normale/Trappola risolta,
 *                           un effetto che la RIMANDA in mano invece di
 *                           distruggerla) — solo per le chiamate che
 *                           passano da quell'helper condiviso, oggi solo
 *                           le carte che distruggono ESPLICITAMENTE una
 *                           Magia/Trappola avversaria (Piumino delle
 *                           Arpie id 291, Freccia Spezza-Magie id 352,
 *                           Attacco Magico Oscuro id 748, Drago da
 *                           Compagnia delle Arpie id 786, Ingegnere
 *                           Ingranaggio Antico id 826). ctx.wasFaceDown
 *                           distingue Set da scoperta al momento della
 *                           distruzione; ctx.destroyedByOwner chi ha
 *                           causato la distruzione (stesso schema di
 *                           destroyedByOwner/discardedByOwner sopra).
 *   onOpponentStandbyPhase(ctx) — SOLO per Magie/Trappole Continue (zona
 *                           'st'): a differenza di onStandbyPhase qui
 *                           sotto (sempre il proprio controllore), questo
 *                           si attiva durante la Standby Phase
 *                           dell'AVVERSARIO di chi controlla la carta —
 *                           es. L'Occhio della Verità (id 466).
 *                           ctx.standbyOwner è chi sta vivendo quella
 *                           Standby Phase (l'avversario), ctx.owner resta
 *                           il controllore di QUESTA carta come sempre.
 *   onBattlePhaseEnd(ctx)  — si attiva alla fine della Battle Phase del
 *                           turno corrente, su ENTRAMBI i lati (a
 *                           differenza di onStandbyPhase/onEndPhase qui
 *                           sotto, solo il proprietario di turno — un
 *                           mostro può aver combattuto anche da
 *                           difensore, quindi appartenere all'altro
 *                           giocatore), MA SOLO se quella Battle Phase è
 *                           davvero avvenuta (mai se il turno l'ha
 *                           saltata) — es. Bestia Mitica Cerbero (id
 *                           734): "se questa carta ha combattuto,
 *                           rimuovi tutti i Segnalini Magia"; Cavaliere
 *                           del Miraggio (id 381): "se ha attaccato o è
 *                           stata attaccata, bandiscila". Per "ha
 *                           combattuto", controlla
 *                           ctx.card.battledThisBattlePhase (scritto da
 *                           fireOwnBattled in actions.js per OGNI carta
 *                           che sopravvive a una battaglia — azzeralo tu
 *                           stesso dopo averlo letto, si auto-consuma).
 *   onStandbyPhase(ctx)    — si attiva durante la TUA Standby Phase,
 *                           mentre questa carta (mostro o Magia/Trappola
 *                           Continua) resta scoperta sul Terreno — vedi
 *                           firePhaseTrigger in duel-engine.js, chiamata
 *                           da enterStandbyPhase() in game-flow.js.
 *   onEndPhase(ctx)        — come onStandbyPhase(ctx), ma durante la TUA
 *                           End Phase. ctx.slotIndex (mostri) permette di
 *                           modificare/svuotare il proprio slot (es. per
 *                           sacrificarsi).
 *   onPositionChange(ctx)  — si attiva quando QUESTO mostro, già scoperto
 *                           sul Terreno, cambia Posizione di Battaglia
 *                           (Attacco<->Difesa) — che sia per scelta del suo
 *                           controllore (changeMonsterPosition in
 *                           actions.js) o per effetto di un'ALTRA carta
 *                           (es. Stop Difesa id 69, Vaso Cattura-Drago id
 *                           206): stessa identica reazione, la fonte non
 *                           conta. ctx.fromPosition/ctx.toPosition sono
 *                           'attack'/'defense'. Vedi ctx.changePosition
 *                           per forzare tu stesso un cambio di Posizione
 *                           da un altro effetto (es. id 530/531).
 *   onCardActivated(ctx)   — si attiva quando UNA QUALSIASI carta (di
 *                           entrambi i giocatori) viene attivata tramite
 *                           activateCard() — Magie, Trappole già Set,
 *                           effetti Ignition — ECCETTO questa carta stessa
 *                           (già esclusa in automatico). ctx.activatedCard/
 *                           activatedOwner descrivono cosa/chi ha scatenato
 *                           il trigger; ctx.card resta QUESTA carta (quella
 *                           con l'effetto), come per onDestroy/onFlip. Se
 *                           l'effetto è vincolato a "una volta per turno",
 *                           filtralo con canActivateOnCardActivated(ctx) e
 *                           usa ctx.hasUsedOncePerTurn/markUsedOncePerTurn
 *                           (es. Signore del Rosso, id 354). SEMPLIFICAZIONE:
 *                           scatta solo dalle attivazioni manuali, non dalle
 *                           Trappole automatiche di risposta (onAttackDeclare/
 *                           onOpponentSummon qui sopra).
 *   damageStepBonus(ctx)   — mostro attaccante O difensore in battaglia:
 *                           ritorna { atk, def } di bonus valido SOLO per
 *                           QUESTO calcolo danni (Damage Step), non
 *                           persistente come gameState.atkDefBonus. ctx =
 *                           { card, opponentCard, role } dove role è
 *                           'attacker'/'defender' e opponentCard è l'altro
 *                           mostro coinvolto (null per un attacco diretto).
 *   canSpecialSummonFromHand(ctx) — SOLO per mostri: deve tornare true/false,
 *                           "posso Special Summonare questa carta dalla
 *                           mano ADESSO?" (es. Gilasaurus, sempre vero;
 *                           Il Demone Megacyber, solo se l'avversario ha
 *                           2+ mostri in più di te). Cliccando il mostro
 *                           in mano, se questo è vero, l'UI offre la
 *                           scelta tra Evocazione Normale e Special
 *                           Summon — vedi DuelEngine.canSpecialSummonFromHand/
 *                           trySpecialSummonFromHand.
 *   paySpecialSummonCost(ctx) — opzionale, solo insieme al campo qui sopra:
 *                           paga un eventuale costo (es. sacrificare 1
 *                           mostro) PRIMA che la carta lasci la mano;
 *                           torna false per annullare l'intera Special
 *                           Summon se il costo non è pagabile.
 *   onEquipped(ctx)        — si attiva su QUESTO mostro quando gli viene
 *                           agganciata una Carta Equipaggiamento
 *                           (qualsiasi, non solo una specifica) — es.
 *                           Gearfried il Maestro di Spada (id 258):
 *                           "ogni volta che questa carta viene
 *                           equipaggiata: distruggi 1 mostro
 *                           dell'avversario". ctx.equipCard è la Carta
 *                           Equipaggiamento appena agganciata. Scatta da
 *                           attachEquip(ctx, index) qui sopra, quindi
 *                           per QUALUNQUE Carta Equipaggiamento di questo
 *                           file, non solo carte specifiche.
 *   isUnion: true          — SOLO per Mostri Union (es. Testa di Drago Y
 *                           id 513): un mostro che, tramite un proprio
 *                           effetto Ignition dalla zona Mostro (usa
 *                           attachUnionMonster(ctx, filterFn) qui sopra),
 *                           si aggancia a un altro mostro come una Carta
 *                           Equipaggiamento — insieme a isEquip:true (per
 *                           il bonus statico via static(), come ogni
 *                           altro Equip) e unionTargetFilter (per
 *                           permettere ad altre carte come Avanti Tutta!
 *                           id 853 di trovarne uno idoneo nel Cimitero).
 *                           Se il bersaglio a cui è agganciato lascia il
 *                           campo, torna da solo sul Terreno scoperto in
 *                           Attacco (o al Cimitero se non c'è spazio) —
 *                           vedi recomputeStaticEffects in duel-engine.js.
 *                           Nel proprio static(), controlla sempre prima
 *                           `if (!ctx.card.equippedToOwner) return;`:
 *                           finché è ancora un mostro (non agganciato),
 *                           static() viene comunque chiamato come per
 *                           ogni mostro scoperto sul Terreno.
 *   isEquip: true          — SOLO per Magie Equipaggiamento: da usare
 *                           insieme a continuous:true. Segnala a
 *                           recomputeStaticEffects() (duel-engine.js) di
 *                           controllare, ad ogni render, che il mostro
 *                           in card.equippedToOwner/Index/Uid sia ancora
 *                           lì — altrimenti manda la carta al Cimitero da
 *                           sola, PRIMA di chiamare il suo static() (che
 *                           applica il bonus vero e proprio via
 *                           gameState.atkDefBonus, come ogni altro buff
 *                           continuo). Usa findEquipTarget(ctx, filterFn)/
 *                           attachEquip(ctx, index) qui sotto in
 *                           activate() per scegliere ed agganciare il
 *                           bersaglio (sceglie da sola il primo mostro
 *                           idoneo, stessa SEMPLIFICAZIONE delle altre
 *                           selezioni di bersaglio in questo file).
 *
 * NIENTE Pendulum/XYZ/Link/Synchro: questo gioco segue le regole della
 * prima serie di Yu-Gi-Oh (Evocazione Normale/Tributo, Flip, Fusione,
 * Magie/Trappole Normali/Continue/Campo).
 */
(function () {
    'use strict';

    // ================================================================
    // Helper condivisi per le Carte Equipaggiamento (vedi isEquip qui
    // sopra). Non sono carte: sono funzioni di supporto usate da più
    // register() qui sotto, per non ripetere la stessa logica ~25 volte.
    // ================================================================

    /**
     * Vero se `card` conta come "Lady Arpia" ai fini di QUALUNQUE effetto
     * di supporto Arpia — non solo la vera "Lady Arpia" (id 288, incluse
     * le varianti "Lady Arpia 1/2/3", id 782/783/784) ma anche Arpia Cyber
     * (id 172), il cui testo reale è "il nome di questa carta è sempre
     * considerato 'Lady Arpia'" (vedi cards.json): per regola vera, quella
     * dicitura la rende un bersaglio legittimo per OGNI riferimento al
     * nome "Lady Arpia" in un testo altrui, sempre — non un'abilità
     * propria da attivare, ecco perché id 172 non ha una sua registrazione
     * qui: questo helper è l'unico "effetto" che le serve, usato da ogni
     * altra carta di supporto Arpia in questo file al posto di un
     * controllo diretto sul nome/id. Stesso discorso per la clausola
     * "trattata come Lady Arpia" di Lady Arpia 2 (id 783): già coperta qui
     * da startsWith('Lady Arpia'), nessuna registrazione dedicata serve
     * per quella parte del suo testo (la seconda clausola, sull'annullare
     * gli effetti Flip dei mostri che distrugge in battaglia, è invece
     * già garantita per costruzione altrove — vedi il commento su
     * TRIGGER.ON_FLIP in resolveBattleDamage, actions.js).
     */
    function isHarpieLadySupport(card) {
        if (!card) return false;
        if (card.id === 172) return true;
        return !!(card.name && card.name.startsWith('Lady Arpia'));
    }

    /**
     * Trova il primo mostro scoperto idoneo sul proprio Terreno a cui
     * equipaggiare una carta — `filterFn(card)` opzionale per restrizioni
     * (es. solo Incantatore, solo LUCE). Esclude sempre i mostri che
     * rifiutano le Carte Equipaggiamento (def.rejectsEquip — es. Gearfried
     * il Cavaliere di Ferro, id 16). Torna -1 se nessuno è idoneo.
     */
    function findEquipTarget(ctx, filterFn) {
        return ctx.field(ctx.owner).findIndex((slot) => {
            if (!slot || slot.isFaceDown) return false;
            if (filterFn && !filterFn(slot.card)) return false;
            const targetDef = DuelEngine.getDefinition(slot.card.id);
            if (targetDef && targetDef.rejectsEquip) return false;
            return true;
        });
    }

    /** Aggancia ctx.card (la Carta Equipaggiamento appena attivata) al mostro nello slot `index` del proprio Terreno. */
    function attachEquip(ctx, index) {
        const target = ctx.field(ctx.owner)[index].card;
        ctx.card.equippedToOwner = ctx.owner;
        ctx.card.equippedToIndex = index;
        ctx.card.equippedToUid = target.uid;
        ctx.log(`⚔️ ${ctx.card.name} equipaggiata a ${target.name}!`);
        // "Ogni volta che questa carta viene equipaggiata con una Carta
        // Equipaggiamento" (es. Gearfried il Maestro di Spada, id 258):
        // reazione del BERSAGLIO stesso (target), non della Carta
        // Equipaggiamento appena agganciata (ctx.card) — nuovo hook
        // generico, riusabile da ogni futuro mostro con lo stesso testo.
        const targetDef = DuelEngine.getDefinition(target.id);
        if (targetDef && typeof targetDef.onEquipped === 'function') {
            targetDef.onEquipped(DuelEngine.makeContext(ctx.owner, { card: target, slotIndex: index, equipCard: ctx.card }));
        }
    }

    /** Il mostro a cui ctx.card (una Carta Equipaggiamento) è attualmente equipaggiata — sempre valido quando static() viene chiamato (vedi recomputeStaticEffects). */
    function equippedTarget(ctx) {
        return ctx.field(ctx.card.equippedToOwner)[ctx.card.equippedToIndex].card;
    }

    /**
     * Attiva l'aggancio di un mostro Union (def.isUnion — es. Testa di
     * Drago Y id 513, Piattaforma di Supporto Mech Pesante id 831) dalla
     * zona Mostro (dov'è ctx.index) alla zona Magia/Trappola come una
     * Carta Equipaggiamento — usa lo stesso attachEquip qui sopra, poi
     * sposta la carta stessa da fieldOf a stFieldOf. Torna false (nessun
     * effetto) se non c'è un bersaglio idoneo o nessuna casella Magia/
     * Trappola libera. Il ritorno automatico sul Terreno quando il
     * bersaglio non è più valido vive in recomputeStaticEffects
     * (duel-engine.js, def.isUnion). SEMPLIFICAZIONE: unico modo per
     * staccarsi è che il bersaglio lasci il campo — manca lo stacco
     * VOLONTARIO mentre il bersaglio resta valido, che richiederebbe una
     * nuova interazione "riattiva una Carta Equipaggiamento già in
     * campo", non ancora presente nel motore.
     */
    function attachUnionMonster(ctx, filterFn) {
        // Esclude sempre se stessa dai bersagli idonei: un mostro Union
        // il cui unionTargetFilter è ampio (es. Piattaforma di Supporto
        // Mech Pesante id 831: "qualsiasi mostro Tipo Macchina", e lei
        // stessa lo è) non deve mai potersi agganciare a se stessa.
        const targetIndex = findEquipTarget(ctx, (c) => c.uid !== ctx.card.uid && (!filterFn || filterFn(c)));
        if (targetIndex === -1) return false;
        const ownField = ctx.field(ctx.owner);
        if (ctx.index == null || !ownField[ctx.index] || ownField[ctx.index].card.uid !== ctx.card.uid) return false;
        const freeStSlot = ctx.stField(ctx.owner).findIndex((s) => s === null);
        if (freeStSlot === -1) {
            ctx.log(`⚠️ Nessuna casella Magia/Trappola libera: ${ctx.card.name} non può agganciarsi.`);
            return false;
        }
        ownField[ctx.index] = null;
        attachEquip(ctx, targetIndex);
        ctx.stField(ctx.owner)[freeStSlot] = { card: ctx.card, isFaceDown: false, setOnTurn: gameState.turn };
        return true;
    }

    /**
     * Livello totale MASSIMO sacrificabile per un'Evocazione Rituale, dal
     * Terreno E dalla mano (esclusa la carta rituale stessa in mano, indice
     * `ritualHandIndex`) — regola generica di ogni Evocazione Rituale
     * reale (i Sacrifici possono venire da entrambe le zone), usata da
     * canActivate per il pre-check "ne ho abbastanza".
     */
    function maxRitualTributeLevel(ctx, ritualHandIndex) {
        const fieldTotal = ctx.field(ctx.owner).reduce((sum, slot) => sum + (slot ? (slot.card.level || 0) : 0), 0);
        const handTotal = ctx.hand(ctx.owner).reduce((sum, c, i) => sum + (i === ritualHandIndex ? 0 : (c.level || 0)), 0);
        return fieldTotal + handTotal;
    }

    /**
     * Sceglie ed esegue i Sacrifici per un'Evocazione Rituale, dal Terreno
     * E dalla mano (esclusa `ritualHandIndex`, la carta rituale stessa) —
     * greedy dai Livelli più alti al più basso finché il totale richiesto
     * è raggiunto (stessa SEMPLIFICAZIONE già dichiarata per Rito del
     * Guerriero Nero/id 56: nessuna selezione manuale come nell'Evocazione
     * Tributo). Manda tutti i sacrificati al Cimitero. Rimuove dal campo
     * PRIMA (indici stabili), poi dalla mano in ordine di indice
     * decrescente (per non spostare gli indici già raccolti).
     */
    function performRitualTribute(ctx, requiredLevel, ritualHandIndex) {
        const field = ctx.field(ctx.owner);
        const hand = ctx.hand(ctx.owner);
        const pool = field.map((slot, index) => (slot ? { source: 'field', index: index, level: slot.card.level || 0 } : null)).filter(Boolean)
            .concat(hand.map((c, index) => (index !== ritualHandIndex ? { source: 'hand', index: index, level: c.level || 0 } : null)).filter(Boolean))
            .sort((a, b) => b.level - a.level);
        let remaining = requiredLevel;
        const toSacrifice = [];
        pool.forEach((entry) => {
            if (remaining <= 0) return;
            toSacrifice.push(entry);
            remaining -= entry.level;
        });
        toSacrifice.filter((e) => e.source === 'field').forEach((entry) => {
            ctx.graveyard(ctx.owner).push(field[entry.index].card);
            field[entry.index] = null;
        });
        toSacrifice.filter((e) => e.source === 'hand').sort((a, b) => b.index - a.index).forEach((entry) => {
            const [card] = hand.splice(entry.index, 1);
            ctx.graveyard(ctx.owner).push(card);
        });
    }

    // ================================================================
    // 110 — Drago Berserk / Berserk Dragon
    // Deve essere Special Summonato tramite "Patto col Sovrano Oscuro"
    // (id 78, già registrata: chiama ctx.specialSummon direttamente, non
    // bloccato da cannotBeSpecialSummoned qui sotto — stesso schema già
    // usato per Cavaliere del Miraggio id 381) e non può esserlo in
    // altro modo. Può attaccare tutti i mostri dell'avversario, una
    // volta ciascuno — stesso identico meccanismo/stessa SEMPLIFICAZIONE
    // di Tiranno Definitivo (id 807: nessun tracciamento di QUALE mostro
    // avversario sia già stato colpito, il conteggio "fotografa" il
    // massimo visto in questo turno dentro onOwnAttackDeclare). Ad ogni
    // propria End Phase: perde 500 ATK (permanente, non un bonus
    // temporaneo — stesso stile diretto di Drago Megaroccia id 763).
    // ================================================================
    CardEffects.register(110, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        onOwnAttackDeclare(ctx) {
            const self = ctx.field(ctx.owner)[ctx.attackerIndex].card;
            const enemyCount = ctx.field(ctx.opponent).filter((s) => s).length;
            if (self.__berserkDragonSnapshotTurn !== gameState.turn) {
                self.__berserkDragonSnapshotTurn = gameState.turn;
                self.__berserkDragonMaxEnemyCount = enemyCount;
            } else if (enemyCount > self.__berserkDragonMaxEnemyCount) {
                self.__berserkDragonMaxEnemyCount = enemyCount;
            }
        },
        getExtraAttackCount(ctx) {
            return Math.max(0, (ctx.card.__berserkDragonMaxEnemyCount || 0) - 1);
        },
        onEndPhase(ctx) {
            ctx.card.attack = Math.max(0, (ctx.card.attack || 0) - 500);
            ctx.log(`🐉 Drago Berserk perde 500 ATK (ora ${ctx.card.attack})!`);
        }
    });

    // ================================================================
    // 111 — Anima del Berserker / Berserker Soul (Magia Rapida)
    // Quando un tuo mostro infligge 1500 o meno danni con un attacco
    // diretto: scarta tutta la mano (min. 1); scava la prima carta del
    // Deck e, se è un mostro, mandala al Cimitero e infliggi 500 danni,
    // poi ripeti fino a 7 volte o finché non scopri una carta non-
    // mostro (rimessa in cima al Deck). Una volta per turno. Stesso
    // schema di Benedizione di Sebek (id 813): legge
    // gameState.directAttackDamageFor[ctx.owner] (impostato in
    // resolveAttack/actions.js) invece di un vero aggancio reattivo "nel
    // momento", dato che il testo reale non richiede una risposta
    // immediata, solo che l'attacco diretto sia già accaduto in questo
    // turno. "Cima del Deck" = fine dell'array (stesso verso di
    // drawCardsToHand/pop, game-flow.js).
    // ================================================================
    CardEffects.register(111, {
        canActivate(ctx) {
            const dmg = gameState.directAttackDamageFor && gameState.directAttackDamageFor[ctx.owner];
            if (!dmg || dmg > 1500) return false;
            if (ctx.hasUsedOncePerTurn(`111:${ctx.owner}`)) return false;
            return Array.isArray(gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck']);
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`111:${ctx.owner}`);
            const hand = ctx.hand(ctx.owner);
            const discarded = hand.splice(0, hand.length);
            discarded.forEach((c) => ctx.graveyard(ctx.owner).push(c));
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            let monsters = 0;
            for (let i = 0; i < 7 && deck.length > 0; i++) {
                const card = deck.pop();
                if (card.type === 'monster') {
                    ctx.graveyard(ctx.owner).push(card);
                    ctx.dealDamage(ctx.opponent, 500);
                    monsters++;
                } else {
                    deck.push(card);
                    break;
                }
            }
            gameState[countKey] = deck.length;
            ctx.log(`💀 Anima del Berserker scarta ${discarded.length} cart${discarded.length === 1 ? 'a' : 'e'} e scava ${monsters} mostr${monsters === 1 ? 'o' : 'i'} dal Deck: ${monsters * 500} danni!`);
        }
    });

    // ================================================================
    // CARTE EQUIPAGGIAMENTO — raggruppate qui tutte insieme (invece che
    // sparse per id come il resto del file) perché condividono lo stesso
    // schema: continuous:true + canActivate/activate con
    // findEquipTarget/attachEquip + isEquip:true + static() che applica il
    // bonus tramite gameState.atkDefBonus. Per le carte con un secondo
    // effetto più complesso (es. Falce del Mietitore, non presente in
    // questo database la carta a cui è vincolata) si implementa solo il
    // bonus ATK/DEF di base, documentato caso per caso.
    // ================================================================

    // 117 — Ciondolo Nero / Black Pendant: +500 ATK, qualsiasi mostro.
    // SEMPLIFICAZIONE: manca "quando mandata al Cimitero: 500 danni".
    CardEffects.register(117, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
        }
    });

    // 127 — Libro delle Arti Segrete / Book of Secret Arts: +300 ATK/+300 DEF, solo Incantatore.
    CardEffects.register(127, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Incantatore') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.race === 'Incantatore'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 300, def: e.def + 300 };
        }
    });

    // 135 — Pugnale Farfalla - Elma: +300 ATK, qualsiasi mostro.
    // SEMPLIFICAZIONE: manca "quando mandata al Cimitero: puoi farla tornare in mano".
    CardEffects.register(135, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 300, def: e.def };
        }
    });

    // 145 — Spada Celeste - Eatos / Sky Sword - Eatos: +500 ATK, qualsiasi mostro.
    // SEMPLIFICAZIONE: manca la clausola legata a "Guardian Eatos", non presente in questo database.
    CardEffects.register(145, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
        }
    });

    // ================================================================
    // 174 — Predone Cyber / Cyber Raider
    // Se questa carta viene Evocata: attiva 1 di questi effetti — distruggi
    // 1 Magia Equipaggiamento sul Terreno (di uno qualunque dei due
    // giocatori), oppure equipaggiala a questa carta. "Rubare" un Equip
    // NON sposta la carta di zona: resta nella casella Magia/Trappola di
    // chi l'aveva attivata (il suo Cimitero di destinazione futuro non
    // cambia), cambia solo il puntatore equippedToOwner/Index/Uid verso
    // Predone Cyber — esattamente i 3 campi che attachEquip() imposta per
    // un'attivazione normale, qui riassegnati direttamente.
    // ================================================================
    CardEffects.register(174, {
        onSummon(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.type === 'spell' && slot.card.subtype === 'equip') {
                        candidates.push({ owner, index, card: slot.card });
                    }
                });
            });
            if (candidates.length === 0) return;

            const destroy = (choice) => {
                ctx.graveyard(choice.owner).push(choice.card);
                ctx.stField(choice.owner)[choice.index] = null;
                ctx.log(`💥 Predone Cyber distrugge ${choice.card.name}!`);
            };
            const steal = (choice) => {
                choice.card.equippedToOwner = ctx.owner;
                choice.card.equippedToIndex = ctx.summonedSlotIndex;
                choice.card.equippedToUid = ctx.summonedCard.uid;
                ctx.log(`🔧 Predone Cyber ruba ${choice.card.name} e la equipaggia a sé stesso!`);
            };

            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                // IA: preferisce rubare una Carta Equipaggiamento
                // dell'avversario (doppio vantaggio: la toglie a lui E la
                // usa lei), altrimenti distrugge la prima disponibile.
                const enemyOne = candidates.find((c) => c.owner === ctx.opponent);
                if (enemyOne) steal(enemyOne); else destroy(candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🤖 Predone Cyber',
                text: 'Scegli 1 Carta Equipaggiamento sul Terreno: poi decidi se distruggerla o rubarla.',
                onSelect: (card) => {
                    const choice = candidates.find((c) => c.card.uid === card.uid);
                    window.DuelEngineUI.openChoicePopover(null, {
                        title: choice.card.name,
                        choiceA: { label: 'Distruggi', icon: '💥', onSelect: () => destroy(choice) },
                        choiceB: { label: 'Rubala', icon: '🔧', onSelect: () => steal(choice) }
                    });
                }
            });
        }
    });

    // 175 — Scudo Cyber / Cyber Shield: +500 ATK, solo "Lady Arpia" (id 288, incluso Arpia Cyber id 172 — vedi isHarpieLadySupport) o "Sorelle Lady Arpia" (id 290).
    CardEffects.register(175, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => isHarpieLadySupport(c) || c.id === 290) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => isHarpieLadySupport(c) || c.id === 290); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
        }
    });

    // ================================================================
    // 178 — Laser Ciclone / Cyclon Laser (Equipaggiamento, solo Gradius
    // id 274)
    // +300 ATK e danno da battaglia perforante (gameState.piercingUidsFor,
    // stesso meccanismo già usato da Impatto Meteora Fatato id 233 qui
    // sotto) — nel testo reale la perforazione si applica solo quando
    // l'ATK equipaggiato supera la DEF del bersaglio, ma è esattamente
    // la condizione generale con cui la perforazione già scatta in
    // questo motore (mai quando ATK <= DEF), quindi nessuna clausola in
    // più da scrivere qui.
    // ================================================================
    CardEffects.register(178, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.id === 274) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.id === 274); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 300, def: e.def };
            gameState.piercingUidsFor[ctx.owner].add(t.uid);
        }
    });

    // ================================================================
    // 179 — Guerriero D.D. / D.D. Warrior (onBattled)
    // Dopo il calcolo dei danni, se questa carta ha combattuto ed è
    // sopravvissuta alla battaglia (niente "ultima informazione nota" se
    // perde lo scontro, stessa SEMPLIFICAZIONE di Ryu Kokki id 663):
    // bandisce (zona Bandite, ctx.banish — rimozione diretta dal Terreno,
    // NON tramite ctx.destroyMonster: bandire non è "distruggere", niente
    // trigger ON_DESTROY) sia se stessa sia il mostro avversario con cui
    // ha combattuto. Se l'avversario è già stato distrutto dal normale
    // esito della battaglia, non c'è nulla da bandire in più: già andato
    // al Cimitero, stesso risultato pratico visibile.
    // ================================================================
    CardEffects.register(179, {
        onBattled(ctx) {
            if (ctx.opponentSurvived) {
                const oppField = ctx.field(ctx.opponent);
                const oppIdx = oppField.findIndex((s) => s && s.card.uid === ctx.opponentCard.uid);
                if (oppIdx !== -1) {
                    const oppCard = oppField[oppIdx].card;
                    oppField[oppIdx] = null;
                    ctx.banish(ctx.opponent, oppCard);
                    ctx.log(`⚔️ Guerriero D.D. bandisce ${ctx.opponentCard.name}!`);
                }
            }
            const ownField = ctx.field(ctx.owner);
            const ownIdx = ownField.findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (ownIdx !== -1) {
                ownField[ownIdx] = null;
                ctx.banish(ctx.owner, ctx.card);
                ctx.log('⚔️ Guerriero D.D. bandisce se stesso dopo aver combattuto!');
            }
        }
    });

    // 208 — Artigli di Drago: +600 ATK, solo OSCURITÀ.
    // SEMPLIFICAZIONE: manca l'immunità agli effetti distruttivi dell'avversario.
    CardEffects.register(208, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.attribute === 'OSCURITÀ') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.attribute === 'OSCURITÀ'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 600, def: e.def };
        }
    });

    // 225 — Luce dell'Elfo / Elf's Light: +400 ATK/-200 DEF, solo LUCE.
    CardEffects.register(225, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.attribute === 'LUCE') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.attribute === 'LUCE'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 400, def: e.def - 200 };
        }
    });

    // ================================================================
    // 276 — Tombarolo / Graverobber (Trappola Normale)
    // Sceglie 1 Magia Normale/Rapida dal Cimitero dell'avversario (auto:
    // la prima trovata che può davvero attivarsi ORA, dal punto di vista
    // di ctx.owner) e la usa SUBITO come parte della risoluzione di
    // questa stessa carta, chiamando direttamente il proprio def.activate
    // della carta scelta con un ctx costruito per ctx.owner — poi infligge
    // 2000 danni. La carta presa in prestito non lascia mai fisicamente il
    // Cimitero dell'avversario (resta lì, comunque "usata" concettualmente).
    // SEMPLIFICAZIONE: il testo reale la rende utilizzabile "fino a fine
    // turno" (un'attivazione manuale successiva, a scelta del giocatore) —
    // qui invece si usa immediatamente come parte dell'attivazione di
    // Tombarolo stessa, per non dover toccare la pipeline condivisa di
    // activateCard (duel-engine.js, usata da OGNI Magia/Trappola del
    // gioco) con un meccanismo di "carta temporaneamente presa in
    // prestito in mano" — rischio di regressione troppo ampio per il
    // guadagno. Limitata a Magie Normali/Rapide (non Continue/Rituali/
    // Terreno, pensate per restare in campo, non per un uso singolo).
    // ================================================================
    CardEffects.register(276, {
        canActivate(ctx) {
            const grave = ctx.graveyard(ctx.opponent);
            return grave.some((c) => {
                if (c.type !== 'spell' || !['normal', 'quick-play'].includes(c.subtype)) return false;
                const def = DuelEngine.getDefinition(c.id);
                if (!def || typeof def.activate !== 'function') return false;
                if (typeof def.canActivate !== 'function') return true;
                return def.canActivate(DuelEngine.makeContext(ctx.owner, { card: c }));
            });
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.opponent);
            const chosenCard = grave.find((c) => {
                if (c.type !== 'spell' || !['normal', 'quick-play'].includes(c.subtype)) return false;
                const def = DuelEngine.getDefinition(c.id);
                if (!def || typeof def.activate !== 'function') return false;
                if (typeof def.canActivate !== 'function') return true;
                return def.canActivate(DuelEngine.makeContext(ctx.owner, { card: c }));
            });
            if (!chosenCard) return;
            const chosenDef = DuelEngine.getDefinition(chosenCard.id);
            ctx.log(`🪦 Tombarolo usa ${chosenCard.name} dal Cimitero dell'avversario come se fosse in mano!`);
            chosenDef.activate(DuelEngine.makeContext(ctx.owner, { card: chosenCard }));
            ctx.dealDamage(ctx.owner, 2000);
        }
    });

    // 277 — Ascia di Gravità - Grarl / Gravity Axe - Grarl: +500 ATK, qualsiasi mostro.
    // SEMPLIFICAZIONE: manca "i mostri dell'avversario non possono cambiare Posizione".
    CardEffects.register(277, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
        }
    });

    // ================================================================
    // 284 — Guardiano Grarl / Guardian Grarl
    // Non può essere Evocata a meno che tu non controlli scoperta "Ascia
    // di Gravità - Grarl" (id 277, qui sopra) — def.requiresFieldPresenceId,
    // controllato in attemptMonsterSummon (actions.js) e
    // AI_SHARED.canNormalSummonNow (js/ai/ai-shared.js). "Se questa carta
    // è l'unica nella tua mano, puoi Special Summonarla (dalla mano)":
    // canSpecialSummonFromHand, condizione indipendente dal vincolo
    // sull'Evocazione Normale qui sopra (il testo reale non richiede
    // l'Ascia per questa via alternativa).
    // ================================================================
    CardEffects.register(284, {
        requiresFieldPresenceId: 277,
        canSpecialSummonFromHand(ctx) {
            return ctx.hand(ctx.owner).length === 1;
        },
        paySpecialSummonCost() { return true; }
    });

    // ================================================================
    // 285 — Guardiano Kay'est / Guardian Kay'est
    // Non può essere Evocata a meno che tu non controlli scoperta
    // "Bastone del Silenzio - Kay'est" (id 423) — def.requiresFieldPresenceId,
    // stesso meccanismo di Guardiano Grarl qui sopra. Non può essere
    // scelta come bersaglio per gli attacchi (ma questo non impedisce
    // all'avversario di attaccare direttamente — cannotBeAttackTargetUids
    // non tocca mai gli attacchi diretti, vedi resolveAttack in
    // actions.js). SEMPLIFICAZIONE: manca l'immunità agli effetti delle
    // Magie — nessun aggancio generico "questo mostro non può essere
    // bersaglio/influenzato da Magie" esiste in questo motore (le Magie
    // che colpiscono un mostro lo fanno ciascuna a modo suo, non c'è un
    // unico punto di controllo condiviso come per la distruzione).
    // ================================================================
    CardEffects.register(285, {
        requiresFieldPresenceId: 423,
        static(ctx) {
            gameState.cannotBeAttackTargetUids[ctx.card.uid] = true;
        }
    });

    // ================================================================
    // 283 — Guardiana Elma / Guardian Elma
    // Non può essere Evocata a meno che tu non controlli scoperta "Pugnale
    // Farfalla - Elma" (id 135) — def.requiresFieldPresenceId, stesso
    // meccanismo di Guardiano Grarl/Kay'est (id 284/285) qui sopra: la
    // nota precedente ("nessun meccanismo generico di restrizione
    // all'Evocazione") era ormai superata da quell'infrastruttura, già
    // esistente prima ancora di questa carta.
    // Quando Evocata Normalmente o Special Summonata: recupera 1 Carta
    // Equipaggiamento dal proprio Cimitero e se la equipaggia da sola —
    // scelta automatica della PRIMA trovata (stessa SEMPLIFICAZIONE di
    // ogni altra selezione automatica in questo file), scritta a mano
    // (non attachEquip/findEquipTarget qui sopra: quei due presuppongono
    // che ctx.card sia la Carta Equipaggiamento stessa già in mano/campo,
    // qui invece è il BERSAGLIO — Guardiana Elma — a "pescare" l'Equip
    // dal proprio Cimitero).
    // ================================================================
    CardEffects.register(283, {
        requiresFieldPresenceId: 135,
        onSummon(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const eqIndex = grave.findIndex((c) => {
                const d = DuelEngine.getDefinition(c.id);
                return d && d.isEquip;
            });
            if (eqIndex === -1) return;
            const freeStSlot = ctx.stField(ctx.owner).findIndex((s) => s === null);
            if (freeStSlot === -1) return;
            const eqCard = grave[eqIndex];
            grave.splice(eqIndex, 1);
            eqCard.equippedToOwner = ctx.owner;
            eqCard.equippedToIndex = ctx.summonedSlotIndex;
            eqCard.equippedToUid = ctx.summonedCard.uid;
            ctx.stField(ctx.owner)[freeStSlot] = { card: eqCard, isFaceDown: false, setOnTurn: gameState.turn };
            ctx.log(`🗡️ Guardiana Elma richiama ${eqCard.name} dal Cimitero e se lo equipaggia!`);
        }
    });

    // 286 — Ventaglio di Raffica: +400 ATK/-200 DEF, solo VENTO.
    CardEffects.register(286, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.attribute === 'VENTO') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.attribute === 'VENTO'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 400, def: e.def - 200 };
        }
    });

    // 301 — Corno dell'Unicorno: +700 ATK/+700 DEF, qualsiasi mostro.
    // SEMPLIFICAZIONE: manca "quando mandata al Cimitero: torna in cima al Deck".
    CardEffects.register(301, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 700, def: e.def + 700 };
        }
    });

    // 309 — Armatura Insetto con Cannone Laser / Insect Armor with Laser Cannon: +700 ATK, solo Insetto.
    CardEffects.register(309, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Insetto') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.race === 'Insetto'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 700, def: e.def };
        }
    });

    // 313 — Rinvigorimento / Invigoration: +400 ATK/-200 DEF, solo TERRA.
    CardEffects.register(313, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.attribute === 'TERRA') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.attribute === 'TERRA'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 400, def: e.def - 200 };
        }
    });

    // 340 — Armatura Cannone Laser / Laser Cannon Armor: +300 ATK/+300 DEF, solo Insetto.
    CardEffects.register(340, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Insetto') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.race === 'Insetto'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 300, def: e.def + 300 };
        }
    });

    // ================================================================
    // 341 — Ultimo Turno / Last Turn (Trappola Normale)
    // Attivabile solo nel turno dell'avversario, con i propri Life Points
    // a 1000 o meno. Sceglie 1 proprio mostro scoperto da mantenere (auto:
    // il più forte), poi manda ogni ALTRA carta sul Terreno e in mano di
    // ENTRAMBI i giocatori ai rispettivi Cimiteri. L'avversario Special
    // Summona 1 mostro dal proprio Deck (auto: il più forte) scoperto in
    // Posizione di Attacco — il danno da questa battaglia è sempre 0
    // (riusa gameState.noDamageFor, già esistente: dato che il Terreno
    // resta con un solo mostro per lato, nessun'altra battaglia è
    // comunque possibile in questo turno). Il verdetto (Vittoria/
    // Pareggio) si valuta alla End Phase di questo stesso turno — vedi
    // gameState.pendingUltimateTurnCheck, controllato in enterEndPhase()
    // (game-flow.js): questa Trappola è già finita nel Cimitero a quel
    // punto (Trappola Normale, non Continua), quindi il controllo non
    // può vivere in un normale onEndPhase della carta stessa. Nuovo
    // terzo esito 'draw' per endDuel/DuelSession.finish/showOutcome
    // (game-flow.js, duel-session.js, duel-cinematics.js) — non tocca il
    // record V/S del personaggio (nessuna modifica allo schema di
    // salvataggio).
    // "...e attacca il tuo mostro scelto": forzato per davvero tramite
    // gameState.mustAttackTargetUidsFor (vedi più sotto in activate()),
    // lo stesso meccanismo costruito per 199/747 — se l'avversario non
    // può comunque attaccare per qualche motivo, resta comunque coerente
    // con "in ogni altro caso è Pareggio" del testo reale.
    // ================================================================
    CardEffects.register(341, {
        canActivate(ctx) {
            if (gameState.currentPlayer === ctx.owner) return false;
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] > 1000) return false;
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const ownField = ctx.field(ctx.owner);
            let keepIndex = -1;
            let bestAtk = -1;
            ownField.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && DuelEngine.getEffectiveAtk(slot.card) > bestAtk) { bestAtk = DuelEngine.getEffectiveAtk(slot.card); keepIndex = i; }
            });
            if (keepIndex === -1) return;

            ['player', 'bot'].forEach((owner) => {
                const field = ctx.field(owner);
                field.forEach((slot, i) => {
                    if (!slot) return;
                    if (owner === ctx.owner && i === keepIndex) return;
                    ctx.graveyard(owner).push(slot.card);
                    field[i] = null;
                });
                const stField = ctx.stField(owner);
                stField.forEach((slot, i) => {
                    if (!slot) return;
                    ctx.graveyard(owner).push(slot.card);
                    stField[i] = null;
                });
                const hand = ctx.hand(owner);
                while (hand.length > 0) ctx.graveyard(owner).push(hand.pop());
            });
            ctx.log('⏳ Ultimo Turno: il Terreno viene spazzato via, resta solo un mostro per lato!');

            const oppDeckKey = ctx.opponent === 'player' ? 'playerDeck' : 'botDeck';
            const oppCountKey = ctx.opponent === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const oppDeck = gameState[oppDeckKey];
            if (Array.isArray(oppDeck)) {
                let bestIndex = -1;
                let bestOppAtk = -1;
                oppDeck.forEach((c, i) => { if (c.type === 'monster' && (c.attack || 0) > bestOppAtk) { bestOppAtk = c.attack || 0; bestIndex = i; } });
                if (bestIndex !== -1) {
                    const [oppMonster] = oppDeck.splice(bestIndex, 1);
                    gameState[oppCountKey] = oppDeck.length;
                    const oppSlotIndex = ctx.findEmptyMonsterSlot(ctx.opponent);
                    if (oppSlotIndex !== -1) {
                        ctx.specialSummon(ctx.opponent, oppMonster, oppSlotIndex, 'attack', 'deck');
                        ctx.log(`⏳ Ultimo Turno: l'avversario Special Summona ${oppMonster.name}!`);
                        // "...e attacca il tuo mostro scelto": obbligo vero
                        // e proprio (gameState.mustAttackTargetUidsFor,
                        // stesso meccanismo di 199/747) — se il lato
                        // forzato è il bot, botPerformAttacks (bot.js) lo
                        // consulta e ignora la normale valutazione di
                        // convenienza; se è il giocatore, handlePhaseStepperClick
                        // (game-flow.js) blocca l'uscita dalla Battle Phase.
                        const keptCard = ctx.field(ctx.owner)[keepIndex].card;
                        gameState.mustAttackTargetUidsFor = gameState.mustAttackTargetUidsFor || {};
                        gameState.mustAttackTargetUidsFor[oppMonster.uid] = new Set([keptCard.uid]);
                    } else {
                        ctx.graveyard(ctx.opponent).push(oppMonster);
                    }
                }
            }

            gameState.noDamageFor = gameState.noDamageFor || {};
            gameState.noDamageFor.player = true;
            gameState.noDamageFor.bot = true;
            gameState.pendingUltimateTurnCheck = { forTurn: gameState.turn };
        }
    });

    // 344 — Spada Leggendaria / Legendary Sword: +300 ATK/+300 DEF, solo Guerriero.
    CardEffects.register(344, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Guerriero') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.race === 'Guerriero'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 300, def: e.def + 300 };
        }
    });

    // ================================================================
    // 348 — Spada della Forza di Luce / Sword of the Light Force
    // (Trappola Normale)
    // Bandisci 1 carta a caso dalla mano dell'avversario, coperta.
    // Durante la 4ª Standby Phase dell'avversario dopo l'attivazione:
    // restituiscigliela — ctx.banishFromHandWithCountdown, nuovo
    // meccanismo generico in duel-engine.js (gameState.delayedHandReturns,
    // elaborato da DuelEngine.processDelayedHandReturns in
    // enterStandbyPhase(), game-flow.js), diverso da
    // ctx.banishTemporarily (quello torna sul TERRENO alla PROSSIMA
    // fase; questo torna in MANO dopo un conteggio di fasi, anche a
    // Trappola già consumata e andata al Cimitero).
    // ================================================================
    CardEffects.register(348, {
        canActivate(ctx) { return ctx.hand(ctx.opponent).length > 0; },
        activate(ctx) {
            const hand = ctx.hand(ctx.opponent);
            const index = Math.floor(Math.random() * hand.length);
            const [card] = hand.splice(index, 1);
            ctx.banishFromHandWithCountdown(ctx.opponent, card, 4);
            ctx.log(`🗡️ Spada della Forza di Luce bandisce coperta 1 carta a caso dalla mano ${ctx.opponent === 'player' ? 'tua' : 'del Bot'}: tornerà tra 4 Standby Phase!`);
        }
    });

    // 349 — Lama Fulminante / Lightning Blade: +800 ATK al Guerriero equipaggiato, e in più
    // tutti i mostri ACQUA sul Terreno (di entrambi i giocatori) perdono 500 ATK.
    CardEffects.register(349, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Guerriero') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.race === 'Guerriero'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 800, def: e.def };
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && slot.card.attribute === 'ACQUA') {
                        const existing = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                        gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk - 500, def: existing.def };
                    }
                });
            });
        }
    });

    // 358 — Fabbrica di Conversione Meccanica / Machine Conversion Factory: +300 ATK/+300 DEF, solo Macchina.
    CardEffects.register(358, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Macchina') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.race === 'Macchina'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 300, def: e.def + 300 };
        }
    });

    // 411 — Falce del Mietitore - Falce del Terrore / Reaper's Scythe: +500 ATK per mostro nei
    // Cimiteri di entrambi i giocatori, ma solo equipaggiabile a "Guardiano Falce del Terrore"
    // (id 282) — che a sua volta non è Evocabile in questo motore (dipende da "Guardian Eatos",
    // non presente): la restrizione resta corretta, semplicemente non troverà mai un bersaglio.
    CardEffects.register(411, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.id === 282) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.id === 282); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const count = ctx.graveyard('player').filter((c) => c.type === 'monster').length + ctx.graveyard('bot').filter((c) => c.type === 'monster').length;
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + count * 500, def: e.def };
        }
    });

    // 420 — Anello Magnetico: -500 ATK/-500 DEF al
    // proprio mostro equipaggiato (di solito per "attirare" gli attacchi su di lui).
    // SEMPLIFICAZIONE: manca "l'avversario può attaccare solo il mostro equipaggiato".
    CardEffects.register(420, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk - 500, def: e.def - 500 };
        }
    });

    // 423 — Bastone del Silenzio - Kay'est / Staff of the Silencer - Kay'est: +500 DEF, qualsiasi mostro.
    // SEMPLIFICAZIONE: manca la negazione di Magie che bersagliano il mostro equipaggiato.
    CardEffects.register(423, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk, def: e.def + 500 };
        }
    });

    // 432 — Salamandra / Salamandra: +700 ATK, solo FUOCO.
    CardEffects.register(432, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.attribute === 'FUOCO') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.attribute === 'FUOCO'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 700, def: e.def };
        }
    });

    // 441 — Palazzo Splendente: +700 ATK, solo LUCE.
    CardEffects.register(441, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.attribute === 'LUCE') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.attribute === 'LUCE'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 700, def: e.def };
        }
    });

    // 372 — Maschera del Maledetto / Mask of the Accursed: nessun bonus ATK/DEF; durante la tua
    // Standby Phase, infligge 500 danni al controllore del mostro equipaggiato.
    // SEMPLIFICAZIONE: manca "il mostro equipaggiato non può attaccare" — richiederebbe un
    // divieto d'attacco per-mostro non ancora presente (diverso da gameState.cannotAttackFor,
    // che è per-giocatore).
    CardEffects.register(372, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static() {}, // nessun bonus ATK/DEF: serve solo per il controllo "bersaglio ancora valido"
        onStandbyPhase(ctx) {
            const t = equippedTarget(ctx);
            const targetOwnerLpKey = ctx.card.equippedToOwner === 'player' ? 'playerLP' : 'botLP';
            gameState[targetOwnerLpKey] -= 500;
            ctx.log(`💀 Maschera del Maledetto infligge 500 danni al controllore di ${t.name}!`);
        }
    });

    // ================================================================
    // 376 — Metalmorfosi / Metalmorph (Trappola Normale che si equipaggia da sola)
    // +300 ATK/DEF al mostro equipaggiato; se attacca, guadagna ATK pari a
    // metà dell'ATK del bersaglio, solo durante il calcolo dei danni
    // (damageStepBonus, come Soldati Insetto del Cielo id 311).
    // SEMPLIFICAZIONE: equipaggiabile solo a un proprio mostro (la carta
    // reale permette anche un mostro dell'avversario), stessa restrizione
    // di ogni altra Carta Equipaggiamento in questo file.
    // ================================================================
    CardEffects.register(376, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 300, def: e.def + 300 };
        },
        damageStepBonus(ctx) {
            if (ctx.role === 'attacker' && ctx.opponentCard) {
                return { atk: Math.floor(DuelEngine.getEffectiveAtk(ctx.opponentCard) / 2) };
            }
            return null;
        }
    });

    // ================================================================
    // 520 — Zoa (effetto Ignition dalla zona Mostro)
    // Se equipaggiata con "Metalmorfosi" (id 376, qui sopra): puoi
    // mandare entrambe al Cimitero per Special Summonare "Metalzoa" (id
    // 377, qui sotto) dal Deck. CORREZIONE: la nota precedente di id 377
    // affermava erroneamente che questa carta ("Zoa") non fosse presente
    // in questo database — falso, esiste già come id 520.
    // ================================================================
    CardEffects.register(520, {
        canActivate(ctx) {
            const equippedWithMetalmorph = ctx.stField(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 376 && slot.card.equippedToUid === ctx.card.uid);
            if (!equippedWithMetalmorph) return false;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            return Array.isArray(deck) && deck.some((c) => c.id === 377);
        },
        activate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            const deckIndex = deck.findIndex((c) => c.id === 377);
            if (deckIndex === -1) return;
            const equipIndex = ctx.stField(ctx.owner).findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 376 && slot.card.equippedToUid === ctx.card.uid);
            if (equipIndex === -1) return;
            const field = ctx.field(ctx.owner);
            const ownIndex = ctx.index;
            field[ownIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            const equipCard = ctx.stField(ctx.owner)[equipIndex].card;
            ctx.stField(ctx.owner)[equipIndex] = null;
            ctx.graveyard(ctx.owner).push(equipCard);
            const [metalzoa] = deck.splice(deckIndex, 1);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, metalzoa, ownIndex, 'attack', 'deck');
            ctx.log('⚙️ Zoa e Metalmorfosi vanno al Cimitero: Metalzoa Special Summonata dal Deck!');
        }
    });

    // ================================================================
    // 377 — Metalzoa
    // Non può essere Evocata Normalmente/Set (cannotNormalSummon) né
    // Special Summonata in nessun altro modo (cannotBeSpecialSummoned —
    // non blocca ctx.specialSummon usato direttamente da Zoa id 520 qui
    // sopra, l'unico modo legale).
    // ================================================================
    CardEffects.register(377, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 12 — Drago Nero Occhi Rossi / Red-Eyes B. Dragon (effetto Ignition
    // dalla zona Mostro)
    // Se equipaggiato con "Metalmorfosi" (id 376, qui sopra): puoi
    // mandare entrambe le carte al Cimitero per Special Summonare
    // "Drago Nero Metallico Occhi Rossi" (id 413, qui sotto) dal Deck —
    // stesso identico schema di Zoa/Metalzoa (id 520/377) qui sopra.
    // ================================================================
    CardEffects.register(12, {
        canActivate(ctx) {
            const equippedWithMetalmorph = ctx.stField(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 376 && slot.card.equippedToUid === ctx.card.uid);
            if (!equippedWithMetalmorph) return false;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            return Array.isArray(deck) && deck.some((c) => c.id === 413);
        },
        activate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            const deckIndex = deck.findIndex((c) => c.id === 413);
            if (deckIndex === -1) return;
            const equipIndex = ctx.stField(ctx.owner).findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 376 && slot.card.equippedToUid === ctx.card.uid);
            if (equipIndex === -1) return;
            const field = ctx.field(ctx.owner);
            const ownIndex = ctx.index;
            field[ownIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            const equipCard = ctx.stField(ctx.owner)[equipIndex].card;
            ctx.stField(ctx.owner)[equipIndex] = null;
            ctx.graveyard(ctx.owner).push(equipCard);
            const [redEyesMetal] = deck.splice(deckIndex, 1);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, redEyesMetal, ownIndex, 'attack', 'deck');
            ctx.log('🐉 Drago Nero Occhi Rossi e Metalmorfosi vanno al Cimitero: Drago Nero Metallico Occhi Rossi Special Summonato dal Deck!');
        }
    });

    // ================================================================
    // 413 — Drago Nero Metallico Occhi Rossi / Red-Eyes Black Metal
    // Dragon
    // Non può essere Evocato Normalmente/Set (cannotNormalSummon) né
    // Special Summonato in nessun altro modo (cannotBeSpecialSummoned —
    // non blocca ctx.specialSummon usato direttamente da Drago Nero
    // Occhi Rossi id 12 qui sopra, l'unico modo legale).
    // ================================================================
    CardEffects.register(413, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 496 — Ala del Tiranno / Tyrant's Wing (Trappola Normale che si equipaggia da sola)
    // Equipaggiabile solo a un mostro Tipo Drago. +400 ATK/DEF.
    // SEMPLIFICAZIONE: manca "può effettuare fino a 2 attacchi per Battle
    // Phase" (il motore non supporta attacchi multipli dello stesso
    // mostro nello stesso turno, stesso limite di Cavaliere Hayabusa id
    // 294) e la conseguente autodistruzione in End Phase legata a
    // quell'attacco extra — resta solo il bonus ATK/DEF di base.
    // ================================================================
    CardEffects.register(496, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Drago') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.race === 'Drago'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 400, def: e.def + 400 };
        }
    });

    // ================================================================
    // 545 — Spada della Distruzione Oscura / Sword of Dark Destruction
    // Equipaggiabile solo a un mostro Tipo OSCURITÀ. +400 ATK, -200 DEF.
    // ================================================================
    CardEffects.register(545, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.attribute === 'OSCURITÀ') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.attribute === 'OSCURITÀ'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 400, def: e.def - 200 };
        }
    });

    // ================================================================
    // 365 — Maha Vailo (buff continuo basato sulle proprie Carte Equipaggiamento)
    // Guadagna 500 ATK per ogni Carta Equipaggiamento equipaggiata a
    // questa carta.
    // ================================================================
    CardEffects.register(365, {
        static(ctx) {
            const count = ctx.stField(ctx.owner).filter((slot) => slot && !slot.isFaceDown && slot.card.equippedToUid === ctx.card.uid).length;
            gameState.atkDefBonus[ctx.card.uid] = { atk: count * 500, def: 0 };
        }
    });

    // ================================================================
    // 7 — Buco Nero (Magia Normale)
    // "Distruggi tutti i mostri sul Terreno" — entrambi i giocatori,
    // senza eccezioni.
    // ================================================================
    CardEffects.register(7, {
        activate(ctx) {
            // Le posizioni delle carte sul campo vanno prese ORA, PRIMA di
            // ctx.destroyAllMonsters(): activateCard() in duel-engine.js
            // richiama updateUI() SUBITO dopo che questa funzione ritorna,
            // che ricostruisce il campo da zero e stacca dal documento i
            // nodi delle carte appena distrutte — esattamente lo stesso
            // motivo per cui resolveAttack() in js/engine/actions.js cattura i
            // rettangoli PRIMA di mutare lo stato (vedi quel commento).
            const sucked = [];
            ['player', 'bot'].forEach((owner) => {
                const boardId = owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
                ctx.field(owner).forEach((slot, index) => {
                    if (!slot) return;
                    const el = document.querySelector(`#${boardId} .field-slot[data-type="monster"][data-index="${index}"] .card`);
                    if (el) sucked.push({ card: slot.card, rect: el.getBoundingClientRect() });
                });
            });

            ctx.destroyAllMonsters();
            ctx.log('💥 Buco Nero inghiotte e distrugge tutti i mostri sul Terreno!');
            // Il vortice parte solo DOPO che il pulse a centro schermo della
            // carta stessa (già scatenato da activateCard() in
            // duel-engine.js) è DAVVERO finito, non a metà — altrimenti le
            // due animazioni si sovrappongono invece di leggersi in due
            // tempi separati, come un vero colpo di scena in due atti.
            // FX.ACTIVATE_CENTER_DURATION_MS è la stessa durata (2s) di
            // quel pulse, esposta apposta per questo in effects.js.
            setTimeout(() => {
                if (window.FX) FX.playDarkHoleVortex(sucked);
            }, (window.FX && FX.ACTIVATE_CENTER_DURATION_MS) || 2000);
        }
    });

    // ================================================================
    // 8 — Spada Rivelatrice (Magia CONTINUA)
    // Per 3 turni dell'avversario di chi la controlla: i suoi mostri non
    // possono dichiarare attacchi E i suoi mostri coperti restano visibili
    // scoperti (solo a schermo: restano "coperti" per le regole vere e
    // proprie, es. un attacco li rivela comunque con il consueto messaggio
    // di log — vedi isRevealedFor()/renderFields() in game-flow.js).
    // Il conto alla rovescia (slot.turnsLeft) scende di 1 ad ogni turno
    // dell'avversario colpito — vedi tickContinuousEffectDurations() in
    // game-flow.js, chiamata da changeTurn() — e allo scadere la carta va
    // da sola al Cimitero, invece di restare per sempre come le Magie
    // Continue normali.
    // ================================================================
    CardEffects.register(8, {
        continuous: true,
        durationTurns: 3,
        activate(ctx) {
            const slot = ctx.stField(ctx.owner)[ctx.index];
            if (slot) slot.turnsLeft = 3;
            // CORREZIONE di fedeltà: aggiunto il flip vero e proprio di
            // tutti i mostri coperti dell'avversario all'attivazione (il
            // testo reale lo richiede, non solo "restano scoperti" nella
            // UI) — gameState.revealedFor qui sotto in static() resta un
            // riflesso cosmetico continuo separato, non basta da solo.
            // SEMPLIFICAZIONE: il flip qui NON scatena i trigger ON_FLIP
            // dei mostri coinvolti (evita di aprire una Chain multipla
            // per un'attivazione che ne coinvolge già una propria).
            ctx.field(ctx.opponent).forEach((s) => {
                if (s && s.isFaceDown) s.isFaceDown = false;
            });
            ctx.log(`✨ ${ctx.owner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${ctx.card.name}: gira scoperti tutti i mostri coperti dell'avversario, che per 3 turni non possono attaccare.`);
            // Le spade calano solo DOPO che il pulse a centro schermo della
            // carta stessa (già scatenato da activateCard() in
            // duel-engine.js) è DAVVERO finito — non a metà — altrimenti le
            // due animazioni si accavallano invece di leggersi in due tempi
            // separati come un vero colpo di scena in due atti.
            // FX.ACTIVATE_CENTER_DURATION_MS è la stessa durata (2s) di
            // quel pulse, esposta apposta per questo in effects.js.
            const opponent = ctx.opponent;
            setTimeout(() => {
                if (!window.FX) return;
                FX.playSwordsOfRevealingLight(opponent, (removeFlyingSwords) => {
                    // Solo ORA (spade mobili atterrate) il segno fisso
                    // permanente (.field-sword-mark) può iniziare a
                    // comparire nel render — vedi il controllo su
                    // gameState.revealedSwordsLanded in renderFields()
                    // (game-flow.js). Ridisegna PRIMA di rimuovere le
                    // spade mobili, altrimenti per un istante non si
                    // vedrebbe nessuna delle due.
                    gameState.revealedSwordsLanded = gameState.revealedSwordsLanded || {};
                    gameState.revealedSwordsLanded[opponent] = true;
                    if (typeof updateUI === 'function') updateUI();
                    removeFlyingSwords();
                });
            }, (window.FX && FX.ACTIVATE_CENTER_DURATION_MS) || 2000);
        },
        static(ctx) {
            gameState.cannotAttackFor[ctx.opponent] = true;
            gameState.revealedFor[ctx.opponent] = true;
        }
    });

    // ================================================================
    // 10 — Cilindro Magico (Trappola)
    // Quando l'avversario di chi la controlla dichiara un attacco:
    // annulla l'attacco e infligge all'attaccante danno pari all'ATK del
    // mostro che ha attaccato.
    // ================================================================
    CardEffects.register(10, {
        onAttackDeclare(ctx) {
            ctx.cancelAttack();
            ctx.dealDamage(ctx.opponent, ctx.attackerAtk);
            ctx.log(`🌀 Cilindro Magico rimanda l'attacco al mittente: ${ctx.attackerAtk} danni!`);
        }
    });

    // ================================================================
    // 425 — Ragno della Roulette / Roulette Spider (Magia Rapida, Set)
    // Quando un mostro dell'avversario dichiara un attacco: lancia un
    // dado a sei facce e applica il risultato:
    //   1: dimezza i propri LP.
    //   2: rendi quell'attacco un attacco diretto.
    //   3: scegli 1 mostro che controlli, cambia il bersaglio dell'attacco
    //      su di esso e calcola i danni.
    //   4: scegli un altro mostro che controlla l'avversario (l'attaccante
    //      stesso escluso), cambia il bersaglio dell'attacco su di esso e
    //      calcola i danni — sì, un mostro del campo dell'ATTACCANTE:
    //      "fuoco amico" reale della carta, non un errore. redirectAttack
    //      accetta un secondo argomento (ctx.opponent) apposta per questo
    //      caso, l'unico di questo dataset in cui il nuovo bersaglio non
    //      sta sul campo di chi risponde (vedi resolveAttack in actions.js).
    //   5: annulla l'attacco e infliggi all'avversario danno pari all'ATK
    //      di quel mostro.
    //   6: distruggi il mostro dell'avversario.
    // SEMPLIFICAZIONE: i risultati 3/4 richiedono "scegliere 1 mostro" —
    // dato che questo handler gira dentro la risoluzione sincrona di una
    // Chain (resolveChain in duel-engine.js, che NON aspetta un popup
    // asincrono prima di proseguire), la scelta è automatica invece di
    // un vero picker interattivo: stesso identico pattern già accettato
    // per Spiritello dei Sogni (id 214)/Spostamento (id 622) qui sopra
    // in questo file, che con lo stesso identico vincolo prendono
    // "il primo mostro idoneo trovato" invece di offrire una scelta.
    // ================================================================
    CardEffects.register(425, {
        // hasDiceRollEffect: usato da Dado Dimensionale (id 200) per
        // trovare "una carta con un effetto che richiede un lancio di
        // dado" — nuova tassonomia minima opt-in, non tocca il resto
        // dell'effetto di questa carta.
        hasDiceRollEffect: true,
        onAttackDeclare(ctx) {
            const roll = Math.floor(Math.random() * 6) + 1;
            ctx.log(`🎲 Ragno della Roulette lancia il dado: ${roll}!`);
            const ownLpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            switch (roll) {
                case 1: {
                    const currentLp = ctx.gameState[ownLpKey];
                    const halved = Math.floor(currentLp / 2);
                    ctx.dealDamage(ctx.owner, currentLp - halved);
                    ctx.log(`💔 Ragno della Roulette dimezza i tuoi LP a ${halved}!`);
                    break;
                }
                case 2:
                    ctx.forceDirectAttack();
                    ctx.log('🎯 Ragno della Roulette rende l\'attacco diretto!');
                    break;
                case 3: {
                    const field = ctx.field(ctx.owner);
                    const newIndex = field.findIndex((s, i) => s && i !== ctx.targetIndex);
                    if (newIndex === -1) {
                        ctx.log('🎲 Nessun altro mostro disponibile: il risultato del dado non ha effetto.');
                        break;
                    }
                    ctx.redirectAttack(newIndex);
                    ctx.log(`🔀 Ragno della Roulette ridirige l'attacco verso ${field[newIndex].card.name}!`);
                    break;
                }
                case 4: {
                    const enemyField = ctx.field(ctx.opponent);
                    const newIndex = enemyField.findIndex((s, i) => s && i !== ctx.attackerIndex);
                    if (newIndex === -1) {
                        ctx.log('🎲 Nessun altro mostro dell\'avversario disponibile: il risultato del dado non ha effetto.');
                        break;
                    }
                    ctx.redirectAttack(newIndex, ctx.opponent);
                    ctx.log(`🔀 Ragno della Roulette ridirige l'attacco verso ${enemyField[newIndex].card.name} (fuoco amico)!`);
                    break;
                }
                case 5:
                    ctx.cancelAttack();
                    ctx.dealDamage(ctx.opponent, ctx.attackerAtk);
                    ctx.log(`🚫 Ragno della Roulette annulla l'attacco e infligge ${ctx.attackerAtk} danni!`);
                    break;
                case 6: {
                    const attackerSlot = ctx.field(ctx.opponent)[ctx.attackerIndex];
                    ctx.cancelAttack();
                    ctx.destroyMonster(ctx.opponent, ctx.attackerIndex);
                    if (attackerSlot) ctx.log(`💥 Ragno della Roulette distrugge ${attackerSlot.card.name}!`);
                    break;
                }
            }
        }
    });

    // ================================================================
    // 40 — Buco Trappola (Trappola)
    // Quando l'avversario di chi la controlla Evoca Normalmente o gira
    // scoperto (Flip Summon) un mostro con 1000 O PIÙ ATK: lo distrugge.
    // CORREZIONE: la versione precedente includeva erroneamente anche le
    // Special Summon (mai coperte dalla regola vera) e usava una soglia
    // ATK sbagliata (">1000" invece di ">=1000", quindi un mostro con
    // esattamente 1000 ATK non la faceva scattare). ctx.summonedVia
    // ('normal'|'special'|'flip', nuovo campo in duel-engine.js) permette
    // ora di escludere le Special Summon; ctx.summonedPosition === 'attack'
    // resta necessario perché un mostro Set (coperto) non rivela le sue
    // statistiche finché non viene girato scoperto.
    // ================================================================
    CardEffects.register(40, {
        canActivate(ctx) {
            return ctx.summonedVia !== 'special' && ctx.summonedPosition === 'attack' && ctx.summonedCard.attack >= 1000;
        },
        onOpponentSummon(ctx) {
            const decl = ctx.declareTarget(ctx.opponent, ctx.summonedSlotIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`🕳️ Buco Trappola distrugge ${target ? target.card.name : ctx.summonedCard.name}!`);
        }
    });

    // ================================================================
    // 36 — Vaso dell'Avidità (Magia Normale)
    // Pesca 2 carte.
    // ================================================================
    CardEffects.register(36, {
        activate(ctx) {
            const drawn = ctx.drawCards(ctx.owner, 2);
            ctx.log(`🍯 ${ctx.owner === 'player' ? 'Hai pescato' : 'Il bot ha pescato'} ${drawn} cart${drawn === 1 ? 'a' : 'e'} con Vaso dell'Avidità.`);
        }
    });

    // ================================================================
    // 37 — Folgore Fulminante (Magia Normale)
    // Distruggi tutte le carte (mostri + Magie/Trappole) sul Terreno
    // dell'avversario di chi l'ha attivata.
    // ================================================================
    // Folgore Fulminante / Raigeki: distrugge tutti i MOSTRI dell'avversario
    // — non Magie/Trappole (errore di fedeltà corretto in sessione: la
    // vecchia versione usava ctx.destroyAllCards, che spazzava via anche
    // la zona Magia/Trappola, mai stato vero per la carta reale).
    CardEffects.register(37, {
        activate(ctx) {
            ctx.destroyAllMonsters(ctx.opponent);
            ctx.log(`⚡ Folgore Fulminante distrugge tutti i mostri ${ctx.opponent === 'bot' ? 'del bot' : 'del giocatore'}!`);
        }
    });

    // ================================================================
    // 35 — Rinascita del Mostro (Magia Normale)
    // Special Summon di un mostro da un Cimitero, tuo o dell'avversario:
    // il GIOCATORE sceglie sia QUALE mostro (box a scorrimento, come id
    // 23/id 38) sia in QUALE Posizione farlo tornare (nuovo
    // DuelEngineUI.openPositionPicker, stesso popover Attacco/Difesa già
    // usato per l'Evocazione Normale). Anche qui activate(ctx) apre solo
    // il primo box e ritorna subito — la vera Special Summon parte dopo,
    // dentro le callback, esattamente come id 38 (nessuna modifica al
    // motore/alla Chain, che nel frattempo si considera già "risolta").
    // Se a decidere è il BOT (o se questa pagina non ha i box in DOM),
    // resta l'euristica di sempre: il mostro con l'ATK più alto tra i due
    // Cimiteri, evocato in Attacco.
    // ================================================================
    CardEffects.register(35, {
        canActivate(ctx) {
            return ctx.graveyard('player').some((c) => c.type === 'monster' && !DuelEngine.getDefinition(c.id)?.cannotBeSpecialSummoned)
                || ctx.graveyard('bot').some((c) => c.type === 'monster' && !DuelEngine.getDefinition(c.id)?.cannotBeSpecialSummoned);
        },
        activate(ctx) {
            const candidates = [];
            [ctx.owner, ctx.opponent].forEach((graveyardOwner) => {
                ctx.graveyard(graveyardOwner).forEach((card) => {
                    // "Non può essere Special Summonato" (es. i 3 Dei
                    // Egizi, id 30/31/472): esclusi anche da qui, non solo
                    // dalla propria condizione di Evocazione — altrimenti
                    // Rinascita del Mostro potrebbe farli tornare in campo
                    // illegalmente da un Cimitero.
                    if (card.type === 'monster' && !DuelEngine.getDefinition(card.id)?.cannotBeSpecialSummoned) candidates.push({ graveyardOwner, card });
                });
            });
            if (candidates.length === 0) {
                ctx.log('⚠️ Nessun mostro nei Cimiteri da rianimare.');
                return;
            }
            const owner = ctx.owner;
            const reviveWith = (choice, position) => {
                const slotIndex = ctx.findEmptyMonsterSlot(owner);
                if (slotIndex === -1) {
                    ctx.log('⚠️ Il Terreno è pieno: impossibile eseguire la Special Summon.');
                    return;
                }
                // Ritrova la carta per uid: la scelta è asincrona, l'array
                // del Cimitero potrebbe essere cambiato nel frattempo.
                const gy = ctx.graveyard(choice.graveyardOwner);
                const realIndex = gy.findIndex((c) => c.uid === choice.card.uid);
                if (realIndex === -1) return;
                gy.splice(realIndex, 1);
                ctx.specialSummon(owner, choice.card, slotIndex, position, 'graveyard');
                ctx.log(`🌟 Rinascita del Mostro riporta in campo ${choice.card.name} in Posizione di ${position === 'attack' ? 'Attacco' : 'Difesa'}!`);
            };
            if (owner !== 'player' || !window.DuelEngineUI) {
                let best = candidates[0];
                candidates.forEach((c) => { if (c.card.attack > best.card.attack) best = c; });
                reviveWith(best, 'attack');
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🌟 Rinascita del Mostro',
                text: 'Scegli quale mostro riportare in campo da uno dei due Cimiteri.',
                onSelect: (card) => {
                    const choice = candidates.find((c) => c.card.uid === card.uid);
                    if (!choice) return;
                    const slotIndex = ctx.findEmptyMonsterSlot(owner);
                    if (slotIndex === -1) {
                        ctx.log('⚠️ Il Terreno è pieno: impossibile eseguire la Special Summon.');
                        return;
                    }
                    const boardId = owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
                    const anchorEl = document.querySelector(`#${boardId} .field-slot[data-owner="${owner}"][data-type="monster"][data-index="${slotIndex}"]`);
                    window.DuelEngineUI.openPositionPicker(anchorEl, {
                        title: `${choice.card.name}: Attacco o Difesa?`,
                        onSelect: (position) => reviveWith(choice, position)
                    });
                }
            });
        }
    });

    // ================================================================
    // 47 — Cavaliere Missile (effetto Ignition + onEndPhase)
    // Una volta per turno, puoi farlo tornare in mano a fine turno: se lo
    // fai, in quel turno può attaccare direttamente i Life Points
    // dell'avversario. Attivala cliccando sul mostro scoperto in campo
    // CORREZIONE di fedeltà: la versione precedente (torna in mano a fine
    // turno per poter attaccare direttamente) era interamente inventata,
    // nessuna carta reale corrispondente. Il vero Rocket Warrior: durante
    // la propria Battle Phase non può essere distrutta in battaglia e non
    // si subisce danno da battaglia dai suoi attacchi
    // (cannotBeDestroyedByBattle/preventOwnBattleDamage, entrambi flag
    // generici già esistenti); se attacca un mostro, quel mostro perde
    // 500 ATK fino a fine turno (ctx.grantTemporaryAtkDefBonus).
    CardEffects.register(47, {
        cannotBeDestroyedByBattle: true,
        preventOwnBattleDamage: true,
        onOwnAttackDeclare(ctx) {
            if (ctx.targetIndex === -1) return;
            const targetSlot = ctx.field(ctx.opponent)[ctx.targetIndex];
            if (!targetSlot) return;
            ctx.grantTemporaryAtkDefBonus(targetSlot.card, -500, 0, false);
            ctx.log(`🚀 Cavaliere Missile fa perdere 500 ATK a ${targetSlot.card.name}!`);
        }
    });

    // ================================================================
    // 54 — Muro d'Illusione / Wall of Illusion
    // Se questa carta viene attaccata da un mostro, DOPO il calcolo dei
    // danni: rimanda quel mostro in mano.
    // CORREZIONE: la versione precedente usava onAttackDeclare (PRIMA del
    // calcolo danni) e annullava l'attacco con ctx.cancelAttack() —
    // sbagliato su entrambi i fronti, verificato via YGOPRODeck: il testo
    // reale è "after damage calculation", nessuna cancellazione
    // dell'attacco (il combattimento si risolve normalmente, Muro
    // d'Illusione può anche subire danni/essere distrutto). Corretto
    // riusando lo stesso meccanismo di Testa di Martello Iper (id 800,
    // onBattled — fires a fine Damage Step SOLO se questa carta
    // sopravvive allo scontro): SEMPLIFICAZIONE identica a quella carta,
    // se Muro d'Illusione viene distrutto in questo stesso scontro
    // l'effetto non scatta (onBattled non viene chiamato per una carta
    // che non è sopravvissuta).
    // ================================================================
    CardEffects.register(54, {
        onBattled(ctx) {
            if (!ctx.opponentSurvived) return;
            const idx = ctx.field(ctx.opponent).findIndex((s) => s && s.card.uid === ctx.opponentCard.uid);
            if (idx === -1) return;
            ctx.field(ctx.opponent)[idx] = null;
            ctx.hand(ctx.opponent).push(ctx.opponentCard);
            ctx.log(`🧱 Muro d'Illusione rimanda ${ctx.opponentCard.name} in mano dopo il calcolo dei danni!`);
        }
    });

    // ================================================================
    // 56 — Rito del Guerriero Nero (Magia Rituale)
    // Sacrifica mostri dal Terreno E/O dalla mano per un Livello totale
    // di almeno 8 (performRitualTribute/maxRitualTributeLevel qui sopra —
    // CORREZIONE di fedeltà: prima solo dal Terreno, la regola reale di
    // ogni Evocazione Rituale permette anche la mano), poi Special
    // Summon Guerriero Nero Supremo (id 55) dalla mano.
    // SEMPLIFICAZIONE: sceglie da sola quali mostri sacrificare (i meno
    // possibile per raggiungere il totale, partendo dai Livelli più alti),
    // invece di una selezione manuale come nell'Evocazione Tributo — nello
    // stesso spirito delle altre semplificazioni dichiarate in cima a
    // js/engine/duel-engine.js.
    // ================================================================
    CardEffects.register(56, {
        canActivate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 55);
            if (handIndex === -1) return false;
            return maxRitualTributeLevel(ctx, handIndex) >= 8;
        },
        activate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 55);
            if (handIndex === -1) return; // canActivate l'ha già garantito: non dovrebbe succedere
            performRitualTribute(ctx, 8, handIndex);

            const hand = ctx.hand(ctx.owner);
            const finalHandIndex = hand.findIndex((c) => c.id === 55);
            if (finalHandIndex === -1) return;
            const [ritualCard] = hand.splice(finalHandIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                // Il Terreno è pieno: il mostro rituale finisce comunque
                // nel Cimitero, invece di sparire nel nulla.
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Guerriero Nero Supremo finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('⚔️ Rito del Guerriero Nero evoca Guerriero Nero Supremo!');
        }
    });

    // ================================================================
    // 55 — Guerriero Nero Supremo / Supreme Dark Warrior: Evocabile
    // Rituale solo tramite "Rito del Guerriero Nero" (id 56, qui sopra —
    // GIÀ IMPLEMENTATA). Qui serve solo il divieto di Evocazione
    // Normale/Set e di Special Summon per ogni altra via
    // (cannotNormalSummon/cannotBeSpecialSummoned — stesso schema di 413).
    // ================================================================
    CardEffects.register(55, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 20 — Buster Blader (buff continuo)
    // Guadagna 500 ATK per ogni mostro Tipo Drago controllato dal tuo
    // avversario (scoperto) o nel suo Cimitero.
    // ================================================================
    CardEffects.register(20, {
        static(ctx) {
            const onField = ctx.field(ctx.opponent).filter((slot) => slot && !slot.isFaceDown && slot.card.race === 'Drago').length;
            const inGraveyard = ctx.graveyard(ctx.opponent).filter((c) => c.race === 'Drago').length;
            gameState.atkDefBonus[ctx.card.uid] = { atk: (onField + inGraveyard) * 500, def: 0 };
        }
    });

    // ================================================================
    // 16 — Gearfried il Cavaliere di Ferro (rifiuta le Carte Equipaggiamento)
    // Se un giocatore qualsiasi equipaggia una Carta Equipaggiamento a
    // questa carta: distruggi quella Carta Equipaggiamento.
    // SEMPLIFICAZIONE: rejectsEquip esclude Gearfried a monte dalla scelta
    // automatica del bersaglio di ogni Carta Equipaggiamento (vedi
    // findEquipTarget in testa a questo file), invece di lasciarlo
    // equipaggiare per un istante e poi distruggere subito la carta.
    // ================================================================
    CardEffects.register(16, {
        rejectsEquip: true
    });

    // ================================================================
    // 17 — Jinzo (effetto CONTINUO del mostro, non un'attivazione)
    // Finché Jinzo è scoperto sul campo, le Trappole SUL TERRENO perdono
    // il loro effetto — di ENTRAMBI i giocatori, non solo dell'avversario
    // (testo reale: "Negate all Trap effects on the field"; bug corretto
    // qui: la versione precedente negava solo gameState.trapsNegatedFor[ctx.opponent],
    // lasciando immuni le proprie Trappole).
    // Amplificatore (id 92, Equip esclusivo per questa carta) restringe
    // la negazione al solo lato avversario quando equipaggiato — override
    // qui, non nell'Equip stesso, perché è più semplice controllare da
    // Jinzo "ho Amplificatore addosso?" che far combaciare due static()
    // diversi sullo stesso flag booleano condiviso.
    // ================================================================
    CardEffects.register(17, {
        static(ctx) {
            const hasAmplifier = ['player', 'bot'].some((o) =>
                ctx.stField(o).some((s) => s && !s.isFaceDown && s.card.id === 92 && s.card.equippedToUid === ctx.card.uid)
            );
            if (hasAmplifier) {
                gameState.trapsNegatedFor[ctx.opponent] = true;
            } else {
                gameState.trapsNegatedFor.player = true;
                gameState.trapsNegatedFor.bot = true;
            }
        }
    });

    // ================================================================
    // 22 — Kuriboh (effetto attivabile DALLA MANO)
    // Puoi scartare Kuriboh dalla mano per annullare tutto il danno di
    // UN attacco diretto subito.
    //
    // SEMPLIFICAZIONE: limitato all'attacco diretto (nessun mostro come
    // bersaglio), per evitare l'ambiguità delle regole vere su cosa
    // succede al confronto ATK/DEF quando il danno da battaglia coinvolge
    // entrambi i lati — qui il danno da negare è sempre e solo quello
    // che subirebbe chi controlla Kuriboh.
    // ================================================================
    CardEffects.register(22, {
        canActivate(ctx) {
            return ctx.targetIndex === -1;
        },
        onAttackDeclare(ctx) {
            ctx.negateDamage();
            ctx.log('🐰 Kuriboh si scarta e annulla tutto il danno di questo attacco!');
        }
    });

    // ================================================================
    // 859-862 — I "fratelli Kuriboh": Kuribah, Kuribee, Kuriboo, Kuribeh
    // (aggiunti come bersagli Special Summon di Crepuscolo a Cinque
    // Stelle id 244 — vedi lì). Effetti propri implementati qui dove
    // ragionevolmente indipendenti da altre carte mancanti dal database
    // (Kuribabylon per Kuribah, Kuribandit id 334 già presente per
    // Kuribeh — solo la sua clausola con Kuribandit è implementata, non
    // quella con Kuribabylon che non esiste qui).
    // ================================================================

    // 859 — Kuribah: quando questa carta, o un altro mostro "Kuriboh"
    // controllato, viene mandato al Cimitero: Special Summon 1 mostro
    // 300 ATK/200 DEF dal Deck, tranne Kuribah (una volta per turno).
    // Riusa il broadcast onOwnMonsterDestroyedPassive (duel-engine.js,
    // introdotto per Uovo Giurassico Miracoloso id 808), ora esteso con
    // ctx.destroyedInBattle così può rispettare "distrutta IN BATTAGLIA"
    // come da testo reale, invece di reagire a QUALUNQUE distruzione.
    // SEMPLIFICAZIONE residua: manca il sacrificio con altri 4 "fratelli
    // Kuriboh" per Special Summonare "Kuribabylon" (carta non presente in
    // questo database).
    CardEffects.register(859, {
        onOwnMonsterDestroyedPassive(ctx) {
            if (!ctx.destroyedInBattle) return;
            const kuribohIds = [22, 859, 860, 861, 862];
            if (!ctx.destroyedCard || !kuribohIds.includes(ctx.destroyedCard.id)) return;
            if (ctx.hasUsedOncePerTurn(`859:${ctx.card.uid}`)) return;
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            if (!Array.isArray(deck)) return;
            const deckIndex = deck.findIndex((c) => c.id !== 859 && c.type === 'monster' && c.attack === 300 && c.defense === 200);
            if (deckIndex === -1) return;
            ctx.markUsedOncePerTurn(`859:${ctx.card.uid}`);
            const [card] = deck.splice(deckIndex, 1);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(card); return; }
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'deck');
            ctx.log(`🐿️ Kuribah Special Summona ${card.name} dal Deck!`);
        }
    });

    // 860 — Kuribee: quando questa carta, o un altro mostro "Kuriboh"
    // controllato, viene mandato al Cimitero: aggiungi alla mano 1
    // Magia/Trappola dal Deck che nomini "Kuriboh" nel testo (una volta
    // per turno). Una volta per turno, quando un mostro dell'avversario
    // dichiara un attacco mentre controlli un altro mostro "Kuriboh":
    // azzera l'ATK di tutti gli altri propri mostri fino a fine turno, e
    // se lo fai, annulla l'attacco.
    // ctx.destroyedInBattle (stessa estensione di Kuribah/id 859, vedi lì)
    // rispetta "distrutta in battaglia" come da testo reale.
    CardEffects.register(860, {
        onOwnMonsterDestroyedPassive(ctx) {
            if (!ctx.destroyedInBattle) return;
            const kuribohIds = [22, 859, 860, 861, 862];
            if (!ctx.destroyedCard || !kuribohIds.includes(ctx.destroyedCard.id)) return;
            if (ctx.hasUsedOncePerTurn(`860-add:${ctx.card.uid}`)) return;
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            if (!Array.isArray(deck)) return;
            const deckIndex = deck.findIndex((c) => (c.type === 'spell' || c.type === 'trap') && c.effect && c.effect.includes('Kuriboh'));
            if (deckIndex === -1) return;
            ctx.markUsedOncePerTurn(`860-add:${ctx.card.uid}`);
            const [card] = deck.splice(deckIndex, 1);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.hand(ctx.owner).push(card);
            ctx.log(`🐿️ Kuribee aggiunge ${card.name} dal Deck alla mano!`);
        },
        onAttackDeclare(ctx) {
            if (ctx.hasUsedOncePerTurn(`860-negate:${ctx.card.uid}`)) return;
            const kuribohIds = [22, 859, 861, 862];
            const hasOtherKuriboh = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && kuribohIds.includes(slot.card.id));
            if (!hasOtherKuriboh) return;
            ctx.markUsedOncePerTurn(`860-negate:${ctx.card.uid}`);
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot && slot.card.uid !== ctx.card.uid) ctx.grantTemporaryAtkDefBonus(slot.card, -DuelEngine.getEffectiveAtk(slot.card), 0, false);
            });
            ctx.cancelAttack();
            ctx.log('🐿️ Kuribee azzera l\'ATK dei propri mostri e annulla l\'attacco!');
        }
    });

    // 861 — Kuriboo: quando un mostro dell'avversario dichiara un
    // attacco: puoi scartare questa carta; aggiungi alla mano 1 mostro
    // "Kuriboh" dal Deck, tranne Kuriboo. Una volta per turno (Effetto
    // Rapido, attivabile dalla mano): scarta 1 Trappola, poi 1 mostro
    // scoperto dell'avversario perde 1500 ATK fino a fine turno.
    // Nessun canActivate condiviso: le due abilità sono indipendenti
    // (una reattiva automatica, una manuale), ciascuna verifica da sola
    // le proprie condizioni e non fa nulla se non soddisfatte.
    CardEffects.register(861, {
        activate(ctx) {
            if (ctx.hasUsedOncePerTurn(`861:${ctx.card.uid}`)) return;
            const hand = ctx.hand(ctx.owner);
            const trapIndex = hand.findIndex((c) => c.type === 'trap' && c.uid !== ctx.card.uid);
            if (trapIndex === -1) return;
            const oppField = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let bestAtk = -1;
            oppField.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && DuelEngine.getEffectiveAtk(slot.card) > bestAtk) { bestAtk = DuelEngine.getEffectiveAtk(slot.card); targetIndex = i; }
            });
            if (targetIndex === -1) return;
            ctx.markUsedOncePerTurn(`861:${ctx.card.uid}`);
            const [trapCard] = hand.splice(trapIndex, 1);
            ctx.graveyard(ctx.owner).push(trapCard);
            ctx.grantTemporaryAtkDefBonus(oppField[targetIndex].card, -1500, 0, false);
            ctx.log(`🐿️ Kuriboo scarta ${trapCard.name}: ${oppField[targetIndex].card.name} perde 1500 ATK fino a fine turno!`);
        },
        onAttackDeclare(ctx) {
            const hand = ctx.hand(ctx.owner);
            const ownIndex = hand.indexOf(ctx.card);
            if (ownIndex === -1) return;
            const kuribohIds = [22, 859, 860, 862];
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            const deckIndex = Array.isArray(deck) ? deck.findIndex((c) => kuribohIds.includes(c.id)) : -1;
            if (deckIndex === -1) return;
            hand.splice(ownIndex, 1);
            ctx.graveyard(ctx.owner).push(ctx.card);
            const [card] = deck.splice(deckIndex, 1);
            gameState[countKey] = deck.length;
            hand.push(card);
            ctx.log(`🐿️ Kuriboo si scarta: aggiunge ${card.name} dal Deck alla mano!`);
        }
    });

    // 862 — Kuribeh: due effetti alternativi.
    // 1) (Effetto Rapido, attivabile dalla mano) scarta questa carta; 1
    //    mostro "Kuriboh" controllato guadagna 1500 ATK.
    // 2) Sacrifica questa carta e 1 ciascuno degli altri 4 "fratelli
    //    Kuriboh" (dalla mano e/o dal Terreno); cerca "Kuribandit" (id
    //    334) nel Deck o nel Cimitero, poi puoi Evocare Normalmente 1
    //    mostro Demone dalla mano — implementata come branca aggiuntiva
    //    dentro la stessa activate() (preferita quando disponibile,
    //    essendo nettamente più forte), invece di una seconda superficie
    //    di attivazione: nessun'altra carta di questo file offre due
    //    effetti alternativi dallo stesso pulsante "Attiva", quindi non
    //    esiste un pattern di scelta già pronto da riusare per una
    //    combinazione così di nicchia (richiede tutti e 5 i fratelli
    //    contemporaneamente). L'Evocazione Normale extra riusa lo stesso
    //    schema Ignition-auto-risolvente di Legion il Giullare Demoniaco
    //    (id 346, vedi lì): non tocca gameState.hasNormalSummoned,
    //    scatena comunque TRIGGER.ON_NORMAL_SUMMON.
    function kuribehFindSibling(ctx, id) {
        const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === id);
        if (handIndex !== -1) return { zone: 'hand', index: handIndex };
        const fieldIndex = ctx.field(ctx.owner).findIndex((s) => s && !s.isFaceDown && s.card.id === id);
        if (fieldIndex !== -1) return { zone: 'field', index: fieldIndex };
        return null;
    }
    function kuribehHasFullSiblingCombo(ctx) {
        return [22, 859, 860, 861].every((id) => kuribehFindSibling(ctx, id) !== null);
    }
    CardEffects.register(862, {
        canActivate(ctx) {
            if (kuribehHasFullSiblingCombo(ctx)) return true;
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.uid !== ctx.card.uid && [22, 859, 860, 861].includes(slot.card.id));
        },
        activate(ctx) {
            if (kuribehHasFullSiblingCombo(ctx)) {
                const hand = ctx.hand(ctx.owner);
                const field = ctx.field(ctx.owner);
                [22, 859, 860, 861].forEach((id) => {
                    const loc = kuribehFindSibling(ctx, id);
                    if (!loc) return;
                    if (loc.zone === 'hand') {
                        const [card] = hand.splice(loc.index, 1);
                        ctx.graveyard(ctx.owner).push(card);
                    } else {
                        const card = field[loc.index].card;
                        field[loc.index] = null;
                        ctx.graveyard(ctx.owner).push(card);
                    }
                });
                // Rimuove QUESTA carta da dove si trova davvero (mano o
                // Terreno, ctx.zone — questa clausola, a differenza del
                // primo Effetto Rapido, funziona da entrambe le zone).
                if (ctx.zone === 'monster') {
                    field[ctx.index] = null;
                } else {
                    const ownIndex = hand.indexOf(ctx.card);
                    if (ownIndex !== -1) hand.splice(ownIndex, 1);
                }
                ctx.graveyard(ctx.owner).push(ctx.card);
                ctx.log('🐿️ Kuribeh sacrifica tutti e 5 i fratelli Kuriboh!');
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const deck = gameState[deckKey];
                let kuribandit = null;
                if (Array.isArray(deck)) {
                    const deckIndex = deck.findIndex((c) => c.id === 334);
                    if (deckIndex !== -1) {
                        [kuribandit] = deck.splice(deckIndex, 1);
                        gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
                    }
                }
                if (!kuribandit) {
                    const graveIndex = ctx.graveyard(ctx.owner).findIndex((c) => c.id === 334);
                    if (graveIndex !== -1) [kuribandit] = ctx.graveyard(ctx.owner).splice(graveIndex, 1);
                }
                if (kuribandit) {
                    hand.push(kuribandit);
                    ctx.log(`🐿️ Kuribeh aggiunge ${kuribandit.name} alla mano!`);
                }
                const demonIndex = hand.findIndex((c) => c.type === 'monster' && !c.extraDeck && c.race === 'Demone' && getTributesRequired(c) === 0);
                if (demonIndex !== -1) {
                    const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                    if (slotIndex !== -1) {
                        const [demon] = hand.splice(demonIndex, 1);
                        field[slotIndex] = { card: demon, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true, summonedOnTurn: gameState.turn };
                        ctx.log(`🐿️ Kuribeh: Evocazione Normale extra di ${demon.name}!`);
                        DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, DuelEngine.makeContext(ctx.owner, { summonedCard: demon, summonedSlotIndex: slotIndex, summonedPosition: 'attack' }));
                    }
                }
                return;
            }
            const targetSlot = ctx.field(ctx.owner).find((slot) => slot && !slot.isFaceDown && slot.card.uid !== ctx.card.uid && [22, 859, 860, 861].includes(slot.card.id));
            if (!targetSlot) return;
            const hand = ctx.hand(ctx.owner);
            const ownIndex = hand.indexOf(ctx.card);
            if (ownIndex !== -1) hand.splice(ownIndex, 1);
            ctx.graveyard(ctx.owner).push(ctx.card);
            ctx.grantTemporaryAtkDefBonus(targetSlot.card, 1500, 0, false);
            ctx.log(`🐿️ Kuribeh si scarta: ${targetSlot.card.name} guadagna 1500 ATK fino a fine turno!`);
        }
    });

    // ================================================================
    // 59 — Carica dell'Anima / Soul Charge (Magia Normale)
    // Special Summon di un NUMERO QUALSIASI (scelto dal giocatore) di
    // mostri dal Cimitero, perdendo 1000 LP PER OGNI mostro, poi impedisce
    // la propria Battle Phase in questo turno (gameState.skipBattlePhaseFor,
    // stesso meccanismo già costruito per Makiu/id 366) — selezione
    // ripetuta con DuelEngineUI.openCardListPicker (stesso schema di
    // Maglio Magico/id 768), fermata anche automaticamente quando il
    // Terreno si riempie. Il bot (nessuna vera IA dedicata per questa
    // scelta) rianima quanti più mostri possibile dal più forte al più
    // debole, come prima.
    // ================================================================
    function finishSoulCharge(ctx, summonedUids) {
        if (summonedUids.length === 0) return;
        ctx.dealDamage(ctx.owner, 1000 * summonedUids.length);
        gameState.skipBattlePhaseFor = gameState.skipBattlePhaseFor || {};
        gameState.skipBattlePhaseFor[ctx.owner] = true;
        ctx.log(`👻 Carica dell'Anima riporta in campo ${summonedUids.join(', ')} e ti costa ${1000 * summonedUids.length} Life Points! Non puoi condurre la Battle Phase in questo turno.`);
    }
    function pickSoulChargeTargets(ctx, summonedUids) {
        const grave = ctx.graveyard(ctx.owner);
        const eligible = grave.filter((c) => c.type === 'monster' && !DuelEngine.getDefinition(c.id)?.cannotBeSpecialSummoned);
        if (eligible.length === 0 || ctx.findEmptyMonsterSlot(ctx.owner) === -1) { finishSoulCharge(ctx, summonedUids); return; }
        window.DuelEngineUI.openCardListPicker(eligible, {
            title: '👻 Carica dell\'Anima',
            text: `Scegli 1 mostro dal Cimitero da Special Summonare, o chiudi per fermarti qui (${summonedUids.length} finora).`,
            onSelect: (card) => {
                const realIndex = grave.indexOf(card);
                if (realIndex === -1) { pickSoulChargeTargets(ctx, summonedUids); return; }
                const [summoned] = grave.splice(realIndex, 1);
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                ctx.specialSummon(ctx.owner, summoned, slotIndex, 'attack', 'graveyard');
                summonedUids.push(summoned.name);
                pickSoulChargeTargets(ctx, summonedUids);
            },
            onCancel: () => finishSoulCharge(ctx, summonedUids)
        });
    }
    CardEffects.register(59, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && !DuelEngine.getDefinition(c.id)?.cannotBeSpecialSummoned) && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            if (ctx.owner === 'player' && window.DuelEngineUI) {
                pickSoulChargeTargets(ctx, []);
                return;
            }
            const grave = ctx.graveyard(ctx.owner);
            const eligible = grave
                .map((c, i) => ({ card: c, index: i }))
                .filter((e) => e.card.type === 'monster' && !DuelEngine.getDefinition(e.card.id)?.cannotBeSpecialSummoned)
                .sort((a, b) => b.card.attack - a.card.attack);
            const summonedUids = [];
            eligible.forEach((entry) => {
                if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return;
                const realIndex = grave.findIndex((c) => c.uid === entry.card.uid);
                if (realIndex === -1) return;
                const [card] = grave.splice(realIndex, 1);
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'graveyard');
                summonedUids.push(card.name);
            });
            finishSoulCharge(ctx, summonedUids);
        }
    });

    // ================================================================
    // 451 — Scambio di Anime / Soul Exchange (Magia Normale)
    // SEMPLIFICAZIONE: la carta vera designa un mostro avversario da
    // usare come Tributo nella TUA prossima Evocazione Tributo; questo
    // motore non ha un aggancio per "il prossimo Tributo di questo
    // turno", quindi qui distrugge direttamente il mostro scoperto più
    // forte dell'avversario, nello stesso spirito di Faglia (id 243).
    // (Spostato qui da id 61 durante la pulizia dei doppioni.)
    // ================================================================
    CardEffects.register(451, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            let bestIndex = -1;
            let bestCard = null;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && (!bestCard || slot.card.attack > bestCard.attack)) { bestCard = slot.card; bestIndex = i; }
            });
            if (bestIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, bestIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`🔄 Scambio di Anime costringe il tuo avversario a cedere ${target ? target.card.name : bestCard.name}!`);
        }
    });

    // ================================================================
    // 69 — Stop Difesa / Stop Defense (Magia Normale)
    // Cambia in Posizione di Attacco un mostro in Posizione di Difesa
    // controllato dal tuo avversario (auto-selezionato: quello con la
    // DEF più bassa, stesso spirito di auto-selezione di Faglia id 243).
    // ================================================================
    CardEffects.register(69, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && slot.position === 'defense');
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let lowestDef = Infinity;
            field.forEach((slot, i) => {
                if (slot && slot.position === 'defense' && slot.card.defense < lowestDef) { lowestDef = slot.card.defense; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, targetIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const slot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!slot) return;
            ctx.changePosition(decl.targetOwner, decl.targetIndex, 'attack');
            slot.isFaceDown = false;
            ctx.log(`⚔️ Stop Difesa costringe ${slot.card.name} in Posizione di Attacco!`);
        }
    });

    // ================================================================
    // 460 — Dado di Evocazione / Summon Dice (Magia Normale)
    // Paga 1000 Life Points (costo fisso, come sulla carta vera) e tira
    // un dado a sei facce: 1-2 puoi Evocare Normalmente, 3-4 Special
    // Summon dal tuo Cimitero, 5-6 Special Summon dalla mano un mostro
    // di Livello 5+. Stesse auto-selezioni "il migliore disponibile" già
    // usate da Rinascita del Mostro (id 35) e Carica dell'Anima (id 59).
    // (Spostato qui da id 72 durante la pulizia dei doppioni.)
    // ================================================================
    // CORREZIONE di fedeltà: aggiunto "puoi attivare solo 1 'Dado di
    // Evocazione' per turno" (mancava) — per NOME, quindi vale anche fra
    // copie diverse della stessa carta, non solo per la singola carta.
    CardEffects.register(460, {
        hasDiceRollEffect: true,
        canActivate(ctx) {
            return !ctx.hasUsedOncePerTurn(`460:${ctx.owner}`);
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`460:${ctx.owner}`);
            ctx.dealDamage(ctx.owner, 1000);
            const roll = Math.floor(Math.random() * 6) + 1;
            if (window.FX) FX.playDiceRoll(roll);
            ctx.log(`🎲 Dado di Evocazione: hai tirato un ${roll}!`);
            if (roll <= 2) {
                gameState.hasNormalSummoned = false;
                ctx.log('➡️ Puoi Evocare Normalmente un mostro questo turno.');
            } else if (roll <= 4) {
                const grave = ctx.graveyard(ctx.owner);
                let bestIndex = -1;
                let bestCard = null;
                grave.forEach((c, i) => {
                    if (c.type === 'monster' && (!bestCard || c.attack > bestCard.attack)) { bestCard = c; bestIndex = i; }
                });
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (bestCard && slotIndex !== -1) {
                    grave.splice(bestIndex, 1);
                    ctx.specialSummon(ctx.owner, bestCard, slotIndex, 'attack', 'graveyard');
                    ctx.log(`➡️ Special Summon di ${bestCard.name} dal Cimitero!`);
                } else {
                    ctx.log('➡️ Nessun mostro disponibile nel Cimitero.');
                }
            } else {
                const hand = ctx.hand(ctx.owner);
                const handIndex = hand.findIndex((c) => c.type === 'monster' && c.level >= 5);
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (handIndex !== -1 && slotIndex !== -1) {
                    const [card] = hand.splice(handIndex, 1);
                    ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                    ctx.log(`➡️ Special Summon di ${card.name} dalla mano!`);
                } else {
                    ctx.log('➡️ Nessun mostro di Livello 5+ disponibile in mano.');
                }
            }
        }
    });

    // ================================================================
    // 462 — Cacciatore di Spade / Sword Hunter
    // Alla fine della Battle Phase, se questa carta ha distrutto in
    // battaglia dei mostri dell'avversario in quella Battle Phase: li
    // recupera dal Cimitero DELL'AVVERSARIO (un mostro distrutto in
    // battaglia va sempre al Cimitero del suo vero proprietario, mai a
    // quello di chi lo ha distrutto) e li equipaggia a se stessa
    // (guadagna 200 ATK per ognuno). Usa il nuovo hook
    // def.onDestroysMonsterInBattle (applyBattleDestroyBonus, actions.js
    // — già esteso con ctx.destroyedCard per Divoratempo id 480) per
    // accumulare i bersagli distrutti in ctx.card._swordHunterPending,
    // poi li processa tutti in blocco al trigger 'onBattlePhaseEnd' (già
    // esistente, usato anche da Bestia Mitica Cerbero id 734/Cavaliere
    // del Miraggio id 381) — a differenza di un vero Equip Spell, questi
    // "trofei" sono semplici carte Mostro senza un proprio isEquip/
    // static(): il bonus li conta direttamente nello static() di
    // Cacciatore di Spade stesso (equippedToUid === ctx.card.uid), ed
    // onDestroy li rimanda tutti al Cimitero del loro vero proprietario
    // se Cacciatore di Spade stesso viene distrutto.
    // ================================================================
    CardEffects.register(462, {
        onDestroysMonsterInBattle(ctx) {
            if (!ctx.destroyedCard) return;
            ctx.card._swordHunterPending = ctx.card._swordHunterPending || [];
            ctx.card._swordHunterPending.push(ctx.destroyedCard);
        },
        onBattlePhaseEnd(ctx) {
            const pending = ctx.card._swordHunterPending;
            ctx.card._swordHunterPending = [];
            if (!pending || pending.length === 0) return;
            // I mostri distrutti in battaglia da Cacciatore di Spade sono
            // sempre dell'avversario (non si può distruggere in battaglia
            // un proprio mostro): finiscono quindi nel Cimitero
            // dell'AVVERSARIO, mai nel proprio — da lì vanno recuperati.
            const grave = ctx.graveyard(ctx.opponent);
            pending.forEach((victim) => {
                const idx = grave.indexOf(victim);
                if (idx === -1) return;
                const freeStSlot = ctx.stField(ctx.owner).findIndex((s) => s === null);
                if (freeStSlot === -1) return;
                grave.splice(idx, 1);
                victim.equippedToOwner = ctx.owner;
                victim.equippedToIndex = ctx.field(ctx.owner).findIndex((s) => s && s.card.uid === ctx.card.uid);
                victim.equippedToUid = ctx.card.uid;
                ctx.stField(ctx.owner)[freeStSlot] = { card: victim, isFaceDown: false, setOnTurn: gameState.turn };
                ctx.log(`⚔️ Cacciatore di Spade equipaggia ${victim.name} dal Cimitero (+200 ATK)!`);
            });
        },
        onDestroy(ctx) {
            const st = ctx.stField(ctx.owner);
            st.forEach((slot, i) => {
                if (slot && slot.card.equippedToUid === ctx.card.uid) {
                    // Torna al Cimitero del suo VERO proprietario (l'avversario), non a quello di chi controllava Cacciatore di Spade.
                    ctx.graveyard(ctx.opponent).push(slot.card);
                    st[i] = null;
                }
            });
        },
        static(ctx) {
            const attachedCount = ctx.stField(ctx.owner).filter((slot) => slot && slot.card.equippedToUid === ctx.card.uid).length;
            if (attachedCount === 0) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + attachedCount * 200, def: e.def };
        }
    });

    // ================================================================
    // 23 — Insetto Divoratore / Man-Eater Bug (effetto FLIP)
    // Quando questa carta viene girata scoperta (Flip), distruggi 1
    // mostro scoperto sul Terreno: il GIOCATORE sceglie quale, con lo
    // stesso box di scelta a scorrimento (DuelEngineUI.openCardListPicker)
    // già usato per Fusione (id 38) — apre il box e ritorna subito, la
    // distruzione vera parte dopo, dentro onSelect, quando il giocatore
    // clicca una carta: resolveBattleDamage/il resto della battaglia in
    // corso in quel momento non aspettano questa scelta, esattamente come
    // per id 38 (nessuna modifica richiesta al motore). Se a decidere è il
    // BOT (o se questa pagina non ha il box in DOM), resta l'euristica di
    // sempre: il mostro scoperto con l'ATK più alto tra i due Terreni
    // (mai se stesso), stesso spirito di Faglia (id 243).
    // (Spostato qui da id 49 "Insetto Divoratore Mostruoso" — stesso
    // identico effetto reale, duplicato per errore durante la creazione
    // originale del database: entrambe le carte rappresentavano "Man-Eater
    // Bug".)
    // ================================================================
    CardEffects.register(23, {
        onFlip(ctx) {
            const candidates = [];
            [ctx.opponent, ctx.owner].forEach((fieldOwner) => {
                ctx.field(fieldOwner).forEach((slot, index) => {
                    if (fieldOwner === ctx.owner && index === ctx.slotIndex) return; // mai se stesso
                    if (slot && !slot.isFaceDown) candidates.push({ owner: fieldOwner, index, card: slot.card });
                });
            });
            if (candidates.length === 0) {
                ctx.log('🐛 Insetto Divoratore si rivela, ma non c\'è nessun mostro scoperto da distruggere.');
                return;
            }
            // Ritrova lo slot per uid al momento della distruzione vera (non
            // per indice, che nel frattempo potrebbe non essere più valido
            // se la scelta è asincrona) e controlla che sia ancora lì.
            const destroy = (choice) => {
                const slot = ctx.field(choice.owner)[choice.index];
                if (!slot || slot.card.uid !== choice.card.uid) return;
                ctx.destroyMonster(choice.owner, choice.index);
                ctx.log(`🐛 Insetto Divoratore, girato scoperto, distrugge ${choice.card.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                let best = candidates[0];
                candidates.forEach((c) => { if (c.card.attack > best.card.attack) best = c; });
                destroy(best);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🐛 Insetto Divoratore',
                text: 'Scegli quale mostro scoperto sul Terreno distruggere.',
                onSelect: (card) => {
                    const choice = candidates.find((c) => c.card.uid === card.uid);
                    if (choice) destroy(choice);
                }
            });
        }
    });

    // ================================================================
    // 71 — Suijin (risposta quando attaccata)
    // Durante il calcolo dei danni, se questa carta viene attaccata: puoi
    // rendere pari a 0 l'ATK del mostro attaccante — stesso meccanismo di
    // risposta di Muro d'Illusione (id 54) qui sopra, ma senza annullare
    // l'attacco: l'ATK diventa 0 SOLO per il confronto di questa battaglia
    // (vedi zeroAttackerAtk in declareCtx, actions.js).
    // ================================================================
    // CORREZIONE di fedeltà: mancava "utilizzabile una sola volta finché
    // questa carta resta scoperta sul Terreno" — stesso schema già
    // corretto per Kazejin (id 324, kazejinUsed sullo SLOT, non sulla
    // carta: così una nuova copia evocata in seguito riparte da zero).
    CardEffects.register(71, {
        canActivate(ctx) {
            const slot = ctx.field(ctx.owner)[ctx.index];
            return !!slot && !slot.suijinUsed;
        },
        onAttackDeclare(ctx) {
            ctx.zeroAttackerAtk();
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (slot) slot.suijinUsed = true;
            ctx.log("💧 Suijin azzera l'ATK del mostro attaccante per questo scontro (effetto usabile una sola volta finché scoperta)!");
        }
    });

    // ================================================================
    // 74 — Guardiano della Palude / Swamp Battleguard (buff continuo)
    // Guadagna 500 ATK per ogni "Guardiano di Lava" (id 343) che controlli
    // — le due carte si richiamano a vicenda, vedi il suo speculare più
    // sotto. static() viene ricalcolato ad ogni render (vedi
    // recomputeStaticEffects in duel-engine.js): il bonus scritto in
    // gameState.atkDefBonus è letto sia dal calcolo battaglia
    // (resolveBattleDamage in actions.js) sia dal rendering della carta
    // (card-renderer.js), quindi è un vero +ATK, non solo cosmetico.
    // ================================================================
    CardEffects.register(74, {
        static(ctx) {
            const count = ctx.field(ctx.owner).filter((slot) => slot && !slot.isFaceDown && slot.card.id === 343).length;
            gameState.atkDefBonus[ctx.card.uid] = { atk: count * 500, def: 0 };
        }
    });

    // ================================================================
    // 77 — Coccinella della Rovina a 4 Stelle (effetto FLIP)
    // Quando viene girata scoperta, distrugge tutti i mostri scoperti di
    // Livello 4 sul campo dell'avversario — stesso aggancio TRIGGER.ON_FLIP
    // già usato da id 49 qui sopra.
    // ================================================================
    CardEffects.register(77, {
        onFlip(ctx) {
            const field = ctx.field(ctx.opponent);
            let destroyedAny = false;
            field.forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.level === 4) {
                    ctx.destroyMonster(ctx.opponent, index);
                    destroyedAny = true;
                }
            });
            ctx.log(destroyedAny
                ? '🐞 Coccinella della Rovina a 4 Stelle distrugge tutti i mostri scoperti di Livello 4 dell\'avversario!'
                : '🐞 Coccinella della Rovina a 4 Stelle si rivela, ma l\'avversario non ha mostri scoperti di Livello 4.');
        }
    });

    // ================================================================
    // 80 — Un Battito d'Ali del Drago Gigante (Magia Normale)
    // Riporta in mano 1 mostro Tipo Drago di Livello 5+ che controlli; se
    // lo fai, distrugge tutte le Magie/Trappole sul Terreno (di entrambi i
    // giocatori — il testo reale non specifica "dell'avversario").
    // SEMPLIFICAZIONE: sceglie da sola quale Drago rimandare in mano (il
    // primo trovato), invece di un'interfaccia di selezione dedicata.
    // ================================================================
    CardEffects.register(80, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Drago' && slot.card.level >= 5);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.race === 'Drago' && slot.card.level >= 5);
            if (index === -1) return;
            const returned = field[index].card;
            field[index] = null;
            ctx.hand(ctx.owner).push(returned);
            ['player', 'bot'].forEach((fieldOwner) => {
                ctx.stField(fieldOwner).forEach((slot, i) => {
                    if (slot) {
                        ctx.graveyard(fieldOwner).push(slot.card);
                        ctx.stField(fieldOwner)[i] = null;
                    }
                });
            });
            ctx.log(`🐉 Un Battito d'Ali del Drago Gigante riporta in mano ${returned.name} e distrugge tutte le Magie/Trappole sul Terreno!`);
        }
    });

    // ================================================================
    // 86 — Amazzone Maestra delle Catene (onDestroy)
    // Quando questa carta viene distrutta in battaglia e mandata al
    // Cimitero: puoi pagare 1000 Life Points; se lo fai, guarda la mano
    // del tuo avversario e aggiungi alla tua mano 1 mostro che vi si
    // trova. Il "puoi" reale è una vera scelta qui: apre il box "lista
    // carte a scorrimento" (DuelEngineUI.openCardListPicker) con la mano
    // dell'avversario; i Life Points si pagano solo se scegli davvero una
    // carta, non prima (chiudere il box senza scegliere equivale a
    // rifiutare il costo).
    // ================================================================
    // CORREZIONE di fedeltà: il costo reale è 1500 LP, non 1000.
    CardEffects.register(86, {
        onDestroy(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] <= 1500) return;
            const opponentMonstersInHand = ctx.hand(ctx.opponent).filter((c) => c.type === 'monster');
            if (opponentMonstersInHand.length === 0) return;

            const pick = (card) => {
                const hand = ctx.hand(ctx.opponent);
                const index = hand.indexOf(card);
                if (index === -1) return;
                ctx.dealDamage(ctx.owner, 1500);
                hand.splice(index, 1);
                ctx.hand(ctx.owner).push(card);
                ctx.log(`⛓️ Amazzone Maestra delle Catene paga 1500 LP e prende ${card.name} dalla mano dell'avversario!`);
                if (typeof updateUI === 'function') updateUI();
            };

            if (ctx.owner === 'player' && window.DuelEngineUI) {
                DuelEngineUI.openCardListPicker(opponentMonstersInHand, {
                    title: '⛓️ Amazzone Maestra delle Catene',
                    text: "Paga 1500 Life Points e scegli 1 mostro dalla mano dell'avversario da aggiungere alla tua mano.",
                    onSelect: pick
                });
            } else {
                pick(opponentMonstersInHand[0]);
            }
        }
    });

    // ================================================================
    // 87 — Amazzone Combattente (effetto passivo, nessuna attivazione)
    // Non subisci danno da battaglia dagli attacchi che coinvolgono
    // questa carta — vedi il flag preventOwnBattleDamage, letto da
    // applyDamage() dentro resolveBattleDamage() in js/engine/actions.js.
    // ================================================================
    CardEffects.register(87, {
        preventOwnBattleDamage: true
    });

    // ================================================================
    // 90 — Amazzone Spadaccina (effetto passivo, nessuna attivazione)
    // Il danno da battaglia che subiresti dagli attacchi che coinvolgono
    // questa carta viene invece subito dal tuo avversario — vedi il flag
    // redirectOwnBattleDamageToOpponent, stesso punto d'aggancio di
    // Amazzone Combattente qui sopra.
    // ================================================================
    CardEffects.register(90, {
        redirectOwnBattleDamageToOpponent: true
    });

    // ================================================================
    // 92 — Amplificatore / Amplifier (Equipaggiamento, solo Jinzo id 17)
    // Finché equipaggiata, Jinzo nega le Trappole solo dell'avversario
    // (non più anche le proprie) — vedi l'override nella static() di
    // Jinzo stessa qui sopra (cerca "hasAmplifier"), che controlla se
    // QUESTA carta è equipaggiata a lui. "Quando questa carta viene
    // rimossa dal Terreno: distruggi il mostro equipaggiato" — stesso
    // schema di Sepoltura Prematura (id 633) qui sopra, tramite
    // onSTDestroyed/ctx.destroySpellTrap.
    // SEMPLIFICAZIONE: onSTDestroyed scatta solo se questa carta viene
    // DISTRUTTA (il caso di gran lunga più comune) — il testo reale dice
    // "rimossa dal Terreno" in generale (anche rimandata in mano o
    // bandita), casi che questo motore non ha ancora un aggancio per
    // intercettare allo stesso modo.
    // ================================================================
    function amplifierDestroyEquippedTarget(ctx, reasonLabel) {
        if (!ctx.card.equippedToUid) return;
        const field = ctx.field(ctx.card.equippedToOwner);
        const index = ctx.card.equippedToIndex;
        const slot = field[index];
        if (!slot || slot.card.uid !== ctx.card.equippedToUid) return;
        const name = slot.card.name;
        ctx.destroyMonster(ctx.card.equippedToOwner, index);
        ctx.log(`⚡ Amplificatore ${reasonLabel}: ${name} viene distrutto con lui!`);
    }
    CardEffects.register(92, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.id === 17) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.id === 17); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        onSTDestroyed(ctx) { amplifierDestroyEquippedTarget(ctx, 'distrutto'); },
        // "Se questa carta lascia il Terreno": copre anche il bando (es.
        // bandita dal Cimitero dopo essere già stata distrutta non conta —
        // ma se un effetto la bandisse direttamente dal Terreno, ACTIONS.banish
        // ora chiama onBanished). Il ritorno in mano di una Carta
        // Equipaggiamento resta scoperto (nessuna funzione centrale per
        // quel percorso, vedi missingEffectNote).
        onBanished(ctx) { amplifierDestroyEquippedTarget(ctx, 'bandito'); }
    });

    // ================================================================
    // 88 — Arciere delle Amazzoni (Trappola Normale)
    // Quando l'avversario dichiara un attacco, se controlli un mostro il
    // cui nome contiene "Amazzone": gira scoperti in Posizione di Attacco
    // tutti i mostri dell'avversario.
    // SEMPLIFICAZIONE: manca il -500 ATK dell'effetto reale finché resta
    // scoperti (richiederebbe leggere gameState.atkDefBonus da qualche
    // parte — vedi il commento su id 79/81 in js/data/cards-db.js — che oggi
    // nessun punto del motore applica ancora davvero).
    // ================================================================
    CardEffects.register(88, {
        onAttackDeclare(ctx) {
            // Il controllo (nome contiene "Amazzone") vale anche se il proprio
            // mostro è coperto: è il TUO mostro, ne conosci il nome anche
            // senza girarlo — solo i mostri dell'AVVERSARIO restano "ignoti".
            if (!ctx.field(ctx.owner).some((slot) => slot && slot.card.name.includes('Amazzone'))) return;
            const field = ctx.field(ctx.opponent);
            let flippedAny = false;
            field.forEach((slot, i) => {
                if (slot && (slot.isFaceDown || slot.position !== 'attack')) {
                    slot.isFaceDown = false;
                    ctx.changePosition(ctx.opponent, i, 'attack');
                    flippedAny = true;
                }
            });
            if (flippedAny) ctx.log('🏹 Arciere delle Amazzoni costringe tutti i mostri dell\'avversario in Posizione di Attacco scoperta!');
        }
    });

    // ================================================================
    // 119 — Cavaliere della Lama / Blade Knight (buff continuo)
    // Guadagna 400 ATK finché ha 1 carta o meno in mano. La seconda
    // clausola ("se non controlli altri mostri, gli effetti dei Mostri
    // Flip che distrugge in battaglia vengono annullati") è già garantita
    // per costruzione — un Mostro Flip distrutto in battaglia non attiva
    // MAI il proprio effetto in questo motore, per qualunque attaccante
    // (vedi il commento su TRIGGER.ON_FLIP in resolveBattleDamage,
    // actions.js, stessa nota già usata per Lady Arpia 2/id 783), quindi
    // nessuna registrazione dedicata serve per quella parte del testo.
    // ================================================================
    CardEffects.register(119, {
        static(ctx) {
            const bonus = ctx.hand(ctx.owner).length <= 1 ? 400 : 0;
            gameState.atkDefBonus[ctx.card.uid] = { atk: bonus, def: 0 };
        }
    });

    // ================================================================
    // 100 — Armatura Guida d'Attacco (Trappola Normale)
    // Quando un mostro dichiara un attacco: distrugge il mostro attaccante.
    // SEMPLIFICAZIONE: manca la scelta alternativa "reindirizza l'attacco a
    // un altro mostro" dell'effetto reale — vedi il commento in
    // js/data/cards-db.js sul perché.
    // ================================================================
    CardEffects.register(100, {
        onAttackDeclare(ctx) {
            const decl = ctx.declareTarget(ctx.attackerOwner, ctx.attackerIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.cancelAttack();
            ctx.log('🛡️ Armatura Guida d\'Attacco distrugge il mostro attaccante!');
        }
    });

    // ================================================================
    // 78 — Patto col Sovrano Oscuro (Magia Veloce)
    // Special Summon di Drago Berserk (id 110) dalla mano.
    // SEMPLIFICAZIONE: l'effetto reale richiede che il mostro di 8+ Stelle
    // Livello sia andato al TUO Cimitero PROPRIO in questo turno — questo
    // motore non tiene traccia di "quando" una carta è arrivata al
    // Cimitero, solo se ci si trova, quindi qui basta che ce ne sia UNO
    // presente (in qualunque momento). "dalla mano o dal Deck" diventa
    // "solo dalla mano": cercare una carta specifica nel Deck e rimuoverla
    // richiederebbe un meccanismo di ricerca-mazzo non ancora presente.
    // ================================================================
    CardEffects.register(78, {
        canActivate(ctx) {
            const hasFodder = ctx.graveyard(ctx.owner).some((c) => c.level >= 8);
            const hasBerserkDragon = ctx.hand(ctx.owner).some((c) => c.id === 110);
            return hasFodder && hasBerserkDragon;
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.id === 110);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.log('❌ Non c\'è spazio sul Terreno per Special Summonare Drago Berserk.');
                return;
            }
            const card = hand[index];
            hand.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('👹 Patto col Sovrano Oscuro Special Summona Drago Berserk!');
        }
    });

    // ================================================================
    // 79 — Un Oceano Leggendario / A Legendary Ocean (Magia Terreno)
    // Ogni mostro ACQUA sul campo (di entrambi i giocatori) guadagna 200
    // ATK/DEF, finché questa carta resta scoperta sul Terreno. Accumula con
    // un eventuale bonus già scritto da un altro effetto continuo, invece
    // di sovrascriverlo, così più fonti sullo stesso mostro si sommano.
    // SEMPLIFICAZIONE: la riduzione di Livello di 1 non è applicata —
    // nessun codice in questo motore legge più il Livello di un mostro
    // dopo l'Evocazione (serve solo a calcolare i Tributi PRIMA di
    // Evocarlo).
    // ================================================================
    CardEffects.register(79, {
        continuous: true,
        // Come ogni altra Magia/Trappola Continua di questo file, serve un
        // activate() — anche solo per il log — perché la carta possa
        // scoprirsi quando viene Set e poi attivata dalla sua zona
        // Terreno (altrimenti canActivate() in duel-engine.js la
        // considera "senza effetto attivabile" e resterebbe coperta per
        // sempre): l'effetto vero, indipendente da questo, resta in
        // static() qui sotto.
        activate(ctx) {
            ctx.log(`🌊 ${ctx.card.name} si scopre sul Terreno.`);
        },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && slot.card.attribute === 'ACQUA') {
                        const existing = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                        gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk + 200, def: existing.def + 200 };
                    }
                });
            });
        }
    });

    // ================================================================
    // 122 — Spadaccino di Fiamma Blu / Blue Flame Swordsman
    // Una volta per turno, durante la Battle Phase di uno dei due
    // giocatori: scegli come bersaglio 1 altro mostro Guerriero che
    // controlli; questa carta perde 600 ATK e quel mostro guadagna 600
    // ATK — attivazione Ignition (click sul mostro scoperto), ma con una
    // condizione di fase INSOLITA per questo motore: normalmente un
    // effetto Ignition richiede la Main Phase, qui invece SOLO la Battle
    // Phase (di uno qualunque dei due giocatori — non solo la propria,
    // quindi niente controllo su gameState.currentPlayer).
    // Quando questa carta viene distrutta dall'avversario e mandata al
    // Cimitero: bandiscila dal Cimitero, poi Special Summon 1 mostro
    // Guerriero FUOCO dal Cimitero. SEMPLIFICAZIONE: "distrutta
    // dall'avversario" copre solo la distruzione in BATTAGLIA
    // (ctx.destroyedByOpponentCard, popolato solo lì — vedi il commento
    // su fireOnDestroy in actions.js), non un effetto Carta avversario:
    // stessa semplificazione già accettata altrove in questo file (es.
    // Ossigeddon id 804) per lo stesso limite strutturale.
    // ================================================================
    CardEffects.register(122, {
        canActivate(ctx) {
            if (gameState.phase !== 'battle') return false;
            if (ctx.hasUsedOncePerTurn(`122:${ctx.card.uid}:${gameState.turn}`)) return false;
            return ctx.field(ctx.owner).some((s, i) => s && i !== ctx.index && !s.isFaceDown && s.card.race === 'Guerriero');
        },
        activate(ctx) {
            const candidates = [];
            ctx.field(ctx.owner).forEach((s, i) => { if (s && i !== ctx.index && !s.isFaceDown && s.card.race === 'Guerriero') candidates.push(s.card); });
            if (candidates.length === 0) return;
            const applySwap = (target) => {
                ctx.markUsedOncePerTurn(`122:${ctx.card.uid}:${gameState.turn}`);
                ctx.card.attack = Math.max(0, ctx.card.attack - 600);
                target.attack += 600;
                ctx.log(`🔥 Spadaccino di Fiamma Blu trasferisce 600 ATK a ${target.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { applySwap(candidates[0]); return; }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '🔥 Spadaccino di Fiamma Blu',
                text: 'Scegli un altro mostro Guerriero a cui trasferire 600 ATK (questa carta ne perde 600).',
                onSelect: applySwap
            });
        },
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard) return;
            const grave = ctx.graveyard(ctx.owner);
            const selfIdx = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (selfIdx === -1) return;
            const candidates = grave.filter((c) => c.attribute === 'FUOCO' && c.race === 'Guerriero');
            if (candidates.length === 0) return;
            const revive = (target) => {
                grave.splice(selfIdx, 1);
                ctx.banish(ctx.owner, ctx.card); // bandisce Spadaccino di Fiamma Blu dal Cimitero
                const idx = grave.indexOf(target);
                if (idx !== -1) grave.splice(idx, 1);
                ctx.specialSummon(ctx.owner, target, ctx.slotIndex, 'attack', 'graveyard');
                ctx.log(`🔥 Spadaccino di Fiamma Blu si bandisce dal Cimitero: Special Summon ${target.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { revive(candidates[0]); return; }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '🔥 Spadaccino di Fiamma Blu',
                text: 'Scegli 1 mostro Guerriero FUOCO dal Cimitero da Special Summonare (Spadaccino di Fiamma Blu si bandisce).',
                onSelect: revive
            });
        }
    });

    // ================================================================
    // 121 — Blocca Attacco / Block Attack (Magia Normale)
    // Cambia in Posizione di Difesa scoperta un mostro scoperto in
    // Posizione di Attacco controllato dal tuo avversario.
    // SEMPLIFICAZIONE: sceglie da sola il bersaglio (quello con l'ATK più
    // alto, il più minaccioso da disinnescare), stesso spirito di Stop
    // Difesa (id 69) che fa l'equivalente al contrario.
    // ================================================================
    CardEffects.register(121, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown && slot.position === 'attack');
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let highestAtk = -1;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.position === 'attack' && slot.card.attack > highestAtk) {
                    highestAtk = slot.card.attack;
                    targetIndex = i;
                }
            });
            if (targetIndex === -1) return;
            field[targetIndex].position = 'defense';
            ctx.log(`🛡️ Blocca Attacco costringe ${field[targetIndex].card.name} in Posizione di Difesa!`);
        }
    });

    // ================================================================
    // 128 — Buco Trappola senza Fondo / Bottomless Trap Hole (Trappola)
    // Quando l'avversario di chi la controlla Evoca un mostro con 1500+
    // ATK: lo distrugge. Stesso meccanismo di Buco Trappola (id 40), ma
    // SENZA il vincolo "solo se scoperto in Posizione di Attacco" — la
    // carta vera scatta su qualunque Evocazione, non solo quella scoperta.
    // SEMPLIFICAZIONE: "bandiscilo" diventa un normale invio al Cimitero
    // (nessuna zona di bando separata per i mostri in questo motore — solo
    // le carte in Cimitero possono essere bandite da lì, es. Demolizione
    // dell'Anima).
    // ================================================================
    CardEffects.register(128, {
        canActivate(ctx) {
            return ctx.summonedCard.attack >= 1500;
        },
        onOpponentSummon(ctx) {
            const decl = ctx.declareTarget(ctx.opponent, ctx.summonedSlotIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`🕳️ Buco Trappola senza Fondo distrugge ${target ? target.card.name : ctx.summonedCard.name}!`);
        }
    });

    // ================================================================
    // 129 — Bowganian (onStandbyPhase)
    // Durante la tua Standby Phase: infliggi 600 danni al tuo avversario.
    // Il "una volta per turno" del testo reale è automatico: la Standby
    // Phase capita già una sola volta a turno.
    // ================================================================
    CardEffects.register(129, {
        onStandbyPhase(ctx) {
            ctx.dealDamage(ctx.opponent, 600);
            ctx.log('🏹 Bowganian infligge 600 danni durante la Standby Phase!');
        }
    });

    // ================================================================
    // 132 — Soffio di Luce / Breath of Light (Magia Normale)
    // Distrugge tutti i mostri Tipo Roccia scoperti sul Terreno, di
    // entrambi i giocatori.
    // ================================================================
    CardEffects.register(132, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Roccia'));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Roccia') {
                        ctx.destroyMonster(owner, index);
                        count++;
                    }
                });
            });
            ctx.log(`💥 Soffio di Luce distrugge ${count} most${count === 1 ? 'ro' : 'ri'} Tipo Roccia!`);
        }
    });

    // ================================================================
    // 134 — Soffio Esplosivo / Burst Breath (Trappola Normale)
    // Sacrifica 1 mostro Tipo Drago che controlli; distruggi tutti i
    // mostri scoperti sul Terreno (di entrambi i giocatori) con DEF minore
    // o uguale all'ATK che aveva il Drago sacrificato.
    // SEMPLIFICAZIONE: il Drago da sacrificare è auto-selezionato (quello
    // con l'ATK più alto, il più utile), stesso spirito di altre carte con
    // selezione automatica già presenti (es. Faglia, id 243).
    // ================================================================
    CardEffects.register(134, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Drago');
        },
        activate(ctx) {
            const ownField = ctx.field(ctx.owner);
            let tributeIndex = -1;
            let tributeCard = null;
            ownField.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.race === 'Drago' && (!tributeCard || slot.card.attack > tributeCard.attack)) {
                    tributeIndex = i;
                    tributeCard = slot.card;
                }
            });
            if (tributeIndex === -1) return;
            ownField[tributeIndex] = null;
            ctx.graveyard(ctx.owner).push(tributeCard);

            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.defense <= tributeCard.attack) {
                        ctx.destroyMonster(owner, index);
                        count++;
                    }
                });
            });
            ctx.log(`🔥 Soffio Esplosivo sacrifica ${tributeCard.name} e distrugge ${count} most${count === 1 ? 'ro' : 'ri'}!`);
        }
    });

    // ================================================================
    // 131 — Distruttore, il Guerriero Magico (Segnalino Magia + Ignition)
    // Se questa carta viene Evocata NORMALMENTE (non Special Summonata):
    // piazzaci sopra un Segnalino Magia. Guadagna 300 ATK per ogni
    // Segnalino Magia su di essa (buff continuo, stesso meccanismo del
    // punto 1 — gameState.atkDefBonus); puoi rimuoverne uno (effetto
    // Ignition, click sul mostro) per distruggere 1 Magia/Trappola
    // dell'avversario.
    // SEMPLIFICAZIONE: sceglie da sola il bersaglio da distruggere (il
    // primo trovato) invece di un'interfaccia di selezione dedicata.
    // ================================================================
    CardEffects.register(131, {
        onSummon(ctx) {
            ctx.summonedCard.counters = (ctx.summonedCard.counters || 0) + 1;
            ctx.log('🔮 Distruttore, il Guerriero Magico riceve un Segnalino Magia!');
        },
        onSpecialSummon() {}, // il vero effetto scatta solo su Evocazione Normale
        static(ctx) {
            const bonus = (ctx.card.counters || 0) * 300;
            gameState.atkDefBonus[ctx.card.uid] = { atk: bonus, def: 0 };
        },
        canActivate(ctx) {
            const hasCounter = (ctx.card.counters || 0) > 0;
            const hasTarget = ctx.stField(ctx.opponent).some((slot) => slot);
            return hasCounter && hasTarget;
        },
        activate(ctx) {
            const stField = ctx.stField(ctx.opponent);
            const targetIndex = stField.findIndex((slot) => slot);
            if (targetIndex === -1) return;
            ctx.card.counters -= 1;
            const target = stField[targetIndex];
            ctx.graveyard(ctx.opponent).push(target.card);
            stField[targetIndex] = null;
            ctx.log(`🔮 Distruttore rimuove un Segnalino Magia e distrugge ${target.card.name} dell'avversario!`);
        }
    });

    // ================================================================
    // 137 — Soldato Cannone / Cannon Soldier (effetto Ignition)
    // Puoi sacrificare 1 mostro; infliggi 500 danni al tuo avversario. Si
    // attiva cliccando sul mostro già scoperto in campo — vedi il ramo
    // zone === 'monster' di canActivate/activateCard in duel-engine.js.
    // SEMPLIFICAZIONE: sceglie da sola quale mostro sacrificare (un altro,
    // se disponibile, altrimenti se stessa) invece di un'interfaccia di
    // selezione dedicata. Manca il vincolo reale "una volta per turno" —
    // qui è comunque limitata dal fatto che serve un mostro da sacrificare.
    // ================================================================
    CardEffects.register(137, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            let index = field.findIndex((slot, i) => slot && i !== ctx.index);
            if (index === -1) index = ctx.index;
            const sacrificed = field[index];
            field[index] = null;
            ctx.graveyard(ctx.owner).push(sacrificed.card);
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log(`💣 Soldato Cannone sacrifica ${sacrificed.card.name} e infligge 500 danni!`);
        }
    });

    // ================================================================
    // 138 — Distruzione di Carte / Card Destruction (Magia Normale)
    // Entrambi i giocatori scartano quante più carte possono dalla mano,
    // poi ciascuno pesca lo stesso numero di carte che ha scartato.
    // ================================================================
    CardEffects.register(138, {
        activate(ctx) {
            ['player', 'bot'].forEach((owner) => {
                const hand = ctx.hand(owner);
                const discarded = hand.length;
                while (hand.length > 0) {
                    ctx.graveyard(owner).push(hand.pop());
                }
                if (discarded > 0) ctx.drawCards(owner, discarded);
            });
            ctx.log('🔥 Distruzione di Carte: entrambi i giocatori scartano la mano e ripescano lo stesso numero di carte!');
        }
    });

    // ================================================================
    // 139 — Guardia di Carte (Segnalino Guardia, buff continuo)
    // Se questa carta viene Evocata Normalmente o Special Summonata:
    // piazzaci sopra un Segnalino Guardia. Guadagna 300 ATK per ogni
    // Segnalino Guardia su di essa.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunta la seconda abilità mancante — "una
    // volta per turno: scegli come bersaglio 1 altra carta scoperta che
    // controlli; rimuovi 1 Segnalino Guardia da questa carta e mettilo
    // su quel bersaglio" — Ignition dalla zona Mostro (una volta per
    // turno per uid, già garantito generically da usedIgnitionThisTurn).
    // SEMPLIFICAZIONE: sceglie da sola il primo bersaglio idoneo trovato
    // invece di un'interfaccia di selezione dedicata.
    CardEffects.register(139, {
        onSummon(ctx) {
            ctx.summonedCard.counters = (ctx.summonedCard.counters || 0) + 1;
            ctx.log('🛡️ Guardia di Carte riceve un Segnalino Guardia!');
        },
        canActivate(ctx) {
            if (ctx.zone !== 'monster') return false;
            if (!(ctx.card.counters > 0)) return false;
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.uid !== ctx.card.uid)
                || ctx.stField(ctx.owner).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            let target = null;
            const monsterTarget = ctx.field(ctx.owner).find((s) => s && !s.isFaceDown && s.card.uid !== ctx.card.uid);
            if (monsterTarget) target = monsterTarget.card;
            if (!target) {
                const stTarget = ctx.stField(ctx.owner).find((s) => s && !s.isFaceDown);
                if (stTarget) target = stTarget.card;
            }
            if (!target) return;
            ctx.card.counters -= 1;
            target.counters = (target.counters || 0) + 1;
            ctx.log(`🛡️ Guardia di Carte sposta 1 Segnalino Guardia su ${target.name}!`);
        },
        static(ctx) {
            const bonus = (ctx.card.counters || 0) * 300;
            gameState.atkDefBonus[ctx.card.uid] = { atk: bonus, def: 0 };
        }
    });

    // ================================================================
    // 156 — Cavaliere Scarafaggio / Cockroach Knight (onDestroy)
    // Quando questa carta viene distrutta e mandata al Cimitero: torna in
    // cima al tuo Deck invece di restarci.
    // SEMPLIFICAZIONE: funziona solo se esiste un vero Deck mescolato
    // (gameState.playerDeck/botDeck — vedi resetGameState in game-flow.js):
    // in modalità senza un mazzo reale (es. Bot generico del Duello Demo)
    // non c'è un Deck su cui rimettere la carta, quindi resta nel
    // Cimitero.
    // ================================================================
    CardEffects.register(156, {
        onDestroy(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = ctx.gameState[deckKey];
            if (!deck) return;
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.indexOf(ctx.card);
            if (index === -1) return;
            grave.splice(index, 1);
            deck.push(ctx.card); // drawCardsToHand pesca con .pop(): push = "in cima al Deck"
            ctx.gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.log('🪳 Cavaliere Scarafaggio torna in cima al Deck!');
        }
    });

    // ================================================================
    // 157 — Bozzolo dell'Evoluzione / Cocoon of Evolution
    // Si equipaggia dalla MANO (non dal campo) a "Falena Piccola" (id 522)
    // scoperta sul proprio Terreno, la cui ATK/DEF diventa quella di
    // questa carta (0/2000) — non un bonus additivo come i normali Equip,
    // ma una SOSTITUZIONE. Usa comunque isEquip/continuous + findEquipTarget/
    // attachEquip come ogni altro Equip qui sopra (l'activate() da MANO su
    // un mostro con continuous:true è già gestito genericamente da
    // activateCard in duel-engine.js, stesso percorso di Thunder Dragon id
    // 537 — vedi promptHandMonsterActivation in actions.js): l'unica
    // differenza è nel proprio static(), che scrive in gameState.atkDefBonus
    // il DELTA (attacco/difesa di questa carta meno l'attacco/difesa
    // STAMPATA di Falena Piccola, sempre la stessa perché card.attack/
    // defense non vengono mai mutati da altri effetti) invece di un valore
    // fisso, così l'ATK/DEF effettivo del bersaglio (getEffectiveAtk/Def)
    // risulta esattamente 0/2000.
    // Segna anche su Falena Piccola il turno (gameState.turn grezzo, non
    // "turni del proprietario") in cui l'aggancio è avvenuto — serve solo
    // a id 50/52 (Larva Mostruosa/Grande Falena) qui sotto, per il loro
    // "durante il tuo 2°/4° turno dopo che Falena Piccola è stata
    // equipaggiata con Bozzolo dell'Evoluzione".
    // ================================================================
    CardEffects.register(157, {
        continuous: true,
        isEquip: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.id === 522) !== -1; },
        activate(ctx) {
            const i = findEquipTarget(ctx, (c) => c.id === 522);
            if (i !== -1) {
                const target = ctx.field(ctx.owner)[i].card;
                attachEquip(ctx, i);
                if (target.id === 522) target._cocoonEquippedOnTurn = gameState.turn;
            }
        },
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + (ctx.card.attack - t.attack), def: e.def + (ctx.card.defense - t.defense) };
        }
    });

    /**
     * Vero se `owner` controlla una "Falena Piccola" (id 522) scoperta sul
     * proprio Terreno che è stata equipaggiata con "Bozzolo dell'Evoluzione"
     * (id 157, vedi qui sopra) esattamente `ownTurns` PROPRI turni fa — e se
     * è ADESSO il proprio turno (il testo reale dice "durante il tuo Nº
     * turno", non "da quel turno in poi"). Dato che gameState.turn avanza
     * di 1 ad ogni cambio turno (un giocatore alla volta, vedi changeTurn
     * in game-flow.js), N propri turni dopo corrisponde a +2N sul contatore
     * grezzo. Usata da 50 (Larva Mostruosa, N=2) e 52 (Grande Falena, N=4)
     * qui sotto. SEMPLIFICAZIONE: non tiene conto di eventuali turni
     * extra/salti di turno che alterassero questo conteggio — nessuna
     * carta di quel tipo risulta presente in alcun mazzo costruito finora.
     */
    function findPetitMothReadyForCocoonSummon(ctx, ownTurns) {
        if (gameState.currentPlayer !== ctx.owner) return -1;
        return ctx.field(ctx.owner).findIndex((slot) =>
            slot && !slot.isFaceDown && slot.card.id === 522 &&
            slot.card._cocoonEquippedOnTurn != null &&
            (gameState.turn - slot.card._cocoonEquippedOnTurn) === ownTurns * 2
        );
    }

    // ================================================================
    // 50 — Larva Mostruosa / Larvae Moth
    // Non può essere Evocata Normalmente né Set. Special Summonabile solo
    // sacrificando "Falena Piccola" durante il proprio 2° turno dopo che è
    // stata equipaggiata con "Bozzolo dell'Evoluzione" (id 157) — vedi
    // findPetitMothReadyForCocoonSummon qui sopra.
    // ================================================================
    CardEffects.register(50, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) { return findPetitMothReadyForCocoonSummon(ctx, 2) !== -1; },
        paySpecialSummonCost(ctx) {
            const i = findPetitMothReadyForCocoonSummon(ctx, 2);
            if (i === -1) return false;
            const sacrificed = ctx.field(ctx.owner)[i];
            ctx.field(ctx.owner)[i] = null;
            ctx.graveyard(ctx.owner).push(sacrificed.card);
            ctx.log(`🐛 Falena Piccola sacrificata per Special Summonare ${ctx.card.name}!`);
            return true;
        }
    });

    // ================================================================
    // 52 — Grande Falena / Great Moth
    // Identica a 50 (Larva Mostruosa) ma al proprio 4° turno dopo
    // l'equipaggiamento invece del 2°.
    // ================================================================
    CardEffects.register(52, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) { return findPetitMothReadyForCocoonSummon(ctx, 4) !== -1; },
        paySpecialSummonCost(ctx) {
            const i = findPetitMothReadyForCocoonSummon(ctx, 4);
            if (i === -1) return false;
            const sacrificed = ctx.field(ctx.owner)[i];
            ctx.field(ctx.owner)[i] = null;
            ctx.graveyard(ctx.owner).push(sacrificed.card);
            ctx.log(`🐛 Falena Piccola sacrificata per Special Summonare ${ctx.card.name}!`);
            return true;
        }
    });

    // ================================================================
    // 144 — Tartaruga Catapulta / Catapult Turtle (effetto Ignition)
    // Una volta per turno: puoi sacrificare 1 mostro; infliggi danno pari
    // a metà dell'ATK effettivo che aveva il mostro sacrificato. Stesso
    // meccanismo di Soldato Cannone (id 137) più sopra.
    // ================================================================
    CardEffects.register(144, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            let index = field.findIndex((slot, i) => slot && i !== ctx.index);
            if (index === -1) index = ctx.index;
            const sacrificed = field[index];
            const atk = DuelEngine.getEffectiveAtk(sacrificed.card);
            field[index] = null;
            ctx.graveyard(ctx.owner).push(sacrificed.card);
            const damage = Math.floor(atk / 2);
            ctx.dealDamage(ctx.opponent, damage);
            ctx.log(`🐢 Tartaruga Catapulta sacrifica ${sacrificed.card.name} e infligge ${damage} danni!`);
        }
    });

    // ================================================================
    // 165 — Virus Distruggi-Carte / Crush Card Virus (Trappola Normale)
    // Sacrifica 1 mostro OSCURITÀ con 1000 o meno ATK (auto-selezionato,
    // stesso stile di Soffio Esplosivo id 134): il tuo avversario non
    // subisce danni fino alla fine del turno successivo
    // (gameState.pendingNoDamageExpiry, DuelEngine.processNoDamageExpiry
    // — nuovo, un conteggio "N End Phase" invece del semplice flag
    // noDamageFor esistente, dato che deve sopravvivere al cambio
    // turno), poi distruggi i mostri dell'avversario con ATK effettivo
    // 1500+. "Guarda la sua mano": DuelEngineUI.openCardListPicker con
    // selectable:false (stesso componente già usato da id 86 Amazzone
    // Maestra delle Catene per la stessa identica cosa) — SCOPERTA: la
    // nota precedente diceva che questo effetto non esisteva in questo
    // motore, ma esisteva già per un'altra carta. Il testo salvato per
    // questa carta (semplificato rispetto alla vera Crush Card Virus)
    // non menziona alcuna clausola sul Deck: nota rimossa, l'effetto
    // così come descritto qui è ora completo.
    // ================================================================
    CardEffects.register(165, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.attribute === 'OSCURITÀ' && slot.card.attack <= 1000);
        },
        activate(ctx) {
            const ownField = ctx.field(ctx.owner);
            let tributeIndex = -1;
            let tributeCard = null;
            ownField.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.attribute === 'OSCURITÀ' && slot.card.attack <= 1000) {
                    tributeIndex = i;
                    tributeCard = slot.card;
                }
            });
            if (tributeIndex === -1) return;
            ownField[tributeIndex] = null;
            ctx.graveyard(ctx.owner).push(tributeCard);

            gameState.pendingNoDamageExpiry = gameState.pendingNoDamageExpiry || [];
            gameState.pendingNoDamageExpiry.push({ owner: ctx.opponent, endsRemaining: 2 });

            let destroyed = 0;
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && DuelEngine.getEffectiveAtk(slot.card) >= 1500) {
                    ctx.destroyMonster(ctx.opponent, index);
                    destroyed++;
                }
            });
            ctx.log(`☠️ Virus Distruggi-Carte sacrifica ${tributeCard.name}: l'avversario non subisce danni fino alla fine del turno successivo, ${destroyed} mostr${destroyed === 1 ? 'o' : 'i'} con 1500+ ATK distrutt${destroyed === 1 ? 'o' : 'i'}!`);
            if (ctx.owner === 'player' && window.DuelEngineUI) {
                DuelEngineUI.openCardListPicker(ctx.hand(ctx.opponent).slice(), {
                    title: '☠️ Virus Distruggi-Carte',
                    text: "Guardi la mano dell'avversario.",
                    selectable: false,
                    emptyText: "L'avversario non ha carte in mano."
                });
            }
        }
    });

    // ================================================================
    // 166 — Maledizione del Demone / Curse of Fiend (Magia Normale)
    // Scambia la Posizione (Attacco <-> Difesa) di tutti i mostri scoperti
    // sul Terreno, di entrambi i giocatori.
    // CORREZIONE di fedeltà: aggiunti i due vincoli mancanti — attivabile
    // solo durante la propria Standby Phase, e le posizioni scambiate non
    // possono essere ricambiate manualmente per il resto del turno
    // (gameState.cannotChangePositionFor[owner] = gameState.turn, stesso
    // meccanismo già esistente per Controllo Mesmerico id 814, si
    // esaurisce da solo al prossimo cambio turno). Il blocco è consultato
    // SOLO da changeMonsterPosition (actions.js, il click manuale del
    // giocatore) — un ricambio via Magia/Trappola/effetto Mostro (es.
    // Controllore Nemico id 845) muta slot.position direttamente e non
    // passa mai da lì, quindi resta sempre esente per costruzione, esattamente
    // come richiede il testo reale.
    // ================================================================
    CardEffects.register(166, {
        canActivate(ctx) {
            if (gameState.phase !== 'standby' || gameState.currentPlayer !== ctx.owner) return false;
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown) {
                        slot.position = slot.position === 'attack' ? 'defense' : 'attack';
                        count++;
                    }
                });
                gameState.cannotChangePositionFor = gameState.cannotChangePositionFor || {};
                gameState.cannotChangePositionFor[owner] = gameState.turn;
            });
            ctx.log(`🔄 Maledizione del Demone scambia la Posizione di ${count} most${count === 1 ? 'ro' : 'ri'} scopert${count === 1 ? 'o' : 'i'}!`);
        }
    });

    // ================================================================
    // 168 — Maledizione della Bestia Mascherata / Curse of the Masked
    // Beast (Rito) — Special Summon La Bestia Mascherata (id 167) dalla
    // mano, sacrificando dal Terreno mostri per un Livello totale di
    // almeno 8. Stesso meccanismo già usato da Rito del Guerriero Nero
    // (id 56): sacrifica automaticamente i mostri con Livello più alto
    // finché il totale richiesto non è raggiunto.
    // ================================================================
    CardEffects.register(168, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 167);
            if (!hasRitualMonster) return false;
            const totalLevel = ctx.field(ctx.owner).reduce((sum, slot) => sum + (slot ? (slot.card.level || 0) : 0), 0);
            return totalLevel >= 8;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field
                .map((slot, index) => (slot ? { index, level: slot.card.level || 0 } : null))
                .filter(Boolean)
                .sort((a, b) => b.level - a.level);

            let remaining = 8;
            const toSacrifice = [];
            occupied.forEach((entry) => {
                if (remaining <= 0) return;
                toSacrifice.push(entry.index);
                remaining -= entry.level;
            });
            toSacrifice.forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.id === 167);
            if (handIndex === -1) return; // canActivate l'ha già garantito: non dovrebbe succedere
            const [ritualCard] = hand.splice(handIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                // Il Terreno è pieno: il mostro rituale finisce comunque
                // nel Cimitero, invece di sparire nel nulla.
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: La Bestia Mascherata finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('👹 Maledizione della Bestia Mascherata evoca La Bestia Mascherata!');
        }
    });

    // ================================================================
    // 167 — La Bestia Mascherata / The Masked Beast: Evocabile Rituale
    // solo tramite "Maledizione della Bestia Mascherata" (id 168, qui
    // sopra — GIÀ IMPLEMENTATA). Qui serve solo il divieto di Evocazione
    // Normale/Set e di Special Summon per ogni altra via
    // (cannotNormalSummon/cannotBeSpecialSummoned — stesso schema di 413).
    // ================================================================
    CardEffects.register(167, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 150 — Chiron il Mago / Chiron the Mage (effetto Ignition)
    // Una volta per turno: puoi scartare 1 Magia dalla mano, poi scegliere
    // come bersaglio 1 Magia/Trappola controllata dal tuo avversario;
    // distruggila.
    // SEMPLIFICAZIONE: sceglie da sola la Magia da scartare e il bersaglio
    // da distruggere (i primi trovati), invece di un'interfaccia di
    // selezione dedicata.
    // ================================================================
    CardEffects.register(150, {
        canActivate(ctx) {
            const hasSpellInHand = ctx.hand(ctx.owner).some((c) => c.type === 'spell');
            const hasTarget = ctx.stField(ctx.opponent).some((slot) => slot);
            return hasSpellInHand && hasTarget;
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const spellIndex = hand.findIndex((c) => c.type === 'spell');
            if (spellIndex === -1) return;
            const stField = ctx.stField(ctx.opponent);
            const targetIndex = stField.findIndex((slot) => slot);
            if (targetIndex === -1) return;
            const discarded = hand.splice(spellIndex, 1)[0];
            ctx.graveyard(ctx.owner).push(discarded);
            const target = stField[targetIndex];
            ctx.graveyard(ctx.opponent).push(target.card);
            stField[targetIndex] = null;
            ctx.log(`🔮 Chiron il Mago scarta ${discarded.name} e distrugge ${target.card.name} dell'avversario!`);
        }
    });

    // ================================================================
    // 188 — Maga Oscura / Dark Magician Girl (buff continuo)
    // Guadagna 300 ATK per ogni "Mago Nero" nel Cimitero.
    // SEMPLIFICAZIONE: l'effetto reale conta anche "Mago del Caos Nero",
    // carta non presente in questo database — qui conta solo "Mago Nero"
    // (id 2).
    // ================================================================
    CardEffects.register(188, {
        static(ctx) {
            const count = ctx.graveyard(ctx.owner).filter((c) => c.id === 2).length;
            gameState.atkDefBonus[ctx.card.uid] = { atk: count * 300, def: 0 };
        }
    });

    // ================================================================
    // 191 — Saggio Oscuro / Dark Sage
    // Non può essere Evocato Normalmente/Set. Se hai indovinato il
    // lancio di moneta dell'effetto di "Mago del Tempo" (id 28, già
    // registrata — vedi gameState.timeWizardCoinResultFor lì, nuovo):
    // puoi sacrificare 1 "Mago Nero" (id 2) sul Terreno; Special Summon
    // questa carta dalla mano O DAL DECK — la parte "dal Deck" è
    // agganciata direttamente dentro l'attivazione di Mago del Tempo
    // (id 28, cerca "Saggio Oscuro" lì), con una scelta reale
    // (DuelEngineUI.openChoicePopover) dato che non c'è un elemento
    // cliccabile naturale per una carta che sta nel Deck. Se Special
    // Summonata così: aggiungi 1 Magia dal Deck alla mano
    // (ctx.searchDeckToHand).
    // ================================================================
    CardEffects.register(191, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            const r = gameState.timeWizardCoinResultFor;
            const guessedRight = !!(r && r.owner === ctx.owner && r.heads === true && r.turn === gameState.turn);
            return guessedRight && ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
        },
        paySpecialSummonCost(ctx) {
            // Sacrificio, non distruzione — stesso stile diretto già
            // usato per Grande Pillola Evolutiva (id 810)/Soffio
            // Esplosivo (id 134): niente ctx.destroyMonster, un
            // Sacrificio non fa scattare "quando questa carta viene
            // distrutta".
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
            if (index === -1) return false;
            const card = field[index].card;
            field[index] = null;
            ctx.graveyard(ctx.owner).push(card);
            return true;
        },
        onSpecialSummon(ctx) {
            const found = ctx.searchDeckToHand(ctx.owner, (c) => c.type === 'spell', 1);
            if (found.length > 0) ctx.log(`📖 Saggio Oscuro aggiunge ${found[0].name} alla mano dal Deck!`);
        }
    });

    // ================================================================
    // 192 — Santuario Oscuro / Dark Sanctuary (Magia Terreno)
    // Quando un mostro dell'avversario dichiara un attacco: lancia una
    // moneta; se esce Testa, annulla l'attacco e infliggi danno pari a
    // metà dell'ATK di quel mostro — stesso schema di Cilindro Magico
    // (id 10, onAttackDeclare + ctx.cancelAttack), ma da una Magia
    // Terreno invece che una Trappola: nuovo scan sulla zona
    // 'fieldSpell' in findTriggerCandidates (duel-engine.js), che prima
    // ne era del tutto priva — nessuna carta di questo dataset aveva mai
    // avuto bisogno di rispondere agli attacchi da lì.
    // SEMPLIFICAZIONE dichiarata: NON applicata la prima clausola del
    // testo reale (interazione con "Destiny Board"/"Spirit Message",
    // meccanica di vittoria alternativa non presente in questo motore).
    // ================================================================
    CardEffects.register(192, {
        onAttackDeclare(ctx) {
            const heads = Math.random() < 0.5;
            if (!heads) {
                ctx.log('🪙 Santuario Oscuro lancia una moneta: Croce, l\'attacco prosegue.');
                return;
            }
            const damage = Math.floor(ctx.attackerAtk / 2);
            ctx.cancelAttack();
            ctx.dealDamage(ctx.opponent, damage);
            ctx.log(`🪙 Santuario Oscuro lancia una moneta: Testa! Annulla l'attacco e infligge ${damage} danni!`);
        }
    });

    // ================================================================
    // 193 — Zebra Oscura / Dark Zebra (onStandbyPhase)
    // Se questa carta è l'unico mostro che controlli durante la tua
    // Standby Phase: passa in Posizione di Difesa (non può cambiare
    // Posizione in questo stesso turno).
    // ================================================================
    CardEffects.register(193, {
        onStandbyPhase(ctx) {
            const onlyMonster = ctx.field(ctx.owner).filter((slot) => slot).length === 1;
            if (!onlyMonster || ctx.slot.position === 'defense') return;
            ctx.changePosition(ctx.owner, ctx.slotIndex, 'defense');
            ctx.slot.isFaceDown = false;
            ctx.slot.canChangePosition = false;
            ctx.log('🦓 Zebra Oscura, unico mostro in campo, passa in Posizione di Difesa!');
        }
    });

    // ================================================================
    // 195 — Rimuovi Magia / De-Spell (Magia Normale)
    // Distrugge 1 Magia scoperta sul Terreno (di preferenza dell'avversario).
    // SEMPLIFICAZIONE: nella realtà può bersagliare anche una Magia/Trappola
    // Set (rivelandola, e distruggendola solo se è davvero una Magia) — qui
    // sceglie solo fra le Magie GIÀ scoperte (le Continue/Campo, uniche a
    // restare sul Terreno — le Magie Normali si scartano subito dopo la
    // risoluzione, quindi non ci sono mai da colpire con questo effetto).
    // ================================================================
    // CORREZIONE: la versione precedente permetteva di scegliere come
    // bersaglio SOLO una Magia già scoperta. Il testo ufficiale vero
    // ("Target 1 face-up Spell, or 1 Set Spell/Trap, on the field;
    // destroy that target if it is a Spell. If the target is Set, reveal
    // it.") permette invece di scegliere come bersaglio ANCHE una carta
    // Set (Magia o Trappola) non ancora rivelata: se si rivela una
    // Trappola, l'effetto fallisce senza fare nulla; se è una Magia
    // (scoperta o appena rivelata), viene distrutta.
    CardEffects.register(195, {
        canActivate(ctx) {
            return [ctx.opponent, ctx.owner].some((owner) => ctx.stField(owner).some((slot) => slot && (slot.card.type === 'spell' || slot.isFaceDown)));
        },
        activate(ctx) {
            const candidates = [];
            [ctx.owner, ctx.opponent].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (slot && (slot.card.type === 'spell' || slot.isFaceDown)) candidates.push({ owner, index, card: slot.card });
                });
            });
            if (candidates.length === 0) return;
            const destroy = (choice) => {
                const slot = ctx.stField(choice.owner)[choice.index];
                if (!slot || slot.card.uid !== choice.card.uid) return;
                if (slot.isFaceDown) {
                    slot.isFaceDown = false;
                    ctx.log(`🔎 Rimuovi Magia rivela ${choice.card.name}!`);
                }
                if (choice.card.type !== 'spell') {
                    ctx.log(`✨ Rimuovi Magia non ha effetto: ${choice.card.name} non è una Magia.`);
                    return;
                }
                ctx.stField(choice.owner)[choice.index] = null;
                ctx.graveyard(choice.owner).push(choice.card);
                ctx.log(`✨ Rimuovi Magia distrugge ${choice.card.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                // Euristica bot: preferisce un bersaglio SICURAMENTE una
                // Magia (già scoperta) se ce n'è una, invece di rischiare
                // alla cieca su una carta Set.
                const faceUpSpell = candidates.find((c) => c.card.type === 'spell' && !ctx.stField(c.owner)[c.index].isFaceDown);
                destroy(faceUpSpell || candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '✨ Rimuovi Magia',
                text: 'Scegli 1 Magia scoperta, o 1 carta Set, da colpire.',
                onSelect: (card) => {
                    const choice = candidates.find((c) => c.card.uid === card.uid);
                    if (choice) destroy(choice);
                }
            });
        }
    });

    // ================================================================
    // 200 — Dado Dimensionale / Dimension Dice (Magia Normale)
    // Se controlli una carta con un effetto che richiede un lancio di
    // dado: sacrifica 1 mostro; Special Summon dalla mano o dal Deck 1
    // MOSTRO con un effetto che richiede un lancio di dado. Nuova
    // tassonomia minima def.hasDiceRollEffect (opt-in per-carta), taggata
    // qui sopra sulle 4 Magie/Trappole già registrate che tirano un dado
    // (Ragno della Roulette id 425, Dado di Evocazione id 460, Dado
    // Teschio id 445, Dado Aggraziato id 273) e su Dicelops (id 863,
    // aggiunta ora — nessun MOSTRO con un vero effetto a dado esisteva
    // ancora in questo database, verificato via YGOPRODeck/Yugipedia:
    // senza un bersaglio Mostro valido, il pagamento di questa carta
    // sarebbe stato altrimenti sempre inutilizzabile).
    // ================================================================
    CardEffects.register(200, {
        hasDiceRollEffect: true,
        canActivate(ctx) {
            const hasQualifyingCard = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && DuelEngine.getDefinition(s.card.id)?.hasDiceRollEffect)
                || ctx.stField(ctx.owner).some((s) => s && !s.isFaceDown && DuelEngine.getDefinition(s.card.id)?.hasDiceRollEffect);
            if (!hasQualifyingCard) return false;
            if (!ctx.field(ctx.owner).some((s) => s && !s.isFaceDown)) return false;
            const hand = ctx.hand(ctx.owner);
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inHand = hand.some((c) => c.type === 'monster' && DuelEngine.getDefinition(c.id)?.hasDiceRollEffect);
            const inDeck = Array.isArray(deck) && deck.some((c) => c.type === 'monster' && DuelEngine.getDefinition(c.id)?.hasDiceRollEffect);
            return inHand || inDeck;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const sacIndex = field.findIndex((s) => s && !s.isFaceDown);
            if (sacIndex === -1) return;
            ctx.graveyard(ctx.owner).push(field[sacIndex].card);
            field[sacIndex] = null;

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.type === 'monster' && DuelEngine.getDefinition(c.id)?.hasDiceRollEffect);
            let card;
            let fromZone;
            if (handIndex !== -1) {
                [card] = hand.splice(handIndex, 1);
                fromZone = 'hand';
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = gameState[deckKey];
                const deckIndex = Array.isArray(deck) ? deck.findIndex((c) => c.type === 'monster' && DuelEngine.getDefinition(c.id)?.hasDiceRollEffect) : -1;
                if (deckIndex === -1) return;
                [card] = deck.splice(deckIndex, 1);
                gameState[countKey] = deck.length;
                fromZone = 'deck';
            }
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(card);
                return;
            }
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', fromZone);
            ctx.log(`🎲 Dado Dimensionale Special Summona ${card.name}!`);
        }
    });

    // ================================================================
    // 863 — Dicelops
    // Una volta per turno (Ignition, gestito già in automatico dal
    // motore via gameState.usedIgnitionThisTurn): lancia un dado a sei
    // facce. 1: guarda la mano dell'avversario e scarta 1 carta dalla
    // sua mano. 2-5: scarta 1 carta dalla propria mano. 6: scarta
    // l'intera propria mano.
    // ================================================================
    CardEffects.register(863, {
        hasDiceRollEffect: true,
        activate(ctx) {
            const roll = 1 + Math.floor(Math.random() * 6);
            if (window.FX) FX.playDiceRoll(roll);
            ctx.log(`🎲 Dicelops lancia il dado: ${roll}!`);
            if (roll === 1) {
                const oppHand = ctx.hand(ctx.opponent);
                if (oppHand.length > 0) {
                    const discarded = oppHand.splice(0, 1)[0];
                    ctx.graveyard(ctx.opponent).push(discarded);
                    ctx.log(`🎲 Scarta ${discarded.name} dalla mano dell'avversario!`);
                }
            } else if (roll === 6) {
                const hand = ctx.hand(ctx.owner);
                const count = hand.length;
                while (hand.length > 0) ctx.graveyard(ctx.owner).push(hand.pop());
                ctx.log(`🎲 Scarta l'intera mano (${count} cart${count === 1 ? 'a' : 'e'})!`);
            } else {
                const hand = ctx.hand(ctx.owner);
                if (hand.length > 0) {
                    const discarded = hand.splice(0, 1)[0];
                    ctx.graveyard(ctx.owner).push(discarded);
                    ctx.log(`🎲 Scarta ${discarded.name}!`);
                }
            }
        }
    });

    // ================================================================
    // 201 — Buco Dimensionale / Dimension Hole (Magia Normale)
    // Scegli 1 mostro sul tuo Terreno; bandiscilo fino alla tua prossima
    // Standby Phase.
    // SEMPLIFICAZIONE: sceglie da sola quale mostro bandire (il primo
    // trovato) invece di un'interfaccia di selezione dedicata.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunta la clausola mancante "finché il
    // mostro resta bandito, quella Zona Mostro non può essere usata" —
    // nuovo 4° parametro lockZoneIndex di ctx.banishTemporarily
    // (duel-engine.js), consultato da ACTIONS.findEmptyMonsterSlot (per
    // la selezione automatica) E da attemptMonsterSummon (actions.js, per
    // il posizionamento manuale via click/drag&drop — bug reale corretto:
    // bypassava il blocco cliccando direttamente sullo slot vuoto).
    CardEffects.register(201, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot);
            if (index === -1) return;
            const banished = field[index].card;
            field[index] = null;
            ctx.banishTemporarily(ctx.owner, banished, 'standby', index);
            ctx.log(`🕳️ Buco Dimensionale bandisce ${banished.name} fino alla tua prossima Standby Phase! Quella Zona Mostro non può essere usata finché non torna.`);
        }
    });

    // ================================================================
    // 202 — Bambola della Rovina / Doll of Demise
    // Durante la tua prossima Standby Phase dopo che questa carta è stata
    // mandata dal campo al Cimitero dall'effetto di una Magia Continua:
    // Special Summonala dal Cimitero. ctx.destroyedByCard (nuovo,
    // duel-engine.js/ACTIONS.destroyMonster, stesso trucco del `this`-
    // binding di destroyedByOwner) è la carta sorgente che ha causato
    // QUESTA distruzione — controlliamo che sia una Magia Continua
    // scoperta (subtype 'continuous'), stesso spirito/stesso schema di
    // Signore dei Vampiri (id 658) ma con una condizione più specifica
    // sulla FONTE invece che sul proprietario.
    // ================================================================
    CardEffects.register(202, {
        onDestroy(ctx) {
            if (!ctx.destroyedByCard || ctx.destroyedByCard.type !== 'spell' || ctx.destroyedByCard.subtype !== 'continuous') return;
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            const [card] = grave.splice(index, 1);
            ctx.reviveFromGraveyardWithCountdown(ctx.owner, card, 1);
            ctx.log(`💀 ${card.name} tornerà in campo alla tua prossima Standby Phase!`);
        }
    });

    // ================================================================
    // 206 — Vaso Cattura-Drago / Dragon Capture Jar (effetto CONTINUO
    // della Trappola, non un'attivazione manuale — come Jinzo, id 17)
    // Finché scoperta sul Terreno: tutti i mostri Tipo Drago scoperti, di
    // entrambi i giocatori, vengono tenuti in Posizione di Difesa.
    // ================================================================
    CardEffects.register(206, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, i) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Drago' && slot.position !== 'defense') {
                        ctx.changePosition(owner, i, 'defense');
                        slot.canChangePosition = false;
                    }
                });
            });
        }
    });

    // ================================================================
    // 210 — Cacciatore di Draghi / Dragon Seeker (effetto all'Evocazione)
    // Quando questa carta viene Evocata: distrugge 1 mostro Tipo Drago
    // scoperto sul Terreno (di preferenza dell'avversario).
    // SEMPLIFICAZIONE: l'effetto reale scatta solo su Evocazione Normale o
    // Flip Summon — qui, per come è collegato onSummon() in
    // js/engine/duel-engine.js, scatta anche su Special Summon (nessuna carta di
    // questo set Special Summona Cacciatore di Draghi, quindi la
    // differenza non si nota in pratica).
    // ================================================================
    CardEffects.register(210, {
        onSummon(ctx) {
            let targetOwner = null;
            let targetIndex = -1;
            [ctx.opponent, ctx.owner].forEach((owner) => {
                if (targetIndex !== -1) return;
                ctx.field(owner).forEach((slot, index) => {
                    if (targetIndex !== -1) return;
                    if (owner === ctx.owner && index === ctx.summonedSlotIndex) return; // mai se stesso
                    if (slot && !slot.isFaceDown && slot.card.race === 'Drago') {
                        targetOwner = owner;
                        targetIndex = index;
                    }
                });
            });
            if (targetIndex === -1) return;
            const destroyedName = ctx.field(targetOwner)[targetIndex].card.name;
            ctx.destroyMonster(targetOwner, targetIndex);
            ctx.log(`🐉 Cacciatore di Draghi, evocato, distrugge ${destroyedName}!`);
        }
    });

    // ================================================================
    // 219 — Tornado di Polvere / Dust Tornado (Trappola Normale)
    // Distrugge 1 Magia/Trappola controllata dall'avversario (scoperta o
    // Set).
    // SEMPLIFICAZIONE: manca la seconda parte dell'effetto reale ("poi
    // puoi Set 1 Magia/Trappola dalla mano") — richiederebbe scegliere e
    // piazzare una carta dalla mano nello stesso momento in cui si
    // risolve un'altra carta, un flusso non ancora presente nel motore.
    // ================================================================
    CardEffects.register(219, {
        canActivate(ctx) {
            return ctx.stField(ctx.opponent).some((slot) => slot !== null);
        },
        activate(ctx) {
            const field = ctx.stField(ctx.opponent);
            const index = field.findIndex((slot) => slot !== null);
            if (index === -1) return;
            const card = field[index].card;
            ctx.graveyard(ctx.opponent).push(card);
            field[index] = null;
            ctx.log(`🌪️ Tornado di Polvere distrugge ${card.name}!`);
        }
    });

    // ================================================================
    // 228 — Aerosol Sterminatore / Eradicating Aerosol (Magia Normale)
    // Distrugge tutti i mostri Tipo Insetto scoperti sul Terreno, di
    // entrambi i giocatori. Stesso schema di Soffio di Luce (id 132), solo
    // con Tipo Insetto al posto di Tipo Roccia.
    // ================================================================
    CardEffects.register(228, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Insetto'));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Insetto') {
                        ctx.destroyMonster(owner, index);
                        count++;
                    }
                });
            });
            ctx.log(`💥 Aerosol Sterminatore distrugge ${count} most${count === 1 ? 'ro' : 'ri'} Tipo Insetto!`);
        }
    });

    // ================================================================
    // 229 — Bandisci il Malvagio / Exile of the Wicked (Magia Normale)
    // Distrugge tutti i mostri Tipo Demone scoperti sul Terreno, di
    // entrambi i giocatori. Stesso schema di Soffio di Luce (id 132), solo
    // con Tipo Demone al posto di Tipo Roccia.
    // ================================================================
    CardEffects.register(229, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Demone'));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Demone') {
                        ctx.destroyMonster(owner, index);
                        count++;
                    }
                });
            });
            ctx.log(`💥 Bandisci il Malvagio distrugge ${count} most${count === 1 ? 'ro' : 'ri'} Tipo Demone!`);
        }
    });

    // ================================================================
    // 240 — Ordini d'Attacco Finali / Final Attack Orders (effetto
    // CONTINUO della Trappola, non un'attivazione manuale — stesso schema
    // di Vaso Cattura-Drago, id 206, ma su TUTTI i mostri scoperti di
    // entrambi i giocatori invece che solo sui Tipo Drago).
    // ================================================================
    CardEffects.register(240, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, i) => {
                    if (slot && !slot.isFaceDown && slot.position !== 'attack') {
                        ctx.changePosition(owner, i, 'attack');
                        slot.canChangePosition = false;
                    }
                });
            });
        }
    });

    // ================================================================
    // 243 — Faglia / Fissure (Magia Normale)
    // Distrugge il mostro scoperto con l'ATK più basso controllato
    // dall'avversario (a parità di ATK, sceglie il primo trovato).
    // ================================================================
    CardEffects.register(243, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let lowestAtk = Infinity;
            field.forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.attack < lowestAtk) {
                    lowestAtk = slot.card.attack;
                    targetIndex = index;
                }
            });
            if (targetIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, targetIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            const name = target ? target.card.name : field[targetIndex].card.name;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`⚡ Faglia distrugge ${name} (ATK più basso)!`);
        }
    });

    // ================================================================
    // 251 — Sepoltura Sciocca / Foolish Burial (Magia Normale)
    // Manda 1 mostro dal proprio Deck al Cimitero.
    // SEMPLIFICAZIONE: funziona solo quando il giocatore ha un Deck reale
    // in gameState.playerDeck/botDeck (costruito da SaveManager o da un
    // mazzo a tema avversario — vedi drawCardsToHand in game-flow.js). Nel
    // Duello Demo generico, se il bot non ha un mazzo a tema, il suo Deck
    // resta un pool casuale senza array reale: in quel caso l'effetto non
    // è attivabile per lui (canActivate ritorna false).
    // ================================================================
    CardEffects.register(251, {
        canActivate(ctx) {
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            return Array.isArray(deck) && deck.some((c) => c.type === 'monster');
        },
        activate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = ctx.gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster');
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            ctx.gameState[countKey] = deck.length;
            ctx.graveyard(ctx.owner).push(card);
            ctx.log(`⚰️ Sepoltura Sciocca manda ${card.name} al Cimitero!`);
        }
    });

    // ================================================================
    // 248 — Kamakiri Volante #1 / Flying Kamakiri #1 (onDestroy)
    // Quando questa carta viene distrutta in battaglia e mandata al
    // Cimitero: puoi Special Summon dal Deck, scoperto in Posizione di
    // Attacco, 1 mostro VENTO con 1500 o meno ATK.
    // SEMPLIFICAZIONE: stesso limite di Sepoltura Sciocca qui sopra —
    // funziona solo con un Deck reale in gameState.playerDeck/botDeck.
    // ================================================================
    CardEffects.register(248, {
        onDestroy(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = ctx.gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.attribute === 'VENTO' && c.attack <= 1500);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const card = deck.splice(index, 1)[0];
            ctx.gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🦗 Kamakiri Volante #1 Special Summona ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 257 — Golem Meccanico la Fortezza Mobile / Gear Golem the Moving
    // Fortress (effetto Ignition)
    // Puoi pagare 800 Life Points; questa carta può attaccare direttamente
    // il tuo avversario in questo turno, anche se controlla dei mostri —
    // vedi endAttackDrag() in game-flow.js, che consulta
    // gameState.directAttackAllowedFor.
    // SEMPLIFICAZIONE: attivabile in tutto il proprio Main Phase (1 o 2),
    // non solo nel Main Phase 1 come da testo reale.
    // ================================================================
    CardEffects.register(257, {
        canActivate(ctx) {
            return gameState[ctx.owner === 'player' ? 'playerLP' : 'botLP'] > 800;
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 800);
            gameState.directAttackAllowedFor = gameState.directAttackAllowedFor || {};
            gameState.directAttackAllowedFor[ctx.card.uid] = true;
            ctx.log('⚙️ Golem Meccanico la Fortezza Mobile paga 800 Life Points: può attaccare direttamente questo turno!');
        }
    });

    // ================================================================
    // 259 — Germe Gigante / Giant Germ (onDestroy)
    // Quando questa carta viene distrutta in battaglia e mandata al
    // Cimitero: infliggi 500 danni al tuo avversario.
    // SEMPLIFICAZIONE: manca la seconda clausola ("poi puoi Special
    // Summon dal Deck un numero qualsiasi di altri 'Germe Gigante'
    // scoperti in Posizione di Attacco") — richiederebbe cercare TUTTE le
    // copie corrispondenti nel Deck ed Evocarle una per una, un
    // meccanismo di ricerca multipla non ancora presente.
    // ================================================================
    CardEffects.register(259, {
        onDestroy(ctx) {
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log('🦠 Germe Gigante, distrutto in battaglia, infligge 500 danni!');
        }
    });

    // ================================================================
    // 262 — Turbine Gigante / Giant Trunade (Magia Normale)
    // Fa tornare in mano tutte le Magie/Trappole sul Terreno, di entrambi
    // i giocatori.
    // ================================================================
    CardEffects.register(262, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.stField(owner).some((slot) => slot !== null));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (slot) {
                        ctx.hand(owner).push(slot.card);
                        ctx.stField(owner)[index] = null;
                        count++;
                    }
                });
            });
            ctx.log(`🌪️ Turbine Gigante fa tornare in mano ${count} cart${count === 1 ? 'a' : 'e'} Magia/Trappola!`);
        }
    });

    // ================================================================
    // 267 — Gilford il Fulmine / Gilford the Lightning (onSummon)
    // Se Evocata Normalmente: distruggi tutti i mostri controllati dal tuo
    // avversario.
    // SEMPLIFICAZIONE: il testo reale richiede di sacrificare 3 mostri
    // invece dei 2 standard per un Livello 8 — qui si Evoca con i 2
    // Tributi standard (vedi getTributesRequired in cards-db.js), ma
    // distrugge comunque tutto quando entra in campo.
    // ================================================================
    CardEffects.register(267, {
        onSummon(ctx) {
            ctx.destroyAllMonsters(ctx.opponent);
            ctx.log('⚡ Gilford il Fulmine distrugge tutti i mostri del tuo avversario!');
        },
        onSpecialSummon() {} // il vero effetto scatta solo su Evocazione Normale
    });

    // ================================================================
    // 263 — Dono dell'Elfa Mistica / Gift of The Mystical Elf (Trappola
    // Normale)
    // Guadagna 300 Life Points per ogni mostro sul Terreno, di entrambi i
    // giocatori.
    // ================================================================
    CardEffects.register(263, {
        activate(ctx) {
            const count = ctx.field('player').filter((s) => s).length + ctx.field('bot').filter((s) => s).length;
            const gain = count * 300;
            ctx.dealDamage(ctx.owner, -gain);
            ctx.log(`👼 Dono dell'Elfa Mistica cura ${gain} Life Points (${count} mostri sul Terreno)!`);
        }
    });

    // ================================================================
    // 266 — Gilasaurus (Special Summon dalla mano)
    // Puoi Special Summon questa carta dalla tua mano. Se viene Evocata
    // così: il tuo avversario può Special Summon 1 mostro dal proprio
    // Cimitero.
    // SEMPLIFICAZIONE: il "può" dell'avversario diventa automatico se ha
    // un mostro nel Cimitero (stesso spirito di altre carte "puoi" già
    // presenti in questo file).
    // ================================================================
    CardEffects.register(266, {
        canSpecialSummonFromHand() { return true; },
        onSpecialSummon(ctx) {
            const grave = ctx.graveyard(ctx.opponent);
            const index = grave.findIndex((c) => c.type === 'monster');
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.opponent);
            if (slotIndex === -1) return;
            const card = grave.splice(index, 1)[0];
            ctx.specialSummon(ctx.opponent, card, slotIndex, 'attack', 'graveyard');
            ctx.log(`🦖 Gilasaurus permette all'avversario di Special Summonare ${card.name} dal Cimitero!`);
        }
    });

    // ================================================================
    // 272 — Carità Aggraziata / Graceful Charity (Magia Normale)
    // Pesca 3 carte, poi scarta 2 carte.
    // SEMPLIFICAZIONE: l'effetto reale lascia scegliere al giocatore quali
    // 2 carte scartare — qui, non essendo presente un'interfaccia di
    // selezione dalla mano, si scartano automaticamente le ultime 2 carte
    // in mano dopo la pescata (le 2 appena pescate per ultime).
    // ================================================================
    CardEffects.register(272, {
        activate(ctx) {
            ctx.drawCards(ctx.owner, 3);
            const hand = ctx.hand(ctx.owner);
            let discarded = 0;
            for (let i = 0; i < 2 && hand.length > 0; i++) {
                const card = hand.pop();
                ctx.graveyard(ctx.owner).push(card);
                discarded++;
            }
            ctx.log(`💖 Carità Aggraziata pesca 3 carte e scarta ${discarded}!`);
        }
    });

    // ================================================================
    // 224 — Egotista Elegante / Elegant Egotist (Magia Normale)
    // Se "Lady Arpia" (id 288) o "Arpia Cyber" (id 172, il cui nome è
    // sempre considerato "Harpie Lady") è scoperta sul Terreno: Special
    // Summon 1 "Lady Arpia" o "Sorelle Lady Arpia" (id 290) dalla mano o
    // dal Deck. AGGIORNATO in pagina 12/26 ora che Lady Arpia e Sorelle
    // Lady Arpia sono finalmente presenti in questo database (prima era
    // data-only per mancanza dei materiali).
    // SEMPLIFICAZIONE: la ricerca dal Deck funziona solo se esiste un
    // Deck reale (gameState.playerDeck/botDeck) — stesso limite di
    // Sepoltura Sciocca (id 251) qui sopra.
    // ================================================================
    CardEffects.register(224, {
        canActivate(ctx) {
            const hasHarpieOnField = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && isHarpieLadySupport(slot.card));
            if (!hasHarpieOnField) return false;
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return false;
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inHand = ctx.hand(ctx.owner).some((c) => isHarpieLadySupport(c) || c.id === 290);
            const inDeck = Array.isArray(deck) && deck.some((c) => isHarpieLadySupport(c) || c.id === 290);
            return inHand || inDeck;
        },
        activate(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => isHarpieLadySupport(c) || c.id === 290);
            let card;
            if (handIdx !== -1) {
                card = hand.splice(handIdx, 1)[0];
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = ctx.gameState[deckKey];
                if (!Array.isArray(deck)) return;
                const deckIdx = deck.findIndex((c) => isHarpieLadySupport(c) || c.id === 290);
                if (deckIdx === -1) return;
                card = deck.splice(deckIdx, 1)[0];
                ctx.gameState[countKey] = deck.length;
            }
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🦅 Egotista Elegante Special Summona ${card.name}!`);
        }
    });

    // ================================================================
    // 282 — Guardiano Falce del Terrore (Special Summon dalla mano)
    // Non può essere Evocata Normalmente/Set. Deve essere Special
    // Summonata tramite il proprio effetto: se "Guardian Eatos" (id 523)
    // viene distrutta e mandata al tuo Cimitero, puoi Special Summonare
    // questa carta dalla mano.
    // SEMPLIFICAZIONE: la condizione diventa "hai Guardian Eatos nel tuo
    // Cimitero" (senza richiedere che ci sia arrivata PROPRIO nell'ultimo
    // istante per distruzione), stesso spirito delle altre approssimazioni
    // di questo file. Manca "non puoi Evocare Normalmente/Special
    // Summonare altri mostri finché questa carta è in campo".
    // ================================================================
    // CORREZIONE di fedeltà: entrambe le dipendenze della nota precedente
    // sono in realtà già presenti nel database ("Guardian Eatos" id 523,
    // "Falce del Mietitore - Falce del Terrore" id 411) — nota obsoleta.
    // Aggiunto l'effetto mancante "se Special Summonata: puoi equipaggiare
    // 1 Falce del Mietitore - Falce del Terrore dal Deck a questa carta"
    // (stesso schema di attachEquip/equippedTarget, id 411).
    // SEMPLIFICAZIONE: mancano ancora "non puoi Evocare Normalmente/
    // Special Summonare altri mostri finché questa carta è in campo" —
    // nessun aggancio generico "blocca ogni altra Evocazione" esiste in
    // questo motore. La seconda ("se mandata dal Terreno al Cimitero:
    // scarta 1 carta, e se lo fai, Special Summonala dal Cimitero") è
    // implementabile: "dal Terreno al Cimitero" copre esattamente
    // distruzione (onDestroy) e Sacrificio per Evocazione Tributo
    // (onSacrificedForTribute, entrambi già esistenti come agganci
    // generici) — non serve il generico "lascia il campo in QUALUNQUE
    // modo" (bando/ritorno in mano non vanno al Cimitero).
    function guardianFalceReviveFromGraveyard(ctx) {
        const grave = ctx.graveyard(ctx.owner);
        const index = grave.findIndex((c) => c.uid === ctx.card.uid);
        if (index === -1) return;
        const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
        if (slotIndex === -1) return;
        const discarded = ctx.discardRandomFromHand(ctx.owner);
        if (!discarded) return;
        const [card] = grave.splice(index, 1);
        ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
        ctx.log(`🔪 Guardiano Falce del Terrore scarta ${discarded.name}: torna in campo dal Cimitero!`);
    }
    CardEffects.register(282, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.id === 523);
        },
        onSpecialSummon(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const dIndex = deck.findIndex((c) => c.id === 411);
            if (dIndex === -1) return;
            const freeStSlot = ctx.stField(ctx.owner).findIndex((s) => s === null);
            if (freeStSlot === -1) return;
            const ownIndex = ctx.field(ctx.owner).findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (ownIndex === -1) return;
            const [scytheCard] = deck.splice(dIndex, 1);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            scytheCard.equippedToOwner = ctx.owner;
            scytheCard.equippedToIndex = ownIndex;
            scytheCard.equippedToUid = ctx.card.uid;
            ctx.stField(ctx.owner)[freeStSlot] = { card: scytheCard, isFaceDown: false, setOnTurn: gameState.turn };
            ctx.log(`🔪 Guardiano Falce del Terrore equipaggia ${scytheCard.name} dal Deck!`);
        },
        onDestroy: guardianFalceReviveFromGraveyard,
        onSacrificedForTribute: guardianFalceReviveFromGraveyard
    });

    // ================================================================
    // 291 — Piumino delle Arpie / Harpie's Feather Duster (Magia Normale)
    // Distrugge tutte le Magie/Trappole controllate dall'avversario.
    // ================================================================
    CardEffects.register(291, {
        canActivate(ctx) {
            return ctx.stField(ctx.opponent).some((slot) => slot !== null);
        },
        activate(ctx) {
            let count = 0;
            ctx.stField(ctx.opponent).forEach((slot, index) => {
                if (slot) {
                    ctx.destroySpellTrap(ctx.opponent, index);
                    count++;
                }
            });
            ctx.log(`🪶 Piumino delle Arpie distrugge ${count} cart${count === 1 ? 'a' : 'e'} Magia/Trappola dell'avversario!`);
        }
    });

    // ================================================================
    // 292 — Tempesta di Piume delle Arpie / Harpie's Feather Storm
    // (Trappola Normale)
    // Se controlli un mostro Bestia Alata VENTO: fino alla fine di questo
    // turno, annulla tutti gli effetti dei mostri che l'avversario
    // attiva. gameState.monsterEffectsNegatedUntilEndOfTurnFor (nuovo,
    // consultato da DuelEngine.areMonsterEffectsNegatedFor in tutti i
    // punti in cui un effetto Mostro può scattare — Ignition, Flip,
    // auto-effetti di Evocazione/attacco/distruzione/cambio Posizione,
    // Standby/End Phase — azzerato ad ogni cambio turno), stesso schema
    // di gameState.trapsNegatedUntilEndOfTurnFor (Scintilla dell'Estasi
    // Triangolare, id 789) ma per i Mostri.
    // SEMPLIFICAZIONE dichiarata: non applicata "attivabile dalla mano se
    // controlli un mostro 'Harpie'" — le Trappole in questo motore devono
    // sempre essere Set prima di potersi attivare, per regola del
    // progetto (mai attivate direttamente dalla mano). La terza clausola
    // ("se questa carta viene distrutta da un effetto avversario mentre
    // è Set: recupera 1 Piumino delle Arpie") è implementata: onSTDestroyed
    // (duel-engine.js/destroySpellTrap) scatta per QUALSIASI Magia/
    // Trappola distrutta, scoperta O coperta (ctx.wasFaceDown distingue),
    // non solo per quelle già attivate — nota precedente sbagliata su
    // questo punto, corretta qui.
    // ================================================================
    CardEffects.register(292, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Bestia Alata' && slot.card.attribute === 'VENTO');
        },
        activate(ctx) {
            gameState.monsterEffectsNegatedUntilEndOfTurnFor = gameState.monsterEffectsNegatedUntilEndOfTurnFor || {};
            gameState.monsterEffectsNegatedUntilEndOfTurnFor[ctx.opponent] = true;
            ctx.log('🌪️ Tempesta di Piume delle Arpie annulla tutti gli effetti Mostro dell\'avversario fino alla fine del turno!');
        },
        onSTDestroyed(ctx) {
            if (!ctx.wasFaceDown || !ctx.destroyedByOwner || ctx.destroyedByOwner === ctx.owner) return;
            const grave = ctx.graveyard(ctx.owner);
            const graveIndex = grave.findIndex((c) => c.id === 291);
            if (graveIndex !== -1) {
                const [found] = grave.splice(graveIndex, 1);
                ctx.hand(ctx.owner).push(found);
                ctx.log(`🌪️ ${ctx.card.name} distrutta: recuperi ${found.name} dal Cimitero!`);
                return;
            }
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const deckIndex = deck.findIndex((c) => c.id === 291);
            if (deckIndex === -1) return;
            const [found] = deck.splice(deckIndex, 1);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.hand(ctx.owner).push(found);
            ctx.log(`🌪️ ${ctx.card.name} distrutta: recuperi ${found.name} dal Deck!`);
        }
    });

    // ================================================================
    // 293 — Drago da Compagnia delle Arpie / Harpie's Pet Dragon (buff continuo)
    // Guadagna 300 ATK/DEF per ogni "Lady Arpia" (incluso Arpia Cyber id 172 — vedi isHarpieLadySupport) sul Terreno.
    // ================================================================
    CardEffects.register(293, {
        static(ctx) {
            const count = ctx.field(ctx.owner).filter((slot) => slot && !slot.isFaceDown && isHarpieLadySupport(slot.card)).length;
            gameState.atkDefBonus[ctx.card.uid] = { atk: count * 300, def: count * 300 };
        }
    });

    // ================================================================
    // 297 — Hinotama (Magia Normale)
    // Infliggi 500 danni al tuo avversario.
    // ================================================================
    CardEffects.register(297, {
        activate(ctx) {
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log(`🔥 Hinotama infligge 500 danni!`);
        }
    });

    // ================================================================
    // 311 — Soldati Insetto del Cielo (bonus Damage Step)
    // Se questa carta attacca un mostro VENTO: guadagna 1000 ATK, ma solo
    // durante il Damage Step di quella battaglia (non un buff persistente).
    // ================================================================
    CardEffects.register(311, {
        damageStepBonus(ctx) {
            if (ctx.role === 'attacker' && ctx.opponentCard && ctx.opponentCard.attribute === 'VENTO') {
                return { atk: 1000 };
            }
            return null;
        }
    });

    // ================================================================
    // 312 — Trasportatore di Materia Interdimensionale / Interdimensional
    // Matter Transporter (Trappola Normale)
    // Scegli come bersaglio 1 mostro scoperto che controlli; bandiscilo
    // fino alla End Phase.
    // ================================================================
    CardEffects.register(312, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown);
            if (index === -1) return;
            const banished = field[index].card;
            field[index] = null;
            ctx.banishTemporarily(ctx.owner, banished, 'endphase');
            ctx.log(`🌀 Trasportatore di Materia Interdimensionale bandisce ${banished.name} fino alla End Phase!`);
        }
    });

    // ================================================================
    // 320 — Kaiser Glider (immunità battaglia + onDestroy)
    // Non può essere distrutta in battaglia da un mostro con lo stesso ATK
    // (survivesEqualAtkBattle, controllato nel pareggio dentro
    // resolveBattleDamage in actions.js). Se questa carta viene distrutta
    // e mandata al Cimitero: scegli come bersaglio 1 mostro sul Terreno;
    // fallo tornare in mano.
    // SEMPLIFICAZIONE: sceglie da sola il bersaglio da far tornare in mano
    // (il primo mostro dell'avversario trovato, altrimenti un proprio)
    // invece di un'interfaccia di selezione dedicata.
    // ================================================================
    CardEffects.register(320, {
        survivesEqualAtkBattle: true,
        onDestroy(ctx) {
            let targetOwner = ctx.opponent;
            let targetIndex = ctx.field(ctx.opponent).findIndex((slot) => slot);
            if (targetIndex === -1) {
                targetOwner = ctx.owner;
                targetIndex = ctx.field(ctx.owner).findIndex((slot) => slot);
            }
            if (targetIndex === -1) return;
            const field = ctx.field(targetOwner);
            const bounced = field[targetIndex].card;
            field[targetIndex] = null;
            ctx.hand(targetOwner).push(bounced);
            ctx.log(`🐉 Kaiser Glider, distrutto, fa tornare in mano ${bounced.name}!`);
        }
    });

    // ================================================================
    // 322 — Kaitoptera
    // Effetto Ignition: durante il proprio Main Phase, cerca "Fusione"
    // (id 38) dal Deck alla mano — stesso ctx.searchDeckToHand già usato
    // da id 533. "Se il tuo avversario controlla 2+ mostri scoperti
    // (eccetto VENTO), quei mostri non possono bersagliarla in attacco":
    // gameState.cannotBeAttackTargetUids ora accetta anche una funzione
    // (attackerCard) => bool (estesa in resolveAttack, actions.js), non
    // solo `true` — qui blocca ogni attaccante NON VENTO.
    // "Se bandita: Special Summonala, poi cerca Fusione dal Cimitero" —
    // def.onBanished (duel-engine.js, ACTIONS.banish), aggiunto DOPO che
    // la nota precedente era stata scritta: nota corretta, il trigger ora
    // esiste (usato anche da Amplificatore id 92, Festa Isterica id 790).
    // ================================================================
    CardEffects.register(322, {
        canActivate(ctx) {
            return Array.isArray(gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck']);
        },
        activate(ctx) {
            ctx.searchDeckToHand(ctx.owner, (c) => c.id === 38, 1);
        },
        static(ctx) {
            const nonWindCount = ctx.field(ctx.opponent).filter((s) => s && !s.isFaceDown && s.card.attribute !== 'VENTO').length;
            if (nonWindCount < 2) return;
            gameState.cannotBeAttackTargetUids = gameState.cannotBeAttackTargetUids || {};
            gameState.cannotBeAttackTargetUids[ctx.card.uid] = (attackerCard) => attackerCard.attribute !== 'VENTO';
        },
        onBanished(ctx) {
            const banishedZone = ctx.banished(ctx.owner);
            const index = banishedZone.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return; // resta bandita se il Terreno è pieno
            const [card] = banishedZone.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('🦅 Kaitoptera torna in campo dalla Zona Bandite!');
            const grave = ctx.graveyard(ctx.owner);
            const fusionIndex = grave.findIndex((c) => c.id === 38);
            if (fusionIndex !== -1) {
                const [fusionCard] = grave.splice(fusionIndex, 1);
                ctx.hand(ctx.owner).push(fusionCard);
                ctx.log('🔍 Kaitoptera recupera Fusione dal Cimitero!');
            }
        }
    });

    // ================================================================
    // 333 — Kunai con Catena / Kunai with Chain (Trappola a doppio effetto)
    // Attiva 1 o entrambi questi effetti (simultaneamente):
    // ●Quando un mostro dell'avversario dichiara un attacco: cambia
    //  l'attaccante in Posizione di Difesa, annullando l'attacco.
    // ●Scegli 1 tuo mostro scoperto; equipaggia questa carta a quel
    //  bersaglio (+500 ATK).
    // La nota precedente la dava per "troppo esotica" perché
    // "contemporaneamente Trappola-risposta e Trappola-che-diventa-Equip"
    // — falso: le due clausole mappano PARI PARI su due meccanismi già
    // esistenti e indipendenti in questo motore. La clausola equip usa
    // isEquip/continuous/findEquipTarget/attachEquip come ogni altro Equip
    // (es. id117 qui sopra). La clausola di negazione usa onAttackDeclare,
    // lo stesso trigger automatico già usato da Armatura Guida d'Attacco
    // (id100) e Santuario Oscuro (id192) — la sua candidatura come
    // risposta (findTriggerCandidates, duel-engine.js) NON controlla mai
    // se la carta è coperta o scoperta, quindi resta valida sia da Set sia
    // da già equipaggiata, coerente con "entrambi simultaneamente".
    // SEMPLIFICAZIONE: nessuna vera scelta "attiva solo 1 dei due" —
    // entrambe le clausole restano sempre disponibili finché la carta
    // esiste da qualche parte sul proprio Terreno, invece di un'unica
    // decisione al momento dell'attivazione.
    // ================================================================
    CardEffects.register(333, {
        continuous: true,
        isEquip: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) {
            const i = findEquipTarget(ctx);
            if (i !== -1) attachEquip(ctx, i);
        },
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
        },
        onAttackDeclare(ctx) {
            ctx.changePosition(ctx.attackerOwner, ctx.attackerIndex, 'defense');
            ctx.cancelAttack();
            ctx.log("🗡️ Kunai con Catena costringe il mostro attaccante in Posizione di Difesa, annullando l'attacco!");
        }
    });

    // ================================================================
    // 334 — Kuribandit (onEndPhase)
    // Durante la End Phase, se questa carta è stata Evocata Normalmente in
    // questo turno: puoi sacrificarla; scava le prime 5 carte del tuo
    // Deck, aggiungi 1 Magia/Trappola scavata alla mano (se ce n'è più di
    // una, la prima trovata), poi manda le carte rimanenti al Cimitero.
    // SEMPLIFICAZIONE: funziona solo con un Deck reale in
    // gameState.playerDeck/botDeck (vedi Sepoltura Sciocca, id 251); si
    // sacrifica sempre quando può (il "puoi" reale diventa automatico, non
    // c'è un'interfaccia per rifiutare).
    // ================================================================
    CardEffects.register(334, {
        onEndPhase(ctx) {
            if (ctx.slot.summonedOnTurn !== gameState.turn) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck) || deck.length === 0) return;
            ctx.field(ctx.owner)[ctx.slotIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            // "prime 5 carte del Deck" = la cima, cioè la FINE dell'array
            // (drawCardsToHand pesca con .pop(), che toglie dalla fine).
            const dug = deck.splice(Math.max(0, deck.length - 5), 5);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            const stIndex = dug.findIndex((c) => c.type === 'spell' || c.type === 'trap');
            let picked = null;
            if (stIndex !== -1) picked = dug.splice(stIndex, 1)[0];
            if (picked) ctx.hand(ctx.owner).push(picked);
            dug.forEach((c) => ctx.graveyard(ctx.owner).push(c));
            ctx.log(picked
                ? `🃏 Kuribandit si sacrifica, scava 5 carte e aggiunge ${picked.name} alla mano!`
                : '🃏 Kuribandit si sacrifica e scava 5 carte, ma nessuna Magia/Trappola tra loro.');
        }
    });

    // ================================================================
    // 326 — Soldato Cinetico (bonus Damage Step)
    // Durante il calcolo dei danni, se questa carta combatte contro un
    // mostro Tipo Guerriero (attaccando o difendendo): guadagna 2000
    // ATK/DEF solo durante quel calcolo dei danni.
    // ================================================================
    CardEffects.register(326, {
        damageStepBonus(ctx) {
            if (ctx.opponentCard && ctx.opponentCard.race === 'Guerriero') {
                return { atk: 2000, def: 2000 };
            }
            return null;
        }
    });

    // ================================================================
    // 343 — Guardiano di Lava / Lava Battleguard (buff continuo)
    // Guadagna 500 ATK per ogni "Guardiano della Palude" (id 74) che
    // controlli — speculare dell'id 74 qui sopra.
    // ================================================================
    CardEffects.register(343, {
        static(ctx) {
            const count = ctx.field(ctx.owner).filter((slot) => slot && !slot.isFaceDown && slot.card.id === 74).length;
            gameState.atkDefBonus[ctx.card.uid] = { atk: count * 500, def: 0 };
        }
    });

    // ================================================================
    // 345 — Leghul (permesso permanente di attacco diretto)
    // Questo mostro può sempre attaccare direttamente i Life Points
    // dell'avversario — stessa infrastruttura di Golem Meccanico (id 257,
    // punto 3), ma impostata di continuo da static() invece che a costo
    // di 800 LP tramite un effetto Ignition.
    // ================================================================
    CardEffects.register(345, {
        static(ctx) {
            gameState.directAttackAllowedFor = gameState.directAttackAllowedFor || {};
            gameState.directAttackAllowedFor[ctx.card.uid] = true;
        }
    });

    // ================================================================
    // 346 — Legion il Giullare Demoniaco / Legion the Fiend Jester
    // Se questa carta viene mandata dal campo al Cimitero: puoi
    // aggiungere 1 mostro Normale Incantatore dal Deck o dal Cimitero
    // alla mano (cerca prima nel Deck, ctx.searchDeckToHand — già usato
    // da Sangan/id 533 — poi nel proprio Cimitero se il Deck non ne ha).
    // "Durante il tuo Main Phase, puoi Evocare Tributo 1 mostro
    // Incantatore in Posizione di Attacco, in aggiunta alla tua
    // Evocazione Normale/Set (una volta per turno)": implementata come
    // effetto Ignition di QUESTA carta (stesso schema di ogni altro
    // Ignition-con-Sacrificio già presente in questo file, es. Soldato
    // Cannone id 137) invece che passare dal flusso condiviso di
    // Evocazione Tributo del giocatore (attemptMonsterSummon/
    // openSummonModal, actions.js) — quel flusso ricontrolla
    // gameState.hasNormalSummoned in DUE punti separati e forzarli a
    // ignorarlo solo per un Incantatore in Attacco avrebbe richiesto
    // instradare un flag speciale attraverso l'intera catena UI
    // (selezione Tributi -> popover Attacco/Difesa), un rischio di
    // regressione molto più alto per l'unica carta che ne ha bisogno.
    // Qui l'Ignition risolve subito, senza toccare hasNormalSummoned
    // (è "IN AGGIUNTA", non un sostituto), auto-selezionando Sacrificio
    // e bersaglio come ogni altra selezione automatica di questo file,
    // e scatena comunque TRIGGER.ON_NORMAL_SUMMON (stesso schema già
    // usato da Offerta Suprema id 559) così le carte reattive (es. Buco
    // Trappola) possono ancora rispondere.
    // ================================================================
    function legionAutoPickTributes(ctx, summonedCard) {
        const needed = getTributesRequired(summonedCard);
        if (needed === 0) return [];
        const field = ctx.field(ctx.owner);
        const candidates = field
            .map((slot, index) => (slot ? { index, value: getTributeValue(slot.card, summonedCard), atk: slot.card.attack || 0 } : null))
            .filter(Boolean)
            .sort((a, b) => a.atk - b.atk);
        let remaining = needed;
        const toSacrifice = [];
        for (const c of candidates) {
            if (remaining <= 0) break;
            toSacrifice.push(c.index);
            remaining -= c.value;
        }
        return remaining <= 0 ? toSacrifice : null;
    }
    function legionFindSummonableSpellcaster(ctx) {
        const hand = ctx.hand(ctx.owner);
        return hand.findIndex((c) => c.type === 'monster' && !c.extraDeck && c.race === 'Incantatore' && legionAutoPickTributes(ctx, c) !== null);
    }
    CardEffects.register(346, {
        onDestroy(ctx) {
            const isNormalSpellcaster = (c) => c.type === 'monster' && c.vanilla && c.race === 'Incantatore';
            const found = ctx.searchDeckToHand(ctx.owner, isNormalSpellcaster, 1);
            if (found.length > 0) {
                ctx.log(`🃏 Legion il Giullare Demoniaco aggiunge ${found[0].name} alla mano dal Deck!`);
                return;
            }
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex(isNormalSpellcaster);
            if (index === -1) return;
            const [card] = grave.splice(index, 1);
            ctx.hand(ctx.owner).push(card);
            ctx.log(`🃏 Legion il Giullare Demoniaco aggiunge ${card.name} alla mano dal Cimitero!`);
        },
        canActivate(ctx) {
            // "Una volta per turno" già garantito dal meccanismo generico
            // di ogni effetto Ignition (gameState.usedIgnitionThisTurn,
            // duel-engine.js activateCard/canActivate) — nessun
            // tracciamento extra necessario, stesso schema di ogni altro
            // Ignition di questo file (es. Soldato Cannone id 137).
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return false;
            return legionFindSummonableSpellcaster(ctx) !== -1;
        },
        activate(ctx) {
            const handIndex = legionFindSummonableSpellcaster(ctx);
            if (handIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const summonedCard = hand[handIndex];
            const tributeIndices = legionAutoPickTributes(ctx, summonedCard);
            if (!tributeIndices) return;
            const field = ctx.field(ctx.owner);
            tributeIndices.forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            hand.splice(handIndex, 1);
            field[slotIndex] = { card: summonedCard, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: true, summonedOnTurn: gameState.turn };
            ctx.log(`🎭 Legion il Giullare Demoniaco: Evocazione Tributo extra di ${summonedCard.name}!`);
            DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, DuelEngine.makeContext(ctx.owner, { summonedCard: summonedCard, summonedSlotIndex: slotIndex, summonedPosition: 'attack' }));
        }
    });

    // ================================================================
    // 352 — Freccia Spezza-Magie / Spell Shattering Arrow (Magia Veloce)
    // Distrugge tutte le Magie scoperte controllate dall'avversario e
    // infligge 500 danni per ciascuna distrutta.
    // ================================================================
    CardEffects.register(352, {
        canActivate(ctx) {
            return ctx.stField(ctx.opponent).some((slot) => slot && !slot.isFaceDown && slot.card.type === 'spell');
        },
        activate(ctx) {
            let count = 0;
            ctx.stField(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.type === 'spell') {
                    ctx.destroySpellTrap(ctx.opponent, index);
                    count++;
                }
            });
            if (count > 0) ctx.dealDamage(ctx.opponent, count * 500);
            ctx.log(`🏹 Freccia Spezza-Magie distrugge ${count} Magi${count === 1 ? 'a' : 'e'} e infligge ${count * 500} danni!`);
        }
    });

    // ================================================================
    // 359 — Re Macchina / Machine King (buff continuo)
    // Guadagna 100 ATK per ogni mostro Tipo Macchina sul Terreno, di
    // entrambi i giocatori (regola reale: include anche se stesso).
    // ================================================================
    CardEffects.register(359, {
        static(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Macchina') count++;
                });
            });
            gameState.atkDefBonus[ctx.card.uid] = { atk: count * 100, def: 0 };
        }
    });

    // ================================================================
    // 366 — Makiu, la Nebbia Magica / Makiu, the Magical Mist (Magia
    // Normale)
    // Scegli 1 "Teschio Evocato" (id 13) o 1 mostro Tipo Tuono che
    // controlli; distruggi tutti i mostri dell'avversario con DEF pari o
    // inferiore all'ATK di quel mostro.
    // CORREZIONE di fedeltà: aggiunta la clausola mancante "non puoi
    // condurre la tua Battle Phase in questo turno" — nuovo
    // gameState.skipBattlePhaseFor (game-flow.js/enterBattlePhase,
    // azzerato in changeTurn()), riusabile anche da altre carte con lo
    // stesso vincolo (es. Carica dell'Anima/Soul Charge, id 59).
    // ================================================================
    CardEffects.register(366, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && (slot.card.id === 13 || slot.card.race === 'Tuono'));
        },
        activate(ctx) {
            let bestAtk = -1;
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot && !slot.isFaceDown && (slot.card.id === 13 || slot.card.race === 'Tuono') && slot.card.attack > bestAtk) {
                    bestAtk = slot.card.attack;
                }
            });
            if (bestAtk === -1) return;
            let count = 0;
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.defense <= bestAtk) {
                    ctx.destroyMonster(ctx.opponent, index);
                    count++;
                }
            });
            gameState.skipBattlePhaseFor = gameState.skipBattlePhaseFor || {};
            gameState.skipBattlePhaseFor[ctx.owner] = true;
            ctx.log(`🌫️ Makiu distrugge ${count} mostr${count === 1 ? 'o' : 'i'} con DEF <= ${bestAtk}! Non puoi condurre la Battle Phase in questo turno.`);
        }
    });

    // ================================================================
    // 378 — Meteora della Distruzione / Meteor of Destruction (Magia
    // Normale)
    // Se i Life Points dell'avversario sono superiori a 3000: infliggi
    // 1000 danni.
    // ================================================================
    CardEffects.register(378, {
        canActivate(ctx) {
            return gameState[ctx.opponent === 'player' ? 'playerLP' : 'botLP'] > 3000;
        },
        activate(ctx) {
            ctx.dealDamage(ctx.opponent, 1000);
            ctx.log(`☄️ Meteora della Distruzione infligge 1000 danni!`);
        }
    });

    // ================================================================
    // 382 — Forza dello Specchio / Mirror Force (Trappola Normale)
    // Quando un mostro dell'avversario dichiara un attacco: distruggi
    // tutti i mostri in Posizione di Attacco controllati dall'avversario.
    // ================================================================
    CardEffects.register(382, {
        onAttackDeclare(ctx) {
            let count = 0;
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.position === 'attack') {
                    ctx.destroyMonster(ctx.opponent, index);
                    count++;
                }
            });
            ctx.log(`🔮 Forza dello Specchio distrugge ${count} mostr${count === 1 ? 'o' : 'i'} in Posizione di Attacco!`);
        }
    });

    // ================================================================
    // 383 — Muro dello Specchio / Mirror Wall (Trappola Continua)
    // Ogni mostro dell'avversario che ha attaccato mentre questa carta
    // era scoperta ha l'ATK dimezzato finché la carta resta scoperta.
    // Durante ciascuna propria Standby Phase: paga 2000 Life Points o
    // distruggi questa carta.
    // I mostri "marchiati" (onAttackDeclare) vivono in un Set persistente
    // su ctx.card (mai azzerato da recomputeStaticEffects, a differenza
    // di gameState.atkDefBonus) — static() lo rilegge ogni render e
    // riscrive il malus da capo a partire dall'ATK DI BASE (card.attack,
    // non l'ATK effettivo corrente): usare l'ATK corrente creerebbe un
    // dimezzamento che si ripete su se stesso ad ogni ricalcolo,
    // riducendo l'ATK progressivamente verso zero invece di restare
    // stabile a metà del valore stampato.
    // SEMPLIFICAZIONE: il costo di mantenimento paga sempre finché i LP
    // bastano e si autodistrugge solo quando non bastano più, invece
    // di offrire la scelta "paga o distruggi" — nessuna interfaccia di
    // scelta costo esiste per le Trappole Continue in questo motore,
    // stesso schema di Scatola delle Fate (id 232) qui sopra.
    // ================================================================
    CardEffects.register(383, {
        continuous: true,
        activate(ctx) {
            ctx.log('🪞 Muro dello Specchio attivato: ogni mostro avversario che attacca da qui in poi avrà l\'ATK dimezzato finché resta in campo!');
        },
        onAttackDeclare(ctx) {
            const attackerSlot = ctx.field(ctx.attackerOwner)[ctx.attackerIndex];
            if (!attackerSlot) return;
            ctx.card.mirrorWallMarkedUids = ctx.card.mirrorWallMarkedUids || new Set();
            ctx.card.mirrorWallMarkedUids.add(attackerSlot.card.uid);
        },
        static(ctx) {
            const marked = ctx.card.mirrorWallMarkedUids;
            if (!marked || marked.size === 0) return;
            ctx.field(ctx.opponent).forEach((slot) => {
                if (!slot || slot.isFaceDown || !marked.has(slot.card.uid)) return;
                const half = Math.floor(slot.card.attack / 2);
                const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[slot.card.uid] = { atk: e.atk - half, def: e.def };
            });
        },
        onStandbyPhase(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] > 2000) {
                gameState[lpKey] -= 2000;
                ctx.log(`🪞 Muro dello Specchio: ${ctx.owner === 'player' ? 'paghi' : 'il bot paga'} 2000 Life Points per mantenerlo in campo.`);
            } else {
                ctx.stField(ctx.owner)[ctx.index] = null;
                ctx.graveyard(ctx.owner).push(ctx.card);
                ctx.log('🪞 Muro dello Specchio: Life Points insufficienti per il mantenimento, si autodistrugge.');
            }
        }
    });

    // ================================================================
    // 390 — Pomodoro Mistico / Mystic Tomato (onDestroy)
    // Quando questa carta viene distrutta in battaglia e mandata al
    // Cimitero: puoi Special Summon dal Deck, scoperto in Posizione di
    // Attacco, 1 mostro OSCURITÀ con 1500 o meno ATK.
    // SEMPLIFICAZIONE: stesso limite di Sepoltura Sciocca (id 251) qui
    // sopra — funziona solo con un Deck reale in
    // gameState.playerDeck/botDeck.
    // ================================================================
    CardEffects.register(390, {
        onDestroy(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = ctx.gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ' && c.attack <= 1500);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const card = deck.splice(index, 1)[0];
            ctx.gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🍅 Pomodoro Mistico Special Summona ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 392 — Nega l'Attacco / Negate Attack (Trappola Contatore)
    // Quando un mostro dell'avversario dichiara un attacco: annulla
    // l'attacco.
    // SEMPLIFICAZIONE: manca la clausola "termina la Battle Phase" — il
    // motore non ha un meccanismo per forzare una transizione di fase da
    // un effetto carta.
    // ================================================================
    CardEffects.register(392, {
        onAttackDeclare(ctx) {
            ctx.cancelAttack();
            ctx.log(`🚫 Nega l'Attacco annulla l'attacco!`);
        }
    });

    // ================================================================
    // 393 — Re Neko Mane / Neko Mane King
    // Durante il turno dell'avversario, quando questa carta viene mandata
    // al Cimitero da un suo effetto Carta: diventa subito la End Phase di
    // questo turno (enterEndPhase(), game-flow.js — stessa funzione già
    // usata dal normale avanzamento di fase, riusata qui per un salto
    // diretto). SEMPLIFICAZIONE dichiarata: copre solo le due cause già
    // tracciate da un aggancio generico — distrutta (onDestroy,
    // ctx.destroyedByOwner) o scartata a caso dalla mano
    // (onSentToGraveyardFromHand, ctx.discardedByOwner) — non ogni altro
    // modo in cui un effetto avversario può mandarla al Cimitero.
    // ================================================================
    CardEffects.register(393, {
        onDestroy(ctx) {
            if (gameState.currentPlayer !== ctx.opponent) return;
            if (ctx.destroyedByOwner !== ctx.opponent) return;
            if (typeof enterEndPhase === 'function') enterEndPhase();
            ctx.log('🐱 Re Neko Mane fa scattare subito la End Phase!');
        },
        onSentToGraveyardFromHand(ctx) {
            if (gameState.currentPlayer !== ctx.opponent) return;
            if (ctx.discardedByOwner !== ctx.opponent) return;
            if (typeof enterEndPhase === 'function') enterEndPhase();
            ctx.log('🐱 Re Neko Mane fa scattare subito la End Phase!');
        }
    });

    // ================================================================
    // 409 — Raigeki (Magia Normale)
    // Distruggi tutti i mostri controllati dall'avversario.
    // ================================================================
    CardEffects.register(409, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot !== null);
        },
        activate(ctx) {
            ctx.destroyAllMonsters(ctx.opponent);
            ctx.log(`⚡ Raigeki distrugge tutti i mostri dell'avversario!`);
        }
    });

    // ================================================================
    // 414 — Trasmigrazione Occhi Rossi / Red-Eyes Transmigration (Magia
    // Rituale)
    // Sacrifica mostri dal tuo Terreno per un Livello totale di almeno 8,
    // poi Special Summon Signore del Rosso (id 354) dalla mano.
    // SEMPLIFICAZIONE: sceglie da sola quali mostri sacrificare (i meno
    // possibile per raggiungere il totale, partendo dai Livelli più
    // alti), stesso spirito di Rito del Guerriero Nero (id 56). Manca
    // anche la clausola reale "e/o bandisci mostri Red-Eyes dal
    // Cimitero", qui si sacrificano solo mostri dal Terreno.
    // ================================================================
    // CORREZIONE di fedeltà: i Sacrifici ora possono venire anche dalla
    // mano, non solo dal Terreno (performRitualTribute/maxRitualTributeLevel,
    // vicino a attachUnionMonster in questo file). Manca ancora la
    // clausola alternativa "e/o bandisci mostri Occhi Rossi dal
    // Cimitero" come costo aggiuntivo/alternativo.
    // Costo alternativo: bandisci mostri "Occhi Rossi" dal Cimitero per un
    // Livello totale di almeno 8 ("Occhi Rossi B. Chick", l'unica
    // eccezione del testo reale, non è presente in questo database —
    // nessun filtro extra serve). Preferito al Sacrificio quando basta da
    // solo, per non svuotare inutilmente il proprio Terreno/mano.
    function totalRedEyesGraveyardLevel(ctx) {
        return ctx.graveyard(ctx.owner)
            .filter((c) => c.type === 'monster' && c.name && c.name.includes('Occhi Rossi'))
            .reduce((sum, c) => sum + (c.level || 0), 0);
    }
    function banishRedEyesFromGraveyard(ctx, requiredLevel) {
        const candidates = ctx.graveyard(ctx.owner)
            .filter((c) => c.type === 'monster' && c.name && c.name.includes('Occhi Rossi'))
            .sort((a, b) => (b.level || 0) - (a.level || 0));
        let remaining = requiredLevel;
        const toBanishUids = new Set();
        candidates.forEach((c) => {
            if (remaining <= 0) return;
            toBanishUids.add(c.uid);
            remaining -= c.level || 0;
        });
        const grave = ctx.graveyard(ctx.owner);
        for (let i = grave.length - 1; i >= 0; i--) {
            if (toBanishUids.has(grave[i].uid)) {
                const [banished] = grave.splice(i, 1);
                ctx.banish(ctx.owner, banished);
            }
        }
    }
    CardEffects.register(414, {
        canActivate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 354);
            if (handIndex === -1) return false;
            return maxRitualTributeLevel(ctx, handIndex) >= 8 || totalRedEyesGraveyardLevel(ctx) >= 8;
        },
        activate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 354);
            if (handIndex === -1) return;
            if (totalRedEyesGraveyardLevel(ctx) >= 8) {
                banishRedEyesFromGraveyard(ctx, 8);
            } else {
                performRitualTribute(ctx, 8, handIndex);
            }

            const hand = ctx.hand(ctx.owner);
            const finalHandIndex = hand.findIndex((c) => c.id === 354);
            if (finalHandIndex === -1) return;
            const [ritualCard] = hand.splice(finalHandIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Signore del Rosso finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('🔥 Trasmigrazione Occhi Rossi evoca Signore del Rosso!');
        }
    });

    // ================================================================
    // 415 — Vincoli Recisi / Release Restraint (Magia Normale)
    // Sacrifica 1 "Gearfried il Cavaliere di Ferro" (id 16) scoperto;
    // Special Summon 1 "Gearfried il Maestro di Spada" (id 258) dalla
    // mano o dal Deck.
    // SEMPLIFICAZIONE: la ricerca dal Deck funziona solo se esiste un
    // Deck reale — stesso limite di Sepoltura Sciocca (id 251).
    // ================================================================
    CardEffects.register(415, {
        canActivate(ctx) {
            const hasIronKnight = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 16);
            if (!hasIronKnight) return false;
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inHand = ctx.hand(ctx.owner).some((c) => c.id === 258);
            const inDeck = Array.isArray(deck) && deck.some((c) => c.id === 258);
            return inHand || inDeck;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const ironIndex = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 16);
            if (ironIndex === -1) return;
            ctx.graveyard(ctx.owner).push(field[ironIndex].card);
            field[ironIndex] = null;

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.id === 258);
            let card;
            if (handIdx !== -1) {
                card = hand.splice(handIdx, 1)[0];
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = ctx.gameState[deckKey];
                if (!Array.isArray(deck)) return;
                const deckIdx = deck.findIndex((c) => c.id === 258);
                if (deckIdx === -1) return;
                card = deck.splice(deckIdx, 1)[0];
                ctx.gameState[countKey] = deck.length;
            }
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('⚔️ Vincoli Recisi evoca Gearfried il Maestro di Spada!');
        }
    });

    // ================================================================
    // 258 — Gearfried il Maestro di Spada / Swordmaster Gearfried
    // Non può essere Evocato Normalmente/Set né Special Summonato in
    // nessun altro modo (cannotBeSpecialSummoned — non blocca
    // ctx.specialSummon usato direttamente da Vincoli Recisi id 415 qui
    // sopra, l'unico modo legale). Ogni volta che viene equipaggiata con
    // una Carta Equipaggiamento: distruggi 1 mostro dell'avversario
    // (onEquipped, riusabile — vedi attachEquip più in alto in questo
    // file). CORREZIONE: la nota precedente affermava erroneamente che
    // "Vincoli Recisi" non fosse presente in questo database — falso,
    // esiste già come id 415 (e la aveva già implementata per intero).
    // SEMPLIFICAZIONE: sceglie da sola il bersaglio da distruggere (il
    // più forte disponibile, priorità a quelli scoperti).
    // ================================================================
    CardEffects.register(258, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        onEquipped(ctx) {
            const oppField = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let bestAtk = -1;
            oppField.forEach((slot, i) => {
                if (!slot) return;
                const a = slot.isFaceDown ? 0 : DuelEngine.getEffectiveAtk(slot.card);
                if (a >= bestAtk) { bestAtk = a; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, targetIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const name = targetSlot.isFaceDown ? 'una carta coperta' : targetSlot.card.name;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`⚔️ Gearfried il Maestro di Spada, appena equipaggiata, distrugge ${name}!`);
        }
    });

    // ================================================================
    // 416 — Abbandonato / Relinquished
    // Ritual Summonabile tramite "Rito dell'Illusione Nera" (id 116, già
    // registrata) — vedi anche fusionMaterials/ritualMaterials più in
    // basso in questo file per come 116 la evoca.
    // Effetto Ignition dalla zona Mostro (una volta per turno, come
    // Tartaruga Catapulta id 144: usedIgnitionThisTurn, generico, non
    // richiede tracciamento manuale qui): "assorbe" 1 mostro scoperto
    // dell'avversario, RIMUOVENDOLO dal suo Terreno (non lo distrugge, non
    // va al Cimitero — resta "attaccato" a questa carta, come un Equip),
    // e l'ATK/DEF di questa carta diventano pari a quelli del mostro
    // assorbito (delta scritto in gameState.atkDefBonus, stesso schema di
    // Bozzolo dell'Evoluzione id 157). Se questa carta viene distrutta: il
    // mostro assorbito torna sul Terreno del suo vero proprietario
    // (scoperto in Posizione di Attacco, o al Cimitero se non c'è una
    // casella libera) — SEMPLIFICAZIONE: la restituzione avviene SOLO su
    // distruzione (onDestroy), non su altri modi di lasciare il campo
    // (tornare in mano, essere bandita, essere sacrificata) — nessun
    // aggancio generico "questa carta sta per lasciare il campo, in
    // QUALUNQUE modo" esiste in questo motore. Mancano anche le due
    // clausole più esotiche del testo reale: "se distrutta in battaglia,
    // distruggi il mostro assorbito al posto suo" (redirect della
    // distruzione) e "il danno da questa battaglia viene inflitto anche
    // all'avversario" — nessuna delle due ha un aggancio generico pronto
    // in resolveBattleDamage (actions.js) per una carta così di nicchia.
    // ================================================================
    function releaseRelinquishedTarget(ctx) {
        const absorbed = ctx.card._relinquishedTarget;
        if (!absorbed) return;
        const owner = ctx.card._relinquishedFromOwner;
        const emptySlot = ctx.field(owner).findIndex((slot) => slot === null);
        if (emptySlot !== -1) {
            ctx.field(owner)[emptySlot] = { card: absorbed, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false, summonedOnTurn: gameState.turn };
            ctx.log(`🌀 ${absorbed.name} torna sul campo del suo proprietario!`);
        } else {
            ctx.graveyard(owner).push(absorbed);
            ctx.log(`🌀 ${absorbed.name} torna al Cimitero del suo proprietario (Terreno pieno).`);
        }
    }
    CardEffects.register(416, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        canActivate(ctx) {
            if (ctx.card._relinquishedTarget) return false;
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const oppField = ctx.field(ctx.opponent);
            const idx = oppField.findIndex((slot) => slot && !slot.isFaceDown);
            if (idx === -1) return;
            const absorbed = oppField[idx].card;
            oppField[idx] = null;
            ctx.card._relinquishedTarget = absorbed;
            ctx.card._relinquishedFromOwner = ctx.opponent;
            ctx.log(`🌀 Abbandonato assorbe ${absorbed.name} dal campo avversario!`);
        },
        static(ctx) {
            const absorbed = ctx.card._relinquishedTarget;
            if (!absorbed) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + (absorbed.attack - ctx.card.attack), def: e.def + (absorbed.defense - ctx.card.defense) };
        },
        onDestroy: releaseRelinquishedTarget,
        // "Se questa carta lascia il Terreno" copre anche il ritorno in
        // mano (onReturnedToHandSelf, ACTIONS.returnMonsterToHand) e il
        // Sacrificio per un'altra Evocazione Tributo o come costo
        // d'attacco (onSacrificedForTribute, notifySacrificedForTribute).
        // Il bando resta scoperto: ctx.card._relinquishedTarget non
        // sarebbe comunque leggibile da ACTIONS.banish(owner, card), che
        // riceve solo la carta, non un ctx con .field/.graveyard.
        onReturnedToHandSelf: releaseRelinquishedTarget,
        onSacrificedForTribute: releaseRelinquishedTarget,
        // "Se questa carta dovrebbe essere distrutta IN BATTAGLIA,
        // distruggi il mostro assorbito al posto suo": def.onWouldBeDestroyedInBattle
        // (nuovo aggancio in resolveBattleDamage, actions.js) — a
        // differenza del ritorno "vivo" di releaseRelinquishedTarget qui
        // sopra (quando Abbandonato lascia il campo), qui il mostro
        // assorbito viene DISTRUTTO per davvero, e Abbandonato sopravvive
        // (perde l'assorbito, il bonus ATK/DEF sparisce da solo al
        // prossimo static()).
        onWouldBeDestroyedInBattle(ctx) {
            const absorbed = ctx.card._relinquishedTarget;
            if (!absorbed) return false;
            const owner = ctx.card._relinquishedFromOwner;
            ctx.graveyard(owner).push(absorbed);
            ctx.card._relinquishedTarget = null;
            ctx.log(`🌀 Abbandonato sopravvive: ${absorbed.name} viene distrutto al suo posto!`);
            return true;
        }
    });

    // ================================================================
    // 417 — Rimuovi Trappola / Remove Trap (Magia Normale)
    // Distrugge 1 Trappola scoperta sul Terreno.
    // ================================================================
    CardEffects.register(417, {
        canActivate(ctx) {
            return [ctx.opponent, ctx.owner].some((owner) => ctx.stField(owner).some((slot) => slot && !slot.isFaceDown && slot.card.type === 'trap'));
        },
        activate(ctx) {
            let targetOwner = null;
            let targetIndex = -1;
            [ctx.opponent, ctx.owner].forEach((owner) => {
                if (targetIndex !== -1) return;
                const idx = ctx.stField(owner).findIndex((slot) => slot && !slot.isFaceDown && slot.card.type === 'trap');
                if (idx !== -1) { targetOwner = owner; targetIndex = idx; }
            });
            if (targetIndex === -1) return;
            const card = ctx.stField(targetOwner)[targetIndex].card;
            ctx.graveyard(targetOwner).push(card);
            ctx.stField(targetOwner)[targetIndex] = null;
            ctx.log(`✨ Rimuovi Trappola distrugge ${card.name}!`);
        }
    });

    // ================================================================
    // 426 — Decreto Reale / Royal Decree (effetto CONTINUO della
    // Trappola, non un'attivazione manuale — come Jinzo, id 17)
    // Nega gli effetti di tutte le altre Trappole sul Terreno, di
    // entrambi i giocatori.
    // ================================================================
    CardEffects.register(426, {
        static(ctx) {
            gameState.trapsNegatedFor[ctx.owner] = true;
            gameState.trapsNegatedFor[ctx.opponent] = true;
        }
    });

    // ================================================================
    // 271 — Occhio di Gorgone / Gorgon's Eye (Trappola Normale)
    // Fino alla fine di questo turno, tutti gli effetti dei mostri in
    // Posizione di Difesa (di entrambi i giocatori) sono annullati.
    // SEMPLIFICAZIONE: copre gli effetti CONTINUI (recomputeStaticEffects)
    // e gli Ignition (canActivate, zone 'monster') — vedi
    // gameState.defenseMonsterEffectsNegated in entrambi (duel-engine.js).
    // Non copre trigger reattivi (onFlip/onAttackDeclare/ecc.) di un
    // mostro già in Difesa, casi di nicchia per questo dataset.
    // ================================================================
    CardEffects.register(271, {
        activate(ctx) {
            gameState.defenseMonsterEffectsNegated = true;
            ctx.log('👁️ Occhio di Gorgone annulla gli effetti di tutti i mostri in Posizione di Difesa fino a fine turno!');
        }
    });

    // ================================================================
    // 708 — Xing Zhen Hu (Trappola Continua)
    // Scegli 2 Magie/Trappole Set sul Terreno: non possono più essere
    // attivate. SEMPLIFICAZIONE: sceglie da sola le prime 2 Magie/Trappole
    // Set dell'avversario invece di un'interfaccia di selezione dedicata a
    // 2 carte specifiche (nessuna esiste ancora in questo motore) — stesso
    // spirito delle altre auto-selezioni già presenti (es. Dado di
    // Evocazione id 460). Usa il nuovo controllo per uid
    // gameState.blockedCardUids in DuelEngine.canActivate (duel-engine.js).
    // ================================================================
    CardEffects.register(708, {
        canActivate(ctx) {
            return ctx.stField(ctx.opponent).some((slot) => slot && slot.isFaceDown);
        },
        activate(ctx) {
            const targets = [];
            ctx.stField(ctx.opponent).forEach((slot) => {
                if (slot && slot.isFaceDown && targets.length < 2) targets.push(slot);
            });
            gameState.blockedCardUids = gameState.blockedCardUids || new Set();
            targets.forEach((slot) => gameState.blockedCardUids.add(slot.card.uid));
            ctx.log(`🀄 Xing Zhen Hu blocca l'attivazione di ${targets.length} cart${targets.length === 1 ? 'a' : 'e'} Set dell'avversario!`);
        }
    });

    // ================================================================
    // 482 — Maschera Toon / Toon Mask (Trappola Normale)
    // Se controlli "Mondo dei Toon" scoperto: scegli 1 mostro scoperto
    // dell'avversario; Special Summon 1 mostro Toon (identificato dal nome
    // — nessun campo dedicato nel database, ma ogni vero mostro Toon di
    // questo dataset lo ha nel nome, es. "Alligatore Toon") dalla mano o
    // dal Deck con Livello pari o inferiore a quello del bersaglio,
    // ignorandone le condizioni di Evocazione. SEMPLIFICAZIONE: sceglie da
    // sola il primo mostro scoperto avversario come bersaglio.
    // ================================================================
    CardEffects.register(482, {
        canActivate(ctx) {
            const toonWorld = ctx.owner === 'player' ? gameState.playerFieldSpell : gameState.botFieldSpell;
            if (!toonWorld || toonWorld.isFaceDown || toonWorld.card.id !== 487) return false;
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const targetSlot = ctx.field(ctx.opponent).find((slot) => slot && !slot.isFaceDown);
            if (!targetSlot) return;
            const maxLevel = targetSlot.card.level || 0;
            const isToon = (c) => c.type === 'monster' && c.name.includes('Toon');
            const hand = ctx.hand(ctx.owner);
            let source = 'hand';
            let index = hand.findIndex((c) => isToon(c) && (c.level || 0) <= maxLevel);
            let card = index !== -1 ? hand[index] : null;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = ctx.gameState[deckKey];
            if (!card && Array.isArray(deck)) {
                index = deck.findIndex((c) => isToon(c) && (c.level || 0) <= maxLevel);
                if (index !== -1) { card = deck[index]; source = 'deck'; }
            }
            if (!card) { ctx.log('🎭 Maschera Toon: nessun mostro Toon disponibile con Livello adeguato.'); return; }
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.log('🎭 Maschera Toon: nessuno slot mostro libero.'); return; }
            if (source === 'hand') {
                hand.splice(index, 1);
            } else {
                deck.splice(index, 1);
                ctx.gameState[countKey] = deck.length;
            }
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', source);
            ctx.log(`🎭 Maschera Toon Special Summona ${card.name}!`);
        }
    });

    // ================================================================
    // 371 — Maschera della Restrizione / Mask of Restrict (effetto
    // CONTINUO della Trappola, come Decreto Reale id 426/Luce
    // dell'Intervento id 634): nessun giocatore può sacrificare carte.
    // SEMPLIFICAZIONE: copre solo l'Evocazione Tributo (l'unica vera
    // meccanica di sacrificio di questo motore) — vedi
    // gameState.tributesBlocked, consultato in attemptMonsterSummon
    // (js/engine/actions.js).
    // ================================================================
    CardEffects.register(371, {
        static(ctx) {
            gameState.tributesBlocked = true;
        }
    });

    // ================================================================
    // 158 — Venditore di Bare / Coffin Seller (Trappola Continua)
    // Ogni volta che un mostro viene mandato al Cimitero DELL'AVVERSARIO
    // (di chi controlla questa carta): infliggi 300 danni all'avversario.
    // Usa il nuovo handler onEnemyMonsterDestroyed (vedi TRIGGER.ON_DESTROY
    // in duel-engine.js) — la variante "guarda il campo dell'avversario"
    // di onOwnMonsterDestroyed, già usato da Macchina del Tempo (id 478).
    // ================================================================
    CardEffects.register(158, {
        onEnemyMonsterDestroyed(ctx) {
            ctx.dealDamage(ctx.opponent, 300);
            ctx.log(`⚰️ Venditore di Bare infligge 300 danni a ${ctx.opponent === 'player' ? 'te' : 'il bot'}!`);
        }
    });

    // ================================================================
    // 634 — Luce dell'Intervento / Light of Intervention (effetto
    // CONTINUO della Trappola, come Decreto Reale id 426 qui sopra)
    // Finché scoperta sul Terreno, ogni Set di un mostro deve invece
    // avvenire scoperto in Posizione di Difesa (la Posizione resta
    // quella scelta, solo non più coperta) — vedi summonMonster()
    // (js/engine/actions.js), che consulta gameState.monsterSetBlocked.
    // SEMPLIFICAZIONE: i pulsanti Attacco/Difesa del popover restano
    // entrambi visibili (niente logica extra per nasconderli quando
    // l'effetto è attivo); scegliere Difesa risulta comunque in
    // un'Evocazione scoperta, con un log che lo spiega.
    // ================================================================
    CardEffects.register(634, {
        static(ctx) {
            gameState.monsterSetBlocked = true;
        }
    });

    // ================================================================
    // 430 — Pietra del Saggio / Sage's Stone (Magia Normale)
    // Se controlli scoperta "Maga Oscura" (id 188): Special Summon 1
    // "Mago Nero" (id 2) dalla mano o dal Deck.
    // SEMPLIFICAZIONE: la ricerca dal Deck funziona solo se esiste un
    // Deck reale — stesso limite di Sepoltura Sciocca (id 251).
    // ================================================================
    CardEffects.register(430, {
        canActivate(ctx) {
            const hasMagicianGirl = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 19);
            if (!hasMagicianGirl) return false;
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return false;
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inHand = ctx.hand(ctx.owner).some((c) => c.id === 2);
            const inDeck = Array.isArray(deck) && deck.some((c) => c.id === 2);
            return inHand || inDeck;
        },
        activate(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.id === 2);
            let card;
            if (handIdx !== -1) {
                card = hand.splice(handIdx, 1)[0];
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = ctx.gameState[deckKey];
                if (!Array.isArray(deck)) return;
                const deckIdx = deck.findIndex((c) => c.id === 2);
                if (deckIdx === -1) return;
                card = deck.splice(deckIdx, 1)[0];
                ctx.gameState[countKey] = deck.length;
            }
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('🔮 Pietra del Saggio evoca Mago Nero!');
        }
    });

    // ================================================================
    // 433 — Sangan (onDestroy)
    // Quando questa carta viene mandata dal Terreno al Cimitero: puoi
    // aggiungere alla mano 1 mostro con 1500 o meno ATK dal Deck.
    // SEMPLIFICAZIONE: funziona solo con un Deck reale in
    // gameState.playerDeck/botDeck (vedi Sepoltura Sciocca, id 251);
    // manca il vincolo "una volta per turno" — qui l'onDestroy scatta
    // comunque una volta sola per ogni volta che Sangan viene distrutto.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunta la restrizione da errata "non puoi
    // attivare carte, o effetti di carte, con questo nome per il resto
    // del turno" — approssimata come "una volta per turno per nome"
    // (ctx.hasUsedOncePerTurn su una chiave testuale, non sul singolo
    // uid): copre il caso pratico (2 Sangan distrutti nello stesso
    // turno, solo il primo cerca), senza costruire un aggancio generico
    // "blocco per nome" nell'intero canActivate per una singola carta.
    CardEffects.register(433, {
        onDestroy(ctx) {
            if (ctx.hasUsedOncePerTurn(`sangan-name:${ctx.owner}`)) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.attack <= 1500);
            if (index === -1) return;
            ctx.markUsedOncePerTurn(`sangan-name:${ctx.owner}`);
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.hand(ctx.owner).push(card);
            ctx.log(`👹 Sangan aggiunge ${card.name} alla mano dal Deck!`);
        }
    });

    // ================================================================
    // 437 — Spettro Ombra / Shadow Ghoul (buff continuo)
    // Guadagna 100 ATK per ogni mostro nel proprio Cimitero.
    // ================================================================
    CardEffects.register(437, {
        static(ctx) {
            const count = ctx.graveyard(ctx.owner).filter((c) => c.type === 'monster').length;
            gameState.atkDefBonus[ctx.card.uid] = { atk: count * 100, def: 0 };
        }
    });

    // ================================================================
    // 438 — Ombra degli Occhi / Shadow of Eyes (Trappola Normale)
    // Quando 1 o più mostri vengono Set sul Terreno dell'avversario:
    // giralo scoperto in Posizione di Attacco (gli Effetti Flip non si
    // attivano). Riusa onOpponentSummon (già usato da Buco Trappola, id
    // 40: fireTrigger(ON_NORMAL_SUMMON) scatta per OGNI Evocazione
    // Normale, Set incluso) invece di un nuovo trigger dedicato — basta
    // controllare ctx.field(ctx.opponent)[ctx.summonedSlotIndex].isFaceDown
    // per sapere se è stato davvero Settato coperto. Gira la carta
    // mutando lo slot direttamente (isFaceDown/position), MAI tramite
    // fireTrigger(ON_FLIP, ...): è proprio questo a garantire che nessun
    // Effetto Flip scatti, come da testo reale.
    // ================================================================
    CardEffects.register(438, {
        canActivate(ctx) {
            const slot = ctx.field(ctx.opponent)[ctx.summonedSlotIndex];
            return !!slot && slot.isFaceDown;
        },
        onOpponentSummon(ctx) {
            const slot = ctx.field(ctx.opponent)[ctx.summonedSlotIndex];
            if (!slot || !slot.isFaceDown) return;
            slot.isFaceDown = false;
            slot.position = 'attack';
            ctx.log(`👁️ Ombra degli Occhi gira scoperto ${slot.card.name} in Posizione di Attacco!`);
        }
    });

    // ================================================================
    // 446 — Coccinella Marchio Teschio / Skull Mark Ladybug (onDestroy)
    // Quando questa carta viene mandata al Cimitero: aumenta i tuoi Life
    // Points di 1000 punti.
    // ================================================================
    CardEffects.register(446, {
        onDestroy(ctx) {
            ctx.dealDamage(ctx.owner, -1000); // dealDamage negativo = cura
            ctx.log('🐞 Coccinella Marchio Teschio, mandata al Cimitero, cura 1000 Life Points!');
        }
    });

    // ================================================================
    // 452 — Rilascio dell'Anima / Soul Release (Magia Normale)
    // Bandisce fino a 5 carte da un Cimitero qualsiasi.
    // SEMPLIFICAZIONE: l'effetto reale lascia scegliere quali carte
    // bandire — qui vengono bandite automaticamente le prime carte
    // trovate (prima il proprio Cimitero, poi quello dell'avversario).
    // ================================================================
    CardEffects.register(452, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).length > 0 || ctx.graveyard(ctx.opponent).length > 0;
        },
        activate(ctx) {
            let banished = 0;
            [ctx.owner, ctx.opponent].forEach((owner) => {
                const gy = ctx.graveyard(owner);
                while (banished < 5 && gy.length > 0) {
                    const [card] = gy.splice(gy.length - 1, 1);
                    ctx.banish(owner, card);
                    banished++;
                }
            });
            ctx.log(`👻 Rilascio dell'Anima bandisce ${banished} cart${banished === 1 ? 'a' : 'e'} dai Cimiteri!`);
        }
    });

    // ================================================================
    // 453 — Cacciatore di Anime / Soul Taker (Magia Normale)
    // Distruggi 1 mostro scoperto dell'avversario, poi l'avversario
    // guadagna 1000 Life Points.
    // ================================================================
    CardEffects.register(453, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown);
            if (index === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, index, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            const name = target ? target.card.name : field[index].card.name;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.dealDamage(ctx.opponent, -1000);
            ctx.log(`💀 Cacciatore di Anime distrugge ${name}, l'avversario guadagna 1000 Life Points!`);
        }
    });

    // ================================================================
    // 459 — Ninja d'Assalto (effetto Ignition)
    // Puoi bandire 2 mostri OSCURITÀ dal tuo Cimitero; bandisci questa
    // carta scoperta fino alla End Phase.
    // SEMPLIFICAZIONE: il testo reale è un Effetto Veloce (attivabile
    // anche nel turno dell'avversario) — qui è un effetto Ignition
    // normale, attivabile solo durante il proprio Main Phase, come ogni
    // altro effetto Ignition di questo motore (es. Soldato Cannone, id
    // 137). Il "una volta per turno" è già garantito da
    // gameState.usedIgnitionThisTurn.
    // ================================================================
    CardEffects.register(459, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).filter((c) => c.attribute === 'OSCURITÀ').length >= 2;
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            let removed = 0;
            for (let i = grave.length - 1; i >= 0 && removed < 2; i--) {
                if (grave[i].attribute === 'OSCURITÀ') {
                    const [card] = grave.splice(i, 1);
                    ctx.banish(ctx.owner, card);
                    removed++;
                }
            }
            const field = ctx.field(ctx.owner);
            const banished = field[ctx.index].card;
            field[ctx.index] = null;
            ctx.banishTemporarily(ctx.owner, banished, 'endphase');
            ctx.log("🥷 Ninja d'Assalto bandisce 2 mostri OSCURITÀ dal Cimitero e si bandisce fino alla End Phase!");
        }
    });

    // ================================================================
    // 467 — Il Demone Megacyber (Special Summon dalla mano)
    // Se il tuo avversario controlla almeno 2 mostri in più di te, puoi
    // Special Summonare questa carta dalla tua mano.
    // ================================================================
    CardEffects.register(467, {
        canSpecialSummonFromHand(ctx) {
            const own = ctx.field(ctx.owner).filter((slot) => slot).length;
            const opp = ctx.field(ctx.opponent).filter((slot) => slot).length;
            return opp - own >= 2;
        }
    });

// ================================================================
    // 471 — L'Amazzone Ostile / The Wicked Amazon (onStandbyPhase)
    // Sacrifica 1 tuo mostro sul Terreno (esclusa questa carta) durante
    // ciascuna tua Standby Phase. Se non lo fai, questa carta viene
    // distrutta. SEMPLIFICAZIONE: sacrifica automaticamente il primo
    // altro mostro trovato (il "puoi" reale diventa automatico, come
    // altre carte con la stessa struttura); se non c'è nessun altro
    // mostro, si autodistrugge.
    // ================================================================
    CardEffects.register(471, {
        onStandbyPhase(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot, i) => slot && i !== ctx.slotIndex);
            if (index === -1) {
                ctx.destroyMonster(ctx.owner, ctx.slotIndex);
                ctx.log("👸 L'Amazzone Ostile non ha nessun altro mostro da sacrificare: si distrugge da sola!");
                return;
            }
            const sacrificed = field[index];
            field[index] = null;
            ctx.graveyard(ctx.owner).push(sacrificed.card);
            ctx.log(`👸 L'Amazzone Ostile sacrifica ${sacrificed.card.name} durante la Standby Phase!`);
        }
    });

    // ================================================================
    // 474 — Mille Coltelli / Thousand Knives (Magia Normale)
    // Se controlli "Mago Nero" (id 2): distruggi 1 mostro dell'avversario.
    // ================================================================
    CardEffects.register(474, {
        canActivate(ctx) {
            const hasDarkMagician = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
            if (!hasDarkMagician) return false;
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown);
            if (index === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, index, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            const name = target ? target.card.name : field[index].card.name;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`🗡️ Mille Coltelli distrugge ${name}!`);
        }
    });

    // ================================================================
    // 472 — Il Drago Alato di Ra / The Winged Dragon of Ra (uno dei 3 Dei
    // Egizi)
    // Testo ufficiale verificato (db.yugioh-card.com): "Non può essere
    // Evocato Specialmente. Richiede 3 Tributi per essere Evocato
    // Normalmente (non può essere Posizionato Normalmente).
    // L'Evocazione Normale di questa carta non può essere annullata.
    // Quando viene Evocato Normalmente, non possono essere attivate
    // altre carte o effetti. Quando questa carta viene Evocata
    // Normalmente: puoi pagare LP fino a che te ne rimangono solo 100;
    // questa carta guadagna ATK/DEF pari all'ammontare di LP pagati.
    // Puoi pagare 1000 LP, poi scegliere come bersaglio 1 mostro sul
    // Terreno; distruggi quel bersaglio." — ATK/DEF stampati sono "?":
    // card.attack/defense nel database sono 0, il vero valore è dato
    // SOLO dall'effetto (niente "somma dei mostri sacrificati": quella
    // era la versione anime/non ufficiale, corretta dopo verifica).
    // SEMPLIFICAZIONE: il pagamento LP-fino-a-100 è sempre applicato per
    // intero (nessuna interfaccia per pagare meno) — coerente con lo
    // spirito della carta, che è inutile a 0/0. Il bersaglio
    // dell'Ignition è scelto da sola (il più forte disponibile
    // dell'avversario, priorità a quelli scoperti) invece di un'interfaccia
    // di selezione dedicata, e limitato al campo avversario (il testo
    // reale non lo vieta, ma nessun caso di questo dataset trarrebbe
    // beneficio dal colpire il proprio campo).
    // ================================================================
    CardEffects.register(472, {
        cannotBeSpecialSummoned: true,
        cannotBeSet: true,
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            const currentLp = gameState[lpKey];
            if (currentLp <= 100) return;
            const paid = currentLp - 100;
            gameState[lpKey] = 100;
            ctx.card.raPaidLp = paid;
            ctx.log(`☀️ Il Drago Alato di Ra: Life Points pagati fino a restare a 100! Guadagna ${paid} ATK/DEF.`);
        },
        static(ctx) {
            const bonus = ctx.card.raPaidLp || 0;
            gameState.atkDefBonus[ctx.card.uid] = { atk: bonus, def: bonus };
        },
        canActivate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] < 1000) return false;
            return ctx.field(ctx.opponent).some((slot) => slot);
        },
        activate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let bestAtk = -1;
            field.forEach((slot, i) => {
                if (!slot) return;
                const a = slot.isFaceDown ? 0 : DuelEngine.getEffectiveAtk(slot.card);
                if (a >= bestAtk) { bestAtk = a; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            gameState[lpKey] -= 1000;
            const targetSlot = field[targetIndex];
            const name = targetSlot.isFaceDown ? 'una carta coperta' : targetSlot.card.name;
            ctx.destroyMonster(ctx.opponent, targetIndex);
            ctx.log(`☀️ Il Drago Alato di Ra paga 1000 Life Points e distrugge ${name}!`);
        }
    });

    // ================================================================
    // 487 — Mondo dei Toon / Toon World (Magia Continua)
    // Attiva questa carta pagando 1000 Life Points. Alcune carte "Toon"
    // dipendono da questa per il proprio Special Summon dalla mano — vedi
    // id 484/486 qui sotto.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunta la clausola condivisa mancante "se
    // Mondo dei Toon viene distrutto, distruggi anche i mostri Toon che
    // lo richiedono" — nuovo opt-in def.requiresToonWorld, riusabile da
    // ogni futuro mostro Toon con lo stesso vincolo (finora 123, 606).
    CardEffects.register(487, {
        continuous: true,
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 1000);
            ctx.log(`🎨 Mondo dei Toon attivato pagando 1000 Life Points!`);
        },
        onSTDestroyed(ctx) {
            ctx.field(ctx.owner).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && DuelEngine.getDefinition(slot.card.id)?.requiresToonWorld) {
                    ctx.destroyMonster(ctx.owner, index);
                }
            });
        }
    });

    // ================================================================
    // 484 — Sirena Toon / Toon Mermaid (Special Summon dalla mano)
    // Non può essere Evocata Normalmente/Set. Deve prima essere Special
    // Summonata dalla mano, mentre controlli "Mondo dei Toon" (id 487).
    // requiresToonWorld: true (distrutta anche lei se Mondo dei Toon
    // lascia il Terreno — mancava, nonostante il testo lo richiedesse).
    // "Non può attaccare il turno in cui viene Special Summonata" e
    // "paga 500 LP per dichiarare un attacco": cannotAttackTurnSummoned/
    // requiresLifePointsToAttack, nuovi flag generici (resolveAttack in
    // actions.js, executeAttack/botPerformAttacks).
    // ================================================================
    CardEffects.register(484, {
        cannotNormalSummon: true,
        requiresToonWorld: true,
        cannotAttackTurnSummoned: true,
        requiresLifePointsToAttack: 500,
        canSpecialSummonFromHand(ctx) {
            return ctx.stField(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 487);
        }
    });

    // ================================================================
    // 486 — Teschio Evocato Toon / Toon Summoned Skull (Special Summon
    // dalla mano)
    // Non può essere Evocata Normalmente/Set. Deve prima essere Special
    // Summonata dalla mano sacrificando 1 mostro, mentre controlli
    // "Mondo dei Toon" (id 487). requiresToonWorld/cannotAttackTurnSummoned/
    // requiresLifePointsToAttack come Sirena Toon (id 484) qui sopra.
    // SEMPLIFICAZIONE residua: sceglie da sola quale mostro sacrificare
    // (il primo trovato) invece di un'interfaccia di selezione dedicata.
    // ================================================================
    CardEffects.register(486, {
        cannotNormalSummon: true,
        requiresToonWorld: true,
        cannotAttackTurnSummoned: true,
        requiresLifePointsToAttack: 500,
        canSpecialSummonFromHand(ctx) {
            const hasToonWorld = ctx.stField(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 487);
            const hasSacrifice = ctx.field(ctx.owner).some((slot) => slot);
            return hasToonWorld && hasSacrifice;
        },
        paySpecialSummonCost(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot);
            if (index === -1) return false;
            ctx.graveyard(ctx.owner).push(field[index].card);
            field[index] = null;
            ctx.log('👻 Teschio Evocato Toon sacrifica 1 mostro per essere Special Summonato!');
            return true;
        }
    });

    // ================================================================
    // 490 — Tributo Torrenziale / Torrential Tribute (Trappola Normale,
    // risposta a un'Evocazione — come Buco Trappola, id 40)
    // Quando l'avversario Evoca un mostro: distruggi tutti i mostri sul
    // Terreno, di entrambi i giocatori.
    // SEMPLIFICAZIONE: l'effetto reale risponde a QUALSIASI Evocazione,
    // inclusa la propria — qui, come per Buco Trappola, risponde solo a
    // un'Evocazione dell'avversario (stesso schema delle finestre di
    // risposta di questo motore).
    // ================================================================
    CardEffects.register(490, {
        onOpponentSummon(ctx) {
            ctx.destroyAllMonsters();
            ctx.log(`🌊 Tributo Torrenziale distrugge tutti i mostri sul Terreno!`);
        }
    });

    // ================================================================
    // 492 — Tributo ai Dannati / Tribute to the Doomed (Magia Normale)
    // Scarta 1 carta dalla mano, poi distruggi 1 mostro dell'avversario.
    // SEMPLIFICAZIONE: la carta reale può bersagliare qualsiasi mostro sul
    // Terreno (anche un proprio mostro coperto) — qui sceglie sempre un
    // mostro scoperto dell'avversario, e la carta scartata è sempre la
    // prima in mano.
    // ================================================================
    CardEffects.register(492, {
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const discarded = hand.splice(0, 1)[0];
            ctx.graveyard(ctx.owner).push(discarded);

            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown);
            if (index === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, index, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            const name = target ? target.card.name : field[index].card.name;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`⚰️ Tributo ai Dannati scarta ${discarded.name} e distrugge ${name}!`);
        }
    });

    // ================================================================
    // 506 — Rituale del Drago Bianco / White Dragon Ritual (Magia
    // Rituale)
    // Sacrifica mostri dal Terreno per un Livello totale di almeno 4,
    // poi Special Summon Paladino del Drago Bianco (id 398) dalla mano.
    // SEMPLIFICAZIONE: sceglie da sola quali mostri sacrificare, stesso
    // spirito di Rito del Guerriero Nero (id 56). Manca anche la
    // possibilità di sacrificare dalla mano oltre che dal Terreno.
    // ================================================================
    CardEffects.register(506, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 398);
            if (!hasRitualMonster) return false;
            const totalLevel = ctx.field(ctx.owner).reduce((sum, slot) => sum + (slot ? (slot.card.level || 0) : 0), 0);
            return totalLevel >= 4;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field
                .map((slot, index) => (slot ? { index, level: slot.card.level || 0 } : null))
                .filter(Boolean)
                .sort((a, b) => b.level - a.level);

            let remaining = 4;
            const toSacrifice = [];
            occupied.forEach((entry) => {
                if (remaining <= 0) return;
                toSacrifice.push(entry.index);
                remaining -= entry.level;
            });
            toSacrifice.forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.id === 398);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Paladino del Drago Bianco finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('🐲 Rituale del Drago Bianco evoca Paladino del Drago Bianco!');
        }
    });

    // ================================================================
    // 398 — Paladino del Drago Bianco / White Paladin, Ballista Dragon
    // Evocabile Rituale solo tramite "Rituale del Drago Bianco" (id 506,
    // qui sopra — GIÀ IMPLEMENTATA per intero: la nota precedente
    // affermava erroneamente che non esistesse in questo database).
    // All'inizio del Damage Step, se attacca un mostro coperto in
    // Posizione di Difesa: lo distrugge senza calcolo dei danni (caso
    // speciale isolato in resolveBattleDamage, actions.js — vedi id 398
    // lì). Effetto Ignition: sacrifica questa carta per Special Summon
    // "Drago Bianco Occhi Blu" (id 1) dalla mano o dal Deck, che non può
    // attaccare per il resto del turno (gameState.cannotAttackUidsThisTurn,
    // stesso meccanismo di Obelisk il Tormentatore id 30).
    // ================================================================
    CardEffects.register(398, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        instantlyDestroysFaceDownDefender: true,
        canActivate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            return hand.some((c) => c.id === 1) || (Array.isArray(deck) && deck.some((c) => c.id === 1));
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            let index = hand.findIndex((c) => c.id === 1);
            let source = 'hand';
            let card = index !== -1 ? hand[index] : null;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!card && Array.isArray(deck)) {
                index = deck.findIndex((c) => c.id === 1);
                if (index !== -1) { card = deck[index]; source = 'deck'; }
            }
            if (!card) return;
            const field = ctx.field(ctx.owner);
            field[ctx.index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            if (source === 'hand') {
                hand.splice(index, 1);
            } else {
                deck.splice(index, 1);
                gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            }
            ctx.specialSummon(ctx.owner, card, ctx.index, 'attack', source);
            // CORREZIONE di fedeltà: il divieto d'attacco vale per TUTTI i
            // "Drago Bianco Occhi Blu" che si controllano (id 1), non solo
            // per la copia appena Special Summonata.
            gameState.cannotAttackUidsThisTurn = gameState.cannotAttackUidsThisTurn || new Set();
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot && !slot.isFaceDown && slot.card.id === 1) gameState.cannotAttackUidsThisTurn.add(slot.card.uid);
            });
            ctx.log('🐉 Paladino del Drago Bianco si sacrifica: Special Summon Drago Bianco Occhi Blu — nessun "Drago Bianco Occhi Blu" può attaccare questo turno!');
        }
    });

    // ================================================================
    // 508 — Strega della Foresta Nera / Witch of the Black Forest (onDestroy)
    // Quando questa carta viene mandata dal Terreno al Cimitero: puoi
    // aggiungere alla mano 1 mostro con 1500 o meno DEF dal Deck — stesso
    // meccanismo di Sangan (id 433), ma per DEF invece che ATK.
    // ================================================================
    // CORREZIONE di fedeltà: stessa restrizione da errata di Sangan (id
    // 433) qui sopra, stessa approssimazione "una volta per turno per nome".
    CardEffects.register(508, {
        onDestroy(ctx) {
            if (ctx.hasUsedOncePerTurn(`witch-black-forest-name:${ctx.owner}`)) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.defense <= 1500);
            if (index === -1) return;
            ctx.markUsedOncePerTurn(`witch-black-forest-name:${ctx.owner}`);
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.hand(ctx.owner).push(card);
            ctx.log(`🧙 Strega della Foresta Nera aggiunge ${card.name} alla mano dal Deck!`);
        }
    });

    // ================================================================
    // 517 — Rituale di Zera / Zera Ritual (Magia Rituale)
    // Sacrifica mostri dal Terreno per un Livello totale di almeno 8,
    // poi Special Summon Zera il Mant (id 518) dalla mano.
    // SEMPLIFICAZIONE: stesso spirito di Rito del Guerriero Nero (id 56).
    // ================================================================
    CardEffects.register(517, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 518);
            if (!hasRitualMonster) return false;
            const totalLevel = ctx.field(ctx.owner).reduce((sum, slot) => sum + (slot ? (slot.card.level || 0) : 0), 0);
            return totalLevel >= 8;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field
                .map((slot, index) => (slot ? { index, level: slot.card.level || 0 } : null))
                .filter(Boolean)
                .sort((a, b) => b.level - a.level);

            let remaining = 8;
            const toSacrifice = [];
            occupied.forEach((entry) => {
                if (remaining <= 0) return;
                toSacrifice.push(entry.index);
                remaining -= entry.level;
            });
            toSacrifice.forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.id === 518);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Zera il Mant finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('👹 Rituale di Zera evoca Zera il Mant!');
        }
    });

    // ================================================================
    // 518 — Zera il Mant / Zera the Mant: Evocabile Rituale solo tramite
    // "Rituale di Zera" (id 517, qui sopra — GIÀ IMPLEMENTATA). Qui serve
    // solo il divieto di Evocazione Normale/Set e di Special Summon per
    // ogni altra via (cannotNormalSummon/cannotBeSpecialSummoned — stesso
    // schema di 413).
    // ================================================================
    CardEffects.register(518, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 519 — Gravità Zero / Zero Gravity (Trappola Normale)
    // Cambia la Posizione di Battaglia di tutti i mostri scoperti sul
    // Terreno, di entrambi i giocatori.
    // ================================================================
    CardEffects.register(519, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown) {
                        slot.position = slot.position === 'attack' ? 'defense' : 'attack';
                        count++;
                    }
                });
            });
            ctx.log(`🔄 Gravità Zero cambia la Posizione di Battaglia di ${count} mostr${count === 1 ? 'o' : 'i'}!`);
        }
    });

    // ================================================================
    // 523 — Guardian Eatos (Special Summon dalla mano)
    // Se non hai mostri nel tuo Cimitero, puoi Special Summonare questa
    // carta dalla mano.
    // SEMPLIFICAZIONE: manca il secondo effetto (manda al Cimitero 1
    // Magia Equipaggiamento equipaggiata a questa carta per bandire fino
    // a 3 mostri dal Cimitero avversario, guadagnando 500 ATK ciascuno
    // fino a fine turno) — troppo complesso per i meccanismi già presenti.
    // ================================================================
    CardEffects.register(523, {
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).length === 0;
        }
    });

    // ================================================================
    // 28 — Mago del Tempo / Time Wizard (effetto Ignition)
    // Una volta per turno: lancia una moneta. Testa: distruggi tutti i
    // mostri dell'avversario. Croce: distruggi tutti i TUOI mostri
    // (questa carta compresa) e subisci danno pari a metà dell'ATK
    // totale che quelli scoperti avevano mentre erano sul Terreno.
    // SEMPLIFICAZIONE: nessuna animazione di lancio moneta dedicata,
    // solo un log — stesso spirito "risultato subito nel log" già usato
    // altrove per gli effetti a lancio di dado (es. Dado di Evocazione).
    // ================================================================
    CardEffects.register(28, {
        canActivate() { return true; },
        activate(ctx) {
            const heads = Math.random() < 0.5;
            // Saggio Oscuro (id 191): "se hai indovinato il lancio di
            // moneta dell'effetto di Mago del Tempo" — memorizzato qui,
            // l'unico posto in cui questo motore conosce il risultato
            // del lancio, per proprietario e turno (letto e consumato da
            // id 191, non azzerato altrove: un turno diverso o un
            // proprietario diverso semplicemente non corrisponde più).
            gameState.timeWizardCoinResultFor = { owner: ctx.owner, heads: heads, turn: gameState.turn };
            if (window.FX) FX.playCoinFlip(heads);
            if (heads) {
                ctx.log('🪙 Mago del Tempo lancia la moneta: Testa! Distrugge tutti i mostri dell\'avversario!');
                ctx.destroyAllMonsters(ctx.opponent);
                // Saggio Oscuro (id 191): "Special Summon... dalla mano O
                // DAL DECK" — la parte "dalla mano" è già coperta dal
                // click reattivo su canSpecialSummonFromHand; qui si
                // aggancia la parte "dal Deck", che non ha un elemento
                // cliccabile naturale (la carta non è in mano). Offerta
                // subito qui, al momento in cui questo motore conosce per
                // la prima e unica volta l'esito del lancio, con
                // DuelEngineUI.openChoicePopover (già usato altrove per
                // scelte binarie).
                const hasDarkMagician = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const deck = gameState[deckKey];
                const deckIndex = Array.isArray(deck) ? deck.findIndex((c) => c.id === 191) : -1;
                if (hasDarkMagician && deckIndex !== -1) {
                    const summonFromDeck = () => {
                        const magicianIndex = ctx.field(ctx.owner).findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
                        if (magicianIndex === -1) return;
                        const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                        if (slotIndex === -1) return;
                        const sacrificed = ctx.field(ctx.owner)[magicianIndex].card;
                        ctx.field(ctx.owner)[magicianIndex] = null;
                        ctx.graveyard(ctx.owner).push(sacrificed);
                        const freshDeck = gameState[deckKey];
                        const freshIndex = freshDeck.findIndex((c) => c.id === 191);
                        if (freshIndex === -1) return;
                        const [sage] = freshDeck.splice(freshIndex, 1);
                        gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = freshDeck.length;
                        ctx.specialSummon(ctx.owner, sage, slotIndex, 'attack', 'deck');
                        const searchDef = DuelEngine.getDefinition(191);
                        if (searchDef && typeof searchDef.onSpecialSummon === 'function') {
                            searchDef.onSpecialSummon(DuelEngine.makeContext(ctx.owner, { card: sage }));
                        }
                        ctx.log('🧙 Saggio Oscuro sacrifica Mago Nero ed è Special Summonato dal Deck!');
                    };
                    if (ctx.owner === 'player' && window.DuelEngineUI) {
                        window.DuelEngineUI.openChoicePopover(null, {
                            title: '🧙 Hai indovinato! Special Summonare Saggio Oscuro dal Deck?',
                            choiceA: { icon: '✅', label: 'Sì, sacrifica Mago Nero', onSelect: summonFromDeck },
                            choiceB: { icon: '❌', label: 'No', onSelect: () => {} }
                        });
                    } else {
                        summonFromDeck();
                    }
                }
            } else {
                let totalAtk = 0;
                ctx.field(ctx.owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown) totalAtk += DuelEngine.getEffectiveAtk(slot.card);
                });
                ctx.destroyAllMonsters(ctx.owner);
                const damage = Math.floor(totalAtk / 2);
                ctx.dealDamage(ctx.owner, damage);
                ctx.log(`🪙 Mago del Tempo lancia la moneta: Croce! Distrugge tutti i tuoi mostri e subisci ${damage} danni!`);
            }
        }
    });

    // ================================================================
    // 104 — Drago Barile / Barrel Dragon (effetto Ignition)
    // Una volta per turno: scegli come bersaglio 1 mostro dell'avversario;
    // lancia una moneta 3 volte e distruggilo se almeno 2 risultati sono
    // Testa.
    // SEMPLIFICAZIONE: sceglie da sola il bersaglio (il primo mostro
    // dell'avversario trovato) invece di un'interfaccia di selezione
    // dedicata, stesso spirito di Soldato Cannone (id 137) qui sopra.
    // ================================================================
    CardEffects.register(104, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            const targetIndex = field.findIndex((slot) => slot);
            if (targetIndex === -1) return;
            const target = field[targetIndex];
            const flips = [Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.5];
            const heads = flips.filter(Boolean).length;
            // 3 lanci mostrati in rapida sequenza (uno ogni 550ms), non solo
            // il conteggio finale nel log — vedi FX.playCoinFlip.
            if (window.FX) flips.forEach((result, i) => setTimeout(() => FX.playCoinFlip(result), i * 550));
            if (heads >= 2) {
                const decl = ctx.declareTarget(ctx.opponent, targetIndex, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                ctx.log(`🪙 Drago Barile lancia 3 monete (${heads} Testa): distrugge ${targetSlot ? targetSlot.card.name : target.card.name}!`);
                ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            } else {
                ctx.log(`🪙 Drago Barile lancia 3 monete (solo ${heads} Testa): l'effetto fallisce.`);
            }
        }
    });

    // ================================================================
    // 159 — Ondata Gelida / Cold Wave (Magia Normale)
    // Attivabile solo all'inizio della Main Phase 1 (approssimato a
    // "durante la propria Main Phase 1", nessuna carta di questo motore
    // distingue un preciso "inizio fase" più granulare — stessa
    // approssimazione già usata altrove in questo file). Fino al tuo
    // prossimo turno, né tu né il tuo avversario potete giocare o Set
    // Magie/Trappole — gameState.coldWaveActiveFor, consultato da
    // DuelEngine.isColdWaveActive() in canActivate; si esaurisce da solo
    // quando torna il tuo turno (changeTurn(), game-flow.js).
    // ================================================================
    CardEffects.register(159, {
        canActivate(ctx) {
            return gameState.phase === 'main1' && gameState.currentPlayer === ctx.owner;
        },
        activate(ctx) {
            gameState.coldWaveActiveFor = gameState.coldWaveActiveFor || {};
            gameState.coldWaveActiveFor[ctx.owner] = true;
            ctx.log('❄️ Ondata Gelida: nessuno può giocare o Set Magie/Trappole fino al tuo prossimo turno!');
        }
    });

    // ================================================================
    // 160 — Potere Raccolto / Gather Your Mind (Trappola Normale)
    // Scegli come bersaglio 1 mostro scoperto sul Terreno; equipaggialo
    // con TUTTE le Magie Equipaggiamento presenti sul Terreno (di
    // entrambi i giocatori) — riusa la stessa infrastruttura Equip
    // (equippedToOwner/equippedToIndex/equippedToUid, findEquipTarget/
    // attachEquip/equippedTarget) della sezione "CARTE EQUIPAGGIAMENTO"
    // più sopra in questo file.
    // SEMPLIFICAZIONE: sceglie da sola il bersaglio (il primo mostro
    // scoperto trovato, priorità al proprio campo), stesso spirito di
    // Soldato Cannone/Drago Barile qui sopra.
    // ================================================================
    CardEffects.register(160, {
        canActivate(ctx) {
            const hasEquips = [ctx.owner, ctx.opponent].some((o) => ctx.stField(o).some((slot) => {
                if (!slot || slot.isFaceDown) return false;
                const def = DuelEngine.getDefinition(slot.card.id);
                return def && def.isEquip;
            }));
            const hasTarget = [ctx.owner, ctx.opponent].some((o) => ctx.field(o).some((slot) => slot && !slot.isFaceDown));
            return hasEquips && hasTarget;
        },
        activate(ctx) {
            let targetOwner = null;
            let targetIndex = -1;
            [ctx.owner, ctx.opponent].forEach((o) => {
                if (targetIndex !== -1) return;
                const idx = ctx.field(o).findIndex((slot) => slot && !slot.isFaceDown);
                if (idx !== -1) { targetOwner = o; targetIndex = idx; }
            });
            if (targetIndex === -1) return;
            const target = ctx.field(targetOwner)[targetIndex].card;
            let count = 0;
            [ctx.owner, ctx.opponent].forEach((o) => {
                ctx.stField(o).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const def = DuelEngine.getDefinition(slot.card.id);
                    if (def && def.isEquip) {
                        slot.card.equippedToOwner = targetOwner;
                        slot.card.equippedToIndex = targetIndex;
                        slot.card.equippedToUid = target.uid;
                        count++;
                    }
                });
            });
            ctx.log(`⚡ Potere Raccolto equipaggia ${count} Magi${count === 1 ? 'a' : 'e'} Equipaggiamento a ${target.name}!`);
        }
    });

    // ================================================================
    // EVOCAZIONE FUSIONE — meccanismo generico (vedi la convenzione
    // spiegata in cima a questo file). Solo il minimo indispensabile per
    // farla funzionare: la Magia "Fusione" qui sotto, e un primo Mostro
    // Fusione i cui DUE materiali sono già entrambi presenti nel database
    // (a differenza della maggior parte degli altri, che aspettano
    // ancora carte collegate mancanti — vedi l'audit delle carte non
    // implementate). Gli altri Mostri Fusione restano da fare in un
    // secondo momento, uno per uno.
    // ================================================================

    // ================================================================
    // 38 — Fusione / Polymerization (Magia Normale)
    // Fondi insieme i Materiali Fusione elencati su un Mostro Fusione.
    // Cerca da sola (DuelEngine.getFusableExtraDeckMonsters) quali mostri
    // dell'Extra Deck sono fondibili ORA con quello che hai in mano/
    // Terreno; se è possibile fonderne più di uno, chiede quale con il
    // box di scelta a scorrimento orizzontale (stesso già usato altrove
    // in questo motore), altrimenti lo fa e basta.
    // ================================================================
    CardEffects.register(38, {
        canActivate(ctx) {
            return DuelEngine.getFusableExtraDeckMonsters(ctx.owner).length > 0;
        },
        activate(ctx) {
            const options = DuelEngine.getFusableExtraDeckMonsters(ctx.owner);
            if (options.length === 0) return;
            const owner = ctx.owner;
            const summon = (option) => {
                ctx.fusionSummon(owner, option.extraDeckIndex, option.materialLocations);
            };
            if (options.length === 1 || !window.DuelEngineUI) {
                summon(options[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(options.map((o) => o.card), {
                title: '🔗 Scegli il Mostro Fusione',
                text: 'Hai i materiali per più di un Mostro Fusione: scegline uno da Evocare.',
                onSelect: (card) => {
                    const match = options.find((o) => o.card.uid === card.uid);
                    if (match) summon(match);
                }
            });
        }
    });

    // ================================================================
    // 254 — Gaia il Campione dei Draghi / Gaia the Dragon Champion
    // (Mostro Fusione)
    // Fusione di "Gaia il Cavaliere Feroce" (id 14) e "Maledizione del
    // Drago" (id 15) — nessun effetto proprio oltre alla condizione di
    // Evocazione, quindi basta dichiarare i materiali: vedi "Fusione"
    // (id 38) qui sopra per come viene davvero Evocato.
    // ================================================================
    CardEffects.register(254, {
        fusionMaterials: [14, 15]
    });

    // ================================================================
    // Altri Mostri Fusione i cui materiali sono TUTTI già presenti nel
    // database — stesso principio di id 254 qui sopra, solo i materiali,
    // senza eventuali effetti propri aggiuntivi (documentati carta per
    // carta dove ce ne sono, restano SEMPLIFICAZIONE non applicata come
    // già per molte altre carte in questo file).
    // ================================================================

    // 29 — Drago Bianco Definitivo / Blue-Eyes Ultimate Dragon: fusione
    // di TRE "Drago Bianco Occhi Blu" (id 1).
    CardEffects.register(29, {
        fusionMaterials: [1, 1, 1]
    });

    // ================================================================
    // 30 — Obelisk il Tormentatore / Obelisk the Tormentor (uno dei 3 Dei
    // Egizi)
    // Testo ufficiale verificato (db.yugioh-card.com): "Richiede 3
    // Tributi per essere Evocato Normalmente (non può essere Posizionato
    // Normalmente). L'Evocazione Normale di questa carta non può essere
    // annullata. Quando viene Evocato Normalmente, non possono essere
    // attivate carte o effetti. Nessun giocatore può scegliere come
    // bersaglio questa carta con gli effetti delle carte. Una volta per
    // turno, durante la End Phase, se questa carta è stata Evocata
    // Specialmente: mandala al Cimitero. Puoi offrire come Tributo 2
    // mostri; distruggi tutti i mostri controllati dal tuo avversario.
    // Questa carta non può dichiarare un attacco nel turno in cui viene
    // attivato questo effetto."
    // Implementato: 3 Tributi (getTributesRequired, cards-db.js), non
    // può essere Settato (cannotBeSet, actions.js/bot.js), Ignition
    // sacrifica-2-distruggi-tutto con blocco d'attacco per il resto del
    // turno (gameState.cannotAttackUidsThisTurn). Non Special Summonabile
    // (cannotBeSpecialSummoned — approssima "se Special Summonato va al
    // Cimitero in End Phase": qui bloccato a monte, stesso risultato
    // pratico dato che nessun'altra carta di questo dataset potrebbe
    // comunque Special Summonarlo legalmente). SEMPLIFICAZIONE: mancano
    // l'immunità al targeting, l'immunità alla negazione della propria
    // Evocazione Normale e il blocco delle attivazioni altrui durante
    // essa — richiederebbero intercettare rispettivamente ogni possibile
    // bersaglio d'effetto, la Chain di risposta a Buco Trappola, e la
    // stessa finestra di risposta, tre meccanismi generici a parte, fuori
    // scopo per una sola carta.
    // ================================================================
    CardEffects.register(30, {
        cannotBeSpecialSummoned: true,
        cannotBeSet: true,
        canActivate(ctx) {
            return ctx.field(ctx.owner).filter((slot) => slot && slot.card.uid !== ctx.card.uid).length >= 2;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const others = field.map((slot, i) => ({ slot, i })).filter((s) => s.slot && s.slot.card.uid !== ctx.card.uid);
            others.slice(0, 2).forEach(({ slot, i }) => {
                ctx.graveyard(ctx.owner).push(slot.card);
                field[i] = null;
            });
            ctx.destroyAllMonsters(ctx.opponent);
            gameState.cannotAttackUidsThisTurn = gameState.cannotAttackUidsThisTurn || new Set();
            gameState.cannotAttackUidsThisTurn.add(ctx.card.uid);
            ctx.log("🗿 Obelisk il Tormentatore sacrifica 2 mostri e distrugge tutti i mostri dell'avversario! Non può attaccare in questo turno.");
        }
    });

    // ================================================================
    // 31 — Slifer il Drago del Cielo / Slifer the Sky Dragon (uno dei 3
    // Dei Egizi)
    // Testo ufficiale verificato (db.yugioh-card.com): "Richiede 3
    // Tributi per essere Evocato Normalmente (non può essere Posizionato
    // Normalmente). L'Evocazione Normale di questa carta non può essere
    // annullata. Quando viene Evocato Normalmente, non possono essere
    // attivate carte o effetti. Una volta per turno, durante la End
    // Phase, se questa carta è stata Evocata Specialmente: mandala al
    // Cimitero. Guadagna 1000 ATK/DEF per ogni carta nella tua mano. Se
    // uno o più mostri vengono Evocati Normalmente o Specialmente sul
    // Terreno del tuo avversario in Posizione di Attacco: quei mostri
    // perdono 2000 ATK, poi, se come risultato il loro ATK è stato
    // ridotto a 0, distruggili." — ATK/DEF stampati sono "?": card.attack/
    // defense nel database sono 0, il vero valore è SOLO quello dato
    // dall'effetto (nessun "più" rispetto a una base fissa).
    // SEMPLIFICAZIONE: la riduzione di 2000 ATK è permanente e scritta
    // direttamente su card.attack (stesso pattern di atkLossOnBattleDestroy
    // in actions.js), non riapplicata se altri effetti alzano di nuovo
    // l'ATK del bersaglio in seguito — nessuna carta di questo dataset fa
    // questo genere di cosa, quindi non c'è un caso reale da coprire.
    // ================================================================
    CardEffects.register(31, {
        cannotBeSpecialSummoned: true,
        cannotBeSet: true,
        static(ctx) {
            const handCount = ctx.hand(ctx.owner).length;
            gameState.atkDefBonus[ctx.card.uid] = { atk: handCount * 1000, def: handCount * 1000 };
        },
        onEnemyMonsterSummoned(ctx) {
            if (ctx.summonedPosition !== 'attack') return;
            const field = ctx.field(ctx.summonedOwner);
            const slot = field[ctx.summonedSlotIndex];
            if (!slot || slot.card.uid !== ctx.summonedCard.uid) return;
            slot.card.attack = Math.max(0, (slot.card.attack || 0) - 2000);
            if (DuelEngine.getEffectiveAtk(slot.card) <= 0) {
                ctx.destroyMonster(ctx.summonedOwner, ctx.summonedSlotIndex);
                ctx.log(`⚡ Slifer il Drago del Cielo riduce l'ATK di ${ctx.summonedCard.name} a 0 e lo distrugge!`);
            } else {
                ctx.log(`⚡ Slifer il Drago del Cielo fa perdere 2000 ATK a ${ctx.summonedCard.name}!`);
            }
        }
    });

    // 84 — Drago Spada di Alligatore / Alligator's Sword Dragon: fusione
    // di "Cucciolo di Drago" (id 27) e "Spada di Alligatore" (id 83).
    // SEMPLIFICAZIONE: manca l'attacco diretto condizionato (solo se
    // l'avversario controlla esclusivamente mostri TERRA/ACQUA/FUOCO) —
    // stesso limite di altre carte con condizioni sull'intero campo
    // avversario.
    // Può attaccare direttamente se gli unici mostri scoperti controllati
    // dall'avversario hanno Attributo TERRA, ACQUA o FUOCO
    // (gameState.directAttackAllowedUids, stesso meccanismo di Sparatore
    // Sonico id 773/Folletto della Fiamma Furente id 681 — vedi
    // duel-engine.js/game-flow.js/ai-medium.js/ai-hard.js).
    // SEMPLIFICAZIONE: ignora i mostri coperti dell'avversario (il loro
    // Attributo è nascosto, coerente con come altre condizioni "solo se
    // il campo avversario è così" di questo file guardano solo lo stato
    // visibile).
    CardEffects.register(84, {
        fusionMaterials: [27, 83],
        static(ctx) {
            const oppFaceUp = ctx.field(ctx.opponent).filter((s) => s && !s.isFaceDown);
            if (oppFaceUp.length > 0 && oppFaceUp.every((s) => ['TERRA', 'ACQUA', 'FUOCO'].includes(s.card.attribute))) {
                gameState.directAttackAllowedUids[ctx.card.uid] = true;
            }
        }
    });

    // 102 — Drago Nero del Teschio / Black Skull Dragon: fusione di
    // "Teschio Evocato" (id 13) e "Drago Nero Occhi Rossi" (id 12).
    CardEffects.register(102, {
        fusionMaterials: [13, 12]
    });

    // 189 — Paladino Oscuro / Dark Paladin: fusione di "Mago Nero" (id 2)
    // e "Buster Blader" (id 20). +500 ATK per ogni mostro Tipo Drago sul
    // Terreno E nei Cimiteri (di ENTRAMBI i giocatori, testo reale: "each
    // Dragon monster on the field and in the GY", nessuna distinzione di
    // proprietario). SEMPLIFICAZIONE: manca "quando l'avversario attiva
    // una Magia (Effetto Veloce): scarta 1 carta per negarla e
    // distruggerla" — richiederebbe una carta MOSTRO in campo capace di
    // rispondere a un'attivazione Magia, aggancio oggi riservato alle
    // Magie/Trappole Set (es. Interferenza Magica id 361), non ai mostri.
    CardEffects.register(189, {
        fusionMaterials: [2, 20],
        static(ctx) {
            let dragonCount = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => { if (slot && !slot.isFaceDown && slot.card.race === 'Drago') dragonCount++; });
                ctx.graveyard(owner).forEach((card) => { if (card.race === 'Drago') dragonCount++; });
            });
            if (dragonCount === 0) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + dragonCount * 500, def: e.def };
        }
    });

    // 207 — Cavaliere Maestro dei Draghi / Dragon Master Knight: fusione
    // di "Guerriero Nero Supremo" (id 55) e "Drago Occhi Blu Definitivo"
    // — quest'ultimo è id 29 "Drago Bianco Definitivo" in questo database
    // (stessa carta reale, Blue-Eyes Ultimate Dragon). SEMPLIFICAZIONE:
    // manca il bonus ATK per mostro Tipo Drago controllato.
    CardEffects.register(207, {
        fusionMaterials: [55, 29],
        // +500 ATK per ogni mostro Tipo Drago che controlli, ESCLUSA
        // questa carta (che è essa stessa Tipo Drago) — stesso schema di
        // Buster Blader (id 20) più sopra, self-contenuto (guarda solo il
        // proprio campo, non anche il Cimitero come Buster Blader).
        static(ctx) {
            const dragons = ctx.field(ctx.owner).filter((slot) => slot && !slot.isFaceDown && slot.card.uid !== ctx.card.uid && slot.card.race === 'Drago').length;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + dragons * 500, def: e.def };
        }
    });

    // 278 — Grande Mammut di Goldfine / Great Mammoth of Goldfine:
    // fusione di "Capelli di Serpente" (id 470) e "Drago Zombie" (id 211).
    CardEffects.register(278, {
        fusionMaterials: [470, 211]
    });

    // 303 — Drago Verme Umanoide / Humanoid Worm Drake: fusione di
    // "Drago Verme" (id 509) e "Melma Umanoide" (id 302).
    CardEffects.register(303, {
        fusionMaterials: [509, 302]
    });

    // 336 — Carro Armato del Labirinto / Labyrinth Tank: fusione di
    // "Lupo Giga-Tech" (id 264) e "Soldato Cannone" (id 137).
    CardEffects.register(336, {
        fusionMaterials: [264, 137]
    });

    // 387 — Re dei Musicisti / King of the Musicians: fusione di "Strega
    // della Foresta Nera" (id 508) e "Dama della Fede" (id 338).
    CardEffects.register(387, {
        fusionMaterials: [508, 338]
    });

    // 473 — Drago dei Mille / Thousand Dragon: fusione di "Mago del
    // Tempo" (id 28) e "Cucciolo di Drago" (id 27).
    CardEffects.register(473, {
        fusionMaterials: [28, 27]
    });

    // 476 — Restrizione dai Mille Occhi / Thousand-Eyes Restrict: fusione
    // di "Abbandonato" (id 416) e "Idolo dai Mille Occhi" (id 475).
    // "Gli altri mostri sul Terreno non possono cambiare Posizione di
    // Battaglia né attaccare" — un mostro alla volta, su ENTRAMBI i
    // giocatori, tramite i flag già esistenti cannotAttackUids/
    // cannotChangePositionUids (per-uid, non per-owner, esattamente
    // quello che serve qui). Clausola di targeting/equip ("una volta per
    // turno, equipaggia 1 mostro dell'avversario copiandone ATK/DEF"):
    // stesso identico meccanismo/stesso schema già usato per Abbandonato/
    // Relinquished (id 416, il proprio materiale da Fusione) qui sopra —
    // gameState.atkDefBonus per il delta ATK/DEF, restituzione su
    // onDestroy. Il redirect "se distrutta in battaglia, distruggi il
    // mostro equipaggiato al posto suo" è implementato tramite
    // onWouldBeDestroyedInBattle, stesso schema di 416 (vedi lì).
    CardEffects.register(476, {
        fusionMaterials: [416, 475],
        canActivate(ctx) {
            if (ctx.zone !== 'monster') return false;
            if (ctx.card._restrictTarget) return false;
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const oppField = ctx.field(ctx.opponent);
            const idx = oppField.findIndex((slot) => slot && !slot.isFaceDown);
            if (idx === -1) return;
            const absorbed = oppField[idx].card;
            oppField[idx] = null;
            ctx.card._restrictTarget = absorbed;
            ctx.card._restrictFromOwner = ctx.opponent;
            ctx.log(`👁️ Restrizione dai Mille Occhi equipaggia ${absorbed.name}, copiandone ATK/DEF!`);
        },
        onDestroy(ctx) {
            const absorbed = ctx.card._restrictTarget;
            if (!absorbed) return;
            const owner = ctx.card._restrictFromOwner;
            const emptySlot = ctx.field(owner).findIndex((slot) => slot === null);
            if (emptySlot !== -1) {
                ctx.field(owner)[emptySlot] = { card: absorbed, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false, summonedOnTurn: gameState.turn };
                ctx.log(`👁️ ${absorbed.name} torna sul campo del suo proprietario!`);
            } else {
                ctx.graveyard(owner).push(absorbed);
                ctx.log(`👁️ ${absorbed.name} torna al Cimitero del suo proprietario (Terreno pieno).`);
            }
        },
        // "Se questa carta dovrebbe essere distrutta IN BATTAGLIA,
        // distruggi il mostro equipaggiato al posto suo" (stesso schema di
        // Abbandonato/id 416, proprio materiale da Fusione): a differenza
        // di onDestroy qui sopra (ritorno "vivo" quando questa carta
        // lascia il campo), qui il mostro assorbito viene DISTRUTTO per
        // davvero, e questa carta sopravvive.
        onWouldBeDestroyedInBattle(ctx) {
            const absorbed = ctx.card._restrictTarget;
            if (!absorbed) return false;
            const owner = ctx.card._restrictFromOwner;
            ctx.graveyard(owner).push(absorbed);
            ctx.card._restrictTarget = null;
            ctx.log(`👁️ Restrizione dai Mille Occhi sopravvive: ${absorbed.name} viene distrutto al suo posto!`);
            return true;
        },
        static(ctx) {
            ['player', 'bot'].forEach((o) => {
                ctx.field(o).forEach((slot) => {
                    if (!slot || slot.card.uid === ctx.card.uid) return;
                    gameState.cannotAttackUids[slot.card.uid] = true;
                    gameState.cannotChangePositionUids[slot.card.uid] = true;
                });
            });
            const absorbed = ctx.card._restrictTarget;
            if (!absorbed) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + (absorbed.attack - ctx.card.attack), def: e.def + (absorbed.defense - ctx.card.defense) };
        }
    });

    // 184 — Cavaliere della Fiamma Oscura / Dark Flare Knight: fusione di
    // "Mago Nero" (id 2) e "Spadaccino di Fuoco" / Flame Swordsman (id 58
    // — CORREZIONE: puntava al vecchio id 524, duplicato di questa stessa
    // carta, eliminato). Non subisce danno da battaglia dagli attacchi
    // che la coinvolgono (preventOwnBattleDamage, flag generico
    // esistente — vedi applyDamage in actions.js). Se distrutta IN
    // BATTAGLIA (ctx.destroyedByOpponentCard, presente solo per
    // distruzioni in battaglia — vedi Ossigeddon id 804 per lo stesso
    // schema): Special Summon "Cavaliere del Miraggio" (id 381, qui
    // sotto) dalla mano o dal Deck. CORREZIONE: la nota precedente di
    // questa e di id 381 affermava erroneamente che l'altra carta non
    // fosse presente in questo database — falso, entrambe già esistono
    // ed erano solo riferite l'una all'altra con un nome leggermente
    // diverso ("Cavaliere Fiamma Oscura" invece di "Cavaliere della
    // Fiamma Oscura").
    // ================================================================
    CardEffects.register(184, {
        fusionMaterials: [2, 58],
        preventOwnBattleDamage: true,
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard) return;
            const owner = ctx.owner;
            const hand = ctx.hand(owner);
            let index = hand.findIndex((c) => c.id === 381);
            let source = 'hand';
            let card = index !== -1 ? hand[index] : null;
            const deckKey = owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!card && Array.isArray(deck)) {
                index = deck.findIndex((c) => c.id === 381);
                if (index !== -1) { card = deck[index]; source = 'deck'; }
            }
            if (!card) return;
            const slotIndex = ctx.findEmptyMonsterSlot(owner);
            if (slotIndex === -1) return;
            if (source === 'hand') {
                hand.splice(index, 1);
            } else {
                deck.splice(index, 1);
                gameState[owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            }
            ctx.specialSummon(owner, card, slotIndex, 'attack', source);
            ctx.log('🔥 Cavaliere della Fiamma Oscura, distrutta in battaglia, Special Summona Cavaliere del Miraggio!');
        }
    });

    // ================================================================
    // 381 — Cavaliere del Miraggio / Mirage Knight
    // Non può essere Evocato Normalmente/Set (cannotNormalSummon) né
    // Special Summonato in nessun altro modo (cannotBeSpecialSummoned —
    // esclude Rinascita del Mostro/Carica dell'Anima id 35/59, ma NON
    // blocca ctx.specialSummon usato direttamente da Cavaliere della
    // Fiamma Oscura id 184 qui sopra, l'unico modo legale). Solo durante
    // il calcolo dei danni, guadagna ATK pari all'ATK ORIGINALE (base,
    // non effettivo) del mostro avversario con cui combatte
    // (damageStepBonus). Alla fine della Battle Phase di un turno in cui
    // ha attaccato o è stata attaccata: si bandisce (onBattlePhaseEnd,
    // duel-engine.js/game-flow.js — zona Bandite, ctx.banish).
    // ================================================================
    CardEffects.register(381, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        damageStepBonus(ctx) {
            if (!ctx.opponentCard) return { atk: 0, def: 0 };
            return { atk: ctx.opponentCard.attack || 0, def: 0 };
        },
        onBattlePhaseEnd(ctx) {
            if (!ctx.card.battledThisBattlePhase) return;
            ctx.card.battledThisBattlePhase = false;
            ctx.field(ctx.owner)[ctx.slotIndex] = null;
            ctx.banish(ctx.owner, ctx.card);
            ctx.log('🌫️ Cavaliere del Miraggio bandito a fine turno!');
        }
    });

    // 408 — Cavallerizzo Rabbioso / Rabid Horseman: fusione di "Bue da
    // Battaglia" / Battle Ox (id 106, già presente) e "Cavaliere Mistico"
    // (id 389).
    // CORREZIONE di fedeltà: aggiunto l'effetto mancante — "se un tuo
    // mostro Tipo Bestia, Guerriero Bestia o Bestia Alata attacca un
    // mostro in Posizione di Difesa, infliggi danno perforante" — riusa
    // lo stesso meccanismo generico già esistente per RAZZA (
    // gameState.piercingRacesFor/hasRacePiercing, usato da Furia del
    // Drago id 212), qui applicato a 3 razze insieme invece di una sola.
    CardEffects.register(408, {
        fusionMaterials: [106, 389],
        static(ctx) {
            ['Bestia', 'Guerriero Bestia', 'Bestia Alata'].forEach((race) => {
                gameState.piercingRacesFor[ctx.owner].add(race);
            });
        }
    });

    // 521 — Guerriero Zombie / Zombie Warrior: fusione di "Skull Servant"
    // (id 526, importata apposta) e "Guerriero da Battaglia" (id 108).
    CardEffects.register(521, {
        fusionMaterials: [526, 108]
    });

    // 73 — Super Roboyarou / Super Robolady: fusione di "Roboyarou"
    // (id 527) e "Robolady" (id 528). SEMPLIFICAZIONE: manca il bonus
    // +1000 ATK durante il Damage Step (damageStepBonus, come Soldati
    // Insetto del Cielo/Soldato Cinetico) — rimandato a un secondo
    // passaggio.
    // CORREZIONE di fedeltà: aggiunto il bonus +1000 ATK nel Damage Step
    // mancante (damageStepBonus, stesso schema di Soldati Insetto del
    // Cielo/Soldato Cinetico).
    CardEffects.register(73, {
        fusionMaterials: [527, 528],
        damageStepBonus(ctx) {
            if (ctx.role === 'attacker') return { atk: 1000 };
            return null;
        }
    });

    // 103 — Barox: fusione di "Panda Scatenato" (id 529) e "Ryu Kishin"
    // (id 25).
    CardEffects.register(103, {
        fusionMaterials: [529, 25]
    });

    // 113 — Bickuribox: fusione di "Clown Stupido" (id 530) e "Clown del
    // Sogno" (id 531).
    CardEffects.register(113, {
        fusionMaterials: [530, 531]
    });

    // 149 — Chimera la Bestia Mitica Volante: fusione di "Gazelle, Re
    // delle Bestie Mitiche" (id 532) e "Berfomet" (id 533).
    // CORREZIONE di fedeltà: nota precedente obsoleta (diceva che i
    // bersagli non erano presenti nel database — lo sono entrambi, sono
    // gli stessi materiali da Fusione qui sopra). Aggiunto l'effetto
    // mancante: "quando questa carta viene distrutta, puoi Special
    // Summonare 1 'Berfomet' o 1 'Gazelle il Re delle Bestie Mitiche' dal
    // tuo Cimitero".
    CardEffects.register(149, {
        fusionMaterials: [532, 533],
        onDestroy(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.id === 532 || c.id === 533);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = grave.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'graveyard');
            ctx.log(`🦁 Chimera la Bestia Mitica Volante Special Summona ${card.name} dal Cimitero!`);
        }
    });

    // 213 — Dragoness la Cavaliera Malvagia: fusione di "Armaill" (id 97)
    // e "Drago con Scudo" (id 534).
    CardEffects.register(213, {
        fusionMaterials: [97, 534]
    });

    // 268 — Giltia il Cavaliere D.: fusione di "Guardia del Labirinto"
    // (id 535) e "Protettrice del Trono" (id 536).
    CardEffects.register(268, {
        fusionMaterials: [535, 536]
    });

    // 494 — Drago del Tuono a Due Teste: fusione di DUE copie di "Thunder
    // Dragon" (id 537).
    CardEffects.register(494, {
        fusionMaterials: [537, 537]
    });

    // 33 — Il Guardiano del Cancello / Gate Guardian: fusione di "Sanga
    // del Tuono" (id 538), "Kazejin" (id 324) e "Suijin" (id 71).
    // SEMPLIFICAZIONE: la carta reale offre ANCHE un percorso alternativo
    // ("Special Summon dalla mano tributando i 3 Guardiani già in campo",
    // senza passare da "Fusione"/Extra Deck) — non implementato, resta
    // solo questo, il percorso Fusione standard.
    // CORREZIONE di fedeltà: il vero Il Guardiano del Cancello NON si
    // Evoca Fusione tramite "Fusione"/Polymerization — è Special
    // Summonabile SOLO sacrificando "Sanga del Tuono", "Kazejin" e
    // "Suijin" già scoperti sul proprio Terreno, un'abilità innata dalla
    // mano (stesso schema di Vincoli Recisi/id 415: Special Summon
    // dedicato che sacrifica mostri specifici dal Terreno). Sostituito
    // fusionMaterials (percorso Polymerization mai corretto per questa
    // carta) con canSpecialSummonFromHand/paySpecialSummonCost.
    CardEffects.register(33, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return [538, 324, 71].every((id) => ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === id));
        },
        paySpecialSummonCost(ctx) {
            const field = ctx.field(ctx.owner);
            const indices = [538, 324, 71].map((id) => field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === id));
            if (indices.some((i) => i === -1)) return false;
            indices.forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });
            ctx.log('🚪 Il Guardiano del Cancello sacrifica Sanga del Tuono, Kazejin e Suijin per essere Special Summonato!');
            return true;
        }
    });

    // 58 — Spadaccino di Fuoco / Flame Swordsman: fusione di "Signore
    // delle Fiamme" (id 539, Flame Manipulator) e "Masaki lo Spadaccino
    // Leggendario" (id 369, Masaki the Legendary Swordsman — CORREZIONE:
    // puntava al vecchio id 540, duplicato di id 369, eliminato).
    // Se questa carta distrugge in battaglia un mostro dell'avversario:
    // infliggi 500 danni al tuo avversario (damageOnBattleDestroy, letto
    // da applyBattleDestroyBonus in actions.js).
    // CORREZIONE di fedeltà: la clausola "infliggi 500 danni se distrugge
    // un mostro in battaglia" era fabbricata (proveniva da una voce
    // duplicata id 524 rimossa in una sessione precedente, erroneamente
    // creduta il vero effetto di questa carta) — verificato che il vero
    // Spadaccino di Fuoco/Flame Swordsman è una carta Fusione VANILLA,
    // nessun effetto attivabile. fusionMaterials resta l'unica proprietà.
    CardEffects.register(58, {
        fusionMaterials: [539, 369]
    });

    // ================================================================
    // 511/512 — Cannone Drago XY / Cannone Drago XYZ (Special Summon
    // dall'Extra Deck BANDENDO materiali, non tramite la Magia "Fusione"
    // — vedi la sezione "Special Summon dall'EXTRA DECK bandendo
    // materiali" in cima a js/engine/duel-engine.js per come funziona). 511 si
    // ottiene bandendo "Cannone Testa X" (id 510) + "Testa di Drago Y"
    // (id 513); 512 bandendo lo stesso 511 già in campo + "Carro Armato
    // Metallico Z" (id 515).
    // SEMPLIFICAZIONE: manca l'effetto attivabile di entrambe (scarta 1
    // carta per distruggere 1 carta/Magia-Trappola avversaria) — solo la
    // condizione di Evocazione è implementata.
    // ================================================================
    CardEffects.register(511, {
        banishFusionMaterials: [510, 513]
    });
    CardEffects.register(512, {
        banishFusionMaterials: [511, 515]
    });

    // ================================================================
    // 513 — Testa di Drago Y / Y-Dragon Head (Mostro Union — vedi
    // attachUnionMonster/isUnion più in alto in questo file)
    // Effetto Ignition dalla zona Mostro: si aggancia a "Cannone Testa X"
    // (id 510) come Carta Equipaggiamento, dandogli +400 ATK/DEF.
    // ================================================================
    CardEffects.register(513, {
        isUnion: true,
        isEquip: true,
        unionTargetFilter: (c) => c.id === 510,
        canActivate(ctx) {
            return findEquipTarget(ctx, (c) => c.id === 510) !== -1;
        },
        activate(ctx) {
            attachUnionMonster(ctx, (c) => c.id === 510);
        },
        static(ctx) {
            if (!ctx.card.equippedToOwner) return;
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 400, def: e.def + 400 };
        }
    });

    // ================================================================
    // 515 — Carro Armato Metallico Z / Z-Metal Tank (Mostro Union)
    // Effetto Ignition dalla zona Mostro: si aggancia a "Cannone Testa X"
    // (id 510) o "Testa di Drago Y" (id 513), dando +600 ATK/DEF.
    // ================================================================
    CardEffects.register(515, {
        isUnion: true,
        isEquip: true,
        unionTargetFilter: (c) => c.id === 510 || c.id === 513,
        canActivate(ctx) {
            return findEquipTarget(ctx, (c) => c.id === 510 || c.id === 513) !== -1;
        },
        activate(ctx) {
            attachUnionMonster(ctx, (c) => c.id === 510 || c.id === 513);
        },
        static(ctx) {
            if (!ctx.card.equippedToOwner) return;
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 600, def: e.def + 600 };
        }
    });

    // ================================================================
    // 404 — Drago Nero Pece / Pitch-Black Warwolf (Mostro Union — vedi
    // attachUnionMonster/isUnion più in alto in questo file). Nota:
    // "Dark Blade" è presente in questo database come "Lama Oscura" (id
    // 613, vanilla) — la nota precedente ("non presente in questo
    // database") era ormai superata dall'aggiunta di quella carta.
    // Effetto Ignition dalla zona Mostro: si aggancia a Lama Oscura (id
    // 613) come Carta Equipaggiamento, dandogli +400 ATK/DEF.
    // SEMPLIFICAZIONE: manca lo stacco VOLONTARIO (sacrificando il
    // bersaglio equipaggiato per Special Summonare di nuovo questa carta
    // scoperta in Attacco) — stesso limite generico di ogni altro Mostro
    // Union in questo file (vedi il commento su attachUnionMonster):
    // l'unico modo per staccarsi resta che il bersaglio lasci il campo.
    // ================================================================
    CardEffects.register(404, {
        isUnion: true,
        isEquip: true,
        unionTargetFilter: (c) => c.id === 613,
        canActivate(ctx) {
            return findEquipTarget(ctx, (c) => c.id === 613) !== -1;
        },
        activate(ctx) {
            attachUnionMonster(ctx, (c) => c.id === 613);
        },
        static(ctx) {
            if (!ctx.card.equippedToOwner) return;
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 400, def: e.def + 400 };
        }
    });

    // ================================================================
    // 530 — Clown Stupido / Crass Clown (onPositionChange)
    // Se questa carta, scoperta in Posizione di Difesa, viene messa in
    // Posizione di Attacco: fai ritornare in mano 1 mostro controllato
    // dal tuo avversario.
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (l'ATK più alto,
    // il più minaccioso da rimandare in mano), stesso spirito di Stop
    // Difesa (id 69).
    // ================================================================
    CardEffects.register(530, {
        onPositionChange(ctx) {
            if (ctx.fromPosition !== 'defense' || ctx.toPosition !== 'attack') return;
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let highestAtk = -1;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.attack > highestAtk) { highestAtk = slot.card.attack; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const bounced = field[targetIndex].card;
            field[targetIndex] = null;
            ctx.hand(ctx.opponent).push(bounced);
            ctx.log(`🤡 Clown Stupido rimanda ${bounced.name} in mano!`);
        }
    });

    // ================================================================
    // 531 — Clown del Sogno / Dream Clown (onPositionChange)
    // Se questa carta, scoperta in Posizione di Attacco, viene messa
    // scoperta in Posizione di Difesa: distruggi 1 mostro controllato
    // dal tuo avversario.
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (l'ATK più alto),
    // stesso spirito di Clown Stupido qui sopra.
    // ================================================================
    CardEffects.register(531, {
        onPositionChange(ctx) {
            if (ctx.fromPosition !== 'attack' || ctx.toPosition !== 'defense') return;
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let highestAtk = -1;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.attack > highestAtk) { highestAtk = slot.card.attack; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, targetIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const targetName = targetSlot.card.name;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`🤡 Clown del Sogno distrugge ${targetName}!`);
        }
    });

    // ================================================================
    // 354 — Signore del Rosso (onCardActivated — Ritual, Evocabile
    // tramite "Trasmigrazione Occhi Rossi", id 414, già implementata)
    // Una volta per turno PER CIASCUN giocatore, quando una carta o un
    // effetto viene attivato (eccetto questa carta): quel giocatore può
    // scegliere come bersaglio 1 mostro sul Terreno e distruggerlo.
    // Separatamente, una volta per turno per ciascun giocatore: quel
    // giocatore può scegliere come bersaglio 1 Magia/Trappola sul
    // Terreno e distruggerla — 4 tracciamenti "una volta per turno"
    // indipendenti in tutto (2 clausole x 2 giocatori).
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (per la distruzione di
    // un mostro, quello scoperto con l'ATK più alto sul campo
    // dell'avversario del beneficiario; per Magia/Trappola, la prima
    // trovata sul suo campo) invece di un vero "puoi scegliere" — se non
    // c'è un bersaglio valido quella clausola semplicemente non scatta,
    // stesso spirito delle altre carte con targeting automatico.
    // ================================================================
    CardEffects.register(354, {
        onCardActivated(ctx) {
            ['player', 'bot'].forEach((side) => {
                const rival = side === 'player' ? 'bot' : 'player';

                const monsterKey = `${ctx.card.uid}:destroyMonster:${side}`;
                if (!ctx.hasUsedOncePerTurn(monsterKey)) {
                    const rivalField = ctx.field(rival);
                    let targetIndex = -1;
                    let highestAtk = -1;
                    rivalField.forEach((slot, i) => {
                        if (slot && !slot.isFaceDown && slot.card.attack > highestAtk) { highestAtk = slot.card.attack; targetIndex = i; }
                    });
                    if (targetIndex !== -1) {
                        const targetName = rivalField[targetIndex].card.name;
                        ctx.destroyMonster(rival, targetIndex);
                        ctx.markUsedOncePerTurn(monsterKey);
                        ctx.log(`🔥 Signore del Rosso lascia che ${side === 'player' ? 'tu' : 'il bot'} distrugga ${targetName}!`);
                    }
                }

                const stKey = `${ctx.card.uid}:destroySpellTrap:${side}`;
                if (!ctx.hasUsedOncePerTurn(stKey)) {
                    const rivalST = ctx.stField(rival);
                    const targetIndex = rivalST.findIndex((slot) => slot !== null);
                    if (targetIndex !== -1) {
                        const targetName = rivalST[targetIndex].card.name;
                        ctx.graveyard(rival).push(rivalST[targetIndex].card);
                        rivalST[targetIndex] = null;
                        ctx.markUsedOncePerTurn(stKey);
                        ctx.log(`🔥 Signore del Rosso lascia che ${side === 'player' ? 'tu' : 'il bot'} distrugga ${targetName}!`);
                    }
                }
            });
        }
    });

    // ================================================================
    // 148 — Scudo Lustro Giallo / Yellow Luster Shield (Magia Continua)
    // Finché scoperta sul Terreno: tutti i mostri che controlli
    // guadagnano 300 DEF.
    // ================================================================
    CardEffects.register(148, {
        continuous: true,
        activate(ctx) { ctx.log(`🛡️ ${ctx.card.name} si scopre sul Terreno.`); },
        static(ctx) {
            ctx.field(ctx.owner).forEach((slot) => {
                if (!slot) return;
                const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[slot.card.uid] = { atk: e.atk, def: e.def + 300 };
            });
        }
    });

    // ================================================================
    // 151 — Coro del Santuario (Magia Terreno)
    // Tutti i mostri in Posizione di Difesa SUL TERRENO (di entrambi i
    // giocatori, non solo i propri) guadagnano 500 DEF. Sfrutta il fix
    // appena aggiunto in duel-engine.js: recomputeStaticEffects() ora
    // richiama static() anche per la Magia Terreno scoperta, non solo
    // per mostri e Magie/Trappole Continue sullo stField.
    // ================================================================
    CardEffects.register(151, {
        continuous: true,
        activate(ctx) { ctx.log(`🎵 ${ctx.card.name} si scopre sul Terreno.`); },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.position !== 'defense') return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk, def: e.def + 500 };
                });
            });
        }
    });

    // ================================================================
    // 465 — Le Forze A. / A-Forces (Magia Continua)
    // I mostri Tipo Guerriero che controlli guadagnano 200 ATK per ogni
    // mostro Tipo Guerriero o Incantatore che controlli (se stessi inclusi).
    // ================================================================
    CardEffects.register(465, {
        continuous: true,
        activate(ctx) { ctx.log(`⚔️ ${ctx.card.name} si scopre sul Terreno.`); },
        static(ctx) {
            const field = ctx.field(ctx.owner);
            const boosterCount = field.filter((slot) => slot && !slot.isFaceDown && (slot.card.race === 'Guerriero' || slot.card.race === 'Incantatore')).length;
            if (boosterCount === 0) return;
            field.forEach((slot) => {
                if (!slot || slot.isFaceDown || slot.card.race !== 'Guerriero') return;
                const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 200 * boosterCount, def: e.def };
            });
        }
    });

    // ================================================================
    // 227 — Drenaggio di Energia (Trappola Normale)
    // Scegli come bersaglio 1 mostro scoperto che controlli; guadagna
    // 200 ATK/DEF per ogni carta nella mano del tuo avversario, fino a
    // fine turno — vedi ctx.grantTemporaryAtkDefBonus in duel-engine.js
    // (bonus "una tantum", non un buff continuo da static()).
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (l'ATK più alto).
    // ================================================================
    CardEffects.register(227, {
        canActivate(ctx) { return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown); },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            let targetIndex = -1;
            let highestAtk = -1;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.attack > highestAtk) { highestAtk = slot.card.attack; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const target = field[targetIndex].card;
            const bonus = 200 * ctx.hand(ctx.opponent).length;
            ctx.grantTemporaryAtkDefBonus(target, bonus, bonus);
            ctx.log(`⚡ Drenaggio di Energia dà a ${target.name} +${bonus} ATK/DEF fino a fine turno!`);
        }
    });

    // ================================================================
    // 350 — Rimozione del Limitatore / Limiter Removal (Magia Veloce)
    // Raddoppia l'ATK di tutti i mostri Tipo Macchina che controlli
    // attualmente, fino alla fine di questo turno; durante la End Phase
    // di questo turno, quei mostri vengono distrutti — entrambe le parti
    // usano ctx.grantTemporaryAtkDefBonus(..., destroyAfter: true), che
    // scade da sola in enterEndPhase() (game-flow.js).
    // ================================================================
    CardEffects.register(350, {
        canActivate(ctx) { return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Macchina'); },
        activate(ctx) {
            let count = 0;
            ctx.field(ctx.owner).forEach((slot) => {
                if (!slot || slot.isFaceDown || slot.card.race !== 'Macchina') return;
                const currentAtk = DuelEngine.getEffectiveAtk(slot.card);
                ctx.grantTemporaryAtkDefBonus(slot.card, currentAtk, 0, true);
                count++;
            });
            ctx.log(`💥 Rimozione del Limitatore raddoppia l'ATK di ${count} most${count === 1 ? 'ro' : 'ri'} Macchina, distrutti in End Phase!`);
        }
    });

    // ================================================================
    // 153 — Notte Meccanica (Magia Continua)
    // I mostri Tipo Macchina che controlli guadagnano 500 ATK/DEF; quelli
    // dell'avversario perdono 500 ATK/DEF.
    // SEMPLIFICAZIONE: manca "tutti i mostri scoperti sul Terreno
    // diventano Tipo Macchina" — questo motore non ha un meccanismo di
    // conversione temporanea del Tipo di un mostro, quindi il buff/debuff
    // si applica solo a chi è GIÀ Tipo Macchina per conto proprio.
    // ================================================================
    CardEffects.register(153, {
        continuous: true,
        activate(ctx) { ctx.log(`⚙️ ${ctx.card.name} si scopre sul Terreno.`); },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.race !== 'Macchina') return;
                    const delta = owner === ctx.owner ? 500 : -500;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + delta, def: e.def + delta };
                });
            });
        }
    });

    // ================================================================
    // 142 — Castello delle Illusioni Oscure (buff continuo, mostro FLIP)
    // Aumenta di 200 punti ATK/DEF tutti i mostri Tipo Zombie (di
    // entrambi i giocatori) finché questa carta resta scoperta in campo
    // — la condizione "FLIP" è già implicita: static() qui sotto viene
    // richiamato SOLO mentre la carta è scoperta (vedi recomputeStaticEffects).
    // SEMPLIFICAZIONE: manca l'escalation (+200 aggiuntivi ad ogni Standby
    // Phase, fino al 4° turno) e l'autodistruzione dopo 4 turni — resta
    // fisso a +200, senza scadenza.
    // ================================================================
    CardEffects.register(142, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.race !== 'Zombie') return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 200, def: e.def + 200 };
                });
            });
        }
    });

    // ================================================================
    // 186 — Jeroid Oscuro (effetto all'Evocazione, riduzione permanente)
    // Quando questa carta viene Evocata: scegli come bersaglio 1 mostro
    // scoperto sul Terreno; perde 800 ATK. A differenza degli altri buff
    // di questo file (bonus ricalcolato ad ogni render tramite
    // gameState.atkDefBonus, valido solo finché la carta sorgente resta
    // in campo), qui la riduzione è permanente e indipendente da Jeroid
    // Oscuro stesso — scrive direttamente su card.attack, sicuro perché
    // ogni copia in gioco è un oggetto proprio (vedi buildDeckFromSpec in
    // cards-db.js), mai condiviso col resto del cardDatabase.
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (l'ATK più alto tra i
    // mostri dell'avversario).
    // ================================================================
    CardEffects.register(186, {
        onSummon(ctx) {
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let highestAtk = -1;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && DuelEngine.getEffectiveAtk(slot.card) > highestAtk) { highestAtk = DuelEngine.getEffectiveAtk(slot.card); targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const target = field[targetIndex].card;
            target.attack = Math.max(0, target.attack - 800);
            ctx.log(`👹 Jeroid Oscuro riduce l'ATK di ${target.name} di 800 punti!`);
        }
    });

    // ================================================================
    // 183 — Rito del Drago Oscuro / Dark Dragon Ritual (Magia Rituale)
    // Ritual Summon di "Paladino del Drago Oscuro" (id 855, aggiunta ora:
    // la nota precedente la dava per assente dal database, corretto qui).
    // Stesso schema di Rito dell'Illusione Nera (id 116): sacrifica in
    // automatico dal proprio Terreno i mostri con Livello più alto finché
    // il totale richiesto (4) non è raggiunto, invece di lasciar
    // scegliere — stessa SEMPLIFICAZIONE dichiarata lì (manca la scelta
    // manuale e il sacrificio da mano/Terreno avversario).
    // ================================================================
    // CORREZIONE di fedeltà: il testo salvato già diceva "dal Terreno o
    // dalla mano", ma il codice sacrificava SOLO dal Terreno — bug reale
    // (testo e comportamento disallineati), corretto riusando
    // performRitualTribute/maxRitualTributeLevel (vicino a
    // attachUnionMonster in questo file), stesso schema di Rito del
    // Guerriero Nero/id 56.
    // "Durante la tua Main Phase, tranne il turno in cui questa carta è
    // finita nel Cimitero: puoi bandirla per cercare 1 Magia/Trappola
    // 'Occhi Rossi' nel Deck" — stesso nuovo aggancio PROATTIVO di Spada
    // Divina - Lama della Fenice (id 722, vedi lì).
    // card._sentToGraveyardOnTurn timbrato qui sotto, al momento in cui
    // questa carta finisce DAVVERO nel Cimitero (non prima): activateCard
    // (duel-engine.js) manda una Magia Normale al Cimitero PRIMA di
    // chiamare activate(ctx), quindi ctx.card è già lo stesso oggetto che
    // troveremo nel Cimitero.
    CardEffects.register(183, {
        canActivate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 855);
            if (handIndex === -1) return false;
            return maxRitualTributeLevel(ctx, handIndex) >= 4;
        },
        activate(ctx) {
            ctx.card._sentToGraveyardOnTurn = gameState.turn;
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 855);
            if (handIndex === -1) return;
            performRitualTribute(ctx, 4, handIndex);
            const hand = ctx.hand(ctx.owner);
            const finalHandIndex = hand.findIndex((c) => c.id === 855);
            if (finalHandIndex === -1) return;
            const [ritualCard] = hand.splice(finalHandIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Paladino del Drago Oscuro finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('🐉 Rito del Drago Oscuro evoca Paladino del Drago Oscuro!');
        },
        canActivateFromGraveyardMainPhase(ctx) {
            if (ctx.card._sentToGraveyardOnTurn === gameState.turn) return false;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            return Array.isArray(deck) && deck.some((c) => (c.type === 'spell' || c.type === 'trap') && c.name && c.name.includes('Occhi Rossi'));
        },
        activateFromGraveyardMainPhase(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const cardIndex = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (cardIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            const deckIndex = deck.findIndex((c) => (c.type === 'spell' || c.type === 'trap') && c.name && c.name.includes('Occhi Rossi'));
            if (deckIndex === -1) return;
            const [banished] = grave.splice(cardIndex, 1);
            ctx.banish(ctx.owner, banished);
            const [found] = deck.splice(deckIndex, 1);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.hand(ctx.owner).push(found);
            ctx.log(`🐉 Rito del Drago Oscuro si bandisce dal Cimitero: aggiunge ${found.name} alla mano dal Deck!`);
        }
    });

    // ================================================================
    // 187 — Rito della Magia Oscura / Dark Magic Ritual (Magia Rituale)
    // Ritual Summon di "Mago del Caos Nero" (id 854, aggiunta ora: la
    // nota precedente la dava per assente dal database, corretto qui).
    // Stesso schema di Rito del Drago Oscuro (id 183) qui sopra, ma
    // Livello totale richiesto 8 invece di 4.
    // ================================================================
    CardEffects.register(187, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 854);
            if (!hasRitualMonster) return false;
            const totalLevel = ctx.field(ctx.owner).reduce((sum, slot) => sum + (slot ? (slot.card.level || 0) : 0), 0);
            return totalLevel >= 8;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field
                .map((slot, index) => (slot ? { index, level: slot.card.level || 0 } : null))
                .filter(Boolean)
                .sort((a, b) => b.level - a.level);
            let remaining = 8;
            const toSacrifice = [];
            occupied.forEach((entry) => {
                if (remaining <= 0) return;
                toSacrifice.push(entry.index);
                remaining -= entry.level;
            });
            toSacrifice.forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });
            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.id === 854);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Mago del Caos Nero finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('🌑 Rito della Magia Oscura evoca Mago del Caos Nero!');
        }
    });

    // ================================================================
    // 854 — Mago del Caos Nero / Dark Magician of Chaos: Evocabile
    // Rituale solo tramite "Rito della Magia Oscura" (id 187, qui sopra —
    // GIÀ IMPLEMENTATA). Qui serve solo il divieto di Evocazione
    // Normale/Set e di Special Summon per ogni altra via
    // (cannotNormalSummon/cannotBeSpecialSummoned — stesso schema di 413).
    // ================================================================
    CardEffects.register(854, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 236 — Zanna di Critias / The Fang of Critias (Magia Normale)
    // Manda al Cimitero "Forza dello Specchio" (id 382, il vero Mirror
    // Force — già presente) dalla mano o dal Terreno, per Special
    // Summonare dall'Extra Deck "Drago della Forza dello Specchio" (id
    // 858, aggiunto ora — la nota precedente la dava per assente dal
    // database, corretto qui: ricerca web ha identificato il vero
    // bersaglio, Mirror Force Dragon). SEMPLIFICAZIONE: il testo reale
    // permette QUALSIASI mostro Fusione "Special Summonabile con Zanna di
    // Critias, usando [una Trappola specifica]" — qui limitato al solo
    // Drago della Forza dello Specchio/Forza dello Specchio, l'unica
    // coppia carta-Trappola presente in questo database.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunto "una volta per turno" (mancava).
    CardEffects.register(236, {
        canActivate(ctx) {
            if (ctx.hasUsedOncePerTurn(`236:${ctx.owner}`)) return false;
            const hasTrap = ctx.hand(ctx.owner).some((c) => c.id === 382) || ctx.stField(ctx.owner).some((s) => s && s.card.id === 382);
            if (!hasTrap) return false;
            const extraDeck = gameState[ctx.owner === 'player' ? 'playerExtraDeck' : 'botExtraDeck'];
            if (!Array.isArray(extraDeck) || !extraDeck.some((c) => c.id === 858)) return false;
            return ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`236:${ctx.owner}`);
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.id === 382);
            if (handIdx !== -1) {
                const [trapCard] = hand.splice(handIdx, 1);
                ctx.graveyard(ctx.owner).push(trapCard);
            } else {
                const stField = ctx.stField(ctx.owner);
                const stIdx = stField.findIndex((s) => s && s.card.id === 382);
                if (stIdx === -1) return;
                const trapCard = stField[stIdx].card;
                stField[stIdx] = null;
                ctx.graveyard(ctx.owner).push(trapCard);
            }
            const extraDeckKey = ctx.owner === 'player' ? 'playerExtraDeck' : 'botExtraDeck';
            const extraDeck = gameState[extraDeckKey];
            const edIdx = extraDeck.findIndex((c) => c.id === 858);
            if (edIdx === -1) return;
            const [fusionCard] = extraDeck.splice(edIdx, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            ctx.specialSummon(ctx.owner, fusionCard, slotIndex, 'attack', 'extradeck');
            ctx.log('🐉 Zanna di Critias Special Summona Drago della Forza dello Specchio!');
        }
    });

    // ================================================================
    // 855 — Paladino del Drago Oscuro / Paladin of Dark Dragon
    // Effetto Ignition dalla zona Mostro, una volta per turno: sacrifica
    // se stesso per Special Summonare 1 mostro "Occhi Rossi" (Red-Eyes)
    // dalla mano o dal Deck — priorità alla mano, poi il Livello più
    // alto nel Deck. Nessuna carta di questo database si chiama "Occhi
    // Rossi B. Chick" (l'unica esclusione del testo reale), quindi il
    // filtro sull'id non esclude nulla in pratica.
    // "A inizio Damage Step, se attacca un mostro in Posizione di
    // Difesa: distruggilo": def.alwaysDestroysDefensePositionTarget
    // (resolveBattleDamage, actions.js) — a differenza di
    // instantlyDestroysFaceDownDefender (id 398/718), qui il calcolo
    // danni si applica normalmente (l'attaccante subisce comunque il
    // rimbalzo se ATK < DEF), solo la distruzione è forzata.
    // ================================================================
    CardEffects.register(855, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        alwaysDestroysDefensePositionTarget: true,
        canActivate(ctx) {
            if (ctx.hasUsedOncePerTurn(`855:${ctx.card.uid}`)) return false;
            const inHand = ctx.hand(ctx.owner).some((c) => c.race === 'Drago' && c.name.includes('Occhi Rossi'));
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inDeck = Array.isArray(deck) && deck.some((c) => c.race === 'Drago' && c.name.includes('Occhi Rossi'));
            return inHand || inDeck;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`855:${ctx.card.uid}`);
            const ownIndex = ctx.index;
            ctx.field(ctx.owner)[ownIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.race === 'Drago' && c.name.includes('Occhi Rossi'));
            let redEyesCard;
            let fromZone;
            if (handIndex !== -1) {
                [redEyesCard] = hand.splice(handIndex, 1);
                fromZone = 'hand';
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = gameState[deckKey];
                let bestIndex = -1;
                let bestLevel = -1;
                deck.forEach((c, i) => {
                    if (c.race === 'Drago' && c.name.includes('Occhi Rossi') && (c.level || 0) > bestLevel) { bestLevel = c.level || 0; bestIndex = i; }
                });
                if (bestIndex === -1) return;
                [redEyesCard] = deck.splice(bestIndex, 1);
                gameState[countKey] = deck.length;
                fromZone = 'deck';
            }
            const emptySlot = ctx.findEmptyMonsterSlot(ctx.owner);
            const slotIndex = emptySlot !== -1 ? emptySlot : ownIndex;
            ctx.specialSummon(ctx.owner, redEyesCard, slotIndex, 'attack', fromZone);
            ctx.log(`🐉 Paladino del Drago Oscuro si sacrifica per Special Summonare ${redEyesCard.name}!`);
        }
    });

    // ================================================================
    // 856 — Cavaliere Mago Nero / Dark Magician Knight
    // Non può essere Evocato Normalmente/Set, Special Summonabile solo
    // tramite Titolo del Cavaliere (id 329 qui sotto). Quando Special
    // Summonato: distrugge 1 carta sul Terreno — bersaglio auto-
    // selezionato (il più forte scoperto dell'avversario, priorità agli
    // scoperti), stessa SEMPLIFICAZIONE di ogni altra selezione
    // automatica in questo file.
    // ================================================================
    CardEffects.register(856, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        onSpecialSummon(ctx) {
            const oppField = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let bestAtk = -1;
            oppField.forEach((slot, i) => {
                if (!slot) return;
                const a = slot.isFaceDown ? 0 : DuelEngine.getEffectiveAtk(slot.card);
                if (a >= bestAtk) { bestAtk = a; targetIndex = i; }
            });
            if (targetIndex !== -1) {
                const decl = ctx.declareTarget(ctx.opponent, targetIndex, { totalTargetCount: 1 });
                if (decl.allowed) {
                    const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                    if (targetSlot) {
                        const name = targetSlot.isFaceDown ? 'una carta coperta' : targetSlot.card.name;
                        ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
                        ctx.log(`⚔️ Cavaliere Mago Nero, appena Special Summonato, distrugge ${name}!`);
                    }
                }
                return;
            }
            const oppSt = ctx.stField(ctx.opponent);
            const stIndex = oppSt.findIndex((slot) => slot && !slot.isFaceDown);
            if (stIndex !== -1) {
                ctx.destroySpellTrap(ctx.opponent, stIndex);
                ctx.log(`⚔️ Cavaliere Mago Nero, appena Special Summonato, distrugge ${oppSt[stIndex].card.name}!`);
            }
        }
    });

    // 857 — Wall Shadow: non può essere Evocato Normalmente/Set, Special Summonabile solo tramite Labirinto Magico (id 364).
    CardEffects.register(857, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 329 — Titolo del Cavaliere / Knight's Title (Magia Normale)
    // Sacrifica 1 "Mago Nero" (id 2) scoperto; Special Summon 1
    // "Cavaliere Mago Nero" (id 856, aggiunta ora: la nota precedente la
    // dava per assente dal database, corretto qui) dalla mano, dal Deck
    // o dal Cimitero — stesso schema "prima mano, poi Deck, poi
    // Cimitero" già usato altrove in questo file (es. Dado di Evocazione
    // id 460).
    // ================================================================
    CardEffects.register(329, {
        canActivate(ctx) {
            const hasDarkMagician = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
            if (!hasDarkMagician) return false;
            const inHand = ctx.hand(ctx.owner).some((c) => c.id === 856);
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inDeck = Array.isArray(deck) && deck.some((c) => c.id === 856);
            const inGrave = ctx.graveyard(ctx.owner).some((c) => c.id === 856);
            return inHand || inDeck || inGrave;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const fieldIndex = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
            if (fieldIndex === -1) return;
            ctx.graveyard(ctx.owner).push(field[fieldIndex].card);
            field[fieldIndex] = null;

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.id === 856);
            let knightCard;
            let fromZone;
            if (handIndex !== -1) {
                [knightCard] = hand.splice(handIndex, 1);
                fromZone = 'hand';
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = gameState[deckKey];
                const deckIndex = Array.isArray(deck) ? deck.findIndex((c) => c.id === 856) : -1;
                if (deckIndex !== -1) {
                    [knightCard] = deck.splice(deckIndex, 1);
                    gameState[countKey] = deck.length;
                    fromZone = 'deck';
                } else {
                    const grave = ctx.graveyard(ctx.owner);
                    const graveIndex = grave.findIndex((c) => c.id === 856);
                    if (graveIndex === -1) return;
                    [knightCard] = grave.splice(graveIndex, 1);
                    fromZone = 'graveyard';
                }
            }
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(knightCard);
                ctx.log('⚠️ Il Terreno è pieno: Cavaliere Mago Nero finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, knightCard, slotIndex, 'attack', fromZone);
            ctx.log('⚔️ Titolo del Cavaliere Special Summona Cavaliere Mago Nero!');
        }
    });

    // ================================================================
    // 244 — Crepuscolo a Cinque Stelle / Five Star Twilight (Magia Normale)
    // Se l'unico mostro che controlli è di Livello 5: sacrificalo; Special
    // Summon i 5 "fratelli Kuriboh" (Kuriboh id 22 già presente, più
    // Kuribah/Kuribee/Kuriboo/Kuribeh id 859-862 aggiunte ora — la nota
    // precedente li dava per assenti dal database, corretto qui) da mano,
    // Deck e/o Cimitero.
    // SEMPLIFICAZIONE: manca "non possono essere sacrificati per
    // un'Evocazione Tributo" — richiederebbe un marcatore per-ISTANZA
    // (non per-carta: Kuriboh id 22 resta normalmente sacrificabile in
    // ogni altro contesto), diverso dal flag def.cannotBeTributed
    // esistente in questo motore (quello si applica a OGNI copia di una
    // carta, non solo a quelle evocate da questo specifico effetto).
    // ================================================================
    CardEffects.register(244, {
        canActivate(ctx) {
            const field = ctx.field(ctx.owner).filter((slot) => slot);
            if (field.length !== 1 || field[0].isFaceDown || field[0].card.level !== 5) return false;
            const kuribohIds = [22, 859, 860, 861, 862];
            const hand = ctx.hand(ctx.owner);
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'] || [];
            const grave = ctx.graveyard(ctx.owner);
            return kuribohIds.every((id) => hand.some((c) => c.id === id) || deck.some((c) => c.id === id) || grave.some((c) => c.id === id));
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const ownIndex = field.findIndex((slot) => slot);
            if (ownIndex === -1) return;
            ctx.graveyard(ctx.owner).push(field[ownIndex].card);
            field[ownIndex] = null;

            const kuribohIds = [22, 859, 860, 861, 862];
            const hand = ctx.hand(ctx.owner);
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            const grave = ctx.graveyard(ctx.owner);

            kuribohIds.forEach((id) => {
                let card;
                let fromZone;
                const handIndex = hand.findIndex((c) => c.id === id);
                if (handIndex !== -1) {
                    [card] = hand.splice(handIndex, 1);
                    fromZone = 'hand';
                } else {
                    const deckIndex = Array.isArray(deck) ? deck.findIndex((c) => c.id === id) : -1;
                    if (deckIndex !== -1) {
                        [card] = deck.splice(deckIndex, 1);
                        gameState[countKey] = deck.length;
                        fromZone = 'deck';
                    } else {
                        const graveIndex = grave.findIndex((c) => c.id === id);
                        if (graveIndex === -1) return;
                        [card] = grave.splice(graveIndex, 1);
                        fromZone = 'graveyard';
                    }
                }
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) { grave.push(card); return; }
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', fromZone);
                // CORREZIONE di fedeltà: "non possono essere sacrificati per
                // un'Evocazione Tributo" — per QUESTA istanza soltanto (un
                // Kuriboh normale resta sacrificabile in ogni altro
                // contesto), tramite gameState.cannotBeTributedUids
                // (per-uid, costruito per Controllo Mentale/id 130).
                gameState.cannotBeTributedUids = gameState.cannotBeTributedUids || new Set();
                gameState.cannotBeTributedUids.add(card.uid);
            });
            ctx.log('🐿️ Crepuscolo a Cinque Stelle Special Summona i 5 fratelli Kuriboh!');
        }
    });

    // ================================================================
    // 363 — Cappelli Magici / Magical Hats (Trappola Normale)
    // Durante la Battle Phase dell'avversario: sceglie 2 Magie/Trappole
    // dal proprio Deck e 1 proprio mostro già in campo, li mette (o
    // rimette) tutti coperti in Posizione di Difesa — le 2 pescate dal
    // Deck diventano temporaneamente Mostri Normali 0/0 (stesso principio
    // di mutazione diretta dell'istanza in campo già usato per Roccaforte
    // la Fortezza Mobile, id 849) — e vengono distrutte alla fine della
    // Battle Phase (gameState.pendingMagicalHatsDestroy, processato in
    // enterEndPhase()/game-flow.js: Cappelli Magici stessa è già finita
    // nel Cimitero, Trappola Normale non Continua, quindi non può
    // reagire da sola con un proprio onBattlePhaseEnd — stesso schema di
    // gameState.pendingUltimateTurnCheck per id 341).
    // SEMPLIFICAZIONE: nessuna vera "mescolata" delle 3 caselle (il
    // proprio mostro resta nella propria casella, le 2 carte pescate
    // vanno in caselle libere) — nel vero gioco la mescolata serve solo a
    // confondere un avversario UMANO su quale carta coperta sia quale
    // (bluff), stesso ragionamento già applicato a Ombre Mutevoli (id
    // 769): qui il contenuto delle carte coperte non è comunque mai
    // mostrato all'avversario, quindi non ha alcun equivalente
    // meccanico significativo da implementare oltre a quanto già fatto.
    // ================================================================
    CardEffects.register(363, {
        canActivate(ctx) {
            if (gameState.currentPlayer === ctx.owner) return false;
            if (gameState.phase !== 'battle') return false;
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const qualifyingDeckCards = Array.isArray(deck) ? deck.filter((c) => c.type === 'spell' || c.type === 'trap').length : 0;
            if (qualifyingDeckCards < 2) return false;
            const hasOwnMonster = ctx.field(ctx.owner).some((s) => s);
            const emptySlots = ctx.field(ctx.owner).filter((s) => !s).length;
            return hasOwnMonster && emptySlots >= 2;
        },
        activate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            const chosen = [];
            for (let i = deck.length - 1; i >= 0 && chosen.length < 2; i--) {
                if (deck[i].type === 'spell' || deck[i].type === 'trap') chosen.push(deck.splice(i, 1)[0]);
            }
            if (chosen.length < 2) {
                deck.push(...chosen);
                return;
            }
            gameState[countKey] = deck.length;

            const field = ctx.field(ctx.owner);
            const monsterIndex = field.findIndex((s) => s);
            if (monsterIndex === -1) {
                deck.push(...chosen);
                gameState[countKey] = deck.length;
                return;
            }
            field[monsterIndex].isFaceDown = true;
            field[monsterIndex].position = 'defense';

            const pendingDestroy = [];
            chosen.forEach((card) => {
                const slotIndex = field.findIndex((s) => !s);
                if (slotIndex === -1) {
                    ctx.graveyard(ctx.owner).push(card);
                    return;
                }
                card.type = 'monster';
                card.level = 1;
                card.attack = 0;
                card.defense = 0;
                field[slotIndex] = { card: card, position: 'defense', isFaceDown: true, hasAttacked: false, canChangePosition: false };
                pendingDestroy.push(card.uid);
            });
            gameState.pendingMagicalHatsDestroy = gameState.pendingMagicalHatsDestroy || {};
            gameState.pendingMagicalHatsDestroy[ctx.owner] = (gameState.pendingMagicalHatsDestroy[ctx.owner] || []).concat(pendingDestroy);
            ctx.log("🎩 Cappelli Magici mette coperti in Difesa 2 carte del Deck travestite da Mostri e il proprio mostro!");
        }
    });

    // ================================================================
    // 364 — Labirinto Magico / Magical Labyrinth (Magia Equipaggiamento)
    // Equipaggiabile solo a "Muro del Labirinto" (id 337). Puoi
    // sacrificare il mostro equipaggiato per Special Summonare "Wall
    // Shadow" (id 857, aggiunta ora — la nota precedente la dava per
    // assente dal database, corretto qui) dal Deck. def.repeatableWhileContinuous
    // (introdotto per Offerta Suprema id 559): la stessa activate()
    // gestisce sia la prima attivazione (aggancio a Muro del Labirinto,
    // come ogni altro Equip via findEquipTarget/attachEquip) sia il
    // sacrificio successivo — distinti da ctx.card.equippedToOwner (non
    // ancora impostato = prima attivazione).
    // ================================================================
    CardEffects.register(364, {
        continuous: true,
        isEquip: true,
        repeatableWhileContinuous: true,
        canActivate(ctx) {
            if (!ctx.card.equippedToOwner) return findEquipTarget(ctx, (c) => c.id === 337) !== -1;
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            return Array.isArray(deck) && deck.some((c) => c.id === 857) && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            if (!ctx.card.equippedToOwner) {
                const i = findEquipTarget(ctx, (c) => c.id === 337);
                if (i !== -1) attachEquip(ctx, i);
                return;
            }
            const target = equippedTarget(ctx);
            const targetOwner = ctx.card.equippedToOwner;
            const targetIndex = ctx.card.equippedToIndex;
            ctx.field(targetOwner)[targetIndex] = null;
            ctx.graveyard(targetOwner).push(target);
            ctx.stField(ctx.owner)[ctx.index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);

            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            const deckIndex = deck.findIndex((c) => c.id === 857);
            if (deckIndex === -1) return;
            const [wallShadow] = deck.splice(deckIndex, 1);
            gameState[countKey] = deck.length;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(wallShadow); return; }
            ctx.specialSummon(ctx.owner, wallShadow, slotIndex, 'attack', 'deck');
            ctx.log('🧱 Labirinto Magico sacrifica il mostro equipaggiato per Special Summonare Wall Shadow!');
        }
    });

    // ================================================================
    // EFFETTI COMPLETATI GRAZIE ALLE NUOVE CAPACITÀ DEL MOTORE (batch 1):
    // "prendi/dai il controllo" (ctx.takeControl, vedi ACTIONS.takeControl
    // in duel-engine.js), danno perforante (def.piercing, controllato in
    // resolveBattleDamage/actions.js), Flip Summon manuale che ora scatena
    // ON_FLIP (changeMonsterPosition/actions.js), Exodia nel Cimitero
    // (hasExodiaInGraveyard, game-flow.js) — più alcune carte che erano
    // segnate come bloccate ma in realtà erano già coperte da meccanismi
    // esistenti (buff continui via static()/gameState.atkDefBonus, buff
    // "fino a fine turno" via ctx.grantTemporaryAtkDefBonus, trigger
    // ricorrenti via onStandbyPhase/onEndPhase). Ogni missingEffectNote
    // corrispondente è stata rimossa da data/cards.json.
    // ================================================================

    // 147 — Cambio di Cuore / Change of Heart: prendi il controllo di 1
    // mostro scoperto avversario fino alla tua End Phase. Riferimento
    // canonico del meccanismo "prendi il controllo" per le altre carte
    // qui sotto.
    CardEffects.register(147, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const index = ctx.field(ctx.opponent).findIndex((s) => s && !s.isFaceDown);
            if (index === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, index, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const stolen = targetSlot.card;
            if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex)) {
                ctx.log(`💫 ${ctx.owner === 'player' ? 'Hai preso' : 'Il bot ha preso'} il controllo di ${stolen.name} fino alla End Phase!`);
            }
        }
    });

    // 205 — Doppia Presa Magica: sacrifica 2 mostri propri, poi prendi il
    // controllo di 2 mostri scoperti avversari fino alla tua End Phase.
    // SEMPLIFICAZIONE: bersagli auto-selezionati (i primi trovati, stesso
    // stile di selezione automatica già usato altrove in questo file).
    CardEffects.register(205, {
        canActivate(ctx) {
            const ownCount = ctx.field(ctx.owner).filter((s) => s).length;
            const oppTargets = ctx.field(ctx.opponent).filter((s) => s && !s.isFaceDown).length;
            return ownCount >= 2 && oppTargets >= 2;
        },
        activate(ctx) {
            let sacrificed = 0;
            ctx.field(ctx.owner).forEach((slot, index) => {
                if (sacrificed >= 2 || !slot) return;
                ctx.destroyMonster(ctx.owner, index);
                sacrificed++;
            });
            let taken = 0;
            for (let i = 0; i < ctx.field(ctx.opponent).length && taken < 2; i++) {
                const slot = ctx.field(ctx.opponent)[i];
                if (slot && !slot.isFaceDown) {
                    const decl = ctx.declareTarget(ctx.opponent, i, { totalTargetCount: 2 });
                    if (!decl.allowed) continue;
                    const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                    if (!targetSlot) continue;
                    const name = targetSlot.card.name;
                    if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex)) {
                        ctx.log(`💫 Preso il controllo di ${name}!`);
                        taken++;
                    }
                }
            }
        }
    });

    // 226 — Controllore del Nemico: cambia Posizione a 1 mostro scoperto
    // avversario, OPPURE sacrifica 1 mostro proprio per prenderne il
    // controllo. SEMPLIFICAZIONE: nessuna scelta a due vie nella UI di
    // questo motore — se può sacrificare un proprio mostro lo fa (l'opzione
    // più forte), altrimenti si limita a cambiare Posizione.
    CardEffects.register(226, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const oppIndex = ctx.field(ctx.opponent).findIndex((s) => s && !s.isFaceDown);
            if (oppIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, oppIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const ownIndex = ctx.field(ctx.owner).findIndex((s) => s);
            if (ownIndex !== -1) {
                const target = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!target) return;
                const name = target.card.name;
                ctx.destroyMonster(ctx.owner, ownIndex);
                if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex)) {
                    ctx.log(`💫 Preso il controllo di ${name}!`);
                }
            } else {
                const target = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!target) return;
                const newPosition = target.position === 'attack' ? 'defense' : 'attack';
                ctx.changePosition(decl.targetOwner, decl.targetIndex, newPosition);
                ctx.log(`🔄 ${target.card.name} cambia Posizione!`);
            }
        }
    });

    // 388 — Scatola Mistica: distruggi 1 mostro avversario, poi dai il
    // controllo di 1 tuo mostro all'avversario fino alla SUA End Phase
    // (percorso "inverso" di ctx.takeControl rispetto alle altre carte qui
    // sopra — stesso identico helper, owner/fromOwner invertiti). La
    // distruzione è un vero targeting in stile Yu-Gi-Oh (sceglie 1 mostro
    // specifico), quindi passa da ctx.declareTarget(...) — vedi
    // declareCardEffectTarget in duel-engine.js — così Signore dei D. (id
    // 353, protegge i Draghi), Gran Scudo Gardna (id 115, l'unica carta
    // coperta) e Specchietto della Fata (id 235, ridirige) possono
    // davvero reagire a QUESTA carta, non solo in test sintetici isolati.
    CardEffects.register(388, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s) && ctx.field(ctx.owner).some((s) => s);
        },
        activate(ctx) {
            const oppIndex = ctx.field(ctx.opponent).findIndex((s) => s);
            if (oppIndex !== -1) {
                const decl = ctx.declareTarget(ctx.opponent, oppIndex, { totalTargetCount: 1 });
                if (decl.allowed) ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            }
            const ownIndex = ctx.field(ctx.owner).findIndex((s) => s);
            if (ownIndex !== -1) {
                const name = ctx.field(ctx.owner)[ownIndex].card.name;
                if (ctx.takeControl(ctx.opponent, ctx.owner, ownIndex)) {
                    ctx.log(`⚠️ ${name} passa sotto il controllo dell'avversario!`);
                }
            }
        }
    });

    // 405 — Anima Oscura Posseduta: effetto Ignition (sacrifica questa
    // carta scoperta; prendi il controllo di tutti i mostri scoperti di
    // Livello 3 o inferiore dell'avversario).
    CardEffects.register(405, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown && s.card.level <= 3);
        },
        activate(ctx) {
            ctx.destroyMonster(ctx.owner, ctx.index);
            const targets = [];
            ctx.field(ctx.opponent).forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.level <= 3) targets.push(i);
            });
            targets.forEach((i) => {
                const slot = ctx.field(ctx.opponent)[i];
                if (slot) {
                    const name = slot.card.name;
                    if (ctx.takeControl(ctx.owner, ctx.opponent, i)) ctx.log(`💫 Preso il controllo di ${name}!`);
                }
            });
        }
    });

    // ================================================================
    // 406 — Pumpking il Re dei Fantasmi / Pumpking the King of Ghosts
    // Guadagna 100 ATK/DEF finché "Castello delle Illusioni Oscure" (id
    // 142, già presente — CORREZIONE: la nota precedente affermava
    // erroneamente che "Castle of Dark Illusions" non fosse presente in
    // questo database) è sul Terreno. Inoltre, durante la propria
    // Standby Phase mentre Castello resta scoperto: +100 ATK/DEF
    // ulteriori, fino a un massimo di 4 volte (card.pumpkingStacks).
    // ================================================================
    CardEffects.register(406, {
        static(ctx) {
            const castleOnField = ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 142));
            if (!castleOnField) return;
            const stacks = Math.min(ctx.card.pumpkingStacks || 0, 4);
            const bonus = 100 + stacks * 100;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + bonus, def: e.def + bonus };
        },
        onStandbyPhase(ctx) {
            const castleOnField = ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 142));
            if (!castleOnField) return;
            if ((ctx.card.pumpkingStacks || 0) >= 4) return;
            ctx.card.pumpkingStacks = (ctx.card.pumpkingStacks || 0) + 1;
            ctx.log(`👻 Pumpking il Re dei Fantasmi guadagna altri 100 ATK/DEF grazie a Castello delle Illusioni Oscure (${ctx.card.pumpkingStacks}/4)!`);
        }
    });

    // 82 — Parshath il Cavaliere Alato: danno perforante contro mostri in
    // Posizione di Difesa (vedi def.piercing, controllato in
    // resolveBattleDamage/actions.js). SEMPLIFICAZIONE: manca "quando
    // infligge danno da battaglia: pesca 1 carta" (richiederebbe un
    // aggancio dedicato sul danno da battaglia, non presente in questo
    // motore — fuori dallo scopo di questo batch).
    CardEffects.register(82, { piercing: true });

    // 360 — Bestia Spada Impazzita: danno perforante contro mostri in
    // Posizione di Difesa.
    CardEffects.register(360, { piercing: true });

    // 454 — Drago Lancia: danno perforante contro mostri in Posizione di
    // Difesa. SEMPLIFICAZIONE: manca "si gira in Posizione di Difesa alla
    // fine del Damage Step se attacca" (nessun aggancio a fine Damage
    // Step in questo motore — fuori dallo scopo di questo batch).
    CardEffects.register(454, { piercing: true });

    // 125 — Cinghiale Soldato: -1000 ATK continuo se l'avversario
    // controlla almeno un mostro. SEMPLIFICAZIONE: manca "evocabile SOLO
    // tramite Flip Summon, altrimenti distrutta" (il motore non ha un
    // aggancio per vietare l'Evocazione Normale di una carta specifica —
    // fuori dallo scopo di questo batch: qui si può Evocare Normalmente
    // senza penalità).
    CardEffects.register(125, {
        static(ctx) {
            if (!ctx.field(ctx.opponent).some((s) => s)) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk - 1000, def: e.def };
        }
    });

    // 315 — Bomba a Tempo: durante la tua Standby Phase, sacrifica questa
    // carta e distruggi tutti gli altri tuoi mostri, infliggendo danno
    // pari a metà del loro ATK totale (esclusa questa carta) — usa
    // onStandbyPhase (firePhaseTrigger già lo scatena solo nella TUA
    // Standby Phase, esattamente "durante la tua Standby Phase" del testo
    // reale, senza bisogno di tracciare separatamente "è stata Flip
    // Summonata": può essere scoperta sul Terreno solo dopo esserlo stata).
    CardEffects.register(315, {
        onStandbyPhase(ctx) {
            const ownField = ctx.field(ctx.owner);
            let totalAtk = 0;
            ownField.forEach((slot, i) => {
                if (slot && i !== ctx.slotIndex) {
                    totalAtk += DuelEngine.getEffectiveAtk(slot.card);
                    ctx.destroyMonster(ctx.owner, i);
                }
            });
            ctx.destroyMonster(ctx.owner, ctx.slotIndex);
            const damage = Math.floor(totalAtk / 2);
            ctx.dealDamage(ctx.opponent, damage);
            ctx.log(`💣 Bomba a Tempo esplode, infliggendo ${damage} danni!`);
        }
    });

    // 161 — Patto con Exodia: richiede tutti e 5 i pezzi di Exodia nel
    // Cimitero (vedi hasExodiaInGraveyard in game-flow.js); Special Summon
    // di "Exodia Necross" (id 230) dalla mano.
    CardEffects.register(161, {
        canActivate(ctx) {
            return typeof hasExodiaInGraveyard === 'function' && hasExodiaInGraveyard(ctx.owner) && ctx.hand(ctx.owner).some((c) => c.id === 230);
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const idx = hand.findIndex((c) => c.id === 230);
            if (idx === -1) return;
            const [necross] = hand.splice(idx, 1);
            const slotIndex = ctx.field(ctx.owner).findIndex((s) => s === null);
            if (slotIndex === -1) {
                ctx.log('❌ Il Terreno è pieno: impossibile Special Summonare Exodia Necross.');
                hand.push(necross); // torna in mano, il costo non è stato pagabile
                return;
            }
            ctx.specialSummon(ctx.owner, necross, slotIndex, 'attack');
        }
    });

    // ================================================================
    // 230 — Exodia Necross
    // Non può essere Special Summonato in nessun altro modo oltre a
    // Patto con Exodia (id 161, qui sopra — cannotBeSpecialSummoned).
    // Non può essere distrutta in battaglia (cannotBeDestroyedByBattle,
    // resolveBattleDamage/actions.js) né dall'effetto di una Magia/
    // Trappola (cannotBeDestroyedByCardEffect, nuovo flag centralizzato
    // in ACTIONS.destroyMonster, duel-engine.js). Una volta per turno,
    // durante la propria Standby Phase: +500 ATK permanente.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunta la clausola di mantenimento
    // mancante ("distrutta a meno che tutti e 5 i pezzi di Exodia siano
    // nel Cimitero") — controllata nella propria Standby Phase (stesso
    // hook già esistente per il bonus ATK), usando hasExodiaInGraveyard
    // già presente in game-flow.js (usata anche da Patto con Exodia, id
    // 161). Il testo reale della carta è ESSO STESSO "una volta a turno,
    // durante la tua Standby Phase" (non un controllo continuo) — vedi
    // l'effetto in cards.json, verificato su YGOPRODeck.
    CardEffects.register(230, {
        cannotBeSpecialSummoned: true,
        cannotBeDestroyedByBattle: true,
        cannotBeDestroyedByCardEffect: true,
        static(ctx) {
            const bonus = (ctx.card.necrossStacks || 0) * 500;
            if (bonus === 0) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + bonus, def: e.def };
        },
        onStandbyPhase(ctx) {
            if (typeof hasExodiaInGraveyard === 'function' && !hasExodiaInGraveyard(ctx.owner)) {
                // Manda al Cimitero DIRETTAMENTE (non tramite
                // ctx.destroyMonster): questa carta ha
                // cannotBeDestroyedByCardEffect: true, che la
                // proteggerebbe anche da questo suo stesso vincolo di
                // mantenimento — quel flag protegge dagli effetti
                // AVVERSARI, non da questa regola intrinseca della carta.
                const field = ctx.field(ctx.owner);
                const index = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
                if (index !== -1) {
                    ctx.log("💀 Exodia Necross viene distrutta: non tutti i pezzi di Exodia sono nel Cimitero!");
                    ctx.graveyard(ctx.owner).push(ctx.card);
                    field[index] = null;
                }
                return;
            }
            ctx.card.necrossStacks = (ctx.card.necrossStacks || 0) + 1;
            ctx.log(`💀 Exodia Necross guadagna 500 ATK permanenti (${ctx.card.necrossStacks} volte)!`);
        }
    });

    // 421 — Riryoku: dimezza l'ATK di 1 mostro scoperto e trasferisce
    // quella quantità a un altro, fino a fine turno (ctx.grantTemporaryAtkDefBonus,
    // già esistente in duel-engine.js). SEMPLIFICAZIONE: bersagli
    // auto-selezionati (i primi due mostri scoperti trovati).
    CardEffects.register(421, {
        canActivate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((o) => { ctx.field(o).forEach((s) => { if (s && !s.isFaceDown) count++; }); });
            return count >= 2;
        },
        activate(ctx) {
            const targets = [];
            ['player', 'bot'].forEach((o) => {
                ctx.field(o).forEach((slot) => {
                    if (slot && !slot.isFaceDown) targets.push(slot);
                });
            });
            if (targets.length < 2) return;
            const [from, to] = targets;
            const half = Math.floor(DuelEngine.getEffectiveAtk(from.card) / 2);
            ctx.grantTemporaryAtkDefBonus(from.card, -half, 0, false);
            ctx.grantTemporaryAtkDefBonus(to.card, half, 0, false);
            ctx.log(`🔄 Riryoku sposta ${half} ATK da ${from.card.name} a ${to.card.name}!`);
        }
    });

    // 439 — Incantesimo Ombra: -700 ATK continuo a 1 mostro scoperto
    // avversario preso di mira all'attivazione, che inoltre non può
    // attaccare né cambiare Posizione (gameState.cannotAttackUids/
    // cannotChangePositionUids, vedi duel-engine.js/engine/actions.js) finché
    // questa carta resta scoperta sul Terreno. Si autodistrugge se il
    // bersaglio non è più valido (stessa logica già usata per le Carte
    // Equipaggiamento in recomputeStaticEffects, riscritta qui perché
    // questa NON è una Carta Equipaggiamento/isEquip).
    CardEffects.register(439, {
        continuous: true,
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const index = ctx.field(ctx.opponent).findIndex((s) => s && !s.isFaceDown);
            if (index === -1) return;
            const target = ctx.field(ctx.opponent)[index].card;
            ctx.card.targetOwner = ctx.opponent;
            ctx.card.targetIndex = index;
            ctx.card.targetUid = target.uid;
            ctx.log(`👻 Incantesimo Ombra lega ${target.name}!`);
        },
        static(ctx) {
            const targetSlot = ctx.card.targetOwner != null ? ctx.field(ctx.card.targetOwner)[ctx.card.targetIndex] : null;
            const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === ctx.card.targetUid;
            if (!validTarget) {
                ctx.stField(ctx.owner)[ctx.index] = null;
                ctx.graveyard(ctx.owner).push(ctx.card);
                return;
            }
            const e = gameState.atkDefBonus[targetSlot.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[targetSlot.card.uid] = { atk: e.atk - 700, def: e.def };
            gameState.cannotAttackUids[targetSlot.card.uid] = true;
            gameState.cannotChangePositionUids[targetSlot.card.uid] = true;
        }
    });

    // 445 — Dado Teschio: lancia un dado, tutti i mostri avversari perdono
    // ATK/DEF pari al risultato x100 fino a fine turno (ctx.grantTemporaryAtkDefBonus).
    CardEffects.register(445, {
        hasDiceRollEffect: true,
        activate(ctx) {
            const roll = 1 + Math.floor(Math.random() * 6);
            const amount = roll * 100;
            if (window.FX) FX.playDiceRoll(roll);
            ctx.log(`🎲 Dado Teschio: hai lanciato un ${roll}!`);
            ctx.field(ctx.opponent).forEach((slot) => {
                if (slot) ctx.grantTemporaryAtkDefBonus(slot.card, -amount, -amount, false);
            });
        }
    });

    // 133 — Terra in Fiamme: distrugge le Magie Campo sul Terreno
    // all'attivazione, poi 500 danni ricorrenti (onStandbyPhase, già
    // esistente in duel-engine.js/firePhaseTrigger). SEMPLIFICAZIONE: il
    // danno scatta solo nella TUA Standby Phase (il motore scatena i
    // trigger di fase solo per il giocatore di turno sulle proprie carte)
    // — nella regola vera scatterebbe nella Standby Phase di ENTRAMBI.
    CardEffects.register(133, {
        continuous: true,
        activate(ctx) {
            ['player', 'bot'].forEach((o) => {
                const fs = o === 'player' ? gameState.playerFieldSpell : gameState.botFieldSpell;
                if (fs) {
                    ctx.graveyard(o).push(fs.card);
                    if (o === 'player') gameState.playerFieldSpell = null; else gameState.botFieldSpell = null;
                    ctx.log(`🔥 Terra in Fiamme distrugge ${fs.card.name}!`);
                }
            });
        },
        onStandbyPhase(ctx) {
            ctx.dealDamage(ctx.owner, 500);
            ctx.log('🔥 Terra in Fiamme infligge 500 danni!');
        }
    });

    // 221 — Ectoplasmatore: ogni tua End Phase, sacrifica 1 mostro
    // scoperto e infliggi all'avversario danno pari a metà del suo ATK
    // originale (onEndPhase, già esistente). Stessa SEMPLIFICAZIONE di id
    // 133 qui sopra (solo la TUA End Phase, non anche quella avversaria).
    CardEffects.register(221, {
        continuous: true,
        onEndPhase(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((s) => s && !s.isFaceDown);
            if (index === -1) return;
            const sacrificed = field[index].card;
            const halfAtk = Math.floor(sacrificed.attack / 2);
            ctx.destroyMonster(ctx.owner, index);
            ctx.dealDamage(ctx.opponent, halfAtk);
            ctx.log(`💀 Ectoplasmatore sacrifica ${sacrificed.name} e infligge ${halfAtk} danni!`);
        }
    });

    // ================================================================
    // BATCH 2: carte FLIP + lancio di dado, tutte costruite su meccanismi
    // già esistenti (onFlip scatenato anche da un Flip Summon manuale —
    // vedi changeMonsterPosition/actions.js — gameState.cannotAttackUids,
    // ctx.grantTemporaryAtkDefBonus): nessuna nuova capacità del motore.
    // ================================================================

    // 194 — Illusionista dagli Occhi Oscuri: FLIP, blocca l'attacco di 1
    // mostro bersaglio finché questa carta resta scoperta (gameState.cannotAttackUids,
    // ricalcolato ad ogni render in static() finché Illusionista è scoperta).
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (priorità al Terreno avversario).
    CardEffects.register(194, {
        onFlip(ctx) {
            const candidates = [];
            ctx.field(ctx.opponent).forEach((s, i) => { if (s && !s.isFaceDown) candidates.push(s); });
            ctx.field(ctx.owner).forEach((s, i) => { if (s && !s.isFaceDown && s.card.uid !== ctx.card.uid) candidates.push(s); });
            if (candidates.length === 0) return;
            ctx.card.lockedTargetUid = candidates[0].card.uid;
            ctx.log(`👁️ Illusionista dagli Occhi Oscuri blocca ${candidates[0].card.name}!`);
        },
        static(ctx) {
            if (ctx.card.lockedTargetUid === undefined) return;
            gameState.cannotAttackUids[ctx.card.lockedTargetUid] = true;
        }
    });

    // 209 — Suonatore di Draghi: FLIP, distruggi tutti i "Vaso
    // Cattura-Drago" (id 206) scoperti; se ne distruggi almeno uno, gira
    // in Attacco tutti i mostri Tipo Drago scoperti.
    CardEffects.register(209, {
        onFlip(ctx) {
            let destroyedAny = false;
            ['player', 'bot'].forEach((o) => {
                ctx.stField(o).forEach((slot, i) => {
                    if (slot && !slot.isFaceDown && slot.card.id === 206) {
                        ctx.graveyard(o).push(slot.card);
                        ctx.stField(o)[i] = null;
                        destroyedAny = true;
                    }
                });
            });
            if (!destroyedAny) return;
            ['player', 'bot'].forEach((o) => {
                ctx.field(o).forEach((slot, i) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Drago') ctx.changePosition(o, i, 'attack');
                });
            });
            ctx.log('🎵 Suonatore di Draghi distrugge tutti i Vaso Cattura-Drago e gira i Draghi in Attacco!');
        }
    });

    // 242 — Stregone di Fuoco: FLIP, scarta a caso fino a 2 carte dalla
    // mano e infliggi 800 danni.
    // CORREZIONE di fedeltà: le 2 carte vanno BANDITE, non scartate al Cimitero.
    CardEffects.register(242, {
        onFlip(ctx) {
            const hand = ctx.hand(ctx.owner);
            const discardCount = Math.min(2, hand.length);
            for (let i = 0; i < discardCount; i++) {
                const randIndex = Math.floor(Math.random() * hand.length);
                const [banished] = hand.splice(randIndex, 1);
                ctx.banish(ctx.owner, banished);
            }
            ctx.dealDamage(ctx.opponent, 800);
            ctx.log(`🔥 Stregone di Fuoco bandisce ${discardCount} carte a caso e infligge 800 danni!`);
        }
    });

    // 410 — Mietitore delle Carte: FLIP, distruggi 1 Trappola sul
    // Terreno avversario. SEMPLIFICAZIONE: il motore conosce sempre il
    // vero tipo di una carta Set (nessuna informazione nascosta reale),
    // quindi sceglie direttamente una Trappola vera — la clausola
    // "guardala prima, risparmiala se è una Magia" del testo reale
    // (pensata per un gioco a informazione nascosta) non si applica qui.
    CardEffects.register(410, {
        onFlip(ctx) {
            const stField = ctx.stField(ctx.opponent);
            const index = stField.findIndex((s) => s && s.card.type === 'trap');
            if (index === -1) return;
            const destroyed = stField[index].card;
            ctx.graveyard(ctx.opponent).push(destroyed);
            stField[index] = null;
            ctx.log(`✂️ Mietitore delle Carte distrugge ${destroyed.name}!`);
        }
    });

    // 273 — Dado Aggraziato: lancia un dado, i propri mostri guadagnano
    // ATK/DEF pari al risultato x100 fino a fine turno (ctx.grantTemporaryAtkDefBonus,
    // già esistente in duel-engine.js) — mirror di Dado Teschio (id 445)
    // qui sopra, sul proprio campo invece che su quello avversario.
    CardEffects.register(273, {
        hasDiceRollEffect: true,
        activate(ctx) {
            const roll = 1 + Math.floor(Math.random() * 6);
            const amount = roll * 100;
            if (window.FX) FX.playDiceRoll(roll);
            ctx.log(`🎲 Dado Aggraziato: hai lanciato un ${roll}!`);
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot) ctx.grantTemporaryAtkDefBonus(slot.card, amount, amount, false);
            });
        }
    });

    // ================================================================
    // BATCH 3: Token (ACTIONS.createTokens) e ricerca nel Deck
    // (ACTIONS.searchDeckToHand), entrambe nuove in duel-engine.js — vedi
    // i commenti lì per i limiti (Token: nessuna restrizione-Tributo
    // applicata; ricerca: non trova nulla nel Duello Demo, che pesca da
    // un pool casuale invece che da un vero Deck).
    // ================================================================

    // 434 — Capro Espiatorio: Special Summon 4 Token "Pecora" (Bestia/
    // TERRA/Liv.1/0-0) in Difesa. SEMPLIFICAZIONE: manca il divieto di
    // Evocare altri mostri nel resto del turno (nessun aggancio per una
    // restrizione "niente altre Evocazioni fino a fine turno" nel motore).
    CardEffects.register(434, {
        activate(ctx) {
            const created = ctx.createTokens(ctx.owner, 4, { name: 'Token Pecora', race: 'Bestia', attribute: 'TERRA', level: 1, attack: 0, defense: 0 });
            ctx.log(`🐑 Capro Espiatorio evoca ${created} Token Pecora!`);
        }
    });

    // 386 — Moltiplicazione: sacrifica 1 Kuriboh (id 22) scoperto, poi
    // Special Summon quanti più Token "Kuriboh" (Demone/OSCURITÀ/Liv.1/
    // 300-200) possibile negli slot liberati/rimasti.
    CardEffects.register(386, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.id === 22);
        },
        activate(ctx) {
            const index = ctx.field(ctx.owner).findIndex((s) => s && !s.isFaceDown && s.card.id === 22);
            if (index === -1) return;
            ctx.destroyMonster(ctx.owner, index);
            const emptySlots = ctx.field(ctx.owner).filter((s) => s === null).length;
            const created = ctx.createTokens(ctx.owner, emptySlots, { name: 'Token Kuriboh', race: 'Demone', attribute: 'OSCURITÀ', level: 1, attack: 300, defense: 200 });
            ctx.log(`👾 Moltiplicazione evoca ${created} Token Kuriboh!`);
        }
    });

    // 154 — Clonazione: quando l'avversario Evoca Normalmente o tramite
    // Flip Summon un mostro con un Livello, Special Summon 1 Token con le
    // sue stesse statistiche (onOpponentSummon, stesso meccanismo di
    // risposta di Buco Trappola/id 40). SEMPLIFICAZIONE: manca "se il
    // mostro bersaglio viene distrutto, distruggi anche il Token" (nessun
    // aggancio "collega la sorte di due carte" nel motore).
    CardEffects.register(154, {
        canActivate(ctx) {
            return typeof ctx.summonedCard.level === 'number';
        },
        onOpponentSummon(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const template = { name: ctx.summonedCard.name, race: ctx.summonedCard.race, attribute: ctx.summonedCard.attribute, level: ctx.summonedCard.level, attack: ctx.summonedCard.attack, defense: ctx.summonedCard.defense };
            ctx.createTokens(ctx.owner, 1, template);
            ctx.log(`🎭 Clonazione crea un Token copia di ${ctx.summonedCard.name}!`);
        }
    });

    // 537 — Thunder Dragon: attivabile dalla mano scartando questa carta
    // (già gestito da activateCard() in duel-engine.js prima di chiamare
    // activate() qui sotto); cerca fino a 2 copie di se stessa nel Deck
    // (ACTIONS.searchDeckToHand). Vedi anche promptHandMonsterActivation
    // in js/engine/actions.js: nuovo aggancio UI per attivare un mostro dalla
    // mano senza che sia uno Special Summon.
    CardEffects.register(537, {
        activate(ctx) {
            ctx.searchDeckToHand(ctx.owner, (c) => c.id === 537, 2);
        }
    });

    // 533 — Berfomet: quando Evocata Normalmente o Special Summonata,
    // aggiungi 1 "Gazelle, Re delle Bestie Mitiche" (id 532) dal Deck
    // alla mano (ACTIONS.searchDeckToHand).
    // CORREZIONE di fedeltà: il vero Berfomet cerca solo su Evocazione
    // Normale o Flip, MAI su Special Summon (rimosso onSpecialSummon).
    CardEffects.register(533, {
        onSummon(ctx) { ctx.searchDeckToHand(ctx.owner, (c) => c.id === 532, 1); }
    });

    // ================================================================
    // BATCH 4: negazione Magie estesa a tutte le zone, reazione "quando
    // guadagni Life Points" (ACTIONS.dealDamage), reindirizzamento di un
    // attacco (declareCtx.redirectAttack in js/engine/actions.js) — vedi i
    // commenti nei rispettivi punti di duel-engine.js/engine/actions.js.
    // ================================================================

    // 455 — Cancellatore di Magie: nega tutte le Magie sul Terreno, di
    // entrambi i giocatori (canActivate ora controlla areSpellsNegatedFor
    // per QUALUNQUE zona, non solo le Magie Set — vedi il fix in
    // duel-engine.js/canActivate).
    CardEffects.register(455, {
        static(ctx) {
            gameState.spellsNegatedFor.player = true;
            gameState.spellsNegatedFor.bot = true;
        }
    });

    // 241 — Principessa di Fuoco: ogni volta che guadagni Life Points,
    // infliggi 500 danni all'avversario (onGainLifePoints, vedi
    // ACTIONS.dealDamage in duel-engine.js).
    CardEffects.register(241, {
        onGainLifePoints(ctx) {
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log('🔥 Principessa di Fuoco infligge 500 danni per il guadagno di Life Points!');
        }
    });

    // 214 — Spiritello dei Sogni: se attaccata, ridirige l'attacco a un
    // altro proprio mostro (declareCtx.redirectAttack, nuovo in
    // actions.js/resolveAttack — stesso identico meccanismo di risposta
    // di Muro d'Illusione/id 54, il mostro bersaglio dell'attacco può
    // rispondere con un proprio onAttackDeclare). SEMPLIFICAZIONE:
    // bersaglio alternativo auto-selezionato (il primo altro proprio
    // mostro scoperto trovato), non una vera scelta del giocatore.
    CardEffects.register(214, {
        onAttackDeclare(ctx) {
            const field = ctx.field(ctx.owner);
            const newIndex = field.findIndex((s, i) => s && i !== ctx.targetIndex);
            if (newIndex === -1) return;
            ctx.redirectAttack(newIndex);
            ctx.log(`🌙 Spiritello dei Sogni ridirige l'attacco verso ${field[newIndex].card.name}!`);
        }
    });

    // 469 — Il Sigillo di Orichalcos: +500 ATK continuo a tutti i propri
    // mostri (stesso schema delle Carte Equipaggiamento/mostri con buff
    // continuo già visti, applicato qui a tutto il campo invece che a un
    // solo bersaglio). SEMPLIFICAZIONE: manca tutto il resto (immunità
    // una volta a turno, protezione dal bersaglio ATK più basso,
    // distruzione dei propri mostri Special Summonati all'attivazione,
    // blocco Special Summon dall'Extra Deck, "una sola volta per Duello")
    // — floodgate multi-effetto troppo esteso per questo batch.
    CardEffects.register(469, {
        static(ctx) {
            ctx.field(ctx.owner).forEach((slot) => {
                if (!slot || slot.isFaceDown) return;
                const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 500, def: e.def };
            });
        }
    });

    // ================================================================
    // BATCH 5: ON_POSITION_CHANGE su un effetto-carta reattivo (già
    // esistente, mai collegato prima), divieto d'attacco per Tipo mostro
    // (gameState.cannotAttackUids, batch 1), nuova reazione
    // onOwnMonsterDestroyed (vedi ON_DESTROY in duel-engine.js), danno
    // perforante esteso a un intero Tipo (gameState.piercingRacesFor),
    // danno estra "quando questa carta distrugge in battaglia"
    // (def.damageOnBattleDestroy, vedi resolveBattleDamage/actions.js).
    // ================================================================

    // ================================================================
    // 162 — Copione / Copycat
    // Se questa carta viene Evocata (Normale o Special — nessun
    // onSpecialSummon separato: il dispatcher in duel-engine.js ricade da
    // solo su onSummon quando onSpecialSummon non è definito, vedi il
    // commento lì su TRIGGER.ON_NORMAL_SUMMON/ON_SPECIAL_SUMMON): scegli 1
    // mostro scoperto dell'avversario; l'ATK/DEF di questa carta diventano
    // pari all'ATK/DEF ORIGINALI di quel bersaglio (scatto una tantum, non
    // un legame continuo — un cambiamento successivo dell'ATK/DEF del
    // bersaglio non si riflette più su Copione).
    // CORREZIONE rispetto alla nota precedente: "mutare le statistiche di
    // una carta condivisa" non è un rischio reale in questo motore — ogni
    // copia in campo è già un oggetto proprio (vedi il pattern {...carta,
    // uid: ...} usato ovunque per pescare/evocare), non un riferimento
    // condiviso a cardDatabase: la stessa identica tecnica di mutazione
    // diretta è già usata e verificata per Zombyra l'Oscuro (id 625,
    // atkLossOnBattleDestroy) senza intaccare le altre copie della carta.
    // ================================================================
    CardEffects.register(162, {
        onSummon(ctx) {
            const candidates = [];
            ctx.field(ctx.opponent).forEach((slot) => { if (slot && !slot.isFaceDown) candidates.push(slot.card); });
            if (candidates.length === 0) return;
            const applyCopy = (target) => {
                ctx.summonedCard.attack = target.attack;
                ctx.summonedCard.defense = target.defense;
                ctx.log(`🎭 Copione copia ATK/DEF di ${target.name}: diventa ${target.attack}/${target.defense}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                applyCopy(candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '🎭 Copione',
                text: 'Scegli il mostro scoperto dell\'avversario da copiare (ATK/DEF originali).',
                onSelect: (card) => applyCopy(card)
            });
        }
    });

    // 163 — Pagliaccio Insolente: se passa da Difesa ad Attacco, rimanda
    // in mano 1 mostro dell'avversario (onPositionChange, già esistente
    // — vedi ACTIONS.changePosition in duel-engine.js). SEMPLIFICAZIONE:
    // bersaglio auto-selezionato.
    CardEffects.register(163, {
        onPositionChange(ctx) {
            if (ctx.fromPosition !== 'defense' || ctx.toPosition !== 'attack') return;
            const oppField = ctx.field(ctx.opponent);
            const index = oppField.findIndex((s) => s);
            if (index === -1) return;
            const bounced = oppField[index].card;
            oppField[index] = null;
            ctx.hand(ctx.opponent).push(bounced);
            ctx.log(`🤡 Pagliaccio Insolente rimanda in mano ${bounced.name}!`);
        }
    });

    // 310 — Barriera d'Insetti: i mostri Tipo Insetto dell'avversario non
    // possono dichiarare un attacco (gameState.cannotAttackUids, stesso
    // meccanismo di Incantesimo Ombra/id 439, qui applicato a un intero
    // Tipo invece che a un solo bersaglio).
    CardEffects.register(310, {
        continuous: true,
        static(ctx) {
            ctx.field(ctx.opponent).forEach((slot) => {
                if (slot && !slot.isFaceDown && slot.card.race === 'Insetto') gameState.cannotAttackUids[slot.card.uid] = true;
            });
        }
    });

    // 380 — Michizure: quando un mostro viene mandato dal Terreno al tuo
    // Cimitero, distruggi 1 mostro sul Terreno (onOwnMonsterDestroyed,
    // nuovo in duel-engine.js/ON_DESTROY). SEMPLIFICAZIONE: bersaglio
    // auto-selezionato (priorità al Terreno avversario).
    CardEffects.register(380, {
        canActivate(ctx) {
            return ctx.field('player').some((s) => s) || ctx.field('bot').some((s) => s);
        },
        onOwnMonsterDestroyed(ctx) {
            let targetOwner = null;
            let targetIndex = -1;
            [ctx.opponent, ctx.owner].forEach((o) => {
                if (targetIndex !== -1) return;
                const i = ctx.field(o).findIndex((s) => s);
                if (i !== -1) { targetOwner = o; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const decl = ctx.declareTarget(targetOwner, targetIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const destroyedSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!destroyedSlot) return;
            const destroyed = destroyedSlot.card;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`💀 Michizure distrugge ${destroyed.name}!`);
        }
    });

    // 212 — Furia del Drago: i propri mostri Tipo Drago infliggono danno
    // perforante (gameState.piercingRacesFor, vedi resolveBattleDamage/
    // actions.js).
    CardEffects.register(212, {
        continuous: true,
        static(ctx) {
            gameState.piercingRacesFor[ctx.owner].add('Drago');
        }
    });

    // 526 — Skull Servant: 500 danni quando distrugge un mostro in
    // battaglia (def.damageOnBattleDestroy, controllato in
    // resolveBattleDamage/actions.js — solo un flag, nessuna funzione
    // necessaria, stesso stile di rejectsEquip/id 16).
    CardEffects.register(526, {
        damageOnBattleDestroy: 500
    });

    // ================================================================
    // BATCH 6: secondo attacco nella stessa Battle Phase (nuovo in
    // actions.js/resolveAttack — def.canAttackTwice o
    // slot.extraAttackGranted), più due carte la cui nota era ormai
    // superata da meccanismi già esistenti (ctx.zeroAttackerAtk,
    // ctx.grantTemporaryAtkDefBonus).
    // ================================================================

    // 538 — Sanga del Tuono: durante il calcolo dei danni, se attaccata,
    // azzera l'ATK dell'attaccante (una sola volta finché scoperta) —
    // stesso meccanismo di Suijin (id 71)/Kazejin (id 324) qui sopra.
    // Nota: questa carta era registrata SOLO come materiale di Fusione
    // (fusionMaterials di Il Guardiano del Cancello, id 33) — questo è il
    // suo effetto proprio come mostro autonomo scoperto sul Terreno.
    CardEffects.register(538, {
        canActivate(ctx) {
            return !ctx.card.sangaUsed;
        },
        onAttackDeclare(ctx) {
            ctx.card.sangaUsed = true;
            ctx.zeroAttackerAtk();
            ctx.log("⚡ Sanga del Tuono azzera l'ATK del mostro attaccante per questo scontro (effetto usabile una sola volta finché scoperta)!");
        }
    });

    // 440 — Scudo e Spada: scambia ATK e DEF di tutti i mostri scoperti
    // fino a fine turno — un bonus temporaneo (+/- la differenza tra i
    // due valori) tramite ctx.grantTemporaryAtkDefBonus, già esistente:
    // non serve mutare le statistiche originali condivise della carta.
    CardEffects.register(440, {
        activate(ctx) {
            ['player', 'bot'].forEach((o) => {
                ctx.field(o).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const atk = slot.card.attack;
                    const def = slot.card.defense;
                    ctx.grantTemporaryAtkDefBonus(slot.card, def - atk, atk - def, false);
                });
            });
            ctx.log('🔄 Scudo e Spada scambia ATK e DEF di tutti i mostri scoperti!');
        }
    });

    // 294 — Cavaliere Hayabusa: può attaccare una seconda volta in ogni
    // Battle Phase (def.canAttackTwice, controllato in resolveAttack/
    // actions.js — solo un flag, nessuna funzione necessaria).
    CardEffects.register(294, {
        canAttackTwice: true
    });

    // 485 — Riavvolgimento Toon: concede a 1 proprio mostro scoperto un
    // secondo attacco in questa Battle Phase (slot.extraAttackGranted,
    // stesso meccanismo di Cavaliere Hayabusa qui sopra, ma concesso da
    // un'altra carta invece che permanente). SEMPLIFICAZIONE: bersaglio
    // auto-selezionato tra QUALUNQUE proprio mostro scoperto, non solo i
    // Toon (nessun tag "è un mostro Toon" nel database attuale).
    CardEffects.register(485, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const index = ctx.field(ctx.owner).findIndex((s) => s && !s.isFaceDown);
            if (index === -1) return;
            const slot = ctx.field(ctx.owner)[index];
            slot.extraAttackGranted = true;
            ctx.log(`🎪 Riavvolgimento Toon concede un secondo attacco a ${slot.card.name}!`);
        }
    });

    // ================================================================
    // BATCH 7: rientro in campo dopo una distruzione (onOwnMonsterDestroyed,
    // batch 5) e rimescolamento nel Deck (ACTIONS.shuffleIntoDeck, nuovo
    // in duel-engine.js — stessa limitazione di ACTIONS.searchDeckToHand:
    // non fa nulla nel Duello Demo, che non ha un vero Deck).
    // ================================================================

    // 478 — Macchina del Tempo: quando un mostro viene distrutto e mandato
    // al tuo Cimitero, Special Summonalo di nuovo (onOwnMonsterDestroyed).
    // SEMPLIFICAZIONE: reagisce a QUALUNQUE distruzione del proprio
    // mostro, non solo "in battaglia" come da testo reale (il motore non
    // distingue la causa dentro ON_DESTROY) — e lo fa rientrare sempre in
    // Posizione di Attacco, non nella Posizione che aveva quando è stato
    // distrutto (persa insieme allo slot, non più recuperabile qui).
    CardEffects.register(478, {
        onOwnMonsterDestroyed(ctx) {
            const revived = ctx.destroyedCard;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const graveyard = ctx.graveyard(ctx.owner);
            const idx = graveyard.indexOf(revived);
            if (idx !== -1) graveyard.splice(idx, 1);
            ctx.specialSummon(ctx.owner, revived, slotIndex, 'attack', 'graveyard');
            ctx.log(`⏰ Macchina del Tempo fa rientrare in campo ${revived.name}!`);
        }
    });

    // 479 — Sigillo del Tempo: salta la Draw Phase del prossimo turno
    // dell'avversario. Stesso meccanismo (contatore, non booleano) già
    // usato da Avidità Sconsiderata (id 653) — vedi
    // gameState.skipDrawFor in enterDrawPhase() (js/engine/game-flow.js) —
    // solo puntato sull'AVVERSARIO invece che su chi la attiva.
    CardEffects.register(479, {
        activate(ctx) {
            gameState.skipDrawFor = gameState.skipDrawFor || {};
            gameState.skipDrawFor[ctx.opponent] = (gameState.skipDrawFor[ctx.opponent] || 0) + 1;
            ctx.log(`⏳ Sigillo del Tempo: ${ctx.opponent === 'player' ? 'salterai' : 'il bot salterà'} la prossima Draw Phase!`);
        }
    });

    // 480 — Divoratempo / Time Eater: se questa carta distrugge in
    // battaglia un mostro dell'avversario, l'avversario salta la sua
    // prossima Main Phase 1. Usa il nuovo hook generico
    // def.onDestroysMonsterInBattle (applyBattleDestroyBonus, actions.js)
    // + gameState.skipMainPhase1For (enterMainPhase1, game-flow.js) —
    // stesso spirito granulare per-fase di skipDrawFor qui sopra, ma
    // booleano (il testo reale copre una sola volta) e sulla Main Phase 1
    // invece della Draw Phase.
    CardEffects.register(480, {
        onDestroysMonsterInBattle(ctx) {
            gameState.skipMainPhase1For = gameState.skipMainPhase1For || {};
            gameState.skipMainPhase1For[ctx.opponent] = true;
            ctx.log(`⏳ ${ctx.card.name}: ${ctx.opponent === 'player' ? 'salterai' : 'il bot salterà'} la prossima Main Phase 1!`);
        }
    });

    // 384 — Recupero dei Mostri: rimescola 1 proprio mostro sul Terreno
    // più l'intera mano nel Deck, poi pesca altrettante carte
    // (ACTIONS.shuffleIntoDeck).
    CardEffects.register(384, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s);
        },
        activate(ctx) {
            const index = ctx.field(ctx.owner).findIndex((s) => s);
            if (index === -1) return;
            const monster = ctx.field(ctx.owner)[index].card;
            const hand = ctx.hand(ctx.owner);
            const toShuffle = [monster, ...hand.splice(0, hand.length)];
            if (!ctx.shuffleIntoDeck(ctx.owner, toShuffle)) {
                // Nessun Deck reale (Duello Demo): annulla, restituendo la
                // mano e il mostro esattamente come prima, invece di far
                // sparire le carte nel nulla.
                hand.push(...toShuffle.slice(1));
                return;
            }
            ctx.field(ctx.owner)[index] = null;
            ctx.drawCards(ctx.owner, toShuffle.length);
            ctx.log(`🔀 Recupero dei Mostri rimescola ${toShuffle.length} carte nel Deck e ne pesca altrettante!`);
        }
    });

    // ================================================================
    // 324 — Kazejin (risposta quando attaccata, Effetto Veloce, una tantum)
    // Durante il calcolo dei danni, se questa carta viene attaccata: puoi
    // rendere 0 l'ATK del mostro attaccante SOLO per questo scontro —
    // stesso meccanismo di Suijin (id 71), ma utilizzabile una SOLA volta
    // finché Kazejin resta scoperta in campo (non una volta a turno): il
    // flag vive sullo SLOT (si azzera da solo se Kazejin lascia il campo e
    // torna, essendo un nuovo slot), controllato da canActivate come ogni
    // altra carta che risponde a un attacco — vedi findTriggerCandidates
    // in duel-engine.js, che chiama canActivate con lo stesso ctx.index.
    // ================================================================
    CardEffects.register(324, {
        canActivate(ctx) {
            const slot = ctx.field(ctx.owner)[ctx.index];
            return !!slot && !slot.kazejinUsed;
        },
        onAttackDeclare(ctx) {
            ctx.zeroAttackerAtk();
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (slot) slot.kazejinUsed = true;
            ctx.log("💨 Kazejin azzera l'ATK del mostro attaccante per questo scontro (effetto usabile una sola volta finché scoperta)!");
        }
    });

    // ================================================================
    // 269 — Forza d'Attacco Goblin / Goblin Attack Force
    // Se questa carta attacca: viene cambiata in Posizione di Difesa alla
    // fine della Battle Phase, e la sua Posizione non può essere cambiata
    // fino alla End Phase del turno successivo del proprietario.
    // Nessun handler dichiarativo qui: il cambio Posizione forzato va
    // applicato DOPO che la battaglia si è risolta (vinta, persa o
    // pareggiata) e solo se questa carta è sopravvissuta — troppo tardi
    // per onAttackDeclare. Vedi il controllo esplicito su
    // def.forcesDefenseAfterAttack in resolveAttack (actions.js), incluso
    // il commento lì sulla SEMPLIFICAZIONE del momento esatto di sblocco.
    // ================================================================
    CardEffects.register(269, {
        forcesDefenseAfterAttack: true
    });

    // ================================================================
    // 503 — Waboku (Trappola Normale)
    // Non subisci danno da battaglia dai mostri dell'avversario in questo
    // turno. I tuoi mostri non possono essere distrutti in battaglia in
    // questo turno. Vedi gameState.noBattleDamageFor/noBattleDestructionFor
    // (per-giocatore, resettati in changeTurn() — game-flow.js — e
    // controllati in applyDamage/resolveBattleDamage — actions.js).
    // ================================================================
    CardEffects.register(503, {
        activate(ctx) {
            gameState.noBattleDamageFor = gameState.noBattleDamageFor || {};
            gameState.noBattleDestructionFor = gameState.noBattleDestructionFor || {};
            gameState.noBattleDamageFor[ctx.owner] = true;
            gameState.noBattleDestructionFor[ctx.owner] = true;
            ctx.log(`🙏 Waboku protegge ${ctx.owner === 'player' ? 'i tuoi mostri' : 'i mostri del bot'} da danno e distruzione da battaglia per il resto del turno!`);
        }
    });

    // ================================================================
    // 173 — Barattolo Cyber / Cyber Jar (effetto FLIP)
    // Distruggi tutti i mostri sul Terreno (compreso Barattolo Cyber
    // stesso). Poi entrambi i giocatori rivelano le prime 5 carte del
    // proprio Deck: i mostri di Livello 4 o inferiore possono essere
    // Special Summonati, le altre carte vanno in mano.
    // SEMPLIFICAZIONE: le Special Summon dal reveal sono sempre scoperte
    // in Attacco (nessuna UI per una scelta multipla Attacco/Difesa così
    // rapida su più carte insieme). Funziona solo con un vero Deck
    // salvato (non il pool casuale del Duello Demo, come searchDeckToHand/
    // shuffleIntoDeck in duel-engine.js). Nota: se questo FLIP parte da un
    // attacco (mostro coperto in Difesa attaccato e sopravvissuto — solo
    // allora scatta ON_FLIP, vedi resolveBattleDamage in actions.js), la
    // distruzione dell'attaccante/di Barattolo Cyber qui dentro può far
    // scattare una seconda volta l'animazione di esplosione già innescata
    // da ctx.destroyMonster per quegli stessi due slot (duplicato solo
    // visivo/sonoro, nessun impatto sullo stato di gioco).
    // ================================================================
    CardEffects.register(173, {
        onFlip(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot) ctx.destroyMonster(owner, index);
                });
            });
            ctx.log('🫙 Barattolo Cyber si rivela e distrugge tutti i mostri sul Terreno!');
            ['player', 'bot'].forEach((owner) => {
                const deck = gameState[owner === 'player' ? 'playerDeck' : 'botDeck'];
                if (!Array.isArray(deck) || deck.length === 0) {
                    ctx.log(`🫙 ${owner === 'player' ? 'Non hai' : 'Il bot non ha'} un Deck reale da cui rivelare carte in questa modalità.`);
                    return;
                }
                const revealed = deck.splice(0, Math.min(5, deck.length));
                const monsters = revealed.filter((c) => c.type === 'monster' && (c.level || 0) <= 4);
                const others = revealed.filter((c) => !monsters.includes(c));
                monsters.forEach((card) => {
                    const slotIndex = ctx.findEmptyMonsterSlot(owner);
                    if (slotIndex === -1) { ctx.hand(owner).push(card); return; }
                    ctx.specialSummon(owner, card, slotIndex, 'attack');
                });
                others.forEach((card) => ctx.hand(owner).push(card));
                ctx.log(`🫙 ${owner === 'player' ? 'Riveli' : 'Il bot rivela'} ${revealed.length} cart${revealed.length === 1 ? 'a' : 'e'} dal Deck: ${monsters.length} Evocat${monsters.length === 1 ? 'a' : 'e'} Special, ${others.length} in mano.`);
            });
        }
    });

    // ================================================================
    // 238 — Barattolo di Fibra (effetto FLIP)
    // Entrambi i giocatori rimescolano nel proprio Deck tutte le carte da
    // mano, Terreno (mostri + Magie/Trappole + Magia Terreno) e Cimitero,
    // poi pescano 5 carte. Funziona solo con un vero Deck salvato, come
    // Barattolo Cyber (id 173) qui sopra.
    // ================================================================
    CardEffects.register(238, {
        onFlip(ctx) {
            ['player', 'bot'].forEach((owner) => {
                const deck = gameState[owner === 'player' ? 'playerDeck' : 'botDeck'];
                if (!Array.isArray(deck)) {
                    ctx.log(`🫙 ${owner === 'player' ? 'Non hai' : 'Il bot non ha'} un Deck reale in questa modalità: Barattolo di Fibra non ha effetto per questo lato.`);
                    return;
                }
                const hand = ctx.hand(owner);
                const grave = ctx.graveyard(owner);
                const toShuffle = [...hand.splice(0, hand.length), ...grave.splice(0, grave.length)];
                ctx.field(owner).forEach((slot, index) => {
                    if (slot) { toShuffle.push(slot.card); ctx.field(owner)[index] = null; }
                });
                ctx.stField(owner).forEach((slot, index) => {
                    if (slot) { toShuffle.push(slot.card); ctx.stField(owner)[index] = null; }
                });
                const fieldSpellKey = owner === 'player' ? 'playerFieldSpell' : 'botFieldSpell';
                if (gameState[fieldSpellKey]) {
                    toShuffle.push(gameState[fieldSpellKey].card);
                    gameState[fieldSpellKey] = null;
                }
                deck.push(...toShuffle);
                for (let i = deck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
                ctx.drawCards(owner, Math.min(5, deck.length));
                ctx.log(`🫙 ${owner === 'player' ? 'Rimescoli' : 'Il bot rimescola'} mano, Terreno e Cimitero nel Deck e pesc${owner === 'player' ? 'hi' : 'a'} 5 carte!`);
            });
        }
    });

    // ================================================================
    // 407 — Domanda
    // Il tuo avversario dichiara il nome del primo mostro in fondo al tuo
    // Cimitero (il più vecchio, il primo mai mandato lì — indice 0
    // dell'array, dato che ogni scarto arriva con .push()). Se indovina,
    // quel mostro viene bandito (ctx.banish, zona Bandite). Se sbaglia,
    // torna in campo Special Summonato (tolto di nuovo dalla zona
    // Bandite, mai stato davvero permanente in questo caso).
    // SEMPLIFICAZIONE: nessuna vera UI di "indovinello" (il Cimitero è già
    // visibile a schermo a entrambi in questo motore, quindi un vero
    // indovinello sarebbe banale da vincere sempre guardando la pila) —
    // l'esito è deciso con una probabilità realistica, 1 su tanti quanti
    // sono i mostri DISTINTI per nome nel Cimitero.
    // ================================================================
    CardEffects.register(407, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster');
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const target = grave.find((c) => c.type === 'monster');
            if (!target) { ctx.log('⚠️ Nessun mostro nel Cimitero.'); return; }
            const distinctNames = new Set(grave.filter((c) => c.type === 'monster').map((c) => c.name));
            const guessedRight = Math.random() < (1 / Math.max(1, distinctNames.size));
            const idx = grave.indexOf(target);
            grave.splice(idx, 1);
            ctx.banish(ctx.owner, target);
            if (guessedRight) {
                ctx.log(`❓ Il tuo avversario indovina: ${target.name} viene bandito dal Cimitero!`);
            } else {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) {
                    ctx.log(`⚠️ Il tuo avversario sbaglia, ma il Terreno è pieno: ${target.name} resta bandito.`);
                    return;
                }
                const banishedList = ctx.banished(ctx.owner);
                const bIdx = banishedList.indexOf(target);
                if (bIdx !== -1) banishedList.splice(bIdx, 1);
                ctx.specialSummon(ctx.owner, target, slotIndex, 'attack', 'graveyard');
                ctx.log(`❓ Il tuo avversario sbaglia: ${target.name} torna in campo Special Summonato!`);
            }
        }
    });

    // ================================================================
    // 300 — Corno del Paradiso (Trappola Normale, Trappola Contatore)
    // Quando un mostro sta per essere Evocato: sacrifica 1 mostro; annulla
    // l'Evocazione, e se lo fai, distruggi quel mostro.
    // SEMPLIFICAZIONE: invece di una vera intercettazione PRIMA che il
    // mostro tocchi il Terreno (richiederebbe riscrivere ogni punto del
    // motore che Evoca — Normale in actions.js, Speciale in decine di
    // punti in duel-engine.js — per fermarsi a metà), il mostro viene
    // lasciato apparire e poi distrutto SUBITO tramite la finestra di
    // risposta onOpponentSummon già esistente (stesso identico meccanismo
    // di Buco Trappola, id 40): nessuna carta in questo database ha oggi
    // un effetto "quando questa carta viene Evocata" che scatterebbe nel
    // frattempo, quindi il risultato pratico è indistinguibile da una vera
    // negazione. Il costo (sacrifica 1 mostro proprio) si paga dentro
    // activate/onOpponentSummon stesso.
    // ================================================================
    CardEffects.register(300, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s);
        },
        onOpponentSummon(ctx) {
            const tributeIndex = ctx.field(ctx.owner).findIndex((s) => s);
            if (tributeIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, ctx.summonedSlotIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            const tributeName = ctx.field(ctx.owner)[tributeIndex].card.name;
            ctx.destroyMonster(ctx.owner, tributeIndex);
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`📯 Corno del Paradiso sacrifica ${tributeName} per annullare e distruggere ${target ? target.card.name : ctx.summonedCard.name}, appena Evocato!`);
        }
    });

    // ================================================================
    // 448 — Giudizio Solenne (Trappola Normale, Trappola Contatore)
    // Quando un mostro sta per essere Evocato, oppure una Magia/Trappola
    // viene attivata: paga metà dei tuoi Life Points; annulla l'Evocazione
    // o l'attivazione, e se lo fai, distruggi quella carta.
    //
    // Metà "Evocazione": stessa SEMPLIFICAZIONE di Corno del Paradiso (id
    // 300) qui sopra — onOpponentSummon, distruzione immediata invece di
    // una vera intercettazione pre-Evocazione.
    //
    // Metà "Magia/Trappola": QUESTA sì è una vera negazione, resa possibile
    // dalla nuova ctx.negateActivation() (duel-engine.js): Giudizio Solenne
    // si mette in Chain come risposta (stesso meccanismo generico già
    // usato da qualunque Trappola Set, vedi findSetTrapCandidates), e
    // risolvendosi PRIMA della carta a cui risponde (la Chain si risolve
    // LIFO, l'ultima aggiunta è la prima a risolversi — regola vera) marca
    // quel link come negato: resolveChain() lo salta invece di chiamarne
    // l'handler, quindi il suo effetto non accade mai davvero.
    // ================================================================
    CardEffects.register(448, {
        canActivate(ctx) {
            const hasSummonToNegate = typeof ctx.summonedCard !== 'undefined';
            const hasChainToNegate = !!(ctx.gameState.chain && ctx.gameState.chain.links && ctx.gameState.chain.links.length > 0);
            return hasSummonToNegate || hasChainToNegate;
        },
        onOpponentSummon(ctx) {
            const decl = ctx.declareTarget(ctx.opponent, ctx.summonedSlotIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            const cost = Math.ceil(ctx.gameState[lpKey] / 2);
            ctx.dealDamage(ctx.owner, cost);
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`⚖️ Giudizio Solenne paga ${cost} Life Points per annullare e distruggere ${target ? target.card.name : ctx.summonedCard.name}, appena Evocato!`);
        },
        activate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            const cost = Math.ceil(ctx.gameState[lpKey] / 2);
            ctx.dealDamage(ctx.owner, cost);
            if (ctx.negateActivation()) {
                ctx.log(`⚖️ Giudizio Solenne paga ${cost} Life Points e annulla l'attivazione!`);
            } else {
                ctx.log(`⚖️ Giudizio Solenne paga ${cost} Life Points, ma non c'era più nulla da annullare.`);
            }
        }
    });

    // ================================================================
    // 215 — Neve Battente / Drifting Snow (Trappola Normale)
    // Attivabile solo quando 1 o più tue Trappole vengono distrutte e
    // mandate dal Terreno al Cimitero da un effetto dell'avversario:
    // distruggi 1 Magia o Trappola sul Terreno. Nuovo aggancio nel
    // motore: def.onOwnSpellTrapDestroyed(ctx) (ACTIONS.destroySpellTrap,
    // duel-engine.js), stesso schema/stessa SEMPLIFICAZIONE (un solo
    // rispondente automatico, niente vera finestra di priorità) già
    // usato per onOwnMonsterDestroyed.
    // SEMPLIFICAZIONE: sceglie da sola quale Magia/Trappola distruggere
    // (la prima trovata, priorità al campo avversario).
    // ================================================================
    CardEffects.register(215, {
        onOwnSpellTrapDestroyed(ctx) {
            let target = null;
            let targetOwner = null;
            [ctx.opponent, ctx.owner].forEach((owner) => {
                if (target) return;
                ctx.stField(owner).forEach((slot, index) => {
                    if (target || !slot) return;
                    target = { owner, index };
                });
            });
            if (!target) return;
            ctx.destroySpellTrap(target.owner, target.index);
            ctx.log('❄️ Neve Battente distrugge 1 Magia/Trappola sul Terreno!');
        }
    });

    // ================================================================
    // 216 — Fuori Gioco / Drop Off (Trappola Normale)
    // Quando il tuo avversario pesca per la sua pescata Normale nella Draw
    // Phase: il tuo avversario scarta la carta appena pescata. Nuovo
    // aggancio nel motore: DuelEngine.openDrawResponseWindow, chiamato da
    // enterDrawPhase (game-flow.js) subito dopo ogni pescata Normale,
    // stesso meccanismo generico di onOpponentSummon/onAttackDeclare.
    // ctx.opponent, nel contesto di RISPOSTA, è chi ha appena pescato (il
    // "proprietario" dell'evento originale) — stesso identico significato
    // di ctx.opponent in onOpponentSummon (es. Buco Trappola, id 40).
    // ================================================================
    CardEffects.register(216, {
        onOpponentNormalDraw(ctx) {
            if (!ctx.drawnCard) return;
            const hand = ctx.hand(ctx.opponent);
            const idx = hand.indexOf(ctx.drawnCard);
            if (idx === -1) return;
            hand.splice(idx, 1);
            ctx.graveyard(ctx.opponent).push(ctx.drawnCard);
            ctx.log(`🃏 Fuori Gioco scarta ${ctx.drawnCard.name} dalla mano ${ctx.opponent === 'player' ? 'tua' : 'del bot'}, appena pescata!`);
        }
    });

    // ================================================================
    // 396 — Spada Sigillante di Orichalcos / Orichalcos Sword of Sealing
    // (Carta Equipaggiamento)
    // Gli effetti del mostro equipaggiato vengono negati (static,
    // gameState.monsterEffectsNegatedUidsFor — nuovo, consultato da
    // DuelEngine.isMonsterCardEffectsNegated in tutti i punti in cui un
    // effetto Mostro può scattare, stesso schema di piercingUidsFor).
    // SEMPLIFICAZIONE dichiarata: NON applicate le altre due clausole del
    // testo reale — "se hai una carta in Field Zone, estendi questo
    // effetto a un altro mostro fino alla fine del turno avversario" e
    // "Effetto Veloce una volta per turno: scarta 1 carta per distruggere
    // 1 carta scoperta sul Terreno" (quest'ultima duplicherebbe un intero
    // pattern "scarta per distruggere" già gestito altrove per carte
    // dedicate, fuori scopo per questa sola clausola extra).
    // ================================================================
    CardEffects.register(396, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            gameState.monsterEffectsNegatedUidsFor[ctx.card.equippedToOwner].add(t.uid);
        }
    });

    // ================================================================
    // 397 — Scelta Dolorosa (Magia Normale)
    // Scegli 5 carte dal tuo Deck e mostrale al tuo avversario. Il tuo
    // avversario ne sceglie 1: aggiungila alla tua mano e manda le
    // rimanenti al Cimitero. Funziona solo con un vero Deck salvato, come
    // Barattolo Cyber/Barattolo di Fibra più sopra.
    // ================================================================
    CardEffects.register(397, {
        canActivate(ctx) {
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            return Array.isArray(deck) && deck.length > 0;
        },
        activate(ctx) {
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            if (!Array.isArray(deck) || deck.length === 0) {
                ctx.log('⚠️ Nessun Deck reale da cui scegliere in questa modalità.');
                return;
            }
            const revealed = deck.splice(0, Math.min(5, deck.length));
            const owner = ctx.owner;
            const opponent = ctx.opponent;
            const finish = (chosen) => {
                const chosenIdx = revealed.indexOf(chosen);
                const rest = revealed.filter((c, i) => i !== chosenIdx);
                ctx.hand(owner).push(chosen);
                ctx.graveyard(owner).push(...rest);
                ctx.log(`💭 ${opponent === 'player' ? 'Scegli' : 'Il bot sceglie'} ${chosen.name} per ${owner === 'player' ? 'la tua mano' : 'il bot'}: le altre ${rest.length} vanno al Cimitero.`);
            };
            if (opponent !== 'player' || !window.DuelEngineUI) {
                // Il bot sceglie da solo: tra i mostri rivelati, quello con
                // l'ATK più basso (danneggia meno l'avversario che riceve);
                // se non ce ne sono, la prima carta rivelata. Il confronto
                // resta SOLO tra mostri: una Magia/Trappola non ha un ATK
                // vero (undefined), quindi finirebbe sempre scelta per
                // prima se paragonata a 0 insieme ai mostri.
                const monsters = revealed.filter((c) => c.type === 'monster');
                let pick = monsters[0] || revealed[0];
                monsters.forEach((c) => { if (c.attack < pick.attack) pick = c; });
                finish(pick);
                return;
            }
            window.DuelEngineUI.openCardListPicker(revealed, {
                title: '💭 Scelta Dolorosa',
                text: `${owner === 'player' ? 'Il bot ha' : 'Hai'} rivelato 5 carte dal Deck: scegli quale finisce nella ${owner === 'player' ? 'sua' : 'tua'} mano (le altre vanno al Cimitero).`,
                onSelect: (card) => finish(card)
            });
        }
    });

    // ================================================================
    // 399 — Guerriero Pantera / Panther Warrior
    // Questa carta non può dichiarare un attacco a meno che tu non
    // sacrifichi 1 mostro. requiresTributeToAttack è un flag puro senza
    // handler proprio: il costo si paga PRIMA della dichiarazione
    // dell'attacco, in executeAttack() (js/engine/actions.js, giocatore) e
    // in botPerformAttacks() (js/ai/bot.js, IA) — gli unici due punti da
    // cui un attacco del giocatore/bot può partire (vedi il commento su
    // resolveAttack in actions.js).
    // ================================================================
    CardEffects.register(399, {
        requiresTributeToAttack: true
    });

    // ================================================================
    // 456 — Ragnatela (Magia Terreno)
    // Se un mostro dichiara un attacco, viene cambiato in Posizione di
    // Difesa alla fine del Damage Step, e non può cambiare Posizione fino
    // alla End Phase del turno successivo del suo controllore, finché
    // questa carta resta sul Terreno — di ENTRAMBI i lati, non solo di chi
    // la controlla. Nessuna logica qui dentro: il controllo vero e proprio
    // (ragnatelaActive) vive in resolveAttack (actions.js), che legge
    // direttamente id 456 sulla zona Magia Terreno di entrambi i
    // giocatori — questa registrazione esiste solo perché ogni Magia,
    // anche Terreno, deve avere un handler activate per poter essere
    // giocata (vedi canActivate in duel-engine.js).
    // ================================================================
    CardEffects.register(456, {
        activate(ctx) {
            ctx.log('🕸️ Ragnatela avvolge il campo di battaglia: ogni mostro che attacca finirà in Difesa!');
        }
    });

    // ================================================================
    // 450 — Demolizione dell'Anima (Trappola Continua)
    // Puoi attivare l'effetto di questa carta solo se controlli un mostro
    // Tipo Demone. Paga 500 Life Points; entrambi i giocatori scelgono 1
    // mostro dal Cimitero DELL'AVVERSARIO, e li bandiscono.
    // SEMPLIFICAZIONE: le regole vere permettono di riusare questo effetto
    // ogni volta che le condizioni tornano vere, finché la carta resta sul
    // Terreno (è Continua) — qui, senza un meccanismo di "abilità Ignition
    // su una Trappola già scoperta", l'effetto scatta una sola volta,
    // subito all'attivazione, come una Trappola Normale.
    // ================================================================
    CardEffects.register(450, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.race === 'Demone');
        },
        activate(ctx) {
            const cost = 500;
            ctx.dealDamage(ctx.owner, cost);
            const pickFrom = (pickerOwner, graveyardOwner) => {
                const grave = ctx.graveyard(graveyardOwner);
                const monsters = grave.filter((c) => c.type === 'monster');
                if (monsters.length === 0) return;
                const remove = (card) => {
                    const idx = grave.indexOf(card);
                    if (idx !== -1) grave.splice(idx, 1);
                    ctx.banish(graveyardOwner, card);
                };
                if (pickerOwner !== 'player' || !window.DuelEngineUI) {
                    remove(monsters[0]);
                    return;
                }
                window.DuelEngineUI.openCardListPicker(monsters, {
                    title: "💀 Demolizione dell'Anima",
                    text: `Scegli 1 mostro dal Cimitero ${graveyardOwner === 'player' ? 'tuo' : 'del bot'} da bandire.`,
                    onSelect: (card) => remove(card)
                });
            };
            pickFrom(ctx.owner, ctx.opponent);
            pickFrom(ctx.opponent, ctx.owner);
            ctx.log(`💀 Demolizione dell'Anima paga ${cost} Life Points: entrambi bandiscono un mostro dal Cimitero avversario!`);
        }
    });

    // ================================================================
    // 501 — Cannone Virus (Trappola Normale)
    // Sacrifica un numero qualsiasi di mostri, esclusi i Token; il tuo
    // avversario manda dal Deck al Cimitero un numero di Magie pari al
    // numero di mostri sacrificati (o tutte le sue Magie, se sono meno).
    // SEMPLIFICAZIONE: sacrifica SEMPRE tutti i mostri non-Token che
    // controlli (nessuna UI di selezione multipla per "un numero
    // qualsiasi" — vedi lo stesso limite già segnalato per altre carte
    // "scegli N carte" in questo file).
    // ================================================================
    CardEffects.register(501, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.card.isToken);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            let sacrificedCount = 0;
            field.forEach((slot, index) => {
                if (slot && !slot.card.isToken) {
                    ctx.graveyard(ctx.owner).push(slot.card);
                    field[index] = null;
                    sacrificedCount++;
                }
            });
            if (sacrificedCount === 0) { ctx.log('⚠️ Nessun mostro da sacrificare.'); return; }
            const deck = ctx.gameState[ctx.opponent === 'player' ? 'playerDeck' : 'botDeck'];
            if (!Array.isArray(deck)) {
                ctx.log(`💣 Cannone Virus sacrifica ${sacrificedCount} mostr${sacrificedCount === 1 ? 'o' : 'i'}, ma l'avversario non ha un Deck reale in questa modalità.`);
                return;
            }
            let sent = 0;
            for (let i = deck.length - 1; i >= 0 && sent < sacrificedCount; i--) {
                if (deck[i].type === 'spell') {
                    ctx.graveyard(ctx.opponent).push(deck.splice(i, 1)[0]);
                    sent++;
                }
            }
            ctx.log(`💣 Cannone Virus sacrifica ${sacrificedCount} mostr${sacrificedCount === 1 ? 'o' : 'i'}: l'avversario manda ${sent} Magi${sent === 1 ? 'a' : 'e'} dal Deck al Cimitero!`);
        }
    });

    // ================================================================
    // 316 — Jirai Gumo (auto-effetto quando attacca)
    // Quando questa carta dichiara un attacco: lancia una moneta e
    // chiamala. Se sbagli, perdi metà dei tuoi Life Points. Usa il nuovo
    // aggancio onOwnAttackDeclare (duel-engine.js) — stesso spirito
    // "risultato subito nel log" già usato per Mago del Tempo (id 28)/
    // Drago Barile (id 104) per il lancio di moneta.
    // ================================================================
    CardEffects.register(316, {
        onOwnAttackDeclare(ctx) {
            const heads = Math.random() < 0.5;
            if (window.FX) FX.playCoinFlip(heads);
            if (heads) {
                ctx.log('🪙 Jirai Gumo lancia la moneta prima di attaccare: indovinato!');
            } else {
                const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
                const cost = Math.ceil(ctx.gameState[lpKey] / 2);
                ctx.dealDamage(ctx.owner, cost);
                ctx.log(`🪙 Jirai Gumo lancia la moneta prima di attaccare: sbagliato! ${ctx.owner === 'player' ? 'Perdi' : 'Il bot perde'} ${cost} Life Points!`);
            }
        }
    });

    // ================================================================
    // 255 — Azzardo (Trappola Normale)
    // Attivabile solo se il tuo avversario ha 6 o più carte in mano e tu
    // ne hai 2 o meno. Lancia una moneta e chiamala: se indovini, pesca
    // finché non hai 5 carte in mano; se sbagli, salta il tuo turno
    // successivo — vedi gameState.skipNextTurnFor, nuovo aggancio in
    // changeTurn() (game-flow.js).
    // ================================================================
    CardEffects.register(255, {
        canActivate(ctx) {
            return ctx.hand(ctx.opponent).length >= 6 && ctx.hand(ctx.owner).length <= 2;
        },
        activate(ctx) {
            const heads = Math.random() < 0.5;
            if (window.FX) FX.playCoinFlip(heads);
            if (heads) {
                let drawn = 0;
                while (ctx.hand(ctx.owner).length < 5) {
                    const before = ctx.hand(ctx.owner).length;
                    ctx.drawCards(ctx.owner, 1);
                    if (ctx.hand(ctx.owner).length === before) break; // Deck esaurito: sicurezza anti-loop
                    drawn++;
                }
                ctx.log(`🪙 Azzardo: indovinato! ${ctx.owner === 'player' ? 'Peschi' : 'Il bot pesca'} ${drawn} cart${drawn === 1 ? 'a' : 'e'} fino a 5 in mano.`);
            } else {
                ctx.gameState.skipNextTurnFor = ctx.gameState.skipNextTurnFor || {};
                ctx.gameState.skipNextTurnFor[ctx.owner] = true;
                ctx.log(`🪙 Azzardo: sbagliato! ${ctx.owner === 'player' ? 'Salti' : 'Il bot salta'} il prossimo turno!`);
            }
        }
    });

    // ================================================================
    // 141 — Carta del Ritorno Sicuro (Magia Continua)
    // Quando un mostro viene Special Summonato dal tuo Cimitero, puoi
    // pescare 1 carta. Usa il nuovo aggancio onOwnSpecialSummonFromGraveyard
    // (duel-engine.js) — reagisce da sola, un solo respondente automatico,
    // stesso spirito di onOwnMonsterDestroyed (es. Macchina del Tempo, id
    // 478) ma per l'evento "Special Summon dal proprio Cimitero".
    // ================================================================
    CardEffects.register(141, {
        continuous: true,
        activate(ctx) {
            ctx.log('🔄 Carta del Ritorno Sicuro entra in campo: pescherai 1 carta ogni volta che farai una Special Summon dal Cimitero.');
        },
        onOwnSpecialSummonFromGraveyard(ctx) {
            const drawn = ctx.drawCards(ctx.owner, 1);
            if (drawn > 0) {
                ctx.log(`🔄 Carta del Ritorno Sicuro: ${ctx.owner === 'player' ? 'peschi' : 'il bot pesca'} 1 carta!`);
            }
        }
    });

    // ================================================================
    // 497 — Umi (Magia Terreno)
    // Tutti i mostri Tipo Pesce, Serpente di Mare, Tuono e Acquatico sul
    // Terreno guadagnano 200 ATK/DEF; tutti i mostri Tipo Macchina e
    // Piroico sul Terreno perdono 200 ATK/DEF. Stesso schema di Un Oceano
    // Leggendario (id 79), qui per Tipo invece che per Attributo.
    // SCOPERTA: questa carta non aveva ancora nessuna registrazione (né
    // una vera, né una missingEffectNote che lo segnalasse) — senza
    // def.activate non poteva mai essere davvero attivata (canActivate in
    // duel-engine.js richiede sempre un handler activate). Necessaria
    // anche per Muro del Tornado (id 489, qui sotto), che dipende da
    // questa carta scoperta sul Terreno.
    // ================================================================
    CardEffects.register(497, {
        continuous: true,
        activate(ctx) {
            ctx.log('🌊 Umi si scopre sul Terreno.');
        },
        static(ctx) {
            const boosted = ['Pesce', 'Serpente di Mare', 'Tuono', 'Acquatico'];
            const weakened = ['Macchina', 'Piroico'];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const existing = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    if (boosted.includes(slot.card.race)) {
                        gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk + 200, def: existing.def + 200 };
                    } else if (weakened.includes(slot.card.race)) {
                        gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk - 200, def: existing.def - 200 };
                    }
                });
            });
        }
    });

    // ================================================================
    // 498 — Cerchio degli Inferi / Inferno Reckless Summon... (Magia
    // Continua). Si attiva solo se ENTRAMBI i giocatori hanno 5+ mostri
    // nel Cimitero: distrugge ogni mostro sul Terreno (di entrambi i
    // lati), poi ogni giocatore bandisce coperti tutti i mostri dal
    // proprio Deck (ctx.banish, già esistente — Zona Bandite), poi puoi
    // Special Summonare 1 Mostro Normale dal proprio Cimitero. Solo 1
    // "Cerchio degli Inferi" attivabile per l'intero Duello
    // (gameState.usedInfernoCircle, flag globale una tantum — diverso da
    // ogni altro "una volta per turno" già presente in questo motore).
    // SEMPLIFICAZIONE: manca la clausola ricorrente "una volta per turno,
    // durante la Standby Phase: ogni giocatore può Special Summon 1
    // mostro dal proprio Cimitero, ignorandone le condizioni di
    // Evocazione, ma bandiscilo quando lascia il campo" — richiederebbe
    // intercettare OGNI possibile modo in cui quel mostro specifico può
    // lasciare il campo (distrutto in battaglia, da effetto, sacrificato,
    // tornato in mano...) per reindirizzarlo alla Zona Bandite invece
    // della destinazione normale, un aggancio trasversale non ancora
    // presente in questo motore per nessun'altra carta.
    // ================================================================
    CardEffects.register(498, {
        continuous: true,
        canActivate(ctx) {
            if (gameState.usedInfernoCircle) return false;
            const playerGraveCount = gameState.playerGraveyard.filter((c) => c.type === 'monster').length;
            const botGraveCount = gameState.botGraveyard.filter((c) => c.type === 'monster').length;
            return playerGraveCount >= 5 && botGraveCount >= 5;
        },
        activate(ctx) {
            gameState.usedInfernoCircle = true;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, i) => {
                    if (slot) ctx.destroyMonster(owner, i);
                });
            });
            ['player', 'bot'].forEach((owner) => {
                const deckKey = owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = gameState[deckKey];
                if (!Array.isArray(deck)) return;
                for (let i = deck.length - 1; i >= 0; i--) {
                    if (deck[i].type === 'monster') {
                        const [card] = deck.splice(i, 1);
                        ctx.banish(owner, card);
                    }
                }
                gameState[countKey] = deck.length;
            });
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'monster' && c.vanilla);
            if (index !== -1) {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex !== -1) {
                    const [card] = grave.splice(index, 1);
                    ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'graveyard');
                    ctx.log(`⭕ Cerchio degli Inferi Special Summona ${card.name}!`);
                }
            }
            ctx.log("⭕ Cerchio degli Inferi distrugge tutti i mostri sul Terreno e bandisce coperti i mostri di entrambi i Deck!");
        }
    });

    // ================================================================
    // 489 — Muro del Tornado (Trappola Continua)
    // Attivabile solo mentre "Umi" (id 497) è sul Terreno. Finché "Umi" è
    // scoperta, non subisci danno da battaglia dai mostri che attaccano —
    // controllo vero e proprio in applyDamage (actions.js), non tramite
    // gameState.noBattleDamageFor (quello è per Waboku, un flag "una
    // tantum per turno", diverso da questa protezione continua). Si
    // autodistrugge quando "Umi" lascia il Terreno.
    // ================================================================
    CardEffects.register(489, {
        continuous: true,
        canActivate(ctx) {
            return ['playerFieldSpell', 'botFieldSpell'].some((key) => {
                const fs = ctx.gameState[key];
                return fs && !fs.isFaceDown && fs.card.id === 497;
            });
        },
        activate(ctx) {
            ctx.log('🌪️ Muro del Tornado si scopre sul Terreno: nessun danno da battaglia finché "Umi" resta scoperta!');
        },
        static(ctx) {
            const umiPresent = ['playerFieldSpell', 'botFieldSpell'].some((key) => {
                const fs = ctx.gameState[key];
                return fs && !fs.isFaceDown && fs.card.id === 497;
            });
            if (!umiPresent) {
                ctx.stField(ctx.owner)[ctx.index] = null;
                ctx.graveyard(ctx.owner).push(ctx.card);
                ctx.log('🌪️ Muro del Tornado va al Cimitero: "Umi" ha lasciato il Terreno.');
            }
        }
    });

    // ================================================================
    // 222 — Lucertola Elettrica (risposta quando attaccata)
    // Un mostro non-Zombie che attacca questa carta non può attaccare nel
    // suo turno successivo. Vedi gameState.attackLockedUntilTurn, nuovo
    // controllo in resolveAttack (actions.js): il numero di turno esatto
    // si calcola una volta sola al momento del trigger (gameState.turn+2,
    // dato che i turni si alternano), nessun reset esplicito necessario.
    // ================================================================
    CardEffects.register(222, {
        onAttackDeclare(ctx) {
            const attackerSlot = ctx.field(ctx.opponent)[ctx.attackerIndex];
            if (!attackerSlot || attackerSlot.card.race === 'Zombie') return;
            gameState.attackLockedUntilTurn = gameState.attackLockedUntilTurn || {};
            gameState.attackLockedUntilTurn[attackerSlot.card.uid] = gameState.turn + 2;
            ctx.log(`⚡ Lucertola Elettrica blocca ${attackerSlot.card.name}: non potrà attaccare nel suo prossimo turno!`);
        }
    });

    // ================================================================
    // 223 — Tartaruga Elettromagnetica / Electromagnetic Turtle
    // Durante la Battle Phase dell'avversario (Quick Effect): puoi
    // bandire questa carta dal Cimitero; termina la Battle Phase. Puoi
    // usare questo effetto solo una volta per Duello (non per turno —
    // vedi ctx.hasUsedOncePerDuel/markUsedOncePerDuel in duel-engine.js).
    // activatableFromGraveyard: true la rende eleggibile dal Cimitero
    // nella finestra di risposta onAttackDeclare (vedi
    // findTriggerCandidates in duel-engine.js); l'attacco in corso viene
    // anche annullato esplicitamente (ctx.cancelAttack()), dato che
    // terminare la Battle Phase lo rende comunque impossibile da risolvere.
    // ================================================================
    CardEffects.register(223, {
        activatableFromGraveyard: true,
        canActivate(ctx) {
            return !ctx.hasUsedOncePerDuel(`223:${ctx.owner}`);
        },
        onAttackDeclare(ctx) {
            ctx.markUsedOncePerDuel(`223:${ctx.owner}`);
            ctx.cancelAttack();
            ctx.endBattlePhase();
            ctx.log('🐢 Tartaruga Elettromagnetica si bandisce dal Cimitero e termina la Battle Phase!');
        }
    });

    // ================================================================
    // 370 — Maschera di Dissoluzione (Magia Continua)
    // Scegli 1 Magia scoperta sul Terreno (di uno qualunque dei due
    // giocatori). Il suo controllore subisce 500 danni durante ciascuna
    // TUA Standby Phase. Quando la carta scelta lascia il Terreno:
    // distruggi questa carta.
    // uid della carta scelta salvato direttamente su ctx.card (stesso
    // spirito di slot.card.equippedToUid già usato per le Carte
    // Equipaggiamento in duel-engine.js): persiste finché questa Magia
    // resta sullo stesso slot, senza bisogno di un array a parte in
    // gameState. Il controllo "la Magia bersaglio è ancora lì" vive in
    // static() (ricalcolato ad ogni render, come Muro del Tornado id 489)
    // così l'autodistruzione è immediata, non rimandata alla prossima
    // Standby Phase; il danno vero invece vive in onStandbyPhase (fires
    // solo durante la TUA Standby Phase, esattamente come da regola vera).
    // ================================================================
    CardEffects.register(370, {
        continuous: true,
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.stField(owner).some((s) => s && !s.isFaceDown && s.card.type === 'spell'));
        },
        activate(ctx) {
            const targets = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && slot.card.type === 'spell') targets.push(slot.card);
                });
            });
            const finish = (chosenCard) => {
                ctx.card.watchedSpellUid = chosenCard.uid;
                ctx.log(`🎭 Maschera di Dissoluzione lega il suo effetto a ${chosenCard.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                finish(targets[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(targets, {
                title: '🎭 Maschera di Dissoluzione',
                text: 'Scegli 1 Magia scoperta sul Terreno da colpire.',
                onSelect: (card) => finish(card)
            });
        },
        static(ctx) {
            const uid = ctx.card.watchedSpellUid;
            if (!uid) return;
            const stillThere = ['player', 'bot'].some((owner) => ctx.stField(owner).some((slot) => slot && slot.card.uid === uid));
            if (!stillThere) {
                ctx.stField(ctx.owner)[ctx.index] = null;
                ctx.graveyard(ctx.owner).push(ctx.card);
                ctx.log('🎭 Maschera di Dissoluzione va al Cimitero: la Magia bersaglio ha lasciato il Terreno.');
            }
        },
        onStandbyPhase(ctx) {
            const uid = ctx.card.watchedSpellUid;
            if (!uid) return;
            let controllerOwner = null;
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot) => {
                    if (slot && slot.card.uid === uid) controllerOwner = owner;
                });
            });
            if (!controllerOwner) return;
            ctx.dealDamage(controllerOwner, 500);
            ctx.log('🎭 Maschera di Dissoluzione infligge 500 danni!');
        }
    });

    // ================================================================
    // 362 — Dimensione Magica (Magia Rapida)
    // Se controlli un mostro Incantatore: scegli come bersaglio 1 mostro
    // che controlli; sacrificalo, poi Special Summon 1 mostro Incantatore
    // dalla tua mano, poi puoi distruggere 1 mostro sul Terreno.
    // 3 scelte in sequenza, ognuna col box a scorrimento già usato altrove
    // in questo file (stesso spirito di Rinascita del Mostro, id 35, che
    // ne incatena già 2): activate(ctx) apre solo la prima e ritorna
    // subito, il resto succede dentro le callback annidate.
    // ================================================================
    CardEffects.register(362, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.race === 'Incantatore')
                && ctx.field(ctx.owner).some((s) => s)
                && ctx.hand(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Incantatore');
        },
        activate(ctx) {
            const owner = ctx.owner;
            const tributeCandidates = ctx.field(owner).filter((s) => s).map((s) => s.card);
            const chooseTribute = (tributeCard) => {
                const tributeIdx = ctx.field(owner).findIndex((s) => s && s.card.uid === tributeCard.uid);
                if (tributeIdx === -1) return;
                ctx.destroyMonster(owner, tributeIdx);
                const spellcasters = ctx.hand(owner).filter((c) => c.type === 'monster' && c.race === 'Incantatore');
                if (spellcasters.length === 0) return;
                const chooseSummon = (summonCard) => {
                    const hand = ctx.hand(owner);
                    const handIdx = hand.findIndex((c) => c.uid === summonCard.uid);
                    const slotIndex = ctx.findEmptyMonsterSlot(owner);
                    if (handIdx === -1 || slotIndex === -1) return;
                    hand.splice(handIdx, 1);
                    ctx.specialSummon(owner, summonCard, slotIndex, 'attack');
                    ctx.log(`🔮 Dimensione Magica sacrifica ${tributeCard.name} e Special Summona ${summonCard.name}!`);
                    const destroyables = [];
                    ['player', 'bot'].forEach((fieldOwner) => {
                        ctx.field(fieldOwner).forEach((s, idx) => { if (s) destroyables.push({ owner: fieldOwner, index: idx, card: s.card }); });
                    });
                    const chooseDestroy = (target) => {
                        if (!target) return;
                        const slot = ctx.field(target.owner)[target.index];
                        if (slot && slot.card.uid === target.card.uid) {
                            ctx.destroyMonster(target.owner, target.index);
                            ctx.log(`🔮 Dimensione Magica distrugge anche ${target.card.name}!`);
                        }
                    };
                    if (destroyables.length === 0) return;
                    if (owner !== 'player' || !window.DuelEngineUI) {
                        return; // il bot si ferma qui: il "puoi" opzionale resta non sfruttato, semplificazione sicura
                    }
                    window.DuelEngineUI.openCardListPicker(destroyables.map((d) => d.card), {
                        title: '🔮 Dimensione Magica',
                        text: 'Puoi distruggere 1 mostro sul Terreno (opzionale).',
                        onSelect: (card) => chooseDestroy(destroyables.find((d) => d.card.uid === card.uid)),
                        onCancel: () => {}
                    });
                };
                if (owner !== 'player' || !window.DuelEngineUI || spellcasters.length === 1) {
                    chooseSummon(spellcasters[0]);
                    return;
                }
                window.DuelEngineUI.openCardListPicker(spellcasters, {
                    title: '🔮 Dimensione Magica',
                    text: 'Scegli quale mostro Incantatore Special Summonare dalla mano.',
                    onSelect: (card) => chooseSummon(card)
                });
            };
            if (owner !== 'player' || !window.DuelEngineUI || tributeCandidates.length === 1) {
                chooseTribute(tributeCandidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(tributeCandidates, {
                title: '🔮 Dimensione Magica',
                text: 'Scegli quale mostro sacrificare.',
                onSelect: (card) => chooseTribute(card)
            });
        }
    });

    // ================================================================
    // 140 — Carta della Rovina / Card of Demise (Magia Normale)
    // Pesca finché non hai 3 carte in mano; per il resto di questo turno
    // il tuo avversario non subisce danni; durante la End Phase di questo
    // turno, manda tutta la tua mano al Cimitero.
    // SEMPLIFICAZIONE: "Non puoi Special Summonare nel turno in cui attivi
    // questa carta" non applicato — imporlo dentro ACTIONS.specialSummon
    // (duel-engine.js) rischierebbe di "perdere" una carta già tolta dalla
    // sua zona d'origine da un altro effetto prima di chiamarlo (quella
    // funzione presume sempre di riuscire), un rischio più grande del
    // beneficio per un vincolo che qui non impedirebbe comunque nulla di
    // concreto nel Duello Demo (il bot non ha Special Summon pianificate
    // in risposta a questa carta).
    // ================================================================
    CardEffects.register(140, {
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            let drawn = 0;
            while (hand.length < 3) {
                const before = hand.length;
                ctx.drawCards(ctx.owner, 1);
                if (hand.length === before) break; // Deck esaurito: sicurezza anti-loop
                drawn++;
            }
            ctx.gameState.noDamageFor = ctx.gameState.noDamageFor || {};
            ctx.gameState.noDamageFor[ctx.opponent] = true;
            ctx.gameState.discardHandAtEndPhaseFor = ctx.gameState.discardHandAtEndPhaseFor || {};
            ctx.gameState.discardHandAtEndPhaseFor[ctx.owner] = true;
            ctx.log(`💀 Carta della Rovina: ${ctx.owner === 'player' ? 'peschi' : 'il bot pesca'} ${drawn} cart${drawn === 1 ? 'a' : 'e'} fino a 3 in mano. ${ctx.opponent === 'player' ? 'Non subisci' : 'Il bot non subisce'} danni per il resto del turno, ma a fine turno la mano finisce al Cimitero!`);
        }
    });

    // ================================================================
    // Carte aggiunte dallo Starter Deck: Yugi (SDY, 2002) — Ansatsu (541),
    // Fantasma Arguto (542), Artiglio Raggiungente (543), Pagliaccio
    // Mistico (544), Fantasma Magico (547), Neo lo Spadaccino Magico
    // (551), Barone della Spada Demoniaca (552), Forziere Divoratore
    // (553), Stregone dei Dannati (554): tutti Mostri Normali (vanilla,
    // solo testo di flavor), nessuna registrazione necessaria — vedi
    // Guerriero Celtico (id 4) per lo stesso caso già presente.
    // ================================================================

    // ================================================================
    // 546 — Dian Keto la Maestra delle Cure (Magia Normale)
    // Aumenta i tuoi Life Points di 1000 punti.
    // ================================================================
    CardEffects.register(546, {
        activate(ctx) {
            ctx.dealDamage(ctx.owner, -1000);
            ctx.log('💊 Dian Keto la Maestra delle Cure aumenta i tuoi Life Points di 1000 punti!');
        }
    });

    // ================================================================
    // 548 — Attacco a Doppia Punta (Trappola Normale)
    // Scegli e distruggi 2 dei tuoi mostri e 1 mostro del tuo avversario.
    // SEMPLIFICAZIONE: nessuna UI di selezione multipla — distrugge da
    // sola i 2 propri mostri più deboli e quello avversario più forte
    // (stesso spirito "il motore sceglie" già usato per altre carte
    // "scegli N carte" in questo file).
    // ================================================================
    CardEffects.register(548, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).filter((s) => s).length >= 2 && ctx.field(ctx.opponent).some((s) => s);
        },
        activate(ctx) {
            const ownSlots = ctx.field(ctx.owner).map((s, i) => ({ s, i })).filter((x) => x.s);
            ownSlots.sort((a, b) => DuelEngine.getEffectiveAtk(a.s.card) - DuelEngine.getEffectiveAtk(b.s.card));
            ownSlots.slice(0, 2).forEach((x) => ctx.destroyMonster(ctx.owner, x.i));
            let bestOppIdx = -1;
            let bestOppCard = null;
            ctx.field(ctx.opponent).forEach((s, i) => {
                if (s && (!bestOppCard || DuelEngine.getEffectiveAtk(s.card) > DuelEngine.getEffectiveAtk(bestOppCard))) {
                    bestOppIdx = i;
                    bestOppCard = s.card;
                }
            });
            if (bestOppIdx !== -1) {
                const decl = ctx.declareTarget(ctx.opponent, bestOppIdx, { totalTargetCount: 1 });
                if (decl.allowed) ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            }
            ctx.log('⚔️ Attacco a Doppia Punta sacrifica 2 tuoi mostri per distruggere un mostro avversario!');
        }
    });

    // ================================================================
    // 549 — Rinforzi (Trappola Normale)
    // Scegli come bersaglio 1 mostro scoperto sul Terreno; guadagna 500
    // ATK fino alla fine di questo turno.
    // ================================================================
    CardEffects.register(549, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown));
        },
        activate(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((s) => { if (s && !s.isFaceDown) candidates.push(s.card); });
            });
            const boost = (card) => {
                ctx.grantTemporaryAtkDefBonus(card, 500, 0, false);
                ctx.log(`💪 Rinforzi aumenta l'ATK di ${card.name} di 500 punti!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                boost(candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '💪 Rinforzi',
                text: 'Scegli quale mostro rinforzare.',
                onSelect: boost
            });
        }
    });

    // ================================================================
    // 550 — Il Mistico Severo (effetto FLIP)
    // FLIP: rivela tutte le carte coperte sul Terreno (nessun effetto
    // FLIP si attiva), poi rimettile come prima.
    // SEMPLIFICAZIONE: nessun effetto di stato reale — in questo motore
    // ogni carta coperta è già "visibile" a livello di dati per entrambi
    // i giocatori (il Cimitero e le zone coperte non nascondono mai i
    // dati veri, solo l'aspetto a schermo), quindi una rivelazione
    // temporanea non cambierebbe nulla di concreto: resta un log di
    // sapore, coerente con l'effetto reale che comunque non muove
    // nessuna carta.
    // ================================================================
    CardEffects.register(550, {
        onFlip(ctx) {
            ctx.log('🔮 Il Mistico Severo rivela per un istante tutte le carte coperte sul Terreno.');
        }
    });

    // ================================================================
    // 555 — Ultima Volontà (Magia Normale)
    // Se un mostro sul tuo Terreno è stato mandato al tuo Cimitero: puoi
    // Special Summonare 1 mostro con 1500 ATK o meno dal tuo Deck, una
    // volta in questo turno. Poi rimescola il tuo Deck.
    // SEMPLIFICAZIONE: la condizione "mandato al Cimitero QUESTO turno"
    // diventa "hai almeno un mostro nel Cimitero" — il motore non
    // traccia ancora un evento generico "mostro mandato al Cimitero in
    // questo turno" (solo eventi specifici come ON_DESTROY), aggiungerlo
    // solo per questa carta non vale il rischio. Sceglie da sola il
    // mostro col ATK più alto entro il limite (nessuna UI dedicata).
    // ================================================================
    CardEffects.register(555, {
        canActivate(ctx) {
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster') && Array.isArray(deck) && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            if (!Array.isArray(deck)) { ctx.log('⚠️ Nessun Deck reale in questa modalità.'); return; }
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.log('⚠️ Il Terreno è pieno.'); return; }
            const candidates = deck.filter((c) => c.type === 'monster' && c.attack <= 1500);
            if (candidates.length === 0) { ctx.log('⚠️ Nessun mostro con 1500 ATK o meno nel Deck.'); return; }
            let best = candidates[0];
            candidates.forEach((c) => { if (c.attack > best.attack) best = c; });
            deck.splice(deck.indexOf(best), 1);
            ctx.specialSummon(ctx.owner, best, slotIndex, 'attack');
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            ctx.log(`💐 Ultima Volontà Special Summona ${best.name} dal Deck e lo rimescola!`);
        }
    });

    // ================================================================
    // 556 — Maestro delle Trappole (effetto FLIP)
    // FLIP: scegli 1 Trappola sul Terreno e distruggila.
    // ================================================================
    CardEffects.register(556, {
        onFlip(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (slot && slot.card.type === 'trap') candidates.push({ owner, index, card: slot.card });
                });
            });
            if (candidates.length === 0) { ctx.log('🪤 Maestro delle Trappole si rivela, ma non ci sono Trappole da distruggere.'); return; }
            const destroy = (choice) => {
                const slot = ctx.stField(choice.owner)[choice.index];
                if (!slot || slot.card.uid !== choice.card.uid) return;
                ctx.stField(choice.owner)[choice.index] = null;
                ctx.graveyard(choice.owner).push(choice.card);
                ctx.log(`🪤 Maestro delle Trappole distrugge ${choice.card.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                destroy(candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🪤 Maestro delle Trappole',
                text: 'Scegli quale Trappola distruggere.',
                onSelect: (card) => {
                    const choice = candidates.find((c) => c.card.uid === card.uid);
                    if (choice) destroy(choice);
                }
            });
        }
    });

    // ================================================================
    // 557 — Yami (Magia Terreno)
    // Tutti i mostri Tipo Demone e Incantatore sul Terreno guadagnano
    // 200 ATK/DEF; tutti i mostri Tipo Fata sul Terreno perdono 200
    // ATK/DEF. Stesso schema di Umi (id 497)/Un Oceano Leggendario (id 79).
    // ================================================================
    CardEffects.register(557, {
        continuous: true,
        activate(ctx) {
            ctx.log('🌑 Yami si scopre sul Terreno.');
        },
        static(ctx) {
            const boosted = ['Demone', 'Incantatore'];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const existing = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    if (boosted.includes(slot.card.race)) {
                        gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk + 200, def: existing.def + 200 };
                    } else if (slot.card.race === 'Fata') {
                        gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk - 200, def: existing.def - 200 };
                    }
                });
            });
        }
    });

    // ================================================================
    // 558 — Trappola Inversa / Reverse Trap
    // Fino alla End Phase, inverte tutte le modifiche ad ATK/DEF sul
    // Terreno (di entrambi i giocatori): gli aumenti diventano diminuzioni
    // e viceversa. Nuovo flag globale gameState.reverseAtkDefBonusUntilEndOfTurn,
    // letto da getEffectiveAtk/getEffectiveDef (duel-engine.js) per
    // invertire il segno della somma di gameState.atkDefBonus +
    // temporaryAtkDefBonus — le modifiche per moltiplicazione/divisione
    // (mai rappresentate come bonus additivo in questo motore) restano
    // correttamente non toccate, come da testo reale. Azzerato in
    // enterEndPhase() (game-flow.js), stesso punto di
    // clearTemporaryAtkDefBonus.
    // ================================================================
    CardEffects.register(558, {
        activate(ctx) {
            gameState.reverseAtkDefBonusUntilEndOfTurn = true;
            ctx.log('🔄 Trappola Inversa: tutte le modifiche ATK/DEF sul Terreno sono invertite fino alla End Phase!');
        }
    });

    // ================================================================
    // 559 — Offerta Suprema
    // Bypassa RIPETUTAMENTE il limite di 1 sola Evocazione Normale a
    // turno, pagando 500 LP ogni volta durante la propria Main Phase.
    // Nuovo
    // def.repeatableWhileContinuous (vedi canActivate, duel-engine.js):
    // eccezione puntuale che permette di ri-attivare questa Trappola
    // Continua più volte nello stesso turno invece del normale "già
    // attiva, non ri-attivabile". Riusa lo stesso bypass singolo già usato
    // da Dado di Evocazione (id 460): gameState.hasNormalSummoned = false.
    // La seconda finestra ("durante la Battle Phase del tuo avversario")
    // non aveva bisogno di una NUOVA interazione UI: onAttackDeclare
    // (qui sotto) è lo stesso identico aggancio già usato da ogni
    // Trappola che risponde a un attacco — findTriggerCandidates
    // (duel-engine.js) scansiona già lo stField SCOPERTO di chi subisce
    // l'attacco, indipendentemente da chi ha il turno (è proprio il
    // punto d'ingresso pensato per rispondere FUORI dal proprio turno) —
    // nota precedente corretta qui, con l'implementazione mancante.
    // Auto-applicata SENZA popup di scelta (a differenza di altre "puoi"
    // di questo file): resolveChain() (duel-engine.js) chiama ogni
    // handler di risposta dentro un while SINCRONO, prima di proseguire
    // con la risoluzione dell'attacco — un openChoicePopover qui
    // lascerebbe l'attacco risolversi PRIMA che il giocatore clicchi,
    // vanificando lo scopo pratico dell'effetto (rendersi bersaglio
    // legale in tempo). Auto-selezione: solo un mostro evocabile SENZA
    // Sacrificio (getTributesRequired === 0), sempre scoperto in
    // Posizione di Attacco.
    // ================================================================
    CardEffects.register(559, {
        continuous: true,
        repeatableWhileContinuous: true,
        canActivate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] < 500) return false;
            // findTriggerCandidates (duel-engine.js) applica questo STESSO
            // canActivate anche come filtro per la candidatura a
            // onAttackDeclare (bug reale scoperto/corretto qui: senza
            // questo bypass, il vincolo "propria Main Phase" qui sotto
            // escludeva SEMPRE questa carta dalla finestra di risposta
            // durante la Battle Phase avversaria, l'esatto momento in cui
            // dovrebbe invece poter rispondere). ctx.attackerIndex esiste
            // solo su un ctx derivato da un attacco (buildResponseCtx
            // preserva i campi del ctx originale) — il vincolo sul proprio
            // turno/Main Phase riguarda SOLO la riattivazione manuale
            // ripetuta, già bloccata a un livello più alto per il click
            // umano (vedi la nota storica su questa carta), quindi qui
            // serve solo per la decisione automatica del bot.
            if (typeof ctx.attackerIndex === 'number') return true;
            if (gameState.currentPlayer !== ctx.owner) return false;
            return gameState.phase === 'main1' || gameState.phase === 'main2';
        },
        activate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            gameState[lpKey] -= 500;
            gameState.hasNormalSummoned = false;
            ctx.log("💰 Offerta Suprema: paghi 500 LP e puoi Evocare Normalmente/Set un altro mostro!");
        },
        onAttackDeclare(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] < 500) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => {
                if (c.type !== 'monster' || c.extraDeck) return false;
                const cardDef = window.DuelEngine && DuelEngine.getDefinition(c.id);
                if (cardDef && cardDef.cannotNormalSummon) return false;
                return getTributesRequired(c) === 0;
            });
            if (handIndex === -1) return;
            gameState[lpKey] -= 500;
            const [card] = hand.splice(handIndex, 1);
            ctx.field(ctx.owner)[slotIndex] = { card: card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false, summonedOnTurn: gameState.turn };
            gameState.hasNormalSummoned = true;
            ctx.log(`💰 Offerta Suprema: paghi 500 LP ed Evochi ${card.name} durante la Battle Phase avversaria!`);
            DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, DuelEngine.makeContext(ctx.owner, { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: 'attack' }));
        }
    });

    // ================================================================
    // Carte aggiunte dallo Starter Deck: Kaiba (SDK, 2002) — Uraby (561),
    // Gyakutenno Megami (562), Terra il Terribile (563), Titano Oscuro
    // del Terrore (564), Maestro e Allievo (565), Guerriero Sconosciuto
    // del Demone (566), Orco dell'Ombra Nera (567), Golem Distruttore
    // (571), Uccello Rosso Teschio (572), D. Human (573), Bestia Pallida
    // (574): tutti Mostri Normali (vanilla, solo testo di flavor),
    // nessuna registrazione necessaria.
    // ================================================================

    // ================================================================
    // 560 — La Malvagia Bestia Verme / The Wicked Worm Beast (Effetto)
    // Questa carta scoperta sul Terreno torna in mano al proprietario
    // durante la tua End Phase.
    // ================================================================
    CardEffects.register(560, {
        onEndPhase(ctx) {
            ctx.returnMonsterToHand(ctx.owner, ctx.slotIndex);
            ctx.log('🪱 La Malvagia Bestia Verme torna in mano durante la End Phase!');
        }
    });

    // ================================================================
    // 568 — Energia Oscura / Dark Energy (Magia Equipaggiamento)
    // Equipaggiabile solo a un mostro Tipo Demone. +300 ATK/DEF.
    // ================================================================
    CardEffects.register(568, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Demone') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.race === 'Demone'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 300, def: e.def + 300 };
        }
    });

    // ================================================================
    // 570 — Ookazi (Magia Normale)
    // Infliggi 800 danni al tuo avversario.
    // ================================================================
    CardEffects.register(570, {
        activate(ctx) {
            ctx.dealDamage(ctx.opponent, 800);
            ctx.log('🔥 Ookazi infligge 800 danni al tuo avversario!');
        }
    });

    // ================================================================
    // 575 — La Spia Inesperta / The Inexperienced Spy (Magia Normale)
    // Scegli e guarda 1 carta nella mano del tuo avversario.
    // SEMPLIFICAZIONE: la vera regola lascia scegliere QUALE carta (senza
    // saperne il contenuto prima); qui la carta rivelata è presa a caso
    // dalla mano dell'avversario. Visibile solo se sei tu (il giocatore)
    // ad attivarla: se è il bot a "sbirciare" la tua mano, non ti viene
    // mostrato quale carta ha visto (altrimenti sapresti sempre qual è).
    // ================================================================
    CardEffects.register(575, {
        canActivate(ctx) { return ctx.hand(ctx.opponent).length > 0; },
        activate(ctx) {
            const hand = ctx.hand(ctx.opponent);
            if (hand.length === 0) return;
            const card = hand[Math.floor(Math.random() * hand.length)];
            if (ctx.owner === 'player' && window.DuelEngineUI) {
                window.DuelEngineUI.openCardListPicker([card], {
                    title: '🕵️ La Spia Inesperta',
                    text: 'Hai sbirciato questa carta nella mano del tuo avversario:',
                    selectable: false
                });
            }
            ctx.log(ctx.owner === 'player' ? '🕵️ Sbirci una carta nella mano del bot.' : '🕵️ Il bot sbircia una carta nella tua mano.');
        }
    });

    // ================================================================
    // 576 — Telescopio Antico / Ancient Telescope (Magia Normale)
    // Guarda le prime 5 carte del Deck del tuo avversario. Rimettile nel
    // Deck nello stesso ordine (non le tocca davvero: solo un'occhiata).
    // ================================================================
    CardEffects.register(576, {
        canActivate(ctx) {
            const deck = ctx.gameState[ctx.opponent === 'player' ? 'playerDeck' : 'botDeck'];
            return Array.isArray(deck) && deck.length > 0;
        },
        activate(ctx) {
            const deck = ctx.gameState[ctx.opponent === 'player' ? 'playerDeck' : 'botDeck'];
            if (!Array.isArray(deck) || deck.length === 0) { ctx.log('⚠️ Nessun Deck reale in questa modalità.'); return; }
            const top5 = deck.slice(Math.max(0, deck.length - 5)).slice().reverse();
            if (ctx.owner === 'player' && window.DuelEngineUI) {
                window.DuelEngineUI.openCardListPicker(top5, {
                    title: '🔭 Telescopio Antico',
                    text: 'Le prime 5 carte del Deck del tuo avversario (rimesse a posto subito dopo averle viste):',
                    selectable: false
                });
            }
            ctx.log(ctx.owner === 'player' ? '🔭 Guardi le prime 5 carte del Deck del bot.' : '🔭 Il bot guarda le prime 5 carte del tuo Deck.');
        }
    });

    // ================================================================
    // 577 — Giusto Dessert / Just Desserts (Trappola Normale)
    // Infliggi 500 danni al tuo avversario per ogni mostro che controlla.
    // ================================================================
    CardEffects.register(577, {
        canActivate(ctx) { return ctx.field(ctx.opponent).some((s) => s); },
        activate(ctx) {
            const count = ctx.field(ctx.opponent).filter((s) => s).length;
            const damage = count * 500;
            ctx.dealDamage(ctx.opponent, damage);
            ctx.log(`🍽️ Giusto Dessert infligge ${damage} danni (${count} mostri controllati)!`);
        }
    });

    // ================================================================
    // 578 — Il Flauto per Evocare Draghi / The Flute of Summoning Dragon
    // (Magia Normale)
    // Special Summon fino a 2 mostri Tipo Drago dalla tua mano. "Signore
    // dei D." (id 353) deve essere sul Terreno per attivare e risolvere
    // questo effetto.
    // SEMPLIFICAZIONE: sceglie da sola i primi 2 Draghi trovati in mano
    // (nessuna UI di selezione multipla).
    // ================================================================
    CardEffects.register(578, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.id === 353)
                && ctx.hand(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Drago');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const dragons = hand.filter((c) => c.type === 'monster' && c.race === 'Drago').slice(0, 2);
            let summonedCount = 0;
            dragons.forEach((card) => {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) return;
                const idx = hand.indexOf(card);
                if (idx !== -1) hand.splice(idx, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                summonedCount++;
            });
            ctx.log(`🎺 Il Flauto per Evocare Draghi Special Summona ${summonedCount} mostro${summonedCount === 1 ? '' : 'i'} Tipo Drago!`);
        }
    });

    // ================================================================
    // 579 — Misterioso Burattinaio / Mysterious Puppeteer (Effetto)
    // Ogni volta che tu o il tuo avversario Evocate Normalmente o girate
    // scoperto (Flip Summon) un mostro, aumenta i tuoi Life Points di 500
    // punti. Usa il nuovo aggancio onAnyNormalOrFlipSummon (duel-engine.js).
    // ================================================================
    CardEffects.register(579, {
        onAnyNormalOrFlipSummon(ctx) {
            ctx.dealDamage(ctx.owner, -500);
            ctx.log('🎭 Misterioso Burattinaio aumenta i tuoi Life Points di 500 punti!');
        }
    });

    // ================================================================
    // 580 — Sogen (Magia Terreno)
    // Tutti i mostri Tipo Guerriero e Guerriero Bestia sul Terreno
    // guadagnano 200 ATK/DEF. Stesso schema di Umi (id 497)/Yami (id 557).
    // ================================================================
    CardEffects.register(580, {
        continuous: true,
        activate(ctx) {
            ctx.log('🏯 Sogen si scopre sul Terreno.');
        },
        static(ctx) {
            const boosted = ['Guerriero', 'Guerriero Bestia'];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || !boosted.includes(slot.card.race)) return;
                    const existing = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk + 200, def: existing.def + 200 };
                });
            });
        }
    });

    // ================================================================
    // 581 — Hane-Hane (effetto FLIP)
    // FLIP: scegli 1 mostro sul Terreno e rimandalo in mano al suo
    // proprietario.
    // ================================================================
    CardEffects.register(581, {
        onFlip(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !(owner === ctx.owner && index === ctx.slotIndex)) candidates.push({ owner, index, card: slot.card });
                });
            });
            if (candidates.length === 0) { ctx.log('🐙 Hane-Hane si rivela, ma non c\'è nessun altro mostro da rimandare in mano.'); return; }
            const bounce = (choice) => {
                const slot = ctx.field(choice.owner)[choice.index];
                if (!slot || slot.card.uid !== choice.card.uid) return;
                ctx.field(choice.owner)[choice.index] = null;
                ctx.hand(choice.owner).push(choice.card);
                ctx.log(`🐙 Hane-Hane rimanda ${choice.card.name} in mano!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                let best = candidates[0];
                candidates.forEach((c) => { if (DuelEngine.getEffectiveAtk(c.card) > DuelEngine.getEffectiveAtk(best.card)) best = c; });
                bounce(best);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🐙 Hane-Hane',
                text: 'Scegli quale mostro rimandare in mano al suo proprietario.',
                onSelect: (card) => {
                    const choice = candidates.find((c) => c.card.uid === card.uid);
                    if (choice) bounce(choice);
                }
            });
        }
    });

    // ================================================================
    // Carte aggiunte dallo Starter Deck: Joey (SDJ, 2002) — Tartaruga
    // Isola (582), Pesce dai 7 Colori (583), Soldato di Fuoco Oscuro #1
    // (584), Esploratore del Cielo (585): tutti Mostri Normali (vanilla,
    // solo testo di flavor), nessuna registrazione necessaria.
    // ================================================================

    // ================================================================
    // 586 — Uomo Karate (effetto Ignition)
    // Puoi raddoppiare l'ATK originale di questa carta una volta per
    // turno. Se usi questo effetto, distruggi questa carta durante la
    // End Phase. Nessun canActivate: il vincolo "una volta per turno" è
    // già garantito da gameState.usedIgnitionThisTurn (duel-engine.js),
    // applicato automaticamente ad ogni Effetto Ignition da un mostro.
    // ================================================================
    CardEffects.register(586, {
        activate(ctx) {
            ctx.grantTemporaryAtkDefBonus(ctx.card, ctx.card.attack, 0, true);
            ctx.log("🥋 Uomo Karate raddoppia il proprio ATK, ma verrà distrutto a fine turno!");
        }
    });

    // ================================================================
    // 587 — Milus Radiant (buff continuo)
    // Finché resta scoperta sul Terreno, aumenta di 500 punti l'ATK di
    // tutti i mostri Tipo TERRA e diminuisce di 400 punti l'ATK di tutti
    // i mostri Tipo VENTO — se stessa compresa (è Tipo TERRA).
    // ================================================================
    CardEffects.register(587, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const existing = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    if (slot.card.attribute === 'TERRA') {
                        gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk + 500, def: existing.def };
                    } else if (slot.card.attribute === 'VENTO') {
                        gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk - 400, def: existing.def };
                    }
                });
            });
        }
    });

    // ================================================================
    // 588 — Maga della Fede / Magician of Faith (effetto FLIP)
    // FLIP: scegli come bersaglio 1 Magia nel tuo Cimitero; aggiungila
    // alla tua mano.
    // ================================================================
    CardEffects.register(588, {
        onFlip(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const candidates = grave.filter((c) => c.type === 'spell');
            if (candidates.length === 0) { ctx.log('🔮 Maga della Fede si rivela, ma non ci sono Magie nel Cimitero.'); return; }
            const addToHand = (card) => {
                const idx = grave.indexOf(card);
                if (idx === -1) return;
                grave.splice(idx, 1);
                ctx.hand(ctx.owner).push(card);
                ctx.log(`🔮 Maga della Fede aggiunge ${card.name} alla mano!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                addToHand(candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '🔮 Maga della Fede',
                text: 'Scegli 1 Magia dal Cimitero da aggiungere alla mano.',
                onSelect: addToHand
            });
        }
    });

    // ================================================================
    // 589 — Grande Occhio / Big Eye (effetto FLIP)
    // FLIP: guarda fino a 5 carte dalla cima del tuo Deck, poi rimettile
    // in cima al Deck in qualsiasi ordine.
    // SEMPLIFICAZIONE: solo un'occhiata informativa, nessun riordino
    // (le carte tornano nello stesso ordine) — stesso spirito di
    // Telescopio Antico (id 576).
    // ================================================================
    CardEffects.register(589, {
        onFlip(ctx) {
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            if (!Array.isArray(deck) || deck.length === 0) { ctx.log('⚠️ Nessun Deck reale in questa modalità.'); return; }
            const top5 = deck.slice(Math.max(0, deck.length - 5)).slice().reverse();
            if (ctx.owner === 'player' && window.DuelEngineUI) {
                window.DuelEngineUI.openCardListPicker(top5, {
                    title: '👁️ Grande Occhio',
                    text: 'Le prime 5 carte del tuo Deck (restano nello stesso ordine):',
                    selectable: false
                });
            }
            ctx.log('👁️ Grande Occhio guarda le prime 5 carte del Deck.');
        }
    });

    // ================================================================
    // 590 — Principessa di Tsurugi / Princess of Tsurugi (effetto FLIP)
    // FLIP: infliggi 500 danni al tuo avversario per ogni Magia e
    // Trappola sul suo Terreno (Magia Terreno inclusa).
    // ================================================================
    CardEffects.register(590, {
        onFlip(ctx) {
            const fieldSpellKey = ctx.opponent === 'player' ? 'playerFieldSpell' : 'botFieldSpell';
            const count = ctx.stField(ctx.opponent).filter((s) => s).length + (ctx.gameState[fieldSpellKey] ? 1 : 0);
            if (count === 0) return;
            const damage = count * 500;
            ctx.dealDamage(ctx.opponent, damage);
            ctx.log(`👸 Principessa di Tsurugi infligge ${damage} danni!`);
        }
    });

    // ================================================================
    // 591 — Cappello Magico Bianco / White Magical Hat (Effetto)
    // Quando questa carta infligge danno da Battaglia ai Life Points del
    // tuo avversario, il tuo avversario scarta 1 carta a caso dalla
    // propria mano. Usa il nuovo aggancio onDealsBattleDamage (actions.js
    // — resolveBattleDamage, chiamato solo nei due rami più comuni: vinci
    // in Posizione di Attacco, o perfori in Posizione di Difesa).
    // ================================================================
    CardEffects.register(591, {
        onDealsBattleDamage(ctx) {
            const discarded = ctx.discardRandomFromHand(ctx.opponent);
            if (!discarded) return;
            ctx.log(`🎩 Cappello Magico Bianco costringe ${ctx.opponent === 'player' ? 'te' : 'il bot'} a scartare 1 carta a caso!`);
        }
    });

    // ================================================================
    // 592 — Soldato Pinguino / Penguin Soldier (effetto FLIP)
    // FLIP: puoi scegliere come bersaglio fino a 2 mostri sul Terreno;
    // riportali in mano. SEMPLIFICAZIONE: 1 solo bersaglio invece di
    // "fino a 2" (nessuna UI di selezione multipla).
    // ================================================================
    CardEffects.register(592, {
        onFlip(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot) candidates.push({ owner, index, card: slot.card });
                });
            });
            if (candidates.length === 0) { ctx.log('🐧 Soldato Pinguino si rivela, ma non c\'è nessun mostro da rimandare in mano.'); return; }
            const bounce = (choice) => {
                const slot = ctx.field(choice.owner)[choice.index];
                if (!slot || slot.card.uid !== choice.card.uid) return;
                ctx.field(choice.owner)[choice.index] = null;
                ctx.hand(choice.owner).push(choice.card);
                ctx.log(`🐧 Soldato Pinguino rimanda ${choice.card.name} in mano!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                let best = candidates.find((c) => c.owner === ctx.opponent) || candidates[0];
                candidates.forEach((c) => { if (c.owner === ctx.opponent && DuelEngine.getEffectiveAtk(c.card) > DuelEngine.getEffectiveAtk(best.card)) best = c; });
                bounce(best);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🐧 Soldato Pinguino',
                text: 'Scegli quale mostro rimandare in mano al suo proprietario.',
                onSelect: (card) => {
                    const choice = candidates.find((c) => c.card.uid === card.uid);
                    if (choice) bounce(choice);
                }
            });
        }
    });

    // ================================================================
    // 594 — Coccola Malevola / Malevolent Nuzzler (Magia Equipaggiamento)
    // Il mostro equipaggiato guadagna 700 ATK.
    // SEMPLIFICAZIONE: manca "quando mandata al Cimitero: paga 500 LP per
    // rimetterla in cima al Deck" — resta solo il bonus ATK di base,
    // stesso limite già documentato per le altre Carte Equipaggiamento.
    // ================================================================
    CardEffects.register(594, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 700, def: e.def };
        }
    });

    // ================================================================
    // 595 — Il Guardiano Affidabile / The Reliable Guardian (Magia Rapida)
    // Aumenta di 700 punti la DEF di 1 mostro scoperto, fino alla fine
    // di questo turno.
    // ================================================================
    CardEffects.register(595, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown));
        },
        activate(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((s) => { if (s && !s.isFaceDown) candidates.push(s.card); });
            });
            const boost = (card) => {
                ctx.grantTemporaryAtkDefBonus(card, 0, 700, false);
                ctx.log(`🛡️ Il Guardiano Affidabile aumenta la DEF di ${card.name} di 700 punti!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                boost(candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '🛡️ Il Guardiano Affidabile',
                text: 'Scegli quale mostro rinforzare.',
                onSelect: boost
            });
        }
    });

    // ================================================================
    // 596 — Montagna / Mountain (Magia Terreno)
    // Tutti i mostri Tipo Drago, Bestia Alata e Tuono sul Terreno
    // guadagnano 200 ATK/DEF. Stesso schema di Umi (id 497)/Yami (id 557)/
    // Sogen (id 580).
    // ================================================================
    CardEffects.register(596, {
        continuous: true,
        activate(ctx) {
            ctx.log('⛰️ Montagna si scopre sul Terreno.');
        },
        static(ctx) {
            const boosted = ['Drago', 'Bestia Alata', 'Tuono'];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || !boosted.includes(slot.card.race)) return;
                    const existing = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk + 200, def: existing.def + 200 };
                });
            });
        }
    });

    // ================================================================
    // 597 — Tesoro del Drago / Dragon Treasure (Magia Equipaggiamento)
    // Equipaggiabile solo a un mostro Tipo Drago. +300 ATK/DEF.
    // ================================================================
    CardEffects.register(597, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Drago') !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.race === 'Drago'); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 300, def: e.def + 300 };
        }
    });

    // ================================================================
    // 598 — Riposo Eterno / Eternal Rest (Magia Normale)
    // Distruggi tutti i mostri equipaggiati con Magie Equipaggiamento.
    // ================================================================
    CardEffects.register(598, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.stField(owner).some((s) => s && !s.isFaceDown && DuelEngine.getDefinition(s.card.id)?.isEquip));
        },
        activate(ctx) {
            const equippedUids = new Set();
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && DuelEngine.getDefinition(slot.card.id)?.isEquip) {
                        equippedUids.add(slot.card.equippedToUid);
                    }
                });
            });
            let destroyedCount = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && equippedUids.has(slot.card.uid)) {
                        ctx.destroyMonster(owner, index);
                        destroyedCount++;
                    }
                });
            });
            ctx.log(`⚰️ Riposo Eterno distrugge ${destroyedCount} mostro${destroyedCount === 1 ? '' : 'i'} equipaggiato${destroyedCount === 1 ? '' : 'i'}!`);
        }
    });

    // ================================================================
    // 599 — Sette Attrezzi del Bandito / Seven Tools of the Bandit
    // (Trappola Contatore)
    // Quando una Trappola viene attivata: paga 1000 Life Points; annulla
    // l'attivazione, e se lo fai, distruggila. Stesso meccanismo di
    // negazione di Giudizio Solenne (id 448), ma ristretto alle sole
    // Trappole (ctx.negateActivation() in duel-engine.js).
    // ================================================================
    CardEffects.register(599, {
        canActivate(ctx) {
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'trap');
        },
        activate(ctx) {
            const cost = 1000;
            ctx.dealDamage(ctx.owner, cost);
            if (ctx.negateActivation()) {
                ctx.log(`✂️ Sette Attrezzi del Bandito paga ${cost} Life Points e annulla l'attivazione della Trappola!`);
            } else {
                ctx.log(`✂️ Sette Attrezzi del Bandito paga ${cost} Life Points, ma non c'era più nulla da annullare.`);
            }
        }
    });

    // ================================================================
    // 600 — Trappola Fasulla / Fake Trap
    // "Quando l'avversario attiverebbe un effetto che distruggerebbe 1+
    // Trappole che controlli: distruggi questa carta al loro posto" —
    // nuovo def.redirectsTrapDestroyToSelf (opt-in per-carta), controllato
    // direttamente dentro ACTIONS.destroySpellTrap (duel-engine.js) PRIMA
    // di distruggere davvero il bersaglio originale, non tramite Chain
    // manuale (mai passata da activate(), come ogni altra carta puramente
    // reattiva in questo file). Resta sempre COPERTA finché non scatta —
    // rispetta anche il divieto di rispondere nel turno in cui è stata
    // Set, stesso controllo di ogni Trappola normale.
    // SEMPLIFICAZIONE: protegge solo il primo bersaglio colpito da un
    // effetto che ne distrugge più di uno nella stessa attivazione — vedi
    // il commento su destroySpellTrap in duel-engine.js.
    // ================================================================
    CardEffects.register(600, {
        redirectsTrapDestroyToSelf: true
    });

    // ================================================================
    // 143 — Mura del Castello / Castle Walls (Trappola Normale)
    // Aumenta di 500 punti la DEF di 1 mostro scoperto sul Terreno, fino
    // alla fine di questo turno. Stesso schema di Rinforzi (id 549), solo
    // DEF invece di ATK.
    // SCOPERTA: questa carta non aveva ancora nessuna registrazione (già
    // inclusa sia nello Starter Deck: Yugi che nello Starter Deck: Kaiba
    // senza che l'assenza dell'effetto fosse mai emersa — stesso genere
    // di svista già trovato per Umi, id 497).
    // ================================================================
    CardEffects.register(143, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown));
        },
        activate(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((s) => { if (s && !s.isFaceDown) candidates.push(s.card); });
            });
            const boost = (card) => {
                ctx.grantTemporaryAtkDefBonus(card, 0, 500, false);
                ctx.log(`🏰 Mura del Castello aumenta la DEF di ${card.name} di 500 punti!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                boost(candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '🏰 Mura del Castello',
                text: 'Scegli quale mostro rinforzare.',
                onSelect: boost
            });
        }
    });

    // ================================================================
    // 116 — Rito dell'Illusione Nera / Black Illusion Ritual (Magia
    // Rituale) — Ritual Summon di Abbandonato (id 416) dalla mano.
    // SEMPLIFICAZIONE: stesso spirito di Rito del Guerriero Nero (id 56)/
    // Rituale del Drago Bianco (id 506) — sacrifica in automatico dal
    // PROPRIO Terreno i mostri con Livello più alto finché il totale
    // richiesto (4) non è raggiunto, invece di lasciar scegliere; manca
    // anche la possibilità reale di sacrificare mostri dal Terreno
    // dell'AVVERSARIO (la vera Black Illusion Ritual lo permette) e il
    // divieto di usare mostri Fusione/Rituale/Special Summonati come
    // sacrificio.
    // NOTA: questa Magia esisteva già nel database ma non era mai stata
    // registrata — la nota su Abbandonato (id 416) affermava erroneamente
    // che "nessuna Magia Rituale associata è presente in questo database",
    // quando in realtà lo era, semplicemente dimenticata (stesso genere di
    // svista già trovato per Umi/Mura del Castello). Corretta qui,
    // aggiungendo lo Starter Deck: Pegasus che la include davvero.
    // ================================================================
    CardEffects.register(116, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 416);
            if (!hasRitualMonster) return false;
            const totalLevel = ctx.field(ctx.owner).reduce((sum, slot) => sum + (slot ? (slot.card.level || 0) : 0), 0);
            return totalLevel >= 4;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field
                .map((slot, index) => (slot ? { index, level: slot.card.level || 0 } : null))
                .filter(Boolean)
                .sort((a, b) => b.level - a.level);

            let remaining = 4;
            const toSacrifice = [];
            occupied.forEach((entry) => {
                if (remaining <= 0) return;
                toSacrifice.push(entry.index);
                remaining -= entry.level;
            });
            toSacrifice.forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.id === 416);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Abbandonato finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('👹 Rito dell\'Illusione Nera evoca Abbandonato!');
        }
    });

    // ================================================================
    // 123 — Drago Toon Occhi Blu / Blue-Eyes Toon Dragon (Special
    // Summon dalla mano) — stesso schema Toon di Sirena Toon (id 484)/
    // Teschio Evocato Toon (id 486), ma sacrificando 2 mostri invece di 1.
    // NOTA: la carta esisteva già con l'effetto descritto in `effect` ma
    // senza ALCUNA registrazione (mai davvero attivabile) — stesso genere
    // di svista già trovato per Umi/Mura del Castello, qui scoperta
    // durante l'aggiunta dello Starter Deck: Pegasus, che la include.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunti l'attacco diretto mancante
    // (gameState.directAttackAllowedFor, stesso schema di Manga Ryu-Ran
    // id 606), requiresToonWorld: true (distrutta anche lei se Mondo
    // dei Toon lascia il Terreno — vedi onDestroy su id 487 qui sopra),
    // il divieto di attaccare nel turno di Special Summon
    // (cannotAttackTurnSummoned, resolveAttack in actions.js) e il costo
    // di 500 LP per attaccare (requiresLifePointsToAttack, executeAttack/
    // botPerformAttacks) — stessa mancanza già corretta per id 484/486/606.
    CardEffects.register(123, {
        cannotNormalSummon: true,
        requiresToonWorld: true,
        cannotAttackTurnSummoned: true,
        requiresLifePointsToAttack: 500,
        canSpecialSummonFromHand(ctx) {
            const hasToonWorld = ctx.stField(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 487);
            const tributes = ctx.field(ctx.owner).filter((slot) => slot).length;
            return hasToonWorld && tributes >= 2;
        },
        paySpecialSummonCost(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field.map((slot, index) => (slot ? index : null)).filter((i) => i !== null);
            if (occupied.length < 2) return false;
            occupied.slice(0, 2).forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });
            ctx.log('🐉 Drago Toon Occhi Blu sacrifica 2 mostri per essere Special Summonato!');
            return true;
        },
        static(ctx) {
            gameState.directAttackAllowedFor = gameState.directAttackAllowedFor || {};
            gameState.directAttackAllowedFor[ctx.card.uid] = true;
        }
    });

    // ================================================================
    // 606 — Manga Ryu-Ran (Toon) — identico schema di Drago Toon Occhi
    // Blu (id 123) qui sopra: Special Summon dalla mano sacrificando 2
    // mostri, mentre si controlla "Mondo dei Toon" (id 487).
    // requiresToonWorld: true già presente (distrutta anche lei se Mondo
    // dei Toon lascia il Terreno). cannotAttackTurnSummoned/
    // requiresLifePointsToAttack come id 123/484/486.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunta la clausola mancante "può attaccare
    // direttamente" (gameState.directAttackAllowedFor, ri-concesso ad
    // ogni render via static() perché quel flag si azzera da solo ad
    // ogni cambio turno). "Se l'avversario controlla un mostro Toon, deve
    // invece bersagliare un mostro Toon": def.mustTargetFilterIfPresent
    // (nuovo aggancio generico, resolveAttack/actions.js), consultato
    // anche lato bot in botPerformAttacks (bot.js).
    CardEffects.register(606, {
        cannotNormalSummon: true,
        requiresToonWorld: true,
        cannotAttackTurnSummoned: true,
        requiresLifePointsToAttack: 500,
        canSpecialSummonFromHand(ctx) {
            const hasToonWorld = ctx.stField(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 487);
            const tributes = ctx.field(ctx.owner).filter((slot) => slot).length;
            return hasToonWorld && tributes >= 2;
        },
        paySpecialSummonCost(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field.map((slot, index) => (slot ? index : null)).filter((i) => i !== null);
            if (occupied.length < 2) return false;
            occupied.slice(0, 2).forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });
            ctx.log('🐲 Manga Ryu-Ran sacrifica 2 mostri per essere Special Summonato!');
            return true;
        },
        // "Se l'avversario controlla un mostro Toon, deve invece
        // bersagliare un mostro Toon" (mustTargetFilterIfPresent,
        // resolveAttack/actions.js) — "Toon" qui è la stessa convenzione
        // sul nome già usata altrove in questo file (isToon, vedi id 482).
        mustTargetFilterIfPresent(card) { return card.type === 'monster' && card.name.includes('Toon'); },
        static(ctx) {
            gameState.directAttackAllowedFor = gameState.directAttackAllowedFor || {};
            gameState.directAttackAllowedFor[ctx.card.uid] = true;
        }
    });

    // ================================================================
    // 601 — Uccello Sonico / Sonic Bird — Quando Evocata Normalmente o
    // Girata Scoperta: cerca 1 Magia Rituale nel Deck e aggiungila alla
    // mano. Stesso schema di ricerca nel Deck di Strega della Foresta
    // Nera (id 508), qui agganciato a onSummon (solo Evocazione Normale,
    // MAI Special Summon — vedi ctx.summonedVia) e a onFlip.
    // ================================================================
    (function () {
        function searchRitualSpellToHand(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'spell' && c.subtype === 'ritual');
            if (index === -1) {
                ctx.log('🐦 Uccello Sonico cerca, ma non trova Magie Rituali nel Deck.');
                return;
            }
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.hand(ctx.owner).push(card);
            ctx.log(`🐦 Uccello Sonico aggiunge ${card.name} alla mano dal Deck!`);
        }
        CardEffects.register(601, {
            onSummon(ctx) {
                if (ctx.summonedVia !== 'normal') return;
                searchRitualSpellToHand(ctx);
            },
            onFlip(ctx) {
                searchRitualSpellToHand(ctx);
            }
        });
    })();

    // ================================================================
    // 602 — Maschera dell'Oscurità / Mask of Darkness (effetto FLIP)
    // FLIP: scegli come bersaglio 1 Trappola nel proprio Cimitero;
    // aggiungila alla mano.
    // SEMPLIFICAZIONE: sceglie da sola la prima Trappola trovata nel
    // Cimitero, invece di un'interfaccia di selezione dedicata.
    // ================================================================
    CardEffects.register(602, {
        onFlip(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'trap');
            if (index === -1) {
                ctx.log('🎭 Maschera dell\'Oscurità si rivela, ma non c\'è nessuna Trappola nel Cimitero.');
                return;
            }
            const card = grave.splice(index, 1)[0];
            ctx.hand(ctx.owner).push(card);
            ctx.log(`🎭 Maschera dell'Oscurità recupera ${card.name} dal Cimitero!`);
        }
    });

    // ================================================================
    // 603 — Muka Muka (effetto continuo statico)
    // Guadagna 300 ATK e 300 DEF per ogni carta nella propria mano.
    // ================================================================
    CardEffects.register(603, {
        static(ctx) {
            const handSize = ctx.hand(ctx.owner).length;
            gameState.atkDefBonus[ctx.card.uid] = { atk: handSize * 300, def: handSize * 300 };
        }
    });

    // ================================================================
    // 604 — Ninja Armato / Armed Ninja (effetto FLIP)
    // FLIP: scegli come bersaglio 1 Magia sul Terreno (anche Set: si
    // rivela, e si distrugge solo se è davvero una Magia). Stesso schema
    // di ricerca bersaglio di Rimuovi Magia (id 195).
    // ================================================================
    CardEffects.register(604, {
        onFlip(ctx) {
            const candidates = [];
            [ctx.owner, ctx.opponent].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (slot && (slot.card.type === 'spell' || slot.isFaceDown)) candidates.push({ owner, index, card: slot.card });
                });
            });
            if (candidates.length === 0) {
                ctx.log('🥷 Ninja Armato si rivela, ma non c\'è nessuna Magia da colpire.');
                return;
            }
            const destroy = (choice) => {
                const slot = ctx.stField(choice.owner)[choice.index];
                if (!slot || slot.card.uid !== choice.card.uid) return;
                if (slot.isFaceDown) {
                    slot.isFaceDown = false;
                    ctx.log(`🔎 Ninja Armato rivela ${choice.card.name}!`);
                }
                if (choice.card.type !== 'spell') {
                    ctx.log(`🥷 Ninja Armato non ha effetto: ${choice.card.name} non è una Magia.`);
                    return;
                }
                ctx.stField(choice.owner)[choice.index] = null;
                ctx.graveyard(choice.owner).push(choice.card);
                ctx.log(`🥷 Ninja Armato distrugge ${choice.card.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                const faceUpSpell = candidates.find((c) => c.card.type === 'spell' && !ctx.stField(c.owner)[c.index].isFaceDown);
                destroy(faceUpSpell || candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🥷 Ninja Armato',
                text: 'Scegli 1 Magia scoperta, o 1 carta Set, da colpire.',
                onSelect: (card) => {
                    const choice = candidates.find((c) => c.card.uid === card.uid);
                    if (choice) destroy(choice);
                }
            });
        }
    });

    // ================================================================
    // 605 — Esploratore Ombra di Hiro / Hiro's Shadow Scout (effetto
    // FLIP)
    // FLIP: il tuo avversario pesca 3 carte; entrambi le guardano; se tra
    // queste ci sono Magie, l'avversario le scarta tutte nel Cimitero.
    // ================================================================
    CardEffects.register(605, {
        onFlip(ctx) {
            const oppHand = ctx.hand(ctx.opponent);
            const before = oppHand.length;
            ctx.drawCards(ctx.opponent, 3);
            const drawn = oppHand.slice(before);
            const spells = drawn.filter((c) => c.type === 'spell');
            if (spells.length === 0) {
                ctx.log('👤 Esploratore Ombra di Hiro: nessuna Magia tra le carte pescate dall\'avversario.');
                return;
            }
            spells.forEach((card) => {
                const index = oppHand.indexOf(card);
                if (index !== -1) {
                    oppHand.splice(index, 1);
                    ctx.graveyard(ctx.opponent).push(card);
                }
            });
            ctx.log(`👤 Esploratore Ombra di Hiro scarta ${spells.length} Magi${spells.length === 1 ? 'a' : 'e'} pescat${spells.length === 1 ? 'a' : 'e'} dall'avversario!`);
        }
    });

    // ================================================================
    // 607 — Tifone dello Spazio Mistico / Mystical Space Typhoon (Magia
    // Rapida) — Scegli come bersaglio 1 Magia/Trappola sul Terreno (anche
    // Set); distruggila incondizionatamente (a differenza di Rimuovi
    // Magia/id 195, funziona anche sulle Trappole).
    // NOTA: questa carta è esattamente il tipo di "distrugge una Trappola
    // Set" che renderebbe attivabile Trappola Fasulla (id 600) — per ora
    // Trappola Fasulla resta comunque senza registrazione (deciso insieme
    // all'utente di rimandarla), ma il meccanismo generico che servirebbe
    // (un ctx.redirectTrapDestruction()-style hook) resta annotato lì.
    // ================================================================
    CardEffects.register(607, {
        canActivate(ctx) {
            return [ctx.owner, ctx.opponent].some((owner) => ctx.stField(owner).some((slot) => slot));
        },
        activate(ctx) {
            const candidates = [];
            [ctx.owner, ctx.opponent].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (slot) candidates.push({ owner, index, card: slot.card });
                });
            });
            if (candidates.length === 0) return;
            const destroy = (choice) => {
                const slot = ctx.stField(choice.owner)[choice.index];
                if (!slot || slot.card.uid !== choice.card.uid) return;
                if (slot.isFaceDown) {
                    slot.isFaceDown = false;
                    ctx.log(`🔎 Tifone dello Spazio Mistico rivela ${choice.card.name}!`);
                }
                ctx.stField(choice.owner)[choice.index] = null;
                ctx.graveyard(choice.owner).push(choice.card);
                ctx.log(`🌪️ Tifone dello Spazio Mistico distrugge ${choice.card.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                const oppCandidate = candidates.find((c) => c.owner === ctx.opponent);
                destroy(oppCandidate || candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🌪️ Tifone dello Spazio Mistico',
                text: 'Scegli 1 Magia/Trappola, scoperta o Set, da distruggere.',
                onSelect: (card) => {
                    const choice = candidates.find((c) => c.card.uid === card.uid);
                    if (choice) destroy(choice);
                }
            });
        }
    });

    // ================================================================
    // 608 — Assalto Sconsiderato / Rush Recklessly (Magia Rapida)
    // Scegli 1 mostro scoperto sul Terreno; guadagna 700 ATK fino alla
    // fine del turno. Riusa ctx.grantTemporaryAtkDefBonus, già usato per
    // Attacco a Doppia Punta e le carte Equipaggiamento.
    // SEMPLIFICAZIONE: sceglie da sola il proprio mostro scoperto con
    // l'ATK più basso (il bersaglio più sensato per un boost), invece di
    // un'interfaccia di selezione dedicata.
    // ================================================================
    CardEffects.register(608, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field
                .map((slot, index) => (slot && !slot.isFaceDown ? { index, atk: DuelEngine.getEffectiveAtk(slot.card) } : null))
                .filter(Boolean)
                .sort((a, b) => a.atk - b.atk);
            if (occupied.length === 0) return;
            const card = field[occupied[0].index].card;
            ctx.grantTemporaryAtkDefBonus(card, 700, 0, false);
            ctx.log(`💪 Assalto Sconsiderato aumenta l'ATK di ${card.name} di 700 punti fino alla fine del turno!`);
        }
    });

    // ================================================================
    // 609 — Liberazione dell'Anima / Soul Release (Magia Normale)
    // Scegli come bersaglio fino a 5 carte in uno o più Cimiteri;
    // bandiscile (ctx.banish, zona Bandite). SEMPLIFICAZIONE: sceglie da
    // sola le carte più vecchie di entrambi i Cimiteri invece di
    // un'interfaccia di selezione multipla.
    // ================================================================
    CardEffects.register(609, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).length > 0 || ctx.graveyard(ctx.opponent).length > 0;
        },
        activate(ctx) {
            let remaining = 5;
            let count = 0;
            [ctx.owner, ctx.opponent].forEach((owner) => {
                const grave = ctx.graveyard(owner);
                while (remaining > 0 && grave.length > 0) {
                    const [card] = grave.splice(0, 1);
                    ctx.banish(owner, card);
                    remaining--;
                    count++;
                }
            });
            ctx.log(`👻 Liberazione dell'Anima bandisce ${count} cart${count === 1 ? 'a' : 'e'} dai Cimiteri!`);
        }
    });

    // ================================================================
    // 610 — Goblin Ladro / Robbin' Goblin (Trappola Continua)
    // Ogni volta che un mostro controllato infligge danno da battaglia
    // all'avversario: l'avversario scarta 1 carta a caso. Riusa
    // fireOwnBattleDamageDealt/onDealsBattleDamage (actions.js), già
    // costruito per Cappello Magico Bianco (id 591).
    // ================================================================
    CardEffects.register(610, {
        continuous: true,
        activate(ctx) {
            ctx.log('😈 Goblin Ladro è ora sul Terreno!');
        },
        onOwnMonsterDealsBattleDamage(ctx) {
            const discarded = ctx.discardRandomFromHand(ctx.opponent);
            if (!discarded) return;
            ctx.log(`😈 Goblin Ladro forza l'avversario a scartare ${discarded.name}!`);
        }
    });

    // ================================================================
    // 611 — Giavellotto Incantato / Enchanted Javelin (Trappola Normale)
    // Risposta a un attacco dichiarato (onAttackDeclare, come Kuriboh/
    // Waboku): guadagna Life Points pari all'ATK del mostro attaccante.
    // ================================================================
    CardEffects.register(611, {
        onAttackDeclare(ctx) {
            const gain = ctx.attackerAtk || 0;
            ctx.dealDamage(ctx.owner, -gain);
            ctx.log(`🏹 Giavellotto Incantato ti fa guadagnare ${gain} Life Points!`);
        }
    });

    // ================================================================
    // 612 — Ala di Grifone / Gryphon Wing (Trappola Normale)
    // Quando il tuo avversario attiva "Piumino delle Arpie" (id 291 —
    // CORREZIONE: la nota precedente affermava erroneamente che "Turbina
    // delle Arpie"/Harpie's Feather Duster non fosse presente in questo
    // database — falso, esiste già come id 291): annulla il suo effetto
    // e, se lo fai, distruggi tutte le Magie/Trappole controllate
    // dall'avversario. Stesso schema di risposta via Chain di
    // Interferenza Magica (id 361, ctx.negateActivation()).
    // ================================================================
    CardEffects.register(612, {
        canActivate(ctx) {
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.id === 291);
        },
        activate(ctx) {
            if (ctx.negateActivation()) {
                const stField = ctx.stField(ctx.opponent);
                let destroyed = 0;
                stField.forEach((slot, i) => {
                    if (!slot) return;
                    ctx.graveyard(ctx.opponent).push(slot.card);
                    stField[i] = null;
                    destroyed++;
                });
                ctx.log(`🪽 Ala di Grifone annulla Piumino delle Arpie e distrugge ${destroyed} Magie/Trappole dell'avversario!`);
            } else {
                ctx.log('🪽 Ala di Grifone: nessuna attivazione da annullare.');
            }
        }
    });

    // ================================================================
    // 614 — Ratto Gigante / Giant Rat (onDestroy — distrutto in battaglia)
    // Quando distrutta in battaglia e mandata al Cimitero: Special Summon
    // 1 mostro TERRA con 1500 o meno ATK dal Deck. Stesso schema di
    // ricerca nel Deck di Strega della Foresta Nera (id 508)/Uccello
    // Sonico (id 601), ma qui il mostro finisce SUL TERRENO invece che in
    // mano.
    // SEMPLIFICAZIONE: onDestroy scatta per QUALSIASI distruzione (non
    // solo in battaglia) — stesso limite già accettato altrove in questo
    // motore (nessuna distinzione battaglia/effetto per questo aggancio).
    // ================================================================
    CardEffects.register(614, {
        onDestroy(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.attribute === 'TERRA' && c.attack <= 1500);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🐀 Ratto Gigante Special Summona ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 615 — Biblioteca Magica Reale / Royal Magical Library
    // Ogni volta che una Magia viene attivata, guadagna 1 Segnalino
    // Magia (max 3, su ctx.card.spellCounters). Rimuovendo 3 Segnalini:
    // pesca 1 carta. Usa onCardActivated/canActivateOnCardActivated —
    // stesso aggancio generico già usato da Signore del Rosso (id 354) —
    // per il conteggio, e canActivate/activate (Ignition, come Chiron il
    // Mago id 150) per l'abilità di pesca.
    // SEMPLIFICAZIONE: il Segnalino si aggiunge al momento
    // dell'ATTIVAZIONE, non "quando quella Magia si risolve" come da
    // testo reale — nessuna differenza pratica nei casi attuali (nessuna
    // Magia viene negata dopo l'attivazione in questo dataset in un modo
    // che lo renda visibile).
    // ================================================================
    CardEffects.register(615, {
        canActivateOnCardActivated(ctx) {
            return ctx.activatedCard.type === 'spell';
        },
        onCardActivated(ctx) {
            const current = ctx.card.spellCounters || 0;
            if (current >= 3) return;
            ctx.card.spellCounters = current + 1;
            ctx.log(`📚 Biblioteca Magica Reale guadagna un Segnalino Magia (${ctx.card.spellCounters}/3)!`);
        },
        canActivate(ctx) {
            return (ctx.card.spellCounters || 0) >= 3;
        },
        activate(ctx) {
            ctx.card.spellCounters -= 3;
            ctx.drawCards(ctx.owner, 1);
            ctx.log('📚 Biblioteca Magica Reale rimuove 3 Segnalini Magia e pesca 1 carta!');
        }
    });

    // ================================================================
    // 617 — Rito del Fulgore Nero / Black Luster Ritual (Magia Rituale)
    // Ritual Summon di Soldato del Fulgore Nero (id 616) dalla mano.
    // Stesso identico schema di Rito del Guerriero Nero (id 56)/Rituale
    // del Drago Bianco (id 506)/Rito dell'Illusione Nera (id 116).
    // SEMPLIFICAZIONE: sacrifica in automatico dal proprio Terreno i
    // mostri con Livello più alto, invece di lasciar scegliere anche tra
    // mano e Terreno come da regola vera.
    // ================================================================
    CardEffects.register(617, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 616);
            if (!hasRitualMonster) return false;
            const totalLevel = ctx.field(ctx.owner).reduce((sum, slot) => sum + (slot ? (slot.card.level || 0) : 0), 0);
            return totalLevel >= 8;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field
                .map((slot, index) => (slot ? { index, level: slot.card.level || 0 } : null))
                .filter(Boolean)
                .sort((a, b) => b.level - a.level);

            let remaining = 8;
            const toSacrifice = [];
            occupied.forEach((entry) => {
                if (remaining <= 0) return;
                toSacrifice.push(entry.index);
                remaining -= entry.level;
            });
            toSacrifice.forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.id === 616);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Soldato del Fulgore Nero finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('⚔️ Rito del Fulgore Nero evoca Soldato del Fulgore Nero!');
        }
    });

    // ================================================================
    // 616 — Soldato del Fulgore Nero / Black Luster Soldier: Evocabile
    // Rituale solo tramite "Rito del Fulgore Nero" (id 617, qui sopra —
    // GIÀ IMPLEMENTATA). Qui serve solo il divieto di Evocazione
    // Normale/Set e di Special Summon per ogni altra via
    // (cannotNormalSummon/cannotBeSpecialSummoned — stesso schema di 413).
    // ================================================================
    CardEffects.register(616, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 618 — Ascia della Disperazione / Axe of Despair (Equipaggiamento)
    // +1000 ATK al mostro equipaggiato, senza restrizione di razza/
    // attributo. Aggiunta al blocco condiviso "CARTE EQUIPAGGIAMENTO"
    // (findEquipTarget/attachEquip/isEquip, vedi id 545/568/569/594/597
    // più sopra in questo file).
    // SEMPLIFICAZIONE: manca "quando questa carta lascia il Terreno per
    // il Cimitero: puoi sacrificare 1 mostro per rimetterla in cima al
    // Deck" — stesso genere di gap già accettato per Ciondolo Nero
    // (id 117, manca il danno da Cimitero).
    // ================================================================
    CardEffects.register(618, {
        continuous: true,
        canActivate(ctx) {
            return findEquipTarget(ctx, () => true) !== -1;
        },
        activate(ctx) {
            attachEquip(ctx, findEquipTarget(ctx, () => true));
        },
        isEquip: true,
        static(ctx) {
            const target = equippedTarget(ctx);
            const e = gameState.atkDefBonus[target.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[target.uid] = { atk: e.atk + 1000, def: e.def };
        }
    });

    // ================================================================
    // 619 — Zona Plasma Mistica / Mystic Plasma Zone (Magia Terreno)
    // Tutti i mostri di Attributo OSCURITÀ: +500 ATK / -400 DEF. Stesso
    // schema di Umi (id 497)/Yami (id 557)/Sogen (id 580)/Montagna
    // (id 596).
    // ================================================================
    CardEffects.register(619, {
        continuous: true,
        activate(ctx) {
            ctx.log('🌋 Zona Plasma Mistica attivata!');
        },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.attribute !== 'OSCURITÀ') return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 500, def: e.def - 400 };
                });
            });
        }
    });

    // ================================================================
    // 620 — Cerchio Ammaliante / Spellbinding Circle (Trappola Continua)
    // Bersaglia 1 mostro dell'avversario: non può attaccare né cambiare
    // Posizione. Se il bersaglio viene distrutto, questa carta si
    // distrugge da sola. Stesso identico schema di Incantesimo Ombra
    // (id 439), qui SENZA il malus di -700 ATK (non previsto dal testo
    // reale di questa carta).
    // ================================================================
    CardEffects.register(620, {
        continuous: true,
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const index = ctx.field(ctx.opponent).findIndex((s) => s && !s.isFaceDown);
            if (index === -1) return;
            const target = ctx.field(ctx.opponent)[index].card;
            ctx.card.targetOwner = ctx.opponent;
            ctx.card.targetIndex = index;
            ctx.card.targetUid = target.uid;
            ctx.log(`⭕ Cerchio Ammaliante lega ${target.name}!`);
        },
        static(ctx) {
            const targetSlot = ctx.card.targetOwner != null ? ctx.field(ctx.card.targetOwner)[ctx.card.targetIndex] : null;
            const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === ctx.card.targetUid;
            if (!validTarget) {
                ctx.stField(ctx.owner)[ctx.index] = null;
                ctx.graveyard(ctx.owner).push(ctx.card);
                return;
            }
            gameState.cannotAttackUids[targetSlot.card.uid] = true;
            gameState.cannotChangePositionUids[targetSlot.card.uid] = true;
        }
    });

    // ================================================================
    // 621 — Soldato di Riserva / Backup Soldier (Trappola Normale)
    // Mentre ci sono 5+ mostri nel proprio Cimitero: recupera fino a 3
    // Mostri Normali con 1500 o meno ATK dal Cimitero alla mano.
    // "Mostro Normale" qui = nessuna CardEffects.register (stessa
    // convenzione vanilla usata in tutto questo file).
    // SEMPLIFICAZIONE: recupera in automatico i primi 3 trovati, invece
    // di un'interfaccia di selezione multipla dedicata.
    // ================================================================
    CardEffects.register(621, {
        canActivate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            if (grave.length < 5) return false;
            return grave.some((c) => c.type === 'monster' && c.attack <= 1500 && !DuelEngine.getDefinition(c.id));
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const hand = ctx.hand(ctx.owner);
            let recovered = 0;
            for (let i = grave.length - 1; i >= 0 && recovered < 3; i--) {
                const c = grave[i];
                if (c.type === 'monster' && c.attack <= 1500 && !DuelEngine.getDefinition(c.id)) {
                    grave.splice(i, 1);
                    hand.push(c);
                    recovered++;
                }
            }
            ctx.log(`🪖 Soldato di Riserva recupera ${recovered} mostr${recovered === 1 ? 'o' : 'i'} dal Cimitero!`);
        }
    });

    // ================================================================
    // 622 — Spostamento / Shift (Trappola Normale) — SOLO la metà
    // "attacco" implementata (vedi missingEffectNote su id 622 in
    // cards.json per la metà "Magia/Trappola" mancante). Stesso identico
    // codice di Spiritello dei Sogni (id 214).
    // ================================================================
    // CORREZIONE di fedeltà: aggiunta la metà "Magia/Trappola" mancante,
    // tramite lo stesso checkpoint di targeting di Specchietto della
    // Fata/id 235 (ctx.declareTarget, duel-engine.js) — a differenza di
    // quella carta (ridirige verso il campo di chi ha attivato l'effetto,
    // "fuoco amico"), qui ridirige verso un ALTRO proprio mostro (difesa,
    // come la metà "attacco" qui sopra).
    CardEffects.register(622, {
        onAttackDeclare(ctx) {
            const field = ctx.field(ctx.owner);
            const newIndex = field.findIndex((s, i) => s && i !== ctx.targetIndex);
            if (newIndex === -1) return;
            ctx.redirectAttack(newIndex);
            ctx.log(`🔀 Spostamento ridirige l'attacco verso ${field[newIndex].card.name}!`);
        },
        canActivate(ctx) {
            if (ctx.zone !== 'st') return false;
            if (ctx.sourceType !== 'spell' && ctx.sourceType !== 'trap') return false;
            if (ctx.sourceOwner === ctx.owner) return false;
            if (ctx.totalTargetCount !== 1) return false;
            return ctx.field(ctx.owner).some((s, i) => s && i !== ctx.targetIndex);
        },
        onCardEffectTargetDeclare(ctx) {
            const field = ctx.field(ctx.owner);
            const newIndex = field.findIndex((s, i) => s && i !== ctx.targetIndex);
            if (newIndex === -1) return;
            ctx.redirect(ctx.owner, newIndex);
            ctx.log(`🔀 Spostamento ridirige l'effetto verso ${field[newIndex].card.name}!`);
        }
    });

    // ================================================================
    // 623 — Sparizione / Disappear (Trappola Normale)
    // Bandisci 1 carta dal Cimitero dell'avversario (ctx.banish, zona
    // Bandite — vedi anche Demolizione dell'Anima id 450/Liberazione
    // dell'Anima id 609, stesso schema). Sceglie da sola la più vecchia.
    // ================================================================
    CardEffects.register(623, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.opponent).length > 0;
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.opponent);
            const [card] = grave.splice(0, 1);
            if (!card) return;
            ctx.banish(ctx.opponent, card);
            ctx.log(`👻 Sparizione bandisce ${card.name} dal Cimitero dell'avversario!`);
        }
    });

    // ================================================================
    // 624 — Rottura di Raigeki / Raigeki Break (Trappola Normale)
    // Scarta 1 carta, poi distruggi 1 carta sul Terreno (mostro O Magia/
    // Trappola, di entrambi i lati).
    // SEMPLIFICAZIONE: sceglie da sola quale carta scartare (la prima in
    // mano) e quale carta del Terreno distruggere (il bersaglio più
    // pericoloso: preferisce un mostro scoperto dell'avversario, altrimenti
    // il primo trovato), invece di un'interfaccia di selezione dedicata.
    // ================================================================
    CardEffects.register(624, {
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            const anyTarget = (owner) => ctx.field(owner).some((s) => s) || ctx.stField(owner).some((s) => s);
            return anyTarget(ctx.owner) || anyTarget(ctx.opponent);
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const discarded = hand.splice(0, 1)[0];
            ctx.graveyard(ctx.owner).push(discarded);

            const oppMonsterIndex = ctx.field(ctx.opponent).findIndex((s) => s && !s.isFaceDown);
            if (oppMonsterIndex !== -1) {
                const decl = ctx.declareTarget(ctx.opponent, oppMonsterIndex, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!targetSlot) return;
                const name = targetSlot.card.name;
                ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
                ctx.log(`⚡ Rottura di Raigeki scarta ${discarded.name} e distrugge ${name}!`);
                return;
            }
            for (const owner of [ctx.opponent, ctx.owner]) {
                const monsterIndex = ctx.field(owner).findIndex((s) => s);
                if (monsterIndex !== -1) {
                    const name = ctx.field(owner)[monsterIndex].card.name;
                    ctx.destroyMonster(owner, monsterIndex);
                    ctx.log(`⚡ Rottura di Raigeki scarta ${discarded.name} e distrugge ${name}!`);
                    return;
                }
                const stIndex = ctx.stField(owner).findIndex((s) => s);
                if (stIndex !== -1) {
                    const stCard = ctx.stField(owner)[stIndex].card;
                    ctx.stField(owner)[stIndex] = null;
                    ctx.graveyard(owner).push(stCard);
                    ctx.log(`⚡ Rottura di Raigeki scarta ${discarded.name} e distrugge ${stCard.name}!`);
                    return;
                }
            }
        }
    });

    // ================================================================
    // 625 — Zombyra l'Oscuro / Zombyra the Dark (statico + destroy bonus)
    // Non può attaccare direttamente il tuo avversario
    // (cannotAttackDirectly, controllato in resolveAttack, actions.js, e
    // filtrato a monte in ai-medium.js/ai-hard.js). Se questa carta
    // distrugge un mostro in battaglia: perde 200 ATK (atkLossOnBattleDestroy,
    // già un meccanismo generico esistente in actions.js/
    // applyBattleDestroyBonus — la nota precedente affermava erroneamente
    // che questa clausola fosse già implementata: nessuna registrazione
    // esisteva davvero per questa carta).
    // ================================================================
    CardEffects.register(625, {
        cannotAttackDirectly: true,
        atkLossOnBattleDestroy: 200
    });

    // ================================================================
    // 361 — Interferenza Magica / Magic Jammer (Trappola Contatore)
    // Quando una Magia viene attivata: scarta 1 carta; annulla
    // l'attivazione e, se lo fai, distruggila. Stesso schema di risposta
    // via Chain di Sette Attrezzi del Bandito (id 599), ma per Magie
    // invece che Trappole.
    // SCOPERTA: questa carta esisteva già (inclusa nello Starter Deck:
    // Pegasus) ma non aveva ALCUNA registrazione — mai davvero attivabile
    // finora. Stesso genere di svista già trovata per Umi/Mura del
    // Castello/Drago Toon Occhi Blu/Rito dell'Illusione Nera.
    // ================================================================
    CardEffects.register(361, {
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'spell');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const discarded = hand.splice(0, 1)[0];
            ctx.graveyard(ctx.owner).push(discarded);
            if (ctx.negateActivation()) {
                ctx.log(`🔇 Interferenza Magica scarta ${discarded.name} e annulla l'attivazione della Magia!`);
            } else {
                ctx.log(`🔇 Interferenza Magica scarta ${discarded.name}, ma non c'era più nulla da annullare.`);
            }
        }
    });

    // ================================================================
    // 630 — Spirit Ryu (effetto Quick durante la Battle Phase)
    // Se questa carta combatte, scartando 1 mostro Tipo Drago: guadagna
    // 1000 ATK/DEF fino alla fine della Battle Phase.
    // SEMPLIFICAZIONE: attivabile una volta per turno durante la propria
    // Battle Phase (Ignition), invece del vero effetto Quick legato al
    // preciso istante in cui la carta combatte — stessa classe di
    // semplificazione temporale già accettata altrove in questo motore.
    // ================================================================
    CardEffects.register(630, {
        canActivate(ctx) {
            if (ctx.gameState.phase !== 'battle') return false;
            return ctx.hand(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Drago');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.type === 'monster' && c.race === 'Drago');
            if (index === -1) return;
            const [discarded] = hand.splice(index, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            ctx.grantTemporaryAtkDefBonus(ctx.card, 1000, 1000, false);
            ctx.log(`🐉 Spirit Ryu scarta ${discarded.name} e guadagna 1000 ATK/DEF fino alla fine del turno!`);
        }
    });

    // ================================================================
    // 631 — Megamorfosi / Megamorph (Equipaggiamento)
    // Finché i propri LP sono inferiori a quelli dell'avversario: l'ATK
    // del mostro equipaggiato raddoppia. Finché sono superiori: si
    // dimezza. Stesso schema base delle altre Carte Equipaggiamento
    // (findEquipTarget/attachEquip/isEquip), ma con un bonus DINAMICO
    // (dipendente dal confronto LP ad ogni render) invece che fisso.
    // ================================================================
    CardEffects.register(631, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, () => true) !== -1; },
        activate(ctx) { attachEquip(ctx, findEquipTarget(ctx, () => true)); },
        isEquip: true,
        static(ctx) {
            const target = equippedTarget(ctx);
            const ownLP = ctx.owner === 'player' ? gameState.playerLP : gameState.botLP;
            const oppLP = ctx.owner === 'player' ? gameState.botLP : gameState.playerLP;
            const e = gameState.atkDefBonus[target.uid] || { atk: 0, def: 0 };
            let atkDelta = 0;
            if (ownLP < oppLP) atkDelta = target.attack; // raddoppia: +100%
            else if (ownLP > oppLP) atkDelta = -Math.floor(target.attack / 2); // dimezza: -50%
            gameState.atkDefBonus[target.uid] = { atk: e.atk + atkDelta, def: e.def };
        }
    });

    // ================================================================
    // 632 — Nobile del Depistaggio / Nobleman of Crossout (Magia Normale)
    // Scegli come bersaglio 1 mostro coperto sul Terreno; distruggilo e,
    // se lo fai, bandiscilo. Distrugge davvero (ctx.destroyMonster: passa
    // dal Cimitero, fa scattare ON_DESTROY come una distruzione vera),
    // poi lo toglie subito dal Cimitero per bandirlo (ctx.banish) —
    // stesso ordine del testo reale "distruggilo e, se lo fai, bandiscilo".
    // "Se era un mostro Flip (card.subtype === 'flip'), entrambi i
    // giocatori rivelano il proprio Deck e bandiscono tutte le copie con
    // lo stesso nome": DuelEngineUI.openCardListPicker(selectable:false)
    // per la rivelazione (stesso componente già usato da id 589 Grande
    // Occhio/id 86 Amazzone Maestra delle Catene per lo stesso scopo di
    // "guardare" un mazzo/una mano) — SCOPERTA: la nota precedente diceva
    // che questo effetto non fosse supportato, ma il componente esisteva
    // già per altre carte.
    // ================================================================
    CardEffects.register(632, {
        canActivate(ctx) {
            return [ctx.owner, ctx.opponent].some((owner) => ctx.field(owner).some((s) => s && s.isFaceDown));
        },
        activate(ctx) {
            const candidates = [];
            [ctx.opponent, ctx.owner].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => { if (slot && slot.isFaceDown) candidates.push({ owner, index }); });
            });
            if (candidates.length === 0) return;
            const choice = candidates[0];
            const card = ctx.field(choice.owner)[choice.index].card;
            const wasFlipMonster = card.subtype === 'flip';
            ctx.destroyMonster(choice.owner, choice.index);
            const grave = ctx.graveyard(choice.owner);
            const graveIdx = grave.indexOf(card);
            if (graveIdx !== -1) { grave.splice(graveIdx, 1); ctx.banish(choice.owner, card); }
            ctx.log(`⚔️ Nobile del Depistaggio distrugge e bandisce ${card.name}!`);
            if (!wasFlipMonster) return;
            // Istantanea PRIMA del bando (per la rivelazione): il vero
            // testo mostra il Deck completo, poi bandisce quello che
            // trova — mostrare lo stato "prima" è più fedele che
            // mostrare il Deck già ripulito delle copie appena bandite.
            const revealSnapshots = { player: (gameState.playerDeck || []).slice(), bot: (gameState.botDeck || []).slice() };
            ['player', 'bot'].forEach((owner) => {
                const deck = gameState[owner === 'player' ? 'playerDeck' : 'botDeck'];
                if (!Array.isArray(deck)) return;
                const matches = deck.filter((c) => c.name === card.name);
                if (matches.length === 0) return;
                matches.forEach((c) => {
                    const idx = deck.indexOf(c);
                    if (idx !== -1) { deck.splice(idx, 1); ctx.banish(owner, c); }
                });
                gameState[owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
                ctx.log(`⚔️ Nobile del Depistaggio bandisce ${matches.length} copi${matches.length === 1 ? 'a' : 'e'} di ${card.name} dal Deck ${owner === 'player' ? 'tuo' : 'del bot'}!`);
            });
            // I due box si mostrano IN SEQUENZA (il secondo si apre solo
            // alla chiusura del primo): openCardListPicker chiude sempre
            // il popover precedente all'apertura, mostrarli insieme
            // farebbe sparire il primo prima che il giocatore lo veda.
            if (ctx.owner === 'player' && window.DuelEngineUI && Array.isArray(gameState.playerDeck)) {
                const showBotDeck = () => {
                    if (!Array.isArray(gameState.botDeck)) return;
                    window.DuelEngineUI.openCardListPicker(revealSnapshots.bot, {
                        title: '⚔️ Nobile del Depistaggio',
                        text: "Il Deck dell'avversario (rivelato per cercare altre copie).",
                        selectable: false,
                        emptyText: "Il Deck dell'avversario è vuoto."
                    });
                };
                window.DuelEngineUI.openCardListPicker(revealSnapshots.player, {
                    title: '⚔️ Nobile del Depistaggio',
                    text: 'Il tuo Deck (rivelato per cercare altre copie).',
                    selectable: false,
                    emptyText: 'Il tuo Deck è vuoto.',
                    onCancel: showBotDeck
                });
            }
        }
    });

    // ================================================================
    // 633 — Sepoltura Prematura / Premature Burial (Equipaggiamento)
    // Paga 800 Life Points, poi Special Summon 1 mostro dal proprio
    // Cimitero in Posizione di Attacco, equipaggiato con questa carta.
    // Nessun bonus ATK/DEF (a differenza delle altre Carte
    // Equipaggiamento di questo file). "Quando questa carta viene
    // distrutta, distruggi il mostro equipaggiato" — la direzione
    // OPPOSTA di Spada Fusione Lama Murasame (id 726, che protegge SE
    // STESSA): qui invece è questa carta a portarsi dietro il bersaglio
    // quando lei stessa viene distrutta, tramite onSTDestroyed/
    // ctx.destroySpellTrap. La direzione STANDARD (se il bersaglio
    // sparisce, questa carta si stacca) resta comunque garantita da
    // equippedTarget()/static() come per le altre Equip.
    // ================================================================
    CardEffects.register(633, {
        continuous: true,
        canActivate(ctx) {
            if (gameState[ctx.owner === 'player' ? 'playerLP' : 'botLP'] <= 800) return false;
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster') && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'monster');
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = grave.splice(index, 1);
            ctx.dealDamage(ctx.owner, 800);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.card.equippedToOwner = ctx.owner;
            ctx.card.equippedToIndex = slotIndex;
            ctx.card.equippedToUid = card.uid;
            ctx.log(`⚰️ Sepoltura Prematura paga 800 Life Points e Special Summona ${card.name} dal Cimitero!`);
        },
        isEquip: true,
        static(ctx) {
            equippedTarget(ctx); // valida/pulisce la dipendenza come le altre Equip (nessun bonus statistico qui)
        },
        onSTDestroyed(ctx) {
            if (!ctx.card.equippedToUid) return;
            const field = ctx.field(ctx.card.equippedToOwner);
            const index = ctx.card.equippedToIndex;
            const slot = field[index];
            if (!slot || slot.card.uid !== ctx.card.equippedToUid) return;
            const name = slot.card.name;
            ctx.destroyMonster(ctx.card.equippedToOwner, index);
            ctx.log(`⚰️ Sepoltura Prematura distrutta: ${name} viene distrutto con lei!`);
        }
    });

    // ================================================================
    // 635 — Vaso dell'Ingordigia / Pot of Greed (Magia Normale)
    // Pesca 2 carte. Correzione di fedeltà: il nome italiano è
    // letteralmente "Pot of Greed" (Magia, pesca 2), ma la carta era
    // stata implementata come "Jar of Greed" (Trappola, pesca 1) — due
    // carte reali diverse confuse tra loro. Vedi anche data/cards.json
    // (type/subtype corretti da trap/normal a spell/normal).
    // ================================================================
    CardEffects.register(635, {
        activate(ctx) {
            ctx.drawCards(ctx.owner, 2);
            ctx.log("🏺 Vaso dell'Ingordigia pesca 2 carte!");
        }
    });

    // ================================================================
    // 636 — Campo di Riryoku / Riryoku Field (Trappola Contatore)
    // Quando una Magia dell'avversario viene attivata: annulla la sua
    // attivazione e, se lo fai, distruggila. Stesso schema di risposta
    // via Chain di Interferenza Magica (id 361) qui sopra, ma senza costo
    // di scarto. Vedi missingEffectNote su id 636 in cards.json per la
    // condizione "bersaglia esattamente 1 mostro" non tracciata.
    // ================================================================
    CardEffects.register(636, {
        canActivate(ctx) {
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'spell' && chain.links[chain.links.length - 1].owner === ctx.opponent);
        },
        activate(ctx) {
            if (ctx.negateActivation()) {
                ctx.log("⚡ Campo di Riryoku annulla e distrugge l'attivazione della Magia avversaria!");
            } else {
                ctx.log('⚡ Campo di Riryoku non trova più nulla da annullare.');
            }
        }
    });

    // ================================================================
    // 637 — Tribù dei D. / D. Tribe (Trappola Normale)
    // Tutti i mostri scoperti sul proprio Terreno diventano Tipo Drago
    // fino alla End Phase — ctx.overrideRaceUntilEndOfTurn (duel-engine.js)
    // ripristina il Tipo originale lì (enterEndPhase, game-flow.js).
    // SEMPLIFICAZIONE residua: applicato una sola volta, ai mostri già
    // scoperti al momento dell'attivazione (snapshot) — non ai mostri
    // evocati successivamente nello stesso turno, dato che questa
    // Trappola Normale si risolve una volta sola e non ha un proprio
    // static() da ricontrollare ad ogni render.
    // ================================================================
    CardEffects.register(637, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            let count = 0;
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot && !slot.isFaceDown) { ctx.overrideRaceUntilEndOfTurn(slot.card, 'Drago'); count++; }
            });
            ctx.log(`🐲 Tribù dei D. rende ${count} mostr${count === 1 ? 'o' : 'i'} Tipo Drago!`);
        }
    });

    // ================================================================
    // 638 — Drago Oscurità Occhi Rossi / Red-Eyes Darkness Dragon
    // Special Summon dalla mano sacrificando 1 "Drago Nero Occhi Rossi"
    // (id 12). Guadagna 300 ATK per ogni mostro Tipo Drago nel proprio
    // Cimitero. Stesso schema Special-Summon-con-tributo-specifico di
    // Drago Toon Occhi Blu (id 123)/Manga Ryu-Ran (id 606), qui con UN
    // solo tributo invece di 2, e un bonus statico invece che nessuno.
    // ================================================================
    CardEffects.register(638, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 12);
        },
        paySpecialSummonCost(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 12);
            if (index === -1) return false;
            ctx.graveyard(ctx.owner).push(field[index].card);
            field[index] = null;
            ctx.log('🐉 Drago Oscurità Occhi Rossi sacrifica Drago Nero Occhi Rossi per essere Special Summonato!');
            return true;
        },
        static(ctx) {
            const dragonCount = ctx.graveyard(ctx.owner).filter((c) => c.type === 'monster' && c.race === 'Drago').length;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + dragonCount * 300, def: e.def };
        }
    });

    // ================================================================
    // 640 — Drago Armato LV3 / Armed Dragon LV3
    // Durante la propria Standby Phase: manda questa carta al Cimitero e
    // Special Summon Drago Armato LV5 (id 641) da mano o Deck.
    // SEMPLIFICAZIONE: firePhaseTrigger() chiama onStandbyPhase in modo
    // incondizionato (nessuna vera scelta "puoi" — stesso spirito di
    // molti altri effetti automatici di questo motore), quindi si
    // attiva sempre se Drago Armato LV5 è disponibile.
    // ================================================================
    CardEffects.register(640, {
        onStandbyPhase(ctx) {
            const hand = ctx.hand(ctx.owner);
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            let evolved = null;
            const handIdx = hand.findIndex((c) => c.id === 641);
            if (handIdx !== -1) {
                [evolved] = hand.splice(handIdx, 1);
            } else if (Array.isArray(deck)) {
                const deckIdx = deck.findIndex((c) => c.id === 641);
                if (deckIdx !== -1) {
                    [evolved] = deck.splice(deckIdx, 1);
                    gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
                }
            }
            if (!evolved) return;
            const field = ctx.field(ctx.owner);
            field[ctx.slotIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(evolved);
                ctx.log('⚠️ Il Terreno è pieno: Drago Armato LV5 finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, evolved, slotIndex, 'attack');
            ctx.log('🐉 Drago Armato LV3 si manda al Cimitero ed evolve in Drago Armato LV5!');
        }
    });

    // ================================================================
    // 641 — Drago Armato LV5 / Armed Dragon LV5 (Ignition)
    // Manda 1 mostro dalla mano al Cimitero; distruggi 1 mostro
    // dell'avversario con ATK minore o uguale a quello del mostro
    // mandato al Cimitero. Vedi missingEffectNote su id 641 in
    // cards.json per l'evoluzione in LV7 (non presente in questo
    // database) non implementata.
    // SEMPLIFICAZIONE: sceglie da sola quale mostro scartare (il primo
    // in mano) e quale mostro avversario distruggere (quello con ATK più
    // alto tra i legali), invece di un'interfaccia di selezione dedicata.
    // ================================================================
    CardEffects.register(641, {
        canActivate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return false;
            const maxAtk = Math.max(...hand.map((c) => c.attack || 0));
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown && DuelEngine.getEffectiveAtk(s.card) <= maxAtk);
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            let bestIndex = -1, bestAtk = -1;
            hand.forEach((c, i) => { if ((c.attack || 0) > bestAtk) { bestAtk = c.attack || 0; bestIndex = i; } });
            if (bestIndex === -1) return;
            const [discarded] = hand.splice(bestIndex, 1);
            ctx.graveyard(ctx.owner).push(discarded);

            const field = ctx.field(ctx.opponent);
            let targetIndex = -1, targetAtk = -1;
            field.forEach((s, i) => {
                if (!s || s.isFaceDown) return;
                const atk = DuelEngine.getEffectiveAtk(s.card);
                if (atk <= bestAtk && atk > targetAtk) { targetAtk = atk; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, targetIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const name = targetSlot.card.name;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`🐉 Drago Armato LV5 scarta ${discarded.name} e distrugge ${name}!`);
        }
    });

    // ================================================================
    // 642 — Cucciolo del Drago Nero / Black Dragon's Chick (Ignition)
    // Manda questa carta scoperta al Cimitero; Special Summon 1 "Drago
    // Nero Occhi Rossi" (id 12) dalla mano.
    // ================================================================
    CardEffects.register(642, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).some((c) => c.id === 12);
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.id === 12);
            if (handIdx === -1) return;
            const [redEyes] = hand.splice(handIdx, 1);
            const field = ctx.field(ctx.owner);
            field[ctx.slotIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(redEyes);
                ctx.log('⚠️ Il Terreno è pieno: Drago Nero Occhi Rossi finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, redEyes, slotIndex, 'attack');
            ctx.log('🥚 Cucciolo del Drago Nero si sacrifica e Special Summona Drago Nero Occhi Rossi!');
        }
    });

    // ================================================================
    // 643 — Drago Elementale / Element Dragon
    // Se sul Terreno (di entrambi i giocatori) è presente un mostro di
    // Attributo FUOCO: guadagna 500 ATK. Se è presente un mostro VENTO e
    // questa carta distrugge un mostro dell'avversario in battaglia: può
    // attaccare di nuovo — slot.extraAttackGranted (stesso meccanismo
    // già usato da Riavvolgimento Toon id 485), concesso da onBattled
    // (scatta solo se questa carta è sopravvissuta alla battaglia;
    // !ctx.opponentSurvived conferma che ha anche distrutto l'avversario).
    // ================================================================
    CardEffects.register(643, {
        static(ctx) {
            const hasFire = ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown && s.card.attribute === 'FUOCO'));
            if (!hasFire) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + 500, def: e.def };
        },
        onBattled(ctx) {
            if (ctx.opponentSurvived) return;
            const hasWind = ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown && s.card.attribute === 'VENTO'));
            if (!hasWind) return;
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (index === -1) return;
            field[index].extraAttackGranted = true;
            ctx.log('🐉 Drago Elementale può attaccare di nuovo grazie a un mostro VENTO sul Terreno!');
        }
    });

    // ================================================================
    // 644 — Drago Mascherato / Masked Dragon (onDestroy — distrutto in
    // battaglia)
    // Quando distrutta in battaglia: Special Summon 1 mostro Tipo Drago
    // con 1500 o meno ATK dal Deck. Stesso schema di Ratto Gigante
    // (id 614).
    // ================================================================
    CardEffects.register(644, {
        onDestroy(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.race === 'Drago' && c.attack <= 1500);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🐲 Drago Mascherato Special Summona ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 645 — Furto Improvviso / Snatch Steal
    // Prendi il controllo di 1 mostro scoperto dell'avversario. Vedi
    // missingEffectNote su id 645 in cards.json: usa il controllo
    // TEMPORANEO già esistente (ctx.takeControl, torna alla End Phase,
    // stesso di Cambio di Cuore id 147) invece che permanente, e non
    // applica il guadagno di 1000 LP per l'avversario ad ogni sua
    // Standby Phase.
    // ================================================================
    // CORREZIONE di fedeltà: il controllo è ora PERMANENTE (nuovo 4°
    // parametro di ctx.takeControl, duel-engine.js — costruito per
    // Controllo Mentale/id 130), non più "fino alla End Phase". Carta
    // ora Continua (resta sul Terreno finché tiene il controllo) e si
    // autodistrugge se il mostro rubato lascia il Terreno (stesso
    // schema di Muro del Tornado/id 489: controllo in static(), nessuna
    // chiamata al destroySpellTrap protetto). "Il tuo avversario
    // guadagna 1000 LP durante ciascuna delle SUE Standby Phase":
    // def.onOpponentStandbyPhase (duel-engine.js, già costruito per
    // L'Occhio della Verità/id 466) reagisce dal lato del CONTROLLORE
    // della carta (il ladro) quando vive la Standby Phase dell'AVVERSARIO
    // (ctx.standbyOwner) — esattamente il proprietario originale del
    // mostro rubato in una partita 1v1.
    CardEffects.register(645, {
        continuous: true,
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const index = ctx.field(ctx.opponent).findIndex((s) => s && !s.isFaceDown);
            if (index === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, index, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const stolen = targetSlot.card;
            if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex, true)) {
                ctx.card.snatchStealTargetUid = stolen.uid;
                ctx.log(`🦹 Furto Improvviso prende il controllo permanente di ${stolen.name}!`);
            }
        },
        onOpponentStandbyPhase(ctx) {
            if (!ctx.card.snatchStealTargetUid) return;
            ctx.dealDamage(ctx.standbyOwner, -1000);
            ctx.log('🦹 Furto Improvviso: il proprietario originale guadagna 1000 Life Points!');
        },
        static(ctx) {
            if (!ctx.card.snatchStealTargetUid) return;
            const stillControlled = ctx.field(ctx.owner).some((s) => s && s.card.uid === ctx.card.snatchStealTargetUid);
            if (!stillControlled) {
                ctx.stField(ctx.owner)[ctx.index] = null;
                ctx.graveyard(ctx.owner).push(ctx.card);
                ctx.log('🦹 Furto Improvviso va al Cimitero: il mostro rubato ha lasciato il Terreno.');
            }
        }
    });

    // ================================================================
    // 646 — Tempesta Pesante / Heavy Storm (Magia Normale)
    // Distruggi tutte le Magie/Trappole sul Terreno, di entrambi i
    // giocatori.
    // ================================================================
    CardEffects.register(646, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.stField(owner).some((s) => s));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (!slot) return;
                    ctx.graveyard(owner).push(slot.card);
                    ctx.stField(owner)[index] = null;
                    count++;
                });
            });
            ctx.log(`🌪️ Tempesta Pesante distrugge ${count} cart${count === 1 ? 'a' : 'e'} Magia/Trappola!`);
        }
    });

    // ================================================================
    // 647 — Distruzione con Zampata / Stamping Destruction (Magia
    // Normale)
    // Se controlli un mostro Tipo Drago: scegli come bersaglio 1 Magia/
    // Trappola sul Terreno; distruggila e infliggi 500 danni al suo
    // controllore. Stesso schema di ricerca bersaglio di Tifone dello
    // Spazio Mistico (id 607), con il requisito Drago e il danno extra.
    // ================================================================
    CardEffects.register(647, {
        canActivate(ctx) {
            const hasDragon = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.race === 'Drago');
            if (!hasDragon) return false;
            return ['player', 'bot'].some((owner) => ctx.stField(owner).some((s) => s));
        },
        activate(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => { if (slot) candidates.push({ owner, index, card: slot.card }); });
            });
            if (candidates.length === 0) return;
            const choice = candidates.find((c) => c.owner === ctx.opponent) || candidates[0];
            const slot = ctx.stField(choice.owner)[choice.index];
            if (slot.isFaceDown) slot.isFaceDown = false;
            ctx.stField(choice.owner)[choice.index] = null;
            ctx.graveyard(choice.owner).push(choice.card);
            ctx.dealDamage(choice.owner, 500);
            ctx.log(`🐾 Distruzione con Zampata distrugge ${choice.card.name} e infligge 500 danni!`);
        }
    });

    // ================================================================
    // 648 — Scambio di Creature / Creature Swap (Magia Normale)
    // Ciascun giocatore sceglie 1 mostro e ne scambia il controllo con
    // l'altro. SEMPLIFICAZIONE "non possono cambiare Posizione questo
    // turno" non applicata (nessun impatto pratico immediato dato che i
    // mostri restano comunque nella Posizione con cui sono scambiati).
    // ================================================================
    CardEffects.register(648, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s) && ctx.field(ctx.opponent).some((s) => s);
        },
        activate(ctx) {
            const ownField = ctx.field(ctx.owner);
            const oppField = ctx.field(ctx.opponent);
            const ownIndex = ownField.findIndex((s) => s);
            const oppIndex = oppField.findIndex((s) => s);
            if (ownIndex === -1 || oppIndex === -1) return;
            const ownSlot = ownField[ownIndex];
            const oppSlot = oppField[oppIndex];
            ownField[ownIndex] = oppSlot;
            oppField[oppIndex] = ownSlot;
            ctx.log(`🔃 Scambio di Creature scambia ${ownSlot.card.name} con ${oppSlot.card.name}!`);
        }
    });

    // ================================================================
    // 649 — Ricarica / Reload (Magia Rapida)
    // Rimetti tutte le carte della mano nel Deck e mescola, poi pesca lo
    // stesso numero di carte. Riusa ctx.shuffleIntoDeck (già presente in
    // duel-engine.js) — funziona solo con un vero Deck salvato, come
    // tutte le altre carte che cercano/rimescolano nel Deck in questo
    // file.
    // ================================================================
    CardEffects.register(649, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).length > 0;
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const count = hand.length;
            const returned = hand.splice(0, hand.length);
            if (!ctx.shuffleIntoDeck(ctx.owner, returned)) {
                // Nessun vero Deck (Duello Demo): le carte tornano in mano invece di sparire nel nulla.
                hand.push(...returned);
                return;
            }
            ctx.drawCards(ctx.owner, count);
            ctx.log(`🔄 Ricarica rimescola ${count} cart${count === 1 ? 'a' : 'e'} nel Deck e ne pesca altrettante!`);
        }
    });

    // ================================================================
    // 650 — Il Cimitero nella Quarta Dimensione (Magia Normale)
    // Aggiungi fino a 2 mostri "LV" dal Cimitero al Deck e mescola.
    // ================================================================
    CardEffects.register(650, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.name && c.name.includes('LV'));
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const found = [];
            for (let i = grave.length - 1; i >= 0 && found.length < 2; i--) {
                if (grave[i].name && grave[i].name.includes('LV')) {
                    found.push(grave.splice(i, 1)[0]);
                }
            }
            if (found.length === 0) return;
            if (!ctx.shuffleIntoDeck(ctx.owner, found)) {
                grave.push(...found);
                return;
            }
            ctx.log(`♻️ Il Cimitero nella Quarta Dimensione rimescola ${found.length} mostr${found.length === 1 ? 'o' : 'i'} "LV" nel Deck!`);
        }
    });

    // ================================================================
    // 651 — Cessate il Fuoco / Ceasefire (Trappola Normale)
    // Gira scoperti tutti i mostri coperti in Posizione di Difesa sul
    // Terreno (nessun effetto Flip si attiva), poi infliggi 500 danni
    // all'avversario per ogni Mostro con Effetto sul Terreno.
    // SEMPLIFICAZIONE "Mostro con Effetto" = qualunque mostro scoperto la
    // cui carta NON è marcata `vanilla` nel database (stessa convenzione
    // usata in tutto questo file per distinguere Mostri Normali).
    // ================================================================
    CardEffects.register(651, {
        canActivate(ctx) {
            const hasFaceDownDef = ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && s.isFaceDown && s.position === 'defense'));
            const hasEffectMonster = ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown && !s.card.vanilla));
            return hasFaceDownDef || hasEffectMonster;
        },
        activate(ctx) {
            let flipped = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && slot.isFaceDown && slot.position === 'defense') { slot.isFaceDown = false; flipped++; }
                });
            });
            const effectMonsterCount = ['player', 'bot'].reduce((sum, owner) => sum + ctx.field(owner).filter((s) => s && !s.isFaceDown && !s.card.vanilla).length, 0);
            const damage = effectMonsterCount * 500;
            if (damage > 0) ctx.dealDamage(ctx.opponent, damage);
            ctx.log(`🏳️ Cessate il Fuoco rivela ${flipped} most${flipped === 1 ? 'ro' : 'ri'} e infligge ${damage} danni!`);
        }
    });

    // ================================================================
    // 652 — La Perla del Drago / The Dragon's Bead (Trappola Continua)
    // Scarta 1 carta; annulla l'effetto di una Trappola attivata e
    // distruggila. Stesso schema di risposta via Chain di Interferenza
    // Magica (id 361), ma per Trappole. Vedi missingEffectNote su id 652
    // in cards.json per il requisito "bersaglio Drago" non tracciato.
    // ================================================================
    CardEffects.register(652, {
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'trap');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const discarded = hand.splice(0, 1)[0];
            ctx.graveyard(ctx.owner).push(discarded);
            if (ctx.negateActivation()) {
                ctx.log(`🐲 La Perla del Drago scarta ${discarded.name} e annulla la Trappola!`);
            } else {
                ctx.log(`🐲 La Perla del Drago scarta ${discarded.name}, ma non c'era più nulla da annullare.`);
            }
        }
    });

    // ================================================================
    // 95 — Frecce Anti-Magia / Anti-Spell Fragrance (Magia Rapida)
    // Attivabile durante la Battle Phase: per il resto del turno, nessuno
    // dei due giocatori può più attivare Magie/Trappole. Riusa i flag già
    // esistenti gameState.noSpellActivationFor/noTrapActivationFor (già
    // consultati da DuelEngine.canActivate, vedi duel-engine.js — stesso
    // meccanismo di Manta Perforante Strisciante id 693/famiglia
    // Ingranaggio Antico), impostati qui per ENTRAMBI i lati invece che
    // per un solo giocatore. SEMPLIFICAZIONE: non impedisce a un
    // avversario di rispondere a QUESTA stessa attivazione con una
    // Trappola già Set (il motore non ha un modo per bloccare
    // selettivamente solo le risposte a sé stessa) — una volta risolta,
    // però, blocca correttamente tutto il resto del turno.
    // ================================================================
    CardEffects.register(95, {
        canActivate(ctx) {
            return ctx.gameState.phase === 'battle';
        },
        activate(ctx) {
            gameState.noSpellActivationFor = gameState.noSpellActivationFor || {};
            gameState.noTrapActivationFor = gameState.noTrapActivationFor || {};
            gameState.noSpellActivationFor.player = true;
            gameState.noSpellActivationFor.bot = true;
            gameState.noTrapActivationFor.player = true;
            gameState.noTrapActivationFor.bot = true;
            ctx.log('🚫 Frecce Anti-Magia: nessuno può più attivare Magie/Trappole per il resto del turno!');
        }
    });

    // ================================================================
    // 653 — Avidità Sconsiderata / Reckless Greed (Trappola Normale)
    // Pesca 2 carte e salta le tue prossime 2 Draw Phase (vedi
    // gameState.skipDrawFor, controllato in enterDrawPhase — game-flow.js).
    // ================================================================
    CardEffects.register(653, {
        activate(ctx) {
            ctx.drawCards(ctx.owner, 2);
            gameState.skipDrawFor = gameState.skipDrawFor || {};
            gameState.skipDrawFor[ctx.owner] = (gameState.skipDrawFor[ctx.owner] || 0) + 2;
            ctx.log('🎲 Avidità Sconsiderata pesca 2 carte, ma salterai le prossime 2 Draw Phase!');
        }
    });

    // ================================================================
    // 654 — Disturbatore di Trappole / Trap Jammer (Trappola Contatore)
    // Quando l'avversario attiva una Trappola durante la Battle Phase:
    // annulla la sua attivazione e distruggila. Stesso schema di
    // Campo di Riryoku (id 636), ma per Trappole e solo in Battle Phase.
    // ================================================================
    CardEffects.register(654, {
        canActivate(ctx) {
            if (ctx.gameState.phase !== 'battle') return false;
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'trap' && chain.links[chain.links.length - 1].owner === ctx.opponent);
        },
        activate(ctx) {
            if (ctx.negateActivation()) {
                ctx.log("⚡ Disturbatore di Trappole annulla e distrugge la Trappola avversaria!");
            } else {
                ctx.log('⚡ Disturbatore di Trappole non trova più nulla da annullare.');
            }
        }
    });

    // ================================================================
    // 655 — Maledizione di Anubis / Curse of Anubis (Trappola Normale)
    // Cambia in Posizione di Difesa tutti i Mostri con Effetto sul
    // Terreno (di entrambi i giocatori); la loro DEF diventa 0 fino alla
    // fine del turno. SEMPLIFICAZIONE: manca il divieto di cambiare
    // Posizione per il resto del turno (nessun meccanismo di blocco
    // "solo per questo turno" già pronto per un effetto non continuo).
    // ================================================================
    CardEffects.register(655, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown && !s.card.vanilla));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.vanilla) return;
                    slot.position = 'defense';
                    ctx.grantTemporaryAtkDefBonus(slot.card, 0, -(slot.card.defense || 0), false);
                    count++;
                });
            });
            ctx.log(`☥ Maledizione di Anubis mette in Difesa ${count} Most${count === 1 ? 'ro con Effetto' : 'ri con Effetto'}, DEF a 0!`);
        }
    });

    // ================================================================
    // 656 — Genesi del Vampiro / Vampire Genesis
    // Special Summon dalla mano bandendo 1 Signore dei Vampiri (id 658)
    // che si controlla. Poi (Ignition, una volta per turno): scarta 1
    // mostro Zombie, Special Summon dal Cimitero 1 mostro Zombie di
    // Livello inferiore a quello scartato.
    // SEMPLIFICAZIONE "banish": la carta sparisce e basta (stesso spirito
    // già accettato altrove in questo motore).
    // ================================================================
    CardEffects.register(656, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 658);
        },
        paySpecialSummonCost(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 658);
            if (index === -1) return false;
            const banishedCard = field[index].card;
            field[index] = null;
            ctx.banish(ctx.owner, banishedCard);
            ctx.log('🧛 Genesi del Vampiro bandisce Signore dei Vampiri per essere Special Summonata!');
            return true;
        },
        canActivate(ctx) {
            const hasZombieInHand = ctx.hand(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Zombie');
            if (!hasZombieInHand) return false;
            return ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            let bestIndex = -1, bestLevel = -1;
            hand.forEach((c, i) => { if (c.type === 'monster' && c.race === 'Zombie' && (c.level || 0) > bestLevel) { bestLevel = c.level || 0; bestIndex = i; } });
            if (bestIndex === -1) return;
            const grave = ctx.graveyard(ctx.owner);
            const reviveIndex = grave.findIndex((c) => c.type === 'monster' && c.race === 'Zombie' && (c.level || 0) < bestLevel);
            if (reviveIndex === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [discarded] = hand.splice(bestIndex, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            const [revived] = grave.splice(reviveIndex, 1);
            ctx.specialSummon(ctx.owner, revived, slotIndex, 'attack');
            ctx.log(`🧛 Genesi del Vampiro scarta ${discarded.name} e Special Summona ${revived.name} dal Cimitero!`);
        }
    });

    // ================================================================
    // 658 — Signore dei Vampiri / Vampire Lord
    // Se infligge danno da battaglia: dichiara 1 tipo di carta, il tuo
    // avversario ne manda 1 dal Deck al Cimitero. Riusa
    // onDealsBattleDamage (actions.js), già costruito per Cappello
    // Magico Bianco (id 591)/Goblin Ladro (id 610).
    // Una volta per turno, durante la propria prossima Standby Phase dopo
    // essere stata distrutta e mandata al Cimitero da un effetto
    // dell'AVVERSARIO (ctx.destroyedByOwner === ctx.opponent, MAI in
    // battaglia — ctx.destroyedByOpponentCard escluderebbe comunque
    // quel caso): Special Summonala — ctx.reviveFromGraveyardWithCountdown
    // (nuovo meccanismo generico in duel-engine.js, standbys:1).
    // SEMPLIFICAZIONE: dichiara sempre "Mostro" invece di lasciar
    // scegliere il tipo, e manda al Cimitero il primo trovato.
    // ================================================================
    CardEffects.register(658, {
        onDealsBattleDamage(ctx) {
            const deckKey = ctx.opponent === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck) || deck.length === 0) return;
            const index = deck.findIndex((c) => c.type === 'monster');
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.opponent === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.graveyard(ctx.opponent).push(card);
            ctx.log(`🧛 Signore dei Vampiri manda ${card.name} dal Deck dell'avversario al Cimitero!`);
        },
        onDestroy(ctx) {
            if (ctx.destroyedByOpponentCard) return;
            if (ctx.destroyedByOwner !== ctx.opponent) return;
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            const [card] = grave.splice(index, 1);
            ctx.reviveFromGraveyardWithCountdown(ctx.owner, card, 1);
            ctx.log('🧛 Signore dei Vampiri rinascerà alla tua prossima Standby Phase!');
        }
    });

    // ================================================================
    // 659 — Spirito della Polvere Oscura / Dark Dust Spirit (Mostro
    // Spirito)
    // Quando Evocata Normalmente o girata scoperta: distruggi tutti gli
    // altri mostri scoperti sul Terreno. Alla End Phase dello stesso
    // turno: ritorna in mano.
    // ================================================================
    CardEffects.register(659, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            destroyAllOtherMonsters(ctx);
        },
        onFlip(ctx) {
            destroyAllOtherMonsters(ctx);
        },
        onEndPhase(ctx) {
            if (ctx.card._returnToHandTurn !== gameState.turn) return;
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && slot.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.returnMonsterToHand(ctx.owner, index);
            ctx.log('👻 Spirito della Polvere Oscura ritorna in mano!');
        }
    });
    function destroyAllOtherMonsters(ctx) {
        ctx.card._returnToHandTurn = gameState.turn;
        let count = 0;
        ['player', 'bot'].forEach((owner) => {
            ctx.field(owner).forEach((slot, index) => {
                if (!slot || slot.isFaceDown || slot.card.uid === ctx.card.uid) return;
                ctx.destroyMonster(owner, index);
                count++;
            });
        });
        ctx.log(`👻 Spirito della Polvere Oscura distrugge ${count} altr${count === 1 ? 'o mostro' : 'i mostri'}!`);
    }

    // ================================================================
    // 660 — Tartaruga della Piramide / Pyramid Turtle (onDestroy —
    // distrutto in battaglia)
    // Quando distrutta in battaglia: Special Summon 1 mostro Zombie con
    // 2000 o meno DEF dal Deck. Stesso schema di Ratto Gigante (id 614)/
    // Drago Mascherato (id 644).
    // ================================================================
    CardEffects.register(660, {
        onDestroy(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.race === 'Zombie' && c.defense <= 2000);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🐢 Tartaruga della Piramide Special Summona ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 661 — Mietitore Spirituale / Spirit Reaper
    // Non può essere distrutta in battaglia (def.cannotBeDestroyedByBattle,
    // controllato in resolveBattleDamage/actions.js). Con un attacco
    // diretto: l'avversario scarta 1 carta a caso.
    // Vedi missingEffectNote su id 661 in cards.json per la clausola
    // "distrutta dopo un effetto che la bersaglia" mancante.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunta la clausola mancante "dopo che si è
    // risolto un effetto che ha come bersaglio questa carta scoperta,
    // distruggila" — riusa il checkpoint di targeting introdotto per
    // Gran Scudo Gardna/id 115 (ctx.declareTarget, duel-engine.js). Non
    // chiama ctx.cancel(): l'effetto sorgente prosegue normalmente
    // (l'auto-distruzione È l'effetto, non una negazione) — coperta solo
    // dagli effetti Carta che chiamano esplicitamente il checkpoint
    // (stessa SEMPLIFICAZIONE già documentata per id 115/235/353/738/826).
    CardEffects.register(661, {
        cannotBeDestroyedByBattle: true,
        canActivate(ctx) {
            return ctx.zone === 'monster';
        },
        onCardEffectTargetDeclare(ctx) {
            const index = ctx.field(ctx.owner).findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.destroyMonster(ctx.owner, index);
            ctx.log(`💀 ${ctx.card.name} viene distrutto: è stato preso di mira da un effetto Carta!`);
        },
        onDealsBattleDamage(ctx) {
            if (ctx.targetIndex !== -1) return;
            const discarded = ctx.discardRandomFromHand(ctx.opponent);
            if (!discarded) return;
            ctx.log(`💀 Mietitore Spirituale forza l'avversario a scartare ${discarded.name}!`);
        }
    });

    // ================================================================
    // 662 — Disperazione dall'Oscurità / Despair from the Dark
    // Se questa carta viene mandata dalla tua mano al tuo Cimitero da un
    // effetto dell'AVVERSARIO: Special Summonala — onSentToGraveyardFromHand
    // (nuovo hook in duel-engine.js/ctx.discardRandomFromHand).
    // SEMPLIFICAZIONE: il testo reale include anche "o dal Deck" — solo
    // la metà "dalla mano" è coperta (nessun mill del Deck in questo
    // dataset passa ancora da un aggancio generico riconoscibile).
    // ================================================================
    CardEffects.register(662, {
        onSentToGraveyardFromHand(ctx) {
            if (ctx.discardedByOwner !== ctx.opponent) return;
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = grave.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('💀 Disperazione dall\'Oscurità Special Summonata dopo essere stata scartata!');
        }
    });

    // ================================================================
    // 663 — Ryu Kokki (statico + onBattled)
    // Alla fine del Damage Step, se questa carta ha combattuto contro un
    // mostro Tipo Guerriero o Incantatore: distruggilo (onBattled,
    // actions.js — SEMPLIFICAZIONE: solo se Ryu Kokki è sopravvissuto
    // alla stessa battaglia, niente "ultima informazione nota").
    // ================================================================
    CardEffects.register(663, {
        onBattled(ctx) {
            if (!ctx.opponentSurvived) return;
            if (ctx.opponentCard.race !== 'Guerriero' && ctx.opponentCard.race !== 'Incantatore') return;
            const idx = ctx.field(ctx.opponent).findIndex((s) => s && s.card.uid === ctx.opponentCard.uid);
            if (idx === -1) return;
            ctx.destroyMonster(ctx.opponent, idx);
            ctx.log(`💀 Ryu Kokki distrugge ${ctx.opponentCard.name} dopo aver combattuto!`);
        }
    });

    // ================================================================
    // 664 — Torre d'Ossa Divora-Anime / Card of the Soul-Devouring Tower
    // (statico)
    // Se si controlla un altro mostro Tipo Zombie: questa carta non può
    // essere scelta come bersaglio per gli attacchi (gameState.
    // cannotBeAttackTargetUids). "Ogni volta che uno o più mostri Zombie
    // vengono Special Summonati: manda le prime 2 carte del Deck
    // avversario al Cimitero": def.onAnySpecialSummon (nuovo aggancio
    // generico, reactToAnySpecialSummon in duel-engine.js) — "prime 2
    // carte" = le ULTIME 2 dell'array (il Deck pesca con Array.pop(),
    // vedi drawCardsToHand/game-flow.js: la cima è la fine dell'array).
    // ================================================================
    CardEffects.register(664, {
        static(ctx) {
            const controlsAnotherZombie = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.uid !== ctx.card.uid && slot.card.race === 'Zombie');
            if (controlsAnotherZombie) {
                gameState.cannotBeAttackTargetUids[ctx.card.uid] = true;
            }
        },
        onAnySpecialSummon(ctx) {
            if (!ctx.summonedCard || ctx.summonedCard.race !== 'Zombie') return;
            const deckKey = ctx.opponent === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck) || deck.length === 0) return;
            const milled = deck.splice(Math.max(0, deck.length - 2), 2);
            gameState[ctx.opponent === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.graveyard(ctx.opponent).push(...milled);
            ctx.log(`💀 Torre d'Ossa Divora-Anime manda ${milled.length} cart${milled.length === 1 ? 'a' : 'e'} dal Deck dell'avversario al Cimitero!`);
        }
    });

    // ================================================================
    // 665 — Dama dei Vampiri / Vampire Lady — stesso identico effetto di
    // Signore dei Vampiri (id 658) qui sopra.
    // ================================================================
    CardEffects.register(665, {
        onDealsBattleDamage(ctx) {
            const deckKey = ctx.opponent === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck) || deck.length === 0) return;
            const index = deck.findIndex((c) => c.type === 'monster');
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.opponent === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.graveyard(ctx.opponent).push(card);
            ctx.log(`🧛 Dama dei Vampiri manda ${card.name} dal Deck dell'avversario al Cimitero!`);
        }
    });

    // ================================================================
    // 667 — Mummia Rigenerante / Regenerating Mummy
    // Se questa carta viene mandata dalla tua mano al tuo Cimitero da un
    // effetto dell'AVVERSARIO: ritorna in mano — onSentToGraveyardFromHand
    // (nuovo hook in duel-engine.js/ctx.discardRandomFromHand), come
    // Disperazione dall'Oscurità (id 662) qui sopra ma verso la mano.
    // ================================================================
    CardEffects.register(667, {
        onSentToGraveyardFromHand(ctx) {
            if (ctx.discardedByOwner !== ctx.opponent) return;
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            const [card] = grave.splice(index, 1);
            ctx.hand(ctx.owner).push(card);
            ctx.log('🧟 Mummia Rigenerante torna in mano dopo essere stata scartata!');
        }
    });

    // ================================================================
    // 668 — Grande Tornado / Giant Trunade (Magia Normale)
    // Rimetti in mano tutte le Magie/Trappole sul Terreno, di entrambi i
    // giocatori. Stesso schema di Tempesta Pesante (id 646), ma verso la
    // mano invece del Cimitero.
    // ================================================================
    CardEffects.register(668, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.stField(owner).some((s) => s));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (!slot) return;
                    ctx.hand(owner).push(slot.card);
                    ctx.stField(owner)[index] = null;
                    count++;
                });
            });
            ctx.log(`🌀 Grande Tornado rimette in mano ${count} cart${count === 1 ? 'a' : 'e'} Magia/Trappola!`);
        }
    });

    // ================================================================
    // 669 — Libro della Vita / Book of Life (Magia Normale)
    // Special Summon 1 mostro Zombie dal proprio Cimitero, poi bandisci
    // 1 mostro dal Cimitero dell'avversario.
    // SEMPLIFICAZIONE "banish": la carta sparisce e basta.
    // ================================================================
    CardEffects.register(669, {
        canActivate(ctx) {
            const hasZombie = ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Zombie');
            return hasZombie && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'monster' && c.race === 'Zombie');
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [revived] = grave.splice(index, 1);
            ctx.specialSummon(ctx.owner, revived, slotIndex, 'attack');
            const oppGrave = ctx.graveyard(ctx.opponent);
            let banishedName = null;
            if (oppGrave.length > 0) {
                const [banishedCard] = oppGrave.splice(0, 1);
                ctx.banish(ctx.opponent, banishedCard);
                banishedName = banishedCard.name;
            }
            ctx.log(`📖 Libro della Vita Special Summona ${revived.name}${banishedName ? ` e bandisce ${banishedName}` : ''}!`);
        }
    });

    // ================================================================
    // 670 — Richiamo della Mummia / Call of the Mummy (Magia Continua)
    // "Una volta per turno: puoi Special Summonare 1 mostro Tipo Zombie
    // dalla tua mano. Devi controllare zero mostri per attivare e
    // risolvere questo effetto." — stesso schema di def.repeatableWhileContinuous
    // già usato per Offerta Suprema (id 559)/Pietra del Potere Nero Pece
    // (id 751): ctx.card._mummyCallOnField distingue la prima
    // attivazione (Set/scoperta la prima volta) da ogni uso ripetibile
    // successivo, ctx.hasUsedOncePerTurn applica il limite di una volta a
    // turno per istanza.
    // ================================================================
    CardEffects.register(670, {
        continuous: true,
        repeatableWhileContinuous: true,
        canActivate(ctx) {
            if (!ctx.card._mummyCallOnField) return true;
            if (ctx.field(ctx.owner).some((s) => s)) return false;
            if (ctx.hasUsedOncePerTurn(`mummy-call:${ctx.card.uid}`)) return false;
            return ctx.hand(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Zombie');
        },
        activate(ctx) {
            if (!ctx.card._mummyCallOnField) {
                ctx.card._mummyCallOnField = true;
                ctx.log('⚱️ Richiamo della Mummia è ora sul Terreno!');
                return;
            }
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.type === 'monster' && c.race === 'Zombie');
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = hand.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.markUsedOncePerTurn(`mummy-call:${ctx.card.uid}`);
            ctx.log(`⚱️ Richiamo della Mummia Special Summona ${card.name} dalla mano!`);
        }
    });

    // ================================================================
    // 671 — Dispositivo di Evacuazione Forzata / Compulsory Evacuation
    // Device (Trappola Normale)
    // Scegli come bersaglio 1 mostro sul Terreno; ritorna quel bersaglio
    // in mano.
    // ================================================================
    CardEffects.register(671, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown));
        },
        activate(ctx) {
            const candidates = [];
            [ctx.opponent, ctx.owner].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => { if (slot && !slot.isFaceDown) candidates.push({ owner, index, card: slot.card }); });
            });
            if (candidates.length === 0) return;
            const choice = candidates[0];
            ctx.field(choice.owner)[choice.index] = null;
            ctx.hand(choice.owner).push(choice.card);
            ctx.log(`🚪 Dispositivo di Evacuazione Forzata rimanda ${choice.card.name} in mano!`);
        }
    });

    // ================================================================
    // 672 — Imperatore della Fiamma Infernale / Infernal Flame Emperor
    // Quando Evocata Tributo: bandisci fino a 5 mostri FUOCO dal proprio
    // Cimitero; distruggi altrettante Magie/Trappole sul Terreno.
    // ================================================================
    CardEffects.register(672, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            const grave = ctx.graveyard(ctx.owner);
            let banished = 0;
            for (let i = grave.length - 1; i >= 0 && banished < 5; i--) {
                if (grave[i].type === 'monster' && grave[i].attribute === 'FUOCO') {
                    const [card] = grave.splice(i, 1);
                    ctx.banish(ctx.owner, card);
                    banished++;
                }
            }
            if (banished === 0) return;
            let destroyed = 0;
            outer:
            for (const owner of ['player', 'bot']) {
                const st = ctx.stField(owner);
                for (let i = 0; i < st.length && destroyed < banished; i++) {
                    if (!st[i]) continue;
                    ctx.graveyard(owner).push(st[i].card);
                    st[i] = null;
                    destroyed++;
                    if (destroyed >= banished) break outer;
                }
            }
            ctx.log(`🔥 Imperatore della Fiamma Infernale bandisce ${banished} mostr${banished === 1 ? 'o' : 'i'} e distrugge ${destroyed} cart${destroyed === 1 ? 'a' : 'e'} Magia/Trappola!`);
        }
    });

    // ================================================================
    // 675 — Tartaruga UFO / UFO Turtle (onDestroy — distrutto in
    // battaglia)
    // Quando distrutta in battaglia: Special Summon 1 mostro FUOCO con
    // 1500 o meno ATK dal Deck. Stesso schema di Ratto Gigante (id 614).
    // ================================================================
    CardEffects.register(675, {
        onDestroy(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.attribute === 'FUOCO' && c.attack <= 1500);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🐢 Tartaruga UFO Special Summona ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 676 — Piccola Chimera / Little Chimera (statico, entrambi i lati)
    // Tutti i mostri FUOCO sul Terreno: +500 ATK. Tutti i mostri ACQUA
    // sul Terreno: -400 ATK.
    // ================================================================
    CardEffects.register(676, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    if (slot.card.attribute === 'FUOCO') gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 500, def: e.def };
                    else if (slot.card.attribute === 'ACQUA') gameState.atkDefBonus[slot.card.uid] = { atk: e.atk - 400, def: e.def };
                });
            });
        }
    });

    // ================================================================
    // 677 — Inferno (Ignition — Special Summon dalla mano)
    // Bandisci 1 mostro FUOCO dal proprio Cimitero per Special Summonarla
    // dalla mano. Se distrugge un mostro dell'avversario in battaglia:
    // 1500 danni (damageOnBattleDestroy, actions.js).
    // ================================================================
    CardEffects.register(677, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.attribute === 'FUOCO');
        },
        paySpecialSummonCost(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'monster' && c.attribute === 'FUOCO');
            if (index === -1) return false;
            const [banishedCard] = grave.splice(index, 1);
            ctx.banish(ctx.owner, banishedCard);
            ctx.log('🔥 Inferno bandisce 1 mostro FUOCO dal Cimitero per essere Special Summonata!');
            return true;
        },
        damageOnBattleDestroy: 1500
    });

    // ================================================================
    // 678 — Zombie Fuso / Molten Zombie
    // Quando Special Summonata dal Cimitero: pesca 1 carta.
    // ================================================================
    CardEffects.register(678, {
        onSpecialSummon(ctx) {
            if (ctx.summonedFromZone !== 'graveyard') return;
            ctx.drawCards(ctx.owner, 1);
            ctx.log('🔥 Zombie Fuso pesca 1 carta!');
        }
    });

    // ================================================================
    // 679 — Drago Vampata Solare / Solar Flare Dragon
    // Durante ciascuna propria End Phase: infliggi 500 danni
    // all'avversario. Vedi missingEffectNote su id 679 in cards.json per
    // il divieto "non può essere bersaglio di un attacco" mancante.
    // ================================================================
    CardEffects.register(679, {
        static(ctx) {
            const hasOtherPyro = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.uid !== ctx.card.uid && slot.card.race === 'Piroico');
            if (hasOtherPyro) {
                gameState.cannotBeAttackTargetUids[ctx.card.uid] = true;
            }
        },
        onEndPhase(ctx) {
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log('🔥 Drago Vampata Solare infligge 500 danni!');
        }
    });

    // ================================================================
    // 680 — Ragazzo del Baseball Estremo / Ultimate Baseball Kid
    // +1000 ATK per ogni altro mostro FUOCO scoperto sul Terreno.
    // Ignition: manda 1 altro mostro FUOCO scoperto al Cimitero per
    // infliggere 500 danni.
    // ================================================================
    CardEffects.register(680, {
        static(ctx) {
            const count = ['player', 'bot'].reduce((sum, owner) => sum + ctx.field(owner).filter((s) => s && !s.isFaceDown && s.card.attribute === 'FUOCO' && s.card.uid !== ctx.card.uid).length, 0);
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + count * 1000, def: e.def };
        },
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.attribute === 'FUOCO' && s.card.uid !== ctx.card.uid);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((s) => s && !s.isFaceDown && s.card.attribute === 'FUOCO' && s.card.uid !== ctx.card.uid);
            if (index === -1) return;
            const sent = field[index].card;
            ctx.graveyard(ctx.owner).push(sent);
            field[index] = null;
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log(`⚾ Ragazzo del Baseball Estremo manda ${sent.name} al Cimitero e infligge 500 danni!`);
        }
    });

    // ================================================================
    // 681 — Folletto della Fiamma Furente / Raging Flame Sprite
    // Se infligge danno da battaglia con un attacco diretto: guadagna
    // 1000 ATK in modo permanente. Vedi missingEffectNote su id 681 in
    // cards.json per "può attaccare direttamente" non implementato.
    // ================================================================
    // 681 — Folletto della Fiamma Furente / Fiend Reflection#2 (statico +
    // onDealsBattleDamage). "Può attaccare direttamente" implementato via
    // gameState.directAttackAllowedUids (sempre attivo, nessuna
    // condizione) — vedi resolveAttack/actions.js e ai-medium.js/
    // ai-hard.js per la scelta del bot.
    CardEffects.register(681, {
        static(ctx) {
            gameState.directAttackAllowedUids[ctx.card.uid] = true;
        },
        onDealsBattleDamage(ctx) {
            if (ctx.targetIndex !== -1) return;
            ctx.card.attack = (ctx.card.attack || 0) + 1000;
            ctx.log('🔥 Folletto della Fiamma Furente guadagna 1000 ATK!');
        }
    });

    // ================================================================
    // 682 — Thestalos il Monarca della Tempesta di Fuoco
    // Se Evocata Tributo: l'avversario scarta 1 carta a caso; se era un
    // Mostro, infliggi danni pari al suo Livello originale x 100.
    // ================================================================
    CardEffects.register(682, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            const discarded = ctx.discardRandomFromHand(ctx.opponent);
            if (!discarded) return;
            if (discarded.type === 'monster') {
                const damage = (discarded.level || 0) * 100;
                ctx.dealDamage(ctx.opponent, damage);
                ctx.log(`🔥 Thestalos scarta ${discarded.name} e infligge ${damage} danni!`);
            } else {
                ctx.log(`🔥 Thestalos scarta ${discarded.name} (non un Mostro: nessun danno).`);
            }
        }
    });

    // ================================================================
    // 683 — Anima di Gaia il Collettivo Combustibile / Gaia Soul the
    // Combustible Collective
    // Una volta per turno (Ignition): sacrifica fino a 2 mostri Tipo
    // Piroico; guadagna 1000 ATK per ciascuno (permanente). Danno
    // perforante (def.piercing, actions.js). Alla End Phase: si
    // distrugge da sola.
    // ================================================================
    CardEffects.register(683, {
        piercing: true,
        canActivate(ctx) {
            if (gameState.usedIgnitionThisTurn && gameState.usedIgnitionThisTurn[ctx.card.uid]) return false;
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.race === 'Piroico' && s.card.uid !== ctx.card.uid);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            let sacrificed = 0;
            for (let i = 0; i < field.length && sacrificed < 2; i++) {
                const s = field[i];
                if (!s || s.isFaceDown || s.card.race !== 'Piroico' || s.card.uid === ctx.card.uid) continue;
                ctx.graveyard(ctx.owner).push(s.card);
                field[i] = null;
                sacrificed++;
            }
            if (sacrificed === 0) return;
            ctx.card.attack = (ctx.card.attack || 0) + sacrificed * 1000;
            ctx.log(`🔥 Anima di Gaia sacrifica ${sacrificed} mostr${sacrificed === 1 ? 'o' : 'i'} Piroic${sacrificed === 1 ? 'o' : 'i'} e guadagna ${sacrificed * 1000} ATK!`);
        },
        onEndPhase(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.destroyMonster(ctx.owner, index);
            ctx.log('🔥 Anima di Gaia si distrugge alla End Phase!');
        }
    });

    // ================================================================
    // 684 — Fuoco Fatuo / Fox Fire (onDestroy — distrutto in battaglia)
    // Alla End Phase, se distrutta in battaglia in questo turno:
    // Special Summon dal Cimitero. cannotBeTributed: non può essere
    // sacrificata per un'Evocazione Tributo mentre scoperta sul Terreno
    // — controllato in handleTributeSelectClick/attemptMonsterSummon
    // (actions.js), lato giocatore (SEMPLIFICAZIONE: non applicato alla
    // selezione Tributi del bot, che non pesa questo tipo di divieto).
    // ================================================================
    CardEffects.register(684, {
        cannotBeTributed: true,
        onDestroy(ctx) {
            ctx.card._foxFireReviveTurn = gameState.turn;
        },
        onEndPhase(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid && c._foxFireReviveTurn === gameState.turn);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [revived] = grave.splice(index, 1);
            ctx.specialSummon(ctx.owner, revived, slotIndex, 'attack');
            ctx.log('🦊 Fuoco Fatuo risorge dal Cimitero!');
        }
    });

    // ================================================================
    // 685 — Distruzione Fusa / Molten Destruction (Magia Terreno)
    // Tutti i mostri FUOCO: +500 ATK / -400 DEF. Stesso schema di Zona
    // Plasma Mistica (id 619).
    // ================================================================
    CardEffects.register(685, {
        continuous: true,
        activate(ctx) {
            ctx.log('🌋 Distruzione Fusa attivata!');
        },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.attribute !== 'FUOCO') return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 500, def: e.def - 400 };
                });
            });
        }
    });

    // ================================================================
    // 686 — Camera Oscura degli Incubi / Dark Room of Nightmare
    // (Trappola Continua). Ogni volta che l'avversario subisce danno da
    // un effetto Carta (eccetto questa carta): infliggigli 300 danni in
    // più. Effetto interamente in
    // ACTIONS.dealDamage (duel-engine.js, live check sul campo, stesso
    // stile di Sosia id 204) — activate() qui sotto non fa altro che
    // confermarla scoperta sul Terreno (continuous:true).
    // ================================================================
    CardEffects.register(686, {
        continuous: true,
        activate(ctx) {
            ctx.log('🌑 Camera Oscura degli Incubi si attiva!');
        }
    });

    // ================================================================
    // 687 — Limite di Livello - Area B / Level Limit - Area B (Magia
    // Continua)
    // Cambia in Posizione di Difesa tutti i mostri scoperti di Livello 4
    // o superiore, di entrambi i giocatori — ricalcolato ad ogni render.
    // ================================================================
    CardEffects.register(687, {
        continuous: true,
        activate(ctx) {
            ctx.log('📉 Limite di Livello - Area B attivato!');
        },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && (slot.card.level || 0) >= 4) slot.position = 'defense';
                });
            });
        }
    });

    // ================================================================
    // 688 — Collana del Comando / Necklace of Command (Equipaggiamento)
    // Nessun bonus ATK/DEF. NON usa isEquip/equippedTarget: quel
    // meccanismo generico (recomputeStaticEffects, duel-engine.js)
    // manda già da solo al Cimitero una Carta Equipaggiamento con
    // bersaglio non più valido PRIMA di chiamare static() — quindi non
    // lascerebbe mai il tempo di eseguire l'effetto "pesca 1 carta" da
    // dentro static(). Qui si traccia il bersaglio a mano (stesso
    // pattern targetOwner/targetIndex/targetUid di Incantesimo Ombra id
    // 439/Cerchio Ammaliante id 620) apposta per poter agganciare il
    // proprio effetto al momento della pulizia. Vedi missingEffectNote
    // su id 688 in cards.json per le semplificazioni.
    // ================================================================
    CardEffects.register(688, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, () => true) !== -1; },
        activate(ctx) {
            const index = findEquipTarget(ctx, () => true);
            if (index === -1) return;
            const target = ctx.field(ctx.owner)[index].card;
            ctx.card.targetOwner = ctx.owner;
            ctx.card.targetIndex = index;
            ctx.card.targetUid = target.uid;
            ctx.log(`📿 Collana del Comando equipaggiata a ${target.name}!`);
        },
        static(ctx) {
            const targetSlot = ctx.card.targetOwner != null ? ctx.field(ctx.card.targetOwner)[ctx.card.targetIndex] : null;
            const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === ctx.card.targetUid;
            if (validTarget) return;
            ctx.stField(ctx.owner)[ctx.index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            const drawOption = () => {
                ctx.drawCards(ctx.owner, 1);
                ctx.log('📿 Collana del Comando va al Cimitero e pesca 1 carta!');
            };
            const discardOption = () => {
                const discarded = ctx.discardRandomFromHand(ctx.opponent);
                ctx.log(`📿 Collana del Comando va al Cimitero: ${ctx.opponent === 'player' ? 'scarti' : 'il bot scarta'}${discarded ? ` ${discarded.name}` : ''} a caso dalla mano!`);
            };
            // Scelta reale tra le due opzioni (DuelEngineUI.openChoicePopover,
            // gia' usato altrove per scelte binarie) — SCOPERTA: la nota
            // precedente diceva che questa carta pescasse sempre 1 carta
            // senza scelta, ma il componente per farla scegliere esisteva
            // gia'. Il bot (nessuna vera IA dedicata) sceglie sempre di
            // pescare, l'opzione piu' sicura.
            if (ctx.owner === 'player' && window.DuelEngineUI) {
                window.DuelEngineUI.openChoicePopover(null, {
                    title: '📿 Collana del Comando',
                    choiceA: { icon: '🃏', label: 'Pesca 1 carta', onSelect: drawOption },
                    choiceB: { icon: '🗑️', label: "L'avversario scarta 1 carta a caso", onSelect: discardOption }
                });
            } else {
                drawOption();
            }
        }
    });

    // ================================================================
    // 689 — Scudo Magico Tipo-8 / Spell Shield Type-8 (Trappola
    // Contatore)
    // Manda 1 Magia dalla mano al Cimitero; annulla e distruggi
    // l'attivazione di una Magia. Stesso schema di Interferenza Magica
    // (id 361), ma il costo dev'essere specificamente una Magia. Vedi
    // missingEffectNote su id 689 in cards.json per la modalità
    // alternativa non implementata.
    // ================================================================
    CardEffects.register(689, {
        canActivate(ctx) {
            if (!ctx.hand(ctx.owner).some((c) => c.type === 'spell')) return false;
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'spell');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.type === 'spell');
            if (index === -1) return;
            const [discarded] = hand.splice(index, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            if (ctx.negateActivation()) {
                ctx.log(`🛡️ Scudo Magico Tipo-8 manda ${discarded.name} al Cimitero e annulla la Magia!`);
            } else {
                ctx.log(`🛡️ Scudo Magico Tipo-8 manda ${discarded.name} al Cimitero, ma non c'era più nulla da annullare.`);
            }
        }
    });

    // ================================================================
    // 690 — Ritorno di Fiamma / Backfire (Trappola Continua)
    // Se un mostro FUOCO scoperto che si controlla viene distrutto e
    // mandato al Cimitero: infliggi 500 danni all'avversario. Riusa
    // onOwnMonsterDestroyed (duel-engine.js), già pronto ma non ancora
    // usato da nessuna carta di questo dataset.
    // ================================================================
    CardEffects.register(690, {
        continuous: true,
        activate(ctx) {
            ctx.log('🔥 Ritorno di Fiamma è ora sul Terreno!');
        },
        canActivate(ctx) {
            return ctx.destroyedCard.attribute === 'FUOCO';
        },
        onOwnMonsterDestroyed(ctx) {
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log(`🔥 Ritorno di Fiamma infligge 500 danni per la distruzione di ${ctx.destroyedCard.name}!`);
        }
    });

    // ================================================================
    // 691 — Signore Drago Oceanico - Neo-Daedalus / Ocean Dragon Lord -
    // Neo-Daedalus
    // Special Summon dalla mano sacrificando 1 Levia-Dragon - Daedalus
    // (id 700). Vedi missingEffectNote su id 691 in cards.json per il
    // reset totale (manda Umi al Cimitero per svuotare mano/Terreno di
    // entrambi) non implementato.
    // ================================================================
    CardEffects.register(691, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 700);
        },
        paySpecialSummonCost(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 700);
            if (index === -1) return false;
            ctx.graveyard(ctx.owner).push(field[index].card);
            field[index] = null;
            ctx.log('🐉 Signore Drago Oceanico sacrifica Levia-Dragon - Daedalus per essere Special Summonato!');
            return true;
        }
    });

    // ================================================================
    // 693 — Manta Perforante Strisciante / Creeping Doom Manta
    // Quando Evocata Normalmente con successo: nessuna Trappola può
    // essere attivata per il resto del turno (gameState.noTrapActivationFor,
    // controllato in canActivate() — duel-engine.js — e resettato in
    // changeTurn() — game-flow.js).
    // ================================================================
    CardEffects.register(693, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            gameState.noTrapActivationFor = gameState.noTrapActivationFor || {};
            gameState.noTrapActivationFor.player = true;
            gameState.noTrapActivationFor.bot = true;
            ctx.log('🦇 Manta Perforante Strisciante blocca tutte le Trappole per il resto del turno!');
        }
    });

    // ================================================================
    // 695 — Madre Grizzly / Mother Grizzly (onDestroy — distrutto in
    // battaglia)
    // Quando distrutta in battaglia: Special Summon 1 mostro ACQUA con
    // 1500 o meno ATK dal Deck. Stesso schema di Ratto Gigante (id 614).
    // ================================================================
    CardEffects.register(695, {
        onDestroy(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.attribute === 'ACQUA' && c.attack <= 1500);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🐻 Madre Grizzly Special Summona ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 696 — Ragazzo Stella / Star Boy (statico, entrambi i lati)
    // Tutti i mostri ACQUA sul Terreno: +500 ATK. Tutti i mostri FUOCO
    // sul Terreno: -400 ATK. Stesso schema di Piccola Chimera (id 676).
    // ================================================================
    CardEffects.register(696, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    if (slot.card.attribute === 'ACQUA') gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 500, def: e.def };
                    else if (slot.card.attribute === 'FUOCO') gameState.atkDefBonus[slot.card.uid] = { atk: e.atk - 400, def: e.def };
                });
            });
        }
    });

    // ================================================================
    // 697 — Virus Infetta-Tribù / Tribe-Infecting Virus (Ignition)
    // Scarta 1 carta e dichiara 1 Tipo; distruggi tutti i mostri
    // scoperti di quel Tipo sul Terreno.
    // SEMPLIFICAZIONE: dichiara automaticamente il Tipo più diffuso tra
    // i mostri scoperti dell'avversario, invece di lasciar scegliere.
    // ================================================================
    CardEffects.register(697, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).length > 0 && ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const [discarded] = hand.splice(0, 1);
            ctx.graveyard(ctx.owner).push(discarded);

            const raceCounts = {};
            ctx.field(ctx.opponent).forEach((s) => {
                if (s && !s.isFaceDown) raceCounts[s.card.race] = (raceCounts[s.card.race] || 0) + 1;
            });
            const declaredRace = Object.keys(raceCounts).sort((a, b) => raceCounts[b] - raceCounts[a])[0];
            if (!declaredRace) return;

            let destroyed = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.race === declaredRace) {
                        ctx.destroyMonster(owner, index);
                        destroyed++;
                    }
                });
            });
            ctx.log(`🦠 Virus Infetta-Tribù scarta ${discarded.name}, dichiara "${declaredRace}" e distrugge ${destroyed} mostr${destroyed === 1 ? 'o' : 'i'}!`);
        }
    });

    // ================================================================
    // 698 — Fenrir (Special Summon dalla mano bandendo 2 ACQUA dal
    // Cimitero)
    // Se distrugge un mostro dell'avversario in battaglia: l'avversario
    // salta la sua prossima Draw Phase (riusa gameState.skipDrawFor,
    // costruito per Avidità Sconsiderata id 653).
    // ================================================================
    CardEffects.register(698, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).filter((c) => c.type === 'monster' && c.attribute === 'ACQUA').length >= 2;
        },
        paySpecialSummonCost(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            let banished = 0;
            for (let i = grave.length - 1; i >= 0 && banished < 2; i--) {
                if (grave[i].type === 'monster' && grave[i].attribute === 'ACQUA') {
                    const [banishedCard] = grave.splice(i, 1);
                    ctx.banish(ctx.owner, banishedCard);
                    banished++;
                }
            }
            if (banished < 2) return false;
            ctx.log('🐺 Fenrir bandisce 2 mostri ACQUA dal Cimitero per essere Special Summonato!');
            return true;
        },
        onDealsBattleDamage(ctx) {
            // Solo se ha distrutto un mostro (non su un attacco diretto).
            if (ctx.targetIndex === -1) return;
            gameState.skipDrawFor = gameState.skipDrawFor || {};
            gameState.skipDrawFor[ctx.opponent] = (gameState.skipDrawFor[ctx.opponent] || 0) + 1;
            ctx.log("🐺 Fenrir fa saltare all'avversario la sua prossima Draw Phase!");
        }
    });

    // ================================================================
    // 699 — Bugroth Anfibio MK-3 / Amphibious Bugroth MK-3 (statico)
    // Finché "Umi" (id 497) è scoperta sul Terreno (di uno qualsiasi dei
    // due giocatori): può attaccare direttamente
    // (gameState.directAttackAllowedUids, stesso meccanismo di Sparatore
    // Sonico id 773/Drago Spada di Alligatore id 84 qui sopra).
    // ================================================================
    CardEffects.register(699, {
        static(ctx) {
            const umiOnField = ['playerFieldSpell', 'botFieldSpell'].some((key) => {
                const fs = gameState[key];
                return fs && !fs.isFaceDown && fs.card.id === 497;
            });
            if (umiOnField) {
                gameState.directAttackAllowedUids[ctx.card.uid] = true;
            }
        }
    });

    // ================================================================
    // 700 — Levia-Dragon - Daedalus
    // Ignition: manda 1 "Umi" (id 497) scoperta che si controlla al
    // Cimitero per distruggere tutte le altre carte sul Terreno.
    // ================================================================
    CardEffects.register(700, {
        canActivate(ctx) {
            return ctx.stField(ctx.owner).some((s) => s && !s.isFaceDown && s.card.id === 497);
        },
        activate(ctx) {
            const st = ctx.stField(ctx.owner);
            const umiIndex = st.findIndex((s) => s && !s.isFaceDown && s.card.id === 497);
            if (umiIndex === -1) return;
            const umi = st[umiIndex].card;
            ctx.graveyard(ctx.owner).push(umi);
            st[umiIndex] = null;

            let destroyed = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (!slot || slot.card.uid === ctx.card.uid) return;
                    ctx.graveyard(owner).push(slot.card);
                    ctx.field(owner)[index] = null;
                    destroyed++;
                });
                ctx.stField(owner).forEach((slot, index) => {
                    if (!slot) return;
                    ctx.graveyard(owner).push(slot.card);
                    ctx.stField(owner)[index] = null;
                    destroyed++;
                });
            });
            ctx.log(`🌊 Levia-Dragon manda Umi al Cimitero e distrugge ${destroyed} altre carte sul Terreno!`);
        }
    });

    // ================================================================
    // 701 — Cavaliere Sirena / Mermaid Knight
    // Finché "Umi" (id 497) è scoperta sul Terreno (di ENTRAMBI i
    // giocatori, testo reale "on the field" senza restrizione di
    // proprietario): può attaccare due volte — def.getExtraAttackCount(ctx),
    // lo stesso meccanismo dinamico già usato da Samurai Armato - Ben
    // Kei (id 721), al posto del semplice canAttackTwice fisso di prima
    // (che ignorava la condizione).
    // ================================================================
    CardEffects.register(701, {
        getExtraAttackCount(ctx) {
            const hasUmi = ['player', 'bot'].some((owner) => ctx.stField(owner).some((s) => s && !s.isFaceDown && s.card.id === 497));
            return hasUmi ? 1 : 0;
        }
    });

    // ================================================================
    // 702 — Mobius il Monarca del Gelo / Mobius the Frost Monarch
    // Se Evocata Tributo: distruggi fino a 2 Magie/Trappole sul Terreno.
    // ================================================================
    CardEffects.register(702, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => { if (slot) candidates.push({ owner, index, card: slot.card }); });
            });
            let destroyed = 0;
            for (const c of candidates) {
                if (destroyed >= 2) break;
                const slot = ctx.stField(c.owner)[c.index];
                if (!slot) continue;
                if (slot.isFaceDown) slot.isFaceDown = false;
                ctx.graveyard(c.owner).push(slot.card);
                ctx.stField(c.owner)[c.index] = null;
                destroyed++;
            }
            if (destroyed > 0) ctx.log(`❄️ Mobius il Monarca del Gelo distrugge ${destroyed} Magia/Trappola!`);
        }
    });

    // ================================================================
    // 704 — Salvataggio / Salvage (Magia Normale)
    // Scegli come bersaglio 2 mostri ACQUA con 1500 o meno ATK nel
    // Cimitero; aggiungili alla mano.
    // ================================================================
    CardEffects.register(704, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).filter((c) => c.type === 'monster' && c.attribute === 'ACQUA' && c.attack <= 1500).length > 0;
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const hand = ctx.hand(ctx.owner);
            let recovered = 0;
            for (let i = grave.length - 1; i >= 0 && recovered < 2; i--) {
                if (grave[i].type === 'monster' && grave[i].attribute === 'ACQUA' && grave[i].attack <= 1500) {
                    hand.push(grave.splice(i, 1)[0]);
                    recovered++;
                }
            }
            ctx.log(`🌊 Salvataggio recupera ${recovered} mostr${recovered === 1 ? 'o' : 'i'} dal Cimitero!`);
        }
    });

    // ================================================================
    // 705 — Colpo di Martello / Hammer Shot (Magia Normale)
    // Distruggi 1 mostro scoperto in Posizione di Attacco con l'ATK più
    // alto sul Terreno (entrambi i lati).
    // ================================================================
    CardEffects.register(705, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown && s.position === 'attack'));
        },
        activate(ctx) {
            let best = null;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (!slot || slot.isFaceDown || slot.position !== 'attack') return;
                    const atk = DuelEngine.getEffectiveAtk(slot.card);
                    if (!best || atk > best.atk) best = { owner, index, atk, card: slot.card };
                });
            });
            if (!best) return;
            const decl = ctx.declareTarget(best.owner, best.index, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`🔨 Colpo di Martello distrugge ${target ? target.card.name : best.card.name}!`);
        }
    });

    // ================================================================
    // 706 — Grande Onda Piccola Onda / Big Wave Small Wave (Magia
    // Normale)
    // Distruggi tutti i propri mostri ACQUA scoperti, poi Special
    // Summon mostri ACQUA dalla mano fino a quel numero.
    // ================================================================
    CardEffects.register(706, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.attribute === 'ACQUA');
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            let destroyed = 0;
            field.forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.attribute === 'ACQUA') {
                    ctx.graveyard(ctx.owner).push(slot.card);
                    field[index] = null;
                    destroyed++;
                }
            });
            const hand = ctx.hand(ctx.owner);
            let summoned = 0;
            while (summoned < destroyed) {
                const handIndex = hand.findIndex((c) => c.type === 'monster' && c.attribute === 'ACQUA');
                if (handIndex === -1) break;
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) break;
                const [card] = hand.splice(handIndex, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                summoned++;
            }
            ctx.log(`🌊 Grande Onda Piccola Onda distrugge ${destroyed} mostr${destroyed === 1 ? 'o' : 'i'} e ne Special Summona ${summoned}!`);
        }
    });

    // ================================================================
    // 707 — Legame di Gravità / Gravity Bind (Trappola Continua)
    // I mostri di Livello 4 o superiore non possono attaccare, di
    // entrambi i giocatori.
    // ================================================================
    CardEffects.register(707, {
        continuous: true,
        activate(ctx) {
            ctx.log('⛓️ Legame di Gravità attivato!');
        },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && (slot.card.level || 0) >= 4) gameState.cannotAttackUids[slot.card.uid] = true;
                });
            });
        }
    });

    // ================================================================
    // 709 — Gilford la Leggenda / Gilford the Legend
    // Quando Evocata Normalmente: equipaggia QUANTE PIÙ Carte
    // Equipaggiamento possibile dal Cimitero a un mostro Tipo Guerriero
    // che si controlla (limitato solo dalla disponibilità nel Cimitero e
    // dalle caselle libere in zona Magia/Trappola — nessuna scelta reale
    // da fare, il testo dice "tutte quelle che puoi").
    // ================================================================
    CardEffects.register(709, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            const targetIndex = ctx.field(ctx.owner).findIndex((s) => s && !s.isFaceDown && s.card.race === 'Guerriero');
            if (targetIndex === -1) return;
            const target = ctx.field(ctx.owner)[targetIndex].card;
            const grave = ctx.graveyard(ctx.owner);
            let equipped = 0;
            while (true) {
                const equipIndex = grave.findIndex((c) => c.type === 'spell' && c.subtype === 'equip');
                if (equipIndex === -1) break;
                const freeSlot = ctx.stField(ctx.owner).findIndex((s) => s === null);
                if (freeSlot === -1) break;
                const [equip] = grave.splice(equipIndex, 1);
                equip.equippedToOwner = ctx.owner;
                equip.equippedToIndex = targetIndex;
                equip.equippedToUid = target.uid;
                ctx.stField(ctx.owner)[freeSlot] = { card: equip, isFaceDown: false, setOnTurn: gameState.turn };
                equipped++;
            }
            if (equipped > 0) ctx.log(`⚔️ Gilford la Leggenda equipaggia ${equipped} Cart${equipped > 1 ? 'e' : 'a'} a ${target.name}!`);
        }
    });

    // ================================================================
    // 710 — Guerriera delle Terre Desolate / Warrior Lady of the
    // Wasteland (onDestroy — distrutto in battaglia)
    // Quando distrutta in battaglia: Special Summon 1 mostro Guerriero
    // TERRA con 1500 o meno ATK dal Deck.
    // ================================================================
    CardEffects.register(710, {
        onDestroy(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.race === 'Guerriero' && c.attribute === 'TERRA' && c.attack <= 1500);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`⚔️ Guerriera delle Terre Desolate Special Summona ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 712 — Guardiano Celtico Sgradito / Obnoxious Celtic Guard
    // Non può essere distrutto in battaglia da un mostro con 1900+ ATK —
    // immunità CONDIZIONATA (def.cannotBeDestroyedByBattle come funzione,
    // vedi actions.js).
    // ================================================================
    CardEffects.register(712, {
        cannotBeDestroyedByBattle: (opponentAtk) => (opponentAtk || 0) >= 1900
    });

    // ================================================================
    // 713 — Cavaliere Comandante / Command Knight (statico)
    // Tutti i mostri Tipo Guerriero che si controllano: +400 ATK. Se si
    // controlla un altro mostro (qualsiasi), questa carta stessa non può
    // essere scelta come bersaglio per gli attacchi (gameState.
    // cannotBeAttackTargetUids, duel-engine.js/actions.js).
    // ================================================================
    CardEffects.register(713, {
        static(ctx) {
            ctx.field(ctx.owner).forEach((slot) => {
                if (!slot || slot.isFaceDown || slot.card.race !== 'Guerriero') return;
                const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 400, def: e.def };
            });
            const controlsAnotherMonster = ctx.field(ctx.owner).some((slot) => slot && slot.card.uid !== ctx.card.uid);
            if (controlsAnotherMonster) {
                gameState.cannotBeAttackTargetUids[ctx.card.uid] = true;
            }
        }
    });

    // ================================================================
    // 714 — Capitano Predone / Marauding Captain
    // Quando Evocata Normalmente: puoi Special Summonare 1 mostro di
    // Livello 4 o inferiore dalla mano (SEMPLIFICAZIONE: sceglie da sola
    // il primo trovato in mano). L'avversario non può scegliere come
    // bersaglio per gli attacchi i mostri Tipo Guerriero controllati,
    // eccetto questa carta stessa (gameState.cannotBeAttackTargetUids).
    // ================================================================
    CardEffects.register(714, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.type === 'monster' && (c.level || 0) <= 4);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = hand.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`⚔️ Capitano Predone Special Summona ${card.name} dalla mano!`);
        },
        static(ctx) {
            ctx.field(ctx.owner).forEach((slot) => {
                if (!slot || slot.isFaceDown || slot.card.uid === ctx.card.uid || slot.card.race !== 'Guerriero') return;
                gameState.cannotBeAttackTargetUids[slot.card.uid] = true;
            });
        }
    });

    // ================================================================
    // 715 — Forza Esiliata / Exiled Force (Ignition — auto-sacrificio)
    // Sacrifica questa carta per distruggere 1 mostro sul Terreno.
    // ================================================================
    CardEffects.register(715, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && s.card.uid !== ctx.card.uid));
        },
        activate(ctx) {
            const candidates = [];
            [ctx.opponent, ctx.owner].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => { if (slot && slot.card.uid !== ctx.card.uid) candidates.push({ owner, index, card: slot.card }); });
            });
            if (candidates.length === 0) return;
            const choice = candidates[0];
            const field = ctx.field(ctx.owner);
            const selfIndex = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (selfIndex !== -1) {
                ctx.graveyard(ctx.owner).push(ctx.card);
                field[selfIndex] = null;
            }
            ctx.destroyMonster(choice.owner, choice.index);
            ctx.log(`⚔️ Forza Esiliata si sacrifica e distrugge ${choice.card.name}!`);
        }
    });

    // ================================================================
    // 716 — D.D. Guerriera / D.D. Warrior Lady (onBattled) — stesso
    // identico meccanismo di Guerriero D.D. (id 179) qui sopra.
    // ================================================================
    CardEffects.register(716, {
        onBattled(ctx) {
            if (ctx.opponentSurvived) {
                const oppField = ctx.field(ctx.opponent);
                const oppIdx = oppField.findIndex((s) => s && s.card.uid === ctx.opponentCard.uid);
                if (oppIdx !== -1) {
                    const oppCard = oppField[oppIdx].card;
                    oppField[oppIdx] = null;
                    ctx.banish(ctx.opponent, oppCard);
                    ctx.log(`⚔️ D.D. Guerriera bandisce ${ctx.opponentCard.name}!`);
                }
            }
            const ownField = ctx.field(ctx.owner);
            const ownIdx = ownField.findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (ownIdx !== -1) {
                ownField[ownIdx] = null;
                ctx.banish(ctx.owner, ctx.card);
                ctx.log('⚔️ D.D. Guerriera bandisce se stessa dopo aver combattuto!');
            }
        }
    });

    // ================================================================
    // 717 — Mataza il Fulminatore / Mataza the Zapper
    // Secondo attacco (canAttackTwice — vedi Cavaliere Sirena id 701) +
    // immunità al cambio di controllo (controlImmune, controllato
    // centralmente da ACTIONS.takeControl in duel-engine.js).
    // ================================================================
    CardEffects.register(717, {
        canAttackTwice: true,
        controlImmune: true
    });

    // ================================================================
    // 718 — Spadaccino Mistico LV2 / Mystic Swordsman LV2
    // Clausola 1: se attacca un mostro coperto in Posizione di Difesa, lo
    // distrugge all'inizio del Damage Step senza calcolo dei danni
    // (instantlyDestroysFaceDownDefender, caso speciale isolato in
    // resolveBattleDamage, actions.js — stesso flag di Paladino del Drago
    // Bianco/id 398).
    // Clausola 2: se distrugge un mostro dell'avversario in battaglia in
    // questo turno (onDestroysMonsterInBattle, actions.js — preciso: NON
    // scatta per un attacco diretto né per una battaglia che non distrugge
    // il bersaglio): alla End Phase si manda al Cimitero e Special
    // Summona Spadaccino Mistico LV4 (id 719) da mano o Deck. La
    // distruzione istantanea sopra conta come "ha distrutto un mostro" a
    // tutti gli effetti (fireOnDestroy scatta comunque).
    // ================================================================
    CardEffects.register(718, {
        instantlyDestroysFaceDownDefender: true,
        onDestroysMonsterInBattle(ctx) {
            ctx.card._swordsmanEvolveTurn = gameState.turn;
        },
        onEndPhase(ctx) {
            if (ctx.card._swordsmanEvolveTurn !== gameState.turn) return;
            let evolved = null;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.id === 719);
            if (handIdx !== -1) [evolved] = hand.splice(handIdx, 1);
            else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const deck = gameState[deckKey];
                if (Array.isArray(deck)) {
                    const deckIdx = deck.findIndex((c) => c.id === 719);
                    if (deckIdx !== -1) {
                        [evolved] = deck.splice(deckIdx, 1);
                        gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
                    }
                }
            }
            if (!evolved) return;
            const field = ctx.field(ctx.owner);
            const selfIndex = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (selfIndex === -1) return;
            field[selfIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(evolved); return; }
            ctx.specialSummon(ctx.owner, evolved, slotIndex, 'attack');
            ctx.log('⚔️ Spadaccino Mistico LV2 evolve in Spadaccino Mistico LV4!');
        }
    });

    // ================================================================
    // 719 — Spadaccino Mistico LV4 / Mystic Swordsman LV4
    // Non può essere Evocata Normalmente. All'inizio del Damage Step, se
    // attacca un mostro coperto in Difesa: distruggilo (onAttackDeclare
    // lato attaccante — vedi onOwnAttackDeclare in duel-engine.js). Vedi
    // missingEffectNote su id 719 in cards.json per l'evoluzione in LV6
    // non implementata.
    // ================================================================
    CardEffects.register(719, {
        cannotNormalSummon: true,
        onOwnAttackDeclare(ctx) {
            if (typeof ctx.targetIndex !== 'number' || ctx.targetIndex === -1) return;
            const targetSlot = ctx.field(ctx.opponent)[ctx.targetIndex];
            if (targetSlot && targetSlot.isFaceDown && targetSlot.position === 'defense') {
                const name = targetSlot.card.name;
                ctx.destroyMonster(ctx.opponent, ctx.targetIndex);
                ctx.cancelAttack();
                ctx.log(`⚔️ Spadaccino Mistico LV4 distrugge ${name} prima del combattimento!`);
            }
        }
    });

    // ================================================================
    // 720 — Gran Maestro Ninja Sasuke / Ninja Grandmaster Sasuke
    // All'inizio del Damage Step, se attacca un mostro scoperto in
    // Difesa: distruggilo. Stesso schema di id 719 qui sopra, ma per
    // Difesa SCOPERTA.
    // ================================================================
    CardEffects.register(720, {
        onOwnAttackDeclare(ctx) {
            if (typeof ctx.targetIndex !== 'number' || ctx.targetIndex === -1) return;
            const targetSlot = ctx.field(ctx.opponent)[ctx.targetIndex];
            if (targetSlot && !targetSlot.isFaceDown && targetSlot.position === 'defense') {
                const name = targetSlot.card.name;
                ctx.destroyMonster(ctx.opponent, ctx.targetIndex);
                ctx.cancelAttack();
                ctx.log(`🥷 Gran Maestro Ninja Sasuke distrugge ${name} prima del combattimento!`);
            }
        }
    });

    // ================================================================
    // 721 — Samurai Armato - Ben Kei / Armed Samurai - Ben Kei
    // Per ogni Carta Equipaggiamento equipaggiata a questa carta, guadagna
    // 1 attacco aggiuntivo durante ciascuna Battle Phase. getExtraAttackCount
    // è DINAMICO (ricalcolato ad ogni attacco da resolveAttack, actions.js,
    // non un valore fissato all'inizio del turno): conta le Carte
    // Equipaggiamento scoperte con equippedToUid === questa carta, esattamente
    // come fa già static() per i bonus ATK/DEF di un mostro equipaggiato.
    // ================================================================
    CardEffects.register(721, {
        getExtraAttackCount(ctx) {
            return ctx.stField(ctx.owner).filter((s) => s && !s.isFaceDown && s.card.equippedToUid === ctx.card.uid).length;
        }
    });

    // ================================================================
    // 722 — Spada Divina - Lama della Fenice / Divine Sword - Phoenix
    // Blade (Equipaggiamento, solo Guerriero)
    // +300 ATK. "Durante la tua Main Phase, se questa carta è nel tuo
    // Cimitero: puoi bandire 2 Guerrieri dal Cimitero per riprenderla in
    // mano" — def.canActivateFromGraveyardMainPhase/
    // activateFromGraveyardMainPhase (nuovo aggancio generico PROATTIVO,
    // fireOwnMainPhase1GraveyardActivations in duel-engine.js, diverso da
    // activatableFromGraveyard che è solo REATTIVO a un evento).
    // ================================================================
    CardEffects.register(722, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Guerriero') !== -1; },
        activate(ctx) { attachEquip(ctx, findEquipTarget(ctx, (c) => c.race === 'Guerriero')); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 300, def: e.def };
        },
        canActivateFromGraveyardMainPhase(ctx) {
            return ctx.graveyard(ctx.owner).filter((c) => c.type === 'monster' && c.race === 'Guerriero').length >= 2;
        },
        activateFromGraveyardMainPhase(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const warriors = grave.filter((c) => c.type === 'monster' && c.race === 'Guerriero').slice(0, 2);
            if (warriors.length < 2) return;
            const warriorUids = new Set(warriors.map((c) => c.uid));
            for (let i = grave.length - 1; i >= 0; i--) {
                if (warriorUids.has(grave[i].uid)) {
                    const [banished] = grave.splice(i, 1);
                    ctx.banish(ctx.owner, banished);
                }
            }
            const cardIndex = ctx.graveyard(ctx.owner).findIndex((c) => c.uid === ctx.card.uid);
            if (cardIndex === -1) return;
            const [card] = ctx.graveyard(ctx.owner).splice(cardIndex, 1);
            ctx.hand(ctx.owner).push(card);
            ctx.log(`⚔️ Spada Divina - Lama della Fenice bandisce 2 Guerrieri e torna in mano dal Cimitero!`);
        }
    });

    // ================================================================
    // 723 — Lama Fulminea / Lightning Blade (Equipaggiamento, solo
    // Guerriero)
    // +800 ATK al bersaglio equipaggiato. Tutti i mostri ACQUA sul
    // Terreno: -500 ATK.
    // ================================================================
    CardEffects.register(723, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Guerriero') !== -1; },
        activate(ctx) { attachEquip(ctx, findEquipTarget(ctx, (c) => c.race === 'Guerriero')); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 800, def: e.def };
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.attribute !== 'ACQUA') return;
                    const e2 = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e2.atk - 500, def: e2.def };
                });
            });
        }
    });

    // ================================================================
    // 724 — Rinforzo dell'Esercito / Reinforcement of the Army (Magia
    // Normale)
    // Aggiungi 1 mostro Guerriero di Livello 4 o inferiore dal Deck
    // alla mano.
    // ================================================================
    CardEffects.register(724, {
        canActivate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            return Array.isArray(deck) && deck.some((c) => c.type === 'monster' && c.race === 'Guerriero' && (c.level || 0) <= 4);
        },
        activate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            const index = deck.findIndex((c) => c.type === 'monster' && c.race === 'Guerriero' && (c.level || 0) <= 4);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.hand(ctx.owner).push(card);
            ctx.log(`⚔️ Rinforzo dell'Esercito aggiunge ${card.name} alla mano dal Deck!`);
        }
    });

    // ================================================================
    // 725 — Il Guerriero Ritorna in Vita / The Warrior Returning Alive
    // (Magia Normale)
    // Scegli come bersaglio 1 mostro Guerriero nel Cimitero; aggiungilo
    // alla mano.
    // ================================================================
    CardEffects.register(725, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Guerriero');
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'monster' && c.race === 'Guerriero');
            if (index === -1) return;
            const [card] = grave.splice(index, 1);
            ctx.hand(ctx.owner).push(card);
            ctx.log(`⚔️ Il Guerriero Ritorna in Vita recupera ${card.name} dal Cimitero!`);
        }
    });

    // ================================================================
    // 726 — Spada Fusione Lama Murasame / Fusion Sword Murasame Blade
    // (Equipaggiamento, solo Guerriero)
    // +800 ATK. Finché equipaggiata a un mostro, non può essere
    // distrutta da effetti Carta — cannotBeDestroyedByCardEffectWhileEquipped,
    // controllato dentro ACTIONS.destroySpellTrap (duel-engine.js).
    // ================================================================
    CardEffects.register(726, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Guerriero') !== -1; },
        activate(ctx) { attachEquip(ctx, findEquipTarget(ctx, (c) => c.race === 'Guerriero')); },
        isEquip: true,
        cannotBeDestroyedByCardEffectWhileEquipped: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 800, def: e.def };
        }
    });

    // ================================================================
    // 727 — Flamberge del Male Infranto - Baou / Wicked-Breaking
    // Flamberge - Baou (Equipaggiamento, qualsiasi mostro)
    // Manda 1 carta dalla mano al Cimitero, poi equipaggia a 1 mostro
    // sul Terreno (anche dell'avversario); +500 ATK. "Annulla gli
    // effetti dei mostri dell'avversario distrutti in battaglia dal
    // mostro equipaggiato": onDestroysMonsterInBattle (nuovo aggancio
    // per Carte Equipaggiamento in applyBattleDestroyBonus, actions.js)
    // — ctx.owner è il vero controllore di QUESTA carta (non
    // necessariamente il controllore del mostro equipaggiato, es. Baou
    // equipaggiata a un mostro avversario), quindi "l'avversario" è
    // sempre relativo a ctx.owner, non all'attaccante.
    // ================================================================
    CardEffects.register(727, {
        continuous: true,
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown));
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const candidates = [];
            [ctx.owner, ctx.opponent].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => { if (slot && !slot.isFaceDown) candidates.push({ owner, index, card: slot.card }); });
            });
            if (candidates.length === 0) return;
            const [discarded] = hand.splice(0, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            const choice = candidates[0];
            ctx.card.equippedToOwner = choice.owner;
            ctx.card.equippedToIndex = choice.index;
            ctx.card.equippedToUid = choice.card.uid;
            ctx.log(`⚔️ Flamberge del Male Infranto scarta ${discarded.name} e si equipaggia a ${choice.card.name}!`);
        },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
        },
        onDestroysMonsterInBattle(ctx) {
            if (!ctx.destroyedCard || ctx.destroyedCardOwner === ctx.owner) return;
            gameState.monsterEffectsNegatedUidsFor = gameState.monsterEffectsNegatedUidsFor || { player: new Set(), bot: new Set() };
            gameState.monsterEffectsNegatedUidsFor[ctx.destroyedCardOwner].add(ctx.destroyedCard.uid);
            ctx.log(`⚔️ ${ctx.card.name} annulla gli effetti di ${ctx.destroyedCard.name}!`);
        }
    });

    // ================================================================
    // 728 — Fata della Primavera / Fairy of the Spring (Magia Normale)
    // Scegli come bersaglio 1 Magia Equipaggiamento nel Cimitero;
    // aggiungila alla mano. Vedi missingEffectNote su id 728 in
    // cards.json per il blocco-attivazione "in questo turno" mancante.
    // ================================================================
    CardEffects.register(728, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'spell' && c.subtype === 'equip');
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'spell' && c.subtype === 'equip');
            if (index === -1) return;
            const [card] = grave.splice(index, 1);
            ctx.hand(ctx.owner).push(card);
            gameState.blockedCardUidsThisTurn = gameState.blockedCardUidsThisTurn || new Set();
            gameState.blockedCardUidsThisTurn.add(card.uid);
            ctx.log(`🌸 Fata della Primavera recupera ${card.name} dal Cimitero! Non può essere attivata in questo turno.`);
        }
    });

    // ================================================================
    // 729 — Vortice Fulmineo / Lightning Vortex (Magia Normale)
    // Scarta 1 carta; distruggi tutti i mostri scoperti dell'avversario.
    // ================================================================
    CardEffects.register(729, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).length > 0 && ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const [discarded] = hand.splice(0, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            let destroyed = 0;
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown) { ctx.destroyMonster(ctx.opponent, index); destroyed++; }
            });
            ctx.log(`⚡ Vortice Fulmineo scarta ${discarded.name} e distrugge ${destroyed} mostr${destroyed === 1 ? 'o' : 'i'}!`);
        }
    });

    // ================================================================
    // 730 — Spade della Luce Occultante / Swords of Concealing Light
    // (Magia Continua) — stesso schema a conto alla rovescia di Spada
    // Rivelatrice (id 8), ma gira i mostri dell'avversario coperti in
    // Difesa (invece di lasciarli scoperti senza poter attaccare) e ne
    // blocca il cambio Posizione.
    // SEMPLIFICAZIONE durata: 2 turni (approssima "fino alla propria 2ª
    // Standby Phase dopo l'attivazione").
    // ================================================================
    CardEffects.register(730, {
        continuous: true,
        durationTurns: 2,
        activate(ctx) {
            const slot = ctx.stField(ctx.owner)[ctx.index];
            if (slot) slot.turnsLeft = 2;
            let flipped = 0;
            ctx.field(ctx.opponent).forEach((s) => {
                if (s && !s.isFaceDown) { s.isFaceDown = true; s.position = 'defense'; flipped++; }
            });
            ctx.log(`🌑 Spade della Luce Occultante copre ${flipped} mostr${flipped === 1 ? 'o' : 'i'} dell'avversario in Difesa!`);
        },
        static(ctx) {
            ctx.field(ctx.opponent).forEach((s) => {
                if (s) gameState.cannotChangePositionUids[s.card.uid] = true;
            });
        }
    });

    // ================================================================
    // 732 — Esplosione a Catena / Blast with Chain (Trappola Normale,
    // Equipaggiamento)
    // Equipaggia a 1 mostro scoperto che si controlla; +500 ATK. Se
    // questa carta viene distrutta da un effetto Carta mentre è
    // equipaggiata: scegli come bersaglio 1 carta sul Terreno;
    // distruggila — onSTDestroyed (nuovo hook, ctx.destroySpellTrap è
    // l'UNICO modo in cui una Magia/Trappola viene distrutta "da un
    // effetto" in questo motore: la pulizia automatica di un Equip il
    // cui bersaglio è appena diventato non valido non passa da lì, quindi
    // non fa scattare questo hook — esattamente la distinzione richiesta
    // dal testo reale). ctx.card.equippedToUid, ancora presente
    // sull'oggetto carta anche da distrutta, conferma che era davvero
    // equipaggiata al momento.
    // SEMPLIFICAZIONE: sceglie il primo bersaglio trovato (mostro prima,
    // poi Magia/Trappola) invece di offrire una scelta — nessuna UI di
    // selezione bersaglio esiste per questo tipo di hook automatico.
    // ================================================================
    CardEffects.register(732, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, () => true) !== -1; },
        activate(ctx) { attachEquip(ctx, findEquipTarget(ctx, () => true)); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
        },
        onSTDestroyed(ctx) {
            if (!ctx.card.equippedToUid) return;
            for (const owner of ['player', 'bot']) {
                const monsterIndex = ctx.field(owner).findIndex((s) => s);
                if (monsterIndex !== -1) {
                    const name = ctx.field(owner)[monsterIndex].card.name;
                    ctx.destroyMonster(owner, monsterIndex);
                    ctx.log(`💥 Esplosione a Catena distrugge ${name}!`);
                    return;
                }
            }
            for (const owner of ['player', 'bot']) {
                const stIndex = ctx.stField(owner).findIndex((s) => s);
                if (stIndex !== -1) {
                    const name = ctx.stField(owner)[stIndex].card.name;
                    ctx.destroySpellTrap(owner, stIndex);
                    ctx.log(`💥 Esplosione a Catena distrugge ${name}!`);
                    return;
                }
            }
        }
    });

    // ================================================================
    // 733 — Stregone Eradicatore Oscuro / Dark Eradicator Warlock
    // Special Summon dalla mano sacrificando 1 "Mago Nero" (id 2). Ogni
    // volta che una Magia Normale viene attivata: 1000 danni
    // all'avversario. Riusa onCardActivated/canActivateOnCardActivated,
    // già costruito per Biblioteca Magica Reale (id 615).
    // ================================================================
    CardEffects.register(733, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
        },
        paySpecialSummonCost(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
            if (index === -1) return false;
            ctx.graveyard(ctx.owner).push(field[index].card);
            field[index] = null;
            ctx.log('🧙 Stregone Eradicatore Oscuro sacrifica Mago Nero per essere Special Summonato!');
            return true;
        },
        canActivateOnCardActivated(ctx) {
            return ctx.activatedCard.type === 'spell' && ctx.activatedCard.subtype === 'normal';
        },
        onCardActivated(ctx) {
            ctx.dealDamage(ctx.opponent, 1000);
            ctx.log('🧙 Stregone Eradicatore Oscuro infligge 1000 danni!');
        }
    });

    // ================================================================
    // 734 — Bestia Mitica Cerbero / Mythical Beast Cerberus
    // Segnalino Magia ad ogni Magia attivata (nessun massimo); +500 ATK
    // per Segnalino. Alla fine della Battle Phase, se questa carta ha
    // combattuto: rimuove tutti i Segnalini Magia (onBattlePhaseEnd,
    // duel-engine.js/game-flow.js — nuovo aggancio generico).
    // ================================================================
    CardEffects.register(734, {
        canActivateOnCardActivated(ctx) {
            return ctx.activatedCard.type === 'spell';
        },
        onCardActivated(ctx) {
            ctx.card.spellCounters = (ctx.card.spellCounters || 0) + 1;
            ctx.log(`🐺 Bestia Mitica Cerbero guadagna un Segnalino Magia (${ctx.card.spellCounters})!`);
        },
        static(ctx) {
            const count = ctx.card.spellCounters || 0;
            if (count === 0) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + count * 500, def: e.def };
        },
        onBattlePhaseEnd(ctx) {
            if (!ctx.card.battledThisBattlePhase) return;
            ctx.card.battledThisBattlePhase = false;
            if (!ctx.card.spellCounters) return;
            ctx.card.spellCounters = 0;
            ctx.log('🐺 Bestia Mitica Cerbero ha combattuto: rimuove tutti i Segnalini Magia!');
        }
    });

    // ================================================================
    // 736 — Abile Mago Oscuro / Skilled Dark Magician
    // Segnalino Magia ad ogni Magia attivata (max 3). Sacrificalo con 3
    // Segnalini per Special Summon 1 "Mago Nero" da mano/Deck/Cimitero.
    // ================================================================
    CardEffects.register(736, {
        canActivateOnCardActivated(ctx) {
            return ctx.activatedCard.type === 'spell';
        },
        onCardActivated(ctx) {
            const current = ctx.card.spellCounters || 0;
            if (current >= 3) return;
            ctx.card.spellCounters = current + 1;
            ctx.log(`🧙 Abile Mago Oscuro guadagna un Segnalino Magia (${ctx.card.spellCounters}/3)!`);
        },
        canActivate(ctx) {
            return (ctx.card.spellCounters || 0) >= 3;
        },
        activate(ctx) {
            let source = null, from = null;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.id === 2);
            if (handIdx !== -1) { source = hand; from = handIdx; }
            if (!source) {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const deck = gameState[deckKey];
                if (Array.isArray(deck)) {
                    const deckIdx = deck.findIndex((c) => c.id === 2);
                    if (deckIdx !== -1) { source = deck; from = deckIdx; }
                }
            }
            const grave = ctx.graveyard(ctx.owner);
            if (!source) {
                const graveIdx = grave.findIndex((c) => c.id === 2);
                if (graveIdx !== -1) { source = grave; from = graveIdx; }
            }
            if (!source) return;
            const [darkMagician] = source.splice(from, 1);
            if (source === gameState.playerDeck || source === gameState.botDeck) {
                gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = source.length;
            }
            const field = ctx.field(ctx.owner);
            const selfIndex = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (selfIndex !== -1) { ctx.graveyard(ctx.owner).push(ctx.card); field[selfIndex] = null; }
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(darkMagician); return; }
            ctx.specialSummon(ctx.owner, darkMagician, slotIndex, 'attack');
            ctx.log('🧙 Abile Mago Oscuro si sacrifica e Special Summona Mago Nero!');
        }
    });

    // ================================================================
    // 737 — Mago Apprendista / Apprentice Magician (onDestroy —
    // distrutto in battaglia)
    // Quando distrutta in battaglia: Special Summon 1 mostro Incantatore
    // di Livello 2 o inferiore dal Deck, coperto in Posizione di Difesa.
    // Vedi missingEffectNote su id 737 in cards.json per la clausola
    // "posiziona 1 Segnalino Magia all'Evocazione" non implementata.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunto l'effetto primario mancante ("se
    // Evocata: posiziona 1 Segnalino Magia su 1 carta scoperta che può
    // riceverne"). SEMPLIFICAZIONE: "può riceverne" è approssimato ai
    // soli bersagli con un meccanismo a Segnalini Magia già esistente in
    // questo dataset — Bestia Mitica Cerbero (id 734, card.spellCounters)
    // e Pietra del Potere Nero Pece (id 751, card.counters, nomi di
    // campo diversi per storia di sviluppo separata) — non un
    // riconoscimento generico "questa carta può ricevere Segnalini
    // Magia" per ogni carta futura.
    CardEffects.register(737, {
        onSummon(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((o) => {
                ctx.field(o).forEach((slot) => {
                    if (slot && !slot.isFaceDown && slot.card.uid !== ctx.card.uid && (slot.card.id === 734 || slot.card.id === 751)) candidates.push(slot.card);
                });
            });
            if (candidates.length === 0) return;
            const target = candidates[0];
            if (target.id === 734) target.spellCounters = (target.spellCounters || 0) + 1;
            else target.counters = (target.counters || 0) + 1;
            ctx.log(`🧙 Mago Apprendista posiziona 1 Segnalino Magia su ${target.name}!`);
        },
        onDestroy(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.race === 'Incantatore' && (c.level || 0) <= 2);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'defense');
            ctx.log(`🧙 Mago Apprendista Special Summona ${card.name} coperto dal Deck!`);
        }
    });

    // ================================================================
    // 739 — Tsukuyomi (Mostro Spirito)
    // Quando Evocata Normalmente o girata scoperta: scegli come
    // bersaglio 1 mostro scoperto sul Terreno; cambialo in Posizione di
    // Difesa coperta. Alla End Phase dello stesso turno: ritorna in
    // mano. Stesso schema di Spirito della Polvere Oscura (id 659).
    // SEMPLIFICAZIONE: sceglie da sola il primo mostro scoperto trovato
    // (preferendo quello dell'avversario), invece di un'interfaccia di
    // selezione dedicata.
    // ================================================================
    CardEffects.register(739, {
        onSummon(ctx) {
            // ATTENZIONE: qui "ctx" è il contesto del trigger ON_NORMAL_SUMMON/
            // ON_SPECIAL_SUMMON, dove per convenzione (vedi il commento su
            // ctx.summonedCard in duel-engine.js) "ctx.card" NON è la carta
            // evocata — è riservato alle carte di RISPOSTA (es. Buco
            // Trappola). La carta evocata è ctx.summonedCard.
            if (ctx.summonedVia !== 'normal') return;
            tsukuyomiEffect(ctx, ctx.summonedCard);
        },
        onFlip(ctx) {
            tsukuyomiEffect(ctx, ctx.card);
        },
        onEndPhase(ctx) {
            if (ctx.card._returnToHandTurn !== gameState.turn) return;
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && slot.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.returnMonsterToHand(ctx.owner, index);
            ctx.log('🌙 Tsukuyomi ritorna in mano!');
        }
    });
    function tsukuyomiEffect(ctx, selfCard) {
        selfCard._returnToHandTurn = gameState.turn;
        const candidates = [];
        [ctx.opponent, ctx.owner].forEach((owner) => {
            ctx.field(owner).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.uid !== selfCard.uid) candidates.push({ owner, index, card: slot.card });
            });
        });
        if (candidates.length === 0) return;
        const choice = candidates[0];
        const slot = ctx.field(choice.owner)[choice.index];
        slot.isFaceDown = true;
        slot.position = 'defense';
        ctx.log(`🌙 Tsukuyomi cambia ${choice.card.name} in Posizione di Difesa coperta!`);
    }

    // ================================================================
    // 740 — Stregone del Caos / Chaos Sorcerer
    // Special Summon dalla mano bandendo 1 mostro LUCE e 1 OSCURITÀ dal
    // Cimitero. Ignition, una volta per turno: bandisci 1 mostro
    // scoperto sul Terreno; questa carta non può attaccare in questo
    // turno.
    // ================================================================
    CardEffects.register(740, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            return grave.some((c) => c.type === 'monster' && c.attribute === 'LUCE') && grave.some((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ');
        },
        paySpecialSummonCost(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const lightIdx = grave.findIndex((c) => c.type === 'monster' && c.attribute === 'LUCE');
            if (lightIdx === -1) return false;
            const [lightCard] = grave.splice(lightIdx, 1);
            ctx.banish(ctx.owner, lightCard);
            const darkIdx = grave.findIndex((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ');
            if (darkIdx === -1) return false;
            const [darkCard] = grave.splice(darkIdx, 1);
            ctx.banish(ctx.owner, darkCard);
            ctx.log('🔮 Stregone del Caos bandisce 1 mostro LUCE e 1 OSCURITÀ per essere Special Summonato!');
            return true;
        },
        canActivate(ctx) {
            if (gameState.usedIgnitionThisTurn && gameState.usedIgnitionThisTurn[ctx.card.uid]) return false;
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown && s.card.uid !== ctx.card.uid));
        },
        activate(ctx) {
            const candidates = [];
            [ctx.opponent, ctx.owner].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.uid !== ctx.card.uid) candidates.push({ owner, index, card: slot.card });
                });
            });
            if (candidates.length === 0) return;
            const choice = candidates[0];
            ctx.field(choice.owner)[choice.index] = null;
            ctx.banish(choice.owner, choice.card);
            ctx.card._cannotAttackTurn = gameState.turn;
            ctx.log(`🔮 Stregone del Caos bandisce ${choice.card.name}!`);
        },
        static(ctx) {
            if (ctx.card._cannotAttackTurn === gameState.turn) gameState.cannotAttackUids[ctx.card.uid] = true;
        }
    });

    // ================================================================
    // 741 — Maga Bianca Pikeru / White Magician Pikeru
    // Durante la propria Standby Phase: +400 LP per ogni proprio mostro
    // sul Terreno.
    // ================================================================
    CardEffects.register(741, {
        onStandbyPhase(ctx) {
            const count = ctx.field(ctx.owner).filter((s) => s).length;
            if (count === 0) return;
            ctx.dealDamage(ctx.owner, -400 * count);
            ctx.log(`🧚 Maga Bianca Pikeru aumenta i Life Points di ${400 * count} punti!`);
        }
    });

    // ================================================================
    // 742 — Mago dell'Esplosione / Blast Magician
    // Segnalino Magia ad ogni Magia attivata (nessun massimo). Ignition:
    // rimuovi N Segnalini; distruggi 1 mostro scoperto con ATK<=N*700.
    // ================================================================
    CardEffects.register(742, {
        canActivateOnCardActivated(ctx) {
            return ctx.activatedCard.type === 'spell';
        },
        onCardActivated(ctx) {
            ctx.card.spellCounters = (ctx.card.spellCounters || 0) + 1;
            ctx.log(`🎆 Mago dell'Esplosione guadagna un Segnalino Magia (${ctx.card.spellCounters})!`);
        },
        canActivate(ctx) {
            const count = ctx.card.spellCounters || 0;
            if (count === 0) return false;
            const maxAtk = count * 700;
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown && DuelEngine.getEffectiveAtk(s.card) <= maxAtk));
        },
        activate(ctx) {
            const count = ctx.card.spellCounters || 0;
            if (count === 0) return;
            const maxAtk = count * 700;
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && DuelEngine.getEffectiveAtk(slot.card) <= maxAtk) candidates.push({ owner, index, card: slot.card });
                });
            });
            if (candidates.length === 0) return;
            const choice = candidates.reduce((best, c) => (DuelEngine.getEffectiveAtk(c.card) > DuelEngine.getEffectiveAtk(best.card) ? c : best));
            ctx.card.spellCounters = 0;
            ctx.destroyMonster(choice.owner, choice.index);
            ctx.log(`🎆 Mago dell'Esplosione rimuove ${count} Segnalini e distrugge ${choice.card.name}!`);
        }
    });

    // ================================================================
    // 743 — Maga Oscura Curran / Ebon Magician Curran
    // Durante la propria Standby Phase: 300 danni all'avversario per
    // ogni suo mostro sul Terreno.
    // ================================================================
    CardEffects.register(743, {
        onStandbyPhase(ctx) {
            const count = ctx.field(ctx.opponent).filter((s) => s).length;
            if (count === 0) return;
            ctx.dealDamage(ctx.opponent, 300 * count);
            ctx.log(`🧙 Maga Oscura Curran infligge ${300 * count} danni!`);
        }
    });

    // ================================================================
    // 744 — Mago a Fuoco Rapido / Rapid-Fire Magician
    // Infliggi 400 danni ogni volta che attivi una Magia Normale.
    // ================================================================
    CardEffects.register(744, {
        canActivateOnCardActivated(ctx) {
            return ctx.activatedCard.type === 'spell' && ctx.activatedCard.subtype === 'normal' && ctx.activatedOwner === ctx.owner;
        },
        onCardActivated(ctx) {
            ctx.dealDamage(ctx.opponent, 400);
            ctx.log('🔥 Mago a Fuoco Rapido infligge 400 danni!');
        }
    });

    // ================================================================
    // 745 — Esplosione Magica / Magical Explosion (Trappola Normale)
    // Correzione di fedeltà: era stata implementata come "Magical Blast"
    // (Magia, 200 danni per mostro Incantatore controllato) — una carta
    // reale DIVERSA, confusa con questa per il nome simile. La vera
    // "Magical Explosion": Trappola Normale, attivabile solo con la mano
    // vuota, 200 danni per ogni Magia nel proprio Cimitero — l'effetto è
    // già completo così, nessuna clausola aggiuntiva nel testo reale. Vedi
    // anche data/cards.json (type/subtype corretti da spell/normal a
    // trap/normal).
    // ================================================================
    CardEffects.register(745, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).length === 0;
        },
        activate(ctx) {
            const count = ctx.graveyard(ctx.owner).filter((c) => c.type === 'spell').length;
            ctx.dealDamage(ctx.opponent, 200 * count);
            ctx.log(`💥 Esplosione Magica infligge ${200 * count} danni!`);
        }
    });

    // ================================================================
    // 746 — Potere del Mago / Mage Power (Equipaggiamento, dinamico)
    // Il mostro equipaggiato guadagna 500 ATK/DEF per ogni Magia/
    // Trappola controllata dal suo proprietario (ricalcolato ad ogni
    // render, come Megamorfosi id 631).
    // ================================================================
    CardEffects.register(746, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, () => true) !== -1; },
        activate(ctx) { attachEquip(ctx, findEquipTarget(ctx, () => true)); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const count = ctx.stField(ctx.owner).filter((s) => s).length;
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + count * 500, def: e.def + count * 500 };
        }
    });

    // ================================================================
    // 747 — Onda di Diffusione / Diffusion Wave-Motion (variante quasi
    // identica di 199, Movimento d'Onda Diffuso — vedi
    // findLevel7SpellcasterTarget/grantAttackAllEnemiesOncEach più in
    // basso in questo file, condivisi tra le due). Seconda clausola
    // propria di 747: "gli effetti dei mostri distrutti da questi
    // attacchi non possono attivarsi e vengono annullati" —
    // gameState.negatesEffectsOnForcedAttackFor, consultato da
    // fireOnDestroy (actions.js).
    // ================================================================
    CardEffects.register(747, {
        canActivate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] < 1000) return false;
            if (!ctx.field(ctx.opponent).some((s) => s)) return false;
            return findLevel7SpellcasterTarget(ctx) !== -1;
        },
        activate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            const targetIndex = findLevel7SpellcasterTarget(ctx);
            if (targetIndex === -1) return;
            gameState[lpKey] -= 1000;
            const targetSlot = ctx.field(ctx.owner)[targetIndex];
            grantAttackAllEnemiesOncEach(ctx, targetIndex);
            // Seconda clausola, propria di 747 (non di 199): "gli effetti
            // dei mostri distrutti da questi attacchi non possono
            // attivarsi e vengono annullati" — vedi fireOnDestroy
            // (actions.js), che consulta questo Set.
            gameState.negatesEffectsOnForcedAttackFor = gameState.negatesEffectsOnForcedAttackFor || new Set();
            gameState.negatesEffectsOnForcedAttackFor.add(targetSlot.card.uid);
            ctx.log(`🌊 Onda di Diffusione: ${targetSlot.card.name} deve attaccare tutti i mostri avversari, e i loro effetti non si attiveranno se distrutti!`);
        }
    });

    // ================================================================
    // 748 — Attacco Magico Oscuro / Dark Magic Attack (Magia Normale)
    // Se controlli "Mago Nero" (id 2): distruggi tutte le Magie/Trappole
    // controllate dall'avversario.
    // ================================================================
    CardEffects.register(748, {
        canActivate(ctx) {
            const hasDarkMagician = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.id === 2);
            if (!hasDarkMagician) return false;
            return ctx.stField(ctx.opponent).some((s) => s);
        },
        activate(ctx) {
            let count = 0;
            ctx.stField(ctx.opponent).forEach((slot, index) => {
                if (!slot) return;
                ctx.destroySpellTrap(ctx.opponent, index);
                count++;
            });
            ctx.log(`🧙 Attacco Magico Oscuro distrugge ${count} Magia/Trappola dell'avversario!`);
        }
    });

    // ================================================================
    // 749 — Assorbimento Magico / Spell Absorption (Magia Continua)
    // Ogni volta che una Magia viene attivata (da chiunque): guadagna
    // 500 LP.
    // ================================================================
    CardEffects.register(749, {
        continuous: true,
        activate(ctx) {
            ctx.log('📖 Assorbimento Magico è ora sul Terreno!');
        },
        canActivateOnCardActivated(ctx) {
            return ctx.activatedCard.type === 'spell';
        },
        onCardActivated(ctx) {
            ctx.dealDamage(ctx.owner, -500);
            ctx.log('📖 Assorbimento Magico guadagna 500 Life Points!');
        }
    });

    // ================================================================
    // 750 — Gabbia d'Acciaio dell'Incubo / Nightmare's Steelcage (Magia
    // Normale) — resta 2 turni, nessun mostro può attaccare mentre è
    // scoperta. Stesso schema a conto alla rovescia di Spada Rivelatrice
    // (id 8)/Spade della Luce Occultante (id 730), ma blocca ENTRAMBI i
    // lati invece di uno solo.
    // ================================================================
    CardEffects.register(750, {
        continuous: true,
        durationTurns: 2,
        activate(ctx) {
            const slot = ctx.stField(ctx.owner)[ctx.index];
            if (slot) slot.turnsLeft = 2;
            ctx.log("🔒 Gabbia d'Acciaio dell'Incubo attivata: nessun mostro può attaccare per 2 turni!");
        },
        static(ctx) {
            gameState.cannotAttackFor.player = true;
            gameState.cannotAttackFor.bot = true;
        }
    });

    // ================================================================
    // 751 — Pietra del Potere Nero Pece / Pitch-Black Power Stone
    // Si attiva posizionando 3 Segnalini Magia su di sé (ctx.card.counters,
    // stesso campo generico già usato da Guardia di Carte id139/Distruttore
    // il Guerriero Magico id131). Una volta per turno, durante il proprio
    // turno: sposta 1 Segnalino Magia da sé a un'altra carta scoperta sul
    // Terreno; quando l'ultimo viene rimosso, si autodistrugge.
    // def.repeatableWhileContinuous (vedi Offerta Suprema id 559): la
    // stessa activate() gestisce sia la prima attivazione (posiziona i 3
    // Segnalini) sia ogni uso successivo ripetibile (ctx.card.counters
    // === null distingue le due), con un proprio contatore once-per-turn
    // via ctx.hasUsedOncePerTurn (il blocco generico usedIgnitionThisTurn
    // in duel-engine.js copre solo la zona 'monster', non 'st').
    // SEMPLIFICAZIONE: sceglie da sola il primo bersaglio idoneo trovato
    // (mostro o Magia/Trappola scoperti, di ENTRAMBI i giocatori, esclusa
    // se stessa) invece di un'interfaccia di selezione dedicata — e non
    // considera la Magia Terreno come bersaglio possibile (zona non
    // esposta pubblicamente da questo motore alle registrazioni carta).
    // ================================================================
    CardEffects.register(751, {
        continuous: true,
        repeatableWhileContinuous: true,
        canActivate(ctx) {
            if (ctx.card.counters == null) return true;
            if (ctx.card.counters <= 0) return false;
            if (ctx.hasUsedOncePerTurn(`751:${ctx.card.uid}`)) return false;
            const others = [
                ...ctx.field(ctx.owner), ...ctx.field(ctx.opponent),
                ...ctx.stField(ctx.owner), ...ctx.stField(ctx.opponent)
            ];
            return others.some((slot) => slot && !slot.isFaceDown && slot.card.uid !== ctx.card.uid);
        },
        activate(ctx) {
            if (ctx.card.counters == null) {
                ctx.card.counters = 3;
                ctx.log('🔮 Pietra del Potere Nero Pece si attiva con 3 Segnalini Magia!');
                return;
            }
            ctx.markUsedOncePerTurn(`751:${ctx.card.uid}`);
            const others = [
                ...ctx.field(ctx.owner), ...ctx.field(ctx.opponent),
                ...ctx.stField(ctx.owner), ...ctx.stField(ctx.opponent)
            ];
            const targetSlot = others.find((slot) => slot && !slot.isFaceDown && slot.card.uid !== ctx.card.uid);
            if (!targetSlot) return;
            ctx.card.counters -= 1;
            targetSlot.card.counters = (targetSlot.card.counters || 0) + 1;
            ctx.log(`🔮 Pietra del Potere Nero Pece sposta un Segnalino Magia su ${targetSlot.card.name}!`);
            if (ctx.card.counters <= 0) {
                ctx.destroySpellTrap(ctx.owner, ctx.index);
                ctx.log('💥 Pietra del Potere Nero Pece si distrugge: nessun Segnalino Magia rimasto!');
            }
        }
    });

    // ================================================================
    // 752 — Ira Divina / Divine Wrath (Trappola Contatore)
    // Quando un effetto di un Mostro viene attivato: scarta 1 carta;
    // annulla l'attivazione e distruggi quel mostro. Stesso schema di
    // risposta via Chain di Interferenza Magica (id 361)/Scudo Magico
    // Tipo-8 (id 689), ma per effetti Ignition di mostri.
    // ================================================================
    CardEffects.register(752, {
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'monster');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const chain = ctx.gameState.chain;
            const link = chain.links[chain.links.length - 1];
            const monsterCard = link.card;
            const monsterOwner = link.owner;
            const [discarded] = hand.splice(0, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            if (ctx.negateActivation()) {
                const field = ctx.field(monsterOwner);
                const index = field.findIndex((s) => s && s.card.uid === monsterCard.uid);
                if (index !== -1) ctx.destroyMonster(monsterOwner, index);
                ctx.log(`⚡ Ira Divina scarta ${discarded.name}, annulla e distrugge ${monsterCard.name}!`);
            } else {
                ctx.log(`⚡ Ira Divina scarta ${discarded.name}, ma non c'era più nulla da annullare.`);
            }
        }
    });

    // ================================================================
    // Effetto Ignition condiviso "gira te stessa coperta in Posizione di
    // Difesa" (Grande Spirito id 754, Sfinge Guardiana id 756, Sentinella
    // Golem id 759, Cannoni Intercettori Moai id 762, Statua Guardiana
    // id 764, Verme Medusa id 765) — una volta per turno (gestito già in
    // automatico da gameState.usedIgnitionThisTurn, controllato dal
    // canActivate generico in duel-engine.js prima ancora di chiamare
    // questo). Il proprio effetto Flip (onFlip) NON riparte qui (girarsi
    // da soli coperti non è una Flip Summon) — riparte da sé più avanti
    // se l'avversario attacca questa carta e la rivela in battaglia
    // (meccanismo già esistente in resolveBattleDamage, actions.js).
    // Nessun ctx.slot per una Ignition da campo mostri (solo ctx.index):
    // vedi il commento su canActivate/ctx in duel-engine.js.
    // ================================================================
    function selfFlipToFaceDownDefense(ctx) {
        const slot = ctx.field(ctx.owner)[ctx.index];
        if (!slot) return;
        slot.isFaceDown = true;
        slot.position = 'defense';
        ctx.log(`🔄 ${ctx.card.name} si gira coperta in Posizione di Difesa!`);
    }
    function canSelfFlip(ctx) {
        const slot = ctx.field(ctx.owner)[ctx.index];
        return !!slot && !slot.isFaceDown;
    }

    // ================================================================
    // 753 — Exxod, Maestro della Guardia
    // Special Summon dalla mano sacrificando 1 mostro il cui nome
    // contiene "Sfinge" (Sfinge Guardiana id 756, Hieracosfinge id 760,
    // Criosfinge id 761). Ogni volta che un mostro TERRA viene Flip
    // Summonato mentre questa carta resta scoperta: 1000 danni
    // (ctx.summonedVia === 'flip' qui sotto esclude correttamente
    // Evocazione Normale/Special — nota precedente obsoleta rimossa).
    // ================================================================
    CardEffects.register(753, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.name.includes('Sfinge'));
        },
        paySpecialSummonCost(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.name.includes('Sfinge'));
            if (index === -1) return false;
            ctx.graveyard(ctx.owner).push(field[index].card);
            field[index] = null;
            ctx.log('🗿 Exxod sacrifica una Sfinge per essere Special Summonato!');
            return true;
        },
        // CORREZIONE di fedeltà + bug reale: ctx.summonedCard non esisteva
        // affatto prima (il vecchio codice avrebbe lanciato un'eccezione
        // al primo Normal/Flip Summon con Exxod in campo) — ora passato
        // da reactToAnyNormalOrFlipSummon (duel-engine.js). Inoltre il
        // vero Exxod scatta SOLO su Flip Summon, non su Evocazione
        // Normale (ctx.summonedVia === 'flip').
        onAnyNormalOrFlipSummon(ctx) {
            if (ctx.summonedVia !== 'flip' || !ctx.summonedCard || ctx.summonedCard.attribute !== 'TERRA') return;
            ctx.dealDamage(ctx.opponent, 1000);
            ctx.log('🗿 Exxod infligge 1000 danni per un Flip Summon TERRA!');
        }
    });

    // ================================================================
    // 754 — Grande Spirito / Great Spirit
    // Ignition condivisa: gira se stessa coperta (id 754/756/759/762/
    // 764/765). Quando Girata Scoperta (Flip Summon): scambia ATK/DEF
    // originali di 1 mostro TERRA scoperto sul Terreno fino a fine turno.
    // ================================================================
    CardEffects.register(754, {
        canActivate: canSelfFlip,
        activate: selfFlipToFaceDownDefense,
        onFlip(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => { if (slot && !slot.isFaceDown && slot.card.attribute === 'TERRA') candidates.push({ owner, index, card: slot.card }); });
            });
            if (candidates.length === 0) return;
            const choice = candidates[0];
            const oldAtk = choice.card.attack, oldDef = choice.card.defense;
            choice.card.attack = oldDef;
            choice.card.defense = oldAtk;
            ctx.log(`🌀 Grande Spirito scambia ATK/DEF di ${choice.card.name}!`);
        }
    });

    // ================================================================
    // 755 — Maharaghi (Mostro Spirito)
    // Ritorna in mano alla End Phase del turno in cui viene Evocata
    // Normalmente o girata scoperta. Stesso schema di Tsukuyomi (id 739).
    // "Guarda la prima carta del tuo Deck alla tua prossima Draw Phase e
    // rimettila in cima o in fondo": effetto RITARDATO che sopravvive al
    // ritorno in mano di questa carta stessa — gameState.pendingMaharaghiPeekFor
    // (per owner), consultato da enterDrawPhase (game-flow.js) prima
    // della pesca vera e propria.
    // ================================================================
    CardEffects.register(755, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            ctx.card._returnToHandTurn = gameState.turn;
            gameState.pendingMaharaghiPeekFor = gameState.pendingMaharaghiPeekFor || {};
            gameState.pendingMaharaghiPeekFor[ctx.owner] = true;
        },
        onFlip(ctx) {
            ctx.card._returnToHandTurn = gameState.turn;
            gameState.pendingMaharaghiPeekFor = gameState.pendingMaharaghiPeekFor || {};
            gameState.pendingMaharaghiPeekFor[ctx.owner] = true;
        },
        onEndPhase(ctx) {
            if (ctx.card._returnToHandTurn !== gameState.turn) return;
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && slot.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.returnMonsterToHand(ctx.owner, index);
            ctx.log('👤 Maharaghi ritorna in mano!');
        }
    });

    // ================================================================
    // 756 — Sfinge Guardiana / Guardian Sphinx — Ignition condivisa
    // (vedi id 754). Quando Girata Scoperta: rimetti in mano TUTTI i
    // mostri controllati dall'avversario.
    // ================================================================
    CardEffects.register(756, {
        canActivate: canSelfFlip,
        activate: selfFlipToFaceDownDefense,
        onFlip(ctx) {
            let count = 0;
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (!slot) return;
                ctx.hand(ctx.opponent).push(slot.card);
                ctx.field(ctx.opponent)[index] = null;
                count++;
            });
            ctx.log(`🗿 Sfinge Guardiana rimette in mano ${count} mostr${count === 1 ? 'o' : 'i'} dell'avversario!`);
        }
    });

    // ================================================================
    // 757 — Gigantes
    // Special Summon dalla mano bandendo 1 mostro TERRA dal Cimitero.
    // Se distrutta in battaglia: distruggi tutte le Magie/Trappole sul
    // Terreno.
    // ================================================================
    CardEffects.register(757, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.attribute === 'TERRA');
        },
        paySpecialSummonCost(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'monster' && c.attribute === 'TERRA');
            if (index === -1) return false;
            const [banishedCard] = grave.splice(index, 1);
            ctx.banish(ctx.owner, banishedCard);
            ctx.log('🗿 Gigantes bandisce 1 mostro TERRA per essere Special Summonato!');
            return true;
        },
        onDestroy(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (!slot) return;
                    ctx.graveyard(owner).push(slot.card);
                    ctx.stField(owner)[index] = null;
                    count++;
                });
            });
            if (count > 0) ctx.log(`🗿 Gigantes distrugge ${count} Magia/Trappola alla propria distruzione!`);
        }
    });

    // ================================================================
    // 759 — Sentinella Golem / Golem Sentry — Ignition condivisa (vedi
    // id 754). Quando Girata Scoperta: rimanda 1 mostro dell'avversario
    // in mano.
    // ================================================================
    CardEffects.register(759, {
        canActivate: canSelfFlip,
        activate: selfFlipToFaceDownDefense,
        onFlip(ctx) {
            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((s) => s);
            if (index === -1) return;
            const card = field[index].card;
            ctx.hand(ctx.opponent).push(card);
            field[index] = null;
            ctx.log(`🗿 Sentinella Golem rimanda ${card.name} in mano!`);
        }
    });

    // ================================================================
    // 760 — Hieracosfinge / Hieracosphinx (statico)
    // Finché resta scoperta sul Terreno: l'avversario non può scegliere
    // un mostro coperto in Posizione di Difesa che si controlla come
    // bersaglio per un attacco (gameState.cannotBeAttackTargetUids).
    // ================================================================
    CardEffects.register(760, {
        static(ctx) {
            ctx.field(ctx.owner).forEach((slot) => {
                if (!slot || !slot.isFaceDown) return;
                gameState.cannotBeAttackTargetUids[slot.card.uid] = true;
            });
        }
    });

    // ================================================================
    // 761 — Criosfinge / Cryosphinx
    // Quando un mostro ritorna dal Terreno alla mano del proprietario:
    // quel proprietario sceglie e manda 1 carta dalla sua mano al
    // Cimitero. Nuovo aggancio onAnyMonsterReturnedToHand
    // (ACTIONS.returnMonsterToHand, duel-engine.js) — reagisce da
    // ENTRAMBI i lati del Terreno (non solo il proprio controllore),
    // dato che il testo reale non è legato a CHI controlla Criosfinge.
    // SEMPLIFICAZIONE dichiarata: il "sceglie" reale diventa uno scarto
    // casuale (ctx.discardRandomFromHand, come altrove in questo file).
    // Copre solo i "torna in mano dal Terreno" già migrati a usare
    // ACTIONS.returnMonsterToHand (Tsukuyomi, Maharaghi, Spirito della
    // Polvere Oscura, Cavaliere Missile, Malvagia Bestia Verme, Prova
    // del Viandante), non ogni altro "torna in mano" di questo file.
    // ================================================================
    CardEffects.register(761, {
        onAnyMonsterReturnedToHand(ctx) {
            const discarded = ctx.discardRandomFromHand(ctx.returnedOwner);
            if (discarded) {
                ctx.log(`❄️ Criosfinge: ${ctx.returnedOwner === 'player' ? 'scarti' : 'il bot scarta'} ${discarded.name}!`);
            }
        }
    });

    // ================================================================
    // 762 — Cannoni Intercettori Moai / Moai Interceptor Cannons —
    // Ignition condivisa soltanto (vedi id 754), nessun effetto Flip
    // proprio.
    // ================================================================
    CardEffects.register(762, {
        canActivate: canSelfFlip,
        activate: selfFlipToFaceDownDefense
    });

    // ================================================================
    // 763 — Drago Megaroccia / Megarock Dragon
    // Special Summon dalla mano bandendo mostri Tipo Roccia dal
    // Cimitero (quanti se ne vuole); ATK/DEF originali diventano pari al
    // numero bandito x 700.
    // SEMPLIFICAZIONE: bandisce sempre TUTTI i mostri Roccia disponibili
    // nel Cimitero, invece di lasciar scegliere quanti.
    // ================================================================
    CardEffects.register(763, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Roccia');
        },
        paySpecialSummonCost(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            let banished = 0;
            for (let i = grave.length - 1; i >= 0; i--) {
                if (grave[i].type === 'monster' && grave[i].race === 'Roccia') {
                    const [card] = grave.splice(i, 1);
                    ctx.banish(ctx.owner, card);
                    banished++;
                }
            }
            if (banished === 0) return false;
            ctx.card.attack = banished * 700;
            ctx.card.defense = banished * 700;
            ctx.log(`🐉 Drago Megaroccia bandisce ${banished} mostr${banished === 1 ? 'o' : 'i'} Roccia: ATK/DEF diventano ${banished * 700}!`);
            return true;
        }
    });

    // ================================================================
    // 764 — Statua Guardiana / Guardian Statue — Ignition condivisa
    // (vedi id 754). Quando Girata Scoperta: rimanda 1 mostro
    // dell'avversario in mano. Stesso identico effetto di Sentinella
    // Golem (id 759).
    // ================================================================
    CardEffects.register(764, {
        canActivate: canSelfFlip,
        activate: selfFlipToFaceDownDefense,
        onFlip(ctx) {
            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((s) => s);
            if (index === -1) return;
            const card = field[index].card;
            ctx.hand(ctx.opponent).push(card);
            field[index] = null;
            ctx.log(`🗿 Statua Guardiana rimanda ${card.name} in mano!`);
        }
    });

    // ================================================================
    // 765 — Verme Medusa / Medusa Worm — Ignition condivisa (vedi
    // id 754). Quando Girata Scoperta: distruggi 1 mostro dell'avversario.
    // ================================================================
    CardEffects.register(765, {
        canActivate: canSelfFlip,
        activate: selfFlipToFaceDownDefense,
        onFlip(ctx) {
            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((s) => s && !s.isFaceDown);
            const fallbackIndex = index !== -1 ? index : field.findIndex((s) => s);
            if (fallbackIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, fallbackIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const card = targetSlot.card;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`🐍 Verme Medusa distrugge ${card.name}!`);
        }
    });

    // ================================================================
    // 766 — Falena della Sabbia / Sand Moth (onDestroy)
    // Quando questa carta coperta in Posizione di Difesa viene distrutta
    // e mandata al Cimitero, TRANNE che in battaglia: scambia l'ATK e la
    // DEF originali di questa carta e Special Summonala — ctx.destroyedByOpponentCard
    // esclude la battaglia (valorizzato solo lì), ctx.wasFaceDown/
    // wasPosition (nuovi campi in ACTIONS.destroyMonster, duel-engine.js)
    // confermano che era coperta in Difesa al momento della distruzione.
    // ================================================================
    CardEffects.register(766, {
        onDestroy(ctx) {
            if (ctx.destroyedByOpponentCard) return;
            if (!ctx.wasFaceDown || ctx.wasPosition !== 'defense') return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            const card = grave.splice(index, 1)[0];
            const originalAtk = card.attack;
            card.attack = card.defense;
            card.defense = originalAtk;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('🦋 Falena della Sabbia torna in campo con ATK e DEF scambiati!');
        }
    });

    // ================================================================
    // 767 — Canyon (Magia Terreno)
    // Se un mostro Tipo Roccia in Posizione di Difesa viene attaccato da
    // un mostro con ATK inferiore alla sua DEF: raddoppia il danno da
    // battaglia subito dall'attaccante. Nessun handler qui: il danno da
    // raddoppiare esiste solo nel ramo "l'attacco rimbalza" di
    // resolveBattleDamage (actions.js), quindi il controllo su Canyon è
    // fatto direttamente lì — vedi il commento lì per i dettagli.
    // ================================================================
    CardEffects.register(767, {
        continuous: true,
        activate(ctx) {
            ctx.log('🏜️ Canyon attivato!');
        }
    });

    // ================================================================
    // 768 — Maglio Magico / Magical Mallet (Magia Normale)
    // Rimescola un NUMERO QUALSIASI (scelto dal giocatore) di carte dalla
    // mano nel Deck e pesca altrettante — selezione ripetuta con
    // DuelEngineUI.openCardListPicker (una carta alla volta, chiudere il
    // box = fine selezione), stesso componente già usato altrove per
    // scegliere tra più candidati, qui riusato in un ciclo per un
    // "quanti vuoi" invece di un singolo bersaglio. Il bot (nessuna vera
    // IA dedicata per questa scelta di nicchia) rimescola sempre l'intera
    // mano, come prima.
    // ================================================================
    function pickMagicalMalletCards(ctx, hand, selected) {
        const remaining = hand.filter((c) => !selected.includes(c));
        const finish = () => {
            const count = selected.length;
            if (count === 0) { ctx.log('🔨 Maglio Magico: nessuna carta scelta, nulla da rimescolare.'); return; }
            selected.forEach((c) => { const idx = hand.indexOf(c); if (idx !== -1) hand.splice(idx, 1); });
            if (!ctx.shuffleIntoDeck(ctx.owner, selected)) { hand.push(...selected); return; }
            ctx.drawCards(ctx.owner, count);
            ctx.log(`🔨 Maglio Magico rimescola ${count} cart${count === 1 ? 'a' : 'e'} nel Deck e ne pesca altrettante!`);
        };
        if (remaining.length === 0) { finish(); return; }
        window.DuelEngineUI.openCardListPicker(remaining, {
            title: '🔨 Maglio Magico',
            text: `Scegli 1 carta da rimescolare nel Deck, o chiudi per fermarti qui (${selected.length} scelt${selected.length === 1 ? 'a' : 'e'} finora).`,
            onSelect: (card) => { selected.push(card); pickMagicalMalletCards(ctx, hand, selected); },
            onCancel: finish
        });
    }
    CardEffects.register(768, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).length > 0;
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (ctx.owner === 'player' && window.DuelEngineUI) {
                pickMagicalMalletCards(ctx, hand, []);
                return;
            }
            const count = hand.length;
            const returned = hand.splice(0, hand.length);
            if (!ctx.shuffleIntoDeck(ctx.owner, returned)) {
                hand.push(...returned);
                return;
            }
            ctx.drawCards(ctx.owner, count);
            ctx.log(`🔨 Maglio Magico rimescola ${count} cart${count === 1 ? 'a' : 'e'} nel Deck e ne pesca altrettante!`);
        }
    });

    // ================================================================
    // 769 — Ombre Mutevoli / Shifting Shadows
    // Una volta per turno, pagando 300 LP: riordina i mostri coperti in
    // Posizione di Difesa nelle proprie Zone Mostro principali (solo tra
    // le zone che già li contengono, non spostati in zone vuote — regola
    // vera confermata via YGOPRODeck/Yugipedia), poi rimessi coperti in
    // Posizione di Difesa. Riusa def.repeatableWhileContinuous (introdotto
    // per Offerta Suprema id 559): nessuna distinzione tra prima
    // attivazione e usi successivi, l'effetto è identico ogni volta.
    // SEMPLIFICAZIONE dichiarata: lo scopo reale della carta è confondere
    // un AVVERSARIO UMANO su quale carta coperta sia quale (bluff) — in
    // questo videogioco il contenuto delle carte coperte non è comunque
    // mai mostrato all'avversario (bot o giocatore), quindi il
    // rimescolamento non produce alcun vantaggio strategico osservabile,
    // esattamente come nella carta reale contro un avversario che non le
    // sta osservando: l'azione meccanica (costo + permutazione) resta
    // comunque applicata fedelmente, solo scarica di conseguenze pratiche.
    // ================================================================
    CardEffects.register(769, {
        continuous: true,
        repeatableWhileContinuous: true,
        canActivate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] < 300) return false;
            if (ctx.hasUsedOncePerTurn(`769:${ctx.card.uid}`)) return false;
            const eligible = ctx.field(ctx.owner).filter((slot) => slot && slot.isFaceDown && slot.position === 'defense');
            return eligible.length >= 2;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`769:${ctx.card.uid}`);
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            gameState[lpKey] -= 300;
            const field = ctx.field(ctx.owner);
            const indices = field.map((slot, i) => (slot && slot.isFaceDown && slot.position === 'defense') ? i : -1).filter((i) => i !== -1);
            const shuffledCards = indices.map((i) => field[i].card);
            for (let i = shuffledCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
            }
            indices.forEach((idx, k) => { field[idx].card = shuffledCards[k]; });
            ctx.log('🌑 Ombre Mutevoli riordina le carte coperte in Posizione di Difesa!');
        }
    });

    // ================================================================
    // 770 — Drenaggio Magico / Magic Drain (Trappola Contatore)
    // Quando l'avversario attiva una Magia: annulla e distruggila.
    // Stesso schema di risposta via Chain di Interferenza Magica
    // (id 361). Vedi missingEffectNote su id 770 in cards.json per
    // l'opzione di scarto dell'avversario non implementata.
    // ================================================================
    CardEffects.register(770, {
        canActivate(ctx) {
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'spell' && chain.links[chain.links.length - 1].owner === ctx.opponent);
        },
        activate(ctx) {
            if (ctx.negateActivation()) {
                ctx.log('💧 Drenaggio Magico annulla e distrugge la Magia avversaria!');
            } else {
                ctx.log('💧 Drenaggio Magico non trova più nulla da annullare.');
            }
        }
    });

    // ================================================================
    // 771 — Prova del Viandante / Ordeal of a Traveler (Trappola
    // Continua)
    // Quando un mostro dell'avversario dichiara un attacco: scegli 1
    // carta a caso dalla propria mano, l'avversario "dichiara" un tipo a
    // caso; se sbaglia, rimanda l'attaccante in mano.
    // SEMPLIFICAZIONE: la "dichiarazione" dell'avversario è simulata
    // scegliendo un tipo a caso tra Mostro/Magia/Trappola (nessuna vera
    // interfaccia di scelta per l'avversario in questo motore).
    // ================================================================
    CardEffects.register(771, {
        onAttackDeclare(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const revealed = hand[Math.floor(Math.random() * hand.length)];
            const types = ['monster', 'spell', 'trap'];
            const guess = types[Math.floor(Math.random() * types.length)];
            if (guess !== revealed.type) {
                const field = ctx.field(ctx.opponent);
                const attackerSlot = field[ctx.attackerIndex];
                ctx.cancelAttack();
                if (attackerSlot) {
                    const attackerCard = attackerSlot.card;
                    ctx.returnMonsterToHand(ctx.opponent, ctx.attackerIndex);
                    ctx.log(`🎲 Prova del Viandante: l'avversario sbaglia e ${attackerCard.name} torna in mano!`);
                }
            } else {
                ctx.log("🎲 Prova del Viandante: l'avversario indovina, l'attacco prosegue.");
            }
        }
    });

    // ================================================================
    // 773 — Sparatore Sonico / Sonic Shooter (statico)
    // Se la zona Magia/Trappola dell'avversario è vuota: questa carta può
    // attaccare direttamente (gameState.directAttackAllowedUids).
    // SEMPLIFICAZIONE: manca "il danno da attacco diretto è pari all'ATK
    // ORIGINALE" (invece che effettivo) — nessun impatto pratico senza
    // buff ATK attivi su questa carta.
    // ================================================================
    CardEffects.register(773, {
        static(ctx) {
            const oppSTEmpty = ctx.stField(ctx.opponent).every((s) => s === null);
            if (oppSTEmpty) {
                gameState.directAttackAllowedUids[ctx.card.uid] = true;
            }
        }
    });

    // ================================================================
    // 772 — Simorgh, Uccello della Divinità
    // Durante la End Phase di ciascun giocatore, mentre resta scoperta
    // sul Terreno: ciascun giocatore subisce 1000 danni, ridotti di 500
    // per ogni propria Magia/Trappola. SEMPLIFICAZIONE: manca "non può
    // essere Special Summonata" (nessun mostro di questo dataset la
    // cercherebbe comunque per nome) e "tutti i sacrifici devono essere
    // VENTO" per l'Evocazione Tributo (nessun controllo sul TIPO di
    // sacrificio in questo motore, solo sul numero).
    // ================================================================
    CardEffects.register(772, {
        onEndPhase(ctx) {
            ['player', 'bot'].forEach((owner) => {
                const stCount = ctx.stField(owner).filter((s) => s).length;
                const damage = Math.max(0, 1000 - stCount * 500);
                if (damage > 0) ctx.dealDamage(owner, damage);
            });
            ctx.log('🦅 Simorgh infligge danno ad entrambi i giocatori!');
        }
    });

    // ================================================================
    // 776 — Guerriero di Ardesia / Slate Warrior (effetto FLIP +
    // onDestroyedInBattle)
    // FLIP: guadagna 500 ATK/DEF in modo permanente. Se questa carta
    // viene distrutta in battaglia: il mostro che l'ha distrutta perde
    // 500 ATK/DEF (onDestroyedInBattle, actions.js).
    // ================================================================
    CardEffects.register(776, {
        onFlip(ctx) {
            ctx.card.attack = (ctx.card.attack || 0) + 500;
            ctx.card.defense = (ctx.card.defense || 0) + 500;
            ctx.log('🗿 Guerriero di Ardesia guadagna 500 ATK/DEF!');
        },
        onDestroyedInBattle(ctx) {
            ctx.destroyerCard.attack = Math.max(0, (ctx.destroyerCard.attack || 0) - 500);
            ctx.destroyerCard.defense = Math.max(0, (ctx.destroyerCard.defense || 0) - 500);
            ctx.log(`🗿 Guerriero di Ardesia: ${ctx.destroyerCard.name} perde 500 ATK/DEF per averla distrutta in battaglia!`);
        }
    });

    // ================================================================
    // 777 — Mosca Lama / Bladefly (statico, entrambi i lati)
    // Tutti i mostri VENTO sul Terreno: +500 ATK. Tutti i mostri TERRA
    // sul Terreno: -400 ATK. Stesso schema di Piccola Chimera (id 676).
    // ================================================================
    CardEffects.register(777, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    if (slot.card.attribute === 'VENTO') gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 500, def: e.def };
                    else if (slot.card.attribute === 'TERRA') gameState.atkDefBonus[slot.card.uid] = { atk: e.atk - 400, def: e.def };
                });
            });
        }
    });

    // ================================================================
    // 778 — Faccia di Uccello / Birdface (onDestroy — distrutto in
    // battaglia)
    // Quando distrutta in battaglia: aggiungi 1 carta il cui nome
    // contiene "Lady Arpia" dal Deck alla mano.
    // ================================================================
    CardEffects.register(778, {
        onDestroy(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => isHarpieLadySupport(c));
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.hand(ctx.owner).push(card);
            ctx.log(`🐦 Faccia di Uccello aggiunge ${card.name} alla mano dal Deck!`);
        }
    });

    // ================================================================
    // 779 — Silpheed (Special Summon dalla mano bandendo 1 VENTO dal
    // Cimitero)
    // Se distrutta in battaglia: l'avversario scarta 1 carta a caso.
    // ================================================================
    CardEffects.register(779, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.attribute === 'VENTO');
        },
        paySpecialSummonCost(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'monster' && c.attribute === 'VENTO');
            if (index === -1) return false;
            const [banishedCard] = grave.splice(index, 1);
            ctx.banish(ctx.owner, banishedCard);
            ctx.log('🌪️ Silpheed bandisce 1 mostro VENTO per essere Special Summonata!');
            return true;
        },
        onDestroy(ctx) {
            const discarded = ctx.discardRandomFromHand(ctx.opponent);
            if (!discarded) return;
            ctx.log(`🌪️ Silpheed forza l'avversario a scartare ${discarded.name}!`);
        }
    });

    // ================================================================
    // 780 — Ninja Signora Yae / Lady Ninja Yae (Ignition)
    // Scarta 1 mostro VENTO dalla mano: rimetti in mano tutte le Magie/
    // Trappole controllate dall'avversario.
    // ================================================================
    CardEffects.register(780, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).some((c) => c.type === 'monster' && c.attribute === 'VENTO');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.type === 'monster' && c.attribute === 'VENTO');
            if (index === -1) return;
            const [discarded] = hand.splice(index, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            let count = 0;
            ctx.stField(ctx.opponent).forEach((slot, i) => {
                if (!slot) return;
                ctx.hand(ctx.opponent).push(slot.card);
                ctx.stField(ctx.opponent)[i] = null;
                count++;
            });
            ctx.log(`🥷 Ninja Signora Yae scarta ${discarded.name} e rimette in mano ${count} Magia/Trappola dell'avversario!`);
        }
    });

    // ================================================================
    // 781 — Roc dalla Valle della Foschia / Roc from the Valley of Haze
    // Quando questa carta viene mandata DIRETTAMENTE dalla tua mano al
    // Cimitero: aggiungila al Deck e mescolalo — onSentToGraveyardFromHand
    // (duel-engine.js/ctx.discardRandomFromHand). SEMPLIFICAZIONE
    // dichiarata: come Disperazione dall'Oscurità (id 662), scatta SOLO
    // per uno scarto casuale tramite quell'helper condiviso, non per ogni
    // altro modo di finire al Cimitero dalla mano (scarto come costo,
    // scarto di una carta scelta, limite di 6 carte a fine turno).
    // ================================================================
    CardEffects.register(781, {
        onSentToGraveyardFromHand(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            const [card] = grave.splice(index, 1);
            if (!ctx.shuffleIntoDeck(ctx.owner, [card])) {
                grave.push(card);
                return;
            }
            ctx.log(`🦅 ${card.name} torna nel Deck, che viene rimescolato!`);
        }
    });

    // ================================================================
    // 782 — Lady Arpia 1 / Harpie Lady 1 (statico, entrambi i lati)
    // Tutti i mostri VENTO sul Terreno: +300 ATK.
    // ================================================================
    CardEffects.register(782, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.attribute !== 'VENTO') return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 300, def: e.def };
                });
            });
        }
    });

    // ================================================================
    // 784 — Lady Arpia 3 / Harpie Lady 3
    // Un mostro dell'avversario che combatte contro questa carta non
    // può dichiarare un attacco per le prossime 2 fasi di turno
    // dell'avversario.
    // SEMPLIFICAZIONE: "2 fasi di turno" approssimato come "il prossimo
    // turno dell'avversario" (un blocco per turno, non per singola fase).
    // ================================================================
    CardEffects.register(784, {
        onAttackDeclare(ctx) {
            const attackerSlot = ctx.field(ctx.opponent)[ctx.attackerIndex];
            if (attackerSlot) attackerSlot.card._lockedUntilTurn = gameState.turn + 2;
        },
        static(ctx) {
            if (ctx.card._lockedUntilTurn && gameState.turn < ctx.card._lockedUntilTurn) {
                gameState.cannotAttackUids[ctx.card.uid] = true;
            }
        }
    });

    // ================================================================
    // 785 — Joe l'Uomo Uccello Veloce / Swift Birdman Joe
    // Se Evocata Tributo: rimetti in mano ai proprietari tutte le Magie/
    // Trappole sul Terreno, di entrambi i giocatori.
    // SEMPLIFICAZIONE: non verifica che il sacrificio fosse un mostro
    // VENTO (nessun controllo sul TIPO di sacrificio in questo motore).
    // ================================================================
    CardEffects.register(785, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (!slot) return;
                    ctx.hand(owner).push(slot.card);
                    ctx.stField(owner)[index] = null;
                    count++;
                });
            });
            ctx.log(`🦅 Joe l'Uomo Uccello Veloce rimette in mano ${count} Magia/Trappola!`);
        }
    });

    // ================================================================
    // 786 — Cucciolo di Drago dell'Arpia / Harpie's Pet Baby Dragon
    // Implementate solo le clausole "2+ Arpie" (raddoppia ATK/DEF) e
    // "3+ Arpie" (Ignition, distruggi 1 carta dell'avversario) — vedi
    // missingEffectNote su id 786 in cards.json per la clausola "1+"
    // (divieto di targeting) non implementata.
    // ================================================================
    CardEffects.register(786, {
        static(ctx) {
            const harpieCount = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && s.card.uid !== ctx.card.uid && s.card.name && s.card.name.includes('Arpia')).length;
            if (harpieCount >= 1) {
                // Protegge le ALTRE "Arpia" controllate, ECCETTO questa
                // carta stessa (il testo reale la esclude esplicitamente
                // dalla propria protezione) — stesso schema di Capitano
                // Predone (id 714).
                ctx.field(ctx.owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.uid === ctx.card.uid || !slot.card.name || !slot.card.name.includes('Arpia')) return;
                    gameState.cannotBeAttackTargetUids[slot.card.uid] = true;
                });
            }
            if (harpieCount >= 2) {
                const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + (ctx.card.attack || 0), def: e.def + (ctx.card.defense || 0) };
            }
        },
        canActivate(ctx) {
            const harpieCount = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && s.card.uid !== ctx.card.uid && s.card.name && s.card.name.includes('Arpia')).length;
            if (harpieCount < 3) return false;
            return ['player', 'bot'].some((owner) => owner !== ctx.owner && (ctx.field(owner).some((s) => s) || ctx.stField(owner).some((s) => s)));
        },
        activate(ctx) {
            const monsterIndex = ctx.field(ctx.opponent).findIndex((s) => s);
            if (monsterIndex !== -1) { ctx.destroyMonster(ctx.opponent, monsterIndex); ctx.log('🐲 Cucciolo di Drago dell\'Arpia distrugge un mostro dell\'avversario!'); return; }
            const stIndex = ctx.stField(ctx.opponent).findIndex((s) => s);
            if (stIndex !== -1) {
                const card = ctx.stField(ctx.opponent)[stIndex].card;
                ctx.destroySpellTrap(ctx.opponent, stIndex);
                ctx.log(`🐲 Cucciolo di Drago dell'Arpia distrugge ${card.name}!`);
            }
        }
    });

    // ================================================================
    // 787 — Egoista Elegante / Elegant Egotist (Magia Normale)
    // Se "Lady Arpia" è sul Terreno: Special Summon 1 mostro il cui
    // nome contiene "Lady Arpia" dalla mano o dal Deck.
    // ================================================================
    CardEffects.register(787, {
        canActivate(ctx) {
            const hasHarpieLady = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && isHarpieLadySupport(s.card));
            if (!hasHarpieLady) return false;
            return ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => isHarpieLadySupport(c) || c.name === 'Sorelle Lady Arpia');
            if (handIdx !== -1) {
                const [card] = hand.splice(handIdx, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                ctx.log(`🦅 Egoista Elegante Special Summona ${card.name} dalla mano!`);
                return;
            }
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const deckIdx = deck.findIndex((c) => isHarpieLadySupport(c) || c.name === 'Sorelle Lady Arpia');
            if (deckIdx === -1) return;
            const [card] = deck.splice(deckIdx, 1);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🦅 Egoista Elegante Special Summona ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 788 — Terreno di Caccia delle Arpie / Harpies' Hunting Ground
    // (Magia Terreno)
    // Tutti i mostri Tipo Bestia Alata: +200 ATK/DEF. Se una carta "Lady
    // Arpia"/"Sorelle Lady Arpia" viene Evocata (onOwnMonsterSummoned,
    // duel-engine.js): distruggi 1 Magia/Trappola sul Terreno
    // (SEMPLIFICAZIONE: la prima disponibile, priorità a quella
    // dell'avversario, stessa convenzione di targeting automatico usata
    // in tutto questo file — non copre mai la propria zona Magia
    // Terreno, solo la zona 'st' a 5 caselle).
    // ================================================================
    CardEffects.register(788, {
        continuous: true,
        activate(ctx) {
            ctx.log('🦅 Terreno di Caccia delle Arpie attivato!');
        },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.race !== 'Bestia Alata') return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 200, def: e.def + 200 };
                });
            });
        },
        onOwnMonsterSummoned(ctx) {
            if (!(isHarpieLadySupport(ctx.summonedCard) || ctx.summonedCard.name === 'Sorelle Lady Arpia')) return;
            const owners = [ctx.opponent, ctx.owner];
            for (const o of owners) {
                const idx = ctx.stField(o).findIndex((s) => s);
                if (idx === -1) continue;
                const destroyed = ctx.stField(o)[idx].card;
                ctx.graveyard(o).push(destroyed);
                ctx.stField(o)[idx] = null;
                ctx.log(`🦅 Terreno di Caccia delle Arpie distrugge ${destroyed.name} dopo l'Evocazione di ${name}!`);
                return;
            }
        }
    });

    // ================================================================
    // 789 — Scintilla dell'Estasi Triangolare / Triangle Ecstasy Spark
    // (Magia Normale)
    // Fino a fine turno, l'ATK di tutte le "Sorelle Lady Arpia" sul
    // Terreno diventa 2700; l'avversario non può attivare Trappole
    // (gameState.noTrapActivationFor). Vedi missingEffectNote su id 789
    // in cards.json per l'annullamento effetti Trappola già attivi non
    // implementato.
    // ================================================================
    CardEffects.register(789, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.id === 290);
        },
        activate(ctx) {
            let count = 0;
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot && !slot.isFaceDown && slot.card.id === 290) {
                    ctx.grantTemporaryAtkDefBonus(slot.card, 2700 - DuelEngine.getEffectiveAtk(slot.card), 0, false);
                    count++;
                }
            });
            gameState.noTrapActivationFor = gameState.noTrapActivationFor || {};
            gameState.noTrapActivationFor[ctx.opponent] = true;
            // "Annulla tutti gli effetti Trappola dell'avversario sul
            // Terreno" — non solo il blocco di NUOVE attivazioni (già
            // gestito da noTrapActivationFor qui sopra), anche le
            // Trappole avversarie già Set diventano inerti per il resto
            // del turno: stesso schema di areTrapsNegatedFor (Jinzo), ma
            // "fino a fine turno" invece che continuo.
            gameState.trapsNegatedUntilEndOfTurnFor = gameState.trapsNegatedUntilEndOfTurnFor || {};
            gameState.trapsNegatedUntilEndOfTurnFor[ctx.opponent] = true;
            ctx.log(`🎇 Scintilla dell'Estasi Triangolare porta l'ATK di ${count} Sorelle Lady Arpia a 2700, blocca le Trappole avversarie e annulla quelle già sul Terreno!`);
        }
    });

    // ================================================================
    // 790 — Festa Isterica / Hysteric Party (Trappola Continua)
    // Scarta 1 carta; Special Summon quante più copie possibili di
    // "Lady Arpia" dal Cimitero, memorizzando i loro uid su questa
    // carta (ctx.card.summonedUids). Quando questa carta scoperta viene
    // distrutta: distruggi quei mostri, se ancora sul Terreno con lo
    // stesso uid — onSTDestroyed/ctx.destroySpellTrap, stesso schema di
    // Sepoltura Prematura (id 633)/Amplificatore (id 92), ma su PIÙ
    // mostri invece di uno solo.
    // "Se questa carta lascia il Terreno" copre ora distruzione e bando
    // (onBanished, ACTIONS.banish) — resta scoperto solo il ritorno in
    // mano di una Trappola (nessuna funzione centrale per quel percorso).
    // ================================================================
    function destroyHystericPartySummons(ctx) {
        const uids = ctx.card.summonedUids;
        if (!uids || uids.length === 0) return;
        let count = 0;
        ['player', 'bot'].forEach((owner) => {
            ctx.field(owner).forEach((slot, index) => {
                if (slot && uids.includes(slot.card.uid)) {
                    ctx.destroyMonster(owner, index);
                    count++;
                }
            });
        });
        if (count > 0) ctx.log(`🦅 Festa Isterica lascia il Terreno: ${count} Lady Arpia Special Summonate vengono distrutte!`);
    }
    CardEffects.register(790, {
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            return ctx.graveyard(ctx.owner).some((c) => isHarpieLadySupport(c));
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const [discarded] = hand.splice(0, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            const grave = ctx.graveyard(ctx.owner);
            const summonedUids = [];
            for (let i = grave.length - 1; i >= 0; i--) {
                if (!isHarpieLadySupport(grave[i])) continue;
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) break;
                const [card] = grave.splice(i, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                summonedUids.push(card.uid);
            }
            ctx.card.summonedUids = summonedUids;
            ctx.log(`🦅 Festa Isterica scarta ${discarded.name} e Special Summona ${summonedUids.length} Lady Arpia dal Cimitero!`);
        },
        onSTDestroyed: destroyHystericPartySummons,
        onBanished: destroyHystericPartySummons
    });

    // ================================================================
    // 791 — Coro Acquatico / Aqua Chorus (Trappola Continua, statico)
    // Mostri con lo stesso nome sul Terreno: +500 ATK/DEF ciascuno.
    // ================================================================
    CardEffects.register(791, {
        continuous: true,
        activate(ctx) {
            ctx.log('🎵 Coro Acquatico attivato!');
        },
        static(ctx) {
            const nameCounts = {};
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown) nameCounts[slot.card.name] = (nameCounts[slot.card.name] || 0) + 1;
                });
            });
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    if ((nameCounts[slot.card.name] || 0) < 2) return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 500, def: e.def + 500 };
                });
            });
        }
    });

    // ================================================================
    // 792 — Bara Oscura / Dark Coffin (Trappola Normale)
    // Quando questa carta SET viene distrutta e mandata al Cimitero (da
    // un'altra fonte, non attivandola): il tuo avversario sceglie ed
    // esegue 1 di: scarta 1 carta a caso dalla propria mano, o distrugge
    // 1 mostro sul proprio Terreno — onSTDestroyed (nuovo hook in
    // duel-engine.js/ctx.destroySpellTrap).
    // SEMPLIFICAZIONE: "il tuo avversario sceglie" diventa una scelta
    // automatica 50/50 — nessuna UI di scelta esiste per questo tipo di
    // reazione automatica (stesso schema di altre scelte auto-decise in
    // questo file, es. Scatola delle Fate id 232).
    // ================================================================
    CardEffects.register(792, {
        onSTDestroyed(ctx) {
            if (!ctx.wasFaceDown) return;
            const noMonsters = ctx.field(ctx.opponent).every((s) => !s);
            const discardOption = noMonsters || Math.random() < 0.5;
            if (discardOption) {
                const discarded = ctx.discardRandomFromHand(ctx.opponent);
                if (discarded) ctx.log(`⚰️ Bara Oscura: ${ctx.opponent === 'player' ? 'scarti' : 'il bot scarta'} ${discarded.name}!`);
            } else {
                const index = ctx.field(ctx.opponent).findIndex((s) => s);
                if (index === -1) return;
                const decl = ctx.declareTarget(ctx.opponent, index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!targetSlot) return;
                const name = targetSlot.card.name;
                ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
                ctx.log(`⚰️ Bara Oscura: ${ctx.opponent === 'player' ? 'perdi' : 'il bot perde'} ${name}!`);
            }
        }
    });

    // ================================================================
    // 793 — Armatura Sakuretsu / Sakuretsu Armor (Trappola Normale)
    // Quando l'avversario dichiara un attacco: distruggi il mostro
    // attaccante. Stesso schema di risposta di Kuriboh (id 22).
    // ================================================================
    CardEffects.register(793, {
        onAttackDeclare(ctx) {
            const field = ctx.field(ctx.opponent);
            const attackerSlot = field[ctx.attackerIndex];
            if (!attackerSlot) return;
            const decl = ctx.declareTarget(ctx.opponent, ctx.attackerIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const name = targetSlot.card.name;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.cancelAttack();
            ctx.log(`🛡️ Armatura Sakuretsu distrugge ${name}!`);
        }
    });

    // ================================================================
    // 794 — Arte Ninjitsu della Trasformazione / Ninjitsu Art of
    // Transformation (Trappola Continua)
    // Sacrifica 1 mostro il cui nome contiene "Ninja" scoperto; Special
    // Summon 1 mostro Bestia/Bestia Alata/Insetto dalla mano o dal Deck
    // con Livello minore o uguale al Livello del sacrificato +3. Quando
    // questa carta lascia il Terreno: distruggi quel mostro (stesso
    // schema di dipendenza targetOwner/targetIndex/targetUid di
    // Incantesimo Ombra id 439/Cerchio Ammaliante id 620).
    // ================================================================
    CardEffects.register(794, {
        continuous: true,
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Ninja'));
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const tributeIndex = field.findIndex((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Ninja'));
            if (tributeIndex === -1) return;
            const maxLevel = (field[tributeIndex].card.level || 0) + 3;

            let source = null, from = -1;
            const hand = ctx.hand(ctx.owner);
            from = hand.findIndex((c) => c.type === 'monster' && ['Bestia', 'Bestia Alata', 'Insetto'].includes(c.race) && (c.level || 0) <= maxLevel);
            if (from !== -1) source = hand;
            if (!source) {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const deck = gameState[deckKey];
                if (Array.isArray(deck)) {
                    from = deck.findIndex((c) => c.type === 'monster' && ['Bestia', 'Bestia Alata', 'Insetto'].includes(c.race) && (c.level || 0) <= maxLevel);
                    if (from !== -1) source = deck;
                }
            }
            if (!source) return;
            const [summonedCard] = source.splice(from, 1);
            if (source !== hand) gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = source.length;

            ctx.graveyard(ctx.owner).push(field[tributeIndex].card);
            field[tributeIndex] = null;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(summonedCard); return; }
            ctx.specialSummon(ctx.owner, summonedCard, slotIndex, 'attack');
            ctx.card.targetOwner = ctx.owner;
            ctx.card.targetIndex = slotIndex;
            ctx.card.targetUid = summonedCard.uid;
            ctx.log(`🥷 Arte Ninjitsu della Trasformazione sacrifica un Ninja e Special Summona ${summonedCard.name}!`);
        },
        static(ctx) {
            const targetSlot = ctx.card.targetOwner != null ? ctx.field(ctx.card.targetOwner)[ctx.card.targetIndex] : null;
            const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === ctx.card.targetUid;
            if (validTarget) return;
            if (ctx.card.targetOwner == null) return; // non ancora attivata: nessun bersaglio da controllare
            ctx.stField(ctx.owner)[ctx.index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
        }
    });

    // ================================================================
    // 795 — Attacco d'Icaro / Icarus Attack (Trappola Normale)
    // Sacrifica 1 mostro Tipo Bestia Alata; distruggi 2 carte sul
    // Terreno.
    // SEMPLIFICAZIONE: sceglie da sola quale mostro sacrificare e quali
    // 2 carte distruggere (le prime trovate, preferendo il Terreno
    // dell'avversario), invece di un'interfaccia di selezione dedicata.
    // ================================================================
    CardEffects.register(795, {
        canActivate(ctx) {
            const hasTribute = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.race === 'Bestia Alata');
            if (!hasTribute) return false;
            const totalTargets = ['player', 'bot'].reduce((sum, owner) => sum + ctx.field(owner).filter((s) => s).length + ctx.stField(owner).filter((s) => s).length, 0);
            return totalTargets >= 1;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const tributeIndex = field.findIndex((s) => s && !s.isFaceDown && s.card.race === 'Bestia Alata');
            if (tributeIndex === -1) return;
            ctx.graveyard(ctx.owner).push(field[tributeIndex].card);
            field[tributeIndex] = null;

            const candidates = [];
            [ctx.opponent, ctx.owner].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => { if (slot) candidates.push({ zone: 'monster', owner, index }); });
                ctx.stField(owner).forEach((slot, index) => { if (slot) candidates.push({ zone: 'st', owner, index }); });
            });
            let destroyed = 0;
            candidates.slice(0, 2).forEach((c) => {
                if (c.zone === 'monster') {
                    const slot = ctx.field(c.owner)[c.index];
                    if (slot) { ctx.destroyMonster(c.owner, c.index); destroyed++; }
                } else {
                    const slot = ctx.stField(c.owner)[c.index];
                    if (slot) { ctx.graveyard(c.owner).push(slot.card); ctx.stField(c.owner)[c.index] = null; destroyed++; }
                }
            });
            ctx.log(`🦅 Attacco d'Icaro sacrifica un mostro Bestia Alata e distrugge ${destroyed} cart${destroyed === 1 ? 'a' : 'e'}!`);
        }
    });

    // ================================================================
    // 796 — Tiranno Superconduttore / Super Conductor Tyranno (Ignition,
    // una volta per turno)
    // Sacrifica 1 mostro: infliggi 1000 danni. Non può attaccare nel
    // turno in cui attivi questo effetto (stesso schema di Stregone del
    // Caos id 740).
    // ================================================================
    CardEffects.register(796, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && s.card.uid !== ctx.card.uid);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((s) => s && s.card.uid !== ctx.card.uid);
            if (index === -1) return;
            const sacrificed = field[index].card;
            ctx.graveyard(ctx.owner).push(sacrificed);
            field[index] = null;
            ctx.dealDamage(ctx.opponent, 1000);
            ctx.card._cannotAttackTurn = gameState.turn;
            ctx.log(`🦖 Tiranno Superconduttore sacrifica ${sacrificed.name} e infligge 1000 danni!`);
        },
        static(ctx) {
            if (ctx.card._cannotAttackTurn === gameState.turn) gameState.cannotAttackUids[ctx.card.uid] = true;
        }
    });

    // ================================================================
    // 799 — Driceratopo Oscuro / Dark Driceratops
    // Danno da battaglia perforante (def.piercing, actions.js).
    // ================================================================
    CardEffects.register(799, { piercing: true });

    // ================================================================
    // 800 — Testa di Martello Iper / Hyper Hammerhead (onBattled)
    // Alla fine del Damage Step, se il mostro avversario contro cui ha
    // combattuto NON è stato distrutto: rimandalo in mano.
    // ================================================================
    CardEffects.register(800, {
        onBattled(ctx) {
            if (!ctx.opponentSurvived) return;
            const idx = ctx.field(ctx.opponent).findIndex((s) => s && s.card.uid === ctx.opponentCard.uid);
            if (idx === -1) return;
            ctx.field(ctx.opponent)[idx] = null;
            ctx.hand(ctx.opponent).push(ctx.opponentCard);
            ctx.log(`🔨 Testa di Martello Iper rimanda ${ctx.opponentCard.name} in mano!`);
        }
    });

    // ================================================================
    // 801 — Tiranno Nero / Black Tyranno (statico)
    // Se le uniche carte controllate dall'avversario sono mostri in
    // Posizione di Difesa (nessun'altra carta): questa carta può
    // attaccare direttamente (gameState.directAttackAllowedUids).
    // ================================================================
    CardEffects.register(801, {
        static(ctx) {
            const oppField = ctx.field(ctx.opponent);
            const oppST = ctx.stField(ctx.opponent);
            const oppFieldSpell = ctx.opponent === 'player' ? gameState.playerFieldSpell : gameState.botFieldSpell;
            const hasMonsters = oppField.some((s) => s);
            const allDefense = oppField.every((s) => !s || s.position === 'defense');
            const noOtherCards = oppST.every((s) => s === null) && !oppFieldSpell;
            if (hasMonsters && allDefense && noOtherCards) {
                gameState.directAttackAllowedUids[ctx.card.uid] = true;
            }
        }
    });

    // ================================================================
    // 802 — Tiranno Infinito / Tyranno Infinity
    // "The original ATK of this card becomes the number of your banished
    // Dinosaur monsters x 1000" — ricalcolato ad ogni render (static),
    // stesso schema di qualunque altro conteggio dinamico in questo file,
    // ora possibile grazie a una vera zona Bandite (ctx.banished).
    // ================================================================
    CardEffects.register(802, {
        static(ctx) {
            const dinosBanished = ctx.banished(ctx.owner).filter((c) => c.type === 'monster' && c.race === 'Dinosauro').length;
            ctx.card.attack = dinosBanished * 1000;
        }
    });

    // ================================================================
    // 803 — Idrogeddon / Hydrogeddon
    // Se questa carta distrugge un mostro dell'avversario in battaglia:
    // puoi Special Summonare un'altra copia dal Deck
    // (onDestroysMonsterInBattle, actions.js — preciso: non scatta su un
    // attacco diretto né su una battaglia che non distrugge il bersaglio).
    // ================================================================
    CardEffects.register(803, {
        onDestroysMonsterInBattle(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.id === 803);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('🦖 Idrogeddon Special Summona un\'altra copia dal Deck!');
        }
    });

    // ================================================================
    // 804 — Ossigeddon / Oxygeddon (onDestroy)
    // Se distrutta in battaglia da un mostro Tipo Piroico: ciascun
    // giocatore subisce 800 danni (ctx.destroyedByOpponentCard,
    // actions.js/resolveBattleDamage — nuovo campo generico).
    // ================================================================
    CardEffects.register(804, {
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard || ctx.destroyedByOpponentCard.race !== 'Piroico') return;
            ctx.dealDamage('player', 800);
            ctx.dealDamage('bot', 800);
            ctx.log('☠️ Ossigeddon distrutta da un mostro Piroico: entrambi i giocatori subiscono 800 danni!');
        }
    });

    // ================================================================
    // 805 — Ptera Nero / Black Ptera (onDestroy)
    // Quando mandata dal Terreno al Cimitero, TRANNE che venendo
    // distrutta in battaglia: ritorna in mano — ctx.destroyedByOpponentCard
    // (nuovo campo generico, valorizzato SOLO per una distruzione in
    // battaglia) distingue esattamente questo caso.
    // ================================================================
    CardEffects.register(805, {
        onDestroy(ctx) {
            if (ctx.destroyedByOpponentCard) return;
            const hand = ctx.hand(ctx.owner);
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            grave.splice(index, 1);
            hand.push(ctx.card);
            ctx.log('🦅 Ptera Nero ritorna in mano!');
        }
    });

    // ================================================================
    // 806 — Stego Nero / Black Stego
    // Se questa carta in Posizione di Attacco viene scelta come
    // bersaglio per un attacco: cambiala in Posizione di Difesa. Il
    // mostro bersagliato può rispondere direttamente (vedi
    // findTriggerCandidates in duel-engine.js).
    // ================================================================
    CardEffects.register(806, {
        onAttackDeclare(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (index === -1 || field[index].position !== 'attack') return;
            field[index].position = 'defense';
            ctx.log('🦕 Stego Nero cambia in Posizione di Difesa!');
        }
    });

    // ================================================================
    // 807 — Tiranno Definitivo / Ultimate Tyranno
    // Può attaccare tutti i mostri dell'avversario, una volta ciascuno.
    // Durante la propria Battle Phase, se controlla un "Tiranno
    // Definitivo" che può ancora attaccare, gli altri propri mostri non
    // possono attaccare.
    // getExtraAttackCount si appoggia alla generalizzazione degli
    // attacchi extra introdotta per Samurai Armato - Ben Kei (id 721,
    // vedi resolveAttack in actions.js): concede tanti attacchi extra
    // quanti sono i mostri avversari meno 1 (il primo attacco è quello
    // "base"). SEMPLIFICAZIONE: nessun tracciamento di QUALE mostro
    // avversario sia già stato colpito in questo giro (stesso limite già
    // accettato per Onda di Diffusione, id 747) — chi controlla la carta
    // può scegliere liberamente il bersaglio ad ogni attacco extra,
    // potendo in teoria colpire due volte lo stesso mostro invece di uno
    // ciascuno. Il conteggio nemici viene "fotografato" al MASSIMO visto
    // in questo turno DENTRO onOwnAttackDeclare (che scatta PRIMA del
    // calcolo danni di OGNI attacco, base o extra — vedi
    // TRIGGER.ON_ATTACK_DECLARE in duel-engine.js), non dentro
    // getExtraAttackCount stesso: quella funzione viene interrogata DOPO
    // che resolveBattleDamage ha già eventualmente distrutto il
    // bersaglio di QUESTO attacco, quindi fotografare lì il conteggio
    // vedrebbe già un nemico in meno fin dal primissimo attacco —
    // concedendo sistematicamente un attacco extra di meno del dovuto
    // (bug reale, catturato con un test dedicato: il terzo mostro
    // avversario restava vivo senza questo fix).
    // ================================================================
    CardEffects.register(807, {
        onOwnAttackDeclare(ctx) {
            // ctx qui è il contesto di DICHIARAZIONE attacco (declareCtx in
            // actions.js): NON ha ctx.card (quel nome è riservato, dentro
            // openTriggerWindow, alla carta di chi RISPONDE) — la carta
            // stessa va letta da ctx.field(ctx.owner)[ctx.attackerIndex].
            const self = ctx.field(ctx.owner)[ctx.attackerIndex].card;
            const enemyCount = ctx.field(ctx.opponent).filter((s) => s).length;
            if (self.__ultimateTyrannoSnapshotTurn !== gameState.turn) {
                self.__ultimateTyrannoSnapshotTurn = gameState.turn;
                self.__ultimateTyrannoMaxEnemyCount = enemyCount;
            } else if (enemyCount > self.__ultimateTyrannoMaxEnemyCount) {
                self.__ultimateTyrannoMaxEnemyCount = enemyCount;
            }
        },
        getExtraAttackCount(ctx) {
            return Math.max(0, (ctx.card.__ultimateTyrannoMaxEnemyCount || 0) - 1);
        },
        static(ctx) {
            if (ctx.slot.isFaceDown) return;
            const canStillAttack = ctx.slot.position === 'attack' && !ctx.slot.hasAttacked;
            if (!canStillAttack) return;
            ctx.field(ctx.owner).forEach((s) => {
                if (s && s.card.uid !== ctx.card.uid) {
                    gameState.cannotAttackUids[s.card.uid] = true;
                }
            });
        }
    });

    // ================================================================
    // 808 — Uovo Giurassico Miracoloso / Miracle Jurassic Egg
    // Ogni volta che uno o più mostri Tipo Dinosauro (anche di un'altra
    // carta) vengono mandati al proprio Cimitero: 2 Segnalini su questa
    // carta. Nuovo handler def.onOwnMonsterDestroyedPassive
    // (duel-engine.js, TRIGGER.ON_DESTROY): broadcast incondizionato verso
    // ogni mostro scoperto sul proprio Terreno, diverso dal già esistente
    // onOwnMonsterDestroyed (quello è per Trappole Set, con scelta/
    // consumo via Chain — semantica sbagliata per un mostro passivo come
    // questo). La nota precedente ("richiederebbe un nuovo aggancio
    // generico") era corretta sulla sostanza ma non sapeva che il pezzo
    // mancante era piccolo: solo questo nuovo ramo di broadcast, non
    // un'infrastruttura enorme.
    // Puoi sacrificarla (effetto Ignition dalla zona Mostro) per Special
    // Summonare 1 mostro Dinosauro dal Deck di Livello <= Segnalini
    // presenti — sceglie da sola il Livello più alto possibile.
    // notifyOwnMonsterSentToGraveyard (duel-engine.js) ora è condivisa
    // anche da performTributeSacrifice/bot.js (Sacrificio per Evocazione
    // Tributo, sia per Evocare sia come costo d'attacco) e da
    // discardRandomFromHand (scarto a caso dalla mano): onOwnMonsterDestroyedPassive
    // scatta correttamente per tutti questi casi, non solo la distruzione.
    // SEMPLIFICAZIONE residua: manca "non può essere bandita finché
    // scoperta sul Terreno" — nessun punto centrale controlla l'eleggibilità
    // di un bersaglio PRIMA di bandirlo (ACTIONS.banish riceve la carta già
    // rimossa dalla sua zona), servirebbe un controllo per singola carta in
    // ognuno dei ~28 punti che bandiscono qualcosa in questo file.
    // ================================================================
    CardEffects.register(808, {
        onOwnMonsterDestroyedPassive(ctx) {
            if (!ctx.destroyedCard || ctx.destroyedCard.race !== 'Dinosauro') return;
            ctx.card.counters = (ctx.card.counters || 0) + 2;
            ctx.log(`🥚 Uovo Giurassico Miracoloso riceve 2 Segnalini (ora ${ctx.card.counters})!`);
        },
        canActivate(ctx) {
            if (!ctx.card.counters) return false;
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            return Array.isArray(deck) && deck.some((c) => c.type === 'monster' && c.race === 'Dinosauro' && c.level <= ctx.card.counters);
        },
        activate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            let bestIndex = -1;
            let bestLevel = -1;
            deck.forEach((c, i) => {
                if (c.type === 'monster' && c.race === 'Dinosauro' && c.level <= ctx.card.counters && c.level > bestLevel) {
                    bestLevel = c.level;
                    bestIndex = i;
                }
            });
            if (bestIndex === -1) return;
            const [dino] = deck.splice(bestIndex, 1);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            const ownIndex = ctx.index;
            ctx.field(ctx.owner)[ownIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            ctx.specialSummon(ctx.owner, dino, ownIndex, 'attack', 'deck');
            ctx.log(`🥚 Uovo Giurassico Miracoloso si sacrifica per Special Summonare ${dino.name}!`);
        }
    });

    // ================================================================
    // 809 — Bebè Cerasauro / Babycerasaurus (onDestroy)
    // Distrutta da un effetto Carta (MAI in battaglia) e mandata al
    // Cimitero: Special Summon 1 mostro Dinosauro di Livello 4 o
    // inferiore dal Deck — ctx.destroyedByOpponentCard distingue
    // esattamente "battaglia" (valorizzato) da "effetto Carta" (null).
    // ================================================================
    CardEffects.register(809, {
        onDestroy(ctx) {
            if (ctx.destroyedByOpponentCard) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.race === 'Dinosauro' && (c.level || 0) <= 4);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🦖 Bebè Cerasauro Special Summona ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 810 — Grande Pillola Evolutiva / Big Evolution Pill (Magia Continua)
    // Sacrifica 1 mostro Tipo Dinosauro per attivare questa carta (stesso
    // schema di Soffio Esplosivo, id 134: auto-seleziona il sacrificio,
    // qui il più DEBOLE dato che non conta quale). Finché scoperta sul
    // Terreno: puoi Evocare Normalmente mostri Tipo Dinosauro di Livello
    // 5+ senza Sacrificio — verificato dal vivo in attemptMonsterSummon
    // (actions.js), stessa eccezione puntuale già usata per Gaia il
    // Cavaliere Feroce Rapido (id 711).
    // "Distruggila durante la 3ª End Phase del tuo avversario" —
    // gameState.pendingSelfDestructAtOpponentEndPhase (nuovo conteggio
    // "N End Phase dell'AVVERSARIO", duel-engine.js/
    // processSelfDestructAtOpponentEndPhase), accodato all'attivazione.
    // ================================================================
    CardEffects.register(810, {
        continuous: true,
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Dinosauro');
        },
        activate(ctx) {
            const ownField = ctx.field(ctx.owner);
            let tributeIndex = -1;
            let tributeCard = null;
            ownField.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.race === 'Dinosauro' && (!tributeCard || slot.card.attack < tributeCard.attack)) {
                    tributeIndex = i;
                    tributeCard = slot.card;
                }
            });
            if (tributeIndex === -1) return;
            ownField[tributeIndex] = null;
            ctx.graveyard(ctx.owner).push(tributeCard);
            gameState.pendingSelfDestructAtOpponentEndPhase = gameState.pendingSelfDestructAtOpponentEndPhase || [];
            gameState.pendingSelfDestructAtOpponentEndPhase.push({ cardUid: ctx.card.uid, owner: ctx.owner, endsRemaining: 3 });
            ctx.log(`🦖 Grande Pillola Evolutiva sacrifica ${tributeCard.name}: ora puoi Evocare Normalmente mostri Dinosauro di Livello 5+ senza Sacrificio!`);
        }
    });

    // ================================================================
    // 811 — Colpo di Coda / Tail Swipe (Magia Normale)
    // Se controlli un Dinosauro di Livello 5+: rimanda fino a 2 mostri
    // dell'avversario con Livello inferiore o coperti in mano.
    // ================================================================
    CardEffects.register(811, {
        canActivate(ctx) {
            const hasBigDino = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.race === 'Dinosauro' && (s.card.level || 0) >= 5);
            if (!hasBigDino) return false;
            return ctx.field(ctx.opponent).some((s) => s);
        },
        activate(ctx) {
            const dinoSlot = ctx.field(ctx.owner).find((s) => s && !s.isFaceDown && s.card.race === 'Dinosauro' && (s.card.level || 0) >= 5);
            if (!dinoSlot) return;
            const dinoLevel = dinoSlot.card.level || 0;
            const field = ctx.field(ctx.opponent);
            let bounced = 0;
            field.forEach((slot, index) => {
                if (bounced >= 2 || !slot) return;
                if (slot.isFaceDown || (slot.card.level || 0) < dinoLevel) {
                    ctx.hand(ctx.opponent).push(slot.card);
                    field[index] = null;
                    bounced++;
                }
            });
            ctx.log(`🦖 Colpo di Coda rimanda ${bounced} mostr${bounced === 1 ? 'o' : 'i'} in mano!`);
        }
    });

    // ================================================================
    // 812 — Mondo Giurassico / Jurassic World (Magia Terreno)
    // Tutti i mostri Tipo Dinosauro: +300 ATK/DEF.
    // ================================================================
    CardEffects.register(812, {
        continuous: true,
        activate(ctx) {
            ctx.log('🦕 Mondo Giurassico attivato!');
        },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.race !== 'Dinosauro') return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 300, def: e.def + 300 };
                });
            });
        }
    });

    // ================================================================
    // 813 — Benedizione di Sebek / Sebek's Blessing (Magia Rapida)
    // Attivabile solo quando un tuo mostro ha attaccato direttamente
    // l'avversario; guadagni Life Points pari al danno da battaglia
    // inflitto. A differenza di una Trappola (che risponde NEL MOMENTO
    // di un evento tramite una finestra di Chain), questa è una Magia
    // Rapida attivata dalla mano DOPO che il danno è già stato
    // inflitto — gameState.directAttackDamageFor[owner] (nuovo,
    // impostato in resolveAttack/actions.js quando un attacco diretto
    // infligge DAVVERO danno, azzerato ad ogni cambio turno) tiene
    // traccia dell'ultimo importo utilizzabile, invece di un vero
    // aggancio reattivo "nel momento" (che qui non serve: il testo reale
    // non richiede una risposta immediata, solo che l'evento sia già
    // accaduto in questo turno).
    // ================================================================
    CardEffects.register(813, {
        canActivate(ctx) {
            return !!(gameState.directAttackDamageFor && gameState.directAttackDamageFor[ctx.owner]);
        },
        activate(ctx) {
            const amount = gameState.directAttackDamageFor && gameState.directAttackDamageFor[ctx.owner];
            if (!amount) return;
            gameState.directAttackDamageFor[ctx.owner] = 0;
            ctx.dealDamage(ctx.owner, -amount);
            ctx.log(`🐊 Benedizione di Sebek: ${ctx.owner === 'player' ? 'guadagni' : 'il bot guadagna'} ${amount} Life Points!`);
        }
    });

    // ================================================================
    // 204 — Sosia (Trappola Continua)
    // Quando subisci danno dall'effetto di un mostro controllato dal tuo
    // avversario: infliggi al tuo avversario lo stesso ammontare di
    // danno. Un'unica volta Set + attivata (activate() qui sotto non fa
    // altro che confermarla scoperta sul Terreno grazie a
    // continuous:true), il vero effetto è un controllo dal vivo dentro
    // ACTIONS.dealDamage (duel-engine.js) — stesso stile "live check sul
    // campo" già usato per Canyon/Statua di Pietra degli Aztechi in
    // resolveBattleDamage (actions.js) — così riflette OGNI volta che la
    // condizione si verifica, non solo una tantum.
    // ================================================================
    CardEffects.register(204, {
        continuous: true,
        activate(ctx) {
            ctx.log('🪞 Sosia si attiva: ora riflette ogni danno da effetto Mostro avversario!');
        }
    });

    // ================================================================
    // 814 — Controllo Mesmerico / Mesmeric Control (Magia Normale)
    // Durante il prossimo turno dell'avversario: non può cambiare la
    // Posizione di Battaglia dei mostri. Nuovo flag
    // gameState.cannotChangePositionFor (per-turno, resettato in
    // changeTurn() — game-flow.js), controllato ovunque un cambio di
    // Posizione viene richiesto dal giocatore/bot.
    // ================================================================
    CardEffects.register(814, {
        activate(ctx) {
            gameState.cannotChangePositionFor = gameState.cannotChangePositionFor || {};
            gameState.cannotChangePositionFor[ctx.opponent] = gameState.turn + 1;
            ctx.log("🌀 Controllo Mesmerico impedisce all'avversario di cambiare Posizione nel suo prossimo turno!");
        }
    });

    // ================================================================
    // 815 — Istinto di Caccia / Hunting Instinct (Trappola Normale)
    // Quando uno o più mostri vengono Special Summonati sul Terreno
    // dell'avversario: Special Summon 1 mostro Dinosauro dalla mano.
    // Riusa la finestra di risposta onOpponentSummon già usata da Buco
    // Trappola (id 40), qui però NON è una risposta immediata alla
    // Chain (nessun canActivate/activate): registrata come reazione
    // diretta tramite lo stesso schema generico.
    // ================================================================
    CardEffects.register(815, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Dinosauro') && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        onOpponentSummon(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.type === 'monster' && c.race === 'Dinosauro');
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = hand.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🦖 Istinto di Caccia Special Summona ${card.name} dalla mano!`);
        }
    });

    // ================================================================
    // 816 — Istinto di Sopravvivenza / Survival Instinct (Trappola
    // Normale)
    // Bandisci un numero qualsiasi di mostri Dinosauro dal Cimitero;
    // guadagna 400 LP per ciascuno.
    // SEMPLIFICAZIONE: bandisce sempre TUTTI i Dinosauro disponibili
    // (nessuna UI di selezione "un numero qualsiasi").
    // ================================================================
    CardEffects.register(816, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Dinosauro');
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            let banished = 0;
            for (let i = grave.length - 1; i >= 0; i--) {
                if (grave[i].type === 'monster' && grave[i].race === 'Dinosauro') {
                    const [card] = grave.splice(i, 1);
                    ctx.banish(ctx.owner, card);
                    banished++;
                }
            }
            if (banished === 0) return;
            ctx.dealDamage(ctx.owner, -400 * banished);
            ctx.log(`🦖 Istinto di Sopravvivenza bandisce ${banished} mostr${banished === 1 ? 'o' : 'i'} e guadagna ${400 * banished} Life Points!`);
        }
    });

    // ================================================================
    // 817 — Eruzione Vulcanica / Volcanic Eruption (Trappola Normale)
    // Durante la propria End Phase, se si controlla Mondo Giurassico
    // (id 812): distruggi tutte le carte sul Terreno.
    // ================================================================
    CardEffects.register(817, {
        onEndPhase(ctx) {
            const fieldSpell = ctx.owner === 'player' ? gameState.playerFieldSpell : gameState.botFieldSpell;
            if (!fieldSpell || fieldSpell.isFaceDown || fieldSpell.card.id !== 812) return;
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (!slot) return;
                    ctx.graveyard(owner).push(slot.card);
                    ctx.field(owner)[index] = null;
                    count++;
                });
                ctx.stField(owner).forEach((slot, index) => {
                    if (!slot) return;
                    ctx.graveyard(owner).push(slot.card);
                    ctx.stField(owner)[index] = null;
                    count++;
                });
            });
            ctx.log(`🌋 Eruzione Vulcanica distrugge ${count} cart${count === 1 ? 'a' : 'e'} sul Terreno!`);
        }
    });

    // ================================================================
    // 819 — Scudo con Braccio Magico / Magical Arm Shield (Trappola
    // Normale)
    // Attivabile solo quando l'avversario dichiara un attacco mentre
    // controlli un mostro. Prendi il controllo di 1 mostro scoperto
    // dell'avversario, eccetto quello attaccante; viene attaccato al
    // suo posto. Combina 2 meccanismi generici già esistenti — ctx.takeControl
    // (il controllo torna al vero proprietario alla End Phase,
    // processTemporaryControlReturns in duel-engine.js — SEMPLIFICAZIONE
    // già nota di quel meccanismo: "fine Battle Phase" reale diventa
    // "fine turno") e ctx.redirectAttack (già usato da Ragno della
    // Roulette id 425) — calcolando PRIMA lo slot libero su cui il
    // mostro rubato atterrerà, dato che takeControl non restituisce
    // l'indice scelto.
    // SEMPLIFICAZIONE: se l'avversario ha più di un mostro scoperto
    // bersagliabile, sceglie automaticamente il primo trovato invece di
    // offrire una scelta — nessuna UI di selezione bersaglio esiste per
    // questo tipo di hook automatico.
    // ================================================================
    // ================================================================
    // 818 — Onda Sismica / Seismic Wave (Trappola Continua)
    // Attiva quando un mostro Tipo Dinosauro scoperto controllato viene
    // distrutto: blocca 3 Zone Magia/Trappola inutilizzate dell'avversario
    // (nuovo DuelEngine.isSTZoneLocked/findFreeSTSlot, usato ovunque una
    // Zona Magia/Trappola libera viene cercata — setSpellTrap/
    // highlightEmptySlots in actions.js, botSetTrapCard in bot.js,
    // canActivate/activateCard in duel-engine.js). Si autodistrugge alla
    // propria 3ª Standby Phase dopo l'attivazione (contatore
    // ctx.card._sismicStandbyCount, incrementato da onStandbyPhase — già
    // generico per zona 'st', vedi firePhaseTrigger), recuperando 1
    // mostro Dinosauro dal Cimitero alla mano. onSTDestroyed (non
    // onDestroy: quello è riservato ai Mostri) libera le Zone bloccate
    // quando questa carta lascia il campo, in QUALUNQUE modo.
    // SEMPLIFICAZIONE: riusa onOwnMonsterDestroyed (Chain-scelta, come
    // Macchina del Tempo id 478) senza distinguere "tranne durante il
    // Damage Step" — questo motore non modella un sotto-stato distinto
    // per il Damage Step.
    // ================================================================
    CardEffects.register(818, {
        continuous: true,
        onOwnMonsterDestroyed(ctx) {
            if (!ctx.destroyedCard || ctx.destroyedCard.race !== 'Dinosauro') return;
            gameState.lockedSTZonesFor = gameState.lockedSTZonesFor || {};
            gameState.lockedSTZonesFor[ctx.opponent] = gameState.lockedSTZonesFor[ctx.opponent] || new Set();
            const emptyIndices = ctx.stField(ctx.opponent).map((slot, i) => (slot === null ? i : -1)).filter((i) => i !== -1).slice(0, 3);
            emptyIndices.forEach((i) => gameState.lockedSTZonesFor[ctx.opponent].add(i));
            ctx.card._sismicStandbyCount = 0;
            ctx.log(`🌍 Onda Sismica blocca ${emptyIndices.length} Zone Magia/Trappola dell'avversario!`);
        },
        onStandbyPhase(ctx) {
            if (ctx.card._sismicStandbyCount == null) return;
            ctx.card._sismicStandbyCount += 1;
            if (ctx.card._sismicStandbyCount < 3) return;
            const grave = ctx.graveyard(ctx.owner);
            const dinoIndex = grave.findIndex((c) => c.race === 'Dinosauro');
            const dino = dinoIndex !== -1 ? grave.splice(dinoIndex, 1)[0] : null;
            ctx.destroySpellTrap(ctx.owner, ctx.index);
            if (dino) {
                ctx.hand(ctx.owner).push(dino);
                ctx.log(`🌍 Onda Sismica si autodistrugge: recupera ${dino.name} dal Cimitero!`);
            } else {
                ctx.log('🌍 Onda Sismica si autodistrugge!');
            }
        },
        onSTDestroyed(ctx) {
            if (gameState.lockedSTZonesFor && gameState.lockedSTZonesFor[ctx.opponent]) {
                gameState.lockedSTZonesFor[ctx.opponent].clear();
            }
        }
    });

    CardEffects.register(819, {
        canActivate(ctx) {
            if (!ctx.field(ctx.owner).some(Boolean)) return false;
            const hasTarget = ctx.field(ctx.attackerOwner).some((slot, i) => slot && !slot.isFaceDown && i !== ctx.attackerIndex);
            const hasFreeSlot = ctx.field(ctx.owner).some((s) => s === null);
            return hasTarget && hasFreeSlot;
        },
        onAttackDeclare(ctx) {
            const enemyField = ctx.field(ctx.attackerOwner);
            const chosenIndex = enemyField.findIndex((slot, i) => slot && !slot.isFaceDown && i !== ctx.attackerIndex);
            if (chosenIndex === -1) return;
            const myField = ctx.field(ctx.owner);
            const freeIndex = myField.findIndex((s) => s === null);
            if (freeIndex === -1) return;
            const decl = ctx.declareTarget(ctx.attackerOwner, chosenIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const stolenName = targetSlot.card.name;
            if (!ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex)) return;
            ctx.redirectAttack(freeIndex, ctx.owner);
            ctx.log(`🛡️ Scudo con Braccio Magico prende il controllo di ${stolenName} e lo mette davanti all'attacco!`);
        }
    });

    // ================================================================
    // 820 — Nega Attacco / Negate Attack (Trappola Contatore)
    // Quando l'avversario dichiara un attacco: annulla l'attacco, poi
    // termina la Battle Phase (ctx.endBattlePhase, lo stesso helper già
    // usato da Tartaruga Elettromagnetica id 223).
    // ================================================================
    CardEffects.register(820, {
        onAttackDeclare(ctx) {
            ctx.cancelAttack();
            ctx.endBattlePhase();
            ctx.log("🛡️ Nega Attacco annulla l'attacco e termina la Battle Phase!");
        }
    });

    // ================================================================
    // 821 — Goblin fuori dalla Padella / Goblin Out of the Frying Pan
    // (Trappola Contatore)
    // Paga 500 LP; annulla l'attivazione di una Magia dell'avversario e
    // rimandala in mano. Stesso schema di risposta via Chain di
    // Interferenza Magica (id 361), ma restituisce la carta invece di
    // distruggerla.
    // ================================================================
    CardEffects.register(821, {
        canActivate(ctx) {
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'spell' && chain.links[chain.links.length - 1].owner === ctx.opponent);
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 500);
            const chain = ctx.gameState.chain;
            const link = chain.links[chain.links.length - 1];
            if (ctx.negateActivation()) {
                ctx.hand(link.owner).push(link.card);
                ctx.log('🔥 Goblin fuori dalla Padella paga 500 LP, annulla e rimanda in mano la Magia avversaria!');
            } else {
                ctx.log('🔥 Goblin fuori dalla Padella paga 500 LP, ma non c\'era più nulla da annullare.');
            }
        }
    });

    // ================================================================
    // 822 — Malfunzionamento / Malfunction (Trappola Contatore)
    // Paga 500 LP; annulla l'attivazione di una Trappola dell'avversario.
    // Vedi missingEffectNote su id 822 in cards.json: distrugge invece
    // di "rimettere Set", stesso schema di Interferenza Magica (id 361).
    // ================================================================
    CardEffects.register(822, {
        canActivate(ctx) {
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'trap' && chain.links[chain.links.length - 1].owner === ctx.opponent);
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 500);
            if (ctx.negateActivation()) {
                ctx.log('⚙️ Malfunzionamento paga 500 LP e annulla la Trappola avversaria!');
            } else {
                ctx.log('⚙️ Malfunzionamento paga 500 LP, ma non c\'era più nulla da annullare.');
            }
        }
    });

    // ================================================================
    // 823 — Scavo Fossile / Fossil Excavation (Trappola Continua)
    // Scarta 1 carta; Special Summon 1 mostro Dinosauro dal Cimitero.
    // Dipendenza reciproca: se questa carta lascia il Terreno, distruggi
    // il mostro; se il mostro viene distrutto, distruggi questa carta
    // (stesso schema targetOwner/targetIndex/targetUid di Incantesimo
    // Ombra id 439/Arte Ninjitsu della Trasformazione id 794). "Annulla
    // gli effetti di quel mostro sul Terreno": marcato ad ogni render in
    // static() tramite gameState.monsterEffectsNegatedUidsFor (Set
    // ricalcolato da zero ad ogni render, quindi la negazione dura
    // esattamente finché entrambe le carte restano in campo — controllato
    // da isMonsterCardEffectsNegated in fireTrigger/duel-engine.js).
    // ================================================================
    CardEffects.register(823, {
        continuous: true,
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Dinosauro');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'monster' && c.race === 'Dinosauro');
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [discarded] = hand.splice(0, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            const [revived] = grave.splice(index, 1);
            ctx.specialSummon(ctx.owner, revived, slotIndex, 'attack');
            ctx.card.targetOwner = ctx.owner;
            ctx.card.targetIndex = slotIndex;
            ctx.card.targetUid = revived.uid;
            ctx.log(`🦴 Scavo Fossile scarta ${discarded.name} e Special Summona ${revived.name} dal Cimitero!`);
        },
        static(ctx) {
            if (ctx.card.targetOwner == null) return;
            const targetSlot = ctx.field(ctx.card.targetOwner)[ctx.card.targetIndex];
            const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === ctx.card.targetUid;
            if (!validTarget) {
                ctx.stField(ctx.owner)[ctx.index] = null;
                ctx.graveyard(ctx.owner).push(ctx.card);
                return;
            }
            gameState.monsterEffectsNegatedUidsFor = gameState.monsterEffectsNegatedUidsFor || { player: new Set(), bot: new Set() };
            gameState.monsterEffectsNegatedUidsFor[ctx.card.targetOwner].add(ctx.card.targetUid);
        }
    });

    // ================================================================
    // Effetto condiviso "se questa carta attacca, l'avversario non può
    // attivare Magie/Trappole fino alla fine del Damage Step"
    // (Drago Gadjiltron Ingranaggio Antico id 824, Ingegnere Ingranaggio
    // Antico id 826, Golem Ingranaggio Antico id 832, Bestia Ingranaggio
    // Antico id 833, Soldato Ingranaggio Antico id 834).
    // SEMPLIFICAZIONE: blocca per il resto del turno (gameState.
    // noTrapActivationFor/noSpellActivationFor), non solo fino alla fine
    // del Damage Step.
    // ================================================================
    function onOwnAttackDeclareBlockSpellsTraps(ctx) {
        gameState.noTrapActivationFor = gameState.noTrapActivationFor || {};
        gameState.noSpellActivationFor = gameState.noSpellActivationFor || {};
        gameState.noTrapActivationFor[ctx.opponent] = true;
        gameState.noSpellActivationFor[ctx.opponent] = true;
        // ctx.card NON esiste in questo contesto (ON_ATTACK_DECLARE, fase
        // "auto-effetto dell'attaccante"): quel nome è riservato, dentro
        // openTriggerWindow, alla carta di chi RISPONDE — vedi il
        // commento a inizio file. La carta attaccante si trova invece
        // tramite ctx.attackerOwner/attackerIndex, sempre presenti qui.
        const attackerSlot = ctx.field(ctx.attackerOwner)[ctx.attackerIndex];
        ctx.log(`⚙️ ${attackerSlot ? attackerSlot.card.name : 'Questa carta'} blocca le Magie/Trappole avversarie per il resto del turno!`);
    }

    // ================================================================
    // 824 — Drago Gadjiltron Ingranaggio Antico / Ancient Gear
    // Gadjiltron Dragon
    // Oltre al blocco condiviso (onOwnAttackDeclareBlockSpellsTraps):
    // "guadagna gli effetti appropriati se la Evochi Normalmente
    // sacrificando questi mostri: Gadget Verde (danno perforante) /
    // Gadget Rosso (+400 danni per QUALUNQUE danno da battaglia
    // inflitto, non solo attacco diretto — diverso da Chimera
    // Gadjiltron id 825) / Gadget Giallo (+600 danni se distrugge un
    // mostro dell'avversario in battaglia)". Stesso
    // pending.card._tributedCardIds di Chimera Gadjiltron qui sopra; il
    // Gadget Verde riusa la stessa infrastruttura di danno perforante
    // per-carta già esistente (gameState.piercingUidsFor, come Impatto
    // Meteora Fatato) invece di reinventarne una.
    // ================================================================
    CardEffects.register(824, {
        onOwnAttackDeclare: onOwnAttackDeclareBlockSpellsTraps,
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            const tributed = ctx.summonedCard._tributedCardIds || [];
            if (tributed.includes(828)) ctx.summonedCard._gadjiltronGreenGadget = true;
            if (tributed.includes(829)) ctx.summonedCard._gadjiltronRedGadget = true;
            if (tributed.includes(830)) ctx.summonedCard._gadjiltronYellowGadget = true;
        },
        static(ctx) {
            if (ctx.card._gadjiltronGreenGadget) {
                gameState.piercingUidsFor[ctx.owner].add(ctx.card.uid);
            }
        },
        onDealsBattleDamage(ctx) {
            if (ctx.card._gadjiltronRedGadget) {
                ctx.dealDamage(ctx.opponent, 400);
                ctx.log('⚙️ Drago Gadjiltron Ingranaggio Antico (Gadget Rosso): 400 danni extra!');
            }
        },
        onBattled(ctx) {
            if (ctx.card._gadjiltronYellowGadget && ctx.opponentSurvived === false) {
                ctx.dealDamage(ctx.opponent, 600);
                ctx.log('⚙️ Drago Gadjiltron Ingranaggio Antico (Gadget Giallo): 600 danni extra!');
            }
        }
    });

    // ================================================================
    // 825 — Chimera Gadjiltron Ingranaggio Antico / Ancient Gear
    // Gadjiltron Chimera
    // "Guadagna gli effetti appropriati se la Evochi Normalmente
    // sacrificando questi mostri: Gadget Verde (+300 ATK) / Gadget Rosso
    // (se infligge danno da battaglia con un attacco diretto: +500
    // danni) / Gadget Giallo (se distrugge un mostro dell'avversario in
    // battaglia: +700 danni)" — usa il nuovo
    // pending.card._tributedCardIds (impostato in performTributeSacrifice,
    // actions.js, l'unico punto in cui questo motore sa DAVVERO quali
    // carte sono state sacrificate, non solo quante), letto qui in
    // onSummon per marcare permanentemente quali bonus questa specifica
    // copia ha guadagnato. onBattled con opponentSurvived === false: dato
    // che quel valore letterale compare SOLO nella chiamata per
    // l'attaccante che distrugge (le chiamate per il difensore
    // sopravvissuto passano sempre true), basta da solo a significare
    // "questa carta ha appena distrutto in battaglia il mostro
    // avversario" senza bisogno di controllare altro sul ruolo.
    // ================================================================
    CardEffects.register(825, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            const tributed = ctx.summonedCard._tributedCardIds || [];
            if (tributed.includes(828)) ctx.summonedCard._gadjiltronGreenGadget = true;
            if (tributed.includes(829)) ctx.summonedCard._gadjiltronRedGadget = true;
            if (tributed.includes(830)) ctx.summonedCard._gadjiltronYellowGadget = true;
        },
        static(ctx) {
            if (ctx.card._gadjiltronGreenGadget) {
                const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + 300, def: e.def };
            }
        },
        onDealsBattleDamage(ctx) {
            if (ctx.card._gadjiltronRedGadget && ctx.targetIndex === -1) {
                ctx.dealDamage(ctx.opponent, 500);
                ctx.log('⚙️ Chimera Gadjiltron Ingranaggio Antico (Gadget Rosso): 500 danni extra!');
            }
        },
        onBattled(ctx) {
            if (ctx.card._gadjiltronYellowGadget && ctx.opponentSurvived === false) {
                ctx.dealDamage(ctx.opponent, 700);
                ctx.log('⚙️ Chimera Gadjiltron Ingranaggio Antico (Gadget Giallo): 700 danni extra!');
            }
        }
    });

    // ================================================================
    // 826 — Ingegnere Ingranaggio Antico / Ancient Gear Engineer
    // Oltre al blocco condiviso (onOwnAttackDeclareBlockSpellsTraps):
    // "alla fine del Damage Step, se questa carta ha attaccato: distruggi
    // 1 Magia/Trappola dell'avversario". onBattled(ctx) da solo non basta
    // a saperlo (scatta identico sia per l'attaccante sia per il
    // difensore che sopravvive) — quindi onOwnAttackDeclare marca la
    // carta con un flag auto-consumato, letto e cancellato subito da
    // onBattled. SEMPLIFICAZIONE: sceglie il primo bersaglio trovato
    // invece di offrire una scelta (nessuna UI di selezione bersaglio
    // esiste per questo tipo di hook automatico) e, come ogni altro
    // onBattled in questo file, non scatta su un attacco diretto (nessun
    // "avversario di battaglia" in quel caso).
    // Terza clausola ("annulla gli effetti Trappola che hanno come
    // bersaglio questa carta, e se lo fai, distruggi quella Trappola"):
    // implementata tramite il checkpoint di targeting introdotto per
    // Gran Scudo Gardna/id 115 (ctx.declareTarget, duel-engine.js) —
    // stessa SEMPLIFICAZIONE già documentata lì: coperta solo dagli
    // effetti Carta che chiamano esplicitamente il checkpoint.
    // ================================================================
    CardEffects.register(826, {
        onOwnAttackDeclare(ctx) {
            onOwnAttackDeclareBlockSpellsTraps(ctx);
            const attackerSlot = ctx.field(ctx.attackerOwner)[ctx.attackerIndex];
            if (attackerSlot) attackerSlot.card.ancientGearEngineerAttacked = true;
        },
        onBattled(ctx) {
            if (!ctx.card.ancientGearEngineerAttacked) return;
            delete ctx.card.ancientGearEngineerAttacked;
            const index = ctx.stField(ctx.opponent).findIndex((slot) => slot);
            if (index === -1) return;
            const targetName = ctx.stField(ctx.opponent)[index].card.name;
            ctx.destroySpellTrap(ctx.opponent, index);
            ctx.log(`⚙️ Ingegnere Ingranaggio Antico distrugge ${targetName} alla fine del Damage Step!`);
        },
        canActivate(ctx) {
            if (ctx.zone !== 'monster') return false;
            return ctx.sourceType === 'trap';
        },
        onCardEffectTargetDeclare(ctx) {
            ctx.cancel();
            if (ctx.sourceCard) {
                // Se la Trappola sorgente è ancora scoperta sul Terreno (una
                // Continua, o una Normale non ancora mandata al Cimitero),
                // distruggila davvero — se è già andata al Cimitero come
                // parte della sua stessa attivazione (caso comune per una
                // Trappola Normale in questo motore), non c'è altro da fare.
                const idx = ctx.stField(ctx.sourceOwner).findIndex((s) => s && s.card.uid === ctx.sourceCard.uid);
                if (idx !== -1) ctx.destroySpellTrap(ctx.sourceOwner, idx);
            }
            ctx.log(`⚙️ ${ctx.card.name} annulla e distrugge la Trappola che la bersaglia!`);
        }
    });

    // ================================================================
    // 827 — Soldato di Avvio - Dinamo del Terrore / Boot-Up Soldier -
    // Dread Dynamo (statico)
    // Finché si controlla un mostro "Gadget": +2000 ATK.
    // ================================================================
    CardEffects.register(827, {
        static(ctx) {
            const hasGadget = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && [828, 829, 830].includes(s.card.id));
            if (!hasGadget) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + 2000, def: e.def };
        }
    });

    // ================================================================
    // Effetto condiviso di ricerca nel Deck per la catena dei Gadget
    // (Verde id 828 → Rosso id 829 → Giallo id 830 → Verde...).
    // ================================================================
    function searchGadgetToHand(ctx, targetId, targetName) {
        const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
        const deck = gameState[deckKey];
        if (!Array.isArray(deck)) return;
        const index = deck.findIndex((c) => c.id === targetId);
        if (index === -1) return;
        const card = deck.splice(index, 1)[0];
        gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
        ctx.hand(ctx.owner).push(card);
        ctx.log(`⚙️ ${ctx.card.name} aggiunge ${card.name} alla mano dal Deck!`);
    }
    CardEffects.register(828, {
        onSummon(ctx) { searchGadgetToHand(ctx, 829, 'Gadget Rosso'); },
        onSpecialSummon(ctx) { searchGadgetToHand(ctx, 829, 'Gadget Rosso'); }
    });
    CardEffects.register(829, {
        onSummon(ctx) { searchGadgetToHand(ctx, 830, 'Gadget Giallo'); },
        onSpecialSummon(ctx) { searchGadgetToHand(ctx, 830, 'Gadget Giallo'); }
    });
    CardEffects.register(830, {
        onSummon(ctx) { searchGadgetToHand(ctx, 828, 'Gadget Verde'); },
        onSpecialSummon(ctx) { searchGadgetToHand(ctx, 828, 'Gadget Verde'); }
    });

    // ================================================================
    // 831 — Piattaforma di Supporto Mech Pesante / Heavy Mech Support
    // Platform (Mostro Union)
    // Effetto Ignition dalla zona Mostro: si aggancia a un mostro Tipo
    // Macchina che si controlla, dandogli +500 ATK/DEF. SEMPLIFICAZIONE:
    // manca "se il mostro equipaggiato verrebbe distrutto in battaglia o
    // da un effetto Carta, questa carta viene distrutta al suo posto" —
    // richiederebbe un aggancio generico di redirezione della distruzione
    // verso una Carta Equipaggiamento specifica, non ancora presente.
    // ================================================================
    CardEffects.register(831, {
        isUnion: true,
        isEquip: true,
        unionTargetFilter: (c) => c.race === 'Macchina',
        canActivate(ctx) {
            return findEquipTarget(ctx, (c) => c.uid !== ctx.card.uid && c.race === 'Macchina') !== -1;
        },
        activate(ctx) {
            attachUnionMonster(ctx, (c) => c.race === 'Macchina');
        },
        static(ctx) {
            if (!ctx.card.equippedToOwner) return;
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def + 500 };
        }
    });

    // ================================================================
    // 832 — Golem Ingranaggio Antico / Ancient Gear Golem
    // Danno perforante + blocco Magie/Trappole quando attacca.
    // ================================================================
    CardEffects.register(832, { piercing: true, onOwnAttackDeclare: onOwnAttackDeclareBlockSpellsTraps });

    // ================================================================
    // 833 — Bestia Ingranaggio Antico / Ancient Gear Beast
    // "Annulla gli effetti di un mostro dell'avversario distrutto in
    // battaglia da questa carta (anche nel Cimitero)": onDestroysMonsterInBattle
    // (actions.js) marca il bersaglio sia in gameState.monsterEffectsNegatedUidsFor
    // (nega subito il suo eventuale onDestroy/auto-effetto, controllato da
    // isMonsterCardEffectsNegated in fireTrigger) sia in
    // gameState.negatedEffectsForeverUids (persiste ANCHE nel Cimitero,
    // controllato da findTriggerCandidates per l'unica carta di questo
    // dataset attivabile dal Cimitero, id 223).
    // ================================================================
    CardEffects.register(833, {
        onOwnAttackDeclare: onOwnAttackDeclareBlockSpellsTraps,
        onDestroysMonsterInBattle(ctx) {
            if (!ctx.destroyedCard) return;
            gameState.monsterEffectsNegatedUidsFor = gameState.monsterEffectsNegatedUidsFor || { player: new Set(), bot: new Set() };
            gameState.monsterEffectsNegatedUidsFor[ctx.opponent].add(ctx.destroyedCard.uid);
            gameState.negatedEffectsForeverUids = gameState.negatedEffectsForeverUids || new Set();
            gameState.negatedEffectsForeverUids.add(ctx.destroyedCard.uid);
            ctx.log(`⚙️ ${ctx.card.name} annulla gli effetti di ${ctx.destroyedCard.name}, anche nel Cimitero!`);
        }
    });

    // ================================================================
    // 834 — Soldato Ingranaggio Antico / Ancient Gear Soldier
    // ================================================================
    CardEffects.register(834, { onOwnAttackDeclare: onOwnAttackDeclareBlockSpellsTraps });

    // ================================================================
    // 835 — Ingranaggio Antico / Ancient Gear
    // Se controlli un mostro "Ingranaggio Antico" (l'archetipo, es. Golem
    // Ingranaggio Antico id 832): puoi Special Summonarla dalla mano
    // scoperta in Posizione di Attacco. In inglese "Ancient Gear" è un
    // PREFISSO in ogni nome della famiglia; in italiano la traduzione lo
    // rende un SUFFISSO ("Golem Ingranaggio Antico", non "Ingranaggio
    // Antico Golem") — .includes(), non .startsWith(), verifica
    // l'appartenenza all'archetipo indipendentemente dalla posizione.
    // ================================================================
    CardEffects.register(835, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Ingranaggio Antico') && s.card.uid !== ctx.card.uid);
        },
        paySpecialSummonCost() { return true; }
    });

    // ================================================================
    // 836 — Cannone Ingranaggio Antico / Ancient Gear Cannon (Ignition —
    // auto-sacrificio)
    // Sacrifica questa carta: 500 danni e blocca le Trappole di
    // entrambi durante la Battle Phase di questo turno.
    // ================================================================
    CardEffects.register(836, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && s.card.uid === ctx.card.uid);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.graveyard(ctx.owner).push(ctx.card);
            field[index] = null;
            ctx.dealDamage(ctx.opponent, 500);
            gameState.noTrapActivationFor = gameState.noTrapActivationFor || {};
            gameState.noTrapActivationFor.player = true;
            gameState.noTrapActivationFor.bot = true;
            ctx.log('⚙️ Cannone Ingranaggio Antico si sacrifica, infligge 500 danni e blocca le Trappole!');
        }
    });

    // ================================================================
    // 837 — Officina dell'Ingranaggio Antico / Ancient Gear Workshop
    // (Magia Normale)
    // Aggiungi 1 mostro "Ingranaggio Antico" dal Cimitero alla mano.
    // ================================================================
    CardEffects.register(837, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.name && c.name.includes('Ingranaggio Antico'));
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.name && c.name.includes('Ingranaggio Antico'));
            if (index === -1) return;
            const [card] = grave.splice(index, 1);
            ctx.hand(ctx.owner).push(card);
            ctx.log(`⚙️ Officina dell'Ingranaggio Antico recupera ${card.name} dal Cimitero!`);
        }
    });

    // ================================================================
    // 838 — Carro Armato Ingranaggio Antico / Ancient Gear Tank
    // (Equipaggiamento, solo "Ingranaggio Antico")
    // +600 ATK. Quando questa carta viene distrutta e mandata al
    // Cimitero: 600 danni. Stesso schema di dipendenza targetOwner/
    // targetIndex/targetUid di Collana del Comando (id 688).
    // ================================================================
    CardEffects.register(838, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.name && c.name.includes('Ingranaggio Antico')) !== -1; },
        activate(ctx) {
            const index = findEquipTarget(ctx, (c) => c.name && c.name.includes('Ingranaggio Antico'));
            if (index === -1) return;
            const target = ctx.field(ctx.owner)[index].card;
            ctx.card.targetOwner = ctx.owner;
            ctx.card.targetIndex = index;
            ctx.card.targetUid = target.uid;
            ctx.log(`⚙️ Carro Armato Ingranaggio Antico equipaggiato a ${target.name}!`);
        },
        static(ctx) {
            const targetSlot = ctx.card.targetOwner != null ? ctx.field(ctx.card.targetOwner)[ctx.card.targetIndex] : null;
            const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === ctx.card.targetUid;
            if (validTarget) {
                const e = gameState.atkDefBonus[targetSlot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[targetSlot.card.uid] = { atk: e.atk + 600, def: e.def };
                return;
            }
            ctx.stField(ctx.owner)[ctx.index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            ctx.dealDamage(ctx.opponent, 600);
            ctx.log('⚙️ Carro Armato Ingranaggio Antico va al Cimitero e infligge 600 danni!');
        }
    });

    // ================================================================
    // 839 — Esplosivo Ingranaggio Antico / Ancient Gear Explosive
    // (Magia Normale)
    // Distruggi 1 proprio mostro "Ingranaggio Antico"; infliggi danni
    // pari alla metà del suo ATK originale.
    // ================================================================
    CardEffects.register(839, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Ingranaggio Antico'));
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Ingranaggio Antico'));
            if (index === -1) return;
            const card = field[index].card;
            const damage = Math.floor((card.attack || 0) / 2);
            ctx.destroyMonster(ctx.owner, index);
            ctx.dealDamage(ctx.opponent, damage);
            ctx.log(`⚙️ Esplosivo Ingranaggio Antico distrugge ${card.name} e infligge ${damage} danni!`);
        }
    });

    // ================================================================
    // 840 — Pugno Ingranaggio Antico / Ancient Gear Fist (Equipaggiamento,
    // solo "Ingranaggio Antico")
    // Alla fine del Damage Step, se il mostro equipaggiato ha combattuto
    // e resta sul Terreno: distruggi il mostro contro cui ha combattuto
    // (onEquippedMonsterBattled, actions.js).
    // ================================================================
    CardEffects.register(840, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.name && c.name.includes('Ingranaggio Antico')) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.name && c.name.includes('Ingranaggio Antico')); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static() {}, // nessun bonus ATK/DEF: serve solo per il controllo "bersaglio ancora valido"
        onEquippedMonsterBattled(ctx) {
            if (!ctx.opponentSurvived) return;
            const idx = ctx.field(ctx.opponent).findIndex((s) => s && s.card.uid === ctx.opponentCard.uid);
            if (idx === -1) return;
            ctx.destroyMonster(ctx.opponent, idx);
            ctx.log(`⚙️ Pugno Ingranaggio Antico distrugge ${ctx.opponentCard.name}!`);
        }
    });

    // ================================================================
    // 841 — Fabbrica dell'Ingranaggio Antico / Ancient Gear Factory
    // (Magia Normale)
    // Rivela 1 mostro "Ingranaggio Antico" di Livello 5+ dalla mano, poi
    // bandisci mostri "Ingranaggio Antico" dal proprio Cimitero il cui
    // Livello totale sia il doppio di quello rivelato (ctx.banish, zona
    // Bandite): se lo Evochi Normalmente in QUESTO turno, lo fai senza
    // Sacrificio — marcatore per-carta card._noTributeThisTurn ===
    // gameState.turn, controllato in attemptMonsterSummon (actions.js)
    // insieme alle altre eccezioni puntuali già lì (Gaia id 711, Grande
    // Pillola Evolutiva id 810). SEMPLIFICAZIONE: sceglie da sola quale
    // mostro rivelare (il Livello più alto tra quelli banditibili) e
    // quali carte bandire dal Cimitero (le più alte di Livello, per
    // banditirne il minor numero possibile).
    // ================================================================
    CardEffects.register(841, {
        canActivate(ctx) {
            const isAncientGearMonster = (c) => c.type === 'monster' && c.name.includes('Ingranaggio Antico');
            const candidates = ctx.hand(ctx.owner).filter((c) => isAncientGearMonster(c) && c.level >= 5);
            if (candidates.length === 0) return false;
            const graveLevels = ctx.graveyard(ctx.owner).filter(isAncientGearMonster).reduce((sum, c) => sum + c.level, 0);
            return candidates.some((c) => graveLevels >= c.level * 2);
        },
        activate(ctx) {
            const isAncientGearMonster = (c) => c.type === 'monster' && c.name.includes('Ingranaggio Antico');
            const candidates = ctx.hand(ctx.owner).filter((c) => isAncientGearMonster(c) && c.level >= 5);
            const grave = ctx.graveyard(ctx.owner);
            const graveLevels = grave.filter(isAncientGearMonster).reduce((sum, c) => sum + c.level, 0);
            let revealed = null;
            candidates.forEach((c) => {
                if (graveLevels >= c.level * 2 && (!revealed || c.level > revealed.level)) revealed = c;
            });
            if (!revealed) return;
            let remaining = revealed.level * 2;
            const sorted = grave.filter(isAncientGearMonster).sort((a, b) => b.level - a.level);
            const toBanish = [];
            for (const c of sorted) {
                if (remaining <= 0) break;
                toBanish.push(c);
                remaining -= c.level;
            }
            toBanish.forEach((c) => {
                const idx = grave.indexOf(c);
                if (idx !== -1) { grave.splice(idx, 1); ctx.banish(ctx.owner, c); }
            });
            revealed._noTributeThisTurn = gameState.turn;
            ctx.log(`⚙️ Fabbrica dell'Ingranaggio Antico rivela ${revealed.name} e bandisce ${toBanish.length} cart${toBanish.length === 1 ? 'a' : 'e'} dal Cimitero: potrai Evocarlo Normalmente senza Sacrificio questo turno!`);
        }
    });

    // ================================================================
    // 842 — Trapano Ingranaggio Antico / Ancient Gear Drill (Magia
    // Normale)
    // Se controlli un mostro "Ingranaggio Antico": scarta 1 carta; Set 1
    // Magia direttamente dal Deck. Vedi missingEffectNote su id 842 in
    // cards.json per il blocco-attivazione mancante.
    // ================================================================
    CardEffects.register(842, {
        canActivate(ctx) {
            const hasAncientGear = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Ingranaggio Antico'));
            if (!hasAncientGear) return false;
            if (ctx.hand(ctx.owner).length === 0) return false;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            return Array.isArray(deck) && deck.some((c) => c.type === 'spell') && ctx.stField(ctx.owner).some((s) => s === null);
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const [discarded] = hand.splice(0, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            const index = deck.findIndex((c) => c.type === 'spell');
            if (index === -1) return;
            const [card] = deck.splice(index, 1);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            const freeSlot = ctx.stField(ctx.owner).findIndex((s) => s === null);
            if (freeSlot === -1) { ctx.graveyard(ctx.owner).push(card); return; }
            ctx.stField(ctx.owner)[freeSlot] = { card: card, isFaceDown: true, setOnTurn: gameState.turn };
            gameState.blockedCardUidsThisTurn = gameState.blockedCardUidsThisTurn || new Set();
            gameState.blockedCardUidsThisTurn.add(card.uid);
            ctx.log(`⚙️ Trapano Ingranaggio Antico scarta ${discarded.name} e mette Set ${card.name} dal Deck! Non può essere attivata in questo turno.`);
        }
    });

    // ================================================================
    // 843 — Castello dell'Ingranaggio Antico / Ancient Gear Castle
    // (Magia Continua)
    // Tutti i mostri "Ingranaggio Antico": +300 ATK. Ogni Evocazione
    // Normale/Set (di QUALSIASI mostro, di entrambi i lati — il testo non
    // specifica "tuo") mentre questa carta resta scoperta: +1 Segnalino
    // (card.counters, la convenzione generica già usata da id 131/139).
    // onAnyNormalOrFlipSummon (reactToAnyNormalOrFlipSummon,
    // duel-engine.js) è il gancio giusto per "chiunque", non
    // onOwnMonsterSummoned (solo il proprio lato) — esteso apposta anche
    // alla zona 'st', dove vive questa carta (prima copriva solo la zona
    // Mostri, es. Misterioso Burattinaio id 579).
    // Il sacrificio alternativo ("puoi sacrificare questa carta al posto
    // dei mostri, se i Segnalini bastano") è implementato in
    // js/engine/actions.js (attemptMonsterSummon/performGearCastleTributeSacrifice),
    // non qui: scatta PRIMA della selezione Tributi normale, offerta come
    // modale Sì/Annulla quando si tenta di Evocare Tributo un mostro
    // "Ingranaggio Antico" scoperto con Segnalini sufficienti su questa
    // carta.
    // ================================================================
    CardEffects.register(843, {
        continuous: true,
        activate(ctx) {
            ctx.log("⚙️ Castello dell'Ingranaggio Antico attivato!");
        },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || !(slot.card.name && slot.card.name.includes('Ingranaggio Antico'))) return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 300, def: e.def };
                });
            });
        },
        // SEMPLIFICAZIONE: onAnyNormalOrFlipSummon scatta anche su un Flip
        // Summon (un mostro già Set che si rivela in battaglia), non solo
        // su una NUOVA Evocazione Normale/Set come da testo reale — nessun
        // gancio "chiunque, solo Normale/Set" esiste ancora, stessa
        // tolleranza già accettata altrove per un leggero overreach
        // (es. Ptera Nero/Bebè Cerasauro).
        onAnyNormalOrFlipSummon(ctx) {
            ctx.card.counters = (ctx.card.counters || 0) + 1;
            ctx.log(`⚙️ Castello dell'Ingranaggio Antico guadagna 1 Segnalino (${ctx.card.counters} totali)!`);
        }
    });

    // ================================================================
    // 845 — Controllore Nemico / Enemy Controller (Magia Rapida)
    // Due modalità: cambia Posizione di 1 mostro avversario, OPPURE
    // sacrifica 1 mostro e prendi il controllo di 1 mostro avversario
    // fino alla End Phase (ctx.takeControl, come Cambio di Cuore id 147).
    // SEMPLIFICAZIONE: sceglie sempre la modalità "prendi il controllo"
    // se può sacrificare un mostro, altrimenti la modalità "cambia
    // Posizione", invece di lasciar scegliere.
    // ================================================================
    CardEffects.register(845, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const oppFieldPre = ctx.field(ctx.opponent);
            const preIndex = oppFieldPre.findIndex((s) => s && !s.isFaceDown);
            if (preIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, preIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const hasOwnMonster = ctx.field(ctx.owner).some((s) => s);
            if (hasOwnMonster) {
                const ownField = ctx.field(ctx.owner);
                const sacIndex = ownField.findIndex((s) => s);
                const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (sacIndex !== -1 && targetSlot) {
                    const sacrificed = ownField[sacIndex].card;
                    ctx.graveyard(ctx.owner).push(sacrificed);
                    ownField[sacIndex] = null;
                    const stolen = targetSlot.card;
                    if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex)) {
                        ctx.log(`⚙️ Controllore Nemico sacrifica ${sacrificed.name} e prende il controllo di ${stolen.name}!`);
                        return;
                    }
                }
            }
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            targetSlot.position = targetSlot.position === 'attack' ? 'defense' : 'attack';
            ctx.log(`⚙️ Controllore Nemico cambia la Posizione di ${targetSlot.card.name}!`);
        }
    });

    // ================================================================
    // 846 — Cambio d'Arma / Weapon Change (Magia Continua)
    // "Una volta per ciascuna delle tue Standby Phase: puoi pagare 700 LP,
    // poi scegliere come bersaglio 1 mostro Tipo Guerriero o Macchina che
    // controlli; scambia l'ATK e la DEF attuali di quel bersaglio fino
    // alla fine del prossimo turno del tuo avversario." — reazione
    // onStandbyPhase(ctx), firePhaseTrigger (duel-engine.js) chiama ogni
    // reazione in un forEach SINCRONO ma senza alcuna dipendenza
    // d'ordinamento successiva (a differenza di onAttackDeclare/559: qui
    // nessun calcolo successivo dipende da QUANDO esattamente si risolve
    // la scelta), quindi una vera scelta interattiva
    // (DuelEngineUI.openChoicePopover per "paga 700 LP?",
    // openCardListPicker se più di un bersaglio idoneo) è sicura. Il bot
    // (nessuna vera IA dedicata) applica sempre se possibile, come le
    // altre scelte "puoi" senza vera IA in questo file. Riusa
    // gameState.orgothAtkDefBonus/orgothActiveUidsFor (395 Orgoth
    // l'Implacabile) per la durata "fino a fine turno dell'avversario":
    // la semantica di scadenza è identica (azzerato in changeTurn,
    // game-flow.js, quando torna il turno di chi l'ha concesso), quindi
    // nessun nuovo store/nessuna nuova logica di pulizia serve.
    // ================================================================
    function applyWeaponChange(ctx, target) {
        ctx.markUsedOncePerTurn(`weapon-change:${ctx.card.uid}`);
        ctx.dealDamage(ctx.owner, 700);
        const atk = DuelEngine.getEffectiveAtk(target);
        const def = DuelEngine.getEffectiveDef(target);
        gameState.orgothAtkDefBonus = gameState.orgothAtkDefBonus || {};
        gameState.orgothActiveUidsFor = gameState.orgothActiveUidsFor || { player: new Set(), bot: new Set() };
        gameState.orgothAtkDefBonus[target.uid] = { atk: def - atk, def: atk - def };
        gameState.orgothActiveUidsFor[ctx.owner].add(target.uid);
        ctx.log(`⚙️ Cambio d'Arma paga 700 LP e scambia ATK/DEF di ${target.name} fino a fine turno avversario!`);
    }
    CardEffects.register(846, {
        continuous: true,
        activate(ctx) {
            ctx.log("⚙️ Cambio d'Arma attivato!");
        },
        onStandbyPhase(ctx) {
            if (ctx.hasUsedOncePerTurn(`weapon-change:${ctx.card.uid}`)) return;
            const ownLP = ctx.owner === 'player' ? gameState.playerLP : gameState.botLP;
            if (ownLP <= 700) return;
            const targets = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && (s.card.race === 'Guerriero' || s.card.race === 'Macchina')).map((s) => s.card);
            if (targets.length === 0) return;
            if (ctx.owner === 'player' && window.DuelEngineUI) {
                window.DuelEngineUI.openChoicePopover(null, {
                    title: "⚙️ Cambio d'Arma",
                    choiceA: { icon: '✅', label: 'Paga 700 LP, scambia ATK/DEF di un mostro', onSelect: () => {
                        if (targets.length === 1) { applyWeaponChange(ctx, targets[0]); return; }
                        window.DuelEngineUI.openCardListPicker(targets, {
                            title: "⚙️ Cambio d'Arma",
                            text: 'Scegli il mostro Guerriero/Macchina a cui scambiare ATK/DEF.',
                            onSelect: (card) => applyWeaponChange(ctx, targets.find((t) => t.uid === card.uid))
                        });
                    } },
                    choiceB: { icon: '❌', label: 'Non fare nulla', onSelect: () => {} }
                });
            } else {
                applyWeaponChange(ctx, targets[0]);
            }
        }
    });

    // ================================================================
    // 847 — Duplicazione Meccanica / Machine Duplication (Magia Normale)
    // Scegli 1 mostro Macchina con 500 o meno ATK; Special Summon fino
    // a 2 copie con lo stesso nome dal Deck.
    // ================================================================
    CardEffects.register(847, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.race === 'Macchina' && s.card.attack <= 500);
        },
        activate(ctx) {
            const targetSlot = ctx.field(ctx.owner).find((s) => s && !s.isFaceDown && s.card.race === 'Macchina' && s.card.attack <= 500);
            if (!targetSlot) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            let summoned = 0;
            while (summoned < 2) {
                const index = deck.findIndex((c) => c.id === targetSlot.card.id);
                if (index === -1) break;
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) break;
                const [card] = deck.splice(index, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                summoned++;
            }
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.log(`⚙️ Duplicazione Meccanica Special Summona ${summoned} copie di ${targetSlot.card.name}!`);
        }
    });

    // ================================================================
    // 848 — Vaso dell'Avarizia / Pot of Avarice (Magia Normale)
    // Rimescola fino a 5 mostri dal Cimitero nel Deck; pesca 2 carte.
    // ================================================================
    CardEffects.register(848, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).filter((c) => c.type === 'monster').length >= 1;
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const toShuffle = [];
            for (let i = grave.length - 1; i >= 0 && toShuffle.length < 5; i--) {
                if (grave[i].type === 'monster') toShuffle.push(grave.splice(i, 1)[0]);
            }
            if (toShuffle.length === 0) return;
            if (!ctx.shuffleIntoDeck(ctx.owner, toShuffle)) {
                grave.push(...toShuffle);
                return;
            }
            ctx.drawCards(ctx.owner, 2);
            ctx.log(`🏺 Vaso dell'Avarizia rimescola ${toShuffle.length} mostri nel Deck e pesca 2 carte!`);
        }
    });

    // ================================================================
    // 849 — Roccaforte la Fortezza Mobile / Fortress Whale's Oath
    // Trappola Normale: quando si attiva, activateCard() (duel-engine.js)
    // la manda già al Cimitero da sola (comportamento standard di ogni
    // Trappola Normale, dato che questa carta NON dichiara
    // continuous:true) — activate() qui sotto la ripesca subito e la
    // Special Summona in Posizione di Difesa come Mostro con Effetto
    // (Macchina/TERRA/Livello 4/ATK 0/DEF 2000), mutando i campi
    // dell'istanza in campo direttamente (ogni copia giocata è un
    // oggetto proprio, mai condiviso col resto di cardDatabase — stesso
    // principio già usato altrove per modifiche dirette permanenti).
    // Finché controlli Gadget Verde/Rosso/Giallo (id 828/829/830):
    // guadagna 3000 ATK.
    // SEMPLIFICAZIONE: la nota precedente ("questo motore non supporta
    // una carta che esiste contemporaneamente come Trappola E come
    // Mostro") descriveva un limite reale ma risolvibile senza una vera
    // architettura a doppia natura: una volta Special Summonata, questa
    // carta diventa un Mostro puro (perde la propria natura di Trappola
    // ai fini di interazioni ipotetiche con altre carte che verificassero
    // "è ancora una Trappola" — nessuna carta di questo dataset lo fa).
    // ================================================================
    CardEffects.register(849, {
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const graveIndex = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (graveIndex !== -1) grave.splice(graveIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                grave.push(ctx.card);
                ctx.log('⚠️ Il Terreno è pieno: Roccaforte la Fortezza Mobile resta nel Cimitero.');
                return;
            }
            ctx.card.type = 'monster';
            ctx.card.race = 'Macchina';
            ctx.card.attribute = 'TERRA';
            ctx.card.level = 4;
            ctx.card.attack = 0;
            ctx.card.defense = 2000;
            ctx.specialSummon(ctx.owner, ctx.card, slotIndex, 'defense');
            // specialSummon(): "difesa" implica coperta di default (stesso
            // comportamento usato da Mago Apprendista id 737) — questa
            // carta invece va Special Summonata SCOPERTA, va corretto qui.
            const newSlot = ctx.field(ctx.owner)[slotIndex];
            if (newSlot) newSlot.isFaceDown = false;
            ctx.log('🐋 Roccaforte la Fortezza Mobile si Special Summona come Mostro in Posizione di Difesa!');
        },
        static(ctx) {
            const gadgetIds = [828, 829, 830];
            const hasAllThree = gadgetIds.every((id) => ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === id));
            if (!hasAllThree) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + 3000, def: e.def };
        }
    });

    // ================================================================
    // 850 — Raggio Micro / Micro Ray (Trappola Normale)
    // Scegli 1 mostro scoperto sul Terreno; la sua DEF diventa 0 fino a
    // fine turno.
    // ================================================================
    CardEffects.register(850, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown));
        },
        activate(ctx) {
            const candidates = [];
            [ctx.opponent, ctx.owner].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => { if (slot && !slot.isFaceDown) candidates.push({ owner, index, card: slot.card }); });
            });
            if (candidates.length === 0) return;
            const choice = candidates[0];
            ctx.grantTemporaryAtkDefBonus(choice.card, 0, -DuelEngine.getEffectiveDef(choice.card), false);
            ctx.log(`🔫 Raggio Micro azzera la DEF di ${choice.card.name}!`);
        }
    });

    // ================================================================
    // 851 — Metalmorfosi Rara / Rare Metalmorph (Equipaggiamento, solo
    // Tipo Macchina). "Una volta, annulla un effetto Magia che ha come
    // bersaglio quel mostro": via il checkpoint ctx.declareTarget
    // (duel-engine.js) — la carta reagisce dalla zona ST come Specchietto
    // della Fata/id 235, ma essendo CONTINUA (già scoperta in campo,
    // equipaggiata) NON va al Cimitero quando reagisce (vedi il controllo
    // !def.continuous in tryReact dentro declareCardEffectTarget) — resta
    // equipaggiata, solo "usata" tramite gameState.rareMetalmorphUsedUids.
    // canActivate qui sotto serve DUE scopi diversi a seconda del
    // contesto: la normale attivazione (equip su un mostro Macchina, ctx
    // senza ctx.cancel) e l'eleggibilità come risposta reattiva (ctx con
    // ctx.cancel, costruito da tryReact) — si distinguono controllando se
    // ctx.cancel è una funzione, esattamente come fa tryReact stesso per
    // riconoscere un reactCtx.
    // ================================================================
    CardEffects.register(851, {
        continuous: true,
        canActivate(ctx) {
            if (typeof ctx.cancel === 'function') {
                if (gameState.rareMetalmorphUsedUids && gameState.rareMetalmorphUsedUids.has(ctx.card.uid)) return false;
                if (ctx.sourceType !== 'spell') return false;
                const equipped = ctx.card.equippedToUid;
                const targetSlot = ctx.field(ctx.owner)[ctx.targetIndex];
                return !!(equipped && ctx.targetOwner === ctx.owner && targetSlot && targetSlot.card.uid === equipped);
            }
            return findEquipTarget(ctx, (c) => c.race === 'Macchina') !== -1;
        },
        activate(ctx) { attachEquip(ctx, findEquipTarget(ctx, (c) => c.race === 'Macchina')); },
        isEquip: true,
        onCardEffectTargetDeclare(ctx) {
            gameState.rareMetalmorphUsedUids = gameState.rareMetalmorphUsedUids || new Set();
            gameState.rareMetalmorphUsedUids.add(ctx.card.uid);
            ctx.cancel();
            ctx.log(`🛡️ ${ctx.card.name} annulla l'effetto della Magia (una tantum)!`);
        },
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
        }
    });

    // ================================================================
    // 852 — Fuoco di Copertura / Covering Fire (Trappola Normale)
    // Durante un attacco subito, scegli 1 altro proprio mostro scoperto:
    // il mostro attaccato guadagna il suo ATK, solo per questo Damage Step
    // (ctx.grantDamageStepOnlyBonus, duel-engine.js).
    // ================================================================
    CardEffects.register(852, {
        onAttackDeclare(ctx) {
            if (typeof ctx.targetIndex !== 'number' || ctx.targetIndex === -1) return;
            const own = ctx.field(ctx.owner);
            const targetSlot = own[ctx.targetIndex];
            if (!targetSlot) return;
            const boosterSlot = own.find((s, i) => s && !s.isFaceDown && i !== ctx.targetIndex);
            if (!boosterSlot) return;
            const bonus = DuelEngine.getEffectiveAtk(boosterSlot.card);
            ctx.grantDamageStepOnlyBonus(targetSlot.card, bonus, 0);
            ctx.log(`🔥 Fuoco di Copertura aumenta l'ATK di ${targetSlot.card.name} di ${bonus} punti per questo Damage Step!`);
        }
    });

    // ================================================================
    // 853 — Avanti Tutta! / Full Throttle (Magia Normale)
    // Recupera 1 mostro Union (def.isUnion) dal proprio Cimitero e lo
    // aggancia direttamente a un mostro idoneo che si controlla (secondo
    // il unionTargetFilter di quel mostro Union — vedi id 513/515/831
    // qui sopra) — SEMPLIFICAZIONE: sceglie da sola il primo mostro
    // Union/bersaglio idoneo trovato invece di un'interfaccia di
    // selezione dedicata.
    // ================================================================
    CardEffects.register(853, {
        canActivate(ctx) {
            if (!ctx.stField(ctx.owner).some((s) => s === null)) return false;
            return ctx.graveyard(ctx.owner).some((c) => {
                const d = DuelEngine.getDefinition(c.id);
                return d && d.isUnion && typeof d.unionTargetFilter === 'function'
                    && ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && d.unionTargetFilter(s.card));
            });
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            let unionCard = null;
            let targetIndex = -1;
            for (const card of grave) {
                const d = DuelEngine.getDefinition(card.id);
                if (!d || !d.isUnion || typeof d.unionTargetFilter !== 'function') continue;
                const idx = ctx.field(ctx.owner).findIndex((s) => s && !s.isFaceDown && d.unionTargetFilter(s.card));
                if (idx !== -1) { unionCard = card; targetIndex = idx; break; }
            }
            if (!unionCard) return;
            const freeStSlot = ctx.stField(ctx.owner).findIndex((s) => s === null);
            if (freeStSlot === -1) return;
            const realIndex = grave.findIndex((c) => c.uid === unionCard.uid);
            grave.splice(realIndex, 1);
            const targetCard = ctx.field(ctx.owner)[targetIndex].card;
            unionCard.equippedToOwner = ctx.owner;
            unionCard.equippedToIndex = targetIndex;
            unionCard.equippedToUid = targetCard.uid;
            ctx.stField(ctx.owner)[freeStSlot] = { card: unionCard, isFaceDown: false, setOnTurn: gameState.turn };
            ctx.log(`⚙️ Avanti Tutta! recupera ${unionCard.name} dal Cimitero e lo aggancia a ${targetCard.name}!`);
        }
    });

    // ================================================================
    // SCOPERTE durante un controllo generale del database (richiesto
    // dall'utente dopo aver trovato Elfi Gemelli/Elfa Gemella doppie):
    // le seguenti carte avevano già i dati ma NESSUNA registrazione,
    // nonostante fossero incluse in mazzi già "completati" — stesso
    // genere di svista già trovata più volte in questa sessione per
    // Umi/Mura del Castello/Drago Toon Occhi Blu/ecc.
    // ================================================================

    // ------------------------------------------------------------------
    // 130 — Controllo Mentale / Mind Control (Magia Normale)
    // CORREZIONE di fedeltà: era stata implementata come "Brain Control"
    // (Magia diversa, reale: 800 LP, solo mostri scoperti, controllo
    // fino alla End Phase) — il nome italiano è letteralmente "Mind
    // Control", carta reale diversa: nessun costo in LP, bersaglia
    // QUALUNQUE mostro dell'avversario (anche coperto), controllo
    // PERMANENTE (ctx.takeControl(..., true), nuovo 4° parametro
    // "permanent" in duel-engine.js — non torna mai da solo a fine
    // turno), e il mostro preso non può attaccare né essere sacrificato
    // (gameState.cannotAttackUids già esistente + nuovo
    // gameState.cannotBeTributedUids per uid, consultato in actions.js
    // insieme al già esistente def.cannotBeTributed per definizione).
    // ------------------------------------------------------------------
    CardEffects.register(130, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s);
        },
        activate(ctx) {
            const index = ctx.field(ctx.opponent).findIndex((s) => s);
            if (index === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, index, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const stolen = targetSlot.card;
            const stolenName = targetSlot.isFaceDown ? 'una carta coperta' : stolen.name;
            if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex, true)) {
                gameState.cannotAttackUidsPermanent = gameState.cannotAttackUidsPermanent || new Set();
                gameState.cannotAttackUidsPermanent.add(stolen.uid);
                gameState.cannotBeTributedUids = gameState.cannotBeTributedUids || new Set();
                gameState.cannotBeTributedUids.add(stolen.uid);
                ctx.log(`🧠 Controllo Mentale prende il controllo permanente di ${stolenName}!`);
            }
        }
    });

    // ------------------------------------------------------------------
    // 136 — Richiamo degli Infestati / Call of the Haunted (Trappola
    // Continua)
    // Scegli come bersaglio 1 mostro nel Cimitero; Special Summonalo.
    // Dipendenza reciproca (targetOwner/targetIndex/targetUid, stesso
    // schema di Incantesimo Ombra id 439/Scavo Fossile id 823): se questa
    // carta lascia il Terreno, distruggi il mostro; se il mostro viene
    // distrutto, distruggi questa carta.
    // ------------------------------------------------------------------
    CardEffects.register(136, {
        continuous: true,
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster') && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.type === 'monster');
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [revived] = grave.splice(index, 1);
            ctx.specialSummon(ctx.owner, revived, slotIndex, 'attack');
            ctx.card.targetOwner = ctx.owner;
            ctx.card.targetIndex = slotIndex;
            ctx.card.targetUid = revived.uid;
            ctx.log(`⚰️ Richiamo degli Infestati Special Summona ${revived.name} dal Cimitero!`);
        },
        static(ctx) {
            if (ctx.card.targetOwner == null) return;
            const targetSlot = ctx.field(ctx.card.targetOwner)[ctx.card.targetIndex];
            const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === ctx.card.targetUid;
            if (validTarget) return;
            ctx.stField(ctx.owner)[ctx.index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
        }
    });

    // ------------------------------------------------------------------
    // 232 — Scatola delle Fate / Fairy Box (Trappola Continua)
    // Quando un mostro dell'avversario dichiara un attacco: lancia una
    // moneta; se esce Testa, l'ATK del mostro attaccante diventa 0 fino a
    // fine turno (SEMPLIFICAZIONE: "fino a fine turno" invece di "fino a
    // fine Battle Phase" — ctx.grantTemporaryAtkDefBonus, come ogni altro
    // bonus/malus temporaneo in questo file, scade solo alla End Phase).
    // Durante ciascuna propria Standby Phase: paga 500 Life Points (SEMPLIFICAZIONE:
    // paga sempre, invece di offrire la scelta "paga o distruggi questa
    // carta" — nessuna interfaccia di scelta costo esiste ancora per le
    // Trappole Continue, stesso schema automatico di Maschera del
    // Maledetto id 372). Il "risultato scelto" della moneta non ha una
    // vera scelta dell'utente dietro (nessuna UI per farla): il lancio
    // stesso rappresenta l'esito 50/50, stesso schema di Azzardo (id 255).
    // ------------------------------------------------------------------
    CardEffects.register(232, {
        continuous: true,
        activate(ctx) {
            ctx.log('🧚 Scatola delle Fate attivata: pronta a reagire al prossimo attacco avversario!');
        },
        onAttackDeclare(ctx) {
            const attackerSlot = ctx.field(ctx.attackerOwner)[ctx.attackerIndex];
            if (!attackerSlot) return;
            const guessed = Math.random() < 0.5;
            if (window.FX) FX.playCoinFlip(guessed);
            if (guessed) {
                ctx.grantTemporaryAtkDefBonus(attackerSlot.card, -DuelEngine.getEffectiveAtk(attackerSlot.card), 0, false);
                ctx.log(`🧚 Scatola delle Fate indovina il lancio! ATK di ${attackerSlot.card.name} azzerato fino a fine turno!`);
            } else {
                ctx.log('🧚 Scatola delle Fate: lancio sbagliato, nessun effetto.');
            }
        },
        onStandbyPhase(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            gameState[lpKey] -= 500;
            ctx.log(`🧚 Scatola delle Fate: ${ctx.owner === 'player' ? 'paghi' : 'il bot paga'} 500 Life Points per mantenerla in campo.`);
        }
    });

    // ------------------------------------------------------------------
    // 233 — Impatto Meteora Fatato / Fairy Meteor Crush (Equipaggiamento,
    // qualsiasi mostro)
    // Il mostro equipaggiato infligge danno da battaglia perforante
    // (gameState.piercingUidsFor, esteso apposta in duel-engine.js/
    // actions.js per questa carta).
    // ------------------------------------------------------------------
    CardEffects.register(233, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, () => true) !== -1; },
        activate(ctx) { attachEquip(ctx, findEquipTarget(ctx, () => true)); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            gameState.piercingUidsFor[ctx.owner].add(t.uid);
        }
    });

    // ------------------------------------------------------------------
    // 290 — Sorelle Lady Arpia / Harpie Lady Sisters
    // Non può essere Evocata Normalmente/Set — Special Summonabile solo
    // tramite Egoista Elegante (id 787, già implementato).
    // ------------------------------------------------------------------
    CardEffects.register(290, {
        cannotNormalSummon: true
    });

    // ------------------------------------------------------------------
    // 783 — Lady Arpia 2 / Harpie Lady 2: "il nome è sempre trattato come
    // 'Lady Arpia'" è già gestito ovunque serva tramite isHarpieLadySupport
    // (qui sopra — riconosce sia l'id 172 sia ogni nome che inizia per
    // "Lady Arpia", e "Lady Arpia 2" lo soddisfa per nome). La seconda
    // clausola, "Annulla gli effetti dei Mostri Flip che questa carta
    // distrugge in battaglia", è GIÀ soddisfatta per costruzione da una
    // regola generale del motore (vedi il commento su ON_FLIP/
    // revealsAsIfSurviving in resolveBattleDamage, actions.js, vicino a
    // "Lady Arpia 2"): un Mostro Flip distrutto nella stessa battaglia in
    // cui viene rivelato non attiva MAI il proprio effetto FLIP, per
    // qualunque attaccante — quindi nessuna registrazione dedicata serve
    // per 783 stessa (non ha bisogno di alcuna CardEffects.register).
    // ------------------------------------------------------------------

    // ------------------------------------------------------------------
    // 466 — L'Occhio della Verità / The Eye of Truth (Trappola Continua)
    // Una volta per turno, durante la Standby Phase del tuo avversario,
    // se ha una Magia in mano: guadagni 1000 Life Points
    // (onOpponentStandbyPhase, duel-engine.js/firePhaseTrigger — nuovo
    // aggancio generico, reazione dal lato OPPOSTO a chi vive la fase).
    // SEMPLIFICAZIONE: manca "l'avversario deve tenere la mano rivelata"
    // — nessun impatto pratico, il motore conosce già entrambe le mani.
    // ------------------------------------------------------------------
    CardEffects.register(466, {
        continuous: true,
        activate(ctx) {
            ctx.log("👁️ L'Occhio della Verità attivato! Il tuo avversario deve tenere la mano rivelata.");
        },
        onOpponentStandbyPhase(ctx) {
            const hasSpell = ctx.hand(ctx.standbyOwner).some((c) => c.type === 'spell');
            if (!hasSpell) return;
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            gameState[lpKey] += 1000;
            ctx.log("👁️ L'Occhio della Verità: l'avversario ha una Magia in mano, guadagni 1000 Life Points!");
        }
    });

    // ------------------------------------------------------------------
    // 493 — Behemoth a Due Teste / Twin-Headed Behemoth
    // Se distrutta e mandata al Cimitero: puoi Special Summonarla, con
    // ATK/DEF dimezzati. Una sola volta per Duello (ctx.card._twinHeadedUsed
    // persiste sulla carta stessa).
    // SEMPLIFICAZIONE: risorge SUBITO alla propria distruzione (onDestroy),
    // invece che specificamente alla End Phase dello stesso turno — questo
    // motore chiama onEndPhase solo per carte ANCORA sul Terreno/ST, mai
    // per carte già nel Cimitero, quindi il vero tempismo "End Phase" non
    // è raggiungibile per una carta che si è appena distrutta.
    // ------------------------------------------------------------------
    CardEffects.register(493, {
        onDestroy(ctx) {
            if (ctx.card._twinHeadedUsed) return;
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [revived] = grave.splice(index, 1);
            revived.attack = Math.floor((revived.attack || 0) / 2);
            revived.defense = Math.floor((revived.defense || 0) / 2);
            revived._twinHeadedUsed = true;
            ctx.specialSummon(ctx.owner, revived, slotIndex, 'attack');
            ctx.log('🐉 Behemoth a Due Teste risorge con ATK/DEF dimezzati!');
        }
    });

    // ================================================================
    // ALTRE SCOPERTE dallo stesso controllo generale (continua): carte
    // con dati reali ma senza registrazione né nota, non incluse in
    // alcun mazzo Starter/Structure ma comunque presenti nel pool
    // libero del Duello Demo.
    // ================================================================

    // ------------------------------------------------------------------
    // 89 — Amazzone Incantatrice / Amazon Archer... (Magia Normale)
    // Scambia l'ATK originale tra 1 propria Amazzone e 1 mostro scoperto
    // dell'avversario, fino a fine turno.
    // SEMPLIFICAZIONE: sceglie da sola i due bersagli (la prima Amazzone
    // e il primo mostro avversario trovati).
    // ------------------------------------------------------------------
    CardEffects.register(89, {
        canActivate(ctx) {
            const hasAmazon = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Amazzone'));
            if (!hasAmazon) return false;
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const own = ctx.field(ctx.owner).find((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Amazzone'));
            const oppIndex = ctx.field(ctx.opponent).findIndex((s) => s && !s.isFaceDown);
            if (!own || oppIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, oppIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const opp = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!opp) return;
            const ownAtk = own.card.attack, oppAtk = opp.card.attack;
            ctx.grantTemporaryAtkDefBonus(own.card, oppAtk - ownAtk, 0, false);
            ctx.grantTemporaryAtkDefBonus(opp.card, ownAtk - oppAtk, 0, false);
            ctx.log(`⚔️ Amazzone Incantatrice scambia l'ATK di ${own.card.name} e ${opp.card.name}!`);
        }
    });

    // ------------------------------------------------------------------
    // 94 — Lampada Antica / Ancient Lamp (Ignition)
    // Durante la propria Main Phase: Special Summon "La Jinn il Genio
    // Mistico della Lampada" (id 335) dalla mano.
    // ------------------------------------------------------------------
    // CORREZIONE di fedeltà: aggiunta la clausola mancante "se attaccata
    // mentre coperta, puoi ridirigere l'attacco verso un altro mostro
    // che l'avversario controlla" — onAttackDeclare come risposta del
    // bersaglio stesso (stesso schema di Suijin/Kazejin), ctx.redirectAttack
    // con newOwner esplicito (il campo di chi sta ATTACCANDO, "fuoco
    // amico" come Ragno della Roulette/id 425 risultato 4).
    CardEffects.register(94, {
        canActivate(ctx) {
            // ctx.attackerIndex esiste SOLO nel contesto reattivo di
            // onAttackDeclare (questa carta bersagliata da un attacco) —
            // a differenza del contesto del proprio effetto Ignition
            // (Special Summon La Jinn), che pure vede ctx.zone === 'monster'
            // ma senza questo campo: serve un discriminante diverso da
            // zone qui, dato che entrambi i casi condividono la stessa zona.
            if (typeof ctx.attackerIndex === 'number') {
                const slot = ctx.field(ctx.owner)[ctx.index];
                if (!slot || !slot.isFaceDown) return false;
                return ctx.field(ctx.opponent).some((s, i) => s && i !== ctx.attackerIndex);
            }
            if (gameState.phase !== 'main1' && gameState.phase !== 'main2') return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            return ctx.hand(ctx.owner).some((c) => c.id === 335) && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        onAttackDeclare(ctx) {
            const candidates = [];
            ctx.field(ctx.opponent).forEach((s, i) => { if (s && i !== ctx.attackerIndex) candidates.push(i); });
            if (candidates.length === 0) return;
            ctx.redirectAttack(candidates[0], ctx.opponent);
            ctx.log('🪔 Lampada Antica ridirige l\'attacco verso un altro mostro dell\'avversario!');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.id === 335);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = hand.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('🪔 Lampada Antica Special Summona La Jinn dalla mano!');
        }
    });

    // ------------------------------------------------------------------
    // 146 — Catena di Distruzione / Chain Destruction (Trappola Normale)
    // Quando viene Evocato un mostro con 2000 o meno ATK: distruggi tutte
    // le carte con lo stesso nome nella mano e nel Deck del suo
    // proprietario. Riusa onOpponentSummon (stesso schema di Buco
    // Trappola id 40) — vedi missingEffectNote implicita: risponde solo
    // a un'Evocazione dell'AVVERSARIO, non a qualunque Evocazione.
    // ------------------------------------------------------------------
    CardEffects.register(146, {
        canActivate(ctx) {
            return (ctx.summonedCard?.attack || 0) <= 2000;
        },
        onOpponentSummon(ctx) {
            const name = ctx.summonedCard.name;
            let count = 0;
            const hand = ctx.hand(ctx.opponent);
            for (let i = hand.length - 1; i >= 0; i--) {
                if (hand[i].name === name) { ctx.graveyard(ctx.opponent).push(hand.splice(i, 1)[0]); count++; }
            }
            const deckKey = ctx.opponent === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (Array.isArray(deck)) {
                for (let i = deck.length - 1; i >= 0; i--) {
                    if (deck[i].name === name) { ctx.graveyard(ctx.opponent).push(deck.splice(i, 1)[0]); count++; }
                }
                gameState[ctx.opponent === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            }
            ctx.log(`⛓️ Catena di Distruzione manda ${count} copie di ${name} al Cimitero!`);
        }
    });

    // ------------------------------------------------------------------
    // 152 — Prescelto / The Selected (Magia Normale)
    // Scegli 1 Mostro e 2 carte non-Mostro dalla mano; l'avversario ne
    // sceglie 1 a caso. Se Mostro: Special Summonalo e manda le altre 2
    // al Cimitero. Altrimenti: manda tutte e 3 al Cimitero.
    // SEMPLIFICAZIONE: la "scelta a caso dell'avversario" è simulata
    // scegliendo davvero a caso tra le 3 carte.
    // ------------------------------------------------------------------
    CardEffects.register(152, {
        canActivate(ctx) {
            const hand = ctx.hand(ctx.owner);
            return hand.some((c) => c.type === 'monster') && hand.filter((c) => c.type !== 'monster').length >= 2;
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const monsterIdx = hand.findIndex((c) => c.type === 'monster');
            if (monsterIdx === -1) return;
            const monster = hand[monsterIdx];
            const others = hand.filter((c) => c.type !== 'monster').slice(0, 2);
            if (others.length < 2) return;
            const chosen = [monster, ...others];
            [monsterIdx, hand.indexOf(others[0]), hand.indexOf(others[1])].sort((a, b) => b - a).forEach((i) => hand.splice(i, 1));
            const pick = chosen[Math.floor(Math.random() * chosen.length)];
            if (pick.type === 'monster') {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                chosen.forEach((c) => { if (c !== pick) ctx.graveyard(ctx.owner).push(c); });
                if (slotIndex !== -1) ctx.specialSummon(ctx.owner, pick, slotIndex, 'attack');
                else ctx.graveyard(ctx.owner).push(pick);
                ctx.log(`🎲 Prescelto: l'avversario sceglie il Mostro! ${pick.name} viene Special Summonato.`);
            } else {
                chosen.forEach((c) => ctx.graveyard(ctx.owner).push(c));
                ctx.log("🎲 Prescelto: l'avversario sceglie male, tutte e 3 le carte finiscono al Cimitero.");
            }
        }
    });

    // ------------------------------------------------------------------
    // 196 — Des Volstgalph
    // Se distrugge un mostro dell'avversario in battaglia (damageOnBattleDestroy):
    // 500 danni. Ogni volta che una Magia Normale o Rapida si risolve:
    // +200 ATK fino a fine turno (riusa onCardActivated).
    // ------------------------------------------------------------------
    CardEffects.register(196, {
        damageOnBattleDestroy: 500,
        canActivateOnCardActivated(ctx) {
            return ctx.activatedCard.type === 'spell' && ['normal', 'quick-play'].includes(ctx.activatedCard.subtype);
        },
        onCardActivated(ctx) {
            if (ctx.card._volstgalphTurn !== gameState.turn) {
                ctx.card._volstgalphTurn = gameState.turn;
                ctx.card._volstgalphBonus = 0;
            }
            ctx.card._volstgalphBonus += 200;
            ctx.grantTemporaryAtkDefBonus(ctx.card, ctx.card._volstgalphBonus, 0, false);
            ctx.log('🐴 Des Volstgalph guadagna 200 ATK fino a fine turno!');
        }
    });

    // ------------------------------------------------------------------
    // 198 — Drago della Dimensione Diversa / Different Dimension Dragon
    // Non può essere distrutta in battaglia da un mostro con 1900 o meno
    // ATK (riusa cardIsIndestructibleByBattle, come Guardiano Celtico
    // Sgradito id 712, ma con la condizione invertita). Vedi
    // missingEffectNote implicita: manca l'immunità dagli effetti Magia/
    // Trappola non mirati.
    // ------------------------------------------------------------------
    CardEffects.register(198, {
        cannotBeDestroyedByBattle: (opponentAtk) => (opponentAtk || 0) <= 1900
    });

    // ------------------------------------------------------------------
    // 197 — Prigione dei Dadi / Dice Jar (Magia Terreno)
    // Quando si attiva: puoi aggiungere 1 Dado Dimensionale (id 200) dal
    // Deck alla mano. All'inizio di OGNI Battle Phase (di chiunque —
    // nuovo hook 'onBattlePhaseStart', firePhaseTrigger, chiamato da
    // enterBattlePhase per entrambi i lati, game-flow.js — ed esteso
    // anche alla zona Magia Terreno, mai scansionata lì prima): ciascun
    // giocatore lancia un dado e applica il risultato a tutti i propri
    // mostri scoperti, fino a fine turno — 1: -1000 ATK, 2: +1000 ATK,
    // 3: -500 ATK, 4: +500 ATK, 5: ATK dimezzata, 6: ATK raddoppiata.
    // "Dimezzata/raddoppiata" NON richiede un nuovo moltiplicatore: il
    // delta necessario per farlo si calcola UNA VOLTA sull'ATK effettivo
    // attuale e si applica come normale bonus temporaneo
    // (grantTemporaryAtkDefBonus, già esistente) — identico risultato,
    // nessuna nuova infrastruttura di moltiplicazione.
    // ================================================================
    CardEffects.register(197, {
        activate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.id === 200);
            if (index === -1) return;
            const [card] = deck.splice(index, 1);
            gameState[countKey] = deck.length;
            ctx.hand(ctx.owner).push(card);
            ctx.log('🎲 Prigione dei Dadi aggiunge Dado Dimensionale dal Deck alla mano!');
        },
        onBattlePhaseStart(ctx) {
            ['player', 'bot'].forEach((owner) => {
                const roll = 1 + Math.floor(Math.random() * 6);
                if (window.FX) FX.playDiceRoll(roll);
                ctx.log(`🎲 Prigione dei Dadi: ${owner === 'player' ? 'tu tiri' : 'il bot tira'} un ${roll}!`);
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const currentAtk = DuelEngine.getEffectiveAtk(slot.card);
                    let delta = 0;
                    if (roll === 1) delta = -1000;
                    else if (roll === 2) delta = 1000;
                    else if (roll === 3) delta = -500;
                    else if (roll === 4) delta = 500;
                    else if (roll === 5) delta = -Math.floor(currentAtk / 2);
                    else if (roll === 6) delta = currentAtk;
                    if (delta !== 0) ctx.grantTemporaryAtkDefBonus(slot.card, delta, 0, false);
                });
            });
        }
    });

    /**
     * Trova il primo mostro Incantatore di Livello 7+ scoperto sul proprio
     * Terreno — bersaglio richiesto da 199 (Movimento d'Onda Diffuso) e 747
     * (Onda di Diffusione) qui sotto, entrambe varianti quasi identiche
     * dello stesso testo reale.
     */
    function findLevel7SpellcasterTarget(ctx) {
        return ctx.field(ctx.owner).findIndex((slot) => slot && !slot.isFaceDown && slot.card.race === 'Incantatore' && slot.card.level >= 7);
    }

    /**
     * Applica la parte comune di 199/747: concede al mostro bersaglio
     * abbastanza attacchi extra per colpire OGNI mostro avversario
     * attualmente in campo una volta ciascuno (slot.extraAttacksGrantedCount,
     * vedi il commento accanto a extraAttackGranted in actions.js) e
     * impedisce a ogni ALTRO proprio mostro di attaccare in questo turno
     * (gameState.cannotAttackUidsThisTurn, già usato per altre carte come
     * Obelisk il Tormentatore id 30). "Deve" attaccare (non solo "può"):
     * gameState.mustAttackTargetUidsFor[targetSlot.card.uid] = Set degli
     * uid nemici ancora da colpire — resolveAttack (actions.js) toglie il
     * bersaglio colpito da quel Set ad ogni attacco riuscito;
     * handlePhaseStepperClick (game-flow.js) blocca l'uscita dalla Battle
     * Phase finché quel Set non è vuoto E l'attaccante può ancora
     * attaccare (stesso principio del blocco "non puoi entrare in Battle
     * Phase al turno 1" già esistente lì).
     */
    function grantAttackAllEnemiesOncEach(ctx, targetIndex) {
        const targetSlot = ctx.field(ctx.owner)[targetIndex];
        const enemyUids = ctx.field(ctx.opponent).filter((s) => s).map((s) => s.card.uid);
        targetSlot.extraAttacksGrantedCount = Math.max(0, enemyUids.length - 1);
        gameState.cannotAttackUidsThisTurn = gameState.cannotAttackUidsThisTurn || new Set();
        ctx.field(ctx.owner).forEach((slot, i) => {
            if (slot && i !== targetIndex) gameState.cannotAttackUidsThisTurn.add(slot.card.uid);
        });
        gameState.mustAttackTargetUidsFor = gameState.mustAttackTargetUidsFor || {};
        gameState.mustAttackTargetUidsFor[targetSlot.card.uid] = new Set(enemyUids);
    }

    // ------------------------------------------------------------------
    // 199 — Movimento d'Onda Diffuso / Wave-Motion Cannon... in realtà
    // testo di "Diffusion Wave-Motion": se l'avversario controlla un
    // mostro, paga 1000 LP e scegli 1 tuo Incantatore di Livello 7+: DEVE
    // attaccare tutti i mostri avversari una volta ciascuno in questo
    // turno; gli altri tuoi mostri non possono attaccare. Vedi
    // grantAttackAllEnemiesOncEach qui sopra: concede sia gli attacchi
    // extra necessari sia l'obbligo vero e proprio
    // (gameState.mustAttackTargetUidsFor, verificato da
    // handlePhaseStepperClick in game-flow.js prima di lasciar uscire
    // dalla Battle Phase).
    // ------------------------------------------------------------------
    CardEffects.register(199, {
        canActivate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] < 1000) return false;
            if (!ctx.field(ctx.opponent).some((s) => s)) return false;
            return findLevel7SpellcasterTarget(ctx) !== -1;
        },
        activate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            const targetIndex = findLevel7SpellcasterTarget(ctx);
            if (targetIndex === -1) return;
            gameState[lpKey] -= 1000;
            grantAttackAllEnemiesOncEach(ctx, targetIndex);
            ctx.log(`🌊 Movimento d'Onda Diffuso: ${ctx.field(ctx.owner)[targetIndex].card.name} deve attaccare tutti i mostri avversari!`);
        }
    });

    // ------------------------------------------------------------------
    // 220 — Scuotiterra / Earthquake... (Trappola Normale)
    // Scegli 2 Attributi; l'avversario ne sceglie 1: distruggi tutti i
    // mostri scoperti con quell'Attributo.
    // SEMPLIFICAZIONE: la scelta dell'avversario è simulata a caso tra i
    // 2 Attributi con più mostri scoperti sul Terreno.
    // ------------------------------------------------------------------
    CardEffects.register(220, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown));
        },
        activate(ctx) {
            const attrCounts = {};
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((s) => { if (s && !s.isFaceDown) attrCounts[s.card.attribute] = (attrCounts[s.card.attribute] || 0) + 1; });
            });
            const attrs = Object.keys(attrCounts).sort((a, b) => attrCounts[b] - attrCounts[a]).slice(0, 2);
            if (attrs.length === 0) return;
            const chosen = attrs[Math.floor(Math.random() * attrs.length)];
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.attribute === chosen) { ctx.destroyMonster(owner, index); count++; }
                });
            });
            ctx.log(`🌍 Scuotiterra: l'avversario sceglie ${chosen}, distrutti ${count} mostri!`);
        }
    });

    // ------------------------------------------------------------------
    // 253 — Giuramento della Balena Fortezza / Fortress Whale's Oath
    // (Magia Rituale)
    // Sacrifica dal Terreno E/O dalla mano (CORREZIONE di fedeltà —
    // prima solo dal Terreno) mostri per un Livello totale di almeno 7
    // per Special Summon Balena Fortezza (id 252) dalla mano. Stesso
    // schema di Rito del Guerriero Nero (id 56).
    // ------------------------------------------------------------------
    CardEffects.register(253, {
        canActivate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 252);
            if (handIndex === -1) return false;
            return maxRitualTributeLevel(ctx, handIndex) >= 7;
        },
        activate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 252);
            if (handIndex === -1) return;
            performRitualTribute(ctx, 7, handIndex);
            const hand = ctx.hand(ctx.owner);
            const finalHandIndex = hand.findIndex((c) => c.id === 252);
            if (finalHandIndex === -1) return;
            const [ritualCard] = hand.splice(finalHandIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(ritualCard); return; }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('🐋 Giuramento della Balena Fortezza evoca Balena Fortezza!');
        }
    });

    // ------------------------------------------------------------------
    // 252 — Balena Fortezza / Fortress Whale: Evocabile Rituale solo
    // tramite "Giuramento della Balena Fortezza" (id 253, qui sopra —
    // GIÀ IMPLEMENTATA). Qui serve solo il divieto di Evocazione
    // Normale/Set e di Special Summon per ogni altra via
    // (cannotNormalSummon/cannotBeSpecialSummoned — stesso schema di 413).
    // ------------------------------------------------------------------
    CardEffects.register(252, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ------------------------------------------------------------------
    // 289 — Lady Arpia Formazione della Fenice / Harpie's Phoenix
    // Formation (Magia Normale)
    // Se controlli 3+ "Lady Arpia"/"Sorelle Lady Arpia": distruggi
    // altrettanti mostri dell'avversario, poi infliggi danno pari
    // all'ATK originale più alto tra quelli distrutti.
    // ------------------------------------------------------------------
    CardEffects.register(289, {
        canActivate(ctx) {
            const harpieCount = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && (isHarpieLadySupport(s.card) || s.card.name === 'Sorelle Lady Arpia')).length;
            if (harpieCount < 3) return false;
            return ctx.field(ctx.opponent).some((s) => s);
        },
        activate(ctx) {
            const harpieCount = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && (isHarpieLadySupport(s.card) || s.card.name === 'Sorelle Lady Arpia')).length;
            const field = ctx.field(ctx.opponent);
            let destroyed = 0, maxAtk = 0;
            for (let i = 0; i < field.length && destroyed < harpieCount; i++) {
                if (!field[i]) continue;
                maxAtk = Math.max(maxAtk, field[i].card.attack || 0);
                ctx.destroyMonster(ctx.opponent, i);
                destroyed++;
            }
            if (maxAtk > 0) ctx.dealDamage(ctx.opponent, maxAtk);
            ctx.log(`🦅 Lady Arpia Formazione della Fenice distrugge ${destroyed} mostri e infligge ${maxAtk} danni!`);
        }
    });

    // ------------------------------------------------------------------
    // 307 — Carte Infinite / Infinite Cards (Magia Continua)
    // Nessun limite al numero di carte in mano — controllato direttamente
    // in enterEndPhase() (game-flow.js), non tramite un handler qui.
    // ------------------------------------------------------------------
    CardEffects.register(307, {
        continuous: true,
        activate(ctx) {
            ctx.log('🎴 Carte Infinite attivata: nessun limite alla mano!');
        }
    });

    // ------------------------------------------------------------------
    // 308 — Congedo Infinito / Eternal Draught... (Trappola Continua)
    // I mostri di Livello 3 o inferiore vengono distrutti alla End Phase
    // del turno in cui sono stati Evocati Normalmente o tramite Flip
    // Summon (riusa slot.summonedOnTurn, già tracciato dal motore).
    // ------------------------------------------------------------------
    CardEffects.register(308, {
        continuous: true,
        activate(ctx) {
            ctx.log('🚪 Congedo Infinito attivato!');
        },
        onEndPhase(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (!slot || slot.isFaceDown) return;
                    if ((slot.card.level || 0) > 3) return;
                    if (slot.summonedOnTurn !== gameState.turn) return;
                    ctx.destroyMonster(owner, index);
                    count++;
                });
            });
            if (count > 0) ctx.log(`🚪 Congedo Infinito distrugge ${count} mostr${count === 1 ? 'o' : 'i'} appena Evocat${count === 1 ? 'o' : 'i'}!`);
        }
    });

    // ------------------------------------------------------------------
    // 351 — Piccola Guardia Alata / Little Winguard (Ignition)
    // Una volta per turno, durante la propria End Phase: cambia la
    // propria Posizione di Battaglia. Riusa selfFlipToFaceDownDefense in
    // parte — qui però cambia liberamente Attacco<->Difesa, non solo
    // verso coperto.
    // ------------------------------------------------------------------
    CardEffects.register(351, {
        canActivate(ctx) {
            return gameState.phase === 'end';
        },
        activate(ctx) {
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.position = slot.position === 'attack' ? 'defense' : 'attack';
            if (slot.position === 'attack') slot.isFaceDown = false;
            ctx.log(`🛡️ Piccola Guardia Alata cambia in Posizione di ${slot.position === 'attack' ? 'Attacco' : 'Difesa'}!`);
        }
    });

    // ------------------------------------------------------------------
    // 356 — Ninna Nanna dell'Obbedienza / Lullaby of Obedience (Magia
    // Normale)
    // Paga 2000 LP e dichiara 1 Mostro; l'avversario guarda il proprio
    // Deck, rivela 1 copia se presente, e sceglie: aggiungila alla mano
    // di chi ha attivato, oppure Special Summonala sul suo Terreno.
    // SEMPLIFICAZIONE: la "dichiarazione del nome" è simulata scegliendo
    // a caso un mostro davvero presente nel Deck dell'avversario (invece
    // di dichiarare a priori un nome che potrebbe non esserci); la
    // "scelta dell'avversario" tra i 2 effetti è simulata a caso.
    // ------------------------------------------------------------------
    CardEffects.register(356, {
        canActivate(ctx) {
            const ownLP = ctx.owner === 'player' ? gameState.playerLP : gameState.botLP;
            if (ownLP <= 2000) return false;
            const deckKey = ctx.opponent === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            return Array.isArray(deck) && deck.some((c) => c.type === 'monster');
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 2000);
            const deckKey = ctx.opponent === 'player' ? 'playerDeck' : 'botDeck';
            const deckCountKey = ctx.opponent === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            const index = deck.findIndex((c) => c.type === 'monster');
            if (index === -1) return;
            const [revealed] = deck.splice(index, 1);
            gameState[deckCountKey] = deck.length;
            if (Math.random() < 0.5) {
                ctx.hand(ctx.owner).push(revealed);
                ctx.log(`🎵 Ninna Nanna dell'Obbedienza: ${revealed.name} viene aggiunto alla mano!`);
            } else {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) { ctx.hand(ctx.owner).push(revealed); return; }
                ctx.specialSummon(ctx.owner, revealed, slotIndex, 'attack');
                ctx.log(`🎵 Ninna Nanna dell'Obbedienza Special Summona ${revealed.name}!`);
            }
        }
    });

    // ------------------------------------------------------------------
    // 379 — Meteorain (Trappola Normale)
    // In questo turno, i propri mostri infliggono danno da battaglia
    // perforante (riusa gameState.piercingUidsFor, esteso per id 233).
    // ------------------------------------------------------------------
    CardEffects.register(379, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            let count = 0;
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot && !slot.isFaceDown) { ctx.card._meteorainUids = ctx.card._meteorainUids || []; ctx.card._meteorainUids.push(slot.card.uid); count++; }
            });
            ctx.card._meteorainTurn = gameState.turn;
            ctx.log(`🌠 Meteorain concede danno perforante a ${count} propri mostri per questo turno!`);
        },
        static(ctx) {
            if (ctx.card._meteorainTurn !== gameState.turn) return;
            (ctx.card._meteorainUids || []).forEach((uid) => gameState.piercingUidsFor[ctx.owner].add(uid));
        }
    });

    // ------------------------------------------------------------------
    // 403 — Cavalletta d'Emergenza / Emergency Grasshopper... (onDestroy)
    // Quando mandata al Cimitero: Special Summon 1 mostro Tipo Insetto
    // dalla mano.
    // ------------------------------------------------------------------
    CardEffects.register(403, {
        onDestroy(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.type === 'monster' && c.race === 'Insetto');
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = hand.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🦗 Cavalletta d'Emergenza Special Summona ${card.name} dalla mano!`);
        }
    });

    // ------------------------------------------------------------------
    // 418 — Ritorno dei Dannati / Return of the Doomed... (Magia Normale)
    // Scarta 1 Mostro. Alla fine di questo turno, riporta in mano 1
    // proprio mostro distrutto in battaglia in questo turno.
    // ------------------------------------------------------------------
    CardEffects.register(418, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).some((c) => c.type === 'monster');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.type === 'monster');
            if (index === -1) return;
            const [discarded] = hand.splice(index, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            gameState._returnOfTheDoomedTurn = gameState._returnOfTheDoomedTurn || {};
            gameState._returnOfTheDoomedTurn[ctx.owner] = gameState.turn;
            ctx.log(`⚰️ Ritorno dei Dannati scarta ${discarded.name}!`);
        },
        onEndPhase(ctx) {
            if (!gameState._returnOfTheDoomedTurn || gameState._returnOfTheDoomedTurn[ctx.owner] !== gameState.turn) return;
            const grave = ctx.graveyard(ctx.owner);
            if (grave.length === 0) return;
            const card = grave.pop();
            ctx.hand(ctx.owner).push(card);
            gameState._returnOfTheDoomedTurn[ctx.owner] = null;
            ctx.log(`⚰️ Ritorno dei Dannati riporta ${card.name} in mano!`);
        }
    });

    // ------------------------------------------------------------------
    // 419 — Anello della Distruzione / Ring of Destruction (Trappola
    // Normale)
    // Durante il turno dell'avversario: distruggi 1 mostro scoperto
    // dell'avversario con ATK<=LP dell'avversario; subisci danno pari al
    // suo ATK, poi infliggi altrettanto danno all'avversario.
    // ------------------------------------------------------------------
    CardEffects.register(419, {
        canActivate(ctx) {
            const oppLP = ctx.owner === 'player' ? gameState.botLP : gameState.playerLP;
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown && (s.card.attack || 0) <= oppLP);
        },
        activate(ctx) {
            const oppLP = ctx.owner === 'player' ? gameState.botLP : gameState.playerLP;
            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((s) => s && !s.isFaceDown && (s.card.attack || 0) <= oppLP);
            if (index === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, index, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const card = targetSlot.card;
            const damage = card.attack || 0;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.dealDamage(ctx.owner, damage);
            ctx.dealDamage(ctx.opponent, damage);
            ctx.log(`💍 Anello della Distruzione distrugge ${card.name} e infligge ${damage} danni ad entrambi!`);
        }
    });

    // ------------------------------------------------------------------
    // 483 — Stregone Mascherato Toon
    // Se infligge danno da battaglia: pesca 1 carta. Vedi
    // missingEffectNote implicita per il divieto di attaccare al primo
    // turno, la dipendenza da "Mondo dei Toon" e l'attacco diretto
    // condizionato — stesso genere di limite già accettato per gli
    // attacchi diretti condizionati altrove in questo file.
    // ------------------------------------------------------------------
    CardEffects.register(483, {
        onDealsBattleDamage(ctx) {
            ctx.drawCards(ctx.owner, 1);
            ctx.log('🎭 Stregone Mascherato Toon pesca 1 carta!');
        }
    });

    // ------------------------------------------------------------------
    // 395 — Orgoth l'Implacabile
    // Effetto Ignition (una volta per turno, solo durante il proprio Main
    // Phase — l'una-volta-per-turno-per-uid è già garantita generically dal
    // motore per zone 'monster', vedi gameState.usedIgnitionThisTurn in
    // duel-engine.js/activateCard): lancia un dado a sei facce 3 volte,
    // questa carta guadagna ATK/DEF pari al totale x100 fino alla fine del
    // turno dell'avversario (gameState.atkDefBonus, revocato in changeTurn()
    // — vedi gameState.orgothActiveUidsFor in game-flow.js), poi in base a
    // quanti risultati coincidono applica l'effetto/gli effetti giusti:
    // ●1-2: indistruttibile (in battaglia e da effetto Carta) fino alla
    //   fine del turno dell'avversario — gameState.orgothIndestructibleUids,
    //   consultato da cardIsIndestructibleByBattle (actions.js) e da
    //   ACTIONS.destroyMonster (duel-engine.js).
    // ●3-4: pesca 2 carte (ctx.drawCards, immediato).
    // ●5-6: può attaccare direttamente questo turno (gameState.directAttackAllowedFor,
    //   già esistente, si azzera da solo ad ogni cambio turno — nessuna
    //   nuova durata da gestire per questa clausola).
    // Se tutti e 3 i lanci coincidono, si applicano tutte e tre le clausole
    // insieme, indipendentemente dal valore uscito (come da testo reale).
    // ------------------------------------------------------------------
    CardEffects.register(395, {
        hasDiceRollEffect: true,
        canActivate(ctx) {
            return (gameState.phase === 'main1' || gameState.phase === 'main2') && gameState.currentPlayer === ctx.owner;
        },
        activate(ctx) {
            const rollDie = () => 1 + Math.floor(Math.random() * 6);
            const rolls = [rollDie(), rollDie(), rollDie()];
            rolls.forEach((r) => { if (window.FX) FX.playDiceRoll(r); });
            ctx.log(`🎲 Orgoth l'Implacabile lancia 3 dadi: ${rolls.join(', ')}!`);

            const total = rolls[0] + rolls[1] + rolls[2];
            const amount = total * 100;
            gameState.orgothAtkDefBonus = gameState.orgothAtkDefBonus || {};
            const existing = gameState.orgothAtkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.orgothAtkDefBonus[ctx.card.uid] = { atk: existing.atk + amount, def: existing.def + amount };
            gameState.orgothActiveUidsFor = gameState.orgothActiveUidsFor || { player: new Set(), bot: new Set() };
            gameState.orgothActiveUidsFor[ctx.owner].add(ctx.card.uid);
            ctx.log(`🎲 Orgoth l'Implacabile guadagna +${amount} ATK/DEF (totale ${total}) fino alla fine del turno dell'avversario!`);

            const counts = {};
            rolls.forEach((r) => { counts[r] = (counts[r] || 0) + 1; });
            const allSame = rolls[0] === rolls[1] && rolls[1] === rolls[2];
            const pairedValue = allSame ? null : Number(Object.keys(counts).find((k) => counts[k] >= 2));

            const grantIndestructible = () => {
                gameState.orgothIndestructibleUids = gameState.orgothIndestructibleUids || new Set();
                gameState.orgothIndestructibleUids.add(ctx.card.uid);
                ctx.log("🛡️ Orgoth l'Implacabile non può essere distrutta fino alla fine del turno dell'avversario!");
            };
            const grantDraw = () => {
                ctx.drawCards(ctx.owner, 2);
                ctx.log("🃏 Orgoth l'Implacabile fa pescare 2 carte!");
            };
            const grantDirectAttack = () => {
                gameState.directAttackAllowedFor = gameState.directAttackAllowedFor || {};
                gameState.directAttackAllowedFor[ctx.card.uid] = true;
                ctx.log("⚔️ Orgoth l'Implacabile può attaccare direttamente questo turno!");
            };

            if (allSame) {
                grantIndestructible();
                grantDraw();
                grantDirectAttack();
            } else if (pairedValue === 1 || pairedValue === 2) {
                grantIndestructible();
            } else if (pairedValue === 3 || pairedValue === 4) {
                grantDraw();
            } else if (pairedValue === 5 || pairedValue === 6) {
                grantDirectAttack();
            }
        }
    });

    // ------------------------------------------------------------------
    // 858 — Drago della Forza dello Specchio
    // "Quando un mostro che controlli viene preso di mira per un attacco
    // [...] puoi distruggere tutte le carte controllate dal tuo
    // avversario." def.reactsWhenAnyOwnMonsterTargeted (nuovo opt-in in
    // findTriggerCandidates, duel-engine.js) estende la finestra di
    // risposta onAttackDeclare oltre il caso Suijin/Kazejin (SOLO se
    // quella carta stessa è il bersaglio): qui il Drago reagisce anche se
    // il bersaglio è un ALTRO proprio mostro. "Tranne durante il Damage
    // Step" non richiede alcun controllo esplicito: TRIGGER.ON_ATTACK_DECLARE
    // scatta sempre PRIMA del calcolo danni (quindi prima del Damage
    // Step), mai durante.
    // SEMPLIFICAZIONE: manca "deve essere Special Summonato con Zanna di
    // Critias, usando Forza dello Specchio" come divieto assoluto contro
    // un Fusion Summon "a mano libera" — nessuna carta di questo dataset
    // offre un percorso simile per un mostro Fusione, quindi il vincolo è
    // già di fatto rispettato (l'unico modo per farlo scendere in campo È
    // Zanna di Critias, vedi card-effects.js id 236).
    // ------------------------------------------------------------------
    // CORREZIONE di fedeltà: aggiunta la clausola "preso di mira
    // dall'effetto di una carta" — riusa lo stesso checkpoint di
    // targeting introdotto per Gran Scudo Gardna/id 115 (ctx.declareTarget,
    // duel-engine.js), esteso qui per reagire anche se il bersaglio è un
    // ALTRO proprio mostro (stesso reactsWhenAnyOwnMonsterTargeted già
    // usato per la clausola "preso di mira per un attacco" qui sotto).
    CardEffects.register(858, {
        reactsWhenAnyOwnMonsterTargeted: true,
        onAttackDeclare(ctx) {
            ctx.destroyAllCards(ctx.opponent);
            ctx.log("🐉 Drago della Forza dello Specchio distrugge tutte le carte controllate dall'avversario!");
        },
        onCardEffectTargetDeclare(ctx) {
            ctx.destroyAllCards(ctx.sourceOwner);
            ctx.log("🐉 Drago della Forza dello Specchio distrugge tutte le carte controllate dall'avversario!");
        }
    });

    // ------------------------------------------------------------------
    // 246 — Elefante Volante
    // Indistruttibilità condizionata (una volta per turno dell'avversario,
    // solo contro un suo effetto Carta) via def.preventsDestructionByOpponentEffectOncePerTurn,
    // controllata in ACTIONS.destroyMonster (duel-engine.js). Se la
    // prevenzione scatta nella End Phase dell'avversario, si arma la
    // vittoria automatica per un successivo attacco diretto andato a
    // segno (gameState.flyingElephantWinPendingUids -> onDealsBattleDamage
    // qui sotto -> gameState.flyingElephantWinnerOwner -> checkGameOver in
    // game-flow.js).
    // SEMPLIFICAZIONE: la condizione di vittoria armata non ha una
    // scadenza esplicita se il controllore non riesce ad attaccare
    // direttamente nel turno successivo (il testo reale la vorrebbe valida
    // solo per QUEL turno) — resta pendente indefinitamente finché non
    // viene consumata; nessuna carta di questo dataset sfrutta questo
    // margine.
    // ------------------------------------------------------------------
    CardEffects.register(246, {
        preventsDestructionByOpponentEffectOncePerTurn: true,
        onDealsBattleDamage(ctx) {
            if (ctx.targetIndex !== -1) return;
            if (gameState.flyingElephantWinPendingUids && gameState.flyingElephantWinPendingUids.has(ctx.card.uid)) {
                gameState.flyingElephantWinPendingUids.delete(ctx.card.uid);
                gameState.flyingElephantWinnerOwner = ctx.owner;
            }
        }
    });

    // ------------------------------------------------------------------
    // 353 — Signore dei D. (Lord of D.)
    // "Nessun giocatore può scegliere come bersaglio mostri Tipo Drago sul
    // Terreno con effetti di carta." Floodgate assoluto via
    // def.protectsRaceFromTargeting (consultato direttamente da
    // declareCardEffectTarget in duel-engine.js, PRIMA di offrire
    // qualunque risposta) — nessun activate()/canActivate necessario, è
    // una proprietà passiva della carta scoperta, come def.continuous per
    // le Magie/Trappole.
    // ------------------------------------------------------------------
    CardEffects.register(353, {
        protectsRaceFromTargeting: 'Drago'
    });

    // ------------------------------------------------------------------
    // 115 — Gran Scudo Gardna (Big Shield Gardna)
    // Clausola 1: "Se questa carta, l'unica coperta sul Terreno, viene
    // presa di mira da una Magia: gira scoperta in Posizione di Difesa e
    // nega quella Magia" — via def.onCardEffectTargetDeclare (nuovo
    // checkpoint sincrono in declareCardEffectTarget, duel-engine.js).
    // Clausola 2: "Se attaccata, a fine Damage Step passa in Posizione di
    // Attacco" — via onBattled(ctx), già esistente (si attiva quando
    // QUESTA carta sopravvive a una battaglia); nessun controllo esplicito
    // "ero il difensore" necessario, perché un mostro in Posizione di
    // Difesa non può MAI dichiarare un attacco (regola già applicata
    // altrove in questo motore), quindi se onBattled scatta mentre questa
    // carta è ancora in Difesa, per esclusione stava DIFENDENDO.
    // ------------------------------------------------------------------
    CardEffects.register(115, {
        canActivate(ctx) {
            if (ctx.zone !== 'monster') return false;
            if (ctx.sourceType !== 'spell') return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || !slot.isFaceDown) return false;
            const faceDownCount = ctx.field(ctx.owner).filter((s) => s && s.isFaceDown).length
                + ctx.stField(ctx.owner).filter((s) => s && s.isFaceDown).length;
            return faceDownCount === 1;
        },
        onCardEffectTargetDeclare(ctx) {
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (slot) {
                slot.isFaceDown = false;
                slot.position = 'defense';
            }
            ctx.cancel();
            ctx.log(`🛡️ ${ctx.card.name} si gira scoperta in Posizione di Difesa e nega la Magia!`);
        },
        onBattled(ctx) {
            const slot = ctx.field(ctx.owner).find((s) => s && s.card.uid === ctx.card.uid);
            if (slot && slot.position === 'defense') {
                slot.position = 'attack';
                ctx.log(`⚔️ ${ctx.card.name} passa in Posizione di Attacco dopo la battaglia!`);
            }
        }
    });

    // ------------------------------------------------------------------
    // 235 — Specchietto della Fata (Fairy Box / mirror-redirect)
    // "Quando il tuo avversario attiva una Magia che ha come bersaglio
    // esattamente 1 mostro sul Terreno (e nessun'altra carta): scegli un
    // altro bersaglio valido; quella Magia ora ha come bersaglio la nuova
    // carta." Trappola Set reattiva, via def.onCardEffectTargetDeclare
    // (candidati zona ST, declareCardEffectTarget in duel-engine.js).
    // SEMPLIFICAZIONE: nuovo bersaglio scelto automaticamente (priorità al
    // campo di chi ha attivato la Magia, per ridirigere un effetto
    // negativo contro sé stesso, come da uso tipico reale della carta) —
    // nessuna scelta UI, stesso schema di molti altri auto-pick in questo
    // file.
    // ------------------------------------------------------------------
    CardEffects.register(235, {
        canActivate(ctx) {
            if (ctx.zone !== 'st') return false;
            if (ctx.sourceType !== 'spell') return false;
            if (ctx.sourceOwner === ctx.owner) return false;
            return ctx.totalTargetCount === 1;
        },
        onCardEffectTargetDeclare(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (!slot || slot.isFaceDown) return;
                    if (owner === ctx.targetOwner && index === ctx.targetIndex) return;
                    candidates.push({ owner, index });
                });
            });
            if (candidates.length === 0) return;
            const preferred = candidates.find((c) => c.owner === ctx.sourceOwner) || candidates[0];
            ctx.redirect(preferred.owner, preferred.index);
            ctx.log(`🪞 ${ctx.card.name} ridirige il bersaglio della Magia!`);
        }
    });

    // ------------------------------------------------------------------
    // 738 — Mago Comando del Caos
    // "Annulla l'effetto di una Carta Mostro che ha come bersaglio questa
    // carta." Reazione automatica (carta scoperta sul Terreno), via
    // def.onCardEffectTargetDeclare — a differenza di 115/235 qui sopra,
    // reagisce a un effetto MOSTRO (ctx.sourceType === 'monster'), non a
    // una Magia.
    // ------------------------------------------------------------------
    CardEffects.register(738, {
        canActivate(ctx) {
            if (ctx.zone !== 'monster') return false;
            return ctx.sourceType === 'monster';
        },
        onCardEffectTargetDeclare(ctx) {
            ctx.cancel();
            ctx.log(`🚫 ${ctx.card.name} annulla l'effetto del mostro che la bersaglia!`);
        }
    });

    // ================================================================
    // CARTE SENZA CODICE BESPOKE — libreria per il futuro Card Maker
    // (vedi js/engine/effect-templates.js, js/data/custom-cards.js): una carta in
    // cardDatabase può dichiarare "effectTemplate"/"cloneEffectOf" invece
    // di avere un blocco CardEffects.register scritto a mano come tutti
    // quelli sopra. Scandisce cardDatabase una sola volta, qui in fondo
    // (dopo ogni registrazione bespoke di questo file, così cloneEffectOf
    // può riferirsi anche a una di quelle) — non tocca né sovrascrive MAI
    // una carta già registrata sopra.
    // ================================================================
    (function registerLibraryEffects() {
        if (typeof cardDatabase === 'undefined' || !Array.isArray(cardDatabase)) return;

        // Passata 1: "effectTemplate" — self-contenuti, nessuna dipendenza
        // da altre carte.
        cardDatabase.forEach((card) => {
            if (DuelEngine.getDefinition(card.id)) return; // già registrata: mai sovrascrivere
            if (card.effectTemplate && window.EffectTemplates) {
                const definition = EffectTemplates.build(card.effectTemplate.name, card.effectTemplate.params);
                if (definition) CardEffects.register(card.id, definition);
            }
        });

        // Passata 2: "cloneEffectOf" — ripetuta finché fa progressi, così
        // funziona anche clonare una carta che a sua volta clona
        // un'altra (limite di sicurezza: mai più passate delle carte
        // totali, per non restare bloccati su un riferimento circolare).
        let progressed = true;
        let safety = cardDatabase.length;
        while (progressed && safety-- > 0) {
            progressed = false;
            cardDatabase.forEach((card) => {
                if (card.cloneEffectOf === undefined || DuelEngine.getDefinition(card.id)) return;
                const source = DuelEngine.getDefinition(card.cloneEffectOf);
                if (source) {
                    CardEffects.register(card.id, source);
                    progressed = true;
                }
            });
        }
        cardDatabase.forEach((card) => {
            if (card.cloneEffectOf !== undefined && !DuelEngine.getDefinition(card.id)) {
                console.warn(`[card-effects] "${card.name}" (id ${card.id}): cloneEffectOf ${card.cloneEffectOf} non trovato (riferimento non valido o circolare).`);
            }
        });
    })();
})();
