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
            return ctx.graveyard('player').some((c) => c.type === 'monster')
                || ctx.graveyard('bot').some((c) => c.type === 'monster');
        },
        activate(ctx) {
            const candidates = [];
            [ctx.owner, ctx.opponent].forEach((graveyardOwner) => {
                ctx.graveyard(graveyardOwner).forEach((card) => {
                    if (card.type === 'monster') candidates.push({ graveyardOwner, card });
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
    // openTriggerWindow in duel-engine.js.
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
    // js/engine/duel-engine.js.
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
            ctx.specialSummon(ctx.owner, bestCard, slotIndex, 'attack', 'graveyard');
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
    // js/data/cards-db.js sul perché.
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
    // SEMPLIFICAZIONE: manca l'effetto continuo (gli altri mostri sul
    // Terreno non possono cambiare Posizione né attaccare) — richiederebbe
    // un blocco globale per entrambi i giocatori non ancora presente.
    CardEffects.register(476, {
        fusionMaterials: [416, 475]
    });

    // 184 — Cavaliere della Fiamma Oscura / Dark Flare Knight: fusione di
    // "Mago Nero" (id 2) e "Spadaccino di Fuoco" / Flame Swordsman (id 58
    // — CORREZIONE: puntava al vecchio id 524, duplicato di questa stessa
    // carta, eliminato). SEMPLIFICAZIONE: mancano sia l'immunità al danno
    // da battaglia sia lo Special Summon di Cavaliere del Miraggio quando
    // distrutta in battaglia.
    CardEffects.register(184, {
        fusionMaterials: [2, 58]
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
    // Leggendario" (id 369, Masaki the Legendary Swordsman — CORREZIONE:
    // puntava al vecchio id 540, duplicato di id 369, eliminato).
    // Se questa carta distrugge in battaglia un mostro dell'avversario:
    // infliggi 500 danni al tuo avversario (damageOnBattleDestroy, letto
    // da applyBattleDestroyBonus in actions.js).
    // SCOPERTA: questa carta esisteva anche come voce duplicata separata
    // (ex id 524, "Spadaccino Fiammeggiante") che aveva il testo
    // dell'effetto reale ma non era collegata all'Extra Deck né aveva una
    // registrazione propria — unificate qui, sul id corretto già in uso
    // come materiale di Fusione per altre carte (es. id 184).
    CardEffects.register(58, {
        fusionMaterials: [539, 369],
        damageOnBattleDestroy: 500
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
            const stolen = ctx.field(ctx.opponent)[index].card;
            if (ctx.takeControl(ctx.owner, ctx.opponent, index)) {
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
                    const name = slot.card.name;
                    if (ctx.takeControl(ctx.owner, ctx.opponent, i)) {
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
            const ownIndex = ctx.field(ctx.owner).findIndex((s) => s);
            if (ownIndex !== -1) {
                const target = ctx.field(ctx.opponent)[oppIndex];
                const name = target.card.name;
                ctx.destroyMonster(ctx.owner, ownIndex);
                if (ctx.takeControl(ctx.owner, ctx.opponent, oppIndex)) {
                    ctx.log(`💫 Preso il controllo di ${name}!`);
                }
            } else {
                const target = ctx.field(ctx.opponent)[oppIndex];
                const newPosition = target.position === 'attack' ? 'defense' : 'attack';
                ctx.changePosition(ctx.opponent, oppIndex, newPosition);
                ctx.log(`🔄 ${target.card.name} cambia Posizione!`);
            }
        }
    });

    // 388 — Scatola Mistica: distruggi 1 mostro avversario, poi dai il
    // controllo di 1 tuo mostro all'avversario fino alla SUA End Phase
    // (percorso "inverso" di ctx.takeControl rispetto alle altre carte qui
    // sopra — stesso identico helper, owner/fromOwner invertiti).
    CardEffects.register(388, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s) && ctx.field(ctx.owner).some((s) => s);
        },
        activate(ctx) {
            const oppIndex = ctx.field(ctx.opponent).findIndex((s) => s);
            if (oppIndex !== -1) ctx.destroyMonster(ctx.opponent, oppIndex);
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
        activate(ctx) {
            const roll = 1 + Math.floor(Math.random() * 6);
            const amount = roll * 100;
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
    CardEffects.register(242, {
        onFlip(ctx) {
            const hand = ctx.hand(ctx.owner);
            const discardCount = Math.min(2, hand.length);
            for (let i = 0; i < discardCount; i++) {
                const randIndex = Math.floor(Math.random() * hand.length);
                const [discarded] = hand.splice(randIndex, 1);
                ctx.graveyard(ctx.owner).push(discarded);
            }
            ctx.dealDamage(ctx.opponent, 800);
            ctx.log(`🔥 Stregone di Fuoco scarta ${discardCount} carte a caso e infligge 800 danni!`);
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
        activate(ctx) {
            const roll = 1 + Math.floor(Math.random() * 6);
            const amount = roll * 100;
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
    CardEffects.register(533, {
        onSummon(ctx) { ctx.searchDeckToHand(ctx.owner, (c) => c.id === 532, 1); },
        onSpecialSummon(ctx) { ctx.searchDeckToHand(ctx.owner, (c) => c.id === 532, 1); }
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
            const destroyed = ctx.field(targetOwner)[targetIndex].card;
            ctx.destroyMonster(targetOwner, targetIndex);
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
    // quel mostro viene bandito (== rimosso senza andare da nessun'altra
    // parte, stessa SEMPLIFICAZIONE "banish" già usata per le Evocazioni
    // Fusione-bandendo in duel-engine.js: nessuna zona Banditi dedicata).
    // Se sbaglia, torna in campo Special Summonato.
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
            if (guessedRight) {
                ctx.log(`❓ Il tuo avversario indovina: ${target.name} viene bandito dal Cimitero!`);
            } else {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) {
                    ctx.log(`⚠️ Il tuo avversario sbaglia, ma il Terreno è pieno: ${target.name} resta bandito.`);
                    return;
                }
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
            const tributeName = ctx.field(ctx.owner)[tributeIndex].card.name;
            ctx.destroyMonster(ctx.owner, tributeIndex);
            ctx.destroyMonster(ctx.opponent, ctx.summonedSlotIndex);
            ctx.log(`📯 Corno del Paradiso sacrifica ${tributeName} per annullare e distruggere ${ctx.summonedCard.name}, appena Evocato!`);
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
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            const cost = Math.ceil(ctx.gameState[lpKey] / 2);
            ctx.dealDamage(ctx.owner, cost);
            ctx.destroyMonster(ctx.opponent, ctx.summonedSlotIndex);
            ctx.log(`⚖️ Giudizio Solenne paga ${cost} Life Points per annullare e distruggere ${ctx.summonedCard.name}, appena Evocato!`);
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
            if (bestOppIdx !== -1) ctx.destroyMonster(ctx.opponent, bestOppIdx);
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
            ctx.field(ctx.owner)[ctx.slotIndex] = null;
            ctx.hand(ctx.owner).push(ctx.card);
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
            const hand = ctx.hand(ctx.opponent);
            if (hand.length === 0) return;
            const idx = Math.floor(Math.random() * hand.length);
            const discarded = hand.splice(idx, 1)[0];
            ctx.graveyard(ctx.opponent).push(discarded);
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
    // SEMPLIFICAZIONE: come per id 484/486, manca il divieto di attaccare
    // nel turno di Special Summon e il costo di 500 LP per attaccare.
    // ================================================================
    CardEffects.register(123, {
        cannotNormalSummon: true,
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
        }
    });

    // ================================================================
    // 606 — Manga Ryu-Ran (Toon) — identico schema di Drago Toon Occhi
    // Blu (id 123) qui sopra: Special Summon dalla mano sacrificando 2
    // mostri, mentre si controlla "Mondo dei Toon" (id 487).
    // SEMPLIFICAZIONE: stessa di id 123/484/486 (manca il divieto
    // d'attacco/costo per attaccare, e "se Mondo dei Toon viene distrutto,
    // distruggi anche questa carta" — quest'ultimo richiederebbe un
    // meccanismo generico di dipendenza-carta non ancora presente per i
    // mostri Toon esistenti).
    // ================================================================
    CardEffects.register(606, {
        cannotNormalSummon: true,
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
    // Scegli come bersaglio fino a 5 carte in uno o più Cimiteri; bandiscile.
    // SEMPLIFICAZIONE "banish": come Demolizione dell'Anima (id 450), le
    // carte spariscono e basta dal Cimitero (questo motore non ha una
    // zona Bandite a sé); sceglie da sola le carte più vecchie di
    // entrambi i Cimiteri invece di un'interfaccia di selezione multipla.
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
                    grave.shift();
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
            const oppHand = ctx.hand(ctx.opponent);
            if (oppHand.length === 0) return;
            const index = Math.floor(Math.random() * oppHand.length);
            const [discarded] = oppHand.splice(index, 1);
            ctx.graveyard(ctx.opponent).push(discarded);
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
    // "Quando il tuo avversario attiva 'Turbina delle Arpie': annulla il
    // suo effetto e distruggi tutte le Magie/Trappole dell'avversario."
    // NESSUNA registrazione: "Turbina delle Arpie" (Harpie's Feather
    // Duster) non è presente in questo database, quindi la condizione di
    // attivazione non può mai verificarsi — stesso genere di rinvio
    // onesto già fatto per Trappola Fasulla (id 600) e Signore dei D.
    // (id 353). Vedi missingEffectNote su id 612 in cards.json.
    // ================================================================

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
    CardEffects.register(622, {
        onAttackDeclare(ctx) {
            const field = ctx.field(ctx.owner);
            const newIndex = field.findIndex((s, i) => s && i !== ctx.targetIndex);
            if (newIndex === -1) return;
            ctx.redirectAttack(newIndex);
            ctx.log(`🔀 Spostamento ridirige l'attacco verso ${field[newIndex].card.name}!`);
        }
    });

    // ================================================================
    // 623 — Sparizione / Disappear (Trappola Normale)
    // Bandisci 1 carta dal Cimitero dell'avversario. SEMPLIFICAZIONE
    // "banish" come Demolizione dell'Anima (id 450)/Liberazione
    // dell'Anima (id 609): la carta sparisce e basta, nessuna zona
    // Bandite a sé. Sceglie da sola la più vecchia.
    // ================================================================
    CardEffects.register(623, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.opponent).length > 0;
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.opponent);
            const [card] = grave.splice(0, 1);
            if (!card) return;
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
                const name = ctx.field(ctx.opponent)[oppMonsterIndex].card.name;
                ctx.destroyMonster(ctx.opponent, oppMonsterIndex);
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
    // se lo fai, bandiscilo. Vedi missingEffectNote su id 632 in
    // cards.json per la parte "bandisci tutte le copie dal Deck" mancante.
    // SEMPLIFICAZIONE "banish": la carta sparisce e basta (stesso spirito
    // di Demolizione dell'Anima/Liberazione dell'Anima/Sparizione).
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
            ctx.field(choice.owner)[choice.index] = null;
            ctx.log(`⚔️ Nobile del Depistaggio distrugge e bandisce ${card.name}!`);
        }
    });

    // ================================================================
    // 633 — Sepoltura Prematura / Premature Burial (Equipaggiamento)
    // Paga 800 Life Points, poi Special Summon 1 mostro dal proprio
    // Cimitero in Posizione di Attacco, equipaggiato con questa carta.
    // Nessun bonus ATK/DEF (a differenza delle altre Carte
    // Equipaggiamento di questo file) — vedi missingEffectNote su id 633
    // in cards.json per la direzione di dipendenza equip→bersaglio
    // mancante ("se questa carta viene distrutta, distruggi il mostro").
    // La direzione STANDARD (se il bersaglio sparisce, questa carta si
    // stacca) resta comunque garantita da equippedTarget()/static() come
    // per le altre Equip.
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
        }
    });

    // ================================================================
    // 635 — Vaso dell'Ingordigia / Jar of Greed (Trappola Normale)
    // Pesca 1 carta.
    // ================================================================
    CardEffects.register(635, {
        activate(ctx) {
            ctx.drawCards(ctx.owner, 1);
            ctx.log("🏺 Vaso dell'Ingordigia pesca 1 carta!");
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
    // Tutti i mostri scoperti sul proprio Terreno diventano Tipo Drago.
    // Vedi missingEffectNote su id 637 in cards.json: applicato una sola
    // volta (snapshot dei mostri già scoperti al momento dell'attivazione,
    // niente ripristino automatico alla End Phase).
    // ================================================================
    CardEffects.register(637, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            let count = 0;
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot && !slot.isFaceDown) { slot.card.race = 'Drago'; count++; }
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
            const name = field[targetIndex].card.name;
            ctx.destroyMonster(ctx.opponent, targetIndex);
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
    // Attributo FUOCO: guadagna 500 ATK. Vedi missingEffectNote su
    // id 643 in cards.json per la clausola VENTO (attacco extra) non
    // implementata.
    // ================================================================
    CardEffects.register(643, {
        static(ctx) {
            const hasFire = ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown && s.card.attribute === 'FUOCO'));
            if (!hasFire) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + 500, def: e.def };
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
    CardEffects.register(645, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const index = ctx.field(ctx.opponent).findIndex((s) => s && !s.isFaceDown);
            if (index === -1) return;
            const stolen = ctx.field(ctx.opponent)[index].card;
            if (ctx.takeControl(ctx.owner, ctx.opponent, index)) {
                ctx.log(`🦹 Furto Improvviso prende il controllo di ${stolen.name} fino alla End Phase!`);
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
            field[index] = null; // bandita, non al Cimitero
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
    // Magico Bianco (id 591)/Goblin Ladro (id 610). Vedi missingEffectNote
    // su id 658 in cards.json per la clausola di rinascita mancante.
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
            field[index] = null;
            ctx.hand(ctx.owner).push(ctx.card);
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
    CardEffects.register(661, {
        cannotBeDestroyedByBattle: true,
        onDealsBattleDamage(ctx) {
            if (ctx.targetIndex !== -1) return;
            const oppHand = ctx.hand(ctx.opponent);
            if (oppHand.length === 0) return;
            const index = Math.floor(Math.random() * oppHand.length);
            const [discarded] = oppHand.splice(index, 1);
            ctx.graveyard(ctx.opponent).push(discarded);
            ctx.log(`💀 Mietitore Spirituale forza l'avversario a scartare ${discarded.name}!`);
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
            if (oppGrave.length > 0) banishedName = oppGrave.shift().name;
            ctx.log(`📖 Libro della Vita Special Summona ${revived.name}${banishedName ? ` e bandisce ${banishedName}` : ''}!`);
        }
    });

    // ================================================================
    // 670 — Richiamo della Mummia / Call of the Mummy (Magia Continua)
    // Vedi missingEffectNote su id 670 in cards.json: l'abilità
    // ripetibile "una volta per turno, Special Summon 1 Zombie dalla
    // mano" non è implementata — stesso genere di limite già accettato
    // per Offerta Suprema (id 559), che ha lo stesso identico bisogno di
    // un'abilità riusabile più volte a turno da una carta Continua già
    // sul Terreno.
    // ================================================================
    CardEffects.register(670, {
        continuous: true,
        activate(ctx) {
            ctx.log('⚱️ Richiamo della Mummia è ora sul Terreno!');
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
    // SEMPLIFICAZIONE "banish": le carte spariscono e basta dal
    // Cimitero, invece di una zona Bandite a sé.
    // ================================================================
    CardEffects.register(672, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            const grave = ctx.graveyard(ctx.owner);
            let banished = 0;
            for (let i = grave.length - 1; i >= 0 && banished < 5; i--) {
                if (grave[i].type === 'monster' && grave[i].attribute === 'FUOCO') {
                    grave.splice(i, 1);
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
            grave.splice(index, 1); // bandito, non torna al Cimitero
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
    CardEffects.register(681, {
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
            const oppHand = ctx.hand(ctx.opponent);
            if (oppHand.length === 0) return;
            const index = Math.floor(Math.random() * oppHand.length);
            const [discarded] = oppHand.splice(index, 1);
            ctx.graveyard(ctx.opponent).push(discarded);
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
    // Special Summon dal Cimitero. Vedi missingEffectNote su id 684 in
    // cards.json per il divieto di sacrificio non implementato.
    // ================================================================
    CardEffects.register(684, {
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
            ctx.drawCards(ctx.owner, 1);
            ctx.log('📿 Collana del Comando va al Cimitero e pesca 1 carta!');
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
                if (grave[i].type === 'monster' && grave[i].attribute === 'ACQUA') { grave.splice(i, 1); banished++; }
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
    // 701 — Cavaliere Sirena / Mermaid Knight (canAttackTwice — vedi
    // spiegazione al commento "Secondo attacco nella stessa Battle
    // Phase" in actions.js). Vedi missingEffectNote su id 701 in
    // cards.json: sempre attivo, non condizionato a "Umi" scoperta.
    // ================================================================
    CardEffects.register(701, {
        canAttackTwice: true
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
            ctx.destroyMonster(best.owner, best.index);
            ctx.log(`🔨 Colpo di Martello distrugge ${best.card.name}!`);
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
    // Quando Evocata Normalmente: equipaggia 1 Carta Equipaggiamento dal
    // Cimitero a un mostro Tipo Guerriero che si controlla. Vedi
    // missingEffectNote su id 709 in cards.json per la semplificazione
    // "solo 1 invece di quante più possibili".
    // ================================================================
    CardEffects.register(709, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            const grave = ctx.graveyard(ctx.owner);
            const equipIndex = grave.findIndex((c) => c.type === 'spell' && c.subtype === 'equip');
            if (equipIndex === -1) return;
            const targetIndex = ctx.field(ctx.owner).findIndex((s) => s && !s.isFaceDown && s.card.race === 'Guerriero');
            if (targetIndex === -1) return;
            const freeSlot = ctx.stField(ctx.owner).findIndex((s) => s === null);
            if (freeSlot === -1) return;
            const [equip] = grave.splice(equipIndex, 1);
            const target = ctx.field(ctx.owner)[targetIndex].card;
            equip.equippedToOwner = ctx.owner;
            equip.equippedToIndex = targetIndex;
            equip.equippedToUid = target.uid;
            ctx.stField(ctx.owner)[freeSlot] = { card: equip, isFaceDown: false, setOnTurn: gameState.turn };
            ctx.log(`⚔️ Gilford la Leggenda equipaggia ${equip.name} a ${target.name}!`);
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
    // Tutti i mostri Tipo Guerriero che si controllano: +400 ATK. Vedi
    // missingEffectNote su id 713 in cards.json per l'immunità dagli
    // attacchi non implementata.
    // ================================================================
    CardEffects.register(713, {
        static(ctx) {
            ctx.field(ctx.owner).forEach((slot) => {
                if (!slot || slot.isFaceDown || slot.card.race !== 'Guerriero') return;
                const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 400, def: e.def };
            });
        }
    });

    // ================================================================
    // 714 — Capitano Predone / Marauding Captain
    // Quando Evocata Normalmente: puoi Special Summonare 1 mostro di
    // Livello 4 o inferiore dalla mano. Vedi missingEffectNote su id 714
    // in cards.json per il divieto di targeting non implementato.
    // SEMPLIFICAZIONE: sceglie da sola il primo mostro Livello 4 o
    // inferiore trovato in mano.
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
    // 717 — Mataza il Fulminatore / Mataza the Zapper (canAttackTwice —
    // vedi Cavaliere Sirena id 701). Vedi missingEffectNote su id 717 in
    // cards.json per l'immunità al cambio controllo non implementata.
    // ================================================================
    CardEffects.register(717, {
        canAttackTwice: true
    });

    // ================================================================
    // 718 — Spadaccino Mistico LV2 / Mystic Swordsman LV2
    // Se infligge danno da battaglia in questo turno (SEMPLIFICAZIONE
    // per "ha distrutto un mostro", onDealsBattleDamage): alla End Phase
    // si manda al Cimitero e Special Summona Spadaccino Mistico LV4
    // (id 719) da mano o Deck.
    // SEMPLIFICAZIONE: manca "distrugge un mostro coperto in Difesa
    // all'inizio del Damage Step" (nessuna carta avversaria di prova in
    // questo dataset lo rende visibile).
    // ================================================================
    CardEffects.register(718, {
        onDealsBattleDamage(ctx) {
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
    // 722 — Spada Divina - Lama della Fenice / Divine Sword - Phoenix
    // Blade (Equipaggiamento, solo Guerriero)
    // +300 ATK. Vedi missingEffectNote su id 722 in cards.json per il
    // recupero dal Cimitero non implementato.
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
    // +800 ATK. Vedi missingEffectNote su id 726 in cards.json per
    // l'immunità dagli effetti non implementata.
    // ================================================================
    CardEffects.register(726, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Guerriero') !== -1; },
        activate(ctx) { attachEquip(ctx, findEquipTarget(ctx, (c) => c.race === 'Guerriero')); },
        isEquip: true,
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
    // sul Terreno (anche dell'avversario); +500 ATK. Vedi
    // missingEffectNote su id 727 in cards.json per l'annullamento
    // effetti non implementato.
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
            ctx.log(`🌸 Fata della Primavera recupera ${card.name} dal Cimitero!`);
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
    // Equipaggia a 1 mostro scoperto che si controlla; +500 ATK. Vedi
    // missingEffectNote su id 732 in cards.json per la distruzione
    // reattiva non implementata.
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
    // per Segnalino. Vedi missingEffectNote su id 734 in cards.json per
    // la rimozione a fine Battle Phase non implementata.
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
    CardEffects.register(737, {
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
            field[index] = null;
            ctx.hand(ctx.owner).push(ctx.card);
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
            grave.splice(lightIdx, 1);
            const darkIdx = grave.findIndex((c) => c.type === 'monster' && c.attribute === 'OSCURITÀ');
            if (darkIdx === -1) return false;
            grave.splice(darkIdx, 1);
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
    // 745 — Esplosione Magica / Magical Blast (Magia Normale)
    // 200 danni all'avversario per ogni mostro Tipo Incantatore che
    // controlli.
    // ================================================================
    CardEffects.register(745, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.race === 'Incantatore');
        },
        activate(ctx) {
            const count = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && s.card.race === 'Incantatore').length;
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
                ctx.graveyard(ctx.opponent).push(slot.card);
                ctx.stField(ctx.opponent)[index] = null;
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
    // Criosfinge id 761). Ogni volta che un mostro TERRA viene Evocato
    // mentre questa carta resta scoperta: 1000 danni. Vedi
    // missingEffectNote su id 753 in cards.json per la semplificazione
    // "qualsiasi Evocazione" invece di solo Flip Summon.
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
        onAnyNormalOrFlipSummon(ctx) {
            if (ctx.summonedCard.attribute !== 'TERRA') return;
            ctx.dealDamage(ctx.opponent, 1000);
            ctx.log('🗿 Exxod infligge 1000 danni per un\'Evocazione TERRA!');
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
    // ================================================================
    CardEffects.register(755, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            ctx.card._returnToHandTurn = gameState.turn;
        },
        onFlip(ctx) {
            ctx.card._returnToHandTurn = gameState.turn;
        },
        onEndPhase(ctx) {
            if (ctx.card._returnToHandTurn !== gameState.turn) return;
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && slot.card.uid === ctx.card.uid);
            if (index === -1) return;
            field[index] = null;
            ctx.hand(ctx.owner).push(ctx.card);
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
            grave.splice(index, 1);
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
                if (grave[i].type === 'monster' && grave[i].race === 'Roccia') { grave.splice(i, 1); banished++; }
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
            const card = field[fallbackIndex].card;
            ctx.destroyMonster(ctx.opponent, fallbackIndex);
            ctx.log(`🐍 Verme Medusa distrugge ${card.name}!`);
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
    // Rimescola l'intera mano nel Deck e pesca lo stesso numero di
    // carte. Vedi missingEffectNote su id 768 in cards.json per la
    // semplificazione "sempre tutta la mano" invece di una scelta.
    // Stesso codice di Ricarica (id 649).
    // ================================================================
    CardEffects.register(768, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).length > 0;
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
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
                    field[ctx.attackerIndex] = null;
                    ctx.hand(ctx.opponent).push(attackerCard);
                    ctx.log(`🎲 Prova del Viandante: l'avversario sbaglia e ${attackerCard.name} torna in mano!`);
                }
            } else {
                ctx.log("🎲 Prova del Viandante: l'avversario indovina, l'attacco prosegue.");
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
    // 776 — Guerriero di Ardesia / Slate Warrior (effetto FLIP)
    // FLIP: guadagna 500 ATK/DEF in modo permanente. Vedi
    // missingEffectNote su id 776 in cards.json per la penalità
    // all'attaccante non implementata.
    // ================================================================
    CardEffects.register(776, {
        onFlip(ctx) {
            ctx.card.attack = (ctx.card.attack || 0) + 500;
            ctx.card.defense = (ctx.card.defense || 0) + 500;
            ctx.log('🗿 Guerriero di Ardesia guadagna 500 ATK/DEF!');
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
            const index = deck.findIndex((c) => c.name && c.name.includes('Lady Arpia'));
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
            grave.splice(index, 1);
            ctx.log('🌪️ Silpheed bandisce 1 mostro VENTO per essere Special Summonata!');
            return true;
        },
        onDestroy(ctx) {
            const oppHand = ctx.hand(ctx.opponent);
            if (oppHand.length === 0) return;
            const index = Math.floor(Math.random() * oppHand.length);
            const [discarded] = oppHand.splice(index, 1);
            ctx.graveyard(ctx.opponent).push(discarded);
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
                ctx.graveyard(ctx.opponent).push(card);
                ctx.stField(ctx.opponent)[stIndex] = null;
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
            const hasHarpieLady = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Lady Arpia'));
            if (!hasHarpieLady) return false;
            return ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.name && (c.name.includes('Lady Arpia') || c.name === 'Sorelle Lady Arpia'));
            if (handIdx !== -1) {
                const [card] = hand.splice(handIdx, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                ctx.log(`🦅 Egoista Elegante Special Summona ${card.name} dalla mano!`);
                return;
            }
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const deckIdx = deck.findIndex((c) => c.name && (c.name.includes('Lady Arpia') || c.name === 'Sorelle Lady Arpia'));
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
    // Tutti i mostri Tipo Bestia Alata: +200 ATK/DEF. Vedi
    // missingEffectNote su id 788 in cards.json per la clausola di
    // distruzione al Summon di una Lady Arpia non implementata.
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
            ctx.log(`🎇 Scintilla dell'Estasi Triangolare porta l'ATK di ${count} Sorelle Lady Arpia a 2700 e blocca le Trappole avversarie!`);
        }
    });

    // ================================================================
    // 790 — Festa Isterica / Hysteric Party (Trappola Continua)
    // Scarta 1 carta; Special Summon quante più copie possibili di
    // "Lady Arpia" dal Cimitero. Vedi missingEffectNote su id 790 in
    // cards.json per la distruzione al ritiro non implementata.
    // ================================================================
    CardEffects.register(790, {
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            return ctx.graveyard(ctx.owner).some((c) => c.name && c.name.includes('Lady Arpia'));
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const [discarded] = hand.splice(0, 1);
            ctx.graveyard(ctx.owner).push(discarded);
            const grave = ctx.graveyard(ctx.owner);
            let summoned = 0;
            for (let i = grave.length - 1; i >= 0; i--) {
                if (!(grave[i].name && grave[i].name.includes('Lady Arpia'))) continue;
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) break;
                const [card] = grave.splice(i, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                summoned++;
            }
            ctx.log(`🦅 Festa Isterica scarta ${discarded.name} e Special Summona ${summoned} Lady Arpia dal Cimitero!`);
        }
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
    // 793 — Armatura Sakuretsu / Sakuretsu Armor (Trappola Normale)
    // Quando l'avversario dichiara un attacco: distruggi il mostro
    // attaccante. Stesso schema di risposta di Kuriboh (id 22).
    // ================================================================
    CardEffects.register(793, {
        onAttackDeclare(ctx) {
            const field = ctx.field(ctx.opponent);
            const attackerSlot = field[ctx.attackerIndex];
            if (!attackerSlot) return;
            const name = attackerSlot.card.name;
            ctx.destroyMonster(ctx.opponent, ctx.attackerIndex);
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
    // 803 — Idrogeddon / Hydrogeddon
    // Quando infligge danno da battaglia distruggendo un bersaglio: puoi
    // Special Summonare un'altra copia dal Deck. Vedi missingEffectNote
    // su id 803 in cards.json per l'approssimazione onDealsBattleDamage.
    // ================================================================
    CardEffects.register(803, {
        onDealsBattleDamage(ctx) {
            if (ctx.targetIndex === -1) return;
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
    // 805 — Ptera Nero / Black Ptera (onDestroy)
    // Quando distrutta e mandata al Cimitero: ritorna in mano. Vedi
    // missingEffectNote su id 805 in cards.json per la semplificazione
    // "qualsiasi distruzione" invece di "tranne in battaglia".
    // ================================================================
    CardEffects.register(805, {
        onDestroy(ctx) {
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
    // 809 — Bebè Cerasauro / Babycerasaurus (onDestroy)
    // Quando distrutta e mandata al Cimitero: Special Summon 1 mostro
    // Dinosauro di Livello 4 o inferiore dal Deck. Vedi
    // missingEffectNote su id 809 in cards.json per la semplificazione
    // "qualsiasi distruzione" invece di "solo da effetto Carta".
    // ================================================================
    CardEffects.register(809, {
        onDestroy(ctx) {
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
    // SEMPLIFICAZIONE "banish": la carta sparisce e basta (nessuna zona
    // Bandite a sé). Bandisce sempre TUTTI i Dinosauro disponibili.
    // ================================================================
    CardEffects.register(816, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.race === 'Dinosauro');
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            let banished = 0;
            for (let i = grave.length - 1; i >= 0; i--) {
                if (grave[i].type === 'monster' && grave[i].race === 'Dinosauro') { grave.splice(i, 1); banished++; }
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
    // 820 — Nega Attacco / Negate Attack (Trappola Contatore)
    // Quando l'avversario dichiara un attacco: annulla l'attacco. Vedi
    // missingEffectNote su id 820 in cards.json per la fine forzata
    // della Battle Phase non implementata.
    // ================================================================
    CardEffects.register(820, {
        onAttackDeclare(ctx) {
            ctx.cancelAttack();
            ctx.log("🛡️ Nega Attacco annulla l'attacco!");
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
    // Ombra id 439/Arte Ninjitsu della Trasformazione id 794). Vedi
    // missingEffectNote su id 823 in cards.json per "annulla gli
    // effetti" non implementato.
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
            if (validTarget) return;
            ctx.stField(ctx.owner)[ctx.index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
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
        ctx.log(`⚙️ ${ctx.card.name} blocca le Magie/Trappole avversarie per il resto del turno!`);
    }

    // ================================================================
    // 824 — Drago Gadjiltron Ingranaggio Antico / Ancient Gear
    // Gadjiltron Dragon — vedi missingEffectNote su id 824 in cards.json
    // per i bonus condizionati al tipo di Gadget sacrificato non
    // implementati.
    // ================================================================
    CardEffects.register(824, { onOwnAttackDeclare: onOwnAttackDeclareBlockSpellsTraps });

    // ================================================================
    // 826 — Ingegnere Ingranaggio Antico / Ancient Gear Engineer — vedi
    // missingEffectNote su id 826 in cards.json per le altre 2 clausole
    // non implementate.
    // ================================================================
    CardEffects.register(826, { onOwnAttackDeclare: onOwnAttackDeclareBlockSpellsTraps });

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
    // 832 — Golem Ingranaggio Antico / Ancient Gear Golem
    // Danno perforante + blocco Magie/Trappole quando attacca.
    // ================================================================
    CardEffects.register(832, { piercing: true, onOwnAttackDeclare: onOwnAttackDeclareBlockSpellsTraps });

    // ================================================================
    // 833 — Bestia Ingranaggio Antico / Ancient Gear Beast — vedi
    // missingEffectNote su id 833 in cards.json per l'annullamento
    // effetti non implementato.
    // ================================================================
    CardEffects.register(833, { onOwnAttackDeclare: onOwnAttackDeclareBlockSpellsTraps });

    // ================================================================
    // 834 — Soldato Ingranaggio Antico / Ancient Gear Soldier
    // ================================================================
    CardEffects.register(834, { onOwnAttackDeclare: onOwnAttackDeclareBlockSpellsTraps });

    // ================================================================
    // 835 — Ingranaggio Antico / Ancient Gear
    // Se controlli un altro mostro il cui nome inizia con "Ingranaggio
    // Antico": puoi Special Summonarla dalla mano scoperta in Posizione
    // di Attacco. Vedi missingEffectNote su id 835 in cards.json per la
    // semplificazione del nome esatto.
    // ================================================================
    CardEffects.register(835, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.startsWith('Ingranaggio Antico') && s.card.uid !== ctx.card.uid);
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
            ctx.log(`⚙️ Trapano Ingranaggio Antico scarta ${discarded.name} e mette Set ${card.name} dal Deck!`);
        }
    });

    // ================================================================
    // 843 — Castello dell'Ingranaggio Antico / Ancient Gear Castle
    // (Magia Continua)
    // Tutti i mostri "Ingranaggio Antico": +300 ATK. Vedi
    // missingEffectNote su id 843 in cards.json per i Segnalini/
    // sacrificio alternativo non implementati.
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
            const hasOwnMonster = ctx.field(ctx.owner).some((s) => s);
            if (hasOwnMonster) {
                const ownField = ctx.field(ctx.owner);
                const sacIndex = ownField.findIndex((s) => s);
                const oppField = ctx.field(ctx.opponent);
                const targetIndex = oppField.findIndex((s) => s && !s.isFaceDown);
                if (sacIndex !== -1 && targetIndex !== -1) {
                    const sacrificed = ownField[sacIndex].card;
                    ctx.graveyard(ctx.owner).push(sacrificed);
                    ownField[sacIndex] = null;
                    const stolen = oppField[targetIndex].card;
                    if (ctx.takeControl(ctx.owner, ctx.opponent, targetIndex)) {
                        ctx.log(`⚙️ Controllore Nemico sacrifica ${sacrificed.name} e prende il controllo di ${stolen.name}!`);
                        return;
                    }
                }
            }
            const oppField = ctx.field(ctx.opponent);
            const index = oppField.findIndex((s) => s && !s.isFaceDown);
            if (index === -1) return;
            oppField[index].position = oppField[index].position === 'attack' ? 'defense' : 'attack';
            ctx.log(`⚙️ Controllore Nemico cambia la Posizione di ${oppField[index].card.name}!`);
        }
    });

    // ================================================================
    // 846 — Cambio d'Arma / Weapon Change (Magia Continua)
    // Vedi missingEffectNote su id 846 in cards.json: l'abilità
    // ripetibile "una volta per ciascuna Standby Phase, paga 700 LP e
    // scambia ATK/DEF" non è implementata — stesso genere di limite già
    // accettato per Offerta Suprema (id 559)/Richiamo della Mummia
    // (id 670), che hanno lo stesso bisogno di un'abilità riusabile più
    // volte a turno da una carta Continua già sul Terreno.
    // ================================================================
    CardEffects.register(846, {
        continuous: true,
        activate(ctx) {
            ctx.log("⚙️ Cambio d'Arma attivato!");
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
    // Tipo Macchina) — vedi missingEffectNote su id 851 in cards.json
    // per l'annullamento Magie non implementato.
    // ================================================================
    CardEffects.register(851, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.race === 'Macchina') !== -1; },
        activate(ctx) { attachEquip(ctx, findEquipTarget(ctx, (c) => c.race === 'Macchina')); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
        }
    });

    // ================================================================
    // 852 — Fuoco di Copertura / Covering Fire (Trappola Normale)
    // Durante un attacco subito, scegli 1 altro proprio mostro scoperto:
    // il mostro attaccato guadagna il suo ATK. Vedi missingEffectNote su
    // id 852 in cards.json per la semplificazione di durata.
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
            ctx.grantTemporaryAtkDefBonus(targetSlot.card, bonus, 0, false);
            ctx.log(`🔥 Fuoco di Copertura aumenta l'ATK di ${targetSlot.card.name} di ${bonus} punti!`);
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
    // 130 — Controllo Mentale / Brain Control (Magia Normale)
    // Paga 800 LP, poi prendi il controllo di 1 mostro Evocabile
    // Normalmente/Set dell'avversario fino alla End Phase (ctx.takeControl,
    // stesso schema di Cambio di Cuore id 147).
    // ------------------------------------------------------------------
    CardEffects.register(130, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            const index = ctx.field(ctx.opponent).findIndex((s) => s && !s.isFaceDown);
            if (index === -1) return;
            const stolen = ctx.field(ctx.opponent)[index].card;
            ctx.dealDamage(ctx.owner, 800);
            if (ctx.takeControl(ctx.owner, ctx.opponent, index)) {
                ctx.log(`🧠 Controllo Mentale paga 800 LP e prende il controllo di ${stolen.name} fino alla End Phase!`);
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
    // 466 — L'Occhio della Verità / The Eye of Truth (Trappola Continua)
    // ------------------------------------------------------------------
    CardEffects.register(466, {
        continuous: true,
        activate(ctx) {
            ctx.log("👁️ L'Occhio della Verità attivato!");
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
            const opp = ctx.field(ctx.opponent).find((s) => s && !s.isFaceDown);
            if (!own || !opp) return;
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
    CardEffects.register(94, {
        canActivate(ctx) {
            if (gameState.phase !== 'main1' && gameState.phase !== 'main2') return false;
            return ctx.hand(ctx.owner).some((c) => c.id === 335) && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
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
    // Sacrifica dal Terreno mostri per un Livello totale di almeno 7 per
    // Special Summon Balena Fortezza (id 252) dalla mano. Stesso schema
    // di Rito del Guerriero Nero (id 56).
    // ------------------------------------------------------------------
    CardEffects.register(253, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 252);
            if (!hasRitualMonster) return false;
            const totalLevel = ctx.field(ctx.owner).reduce((sum, slot) => sum + (slot ? (slot.card.level || 0) : 0), 0);
            return totalLevel >= 7;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field
                .map((slot, index) => (slot ? { index, level: slot.card.level || 0 } : null))
                .filter(Boolean)
                .sort((a, b) => b.level - a.level);
            let remaining = 7;
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
            const handIndex = hand.findIndex((c) => c.id === 252);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(ritualCard); return; }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('🐋 Giuramento della Balena Fortezza evoca Balena Fortezza!');
        }
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
            const harpieCount = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && s.card.name && (s.card.name.includes('Lady Arpia') || s.card.name === 'Sorelle Lady Arpia')).length;
            if (harpieCount < 3) return false;
            return ctx.field(ctx.opponent).some((s) => s);
        },
        activate(ctx) {
            const harpieCount = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && s.card.name && (s.card.name.includes('Lady Arpia') || s.card.name === 'Sorelle Lady Arpia')).length;
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
            const card = field[index].card;
            const damage = card.attack || 0;
            ctx.destroyMonster(ctx.opponent, index);
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
