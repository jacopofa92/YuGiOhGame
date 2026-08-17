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
 *   onFlip(ctx)            — si attiva quando QUESTO mostro viene girato
 *                           scoperto in battaglia (era coperto, l'ha
 *                           attaccato o è sopravvissuto rivelandosi) —
 *                           NON scatta se la carta viene distrutta nello
 *                           stesso momento in cui si rivela.
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
    // 450 — Demolizione dell'Anima / Soul Demolition (Trappola Continua)
    // Se controlli un mostro di Tipo Demone scoperto: paga 500 Life
    // Points, poi banisci una carta da ciascun Cimitero.
    // SEMPLIFICAZIONE "banish": questo motore non ha una zona Bandite a
    // sé (vedi il commento sull'origine delle carte in cards-db.js per lo
    // stesso spirito di semplificazione) — la carta sparisce e basta dal
    // Cimitero, invece di spostarsi in una zona dedicata. (Spostato qui da
    // id 60 durante la pulizia dei doppioni dell'import reale.)
    // ================================================================
    CardEffects.register(450, {
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
    // 451 — Scambio di Anime / Soul Exchange (Magia Normale)
    // SEMPLIFICAZIONE: la carta vera designa un mostro avversario da
    // usare come Tributo nella TUA prossima Evocazione Tributo; questo
    // motore non ha un aggancio per "il prossimo Tributo di questo
    // turno", quindi qui distrugge direttamente il mostro scoperto più
    // forte dell'avversario, nello stesso spirito di Faglia (id 243).
    // (Spostato qui da id 61 durante la pulizia dei doppioni.)
    // ================================================================
    CardEffects.register(451, {
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
    // 455 — Cancellatore di Magie / Spell Canceller (effetto CONTINUO del
    // mostro, non un'attivazione manuale — come Jinzo, id 17, ma per le
    // Magie invece delle Trappole).
    // SEMPLIFICAZIONE nota: gameState.spellsNegatedFor viene controllato
    // in duel-engine.js solo per le Magie già Set attivate dal Terreno,
    // non per quelle giocate direttamente dalla mano (il percorso
    // standard in questo motore) — effetto quindi parzialmente limitato,
    // stesso limite già presente prima della pulizia dei doppioni
    // (spostato qui da id 65).
    // ================================================================
    CardEffects.register(455, {
        static() {
            gameState.spellsNegatedFor.player = true;
            gameState.spellsNegatedFor.bot = true;
        }
    });

    // ================================================================
    // 69 — Stop Difesa / Stop Defense (Magia Normale)
    // Cambia in Posizione di Attacco un mostro in Posizione di Difesa
    // controllato dal tuo avversario (auto-selezionato: quello con la
    // DEF più bassa, stesso spirito di auto-selezione di Faglia id 243).
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
    // 460 — Dado di Evocazione / Summon Dice (Magia Normale)
    // Paga 1000 Life Points (costo fisso, come sulla carta vera) e tira
    // un dado a sei facce: 1-2 puoi Evocare Normalmente, 3-4 Special
    // Summon dal tuo Cimitero, 5-6 Special Summon dalla mano un mostro
    // di Livello 5+. Stesse auto-selezioni "il migliore disponibile" già
    // usate da Rinascita del Mostro (id 35) e Carica dell'Anima (id 59).
    // (Spostato qui da id 72 durante la pulizia dei doppioni.)
    // ================================================================
    CardEffects.register(460, {
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 1000);
            const roll = Math.floor(Math.random() * 6) + 1;
            ctx.log(`🎲 Dado di Evocazione: hai tirato un ${roll}!`);
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

    // ================================================================
    // 23 — Insetto Divoratore / Man-Eater Bug (effetto FLIP)
    // Quando questa carta viene girata scoperta (Flip), distruggi 1
    // mostro scoperto sul Terreno.
    // SEMPLIFICAZIONE: sceglie da sola il bersaglio (il mostro scoperto
    // con l'ATK più alto tra i due Terreni, priorità all'avversario a
    // parità — mai se stesso), stesso spirito di Faglia (id 243).
    // (Spostato qui da id 49 "Insetto Divoratore Mostruoso" — stesso
    // identico effetto reale, duplicato per errore durante la creazione
    // originale del database: entrambe le carte rappresentavano "Man-Eater
    // Bug".)
    // ================================================================
    CardEffects.register(23, {
        onFlip(ctx) {
            let bestOwner = null;
            let bestIndex = -1;
            let bestCard = null;
            [ctx.opponent, ctx.owner].forEach((fieldOwner) => {
                ctx.field(fieldOwner).forEach((slot, index) => {
                    if (fieldOwner === ctx.owner && index === ctx.slotIndex) return; // mai se stesso
                    if (slot && !slot.isFaceDown && (!bestCard || slot.card.attack > bestCard.attack)) {
                        bestOwner = fieldOwner;
                        bestIndex = index;
                        bestCard = slot.card;
                    }
                });
            });
            if (!bestCard) {
                ctx.log('🐛 Insetto Divoratore Mostruoso si rivela, ma non c\'è nessun mostro scoperto da distruggere.');
                return;
            }
            ctx.destroyMonster(bestOwner, bestIndex);
            ctx.log(`🐛 Insetto Divoratore Mostruoso, girato scoperto, distrugge ${bestCard.name}!`);
        }
    });

    // ================================================================
    // 77 — Coccinella della Rovina a 4 Stelle (effetto FLIP)
    // Quando viene girata scoperta, distrugge tutti i mostri scoperti di
    // Livello 4 sul campo dell'avversario — stesso aggancio TRIGGER.ON_FLIP
    // già usato da id 49 qui sopra.
    // ================================================================
    CardEffects.register(77, {
        onFlip(ctx) {
            const field = ctx.field(ctx.opponent);
            let destroyedAny = false;
            field.forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.level === 4) {
                    ctx.destroyMonster(ctx.opponent, index);
                    destroyedAny = true;
                }
            });
            ctx.log(destroyedAny
                ? '🐞 Coccinella della Rovina a 4 Stelle distrugge tutti i mostri scoperti di Livello 4 dell\'avversario!'
                : '🐞 Coccinella della Rovina a 4 Stelle si rivela, ma l\'avversario non ha mostri scoperti di Livello 4.');
        }
    });

    // ================================================================
    // 80 — Un Battito d'Ali del Drago Gigante (Magia Normale)
    // Riporta in mano 1 mostro Tipo Drago di Livello 5+ che controlli; se
    // lo fai, distrugge tutte le Magie/Trappole sul Terreno (di entrambi i
    // giocatori — il testo reale non specifica "dell'avversario").
    // SEMPLIFICAZIONE: sceglie da sola quale Drago rimandare in mano (il
    // primo trovato), invece di un'interfaccia di selezione dedicata.
    // ================================================================
    CardEffects.register(80, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Drago' && slot.card.level >= 5);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.race === 'Drago' && slot.card.level >= 5);
            if (index === -1) return;
            const returned = field[index].card;
            field[index] = null;
            ctx.hand(ctx.owner).push(returned);
            ['player', 'bot'].forEach((fieldOwner) => {
                ctx.stField(fieldOwner).forEach((slot, i) => {
                    if (slot) {
                        ctx.graveyard(fieldOwner).push(slot.card);
                        ctx.stField(fieldOwner)[i] = null;
                    }
                });
            });
            ctx.log(`🐉 Un Battito d'Ali del Drago Gigante riporta in mano ${returned.name} e distrugge tutte le Magie/Trappole sul Terreno!`);
        }
    });

    // ================================================================
    // 88 — Arciere delle Amazzoni (Trappola Normale)
    // Quando l'avversario dichiara un attacco, se controlli un mostro il
    // cui nome contiene "Amazzone": gira scoperti in Posizione di Attacco
    // tutti i mostri dell'avversario.
    // SEMPLIFICAZIONE: manca il -500 ATK dell'effetto reale finché resta
    // scoperti (richiederebbe leggere gameState.atkDefBonus da qualche
    // parte — vedi il commento su id 79/81 in js/cards-db.js — che oggi
    // nessun punto del motore applica ancora davvero).
    // ================================================================
    CardEffects.register(88, {
        onAttackDeclare(ctx) {
            // Il controllo (nome contiene "Amazzone") vale anche se il proprio
            // mostro è coperto: è il TUO mostro, ne conosci il nome anche
            // senza girarlo — solo i mostri dell'AVVERSARIO restano "ignoti".
            if (!ctx.field(ctx.owner).some((slot) => slot && slot.card.name.includes('Amazzone'))) return;
            const field = ctx.field(ctx.opponent);
            let flippedAny = false;
            field.forEach((slot) => {
                if (slot && (slot.isFaceDown || slot.position !== 'attack')) {
                    slot.isFaceDown = false;
                    slot.position = 'attack';
                    flippedAny = true;
                }
            });
            if (flippedAny) ctx.log('🏹 Arciere delle Amazzoni costringe tutti i mostri dell\'avversario in Posizione di Attacco scoperta!');
        }
    });

    // ================================================================
    // 100 — Armatura Guida d'Attacco (Trappola Normale)
    // Quando un mostro dichiara un attacco: distrugge il mostro attaccante.
    // SEMPLIFICAZIONE: manca la scelta alternativa "reindirizza l'attacco a
    // un altro mostro" dell'effetto reale — vedi il commento in
    // js/cards-db.js sul perché.
    // ================================================================
    CardEffects.register(100, {
        onAttackDeclare(ctx) {
            ctx.destroyMonster(ctx.attackerOwner, ctx.attackerIndex);
            ctx.cancelAttack();
            ctx.log('🛡️ Armatura Guida d\'Attacco distrugge il mostro attaccante!');
        }
    });

    // ================================================================
    // 78 — Patto col Sovrano Oscuro (Magia Veloce)
    // Special Summon di Drago Berserk (id 110) dalla mano.
    // SEMPLIFICAZIONE: l'effetto reale richiede che il mostro di 8+ Stelle
    // Livello sia andato al TUO Cimitero PROPRIO in questo turno — questo
    // motore non tiene traccia di "quando" una carta è arrivata al
    // Cimitero, solo se ci si trova, quindi qui basta che ce ne sia UNO
    // presente (in qualunque momento). "dalla mano o dal Deck" diventa
    // "solo dalla mano": cercare una carta specifica nel Deck e rimuoverla
    // richiederebbe un meccanismo di ricerca-mazzo non ancora presente.
    // ================================================================
    CardEffects.register(78, {
        canActivate(ctx) {
            const hasFodder = ctx.graveyard(ctx.owner).some((c) => c.level >= 8);
            const hasBerserkDragon = ctx.hand(ctx.owner).some((c) => c.id === 110);
            return hasFodder && hasBerserkDragon;
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.id === 110);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.log('❌ Non c\'è spazio sul Terreno per Special Summonare Drago Berserk.');
                return;
            }
            const card = hand[index];
            hand.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('👹 Patto col Sovrano Oscuro Special Summona Drago Berserk!');
        }
    });

    // ================================================================
    // 121 — Blocca Attacco / Block Attack (Magia Normale)
    // Cambia in Posizione di Difesa scoperta un mostro scoperto in
    // Posizione di Attacco controllato dal tuo avversario.
    // SEMPLIFICAZIONE: sceglie da sola il bersaglio (quello con l'ATK più
    // alto, il più minaccioso da disinnescare), stesso spirito di Stop
    // Difesa (id 69) che fa l'equivalente al contrario.
    // ================================================================
    CardEffects.register(121, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown && slot.position === 'attack');
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let highestAtk = -1;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.position === 'attack' && slot.card.attack > highestAtk) {
                    highestAtk = slot.card.attack;
                    targetIndex = i;
                }
            });
            if (targetIndex === -1) return;
            field[targetIndex].position = 'defense';
            ctx.log(`🛡️ Blocca Attacco costringe ${field[targetIndex].card.name} in Posizione di Difesa!`);
        }
    });

    // ================================================================
    // 128 — Buco Trappola senza Fondo / Bottomless Trap Hole (Trappola)
    // Quando l'avversario di chi la controlla Evoca un mostro con 1500+
    // ATK: lo distrugge. Stesso meccanismo di Buco Trappola (id 40), ma
    // SENZA il vincolo "solo se scoperto in Posizione di Attacco" — la
    // carta vera scatta su qualunque Evocazione, non solo quella scoperta.
    // SEMPLIFICAZIONE: "bandiscilo" diventa un normale invio al Cimitero
    // (nessuna zona di bando separata per i mostri in questo motore — solo
    // le carte in Cimitero possono essere bandite da lì, es. Demolizione
    // dell'Anima).
    // ================================================================
    CardEffects.register(128, {
        canActivate(ctx) {
            return ctx.summonedCard.attack >= 1500;
        },
        onOpponentSummon(ctx) {
            ctx.destroyMonster(ctx.opponent, ctx.summonedSlotIndex);
            ctx.log(`🕳️ Buco Trappola senza Fondo distrugge ${ctx.summonedCard.name}!`);
        }
    });

    // ================================================================
    // 132 — Soffio di Luce / Breath of Light (Magia Normale)
    // Distrugge tutti i mostri Tipo Roccia scoperti sul Terreno, di
    // entrambi i giocatori.
    // ================================================================
    CardEffects.register(132, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Roccia'));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Roccia') {
                        ctx.destroyMonster(owner, index);
                        count++;
                    }
                });
            });
            ctx.log(`💥 Soffio di Luce distrugge ${count} most${count === 1 ? 'ro' : 'ri'} Tipo Roccia!`);
        }
    });

    // ================================================================
    // 134 — Soffio Esplosivo / Burst Breath (Trappola Normale)
    // Sacrifica 1 mostro Tipo Drago che controlli; distruggi tutti i
    // mostri scoperti sul Terreno (di entrambi i giocatori) con DEF minore
    // o uguale all'ATK che aveva il Drago sacrificato.
    // SEMPLIFICAZIONE: il Drago da sacrificare è auto-selezionato (quello
    // con l'ATK più alto, il più utile), stesso spirito di altre carte con
    // selezione automatica già presenti (es. Faglia, id 243).
    // ================================================================
    CardEffects.register(134, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Drago');
        },
        activate(ctx) {
            const ownField = ctx.field(ctx.owner);
            let tributeIndex = -1;
            let tributeCard = null;
            ownField.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.race === 'Drago' && (!tributeCard || slot.card.attack > tributeCard.attack)) {
                    tributeIndex = i;
                    tributeCard = slot.card;
                }
            });
            if (tributeIndex === -1) return;
            ownField[tributeIndex] = null;
            ctx.graveyard(ctx.owner).push(tributeCard);

            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.defense <= tributeCard.attack) {
                        ctx.destroyMonster(owner, index);
                        count++;
                    }
                });
            });
            ctx.log(`🔥 Soffio Esplosivo sacrifica ${tributeCard.name} e distrugge ${count} most${count === 1 ? 'ro' : 'ri'}!`);
        }
    });

    // ================================================================
    // 138 — Distruzione di Carte / Card Destruction (Magia Normale)
    // Entrambi i giocatori scartano quante più carte possono dalla mano,
    // poi ciascuno pesca lo stesso numero di carte che ha scartato.
    // ================================================================
    CardEffects.register(138, {
        activate(ctx) {
            ['player', 'bot'].forEach((owner) => {
                const hand = ctx.hand(owner);
                const discarded = hand.length;
                while (hand.length > 0) {
                    ctx.graveyard(owner).push(hand.pop());
                }
                if (discarded > 0) ctx.drawCards(owner, discarded);
            });
            ctx.log('🔥 Distruzione di Carte: entrambi i giocatori scartano la mano e ripescano lo stesso numero di carte!');
        }
    });

    // ================================================================
    // 166 — Maledizione del Demone / Curse of Fiend (Magia Normale)
    // Scambia la Posizione (Attacco <-> Difesa) di tutti i mostri scoperti
    // sul Terreno, di entrambi i giocatori.
    // SEMPLIFICAZIONE: manca il vincolo reale "attivabile solo durante la
    // propria Standby Phase" e il "le posizioni non si possono ricambiare
    // in questo turno" — il motore non ha un modo per limitare l'attivazione
    // di una carta a una Phase specifica né per bloccare temporaneamente i
    // cambi di posizione di più mostri contemporaneamente.
    // ================================================================
    CardEffects.register(166, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown) {
                        slot.position = slot.position === 'attack' ? 'defense' : 'attack';
                        count++;
                    }
                });
            });
            ctx.log(`🔄 Maledizione del Demone scambia la Posizione di ${count} most${count === 1 ? 'ro' : 'ri'} scopert${count === 1 ? 'o' : 'i'}!`);
        }
    });

    // ================================================================
    // 168 — Maledizione della Bestia Mascherata / Curse of the Masked
    // Beast (Rito) — Special Summon La Bestia Mascherata (id 167) dalla
    // mano, sacrificando dal Terreno mostri per un Livello totale di
    // almeno 8. Stesso meccanismo già usato da Rito del Guerriero Nero
    // (id 56): sacrifica automaticamente i mostri con Livello più alto
    // finché il totale richiesto non è raggiunto.
    // ================================================================
    CardEffects.register(168, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 167);
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
            const handIndex = hand.findIndex((c) => c.id === 167);
            if (handIndex === -1) return; // canActivate l'ha già garantito: non dovrebbe succedere
            const [ritualCard] = hand.splice(handIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                // Il Terreno è pieno: il mostro rituale finisce comunque
                // nel Cimitero, invece di sparire nel nulla.
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: La Bestia Mascherata finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('👹 Maledizione della Bestia Mascherata evoca La Bestia Mascherata!');
        }
    });

    // ================================================================
    // 195 — Rimuovi Magia / De-Spell (Magia Normale)
    // Distrugge 1 Magia scoperta sul Terreno (di preferenza dell'avversario).
    // SEMPLIFICAZIONE: nella realtà può bersagliare anche una Magia/Trappola
    // Set (rivelandola, e distruggendola solo se è davvero una Magia) — qui
    // sceglie solo fra le Magie GIÀ scoperte (le Continue/Campo, uniche a
    // restare sul Terreno — le Magie Normali si scartano subito dopo la
    // risoluzione, quindi non ci sono mai da colpire con questo effetto).
    // ================================================================
    CardEffects.register(195, {
        canActivate(ctx) {
            return [ctx.opponent, ctx.owner].some((owner) => ctx.stField(owner).some((slot) => slot && !slot.isFaceDown && slot.card.type === 'spell'));
        },
        activate(ctx) {
            let targetOwner = null;
            let targetIndex = -1;
            [ctx.opponent, ctx.owner].forEach((owner) => {
                if (targetIndex !== -1) return;
                const idx = ctx.stField(owner).findIndex((slot) => slot && !slot.isFaceDown && slot.card.type === 'spell');
                if (idx !== -1) { targetOwner = owner; targetIndex = idx; }
            });
            if (targetIndex === -1) return;
            const card = ctx.stField(targetOwner)[targetIndex].card;
            ctx.graveyard(targetOwner).push(card);
            ctx.stField(targetOwner)[targetIndex] = null;
            ctx.log(`✨ Rimuovi Magia distrugge ${card.name}!`);
        }
    });

    // ================================================================
    // 206 — Vaso Cattura-Drago / Dragon Capture Jar (effetto CONTINUO
    // della Trappola, non un'attivazione manuale — come Jinzo, id 17)
    // Finché scoperta sul Terreno: tutti i mostri Tipo Drago scoperti, di
    // entrambi i giocatori, vengono tenuti in Posizione di Difesa.
    // ================================================================
    CardEffects.register(206, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Drago' && slot.position !== 'defense') {
                        slot.position = 'defense';
                        slot.canChangePosition = false;
                    }
                });
            });
        }
    });

    // ================================================================
    // 210 — Cacciatore di Draghi / Dragon Seeker (effetto all'Evocazione)
    // Quando questa carta viene Evocata: distrugge 1 mostro Tipo Drago
    // scoperto sul Terreno (di preferenza dell'avversario).
    // SEMPLIFICAZIONE: l'effetto reale scatta solo su Evocazione Normale o
    // Flip Summon — qui, per come è collegato onSummon() in
    // js/duel-engine.js, scatta anche su Special Summon (nessuna carta di
    // questo set Special Summona Cacciatore di Draghi, quindi la
    // differenza non si nota in pratica).
    // ================================================================
    CardEffects.register(210, {
        onSummon(ctx) {
            let targetOwner = null;
            let targetIndex = -1;
            [ctx.opponent, ctx.owner].forEach((owner) => {
                if (targetIndex !== -1) return;
                ctx.field(owner).forEach((slot, index) => {
                    if (targetIndex !== -1) return;
                    if (owner === ctx.owner && index === ctx.summonedSlotIndex) return; // mai se stesso
                    if (slot && !slot.isFaceDown && slot.card.race === 'Drago') {
                        targetOwner = owner;
                        targetIndex = index;
                    }
                });
            });
            if (targetIndex === -1) return;
            const destroyedName = ctx.field(targetOwner)[targetIndex].card.name;
            ctx.destroyMonster(targetOwner, targetIndex);
            ctx.log(`🐉 Cacciatore di Draghi, evocato, distrugge ${destroyedName}!`);
        }
    });

    // ================================================================
    // 219 — Tornado di Polvere / Dust Tornado (Trappola Normale)
    // Distrugge 1 Magia/Trappola controllata dall'avversario (scoperta o
    // Set).
    // SEMPLIFICAZIONE: manca la seconda parte dell'effetto reale ("poi
    // puoi Set 1 Magia/Trappola dalla mano") — richiederebbe scegliere e
    // piazzare una carta dalla mano nello stesso momento in cui si
    // risolve un'altra carta, un flusso non ancora presente nel motore.
    // ================================================================
    CardEffects.register(219, {
        canActivate(ctx) {
            return ctx.stField(ctx.opponent).some((slot) => slot !== null);
        },
        activate(ctx) {
            const field = ctx.stField(ctx.opponent);
            const index = field.findIndex((slot) => slot !== null);
            if (index === -1) return;
            const card = field[index].card;
            ctx.graveyard(ctx.opponent).push(card);
            field[index] = null;
            ctx.log(`🌪️ Tornado di Polvere distrugge ${card.name}!`);
        }
    });

    // ================================================================
    // 228 — Aerosol Sterminatore / Eradicating Aerosol (Magia Normale)
    // Distrugge tutti i mostri Tipo Insetto scoperti sul Terreno, di
    // entrambi i giocatori. Stesso schema di Soffio di Luce (id 132), solo
    // con Tipo Insetto al posto di Tipo Roccia.
    // ================================================================
    CardEffects.register(228, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Insetto'));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Insetto') {
                        ctx.destroyMonster(owner, index);
                        count++;
                    }
                });
            });
            ctx.log(`💥 Aerosol Sterminatore distrugge ${count} most${count === 1 ? 'ro' : 'ri'} Tipo Insetto!`);
        }
    });

    // ================================================================
    // 229 — Bandisci il Malvagio / Exile of the Wicked (Magia Normale)
    // Distrugge tutti i mostri Tipo Demone scoperti sul Terreno, di
    // entrambi i giocatori. Stesso schema di Soffio di Luce (id 132), solo
    // con Tipo Demone al posto di Tipo Roccia.
    // ================================================================
    CardEffects.register(229, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Demone'));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Demone') {
                        ctx.destroyMonster(owner, index);
                        count++;
                    }
                });
            });
            ctx.log(`💥 Bandisci il Malvagio distrugge ${count} most${count === 1 ? 'ro' : 'ri'} Tipo Demone!`);
        }
    });

    // ================================================================
    // 240 — Ordini d'Attacco Finali / Final Attack Orders (effetto
    // CONTINUO della Trappola, non un'attivazione manuale — stesso schema
    // di Vaso Cattura-Drago, id 206, ma su TUTTI i mostri scoperti di
    // entrambi i giocatori invece che solo sui Tipo Drago).
    // ================================================================
    CardEffects.register(240, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && slot.position !== 'attack') {
                        slot.position = 'attack';
                        slot.canChangePosition = false;
                    }
                });
            });
        }
    });

    // ================================================================
    // 243 — Faglia / Fissure (Magia Normale)
    // Distrugge il mostro scoperto con l'ATK più basso controllato
    // dall'avversario (a parità di ATK, sceglie il primo trovato).
    // ================================================================
    CardEffects.register(243, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let lowestAtk = Infinity;
            field.forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.attack < lowestAtk) {
                    lowestAtk = slot.card.attack;
                    targetIndex = index;
                }
            });
            if (targetIndex === -1) return;
            const name = field[targetIndex].card.name;
            ctx.destroyMonster(ctx.opponent, targetIndex);
            ctx.log(`⚡ Faglia distrugge ${name} (ATK più basso)!`);
        }
    });

    // ================================================================
    // 251 — Sepoltura Sciocca / Foolish Burial (Magia Normale)
    // Manda 1 mostro dal proprio Deck al Cimitero.
    // SEMPLIFICAZIONE: funziona solo quando il giocatore ha un Deck reale
    // in gameState.playerDeck/botDeck (costruito da SaveManager o da un
    // mazzo a tema avversario — vedi drawCardsToHand in game-flow.js). Nel
    // Duello Demo generico, se il bot non ha un mazzo a tema, il suo Deck
    // resta un pool casuale senza array reale: in quel caso l'effetto non
    // è attivabile per lui (canActivate ritorna false).
    // ================================================================
    CardEffects.register(251, {
        canActivate(ctx) {
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            return Array.isArray(deck) && deck.some((c) => c.type === 'monster');
        },
        activate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = ctx.gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.type === 'monster');
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            ctx.gameState[countKey] = deck.length;
            ctx.graveyard(ctx.owner).push(card);
            ctx.log(`⚰️ Sepoltura Sciocca manda ${card.name} al Cimitero!`);
        }
    });

    // ================================================================
    // 262 — Turbine Gigante / Giant Trunade (Magia Normale)
    // Fa tornare in mano tutte le Magie/Trappole sul Terreno, di entrambi
    // i giocatori.
    // ================================================================
    CardEffects.register(262, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.stField(owner).some((slot) => slot !== null));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.stField(owner).forEach((slot, index) => {
                    if (slot) {
                        ctx.hand(owner).push(slot.card);
                        ctx.stField(owner)[index] = null;
                        count++;
                    }
                });
            });
            ctx.log(`🌪️ Turbine Gigante fa tornare in mano ${count} cart${count === 1 ? 'a' : 'e'} Magia/Trappola!`);
        }
    });

    // ================================================================
    // 263 — Dono dell'Elfa Mistica / Gift of The Mystical Elf (Trappola
    // Normale)
    // Guadagna 300 Life Points per ogni mostro sul Terreno, di entrambi i
    // giocatori.
    // ================================================================
    CardEffects.register(263, {
        activate(ctx) {
            const count = ctx.field('player').filter((s) => s).length + ctx.field('bot').filter((s) => s).length;
            const gain = count * 300;
            ctx.dealDamage(ctx.owner, -gain);
            ctx.log(`👼 Dono dell'Elfa Mistica cura ${gain} Life Points (${count} mostri sul Terreno)!`);
        }
    });

    // ================================================================
    // 272 — Carità Aggraziata / Graceful Charity (Magia Normale)
    // Pesca 3 carte, poi scarta 2 carte.
    // SEMPLIFICAZIONE: l'effetto reale lascia scegliere al giocatore quali
    // 2 carte scartare — qui, non essendo presente un'interfaccia di
    // selezione dalla mano, si scartano automaticamente le ultime 2 carte
    // in mano dopo la pescata (le 2 appena pescate per ultime).
    // ================================================================
    CardEffects.register(272, {
        activate(ctx) {
            ctx.drawCards(ctx.owner, 3);
            const hand = ctx.hand(ctx.owner);
            let discarded = 0;
            for (let i = 0; i < 2 && hand.length > 0; i++) {
                const card = hand.pop();
                ctx.graveyard(ctx.owner).push(card);
                discarded++;
            }
            ctx.log(`💖 Carità Aggraziata pesca 3 carte e scarta ${discarded}!`);
        }
    });

    // ================================================================
    // 224 — Egotista Elegante / Elegant Egotist (Magia Normale)
    // Se "Lady Arpia" (id 288) o "Arpia Cyber" (id 172, il cui nome è
    // sempre considerato "Harpie Lady") è scoperta sul Terreno: Special
    // Summon 1 "Lady Arpia" o "Sorelle Lady Arpia" (id 290) dalla mano o
    // dal Deck. AGGIORNATO in pagina 12/26 ora che Lady Arpia e Sorelle
    // Lady Arpia sono finalmente presenti in questo database (prima era
    // data-only per mancanza dei materiali).
    // SEMPLIFICAZIONE: la ricerca dal Deck funziona solo se esiste un
    // Deck reale (gameState.playerDeck/botDeck) — stesso limite di
    // Sepoltura Sciocca (id 251) qui sopra.
    // ================================================================
    CardEffects.register(224, {
        canActivate(ctx) {
            const hasHarpieOnField = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && (slot.card.id === 288 || slot.card.id === 172));
            if (!hasHarpieOnField) return false;
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return false;
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inHand = ctx.hand(ctx.owner).some((c) => c.id === 288 || c.id === 290);
            const inDeck = Array.isArray(deck) && deck.some((c) => c.id === 288 || c.id === 290);
            return inHand || inDeck;
        },
        activate(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.id === 288 || c.id === 290);
            let card;
            if (handIdx !== -1) {
                card = hand.splice(handIdx, 1)[0];
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = ctx.gameState[deckKey];
                if (!Array.isArray(deck)) return;
                const deckIdx = deck.findIndex((c) => c.id === 288 || c.id === 290);
                if (deckIdx === -1) return;
                card = deck.splice(deckIdx, 1)[0];
                ctx.gameState[countKey] = deck.length;
            }
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log(`🦅 Egotista Elegante Special Summona ${card.name}!`);
        }
    });

    // ================================================================
    // 291 — Piumino delle Arpie / Harpie's Feather Duster (Magia Normale)
    // Distrugge tutte le Magie/Trappole controllate dall'avversario.
    // ================================================================
    CardEffects.register(291, {
        canActivate(ctx) {
            return ctx.stField(ctx.opponent).some((slot) => slot !== null);
        },
        activate(ctx) {
            let count = 0;
            ctx.stField(ctx.opponent).forEach((slot, index) => {
                if (slot) {
                    ctx.graveyard(ctx.opponent).push(slot.card);
                    ctx.stField(ctx.opponent)[index] = null;
                    count++;
                }
            });
            ctx.log(`🪶 Piumino delle Arpie distrugge ${count} cart${count === 1 ? 'a' : 'e'} Magia/Trappola dell'avversario!`);
        }
    });

    // ================================================================
    // 297 — Hinotama (Magia Normale)
    // Infliggi 500 danni al tuo avversario.
    // ================================================================
    CardEffects.register(297, {
        activate(ctx) {
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log(`🔥 Hinotama infligge 500 danni!`);
        }
    });

    // ================================================================
    // 352 — Freccia Spezza-Magie / Spell Shattering Arrow (Magia Veloce)
    // Distrugge tutte le Magie scoperte controllate dall'avversario e
    // infligge 500 danni per ciascuna distrutta.
    // ================================================================
    CardEffects.register(352, {
        canActivate(ctx) {
            return ctx.stField(ctx.opponent).some((slot) => slot && !slot.isFaceDown && slot.card.type === 'spell');
        },
        activate(ctx) {
            let count = 0;
            ctx.stField(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.type === 'spell') {
                    ctx.graveyard(ctx.opponent).push(slot.card);
                    ctx.stField(ctx.opponent)[index] = null;
                    count++;
                }
            });
            if (count > 0) ctx.dealDamage(ctx.opponent, count * 500);
            ctx.log(`🏹 Freccia Spezza-Magie distrugge ${count} Magi${count === 1 ? 'a' : 'e'} e infligge ${count * 500} danni!`);
        }
    });

    // ================================================================
    // 366 — Makiu, la Nebbia Magica / Makiu, the Magical Mist (Magia
    // Normale)
    // Scegli 1 "Teschio Evocato" (id 13) o 1 mostro Tipo Tuono che
    // controlli; distruggi tutti i mostri dell'avversario con DEF pari o
    // inferiore all'ATK di quel mostro.
    // SEMPLIFICAZIONE: manca la clausola "non puoi condurre la tua Battle
    // Phase in questo turno" — il motore non ha un meccanismo per
    // bloccare la Battle Phase di un giocatore per il resto del turno.
    // ================================================================
    CardEffects.register(366, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && (slot.card.id === 13 || slot.card.race === 'Tuono'));
        },
        activate(ctx) {
            let bestAtk = -1;
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot && !slot.isFaceDown && (slot.card.id === 13 || slot.card.race === 'Tuono') && slot.card.attack > bestAtk) {
                    bestAtk = slot.card.attack;
                }
            });
            if (bestAtk === -1) return;
            let count = 0;
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.defense <= bestAtk) {
                    ctx.destroyMonster(ctx.opponent, index);
                    count++;
                }
            });
            ctx.log(`🌫️ Makiu distrugge ${count} mostr${count === 1 ? 'o' : 'i'} con DEF <= ${bestAtk}!`);
        }
    });

    // ================================================================
    // 378 — Meteora della Distruzione / Meteor of Destruction (Magia
    // Normale)
    // Se i Life Points dell'avversario sono superiori a 3000: infliggi
    // 1000 danni.
    // ================================================================
    CardEffects.register(378, {
        canActivate(ctx) {
            return gameState[ctx.opponent === 'player' ? 'playerLP' : 'botLP'] > 3000;
        },
        activate(ctx) {
            ctx.dealDamage(ctx.opponent, 1000);
            ctx.log(`☄️ Meteora della Distruzione infligge 1000 danni!`);
        }
    });

    // ================================================================
    // 382 — Forza dello Specchio / Mirror Force (Trappola Normale)
    // Quando un mostro dell'avversario dichiara un attacco: distruggi
    // tutti i mostri in Posizione di Attacco controllati dall'avversario.
    // ================================================================
    CardEffects.register(382, {
        onAttackDeclare(ctx) {
            let count = 0;
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.position === 'attack') {
                    ctx.destroyMonster(ctx.opponent, index);
                    count++;
                }
            });
            ctx.log(`🔮 Forza dello Specchio distrugge ${count} mostr${count === 1 ? 'o' : 'i'} in Posizione di Attacco!`);
        }
    });

    // ================================================================
    // 392 — Nega l'Attacco / Negate Attack (Trappola Contatore)
    // Quando un mostro dell'avversario dichiara un attacco: annulla
    // l'attacco.
    // SEMPLIFICAZIONE: manca la clausola "termina la Battle Phase" — il
    // motore non ha un meccanismo per forzare una transizione di fase da
    // un effetto carta.
    // ================================================================
    CardEffects.register(392, {
        onAttackDeclare(ctx) {
            ctx.cancelAttack();
            ctx.log(`🚫 Nega l'Attacco annulla l'attacco!`);
        }
    });

    // ================================================================
    // 409 — Raigeki (Magia Normale)
    // Distruggi tutti i mostri controllati dall'avversario.
    // ================================================================
    CardEffects.register(409, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot !== null);
        },
        activate(ctx) {
            ctx.destroyAllMonsters(ctx.opponent);
            ctx.log(`⚡ Raigeki distrugge tutti i mostri dell'avversario!`);
        }
    });

    // ================================================================
    // 414 — Trasmigrazione Occhi Rossi / Red-Eyes Transmigration (Magia
    // Rituale)
    // Sacrifica mostri dal tuo Terreno per un Livello totale di almeno 8,
    // poi Special Summon Signore del Rosso (id 354) dalla mano.
    // SEMPLIFICAZIONE: sceglie da sola quali mostri sacrificare (i meno
    // possibile per raggiungere il totale, partendo dai Livelli più
    // alti), stesso spirito di Rito del Guerriero Nero (id 56). Manca
    // anche la clausola reale "e/o bandisci mostri Red-Eyes dal
    // Cimitero", qui si sacrificano solo mostri dal Terreno.
    // ================================================================
    CardEffects.register(414, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 354);
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
            const handIndex = hand.findIndex((c) => c.id === 354);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Signore del Rosso finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('🔥 Trasmigrazione Occhi Rossi evoca Signore del Rosso!');
        }
    });

    // ================================================================
    // 415 — Vincoli Recisi / Release Restraint (Magia Normale)
    // Sacrifica 1 "Gearfried il Cavaliere di Ferro" (id 16) scoperto;
    // Special Summon 1 "Gearfried il Maestro di Spada" (id 258) dalla
    // mano o dal Deck.
    // SEMPLIFICAZIONE: la ricerca dal Deck funziona solo se esiste un
    // Deck reale — stesso limite di Sepoltura Sciocca (id 251).
    // ================================================================
    CardEffects.register(415, {
        canActivate(ctx) {
            const hasIronKnight = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 16);
            if (!hasIronKnight) return false;
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inHand = ctx.hand(ctx.owner).some((c) => c.id === 258);
            const inDeck = Array.isArray(deck) && deck.some((c) => c.id === 258);
            return inHand || inDeck;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const ironIndex = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 16);
            if (ironIndex === -1) return;
            ctx.graveyard(ctx.owner).push(field[ironIndex].card);
            field[ironIndex] = null;

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.id === 258);
            let card;
            if (handIdx !== -1) {
                card = hand.splice(handIdx, 1)[0];
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = ctx.gameState[deckKey];
                if (!Array.isArray(deck)) return;
                const deckIdx = deck.findIndex((c) => c.id === 258);
                if (deckIdx === -1) return;
                card = deck.splice(deckIdx, 1)[0];
                ctx.gameState[countKey] = deck.length;
            }
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('⚔️ Vincoli Recisi evoca Gearfried il Maestro di Spada!');
        }
    });

    // ================================================================
    // 417 — Rimuovi Trappola / Remove Trap (Magia Normale)
    // Distrugge 1 Trappola scoperta sul Terreno.
    // ================================================================
    CardEffects.register(417, {
        canActivate(ctx) {
            return [ctx.opponent, ctx.owner].some((owner) => ctx.stField(owner).some((slot) => slot && !slot.isFaceDown && slot.card.type === 'trap'));
        },
        activate(ctx) {
            let targetOwner = null;
            let targetIndex = -1;
            [ctx.opponent, ctx.owner].forEach((owner) => {
                if (targetIndex !== -1) return;
                const idx = ctx.stField(owner).findIndex((slot) => slot && !slot.isFaceDown && slot.card.type === 'trap');
                if (idx !== -1) { targetOwner = owner; targetIndex = idx; }
            });
            if (targetIndex === -1) return;
            const card = ctx.stField(targetOwner)[targetIndex].card;
            ctx.graveyard(targetOwner).push(card);
            ctx.stField(targetOwner)[targetIndex] = null;
            ctx.log(`✨ Rimuovi Trappola distrugge ${card.name}!`);
        }
    });

    // ================================================================
    // 426 — Decreto Reale / Royal Decree (effetto CONTINUO della
    // Trappola, non un'attivazione manuale — come Jinzo, id 17)
    // Nega gli effetti di tutte le altre Trappole sul Terreno, di
    // entrambi i giocatori.
    // ================================================================
    CardEffects.register(426, {
        static(ctx) {
            gameState.trapsNegatedFor[ctx.owner] = true;
            gameState.trapsNegatedFor[ctx.opponent] = true;
        }
    });

    // ================================================================
    // 430 — Pietra del Saggio / Sage's Stone (Magia Normale)
    // Se controlli scoperta "Maga Oscura" (id 188): Special Summon 1
    // "Mago Nero" (id 2) dalla mano o dal Deck.
    // SEMPLIFICAZIONE: la ricerca dal Deck funziona solo se esiste un
    // Deck reale — stesso limite di Sepoltura Sciocca (id 251).
    // ================================================================
    CardEffects.register(430, {
        canActivate(ctx) {
            const hasMagicianGirl = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 19);
            if (!hasMagicianGirl) return false;
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return false;
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inHand = ctx.hand(ctx.owner).some((c) => c.id === 2);
            const inDeck = Array.isArray(deck) && deck.some((c) => c.id === 2);
            return inHand || inDeck;
        },
        activate(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const hand = ctx.hand(ctx.owner);
            const handIdx = hand.findIndex((c) => c.id === 2);
            let card;
            if (handIdx !== -1) {
                card = hand.splice(handIdx, 1)[0];
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = ctx.gameState[deckKey];
                if (!Array.isArray(deck)) return;
                const deckIdx = deck.findIndex((c) => c.id === 2);
                if (deckIdx === -1) return;
                card = deck.splice(deckIdx, 1)[0];
                ctx.gameState[countKey] = deck.length;
            }
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
            ctx.log('🔮 Pietra del Saggio evoca Mago Nero!');
        }
    });

    // ================================================================
    // 452 — Rilascio dell'Anima / Soul Release (Magia Normale)
    // Bandisce fino a 5 carte da un Cimitero qualsiasi.
    // SEMPLIFICAZIONE: l'effetto reale lascia scegliere quali carte
    // bandire — qui vengono bandite automaticamente le prime carte
    // trovate (prima il proprio Cimitero, poi quello dell'avversario).
    // ================================================================
    CardEffects.register(452, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).length > 0 || ctx.graveyard(ctx.opponent).length > 0;
        },
        activate(ctx) {
            let banished = 0;
            [ctx.owner, ctx.opponent].forEach((owner) => {
                const gy = ctx.graveyard(owner);
                while (banished < 5 && gy.length > 0) {
                    gy.pop();
                    banished++;
                }
            });
            ctx.log(`👻 Rilascio dell'Anima bandisce ${banished} cart${banished === 1 ? 'a' : 'e'} dai Cimiteri!`);
        }
    });

    // ================================================================
    // 453 — Cacciatore di Anime / Soul Taker (Magia Normale)
    // Distruggi 1 mostro scoperto dell'avversario, poi l'avversario
    // guadagna 1000 Life Points.
    // ================================================================
    CardEffects.register(453, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown);
            if (index === -1) return;
            const name = field[index].card.name;
            ctx.destroyMonster(ctx.opponent, index);
            ctx.dealDamage(ctx.opponent, -1000);
            ctx.log(`💀 Cacciatore di Anime distrugge ${name}, l'avversario guadagna 1000 Life Points!`);
        }
    });

    // ================================================================
    // 468 — Il Flauto per Evocare i Draghi / The Flute of Summoning
    // Dragon (Magia Normale)
    // "Signore dei D." (id 353) deve essere sul Terreno. Special Summon
    // fino a 2 mostri Tipo Drago dalla mano.
    // ================================================================
    CardEffects.register(468, {
        canActivate(ctx) {
            const hasLordOfD = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 353);
            if (!hasLordOfD) return false;
            return ctx.hand(ctx.owner).some((c) => c.race === 'Drago');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            let summoned = 0;
            for (let i = 0; i < 2; i++) {
                const handIdx = hand.findIndex((c) => c.race === 'Drago');
                if (handIdx === -1) break;
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) break;
                const [card] = hand.splice(handIdx, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack');
                summoned++;
            }
            ctx.log(`🐉 Il Flauto per Evocare i Draghi Special Summona ${summoned} mostr${summoned === 1 ? 'o' : 'i'} Drago!`);
        }
    });

    // ================================================================
    // 474 — Mille Coltelli / Thousand Knives (Magia Normale)
    // Se controlli "Mago Nero" (id 2): distruggi 1 mostro dell'avversario.
    // ================================================================
    CardEffects.register(474, {
        canActivate(ctx) {
            const hasDarkMagician = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
            if (!hasDarkMagician) return false;
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown);
            if (index === -1) return;
            const name = field[index].card.name;
            ctx.destroyMonster(ctx.opponent, index);
            ctx.log(`🗡️ Mille Coltelli distrugge ${name}!`);
        }
    });

    // ================================================================
    // 487 — Mondo dei Toon / Toon World (Magia Continua)
    // Attiva questa carta pagando 1000 Life Points. Nessun altro effetto
    // meccanico: tutte le carte "Toon" che dipendono da questa restano
    // data-only (vedi i loro commenti in cards-db.js).
    // ================================================================
    CardEffects.register(487, {
        continuous: true,
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 1000);
            ctx.log(`🎨 Mondo dei Toon attivato pagando 1000 Life Points!`);
        }
    });

    // ================================================================
    // 490 — Tributo Torrenziale / Torrential Tribute (Trappola Normale,
    // risposta a un'Evocazione — come Buco Trappola, id 40)
    // Quando l'avversario Evoca un mostro: distruggi tutti i mostri sul
    // Terreno, di entrambi i giocatori.
    // SEMPLIFICAZIONE: l'effetto reale risponde a QUALSIASI Evocazione,
    // inclusa la propria — qui, come per Buco Trappola, risponde solo a
    // un'Evocazione dell'avversario (stesso schema delle finestre di
    // risposta di questo motore).
    // ================================================================
    CardEffects.register(490, {
        onOpponentSummon(ctx) {
            ctx.destroyAllMonsters();
            ctx.log(`🌊 Tributo Torrenziale distrugge tutti i mostri sul Terreno!`);
        }
    });

    // ================================================================
    // 492 — Tributo ai Dannati / Tribute to the Doomed (Magia Normale)
    // Scarta 1 carta dalla mano, poi distruggi 1 mostro dell'avversario.
    // SEMPLIFICAZIONE: la carta reale può bersagliare qualsiasi mostro sul
    // Terreno (anche un proprio mostro coperto) — qui sceglie sempre un
    // mostro scoperto dell'avversario, e la carta scartata è sempre la
    // prima in mano.
    // ================================================================
    CardEffects.register(492, {
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const discarded = hand.splice(0, 1)[0];
            ctx.graveyard(ctx.owner).push(discarded);

            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((slot) => slot && !slot.isFaceDown);
            if (index === -1) return;
            const name = field[index].card.name;
            ctx.destroyMonster(ctx.opponent, index);
            ctx.log(`⚰️ Tributo ai Dannati scarta ${discarded.name} e distrugge ${name}!`);
        }
    });

    // ================================================================
    // 506 — Rituale del Drago Bianco / White Dragon Ritual (Magia
    // Rituale)
    // Sacrifica mostri dal Terreno per un Livello totale di almeno 4,
    // poi Special Summon Paladino del Drago Bianco (id 398) dalla mano.
    // SEMPLIFICAZIONE: sceglie da sola quali mostri sacrificare, stesso
    // spirito di Rito del Guerriero Nero (id 56). Manca anche la
    // possibilità di sacrificare dalla mano oltre che dal Terreno.
    // ================================================================
    CardEffects.register(506, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 398);
            if (!hasRitualMonster) return false;
            const totalLevel = ctx.field(ctx.owner).reduce((sum, slot) => sum + (slot ? (slot.card.level || 0) : 0), 0);
            return totalLevel >= 4;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const occupied = field
                .map((slot, index) => (slot ? { index, level: slot.card.level || 0 } : null))
                .filter(Boolean)
                .sort((a, b) => b.level - a.level);

            let remaining = 4;
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
            const handIndex = hand.findIndex((c) => c.id === 398);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Paladino del Drago Bianco finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('🐲 Rituale del Drago Bianco evoca Paladino del Drago Bianco!');
        }
    });

    // ================================================================
    // 517 — Rituale di Zera / Zera Ritual (Magia Rituale)
    // Sacrifica mostri dal Terreno per un Livello totale di almeno 8,
    // poi Special Summon Zera il Mant (id 518) dalla mano.
    // SEMPLIFICAZIONE: stesso spirito di Rito del Guerriero Nero (id 56).
    // ================================================================
    CardEffects.register(517, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 518);
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
            const handIndex = hand.findIndex((c) => c.id === 518);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);

            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Zera il Mant finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('👹 Rituale di Zera evoca Zera il Mant!');
        }
    });

    // ================================================================
    // 519 — Gravità Zero / Zero Gravity (Trappola Normale)
    // Cambia la Posizione di Battaglia di tutti i mostri scoperti sul
    // Terreno, di entrambi i giocatori.
    // ================================================================
    CardEffects.register(519, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown));
        },
        activate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown) {
                        slot.position = slot.position === 'attack' ? 'defense' : 'attack';
                        count++;
                    }
                });
            });
            ctx.log(`🔄 Gravità Zero cambia la Posizione di Battaglia di ${count} mostr${count === 1 ? 'o' : 'i'}!`);
        }
    });
})();
