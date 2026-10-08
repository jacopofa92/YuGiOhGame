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

    /**
     * Prima dell'Evocazione Normale Hard può usare una Magia che aumenta
     * subito le opzioni in mano. Farlo dopo l'Evocazione, come nel turno
     * lineare della Media, rende inutilizzabile fino al turno seguente un
     * eventuale mostro migliore appena pescato/cercato.
     *
     * Il filtro è volutamente stretto: niente ricariche con scarto, costi,
     * blocchi ai danni o Draw Phase saltate. Quelle richiedono una vera
     * valutazione del costo e restano nel flusso normale.
     */
    function choosePreSummonSpellAction(gameState, io = 'bot') {
        const mano = Tavolo.mano(io, gameState);
        const candidate = mano
            .map((card, handIndex) => ({ card, handIndex }))
            .filter(({ card, handIndex }) => {
                if (!card || card.type !== 'spell') return false;
                const testo = card.effect || '';
                const generaOpzioni = /(?:^|[.;]\s*)pesca \d+ carte?\b|aggiungi .* dal tuo Deck alla (?:tua )?mano/i.test(testo);
                const costoRischioso = /scarta|salta|non subisce danni|rimescola.*tua mano|paga \d+ Life Points/i.test(testo);
                return generaOpzioni && !costoRischioso
                    && window.DuelEngine && DuelEngine.canActivate(io, 'hand', handIndex);
            })
            .sort((a, b) => AI_SHARED.scoreCardImpact(b.card) - AI_SHARED.scoreCardImpact(a.card));
        if (!candidate.length) return null;
        return { handIndex: candidate[0].handIndex, card: candidate[0].card, action: 'activate' };
    }

    /**
     * Ordina gli attaccanti dal meno potente al più potente. In presenza di
     * più difensori questo equivale a usare la forza minima necessaria per
     * ogni rimozione e conserva il mostro più forte per l'ultimo bersaglio
     * o per l'attacco diretto che può chiudere il duello.
     */
    function orderAttackers(attackers) {
        return [...attackers].sort((a, b) => {
            const differenza = AI_SHARED.effAtk(a.slot.card) - AI_SHARED.effAtk(b.slot.card);
            return differenza || a.index - b.index;
        });
    }

    /**
     * Stima in sola lettura se gli attaccanti pronti possono eliminare tutti
     * i mostri visibili/coperti e infliggere con i rimanenti danni sufficienti
     * a chiudere il duello. Non esegue effetti e non promette il letale contro
     * Trappole: serve a riconoscere una linea disponibile, non a barare sulla
     * futura Chain.
     */
    function estimateLethal(attackers, defenders, opponentLp, io = 'bot') {
        const attacchi = orderAttackers(attackers).map((item) => AI_SHARED.effAtk(item.slot.card));
        const difese = defenders.map((item) => ({
            forza: AI_SHARED.statRilevante(item.slot),
            distruttibile: AI_SHARED.canBeDestroyedByBattle(item.slot.card, Tavolo.avversario(io), Infinity)
        })).sort((a, b) => a.forza - b.forza);

        for (const difesa of difese) {
            if (!difesa.distruttibile) return { possible: false, damage: 0 };
            const indice = attacchi.findIndex((atk) => atk > difesa.forza);
            if (indice === -1) return { possible: false, damage: 0 };
            attacchi.splice(indice, 1);
        }
        const damage = attacchi.reduce((somma, atk) => somma + atk, 0);
        return { possible: damage >= opponentLp, damage };
    }

    /**
     * Mostri rimasti in Difesa da turni precedenti tornano in Attacco solo
     * quando possono produrre pressione immediata: campo avversario vuoto
     * oppure almeno un bersaglio che il loro ATK effettivo supera. Il flag
     * canChangePosition mantiene tutte le regole su Evocazione e cambio già
     * effettuato; l'esecutore del comando resta l'ultima autorità.
     */
    function choosePositionChanges(gameState, io = 'bot') {
        const avversari = Tavolo.mostri(Tavolo.avversario(io), gameState)
            .filter(Boolean);
        return Tavolo.mostri(io, gameState)
            .map((slot, index) => ({ slot, index }))
            .filter(({ slot }) => {
                if (!slot || !slot.canChangePosition || slot.position !== 'defense') return false;
                const atk = AI_SHARED.effAtk(slot.card);
                if (atk <= 0) return false;
                if (avversari.length === 0) return true;
                return avversari.some((bersaglio) => atk > AI_SHARED.statRilevante(bersaglio));
            })
            .map(({ index }) => index);
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

    // Le carte coperte restano nella loro finestra di Chain. Anche gli
    // Ignition richiedono una strategia specifica per la carta: il solo
    // testo non basta a valutarne costi e timing senza rischiare sprechi.
    function chooseSetCardActivation() {
        return null;
    }

    window.AI_HARD = {
        evaluateBoard,
        chooseSummon,
        choosePreSummonSpellAction,
        orderAttackers,
        estimateLethal,
        choosePositionChanges,
        chooseAttackTarget,
        chooseChainResponse,
        chooseNextSpellTrapAction,
        chooseSetCardActivation
    };
})();
