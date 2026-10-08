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
 * di pianificazione superiore: preparazione prima dell'Evocazione, scelta
 * più incisiva di Magie/Trappole e piccoli playbook opzionali. Il vantaggio
 * resta misurato; soprattutto, non cambia l'identità dei deck dei personaggi.
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
        const personaggio = gameState.personaggioPerPosto && gameState.personaggioPerPosto[io];
        if (personaggio === 'seeker') {
            return AI_MEDIUM.chooseSummon(gameState, io, {
                // Il Cacciatore di Exodia non cerca pressione immediata:
                // mette prima in gioco i mostri che, andando al Cimitero,
                // aggiungono un pezzo dal Deck alla mano. Il riconoscimento
                // è semantico, non una lista di id: nuove carte custom con
                // la stessa funzione entrano naturalmente nel piano.
                scoreMonster(card) {
                    const cercaDalDeck = /aggiung(?:i|ere).*alla (?:tua )?mano.*dal Deck/i.test(card.effect || '');
                    return (cercaDalDeck ? 10000 : 0) + (card.attack || 0);
                }
            });
        }
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
                const preparaCampo = card.subtype === 'field';
                const finestraIniziale = /solo all'inizio della Main Phase 1/i.test(testo);
                const costoRischioso = /scarta|salta|non subisce danni|rimescola.*tua mano|paga \d+ Life Points/i.test(testo);
                return (generaOpzioni || preparaCampo || finestraIniziale) && !costoRischioso
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
        const personaggio = gameState.personaggioPerPosto && gameState.personaggioPerPosto[io];
        // Gansley e Noah rendono meglio seguendo il proprio piano di campo
        // senza reagire a statistiche nascoste. Gli altri mantengono la
        // prudenza Hard già misurata nell'audit precedente.
        const seguePianoVisibile = personaggio === 'gansley' || personaggio === 'noah';
        return AI_SHARED.choosePositionChanges(gameState, io, !seguePianoVisibile);
    }

    function chooseAttackTarget(attackerSlot, opponentMonsters, io = 'bot') {
        const sceltaMedia = AI_MEDIUM.chooseAttackTarget(attackerSlot, opponentMonsters, io);
        if (sceltaMedia === null || sceltaMedia === -1) return sceltaMedia;
        const personaggio = gameState.personaggioPerPosto && gameState.personaggioPerPosto[io];
        if (personaggio === 'gansley' || personaggio === 'noah') return sceltaMedia;

        const bersaglio = opponentMonsters.find((item) => item.index === sceltaMedia);
        if (bersaglio && bersaglio.slot.isFaceDown) {
            const attacco = AI_SHARED.effAtk(attackerSlot.card);
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
        // Hard conserva la personalità del duellante ma non il +0,15 di
        // prudenza proprio della Media: a parità di candidate tende quindi
        // più nettamente verso la carta dall'impatto maggiore.
        const scelta = AI_MEDIUM.chooseNextSpellTrapAction(gameState, statoMedia, io, { restraintBonus: 0 });
        if (scelta && scelta.action === 'activate') usedThisTurn.activateCount = (usedThisTurn.activateCount || 0) + 1;
        if (scelta && scelta.action === 'set') usedThisTurn.setCount = (usedThisTurn.setCount || 0) + 1;
        return scelta;
    }

    // Le carte coperte restano nella loro finestra di Chain. Gli Ignition
    // generici continuano a richiedere una strategia specifica; fa eccezione
    // il ciclo auto-coprente dei mostri Flip (Sfingi/Golem/Statue/Medusa):
    // rimettersi coperti è precisamente la preparazione del loro prossimo
    // effetto e non consuma altre risorse. Il riconoscimento dal testo rende
    // la regola disponibile anche a future carte custom equivalenti.
    function chooseSetCardActivation(gameState, io = 'bot') {
        const campo = Tavolo.mostri(io, gameState);
        for (let index = 0; index < campo.length; index++) {
            const slot = campo[index];
            if (!slot || slot.isFaceDown) continue;
            const testo = slot.card.effect || '';
            if (!/puoi girare questa carta coperta in Posizione di Difesa/i.test(testo)) continue;
            if (window.DuelEngine && DuelEngine.canActivate(io, 'monster', index)) {
                return { zone: 'monster', index, card: slot.card };
            }
        }
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
