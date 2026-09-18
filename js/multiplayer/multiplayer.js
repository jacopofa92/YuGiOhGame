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
 * vive altrove — vedi js/multiplayer/mp-lobby.js, caricato da multiplayer.html — che è
 * anche chi carica QUESTO file, e solo DOPO che la stanza si è riempita:
 * a quel punto window.MULTIPLAYER_MODE/MP_startingRole/MP_broadcast sono
 * già stati impostati, e window.DuelNetwork ha già una connessione aperta
 * (la stessa usata per la lobby: nessuna riconnessione, nessuna pagina
 * nuova — vedi js/multiplayer/mp-lobby.js per il perché).
 */
(function () {
    'use strict';

    const net = window.DuelNetwork;

    // Ogni azione broadcastata porta con sé anche il checksum del PROPRIO
    // stato subito dopo averla eseguita — vedi applyRemoteAction più sotto,
    // che lo confronta col proprio per accorgersi di un disallineamento
    // (js/multiplayer/mp-lobby.js assegna window.MP_broadcast PRIMA di caricare questo
    // file, vedi loadDuelArena lì: qui lo avvolgiamo, non lo sostituiamo).
    const rawBroadcast = window.MP_broadcast;
    window.MP_broadcast = function (action) {
        // Il checksum è solo un extra diagnostico (vedi applyRemoteAction
        // più sotto): un suo errore non deve MAI impedire l'invio
        // dell'azione vera e propria, che resta la priorità assoluta.
        try {
            if (window.DuelEngine && typeof DuelEngine.computeStateChecksum === 'function') {
                action.checksum = DuelEngine.computeStateChecksum();
            }
        } catch (err) {
            console.warn('Impossibile calcolare il checksum anti-desync:', err);
        }
        rawBroadcast(action);
    };

    // ============================================================
    // Applicazione delle azioni remote (mosse dell'avversario)
    // ============================================================
    function applyRemoteAction(action) {
        if (!action || !window.MULTIPLAYER_MODE) return;
        // 'request-resync'/'state-sync' non sono mosse di gioco (non
        // toccano gameState.player*, solo gameState.bot*): restano FUORI
        // dal blocco MP_applyingRemote qui sotto, che serve solo a evitare
        // che le mosse VERE ribroadcastino se stesse all'avversario.
        if (action.kind === 'request-resync') { sendStateResync(); return; }
        if (action.kind === 'state-sync') { applyStateResync(action.state); return; }
        // Fine partita dichiarata dall'avversario (LP a zero, resa, deck
        // out...): l'esito arriva già ROVESCIATO dal suo punto di vista
        // (vedi endDuel in js/engine/game-flow.js), qui si applica e basta.
        // Va gestita PRIMA del blocco MP_applyingRemote perché endDuel
        // deve vedere quel flag alzato, altrimenti ribroadcasterebbe
        // l'esito all'infinito.
        if (action.kind === 'game-over') { applyRemoteGameOver(action.opponentWon); return; }
        // Decisione di risposta in Chain ("rispondo con questa carta" /
        // "passo"): non è una mossa già avvenuta da replicare, è la
        // risposta a una domanda che questo client sta aspettando — la
        // gestisce il motore (vedi askResponder in js/engine/duel-engine.js).
        // Fuori dal blocco MP_applyingRemote, e fuori dal confronto dei
        // checksum più sotto: a metà Chain i due lati sono legittimamente
        // a punti diversi della risoluzione, confrontarli lì darebbe un
        // falso allarme ad ogni singola risposta.
        if (action.kind === 'chain-response') {
            if (window.DuelEngine && typeof DuelEngine.applyRemoteChainDecision === 'function') {
                DuelEngine.applyRemoteChainDecision(action);
            }
            return;
        }
        window.MP_applyingRemote = true;
        try {
            switch (action.kind) {
                case 'phase': applyRemotePhase(action.name); break;
                case 'summon': applyRemoteSummon(action); break;
                case 'tribute': applyRemoteTribute(action); break;
                case 'position': applyRemotePosition(action); break;
                case 'spelltrap': applyRemoteSpellTrap(action); break;
                case 'fieldspell': applyRemoteFieldSpell(action); break;
                case 'attack': applyRemoteAttack(action); break;
                case 'activate': applyRemoteActivate(action); break;
                default: break;
            }
        } finally {
            window.MP_applyingRemote = false;
        }
        // Anti-desync: ogni mossa in arrivo porta anche il checksum dello
        // stato del MITTENTE subito dopo averla applicata (vedi il
        // wrapping di MP_broadcast più sotto) — se il MIO checksum, appena
        // ricalcolato, non combacia, i due lati si sono disallineati e
        // chiedo subito un aggiornamento invece di proseguire
        // silenziosamente storto.
        if (action.checksum && window.DuelEngine && typeof DuelEngine.computeStateChecksum === 'function') {
            if (DuelEngine.computeStateChecksum() !== action.checksum) {
                addToLog('⚠️ Stato del duello non allineato con l\'avversario: richiedo un aggiornamento...');
                requestStateResync();
            }
        }
    }

    // ============================================================
    // Resync di stato pubblico (Multiplayer Avanzato) — usato sia dopo una
    // riconnessione (vedi net.on('reconnected', ...) più sotto) sia su un
    // disallineamento rilevato dal checksum qui sopra. Vedi
    // DuelEngine.serializePublicState in js/engine/duel-engine.js per cosa viene
    // davvero trasmesso (mai il contenuto della mano, solo il conteggio).
    // ============================================================

    function requestStateResync() {
        if (window.MP_broadcast) window.MP_broadcast({ kind: 'request-resync' });
    }

    function sendStateResync() {
        if (!window.DuelEngine || typeof DuelEngine.serializePublicState !== 'function') return;
        window.MP_broadcast({ kind: 'state-sync', state: DuelEngine.serializePublicState('player') });
    }

    function applyStateResync(state) {
        if (!state) return;
        window.MP_applyingRemote = true;
        try {
            gameState.botMonsterField = state.monsterField;
            gameState.botSTField = state.stField;
            gameState.botFieldSpell = state.fieldSpell;
            gameState.botGraveyard = state.graveyard;
            // Mano: solo il conteggio è mai stato trasmesso — ricostruita
            // con segnaposto, mai col contenuto vero (stesso spirito di
            // applyRemoteSummon/applyRemoteSpellTrap qui sotto, che
            // consumano un segnaposto da gameState.botHand invece di
            // conoscerne il contenuto).
            gameState.botHand = Array.from({ length: state.handCount }, (_, i) => ({ id: -1, uid: `resync_${Date.now()}_${i}`, name: '???', type: 'monster' }));
            gameState.botLP = state.lp;
            gameState.turn = state.turn;
            gameState.phase = state.phase;
            gameState.currentPlayer = state.currentPlayer;
            addToLog('🔄 Stato del duello risincronizzato con l\'avversario.');
            updateUI();
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
                const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-type="monster"][data-index="${slotIndex}"] .card`);
                // Stesso fix di js/ai/bot.js: FX.playMonsterSummonEffect (non
                // il solo cerchio generico) controlla anche un eventuale
                // filmato dedicato/la convergenza elementale di Livello 7+,
                // così l'avversario reale in Multiplayer ottiene lo stesso
                // trattamento visivo del giocatore per la stessa carta.
                FX.playMonsterSummonEffect(card, cardEl);
            }
        }, 30);
        // Finestra di risposta all'Evocazione AVVERSARIA (Buco Trappola e
        // simili). Mancava del tutto: solo il client di chi evocava apriva
        // questa finestra, e lì il rispondente è il lato 'bot' — cioè una
        // persona su un altro computer, a cui nessuno stava davvero
        // chiedendo nulla. Il risultato era che l'avversario non poteva MAI
        // rispondere a un'Evocazione: o non gli veniva chiesto, o gli veniva
        // chiesto dall'euristica dell'IA al posto suo. Ora la domanda arriva
        // qui, a chi ha davvero le carte, e la risposta torna indietro
        // (messaggio 'chain-response', vedi askResponder in duel-engine.js).
        const summonCtx = DuelEngine.makeContext('bot', { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: position });
        DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_NORMAL_SUMMON, summonCtx, () => updateUI());
    }

    /**
     * Carte che l'avversario ha sacrificato come Tributo.
     *
     * Il messaggio porta tutto quello che serve per fare di qua ESATTAMENTE
     * quello che ha fatto di là (vedi performTributeSacrifice/
     * performAttackTribute/performGearCastleTributeSacrifice in
     * js/engine/actions.js): quali indici spariscono, da quale zona,
     * DOPO QUANTO (0 se non c'è animazione da aspettare) e, solo per una
     * vera Evocazione Tributo, quale mostro si sta Evocando grazie a quel
     * sacrificio.
     *
     * Il mostro da Evocare NON serve per l'Evocazione in sé — quella
     * arriva col suo messaggio 'summon' subito dopo, e porta con sé anche
     * `_tributedCardIds` (Chimera Gadjiltron id 825), scritto dal
     * mittente prima di trasmetterla. Serve a `notifySacrificedForTribute`
     * qui sotto, per le carte che reagiscono a PER COSA sono state
     * sacrificate.
     */
    function applyRemoteTribute(action) {
        const indices = action.indices || [];
        const suSTField = action.zone === 'st';
        const campo = suSTField ? gameState.botSTField : gameState.botMonsterField;
        // Un mittente più vecchio di questo campo non lo manda e aspettava
        // sempre l'animazione: restare su quel valore evita di
        // disallinearsi con lui (i due client possono avere versioni
        // diverse, se il Service Worker di uno dei due serve ancora la
        // precedente).
        const attesa = typeof action.delayMs === 'number' ? action.delayMs : 700;
        addToLog(action.summonedCard
            ? '🔻 L\'avversario sacrifica per un\'Evocazione Tributo...'
            : '🔻 L\'avversario sacrifica una carta come costo...');

        if (attesa <= 0) {
            rimuoviCarteSacrificate(campo, indices, suSTField, action.summonedCard);
            return;
        }
        indices.forEach((idx) => {
            const cardEl = document.querySelector(`#botFieldBoard .field-slot[data-owner="bot"][data-type="${suSTField ? 'st' : 'monster'}"][data-index="${idx}"] .card`);
            if (cardEl && window.FX) FX.playTributeSacrifice(cardEl);
        });
        setTimeout(() => rimuoviCarteSacrificate(campo, indices, suSTField, action.summonedCard), attesa);
    }

    /**
     * Toglie davvero le carte sacrificate e fa scattare gli stessi due
     * avvisi del motore che il lato di chi sacrifica fa partire.
     *
     * Quegli avvisi mancavano del tutto: una carta che reagisce al proprio
     * sacrificio (Abbandonato id 416 restituisce il mostro assorbito) o al
     * sacrificio di un compagno (`onOwnMonsterDestroyedPassive`) scattava
     * su un client solo, e `notifySacrificedForTribute` porta con sé anche
     * il redirect al bando di `mustBanishOnLeavingField` — quindi la stessa
     * carta finiva bandita di là e nel Cimitero di qua. Il checksum se ne
     * accorgeva e il resync rimetteva a posto, ma ad ogni singolo Tributo.
     *
     * Rifare qui la stessa reazione NON la esegue due volte: un handler
     * reattivo non passa da `DuelEngine.activateCard`, quindi non trasmette
     * nulla — è lo stesso principio per cui applyRemoteSummon fa scattare
     * i trigger di Evocazione e applyRemoteAttack risolve tutta la
     * battaglia in locale. `MP_applyingRemote` resta comunque alzato per
     * l'intera durata, che è il motivo per cui questo blocco è una
     * funzione a parte: girando dentro un setTimeout, è già FUORI dal
     * try/finally di applyRemoteAction, e senza la guardia un effetto che
     * arrivasse ad attivare una carta rimanderebbe indietro al mittente
     * una mossa che lui ha già fatto.
     */
    function rimuoviCarteSacrificate(campo, indices, suSTField, summonedCard) {
        window.MP_applyingRemote = true;
        try {
            indices.forEach((idx) => {
                const slot = campo[idx];
                if (!slot) return;
                gameState.botGraveyard.push(slot.card);
                campo[idx] = null;
                if (!window.DuelEngine) return;
                // Solo per la zona Mostro: "un mio mostro è finito al
                // Cimitero" non riguarda una carta della zona Magia/
                // Trappola (Castello dell'Ingranaggio Antico id 843), e il
                // mittente infatti non lo chiama per lei.
                if (!suSTField) DuelEngine.notifyOwnMonsterSentToGraveyard('bot', slot.card);
                DuelEngine.notifySacrificedForTribute('bot', slot.card, summonedCard || null);
            });
            updateUI();
        } finally {
            window.MP_applyingRemote = false;
        }
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

    /**
     * Magia Terreno Settata dall'avversario.
     *
     * Questo caso MANCAVA: actions.js trasmetteva già `kind: 'fieldspell'`
     * ma qui non c'era il ramo corrispondente, quindi l'azione finiva nel
     * `default: break` e spariva. Il risultato non era un silenzio
     * innocuo: il conteggio della mano dell'avversario non calava, e il
     * conteggio della mano ENTRA nel checksum anti-desync — quindi ogni
     * Magia Terreno faceva divergere i checksum, comparire l'avviso
     * "stato non allineato" e scattare un resync completo. Si riparava da
     * sé, ma rumorosamente e a ogni singola Magia Terreno giocata.
     */
    function applyRemoteFieldSpell(action) {
        const { card } = action;
        if (gameState.botHand.length > 0) gameState.botHand.pop(); // consuma una carta segnaposto
        gameState.botFieldSpell = { card, isFaceDown: true, setOnTurn: gameState.turn };
        addToLog('🧑 L\'avversario ha piazzato una Magia Terreno coperta.');
        updateUI();
    }

    /**
     * L'avversario ha dichiarato la fine del duello. `opponentWon` è già
     * espresso dal NOSTRO punto di vista (vedi endDuel), quindi si passa
     * dritto a endDuel — con MP_applyingRemote alzato, così non rimbalza
     * indietro l'annuncio che abbiamo appena ricevuto.
     */
    function applyRemoteGameOver(opponentWon) {
        if (gameState.gameOver) return; // già finito da questo lato: nulla da fare
        window.MP_applyingRemote = true;
        try {
            if (typeof endDuel === 'function') endDuel(opponentWon);
        } finally {
            window.MP_applyingRemote = false;
        }
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
     * js/engine/duel-engine.js, che passa `extra` (l'esito) dentro il messaggio.
     */
    function applyRemoteActivate(action) {
        DuelEngine.activateCard('bot', action.zone, action.index, action);
    }

    /**
     * Un solo banner in cima allo schermo, riusato per tutti gli stati di
     * connessione del Multiplayer Avanzato (prima c'era solo lo stato
     * "avversario uscito", definitivo) — `permanent: true` aggiunge il
     * link al Menu (nessun ritorno automatico atteso), altrimenti il
     * banner è pensato per essere sostituito o rimosso a breve.
     */
    function showMpBanner(message, { permanent = false } = {}) {
        let banner = document.getElementById('mpConnectionBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'mpConnectionBanner';
            banner.className = 'mp-opponent-left-banner';
            document.body.appendChild(banner);
        }
        banner.innerHTML = permanent
            ? `<span>${message}</span><a href="index.html">Torna al Menu</a>`
            : `<span>${message}</span>`;
    }

    function hideMpBanner() {
        const banner = document.getElementById('mpConnectionBanner');
        if (banner) banner.remove();
    }

    // --- Stato dell'AVVERSARIO (la sua connessione, non la nostra) ---
    net.on('opponent-left', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('⚠️ Il tuo avversario si è disconnesso dalla partita.');
        showMpBanner('⚠️ Il tuo avversario si è disconnesso dalla partita.', { permanent: true });
    });

    net.on('opponent-disconnected', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('🔌 Il tuo avversario ha perso la connessione, in attesa che torni...');
        showMpBanner('🔌 Il tuo avversario ha perso la connessione, in attesa che torni...');
    });

    net.on('opponent-reconnected', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('✅ Il tuo avversario è tornato in partita!');
        showMpBanner('✅ Il tuo avversario è tornato in partita!');
        setTimeout(hideMpBanner, 3000);
    });

    // --- Stato della NOSTRA connessione (vedi js/multiplayer/network.js) ---
    net.on('reconnecting', (attempt) => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog(`🔌 Connessione persa, tentativo di riconnessione (${attempt})...`);
        showMpBanner(`🔌 Connessione persa, tentativo di riconnessione (${attempt})...`);
    });

    net.on('reconnected', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('✅ Riconnesso! Aggiorno lo stato del duello...');
        showMpBanner('✅ Riconnesso! Aggiorno lo stato del duello...');
        setTimeout(hideMpBanner, 3000);
        // Potremmo aver perso azioni dell'avversario mentre eravamo
        // disconnessi: chiediamogli subito il suo stato pubblico attuale
        // (vedi DuelEngine.serializePublicState in js/engine/duel-engine.js).
        requestStateResync();
    });

    net.on('reconnect-failed', () => {
        if (!window.MULTIPLAYER_MODE) return;
        if (typeof addToLog === 'function') addToLog('❌ Impossibile riconnettersi al server.');
        showMpBanner('❌ Impossibile riconnettersi al server.', { permanent: true });
    });

    net.on('disconnected', () => {
        if (window.MULTIPLAYER_MODE && typeof addToLog === 'function') {
            addToLog('⚠️ Connessione al server persa.');
        }
    });

    net.on('game-action', (msg) => applyRemoteAction(msg.action));
})();
