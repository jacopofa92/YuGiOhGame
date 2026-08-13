/**
 * card-effects.js — Gli effetti delle singole carte.
 * =====================================================================
 * QUESTO è il file da aprire per capire/modificare cosa fa una carta, o
 * per aggiungerne una nuova con un effetto. Ogni carta con un effetto
 * meccanico (non solo testo di flavor) ha qui il suo blocchetto
 * `CardEffects.register(idCarta, { ... })`, con un commento sopra che
 * spiega l'effetto in linguaggio naturale prima del codice — copia un
 * blocchetto esistente simile a quello che vuoi creare come punto di
 * partenza.
 *
 * Il "come funziona" (trigger, finestre di risposta, helper come
 * ctx.destroyMonster/ctx.dealDamage/ecc.) è spiegato in js/duel-engine.js,
 * che va caricato PRIMA di questo file. Qui non c'è altro che le regole
 * delle singole carte.
 *
 * Le proprietà che una carta può definire:
 *   static(ctx)          — effetto continuo, richiamato ad ogni render
 *                           finché la carta resta scoperta sul campo.
 *   canActivate(ctx)      — deve tornare true/false: si può attivare ORA?
 *                           (se assente, si assume sempre true)
 *   activate(ctx)          — cosa succede quando la carta viene attivata
 *                           manualmente (Magie Normali/Continue, Trappole
 *                           Ignition — nessuna in questo set per ora).
 *   continuous: true      — SOLO per Magie/Trappole: invece di andare
 *                           subito al Cimitero dopo l'attivazione, la
 *                           carta resta scoperta sul Terreno e il suo
 *                           effetto si applica tramite static() (es.
 *                           Spada Rivelatrice).
 *   onAttackDeclare(ctx)  — la carta può rispondere quando l'AVVERSARIO
 *                           di chi la controlla dichiara un attacco
 *                           (Trappole o effetti da mano come Kuriboh).
 *   onOpponentSummon(ctx) — la carta può rispondere quando l'AVVERSARIO
 *                           di chi la controlla Evoca un mostro (es.
 *                           Buco Trappola).
 *
 * NIENTE Pendulum/XYZ/Link/Synchro: questo gioco segue le regole della
 * prima serie di Yu-Gi-Oh (Evocazione Normale/Tributo, Flip, Fusione,
 * Magie/Trappole Normali/Continue/Campo).
 */
