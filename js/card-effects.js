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
    // 56 — Rito del Guerriero Nero (Magia Rituale)
    // Sacrifica mostri dal tuo Terreno per un Livello totale di almeno 8,
    // poi Special Summon Guerriero Nero Supremo (id 55) dalla mano.
    // SEMPLIFICAZIONE: sceglie da sola quali mostri sacrificare (i meno
    // possibile per raggiungere il totale, partendo dai Livelli più alti),
    // invece di una selezione manuale come nell'Evocazione Tributo — nello
    // stesso spirito delle altre semplificazioni dichiarate in cima a
    // js/duel-engine.js.
    // ================================================================
    CardEffects.register(56, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 55);
            if (!hasRitualMonster) return false;
            const totalLevel = ctx.field(ctx.owner).reduce((sum, slot) => sum + (slot ? (slot.card.level || 0) : 0), 0);
            return totalLevel >= 8;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field
                .map((slot, index) => (slot ? { index, level: slot.card.level || 0 } : null))
                .filter(Boolean)
                .sort((a, b) => b.level - a.level);

            let remaining = 8;
            const toSacrifice = [];
            occupied.forEach((entry) => {
                if (remaining <= 0) return;
                toSacrifice.push(entry.index);
                remaining -= entry.level;
            });
            toSacrifice.forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.id === 55);
            if (handIndex === -1) return; // canActivate l'ha già garantito: non dovrebbe succedere
            const [ritualCard] = hand.splice(handIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                // Il Terreno è pieno: il mostro rituale finisce comunque
                // nel Cimitero, invece di sparire nel nulla.
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Guerriero Nero Supremo finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('⚔️ Rito del Guerriero Nero evoca Guerriero Nero Supremo!');
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

    // ================================================================
    // 59 — Carica dell'Anima / Soul Charge (Magia Normale)
    // SEMPLIFICAZIONE: la carta vera rianima "un numero qualsiasi" di
    // mostri dal Cimitero; qui, come per Rinascita del Mostro (id 35),
    // ne rianima uno solo (il migliore per ATK disponibile), pagando
    // comunque 1000 Life Points.
    // ================================================================
    CardEffects.register(59, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster') && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            let bestIndex = -1;
            let bestCard = null;
            grave.forEach((c, i) => {
                if (c.type === 'monster' && (!bestCard || c.attack > bestCard.attack)) { bestCard = c; bestIndex = i; }
            });
            if (!bestCard) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.log('⚠️ Il Terreno è pieno: impossibile eseguire la Special Summon.'); return; }
            grave.splice(bestIndex, 1);
            ctx.specialSummon(ctx.owner, bestCard, slotIndex, 'attack');
            ctx.dealDamage(ctx.owner, 1000);
            ctx.log(`👻 Carica dell'Anima riporta in campo ${bestCard.name} e ti costa 1000 Life Points!`);
        }
    });

    // ================================================================
    // 60 — Demolizione dell'Anima / Soul Demolition (Trappola)
    // Se controlli un mostro di Tipo Demone scoperto: paga 500 Life
    // Points, poi banisci una carta da ciascun Cimitero.
    // SEMPLIFICAZIONE "banish": questo motore non ha una zona Bandite a
    // sé (vedi il commento sull'origine delle carte in cards-db.js per lo
    // stesso spirito di semplificazione) — la carta sparisce e basta dal
    // Cimitero, invece di spostarsi in una zona dedicata.
    // ================================================================
    CardEffects.register(60, {
        canActivate(ctx) {
            const controlsFiend = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Demone');
            const somethingToBanish = ctx.graveyard(ctx.owner).length > 0 || ctx.graveyard(ctx.opponent).length > 0;
            return controlsFiend && somethingToBanish;
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 500);
            const oppGrave = ctx.graveyard(ctx.opponent);
            const ownGrave = ctx.graveyard(ctx.owner);
            if (oppGrave.length > 0) oppGrave.pop();
            if (ownGrave.length > 0) ownGrave.pop();
            ctx.log('💀 Demolizione dell\'Anima banisce una carta da ciascun Cimitero (paghi 500 Life Points)!');
        }
    });

    // ================================================================
    // 61 — Scambio di Anime / Soul Exchange (Magia Normale)
    // SEMPLIFICAZIONE: la carta vera designa un mostro avversario da
    // usare come Tributo nella TUA prossima Evocazione Tributo; questo
    // motore non ha un aggancio per "il prossimo Tributo di questo
    // turno", quindi qui distrugge direttamente il mostro scoperto più
    // forte dell'avversario, nello stesso spirito di Voragine (id 39).
    // ================================================================
    CardEffects.register(61, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            let bestIndex = -1;
            let bestCard = null;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && (!bestCard || slot.card.attack > bestCard.attack)) { bestCard = slot.card; bestIndex = i; }
            });
            if (bestIndex === -1) return;
            ctx.destroyMonster(ctx.opponent, bestIndex);
            ctx.log(`🔄 Scambio di Anime costringe il tuo avversario a cedere ${bestCard.name}!`);
        }
    });

    // ================================================================
    // 62 — Liberazione dell'Anima / Soul Release (Magia Normale)
    // Banisci fino a 5 carte da uno o entrambi i Cimiteri (priorità al
    // Cimitero avversario). Stessa semplificazione "banish" di
    // Demolizione dell'Anima (id 60) qui sopra.
    // ================================================================
    CardEffects.register(62, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).length > 0 || ctx.graveyard(ctx.opponent).length > 0;
        },
        activate(ctx) {
            let remaining = 5;
            const oppGrave = ctx.graveyard(ctx.opponent);
            const ownGrave = ctx.graveyard(ctx.owner);
            while (remaining > 0 && oppGrave.length > 0) { oppGrave.pop(); remaining--; }
            while (remaining > 0 && ownGrave.length > 0) { ownGrave.pop(); remaining--; }
            ctx.log(`🌫️ Liberazione dell'Anima banisce ${5 - remaining} cart${5 - remaining === 1 ? 'a' : 'e'} dai Cimiteri!`);
        }
    });

    // ================================================================
    // 63 — Ladro di Anime / Soul Taker (Magia Normale)
    // Distruggi il mostro scoperto più forte dell'avversario; il tuo
    // avversario guadagna 1000 Life Points (dealDamage con importo
    // negativo cura, vedi il commento su ACTIONS.dealDamage in
    // duel-engine.js).
    // ================================================================
    CardEffects.register(63, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            let bestIndex = -1;
            let bestCard = null;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && (!bestCard || slot.card.attack > bestCard.attack)) { bestCard = slot.card; bestIndex = i; }
            });
            if (bestIndex === -1) return;
            ctx.destroyMonster(ctx.opponent, bestIndex);
            ctx.dealDamage(ctx.opponent, -1000);
            ctx.log(`💰 Ladro di Anime distrugge ${bestCard.name}: il tuo avversario guadagna 1000 Life Points.`);
        }
    });

    // ================================================================
    // 65 — Cancella Magie / Spell Canceller (effetto CONTINUO del mostro)
    // Finché questa carta è scoperta sul campo, nessuno dei due
    // giocatori può attivare Magie (gameState.spellsNegatedFor, stesso
    // meccanismo di gameState.trapsNegatedFor usato da Jinzo id 17 — qui
    // però riguarda ENTRAMBI i giocatori, come sulla carta vera, non solo
    // l'avversario di chi la controlla).
    // ================================================================
    CardEffects.register(65, {
        static() {
            gameState.spellsNegatedFor.player = true;
            gameState.spellsNegatedFor.bot = true;
        }
    });

    // ================================================================
    // 69 — Stop Difesa / Stop Defense (Magia Normale)
    // Cambia in Posizione di Attacco un mostro in Posizione di Difesa
    // controllato dal tuo avversario (auto-selezionato: quello con la
    // DEF più bassa, stesso spirito di auto-selezione di Voragine id 39).
    // ================================================================
    CardEffects.register(69, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && slot.position === 'defense');
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let lowestDef = Infinity;
            field.forEach((slot, i) => {
                if (slot && slot.position === 'defense' && slot.card.defense < lowestDef) { lowestDef = slot.card.defense; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const slot = field[targetIndex];
            slot.position = 'attack';
            slot.isFaceDown = false;
            ctx.log(`⚔️ Stop Difesa costringe ${slot.card.name} in Posizione di Attacco!`);
        }
    });

    // ================================================================
    // 72 — Dado dell'Evocazione / Summon Dice (Magia Normale)
    // Paga 1000 Life Points (costo fisso, come sulla carta vera) e tira
    // un dado a sei facce: 1-2 puoi Evocare Normalmente, 3-4 Special
    // Summon dal tuo Cimitero, 5-6 Special Summon dalla mano un mostro
    // di Livello 5+. Stesse auto-selezioni "il migliore disponibile" già
    // usate da Rinascita del Mostro (id 35) e Carica dell'Anima (id 59).
    // ================================================================
    CardEffects.register(72, {
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 1000);
            const roll = Math.floor(Math.random() * 6) + 1;
            ctx.log(`🎲 Dado dell'Evocazione: hai tirato un ${roll}!`);
            if (roll <= 2) {
                gameState.hasNormalSummoned = false;
                ctx.log('➡️ Puoi Evocare Normalmente un mostro questo turno.');
            } else if (roll <= 4) {
                const grave = ctx.graveyard(ctx.owner);
                let bestIndex = -1;
                let bestCard = null;
                grave.forEach((c, i) => {
                    if (c.type === 'monster' && (!bestCard || c.attack > bestCard.attack)) { bestCard = c; bestIndex = i; }
                });
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (bestCard && slotIndex !== -1) {
                    grave.splice(bestIndex, 1);
                    ctx.specialSummon(ctx.owner, bestCard, slotIndex, 'attack');
                    ctx.log(`➡️ Special Summon di ${bestCard.name} dal Cimitero!`);
                } else {
                    ctx.log('➡️ Nessun mostro disponibile nel Cimitero.');
                }
            } else {
                const hand = ctx.hand(ctx.owner);
                const handIndex = hand.findIndex((c) => c.type === 'monster' && c.level >= 5);
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (handIndex !== -1 && slotIndex !== -1) {
                    const [card] = hand.splice(handIndex, 1);
                    ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                    ctx.log(`➡️ Special Summon di ${card.name} dalla mano!`);
                } else {
                    ctx.log('➡️ Nessun mostro di Livello 5+ disponibile in mano.');
                }
            }
        }
    });
})();
