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
 * N, distruggi tutto). Un effetto che richiede scegliere un bersaglio
 * specifico, reagire a un trigger particolare, o qualunque interazione
 * davvero nuova, resta fuori portata di un template parametrizzato e va
 * scritto a mano in js/engine/card-effects.js come sempre — non è un limite di
 * questo file, è intrinseco a "nessun codice" come approccio.
 */
(function () {
    'use strict';

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

        /** Recupera `amount` Life Points per chi attiva (dealDamage negativo = cura, vedi ACTIONS.dealDamage in duel-engine.js). */
        gainLifePoints: (params) => ({
            activate(ctx) {
                ctx.dealDamage(ctx.owner, -(params.amount || 0));
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
