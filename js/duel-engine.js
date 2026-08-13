/**
 * duel-engine.js — Motore generico degli effetti-carta.
 * =====================================================================
 * ATTENZIONE A NON CONFONDERLO CON js/effects.js: quel file (oggetto
 * globale `FX`) è una libreria di effetti VISIVI (particelle, flash,
 * animazioni) e non sa nulla delle regole di gioco. Questo file invece
 * è il motore delle regole vere e proprie — "cosa succede quando una
 * carta fa qualcosa" — e non disegna nulla sullo schermo (per gli
 * effetti visivi richiama comunque `FX.*`, ma la logica è tutta qui).
 *
 * Come funziona in breve (leggi anche il commento in cima a
 * js/card-effects.js, che è il file "gemello" con gli effetti delle
 * singole carte):
 *
 *   1) js/card-effects.js registra un "effetto" per ogni carta che ne
 *      ha uno, chiamando CardEffects.register(idCarta, { ... }).
 *   2) Il resto del gioco (actions.js, bot.js, game-flow.js) richiama
 *      DuelEngine.fireTrigger(...) nei punti giusti (dopo un'Evocazione,
 *      prima di risolvere un attacco, ecc.) e DuelEngine.activateCard(...)
 *      quando il giocatore attiva manualmente una Magia/Trappola/effetto.
 *   3) Questo file si occupa di TROVARE quali carte hanno un effetto
 *      pertinente a quel momento, chiederglielo, ed ESEGUIRLO tramite
 *      gli "helper d'azione" qui sotto (distruggere un mostro, infliggere
 *      danno, pescare carte, ecc.) così che ogni effetto-carta in
 *      card-effects.js resti poche righe leggibili, senza dover
 *      reinventare ogni volta "come si distrugge un mostro".
 *
 * SEMPLIFICAZIONE DELIBERATA — "finestre di risposta", non Chain vera:
 * Le regole reali di Yu-Gi-Oh usano uno stack di Chain con priorità che
 * può rimbalzare più volte tra i due giocatori. Per restare leggibile
 * (ed è più che sufficiente per le carte di questo gioco) qui uso un
 * modello più semplice: quando succede un evento importante (un
 * attacco viene dichiarato, un mostro viene Evocato) l'avversario ha
 * UNA SOLA occasione per rispondere con una Trappola già Set o un
 * effetto attivabile dalla mano (es. Kuriboh). Non esistono catene di
 * risposte a cascata. Se in futuro servirà una Chain vera, questo file
 * è il punto dove andrebbe estesa `fireTrigger`.
 */
