// @ts-check
/**
 * tavolo.js — i due posti al tavolo e chi li controlla.
 * =====================================================================
 * Priorità 3 del piano di attacco ("posti al tavolo"). Il motore chiama i
 * due lati 'player' e 'bot', e fin qui va bene: sono solo i nomi dei due
 * posti. Il guaio era un altro: il codice dava per scontato che il posto
 * 'player' fosse SEMPRE la persona davanti allo schermo e il posto 'bot'
 * SEMPRE l'IA (o, in Multiplayer, l'avversario remoto). Così l'IA sapeva
 * giocare solo da un lato, e un duello IA contro IA — il modo di misurare
 * le difficoltà con dati veri — non si poteva fare.
 *
 * Ora chi controlla un posto è un DATO, chiesto qui:
 *   'persona'  qualcuno davanti a questo schermo (le scelte gli si
 *              mostrano, vedi js/engine/decisioni.js; il turno lo guida lui)
 *   'ia'       l'IA del gioco (js/ai/*): sceglie da sola e guida il proprio
 *              turno (turnoIA in js/ai/bot.js)
 *   'remoto'   la persona sull'altro client, in Multiplayer: le sue scelte
 *              arrivano dalla rete
 * Di default è com'è sempre stato: 'player' è la persona, 'bot' è l'IA o,
 * in Multiplayer, il remoto. `Tavolo.imposta(...)` cambia i controllori di
 * un duello (il duello senza testa mette l'IA su entrambi i posti).
 *
 * Gli ACCESSORI (mano, mostri, magieTrappole, ...) danno lo stato di un
 * posto senza scrivere a mano "player ? gameState.playerHand :
 * gameState.botHand" — la forma che compare centinaia di volte nel motore.
 * Accettano uno stato esplicito come secondo argomento, per il codice che
 * riceve gameState come parametro (l'IA); altrimenti usano quello del
 * duello in corso.
 */
(function () {
    'use strict';

    const g = /** @type {any} */ (globalThis);
    const POSTI = Object.freeze(['player', 'bot']);
    const CONTROLLORI = Object.freeze(['persona', 'ia', 'remoto']);

    /** @type {Record<string, string>} */
    let impostati = {};

    /** @param {string} posto */
    function controllaPosto(posto) {
        if (posto !== 'player' && posto !== 'bot') throw new Error(`Tavolo: posto sconosciuto "${posto}" (sono 'player' e 'bot')`);
    }

    /**
     * @param {string} posto
     * @param {any} [stato]
     */
    function statoDi(posto, stato) {
        controllaPosto(posto);
        // gameState è un `let` di stato.js: non sta su window, ma gli script
        // classici condividono lo stesso ambito globale, quindi qui si vede.
        return stato || (typeof gameState !== 'undefined' ? gameState : null);
    }

    /**
     * @param {string} campo  il nome dopo il prefisso: 'Hand', 'MonsterField'...
     * @returns {(posto: string, stato?: any) => any}
     */
    function accessore(campo) {
        return (posto, stato) => {
            const s = statoDi(posto, stato);
            return s ? s[posto + campo] : undefined;
        };
    }

    const Tavolo = {
        POSTI,

        /** @param {string} posto */
        avversario(posto) {
            controllaPosto(posto);
            return posto === 'player' ? 'bot' : 'player';
        },

        /**
         * Chi controlla il posto: 'persona', 'ia' o 'remoto'.
         * @param {string} posto
         */
        controllore(posto) {
            controllaPosto(posto);
            if (impostati[posto]) return impostati[posto];
            if (posto === 'bot') return g.MULTIPLAYER_MODE ? 'remoto' : 'ia';
            return 'persona';
        },

        /** @param {string} posto */
        eIA(posto) { return Tavolo.controllore(posto) === 'ia'; },
        /** @param {string} posto */
        ePersona(posto) { return Tavolo.controllore(posto) === 'persona'; },
        /** @param {string} posto */
        eRemoto(posto) { return Tavolo.controllore(posto) === 'remoto'; },

        /**
         * Cambia chi controlla uno o entrambi i posti, es.
         * `Tavolo.imposta({ player: 'ia' })`. Vale finché non si chiama
         * `Tavolo.azzera()` (o si ricarica la pagina).
         * @param {Record<string, string>} mappa
         */
        imposta(mappa) {
            Object.keys(mappa).forEach((posto) => {
                controllaPosto(posto);
                if (!CONTROLLORI.includes(mappa[posto])) throw new Error(`Tavolo: controllore sconosciuto "${mappa[posto]}" (sono ${CONTROLLORI.join(', ')})`);
                impostati[posto] = mappa[posto];
            });
        },

        /** Torna ai controllori di default. */
        azzera() { impostati = {}; },

        // --- stato di un posto -------------------------------------------
        mano: accessore('Hand'),
        mostri: accessore('MonsterField'),
        magieTrappole: accessore('STField'),
        cimitero: accessore('Graveyard'),
        banditi: accessore('Banished'),
        mazzo: accessore('Deck'),
        extraDeck: accessore('ExtraDeck'),
        magiaTerreno: accessore('FieldSpell'),
        lp: accessore('LP')
    };

    g.Tavolo = Tavolo;
})();
