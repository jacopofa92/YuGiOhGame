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
        // shouldHoldForExodia (AI_SHARED): mai Evocare un pezzo di Exodia
        // il Proibito — vale la pena tenerlo in mano per la vittoria
        // istantanea, non farlo combattere con 200-300 ATK/DEF.
        const candidates = gameState.botHand.filter((card) => card.type === 'monster'
            && (!window.AI_SHARED || AI_SHARED.canNormalSummonNow(card, gameState, 'bot'))
            && !(window.AI_SHARED && AI_SHARED.shouldHoldForExodia(card)));
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
            // AI_SHARED.isTributeSummonWorthwhile: non solo il vecchio
            // veto "mai in perdita netta" (es. sacrificare due mostri da
            // 2500 ATK per evocarne uno da 2500 ATK, ancora il primo
            // controllo al suo interno), ma adattivo al campo
            // dell'avversario — richiesta esplicita dell'utente: non
            // passare a un mostro con ATK più basso ma DEF più alta a
            // meno che l'avversario non abbia davvero un mostro che lo
            // giustifichi. Scarta il candidato a monte, prima dello
            // scoring qui sotto.
            if (tributesNeeded > 0) {
                const tributeOk = window.AI_SHARED
                    ? AI_SHARED.isTributeSummonWorthwhile(card, sacrificedValue, gameState, 'bot')
                    : Math.max(card.attack, card.defense) > sacrificedValue;
                if (!tributeOk) return;
            }
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
        // affidabile. Il faceDownRisk di currentAttitude (già usato per
        // gli attacchi contro bersagli coperti) viene passato anche qui
        // come riskAversion: solo IA_DIFFICILE valuta se nascondere un
        // mostro "da Attacco" quando l'avversario ha la mano piena e non
        // c'è comunque nulla da guadagnare esponendolo subito.
        const riskAversion = currentAttitude(gameState).faceDownRisk;
        const posture = (window.AI_SHARED && AI_SHARED.decideMonsterPosture(best.card, gameState, 'bot', riskAversion)) || { position: 'attack', faceDown: false };
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
     * Gestione del rischio in Battle Phase (richiesta esplicita
     * dell'utente): quando si è già COMODAMENTE in vantaggio (stessa
     * soglia "in vantaggio netto" di evaluateBoard/currentAttitude) E il
     * retrocampo dell'avversario è fitto di carte coperte (>= 2, rischio
     * concreto di una carta punitiva tipo Cilindro Magico/Buco Trappola),
     * un `backrowPenalty` scala verso il basso ogni punteggio — non serve
     * rischiare un mostro (o subire un riflesso di danno) per qualche
     * punto LP quando si sta già vincendo comodamente. Un attacco
     * chiaramente vantaggioso resta comunque sopra soglia e parte
     * normalmente: questo scoraggia solo le mosse marginali, non
     * paralizza l'IA.
     */
    function chooseAttackTarget(attackerSlot, playerMonsters) {
        const isComfortablyAhead = evaluateBoard(gameState) >= 8;
        const opponentBackrowCount = (gameState.playerSTField || []).filter((s) => s && s.isFaceDown).length;
        const backrowRisky = isComfortablyAhead && opponentBackrowCount >= 2;

        if (playerMonsters.length === 0) {
            // "Non può attaccare direttamente" (es. Zombyra l'Oscuro, id
            // 625): niente bersaglio-mostro disponibile E l'attacco
            // diretto è comunque vietato per questa carta -> trattiene.
            const attackerDef = window.DuelEngine && DuelEngine.getDefinition(attackerSlot.card.id);
            if (attackerDef && attackerDef.cannotAttackDirectly) return null;
            // Attacco diretto contro un retrocampo fitto mentre si è già
            // comodamente in vantaggio: il rischio di una carta punitiva
            // (es. Cilindro Magico, che riflette il danno su di sé) non
            // vale la pena di qualche punto LP che non serve più a vincere.
            if (backrowRisky) return null;
            return -1;
        }
        const attackerAtk = attackerSlot.card.attack;
        // Rischio percepito su un bersaglio coperto, scalato da quanto sta
        // andando bene la partita (vedi currentAttitude) — in vantaggio
        // netto l'IA gioca sul sicuro e tende a NON attaccare alla cieca,
        // in svantaggio netto rischia di più pur di riprendere l'iniziativa.
        const faceDownRisk = currentAttitude(gameState).faceDownRisk;
        const backrowPenalty = backrowRisky ? opponentBackrowCount * 250 : 0;

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
                // Un mostro che comunque non verrebbe distrutto (es.
                // cannotBeDestroyedByBattle) non è mai un bersaglio
                // "conveniente" solo perché la statistica nominale è
                // favorevole — richiesta esplicita dell'utente: non
                // insistere a puntare un mostro che non si può distruggere.
                if (window.AI_SHARED && !AI_SHARED.canBeDestroyedByBattle(m.slot.card, 'player', attackerAtk)) return;
                score = defStat;
            }
            score -= backrowPenalty;
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
     * disponibili come risposta. Risposta più SELETTIVA (richiesta
     * esplicita dell'utente): se OGNI candidata è una rimozione a
     * bersaglio singolo (AI_SHARED.isSingleTargetRemoval) e NESSUNA
     * varrebbe la pena secondo la stessa soglia adattiva già usata
     * proattivamente in Main Phase (AI_SHARED.isRemovalWorthwhile via
     * currentAttitude), passa senza rispondere invece di sprecarla —
     * stesso principio "non sprecare la rimozione su un bersaglio che
     * non lo merita" applicato qui in difesa. Se anche una sola
     * candidata NON è pura rimozione (es. una negazione, un effetto di
     * massa), risponde comunque normalmente: non blocca mai una vera
     * mossa difensiva necessaria.
     */
    function chooseChainResponse(candidates) {
        if (candidates.length === 0) return null;
        if (!window.AI_SHARED) return candidates[0];
        const threshold = currentAttitude(gameState).removalThreshold;
        const allPureRemoval = candidates.every((c) => AI_SHARED.isSingleTargetRemoval(c.card));
        if (allPureRemoval && !candidates.some((c) => AI_SHARED.isRemovalWorthwhile(c.card, gameState, 'bot', threshold))) {
            return null;
        }
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
     * (che si ferma a 1 Trappola + 1 Magia), IA_DIFFICILE ne usa di più
     * per turno — fino a MAX_ACTIVATE_PER_TURN Magie e MAX_SET_PER_TURN
     * Trappole, non più "tutte quelle che ha" come in una versione
     * precedente: segnalato dall'utente come eccessivo ("non così tante
     * magie e trappole potenti"), svuotare l'intera mano in un turno solo
     * risultava opprimente indipendentemente da QUALI carte capitassero.
     * `usedThisTurn` (stesso oggetto condiviso con IA_MEDIA, passato
     * invariato da bot.js per l'intero turno) tiene il conteggio, così il
     * limite resta per-turno e non per-singola-chiamata:
     *   - tra le Trappole Settabili e tra le Magie attivabili, una scelta
     *     PESATA sull'impatto stimato (AI_SHARED.pickWeightedByImpact),
     *     non più sempre la più forte in assoluto — richiesta esplicita
     *     dell'utente: lo stesso mazzo produceva sempre la stessa
     *     sequenza di attivazioni, un pattern riconoscibile. Il peso resta
     *     comunque proporzionale all'impatto (la carta forte resta la più
     *     probabile) e la scelta converge di più/meno verso "sempre la
     *     migliore" in base ad AI_SHARED.getSpellTrapRestraint (turno
     *     attuale + personaggio in duello);
     *   - tra le Magie attivabili, in più una rimozione a bersaglio
     *     singolo senza ancora un bersaglio che valga la pena
     *     (AI_SHARED.isRemovalWorthwhile, soglia adattiva da
     *     currentAttitude) resta esclusa dai candidati: resta in mano ad
     *     aspettare un bersaglio migliore invece di sprecarsi sul primo
     *     vanilla debole, il difetto segnalato dall'utente in una
     *     sessione precedente.
     */
    const MAX_ACTIVATE_PER_TURN = 2;
    const MAX_SET_PER_TURN = 2;
    function chooseNextSpellTrapAction(gameState, usedThisTurn) {
        usedThisTurn = usedThisTurn || {};
        usedThisTurn.activateCount = usedThisTurn.activateCount || 0;
        usedThisTurn.setCount = usedThisTurn.setCount || 0;
        const hand = gameState.botHand;
        const emptySlot = gameState.botSTField.some((s) => s === null);
        const threshold = currentAttitude(gameState).removalThreshold;
        const worthwhile = (card) => !window.AI_SHARED || AI_SHARED.isRemovalWorthwhile(card, gameState, 'bot', threshold);

        // Restraint (AI_SHARED.getSpellTrapRestraint): a differenza di
        // IA_MEDIA (che aggiunge un margine fisso extra), IA_DIFFICILE
        // resta più vicina al proprio stile "vero" anche nei primi turni
        // — solo il bonus per i primissimi turni si applica, non un
        // margine di prudenza aggiuntivo, coerente con l'essere il
        // livello che gioca "meglio" per definizione.
        const restraint = window.AI_SHARED ? AI_SHARED.getSpellTrapRestraint(gameState) : 0;
        const pickWeighted = (list) => (window.AI_SHARED ? AI_SHARED.pickWeightedByImpact(list, restraint) : (list[0] || null));

        // Prima le Magie (soprattutto le Continue: il loro vantaggio è
        // averle SUBITO scoperte in campo, mentre una Trappola guadagna
        // valore proprio dall'essere nascosta), così non finiscono escluse
        // da canActivate per mancanza di slot liberi se le Trappole
        // avessero già riempito tutto il retrocampo per prime.
        if (usedThisTurn.activateCount < MAX_ACTIVATE_PER_TURN) {
            const spells = hand
                .map((card, handIndex) => ({ card, handIndex }))
                .filter((e) => e.card.type === 'spell' && window.DuelEngine && DuelEngine.canActivate('bot', 'hand', e.handIndex) && worthwhile(e.card));
            const chosen = pickWeighted(spells);
            if (chosen) {
                usedThisTurn.activateCount += 1;
                return { handIndex: chosen.handIndex, card: chosen.card, action: 'activate' };
            }
        }

        if (emptySlot && usedThisTurn.setCount < MAX_SET_PER_TURN) {
            // Nessun controllo "worthwhile" qui: Settare una Trappola non
            // sceglie ancora un bersaglio (lo farà solo quando si attiva,
            // più avanti), quindi non c'è nulla da sprecare ora — solo una
            // scelta pesata sull'impatto stimato tra quelle in mano.
            const traps = hand
                .map((card, handIndex) => ({ card, handIndex }))
                .filter((e) => e.card.type === 'trap');
            const chosen = pickWeighted(traps);
            if (chosen) {
                usedThisTurn.setCount += 1;
                return { handIndex: chosen.handIndex, card: chosen.card, action: 'set' };
            }
        }

        return null;
    }

    /**
     * Vero se conviene attivare ORA una propria carta già Set (Magia
     * Continua, Trappola normale, ecc.) O un effetto Ignition di un
     * proprio mostro già in campo, durante la propria Main Phase — non
     * solo in risposta a un trigger avversario. IA_DIFFICILE è l'UNICO
     * livello che lo fa: attiva proattivamente il proprio retrocampo/i
     * propri mostri quando è utile, invece di aspettare passivamente che
     * l'avversario dia lo spunto — è questa la differenza di
     * comportamento più visibile rispetto a IA_MEDIA. Torna
     * { index, card, zone } — `zone` ('st' o 'monster') dice a
     * js/ai/bot.js#attemptBotActivateSetCards quale zona passare a
     * DuelEngine.activateCard, dato che le due condividono lo stesso
     * elenco di candidati/la stessa lotteria pesata.
     * Richiesta esplicita dell'utente: prima il bot non considerava MAI
     * l'effetto Ignition di un proprio mostro già sul Terreno (es. un
     * Soldato Cannone mai attivato da solo) — stessa infrastruttura già
     * usata per attivare una carta dalla mano (DuelEngine.canActivate
     * supporta la zona 'monster' da sempre), semplicemente nessuna
     * funzione IA la interrogava mai proattivamente.
     */
    function chooseSetCardActivation(gameState) {
        if (!window.DuelEngine) return null;
        const threshold = currentAttitude(gameState).removalThreshold;
        const candidates = [];
        gameState.botSTField.forEach((slot, index) => {
            if (!slot || !slot.isFaceDown) return;
            if (!DuelEngine.canActivate('bot', 'st', index)) return;
            // Stessa restrizione di chooseNextSpellTrapAction: attivare
            // PROATTIVAMENTE (non in risposta a un trigger) una rimozione
            // a bersaglio singolo senza un bersaglio che valga la pena
            // sarebbe lo stesso spreco, solo con la carta già Set invece
            // che in mano.
            if (window.AI_SHARED && !AI_SHARED.isRemovalWorthwhile(slot.card, gameState, 'bot', threshold)) return;
            candidates.push({ index: index, card: slot.card, zone: 'st' });
        });
        gameState.botMonsterField.forEach((slot, index) => {
            if (!slot || slot.isFaceDown) return;
            if (!DuelEngine.canActivate('bot', 'monster', index)) return;
            candidates.push({ index: index, card: slot.card, zone: 'monster' });
        });
        if (candidates.length === 0) return null;
        const restraint = window.AI_SHARED ? AI_SHARED.getSpellTrapRestraint(gameState) : 0;
        return window.AI_SHARED ? AI_SHARED.pickWeightedByImpact(candidates, restraint) : candidates[0];
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
