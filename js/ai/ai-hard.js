/**
 * ai-hard.js — Livello Difficile.
 *
 * La matrice fattoriale della Storia ha dimostrato un vincolo importante:
 * una seconda euristica completa non è automaticamente più intelligente.
 * La vecchia versione sceglieva Evocazioni, Chain e retrocampo con punteggi
 * propri, ma finiva per rompere combo tematiche e consumare risorse fuori
 * contesto: a parità di deck perdeva più spesso della Media in 14 incontri
 * su 16.
 *
 * Hard usa quindi la Media come base affidabile e aggiunge una sola forma
 * di informazione superiore, facile da verificare: prima di attaccare una
 * carta coperta ne valuta la statistica reale e non manda volontariamente
 * il proprio mostro in uno scontro certamente perso. Il vantaggio è piccolo
 * ma concreto; soprattutto, non cambia l'identità dei deck dei personaggi.
 */
(function () {
    'use strict';

    /** Punteggio diagnostico dello stato, conservato per strumenti e test. */
    function evaluateBoard(gameState, io = 'bot') {
        const avversario = Tavolo.avversario(io);
        let score = (Tavolo.lp(io, gameState) - Tavolo.lp(avversario, gameState)) / 100;
        const potenza = (campo) => campo.reduce((somma, slot) => {
            if (!slot) return somma;
            return somma + (slot.isFaceDown ? 400 : AI_SHARED.effAtk(slot.card));
        }, 0);
        score += (potenza(Tavolo.mostri(io, gameState)) - potenza(Tavolo.mostri(avversario, gameState))) / 100;
        score += (Tavolo.mano(io, gameState).length - Tavolo.mano(avversario, gameState).length) * 3;
        return score;
    }

    function chooseSummon(gameState, io = 'bot') {
        return AI_MEDIUM.chooseSummon(gameState, io);
    }

    function chooseAttackTarget(attackerSlot, opponentMonsters, io = 'bot') {
        const sceltaMedia = AI_MEDIUM.chooseAttackTarget(attackerSlot, opponentMonsters, io);
        if (sceltaMedia === null || sceltaMedia === -1) return sceltaMedia;

        const bersaglio = opponentMonsters.find((item) => item.index === sceltaMedia);
        if (bersaglio && bersaglio.slot.isFaceDown) {
            const attacco = AI_SHARED.effAtk(attackerSlot.card);
            // In Difesa coperta statRilevante legge la DEF effettiva; il
            // controllo resta corretto anche per rare carte coperte in ATK.
            if (attacco <= AI_SHARED.statRilevante(bersaglio.slot)) return null;
        }
        return sceltaMedia;
    }

    function chooseChainResponse(candidates, io = 'bot') {
        return AI_MEDIUM.chooseChainResponse(candidates, io);
    }

    function chooseNextSpellTrapAction(gameState, usedThisTurn, io = 'bot') {
        usedThisTurn = usedThisTurn || {};
        const statoMedia = {
            activateDone: (usedThisTurn.activateCount || 0) > 0,
            setDone: (usedThisTurn.setCount || 0) > 0
        };
        const scelta = AI_MEDIUM.chooseNextSpellTrapAction(gameState, statoMedia, io);
        if (scelta && scelta.action === 'activate') usedThisTurn.activateCount = (usedThisTurn.activateCount || 0) + 1;
        if (scelta && scelta.action === 'set') usedThisTurn.setCount = (usedThisTurn.setCount || 0) + 1;
        return scelta;
    }

    // Le carte coperte si attivano nella loro finestra di Chain. Un generico
    // canActivate in Main Phase non conosce il contesto e in passato faceva
    // consumare a Hard Trappole reattive nel momento sbagliato.
    function chooseSetCardActivation() {
        return null;
    }

    window.AI_HARD = {
        evaluateBoard,
        chooseSummon,
        chooseAttackTarget,
        chooseChainResponse,
        chooseNextSpellTrapAction,
        chooseSetCardActivation
    };
})();
