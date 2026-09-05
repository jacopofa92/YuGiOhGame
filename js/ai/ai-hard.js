/**
 * ai-hard.js — Livello di difficoltà "Difficile": a differenza di
 * ai-medium.js (che si ferma al primo candidato "abbastanza buono"),
 * questo livello VALUTA ogni opzione con un punteggio (differenza LP,
 * controllo ATK/DEF del campo, vantaggio carte in mano) e sceglie quella
 * col punteggio più alto, scartando le altre — una ricerca a un livello
 * di profondità con potatura delle opzioni peggiori, non un vero albero
 * di gioco multi-turno: per le carte di questo dataset (semplici, quasi
 * tutte "puro vantaggio se attivate", vedi l'audit citato in
 * js/engine/duel-engine.js) una valutazione più profonda non cambierebbe le
 * decisioni, quindi non vale la complessità di implementarla. Vedi
 * js/ai/ai-controller.js per come si sceglie il livello.
 *
 * evaluateBoard non è più solo un numero per il debug: currentAttitude()
 * lo traduce in un'attitudine concreta (quanto è selettiva la rimozione,
 * quanto rischia negli attacchi contro carte coperte) che si ADATTA
 * all'andamento del duello — in vantaggio netto gioca sul sicuro, in
 * svantaggio netto rischia di più pur di rientrare in partita. Prima di
 * questo, evaluateBoard era calcolato ma usato solo per ordinare le
 * Evocazioni Tributo tra loro: un vero minimax non serviva (vedi sopra),
 * ma lasciare un punteggio-stato-partita del tutto inutilizzato per il
 * resto delle decisioni era uno spreco — richiesta esplicita dell'utente
 * di rendere questo livello "veramente" più difficile, non solo più
 * indaffarato.
 */
