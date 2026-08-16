/**
 * multiplayer.js — Relay delle mosse remote DURANTE un Duello Multiplayer
 * già avviato.
 * ---------------------------------------------------------------
 * Questo file si occupa SOLO di ricevere le mosse dell'avversario via rete
 * e applicarle al lato "bot" locale (stessa convenzione già usata dal
 * motore di gioco per la modalità contro l'IA: ognuno vede sé stesso come
 * "player" e l'altro come "bot"), riusando dove possibile le stesse
 * funzioni di rendering/effetti già presenti nel gioco (incluso
 * botExecuteAttack di bot.js per la risoluzione delle battaglie).
 *
 * La LOBBY (creazione/adesione a una stanza, in attesa di un avversario)
 * vive altrove — vedi js/mp-lobby.js, caricato da multiplayer.html — che è
 * anche chi carica QUESTO file, e solo DOPO che la stanza si è riempita:
 * a quel punto window.MULTIPLAYER_MODE/MP_startingRole/MP_broadcast sono
 * già stati impostati, e window.DuelNetwork ha già una connessione aperta
 * (la stessa usata per la lobby: nessuna riconnessione, nessuna pagina
 * nuova — vedi js/mp-lobby.js per il perché).
 */
(function () {
    'use strict';

    const net = window.DuelNetwork;

    // ============================================================
    // Applicazione delle azioni remote (mosse dell'avversario)
    // ============================================================
    function applyRemoteAction(action) {
        if (!action || !window.MULTIPLAYER_MODE) return;
        window.MP_applyingRemote = true;
        try {
            switch (action.kind) {
                case 'phase': applyRemotePhase(action.name); break;
                case 'summon': applyRemoteSummon(action); break;
                case 'tribute': applyRemoteTribute(action); break;
                case 'position': applyRemotePosition(action); break;
                case 'spelltrap': applyRemoteSpellTrap(action); break;
                case 'attack': applyRemoteAttack(action); break;
                case 'activate': applyRemoteActivate(action); break;
                default: break;
            }
        } finally {
            window.MP_applyingRemote = false;
        }
    }

    function applyRemotePhase(name) {
        switch (name) {
            case 'draw': enterDrawPhase(false); break;
            case 'standby': enterStandbyPhase(false); break;
            case 'main1': enterMainPhase1(); break;
            case 'battle': enterBattlePhase(); break;
            case 'main2': enterMainPhase2(); break;
            case 'end': enterEndPhase(); break;
            default: break;
        }
    }

    function applyRemoteSummon(action) {
        const { card, slotIndex, position } = action;
        if (gameState.botHand.length > 0) gameState.botHand.pop(); // consuma una carta segnaposto
        gameState.botMonsterField[slotIndex] = { card, position, isFaceDown: position === 'defense', hasAttacked: false, canChangePosition: false };
        gameState.hasNormalSummoned = true;
        addToLog(position === 'attack' ? `🧑 L'avversario ha Evocato ${card.name}!` : '🧑 L\'avversario ha Posizionato un mostro.');
        updateUI();
        setTimeout(() => {
            triggerFieldImpact('bot', slotIndex, 'monster');
            showPositionEffect('bot', slotIndex, position);
            if (window.FX) {
                const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-index="${slotIndex}"] .card`);
                FX.playSummonCircle(cardEl);
            }
        }, 30);
    }

    function applyRemoteTribute(action) {
        const { indices } = action;
        addToLog('🔻 L\'avversario sacrifica dei mostri per un\'Evocazione Tributo...');
        indices.forEach((idx) => {
            const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-owner="bot"][data-type="monster"][data-index="${idx}"] .card`);
            if (cardEl && window.FX) FX.playTributeSacrifice(cardEl);
        });
        setTimeout(() => {
            indices.forEach((idx) => {
                const slot = gameState.botMonsterField[idx];
                if (slot) {
                    gameState.botGraveyard.push(slot.card);
                    gameState.botMonsterField[idx] = null;
                }
            });
            updateUI();
        }, 700);
    }

    function applyRemotePosition(action) {
        const { slotIndex, position } = action;
        const slot = gameState.botMonsterField[slotIndex];
        if (!slot) return;
        slot.position = position;
        if (position === 'attack') slot.isFaceDown = false;
        slot.canChangePosition = false;
        addToLog(`🧑 L'avversario ha cambiato ${slot.card.name} in Posizione di ${position}.`);
        updateUI();
        setTimeout(() => showPositionEffect('bot', slotIndex, position), 60);
    }

    function applyRemoteSpellTrap(action) {
        const { card, slotIndex } = action;
        if (gameState.botHand.length > 0) gameState.botHand.pop();
        gameState.botSTField[slotIndex] = { card, isFaceDown: true, setOnTurn: gameState.turn };
        addToLog('🧑 L\'avversario ha piazzato una carta coperta sul Terreno.');
        updateUI();
    }

    function applyRemoteAttack(action) {
        const { attackerIndex, targetIndex } = action;
        if (typeof botExecuteAttack === 'function') botExecuteAttack(attackerIndex, targetIndex);
    }

    /**
     * Replica sul lato "bot" locale l'attivazione di una carta fatta
     * dall'avversario reale. Come per le altre azioni remote, NON si
     * ritira nessun caso/scelta casuale qui: chi ha attivato la carta ha
     * già deciso/risolto tutto (es. quale mostro rianimare con Rinascita
     * del Mostro) e l'azione trasmessa porta già l'esito, in `action`
     * oltre a owner/cardId/zone/index — vedi DuelEngine.activateCard in
     * js/duel-engine.js, che passa `extra` (l'esito) dentro il messaggio.
     */
    function applyRemoteActivate(action) {
        DuelEngine.activateCard('bot', action.zone, action.index, action);
    }

    function showOpponentLeftBanner() {
        if (document.getElementById('mpOpponentLeftBanner')) return;
        const banner = document.createElement('div');
        banner.id = 'mpOpponentLeftBanner';
        banner.className = 'mp-opponent-left-banner';
        banner.innerHTML = `
            <span>⚠️ Il tuo avversario si è disconnesso dalla partita.</span>
            <a href="index.html">Torna al Menu</a>
        `;
        document.body.appendChild(banner);
    }

    net.on('opponent-left', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('⚠️ Il tuo avversario si è disconnesso dalla partita.');
        showOpponentLeftBanner();
    });

    net.on('disconnected', () => {
        if (window.MULTIPLAYER_MODE && typeof addToLog === 'function') {
            addToLog('⚠️ Connessione al server persa.');
        }
    });

    net.on('game-action', (msg) => applyRemoteAction(msg.action));
})();
