/**
 * ai-controller.js — Punto d'accesso UNICO alle decisioni del bot.
 * js/bot.js (l'ESECUTORE: animazioni, timer, applica la decisione al
 * gameState) chiama sempre BotAI.*, mai direttamente AI_MEDIUM/AI_HARD —
 * così cambiare/aggiungere un livello di difficoltà non richiede toccare
 * bot.js. Il livello attivo è gameState.botDifficulty ('medium' | 'hard'),
 * default 'medium' (= comportamento del bot di sempre per chi non sceglie
 * nulla, es. il Duello Demo). Il livello "Facile" è stato rimosso su
 * richiesta esplicita dell'utente (troppo poco distinguibile dagli altri
 * due, restava solo rumore): se in futuro dovesse tornare, il punto
 * d'aggancio è qui, in currentLevel().
 *
 * Solo lato client: come il resto del motore, non richiede nulla dal
 * server (vedi server/server.js, un puro relay) — compatibile con
 * Multiplayer perché ogni client valuta solo le PROPRIE decisioni (il
 * bot non esiste nemmeno in una partita Multiplayer reale, ma questi
 * stessi livelli restano lì pronti per un eventuale "gioca contro IA"
 * anche in quel contesto in futuro).
 *
 * DEBUG: imposta window.AI_DEBUG = true in console per vedere ogni
 * decisione (livello, dati in ingresso, scelta) loggata qui sotto.
 */
(function () {
    'use strict';

    function currentLevelName() {
        return (typeof gameState !== 'undefined' && gameState.botDifficulty) || 'medium';
    }

    /** Il modulo IA del livello attivo, con ripiego su IA_MEDIA se quel livello non è caricato per qualche motivo. */
    function currentLevel() {
        const name = currentLevelName();
        if (name === 'hard' && window.AI_HARD) return window.AI_HARD;
        return window.AI_MEDIUM || window.AI_HARD || null;
    }

    function debugLog(label, data) {
        if (window.AI_DEBUG) {
            console.log(`[BotAI:${currentLevelName()}] ${label}`, data);
        }
    }

    function chooseSummon(gameStateArg) {
        const level = currentLevel();
        const decision = level ? level.chooseSummon(gameStateArg) : null;
        debugLog('chooseSummon', decision ? { card: decision.card.name, tributi: decision.tributeIndices.length } : null);
        return decision;
    }

    function chooseAttackTarget(attackerSlot, playerMonsters) {
        const level = currentLevel();
        const decision = level ? level.chooseAttackTarget(attackerSlot, playerMonsters) : null;
        debugLog('chooseAttackTarget', { attaccante: attackerSlot.card.name, scelta: decision });
        return decision;
    }

    function chooseChainResponse(candidates) {
        const level = currentLevel();
        const decision = level ? level.chooseChainResponse(candidates) : (candidates[0] || null);
        debugLog('chooseChainResponse', { candidati: candidates.map((c) => c.card.name), scelta: decision && decision.card.name });
        return decision;
    }

    /**
     * Prossima azione da fare con una Magia/Trappola in mano durante la
     * propria Main Phase — vedi bot.js, che la richiama ripetutamente
     * (una carta alla volta) finché ritorna null o non ci sono più slot/
     * carte utili. `usedThisTurn` è un piccolo oggetto che bot.js passa
     * invariato tra le chiamate dello stesso turno, così ogni livello può
     * tenere il proprio conteggio (es. IA_MEDIA si ferma dopo 1 Set + 1
     * Magia) senza che i livelli si condizionino a vicenda.
     */
    function chooseNextSpellTrapAction(gameStateArg, usedThisTurn) {
        const level = currentLevel();
        const decision = level && typeof level.chooseNextSpellTrapAction === 'function'
            ? level.chooseNextSpellTrapAction(gameStateArg, usedThisTurn) : null;
        debugLog('chooseNextSpellTrapAction', decision ? { card: decision.card.name, action: decision.action } : null);
        return decision;
    }

    /** Vero se conviene attivare ORA una propria carta già Set, durante la propria Main Phase (non in risposta a un trigger) — solo IA_DIFFICILE lo fa mai. */
    function chooseSetCardActivation(gameStateArg) {
        const level = currentLevel();
        const decision = level && typeof level.chooseSetCardActivation === 'function'
            ? level.chooseSetCardActivation(gameStateArg) : null;
        debugLog('chooseSetCardActivation', decision ? { card: decision.card.name } : null);
        return decision;
    }

    /** Punteggio di valutazione campo (solo IA_DIFFICILE lo calcola davvero) — utile per il debug/log, non usato dall'esecutore. */
    function explainDecision(label, data) {
        debugLog(label, data);
    }

    window.BotAI = {
        chooseSummon: chooseSummon,
        chooseAttackTarget: chooseAttackTarget,
        chooseChainResponse: chooseChainResponse,
        chooseNextSpellTrapAction: chooseNextSpellTrapAction,
        chooseSetCardActivation: chooseSetCardActivation,
        explainDecision: explainDecision
    };
})();
