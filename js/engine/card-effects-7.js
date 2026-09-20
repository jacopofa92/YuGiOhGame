/**
 * card-effects-7.js — Effetti delle carte, parte 7 di 8.
 * =====================================================================
 * Solo blocchi CardEffects.register(...): nessuna logica condivisa vive
 * qui. Gli helper usati da più gruppi di carte stanno tutti in
 * js/engine/card-effects.js (window.CardEffectsShared), che va caricato
 * PRIMA di questo file — insieme a js/engine/duel-engine.js, che è chi
 * definisce CardEffects.register stesso.
 *
 * Il taglio fra le parti è puramente meccanico (righe, non temi): le
 * carte restano nell'ordine in cui sono sempre state. Per trovarne una
 * cerca `register(<id>` in tutta la cartella js/engine/, non a occhio.
 */
(function () {
    'use strict';

    const { isHarpieLadySupport, findEquipTarget, equipToChosenTarget, attachEquip, equippedTarget, searchDeckWithChoice, searchGraveyardWithChoice, chooseFieldCardTarget, chooseFieldMonsterTarget, collectFieldTargets, offerHandDiscardChoice, chooseCardFromHand, chooseCardFromList, banishFromGraveyardWithChoice, resolveSpecialSummonBanishCost, maxRitualTributeLevel, performRitualTribute, releaseRelinquishedTarget, selfFlipToFaceDownDefense, findLevel7SpellcasterTarget, grantAttackAllEnemiesOncEach } = window.CardEffectsShared;

    // ================================================================
    // 835 — Ingranaggio Antico / Ancient Gear
    // Se controlli un mostro "Ingranaggio Antico" (l'archetipo, es. Golem
    // Ingranaggio Antico id 832): puoi Special Summonarla dalla mano
    // scoperta in Posizione di Attacco. In inglese "Ancient Gear" è un
    // PREFISSO in ogni nome della famiglia; in italiano la traduzione lo
    // rende un SUFFISSO ("Golem Ingranaggio Antico", non "Ingranaggio
    // Antico Golem") — .includes(), non .startsWith(), verifica
    // l'appartenenza all'archetipo indipendentemente dalla posizione.
    // ================================================================
    CardEffects.register(835, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Ingranaggio Antico') && s.card.uid !== ctx.card.uid);
        },
        paySpecialSummonCost() { return true; }
    });

    // ================================================================
    // 836 — Cannone Ingranaggio Antico / Ancient Gear Cannon (Ignition —
    // auto-sacrificio)
    // Sacrifica questa carta: 500 danni e blocca le Trappole di
    // entrambi durante la Battle Phase di questo turno.
    // ================================================================
    CardEffects.register(836, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && s.card.uid === ctx.card.uid);
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.graveyard(ctx.owner).push(ctx.card);
            field[index] = null;
            ctx.dealDamage(ctx.opponent, 500);
            gameState.noTrapActivationFor = gameState.noTrapActivationFor || {};
            gameState.noTrapActivationFor.player = true;
            gameState.noTrapActivationFor.bot = true;
            ctx.log('⚙️ Cannone Ingranaggio Antico si sacrifica, infligge 500 danni e blocca le Trappole!');
        }
    });

    // ================================================================
    // 837 — Officina dell'Ingranaggio Antico / Ancient Gear Workshop
    // (Magia Normale)
    // Aggiungi 1 mostro "Ingranaggio Antico" dal Cimitero alla mano.
    // ================================================================
    CardEffects.register(837, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.name && c.name.includes('Ingranaggio Antico'));
        },
        activate(ctx) {
            searchGraveyardWithChoice(ctx, ctx.owner, (c) => c.name && c.name.includes('Ingranaggio Antico'), {
                title: '⚙️ Officina dell\'Ingranaggio Antico',
                text: 'Scegli quale mostro "Ingranaggio Antico" recuperare dal Cimitero.'
            }, (card) => {
                ctx.hand(ctx.owner).push(card);
                ctx.log(`⚙️ Officina dell'Ingranaggio Antico recupera ${card.name} dal Cimitero!`);
            });
        }
    });

    // ================================================================
    // 838 — Carro Armato Ingranaggio Antico / Ancient Gear Tank
    // (Equipaggiamento, solo "Ingranaggio Antico")
    // +600 ATK. Quando questa carta viene distrutta e mandata al
    // Cimitero: 600 danni. Stesso schema di dipendenza targetOwner/
    // targetIndex/targetUid di Collana del Comando (id 688).
    // ================================================================
    CardEffects.register(838, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.name && c.name.includes('Ingranaggio Antico')) !== -1; },
        activate(ctx) {
            const index = findEquipTarget(ctx, (c) => c.name && c.name.includes('Ingranaggio Antico'));
            if (index === -1) return;
            const target = ctx.field(ctx.owner)[index].card;
            ctx.card.targetOwner = ctx.owner;
            ctx.card.targetIndex = index;
            ctx.card.targetUid = target.uid;
            ctx.log(`⚙️ Carro Armato Ingranaggio Antico equipaggiato a ${target.name}!`);
        },
        static(ctx) {
            const targetSlot = ctx.card.targetOwner != null ? ctx.field(ctx.card.targetOwner)[ctx.card.targetIndex] : null;
            const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === ctx.card.targetUid;
            if (validTarget) {
                const e = gameState.atkDefBonus[targetSlot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[targetSlot.card.uid] = { atk: e.atk + 600, def: e.def };
                return;
            }
            ctx.stField(ctx.owner)[ctx.index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            ctx.dealDamage(ctx.opponent, 600);
            ctx.log('⚙️ Carro Armato Ingranaggio Antico va al Cimitero e infligge 600 danni!');
        }
    });

    // ================================================================
    // 839 — Esplosivo Ingranaggio Antico / Ancient Gear Explosive
    // (Magia Normale)
    // Distruggi 1 proprio mostro "Ingranaggio Antico"; infliggi danni
    // pari alla metà del suo ATK originale.
    // ================================================================
    CardEffects.register(839, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Ingranaggio Antico'));
        },
        activate(ctx) {
            // Quale "Ingranaggio Antico" sacrificare cambia il danno (metà
            // del suo ATK), quindi la scelta è tutt'altro che indifferente.
            // I candidati sono ordinati dal più forte al più debole: il
            // bot, che prende sempre il primo, continua così a fare la
            // mossa sensata di prima invece della prima casella libera.
            const candidati = collectFieldTargets(ctx, {
                zone: 'monster',
                owner: 'self',
                filter: (card) => card.name && card.name.includes('Ingranaggio Antico')
            }).sort((a, b) => (b.card.attack || 0) - (a.card.attack || 0));
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '⚙️ Esplosivo Ingranaggio Antico',
                text: 'Scegli quale tuo "Ingranaggio Antico" far esplodere: il danno è metà del suo ATK.'
            }, (scelto) => {
                const card = scelto.card;
                const damage = Math.floor((card.attack || 0) / 2);
                ctx.destroyMonster(scelto.owner, scelto.index);
                ctx.dealDamage(ctx.opponent, damage);
                ctx.log(`⚙️ Esplosivo Ingranaggio Antico distrugge ${card.name} e infligge ${damage} danni!`);
            });
        }
    });

    // ================================================================
    // 840 — Pugno Ingranaggio Antico / Ancient Gear Fist (Equipaggiamento,
    // solo "Ingranaggio Antico")
    // Alla fine del Damage Step, se il mostro equipaggiato ha combattuto
    // e resta sul Terreno: distruggi il mostro contro cui ha combattuto
    // (onEquippedMonsterBattled, actions.js).
    // ================================================================
    CardEffects.register(840, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, (c) => c.name && c.name.includes('Ingranaggio Antico')) !== -1; },
        activate(ctx) { equipToChosenTarget(ctx, (c) => c.name && c.name.includes('Ingranaggio Antico')); },
        isEquip: true,
        equipTargetFilter: (c) => c.name && c.name.includes('Ingranaggio Antico'),
        static() {}, // nessun bonus ATK/DEF: serve solo per il controllo "bersaglio ancora valido"
        onEquippedMonsterBattled(ctx) {
            if (!ctx.opponentSurvived) return;
            const idx = ctx.field(ctx.opponent).findIndex((s) => s && s.card.uid === ctx.opponentCard.uid);
            if (idx === -1) return;
            ctx.destroyMonster(ctx.opponent, idx);
            ctx.log(`⚙️ Pugno Ingranaggio Antico distrugge ${ctx.opponentCard.name}!`);
        }
    });

    // ================================================================
    // 841 — Fabbrica dell'Ingranaggio Antico / Ancient Gear Factory
    // (Magia Normale)
    // Rivela 1 mostro "Ingranaggio Antico" di Livello 5+ dalla mano, poi
    // bandisci mostri "Ingranaggio Antico" dal proprio Cimitero il cui
    // Livello totale sia il doppio di quello rivelato (ctx.banish, zona
    // Bandite): se lo Evochi Normalmente in QUESTO turno, lo fai senza
    // Sacrificio — marcatore per-carta card._noTributeThisTurn ===
    // gameState.turn, controllato in attemptMonsterSummon (actions.js)
    // insieme alle altre eccezioni puntuali già lì (Gaia id 711, Grande
    // Pillola Evolutiva id 810). Sia il mostro da rivelare sia le carte
    // da bandire (una scelta alla volta finché il totale dei Livelli
    // banditi raggiunge il doppio del rivelato) sono ora una vera scelta
    // del giocatore, non più sempre il Livello più alto disponibile.
    // ================================================================
    CardEffects.register(841, {
        canActivate(ctx) {
            const isAncientGearMonster = (c) => c.type === 'monster' && c.name.includes('Ingranaggio Antico');
            const candidates = ctx.hand(ctx.owner).filter((c) => isAncientGearMonster(c) && c.level >= 5);
            if (candidates.length === 0) return false;
            const graveLevels = ctx.graveyard(ctx.owner).filter(isAncientGearMonster).reduce((sum, c) => sum + c.level, 0);
            return candidates.some((c) => graveLevels >= c.level * 2);
        },
        activate(ctx) {
            const isAncientGearMonster = (c) => c.type === 'monster' && c.name.includes('Ingranaggio Antico');
            const graveLevels = ctx.graveyard(ctx.owner).filter(isAncientGearMonster).reduce((sum, c) => sum + c.level, 0);
            const candidates = ctx.hand(ctx.owner).filter((c) => isAncientGearMonster(c) && c.level >= 5 && graveLevels >= c.level * 2);
            if (candidates.length === 0) return;

            // Dopo aver scelto QUALE mostro rivelare, banisce dal Cimitero
            // finché la somma dei Livelli banditi raggiunge il doppio del
            // Livello del rivelato — una scelta per volta (in sequenza,
            // mai un ciclo sincrono: vedi offerSpecialSummonBanishChoice
            // per lo stesso principio), così il giocatore decide DAVVERO
            // quali carte sacrificare tra quelle disponibili, non solo
            // sempre le più alte di Livello.
            const revealChosen = (revealed) => {
                let remaining = revealed.level * 2;
                const banishedNames = [];
                const banishNext = () => {
                    if (remaining <= 0) {
                        revealed._noTributeThisTurn = gameState.turn;
                        ctx.log(`⚙️ Fabbrica dell'Ingranaggio Antico rivela ${revealed.name} e bandisce ${banishedNames.length} cart${banishedNames.length === 1 ? 'a' : 'e'} dal Cimitero: potrai Evocarlo Normalmente senza Sacrificio questo turno!`);
                        return;
                    }
                    // Necrovalley (id 890): se banishFromGraveyard fallisse,
                    // onBanished non scatta e la catena si ferma da sola —
                    // il costo non pagato per intero non concede il beneficio.
                    banishFromGraveyardWithChoice(ctx, ctx.owner, isAncientGearMonster, {
                        title: '⚙️ Fabbrica dell\'Ingranaggio Antico',
                        text: `Scegli quale mostro "Ingranaggio Antico" bandire dal Cimitero (mancano ${remaining} Livelli).`
                    }, (card) => {
                        banishedNames.push(card.name);
                        remaining -= card.level;
                        banishNext();
                    });
                };
                banishNext();
            };

            if (candidates.length === 1 || ctx.owner !== 'player' || !window.DuelEngineUI) {
                let best = candidates[0];
                candidates.forEach((c) => { if (c.level > best.level) best = c; });
                revealChosen(best);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '⚙️ Fabbrica dell\'Ingranaggio Antico',
                text: 'Scegli quale mostro "Ingranaggio Antico" rivelare dalla mano.',
                onSelect: revealChosen
            });
        }
    });

    // ================================================================
    // 842 — Trapano Ingranaggio Antico / Ancient Gear Drill (Magia
    // Normale). Entrambe le clausole sono implementate: se controlli un
    // mostro "Ingranaggio Antico", scarta 1 carta e Set 1 Magia
    // direttamente dal Deck, senza poterla attivare in questo turno.
    // ================================================================
    CardEffects.register(842, {
        canActivate(ctx) {
            const hasAncientGear = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Ingranaggio Antico'));
            if (!hasAncientGear) return false;
            if (ctx.hand(ctx.owner).length === 0) return false;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            return Array.isArray(deck) && deck.some((c) => c.type === 'spell') && ctx.stField(ctx.owner).some((s) => s === null);
        },
        activate(ctx) {
            offerHandDiscardChoice(ctx, {
                title: '⚙️ Trapano Ingranaggio Antico',
                text: 'Scegli quale carta scartare dalla mano.'
            }, (discarded) => {
                searchDeckWithChoice(ctx, (c) => c.type === 'spell', {
                    title: '⚙️ Trapano Ingranaggio Antico',
                    text: 'Scegli quale Magia mettere Set dal Deck.'
                }, (card) => {
                    const freeSlot = ctx.stField(ctx.owner).findIndex((s) => s === null);
                    if (freeSlot === -1) { ctx.graveyard(ctx.owner).push(card); return; }
                    ctx.stField(ctx.owner)[freeSlot] = { card: card, isFaceDown: true, setOnTurn: gameState.turn };
                    gameState.blockedCardUidsThisTurn = gameState.blockedCardUidsThisTurn || new Set();
                    gameState.blockedCardUidsThisTurn.add(card.uid);
                    ctx.log(`⚙️ Trapano Ingranaggio Antico scarta ${discarded.name} e mette Set ${card.name} dal Deck! Non può essere attivata in questo turno.`);
                });
            });
        }
    });

    // ================================================================
    // 843 — Castello dell'Ingranaggio Antico / Ancient Gear Castle
    // (Magia Continua)
    // Tutti i mostri "Ingranaggio Antico": +300 ATK. Ogni Evocazione
    // Normale/Set (di QUALSIASI mostro, di entrambi i lati — il testo non
    // specifica "tuo") mentre questa carta resta scoperta: +1 Segnalino
    // (card.counters, la convenzione generica già usata da id 131/139).
    // onAnyNormalOrFlipSummon (reactToAnyNormalOrFlipSummon,
    // duel-engine.js) è il gancio giusto per "chiunque", non
    // onOwnMonsterSummoned (solo il proprio lato) — esteso apposta anche
    // alla zona 'st', dove vive questa carta (prima copriva solo la zona
    // Mostri, es. Misterioso Burattinaio id 579).
    // Il sacrificio alternativo ("puoi sacrificare questa carta al posto
    // dei mostri, se i Segnalini bastano") è implementato in
    // js/engine/actions.js (attemptMonsterSummon/performGearCastleTributeSacrifice),
    // non qui: scatta PRIMA della selezione Tributi normale, offerta come
    // modale Sì/Annulla quando si tenta di Evocare Tributo un mostro
    // "Ingranaggio Antico" scoperto con Segnalini sufficienti su questa
    // carta.
    // ================================================================
    CardEffects.register(843, {
        continuous: true,
        activate(ctx) {
            ctx.log("⚙️ Castello dell'Ingranaggio Antico attivato!");
        },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || !(slot.card.name && slot.card.name.includes('Ingranaggio Antico'))) return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 300, def: e.def };
                });
            });
        },
        // "Ogni Evocazione Normale/Set" — ctx.summonedVia distingue 'normal'
        // (Evocazione Normale in Attacco O Set coperto: entrambe passano
        // per TRIGGER.ON_NORMAL_SUMMON, vedi summonMonster in actions.js)
        // da 'flip' (TRIGGER.ON_FLIP, un mostro già Set che si rivela in
        // battaglia) — esclude correttamente il Flip Summon dal conteggio,
        // come da testo reale.
        onAnyNormalOrFlipSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            ctx.card.counters = (ctx.card.counters || 0) + 1;
            ctx.log(`⚙️ Castello dell'Ingranaggio Antico guadagna 1 Segnalino (${ctx.card.counters} totali)!`);
        }
    });

    // ================================================================
    // 845 — Controllore Nemico / Enemy Controller (Magia Rapida)
    // Due modalità: cambia Posizione di 1 mostro avversario, OPPURE
    // sacrifica 1 mostro e prendi il controllo di 1 mostro avversario
    // fino alla End Phase (ctx.takeControl, come Cambio di Cuore id 147).
    // SEMPLIFICAZIONE: sceglie sempre la modalità "prendi il controllo"
    // se può sacrificare un mostro, altrimenti la modalità "cambia
    // Posizione", invece di lasciar scegliere.
    // ================================================================
    CardEffects.register(845, {
        declaredTargeting: { count: 1, cardType: 'monster' },
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            // Il BERSAGLIO ora lo sceglie il giocatore. La MODALITÀ no:
            // resta automatica (prende il controllo se ha un mostro da
            // sacrificare, altrimenti cambia Posizione), come da
            // SEMPLIFICAZIONE dichiarata qui sopra — sono due scelte
            // distinte, e impilare un secondo popover sopra il picker è
            // un cambiamento a sé.
            const candidati = collectFieldTargets(ctx, { zone: 'monster', owner: 'opponent' });
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '⚙️ Controllore Nemico',
                text: 'Scegli quale mostro avversario bersagliare.'
            }, (scelto) => {
                const decl = ctx.declareTarget(scelto.owner, scelto.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const ownField = ctx.field(ctx.owner);
                const sacIndex = ownField.findIndex((s) => s);
                if (sacIndex !== -1) {
                    const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                    if (targetSlot) {
                        const sacrificed = ownField[sacIndex].card;
                        ctx.graveyard(ctx.owner).push(sacrificed);
                        ownField[sacIndex] = null;
                        const stolen = targetSlot.card;
                        if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex)) {
                            ctx.log(`⚙️ Controllore Nemico sacrifica ${sacrificed.name} e prende il controllo di ${stolen.name}!`);
                            return;
                        }
                    }
                }
                const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!targetSlot) return;
                targetSlot.position = targetSlot.position === 'attack' ? 'defense' : 'attack';
                ctx.log(`⚙️ Controllore Nemico cambia la Posizione di ${targetSlot.card.name}!`);
            });
        }
    });

    // ================================================================
    // 846 — Cambio d'Arma / Weapon Change (Magia Continua)
    // "Una volta per ciascuna delle tue Standby Phase: puoi pagare 700 LP,
    // poi scegliere come bersaglio 1 mostro Tipo Guerriero o Macchina che
    // controlli; scambia l'ATK e la DEF attuali di quel bersaglio fino
    // alla fine del prossimo turno del tuo avversario." — reazione
    // onStandbyPhase(ctx), firePhaseTrigger (duel-engine.js) chiama ogni
    // reazione in un forEach SINCRONO ma senza alcuna dipendenza
    // d'ordinamento successiva (a differenza di onAttackDeclare/559: qui
    // nessun calcolo successivo dipende da QUANDO esattamente si risolve
    // la scelta), quindi una vera scelta interattiva
    // (DuelEngineUI.openChoicePopover per "paga 700 LP?",
    // openCardListPicker se più di un bersaglio idoneo) è sicura. Il bot
    // (nessuna vera IA dedicata) applica sempre se possibile, come le
    // altre scelte "puoi" senza vera IA in questo file. Riusa
    // gameState.orgothAtkDefBonus/orgothActiveUidsFor (395 Orgoth
    // l'Implacabile) per la durata "fino a fine turno dell'avversario":
    // la semantica di scadenza è identica (azzerato in changeTurn,
    // game-flow.js, quando torna il turno di chi l'ha concesso), quindi
    // nessun nuovo store/nessuna nuova logica di pulizia serve.
    // ================================================================
    function applyWeaponChange(ctx, target) {
        ctx.markUsedOncePerTurn(`weapon-change:${ctx.card.uid}`);
        ctx.dealDamage(ctx.owner, 700);
        const atk = DuelEngine.getEffectiveAtk(target);
        const def = DuelEngine.getEffectiveDef(target);
        gameState.orgothAtkDefBonus = gameState.orgothAtkDefBonus || {};
        gameState.orgothActiveUidsFor = gameState.orgothActiveUidsFor || { player: new Set(), bot: new Set() };
        gameState.orgothAtkDefBonus[target.uid] = { atk: def - atk, def: atk - def };
        gameState.orgothActiveUidsFor[ctx.owner].add(target.uid);
        ctx.log(`⚙️ Cambio d'Arma paga 700 LP e scambia ATK/DEF di ${target.name} fino a fine turno avversario!`);
    }
    CardEffects.register(846, {
        continuous: true,
        activate(ctx) {
            ctx.log("⚙️ Cambio d'Arma attivato!");
        },
        onStandbyPhase(ctx) {
            if (ctx.hasUsedOncePerTurn(`weapon-change:${ctx.card.uid}`)) return;
            const ownLP = ctx.owner === 'player' ? gameState.playerLP : gameState.botLP;
            if (ownLP <= 700) return;
            const targets = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && (s.card.race === 'Guerriero' || s.card.race === 'Macchina')).map((s) => s.card);
            if (targets.length === 0) return;
            if (ctx.owner === 'player' && window.DuelEngineUI) {
                window.DuelEngineUI.openChoicePopover(null, {
                    title: "⚙️ Cambio d'Arma",
                    choiceA: { icon: '✅', label: 'Paga 700 LP, scambia ATK/DEF di un mostro', onSelect: () => {
                        if (targets.length === 1) { applyWeaponChange(ctx, targets[0]); return; }
                        window.DuelEngineUI.openCardListPicker(targets, {
                            title: "⚙️ Cambio d'Arma",
                            text: 'Scegli il mostro Guerriero/Macchina a cui scambiare ATK/DEF.',
                            onSelect: (card) => applyWeaponChange(ctx, targets.find((t) => t.uid === card.uid))
                        });
                    } },
                    choiceB: { icon: '❌', label: 'Non fare nulla', onSelect: () => {} }
                });
            } else {
                applyWeaponChange(ctx, targets[0]);
            }
        }
    });

    // ================================================================
    // 847 — Duplicazione Meccanica / Machine Duplication (Magia Normale)
    // Scegli 1 mostro Macchina con 500 o meno ATK; Special Summon fino
    // a 2 copie con lo stesso nome dal Deck.
    // ================================================================
    CardEffects.register(847, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.race === 'Macchina' && s.card.attack <= 500);
        },
        activate(ctx) {
            // QUALE Macchina si sceglie cambia completamente l'esito: le
            // copie evocate dal Deck sono quelle con il suo stesso nome.
            const candidati = collectFieldTargets(ctx, {
                zone: 'monster',
                owner: 'self',
                filter: (card) => card.race === 'Macchina' && card.attack <= 500
            });
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '⚙️ Duplicazione Meccanica',
                text: 'Scegli quale Macchina duplicare: dal Deck arrivano fino a 2 copie con lo stesso nome.'
            }, (scelto) => duplicaMacchina(ctx, scelto.slot));
        }
    });

    /**
     * Corpo di Duplicazione Meccanica (id 847) una volta scelto il
     * bersaglio: vive fuori dalla registrazione solo per non annidare
     * tutto dentro la callback del picker.
     */
    function duplicaMacchina(ctx, targetSlot) {
            if (!targetSlot) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            let summoned = 0;
            while (summoned < 2) {
                const index = deck.findIndex((c) => c.id === targetSlot.card.id);
                if (index === -1) break;
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) break;
                const [card] = deck.splice(index, 1);
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'deck');
                summoned++;
            }
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.log(`⚙️ Duplicazione Meccanica Special Summona ${summoned} copie di ${targetSlot.card.name}!`);
    }

    // ================================================================
    // 848 — Vaso dell'Avarizia / Pot of Avarice (Magia Normale)
    // Rimescola fino a 5 mostri dal Cimitero nel Deck; pesca 2 carte.
    // ================================================================
    CardEffects.register(848, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).filter((c) => c.type === 'monster').length >= 1;
        },
        activate(ctx) {
            // Fino a 5 mostri, scelti UNO ALLA VOLTA (i picker sono
            // asincroni: il secondo deve vivere dentro la callback del
            // primo, o si aprirebbero due liste insieme). Quali mostri
            // tornano nel Deck conta davvero — sono quelli che potrai
            // ripescare.
            const raccolti = [];
            const concludi = () => {
                if (raccolti.length === 0) return;
                if (!ctx.shuffleIntoDeck(ctx.owner, raccolti)) {
                    // Rimescolo impossibile (nessun vero Deck salvato, es.
                    // Duello Demo): le carte tornano da dove sono venute.
                    ctx.graveyard(ctx.owner).push(...raccolti);
                    return;
                }
                ctx.drawCards(ctx.owner, 2);
                ctx.log(`🏺 Vaso dell'Avarizia rimescola ${raccolti.length} mostri nel Deck e pesca 2 carte!`);
            };
            const prendi = (restanti) => {
                if (restanti === 0) { concludi(); return; }
                // searchGraveyardWithChoice toglie già la carta dal
                // Cimitero prima di chiamarci — qui serve davvero, la
                // carta se ne va nel Deck.
                const trovato = searchGraveyardWithChoice(ctx, ctx.owner, (c) => c.type === 'monster', {
                    title: '🏺 Vaso dell\'Avarizia',
                    text: `Scegli quale mostro rimescolare nel Deck (${raccolti.length + 1} di 5).`
                }, (card) => {
                    raccolti.push(card);
                    prendi(restanti - 1);
                });
                if (!trovato) concludi();   // finiti i mostri prima di arrivare a 5
            };
            prendi(5);
        }
    });

    // ================================================================
    // 849 — Roccaforte la Fortezza Mobile / Fortress Whale's Oath
    // Trappola Normale: quando si attiva, activateCard() (duel-engine.js)
    // la manda già al Cimitero da sola (comportamento standard di ogni
    // Trappola Normale, dato che questa carta NON dichiara
    // continuous:true) — activate() qui sotto la ripesca subito e la
    // Special Summona in Posizione di Difesa come Mostro con Effetto
    // (Macchina/TERRA/Livello 4/ATK 0/DEF 2000), mutando i campi
    // dell'istanza in campo direttamente (ogni copia giocata è un
    // oggetto proprio, mai condiviso col resto di cardDatabase — stesso
    // principio già usato altrove per modifiche dirette permanenti).
    // Finché controlli Gadget Verde/Rosso/Giallo (id 828/829/830):
    // guadagna 3000 ATK.
    // SEMPLIFICAZIONE: la nota precedente ("questo motore non supporta
    // una carta che esiste contemporaneamente come Trappola E come
    // Mostro") descriveva un limite reale ma risolvibile senza una vera
    // architettura a doppia natura: una volta Special Summonata, questa
    // carta diventa un Mostro puro (perde la propria natura di Trappola
    // ai fini di interazioni ipotetiche con altre carte che verificassero
    // "è ancora una Trappola" — nessuna carta di questo dataset lo fa).
    // ================================================================
    CardEffects.register(849, {
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const graveIndex = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (graveIndex !== -1) grave.splice(graveIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                grave.push(ctx.card);
                ctx.log('⚠️ Il Terreno è pieno: Roccaforte la Fortezza Mobile resta nel Cimitero.');
                return;
            }
            ctx.card.type = 'monster';
            ctx.card.race = 'Macchina';
            ctx.card.attribute = 'TERRA';
            ctx.card.level = 4;
            ctx.card.attack = 0;
            ctx.card.defense = 2000;
            ctx.specialSummon(ctx.owner, ctx.card, slotIndex, 'defense', 'graveyard');
            // specialSummon(): "difesa" implica coperta di default (stesso
            // comportamento usato da Mago Apprendista id 737) — questa
            // carta invece va Special Summonata SCOPERTA, va corretto qui.
            const newSlot = ctx.field(ctx.owner)[slotIndex];
            if (newSlot) newSlot.isFaceDown = false;
            ctx.log('🐋 Roccaforte la Fortezza Mobile si Special Summona come Mostro in Posizione di Difesa!');
        },
        static(ctx) {
            const gadgetIds = [828, 829, 830];
            const hasAllThree = gadgetIds.every((id) => ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === id));
            if (!hasAllThree) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + 3000, def: e.def };
        }
    });

    // ================================================================
    // 850 — Raggio Micro / Micro Ray (Trappola Normale)
    // Scegli 1 mostro scoperto sul Terreno; la sua DEF diventa 0 fino a
    // fine turno.
    // ================================================================
    CardEffects.register(850, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown));
        },
        activate(ctx) {
            const candidati = collectFieldTargets(ctx, { zone: 'monster' });
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '🔫 Raggio Micro',
                text: 'Scegli il mostro scoperto a cui azzerare la DEF.'
            }, (scelto) => {
                const decl = ctx.declareTarget(scelto.owner, scelto.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const finalSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!finalSlot) return;
                ctx.grantTemporaryAtkDefBonus(finalSlot.card, 0, -DuelEngine.getEffectiveDef(finalSlot.card), false);
                ctx.log(`🔫 Raggio Micro azzera la DEF di ${finalSlot.card.name}!`);
            });
        }
    });

    // ================================================================
    // 851 — Metalmorfosi Rara / Rare Metalmorph (Equipaggiamento, solo
    // Tipo Macchina). "Una volta, annulla un effetto Magia che ha come
    // bersaglio quel mostro": via il checkpoint ctx.declareTarget
    // (duel-engine.js) — la carta reagisce dalla zona ST come Specchietto
    // della Fata/id 235, ma essendo CONTINUA (già scoperta in campo,
    // equipaggiata) NON va al Cimitero quando reagisce (vedi il controllo
    // !def.continuous in tryReact dentro declareCardEffectTarget) — resta
    // equipaggiata, solo "usata" tramite gameState.rareMetalmorphUsedUids.
    // canActivate qui sotto serve DUE scopi diversi a seconda del
    // contesto: la normale attivazione (equip su un mostro Macchina, ctx
    // senza ctx.cancel) e l'eleggibilità come risposta reattiva (ctx con
    // ctx.cancel, costruito da tryReact) — si distinguono controllando se
    // ctx.cancel è una funzione, esattamente come fa tryReact stesso per
    // riconoscere un reactCtx.
    // ================================================================
    CardEffects.register(851, {
        continuous: true,
        canActivate(ctx) {
            if (typeof ctx.cancel === 'function') {
                if (gameState.rareMetalmorphUsedUids && gameState.rareMetalmorphUsedUids.has(ctx.card.uid)) return false;
                if (ctx.sourceType !== 'spell') return false;
                const equipped = ctx.card.equippedToUid;
                const targetSlot = ctx.field(ctx.owner)[ctx.targetIndex];
                return !!(equipped && ctx.targetOwner === ctx.owner && targetSlot && targetSlot.card.uid === equipped);
            }
            return findEquipTarget(ctx, (c) => c.race === 'Macchina') !== -1;
        },
        activate(ctx) { equipToChosenTarget(ctx, (c) => c.race === 'Macchina'); },
        isEquip: true,
        onCardEffectTargetDeclare(ctx) {
            gameState.rareMetalmorphUsedUids = gameState.rareMetalmorphUsedUids || new Set();
            gameState.rareMetalmorphUsedUids.add(ctx.card.uid);
            ctx.cancel();
            ctx.log(`🛡️ ${ctx.card.name} annulla l'effetto della Magia (una tantum)!`);
        },
        static(ctx) {
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 500, def: e.def };
        }
    });

    // ================================================================
    // 852 — Fuoco di Copertura / Covering Fire (Trappola Normale)
    // Durante un attacco subito, scegli 1 altro proprio mostro scoperto:
    // il mostro attaccato guadagna il suo ATK, solo per questo Damage Step
    // (ctx.grantDamageStepOnlyBonus, duel-engine.js).
    // ================================================================
    CardEffects.register(852, {
        onAttackDeclare(ctx) {
            if (typeof ctx.targetIndex !== 'number' || ctx.targetIndex === -1) return;
            const own = ctx.field(ctx.owner);
            const targetSlot = own[ctx.targetIndex];
            if (!targetSlot) return;
            // NIENTE PICKER QUI, ed è una decisione verificata, non una
            // dimenticanza: un handler dentro onAttackDeclare si risolve
            // come link di una Chain, e resolveChain CHIAMA l'handler e
            // tira dritto dopo una pausa fissa senza aspettarlo (vedi
            // runHandler in duel-engine.js). Misurato: aprendo un picker
            // qui e scegliendo dopo 4 secondi — il tempo che ci mette una
            // persona a leggere due carte — la battaglia si era già
            // risolta, il bonus arrivava a danno calcolato e la carta non
            // faceva NULLA (1400 LP persi invece di 0, difensore morto).
            // È lo stesso motivo per cui le Trappole Contatore non sono
            // mai state migrate a una scelta asincrona.
            // Si sceglie quindi da soli, ma il meglio possibile: il
            // mostro con l'ATK più alto, che è anche ciò che il giocatore
            // sceglierebbe quasi sempre.
            let boosterSlot = null;
            own.forEach((s, i) => {
                if (!s || s.isFaceDown || i === ctx.targetIndex) return;
                if (!boosterSlot || DuelEngine.getEffectiveAtk(s.card) > DuelEngine.getEffectiveAtk(boosterSlot.card)) boosterSlot = s;
            });
            if (!boosterSlot) return;
            const bonus = DuelEngine.getEffectiveAtk(boosterSlot.card);
            ctx.grantDamageStepOnlyBonus(targetSlot.card, bonus, 0);
            ctx.log(`🔥 Fuoco di Copertura aumenta l'ATK di ${targetSlot.card.name} di ${bonus} punti per questo Damage Step!`);
        }
    });

    // ================================================================
    // 853 — Avanti Tutta! / Full Throttle (Magia Normale)
    // Recupera 1 mostro Union (def.isUnion) dal proprio Cimitero e lo
    // aggancia direttamente a un mostro idoneo che si controlla (secondo
    // il unionTargetFilter di quel mostro Union — vedi id 513/515/831
    // qui sopra) — SEMPLIFICAZIONE: sceglie da sola il primo mostro
    // Union/bersaglio idoneo trovato invece di un'interfaccia di
    // selezione dedicata.
    // ================================================================
    CardEffects.register(853, {
        canActivate(ctx) {
            if (!ctx.stField(ctx.owner).some((s) => s === null)) return false;
            return ctx.graveyard(ctx.owner).some((c) => {
                const d = DuelEngine.getDefinition(c.id);
                return d && d.isUnion && typeof d.unionTargetFilter === 'function'
                    && ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && d.unionTargetFilter(s.card));
            });
        },
        activate(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            // Ogni Union ha il proprio unionTargetFilter, quindi un Union
            // entra in lista solo se ha gia' almeno un aggancio valido in
            // campo — altrimenti si sceglierebbe una carta che poi non si
            // puo' equipaggiare a nulla.
            const unioni = grave.filter((card) => {
                const d = DuelEngine.getDefinition(card.id);
                return d && d.isUnion && typeof d.unionTargetFilter === 'function'
                    && ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && d.unionTargetFilter(s.card));
            });
            if (unioni.length === 0) return;
            // chooseCardFromList e non searchGraveyardWithChoice: la carta
            // deve restare nel Cimitero finche' non si sa anche a CHI
            // agganciarla, altrimenti una seconda scelta annullata la
            // lascerebbe fuori da ogni zona.
            chooseCardFromList(ctx, unioni, {
                title: '⚙️ Avanti Tutta!',
                text: 'Scegli quale mostro Union recuperare dal Cimitero.'
            }, (unionCard) => {
                const d = DuelEngine.getDefinition(unionCard.id);
                if (!d || typeof d.unionTargetFilter !== 'function') return;
                const bersagli = collectFieldTargets(ctx, {
                    zone: 'monster', owner: 'self', filter: (c) => d.unionTargetFilter(c)
                });
                if (bersagli.length === 0) return;
                chooseFieldCardTarget(ctx, bersagli, {
                    title: `⚙️ ${unionCard.name}`,
                    text: 'Scegli a quale mostro agganciarlo.'
                }, (scelto) => {
                    const freeStSlot = ctx.stField(ctx.owner).findIndex((s) => s === null);
                    if (freeStSlot === -1) return;
                    const realIndex = grave.findIndex((c) => c.uid === unionCard.uid);
                    if (realIndex === -1) return;
                    const targetSlot = ctx.field(scelto.owner)[scelto.index];
                    if (!targetSlot || targetSlot.card.uid !== scelto.card.uid) return;
                    grave.splice(realIndex, 1);
                    unionCard.equippedToOwner = ctx.owner;
                    unionCard.equippedToIndex = scelto.index;
                    unionCard.equippedToUid = targetSlot.card.uid;
                    ctx.stField(ctx.owner)[freeStSlot] = { card: unionCard, isFaceDown: false, setOnTurn: gameState.turn };
                    ctx.log(`⚙️ Avanti Tutta! recupera ${unionCard.name} dal Cimitero e lo aggancia a ${targetSlot.card.name}!`);
                });
            });
        }
    });

    // ================================================================
    // SCOPERTE durante un controllo generale del database (richiesto
    // dall'utente dopo aver trovato Elfi Gemelli/Elfa Gemella doppie):
    // le seguenti carte avevano già i dati ma NESSUNA registrazione,
    // nonostante fossero incluse in mazzi già "completati" — stesso
    // genere di svista già trovata più volte in questa sessione per
    // Umi/Mura del Castello/Drago Toon Occhi Blu/ecc.
    // ================================================================

    // ------------------------------------------------------------------
    // 130 — Controllo Mentale / Mind Control (Magia Normale)
    // CORREZIONE di fedeltà: era stata implementata come "Brain Control"
    // (Magia diversa, reale: 800 LP, solo mostri scoperti, controllo
    // fino alla End Phase) — il nome italiano è letteralmente "Mind
    // Control", carta reale diversa: nessun costo in LP, bersaglia
    // QUALUNQUE mostro dell'avversario (anche coperto), controllo
    // PERMANENTE (ctx.takeControl(..., true), nuovo 4° parametro
    // "permanent" in duel-engine.js — non torna mai da solo a fine
    // turno), e il mostro preso non può attaccare né essere sacrificato
    // (gameState.cannotAttackUids già esistente + nuovo
    // gameState.cannotBeTributedUids per uid, consultato in actions.js
    // insieme al già esistente def.cannotBeTributed per definizione).
    // ------------------------------------------------------------------
    CardEffects.register(130, {
        declaredTargeting: { count: 1, cardType: 'monster' },
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s);
        },
        activate(ctx) {
            // Bersaglia QUALUNQUE mostro avversario, anche coperto: nel
            // picker una carta coperta si vede comunque (è una scelta
            // alla cieca, come al tavolo vero), ma quale prendere lo
            // decide il giocatore invece del primo slot occupato.
            const candidati = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot) candidati.push({ owner: ctx.opponent, index, card: slot.card });
            });
            chooseFieldMonsterTarget(ctx, candidati, {
                title: '🧠 Controllo Mentale',
                text: 'Scegli quale mostro avversario prendere sotto controllo.'
            }, (scelta) => attivaControlloMentale(ctx, scelta));
        }
    });

    /** Corpo di Controllo Mentale (id 130), a bersaglio già scelto. */
    function attivaControlloMentale(ctx, scelta) {
        const decl = ctx.declareTarget(scelta.owner, scelta.index, { totalTargetCount: 1 });
        if (!decl.allowed) return;
        const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
        if (!targetSlot) return;
        const stolen = targetSlot.card;
        const stolenName = targetSlot.isFaceDown ? 'una carta coperta' : stolen.name;
        if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex, true)) {
            gameState.cannotAttackUidsPermanent = gameState.cannotAttackUidsPermanent || new Set();
            gameState.cannotAttackUidsPermanent.add(stolen.uid);
            gameState.cannotBeTributedUids = gameState.cannotBeTributedUids || new Set();
            gameState.cannotBeTributedUids.add(stolen.uid);
            ctx.log(`🧠 Controllo Mentale prende il controllo permanente di ${stolenName}!`);
        }
    }

    // ------------------------------------------------------------------
    // 136 — Richiamo degli Infestati / Call of the Haunted (Trappola
    // Continua)
    // Scegli come bersaglio 1 mostro nel Cimitero; Special Summonalo.
    // Dipendenza reciproca (targetOwner/targetIndex/targetUid, stesso
    // schema di Incantesimo Ombra id 439/Scavo Fossile id 823): se questa
    // carta lascia il Terreno, distruggi il mostro; se il mostro viene
    // distrutto, distruggi questa carta.
    // ------------------------------------------------------------------
    CardEffects.register(136, {
        continuous: true,
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster') && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return;
            searchGraveyardWithChoice(ctx, ctx.owner, (c) => c.type === 'monster', {
                title: '⚰️ Richiamo degli Infestati',
                text: 'Scegli quale mostro Special Summonare dal Cimitero.'
            }, (revived) => {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(revived); return; }
                ctx.specialSummon(ctx.owner, revived, slotIndex, 'attack', 'graveyard');
                ctx.card.targetOwner = ctx.owner;
                ctx.card.targetIndex = slotIndex;
                ctx.card.targetUid = revived.uid;
                ctx.log(`⚰️ Richiamo degli Infestati Special Summona ${revived.name} dal Cimitero!`);
            });
        },
        static(ctx) {
            if (ctx.card.targetOwner == null) return;
            const targetSlot = ctx.field(ctx.card.targetOwner)[ctx.card.targetIndex];
            const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === ctx.card.targetUid;
            if (validTarget) return;
            ctx.stField(ctx.owner)[ctx.index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
        }
    });

    // ------------------------------------------------------------------
    // 232 — Scatola delle Fate / Fairy Box (Trappola Continua)
    // Quando un mostro dell'avversario dichiara un attacco: lancia una
    // moneta; se esce Testa, l'ATK del mostro attaccante diventa 0 fino a
    // fine turno (SEMPLIFICAZIONE: "fino a fine turno" invece di "fino a
    // fine Battle Phase" — ctx.grantTemporaryAtkDefBonus, come ogni altro
    // bonus/malus temporaneo in questo file, scade solo alla End Phase).
    // Durante ciascuna propria Standby Phase: paga 500 Life Points (SEMPLIFICAZIONE:
    // paga sempre, invece di offrire la scelta "paga o distruggi questa
    // carta" — nessuna interfaccia di scelta costo esiste ancora per le
    // Trappole Continue, stesso schema automatico di Maschera del
    // Maledetto id 372). Il "risultato scelto" della moneta non ha una
    // vera scelta dell'utente dietro (nessuna UI per farla): il lancio
    // stesso rappresenta l'esito 50/50, stesso schema di Azzardo (id 255).
    // ------------------------------------------------------------------
    CardEffects.register(232, {
        continuous: true,
        activate(ctx) {
            ctx.log('🧚 Scatola delle Fate attivata: pronta a reagire al prossimo attacco avversario!');
        },
        onAttackDeclare(ctx) {
            const attackerSlot = ctx.field(ctx.attackerOwner)[ctx.attackerIndex];
            if (!attackerSlot) return;
            const guessed = ctx.random() < 0.5;
            if (window.FX) FX.playCoinFlip(guessed);
            if (guessed) {
                ctx.grantTemporaryAtkDefBonus(attackerSlot.card, -DuelEngine.getEffectiveAtk(attackerSlot.card), 0, false);
                ctx.log(`🧚 Scatola delle Fate indovina il lancio! ATK di ${attackerSlot.card.name} azzerato fino a fine turno!`);
            } else {
                ctx.log('🧚 Scatola delle Fate: lancio sbagliato, nessun effetto.');
            }
        },
        onStandbyPhase(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            gameState[lpKey] -= 500;
            ctx.log(`🧚 Scatola delle Fate: ${ctx.owner === 'player' ? 'paghi' : 'il bot paga'} 500 Life Points per mantenerla in campo.`);
        }
    });

    // ------------------------------------------------------------------
    // 233 — Impatto Meteora Fatato / Fairy Meteor Crush (Equipaggiamento,
    // qualsiasi mostro)
    // Il mostro equipaggiato infligge danno da battaglia perforante
    // (gameState.piercingUidsFor, esteso apposta in duel-engine.js/
    // actions.js per questa carta).
    // ------------------------------------------------------------------
    CardEffects.register(233, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx, () => true) !== -1; },
        activate(ctx) { equipToChosenTarget(ctx); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            gameState.piercingUidsFor[ctx.owner].add(t.uid);
        }
    });

    // ------------------------------------------------------------------
    // 290 — Sorelle Lady Arpia / Harpie Lady Sisters
    // Non può essere Evocata Normalmente/Set — Special Summonabile solo
    // tramite Egoista Elegante (id 787, già implementato).
    // ------------------------------------------------------------------
    CardEffects.register(290, {
        cannotNormalSummon: true
    });

    // ------------------------------------------------------------------
    // 783 — Lady Arpia 2 / Harpie Lady 2: "il nome è sempre trattato come
    // 'Lady Arpia'" è già gestito ovunque serva tramite isHarpieLadySupport
    // (qui sopra — riconosce sia l'id 172 sia ogni nome che inizia per
    // "Lady Arpia", e "Lady Arpia 2" lo soddisfa per nome). La seconda
    // clausola, "Annulla gli effetti dei Mostri Flip che questa carta
    // distrugge in battaglia", è GIÀ soddisfatta per costruzione da una
    // regola generale del motore (vedi il commento su ON_FLIP/
    // revealsAsIfSurviving in resolveBattleDamage, actions.js, vicino a
    // "Lady Arpia 2"): un Mostro Flip distrutto nella stessa battaglia in
    // cui viene rivelato non attiva MAI il proprio effetto FLIP, per
    // qualunque attaccante — quindi nessuna registrazione dedicata serve
    // per 783 stessa (non ha bisogno di alcuna CardEffects.register).
    // ------------------------------------------------------------------

    // ------------------------------------------------------------------
    // 466 — L'Occhio della Verità / The Eye of Truth (Trappola Continua)
    // Una volta per turno, durante la Standby Phase del tuo avversario,
    // se ha una Magia in mano: guadagni 1000 Life Points
    // (onOpponentStandbyPhase, duel-engine.js/firePhaseTrigger — nuovo
    // aggancio generico, reazione dal lato OPPOSTO a chi vive la fase).
    // SEMPLIFICAZIONE: manca "l'avversario deve tenere la mano rivelata"
    // — nessun impatto pratico, il motore conosce già entrambe le mani.
    // ------------------------------------------------------------------
    CardEffects.register(466, {
        continuous: true,
        activate(ctx) {
            ctx.log("👁️ L'Occhio della Verità attivato! Il tuo avversario deve tenere la mano rivelata.");
        },
        onOpponentStandbyPhase(ctx) {
            const hasSpell = ctx.hand(ctx.standbyOwner).some((c) => c.type === 'spell');
            if (!hasSpell) return;
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            gameState[lpKey] += 1000;
            ctx.log("👁️ L'Occhio della Verità: l'avversario ha una Magia in mano, guadagni 1000 Life Points!");
        }
    });

    // ------------------------------------------------------------------
    // 493 — Behemoth a Due Teste / Twin-Headed Behemoth
    // Se distrutta e mandata al Cimitero: puoi Special Summonarla, con
    // ATK/DEF dimezzati. Una sola volta per Duello (ctx.card._twinHeadedUsed
    // persiste sulla carta stessa).
    // SEMPLIFICAZIONE: risorge SUBITO alla propria distruzione (onDestroy),
    // invece che specificamente alla End Phase dello stesso turno — questo
    // motore chiama onEndPhase solo per carte ANCORA sul Terreno/ST, mai
    // per carte già nel Cimitero, quindi il vero tempismo "End Phase" non
    // è raggiungibile per una carta che si è appena distrutta.
    // ------------------------------------------------------------------
    CardEffects.register(493, {
        onDestroy(ctx) {
            if (ctx.card._twinHeadedUsed) return;
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [revived] = grave.splice(index, 1);
            revived.attack = Math.floor((revived.attack || 0) / 2);
            revived.defense = Math.floor((revived.defense || 0) / 2);
            revived._twinHeadedUsed = true;
            ctx.specialSummon(ctx.owner, revived, slotIndex, 'attack', 'graveyard');
            ctx.log('🐉 Behemoth a Due Teste risorge con ATK/DEF dimezzati!');
        }
    });

    // ================================================================
    // ALTRE SCOPERTE dallo stesso controllo generale (continua): carte
    // con dati reali ma senza registrazione né nota, non incluse in
    // alcun mazzo Starter/Structure ma comunque presenti nel pool
    // libero del Duello Demo.
    // ================================================================

    // ------------------------------------------------------------------
    // 89 — Amazzone Incantatrice / Amazon Archer... (Magia Normale)
    // Scambia l'ATK originale tra 1 propria Amazzone e 1 mostro scoperto
    // dell'avversario, fino a fine turno.
    // SEMPLIFICAZIONE: sceglie da sola i due bersagli (la prima Amazzone
    // e il primo mostro avversario trovati).
    // ------------------------------------------------------------------
    CardEffects.register(89, {
        canActivate(ctx) {
            const hasAmazon = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name && s.card.name.includes('Amazzone'));
            if (!hasAmazon) return false;
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            // Due bersagli, in sequenza: prima QUALE Amazzone, poi con
            // quale mostro avversario scambiarne l'ATK. Con più Amazzoni
            // in campo la prima scelta cambia completamente il risultato.
            const mieAmazzoni = [];
            ctx.field(ctx.owner).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.name && slot.card.name.includes('Amazzone')) {
                    mieAmazzoni.push({ owner: ctx.owner, index, card: slot.card });
                }
            });
            const suoi = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown) suoi.push({ owner: ctx.opponent, index, card: slot.card });
            });
            if (mieAmazzoni.length === 0 || suoi.length === 0) return;
            chooseFieldMonsterTarget(ctx, mieAmazzoni, {
                title: '⚔️ Amazzone Incantatrice',
                text: 'Scegli quale tua Amazzone deve scambiare l\'ATK.'
            }, (miaScelta) => {
                chooseFieldMonsterTarget(ctx, suoi, {
                    title: '⚔️ Amazzone Incantatrice',
                    text: 'Scegli con quale mostro avversario scambiare l\'ATK.'
                }, (suaScelta) => {
                    const own = ctx.field(ctx.owner)[miaScelta.index];
                    if (!own) return;
                    const decl = ctx.declareTarget(suaScelta.owner, suaScelta.index, { totalTargetCount: 1 });
                    if (!decl.allowed) return;
                    const opp = ctx.field(decl.targetOwner)[decl.targetIndex];
                    if (!opp) return;
                    const ownAtk = own.card.attack, oppAtk = opp.card.attack;
                    ctx.grantTemporaryAtkDefBonus(own.card, oppAtk - ownAtk, 0, false);
                    ctx.grantTemporaryAtkDefBonus(opp.card, ownAtk - oppAtk, 0, false);
                    ctx.log(`⚔️ Amazzone Incantatrice scambia l'ATK di ${own.card.name} e ${opp.card.name}!`);
                });
            });
        }
    });

    // ------------------------------------------------------------------
    // 94 — Lampada Antica / Ancient Lamp (Ignition)
    // Durante la propria Main Phase: Special Summon "La Jinn il Genio
    // Mistico della Lampada" (id 335) dalla mano.
    // ------------------------------------------------------------------
    // CORREZIONE di fedeltà: aggiunta la clausola mancante "se attaccata
    // mentre coperta, puoi ridirigere l'attacco verso un altro mostro
    // che l'avversario controlla" — onAttackDeclare come risposta del
    // bersaglio stesso (stesso schema di Suijin/Kazejin), ctx.redirectAttack
    // con newOwner esplicito (il campo di chi sta ATTACCANDO, "fuoco
    // amico" come Ragno della Roulette/id 425 risultato 4).
    CardEffects.register(94, {
        canActivate(ctx) {
            // ctx.attackerIndex esiste SOLO nel contesto reattivo di
            // onAttackDeclare (questa carta bersagliata da un attacco) —
            // a differenza del contesto del proprio effetto Ignition
            // (Special Summon La Jinn), che pure vede ctx.zone === 'monster'
            // ma senza questo campo: serve un discriminante diverso da
            // zone qui, dato che entrambi i casi condividono la stessa zona.
            if (typeof ctx.attackerIndex === 'number') {
                const slot = ctx.field(ctx.owner)[ctx.index];
                if (!slot || !slot.isFaceDown) return false;
                return ctx.field(ctx.opponent).some((s, i) => s && i !== ctx.attackerIndex);
            }
            if (gameState.phase !== 'main1' && gameState.phase !== 'main2') return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            return ctx.hand(ctx.owner).some((c) => c.id === 335) && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        onAttackDeclare(ctx) {
            const candidates = [];
            ctx.field(ctx.opponent).forEach((s, i) => { if (s && i !== ctx.attackerIndex) candidates.push(i); });
            if (candidates.length === 0) return;
            ctx.redirectAttack(candidates[0], ctx.opponent);
            ctx.log('🪔 Lampada Antica ridirige l\'attacco verso un altro mostro dell\'avversario!');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.id === 335);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = hand.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'hand');
            ctx.log('🪔 Lampada Antica Special Summona La Jinn dalla mano!');
        }
    });

    // ------------------------------------------------------------------
    // 146 — Catena di Distruzione / Chain Destruction (Trappola Normale)
    // Quando viene Evocato un mostro con 2000 o meno ATK: distruggi tutte
    // le carte con lo stesso nome nella mano e nel Deck del suo
    // proprietario. Riusa onOpponentSummon (stesso schema di Buco
    // Trappola id 40) — vedi missingEffectNote su id 146 in cards.json:
    // risponde solo a un'Evocazione dell'AVVERSARIO, non anche a una
    // propria Evocazione come richiede il testo reale.
    // ------------------------------------------------------------------
    CardEffects.register(146, {
        canActivate(ctx) {
            return (ctx.summonedCard?.attack || 0) <= 2000;
        },
        onOpponentSummon(ctx) {
            const name = ctx.summonedCard.name;
            let count = 0;
            const hand = ctx.hand(ctx.opponent);
            for (let i = hand.length - 1; i >= 0; i--) {
                if (hand[i].name === name) { ctx.discardChosenFromHand(ctx.opponent, i); count++; }
            }
            const deckKey = ctx.opponent === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (Array.isArray(deck)) {
                for (let i = deck.length - 1; i >= 0; i--) {
                    if (deck[i].name === name) { ctx.millCardFromDeck(ctx.opponent, i); count++; }
                }
            }
            ctx.log(`⛓️ Catena di Distruzione manda ${count} copie di ${name} al Cimitero!`);
        }
    });

    // ------------------------------------------------------------------
    // 152 — Prescelto / The Selected (Magia Normale)
    // Scegli 1 Mostro e 2 carte non-Mostro dalla mano; l'avversario ne
    // sceglie 1 a caso. Se Mostro: Special Summonalo e manda le altre 2
    // al Cimitero. Altrimenti: manda tutte e 3 al Cimitero.
    // SEMPLIFICAZIONE: la "scelta a caso dell'avversario" è simulata
    // scegliendo davvero a caso tra le 3 carte.
    // ------------------------------------------------------------------
    CardEffects.register(152, {
        canActivate(ctx) {
            const hand = ctx.hand(ctx.owner);
            return hand.some((c) => c.type === 'monster') && hand.filter((c) => c.type !== 'monster').length >= 2;
        },
        activate(ctx) {
            // Tre scelte in sequenza dalla propria mano: 1 Mostro e 2
            // non-Mostro. Sono quelle che contano davvero — il Mostro
            // scelto e' l'unico che si puo' finire per Special Summonare, e
            // le altre due le si perde comunque, quindi prima si sceglieva
            // per il giocatore proprio la parte piu' delicata della carta.
            const scelte = [];
            const raccogli = () => {
                if (scelte.length === 3) return risolvi();
                const cercaMostro = scelte.length === 0;
                chooseCardFromHand(ctx, {
                    filter: (c) => (cercaMostro ? c.type === 'monster' : c.type !== 'monster')
                        && !scelte.some((s) => s.uid === c.uid),
                    title: cercaMostro ? '🎲 Prescelto — il Mostro' : `🎲 Prescelto — carta non-Mostro ${scelte.length}/2`,
                    text: cercaMostro
                        ? 'Scegli il Mostro da mettere in gioco: se l\'avversario pesca lui, viene Special Summonato.'
                        : 'Scegli una carta non-Mostro da mettere in gioco.'
                }, (card) => {
                    scelte.push(card);
                    raccogli();
                });
            };
            const risolvi = () => {
                const hand = ctx.hand(ctx.owner);
                // Gli indici si ricalcolano ORA, dopo l'ultima scelta: fra
                // un picker e l'altro la mano puo' essersi mossa, e un
                // indice preso all'inizio punterebbe a un'altra carta.
                scelte.map((c) => hand.indexOf(c)).filter((i) => i !== -1)
                    .sort((a, b) => b - a).forEach((i) => hand.splice(i, 1));
                completaPrescelto(ctx, scelte);
            };
            raccogli();
        }
    });

    // Corpo di Prescelto (id 152) una volta che le 3 carte sono state
    // scelte e tolte dalla mano: e' l'AVVERSARIO a pescarne una a caso fra
    // quelle (ctx.randomPick, sorteggio condiviso in Multiplayer).
    function completaPrescelto(ctx, chosen) {
        if (chosen.length < 3) return;
        const pick = ctx.randomPick(chosen);
        if (pick.type === 'monster') {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            chosen.forEach((c) => { if (c !== pick) ctx.graveyard(ctx.owner).push(c); });
            // Dalla MANO: le tre carte sono state tolte dalla mano poco
            // prima (vedi risolvi), e il Cimitero qui sopra riceve le due
            // NON pescate.
            if (slotIndex !== -1) ctx.specialSummon(ctx.owner, pick, slotIndex, 'attack', 'hand');
            else ctx.graveyard(ctx.owner).push(pick);
            ctx.log(`🎲 Prescelto: l'avversario sceglie il Mostro! ${pick.name} viene Special Summonato.`);
        } else {
            chosen.forEach((c) => ctx.graveyard(ctx.owner).push(c));
            ctx.log("🎲 Prescelto: l'avversario sceglie male, tutte e 3 le carte finiscono al Cimitero.");
        }
    }

    // ------------------------------------------------------------------
    // 196 — Des Volstgalph
    // Se distrugge un mostro dell'avversario in battaglia (damageOnBattleDestroy):
    // 500 danni. Ogni volta che una Magia Normale o Rapida si risolve:
    // +200 ATK fino a fine turno (riusa onCardActivated).
    // ------------------------------------------------------------------
    CardEffects.register(196, {
        damageOnBattleDestroy: 500,
        canActivateOnCardActivated(ctx) {
            return ctx.activatedCard.type === 'spell' && ['normal', 'quick-play'].includes(ctx.activatedCard.subtype);
        },
        onCardActivated(ctx) {
            if (ctx.card._volstgalphTurn !== gameState.turn) {
                ctx.card._volstgalphTurn = gameState.turn;
                ctx.card._volstgalphBonus = 0;
            }
            ctx.card._volstgalphBonus += 200;
            ctx.grantTemporaryAtkDefBonus(ctx.card, ctx.card._volstgalphBonus, 0, false);
            ctx.log('🐴 Des Volstgalph guadagna 200 ATK fino a fine turno!');
        }
    });

    // ------------------------------------------------------------------
    // 198 — Drago della Dimensione Diversa / Different Dimension Dragon
    // Non può essere distrutta in battaglia da un mostro con 1900 o meno
    // ATK (riusa cardIsIndestructibleByBattle, come Guardiano Celtico
    // Sgradito id 712, ma con la condizione invertita). Vedi
    // missingEffectNote su id 198 in cards.json: manca l'immunità dalla
    // distruzione via effetti Magia/Trappola NON mirati.
    // ------------------------------------------------------------------
    CardEffects.register(198, {
        cannotBeDestroyedByBattle: (opponentAtk) => (opponentAtk || 0) <= 1900
    });

    // ------------------------------------------------------------------
    // 197 — Prigione dei Dadi / Dice Jar (Magia Terreno)
    // Quando si attiva: puoi aggiungere 1 Dado Dimensionale (id 200) dal
    // Deck alla mano. All'inizio di OGNI Battle Phase (di chiunque —
    // nuovo hook 'onBattlePhaseStart', firePhaseTrigger, chiamato da
    // enterBattlePhase per entrambi i lati, game-flow.js — ed esteso
    // anche alla zona Magia Terreno, mai scansionata lì prima): ciascun
    // giocatore lancia un dado e applica il risultato a tutti i propri
    // mostri scoperti, fino a fine turno — 1: -1000 ATK, 2: +1000 ATK,
    // 3: -500 ATK, 4: +500 ATK, 5: ATK dimezzata, 6: ATK raddoppiata.
    // "Dimezzata/raddoppiata" NON richiede un nuovo moltiplicatore: il
    // delta necessario per farlo si calcola UNA VOLTA sull'ATK effettivo
    // attuale e si applica come normale bonus temporaneo
    // (grantTemporaryAtkDefBonus, già esistente) — identico risultato,
    // nessuna nuova infrastruttura di moltiplicazione.
    // ================================================================
    CardEffects.register(197, {
        activate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.id === 200);
            if (index === -1) return;
            const [card] = deck.splice(index, 1);
            gameState[countKey] = deck.length;
            ctx.hand(ctx.owner).push(card);
            ctx.log('🎲 Prigione dei Dadi aggiunge Dado Dimensionale dal Deck alla mano!');
        },
        onBattlePhaseStart(ctx) {
            ['player', 'bot'].forEach((owner) => {
                const roll = 1 + Math.floor(ctx.random() * 6);
                if (window.FX) FX.playDiceRoll(roll);
                ctx.log(`🎲 Prigione dei Dadi: ${owner === 'player' ? 'tu tiri' : 'il bot tira'} un ${roll}!`);
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const currentAtk = DuelEngine.getEffectiveAtk(slot.card);
                    let delta = 0;
                    if (roll === 1) delta = -1000;
                    else if (roll === 2) delta = 1000;
                    else if (roll === 3) delta = -500;
                    else if (roll === 4) delta = 500;
                    else if (roll === 5) delta = -Math.floor(currentAtk / 2);
                    else if (roll === 6) delta = currentAtk;
                    if (delta !== 0) ctx.grantTemporaryAtkDefBonus(slot.card, delta, 0, false);
                });
            });
        }
    });

    // findLevel7SpellcasterTarget vive ora fra gli helper condivisi, in cima a
    // js/engine/card-effects.js: serve a gruppi di carte lontani fra loro,
    // quindi non può stare dentro un singolo file-parte.


    // grantAttackAllEnemiesOncEach vive ora fra gli helper condivisi, in cima a
    // js/engine/card-effects.js: serve a gruppi di carte lontani fra loro,
    // quindi non può stare dentro un singolo file-parte.


    // ------------------------------------------------------------------
    // 199 — Movimento d'Onda Diffuso / Wave-Motion Cannon... in realtà
    // testo di "Diffusion Wave-Motion": se l'avversario controlla un
    // mostro, paga 1000 LP e scegli 1 tuo Incantatore di Livello 7+: DEVE
    // attaccare tutti i mostri avversari una volta ciascuno in questo
    // turno; gli altri tuoi mostri non possono attaccare. Vedi
    // grantAttackAllEnemiesOncEach qui sopra: concede sia gli attacchi
    // extra necessari sia l'obbligo vero e proprio
    // (gameState.mustAttackTargetUidsFor, verificato da
    // handlePhaseStepperClick in game-flow.js prima di lasciar uscire
    // dalla Battle Phase).
    // ------------------------------------------------------------------
    CardEffects.register(199, {
        canActivate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            if (gameState[lpKey] < 1000) return false;
            if (!ctx.field(ctx.opponent).some((s) => s)) return false;
            return findLevel7SpellcasterTarget(ctx) !== -1;
        },
        activate(ctx) {
            const lpKey = ctx.owner === 'player' ? 'playerLP' : 'botLP';
            const targetIndex = findLevel7SpellcasterTarget(ctx);
            if (targetIndex === -1) return;
            gameState[lpKey] -= 1000;
            grantAttackAllEnemiesOncEach(ctx, targetIndex);
            ctx.log(`🌊 Movimento d'Onda Diffuso: ${ctx.field(ctx.owner)[targetIndex].card.name} deve attaccare tutti i mostri avversari!`);
        }
    });

    // ------------------------------------------------------------------
    // 220 — Scuotiterra / Earthquake... (Trappola Normale)
    // Scegli 2 Attributi; l'avversario ne sceglie 1: distruggi tutti i
    // mostri scoperti con quell'Attributo.
    // SEMPLIFICAZIONE: la scelta dell'avversario è simulata a caso tra i
    // 2 Attributi con più mostri scoperti sul Terreno.
    // ------------------------------------------------------------------
    CardEffects.register(220, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown));
        },
        activate(ctx) {
            const attrCounts = {};
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((s) => { if (s && !s.isFaceDown) attrCounts[s.card.attribute] = (attrCounts[s.card.attribute] || 0) + 1; });
            });
            const attrs = Object.keys(attrCounts).sort((a, b) => attrCounts[b] - attrCounts[a]).slice(0, 2);
            if (attrs.length === 0) return;
            const chosen = ctx.randomPick(attrs);
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown && slot.card.attribute === chosen) { ctx.destroyMonster(owner, index); count++; }
                });
            });
            ctx.log(`🌍 Scuotiterra: l'avversario sceglie ${chosen}, distrutti ${count} mostri!`);
        }
    });

    // ------------------------------------------------------------------
    // 253 — Giuramento della Balena Fortezza / Fortress Whale's Oath
    // (Magia Rituale)
    // Sacrifica dal Terreno E/O dalla mano (CORREZIONE di fedeltà —
    // prima solo dal Terreno) mostri per un Livello totale di almeno 7
    // per Special Summon Balena Fortezza (id 252) dalla mano. Stesso
    // schema di Rito del Guerriero Nero (id 56).
    // ------------------------------------------------------------------
    CardEffects.register(253, {
        canActivate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 252);
            if (handIndex === -1) return false;
            return maxRitualTributeLevel(ctx, handIndex) >= 7;
        },
        activate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 252);
            if (handIndex === -1) return;
            performRitualTribute(ctx, 7, handIndex);
            const hand = ctx.hand(ctx.owner);
            const finalHandIndex = hand.findIndex((c) => c.id === 252);
            if (finalHandIndex === -1) return;
            const [ritualCard] = hand.splice(finalHandIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(ritualCard); return; }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack', 'graveyard');
            ctx.log('🐋 Giuramento della Balena Fortezza evoca Balena Fortezza!');
        }
    });

    // ------------------------------------------------------------------
    // 252 — Balena Fortezza / Fortress Whale: Evocabile Rituale solo
    // tramite "Giuramento della Balena Fortezza" (id 253, qui sopra —
    // GIÀ IMPLEMENTATA). Qui serve solo il divieto di Evocazione
    // Normale/Set e di Special Summon per ogni altra via
    // (cannotNormalSummon/cannotBeSpecialSummoned — stesso schema di 413).
    // ------------------------------------------------------------------
    CardEffects.register(252, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ------------------------------------------------------------------
    // 289 — Lady Arpia Formazione della Fenice / Harpie's Phoenix
    // Formation (Magia Normale)
    // Se controlli 3+ "Lady Arpia"/"Sorelle Lady Arpia": distruggi
    // altrettanti mostri dell'avversario, poi infliggi danno pari
    // all'ATK originale più alto tra quelli distrutti.
    // ------------------------------------------------------------------
    CardEffects.register(289, {
        canActivate(ctx) {
            const harpieCount = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && (isHarpieLadySupport(s.card) || s.card.name === 'Sorelle Lady Arpia')).length;
            if (harpieCount < 3) return false;
            return ctx.field(ctx.opponent).some((s) => s);
        },
        activate(ctx) {
            const harpieCount = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown && (isHarpieLadySupport(s.card) || s.card.name === 'Sorelle Lady Arpia')).length;
            const field = ctx.field(ctx.opponent);
            let destroyed = 0, maxAtk = 0;
            for (let i = 0; i < field.length && destroyed < harpieCount; i++) {
                if (!field[i]) continue;
                maxAtk = Math.max(maxAtk, field[i].card.attack || 0);
                ctx.destroyMonster(ctx.opponent, i);
                destroyed++;
            }
            if (maxAtk > 0) ctx.dealDamage(ctx.opponent, maxAtk);
            ctx.log(`🦅 Lady Arpia Formazione della Fenice distrugge ${destroyed} mostri e infligge ${maxAtk} danni!`);
        }
    });

    // ------------------------------------------------------------------
    // 307 — Carte Infinite / Infinite Cards (Magia Continua)
    // Nessun limite al numero di carte in mano — controllato direttamente
    // in enterEndPhase() (game-flow.js), non tramite un handler qui.
    // ------------------------------------------------------------------
    CardEffects.register(307, {
        continuous: true,
        activate(ctx) {
            ctx.log('🎴 Carte Infinite attivata: nessun limite alla mano!');
        }
    });

    // ------------------------------------------------------------------
    // 308 — Congedo Infinito / Eternal Draught... (Trappola Continua)
    // I mostri di Livello 3 o inferiore vengono distrutti alla End Phase
    // del turno in cui sono stati Evocati Normalmente o tramite Flip
    // Summon (riusa slot.summonedOnTurn, già tracciato dal motore).
    // ------------------------------------------------------------------
    CardEffects.register(308, {
        continuous: true,
        activate(ctx) {
            ctx.log('🚪 Congedo Infinito attivato!');
        },
        onEndPhase(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (!slot || slot.isFaceDown) return;
                    if ((slot.card.level || 0) > 3) return;
                    if (slot.summonedOnTurn !== gameState.turn) return;
                    ctx.destroyMonster(owner, index);
                    count++;
                });
            });
            if (count > 0) ctx.log(`🚪 Congedo Infinito distrugge ${count} mostr${count === 1 ? 'o' : 'i'} appena Evocat${count === 1 ? 'o' : 'i'}!`);
        }
    });

    // ------------------------------------------------------------------
    // 351 — Piccola Guardia Alata / Little Winguard (Ignition)
    // Una volta per turno, durante la propria End Phase: cambia la
    // propria Posizione di Battaglia. Riusa selfFlipToFaceDownDefense in
    // parte — qui però cambia liberamente Attacco<->Difesa, non solo
    // verso coperto.
    // ------------------------------------------------------------------
    CardEffects.register(351, {
        canActivate(ctx) {
            return gameState.phase === 'end';
        },
        activate(ctx) {
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.position = slot.position === 'attack' ? 'defense' : 'attack';
            if (slot.position === 'attack') slot.isFaceDown = false;
            ctx.log(`🛡️ Piccola Guardia Alata cambia in Posizione di ${slot.position === 'attack' ? 'Attacco' : 'Difesa'}!`);
        }
    });

    // ------------------------------------------------------------------
    // 356 — Ninna Nanna dell'Obbedienza / Lullaby of Obedience (Magia
    // Normale)
    // Paga 2000 LP e dichiara 1 Mostro; l'avversario guarda il proprio
    // Deck, rivela 1 copia se presente, e sceglie: aggiungila alla mano
    // di chi ha attivato, oppure Special Summonala sul suo Terreno.
    // SEMPLIFICAZIONE: la "dichiarazione del nome" è simulata scegliendo
    // a caso un mostro davvero presente nel Deck dell'avversario (invece
    // di dichiarare a priori un nome che potrebbe non esserci); la
    // "scelta dell'avversario" tra i 2 effetti è simulata a caso.
    // ------------------------------------------------------------------
    CardEffects.register(356, {
        canActivate(ctx) {
            const ownLP = ctx.owner === 'player' ? gameState.playerLP : gameState.botLP;
            if (ownLP <= 2000) return false;
            const deckKey = ctx.opponent === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            return Array.isArray(deck) && deck.some((c) => c.type === 'monster');
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 2000);
            searchDeckWithChoice(ctx, (c) => c.type === 'monster', { deckOwner: ctx.opponent, title: '🎵 Ninna Nanna dell\'Obbedienza', text: 'Scegli quale mostro rivelare dal Deck avversario.' }, (revealed) => {
                if (ctx.random() < 0.5) {
                    ctx.hand(ctx.owner).push(revealed);
                    ctx.log(`🎵 Ninna Nanna dell'Obbedienza: ${revealed.name} viene aggiunto alla mano!`);
                } else {
                    const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                    if (slotIndex === -1) { ctx.hand(ctx.owner).push(revealed); return; }
                    ctx.specialSummon(ctx.owner, revealed, slotIndex, 'attack', 'deck');
                    ctx.log(`🎵 Ninna Nanna dell'Obbedienza Special Summona ${revealed.name}!`);
                }
            });
        }
    });

    // ------------------------------------------------------------------
    // 379 — Meteorain (Trappola Normale)
    // In questo turno, i propri mostri infliggono danno da battaglia
    // perforante (riusa gameState.piercingUidsFor, esteso per id 233).
    // ------------------------------------------------------------------
    CardEffects.register(379, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            let count = 0;
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot && !slot.isFaceDown) { ctx.card._meteorainUids = ctx.card._meteorainUids || []; ctx.card._meteorainUids.push(slot.card.uid); count++; }
            });
            ctx.card._meteorainTurn = gameState.turn;
            ctx.log(`🌠 Meteorain concede danno perforante a ${count} propri mostri per questo turno!`);
        },
        static(ctx) {
            if (ctx.card._meteorainTurn !== gameState.turn) return;
            (ctx.card._meteorainUids || []).forEach((uid) => gameState.piercingUidsFor[ctx.owner].add(uid));
        }
    });

    // ------------------------------------------------------------------
    // 403 — Cavalletta d'Emergenza / Emergency Grasshopper... (onDestroy)
    // Quando mandata al Cimitero: Special Summon 1 mostro Tipo Insetto
    // dalla mano.
    // ------------------------------------------------------------------
    CardEffects.register(403, {
        onDestroy(ctx) {
            const hand = ctx.hand(ctx.owner);
            const index = hand.findIndex((c) => c.type === 'monster' && c.race === 'Insetto');
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = hand.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'hand');
            ctx.log(`🦗 Cavalletta d'Emergenza Special Summona ${card.name} dalla mano!`);
        }
    });

    // ------------------------------------------------------------------
    // 418 — Ritorno dei Dannati / Return of the Doomed... (Magia Normale)
    // Scarta 1 Mostro. Alla fine di questo turno, riporta in mano 1
    // proprio mostro distrutto in battaglia in questo turno.
    // ------------------------------------------------------------------
    CardEffects.register(418, {
        canActivate(ctx) {
            return ctx.hand(ctx.owner).some((c) => c.type === 'monster');
        },
        activate(ctx) {
            offerHandDiscardChoice(ctx, {
                filter: (c) => c.type === 'monster',
                title: '⚰️ Ritorno dei Dannati',
                text: 'Scegli quale mostro scartare dalla mano.'
            }, (discarded) => {
                gameState._returnOfTheDoomedTurn = gameState._returnOfTheDoomedTurn || {};
                gameState._returnOfTheDoomedTurn[ctx.owner] = gameState.turn;
                ctx.log(`⚰️ Ritorno dei Dannati scarta ${discarded.name}!`);
            });
        },
        onEndPhase(ctx) {
            if (!gameState._returnOfTheDoomedTurn || gameState._returnOfTheDoomedTurn[ctx.owner] !== gameState.turn) return;
            const grave = ctx.graveyard(ctx.owner);
            if (grave.length === 0) return;
            const card = grave.pop();
            ctx.hand(ctx.owner).push(card);
            gameState._returnOfTheDoomedTurn[ctx.owner] = null;
            ctx.log(`⚰️ Ritorno dei Dannati riporta ${card.name} in mano!`);
        }
    });

    // ------------------------------------------------------------------
    // 419 — Anello della Distruzione / Ring of Destruction (Trappola
    // Normale)
    // Durante il turno dell'avversario: distruggi 1 mostro scoperto
    // dell'avversario con ATK<=LP dell'avversario; subisci danno pari al
    // suo ATK, poi infliggi altrettanto danno all'avversario.
    // ------------------------------------------------------------------
    CardEffects.register(419, {
        canActivate(ctx) {
            const oppLP = ctx.owner === 'player' ? gameState.botLP : gameState.playerLP;
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown && (s.card.attack || 0) <= oppLP);
        },
        activate(ctx) {
            // Il bersaglio non e' solo "quale mostro distruggo": il suo ATK
            // e' anche il danno che SUBISCO io per primo, quindi scegliere
            // da soli il piu' grosso poteva far perdere il duello a chi ha
            // attivato la carta.
            const oppLP = ctx.owner === 'player' ? gameState.botLP : gameState.playerLP;
            const candidates = collectFieldTargets(ctx, {
                zone: 'monster', owner: 'opponent',
                filter: (c) => (c.attack || 0) <= oppLP
            });
            if (candidates.length === 0) return;
            chooseFieldCardTarget(ctx, candidates, {
                title: '💍 Anello della Distruzione',
                text: 'Scegli il mostro da distruggere: il suo ATK e\' anche il danno che subisci tu, prima di rigirarlo all\'avversario.'
            }, (scelto) => {
                const decl = ctx.declareTarget(scelto.owner, scelto.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!targetSlot) return;
                const card = targetSlot.card;
                const damage = card.attack || 0;
                ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
                ctx.dealDamage(ctx.owner, damage);
                ctx.dealDamage(ctx.opponent, damage);
                ctx.log(`💍 Anello della Distruzione distrugge ${card.name} e infligge ${damage} danni ad entrambi!`);
            });
        }
    });

    // ------------------------------------------------------------------
    // 483 — Stregone Mascherato Toon / Toon Masked Sorcerer. A
    // differenza degli altri mostri Toon di questo file (484/486/606:
    // Special Summon esclusivo da "Mondo dei Toon"), il testo reale di
    // QUESTA carta non ha alcun vincolo di Evocazione — resta Evocabile
    // Normalmente come qualunque mostro, con solo clausole "in campo"
    // legate a Mondo dei Toon.
    // CORREZIONE di fedeltà: aggiunte le tre clausole mancanti (prima
    // c'era solo "pesca 1 carta se infligge danno da battaglia").
    // requiresToonWorld: true (opt-in generico, id 487 qui sopra: si
    // autodistrugge se Mondo dei Toon lascia il Terreno scoperto) e
    // cannotAttackTurnSummoned: true (stesso flag generico di
    // resolveAttack/actions.js usato da 123/484/486/606) sono gli stessi
    // due meccanismi già esistenti per l'intera famiglia Toon — nessuna
    // nuova infrastruttura. "Può attaccare direttamente finché controlli
    // Mondo dei Toon E l'avversario non controlla mostri Toon" è invece
    // CONDIZIONATO (a differenza di id 606, sempre concesso una volta
    // Special Summonata): ricalcolato ad ogni static() con entrambe le
    // condizioni, non solo la presenza di Mondo dei Toon.
    // ------------------------------------------------------------------
    CardEffects.register(483, {
        requiresToonWorld: true,
        cannotAttackTurnSummoned: true,
        static(ctx) {
            const hasToonWorld = ctx.stField(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 487);
            const opponentHasToon = ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown && slot.card.type === 'monster' && slot.card.name.includes('Toon'));
            if (hasToonWorld && !opponentHasToon) {
                gameState.directAttackAllowedFor = gameState.directAttackAllowedFor || {};
                gameState.directAttackAllowedFor[ctx.card.uid] = true;
            }
        },
        onDealsBattleDamage(ctx) {
            ctx.drawCards(ctx.owner, 1);
            ctx.log('🎭 Stregone Mascherato Toon pesca 1 carta!');
        }
    });

    // ------------------------------------------------------------------
    // 395 — Orgoth l'Implacabile
    // Effetto Ignition (una volta per turno, solo durante il proprio Main
    // Phase — l'una-volta-per-turno-per-uid è già garantita generically dal
    // motore per zone 'monster', vedi gameState.usedIgnitionThisTurn in
    // duel-engine.js/activateCard): lancia un dado a sei facce 3 volte,
    // questa carta guadagna ATK/DEF pari al totale x100 fino alla fine del
    // turno dell'avversario (gameState.atkDefBonus, revocato in changeTurn()
    // — vedi gameState.orgothActiveUidsFor in game-flow.js), poi in base a
    // quanti risultati coincidono applica l'effetto/gli effetti giusti:
    // ●1-2: indistruttibile (in battaglia e da effetto Carta) fino alla
    //   fine del turno dell'avversario — gameState.orgothIndestructibleUids,
    //   consultato da cardIsIndestructibleByBattle (actions.js) e da
    //   ACTIONS.destroyMonster (duel-engine.js).
    // ●3-4: pesca 2 carte (ctx.drawCards, immediato).
    // ●5-6: può attaccare direttamente questo turno (gameState.directAttackAllowedFor,
    //   già esistente, si azzera da solo ad ogni cambio turno — nessuna
    //   nuova durata da gestire per questa clausola).
    // Se tutti e 3 i lanci coincidono, si applicano tutte e tre le clausole
    // insieme, indipendentemente dal valore uscito (come da testo reale).
    // ------------------------------------------------------------------
    CardEffects.register(395, {
        hasDiceRollEffect: true,
        canActivate(ctx) {
            return (gameState.phase === 'main1' || gameState.phase === 'main2') && gameState.currentPlayer === ctx.owner;
        },
        activate(ctx) {
            const rollDie = () => 1 + Math.floor(ctx.random() * 6);
            const rolls = [rollDie(), rollDie(), rollDie()];
            rolls.forEach((r) => { if (window.FX) FX.playDiceRoll(r); });
            ctx.log(`🎲 Orgoth l'Implacabile lancia 3 dadi: ${rolls.join(', ')}!`);

            const total = rolls[0] + rolls[1] + rolls[2];
            const amount = total * 100;
            gameState.orgothAtkDefBonus = gameState.orgothAtkDefBonus || {};
            const existing = gameState.orgothAtkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.orgothAtkDefBonus[ctx.card.uid] = { atk: existing.atk + amount, def: existing.def + amount };
            gameState.orgothActiveUidsFor = gameState.orgothActiveUidsFor || { player: new Set(), bot: new Set() };
            gameState.orgothActiveUidsFor[ctx.owner].add(ctx.card.uid);
            ctx.log(`🎲 Orgoth l'Implacabile guadagna +${amount} ATK/DEF (totale ${total}) fino alla fine del turno dell'avversario!`);

            const counts = {};
            rolls.forEach((r) => { counts[r] = (counts[r] || 0) + 1; });
            const allSame = rolls[0] === rolls[1] && rolls[1] === rolls[2];
            const pairedValue = allSame ? null : Number(Object.keys(counts).find((k) => counts[k] >= 2));

            const grantIndestructible = () => {
                gameState.orgothIndestructibleUids = gameState.orgothIndestructibleUids || new Set();
                gameState.orgothIndestructibleUids.add(ctx.card.uid);
                ctx.log("🛡️ Orgoth l'Implacabile non può essere distrutta fino alla fine del turno dell'avversario!");
            };
            const grantDraw = () => {
                ctx.drawCards(ctx.owner, 2);
                ctx.log("🃏 Orgoth l'Implacabile fa pescare 2 carte!");
            };
            const grantDirectAttack = () => {
                gameState.directAttackAllowedFor = gameState.directAttackAllowedFor || {};
                gameState.directAttackAllowedFor[ctx.card.uid] = true;
                ctx.log("⚔️ Orgoth l'Implacabile può attaccare direttamente questo turno!");
            };

            if (allSame) {
                grantIndestructible();
                grantDraw();
                grantDirectAttack();
            } else if (pairedValue === 1 || pairedValue === 2) {
                grantIndestructible();
            } else if (pairedValue === 3 || pairedValue === 4) {
                grantDraw();
            } else if (pairedValue === 5 || pairedValue === 6) {
                grantDirectAttack();
            }
        }
    });

    // ------------------------------------------------------------------
    // 246 — Elefante Volante
    // Indistruttibilità condizionata (una volta per turno dell'avversario,
    // solo contro un suo effetto Carta) via def.preventsDestructionByOpponentEffectOncePerTurn,
    // controllata in ACTIONS.destroyMonster (duel-engine.js). Se la
    // prevenzione scatta nella End Phase dell'avversario, si arma la
    // vittoria automatica per un successivo attacco diretto andato a
    // segno (gameState.flyingElephantWinPendingUids -> onDealsBattleDamage
    // qui sotto -> gameState.flyingElephantWinnerOwner -> checkGameOver in
    // game-flow.js).
    // SEMPLIFICAZIONE: la condizione di vittoria armata non ha una
    // scadenza esplicita se il controllore non riesce ad attaccare
    // direttamente nel turno successivo (il testo reale la vorrebbe valida
    // solo per QUEL turno) — resta pendente indefinitamente finché non
    // viene consumata; nessuna carta di questo dataset sfrutta questo
    // margine.
    // ------------------------------------------------------------------
    CardEffects.register(246, {
        preventsDestructionByOpponentEffectOncePerTurn: true,
        onDealsBattleDamage(ctx) {
            if (ctx.targetIndex !== -1) return;
            if (gameState.flyingElephantWinPendingUids && gameState.flyingElephantWinPendingUids.has(ctx.card.uid)) {
                gameState.flyingElephantWinPendingUids.delete(ctx.card.uid);
                gameState.flyingElephantWinnerOwner = ctx.owner;
            }
        }
    });

    // ------------------------------------------------------------------
    // 353 — Signore dei D. (Lord of D.)
    // "Nessun giocatore può scegliere come bersaglio mostri Tipo Drago sul
    // Terreno con effetti di carta." Floodgate assoluto via
    // def.protectsRaceFromTargeting (consultato direttamente da
    // declareCardEffectTarget in duel-engine.js, PRIMA di offrire
    // qualunque risposta) — nessun activate()/canActivate necessario, è
    // una proprietà passiva della carta scoperta, come def.continuous per
    // le Magie/Trappole.
    // ------------------------------------------------------------------
    CardEffects.register(353, {
        protectsRaceFromTargeting: 'Drago'
    });

    // ------------------------------------------------------------------
    // 115 — Gran Scudo Gardna (Big Shield Gardna)
    // Clausola 1: "Se questa carta, l'unica coperta sul Terreno, viene
    // presa di mira da una Magia: gira scoperta in Posizione di Difesa e
    // nega quella Magia" — via def.onCardEffectTargetDeclare (nuovo
    // checkpoint sincrono in declareCardEffectTarget, duel-engine.js).
    // Clausola 2: "Se attaccata, a fine Damage Step passa in Posizione di
    // Attacco" — via onBattled(ctx), già esistente (si attiva quando
    // QUESTA carta sopravvive a una battaglia); nessun controllo esplicito
    // "ero il difensore" necessario, perché un mostro in Posizione di
    // Difesa non può MAI dichiarare un attacco (regola già applicata
    // altrove in questo motore), quindi se onBattled scatta mentre questa
    // carta è ancora in Difesa, per esclusione stava DIFENDENDO.
    // ------------------------------------------------------------------
    CardEffects.register(115, {
        canActivate(ctx) {
            if (ctx.zone !== 'monster') return false;
            if (ctx.sourceType !== 'spell') return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || !slot.isFaceDown) return false;
            const faceDownCount = ctx.field(ctx.owner).filter((s) => s && s.isFaceDown).length
                + ctx.stField(ctx.owner).filter((s) => s && s.isFaceDown).length;
            return faceDownCount === 1;
        },
        onCardEffectTargetDeclare(ctx) {
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (slot) {
                slot.isFaceDown = false;
                slot.position = 'defense';
            }
            ctx.cancel();
            ctx.log(`🛡️ ${ctx.card.name} si gira scoperta in Posizione di Difesa e nega la Magia!`);
        },
        onBattled(ctx) {
            const slot = ctx.field(ctx.owner).find((s) => s && s.card.uid === ctx.card.uid);
            if (slot && slot.position === 'defense') {
                slot.position = 'attack';
                ctx.log(`⚔️ ${ctx.card.name} passa in Posizione di Attacco dopo la battaglia!`);
            }
        }
    });

    // ------------------------------------------------------------------
    // 235 — Specchietto della Fata (Fairy Box / mirror-redirect)
    // "Quando il tuo avversario attiva una Magia che ha come bersaglio
    // esattamente 1 mostro sul Terreno (e nessun'altra carta): scegli un
    // altro bersaglio valido; quella Magia ora ha come bersaglio la nuova
    // carta." Trappola Set reattiva, via def.onCardEffectTargetDeclare
    // (candidati zona ST, declareCardEffectTarget in duel-engine.js).
    // SEMPLIFICAZIONE: nuovo bersaglio scelto automaticamente (priorità al
    // campo di chi ha attivato la Magia, per ridirigere un effetto
    // negativo contro sé stesso, come da uso tipico reale della carta) —
    // nessuna scelta UI, stesso schema di molti altri auto-pick in questo
    // file.
    // ------------------------------------------------------------------
    CardEffects.register(235, {
        canActivate(ctx) {
            if (ctx.zone !== 'st') return false;
            if (ctx.sourceType !== 'spell') return false;
            if (ctx.sourceOwner === ctx.owner) return false;
            return ctx.totalTargetCount === 1;
        },
        onCardEffectTargetDeclare(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot, index) => {
                    if (!slot || slot.isFaceDown) return;
                    if (owner === ctx.targetOwner && index === ctx.targetIndex) return;
                    candidates.push({ owner, index });
                });
            });
            if (candidates.length === 0) return;
            const preferred = candidates.find((c) => c.owner === ctx.sourceOwner) || candidates[0];
            ctx.redirect(preferred.owner, preferred.index);
            ctx.log(`🪞 ${ctx.card.name} ridirige il bersaglio della Magia!`);
        }
    });

    // ------------------------------------------------------------------
    // 738 — Mago Comando del Caos
    // "Annulla l'effetto di una Carta Mostro che ha come bersaglio questa
    // carta." Reazione automatica (carta scoperta sul Terreno), via
    // def.onCardEffectTargetDeclare — a differenza di 115/235 qui sopra,
    // reagisce a un effetto MOSTRO (ctx.sourceType === 'monster'), non a
    // una Magia.
    // ------------------------------------------------------------------
    CardEffects.register(738, {
        canActivate(ctx) {
            if (ctx.zone !== 'monster') return false;
            return ctx.sourceType === 'monster';
        },
        onCardEffectTargetDeclare(ctx) {
            ctx.cancel();
            ctx.log(`🚫 ${ctx.card.name} annulla l'effetto del mostro che la bersaglia!`);
        }
    });

    // ================================================================
    // 866-870 — Destiny Board + Spirit Message "I"/"N"/"A"/"L"
    // Testo ufficiale verificato su db.yugioh-card.com. Destiny Board:
    // "quando questa carta e tutte e 4 le Spirit Message con nomi
    // diversi sono piazzate sul tuo campo, vinci il Duello. Una volta
    // per turno, durante l'End Phase del tuo avversario: piazza 1
    // Spirit Message dalla mano o dal Deck sulla tua zona Magia/
    // Trappola, nell'ordine I-N-A-L. Quando una Spirit Message o
    // Destiny Board che controlli lascia il Terreno: manda tutte le
    // altre al Cimitero." — la vittoria vera e propria si controlla in
    // checkGameOver() (game-flow.js, hasDestinyBoardComplete), non qui:
    // stesso schema di Exodia il Proibito (EXODIA_PIECE_IDS), un
    // controllo "clean" fuori dalla catena di risoluzione di un singolo
    // effetto.
    //
    // Il piazzamento NON passa da activateCard/Chain (le Spirit Message
    // "possono essere piazzate solo dall'effetto di Destiny Board", mai
    // attivate/Set dal giocatore: infatti la loro registrazione qui
    // sotto non ha né canActivate né activate) — nuovo aggancio
    // onOpponentEndPhase(ctx) in firePhaseTrigger (duel-engine.js),
    // stesso identico schema di onOpponentStandbyPhase (già esistente,
    // usato da id 466/645) solo per la End Phase.
    //
    // Santuario Oscuro (id 192, prima clausola, ora implementata): "se
    // una Spirit Message verrebbe piazzata con Destiny Board, puoi
    // Special Summonarla come Mostro Normale (Demone/OSCURITÀ/Livello
    // 1/ATK 0/DEF 0) invece" — stessa carta fisica, MUTATA da Magia a
    // Mostro (card.type riassegnato) al momento della scelta: nessun
    // secondo oggetto/token, la registrazione qui sotto resta valida in
    // entrambe le forme (i suoi hook "lascia il campo" coprono sia
    // onSTDestroyed/onBanished/onReturnedToHandSelf — forma Magia — sia
    // onDestroy/onSacrificedForTribute — forma Mostro). SEMPLIFICAZIONE
    // dichiarata: implementato "non può essere scelta come bersaglio
    // per un attacco" (gameState.cannotBeAttackTargetUids, come
    // Guardiano Kay'est id 285) ma NON "non è influenzata dagli effetti
    // Carta eccetto Destiny Board" — quella è un'immunità condizionata
    // alla FORMA della carta (solo da Mostro, mai da Magia), mentre i
    // floodgate di immunità di questo motore (cannotBeTargetedByCardEffects
    // ecc.) sono flag FISSI per definizione, non condizionabili
    // dinamicamente su card.type senza toccare il checkpoint di
    // targeting condiviso (duel-engine.js) usato da altre 3 carte:
    // rischio di regressione non giustificato per un'interazione così
    // di nicchia (serve avere ENTRAMBE Destiny Board e Santuario Oscuro
    // scoperti insieme).
    // ================================================================
    const DESTINY_BOARD_PIECE_IDS = [866, 867, 868, 869, 870];
    const SPIRIT_MESSAGE_ORDER = [867, 868, 869, 870]; // I, N, A, L — ordine fisso del testo reale

    /**
     * "Quando una Spirit Message o Destiny Board che controlli lascia il
     * Terreno: manda al Cimitero tutte le Spirit Message e Destiny
     * Board che controlli." La carta che ha scatenato questo hook è già
     * stata rimossa dal proprio slot dal chiamante (onSTDestroyed/
     * onDestroy/onBanished/onReturnedToHandSelf/onSacrificedForTribute
     * girano sempre DOPO la rimozione, stesso ordine di ogni altro hook
     * "auto-effetto sulla carta stessa" in questo file) — qui basta
     * spazzare via quelle ancora rimaste, sia in zona Magia/Trappola
     * (Destiny Board, Spirit Message non ancora trasformate) sia in
     * zona Mostro (eventuali Spirit Message già Special Summonate da
     * Santuario Oscuro id 192).
     */
    function collapseDestinyBoardPieces(ctx) {
        const owner = ctx.owner;
        let swept = 0;
        ctx.stField(owner).forEach((slot, index) => {
            if (slot && DESTINY_BOARD_PIECE_IDS.includes(slot.card.id)) {
                ctx.graveyard(owner).push(slot.card);
                ctx.stField(owner)[index] = null;
                swept++;
            }
        });
        ctx.field(owner).forEach((slot, index) => {
            if (slot && DESTINY_BOARD_PIECE_IDS.includes(slot.card.id)) {
                ctx.graveyard(owner).push(slot.card);
                ctx.field(owner)[index] = null;
                swept++;
            }
        });
        if (swept > 0) ctx.log('💀 Destiny Board si disperde: le carte Spirit Message rimanenti vanno al Cimitero!');
    }

    CardEffects.register(866, {
        continuous: true,
        activate(ctx) {
            ctx.log('💀 Destiny Board si scopre sul Terreno...');
        },
        onOpponentEndPhase(ctx) {
            const owner = ctx.owner;
            if (ctx.hasUsedOncePerTurn(`destiny-board:${ctx.card.uid}`)) return;
            const stField = ctx.stField(owner);
            const nextId = SPIRIT_MESSAGE_ORDER.find((id) => !stField.some((slot) => slot && slot.card.id === id) && !ctx.field(owner).some((slot) => slot && slot.card.id === id));
            if (!nextId) return; // già complete (la vittoria scatta da sola in checkGameOver prima di arrivare qui)
            const hand = ctx.hand(owner);
            const handIdx = hand.findIndex((c) => c.id === nextId);
            const deckKey = owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            const deckIdx = Array.isArray(deck) ? deck.findIndex((c) => c.id === nextId) : -1;
            if (handIdx === -1 && deckIdx === -1) return; // non hai la prossima Spirit Message: nessun effetto questo turno
            ctx.markUsedOncePerTurn(`destiny-board:${ctx.card.uid}`);

            const takeCard = () => {
                if (handIdx !== -1) return hand.splice(handIdx, 1)[0];
                const [card] = deck.splice(deckIdx, 1);
                gameState[owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
                return card;
            };

            const placeNormally = () => {
                const freeSt = ctx.stField(owner).findIndex((s) => s === null);
                if (freeSt === -1) {
                    ctx.log('💀 Destiny Board: nessuna casella Magia/Trappola libera, la Spirit Message non viene piazzata questo turno.');
                    return;
                }
                const card = takeCard();
                ctx.stField(owner)[freeSt] = { card: card, isFaceDown: false, setOnTurn: gameState.turn };
                ctx.log(`💀 Destiny Board piazza scoperta ${card.name} sulla zona Magia/Trappola!`);
            };

            // Santuario Oscuro (id 192): Magia Terreno scoperta dello
            // stesso controllore — offre la scelta "puoi Special
            // Summonarla come Mostro Normale invece".
            const fieldSpellKey = owner === 'player' ? 'playerFieldSpell' : 'botFieldSpell';
            const fs = gameState[fieldSpellKey];
            const hasSanctuary = !!(fs && !fs.isFaceDown && fs.card.id === 192);

            const summonAsMonster = () => {
                const freeMonster = ctx.findEmptyMonsterSlot(owner);
                if (freeMonster === -1) {
                    ctx.log('⚱️ Santuario Oscuro: nessuna casella Mostro libera, la Spirit Message viene piazzata normalmente.');
                    placeNormally();
                    return;
                }
                // takeCard() pesca dalla mano se la Spirit Message e' li',
                // altrimenti dal Deck: la zona va letta PRIMA, perche'
                // takeCard la svuota.
                const zona = handIdx !== -1 ? 'hand' : 'deck';
                const card = takeCard();
                card.type = 'monster';
                card.subtype = 'normal';
                card.vanilla = true;
                card.level = 1;
                card.race = 'Demone';
                card.attribute = 'OSCURITÀ';
                card.attack = 0;
                card.defense = 0;
                ctx.specialSummon(owner, card, freeMonster, 'attack', zona);
                ctx.log(`⚱️ Santuario Oscuro Special Summona ${card.name} come Mostro Normale (Demone/OSCURITÀ/Livello 1/ATK 0/DEF 0)!`);
            };

            if (!hasSanctuary) {
                placeNormally();
            } else if (owner === 'player' && window.DuelEngineUI) {
                const previewName = handIdx !== -1 ? hand[handIdx].name : deck[deckIdx].name;
                window.DuelEngineUI.openChoicePopover(null, {
                    title: '💀 Destiny Board',
                    choiceA: { icon: '💀', label: `Piazza ${previewName} normalmente`, onSelect: placeNormally },
                    choiceB: { icon: '⚱️', label: 'Special Summonala con Santuario Oscuro', onSelect: summonAsMonster }
                });
            } else {
                // Bot: nessuna vera IA per questa scelta, come altre "puoi"
                // di questo file — avanza sempre verso la vittoria.
                placeNormally();
            }
        },
        onSTDestroyed(ctx) { collapseDestinyBoardPieces(ctx); },
        onBanished(ctx) { collapseDestinyBoardPieces(ctx); },
        onReturnedToHandSelf(ctx) { collapseDestinyBoardPieces(ctx); }
    });

    // Spirit Message "I" — le altre 3 (868/869/870) clonano questa
    // stessa registrazione tramite "cloneEffectOf" in data/cards.json
    // (vedi la libreria CARTE SENZA CODICE BESPOKE più sotto in questo
    // file): comportamento identico per tutte e 4, solo id/nome
    // cambiano nel database.
    CardEffects.register(867, {
        continuous: true,
        static(ctx) {
            // Solo nella forma Mostro (Special Summonata da Santuario
            // Oscuro id 192): "non può essere scelta come bersaglio per
            // un attacco" — gameState.cannotBeAttackTargetUids, per uid,
            // ricalcolato ogni render come ogni altro floodgate di
            // questo tipo, quindi si applica/toglie da solo a seconda
            // della forma attuale della carta. Stesso schema per "non
            // influenzata dagli effetti di altre carte, eccetto Destiny
            // Board" — vedi il commento sul campo in
            // recomputeStaticEffects (duel-engine.js) per il limite noto.
            if (ctx.card.type !== 'monster') return;
            gameState.cannotBeAttackTargetUids[ctx.card.uid] = true;
            gameState.immuneToCardEffectsExceptDestinyBoardUids[ctx.card.uid] = true;
        },
        onSTDestroyed(ctx) { collapseDestinyBoardPieces(ctx); },
        onDestroy(ctx) { collapseDestinyBoardPieces(ctx); },
        onBanished(ctx) { collapseDestinyBoardPieces(ctx); },
        onReturnedToHandSelf(ctx) { collapseDestinyBoardPieces(ctx); },
        onSacrificedForTribute(ctx) { collapseDestinyBoardPieces(ctx); }
    });

    // ================================================================
    // Backlog "carte prima serie TCG mancanti" — vedi AUDIT_CARTE_PRIMA_SERIE.md
    // per l'elenco completo e lo stato di avanzamento. Batch 1 (Livello 1,
    // le più facili).
    // ================================================================

    // 871 — Terraformazione / Terraforming (Magia Normale): cerca 1 Magia
    // Campo dal Deck alla mano — vera scelta tra tutte le Magie Campo
    // tramite searchDeckWithChoice (non più solo la prima trovata via
    // ctx.searchDeckToHand, che non offriva alcuna scelta).
    CardEffects.register(871, {
        canActivate(ctx) {
            const deck = ctx.owner === 'player' ? gameState.playerDeck : gameState.botDeck;
            return Array.isArray(deck) && deck.some((c) => c.type === 'spell' && c.subtype === 'field');
        },
        activate(ctx) {
            searchDeckWithChoice(ctx, (c) => c.type === 'spell' && c.subtype === 'field', {
                title: '🗺️ Terraformazione',
                text: 'Scegli quale Magia Campo aggiungere alla mano dal Deck.'
            }, (card) => {
                ctx.hand(ctx.owner).push(card);
                ctx.log(`🗺️ Terraformazione aggiunge ${card.name} alla mano!`);
            });
        }
    });

    // 872 — Wingweaver: mostro Normale (vanilla), nessun effetto da programmare.

    // 873 — Duo Delinquente / Delinquent Duo (Magia Normale): vedi
    // missingEffectNote in data/cards.json per la semplificazione (entrambi
    // gli scarti sono a caso, non solo il primo).
    CardEffects.register(873, {
        canActivate(ctx) {
            return ctx.hand(ctx.opponent).length > 0;
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 1000);
            const first = ctx.discardRandomFromHand(ctx.opponent);
            const second = ctx.hand(ctx.opponent).length > 0 ? ctx.discardRandomFromHand(ctx.opponent) : null;
            const count = (first ? 1 : 0) + (second ? 1 : 0);
            if (count > 0) ctx.log(`🃏 Duo Delinquente: ${ctx.opponent === 'player' ? 'scarti' : 'il bot scarta'} ${count} cart${count > 1 ? 'e' : 'a'}!`);
        }
    });

    // 874 — Confisca / Confiscation (Magia Normale): "guarda la mano
    // dell'avversario, scegli 1 carta al suo interno e falla scartare" — ora
    // una vera scelta (offerHandDiscardChoice con handOwner: ctx.opponent,
    // stesso principio di Amazzone Maestra delle Catene id 86) invece di
    // sceglierla in automatico con AI_SHARED.scoreCardImpact — bug reale
    // corretto in questa sessione, missingEffectNote rimosso da cards.json.
    // Il bot continua a scegliere da solo (score più alto), invariato.
    CardEffects.register(874, {
        canActivate(ctx) {
            return ctx.hand(ctx.opponent).length > 0;
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 1000);
            offerHandDiscardChoice(ctx, {
                handOwner: ctx.opponent,
                title: '🔎 Confisca',
                text: "Guarda la mano dell'avversario e scegli quale carta far scartare.",
                pickForBot: (candidates) => {
                    let best = candidates[0], bestScore = -Infinity;
                    candidates.forEach((card) => {
                        const score = window.AI_SHARED ? AI_SHARED.scoreCardImpact(card) : 0;
                        if (score > bestScore) { bestScore = score; best = card; }
                    });
                    return best;
                }
            }, (discarded) => {
                ctx.log(`🔎 Confisca: ${ctx.owner === 'player' ? 'hai' : 'il bot ha'} guardato la mano avversaria e scartato ${discarded.name}!`);
            });
        }
    });

    // 875 — Libro della Luna / Book of Moon (Magia Rapida): bersaglio
    // auto-selezionato (il mostro scoperto in Attacco con l'ATK più alto,
    // altrimenti il primo mostro scoperto trovato) — stesso spirito di
    // selezione automatica già usato da Cambio di Cuore (id 147), mai
    // segnalato come SEMPLIFICAZIONE in questo dataset per lo stesso
    // identico motivo.
    CardEffects.register(875, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown));
        },
        activate(ctx) {
            // Prima sceglieva da sola il mostro scoperto con l'ATK più
            // alto in Attacco. Ha senso come euristica difensiva, ma
            // Libro della Luna si usa anche sui PROPRI mostri (per
            // salvarne uno da un attacco, o per riarmare un effetto FLIP):
            // decidere su chi usarlo è tutta la carta.
            const candidati = collectFieldTargets(ctx, { zone: 'monster' });
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '🌙 Libro della Luna',
                text: 'Scegli il mostro da girare in Difesa coperta.'
            }, (scelto) => {
                const decl = ctx.declareTarget(scelto.owner, scelto.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const slot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!slot) return;
                const name = slot.card.name;
                ctx.changePosition(decl.targetOwner, decl.targetIndex, 'defense');
                slot.isFaceDown = true;
                ctx.log(`🌙 Libro della Luna gira ${name} in Difesa coperta!`);
            });
        }
    });

    // 876 — Desideri Solenni / Solemn Wishes (Trappola Continua): +500 LP
    // ogni volta che il controllore pesca — nuovo trigger condiviso
    // DuelEngine.TRIGGER.ON_DRAW_CARDS (duel-engine.js), agganciato in
    // drawCardsToHand (game-flow.js), riusabile da qualunque futura carta
    // reattiva alla propria pesca. `continuous: true` + un `activate()`
    // minimo sono OBBLIGATORI (non solo `static()`, a differenza di
    // Decreto Reale id 426, che senza un vero `activate()` risulta di
    // fatto MAI attivabile per davvero — canActivate richiede sempre
    // `typeof def.activate === 'function'`, bug preesistente scoperto
    // per caso mentre verificavo questa carta, non toccato qui: fuori
    // scope per questo backlog) — stesso pattern REALMENTE funzionante
    // di Legame di Gravità (id 707).
    CardEffects.register(876, {
        continuous: true,
        activate(ctx) { ctx.log('🙏 Desideri Solenni è attiva!'); },
        onDrawCards(ctx) {
            ctx.dealDamage(ctx.owner, -500);
            ctx.log('🙏 Desideri Solenni aumenta i Life Points di 500 punti!');
        }
    });

    // 877 — Uniti Vinceremo / United We Stand (Magia Equipaggiamento):
    // +800 ATK/DEF per ogni mostro scoperto controllato dal controllore
    // del mostro equipaggiato — stesso identico schema di Ciondolo Nero
    // (id 117)/Libro delle Arti Segrete (id 127), solo con un bonus
    // scalabile invece che fisso (come Falce del Mietitore id 411, ma
    // sul conteggio dei propri mostri invece che sul Cimitero).
    CardEffects.register(877, {
        continuous: true,
        canActivate(ctx) { return findEquipTarget(ctx) !== -1; },
        activate(ctx) { equipToChosenTarget(ctx); },
        isEquip: true,
        static(ctx) {
            const t = equippedTarget(ctx);
            const count = ctx.field(ctx.owner).filter((s) => s && !s.isFaceDown).length;
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + count * 800, def: e.def + count * 800 };
        }
    });

    // 878 — Angelo Splendente / Shining Angel (Mostro Effetto): distrutto
    // e mandato al Cimitero → Special Summon 1 mostro LUCE con 1500 ATK o
    // meno dal Deck — vera scelta tramite searchDeckWithChoice, non più
    // il primo trovato nel Deck mescolato. Stesso identico schema
    // (nessuna distinzione "in battaglia" vs "da effetto Carta") già
    // usato da Ratto Gigante (id 614, la sua controparte TERRA di questa
    // stessa famiglia di carte).
    CardEffects.register(878, {
        onDestroy(ctx) {
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return;
            searchDeckWithChoice(ctx, (c) => c.type === 'monster' && c.attribute === 'LUCE' && c.attack <= 1500, {
                title: '👼 Angelo Splendente',
                text: 'Scegli quale mostro LUCE (1500 ATK o meno) Special Summonare dal Deck.'
            }, (card) => {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) return;
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'deck');
                ctx.log(`👼 Angelo Splendente Special Summona ${card.name} dal Deck!`);
            });
        }
    });

    // 879 — Il Pescatore Leggendario / The Legendary Fisherman (Mostro
    // Effetto): finché "Umi" (id 497) è sul Terreno, non è influenzato
    // dagli effetti Magia e non può essere scelto come bersaglio
    // d'attacco (l'attacco DIRETTO resta permesso, quindi NON tocca
    // gameState.cannotAttackFor/Uids — quelli impedirebbero anche
    // l'attacco diretto). Nuovo gameState.cannotBeTargetedBySpellsUids
    // (duel-engine.js) — gemello per-ISTANZA di def.cannotBeTargetedBySpells
    // (fisso per definizione, es. Guardiano Kay'est id 285) — perché qui
    // l'immunità va e viene con la presenza di Umi, non è mai fissa.
    CardEffects.register(879, {
        static(ctx) {
            const umiPresent = ['playerFieldSpell', 'botFieldSpell'].some((key) => {
                const fs = ctx.gameState[key];
                return fs && !fs.isFaceDown && fs.card.id === 497;
            }) || gameState.virtualUmiPresent;
            if (!umiPresent) return;
            gameState.cannotBeAttackTargetUids[ctx.card.uid] = true;
            gameState.cannotBeTargetedBySpellsUids[ctx.card.uid] = true;
        }
    });

    // 880 — Messaggero della Pace / Messenger of Peace (Magia Continua):
    // i mostri scoperti con 1500+ ATK (di ENTRAMBI i lati) non possono
    // attaccare — stesso schema di Legame di Gravità (id 707, lì sul
    // Livello invece che sull'ATK). Vedi missingEffectNote in
    // data/cards.json per la semplificazione sul costo di mantenimento.
    CardEffects.register(880, {
        continuous: true,
        activate(ctx) { ctx.log('🕊️ Messaggero della Pace impedisce l\'attacco ai mostri più forti!'); },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && slot.card.attack >= 1500) {
                        gameState.cannotAttackUids[slot.card.uid] = true;
                    }
                });
            });
        },
        onStandbyPhase(ctx) {
            ctx.dealDamage(ctx.owner, 100);
            ctx.log('🕊️ Messaggero della Pace: pagati 100 Life Points per mantenerla attiva.');
        }
    });

    // 881 — Nobile dello Sterminio / Nobleman of Extermination (Magia
    // Normale): distruggi+bandisci 1 Magia/Trappola coperta AVVERSARIA
    // (bersaglio auto-selezionato, stesso stile di Cambio di Cuore id
    // 147) — riusa card.mustBanishOnLeavingField + il redirect condiviso
    // in ACTIONS.destroySpellTrap (duel-engine.js, esteso qui per la
    // prima volta dai soli mostri anche alle Magie/Trappole). Se era una
    // Trappola, bandisce anche ogni copia rimasta in ENTRAMBI i Deck.
    CardEffects.register(881, {
        canActivate(ctx) {
            return ['player', 'bot'].some((owner) => ctx.stField(owner).some((s) => s && s.isFaceDown));
        },
        activate(ctx) {
            let targetOwner = null, targetIndex = -1;
            [ctx.opponent, ctx.owner].some((owner) => {
                const idx = ctx.stField(owner).findIndex((s) => s && s.isFaceDown);
                if (idx !== -1) { targetOwner = owner; targetIndex = idx; return true; }
                return false;
            });
            if (targetOwner === null) return;
            const decl = ctx.declareTarget(targetOwner, targetIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const slot = ctx.stField(decl.targetOwner)[decl.targetIndex];
            if (!slot) return;
            const card = slot.card;
            card.mustBanishOnLeavingField = true;
            ctx.destroySpellTrap(decl.targetOwner, decl.targetIndex);
            ctx.log(`⚔️ Nobile dello Sterminio bandisce ${card.name}!`);
            if (card.type === 'trap') {
                ['playerDeck', 'botDeck'].forEach((deckKey) => {
                    const deck = gameState[deckKey];
                    if (!Array.isArray(deck)) return;
                    const deckOwner = deckKey === 'playerDeck' ? 'player' : 'bot';
                    for (let i = deck.length - 1; i >= 0; i--) {
                        if (deck[i].id === card.id) ctx.banished(deckOwner).push(deck.splice(i, 1)[0]);
                    }
                    gameState[deckKey === 'playerDeck' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
                });
            }
        }
    });

    // 882 — Oppressione Reale / Royal Oppression (Trappola Normale — vedi
    // missingEffectNote per la semplificazione rispetto alla vera
    // Trappola Continua): nega e distrugge un'Evocazione Speciale altrui,
    // stesso schema reattivo di Giudizio Solenne (id 448, lì per QUALUNQUE
    // Evocazione/attivazione) ma filtrato a ctx.summonedVia === 'special'
    // (il discriminatore condiviso normale/speciale già usato da Buco
    // Trappola id 40 per il caso opposto).
    CardEffects.register(882, {
        canActivate(ctx) {
            return ctx.summonedVia === 'special' && typeof ctx.summonedCard !== 'undefined';
        },
        onOpponentSummon(ctx) {
            if (ctx.summonedVia !== 'special') return;
            const decl = ctx.declareTarget(ctx.opponent, ctx.summonedSlotIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const target = ctx.field(decl.targetOwner)[decl.targetIndex];
            ctx.dealDamage(ctx.owner, 800);
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`👑 Oppressione Reale paga 800 Life Points per annullare e distruggere ${target ? target.card.name : ctx.summonedCard.name}, appena Special Summonato!`);
        }
    });

    // 883 — Don Zaloog (Mostro Effetto): su danno da battaglia inflitto,
    // scelta AUTOMATICA (vedi missingEffectNote) tra scarto casuale e
    // mill di 2 carte — preferisce lo scarto quando possibile (di solito
    // il colpo più fastidioso), altrimenti manda al Cimitero dal Deck.
    CardEffects.register(883, {
        onDealsBattleDamage(ctx) {
            if (ctx.hand(ctx.opponent).length > 0) {
                const discarded = ctx.discardRandomFromHand(ctx.opponent);
                if (discarded) ctx.log(`🗡️ Don Zaloog costringe ${ctx.opponent === 'player' ? 'te' : 'il bot'} a scartare ${discarded.name}!`);
                return;
            }
            const deckKey = ctx.opponent === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck) || deck.length === 0) return;
            const milled = deck.splice(-2, 2);
            milled.forEach((c) => ctx.graveyard(ctx.opponent).push(c));
            gameState[deckKey === 'playerDeck' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.log(`🗡️ Don Zaloog manda ${milled.length} cart${milled.length > 1 ? 'e' : 'a'} dal Deck avversario al Cimitero!`);
        }
    });

    // 884 — Yata-Garasu (Mostro Spirito): non Special Summonabile
    // (nuovo def.cannotSpecialSummon, ACTIONS.specialSummon in
    // duel-engine.js — simmetrico a def.cannotNormalSummon già
    // esistente), torna in mano a fine turno se Evocata Normalmente o
    // girata scoperta (stesso schema di Maharaghi id 755), e se infligge
    // danno da battaglia l'avversario salta la prossima Draw Phase —
    // riusa gameState.skipDrawFor[owner] già esistente (nato per Avidità
    // Sconsiderata id 653, un contatore, non solo un booleano). Una
    // delle carte più famose/discusse della storia del TCG.
    CardEffects.register(884, {
        cannotSpecialSummon: true,
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            ctx.card._returnToHandTurn = gameState.turn;
        },
        onFlip(ctx) {
            ctx.card._returnToHandTurn = gameState.turn;
        },
        onEndPhase(ctx) {
            if (ctx.card._returnToHandTurn !== gameState.turn) return;
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && slot.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.returnMonsterToHand(ctx.owner, index);
            ctx.log('🐦 Yata-Garasu ritorna in mano!');
        },
        onDealsBattleDamage(ctx) {
            gameState.skipDrawFor = gameState.skipDrawFor || {};
            gameState.skipDrawFor[ctx.opponent] = (gameState.skipDrawFor[ctx.opponent] || 0) + 1;
            ctx.log(`🐦 Yata-Garasu: ${ctx.opponent === 'player' ? 'salterai' : 'il bot salterà'} la prossima Draw Phase!`);
        }
    });

    // 885 — Quiz Inverso / Reversal Quiz (Magia Normale): manda mano e
    // campo al Cimitero, dichiara il tipo di carta in cima al proprio
    // Deck (vedi missingEffectNote per la scelta automatica), scambia i
    // Life Points se indovina.
    CardEffects.register(885, {
        canActivate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            return Array.isArray(gameState[deckKey]) && gameState[deckKey].length > 0;
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner).splice(0);
            hand.forEach((c) => ctx.graveyard(ctx.owner).push(c));
            ctx.field(ctx.owner).forEach((slot, index) => {
                if (!slot) return;
                ctx.graveyard(ctx.owner).push(slot.card);
                ctx.field(ctx.owner)[index] = null;
            });
            ctx.stField(ctx.owner).forEach((slot, index) => {
                if (!slot) return;
                ctx.graveyard(ctx.owner).push(slot.card);
                ctx.stField(ctx.owner)[index] = null;
            });
            const fsKey = ctx.owner === 'player' ? 'playerFieldSpell' : 'botFieldSpell';
            if (gameState[fsKey]) {
                ctx.graveyard(ctx.owner).push(gameState[fsKey].card);
                gameState[fsKey] = null;
            }
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck) || deck.length === 0) {
                ctx.log('🎲 Quiz Inverso: il Deck è vuoto, nessuna carta in cima da dichiarare.');
                return;
            }
            const counts = {};
            deck.forEach((c) => { counts[c.type] = (counts[c.type] || 0) + 1; });
            const guess = Object.keys(counts).reduce((best, t) => (counts[t] > (counts[best] || 0) ? t : best), 'monster');
            const topCard = deck[deck.length - 1];
            const labels = { monster: 'Mostro', spell: 'Magia', trap: 'Trappola' };
            const correct = topCard.type === guess;
            ctx.log(`🎲 Quiz Inverso: ${ctx.owner === 'player' ? 'dichiari' : 'il bot dichiara'} "${labels[guess]}" — la carta in cima è ${topCard.name} (${labels[topCard.type]})!`);
            if (correct) {
                const lpKeyOwn = ctx.owner === 'player' ? 'playerLP' : 'botLP';
                const lpKeyOpp = ctx.owner === 'player' ? 'botLP' : 'playerLP';
                const tmp = gameState[lpKeyOwn];
                gameState[lpKeyOwn] = gameState[lpKeyOpp];
                gameState[lpKeyOpp] = tmp;
                ctx.log('🎲 Quiz Inverso: indovinato! I Life Points si scambiano!');
            } else {
                ctx.log('🎲 Quiz Inverso: sbagliato, nessun effetto.');
            }
        }
    });

    // 886 — Metamorfosi / Metamorphosis (Magia Normale): tributa 1
    // mostro proprio e Special Summon dall'Extra Deck 1 Mostro Fusione
    // dello stesso Livello — usa lo slot appena liberato dal tributo,
    // nessuna ricerca separata di uno slot vuoto necessaria. Sia il
    // mostro da tributare sia (quando più di uno condivide il Livello)
    // il Mostro Fusione da Special Summonare sono ora una vera scelta,
    // non più sempre il più debole/il primo trovato nell'Extra Deck.
    CardEffects.register(886, {
        canActivate(ctx) {
            const extraDeck = ctx.owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
            if (!Array.isArray(extraDeck) || extraDeck.length === 0) return false;
            return ctx.field(ctx.owner).some((s) => s && extraDeck.some((c) => c.level === s.card.level));
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const extraDeck = ctx.owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
            const tributeCandidates = field
                .map((slot) => (slot && extraDeck.some((c) => c.level === slot.card.level) ? slot.card : null))
                .filter(Boolean);
            if (tributeCandidates.length === 0) return;

            // Doppia scelta vera: quale mostro tributare, poi (se più di
            // un Mostro Fusione dell'Extra Deck condivide quel Livello)
            // quale Special Summonare — prima entrambe erano
            // auto-selezionate (il più debole da tributare, il primo
            // trovato nell'Extra Deck).
            const summonFusion = (tributedCard, fusionCard) => {
                const idx = field.findIndex((s) => s && s.card === tributedCard);
                if (idx === -1) return;
                field[idx] = null;
                ctx.graveyard(ctx.owner).push(tributedCard);
                DuelEngine.notifySacrificedForTribute(ctx.owner, tributedCard);
                const extraIndex = extraDeck.indexOf(fusionCard);
                if (extraIndex === -1) return;
                const summonedFusion = extraDeck.splice(extraIndex, 1)[0];
                ctx.specialSummon(ctx.owner, summonedFusion, idx, 'attack', 'extra');
                ctx.log(`🌀 Metamorfosi tributa ${tributedCard.name} per Special Summonare ${summonedFusion.name}!`);
            };
            const tributeChosen = (tributedCard) => {
                const fusionCandidates = extraDeck.filter((c) => c.level === tributedCard.level);
                if (fusionCandidates.length === 1 || ctx.owner !== 'player' || !window.DuelEngineUI) {
                    summonFusion(tributedCard, fusionCandidates[0]);
                    return;
                }
                window.DuelEngineUI.openCardListPicker(fusionCandidates, {
                    title: '🌀 Metamorfosi',
                    text: "Scegli quale Mostro Fusione Special Summonare dall'Extra Deck.",
                    onSelect: (fusionCard) => summonFusion(tributedCard, fusionCard)
                });
            };

            if (tributeCandidates.length === 1 || ctx.owner !== 'player' || !window.DuelEngineUI) {
                let weakest = tributeCandidates[0];
                tributeCandidates.forEach((c) => { if (c.attack < weakest.attack) weakest = c; });
                tributeChosen(weakest);
                return;
            }
            window.DuelEngineUI.openCardListPicker(tributeCandidates, {
                title: '🌀 Metamorfosi',
                text: 'Scegli quale mostro tributare.',
                onSelect: tributeChosen
            });
        }
    });

    // 887 — Cancello di Fusione / Fusion Gate (Magia Campo): vedi
    // missingEffectNote per le due semplificazioni (materiali al
    // Cimitero invece che banditi; solo dal proprio turno). Riusa
    // interamente DuelEngine.getFusableExtraDeckMonsters/ctx.fusionSummon
    // già esistenti per "Fusione" (id 38) — qui però come Ignition
    // ripetibile di un Continuo già scoperto (repeatableWhileContinuous,
    // stesso schema di Offerta Suprema id 559).
    CardEffects.register(887, {
        continuous: true,
        repeatableWhileContinuous: true,
        canActivate(ctx) {
            // La PRIMA attivazione (dalla mano: zone 'hand') stabilisce
            // semplicemente la Magia Campo sul Terreno, come ogni altra —
            // deve restare sempre legale a prescindere dai materiali
            // disponibili in quel momento (nessuna Fusione avviene subito,
            // solo dal prossimo click mentre è già scoperta). Il controllo
            // sui materiali vale solo per la RIATTIVAZIONE ripetuta (zone
            // 'fieldSpell', repeatableWhileContinuous) — stesso principio
            // di Offerta Suprema (id 559): un canActivate troppo severo
            // bloccherebbe anche il primo piazzamento.
            if (ctx.zone !== 'fieldSpell') return true;
            return DuelEngine.getFusableExtraDeckMonsters(ctx.owner).length > 0;
        },
        activate(ctx) {
            const options = DuelEngine.getFusableExtraDeckMonsters(ctx.owner);
            if (options.length === 0) return;
            const owner = ctx.owner;
            const summon = (option) => { ctx.fusionSummon(owner, option.extraDeckIndex, option.materialLocations); };
            if (options.length === 1 || !window.DuelEngineUI) {
                summon(options[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(options.map((o) => o.card), {
                title: '🔗 Cancello di Fusione: scegli il Mostro Fusione',
                text: 'Hai i materiali per più di un Mostro Fusione: scegline uno da Evocare.',
                onSelect: (card) => {
                    const match = options.find((o) => o.card.uid === card.uid);
                    if (match) summon(match);
                }
            });
        }
    });

    // 888 — Freed il Generale Senza Rivali (Mostro Effetto): nega gli
    // effetti Magia che la bersagliano — stesso schema reattivo di Gran
    // Scudo Gardna (id 115)/Mago Comando del Caos (id 738) via
    // onCardEffectTargetDeclare + ctx.cancel(). Vedi missingEffectNote
    // in data/cards.json per la semplificazione sulla distruzione
    // esplicita della Magia bersaglio. La seconda abilità (sostituire la
    // pescata con una ricerca in Draw Phase) vive in game-flow.js
    // (enterDrawPhaseInner), non qui — una sostituzione della pescata è
    // per forza a quel livello, stesso schema hardcoded già usato da
    // skipDrawFor/pendingMaharaghiPeekFor per lo stesso motivo.
    CardEffects.register(888, {
        onCardEffectTargetDeclare(ctx) {
            if (!ctx.sourceCard || ctx.sourceType !== 'spell') return;
            ctx.cancel();
            ctx.log(`⚔️ Freed il Generale Senza Rivali nega l'effetto di ${ctx.sourceCard.name}!`);
        }
    });

    // 889 — Iniezione della Fata Giglio / Injection Fairy Lily (Mostro
    // Effetto): durante il calcolo dei danni, se combatte contro un mostro
    // avversario (Attacco o Difesa), può pagare 2000 LP per +3000 ATK
    // solo per quel calcolo, una volta per battaglia. Usa damageStepBonus
    // (duel-engine.js/getDamageStepBonus) — lo stesso hook già esistente
    // per Soldati Insetto del Cielo (id 311)/Soldato Cinetico (id 326) —
    // esteso in QUESTA sessione con un nuovo campo ctx.owner (chi
    // controlla la carta ADESSO), il pezzo che mancava per poter pagare i
    // Life Points giusti da dentro un hook che prima era solo un calcolo
    // puro. Vedi missingEffectNote in data/cards.json: la decisione di
    // pagare è automatica, non una vera scelta libera del giocatore.
    // `usedInjectionThisBattle` è un flag PER-ISTANZA (non per-definizione:
    // ogni copia della carta ha il proprio "già usato"), resettato a fine
    // Battle Phase (onBattlePhaseEnd, stesso hook già usato da Cavaliere
    // del Miraggio id 381) — la granularità più fine disponibile in questo
    // motore è "per Battle Phase", non "per singola battaglia": se questa
    // carta combattesse più di una volta nella STESSA Battle Phase (raro,
    // richiederebbe un effetto esterno che conceda un attacco extra),
    // l'effetto resterebbe disponibile solo alla prima di quelle battaglie
    // invece che ad ognuna — una sotto-stima accettabile, mai una carta
    // che si attiva più spesso del reale.
    CardEffects.register(889, {
        damageStepBonus(ctx) {
            if (!ctx.opponentCard) return null; // "se combatte contro un mostro avversario" — mai per un attacco diretto
            if (ctx.card.usedInjectionThisBattle) return null;
            if (!ctx.owner) return null; // difensivo: non dovrebbe mai mancare qui
            const ownerLP = ctx.owner === 'player' ? gameState.playerLP : gameState.botLP;
            if (ownerLP <= 2000) return null; // mai scendere a 0 o sotto pagando questo costo
            const myAtk = DuelEngine.getEffectiveAtk(ctx.card);
            const oppAtk = DuelEngine.getEffectiveAtk(ctx.opponentCard);
            // Paga solo se altrimenti perderebbe/pareggerebbe questo scontro
            // E il bonus basterebbe a ribaltarlo — mai per pura "sicurezza"
            // se starebbe già vincendo comunque.
            if (myAtk > oppAtk || myAtk + 3000 <= oppAtk) return null;
            ctx.card.usedInjectionThisBattle = true;
            DuelEngine.actions.dealDamage(ctx.owner, 2000);
            addToLog(`💉 ${ctx.card.name} paga 2000 LP: +3000 ATK solo per questo calcolo dei danni!`);
            return { atk: 3000 };
        },
        onBattlePhaseEnd(ctx) {
            ctx.card.usedInjectionThisBattle = false;
        }
    });

    // 890 — Necrovalley (Magia Terreno): due clausole reali implementate,
    // vedi missingEffectNote in data/cards.json per le altre due (nessun
    // checkpoint generico esiste in questo motore per loro, casi di
    // nicchia). Il bonus ai Guardiani della Tomba è PROPEDEUTICO
    // (l'archetipo non esiste ancora in questo dataset — vedi Livello 5
    // in AUDIT_CARTE_PRIMA_SERIE.md): filtro per NOME (`includes('Guardiani
    // della Tomba')`, stesso stile già usato per "Occhi Rossi" in questo
    // file, dato che i Guardiani della Tomba reali non hanno una race
    // dedicata in questo motore), innocuo finché nessuna carta corrisponde.
    // Il blocco al bando dal Cimitero è la parte REALMENTE nuova: vedi
    // isNecrovalleyOnField()/ACTIONS.banishFromGraveyard (duel-engine.js) —
    // un nuovo choke-point condiviso a cui sono stati migrati TUTTI i
    // ~24 punti di card-effects.js che banivano dal Cimitero con uno
    // splice scritto a mano, invece di un controllo duplicato in ognuno.
    CardEffects.register(890, {
        continuous: true,
        activate(ctx) {
            ctx.log('🏺 Necrovalley si scopre sul Terreno: le carte nel Cimitero non possono più essere bandite!');
        },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    if (!slot.card.name || !slot.card.name.includes('Guardiani della Tomba')) return;
                    const existing = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: existing.atk + 500, def: existing.def + 500 };
                });
            });
        }
    });

    // 891 — Necropaura Oscura / Dark Necrofear (Mostro Effetto): due
    // abilità reali, entrambe implementate.
    // 1) Special Summon dalla mano bandendo 3 mostri Demone dal proprio
    //    Cimitero — stesso schema canSpecialSummonFromHand/
    //    paySpecialSummonCost già usato da Stregone del Caos (id
    //    740)/Drago Megaroccia (id 763)/ecc., ora tutti protetti da
    //    Necrovalley (id 890) tramite ctx.banishFromGraveyard.
    // 2) "Se distrutta nella propria Zona Mostro da una carta
    //    dell'avversario e mandata al Cimitero in QUESTO turno: alla End
    //    Phase, equipaggiala a 1 mostro scoperto avversario e prendine il
    //    controllo finché resta equipaggiata" — un mostro che agisce da
    //    Equip è un caso più unico che raro in tutto il gioco, nessun
    //    hook esistente lo copriva. Il vincolo tecnico chiave: una carta
    //    nel Cimitero non riceve MAI i normali trigger di fase (vedi
    //    enterEndPhase, game-flow.js — lì lo stesso principio vale già
    //    per Ultimo Turno id 341), quindi la condizione va armata SUBITO
    //    in onDestroy() (mentre la carta è ancora "sul campo" agli occhi
    //    del motore) in un flag di gameState (gameState.pendingNecrofearRevival,
    //    per uid) e controllata esplicitamente dentro enterEndPhase()
    //    stesso — stesso identico principio già usato lì per
    //    gameState.pendingUltimateTurnCheck, non un meccanismo nuovo
    //    inventato da zero. Il controllo del mostro (ctx.takeControl,
    //    `permanent:true` per non farlo tornare da solo a fine turno come
    //    Cambio di Cuore) si rilascia quando QUESTA carta lascia la zona
    //    Magia/Trappola (onSTDestroyed/onBanished/onReturnedToHandSelf,
    //    stesso pattern multi-hook già usato da Abbandonato id 416/
    //    releaseRelinquishedTarget) — SEMPLIFICAZIONE onesta (vedi
    //    missingEffectNote): se è il mostro EQUIPAGGIATO a lasciare il
    //    campo per conto proprio, questa carta resta orfana e finisce nel
    //    Cimitero al controllo successivo, senza un vero effetto a
    //    cascata aggiuntivo — il testo reale attuale non ne specifica uno.
    // ================================================================
    function releaseNecrofearControl(ctx) {
        const uid = ctx.card._necrofearControlledUid;
        if (!uid) return;
        ctx.card._necrofearControlledUid = null;
        const idx = ctx.field(ctx.owner).findIndex((s) => s && s.card.uid === uid);
        if (idx === -1) return; // il mostro controllato è già sparito per conto suo
        ctx.takeControl(ctx.opponent, ctx.owner, idx);
        ctx.log('🃏 Necropaura Oscura lascia il campo: il controllo del mostro torna al suo proprietario.');
    }
    CardEffects.register(891, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).filter((c) => c.type === 'monster' && c.race === 'Demone').length >= 3;
        },
        getSpecialSummonBanishFilters() {
            const isDemon = (c) => c.type === 'monster' && c.race === 'Demone';
            return [isDemon, isDemon, isDemon];
        },
        paySpecialSummonCost(ctx) {
            const isDemon = (c) => c.type === 'monster' && c.race === 'Demone';
            return resolveSpecialSummonBanishCost(ctx, [isDemon, isDemon, isDemon], '👻 Necropaura Oscura bandisce 3 mostri Demone dal Cimitero per essere Evocata Specialmente!');
        },
        onDestroy(ctx) {
            const byOpponent = !!ctx.destroyedByOpponentCard || (ctx.destroyedByOwner && ctx.destroyedByOwner !== ctx.owner);
            if (!byOpponent) return;
            gameState.pendingNecrofearRevival = gameState.pendingNecrofearRevival || {};
            gameState.pendingNecrofearRevival[ctx.card.uid] = { forTurn: gameState.turn, owner: ctx.owner };
        },
        onSTDestroyed: releaseNecrofearControl,
        onBanished: releaseNecrofearControl,
        onReturnedToHandSelf: releaseNecrofearControl
    });

    // ================================================================
    // Archetipo Guardiani della Tomba / Gravekeeper's (id 892-900) —
    // propedeutico su Necrovalley (id 890), che già li boosta di
    // +500 ATK/DEF per nome (vedi il commento su Necrovalley qui sopra).
    // Tutte e 9 riusano meccanismi già esistenti nel motore, tranne
    // Sentinella (id 900, vedi il suo commento dedicato più sotto).
    // ================================================================

    // 892 — Maledizione dei Guardiani della Tomba (Gravekeeper's Curse):
    // "Se Evocata: infliggi 500 danni all'avversario" — nessuna
    // restrizione sul metodo (Normale/Speciale/Flip), quindi nessun
    // controllo su ctx.summonedVia.
    CardEffects.register(892, {
        onSummon(ctx) {
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log('💀 Maledizione dei Guardiani della Tomba infligge 500 danni!');
        }
    });

    // 893 — Vassallo dei Guardiani della Tomba (Gravekeeper's Vassal):
    // "il danno da battaglia inflitto da questa carta è trattato come
    // danno da EFFETTO" — nuovo flag def.treatBattleDamageAsEffect,
    // consultato in fireOwnBattleDamageDealt (actions.js) per SALTARE le
    // reazioni specifiche al danno da BATTAGLIA (es. Goblin Ladro id 610)
    // quando è questa carta a infliggerlo. I Life Points scendono
    // comunque regolarmente — il flag tocca solo quelle reazioni.
    // Nessun activate() necessario: è un effetto passivo puro, come
    // Guardiano Kay'est (id 285).
    CardEffects.register(893, {
        treatBattleDamageAsEffect: true
    });

    // 894 — Lanciere dei Guardiani della Tomba (Gravekeeper's Spear
    // Soldier): "se attacca un mostro in Difesa, infliggi danno
    // perforante" — def.piercing, stesso flag fisso già usato da
    // Parshath il Cavaliere Alato (id 82), consultato direttamente in
    // resolveBattleDamage (actions.js). Nessun codice nuovo necessario.
    CardEffects.register(894, {
        piercing: true
    });

    // 895 — Assalitore dei Guardiani della Tomba (Gravekeeper's
    // Assailant): "quando dichiara un attacco, mentre Necrovalley è sul
    // Terreno: cambia la Posizione di Battaglia di 1 mostro scoperto
    // avversario" — onOwnAttackDeclare(ctx), l'auto-effetto
    // dell'ATTACCANTE su ON_ATTACK_DECLARE (duel-engine.js, esistente da
    // prima di questa sessione, es. Jirai Gumo id 316 — non serviva
    // alcun hook nuovo, a differenza di quanto ipotizzato per Spirit Ryu
    // id 630 nella tabella del backlog: da riverificare in futuro).
    CardEffects.register(895, {
        onOwnAttackDeclare(ctx) {
            if (!DuelEngine.isNecrovalleyOnField()) return;
            let bestIndex = -1, bestAtk = -1;
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (!slot || slot.isFaceDown) return;
                const atk = DuelEngine.getEffectiveAtk(slot.card);
                if (atk > bestAtk) { bestAtk = atk; bestIndex = index; }
            });
            if (bestIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, bestIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const finalSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!finalSlot) return;
            finalSlot.position = finalSlot.position === 'attack' ? 'defense' : 'attack';
            ctx.log(`⚔️ Assalitore dei Guardiani della Tomba cambia la Posizione di Battaglia di ${finalSlot.card.name}!`);
        }
    });

    // 896 — Artigliere dei Guardiani della Tomba (Gravekeeper's
    // Cannonholder): "Puoi Tributare 1 mostro Guardiani della Tomba,
    // eccetto questa carta; infliggi 700 danni" — Ignition dalla zona
    // Mostro (canActivate/activate zone='monster', "una volta a turno"
    // già garantito automaticamente da gameState.usedIgnitionThisTurn
    // per OGNI effetto Ignition di questo motore, nessun tracking
    // manuale necessario). Tributo scritto a mano (field[i]=null +
    // graveyard.push + notifySacrificedForTribute) stesso schema di
    // Metamorfosi (id 886).
    CardEffects.register(896, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.uid !== ctx.card.uid && s.card.name && s.card.name.includes('Guardiani della Tomba'));
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const idx = field.findIndex((s) => s && !s.isFaceDown && s.card.uid !== ctx.card.uid && s.card.name && s.card.name.includes('Guardiani della Tomba'));
            if (idx === -1) return;
            const tributedCard = field[idx].card;
            field[idx] = null;
            ctx.graveyard(ctx.owner).push(tributedCard);
            DuelEngine.notifySacrificedForTribute(ctx.owner, tributedCard);
            ctx.dealDamage(ctx.opponent, 700);
            ctx.log(`💣 Artigliere dei Guardiani della Tomba tributa ${tributedCard.name}: infligge 700 danni!`);
        }
    });

    // 897 — Spia dei Guardiani della Tomba (Gravekeeper's Spy): "FLIP:
    // Evoca Specialmente 1 Guardiani della Tomba con 1500 ATK o meno dal
    // Deck" — stesso schema di ricerca dal Deck già usato da Angelo
    // Splendente (id 878), qui su onFlip invece che onDestroy.
    CardEffects.register(897, {
        onFlip(ctx) {
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return;
            searchDeckWithChoice(ctx, (c) => c.type === 'monster' && c.name && c.name.includes('Guardiani della Tomba') && c.attack <= 1500, {
                title: '🔎 Spia dei Guardiani della Tomba',
                text: 'Scegli quale Guardiani della Tomba (1500 ATK o meno) Special Summonare dal Deck.'
            }, (card) => {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) return;
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'deck');
                ctx.log(`🔎 Spia dei Guardiani della Tomba Special Summona ${card.name} dal Deck!`);
            });
        }
    });

    // 898 — Guardia dei Guardiani della Tomba (Gravekeeper's Guard):
    // "FLIP: 1 mostro avversario torna in mano" — bersaglio
    // auto-selezionato (ATK più alto, coperto conta 0 — stesso stile di
    // Libro della Luna id 875), ctx.returnMonsterToHand già esistente.
    CardEffects.register(898, {
        onFlip(ctx) {
            // Le coperte sono incluse (il testo dice "1 mostro che
            // l'avversario controlla", non "scoperto") e il picker le
            // disegna col retro: si sceglie la casella alla cieca, come al
            // tavolo vero.
            const candidati = collectFieldTargets(ctx, {
                zone: 'monster', owner: 'opponent', includiCoperte: true
            });
            if (candidati.length === 0) return;
            // Il bot prende sempre il primo della lista, quindi l'ordine
            // deve riprodurre l'euristica di prima: ATK effettivo piu'
            // alto, le coperte valgono 0, e a parita' vinceva l'ultima
            // casella (il vecchio confronto era `>=`, non `>`).
            const peso = (c) => (c.slot.isFaceDown ? 0 : DuelEngine.getEffectiveAtk(c.card));
            candidati.sort((a, b) => (peso(b) - peso(a)) || (b.index - a.index));
            chooseFieldCardTarget(ctx, candidati, {
                title: '🛡️ Guardia dei Guardiani della Tomba',
                text: 'Scegli il mostro avversario da rimandare in mano.'
            }, (scelto) => {
                const decl = ctx.declareTarget(scelto.owner, scelto.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const finalSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!finalSlot) return;
                const name = finalSlot.isFaceDown ? 'una carta coperta' : finalSlot.card.name;
                ctx.returnMonsterToHand(decl.targetOwner, decl.targetIndex);
                ctx.log(`🛡️ Guardia dei Guardiani della Tomba rimanda ${name} in mano!`);
            });
        }
    });

    // 899 — Capo dei Guardiani della Tomba (Gravekeeper's Chief): due
    // clausole reali implementate — "Il tuo Cimitero non è influenzato
    // da Necrovalley" (isNecrovalleyProtectingGraveyard, duel-engine.js,
    // generalizzazione per-owner di ACTIONS.banishFromGraveyard, nuova
    // di questa carta) e "quando Evocata Tributo: Special Summon 1
    // Guardiani della Tomba dal Cimitero" (onSummon, ctx.summonedVia
    // === 'normal' — per una carta di Livello 5 un'Evocazione Normale è
    // SEMPRE un'Evocazione Tributo in questo motore, un solo Tributo
    // richiesto, quindi nessuna ambiguità da risolvere). SEMPLIFICAZIONE
    // (vedi missingEffectNote): "puoi controllare solo 1 copia scoperta"
    // non applicata (nessun controllo generico di unicità esiste in
    // questo motore); bersaglio da rianimare auto-selezionato.
    CardEffects.register(899, {
        onSummon(ctx) {
            if (ctx.summonedVia !== 'normal') return;
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return;
            searchGraveyardWithChoice(ctx, ctx.owner, (c) => c.type === 'monster' && c.name && c.name.includes('Guardiani della Tomba'), {
                title: '👑 Capo dei Guardiani della Tomba',
                text: 'Scegli quale Guardiani della Tomba Special Summonare dal Cimitero.'
            }, (target) => {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(target); return; }
                ctx.specialSummon(ctx.owner, target, slotIndex, 'attack', 'graveyard');
                ctx.log(`👑 Capo dei Guardiani della Tomba Special Summona ${target.name} dal Cimitero!`);
            });
        }
    });

    // 900 — Sentinella dei Guardiani della Tomba (Gravekeeper's
    // Watcher): SEMPLIFICAZIONE — non implementata, vedi missingEffectNote
    // in data/cards.json per il motivo esteso. In breve: richiederebbe
    // una vera finestra di risposta attivabile da una carta ancora in
    // MANO (mai da campo, a differenza di ogni altro Effetto Veloce di
    // questo motore — findMonsterQuickEffectCandidates/
    // findSpellTrapQuickEffectCandidates coprono solo carte già scoperte
    // in campo), apribile in QUALUNQUE momento del turno di uno dei due
    // giocatori, PIÙ una capacità di riconoscere in anticipo se
    // un'attivazione "potrebbe far scartare" l'avversario — nessuna
    // delle due esiste oggi, e costruirle per questa carta sola sarebbe
    // sproporzionato, stesso principio già accettato per la Categoria B
    // di questo dataset (Santuario Oscuro id 192/Spada Sigillante di
    // Orichalcos id 396/Ninja d'Assalto id 459 rispondono comunque solo
    // quando una Chain è GIÀ aperta — questa carta dovrebbe rispondere
    // anche quando non lo è, un requisito ancora più stringente).
    CardEffects.register(900, {});

    // 901 — La Fanciulla Indulgente / The Forgiving Maiden (Mostro
    // Effetto): "Tributa questa carta scoperta per far tornare in mano 1
    // tuo mostro distrutto in battaglia in questo turno" — Ignition dalla
    // zona Mostro, auto-tributo di se stessa (stesso schema tributo
    // scritto a mano di Metamorfosi id 886/Artigliere dei Guardiani della
    // Tomba id 896). Il bersaglio da far tornare in mano è ora una vera
    // scelta (searchGraveyardWithChoice) tra ogni mostro nel Cimitero,
    // non più sempre il primo trovato — SEMPLIFICAZIONE residua onesta,
    // ora anche in missingEffectNote: non filtra "necessariamente
    // distrutto in battaglia in questo turno" (nessun tracking generico
    // per quella condizione precisa esiste ancora in questo motore),
    // quindi la scelta include OGNI mostro nel Cimitero, non solo quelli
    // che soddisferebbero il vero requisito. Materiale di Fusione per
    // Santa Giovanna (id 903).
    CardEffects.register(901, {
        canActivate(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.uid !== ctx.card.uid);
        },
        activate(ctx) {
            searchGraveyardWithChoice(ctx, ctx.owner, (c) => c.type === 'monster' && c.uid !== ctx.card.uid, {
                title: '👼 La Fanciulla Indulgente',
                text: 'Scegli quale mostro far tornare in mano dal Cimitero.'
            }, (target) => {
                const field = ctx.field(ctx.owner);
                const selfIndex = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
                if (selfIndex === -1) { ctx.graveyard(ctx.owner).push(target); return; }
                field[selfIndex] = null;
                ctx.graveyard(ctx.owner).push(ctx.card);
                DuelEngine.notifySacrificedForTribute(ctx.owner, ctx.card);
                ctx.hand(ctx.owner).push(target);
                ctx.log(`👼 La Fanciulla Indulgente si tributa: ${target.name} torna in mano dal Cimitero!`);
            });
        }
    });

    // 902 — Darklord Marie (Mostro Effetto, materiale di Fusione per
    // Santa Giovanna id 903): "Una volta per turno, durante la tua
    // Standby Phase, se questa carta è nel Cimitero: guadagni 200 LP".
    // Materiale di Fusione per Santa Giovanna (id 903) — questa carta
    // esisteva già nel 2003 (Labyrinth of Nightmare) col nome "Marie the
    // Fallen One", poi rinominata da Konami anni dopo integrandola
    // nell'archetipo Darklord: qui usato il nome/testo ATTUALI (stessa
    // fonte di verità, YGOPRODeck, di ogni altra carta di questo
    // dataset), non quelli storici del 2003.
    // Ora usa def.canTriggerFromGraveyard (duel-engine.js/firePhaseTrigger,
    // nato per Helpoemer id 1123) invece del più vecchio
    // canActivateFromGraveyardMainPhase/activateFromGraveyardMainPhase
    // (solo per la propria Main Phase 1): con l'handlerName 'onStandbyPhase'
    // scatta ora al momento GIUSTO del testo reale. Nessun
    // hasUsedOncePerTurn necessario: firePhaseTrigger('onStandbyPhase', ...)
    // viene chiamata esattamente una volta per turno da enterStandbyPhase()
    // (game-flow.js), già "una volta per turno" per costruzione.
    CardEffects.register(902, {
        canTriggerFromGraveyard: true,
        onStandbyPhase(ctx) {
            ctx.dealDamage(ctx.owner, -200);
            ctx.log('🖤 Darklord Marie guadagna 200 LP dal Cimitero!');
        }
    });

    // 903 — Santa Giovanna / St. Joan (Mostro Fusione): vanilla,
    // nessun effetto proprio oltre le statistiche — vedi fusionMaterials.
    CardEffects.register(903, {
        fusionMaterials: [901, 902]
    });

})();
