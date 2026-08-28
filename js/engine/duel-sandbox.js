/**
 * duel-sandbox.js — Avvio di un duello con uno stato di partenza
 * personalizzato invece del solito mazzo vero + pescata.
 * =====================================================================
 * File A PARTE, additivo: NON tocca resetGameState()/initGame()
 * (js/engine/game-flow.js) né alcuna regola del motore
 * (duel-engine.js/actions.js/card-effects.js) — si limita a riusare
 * resetGameState() così com'è (per ottenere uno stato vuoto con la
 * forma giusta, tutte le strutture dati che il resto del motore si
 * aspetta) e poi SOVRASCRIVE mano/campo/Cimitero/LP/fase/turno con la
 * configurazione preparata in duello-sandbox.html.
 *
 * Caricato SOLO da yugioh_game.html, e invocato SOLO quando
 * DuelSession.mode === 'sandbox' (vedi start() in js/duel-session.js) —
 * per ogni altro modo di duellare (Demo/Libero/Storia/Multiplayer)
 * questo file esiste ma non viene mai chiamato: zero impatto sul
 * duello "vero".
 */
(function () {
    'use strict';

    const SANDBOX_CONFIG_KEY = 'ygoSandboxConfig';

    /** Genera un uid unico per una carta piazzata dalla sandbox — stesso principio di createRandomCard() in cards-db.js. */
    function makeUid() {
        return 'sandbox-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    }

    /**
     * Clona il template di una carta dal database (per id) con un uid
     * tutto suo, o null se l'id non esiste. `cardDatabase` è dichiarata
     * con `const` in cima a js/data/cards-data.generated.js (script
     * classico, non un modulo): un `const`/`let` di primo livello NON
     * diventa mai una proprietà di `window` (a differenza di `var`), pur
     * restando visibile come identificatore nudo a ogni altro script
     * della pagina — quindi il controllo va fatto con `typeof`, MAI con
     * `window.cardDatabase` (sarebbe sempre undefined, bug reale preso
     * qui la prima volta: ogni carta piazzata dalla sandbox risultava
     * "non trovata" e la config veniva applicata come se fosse vuota).
     */
    function instantiateCard(id) {
        const template = typeof cardDatabase !== 'undefined' && cardDatabase.find((c) => c.id === id);
        if (!template) return null;
        return Object.assign({}, template, { uid: makeUid() });
    }

    function buildMonsterSlot(entry) {
        const card = instantiateCard(entry.id);
        if (!card) return null;
        const position = entry.position === 'defense' || entry.position === 'facedown' ? entry.position : 'attack';
        return {
            card: card,
            // "facedown" qui è sempre Difesa coperta (un mostro non si Set
            // mai scoperto in Attacco per regola vera) — la Posizione
            // interna resta 'defense', isFaceDown la distingue da Difesa
            // scoperta, esattamente come altrove nel motore.
            position: position === 'facedown' ? 'defense' : position,
            isFaceDown: position === 'facedown',
            hasAttacked: false,
            canChangePosition: true
        };
    }

    /** Slot Magia/Trappola: Set coperta di base — setOnTurn nel PASSATO (turno corrente - 1) così è già attivabile subito, non "appena piazzata questo turno". Scoperta se entry.faceUp. */
    function buildSTSlot(entry, currentTurn) {
        const card = instantiateCard(entry.id);
        if (!card) return null;
        const faceUp = !!entry.faceUp;
        return {
            card: card,
            isFaceDown: !faceUp,
            setOnTurn: faceUp ? undefined : Math.max(0, currentTurn - 1)
        };
    }

    function buildLooseCard(entry) {
        return instantiateCard(entry.id);
    }

    function readConfig() {
        let raw = null;
        try { raw = sessionStorage.getItem(SANDBOX_CONFIG_KEY); } catch (e) { /* noop */ }
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
    }

    /**
     * Applica la configurazione sandbox su un gameState già "vuoto ma
     * della forma giusta" (uscito da resetGameState()). Ogni owner
     * ('player'/'bot') ha, nella config, { hand:[{id}], graveyard:[{id}],
     * extraDeck:[{id}], banished:[{id}], monsters:[{id,position}] (max 5),
     * spellsTraps:[{id,faceUp}] (max 5) }.
     */
    function applyConfig(config) {
        gameState.turn = Math.max(1, parseInt(config.turn, 10) || 1);
        gameState.phase = config.phase || 'main1';
        gameState.currentPlayer = config.currentPlayer === 'bot' ? 'bot' : 'player';
        gameState.playerLP = Math.max(0, parseInt(config.playerLP, 10) || 8000);
        gameState.botLP = Math.max(0, parseInt(config.botLP, 10) || 8000);
        gameState.hasNormalSummoned = !!config.hasNormalSummoned;

        ['player', 'bot'].forEach((owner) => {
            const cfg = config[owner] || {};
            const handKey = owner + 'Hand';
            const graveKey = owner + 'Graveyard';
            const extraDeckKey = owner + 'ExtraDeck';
            const banishedKey = owner + 'Banished';
            const monsterKey = owner + 'MonsterField';
            const stKey = owner + 'STField';

            gameState[handKey] = (cfg.hand || []).map(buildLooseCard).filter(Boolean);
            gameState[graveKey] = (cfg.graveyard || []).map(buildLooseCard).filter(Boolean);
            gameState[banishedKey] = (cfg.banished || []).map(buildLooseCard).filter(Boolean);
            // Mostri Fusione/Rituale (card.extraDeck === true, es. Drago
            // Bianco Definitivo id 29): vivono nell'Extra Deck, MAI in
            // mano — solo così "Fusione"/id 38 (DuelEngine.getFusableExtraDeckMonsters)
            // li trova per una vera Evocazione Fusione, invece di finire
            // nel flusso di Evocazione Normale/Tributo (bloccato a parte
            // in attemptMonsterSummon, js/engine/actions.js, per card.extraDeck).
            gameState[extraDeckKey] = (cfg.extraDeck || []).map(buildLooseCard).filter(Boolean);

            (cfg.monsters || []).slice(0, 5).forEach((entry, index) => {
                const slot = buildMonsterSlot(entry);
                if (slot) gameState[monsterKey][index] = slot;
            });
            (cfg.spellsTraps || []).slice(0, 5).forEach((entry, index) => {
                const slot = buildSTSlot(entry, gameState.turn);
                if (slot) gameState[stKey][index] = slot;
            });
        });
    }

    /**
     * Punto d'ingresso, chiamato da DuelSession.start() (js/duel-session.js)
     * al posto di initGame() SOLO in modalità sandbox. Niente cinematica
     * d'apertura, niente pescata a scena, niente stagger di rivelazione
     * mano: si atterra SUBITO nello stato configurato, pronti a giocare.
     */
    function initSandboxGame() {
        if (typeof resetGameState !== 'function') {
            console.error('duel-sandbox.js: resetGameState() non trovata — js/engine/game-flow.js non è caricato?');
            return;
        }
        resetGameState();

        if (!document.getElementById('playerHand') || !document.getElementById('playerFieldBoard') || !document.getElementById('botFieldBoard')) {
            console.error('Elementi del campo mancanti nella pagina.');
            return;
        }

        const config = readConfig();
        if (!config) {
            addToLog('⚠️ Nessuna configurazione sandbox trovata: torna a "Demo Duello Sandbox" e prepara lo scenario prima di avviare.');
            updateUI();
            return;
        }

        applyConfig(config);
        startDuelTimer();
        updateUI();
        addToLog('🧪 Sandbox avviata con lo stato personalizzato che hai preparato.');
    }

    window.initSandboxGame = initSandboxGame;
})();
