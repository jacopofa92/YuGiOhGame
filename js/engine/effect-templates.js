/**
 * effect-templates.js — Libreria di effetti meccanici RIUTILIZZABILI,
 * pensata per il futuro Card Maker: una nuova carta può dichiarare in
 * data/cards.json (o tramite js/data/custom-cards.js)
 *
 *   "effectTemplate": { "name": "drawCards", "params": { "amount": 2 } }
 *
 * invece di avere una registrazione scritta a mano in js/engine/card-effects.js.
 * Il loader che legge questo campo è in fondo a js/engine/card-effects.js (dopo
 * tutte le registrazioni bespoke, così può anche gestire
 * "cloneEffectOf" facendo riferimento a una carta bespoke già pronta).
 *
 * Ogni template è una funzione (params) -> definizione, ESATTAMENTE nella
 * stessa forma di un blocco scritto a mano (vedi il commento in testa a
 * js/engine/card-effects.js per i campi supportati: activate, canActivate,
 * static, onX...) — usa solo gli helper già su ctx (ctx.drawCards,
 * ctx.dealDamage, ctx.destroyAllMonsters, ctx.destroyAllCards, vedi
 * ACTIONS in js/engine/duel-engine.js), nessuna logica nuova nel motore.
 *
 * LIMITE ONESTO: questi template coprono le forme SEMPLICI e già
 * ripetute a mano più volte nel dataset attuale (pesca N, danno N, cura
 * N, distruggi tutto, bersaglia 1 mostro, ecc.). Un effetto che richiede
 * reagire a un trigger particolare, negare un'attivazione, o qualunque
 * interazione davvero nuova, resta fuori portata di un template
 * parametrizzato e va scritto a mano in js/engine/card-effects.js come
 * sempre — non è un limite di questo file, è intrinseco a "nessun
 * codice" come approccio. Un altro limite, più di questa sessione:
 * ogni carta usa UN SOLO template (nessuna composizione "scarta 2 carte
 * POI pesca 2 carte" incrociando due template diversi sulla stessa
 * carta) — un vero linguaggio compositivo multi-passo è un progetto ben
 * più grande di una libreria di template, lasciato fuori scope apposta.
 *
 * Ogni template che sceglie un bersaglio (destroyTargetMonster,
 * changeTargetBattlePosition, changeTargetLevel) lo fa con lo STESSO
 * "sceglie da sola il primo mostro idoneo" già accettato ovunque in
 * questo dataset per le carte scritte a mano (vedi il commento su
 * findEquipTarget in js/engine/card-effects.js) — mai un vero selettore
 * interattivo, che richiederebbe una UI dedicata per un Card Maker
 * generico. Passano comunque dal checkpoint di targeting condiviso
 * (ctx.declareTarget/ctx.destroyTargetedMonster, vedi ACTIONS in
 * js/engine/duel-engine.js), quindi restano soggetti alle stesse
 * immunità/redirect di ogni altra carta del motore (i 3 Dei Egizi,
 * Specchietto della Fata, ecc.) — SOLO per i mostri sul Terreno: quel
 * checkpoint non copre la zona Magia/Trappola (nessuna carta del
 * dataset ne ha mai avuto bisogno finora), quindi "distruggi 1 bersaglio"
 * qui sotto sceglie solo tra i MOSTRI, mai una Magia/Trappola scoperta —
 * per quel caso resta necessaria una carta scritta a mano.
 */