(function () {
    'use strict';

    /**
     * Punteggio di stato campo dal punto di vista del bot: più alto è
     * meglio per il bot. Usata per confrontare le opzioni di attacco/
     * evocazione tra loro, non per un vero minimax multi-turno.
     */
    function evaluateBoard(gameState) {
        let score = (gameState.botLP - gameState.playerLP) / 100;
        const powerOf = (field) => field.reduce((sum, slot) => {
            if (!slot) return sum;
            return sum + (slot.isFaceDown ? 400 : slot.card.attack); // mostro coperto: valore stimato prudente
        }, 0);
        score += (powerOf(gameState.botMonsterField) - powerOf(gameState.playerMonsterField)) / 100;
        score += (gameState.botHand.length - gameState.playerHand.length) * 3;
        return score;
    }

    /**
     * evaluateBoard tradotto in un'attitudine adattiva concreta — questo è
     * ciò che rende IA_DIFFICILE VERAMENTE più difficile invece di "usa
     * più carte": in vantaggio netto gioca sul sicuro (non spreca la
     * rimozione su bersagli deboli, non rischia attacchi contro carte
     * coperte), in svantaggio netto rischia di più (qualunque bersaglio va
     * bene pur di rientrare in partita) — un giocatore umano bravo nota
     * la differenza tra un'IA sempre uguale e una che reagisce a come sta
     * andando il duello. `removalThreshold` alimenta AI_SHARED.isRemovalWorthwhile
     * (soglia più alta = più selettiva); `faceDownRisk` alimenta la stima
     * di rischio di chooseAttackTarget su un bersaglio coperto (soglia
     * più alta = più prudente, attacca meno spesso alla cieca).
     */
    function currentAttitude(gameState) {
        const score = evaluateBoard(gameState);
        if (score >= 8) return { removalThreshold: 2200, faceDownRisk: 2200 };
        if (score <= -8) return { removalThreshold: 800, faceDownRisk: 900 };
        return { removalThreshold: 1500, faceDownRisk: 1500 };
    }

    /**
     * Come ai-medium.chooseSummon, ma invece di prendere il primo mostro
     * evocabile con l'ATK più alto, valuta TUTTI i mostri evocabili ora e
     * sceglie quello col punteggio migliore (statistica più alta, meno il
     * valore dei mostri propri sacrificati per farlo entrare) — così non
     * sacrifica per errore un mostro forte per evocarne uno più debole.
     */
    function chooseSummon(gameState) {
        const candidates = gameState.botHand.filter((card) => card.type === 'monster' && (!window.AI_SHARED || AI_SHARED.canNormalSummonNow(card, gameState, 'bot')));
        let best = null;
        let bestScore = -Infinity;

        candidates.forEach((card) => {
            const tributesNeeded = getTributesRequired(card);
            let tributeIndices = [];
            let emptySlotHint = -1;

            if (tributesNeeded === 0) {
                emptySlotHint = gameState.botMonsterField.findIndex((slot) => slot === null);
                if (emptySlotHint === -1) return;
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
                if (ownIndices.length < tributesNeeded) return;
                // Sacrifica i propri mostri più DEBOLI, non i primi che capitano.
                tributeIndices = [...ownIndices]
                    .sort((a, b) => gameState.botMonsterField[a].card.attack - gameState.botMonsterField[b].card.attack)
                    .slice(0, tributesNeeded);
            }

            const sacrificedValue = tributeIndices.reduce((sum, idx) => sum + gameState.botMonsterField[idx].card.attack, 0);
            // Veto: mai un'Evocazione Tributo in perdita netta (es.
            // sacrificare due mostri da 2500 ATK per evocarne uno da 2500
            // ATK) — a differenza del bonus/penalità pesata qui sotto
            // (che poteva comunque far vincere una mossa così se non
            // c'era di meglio in mano), questo scarta il candidato a
            // monte: meglio non evocare nulla che indebolirsi da soli.
            if (tributesNeeded > 0 && Math.max(card.attack, card.defense) <= sacrificedValue) return;
            // "Bara" quanto basta a non farsi paralizzare dall'indecisione:
            // preferisce SEMPRE la minaccia più forte che può permettersi
            // ora, invece di trattenere mostri potenti per un turno
            // migliore che potrebbe non arrivare mai (vedi la richiesta
            // esplicita dell'utente di privilegiare le sue possibilità di
            // Evocare mostri forti). Un piccolo bonus ulteriore per i
            // mostri di Tributo (Livello 5+): a parità di punteggio
            // preferisce impegnare i Tributi su qualcosa di davvero forte
            // piuttosto che no.
            const tributeBonus = tributesNeeded > 0 ? 150 : 0;
            const score = Math.max(card.attack, card.defense) - sacrificedValue * 0.5 + tributeBonus;
            if (score > bestScore) {
                bestScore = score;
                best = { card: card, tributeIndices: tributeIndices, emptySlotHint: emptySlotHint };
            }
        });

        if (!best) return null;
        // Postura: stessa euristica condivisa di IA_MEDIA (AI_SHARED),
        // ma qui la scelta è già la carta OGGETTIVAMENTE migliore
        // disponibile, non solo "la prima con ATK alto" — quindi la
        // decisione Attacco/Difesa coperta/scoperta risultante è più
        // affidabile.
        const posture = (window.AI_SHARED && AI_SHARED.decideMonsterPosture(best.card, gameState, 'bot')) || { position: 'attack', faceDown: false };
        best.position = posture.position;
        best.faceDown = posture.faceDown;
        return best;
    }

    /**
     * Come ai-medium.chooseAttackTarget, ma valuta OGNI bersaglio possibile
     * (incluso "non attaccare") con un punteggio che stima il valore
     * distrutto meno il rischio di perdere l'attaccante in cambio, invece
     * di fermarsi al primo bersaglio "abbastanza favorevole" — un mostro
     * coperto rischioso può essere scartato a favore di trattenere
     * l'attaccante, cosa che ai-medium non fa mai.
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
        // Rischio percepito su un bersaglio coperto, scalato da quanto sta
        // andando bene la partita (vedi currentAttitude) — in vantaggio
        // netto l'IA gioca sul sicuro e tende a NON attaccare alla cieca,
        // in svantaggio netto rischia di più pur di riprendere l'iniziativa.
        const faceDownRisk = currentAttitude(gameState).faceDownRisk;

        let best = null;
        let bestScore = 0; // soglia minima: sotto zero, meglio trattenere il mostro

        playerMonsters.forEach((m) => {
            let score;
            if (m.slot.isFaceDown) {
                // Bersaglio ignoto: valore potenziale (distruggerlo) contro un
                // rischio stimato prudente (assume una DEF/ATK nella media).
                score = 700 - faceDownRisk * 0.3;
            } else {
                const defStat = m.slot.position === 'attack' ? m.slot.card.attack : m.slot.card.defense;
                if (attackerAtk <= defStat) return; // sfavorevole o alla pari: mai vantaggioso attaccarlo
                score = defStat;
            }
            if (score > bestScore) { bestScore = score; best = m.index; }
        });

        // Permesso di attaccare direttamente anche con mostri avversari in
        // campo (es. Sparatore Sonico id 773, Folletto della Fiamma
        // Furente id 681) — usato solo come ultima risorsa, quando nessun
        // bersaglio-mostro ha superato la soglia qui sopra.
        if (best === null && gameState.directAttackAllowedUids && gameState.directAttackAllowedUids[attackerSlot.card.uid]) return -1;

        return best;
    }

    /**
     * Decisione nella finestra di priorità della Chain (vedi
     * openTriggerWindow/openActivationWindow in js/engine/duel-engine.js): a
     * differenza di IA_MEDIA (che risponde sempre con la prima candidata),
     * qui si valuta l'impatto stimato di OGNI candidata con
     * AI_SHARED.scoreCardImpact (parole chiave nel testo effetto) e si
     * sceglie la più forte — es. preferisce una Trappola che distrugge un
     * mostro a una che si limita a infliggere danno, quando entrambe sono
     * disponibili come risposta.
     */
    function chooseChainResponse(candidates) {
        if (candidates.length === 0) return null;
        if (!window.AI_SHARED) return candidates[0];
        let best = candidates[0];
        let bestScore = -Infinity;
        candidates.forEach((c) => {
            const score = AI_SHARED.scoreCardImpact(c.card);
            if (score > bestScore) { bestScore = score; best = c; }
        });
        return best;
    }

    /**
     * Decide la PROSSIMA azione da fare con una Magia/Trappola in mano
     * durante la propria Main Phase (js/ai/bot.js la richiama ripetutamente,
     * una carta alla volta, finché ritorna null) — { handIndex, card,
     * action } con action 'activate' o 'set'. A differenza di IA_MEDIA
     * (che si ferma a 1 Trappola + 1 Magia), IA_DIFFICILE:
     *   - Setta TUTTE le Trappole che ha spazio per piazzare, partendo
     *     dalla più forte stimata (AI_SHARED.scoreCardImpact) — riempie
     *     il proprio retrocampo invece di trattenerle senza motivo;
     *   - attiva OGNI Magia in mano che può attivare subito con un
     *     impatto stimato utile (soglia bassa: quasi tutte, coerente col
     *     principio "le carte di questo dataset sono quasi tutte puro
     *     vantaggio se attivate", già documentato in js/engine/duel-engine.js) —
     *     TRANNE una rimozione a bersaglio singolo senza ancora un
     *     bersaglio che valga la pena (AI_SHARED.isRemovalWorthwhile,
     *     soglia adattiva da currentAttitude): quella resta in mano ad
     *     aspettare un bersaglio migliore invece di sprecarsi sul primo
     *     vanilla debole, il difetto segnalato dall'utente.
     */
    function chooseNextSpellTrapAction(gameState) {
        const hand = gameState.botHand;
        const emptySlot = gameState.botSTField.some((s) => s === null);
        const impact = (card) => (window.AI_SHARED ? AI_SHARED.scoreCardImpact(card) : 1);
        const threshold = currentAttitude(gameState).removalThreshold;
        const worthwhile = (card) => !window.AI_SHARED || AI_SHARED.isRemovalWorthwhile(card, gameState, 'bot', threshold);

        // Prima le Magie (soprattutto le Continue: il loro vantaggio è
        // averle SUBITO scoperte in campo, mentre una Trappola guadagna
        // valore proprio dall'essere nascosta), così non finiscono escluse
        // da canActivate per mancanza di slot liberi se le Trappole
        // avessero già riempito tutto il retrocampo per prime.
        const spells = hand
            .map((card, handIndex) => ({ card, handIndex }))
            .filter((e) => e.card.type === 'spell' && window.DuelEngine && DuelEngine.canActivate('bot', 'hand', e.handIndex) && worthwhile(e.card))
            .sort((a, b) => impact(b.card) - impact(a.card));
        if (spells.length > 0) return { handIndex: spells[0].handIndex, card: spells[0].card, action: 'activate' };

        if (emptySlot) {
            // Nessun controllo "worthwhile" qui: Settare una Trappola non
            // sceglie ancora un bersaglio (lo farà solo quando si attiva,
            // più avanti), quindi non c'è nulla da sprecare ora — solo la
            // scelta della più forte tra quelle in mano, come sempre.
            const traps = hand
                .map((card, handIndex) => ({ card, handIndex }))
                .filter((e) => e.card.type === 'trap')
                .sort((a, b) => impact(b.card) - impact(a.card));
            if (traps.length > 0) return { handIndex: traps[0].handIndex, card: traps[0].card, action: 'set' };
        }

        return null;
    }

    /**
     * Vero se conviene attivare ORA una propria carta già Set (Magia
     * Continua, Trappola normale, ecc.) durante la propria Main Phase —
     * non solo in risposta a un trigger avversario. IA_DIFFICILE è
     * l'UNICO livello che lo fa: attiva proattivamente il proprio
     * retrocampo quando è utile, invece di aspettare passivamente che
     * l'avversario dia lo spunto — è questa la differenza di
     * comportamento più visibile rispetto a IA_MEDIA.
     */
    function chooseSetCardActivation(gameState) {
        if (!window.DuelEngine) return null;
        const stField = gameState.botSTField;
        const threshold = currentAttitude(gameState).removalThreshold;
        const candidates = [];
        stField.forEach((slot, index) => {
            if (!slot || !slot.isFaceDown) return;
            if (!DuelEngine.canActivate('bot', 'st', index)) return;
            // Stessa restrizione di chooseNextSpellTrapAction: attivare
            // PROATTIVAMENTE (non in risposta a un trigger) una rimozione
            // a bersaglio singolo senza un bersaglio che valga la pena
            // sarebbe lo stesso spreco, solo con la carta già Set invece
            // che in mano.
            if (window.AI_SHARED && !AI_SHARED.isRemovalWorthwhile(slot.card, gameState, 'bot', threshold)) return;
            candidates.push({ index: index, card: slot.card });
        });
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => (window.AI_SHARED ? AI_SHARED.scoreCardImpact(b.card) - AI_SHARED.scoreCardImpact(a.card) : 0));
        return candidates[0];
    }

    window.AI_HARD = {
        evaluateBoard: evaluateBoard,
        chooseSummon: chooseSummon,
        chooseAttackTarget: chooseAttackTarget,
        chooseChainResponse: chooseChainResponse,
        chooseNextSpellTrapAction: chooseNextSpellTrapAction,
        chooseSetCardActivation: chooseSetCardActivation
    };
})();