(function () {
    'use strict';

    // ================================================================
    // 7 — Buco Nero (Magia Normale)
    // "Distruggi tutti i mostri sul Terreno" — entrambi i giocatori,
    // senza eccezioni.
    // ================================================================
    CardEffects.register(7, {
        activate(ctx) {
            ctx.destroyAllMonsters();
            ctx.log('💥 Buco Nero inghiotte e distrugge tutti i mostri sul Terreno!');
        }
    });

    // ================================================================
    // 8 — Spada Rivelatrice (Magia CONTINUA)
    // Per 3 turni dell'avversario di chi la controlla: i suoi mostri non
    // possono dichiarare attacchi E i suoi mostri coperti restano visibili
    // scoperti (solo a schermo: restano "coperti" per le regole vere e
    // proprie, es. un attacco li rivela comunque con il consueto messaggio
    // di log — vedi isRevealedFor()/renderFields() in game-flow.js).
    // Il conto alla rovescia (slot.turnsLeft) scende di 1 ad ogni turno
    // dell'avversario colpito — vedi tickContinuousEffectDurations() in
    // game-flow.js, chiamata da changeTurn() — e allo scadere la carta va
    // da sola al Cimitero, invece di restare per sempre come le Magie
    // Continue normali.
    // ================================================================
    CardEffects.register(8, {
        continuous: true,
        durationTurns: 3,
        activate(ctx) {
            const slot = ctx.stField(ctx.owner)[ctx.index];
            if (slot) slot.turnsLeft = 3;
            ctx.log(`✨ ${ctx.owner === 'player' ? 'Hai' : 'Il bot ha'} attivato ${ctx.card.name}: per 3 turni i mostri avversari non possono attaccare e restano scoperti.`);
        },
        static(ctx) {
            gameState.cannotAttackFor[ctx.opponent] = true;
            gameState.revealedFor[ctx.opponent] = true;
        }
    });

    // ================================================================
    // 9 — Forza Riflessa (Trappola)
    // Quando l'avversario di chi la controlla dichiara un attacco:
    // distrugge TUTTI i mostri in Posizione di Attacco di chi ha
    // attaccato (di solito, anche il mostro attaccante stesso) e annulla
    // di conseguenza l'attacco.
    // ================================================================
    CardEffects.register(9, {
        onAttackDeclare(ctx) {
            const attackerField = ctx.field(ctx.opponent);
            attackerField.forEach((slot, index) => {
                if (slot && slot.position === 'attack') {
                    ctx.destroyMonster(ctx.opponent, index);
                }
            });
            ctx.cancelAttack();
            ctx.log('🌪️ Forza Riflessa distrugge tutti i mostri in Posizione di Attacco dell\'avversario!');
        }
    });

    // ================================================================
    // 10 — Cilindro Magico (Trappola)
    // Quando l'avversario di chi la controlla dichiara un attacco:
    // annulla l'attacco e infligge all'attaccante danno pari all'ATK del
    // mostro che ha attaccato.
    // ================================================================
    CardEffects.register(10, {
        onAttackDeclare(ctx) {
            ctx.cancelAttack();
            ctx.dealDamage(ctx.opponent, ctx.attackerAtk);
            ctx.log(`🌀 Cilindro Magico rimanda l'attacco al mittente: ${ctx.attackerAtk} danni!`);
        }
    });

    // ================================================================
    // 40 — Buco Trappola (Trappola)
    // Quando l'avversario di chi la controlla Evoca Normalmente o
    // Special Summon un mostro SCOPERTO con più di 1000 ATK: lo
    // distrugge. Un mostro Set (coperto) non rivela le sue statistiche,
    // quindi Buco Trappola non può scattare su un'Evocazione coperta.
    // ================================================================
    CardEffects.register(40, {
        canActivate(ctx) {
            return ctx.summonedPosition === 'attack' && ctx.summonedCard.attack > 1000;
        },
        onOpponentSummon(ctx) {
            ctx.destroyMonster(ctx.opponent, ctx.summonedSlotIndex);
            ctx.log(`🕳️ Buco Trappola distrugge ${ctx.summonedCard.name}!`);
        }
    });

    // ================================================================
    // 36 — Vaso dell'Avidità (Magia Normale)
    // Pesca 2 carte.
    // ================================================================
    CardEffects.register(36, {
        activate(ctx) {
            const drawn = ctx.drawCards(ctx.owner, 2);
            ctx.log(`🍯 ${ctx.owner === 'player' ? 'Hai pescato' : 'Il bot ha pescato'} ${drawn} cart${drawn === 1 ? 'a' : 'e'} con Vaso dell'Avidità.`);
        }
    });

    // ================================================================
    // 37 — Folgore Fulminante (Magia Normale)
    // Distruggi tutte le carte (mostri + Magie/Trappole) sul Terreno
    // dell'avversario di chi l'ha attivata.
    // ================================================================
    CardEffects.register(37, {
        activate(ctx) {
            ctx.destroyAllCards(ctx.opponent);
            ctx.log(`⚡ Folgore Fulminante spazza via tutte le carte sul Terreno ${ctx.opponent === 'bot' ? 'del bot' : 'del giocatore'}!`);
        }
    });

    // ================================================================
    // 39 — Voragine (Magia Normale)
    // Distruggi il mostro SCOPERTO dell'avversario con l'ATK più basso.
    // ================================================================
    CardEffects.register(39, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            let weakestIndex = -1;
            let weakestAtk = Infinity;
            field.forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.attack < weakestAtk) {
                    weakestAtk = slot.card.attack;
                    weakestIndex = index;
                }
            });
            if (weakestIndex === -1) return;
            const name = field[weakestIndex].card.name;
            ctx.destroyMonster(ctx.opponent, weakestIndex);
            ctx.log(`🕳️ Voragine risucchia e distrugge ${name} (il mostro scoperto avversario con ATK più basso)!`);
        }
    });

    // ================================================================
    // 35 — Rinascita del Mostro (Magia Normale)
    // Special Summon di un mostro da un Cimitero, tuo o dell'avversario.
    //
    // SEMPLIFICAZIONE: le regole vere lasciano scegliere liberamente
    // quale mostro rianimare. Qui non esiste (ancora) una UI per
    // sfogliare il Cimitero, quindi la scelta è automatica: viene
    // rianimato il mostro con l'ATK più alto disponibile tra i due
    // Cimiteri (a parità, si preferisce il proprio). Aggiungere una
    // scelta manuale è un miglioramento naturale per il futuro.
    // ================================================================
    CardEffects.register(35, {
        canActivate(ctx) {
            return ctx.graveyard('player').some((c) => c.type === 'monster')
                || ctx.graveyard('bot').some((c) => c.type === 'monster');
        },
        activate(ctx) {
            let bestGraveyardOwner = null;
            let bestIndex = -1;
            let bestCard = null;
            [ctx.owner, ctx.opponent].forEach((graveyardOwner) => {
                ctx.graveyard(graveyardOwner).forEach((card, index) => {
                    if (card.type === 'monster' && (!bestCard || card.attack > bestCard.attack)) {
                        bestGraveyardOwner = graveyardOwner;
                        bestIndex = index;
                        bestCard = card;
                    }
                });
            });
            if (!bestCard) {
                ctx.log('⚠️ Nessun mostro nei Cimiteri da rianimare.');
                return;
            }
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.log('⚠️ Il Terreno è pieno: impossibile eseguire la Special Summon.');
                return;
            }
            ctx.graveyard(bestGraveyardOwner).splice(bestIndex, 1);
            ctx.specialSummon(ctx.owner, bestCard, slotIndex, 'attack');
            ctx.log(`🌟 Rinascita del Mostro riporta in campo ${bestCard.name}!`);
        }
    });

    // ================================================================
    // 17 — Jinzo (effetto CONTINUO del mostro, non un'attivazione)
    // Finché Jinzo è scoperto sul campo, le Trappole dell'avversario di
    // chi lo controlla perdono il loro effetto (non possono attivarsi).
    // ================================================================
    CardEffects.register(17, {
        static(ctx) {
            gameState.trapsNegatedFor[ctx.opponent] = true;
        }
    });

    // ================================================================
    // 22 — Kuriboh (effetto attivabile DALLA MANO)
    // Puoi scartare Kuriboh dalla mano per annullare tutto il danno di
    // UN attacco diretto subito.
    //
    // SEMPLIFICAZIONE: limitato all'attacco diretto (nessun mostro come
    // bersaglio), per evitare l'ambiguità delle regole vere su cosa
    // succede al confronto ATK/DEF quando il danno da battaglia coinvolge
    // entrambi i lati — qui il danno da negare è sempre e solo quello
    // che subirebbe chi controlla Kuriboh.
    // ================================================================
    CardEffects.register(22, {
        canActivate(ctx) {
            return ctx.targetIndex === -1;
        },
        onAttackDeclare(ctx) {
            ctx.negateDamage();
            ctx.log('🐰 Kuriboh si scarta e annulla tutto il danno di questo attacco!');
        }
    });
})();
