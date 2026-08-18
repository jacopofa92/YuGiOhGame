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
        ON_DESTROY: 'onDestroy',              // subito dopo che un mostro viene distrutto e va al Cimitero
        ON_STANDBY_PHASE: 'onStandbyPhase',   // durante la Standby Phase del giocatore di turno (proprie carte)
        ON_END_PHASE: 'onEndPhase'            // durante la End Phase del giocatore di turno (proprie carte)
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

    /**
     * La zona Magia Terreno (gameState.playerFieldSpell/botFieldSpell): a
     * differenza di stFieldOf() qui sopra NON è un array di 5 caselle ma
     * UN SOLO oggetto { card, isFaceDown, setOnTurn } o null — al massimo
     * una Magia Terreno per lato, come da regola vera.
     */
    function fieldSpellOf(owner) {
        return owner === 'player' ? gameState.playerFieldSpell : gameState.botFieldSpell;
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
            const destroyedCard = slot.card;
            graveyardOf(owner).push(destroyedCard);
            field[index] = null;
            if (typeof triggerDestroyEffect === 'function') {
                triggerDestroyEffect(owner, index, 'monster');
            }
            // ctx.card = la carta appena distrutta (serve a fireTrigger per
            // trovarne la definizione — vedi il ramo TRIGGER.ON_DESTROY qui
            // sotto), non più recuperabile da field[index] dato che è già
            // stato svuotato qui sopra.
            fireTrigger(TRIGGER.ON_DESTROY, makeContext(owner, { slotIndex: index, card: destroyedCard }));
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

        /**
         * Pesca `amount` carte per il giocatore indicato, riusando la stessa
         * logica del Draw Phase. L'animazione (sfilata + FX + suono) NON
         * parte da qui: va scatenata dopo che activateCard() qui sotto ha
         * già chiamato il proprio updateUI(), altrimenti quel render
         * ricostruirebbe la mano e staccherebbe i nodi appena animati dal
         * documento — vedi animateEffectDraw() in game-flow.js. Per questo
         * ci si limita ad accodare l'animazione in gameState.
         */
        drawCards(owner, amount) {
            const drawn = drawCardsToHand(owner, amount);
            if (drawn > 0) {
                const pending = gameState._pendingDrawAnimation;
                gameState._pendingDrawAnimation = {
                    owner: owner,
                    count: (pending && pending.owner === owner ? pending.count : 0) + drawn
                };
            }
            return drawn;
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
        },

        /**
         * Evocazione Fusione: manda al Cimitero ogni Materiale da Fusione
         * (dalla mano e/o dal Terreno, in base a dove getFusableExtraDeckMonsters
         * qui sotto li ha trovati) e fa uscire il mostro scelto
         * dall'Extra Deck, scoperto in Posizione di Attacco, sul primo
         * slot Mostro libero.
         * `materialLocations`: array di { zone: 'hand'|'monster', index }
         * (vedi getFusableExtraDeckMonsters). Torna false senza fare nulla
         * se il Terreno è pieno o l'indice Extra Deck non è valido, così
         * chi chiama non deve ricontrollare da sé prima di invocarla.
         */
        fusionSummon(owner, extraDeckIndex, materialLocations) {
            const extraDeck = owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
            const fusionCard = extraDeck && extraDeck[extraDeckIndex];
            if (!fusionCard) return false;
            const slotIndex = ACTIONS.findEmptyMonsterSlot(owner);
            if (slotIndex === -1) {
                addToLog('❌ Il Terreno è pieno: impossibile Evocare per Fusione.');
                return false;
            }
            const hand = handOf(owner);
            const field = fieldOf(owner);
            const graveyard = graveyardOf(owner);
            // Indici più alti prima: rimuovere prima un indice mano basso
            // sposterebbe (di uno) un indice mano più alto ancora da
            // rimuovere. Gli indici Terreno non si spostano mai (sono
            // caselle fisse messe a null, non un array che si accorcia),
            // quindi per loro l'ordine non conta.
            const sorted = [...(materialLocations || [])].sort((a, b) => b.index - a.index);
            sorted.forEach((loc) => {
                if (loc.zone === 'hand') {
                    const [card] = hand.splice(loc.index, 1);
                    if (card) graveyard.push(card);
                } else if (loc.zone === 'monster' && field[loc.index]) {
                    graveyard.push(field[loc.index].card);
                    field[loc.index] = null;
                }
            });
            extraDeck.splice(extraDeckIndex, 1);
            ACTIONS.specialSummon(owner, fusionCard, slotIndex, 'attack');
            addToLog(`🔗 ${owner === 'player' ? 'Hai' : 'Il bot ha'} Evocato per Fusione ${fusionCard.name}!`);
            return true;
        },

        /**
         * Bando TEMPORANEO con ritorno programmato (es. Buco Dimensionale,
         * Ninja d'Assalto) — diverso da un normale invio al Cimitero: la
         * carta esce dal Terreno ma resta "in sospeso" in
         * gameState.temporaryBanishments, e torna in campo da sola quando
         * scatta `returnTrigger`: 'standby' (alla prossima Standby Phase
         * DI `owner`) oppure 'endphase' (alla prossima End Phase, di
         * chiunque — chi bandisce durante il proprio turno la rivedrà
         * sempre entro la fine dello stesso turno). Il chiamante toglie
         * `card` dal Terreno PRIMA di chiamare questa funzione, esattamente
         * come specialSummon() qui sopra.
         */
        banishTemporarily(owner, card, returnTrigger) {
            gameState.temporaryBanishments = gameState.temporaryBanishments || [];
            gameState.temporaryBanishments.push({ card: card, owner: owner, returnTrigger: returnTrigger });
        }
    };

    /**
     * Fa tornare in campo, scoperte in Posizione di Attacco, tutte le
     * carte bandite temporaneamente (vedi ACTIONS.banishTemporarily) il
     * cui `returnTrigger` corrisponde alla fase appena raggiunta —
     * chiamata da enterStandbyPhase()/enterEndPhase() in game-flow.js,
     * esattamente come firePhaseTrigger(). Se il Terreno del proprietario
     * è pieno al momento del ritorno, la carta finisce nel Cimitero
     * invece di restare bandita per sempre (SEMPLIFICAZIONE: nella realtà
     * aspetterebbe il primo slot libero, ma qui il "ritorno mancato"
     * richiederebbe un secondo tracking persistente non ancora presente).
     */
    function processTemporaryBanishmentReturns(returnTrigger, currentTurnOwner) {
        if (!gameState.temporaryBanishments || gameState.temporaryBanishments.length === 0) return;
        const stillBanished = [];
        gameState.temporaryBanishments.forEach((entry) => {
            const shouldReturn = entry.returnTrigger === returnTrigger && (returnTrigger === 'endphase' || entry.owner === currentTurnOwner);
            if (!shouldReturn) { stillBanished.push(entry); return; }
            const slotIndex = fieldOf(entry.owner).findIndex((slot) => slot === null);
            if (slotIndex === -1) {
                graveyardOf(entry.owner).push(entry.card);
                addToLog(`⚠️ Il Terreno è pieno: ${entry.card.name} torna al Cimitero invece che in campo dal bando temporaneo.`);
                return;
            }
            fieldOf(entry.owner)[slotIndex] = { card: entry.card, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false };
            addToLog(`🌀 ${entry.card.name} torna in campo dal bando temporaneo!`);
        });
        gameState.temporaryBanishments = stillBanished;
    }

    // ============================================================
    // Special Summon dalla mano su iniziativa del giocatore (es.
    // Gilasaurus, Il Demone Megacyber, i mostri Toon che dipendono da
    // "Mondo dei Toon"): diverso dall'Evocazione Normale/Tributo E da un
    // Special Summon scatenato da un'ALTRA carta (es. Rinascita del
    // Mostro) — qui è il giocatore stesso, cliccando un mostro in mano,
    // a decidere di farlo entrare in campo tramite il proprio effetto.
    // Un'eventuale conseguenza "se Special Summonata così" va scritta
    // come onSpecialSummon(ctx) sulla carta stessa: ACTIONS.specialSummon
    // qui sotto scatena comunque TRIGGER.ON_SPECIAL_SUMMON come ogni
    // altro Special Summon, quindi quell'aggancio esistente basta, senza
    // bisogno di un evento dedicato.
    // ============================================================

    /** Vero se card.id nella mano di `owner` (indice `handIndex`) ha un canSpecialSummonFromHand(ctx) e quella condizione è vera ORA. */
    function canSpecialSummonFromHand(owner, handIndex) {
        const card = handOf(owner)[handIndex];
        if (!card) return false;
        const def = getDefinition(card.id);
        if (!def || typeof def.canSpecialSummonFromHand !== 'function') return false;
        return !!def.canSpecialSummonFromHand(makeContext(owner, { card: card, handIndex: handIndex }));
    }

    /**
     * Prova a Special Summonare dalla mano la carta all'indice `handIndex`.
     * Se la carta definisce anche `paySpecialSummonCost(ctx)` (es. Teschio
     * Evocato Toon, che richiede di sacrificare 1 mostro), quella funzione
     * va chiamata PRIMA di togliere la carta dalla mano, e se ritorna
     * false l'intera Special Summon viene annullata (costo non pagabile).
     */
    function trySpecialSummonFromHand(owner, handIndex) {
        if (!canSpecialSummonFromHand(owner, handIndex)) return false;
        const hand = handOf(owner);
        const card = hand[handIndex];
        const def = getDefinition(card.id);
        const slotIndex = fieldOf(owner).findIndex((slot) => slot === null);
        if (slotIndex === -1) {
            addToLog('❌ Il Terreno è pieno: impossibile Special Summonare.');
            return false;
        }
        if (typeof def.paySpecialSummonCost === 'function') {
            const costPaid = def.paySpecialSummonCost(makeContext(owner, { card: card, handIndex: handIndex }));
            if (!costPaid) return false;
        }
        hand.splice(handIndex, 1);
        ACTIONS.specialSummon(owner, card, slotIndex, 'attack');
        addToLog(`✨ ${owner === 'player' ? 'Hai' : 'Il bot ha'} Special Summonato ${card.name} dalla mano!`);
        return true;
    }

    // ============================================================
    // Special Summon dall'EXTRA DECK bandendo materiali (es. Cannone
    // Drago XY/XYZ) — diverso dall'Evocazione Fusione vera e propria
    // (ACTIONS.fusionSummon/getFusableExtraDeckMonsters più sopra): qui
    // non c'è nessuna Magia "Fusione" di mezzo, il mostro Extra Deck ha
    // scritto sulla PROPRIA carta la condizione "bandisci questi materiali
    // che controlli", quindi il giocatore lo attiva da sé (click sulla
    // zona Fusion, vedi createSlotElement in game-flow.js) invece che
    // attivando una carta. I materiali vanno presi SOLO dal Terreno (mai
    // dalla mano — è così anche sulla carta vera) scoperti, e bandirli
    // qui significa solo "sparire dal Terreno senza andare al Cimitero",
    // stessa SEMPLIFICAZIONE "banish" già usata altrove in questo motore
    // (nessuna zona Banditi dedicata).
    // Carte che la usano dichiarano `banishFusionMaterials: [idA, idB]`
    // nella propria registrazione in card-effects.js, stesso spirito di
    // `fusionMaterials` ma per questo percorso alternativo.
    // ============================================================

    /**
     * Cerca tra i mostri dell'Extra Deck di `owner` quelli con
     * `banishFusionMaterials` per cui TUTTI i materiali richiesti sono
     * scoperti sul Terreno di `owner` ORA. Torna un array di
     * { extraDeckIndex, card, materialFieldIndices }, pronto per
     * banishFusionSummon qui sotto.
     */
    function getBanishFusableExtraDeckMonsters(owner) {
        const extraDeck = owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
        if (!extraDeck || extraDeck.length === 0) return [];
        const field = fieldOf(owner);
        const results = [];
        extraDeck.forEach((extraCard, extraDeckIndex) => {
            const def = getDefinition(extraCard.id);
            if (!def || !Array.isArray(def.banishFusionMaterials) || def.banishFusionMaterials.length === 0) return;
            const usedFieldIdx = new Set();
            const materialFieldIndices = [];
            const ok = def.banishFusionMaterials.every((materialId) => {
                const fieldIdx = field.findIndex((s, i) => s && !s.isFaceDown && s.card.id === materialId && !usedFieldIdx.has(i));
                if (fieldIdx !== -1) {
                    usedFieldIdx.add(fieldIdx);
                    materialFieldIndices.push(fieldIdx);
                    return true;
                }
                return false;
            });
            if (ok) results.push({ extraDeckIndex, card: extraCard, materialFieldIndices });
        });
        return results;
    }

    /**
     * Esegue davvero lo Special Summon dall'Extra Deck bandendo i
     * materiali agli indici Terreno indicati (da getBanishFusableExtraDeckMonsters
     * qui sopra). Torna false senza fare nulla se il Terreno è pieno o
     * l'indice Extra Deck non è più valido.
     */
    function banishFusionSummon(owner, extraDeckIndex, materialFieldIndices) {
        const extraDeck = owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
        const fusionCard = extraDeck && extraDeck[extraDeckIndex];
        if (!fusionCard) return false;
        const slotIndex = ACTIONS.findEmptyMonsterSlot(owner);
        if (slotIndex === -1) {
            addToLog('❌ Il Terreno è pieno: impossibile Special Summonare.');
            return false;
        }
        const field = fieldOf(owner);
        (materialFieldIndices || []).forEach((idx) => {
            // Bandire = sparisce e basta (vedi il commento della sezione
            // qui sopra): niente Cimitero, niente zona Banditi dedicata.
            field[idx] = null;
        });
        extraDeck.splice(extraDeckIndex, 1);
        ACTIONS.specialSummon(owner, fusionCard, slotIndex, 'attack');
        addToLog(`🌀 ${owner === 'player' ? 'Hai' : 'Il bot ha'} Special Summonato ${fusionCard.name} bandendo i materiali!`);
        return true;
    }

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
            if (def && typeof def.onFlip === 'function') {
                if (window.FX) FX.playCardActivateCenterScreen(ctx.card);
                def.onFlip(ctx);
            }
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
            if (typeof selfHandler === 'function') {
                if (window.FX) FX.playCardActivateCenterScreen(ctx.summonedCard);
                selfHandler(ctx);
            }

            // 2) Finestra di risposta per l'avversario (es. Buco Trappola).
            respondWindow('onOpponentSummon', ctx, finish);
            return;
        }

        if (name === TRIGGER.ON_ATTACK_DECLARE) {
            respondWindow('onAttackDeclare', ctx, finish);
            return;
        }

        if (name === TRIGGER.ON_DESTROY) {
            // "Quando questa carta viene distrutta [in battaglia] e mandata
            // al Cimitero: [effetto]" — SOLO auto-effetto della carta
            // appena distrutta (ctx.card), non una finestra di risposta per
            // l'avversario: nessuna carta di questo set reagisce alla
            // distruzione di UN'ALTRA carta tramite questo trigger.
            const def = getDefinition(ctx.card.id);
            if (def && typeof def.onDestroy === 'function') {
                if (window.FX) FX.playCardActivateCenterScreen(ctx.card);
                def.onDestroy(ctx);
            }
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

        // Solo per 'onAttackDeclare': anche il mostro scoperto PRESO DI
        // MIRA dall'attacco può rispondere (es. Muro d'Illusione, Suijin —
        // "quando questa carta viene attaccata..."), non solo le Magie/
        // Trappole Set e la mano del difensore. ctx.targetIndex arriva già
        // pronto nel contesto costruito da executeAttack() in actions.js.
        if (handlerName === 'onAttackDeclare' && typeof ctx.targetIndex === 'number' && ctx.targetIndex !== -1) {
            const targetSlot = fieldOf(responderOwner)[ctx.targetIndex];
            if (targetSlot && !targetSlot.isFaceDown) {
                const def = getDefinition(targetSlot.card.id);
                if (def && typeof def[handlerName] === 'function') {
                    candidates.push({ zone: 'monster', index: ctx.targetIndex, card: targetSlot.card, def: def });
                }
            }
        }

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
            // da mano finiscono entrambi al Cimitero), come in activateCard()
            // — TRANNE zone === 'monster' (es. Muro d'Illusione, Suijin,
            // Kazejin: un mostro già scoperto sul Terreno che risponde con
            // un proprio effetto non si "consuma" né va al Cimitero, resta
            // dov'è; un eventuale effetto collaterale — es. il bounce
            // dell'attaccante di Muro d'Illusione — lo gestisce da solo il
            // suo stesso handler, chiamato comunque qui sotto).
            if (choice.zone === 'st') {
                stFieldOf(responderOwner)[choice.index] = null;
                graveyardOf(responderOwner).push(choice.card);
            } else if (choice.zone === 'hand') {
                const h = handOf(responderOwner);
                const pos = h.indexOf(choice.card);
                if (pos !== -1) h.splice(pos, 1);
                graveyardOf(responderOwner).push(choice.card);
            }
            addToLog(`🛡️ ${responderOwner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${choice.card.name} in risposta!`);
            if (window.FX) FX.playCardActivateCenterScreen(choice.card);
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
        gameState.spellsNegatedFor = { player: false, bot: false };
        gameState.cannotAttackFor = { player: false, bot: false };
        gameState.revealedFor = { player: false, bot: false };
        gameState.atkDefBonus = {}; // chiave = uid della carta -> {atk, def}

        ['player', 'bot'].forEach((owner) => {
            // Mostri scoperti sul campo (es. Jinzo).
            fieldOf(owner).forEach((slot, index) => {
                if (!slot || slot.isFaceDown) return;
                const def = getDefinition(slot.card.id);
                if (def && typeof def.static === 'function') {
                    def.static(makeContext(owner, { card: slot.card, slot: slot, slotIndex: index }));
                }
            });
            // Magie/Trappole Continue scoperte sul Terreno (es. Spada
            // Rivelatrice): restano piazzate invece di finire subito al
            // Cimitero, e il loro effetto si ricalcola qui ad ogni render
            // esattamente come per un mostro continuo — vedi il campo
            // `continuous` gestito da activateCard() più sotto.
            stFieldOf(owner).forEach((slot, index) => {
                if (!slot || slot.isFaceDown) return;
                const def = getDefinition(slot.card.id);
                if (!def) return;
                // Carte Equipaggiamento (def.isEquip): se il mostro a cui
                // erano equipaggiate non è più lì (distrutto, tornato in
                // mano, ecc.), la Carta Equipaggiamento va al Cimitero da
                // sola, PRIMA di provare a calcolare il proprio static() —
                // altrimenti applicherebbe un bonus a un mostro che non
                // c'è più, o peggio a un uid riciclato per errore.
                if (def.isEquip) {
                    const targetOwner = slot.card.equippedToOwner;
                    const targetSlot = targetOwner != null ? fieldOf(targetOwner)[slot.card.equippedToIndex] : null;
                    const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === slot.card.equippedToUid;
                    if (!validTarget) {
                        stFieldOf(owner)[index] = null;
                        graveyardOf(owner).push(slot.card);
                        return;
                    }
                }
                if (typeof def.static === 'function') {
                    def.static(makeContext(owner, { card: slot.card, slot: slot, index: index }));
                }
            });
        });
    }

    /**
     * Scatena un trigger di fase (Standby/End Phase) su OGNI carta scoperta
     * sul campo del giocatore DI TURNO (mostri e Magie/Trappole Continue) —
     * a differenza di ON_FLIP/ON_DESTROY (una carta sola coinvolta), qui
     * più carte diverse possono reagire alla STESSA Standby/End Phase, una
     * dopo l'altra. Chiamata da enterStandbyPhase()/enterEndPhase() in
     * game-flow.js, solo per il giocatore che sta vivendo quella fase (le
     * carte dell'avversario non scattano: "durante la TUA Standby/End
     * Phase" è sempre riferito al proprio controllore).
     */
    function firePhaseTrigger(handlerName, owner) {
        fieldOf(owner).forEach((slot, index) => {
            if (!slot || slot.isFaceDown) return;
            const def = getDefinition(slot.card.id);
            if (def && typeof def[handlerName] === 'function') {
                if (window.FX) FX.playCardActivateCenterScreen(slot.card);
                def[handlerName](makeContext(owner, { card: slot.card, slot: slot, slotIndex: index }));
            }
        });
        stFieldOf(owner).forEach((slot, index) => {
            if (!slot || slot.isFaceDown) return;
            const def = getDefinition(slot.card.id);
            if (def && typeof def[handlerName] === 'function') {
                if (window.FX) FX.playCardActivateCenterScreen(slot.card);
                def[handlerName](makeContext(owner, { card: slot.card, slot: slot, index: index, zone: 'st' }));
            }
        });
    }

    /**
     * Bonus ATK/DEF valido SOLO per il calcolo di QUESTA battaglia (Damage
     * Step), non persistente come gameState.atkDefBonus — es. Soldati
     * Insetto del Cielo, che guadagna 1000 ATK solo se attacca un mostro
     * VENTO, solo per quello scontro. `role` è 'attacker' o 'defender' dal
     * punto di vista di `card`; `opponentCard` è l'altro mostro coinvolto
     * (null per un attacco diretto, dove non c'è "l'altro mostro").
     */
    function getDamageStepBonus(card, opponentCard, role) {
        if (!card) return { atk: 0, def: 0 };
        const def = getDefinition(card.id);
        if (!def || typeof def.damageStepBonus !== 'function') return { atk: 0, def: 0 };
        const result = def.damageStepBonus({ card: card, opponentCard: opponentCard || null, role: role }) || {};
        return { atk: result.atk || 0, def: result.def || 0 };
    }

    /**
     * ATK/DEF "effettivo" di una carta in campo: il valore base della
     * carta più l'eventuale bonus continuo scritto in gameState.atkDefBonus
     * da un effetto static() (vedi recomputeStaticEffects qui sopra) — es.
     * "+300 ATK per ogni X sul Terreno", ricalcolato ad ogni render. Usata
     * sia dal calcolo battaglia (resolveBattleDamage in actions.js) sia dal
     * rendering (card-renderer.js), così un simile buff è vero in battaglia
     * e non solo mostrato a schermo. Sicura da chiamare anche fuori da un
     * duello attivo — es. su Cartoteca, dove card.uid è assente e
     * `gameState` non esiste nemmeno come variabile globale (game-flow.js
     * non è caricato lì): in quel caso ricade sempre sul valore base.
     */
    function getEffectiveAtk(card) {
        if (!card || card.type !== 'monster') return card ? card.attack : 0;
        if (card.uid === undefined || typeof gameState === 'undefined' || !gameState.atkDefBonus) return card.attack;
        const bonus = gameState.atkDefBonus[card.uid];
        return card.attack + (bonus ? (bonus.atk || 0) : 0);
    }

    function getEffectiveDef(card) {
        if (!card || card.type !== 'monster') return card ? card.defense : 0;
        if (card.uid === undefined || typeof gameState === 'undefined' || !gameState.atkDefBonus) return card.defense;
        const bonus = gameState.atkDefBonus[card.uid];
        return card.defense + (bonus ? (bonus.def || 0) : 0);
    }

    /**
     * Cerca tra i mostri nell'Extra Deck di `owner` quelli per cui sono
     * disponibili TUTTI i Materiali da Fusione richiesti (def.fusionMaterials,
     * un array di ID carta — vedi la sezione "EVOCAZIONE FUSIONE" in
     * card-effects.js), sommando mano + Terreno scoperto. Torna un array
     * di { extraDeckIndex, card, materialLocations }, pronto per
     * ACTIONS.fusionSummon (vedi sopra) — vuoto se nessun mostro è
     * fondibile ora.
     * SEMPLIFICAZIONE: un materiale nominato per ID basta che sia
     * presente, senza altre condizioni (es. "Livello 4+"); preferisce
     * prendere ogni materiale dalla MANO prima che dal Terreno, per non
     * smontare un mostro già in gioco se non serve.
     */
    function getFusableExtraDeckMonsters(owner) {
        const extraDeck = owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
        if (!extraDeck || extraDeck.length === 0) return [];
        const hand = handOf(owner);
        const field = fieldOf(owner);
        const results = [];
        extraDeck.forEach((extraCard, extraDeckIndex) => {
            const def = getDefinition(extraCard.id);
            if (!def || !Array.isArray(def.fusionMaterials) || def.fusionMaterials.length === 0) return;
            const usedHandIdx = new Set();
            const usedFieldIdx = new Set();
            const materialLocations = [];
            const ok = def.fusionMaterials.every((materialId) => {
                const handIdx = hand.findIndex((c, i) => c.id === materialId && !usedHandIdx.has(i));
                if (handIdx !== -1) {
                    usedHandIdx.add(handIdx);
                    materialLocations.push({ zone: 'hand', index: handIdx });
                    return true;
                }
                const fieldIdx = field.findIndex((s, i) => s && !s.isFaceDown && s.card.id === materialId && !usedFieldIdx.has(i));
                if (fieldIdx !== -1) {
                    usedFieldIdx.add(fieldIdx);
                    materialLocations.push({ zone: 'monster', index: fieldIdx });
                    return true;
                }
                return false;
            });
            if (ok) results.push({ extraDeckIndex, card: extraCard, materialLocations });
        });
        return results;
    }

    /** Vero se le Trappole del giocatore indicato sono negate da un effetto continuo (es. Jinzo avversario). */
    function areTrapsNegatedFor(owner) {
        return !!(gameState.trapsNegatedFor && gameState.trapsNegatedFor[owner]);
    }

    /** Vero se le Magie del giocatore indicato sono negate da un effetto continuo (es. Cancella Magie). */
    function areSpellsNegatedFor(owner) {
        return !!(gameState.spellsNegatedFor && gameState.spellsNegatedFor[owner]);
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
        const card = zone === 'hand' ? handOf(owner)[index]
            : zone === 'monster' ? (fieldOf(owner)[index] && !fieldOf(owner)[index].isFaceDown && fieldOf(owner)[index].card)
            : zone === 'fieldSpell' ? (fieldSpellOf(owner) && fieldSpellOf(owner).card)
            : stFieldOf(owner)[index] && stFieldOf(owner)[index].card;
        if (!card) return false;
        const def = getDefinition(card.id);
        if (!def || typeof def.activate !== 'function') return false;
        if (zone === 'st' || zone === 'fieldSpell') {
            const slot = zone === 'fieldSpell' ? fieldSpellOf(owner) : stFieldOf(owner)[index];
            // Una Magia/Trappola CONTINUA già scoperta è già attiva e resta
            // in campo a fare il suo effetto tramite static()/onXPhase():
            // non è mai "ri-attivabile" cliccandola di nuovo — altrimenti
            // ri-eseguirebbe activate() da capo (es. pagherebbe di nuovo un
            // costo in Life Points come Mondo dei Toon, id 487). Una Magia
            // Terreno (zone 'fieldSpell') è sempre "continua" per natura,
            // anche senza il flag def.continuous — vedi lo stesso ragionamento
            // in activateCard più sotto.
            if ((def.continuous || zone === 'fieldSpell') && !slot.isFaceDown) return false;
            // Regola classica: una Trappola Set non si può attivare nello
            // stesso turno in cui è stata piazzata. Una Magia Set invece
            // può essere attivata subito (qui semplifichiamo il "gioca la
            // Magia direttamente dalla mano" con "Set + attiva quando
            // vuoi", ma solo le Trappole hanno il vincolo del turno).
            if (card.type === 'trap' && slot.setOnTurn === gameState.turn) return false;
            if (card.type === 'trap' && areTrapsNegatedFor(owner)) return false;
            if (card.type === 'spell' && areSpellsNegatedFor(owner)) return false;
        }
        // Effetto Ignition di un mostro (es. Soldato Cannone, Tartaruga
        // Catapulta): una volta per turno PER CARTA (uid), come da testo
        // reale di ogni carta che lo usa — resettato ad ogni cambio turno,
        // vedi gameState.usedIgnitionThisTurn in resetGameState/changeTurn
        // (game-flow.js).
        if (zone === 'monster' && gameState.usedIgnitionThisTurn && gameState.usedIgnitionThisTurn[card.uid]) return false;
        // Una Magia Continua attivata DIRETTAMENTE dalla mano (non da un Set
        // preesistente) deve comunque finire scoperta su uno slot Magia/
        // Trappola libero (vedi activateCard più sotto): se il Terreno è
        // pieno, semplicemente non si può attivare adesso. Una Magia Terreno
        // NON ha bisogno di uno slot libero: ha una zona tutta sua e
        // attivarne una nuova sostituisce semplicemente quella vecchia.
        if (zone === 'hand' && def.continuous && card.subtype !== 'field' && !stFieldOf(owner).some((s) => s === null)) return false;
        const ctx = makeContext(owner, { card: card, zone: zone, index: index });
        return typeof def.canActivate === 'function' ? !!def.canActivate(ctx) : true;
    }

    function activateCard(owner, zone, index, extra) {
        if (!canActivate(owner, zone, index)) return false;
        const card = zone === 'hand' ? handOf(owner)[index]
            : zone === 'monster' ? fieldOf(owner)[index].card
            : zone === 'fieldSpell' ? fieldSpellOf(owner).card
            : stFieldOf(owner)[index].card;
        const def = getDefinition(card.id);

        addToLog(`✨ ${owner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${zone === 'monster' ? `l'effetto di ${card.name}` : card.name}!`);
        // Comparsa grande a centro schermo (~2s, pulse + suono + fade) per
        // OGNI attivazione — Magia, Trappola o effetto Ignition di un
        // mostro — invece del solo glow sulla carta in campo di prima:
        // vedi playCardActivateCenterScreen in effects.js.
        if (window.FX) FX.playCardActivateCenterScreen(card);

        // Le Magie Normali e le Trappole si attivano E si scartano subito
        // al Cimitero. Le Magie/Trappole CONTINUE invece (`def.continuous
        // === true`, es. Spada Rivelatrice) restano piazzate e scoperte
        // sul Terreno: il loro effetto si applica ad ogni render tramite
        // static()/recomputeStaticEffects(), esattamente come un mostro
        // con effetto continuo. Se l'attivazione parte dalla MANO (non da
        // un Set preesistente sul Terreno), una Continua deve comunque
        // finire scoperta su uno slot Magia/Trappola libero — non può
        // sparire nel Cimitero come farebbe una Magia Normale — quindi
        // `finalZone`/`finalIndex` seguono dove la carta finisce DAVVERO,
        // non da dove è partita, così def.activate(ctx) sotto trova la
        // carta al posto giusto (es. id8 la cerca via ctx.index).
        let finalZone = zone;
        let finalIndex = index;
        if (zone === 'monster') {
            // Un effetto Ignition NON manda la carta al Cimitero né la
            // muove: il mostro resta esattamente dov'è, scoperto sul
            // Terreno — solo il segno "già usato in questo turno" cambia.
            gameState.usedIgnitionThisTurn = gameState.usedIgnitionThisTurn || {};
            gameState.usedIgnitionThisTurn[card.uid] = true;
        } else if (card.subtype === 'field' && zone === 'hand') {
            // Una Magia Terreno ha una zona tutta sua (una sola carta, non
            // un array di 5 come stFieldOf) — attivarne una nuova mentre
            // ce n'è già una scoperta manda quella vecchia al Cimitero,
            // come da regola vera, invece di cercare uno slot libero.
            const fieldKey = owner === 'player' ? 'playerFieldSpell' : 'botFieldSpell';
            const existing = gameState[fieldKey];
            if (existing) {
                graveyardOf(owner).push(existing.card);
                addToLog(`🌍 ${existing.card.name} lascia il Terreno, sostituita da ${card.name}.`);
            }
            handOf(owner).splice(index, 1);
            gameState[fieldKey] = { card: card, isFaceDown: false, setOnTurn: gameState.turn };
            finalZone = 'fieldSpell';
            finalIndex = -1;
        } else if (card.subtype === 'field' && zone === 'fieldSpell') {
            // Era già Set coperta sulla sua zona: si scopre sul posto.
            gameState[owner === 'player' ? 'playerFieldSpell' : 'botFieldSpell'].isFaceDown = false;
        } else if (def.continuous && zone === 'st') {
            stFieldOf(owner)[index].isFaceDown = false;
        } else if (def.continuous && zone === 'hand') {
            const freeSlot = stFieldOf(owner).findIndex((s) => s === null);
            handOf(owner).splice(index, 1);
            stFieldOf(owner)[freeSlot] = { card: card, isFaceDown: false, setOnTurn: gameState.turn };
            finalZone = 'st';
            finalIndex = freeSlot;
        } else if (zone === 'hand') {
            handOf(owner).splice(index, 1);
            graveyardOf(owner).push(card);
        } else {
            stFieldOf(owner)[index] = null;
            graveyardOf(owner).push(card);
        }

        const ctx = makeContext(owner, Object.assign({ card: card, zone: finalZone, index: finalIndex }, extra || {}));
        if (typeof def.activate === 'function') def.activate(ctx);

        if (window.MP_broadcast && !window.MP_applyingRemote) {
            window.MP_broadcast(Object.assign({ kind: 'activate', owner: owner, cardId: card.id, zone: zone, index: index }, extra || {}));
        }

        if (typeof updateUI === 'function') updateUI();
        // Solo ORA, a mano già ridisegnata da updateUI() qui sopra, è sicuro
        // animare un'eventuale pescata scatenata da questa carta (es. Vaso
        // dell'Avidità) — vedi il commento su ACTIONS.drawCards più sopra.
        if (gameState._pendingDrawAnimation && typeof animateEffectDraw === 'function') {
            const pending = gameState._pendingDrawAnimation;
            gameState._pendingDrawAnimation = null;
            animateEffectDraw(pending.owner, pending.count);
        }
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
        firePhaseTrigger: firePhaseTrigger,
        getDamageStepBonus: getDamageStepBonus,
        canSpecialSummonFromHand: canSpecialSummonFromHand,
        trySpecialSummonFromHand: trySpecialSummonFromHand,
        getBanishFusableExtraDeckMonsters: getBanishFusableExtraDeckMonsters,
        banishFusionSummon: banishFusionSummon,
        processTemporaryBanishmentReturns: processTemporaryBanishmentReturns,
        getEffectiveAtk: getEffectiveAtk,
        getEffectiveDef: getEffectiveDef,
        getFusableExtraDeckMonsters: getFusableExtraDeckMonsters,
        areTrapsNegatedFor: areTrapsNegatedFor,
        areSpellsNegatedFor: areSpellsNegatedFor,
        cannotAttack: cannotAttack,
        isRevealedFor: isRevealedFor,
        canActivate: canActivate,
        activateCard: activateCard,
        actions: ACTIONS
    };
    // Alias comodo usato anche nei commenti/documentazione del progetto.
    window.CardEffects = { register: register };
})();
