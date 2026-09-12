/**
 * ai-medium.js — Livello di difficoltà "Media": è l'euristica ORIGINALE
 * del bot (quella che questo gioco ha sempre avuto prima dell'IA
 * multilivello), spostata qui parola per parola — nessuna riscrittura —
 * così resta il comportamento di DEFAULT, identico a prima per chi non
 * sceglie esplicitamente Facile/Difficile. Vedi js/ai/ai-controller.js
 * per come si sceglie il livello, e js/ai/bot.js per chi esegue davvero la
 * decisione (animazioni, timer, stato).
 */
(function () {
    'use strict';

    /**
     * Sceglie il miglior mostro evocabile dalla mano del bot, rispettando la
     * regola dei Tributi: preferisce il mostro con l'ATK più alto tra quelli
     * che il bot può effettivamente Evocare in questo momento. Ritorna
     * { card, tributeIndices, emptySlotHint, position, faceDown } o null se
     * non può evocare nulla ora. Postura (Attacco/Difesa coperta/Difesa
     * scoperta): AI_SHARED.decideMonsterPosture (js/ai/ai-shared.js) — un
     * piccolo passo di intelligenza posizionale anche per questo livello,
     * non solo per Difficile.
     *
     * Per un'Evocazione Tributo, sacrifica i mostri più DEBOLI del campo
     * (non i primi che capitano), e SALTA del tutto il candidato se il
     * risultato sarebbe una mossa in perdita netta — es. sacrificare due
     * mostri da 2500 ATK per evocarne uno da 2500 ATK non è mai
     * accettabile, anche se è l'unico Tributo disponibile in mano: meglio
     * non evocare nulla questo turno che indebolirsi da soli.
     */
    function chooseSummon(gameState) {
        const candidates = [...gameState.botHand]
            .filter((card) => card.type === 'monster'
                && (!window.AI_SHARED || AI_SHARED.canNormalSummonNow(card, gameState, 'bot'))
                && !(window.AI_SHARED && AI_SHARED.shouldHoldForExodia(card)))
            .sort((a, b) => b.attack - a.attack);

        for (const card of candidates) {
            const tributesNeeded = getTributesRequired(card);
            const posture = (window.AI_SHARED && AI_SHARED.decideMonsterPosture(card, gameState, 'bot')) || { position: 'attack', faceDown: false };
            if (tributesNeeded === 0) {
                const emptySlot = gameState.botMonsterField.findIndex((slot) => slot === null);
                if (emptySlot !== -1) return { card: card, tributeIndices: [], emptySlotHint: emptySlot, position: posture.position, faceDown: posture.faceDown };
            } else {
                // Simorgh (id 772): tutti i Sacrifici devono essere mostri
                // VENTO — stesso vincolo applicato lato giocatore in
                // actions.js (handleTributeSelectClick).
                let ownIndices = gameState.botMonsterField
                    .map((slot, idx) => (slot ? idx : null))
                    .filter((idx) => idx !== null);
                if (card.id === 772) {
                    ownIndices = ownIndices.filter((idx) => gameState.botMonsterField[idx].card.attribute === 'VENTO');
                }
                if (ownIndices.length < tributesNeeded) continue;
                const tributeIndices = [...ownIndices]
                    .sort((a, b) => gameState.botMonsterField[a].card.attack - gameState.botMonsterField[b].card.attack)
                    .slice(0, tributesNeeded);
                const sacrificedValue = tributeIndices.reduce((sum, idx) => sum + gameState.botMonsterField[idx].card.attack, 0);
                // AI_SHARED.isTributeSummonWorthwhile: non solo "non in
                // perdita netta" (il vecchio veto, ancora il primo
                // controllo al suo interno), ma adattivo al campo
                // avversario — non passare a un mostro con ATK più basso
                // ma DEF più alta a meno che l'avversario non abbia
                // davvero un mostro che lo giustifichi (richiesta
                // esplicita dell'utente).
                const tributeOk = window.AI_SHARED
                    ? AI_SHARED.isTributeSummonWorthwhile(card, sacrificedValue, gameState, 'bot')
                    : Math.max(card.attack, card.defense) > sacrificedValue;
                if (!tributeOk) continue;
                return { card: card, tributeIndices: tributeIndices, emptySlotHint: -1, position: posture.position, faceDown: posture.faceDown };
            }
        }
        return null;
    }

    /**
     * Sceglie contro quale mostro del giocatore conviene attaccare, invece di
     * puntare sempre e comunque al primo che capita:
     *   - un mostro SCOPERTO ha le statistiche note, quindi si attacca
     *     solo se conviene DAVVERO (ATK maggiore dell'ATK avversario se è in
     *     Posizione di Attacco, o della DEF se è in Posizione di Difesa);
     *   - un mostro COPERTO resta un azzardo lecito (statistiche ignote);
     *   - campo avversario vuoto -> sempre attacco diretto (-1);
     *   - nessun bersaglio conveniente -> null (trattiene il mostro).
     */
    function chooseAttackTarget(attackerSlot, playerMonsters) {
        if (playerMonsters.length === 0) {
            // "Non può attaccare direttamente" (es. Zombyra l'Oscuro, id
            // 625): niente bersaglio-mostro disponibile E l'attacco
            // diretto è comunque vietato per questa carta -> trattiene.
            const attackerDef = window.DuelEngine && DuelEngine.getDefinition(attackerSlot.card.id);
            if (attackerDef && attackerDef.cannotAttackDirectly) return null;
            return -1;
        }

        const attackerAtk = attackerSlot.card.attack;
        const faceDownTargets = playerMonsters.filter((m) => m.slot.isFaceDown);
        const favorableFaceUp = playerMonsters
            .filter((m) => !m.slot.isFaceDown)
            .filter((m) => attackerAtk > (m.slot.position === 'attack' ? m.slot.card.attack : m.slot.card.defense))
            // Un mostro che comunque non verrebbe distrutto (es.
            // cannotBeDestroyedByBattle) non è mai un bersaglio
            // "conveniente" solo perché la statistica nominale è
            // favorevole — richiesta esplicita dell'utente: non insistere
            // a puntare un mostro che non si può distruggere, valutare
            // altre strategie (altro bersaglio più sotto, attacco
            // diretto, o trattenere l'attaccante).
            .filter((m) => !window.AI_SHARED || AI_SHARED.canBeDestroyedByBattle(m.slot.card, 'player', attackerAtk));

        if (favorableFaceUp.length > 0) {
            favorableFaceUp.sort((a, b) => {
                const statA = a.slot.position === 'attack' ? a.slot.card.attack : a.slot.card.defense;
                const statB = b.slot.position === 'attack' ? b.slot.card.attack : b.slot.card.defense;
                return statB - statA;
            });
            return favorableFaceUp[0].index;
        }

        if (faceDownTargets.length > 0) return faceDownTargets[0].index;
        // Permesso di attaccare direttamente anche con mostri avversari in
        // campo (es. Sparatore Sonico id 773, Folletto della Fiamma
        // Furente id 681) — usato solo come ultima risorsa, quando nessun
        // bersaglio-mostro sembrava già vantaggioso qui sopra, per non
        // alterare l'euristica esistente quando un buon bersaglio c'è.
        if (gameState.directAttackAllowedUids && gameState.directAttackAllowedUids[attackerSlot.card.uid]) return -1;
        return null;
    }

    /**
     * Decisione nella finestra di priorità della Chain (vedi
     * openTriggerWindow/openActivationWindow in js/engine/duel-engine.js): le
     * carte di risposta di questo gioco sono tutte "puro vantaggio se
     * attivate", quindi risponde sempre con la prima candidata disponibile
     * — stessa euristica che il motore usava prima dell'IA multilivello.
     * UNICA eccezione (richiesta esplicita dell'utente, risposta più
     * selettiva): se OGNI candidata è una rimozione a bersaglio singolo e
     * NESSUNA varrebbe la pena secondo REMOVAL_WORTH_THRESHOLD qui sotto
     * (stessa soglia già usata per non sprecarla in Main Phase), passa
     * senza rispondere — se anche una sola candidata non è pura
     * rimozione, risponde comunque con la prima come sempre.
     */
    function chooseChainResponse(candidates) {
        if (candidates.length === 0) return null;
        if (window.AI_SHARED) {
            const allPureRemoval = candidates.every((c) => AI_SHARED.isSingleTargetRemoval(c.card));
            if (allPureRemoval && !candidates.some((c) => AI_SHARED.isRemovalWorthwhile(c.card, gameState, 'bot', REMOVAL_WORTH_THRESHOLD))) {
                return null;
            }
        }
        return candidates[0];
    }

    // Soglia FISSA (a differenza di IA_DIFFICILE, che la scala in base
    // all'andamento della partita, vedi ai-hard.js): IA_MEDIA non calcola
    // un punteggio campo, resta un'euristica semplice — trattiene una
    // rimozione a bersaglio singolo (vedi AI_SHARED.isRemovalWorthwhile)
    // finché l'avversario non ha almeno un mostro scoperto "che conta
    // davvero" (o uno coperto, rischio accettato), invece di sprecarla sul
    // primo vanilla debole — il difetto segnalato dall'utente.
    const REMOVAL_WORTH_THRESHOLD = 1500;

    /**
     * Decide la PROSSIMA azione da fare con una Magia/Trappola in mano
     * durante la propria Main Phase (js/ai/bot.js la richiama ripetutamente,
     * una carta alla volta, finché ritorna null) — { handIndex, action }
     * con action 'activate' (Magia, subito) o 'set' (Trappola o Magia,
     * coperta sul Terreno). A differenza di IA_DIFFICILE, questo livello
     * resta "modesto": al massimo 1 Trappola Settata e 1 Magia attivata
     * per turno (usedSetThisCall/usedActivateThisCall in gameState,
     * azzerati ad ogni Main Phase — vedi bot.js), e non attiva mai da solo
     * le proprie carte già Set (resta puramente reattivo a quelle, come
     * sempre) — è proprio questa differenza di "quanto usa il proprio
     * retrocampo" a rendere Difficile percepibilmente più aggressivo.
     */
    function chooseNextSpellTrapAction(gameState, usedThisTurn) {
        const hand = gameState.botHand;
        const emptySlot = gameState.botSTField.some((s) => s === null);
        const worthwhile = (card) => !window.AI_SHARED || AI_SHARED.isRemovalWorthwhile(card, gameState, 'bot', REMOVAL_WORTH_THRESHOLD);

        // Restraint (vedi AI_SHARED.getSpellTrapRestraint): quanto la
        // scelta tra più candidate resta "trattenuta"/imprevedibile
        // invece di prendere SEMPRE la più forte in assoluto — combina
        // l'aggressività del personaggio in duello con un bonus extra nei
        // primissimi turni, così l'IA non svuota subito le carte più
        // punitive/aggressive fin dal turno 1 (richiesta esplicita
        // dell'utente: "non tutte subito", "meno punitivo specialmente
        // per IA Normale" — qui applicata con un restraint di base più
        // alto, vedi pickWeighted qui sotto).
        const restraint = Math.min(1, (window.AI_SHARED ? AI_SHARED.getSpellTrapRestraint(gameState) : 0) + 0.15);
        const pickWeighted = (list) => (window.AI_SHARED ? AI_SHARED.pickWeightedByImpact(list, restraint) : list[0]);

        if (!usedThisTurn.activateDone) {
            // Tra tutte le Magie attivabili, una scelta pesata sull'impatto
            // stimato (non più sempre la stessa carta più forte — vedi
            // pickWeightedByImpact), scartando quelle di rimozione che
            // sprecherebbero l'effetto su un bersaglio ancora debole.
            const spells = hand
                .map((card, handIndex) => ({ card, handIndex }))
                .filter((e) => e.card.type === 'spell' && window.DuelEngine && DuelEngine.canActivate('bot', 'hand', e.handIndex) && worthwhile(e.card));
            const chosen = pickWeighted(spells);
            if (chosen) {
                usedThisTurn.activateDone = true;
                return { handIndex: chosen.handIndex, card: chosen.card, action: 'activate' };
            }
        }
        if (!usedThisTurn.setDone && emptySlot) {
            // Stesso principio per la Trappola da Settare (una Trappola Set
            // non ha ancora un bersaglio scelto, quindi qui non serve il
            // controllo "worthwhile").
            const traps = hand
                .map((card, handIndex) => ({ card, handIndex }))
                .filter((e) => e.card.type === 'trap');
            const chosen = pickWeighted(traps);
            if (chosen) {
                usedThisTurn.setDone = true;
                return { handIndex: chosen.handIndex, card: chosen.card, action: 'set' };
            }
        }
        return null;
    }

    /**
     * Vero se conviene attivare ORA una propria carta già Set durante la
     * propria Main Phase (non in risposta a un trigger). IA_MEDIA non lo
     * fa mai: resta puramente reattiva sul proprio retrocampo, per
     * differenziarsi davvero da IA_DIFFICILE (vedi ai-hard.js).
     */
    function chooseSetCardActivation() {
        return null;
    }

    window.AI_MEDIUM = {
        chooseSummon: chooseSummon,
        chooseAttackTarget: chooseAttackTarget,
        chooseChainResponse: chooseChainResponse,
        chooseNextSpellTrapAction: chooseNextSpellTrapAction,
        chooseSetCardActivation: chooseSetCardActivation
    };
})();
