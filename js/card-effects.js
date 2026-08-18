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
 * in js/duel-engine.js, che va caricato PRIMA di questo file. Qui non c'è
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
 * js/game-flow.js mostra IN AUTOMATICO un badge tondo con il numero sopra
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
 * davvero — vedi js/duel-engine.js per i dettagli. Non serve altro codice
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
 *   onOpponentSummon(ctx) — la carta può rispondere quando l'AVVERSARIO
 *                           di chi la controlla Evoca un mostro (es.
 *                           Buco Trappola).
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
    }

    /** Il mostro a cui ctx.card (una Carta Equipaggiamento) è attualmente equipaggiata — sempre valido quando static() viene chiamato (vedi recomputeStaticEffects). */
    function equippedTarget(ctx) {
        return ctx.field(ctx.card.equippedToOwner)[ctx.card.equippedToIndex].card;
    }

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

    // 175 — Scudo Cyber / Cyber Shield: +500 ATK, solo "Lady Arpia" (id 288) o "Sorelle Lady Arpia" (id 290).
    CardEffects.register(175, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.id === 288 || c.id === 290) !== -1; },
        activate(ctx) { const i = findEquipTarget(ctx, (c) => c.id === 288 || c.id === 290); if (i !== -1) attachEquip(ctx, i); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
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
            // motivo per cui resolveAttack() in js/actions.js cattura i
            // rettangoli PRIMA di mutare lo stato (vedi quel commento).
            const sucked = [];
            ['player', 'bot'].forEach((owner) => {
                const boardId = owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard';
                ctx.field(owner).forEach((slot, index) => {
                    if (!slot) return;
                    const el = document.querySelector(`#${boardId} .field-slot[data-index="${index}"] .card`);
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
            ctx.log(`✨ ${ctx.owner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${ctx.card.name}: per 3 turni i mostri avversari non possono attaccare e restano scoperti.`);
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
    // 40 — Buco Trappola (Trappola)
    // Quando l'avversario di chi la controlla Evoca Normalmente o
    // Special Summon un mostro SCOPERTO con più di 1000 ATK: lo
    // distrugge. Un mostro Set (coperto) non rivela le sue statistiche,
    // quindi Buco Trappola non può scattare su un'Evocazione coperta.
    // ================================================================
    CardEffects.register(40, {
        canActivate(ctx) {
            return ctx.summonedPosition === 'attack' && ctx.summonedCard.attack > 1000;
        },
        onOpponentSummon(ctx) {
            ctx.destroyMonster(ctx.opponent, ctx.summonedSlotIndex);
            ctx.log(`🕳️ Buco Trappola distrugge ${ctx.summonedCard.name}!`);
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
    CardEffects.register(37, {
        activate(ctx) {
            ctx.destroyAllCards(ctx.opponent);
            ctx.log(`⚡ Folgore Fulminante spazza via tutte le carte sul Terreno ${ctx.opponent === 'bot' ? 'del bot' : 'del giocatore'}!`);
        }
    });

    // ================================================================
    // 35 — Rinascita del Mostro (Magia Normale)
    // Special Summon di un mostro da un Cimitero, tuo o dell'avversario.
    //
    // SEMPLIFICAZIONE: le regole vere lasciano scegliere liberamente
    // quale mostro rianimare. Qui non esiste (ancora) una UI per
    // sfogliare il Cimitero, quindi la scelta è automatica: viene
    // rianimato il mostro con l'ATK più alto disponibile tra i due
    // Cimiteri (a parità, si preferisce il proprio). Aggiungere una
    // scelta manuale è un miglioramento naturale per il futuro.
    // ================================================================
    CardEffects.register(35, {
        canActivate(ctx) {
            return ctx.graveyard('player').some((c) => c.type === 'monster')
                || ctx.graveyard('bot').some((c) => c.type === 'monster');
        },
        activate(ctx) {
            let bestGraveyardOwner = null;
            let bestIndex = -1;
            let bestCard = null;
            [ctx.owner, ctx.opponent].forEach((graveyardOwner) => {
                ctx.graveyard(graveyardOwner).forEach((card, index) => {
                    if (card.type === 'monster' && (!bestCard || card.attack > bestCard.attack)) {
                        bestGraveyardOwner = graveyardOwner;
                        bestIndex = index;
                        bestCard = card;
                    }
                });
            });
            if (!bestCard) {
                ctx.log('⚠️ Nessun mostro nei Cimiteri da rianimare.');
                return;
            }
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.log('⚠️ Il Terreno è pieno: impossibile eseguire la Special Summon.');
                return;
            }
            ctx.graveyard(bestGraveyardOwner).splice(bestIndex, 1);
            ctx.specialSummon(ctx.owner, bestCard, slotIndex, 'attack');
            ctx.log(`🌟 Rinascita del Mostro riporta in campo ${bestCard.name}!`);
        }
    });

    // ================================================================
    // 47 — Cavaliere Missile (effetto Ignition + onEndPhase)
    // Una volta per turno, puoi farlo tornare in mano a fine turno: se lo
    // fai, in quel turno può attaccare direttamente i Life Points
    // dell'avversario. Attivala cliccando sul mostro scoperto in campo
    // (come ogni effetto Ignition): concede il permesso di attacco
    // diretto (stessa infrastruttura di Golem Meccanico, id 257) e si
    // segna per tornare in mano alla prossima End Phase.
    // ================================================================
    CardEffects.register(47, {
        activate(ctx) {
            gameState.directAttackAllowedFor = gameState.directAttackAllowedFor || {};
            gameState.directAttackAllowedFor[ctx.card.uid] = true;
            gameState.returnToHandOnEndPhase = gameState.returnToHandOnEndPhase || {};
            gameState.returnToHandOnEndPhase[ctx.card.uid] = { owner: ctx.owner };
            ctx.log('🚀 Cavaliere Missile potrà attaccare direttamente questo turno, poi tornerà in mano!');
        },
        onEndPhase(ctx) {
            if (!gameState.returnToHandOnEndPhase || !gameState.returnToHandOnEndPhase[ctx.card.uid]) return;
            delete gameState.returnToHandOnEndPhase[ctx.card.uid];
            ctx.field(ctx.owner)[ctx.slotIndex] = null;
            ctx.hand(ctx.owner).push(ctx.card);
            ctx.log('🚀 Cavaliere Missile torna in mano!');
        }
    });

    // ================================================================
    // 54 — Muro d'Illusione / Wall of Illusion (risposta quando attaccata)
    // Quando viene attaccata, prima del calcolo dei danni: puoi rimandare
    // il mostro attaccante in mano al suo proprietario (l'attacco viene
    // annullato). Usa lo stesso meccanismo di risposta di Kuriboh/Cilindro
    // Magico (onAttackDeclare), esteso per includere anche il mostro
    // scoperto preso di mira, non solo Magie/Trappole Set e la mano — vedi
    // respondWindow in duel-engine.js.
    // ================================================================
    CardEffects.register(54, {
        onAttackDeclare(ctx) {
            ctx.cancelAttack();
            const attackerField = ctx.field(ctx.attackerOwner);
            const attackerSlot = attackerField[ctx.attackerIndex];
            if (attackerSlot) {
                attackerField[ctx.attackerIndex] = null;
                ctx.hand(ctx.attackerOwner).push(attackerSlot.card);
                ctx.log(`🧱 Muro d'Illusione rimanda ${attackerSlot.card.name} in mano prima del calcolo dei danni!`);
            }
        }
    });

    // ================================================================
    // 56 — Rito del Guerriero Nero (Magia Rituale)
    // Sacrifica mostri dal tuo Terreno per un Livello totale di almeno 8,
    // poi Special Summon Guerriero Nero Supremo (id 55) dalla mano.
    // SEMPLIFICAZIONE: sceglie da sola quali mostri sacrificare (i meno
    // possibile per raggiungere il totale, partendo dai Livelli più alti),
    // invece di una selezione manuale come nell'Evocazione Tributo — nello
    // stesso spirito delle altre semplificazioni dichiarate in cima a
    // js/duel-engine.js.
    // ================================================================
    CardEffects.register(56, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 55);
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
            const handIndex = hand.findIndex((c) => c.id === 55);
            if (handIndex === -1) return; // canActivate l'ha già garantito: non dovrebbe succedere
            const [ritualCard] = hand.splice(handIndex, 1);

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
    // Finché Jinzo è scoperto sul campo, le Trappole dell'avversario di
    // chi lo controlla perdono il loro effetto (non possono attivarsi).
    // ================================================================
    CardEffects.register(17, {
        static(ctx) {
            gameState.trapsNegatedFor[ctx.opponent] = true;
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
    // 59 — Carica dell'Anima / Soul Charge (Magia Normale)
    // SEMPLIFICAZIONE: la carta vera rianima "un numero qualsiasi" di
    // mostri dal Cimitero; qui, come per Rinascita del Mostro (id 35),
    // ne rianima uno solo (il migliore per ATK disponibile), pagando
    // comunque 1000 Life Points.
    // ================================================================
    CardEffects.register(59, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster') && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            let bestIndex = -1;
            let bestCard = null;
            grave.forEach((c, i) => {
                if (c.type === 'monster' && (!bestCard || c.attack > bestCard.attack)) { bestCard = c; bestIndex = i; }
            });
            if (!bestCard) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.log('⚠️ Il Terreno è pieno: impossibile eseguire la Special Summon.'); return; }
            grave.splice(bestIndex, 1);
            ctx.specialSummon(ctx.owner, bestCard, slotIndex, 'attack');
            ctx.dealDamage(ctx.owner, 1000);
            ctx.log(`👻 Carica dell'Anima riporta in campo ${bestCard.name} e ti costa 1000 Life Points!`);
        }
    });

    // ================================================================
    // 450 — Demolizione dell'Anima / Soul Demolition (Trappola Continua)
    // Se controlli un mostro di Tipo Demone scoperto: paga 500 Life
    // Points, poi banisci una carta da ciascun Cimitero.
    // SEMPLIFICAZIONE "banish": questo motore non ha una zona Bandite a
    // sé (vedi il commento sull'origine delle carte in cards-db.js per lo
    // stesso spirito di semplificazione) — la carta sparisce e basta dal
    // Cimitero, invece di spostarsi in una zona dedicata. (Spostato qui da
    // id 60 durante la pulizia dei doppioni dell'import reale.)
    // ================================================================
    CardEffects.register(450, {
        canActivate(ctx) {
            const controlsFiend = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Demone');
            const somethingToBanish = ctx.graveyard(ctx.owner).length > 0 || ctx.graveyard(ctx.opponent).length > 0;
            return controlsFiend && somethingToBanish;
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 500);
            const oppGrave = ctx.graveyard(ctx.opponent);
            const ownGrave = ctx.graveyard(ctx.owner);
            if (oppGrave.length > 0) oppGrave.pop();
            if (ownGrave.length > 0) ownGrave.pop();
            ctx.log('💀 Demolizione dell\'Anima banisce una carta da ciascun Cimitero (paghi 500 Life Points)!');
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
            ctx.destroyMonster(ctx.opponent, bestIndex);
            ctx.log(`🔄 Scambio di Anime costringe il tuo avversario a cedere ${bestCard.name}!`);
        }
    });

    // ================================================================
    // 455 — Cancellatore di Magie / Spell Canceller (effetto CONTINUO del
    // mostro, non un'attivazione manuale — come Jinzo, id 17, ma per le
    // Magie invece delle Trappole).
    // SEMPLIFICAZIONE nota: gameState.spellsNegatedFor viene controllato
    // in duel-engine.js solo per le Magie già Set attivate dal Terreno,
    // non per quelle giocate direttamente dalla mano (il percorso
    // standard in questo motore) — effetto quindi parzialmente limitato,
    // stesso limite già presente prima della pulizia dei doppioni
    // (spostato qui da id 65).
    // ================================================================
    CardEffects.register(455, {
        static() {
            gameState.spellsNegatedFor.player = true;
            gameState.spellsNegatedFor.bot = true;
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
            const slot = field[targetIndex];
            ctx.changePosition(ctx.opponent, targetIndex, 'attack');
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
    CardEffects.register(460, {
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 1000);
            const roll = Math.floor(Math.random() * 6) + 1;
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
                    ctx.specialSummon(ctx.owner, bestCard, slotIndex, 'attack');
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
    // 23 — Insetto Divoratore / Man-Eater Bug (effetto FLIP)
    // Quando questa carta viene girata scoperta (Flip), distruggi 1
    // mostro scoperto sul Terreno.
    // SEMPLIFICAZIONE: sceglie da sola il bersaglio (il mostro scoperto
    // con l'ATK più alto tra i due Terreni, priorità all'avversario a
    // parità — mai se stesso), stesso spirito di Faglia (id 243).
    // (Spostato qui da id 49 "Insetto Divoratore Mostruoso" — stesso
    // identico effetto reale, duplicato per errore durante la creazione
    // originale del database: entrambe le carte rappresentavano "Man-Eater
    // Bug".)
    // ================================================================
    CardEffects.register(23, {
        onFlip(ctx) {
            let bestOwner = null;
            let bestIndex = -1;
            let bestCard = null;
            [ctx.opponent, ctx.owner].forEach((fieldOwner) => {
                ctx.field(fieldOwner).forEach((slot, index) => {
                    if (fieldOwner === ctx.owner && index === ctx.slotIndex) return; // mai se stesso
                    if (slot && !slot.isFaceDown && (!bestCard || slot.card.attack > bestCard.attack)) {
                        bestOwner = fieldOwner;
                        bestIndex = index;
                        bestCard = slot.card;
                    }
                });
            });
            if (!bestCard) {
                ctx.log('🐛 Insetto Divoratore Mostruoso si rivela, ma non c\'è nessun mostro scoperto da distruggere.');
                return;
            }
            ctx.destroyMonster(bestOwner, bestIndex);
            ctx.log(`🐛 Insetto Divoratore Mostruoso, girato scoperto, distrugge ${bestCard.name}!`);
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
    CardEffects.register(71, {
        onAttackDeclare(ctx) {
            ctx.zeroAttackerAtk();
            ctx.log("💧 Suijin azzera l'ATK del mostro attaccante per questo scontro!");
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
    CardEffects.register(86, {
        onDestroy(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] <= 1000) return;
            const opponentMonstersInHand = ctx.hand(ctx.opponent).filter((c) => c.type === 'monster');
            if (opponentMonstersInHand.length === 0) return;

            const pick = (card) => {
                const hand = ctx.hand(ctx.opponent);
                const index = hand.indexOf(card);
                if (index === -1) return;
                ctx.dealDamage(ctx.owner, 1000);
                hand.splice(index, 1);
                ctx.hand(ctx.owner).push(card);
                ctx.log(`⛓️ Amazzone Maestra delle Catene paga 1000 LP e prende ${card.name} dalla mano dell'avversario!`);
                if (typeof updateUI === 'function') updateUI();
            };

            if (ctx.owner === 'player' && window.DuelEngineUI) {
                DuelEngineUI.openCardListPicker(opponentMonstersInHand, {
                    title: '⛓️ Amazzone Maestra delle Catene',
                    text: "Paga 1000 Life Points e scegli 1 mostro dalla mano dell'avversario da aggiungere alla tua mano.",
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
    // applyDamage() dentro resolveBattleDamage() in js/actions.js.
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
    // 88 — Arciere delle Amazzoni (Trappola Normale)
    // Quando l'avversario dichiara un attacco, se controlli un mostro il
    // cui nome contiene "Amazzone": gira scoperti in Posizione di Attacco
    // tutti i mostri dell'avversario.
    // SEMPLIFICAZIONE: manca il -500 ATK dell'effetto reale finché resta
    // scoperti (richiederebbe leggere gameState.atkDefBonus da qualche
    // parte — vedi il commento su id 79/81 in js/cards-db.js — che oggi
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
    // Guadagna 400 ATK finché ha 1 carta o meno in mano.
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
    // js/cards-db.js sul perché.
    // ================================================================
    CardEffects.register(100, {
        onAttackDeclare(ctx) {
            ctx.destroyMonster(ctx.attackerOwner, ctx.attackerIndex);
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
            ctx.destroyMonster(ctx.opponent, ctx.summonedSlotIndex);
            ctx.log(`🕳️ Buco Trappola senza Fondo distrugge ${ctx.summonedCard.name}!`);
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
    CardEffects.register(139, {
        onSummon(ctx) {
            ctx.summonedCard.counters = (ctx.summonedCard.counters || 0) + 1;
            ctx.log('🛡️ Guardia di Carte riceve un Segnalino Guardia!');
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
    // 166 — Maledizione del Demone / Curse of Fiend (Magia Normale)
    // Scambia la Posizione (Attacco <-> Difesa) di tutti i mostri scoperti
    // sul Terreno, di entrambi i giocatori.
    // SEMPLIFICAZIONE: manca il vincolo reale "attivabile solo durante la
    // propria Standby Phase" e il "le posizioni non si possono ricambiare
    // in questo turno" — il motore non ha un modo per limitare l'attivazione
    // di una carta a una Phase specifica né per bloccare temporaneamente i
    // cambi di posizione di più mostri contemporaneamente.
    // ================================================================
    CardEffects.register(166, {
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
    CardEffects.register(195, {
        canActivate(ctx) {
            return [ctx.opponent, ctx.owner].some((owner) => ctx.stField(owner).some((slot) => slot && !slot.isFaceDown && slot.card.type === 'spell'));
        },
        activate(ctx) {
            let targetOwner = null;
            let targetIndex = -1;
            [ctx.opponent, ctx.owner].forEach((owner) => {
                if (targetIndex !== -1) return;
                const idx = ctx.stField(owner).findIndex((slot) => slot && !slot.isFaceDown && slot.card.type === 'spell');
                if (idx !== -1) { targetOwner = owner; targetIndex = idx; }
            });
            if (targetIndex === -1) return;
            const card = ctx.stField(targetOwner)[targetIndex].card;
            ctx.graveyard(targetOwner).push(card);
            ctx.stField(targetOwner)[targetIndex] = null;
            ctx.log(`✨ Rimuovi Magia distrugge ${card.name}!`);
        }
    });

    // ================================================================
    // 201 — Buco Dimensionale / Dimension Hole (Magia Normale)
    // Scegli 1 mostro sul tuo Terreno; bandiscilo fino alla tua prossima
    // Standby Phase.
    // SEMPLIFICAZIONE: sceglie da sola quale mostro bandire (il primo
    // trovato) invece di un'interfaccia di selezione dedicata.
    // ================================================================
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
            ctx.banishTemporarily(ctx.owner, banished, 'standby');
            ctx.log(`🕳️ Buco Dimensionale bandisce ${banished.name} fino alla tua prossima Standby Phase!`);
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
    // js/duel-engine.js, scatta anche su Special Summon (nessuna carta di
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
            const name = field[targetIndex].card.name;
            ctx.destroyMonster(ctx.opponent, targetIndex);
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
            ctx.specialSummon(ctx.opponent, card, slotIndex, 'attack');
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
            const hasHarpieOnField = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && (slot.card.id === 288 || slot.card.id === 172));
            if (!hasHarpieOnField) return false;
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return false;
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inHand = ctx.hand(ctx.owner).some((c) => c.id === 288 || c.id === 290);
            const inDeck = Array.isArray(deck) && deck.some((c) => c.id === 288 || c.id === 290);
            return inHand || inDeck;
        },
        activate(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.id === 288 || c.id === 290);
            let card;
            if (handIdx !== -1) {
                card = hand.splice(handIdx, 1)[0];
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = ctx.gameState[deckKey];
                if (!Array.isArray(deck)) return;
                const deckIdx = deck.findIndex((c) => c.id === 288 || c.id === 290);
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
    CardEffects.register(282, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.id === 523);
        }
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
                    ctx.graveyard(ctx.opponent).push(slot.card);
                    ctx.stField(ctx.opponent)[index] = null;
                    count++;
                }
            });
            ctx.log(`🪶 Piumino delle Arpie distrugge ${count} cart${count === 1 ? 'a' : 'e'} Magia/Trappola dell'avversario!`);
        }
    });

    // ================================================================
    // 293 — Drago da Compagnia delle Arpie / Harpie's Pet Dragon (buff continuo)
    // Guadagna 300 ATK/DEF per ogni "Lady Arpia" (id 288) sul Terreno.
    // ================================================================
    CardEffects.register(293, {
        static(ctx) {
            const count = ctx.field(ctx.owner).filter((slot) => slot && !slot.isFaceDown && slot.card.id === 288).length;
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
    // 324 — Kazejin (risposta quando attaccata, una sola volta)
    // Durante il calcolo dei danni, se questa carta viene attaccata
    // (Effetto Veloce): puoi rendere 0 l'ATK del mostro attaccante solo
    // durante questo calcolo dei danni. Puoi usare questo effetto di
    // "Kazejin" solo una volta finché è scoperta in campo — stesso
    // meccanismo di Suijin (id 71), con in più un flag sulla carta stessa
    // (card.kazejinUsed) per il vincolo "una sola volta".
    // ================================================================
    CardEffects.register(324, {
        canActivate(ctx) {
            return !ctx.card.kazejinUsed;
        },
        onAttackDeclare(ctx) {
            ctx.card.kazejinUsed = true;
            ctx.zeroAttackerAtk();
            ctx.log("🌪️ Kazejin azzera l'ATK del mostro attaccante per questo scontro (effetto usabile una sola volta finché scoperta)!");
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
                    ctx.graveyard(ctx.opponent).push(slot.card);
                    ctx.stField(ctx.opponent)[index] = null;
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
    // SEMPLIFICAZIONE: manca la clausola "non puoi condurre la tua Battle
    // Phase in questo turno" — il motore non ha un meccanismo per
    // bloccare la Battle Phase di un giocatore per il resto del turno.
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
            ctx.log(`🌫️ Makiu distrugge ${count} mostr${count === 1 ? 'o' : 'i'} con DEF <= ${bestAtk}!`);
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
    CardEffects.register(414, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 354);
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
            const handIndex = hand.findIndex((c) => c.id === 354);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);

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
    CardEffects.register(433, {
        onDestroy(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.attack <= 1500);
            if (index === -1) return;
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
                    gy.pop();
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
            const name = field[index].card.name;
            ctx.destroyMonster(ctx.opponent, index);
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
                if (grave[i].attribute === 'OSCURITÀ') { grave.splice(i, 1); removed++; }
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
    // 468 — Il Flauto per Evocare i Draghi / The Flute of Summoning
    // Dragon (Magia Normale)
    // "Signore dei D." (id 353) deve essere sul Terreno. Special Summon
    // fino a 2 mostri Tipo Drago dalla mano.
    // ================================================================
    CardEffects.register(468, {
        canActivate(ctx) {
            const hasLordOfD = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 353);
            if (!hasLordOfD) return false;
            return ctx.hand(ctx.owner).some((c) => c.race === 'Drago');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            let summoned = 0;
            for (let i = 0; i < 2; i++) {
                const handIdx = hand.findIndex((c) => c.race === 'Drago');
                if (handIdx === -1) break;
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) break;
                const [card] = hand.splice(handIdx, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                summoned++;
            }
            ctx.log(`🐉 Il Flauto per Evocare i Draghi Special Summona ${summoned} mostr${summoned === 1 ? 'o' : 'i'} Drago!`);
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
            const name = field[index].card.name;
            ctx.destroyMonster(ctx.opponent, index);
            ctx.log(`🗡️ Mille Coltelli distrugge ${name}!`);
        }
    });

    // ================================================================
    // 487 — Mondo dei Toon / Toon World (Magia Continua)
    // Attiva questa carta pagando 1000 Life Points. Alcune carte "Toon"
    // dipendono da questa per il proprio Special Summon dalla mano — vedi
    // id 484/486 qui sotto.
    // ================================================================
    CardEffects.register(487, {
        continuous: true,
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 1000);
            ctx.log(`🎨 Mondo dei Toon attivato pagando 1000 Life Points!`);
        }
    });

    // ================================================================
    // 484 — Sirena Toon / Toon Mermaid (Special Summon dalla mano)
    // Non può essere Evocata Normalmente/Set. Deve prima essere Special
    // Summonata dalla mano, mentre controlli "Mondo dei Toon" (id 487).
    // SEMPLIFICAZIONE: manca "non può attaccare il turno in cui viene
    // Special Summonata" e "paga 500 LP per dichiarare un attacco" —
    // richiederebbero un divieto d'attacco/costo per-mostro non ancora
    // generici nel motore.
    // ================================================================
    CardEffects.register(484, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.stField(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 487);
        }
    });

    // ================================================================
    // 486 — Teschio Evocato Toon / Toon Summoned Skull (Special Summon
    // dalla mano)
    // Non può essere Evocata Normalmente/Set. Deve prima essere Special
    // Summonata dalla mano sacrificando 1 mostro, mentre controlli
    // "Mondo dei Toon" (id 487).
    // SEMPLIFICAZIONE: stessa mancanza di Sirena Toon (id 484) qui sopra
    // per il divieto d'attacco/costo per attaccare; sceglie da sola quale
    // mostro sacrificare (il primo trovato) invece di un'interfaccia di
    // selezione dedicata.
    // ================================================================
    CardEffects.register(486, {
        cannotNormalSummon: true,
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
            const name = field[index].card.name;
            ctx.destroyMonster(ctx.opponent, index);
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
    // 508 — Strega della Foresta Nera / Witch of the Black Forest (onDestroy)
    // Quando questa carta viene mandata dal Terreno al Cimitero: puoi
    // aggiungere alla mano 1 mostro con 1500 o meno DEF dal Deck — stesso
    // meccanismo di Sangan (id 433), ma per DEF invece che ATK.
    // ================================================================
    CardEffects.register(508, {
        onDestroy(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster' && c.defense <= 1500);
            if (index === -1) return;
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
            if (heads) {
                ctx.log('🪙 Mago del Tempo lancia la moneta: Testa! Distrugge tutti i mostri dell\'avversario!');
                ctx.destroyAllMonsters(ctx.opponent);
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
            const heads = [1, 2, 3].filter(() => Math.random() < 0.5).length;
            if (heads >= 2) {
                ctx.log(`🪙 Drago Barile lancia 3 monete (${heads} Testa): distrugge ${target.card.name}!`);
                ctx.destroyMonster(ctx.opponent, targetIndex);
            } else {
                ctx.log(`🪙 Drago Barile lancia 3 monete (solo ${heads} Testa): l'effetto fallisce.`);
            }
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

    // 84 — Drago Spada di Alligatore / Alligator's Sword Dragon: fusione
    // di "Cucciolo di Drago" (id 27) e "Spada di Alligatore" (id 83).
    // SEMPLIFICAZIONE: manca l'attacco diretto condizionato (solo se
    // l'avversario controlla esclusivamente mostri TERRA/ACQUA/FUOCO) —
    // stesso limite di altre carte con condizioni sull'intero campo
    // avversario.
    CardEffects.register(84, {
        fusionMaterials: [27, 83]
    });

    // 102 — Drago Nero del Teschio / Black Skull Dragon: fusione di
    // "Teschio Evocato" (id 13) e "Drago Nero Occhi Rossi" (id 12).
    CardEffects.register(102, {
        fusionMaterials: [13, 12]
    });

    // 189 — Paladino Oscuro / Dark Paladin: fusione di "Mago Nero" (id 2)
    // e "Buster Blader" (id 20). SEMPLIFICAZIONE: manca sia il negare-e-
    // distruggere Magie scartando 1 carta (richiederebbe intercettare
    // OGNI attivazione Magia avversaria) sia il bonus ATK per mostro Tipo
    // Drago sul Terreno e nei Cimiteri.
    CardEffects.register(189, {
        fusionMaterials: [2, 20]
    });

    // 207 — Cavaliere Maestro dei Draghi / Dragon Master Knight: fusione
    // di "Guerriero Nero Supremo" (id 55) e "Drago Occhi Blu Definitivo"
    // — quest'ultimo è id 29 "Drago Bianco Definitivo" in questo database
    // (stessa carta reale, Blue-Eyes Ultimate Dragon). SEMPLIFICAZIONE:
    // manca il bonus ATK per mostro Tipo Drago controllato.
    CardEffects.register(207, {
        fusionMaterials: [55, 29]
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
    // SEMPLIFICAZIONE: manca l'effetto continuo (gli altri mostri sul
    // Terreno non possono cambiare Posizione né attaccare) — richiederebbe
    // un blocco globale per entrambi i giocatori non ancora presente.
    CardEffects.register(476, {
        fusionMaterials: [416, 475]
    });

    // 184 — Cavaliere della Fiamma Oscura / Dark Flare Knight: fusione di
    // "Mago Nero" (id 2) e "Spadaccino Fiammeggiante" (id 524, importata
    // apposta). SEMPLIFICAZIONE: mancano sia l'immunità al danno da
    // battaglia sia lo Special Summon di Cavaliere del Miraggio quando
    // distrutta in battaglia.
    CardEffects.register(184, {
        fusionMaterials: [2, 524]
    });

    // 408 — Cavallerizzo Rabbioso / Rabid Horseman: fusione di "Bue da
    // Battaglia" / Battle Ox (id 106, già presente) e "Cavaliere Mistico"
    // (id 389).
    CardEffects.register(408, {
        fusionMaterials: [106, 389]
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
    CardEffects.register(73, {
        fusionMaterials: [527, 528]
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
    CardEffects.register(149, {
        fusionMaterials: [532, 533]
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
    CardEffects.register(33, {
        fusionMaterials: [538, 324, 71]
    });

    // 58 — Spadaccino di Fuoco / Flame Swordsman: fusione di "Signore
    // delle Fiamme" (id 539, Flame Manipulator) e "Masaki lo Spadaccino
    // Leggendario" (id 540, Masaki the Legendary Swordsman).
    CardEffects.register(58, {
        fusionMaterials: [539, 540]
    });

    // ================================================================
    // 511/512 — Cannone Drago XY / Cannone Drago XYZ (Special Summon
    // dall'Extra Deck BANDENDO materiali, non tramite la Magia "Fusione"
    // — vedi la sezione "Special Summon dall'EXTRA DECK bandendo
    // materiali" in cima a js/duel-engine.js per come funziona). 511 si
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
            const targetName = field[targetIndex].card.name;
            ctx.destroyMonster(ctx.opponent, targetIndex);
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
})();