(function () {
    'use strict';

    // ============================================================
    // Costanti dei "trigger": i momenti della partita in cui il motore
    // controlla se qualche carta ha un effetto automatico da eseguire.
    // ============================================================
    const TRIGGER = {
        ON_NORMAL_SUMMON: 'onNormalSummon',   // subito dopo un'Evocazione Normale (Tributo incluso)
        ON_SPECIAL_SUMMON: 'onSpecialSummon', // subito dopo una Special Summon (es. da Rinascita del Mostro)
        ON_FLIP: 'onFlip',                    // quando un mostro coperto viene girato scoperto
        ON_ATTACK_DECLARE: 'onAttackDeclare', // dopo che un attacco è stato dichiarato, PRIMA del calcolo danni
        ON_DESTROY: 'onDestroy'               // subito dopo che un mostro viene distrutto e va al Cimitero
    };

    // Registro carte -> definizione effetto. Chiave = id carta (da cards-db.js).
    const registry = new Map();

    /**
     * Registra l'effetto di una carta. `definition` è un oggetto con solo
     * le proprietà che servono a quella carta specifica — vedi il commento
     * in testa a card-effects.js per la lista completa dei campi supportati
     * (static, onSummon, onFlip, onAttackDeclare, canActivate, activate).
     */
    function register(cardId, definition) {
        registry.set(cardId, definition);
    }

    function getDefinition(cardId) {
        return registry.get(cardId) || null;
    }

    // ============================================================
    // Contesto: l'oggetto che ogni effetto-carta riceve come parametro.
    // Raccoglie tutto ciò che serve per leggere/modificare la partita
    // senza che ogni singolo effetto debba conoscere i dettagli interni
    // di gameState (nomi dei campi, come loggare, ecc.).
    // ============================================================
    function opponentOf(owner) {
        return owner === 'player' ? 'bot' : 'player';
    }

    function fieldOf(owner) {
        return owner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
    }

    function stFieldOf(owner) {
        return owner === 'player' ? gameState.playerSTField : gameState.botSTField;
    }

    function handOf(owner) {
        return owner === 'player' ? gameState.playerHand : gameState.botHand;
    }

    function graveyardOf(owner) {
        return owner === 'player' ? gameState.playerGraveyard : gameState.botGraveyard;
    }

    function lpKeyOf(owner) {
        return owner === 'player' ? 'playerLP' : 'botLP';
    }

    /**
     * Costruisce il contesto passato a static()/onX()/activate(). `extra`
     * porta i dati specifici del momento (es. per onAttackDeclare: chi
     * attacca, chi difende, il danno previsto).
     */
    function makeContext(owner, extra) {
        return Object.assign({
            owner: owner,
            opponent: opponentOf(owner),
            gameState: gameState,
            log: addToLog,
            // Helper di lettura rapidi, così un effetto-carta scrive
            // ctx.field(ctx.owner) invece di dover sapere che il campo del
            // giocatore si chiama "playerMonsterField".
            field: fieldOf,
            stField: stFieldOf,
            hand: handOf,
            graveyard: graveyardOf
        }, ACTIONS, extra || {});
    }

    // ============================================================
    // Helper d'azione: le "mosse" di base che un effetto può compiere.
    // Ogni funzione qui aggiorna gameState E fa anche il log/refresh UI
    // necessario, così un effetto-carta in card-effects.js resta un
    // elenco di 2-3 chiamate a questi helper, leggibile a colpo d'occhio.
    // ============================================================
    const ACTIONS = {
        /** Distrugge il mostro nello slot indicato (owner+index) e lo manda al Cimitero. */
        destroyMonster(owner, index) {
            const field = fieldOf(owner);
            const slot = field[index];
            if (!slot) return;
            graveyardOf(owner).push(slot.card);
            field[index] = null;
            if (typeof triggerDestroyEffect === 'function') {
                triggerDestroyEffect(owner, index, 'monster');
            }
            fireTrigger(TRIGGER.ON_DESTROY, makeContext(owner, { slotIndex: index }));
        },

        /** Distrugge TUTTI i mostri sul campo del giocatore indicato (o di entrambi, se owner è omesso). */
        destroyAllMonsters(owner) {
            const owners = owner ? [owner] : ['player', 'bot'];
            owners.forEach((o) => {
                fieldOf(o).forEach((slot, index) => {
                    if (slot) ACTIONS.destroyMonster(o, index);
                });
            });
        },

        /** Distrugge tutte le carte (mostri + magie/trappole) sul campo del giocatore indicato. */
        destroyAllCards(owner) {
            ACTIONS.destroyAllMonsters(owner);
            stFieldOf(owner).forEach((slot, index) => {
                if (slot) {
                    graveyardOf(owner).push(slot.card);
                    stFieldOf(owner)[index] = null;
                }
            });
        },

        /** Infligge danno diretto ai Life Points del giocatore indicato (può essere negativo per curare). */
        dealDamage(owner, amount) {
            gameState[lpKeyOf(owner)] -= amount;
        },

        /** Pesca `amount` carte per il giocatore indicato, riusando la stessa logica del Draw Phase. */
        drawCards(owner, amount) {
            return drawCardsToHand(owner, amount);
        },

        /**
         * Special Summon: fa entrare in campo un mostro senza consumare
         * l'Evocazione Normale del turno e senza richiedere Tributi.
         * `card` può arrivare dalla mano, dal Cimitero o dall'Extra Deck:
         * chi chiama questa funzione si occupa di toglierlo dalla zona di
         * origine PRIMA di chiamarla (vedi es. in card-effects.js).
         */
        specialSummon(owner, card, slotIndex, position) {
            const field = fieldOf(owner);
            if (field[slotIndex]) return false; // slot occupato: niente da fare
            field[slotIndex] = {
                card: card,
                position: position,
                isFaceDown: position === 'defense',
                hasAttacked: false,
                canChangePosition: false
            };
            fireTrigger(
                TRIGGER.ON_SPECIAL_SUMMON,
                makeContext(owner, { summonedCard: card, summonedSlotIndex: slotIndex, summonedPosition: position }),
                () => { if (typeof updateUI === 'function') updateUI(); }
            );
            return true;
        },

        /** Trova il primo slot mostro libero del giocatore indicato, o -1 se il campo è pieno. */
        findEmptyMonsterSlot(owner) {
            return fieldOf(owner).findIndex((slot) => slot === null);
        }
    };

    // ============================================================
    // fireTrigger: il cuore delle "finestre di risposta" spiegate sopra.
    // Ogni trigger ha due parti POSSIBILI, non sempre entrambe presenti:
    //   - un "auto-effetto" sulla carta stessa (es. un mostro Flip che
    //     si attiva quando VIENE girato scoperto lui) — sincrono, gestito
    //     dal proprietario della carta, handler `onSummon`/`onFlip`;
    //   - una "finestra di risposta" per l'AVVERSARIO, che può reagire
    //     con una Trappola Set o un effetto da mano (es. Buco Trappola
    //     scatta quando IO evoco, Cilindro Magico quando IO attacco) —
    //     può essere ASINCRONA (il giocatore umano deve rispondere a un
    //     prompt), quindi ogni chiamata a fireTrigger accetta un terzo
    //     parametro opzionale `onDone`, richiamato quando la finestra si
    //     è chiusa (con o senza risposta), così chi ha lanciato il
    //     trigger sa quando è sicuro proseguire (vedi resolveAttack in
    //     actions.js, che aspetta onDone prima di calcolare i danni).
    // ============================================================
    function fireTrigger(name, ctx, onDone) {
        const finish = typeof onDone === 'function' ? onDone : function () {};

        if (name === TRIGGER.ON_FLIP) {
            const def = getDefinition(ctx.card.id);
            if (def && typeof def.onFlip === 'function') def.onFlip(ctx);
            finish();
            return;
        }

        if (name === TRIGGER.ON_NORMAL_SUMMON || name === TRIGGER.ON_SPECIAL_SUMMON) {
            // ctx.summonedCard/summonedSlotIndex/summonedPosition descrivono
            // il mostro appena Evocato (NON "ctx.card": quel nome è
            // riservato, dentro respondWindow, alla carta di chi RISPONDE
            // — es. Buco Trappola — per evitare l'ambiguità tra "la carta
            // evocata" e "la carta con cui rispondo all'evocazione").
            //
            // 1) Auto-effetto della carta evocata (nessuna carta del set
            //    attuale lo usa ancora, ma il punto d'aggancio è pronto
            //    per future carte "quando questa carta viene Evocata...").
            const def = getDefinition(ctx.summonedCard.id);
            const selfHandler = name === TRIGGER.ON_SPECIAL_SUMMON && def && def.onSpecialSummon ? def.onSpecialSummon : (def && def.onSummon);
            if (typeof selfHandler === 'function') selfHandler(ctx);

            // 2) Finestra di risposta per l'avversario (es. Buco Trappola).
            respondWindow('onOpponentSummon', ctx, finish);
            return;
        }

        if (name === TRIGGER.ON_ATTACK_DECLARE) {
            respondWindow('onAttackDeclare', ctx, finish);
            return;
        }

        if (name === TRIGGER.ON_DESTROY) {
            // Riservato per future carte con effetto "quando questa carta
            // viene distrutta": per ora nessuna carta del database lo usa,
            // ma il punto d'aggancio è già pronto.
            finish();
            return;
        }

        finish();
    }

    /**
     * Motore generico delle "finestre di risposta": cerca, sul campo
     * Set (`stField`) e nella mano dell'AVVERSARIO di ctx.owner, le carte
     * che definiscono `handlerName` (es. 'onAttackDeclare' o
     * 'onOpponentSummon'), fa scegliere/decidere se rispondere (bot in
     * automatico, umano tramite prompt), e chiama `onDone` quando la
     * finestra si chiude — che ci sia stata una risposta o no.
     *
     * Riusata sia per "un mio attacco viene dichiarato" (Forza Riflessa,
     * Cilindro Magico, Kuriboh) sia per "io evoco un mostro" (Buco
     * Trappola): stesso identico meccanismo, cambia solo il nome
     * dell'handler cercato — per questo è una funzione sola e non due
     * copie quasi identiche.
     */
    function respondWindow(handlerName, ctx, onDone) {
        const finish = typeof onDone === 'function' ? onDone : function () {};
        const responderOwner = ctx.opponent; // chi può rispondere è l'avversario di chi ha causato l'evento
        const candidates = [];

        stFieldOf(responderOwner).forEach((slot, index) => {
            if (!slot) return;
            // Una Trappola Set non può rispondere nel turno in cui è stata piazzata,
            // e nessuna Trappola può rispondere se un effetto continuo le nega (Jinzo).
            if (slot.card.type === 'trap' && slot.setOnTurn === gameState.turn) return;
            if (slot.card.type === 'trap' && areTrapsNegatedFor(responderOwner)) return;
            const def = getDefinition(slot.card.id);
            if (def && typeof def[handlerName] === 'function') {
                candidates.push({ zone: 'st', index: index, card: slot.card, def: def });
            }
        });

        handOf(responderOwner).forEach((card, index) => {
            const def = getDefinition(card.id);
            if (def && typeof def[handlerName] === 'function') {
                candidates.push({ zone: 'hand', index: index, card: card, def: def });
            }
        });

        if (candidates.length === 0) {
            finish();
            return;
        }

        // Il contesto di risposta riusa quello dell'evento originale (ctx),
        // con owner/opponent invertiti sul punto di vista di chi potrebbe
        // rispondere: così l'effetto vede comunque tutti i dati preparati
        // da chi ha lanciato il trigger (es. attackerAtk, cancelAttack,
        // summonedCard...) senza doverli ricopiare qui a mano. Usata sia
        // per controllare canActivate() sia, se si risponde davvero, per
        // eseguire l'effetto — stessa identica candidateCtx in entrambi i
        // casi, per non rischiare che le due letture vedano dati diversi.
        const candidateCtx = (choice) => Object.assign({}, ctx, {
            owner: responderOwner,
            opponent: ctx.owner,
            card: choice.card,
            zone: choice.zone,
            index: choice.index
        });

        // Solo le carte che possono DAVVERO attivarsi ora restano in lizza
        // (es. Buco Trappola non risponde se il mostro evocato ha ATK
        // troppo basso — vedi canActivate in card-effects.js).
        const eligible = candidates.filter((c) => !c.def.canActivate || c.def.canActivate(candidateCtx(c)));
        if (eligible.length === 0) {
            finish();
            return;
        }

        const respond = (choice) => {
            if (!choice) {
                finish();
                return;
            }
            // La carta scelta si "consuma" attivandosi (Trappola o effetto
            // da mano finiscono entrambi al Cimitero), come in activateCard().
            if (choice.zone === 'st') {
                stFieldOf(responderOwner)[choice.index] = null;
            } else {
                const h = handOf(responderOwner);
                const pos = h.indexOf(choice.card);
                if (pos !== -1) h.splice(pos, 1);
            }
            graveyardOf(responderOwner).push(choice.card);
            addToLog(`🛡️ ${responderOwner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${choice.card.name} in risposta!`);
            choice.def[handlerName](candidateCtx(choice));
            finish();
        };

        if (responderOwner === 'bot') {
            // AI molto semplice: le carte Trappola/da mano di questo gioco
            // sono tutte "puro vantaggio se attivate", quindi il bot
            // risponde sempre con la prima disponibile.
            respond(eligible[0]);
        } else if (window.DuelEngineUI && typeof window.DuelEngineUI.promptDefenderResponse === 'function') {
            // Il giocatore umano: chiede conferma tramite un prompt (vedi
            // actions.js, che registra DuelEngineUI in fase di init).
            window.DuelEngineUI.promptDefenderResponse(eligible, respond);
        } else {
            // Nessuna UI disponibile (non dovrebbe succedere in partita
            // normale): per sicurezza non attiva nulla, invece di bloccare
            // il duello.
            finish();
        }
    }

    // ============================================================
    // Effetti continui (static): ricalcolati ad ogni render tramite
    // recomputeStaticEffects(), chiamata da updateUI() in game-flow.js.
    // Un effetto continuo non "fa" nulla direttamente: scrive dei flag
    // su gameState (es. gameState.trapsNegatedFor) che il resto del
    // motore/gioco controlla al momento giusto.
    // ============================================================
    function recomputeStaticEffects() {
        // Reset dei flag prima di ricalcolare, altrimenti un effetto
        // continuo che sparisce (es. Jinzo distrutto) resterebbe "appiccicato".
        gameState.trapsNegatedFor = { player: false, bot: false };
        gameState.cannotAttackFor = { player: false, bot: false };
        gameState.revealedFor = { player: false, bot: false };
        gameState.atkDefBonus = {}; // chiave = uid della carta -> {atk, def}

        ['player', 'bot'].forEach((owner) => {
            // Mostri scoperti sul campo (es. Jinzo).
            fieldOf(owner).forEach((slot) => {
                if (!slot || slot.isFaceDown) return;
                const def = getDefinition(slot.card.id);
                if (def && typeof def.static === 'function') {
                    def.static(makeContext(owner, { card: slot.card, slot: slot }));
                }
            });
            // Magie/Trappole Continue scoperte sul Terreno (es. Spada
            // Rivelatrice): restano piazzate invece di finire subito al
            // Cimitero, e il loro effetto si ricalcola qui ad ogni render
            // esattamente come per un mostro continuo — vedi il campo
            // `continuous` gestito da activateCard() più sotto.
            stFieldOf(owner).forEach((slot) => {
                if (!slot || slot.isFaceDown) return;
                const def = getDefinition(slot.card.id);
                if (def && typeof def.static === 'function') {
                    def.static(makeContext(owner, { card: slot.card, slot: slot }));
                }
            });
        });
    }

    /** Vero se le Trappole del giocatore indicato sono negate da un effetto continuo (es. Jinzo avversario). */
    function areTrapsNegatedFor(owner) {
        return !!(gameState.trapsNegatedFor && gameState.trapsNegatedFor[owner]);
    }

    /** Vero se i mostri coperti del giocatore indicato sono resi visibili da un effetto continuo (es. Spada Rivelatrice). */
    function isRevealedFor(owner) {
        return !!(gameState.revealedFor && gameState.revealedFor[owner]);
    }

    /** Vero se i mostri del giocatore indicato non possono dichiarare attacchi (es. Spada Rivelatrice). */
    function cannotAttack(owner) {
        return !!(gameState.cannotAttackFor && gameState.cannotAttackFor[owner]);
    }

    // ============================================================
    // Attivazione manuale: Magie Normali dalla mano, Trappole Set (dal
    // secondo turno in poi) e futuri effetti Ignition dei mostri.
    // Punto d'ingresso unico richiamato dall'UI (actions.js).
    // ============================================================
    function canActivate(owner, zone, index) {
        const card = zone === 'hand' ? handOf(owner)[index] : stFieldOf(owner)[index] && stFieldOf(owner)[index].card;
        if (!card) return false;
        const def = getDefinition(card.id);
        if (!def || typeof def.activate !== 'function') return false;
        if (zone === 'st') {
            const slot = stFieldOf(owner)[index];
            // Regola classica: una Trappola Set non si può attivare nello
            // stesso turno in cui è stata piazzata. Una Magia Set invece
            // può essere attivata subito (qui semplifichiamo il "gioca la
            // Magia direttamente dalla mano" con "Set + attiva quando
            // vuoi", ma solo le Trappole hanno il vincolo del turno).
            if (card.type === 'trap' && slot.setOnTurn === gameState.turn) return false;
            if (card.type === 'trap' && areTrapsNegatedFor(owner)) return false;
        }
        const ctx = makeContext(owner, { card: card, zone: zone, index: index });
        return typeof def.canActivate === 'function' ? !!def.canActivate(ctx) : true;
    }

    function activateCard(owner, zone, index, extra) {
        if (!canActivate(owner, zone, index)) return false;
        const card = zone === 'hand' ? handOf(owner)[index] : stFieldOf(owner)[index].card;
        const def = getDefinition(card.id);
        const ctx = makeContext(owner, Object.assign({ card: card, zone: zone, index: index }, extra || {}));

        addToLog(`✨ ${owner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${card.name}!`);
        if (window.FX && zone === 'st') {
            const el = document.querySelector(`#${owner === 'player' ? 'playerFieldBoard' : 'botFieldBoard'} .field-slot[data-owner="${owner}"][data-type="st"][data-index="${index}"] .card`);
            if (el) FX.playCardActivateEffect(el);
        }

        // Le Magie Normali e le Trappole si attivano E si scartano subito
        // al Cimitero. Le Magie/Trappole CONTINUE invece (`def.continuous
        // === true`, es. Spada Rivelatrice) restano piazzate e scoperte
        // sul Terreno: il loro effetto si applica ad ogni render tramite
        // static()/recomputeStaticEffects(), esattamente come un mostro
        // con effetto continuo.
        if (def.continuous && zone === 'st') {
            stFieldOf(owner)[index].isFaceDown = false;
        } else if (zone === 'hand') {
            handOf(owner).splice(index, 1);
            graveyardOf(owner).push(card);
        } else {
            stFieldOf(owner)[index] = null;
            graveyardOf(owner).push(card);
        }

        if (typeof def.activate === 'function') def.activate(ctx);

        if (window.MP_broadcast && !window.MP_applyingRemote) {
            window.MP_broadcast(Object.assign({ kind: 'activate', owner: owner, cardId: card.id, zone: zone, index: index }, extra || {}));
        }

        if (typeof updateUI === 'function') updateUI();
        return true;
    }

    // ============================================================
    // Esportazione dell'API pubblica.
    // ============================================================
    window.DuelEngine = {
        TRIGGER: TRIGGER,
        register: register,
        getDefinition: getDefinition,
        fireTrigger: fireTrigger,
        makeContext: makeContext,
        recomputeStaticEffects: recomputeStaticEffects,
        areTrapsNegatedFor: areTrapsNegatedFor,
        cannotAttack: cannotAttack,
        isRevealedFor: isRevealedFor,
        canActivate: canActivate,
        activateCard: activateCard,
        actions: ACTIONS
    };
    // Alias comodo usato anche nei commenti/documentazione del progetto.
    window.CardEffects = { register: register };
})();