(function () {
    'use strict';

    /** owner effettivo per un template con `params.side`: 'self' (default) = ctx.owner, 'opponent' = ctx.opponent. */
    function sideOwner(ctx, side) {
        return side === 'opponent' ? ctx.opponent : ctx.owner;
    }

    /** true se `card` soddisfa gli eventuali filtri opzionali `race`/`attribute` di `params` (nessun filtro = passa sempre). */
    function matchesFilters(card, params) {
        if (params.race && card.race !== params.race) return false;
        if (params.attribute && card.attribute !== params.attribute) return false;
        return true;
    }

    const TEMPLATES = {
        /** Pesca `amount` carte (es. Vaso dell'Avidità: amount 2). */
        drawCards: (params) => ({
            activate(ctx) {
                ctx.drawCards(ctx.owner, params.amount || 1);
            }
        }),

        /** Infligge `amount` danni diretti all'avversario di chi attiva. */
        dealDamageToOpponent: (params) => ({
            activate(ctx) {
                ctx.dealDamage(ctx.opponent, params.amount || 0);
            }
        }),

        /** Recupera `amount` Life Points per chi attiva o per l'avversario (`params.side`: 'self' default, o 'opponent') — dealDamage negativo = cura, vedi ACTIONS.dealDamage in duel-engine.js. */
        gainLifePoints: (params) => ({
            activate(ctx) {
                ctx.dealDamage(sideOwner(ctx, params.side), -(params.amount || 0));
            }
        }),

        /**
         * Aumenta/riduce ATK e/o DEF di `atk`/`def` (possono essere
         * negativi) per i mostri scoperti sul Terreno che soddisfano i
         * filtri opzionali `race`/`attribute` (nessuno = tutti), lato
         * `side` ('self' default, 'opponent', o 'both'). Dura finché
         * questa carta resta scoperta sul Terreno — stesso identico
         * schema di Scudo Lustro Giallo (id 148, card-effects.js: static()
         * che scrive su gameState.atkDefBonus per uid), solo generalizzato
         * a un filtro/lato/importo scelti a runtime invece che fissi nel
         * codice. Va su una carta con `continuous: true` (Magia/Trappola
         * Continua, o un Equip già gestito a parte da findEquipTarget se
         * serve agganciarla a UN solo mostro invece che un intero gruppo).
         */
        modifyAtkDef: (params) => ({
            continuous: true,
            activate(ctx) { ctx.log(`✨ ${ctx.card.name} si scopre sul Terreno.`); },
            static(ctx) {
                const sides = params.side === 'both' ? [ctx.owner, ctx.opponent] : [sideOwner(ctx, params.side)];
                sides.forEach((owner) => {
                    ctx.field(owner).forEach((slot) => {
                        if (!slot || slot.isFaceDown || !matchesFilters(slot.card, params)) return;
                        const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                        gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + (params.atk || 0), def: e.def + (params.def || 0) };
                    });
                });
            }
        }),

        /**
         * Distrugge 1 mostro scoperto sul Terreno di `side` ('opponent'
         * default, o 'self') che soddisfa i filtri opzionali `race`/
         * `attribute` — sceglie da sola il primo candidato idoneo (vedi
         * limite onesto in testa al file), poi passa da
         * ctx.destroyTargetedMonster (checkpoint di targeting condiviso:
         * rispetta i 3 Dei Egizi, Specchietto della Fata, ecc.). Non fa
         * nulla se nessun mostro idoneo è in campo.
         */
        destroyTargetMonster: (params) => ({
            activate(ctx) {
                const owner = sideOwner(ctx, params.side || 'opponent');
                const index = ctx.field(owner).findIndex((slot) => slot && !slot.isFaceDown && matchesFilters(slot.card, params));
                if (index === -1) return;
                ctx.destroyTargetedMonster(owner, index);
            }
        }),

        /**
         * Cerca fino a `maxCount` (default 1) carte dal proprio Deck che
         * soddisfano i filtri opzionali `cardType` ('monster'/'spell'/
         * 'trap'), `race`, `attribute`, `exactId` (nessun filtro = ogni
         * carta del Deck) e le aggiunge alla mano — appoggio diretto su
         * ctx.searchDeckToHand (duel-engine.js), che gestisce già da solo
         * il caso "nessun vero Deck salvato" (es. Duello Demo).
         */
        searchCardFromDeck: (params) => ({
            activate(ctx) {
                ctx.searchDeckToHand(ctx.owner, (card) => {
                    if (params.exactId && card.id !== params.exactId) return false;
                    if (params.cardType && card.type !== params.cardType) return false;
                    return matchesFilters(card, params);
                }, params.maxCount || 1);
            }
        }),

        /**
         * Scarta `amount` carte a caso dalla propria mano come costo/
         * effetto — appoggio diretto su ctx.discardRandomFromHand
         * (duel-engine.js), che già gestisce da sola una mano con meno
         * carte del richiesto (si ferma quando la mano è vuota). LIMITE
         * ONESTO: questo template da solo non è un vero "costo" abbinato
         * a un beneficio (una carta usa UN SOLO template, vedi in testa
         * al file) — utile per una carta il cui intero effetto È lo
         * scarto (es. una penalità), non per uno scambio "scarta 2 pesca 2".
         */
        discardCards: (params) => ({
            activate(ctx) {
                const amount = params.amount || 1;
                for (let i = 0; i < amount; i++) {
                    if (!ctx.discardRandomFromHand(ctx.owner)) break;
                }
            }
        }),

        /**
         * Special Summon (scoperto) del primo mostro idoneo trovato nella
         * propria mano o Cimitero (`params.zone`: 'hand' default, o
         * 'graveyard') che soddisfa i filtri opzionali `race`/
         * `maxLevel`, in `params.position` ('attack' default, o
         * 'defense') — non fa nulla se non c'è uno slot Mostro libero
         * (controllato PRIMA di togliere la carta dalla sua zona, così
         * un Terreno pieno non la fa sparire nel nulla) o nessun
         * candidato idoneo.
         */
        specialSummonFiltered: (params) => ({
            activate(ctx) {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) return;
                const zone = params.zone === 'graveyard' ? ctx.graveyard(ctx.owner) : ctx.hand(ctx.owner);
                const index = zone.findIndex((card) => card.type === 'monster'
                    && (!params.race || card.race === params.race)
                    && (!params.maxLevel || (card.level || 0) <= params.maxLevel));
                if (index === -1) return;
                const [card] = zone.splice(index, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, params.position || 'attack', params.zone === 'graveyard' ? 'graveyard' : undefined);
            }
        }),

        /**
         * Cambia la Posizione di Battaglia (attacco<->difesa) del primo
         * mostro idoneo scoperto sul Terreno di `side` ('opponent'
         * default, o 'self') che soddisfa i filtri opzionali `race`/
         * `attribute` — passa da ctx.declareTarget (checkpoint condiviso)
         * prima di agire, usando SEMPRE i valori restituiti (mai quelli
         * scelti in partenza) per rispettare un eventuale redirect.
         */
        changeTargetBattlePosition: (params) => ({
            activate(ctx) {
                const owner = sideOwner(ctx, params.side || 'opponent');
                const index = ctx.field(owner).findIndex((slot) => slot && !slot.isFaceDown && matchesFilters(slot.card, params));
                if (index === -1) return;
                const decl = ctx.declareTarget(owner, index);
                if (!decl.allowed) return;
                const slot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!slot) return;
                ctx.changePosition(decl.targetOwner, decl.targetIndex, slot.position === 'attack' ? 'defense' : 'attack');
            }
        }),

        /**
         * Aumenta/riduce (`amount`, può essere negativo) il Livello del
         * primo mostro idoneo scoperto sul Terreno di `side` ('self'
         * default, o 'opponent') che soddisfa i filtri opzionali `race`/
         * `attribute` — mutazione diretta e permanente di card.level,
         * stesso stile già usato altrove nel motore per bonus permanenti
         * (es. card.attack -= 500 di Drago Berserk, id 110). Passa da
         * ctx.declareTarget prima di agire, come changeTargetBattlePosition
         * qui sopra.
         */
        changeTargetLevel: (params) => ({
            activate(ctx) {
                const owner = sideOwner(ctx, params.side);
                const index = ctx.field(owner).findIndex((slot) => slot && !slot.isFaceDown && matchesFilters(slot.card, params));
                if (index === -1) return;
                const decl = ctx.declareTarget(owner, index);
                if (!decl.allowed) return;
                const slot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!slot) return;
                slot.card.level = Math.max(0, (slot.card.level || 0) + (params.amount || 0));
            }
        }),

        /**
         * Distrugge tutti i mostri sul Terreno. `params.target`:
         * 'both' (default, es. Buco Nero), 'self' o 'opponent'.
         */
        destroyAllMonsters: (params) => ({
            activate(ctx) {
                const target = params.target === 'self' ? ctx.owner
                    : params.target === 'opponent' ? ctx.opponent
                    : undefined; // undefined = entrambi, vedi ACTIONS.destroyAllMonsters
                ctx.destroyAllMonsters(target);
            }
        }),

        /**
         * Distrugge tutte le carte (mostri + Magie/Trappole) sul Terreno
         * del giocatore indicato. `params.target`: 'opponent' (default,
         * es. Folgore Fulminante) o 'self'.
         */
        destroyAllCards: (params) => ({
            activate(ctx) {
                ctx.destroyAllCards(params.target === 'self' ? ctx.owner : ctx.opponent);
            }
        })
    };

    /** Registra un nuovo template (o sovrascrive uno esistente) — usata anche da un futuro Card Maker per template definiti dall'utente stesso. */
    function register(name, factory) {
        TEMPLATES[name] = factory;
    }

    /** Costruisce la definizione pronta per CardEffects.register a partire dal nome del template — null (con warning in console) se il nome non esiste. */
    function build(name, params) {
        const factory = TEMPLATES[name];
        if (typeof factory !== 'function') {
            console.warn(`[EffectTemplates] Template "${name}" non trovato.`);
            return null;
        }
        return factory(params || {});
    }

    window.EffectTemplates = { register: register, build: build, TEMPLATES: TEMPLATES };
})();
