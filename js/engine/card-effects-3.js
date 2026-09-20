/**
 * card-effects-3.js — Effetti delle carte, parte 3 di 8.
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

    const { blockBanishFromField, findEquipTarget, attachEquip, equippedTarget, searchDeckWithChoice, searchGraveyardWithChoice, chooseFieldCardTarget, chooseFieldMonsterTarget, collectFieldTargets, offerHandDiscardChoice, attachUnionMonster, maxRitualTributeLevel, performRitualTribute } = window.CardEffectsShared;

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
    // 518 — Zera il Mant / Zera the Mant: Evocabile Rituale solo tramite
    // "Rituale di Zera" (id 517, qui sopra — GIÀ IMPLEMENTATA). Qui serve
    // solo il divieto di Evocazione Normale/Set e di Special Summon per
    // ogni altra via (cannotNormalSummon/cannotBeSpecialSummoned — stesso
    // schema di 413).
    // ================================================================
    CardEffects.register(518, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
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

    // ================================================================
    // 523 — Guardian Eatos (Special Summon dalla mano)
    // Se non hai mostri nel tuo Cimitero, puoi Special Summonare questa
    // carta dalla mano.
    // Vedi missingEffectNote su id 523 in cards.json: manca il secondo
    // effetto (manda al Cimitero 1 Magia Equipaggiamento equipaggiata a
    // questa carta per bandire fino a 3 mostri dal Cimitero avversario,
    // guadagnando 500 ATK ciascuno fino a fine turno).
    // ================================================================
    CardEffects.register(523, {
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).length === 0;
        }
    });

    // ================================================================
    // 28 — Mago del Tempo / Time Wizard (effetto Ignition)
    // Una volta per turno: lancia una moneta. Testa: distruggi tutti i
    // mostri dell'avversario. Croce: distruggi tutti i TUOI mostri
    // (questa carta compresa) e subisci danno pari a metà dell'ATK
    // totale che quelli scoperti avevano mentre erano sul Terreno.
    // SEMPLIFICAZIONE: nessuna animazione di lancio moneta dedicata,
    // solo un log — stesso spirito "risultato subito nel log" già usato
    // altrove per gli effetti a lancio di dado (es. Dado di Evocazione).
    // ================================================================
    CardEffects.register(28, {
        canActivate() { return true; },
        activate(ctx) {
            const heads = ctx.random() < 0.5;
            // Saggio Oscuro (id 191): "se hai indovinato il lancio di
            // moneta dell'effetto di Mago del Tempo" — memorizzato qui,
            // l'unico posto in cui questo motore conosce il risultato
            // del lancio, per proprietario e turno (letto e consumato da
            // id 191, non azzerato altrove: un turno diverso o un
            // proprietario diverso semplicemente non corrisponde più).
            gameState.timeWizardCoinResultFor = { owner: ctx.owner, heads: heads, turn: gameState.turn };
            if (window.FX) FX.playCoinFlip(heads);
            if (heads) {
                ctx.log('🪙 Mago del Tempo lancia la moneta: Testa! Distrugge tutti i mostri dell\'avversario!');
                ctx.destroyAllMonsters(ctx.opponent);
                // Saggio Oscuro (id 191): "Special Summon... dalla mano O
                // DAL DECK" — la parte "dalla mano" è già coperta dal
                // click reattivo su canSpecialSummonFromHand; qui si
                // aggancia la parte "dal Deck", che non ha un elemento
                // cliccabile naturale (la carta non è in mano). Offerta
                // subito qui, al momento in cui questo motore conosce per
                // la prima e unica volta l'esito del lancio, con
                // DuelEngineUI.openChoicePopover (già usato altrove per
                // scelte binarie).
                const hasDarkMagician = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const deck = gameState[deckKey];
                const deckIndex = Array.isArray(deck) ? deck.findIndex((c) => c.id === 191) : -1;
                if (hasDarkMagician && deckIndex !== -1) {
                    const summonFromDeck = () => {
                        const magicianIndex = ctx.field(ctx.owner).findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
                        if (magicianIndex === -1) return;
                        const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                        if (slotIndex === -1) return;
                        const sacrificed = ctx.field(ctx.owner)[magicianIndex].card;
                        ctx.field(ctx.owner)[magicianIndex] = null;
                        ctx.graveyard(ctx.owner).push(sacrificed);
                        const freshDeck = gameState[deckKey];
                        const freshIndex = freshDeck.findIndex((c) => c.id === 191);
                        if (freshIndex === -1) return;
                        const [sage] = freshDeck.splice(freshIndex, 1);
                        gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = freshDeck.length;
                        ctx.specialSummon(ctx.owner, sage, slotIndex, 'attack', 'deck');
                        const searchDef = DuelEngine.getDefinition(191);
                        if (searchDef && typeof searchDef.onSpecialSummon === 'function') {
                            searchDef.onSpecialSummon(DuelEngine.makeContext(ctx.owner, { card: sage }));
                        }
                        ctx.log('🧙 Saggio Oscuro sacrifica Mago Nero ed è Special Summonato dal Deck!');
                    };
                    if (ctx.owner === 'player' && window.DuelEngineUI) {
                        window.DuelEngineUI.openChoicePopover(null, {
                            title: '🧙 Hai indovinato! Special Summonare Saggio Oscuro dal Deck?',
                            choiceA: { icon: '✅', label: 'Sì, sacrifica Mago Nero', onSelect: summonFromDeck },
                            choiceB: { icon: '❌', label: 'No', onSelect: () => {} }
                        });
                    } else {
                        summonFromDeck();
                    }
                }
            } else {
                let totalAtk = 0;
                ctx.field(ctx.owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown) totalAtk += DuelEngine.getEffectiveAtk(slot.card);
                });
                ctx.destroyAllMonsters(ctx.owner);
                const damage = Math.floor(totalAtk / 2);
                ctx.dealDamage(ctx.owner, damage);
                ctx.log(`🪙 Mago del Tempo lancia la moneta: Croce! Distrugge tutti i tuoi mostri e subisci ${damage} danni!`);
            }
        }
    });

    // ================================================================
    // 104 — Drago Barile / Barrel Dragon (effetto Ignition)
    // Una volta per turno: scegli come bersaglio 1 mostro dell'avversario;
    // lancia una moneta 3 volte e distruggilo se almeno 2 risultati sono
    // Testa.
    // Il bersaglio si sceglie PRIMA di lanciare, come sulla carta vera: si
    // dichiara il bersaglio e poi si tira, non il contrario.
    // Le coperte restano bersagliabili (il testo reale dice "1 mostro
    // controllato dal tuo avversario", senza "scoperto"), quindi entrano
    // nel picker: escluderle farebbe fallire la carta contro un campo di
    // sole carte coperte, che oggi invece colpisce.
    // ================================================================
    CardEffects.register(104, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((slot) => slot);
        },
        activate(ctx) {
            const candidati = collectFieldTargets(ctx, { zone: 'monster', owner: 'opponent', includiCoperte: true });
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '🪙 Drago Barile',
                text: 'Scegli il mostro avversario da bersagliare, poi si lanciano 3 monete.'
            }, (scelto) => {
                const flips = [ctx.random() < 0.5, ctx.random() < 0.5, ctx.random() < 0.5];
                const heads = flips.filter(Boolean).length;
                // 3 lanci mostrati in rapida sequenza (uno ogni 550ms), non solo
                // il conteggio finale nel log — vedi FX.playCoinFlip.
                if (window.FX) flips.forEach((result, i) => setTimeout(() => FX.playCoinFlip(result), i * 550));
                if (heads >= 2) {
                    const decl = ctx.declareTarget(scelto.owner, scelto.index, { totalTargetCount: 1 });
                    if (!decl.allowed) return;
                    const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                    ctx.log(`🪙 Drago Barile lancia 3 monete (${heads} Testa): distrugge ${targetSlot ? targetSlot.card.name : scelto.card.name}!`);
                    ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
                } else {
                    ctx.log(`🪙 Drago Barile lancia 3 monete (solo ${heads} Testa): l'effetto fallisce.`);
                }
            });
        }
    });

    // ================================================================
    // 159 — Ondata Gelida / Cold Wave (Magia Normale)
    // Attivabile solo all'inizio della Main Phase 1 (approssimato a
    // "durante la propria Main Phase 1", nessuna carta di questo motore
    // distingue un preciso "inizio fase" più granulare — stessa
    // approssimazione già usata altrove in questo file). Fino al tuo
    // prossimo turno, né tu né il tuo avversario potete giocare o Set
    // Magie/Trappole — gameState.coldWaveActiveFor, consultato da
    // DuelEngine.isColdWaveActive() in canActivate; si esaurisce da solo
    // quando torna il tuo turno (changeTurn(), game-flow.js).
    // ================================================================
    CardEffects.register(159, {
        canActivate(ctx) {
            return gameState.phase === 'main1' && gameState.currentPlayer === ctx.owner;
        },
        activate(ctx) {
            gameState.coldWaveActiveFor = gameState.coldWaveActiveFor || {};
            gameState.coldWaveActiveFor[ctx.owner] = true;
            ctx.log('❄️ Ondata Gelida: nessuno può giocare o Set Magie/Trappole fino al tuo prossimo turno!');
        }
    });

    // ================================================================
    // 160 — Potere Raccolto / Gather Your Mind (Trappola Normale)
    // Scegli come bersaglio 1 mostro scoperto sul Terreno; equipaggialo
    // con TUTTE le Magie Equipaggiamento presenti sul Terreno (di
    // entrambi i giocatori) — riusa la stessa infrastruttura Equip
    // (equippedToOwner/equippedToIndex/equippedToUid, findEquipTarget/
    // attachEquip/equippedTarget) della sezione "CARTE EQUIPAGGIAMENTO"
    // più sopra in questo file. "Se una di queste Magie Equipaggiamento è
    // ora equipaggiata a un bersaglio non corretto, distruggila": ogni
    // Equip spostata viene ricontrollata contro il proprio
    // equipTargetFilter/unionTargetFilter (nuova proprietà generica,
    // aggiunta ad ogni Equip di questo file proprio per rendere possibile
    // questo controllo — prima esisteva solo ad-hoc dentro ogni singolo
    // canActivate/activate, mai come campo dichiarativo riusabile).
    // Il bersaglio lo sceglie il giocatore; i candidati restano ordinati
    // col PROPRIO campo per primo, che era la priorità della vecchia
    // selezione automatica e resta quella che il bot segue prendendo il
    // primo della lista.
    // ================================================================
    CardEffects.register(160, {
        canActivate(ctx) {
            const hasEquips = [ctx.owner, ctx.opponent].some((o) => ctx.stField(o).some((slot) => {
                if (!slot || slot.isFaceDown) return false;
                const def = DuelEngine.getDefinition(slot.card.id);
                return def && def.isEquip;
            }));
            const hasTarget = [ctx.owner, ctx.opponent].some((o) => ctx.field(o).some((slot) => slot && !slot.isFaceDown));
            return hasEquips && hasTarget;
        },
        activate(ctx) {
            const candidati = [
                ...collectFieldTargets(ctx, { zone: 'monster', owner: 'self' }),
                ...collectFieldTargets(ctx, { zone: 'monster', owner: 'opponent' })
            ];
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '⚡ Potere Raccolto',
                text: 'Scegli il mostro su cui far confluire TUTTE le Carte Equipaggiamento del Terreno.'
            }, (scelto) => {
                const targetOwner = scelto.owner;
                const targetIndex = scelto.index;
                const target = scelto.card;
            let count = 0;
            const moved = [];
            [ctx.owner, ctx.opponent].forEach((o) => {
                ctx.stField(o).forEach((slot, index) => {
                    if (!slot || slot.isFaceDown) return;
                    const def = DuelEngine.getDefinition(slot.card.id);
                    if (def && def.isEquip) {
                        slot.card.equippedToOwner = targetOwner;
                        slot.card.equippedToIndex = targetIndex;
                        slot.card.equippedToUid = target.uid;
                        count++;
                        moved.push({ owner: o, index, card: slot.card, def });
                    }
                });
            });
            ctx.log(`⚡ Potere Raccolto equipaggia ${count} Magi${count === 1 ? 'a' : 'e'} Equipaggiamento a ${target.name}!`);
            // "Se una di queste Magie Equipaggiamento è ora equipaggiata a
            // un bersaglio non corretto, distruggila" — usa il filtro di
            // bersaglio dichiarato da ogni Equip spostata:
            // equipTargetFilter per le Magie Equipaggiamento normali,
            // unionTargetFilter per i Mostri Union agganciati come Equip
            // (stesso identico ruolo, nome diverso per motivi storici —
            // vedi il commento su isUnion in cima al file). Un Equip senza
            // alcun filtro dichiarato (es. Ciondolo Nero id 117: "qualsiasi
            // mostro") non ha mai un bersaglio "sbagliato", quindi non
            // viene mai toccato qui. Passa da ctx.destroySpellTrap (non
            // uno splice manuale) apposta: scatena il suo eventuale
            // onSTDestroyed (es. Amplificatore id 92, che a sua volta
            // distrugge il mostro a cui resta agganciato quando lascia il
            // Terreno) e rispetta un'eventuale protezione come
            // cannotBeDestroyedByCardEffectWhileEquipped (id 726: "finché
            // equipaggiata a un mostro non può essere distrutta da effetti
            // Carta" — resta vera anche qui, il bersaglio sbagliato è pur
            // sempre "un mostro").
            moved.forEach((m) => {
                const filter = m.def.equipTargetFilter || m.def.unionTargetFilter;
                if (typeof filter !== 'function' || filter(target)) return;
                const liveIndex = ctx.stField(m.owner).findIndex((s) => s && s.card.uid === m.card.uid);
                if (liveIndex === -1) return;
                    ctx.log(`⚡ ${m.card.name} è ora equipaggiata a un bersaglio non corretto: distrutta!`);
                    ctx.destroySpellTrap(m.owner, liveIndex);
                });
            });
        }
    });

    // ================================================================
    // EVOCAZIONE FUSIONE — meccanismo generico (vedi la convenzione
    // spiegata in cima a questo file). Solo il minimo indispensabile per
    // farla funzionare: la Magia "Fusione" qui sotto, e un primo Mostro
    // Fusione i cui DUE materiali sono già entrambi presenti nel database
    // (a differenza della maggior parte degli altri, che aspettano
    // ancora carte collegate mancanti — vedi l'audit delle carte non
    // implementate). Gli altri Mostri Fusione restano da fare in un
    // secondo momento, uno per uno.
    // ================================================================

    // ================================================================
    // 38 — Fusione / Polymerization (Magia Normale)
    // Fondi insieme i Materiali Fusione elencati su un Mostro Fusione.
    // Cerca da sola (DuelEngine.getFusableExtraDeckMonsters) quali mostri
    // dell'Extra Deck sono fondibili ORA con quello che hai in mano/
    // Terreno; se è possibile fonderne più di uno, chiede quale con il
    // box di scelta a scorrimento orizzontale (stesso già usato altrove
    // in questo motore), altrimenti lo fa e basta.
    // ================================================================
    CardEffects.register(38, {
        canActivate(ctx) {
            return DuelEngine.getFusableExtraDeckMonsters(ctx.owner).length > 0;
        },
        activate(ctx) {
            const options = DuelEngine.getFusableExtraDeckMonsters(ctx.owner);
            if (options.length === 0) return;
            const owner = ctx.owner;
            const summon = (option) => {
                ctx.fusionSummon(owner, option.extraDeckIndex, option.materialLocations);
            };
            if (options.length === 1 || !window.DuelEngineUI) {
                summon(options[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(options.map((o) => o.card), {
                title: '🔗 Scegli il Mostro Fusione',
                text: 'Hai i materiali per più di un Mostro Fusione: scegline uno da Evocare.',
                onSelect: (card) => {
                    const match = options.find((o) => o.card.uid === card.uid);
                    if (match) summon(match);
                }
            });
        }
    });

    // ================================================================
    // 254 — Gaia il Campione dei Draghi / Gaia the Dragon Champion
    // (Mostro Fusione)
    // Fusione di "Gaia il Cavaliere Feroce" (id 14) e "Maledizione del
    // Drago" (id 15) — nessun effetto proprio oltre alla condizione di
    // Evocazione, quindi basta dichiarare i materiali: vedi "Fusione"
    // (id 38) qui sopra per come viene davvero Evocato.
    // ================================================================
    CardEffects.register(254, {
        fusionMaterials: [14, 15]
    });

    // ================================================================
    // Altri Mostri Fusione i cui materiali sono TUTTI già presenti nel
    // database — stesso principio di id 254 qui sopra, solo i materiali,
    // senza eventuali effetti propri aggiuntivi (documentati carta per
    // carta dove ce ne sono, restano SEMPLIFICAZIONE non applicata come
    // già per molte altre carte in questo file).
    // ================================================================

    // 29 — Drago Bianco Definitivo / Blue-Eyes Ultimate Dragon: fusione
    // di TRE "Drago Bianco Occhi Blu" (id 1).
    CardEffects.register(29, {
        fusionMaterials: [1, 1, 1]
    });

    // ================================================================
    // 30 — Obelisk il Tormentatore / Obelisk the Tormentor (uno dei 3 Dei
    // Egizi)
    // Testo ufficiale verificato (db.yugioh-card.com): "Richiede 3
    // Tributi per essere Evocato Normalmente (non può essere Posizionato
    // Normalmente). L'Evocazione Normale di questa carta non può essere
    // annullata. Quando viene Evocato Normalmente, non possono essere
    // attivate carte o effetti. Nessun giocatore può scegliere come
    // bersaglio questa carta con gli effetti delle carte. Una volta per
    // turno, durante la End Phase, se questa carta è stata Evocata
    // Specialmente: mandala al Cimitero. Puoi offrire come Tributo 2
    // mostri; distruggi tutti i mostri controllati dal tuo avversario.
    // Questa carta non può dichiarare un attacco nel turno in cui viene
    // attivato questo effetto."
    // Implementato: 3 Tributi (getTributesRequired, cards-db.js), non
    // può essere Settato (cannotBeSet, actions.js/bot.js), Ignition
    // sacrifica-2-distruggi-tutto con blocco d'attacco per il resto del
    // turno (gameState.cannotAttackUidsThisTurn). Non Special Summonabile
    // (cannotBeSpecialSummoned — approssima "se Special Summonato va al
    // Cimitero in End Phase": qui bloccato a monte, stesso risultato
    // pratico dato che nessun'altra carta di questo dataset potrebbe
    // comunque Special Summonarlo legalmente). "L'Evocazione Normale non
    // può essere annullata" non ha bisogno di codice: nessuna carta di
    // questo dataset nega mai un'Evocazione (il motore non ha ancora quel
    // meccanismo per NESSUNA carta), quindi la clausola è già rispettata
    // per costruzione. Le altre due clausole condivise dai 3 Dei Egizi
    // (id 30/31/472) SONO implementate: blocksActivationsOnOwnNormalSummon
    // (niente finestra di risposta alla propria Evocazione Normale, vedi
    // duel-engine.js/fireTrigger) e cannotBeTargetedByCardEffects (vedi
    // duel-engine.js/declareCardEffectTarget).
    // ================================================================
    CardEffects.register(30, {
        cannotBeSpecialSummoned: true,
        cannotBeSet: true,
        blocksActivationsOnOwnNormalSummon: true,
        cannotBeTargetedByCardEffects: true,
        canActivate(ctx) {
            return ctx.field(ctx.owner).filter((slot) => slot && slot.card.uid !== ctx.card.uid).length >= 2;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const others = field.map((slot, i) => ({ slot, i })).filter((s) => s.slot && s.slot.card.uid !== ctx.card.uid);
            others.slice(0, 2).forEach(({ slot, i }) => {
                ctx.graveyard(ctx.owner).push(slot.card);
                field[i] = null;
            });
            ctx.destroyAllMonsters(ctx.opponent);
            gameState.cannotAttackUidsThisTurn = gameState.cannotAttackUidsThisTurn || new Set();
            gameState.cannotAttackUidsThisTurn.add(ctx.card.uid);
            ctx.log("🗿 Obelisk il Tormentatore sacrifica 2 mostri e distrugge tutti i mostri dell'avversario! Non può attaccare in questo turno.");
        }
    });

    // ================================================================
    // 31 — Slifer il Drago del Cielo / Slifer the Sky Dragon (uno dei 3
    // Dei Egizi)
    // Testo ufficiale verificato (db.yugioh-card.com): "Richiede 3
    // Tributi per essere Evocato Normalmente (non può essere Posizionato
    // Normalmente). L'Evocazione Normale di questa carta non può essere
    // annullata. Quando viene Evocato Normalmente, non possono essere
    // attivate carte o effetti. Una volta per turno, durante la End
    // Phase, se questa carta è stata Evocata Specialmente: mandala al
    // Cimitero. Guadagna 1000 ATK/DEF per ogni carta nella tua mano. Se
    // uno o più mostri vengono Evocati Normalmente o Specialmente sul
    // Terreno del tuo avversario in Posizione di Attacco: quei mostri
    // perdono 2000 ATK, poi, se come risultato il loro ATK è stato
    // ridotto a 0, distruggili." — ATK/DEF stampati sono "?": card.attack/
    // defense nel database sono 0, il vero valore è SOLO quello dato
    // dall'effetto (nessun "più" rispetto a una base fissa).
    // SEMPLIFICAZIONE: la riduzione di 2000 ATK è permanente e scritta
    // direttamente su card.attack (stesso pattern di atkLossOnBattleDestroy
    // in actions.js), non riapplicata se altri effetti alzano di nuovo
    // l'ATK del bersaglio in seguito — nessuna carta di questo dataset fa
    // questo genere di cosa, quindi non c'è un caso reale da coprire.
    // "L'Evocazione Normale non può essere annullata" non ha bisogno di
    // codice: nessuna carta di questo dataset nega mai un'Evocazione (il
    // motore non ha ancora quel meccanismo per NESSUNA carta), quindi la
    // clausola è già rispettata per costruzione. La clausola "non possono
    // essere attivate carte o effetti" quando viene Evocato Normalmente È
    // implementata: blocksActivationsOnOwnNormalSummon (niente finestra di
    // risposta alla propria Evocazione Normale, vedi duel-engine.js/
    // fireTrigger) — a differenza di Obelisk (id 30) e Ra (id 472), il
    // testo di Slifer NON include l'immunità al targeting: quella resta
    // solo delle altre due carte.
    // ================================================================
    CardEffects.register(31, {
        cannotBeSpecialSummoned: true,
        cannotBeSet: true,
        blocksActivationsOnOwnNormalSummon: true,
        static(ctx) {
            const handCount = ctx.hand(ctx.owner).length;
            gameState.atkDefBonus[ctx.card.uid] = { atk: handCount * 1000, def: handCount * 1000 };
        },
        onEnemyMonsterSummoned(ctx) {
            if (ctx.summonedPosition !== 'attack') return;
            const field = ctx.field(ctx.summonedOwner);
            const slot = field[ctx.summonedSlotIndex];
            if (!slot || slot.card.uid !== ctx.summonedCard.uid) return;
            slot.card.attack = Math.max(0, (slot.card.attack || 0) - 2000);
            if (DuelEngine.getEffectiveAtk(slot.card) <= 0) {
                ctx.destroyMonster(ctx.summonedOwner, ctx.summonedSlotIndex);
                ctx.log(`⚡ Slifer il Drago del Cielo riduce l'ATK di ${ctx.summonedCard.name} a 0 e lo distrugge!`);
            } else {
                ctx.log(`⚡ Slifer il Drago del Cielo fa perdere 2000 ATK a ${ctx.summonedCard.name}!`);
            }
        }
    });

    // 84 — Drago Spada di Alligatore / Alligator's Sword Dragon: fusione
    // di "Cucciolo di Drago" (id 27) e "Spada di Alligatore" (id 83).
    // Può attaccare direttamente se gli unici mostri scoperti controllati
    // dall'avversario hanno Attributo TERRA, ACQUA o FUOCO
    // (gameState.directAttackAllowedUids, stesso meccanismo di Sparatore
    // Sonico id 773/Folletto della Fiamma Furente id 681 — vedi
    // duel-engine.js/game-flow.js/ai-medium.js/ai-hard.js).
    // SEMPLIFICAZIONE: ignora i mostri coperti dell'avversario (il loro
    // Attributo è nascosto, coerente con come altre condizioni "solo se
    // il campo avversario è così" di questo file guardano solo lo stato
    // visibile).
    CardEffects.register(84, {
        fusionMaterials: [27, 83],
        static(ctx) {
            const oppFaceUp = ctx.field(ctx.opponent).filter((s) => s && !s.isFaceDown);
            if (oppFaceUp.length > 0 && oppFaceUp.every((s) => ['TERRA', 'ACQUA', 'FUOCO'].includes(s.card.attribute))) {
                gameState.directAttackAllowedUids[ctx.card.uid] = true;
            }
        }
    });

    // 102 — Drago Nero del Teschio / Black Skull Dragon: fusione di
    // "Teschio Evocato" (id 13) e "Drago Nero Occhi Rossi" (id 12).
    CardEffects.register(102, {
        fusionMaterials: [13, 12]
    });

    // 1126 — Drago Nero Meteora / Meteor Black Dragon: fusione di "Drago
    // Nero Occhi Rossi" (id 12) e "Drago Meteora" (id 1125, vanilla puro,
    // nessuna registrazione propria — stesso stile di Falena Piccola id
    // 522).
    CardEffects.register(1126, {
        fusionMaterials: [12, 1125]
    });

    // 189 — Paladino Oscuro / Dark Paladin: fusione di "Mago Nero" (id 2)
    // e "Buster Blader" (id 20). +500 ATK per ogni mostro Tipo Drago sul
    // Terreno E nei Cimiteri (di ENTRAMBI i giocatori, testo reale: "each
    // Dragon monster on the field and in the GY", nessuna distinzione di
    // proprietario). "Finché è scoperta in campo, puoi scartare 1 carta
    // per negare e distruggere l'attivazione di una Magia": vero Effetto
    // Veloce da mostro, come Spadaccino Mistico LV6 (id 865) — stesso
    // canRespondAsQuickEffect/findMonsterQuickEffectCandidates
    // (duel-engine.js, openActivationWindow). A differenza di 865, NESSUN
    // limite "una volta sola": il testo reale non lo impone, il costo
    // (scartare 1 carta) è l'unico vincolo. SEMPLIFICAZIONE condivisa con
    // Interferenza Magica (id 361) e famiglia: risponde a QUALUNQUE Magia
    // attivata, non solo quelle scoperte sul Terreno con un vero
    // "bersaglio" — nessun tracciamento di zona/bersaglio di
    // un'attivazione generica in questo motore.
    CardEffects.register(189, {
        fusionMaterials: [2, 20],
        canRespondAsQuickEffect: true,
        canActivate(ctx) {
            if (ctx.hand(ctx.owner).length === 0) return false;
            const chain = ctx.gameState.chain;
            return !!(chain && chain.links && chain.links.length > 0 && chain.links[chain.links.length - 1].card.type === 'spell');
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const discarded = ctx.discardChosenFromHand(ctx.owner, 0);
            if (ctx.negateActivation()) {
                ctx.log(`⚔️ Paladino Oscuro scarta ${discarded.name} e annulla l'attivazione della Magia!`);
            } else {
                ctx.log(`⚔️ Paladino Oscuro scarta ${discarded.name}, ma non c'era più nulla da annullare.`);
            }
        },
        static(ctx) {
            let dragonCount = 0;
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => { if (slot && !slot.isFaceDown && slot.card.race === 'Drago') dragonCount++; });
                ctx.graveyard(owner).forEach((card) => { if (card.race === 'Drago') dragonCount++; });
            });
            if (dragonCount === 0) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + dragonCount * 500, def: e.def };
        }
    });

    // 207 — Cavaliere Maestro dei Draghi / Dragon Master Knight: fusione
    // di "Guerriero Nero Supremo" (id 55) e "Drago Occhi Blu Definitivo"
    // — quest'ultimo è id 29 "Drago Bianco Definitivo" in questo database
    // (stessa carta reale, Blue-Eyes Ultimate Dragon).
    CardEffects.register(207, {
        fusionMaterials: [55, 29],
        // +500 ATK per ogni mostro Tipo Drago che controlli, ESCLUSA
        // questa carta (che è essa stessa Tipo Drago) — stesso schema di
        // Buster Blader (id 20) più sopra, self-contenuto (guarda solo il
        // proprio campo, non anche il Cimitero come Buster Blader).
        static(ctx) {
            const dragons = ctx.field(ctx.owner).filter((slot) => slot && !slot.isFaceDown && slot.card.uid !== ctx.card.uid && slot.card.race === 'Drago').length;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + dragons * 500, def: e.def };
        }
    });

    // 278 — Grande Mammut di Goldfine / Great Mammoth of Goldfine:
    // fusione di "Capelli di Serpente" (id 470) e "Drago Zombie" (id 211).
    CardEffects.register(278, {
        fusionMaterials: [470, 211]
    });

    // 303 — Drago Verme Umanoide / Humanoid Worm Drake: fusione di
    // "Drago Verme" (id 509) e "Melma Umanoide" (id 302).
    CardEffects.register(303, {
        fusionMaterials: [509, 302]
    });

    // 336 — Carro Armato del Labirinto / Labyrinth Tank: fusione di
    // "Lupo Giga-Tech" (id 264) e "Soldato Cannone" (id 137).
    CardEffects.register(336, {
        fusionMaterials: [264, 137]
    });

    // 387 — Re dei Musicisti / King of the Musicians: fusione di "Strega
    // della Foresta Nera" (id 508) e "Dama della Fede" (id 338).
    CardEffects.register(387, {
        fusionMaterials: [508, 338]
    });

    // 473 — Drago dei Mille / Thousand Dragon: fusione di "Mago del
    // Tempo" (id 28) e "Cucciolo di Drago" (id 27).
    CardEffects.register(473, {
        fusionMaterials: [28, 27]
    });

    // 476 — Restrizione dai Mille Occhi / Thousand-Eyes Restrict: fusione
    // di "Abbandonato" (id 416) e "Idolo dai Mille Occhi" (id 475).
    // "Gli altri mostri sul Terreno non possono cambiare Posizione di
    // Battaglia né attaccare" — un mostro alla volta, su ENTRAMBI i
    // giocatori, tramite i flag già esistenti cannotAttackUids/
    // cannotChangePositionUids (per-uid, non per-owner, esattamente
    // quello che serve qui). Clausola di targeting/equip ("una volta per
    // turno, equipaggia 1 mostro dell'avversario copiandone ATK/DEF"):
    // stesso identico meccanismo/stesso schema già usato per Abbandonato/
    // Relinquished (id 416, il proprio materiale da Fusione) qui sopra —
    // gameState.atkDefBonus per il delta ATK/DEF, restituzione su
    // onDestroy. Il redirect "se distrutta in battaglia, distruggi il
    // mostro equipaggiato al posto suo" è implementato tramite
    // onWouldBeDestroyedInBattle, stesso schema di 416 (vedi lì).
    CardEffects.register(476, {
        fusionMaterials: [416, 475],
        canActivate(ctx) {
            if (ctx.zone !== 'monster') return false;
            if (ctx.card._restrictTarget) return false;
            return ctx.field(ctx.opponent).some((slot) => slot && !slot.isFaceDown);
        },
        activate(ctx) {
            const candidati = collectFieldTargets(ctx, { zone: 'monster', owner: 'opponent' });
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '👁️ Restrizione dai Mille Occhi',
                text: 'Scegli quale mostro avversario equipaggiare: ne copierai ATK e DEF.'
            }, (scelto) => {
                const decl = ctx.declareTarget(scelto.owner, scelto.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const finalSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!finalSlot) return;
                const absorbed = finalSlot.card;
                ctx.field(decl.targetOwner)[decl.targetIndex] = null;
                ctx.card._restrictTarget = absorbed;
                ctx.card._restrictFromOwner = decl.targetOwner;
                ctx.log(`👁️ Restrizione dai Mille Occhi equipaggia ${absorbed.name}, copiandone ATK/DEF!`);
            });
        },
        onDestroy(ctx) {
            const absorbed = ctx.card._restrictTarget;
            if (!absorbed) return;
            const owner = ctx.card._restrictFromOwner;
            const emptySlot = ctx.field(owner).findIndex((slot) => slot === null);
            if (emptySlot !== -1) {
                ctx.field(owner)[emptySlot] = { card: absorbed, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false, summonedOnTurn: gameState.turn };
                ctx.log(`👁️ ${absorbed.name} torna sul campo del suo proprietario!`);
            } else {
                ctx.graveyard(owner).push(absorbed);
                ctx.log(`👁️ ${absorbed.name} torna al Cimitero del suo proprietario (Terreno pieno).`);
            }
        },
        // "Se questa carta dovrebbe essere distrutta IN BATTAGLIA,
        // distruggi il mostro equipaggiato al posto suo" (stesso schema di
        // Abbandonato/id 416, proprio materiale da Fusione): a differenza
        // di onDestroy qui sopra (ritorno "vivo" quando questa carta
        // lascia il campo), qui il mostro assorbito viene DISTRUTTO per
        // davvero, e questa carta sopravvive.
        onWouldBeDestroyedInBattle(ctx) {
            const absorbed = ctx.card._restrictTarget;
            if (!absorbed) return false;
            const owner = ctx.card._restrictFromOwner;
            ctx.graveyard(owner).push(absorbed);
            ctx.card._restrictTarget = null;
            ctx.log(`👁️ Restrizione dai Mille Occhi sopravvive: ${absorbed.name} viene distrutto al suo posto!`);
            return true;
        },
        static(ctx) {
            ['player', 'bot'].forEach((o) => {
                ctx.field(o).forEach((slot) => {
                    if (!slot || slot.card.uid === ctx.card.uid) return;
                    gameState.cannotAttackUids[slot.card.uid] = true;
                    gameState.cannotChangePositionUids[slot.card.uid] = true;
                });
            });
            const absorbed = ctx.card._restrictTarget;
            if (!absorbed) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + (absorbed.attack - ctx.card.attack), def: e.def + (absorbed.defense - ctx.card.defense) };
        }
    });

    // 184 — Cavaliere della Fiamma Oscura / Dark Flare Knight: fusione di
    // "Mago Nero" (id 2) e "Spadaccino di Fuoco" / Flame Swordsman (id 58
    // — CORREZIONE: puntava al vecchio id 524, duplicato di questa stessa
    // carta, eliminato). Non subisce danno da battaglia dagli attacchi
    // che la coinvolgono (preventOwnBattleDamage, flag generico
    // esistente — vedi applyDamage in actions.js). Se distrutta IN
    // BATTAGLIA (ctx.destroyedByOpponentCard, presente solo per
    // distruzioni in battaglia — vedi Ossigeddon id 804 per lo stesso
    // schema): Special Summon "Cavaliere del Miraggio" (id 381, qui
    // sotto) dalla mano o dal Deck. CORREZIONE: la nota precedente di
    // questa e di id 381 affermava erroneamente che l'altra carta non
    // fosse presente in questo database — falso, entrambe già esistono
    // ed erano solo riferite l'una all'altra con un nome leggermente
    // diverso ("Cavaliere Fiamma Oscura" invece di "Cavaliere della
    // Fiamma Oscura").
    // ================================================================
    CardEffects.register(184, {
        fusionMaterials: [2, 58],
        preventOwnBattleDamage: true,
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard) return;
            const owner = ctx.owner;
            const hand = ctx.hand(owner);
            let index = hand.findIndex((c) => c.id === 381);
            let source = 'hand';
            let card = index !== -1 ? hand[index] : null;
            const deckKey = owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!card && Array.isArray(deck)) {
                index = deck.findIndex((c) => c.id === 381);
                if (index !== -1) { card = deck[index]; source = 'deck'; }
            }
            if (!card) return;
            const slotIndex = ctx.findEmptyMonsterSlot(owner);
            if (slotIndex === -1) return;
            if (source === 'hand') {
                hand.splice(index, 1);
            } else {
                deck.splice(index, 1);
                gameState[owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            }
            ctx.specialSummon(owner, card, slotIndex, 'attack', source);
            ctx.log('🔥 Cavaliere della Fiamma Oscura, distrutta in battaglia, Special Summona Cavaliere del Miraggio!');
        }
    });

    // ================================================================
    // 381 — Cavaliere del Miraggio / Mirage Knight
    // Non può essere Evocato Normalmente/Set (cannotNormalSummon) né
    // Special Summonato in nessun altro modo (cannotBeSpecialSummoned —
    // esclude Rinascita del Mostro/Carica dell'Anima id 35/59, ma NON
    // blocca ctx.specialSummon usato direttamente da Cavaliere della
    // Fiamma Oscura id 184 qui sopra, l'unico modo legale). Solo durante
    // il calcolo dei danni, guadagna ATK pari all'ATK ORIGINALE (base,
    // non effettivo) del mostro avversario con cui combatte
    // (damageStepBonus). Alla fine della Battle Phase di un turno in cui
    // ha attaccato o è stata attaccata: si bandisce (onBattlePhaseEnd,
    // duel-engine.js/game-flow.js — zona Bandite, ctx.banish).
    // ================================================================
    CardEffects.register(381, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        damageStepBonus(ctx) {
            if (!ctx.opponentCard) return { atk: 0, def: 0 };
            return { atk: ctx.opponentCard.attack || 0, def: 0 };
        },
        onBattlePhaseEnd(ctx) {
            if (!ctx.card.battledThisBattlePhase) return;
            ctx.card.battledThisBattlePhase = false;
            if (blockBanishFromField(ctx, ctx.card)) return;
            ctx.field(ctx.owner)[ctx.slotIndex] = null;
            ctx.banish(ctx.owner, ctx.card);
            ctx.log('🌫️ Cavaliere del Miraggio bandito a fine turno!');
        }
    });

    // 408 — Cavallerizzo Rabbioso / Rabid Horseman: fusione di "Bue da
    // Battaglia" / Battle Ox (id 106, già presente) e "Cavaliere Mistico"
    // (id 389).
    // CORREZIONE di fedeltà: aggiunto l'effetto mancante — "se un tuo
    // mostro Tipo Bestia, Guerriero Bestia o Bestia Alata attacca un
    // mostro in Posizione di Difesa, infliggi danno perforante" — riusa
    // lo stesso meccanismo generico già esistente per RAZZA (
    // gameState.piercingRacesFor/hasRacePiercing, usato da Furia del
    // Drago id 212), qui applicato a 3 razze insieme invece di una sola.
    CardEffects.register(408, {
        fusionMaterials: [106, 389],
        static(ctx) {
            ['Bestia', 'Guerriero Bestia', 'Bestia Alata'].forEach((race) => {
                gameState.piercingRacesFor[ctx.owner].add(race);
            });
        }
    });

    // 521 — Guerriero Zombie / Zombie Warrior: fusione di "Skull Servant"
    // (id 526, importata apposta) e "Guerriero da Battaglia" (id 108).
    CardEffects.register(521, {
        fusionMaterials: [526, 108]
    });

    // 73 — Super Roboyarou / Super Robolady: fusione di "Roboyarou"
    // (id 527) e "Robolady" (id 528). +1000 ATK durante il Damage Step
    // (damageStepBonus, stesso schema di Soldati Insetto del Cielo/
    // Soldato Cinetico).
    CardEffects.register(73, {
        fusionMaterials: [527, 528],
        damageStepBonus(ctx) {
            if (ctx.role === 'attacker') return { atk: 1000 };
            return null;
        }
    });

    // 103 — Barox: fusione di "Panda Scatenato" (id 529) e "Ryu Kishin"
    // (id 25).
    CardEffects.register(103, {
        fusionMaterials: [529, 25]
    });

    // 113 — Bickuribox: fusione di "Clown Stupido" (id 530) e "Clown del
    // Sogno" (id 531).
    CardEffects.register(113, {
        fusionMaterials: [530, 531]
    });

    // 149 — Chimera la Bestia Mitica Volante: fusione di "Gazelle, Re
    // delle Bestie Mitiche" (id 532) e "Berfomet" (id 533).
    // CORREZIONE di fedeltà: nota precedente obsoleta (diceva che i
    // bersagli non erano presenti nel database — lo sono entrambi, sono
    // gli stessi materiali da Fusione qui sopra). Aggiunto l'effetto
    // mancante: "quando questa carta viene distrutta, puoi Special
    // Summonare 1 'Berfomet' o 1 'Gazelle il Re delle Bestie Mitiche' dal
    // tuo Cimitero".
    CardEffects.register(149, {
        fusionMaterials: [532, 533],
        onDestroy(ctx) {
            // "Berfomet" (532) e "Gazelle il Re delle Bestie Mitiche"
            // (533) sono 2 carte DIVERSE, non copie della stessa — una
            // vera scelta tra le due tramite searchGraveyardWithChoice,
            // non più la prima trovata.
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return;
            searchGraveyardWithChoice(ctx, ctx.owner, (c) => c.id === 532 || c.id === 533, {
                title: '🦁 Chimera la Bestia Mitica Volante',
                text: 'Scegli quale mostro Special Summonare dal Cimitero.'
            }, (card) => {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) return;
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'graveyard');
                ctx.log(`🦁 Chimera la Bestia Mitica Volante Special Summona ${card.name} dal Cimitero!`);
            });
        }
    });

    // 213 — Dragoness la Cavaliera Malvagia: fusione di "Armaill" (id 97)
    // e "Drago con Scudo" (id 534).
    CardEffects.register(213, {
        fusionMaterials: [97, 534]
    });

    // 268 — Giltia il Cavaliere D.: fusione di "Guardia del Labirinto"
    // (id 535) e "Protettrice del Trono" (id 536).
    CardEffects.register(268, {
        fusionMaterials: [535, 536]
    });

    // 494 — Drago del Tuono a Due Teste: fusione di DUE copie di "Thunder
    // Dragon" (id 537).
    CardEffects.register(494, {
        fusionMaterials: [537, 537]
    });

    // 33 — Il Guardiano del Cancello / Gate Guardian.
    // CORREZIONE di fedeltà: il vero Il Guardiano del Cancello NON si
    // Evoca Fusione tramite "Fusione"/Polymerization (un tentativo
    // precedente in questo file usava fusionMaterials — mai corretto
    // per questa carta) — è Special Summonabile SOLO sacrificando
    // "Sanga del Tuono" (id 538), "Kazejin" (id 324) e "Suijin" (id 71)
    // già scoperti sul proprio Terreno, un'abilità innata dalla mano
    // (stesso schema di Vincoli Recisi/id 415: Special Summon dedicato
    // che sacrifica mostri specifici dal Terreno).
    CardEffects.register(33, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return [538, 324, 71].every((id) => ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === id));
        },
        paySpecialSummonCost(ctx) {
            const field = ctx.field(ctx.owner);
            const indices = [538, 324, 71].map((id) => field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === id));
            if (indices.some((i) => i === -1)) return false;
            indices.forEach((index) => {
                ctx.graveyard(ctx.owner).push(field[index].card);
                field[index] = null;
            });
            ctx.log('🚪 Il Guardiano del Cancello sacrifica Sanga del Tuono, Kazejin e Suijin per essere Special Summonato!');
            return true;
        }
    });

    // 58 — Spadaccino di Fuoco / Flame Swordsman: fusione di "Signore
    // delle Fiamme" (id 539, Flame Manipulator) e "Masaki lo Spadaccino
    // Leggendario" (id 369, Masaki the Legendary Swordsman — CORREZIONE:
    // puntava al vecchio id 540, duplicato di id 369, eliminato).
    // Se questa carta distrugge in battaglia un mostro dell'avversario:
    // infliggi 500 danni al tuo avversario (damageOnBattleDestroy, letto
    // da applyBattleDestroyBonus in actions.js).
    // CORREZIONE di fedeltà: la clausola "infliggi 500 danni se distrugge
    // un mostro in battaglia" era fabbricata (proveniva da una voce
    // duplicata id 524 rimossa in una sessione precedente, erroneamente
    // creduta il vero effetto di questa carta) — verificato che il vero
    // Spadaccino di Fuoco/Flame Swordsman è una carta Fusione VANILLA,
    // nessun effetto attivabile. fusionMaterials resta l'unica proprietà.
    CardEffects.register(58, {
        fusionMaterials: [539, 369]
    });

    // ================================================================
    // 511/512 — Cannone Drago XY / Cannone Drago XYZ (Special Summon
    // dall'Extra Deck BANDENDO materiali, non tramite la Magia "Fusione"
    // — vedi la sezione "Special Summon dall'EXTRA DECK bandendo
    // materiali" in cima a js/engine/duel-engine.js per come funziona). 511 si
    // ottiene bandendo "Cannone Testa X" (id 510) + "Testa di Drago Y"
    // (id 513); 512 bandendo lo stesso 511 già in campo + "Carro Armato
    // Metallico Z" (id 515).
    // Vedi missingEffectNote su id 511/512 in cards.json: manca
    // l'effetto attivabile di entrambe (scarta 1 carta per distruggere 1
    // carta/Magia-Trappola avversaria) — solo la condizione di
    // Evocazione è implementata.
    // ================================================================
    CardEffects.register(511, {
        banishFusionMaterials: [510, 513]
    });
    CardEffects.register(512, {
        banishFusionMaterials: [511, 515]
    });

    // ================================================================
    // 513 — Testa di Drago Y / Y-Dragon Head (Mostro Union — vedi
    // attachUnionMonster/isUnion più in alto in questo file)
    // Effetto Ignition dalla zona Mostro: si aggancia a "Cannone Testa X"
    // (id 510) come Carta Equipaggiamento, dandogli +400 ATK/DEF.
    // ================================================================
    CardEffects.register(513, {
        isUnion: true,
        isEquip: true,
        unionTargetFilter: (c) => c.id === 510,
        canActivate(ctx) {
            return findEquipTarget(ctx, (c) => c.id === 510) !== -1;
        },
        activate(ctx) {
            attachUnionMonster(ctx, (c) => c.id === 510);
        },
        static(ctx) {
            if (!ctx.card.equippedToOwner) return;
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 400, def: e.def + 400 };
        }
    });

    // ================================================================
    // 515 — Carro Armato Metallico Z / Z-Metal Tank (Mostro Union)
    // Effetto Ignition dalla zona Mostro: si aggancia a "Cannone Testa X"
    // (id 510) o "Testa di Drago Y" (id 513), dando +600 ATK/DEF.
    // ================================================================
    CardEffects.register(515, {
        isUnion: true,
        isEquip: true,
        unionTargetFilter: (c) => c.id === 510 || c.id === 513,
        canActivate(ctx) {
            return findEquipTarget(ctx, (c) => c.id === 510 || c.id === 513) !== -1;
        },
        activate(ctx) {
            attachUnionMonster(ctx, (c) => c.id === 510 || c.id === 513);
        },
        static(ctx) {
            if (!ctx.card.equippedToOwner) return;
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 600, def: e.def + 600 };
        }
    });

    // ================================================================
    // 404 — Drago Nero Pece / Pitch-Black Warwolf (Mostro Union — vedi
    // attachUnionMonster/isUnion più in alto in questo file). Nota:
    // "Dark Blade" è presente in questo database come "Lama Oscura" (id
    // 613, vanilla) — la nota precedente ("non presente in questo
    // database") era ormai superata dall'aggiunta di quella carta.
    // Effetto Ignition dalla zona Mostro: si aggancia a Lama Oscura (id
    // 613) come Carta Equipaggiamento, dandogli +400 ATK/DEF. Lo stacco
    // VOLONTARIO ("puoi... staccarla e Special Summonarla scoperta in
    // Posizione di Attacco") ora è implementato: continuous:true +
    // repeatableWhileContinuous:true (stesso meccanismo generico già
    // usato da Offerta Suprema id 559/Pietra del Potere Nero Pece id 751
    // per "riattiva una carta Continua già in campo", NON una nuova
    // capacità del motore) permettono di ricliccarla mentre è già
    // agganciata in zona ST — canActivate/activate distinguono i due
    // stati leggendo ctx.card.equippedToOwner. Aggancio e stacco
    // condividono lo STESSO budget "una volta per turno, durante il tuo
    // Main Phase" (gameState.usedIgnitionThisTurn, per uid — lo stesso
    // che activateCard imposta già da sé per l'aggancio, zona 'monster'):
    // il testo reale è "una volta per turno: equipaggia OPPURE stacca",
    // non due budget separati.
    // ================================================================
    CardEffects.register(404, {
        isUnion: true,
        isEquip: true,
        continuous: true,
        repeatableWhileContinuous: true,
        unionTargetFilter: (c) => c.id === 613,
        canActivate(ctx) {
            if (ctx.card.equippedToOwner) {
                if (ctx.owner !== gameState.currentPlayer) return false;
                if (gameState.phase !== 'main1' && gameState.phase !== 'main2') return false;
                if (gameState.usedIgnitionThisTurn && gameState.usedIgnitionThisTurn[ctx.card.uid]) return false;
                return ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
            }
            return findEquipTarget(ctx, (c) => c.id === 613) !== -1;
        },
        activate(ctx) {
            if (ctx.card.equippedToOwner) {
                gameState.usedIgnitionThisTurn = gameState.usedIgnitionThisTurn || {};
                gameState.usedIgnitionThisTurn[ctx.card.uid] = true;
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) return;
                const stSlot = ctx.stField(ctx.owner)[ctx.index];
                if (!stSlot || stSlot.card.uid !== ctx.card.uid) return;
                ctx.stField(ctx.owner)[ctx.index] = null;
                delete ctx.card.equippedToOwner;
                delete ctx.card.equippedToIndex;
                delete ctx.card.equippedToUid;
                ctx.specialSummon(ctx.owner, ctx.card, slotIndex, 'attack');
                ctx.log('🐺 Drago Nero Pece si stacca da Lama Oscura e torna sul Terreno scoperto in Posizione di Attacco!');
                return;
            }
            attachUnionMonster(ctx, (c) => c.id === 613);
        },
        static(ctx) {
            if (!ctx.card.equippedToOwner) return;
            const t = equippedTarget(ctx);
            const e = gameState.atkDefBonus[t.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[t.uid] = { atk: e.atk + 400, def: e.def + 400 };
        }
    });

    // ================================================================
    // 530 — Clown Stupido / Crass Clown (onPositionChange)
    // Se questa carta, scoperta in Posizione di Difesa, viene messa in
    // Posizione di Attacco: fai ritornare in mano 1 mostro controllato
    // dal tuo avversario.
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (l'ATK più alto,
    // il più minaccioso da rimandare in mano), stesso spirito di Stop
    // Difesa (id 69).
    // ================================================================
    CardEffects.register(530, {
        onPositionChange(ctx) {
            if (ctx.fromPosition !== 'defense' || ctx.toPosition !== 'attack') return;
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let highestAtk = -1;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.attack > highestAtk) { highestAtk = slot.card.attack; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, targetIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const finalSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!finalSlot) return;
            const bouncedName = finalSlot.card.name;
            ctx.returnMonsterToHand(decl.targetOwner, decl.targetIndex);
            ctx.log(`🤡 Clown Stupido rimanda ${bouncedName} in mano!`);
        }
    });

    // ================================================================
    // 531 — Clown del Sogno / Dream Clown (onPositionChange)
    // Se questa carta, scoperta in Posizione di Attacco, viene messa
    // scoperta in Posizione di Difesa: distruggi 1 mostro controllato
    // dal tuo avversario.
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (l'ATK più alto),
    // stesso spirito di Clown Stupido qui sopra.
    // ================================================================
    CardEffects.register(531, {
        onPositionChange(ctx) {
            if (ctx.fromPosition !== 'attack' || ctx.toPosition !== 'defense') return;
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let highestAtk = -1;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.attack > highestAtk) { highestAtk = slot.card.attack; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const decl = ctx.declareTarget(ctx.opponent, targetIndex, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!targetSlot) return;
            const targetName = targetSlot.card.name;
            ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
            ctx.log(`🤡 Clown del Sogno distrugge ${targetName}!`);
        }
    });

    // ================================================================
    // 354 — Signore del Rosso (onCardActivated — Ritual, Evocabile
    // tramite "Trasmigrazione Occhi Rossi", id 414, già implementata)
    // Una volta per turno PER CIASCUN giocatore, quando una carta o un
    // effetto viene attivato (eccetto questa carta): quel giocatore può
    // scegliere come bersaglio 1 mostro sul Terreno e distruggerlo.
    // Separatamente, una volta per turno per ciascun giocatore: quel
    // giocatore può scegliere come bersaglio 1 Magia/Trappola sul
    // Terreno e distruggerla — 4 tracciamenti "una volta per turno"
    // indipendenti in tutto (2 clausole x 2 giocatori).
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (per la distruzione di
    // un mostro, quello scoperto con l'ATK più alto sul campo
    // dell'avversario del beneficiario; per Magia/Trappola, la prima
    // trovata sul suo campo) invece di un vero "puoi scegliere" — se non
    // c'è un bersaglio valido quella clausola semplicemente non scatta,
    // stesso spirito delle altre carte con targeting automatico.
    // ================================================================
    CardEffects.register(354, {
        onCardActivated(ctx) {
            ['player', 'bot'].forEach((side) => {
                const rival = side === 'player' ? 'bot' : 'player';

                const monsterKey = `${ctx.card.uid}:destroyMonster:${side}`;
                if (!ctx.hasUsedOncePerTurn(monsterKey)) {
                    const rivalField = ctx.field(rival);
                    let targetIndex = -1;
                    let highestAtk = -1;
                    rivalField.forEach((slot, i) => {
                        if (slot && !slot.isFaceDown && slot.card.attack > highestAtk) { highestAtk = slot.card.attack; targetIndex = i; }
                    });
                    if (targetIndex !== -1) {
                        // Ogni giocatore sceglie per SÉ (testo reale: "each
                        // player can target..."), non solo il proprietario
                        // di questa carta — ctx.declareTarget userebbe
                        // sempre ctx.owner come sourceOwner, quindi qui
                        // serve un ctx dedicato con owner=side.
                        const sideCtx = DuelEngine.makeContext(side, { card: ctx.card });
                        const decl = sideCtx.declareTarget(rival, targetIndex, { totalTargetCount: 1 });
                        if (decl.allowed) {
                            const finalSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                            if (finalSlot) {
                                const targetName = finalSlot.card.name;
                                ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
                                ctx.markUsedOncePerTurn(monsterKey);
                                ctx.log(`🔥 Signore del Rosso lascia che ${side === 'player' ? 'tu' : 'il bot'} distrugga ${targetName}!`);
                            }
                        }
                    }
                }

                const stKey = `${ctx.card.uid}:destroySpellTrap:${side}`;
                if (!ctx.hasUsedOncePerTurn(stKey)) {
                    const rivalST = ctx.stField(rival);
                    const targetIndex = rivalST.findIndex((slot) => slot !== null);
                    if (targetIndex !== -1) {
                        const targetName = rivalST[targetIndex].card.name;
                        ctx.graveyard(rival).push(rivalST[targetIndex].card);
                        rivalST[targetIndex] = null;
                        ctx.markUsedOncePerTurn(stKey);
                        ctx.log(`🔥 Signore del Rosso lascia che ${side === 'player' ? 'tu' : 'il bot'} distrugga ${targetName}!`);
                    }
                }
            });
        }
    });

    // ================================================================
    // 148 — Scudo Lustro Giallo / Yellow Luster Shield (Magia Continua)
    // Finché scoperta sul Terreno: tutti i mostri che controlli
    // guadagnano 300 DEF.
    // ================================================================
    CardEffects.register(148, {
        continuous: true,
        activate(ctx) { ctx.log(`🛡️ ${ctx.card.name} si scopre sul Terreno.`); },
        static(ctx) {
            ctx.field(ctx.owner).forEach((slot) => {
                if (!slot) return;
                const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[slot.card.uid] = { atk: e.atk, def: e.def + 300 };
            });
        }
    });

    // ================================================================
    // 151 — Coro del Santuario (Magia Terreno)
    // Tutti i mostri in Posizione di Difesa SUL TERRENO (di entrambi i
    // giocatori, non solo i propri) guadagnano 500 DEF. Sfrutta il fix
    // appena aggiunto in duel-engine.js: recomputeStaticEffects() ora
    // richiama static() anche per la Magia Terreno scoperta, non solo
    // per mostri e Magie/Trappole Continue sullo stField.
    // ================================================================
    CardEffects.register(151, {
        continuous: true,
        activate(ctx) { ctx.log(`🎵 ${ctx.card.name} si scopre sul Terreno.`); },
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.position !== 'defense') return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk, def: e.def + 500 };
                });
            });
        }
    });

    // ================================================================
    // 465 — Le Forze A. / A-Forces (Magia Continua)
    // I mostri Tipo Guerriero che controlli guadagnano 200 ATK per ogni
    // mostro Tipo Guerriero o Incantatore che controlli (se stessi inclusi).
    // ================================================================
    CardEffects.register(465, {
        continuous: true,
        activate(ctx) { ctx.log(`⚔️ ${ctx.card.name} si scopre sul Terreno.`); },
        static(ctx) {
            const field = ctx.field(ctx.owner);
            const boosterCount = field.filter((slot) => slot && !slot.isFaceDown && (slot.card.race === 'Guerriero' || slot.card.race === 'Incantatore')).length;
            if (boosterCount === 0) return;
            field.forEach((slot) => {
                if (!slot || slot.isFaceDown || slot.card.race !== 'Guerriero') return;
                const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 200 * boosterCount, def: e.def };
            });
        }
    });

    // ================================================================
    // 227 — Drenaggio di Energia (Trappola Normale)
    // Scegli come bersaglio 1 mostro scoperto che controlli; guadagna
    // 200 ATK/DEF per ogni carta nella mano del tuo avversario, fino a
    // fine turno — vedi ctx.grantTemporaryAtkDefBonus in duel-engine.js
    // (bonus "una tantum", non un buff continuo da static()).
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (l'ATK più alto).
    // ================================================================
    CardEffects.register(227, {
        canActivate(ctx) { return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown); },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            let targetIndex = -1;
            let highestAtk = -1;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.attack > highestAtk) { highestAtk = slot.card.attack; targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const target = field[targetIndex].card;
            const bonus = 200 * ctx.hand(ctx.opponent).length;
            ctx.grantTemporaryAtkDefBonus(target, bonus, bonus);
            ctx.log(`⚡ Drenaggio di Energia dà a ${target.name} +${bonus} ATK/DEF fino a fine turno!`);
        }
    });

    // ================================================================
    // 350 — Rimozione del Limitatore / Limiter Removal (Magia Veloce)
    // Raddoppia l'ATK di tutti i mostri Tipo Macchina che controlli
    // attualmente, fino alla fine di questo turno; durante la End Phase
    // di questo turno, quei mostri vengono distrutti — entrambe le parti
    // usano ctx.grantTemporaryAtkDefBonus(..., destroyAfter: true), che
    // scade da sola in enterEndPhase() (game-flow.js).
    // ================================================================
    CardEffects.register(350, {
        canActivate(ctx) { return ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.race === 'Macchina'); },
        activate(ctx) {
            let count = 0;
            ctx.field(ctx.owner).forEach((slot) => {
                if (!slot || slot.isFaceDown || slot.card.race !== 'Macchina') return;
                const currentAtk = DuelEngine.getEffectiveAtk(slot.card);
                ctx.grantTemporaryAtkDefBonus(slot.card, currentAtk, 0, true);
                count++;
            });
            ctx.log(`💥 Rimozione del Limitatore raddoppia l'ATK di ${count} most${count === 1 ? 'ro' : 'ri'} Macchina, distrutti in End Phase!`);
        }
    });

    // ================================================================
    // 153 — Notte Meccanica (Magia Continua)
    // "Tutti i mostri scoperti sul Terreno sono considerati Tipo Macchina.
    // I mostri Tipo Macchina che controlli guadagnano 500 ATK/DEF; quelli
    // dell'avversario perdono 500 ATK/DEF." Conversione di Tipo vera:
    // static() muta direttamente card.race (stesso pattern di
    // ctx.overrideRaceUntilEndOfTurn/Tribù dei D. id 637, ma senza un
    // punto di scadenza garantito come la End Phase — qui la durata è
    // "finché questa carta resta in campo", quindi il ripristino va
    // agganciato a OGNI modo in cui 153 stessa può lasciare il campo).
    // Il Tipo originale di ogni mostro convertito viene salvato UNA SOLA
    // VOLTA (per uid) su ctx.card._mechanicNightConverted, una mappa
    // persistente sull'istanza di 153 stessa (mai svuotata da
    // recomputeStaticEffects, a differenza di gameState.atkDefBonus) —
    // revertMechanicNightConversions la consuma quando 153 lascia il
    // campo (onSTDestroyed/onBanished, i due percorsi di "lascia il
    // campo" universali per una Magia/Trappola in questo motore — il
    // ritorno in mano resta scoperto, stessa SEMPLIFICAZIONE già
    // accettata per Amplificatore id 92/Festa Isterica id 790, dato che
    // nessuna carta di questo dataset rimanda mai una Magia/Trappola in
    // mano). La seconda clausola (banisci dal Cimitero + scarta per
    // cercare nel Deck) è implementata più sotto
    // (canActivateFromGraveyardMainPhase/activateFromGraveyardMainPhase).
    // ================================================================
    function revertMechanicNightConversions(ctx) {
        const map = ctx.card._mechanicNightConverted;
        if (!map) return;
        ['player', 'bot'].forEach((owner) => {
            ctx.field(owner).forEach((slot) => {
                if (slot && map[slot.card.uid] !== undefined) {
                    slot.card.race = map[slot.card.uid];
                }
            });
        });
        ctx.card._mechanicNightConverted = {};
    }
    CardEffects.register(153, {
        continuous: true,
        activate(ctx) { ctx.log(`⚙️ ${ctx.card.name} si scopre sul Terreno.`); },
        static(ctx) {
            ctx.card._mechanicNightConverted = ctx.card._mechanicNightConverted || {};
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    if (slot.card.race !== 'Macchina' && ctx.card._mechanicNightConverted[slot.card.uid] === undefined) {
                        ctx.card._mechanicNightConverted[slot.card.uid] = slot.card.race;
                    }
                    if (ctx.card._mechanicNightConverted[slot.card.uid] !== undefined) {
                        slot.card.race = 'Macchina';
                    }
                    const delta = owner === ctx.owner ? 500 : -500;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + delta, def: e.def + delta };
                });
            });
        },
        onSTDestroyed: revertMechanicNightConversions,
        onBanished: revertMechanicNightConversions,
        // "Una volta per turno: puoi bandire questa carta dal tuo Cimitero
        // e scartare 1 carta per aggiungere alla mano 1 mostro Macchina
        // TERRA dal Deck" — def.canActivateFromGraveyardMainPhase/
        // activateFromGraveyardMainPhase (fireOwnMainPhase1GraveyardActivations,
        // chiamata da enterMainPhase1() in game-flow.js), stesso schema
        // proattivo già usato da Spada Divina - Lama della Fenice (id 722)
        // e Rito del Drago Oscuro (id 183). La carta da scartare come costo
        // è ora una vera scelta (offerHandDiscardChoice) — bug reale
        // corretto in questa sessione.
        canActivateFromGraveyardMainPhase(ctx) {
            if (ctx.hasUsedOncePerTurn(`153-grave:${ctx.card.uid}`)) return false;
            if (ctx.hand(ctx.owner).length === 0) return false;
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            return Array.isArray(deck) && deck.some((c) => c.type === 'monster' && c.race === 'Macchina' && c.attribute === 'TERRA');
        },
        activateFromGraveyardMainPhase(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const graveIdx = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (graveIdx === -1) return;
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            if (!Array.isArray(deck) || !deck.some((c) => c.type === 'monster' && c.race === 'Macchina' && c.attribute === 'TERRA')) return;
            // Necrovalley (id 890): se blocca il bando, l'intero costo
            // fallisce — niente scarto/ricerca senza il bando reale.
            // markUsedOncePerTurn va DOPO il controllo, altrimenti un
            // tentativo bloccato consumerebbe comunque il "una volta a
            // turno" senza alcun effetto.
            if (!ctx.banishFromGraveyard(ctx.owner, grave[graveIdx])) return;
            ctx.markUsedOncePerTurn(`153-grave:${ctx.card.uid}`);
            offerHandDiscardChoice(ctx, {
                title: '⚙️ Notte Meccanica',
                text: 'Scegli quale carta scartare dalla mano.'
            }, (discarded) => {
                // Vera scelta tra tutti i mostri Macchina/TERRA nel Deck
                // (non solo il primo trovato) tramite searchDeckWithChoice.
                searchDeckWithChoice(ctx, (c) => c.type === 'monster' && c.race === 'Macchina' && c.attribute === 'TERRA', {
                    title: '⚙️ Notte Meccanica',
                    text: 'Scegli quale mostro Macchina/TERRA cercare dal Deck.'
                }, (fetched) => {
                    ctx.hand(ctx.owner).push(fetched);
                    ctx.log(`⚙️ Notte Meccanica si bandisce dal Cimitero: scarti ${discarded.name} e cerchi ${fetched.name}!`);
                });
            });
        }
    });

    // ================================================================
    // 142 — Castello delle Illusioni Oscure (buff continuo, mostro FLIP)
    // Aumenta di 200 punti ATK/DEF tutti i mostri Tipo Zombie (di
    // entrambi i giocatori) finché questa carta resta scoperta in campo
    // — la condizione "FLIP" è già implicita: static() qui sotto viene
    // richiamato SOLO mentre la carta è scoperta (vedi recomputeStaticEffects).
    // Vedi missingEffectNote su id 142 in cards.json: manca l'escalation
    // (+200 aggiuntivi ad ogni Standby Phase, fino al 4° turno) — resta
    // fisso a +200, senza scadenza.
    // ================================================================
    CardEffects.register(142, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown || slot.card.race !== 'Zombie') return;
                    const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                    gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 200, def: e.def + 200 };
                });
            });
        }
    });

    // ================================================================
    // 186 — Jeroid Oscuro (effetto all'Evocazione, riduzione permanente)
    // Quando questa carta viene Evocata: scegli come bersaglio 1 mostro
    // scoperto sul Terreno; perde 800 ATK. A differenza degli altri buff
    // di questo file (bonus ricalcolato ad ogni render tramite
    // gameState.atkDefBonus, valido solo finché la carta sorgente resta
    // in campo), qui la riduzione è permanente e indipendente da Jeroid
    // Oscuro stesso — scrive direttamente su card.attack, sicuro perché
    // ogni copia in gioco è un oggetto proprio (vedi buildDeckFromSpec in
    // cards-db.js), mai condiviso col resto del cardDatabase.
    // SEMPLIFICAZIONE: bersaglio auto-selezionato (l'ATK più alto tra i
    // mostri dell'avversario).
    // ================================================================
    CardEffects.register(186, {
        onSummon(ctx) {
            const field = ctx.field(ctx.opponent);
            let targetIndex = -1;
            let highestAtk = -1;
            field.forEach((slot, i) => {
                if (slot && !slot.isFaceDown && DuelEngine.getEffectiveAtk(slot.card) > highestAtk) { highestAtk = DuelEngine.getEffectiveAtk(slot.card); targetIndex = i; }
            });
            if (targetIndex === -1) return;
            const target = field[targetIndex].card;
            target.attack = Math.max(0, target.attack - 800);
            ctx.log(`👹 Jeroid Oscuro riduce l'ATK di ${target.name} di 800 punti!`);
        }
    });

    // ================================================================
    // 183 — Rito del Drago Oscuro / Dark Dragon Ritual (Magia Rituale)
    // Ritual Summon di "Paladino del Drago Oscuro" (id 855, aggiunta ora:
    // la nota precedente la dava per assente dal database, corretto qui).
    // Stesso schema di Rito dell'Illusione Nera (id 116): sacrifica in
    // automatico dal proprio Terreno i mostri con Livello più alto finché
    // il totale richiesto (4) non è raggiunto, invece di lasciar
    // scegliere — stessa SEMPLIFICAZIONE dichiarata lì (manca la scelta
    // manuale e il sacrificio da mano/Terreno avversario).
    // ================================================================
    // CORREZIONE di fedeltà: il testo salvato già diceva "dal Terreno o
    // dalla mano", ma il codice sacrificava SOLO dal Terreno — bug reale
    // (testo e comportamento disallineati), corretto riusando
    // performRitualTribute/maxRitualTributeLevel (vicino a
    // attachUnionMonster in questo file), stesso schema di Rito del
    // Guerriero Nero/id 56.
    // "Durante la tua Main Phase, tranne il turno in cui questa carta è
    // finita nel Cimitero: puoi bandirla per cercare 1 Magia/Trappola
    // 'Occhi Rossi' nel Deck" — stesso nuovo aggancio PROATTIVO di Spada
    // Divina - Lama della Fenice (id 722, vedi lì).
    // card._sentToGraveyardOnTurn timbrato qui sotto, al momento in cui
    // questa carta finisce DAVVERO nel Cimitero (non prima): activateCard
    // (duel-engine.js) manda una Magia Normale al Cimitero PRIMA di
    // chiamare activate(ctx), quindi ctx.card è già lo stesso oggetto che
    // troveremo nel Cimitero.
    CardEffects.register(183, {
        canActivate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 855);
            if (handIndex === -1) return false;
            return maxRitualTributeLevel(ctx, handIndex) >= 4;
        },
        activate(ctx) {
            ctx.card._sentToGraveyardOnTurn = gameState.turn;
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 855);
            if (handIndex === -1) return;
            performRitualTribute(ctx, 4, handIndex);
            const hand = ctx.hand(ctx.owner);
            const finalHandIndex = hand.findIndex((c) => c.id === 855);
            if (finalHandIndex === -1) return;
            const [ritualCard] = hand.splice(finalHandIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Paladino del Drago Oscuro finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('🐉 Rito del Drago Oscuro evoca Paladino del Drago Oscuro!');
        },
        canActivateFromGraveyardMainPhase(ctx) {
            if (ctx.card._sentToGraveyardOnTurn === gameState.turn) return false;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            return Array.isArray(deck) && deck.some((c) => (c.type === 'spell' || c.type === 'trap') && c.name && c.name.includes('Occhi Rossi'));
        },
        activateFromGraveyardMainPhase(ctx) {
            const grave = ctx.graveyard(ctx.owner);
            const cardIndex = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (cardIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            const isRedEyesSpellTrap = (c) => (c.type === 'spell' || c.type === 'trap') && c.name && c.name.includes('Occhi Rossi');
            if (!Array.isArray(deck) || !deck.some(isRedEyesSpellTrap)) return;
            if (!ctx.banishFromGraveyard(ctx.owner, grave[cardIndex])) return;
            searchDeckWithChoice(ctx, isRedEyesSpellTrap, {
                title: '🐉 Rito del Drago Oscuro',
                text: 'Scegli quale carta "Occhi Rossi" aggiungere alla mano dal Deck.'
            }, (card) => {
                ctx.hand(ctx.owner).push(card);
                ctx.log(`🐉 Rito del Drago Oscuro si bandisce dal Cimitero: aggiunge ${card.name} alla mano dal Deck!`);
            });
        }
    });

    // ================================================================
    // 187 — Rito della Magia Oscura / Dark Magic Ritual (Magia Rituale)
    // Ritual Summon di "Mago del Caos Nero" (id 854, aggiunta ora: la
    // nota precedente la dava per assente dal database, corretto qui).
    // Stesso schema di Rito del Drago Oscuro (id 183) qui sopra, ma
    // Livello totale richiesto 8 invece di 4.
    // ================================================================
    CardEffects.register(187, {
        canActivate(ctx) {
            const hasRitualMonster = ctx.hand(ctx.owner).some((c) => c.id === 854);
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
            const handIndex = hand.findIndex((c) => c.id === 854);
            if (handIndex === -1) return;
            const [ritualCard] = hand.splice(handIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Mago del Caos Nero finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack');
            ctx.log('🌑 Rito della Magia Oscura evoca Mago del Caos Nero!');
        }
    });

    // ================================================================
    // 854 — Mago del Caos Nero / Dark Magician of Chaos: Evocabile
    // Rituale solo tramite "Rito della Magia Oscura" (id 187, qui sopra —
    // GIÀ IMPLEMENTATA). Qui serve solo il divieto di Evocazione
    // Normale/Set e di Special Summon per ogni altra via
    // (cannotNormalSummon/cannotBeSpecialSummoned — stesso schema di 413).
    // ================================================================
    CardEffects.register(854, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 855 — Paladino del Drago Oscuro / Paladin of Dark Dragon
    // Effetto Ignition dalla zona Mostro, una volta per turno: sacrifica
    // se stesso per Special Summonare 1 mostro "Occhi Rossi" (Red-Eyes)
    // dalla mano o dal Deck — priorità alla mano, poi il Livello più
    // alto nel Deck. Nessuna carta di questo database si chiama "Occhi
    // Rossi B. Chick" (l'unica esclusione del testo reale), quindi il
    // filtro sull'id non esclude nulla in pratica.
    // "A inizio Damage Step, se attacca un mostro in Posizione di
    // Difesa: distruggilo": def.alwaysDestroysDefensePositionTarget
    // (resolveBattleDamage, actions.js) — a differenza di
    // instantlyDestroysFaceDownDefender (id 398/718), qui il calcolo
    // danni si applica normalmente (l'attaccante subisce comunque il
    // rimbalzo se ATK < DEF), solo la distruzione è forzata.
    // ================================================================
    CardEffects.register(855, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        alwaysDestroysDefensePositionTarget: true,
        canActivate(ctx) {
            if (ctx.hasUsedOncePerTurn(`855:${ctx.card.uid}`)) return false;
            const inHand = ctx.hand(ctx.owner).some((c) => c.race === 'Drago' && c.name.includes('Occhi Rossi'));
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inDeck = Array.isArray(deck) && deck.some((c) => c.race === 'Drago' && c.name.includes('Occhi Rossi'));
            return inHand || inDeck;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`855:${ctx.card.uid}`);
            const ownIndex = ctx.index;
            ctx.field(ctx.owner)[ownIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.race === 'Drago' && c.name.includes('Occhi Rossi'));
            let redEyesCard;
            let fromZone;
            if (handIndex !== -1) {
                [redEyesCard] = hand.splice(handIndex, 1);
                fromZone = 'hand';
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = gameState[deckKey];
                let bestIndex = -1;
                let bestLevel = -1;
                deck.forEach((c, i) => {
                    if (c.race === 'Drago' && c.name.includes('Occhi Rossi') && (c.level || 0) > bestLevel) { bestLevel = c.level || 0; bestIndex = i; }
                });
                if (bestIndex === -1) return;
                [redEyesCard] = deck.splice(bestIndex, 1);
                gameState[countKey] = deck.length;
                fromZone = 'deck';
            }
            const emptySlot = ctx.findEmptyMonsterSlot(ctx.owner);
            const slotIndex = emptySlot !== -1 ? emptySlot : ownIndex;
            ctx.specialSummon(ctx.owner, redEyesCard, slotIndex, 'attack', fromZone);
            ctx.log(`🐉 Paladino del Drago Oscuro si sacrifica per Special Summonare ${redEyesCard.name}!`);
        }
    });

    // ================================================================
    // 856 — Cavaliere Mago Nero / Dark Magician Knight
    // Non può essere Evocato Normalmente/Set, Special Summonabile solo
    // tramite Titolo del Cavaliere (id 329 qui sotto). Quando Special
    // Summonato: distrugge 1 carta dell'avversario, ora a SCELTA del
    // giocatore (mostri e retrocampo insieme, in un'unica lista).
    // I candidati restano ORDINATI come li sceglieva prima da sola —
    // mostri per ATK decrescente, poi le Magie/Trappole scoperte — perché
    // il bot prende sempre il primo della lista: così continua a fare la
    // stessa mossa sensata di prima invece della prima casella occupata.
    // ================================================================
    CardEffects.register(856, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true,
        onSpecialSummon(ctx) {
            const mostri = collectFieldTargets(ctx, { zone: 'monster', owner: 'opponent', includiCoperte: true })
                .sort((a, b) => {
                    const atk = (v) => (v.slot.isFaceDown ? 0 : DuelEngine.getEffectiveAtk(v.card));
                    return atk(b) - atk(a);
                });
            const retrocampo = collectFieldTargets(ctx, { zone: 'st', owner: 'opponent' });
            const candidati = [...mostri, ...retrocampo];
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '⚔️ Cavaliere Mago Nero',
                text: 'Scegli quale carta dell\'avversario distruggere.'
            }, (scelto) => {
                if (scelto.zone === 'st') {
                    const nome = scelto.card.name;
                    ctx.destroySpellTrap(scelto.owner, scelto.index);
                    ctx.log(`⚔️ Cavaliere Mago Nero, appena Special Summonato, distrugge ${nome}!`);
                    return;
                }
                const decl = ctx.declareTarget(scelto.owner, scelto.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!targetSlot) return;
                const name = targetSlot.isFaceDown ? 'una carta coperta' : targetSlot.card.name;
                ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
                ctx.log(`⚔️ Cavaliere Mago Nero, appena Special Summonato, distrugge ${name}!`);
            });
        }
    });

    // 857 — Wall Shadow: non può essere Evocato Normalmente/Set, Special Summonabile solo tramite Labirinto Magico (id 364).
    CardEffects.register(857, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 329 — Titolo del Cavaliere / Knight's Title (Magia Normale)
    // Sacrifica 1 "Mago Nero" (id 2) scoperto; Special Summon 1
    // "Cavaliere Mago Nero" (id 856, aggiunta ora: la nota precedente la
    // dava per assente dal database, corretto qui) dalla mano, dal Deck
    // o dal Cimitero — stesso schema "prima mano, poi Deck, poi
    // Cimitero" già usato altrove in questo file (es. Dado di Evocazione
    // id 460).
    // ================================================================
    CardEffects.register(329, {
        canActivate(ctx) {
            const hasDarkMagician = ctx.field(ctx.owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
            if (!hasDarkMagician) return false;
            const inHand = ctx.hand(ctx.owner).some((c) => c.id === 856);
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const inDeck = Array.isArray(deck) && deck.some((c) => c.id === 856);
            const inGrave = ctx.graveyard(ctx.owner).some((c) => c.id === 856);
            return inHand || inDeck || inGrave;
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const fieldIndex = field.findIndex((slot) => slot && !slot.isFaceDown && slot.card.id === 2);
            if (fieldIndex === -1) return;
            ctx.graveyard(ctx.owner).push(field[fieldIndex].card);
            field[fieldIndex] = null;

            const hand = ctx.hand(ctx.owner);
            const handIndex = hand.findIndex((c) => c.id === 856);
            let knightCard;
            let fromZone;
            if (handIndex !== -1) {
                [knightCard] = hand.splice(handIndex, 1);
                fromZone = 'hand';
            } else {
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
                const deck = gameState[deckKey];
                const deckIndex = Array.isArray(deck) ? deck.findIndex((c) => c.id === 856) : -1;
                if (deckIndex !== -1) {
                    [knightCard] = deck.splice(deckIndex, 1);
                    gameState[countKey] = deck.length;
                    fromZone = 'deck';
                } else {
                    const grave = ctx.graveyard(ctx.owner);
                    const graveIndex = grave.findIndex((c) => c.id === 856);
                    if (graveIndex === -1) return;
                    [knightCard] = grave.splice(graveIndex, 1);
                    fromZone = 'graveyard';
                }
            }
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(knightCard);
                ctx.log('⚠️ Il Terreno è pieno: Cavaliere Mago Nero finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, knightCard, slotIndex, 'attack', fromZone);
            ctx.log('⚔️ Titolo del Cavaliere Special Summona Cavaliere Mago Nero!');
        }
    });

    // ================================================================
    // 244 — Crepuscolo a Cinque Stelle / Five Star Twilight (Magia Normale)
    // Se l'unico mostro che controlli è di Livello 5: sacrificalo; Special
    // Summon i 5 "fratelli Kuriboh" (Kuriboh id 22 già presente, più
    // Kuribah/Kuribee/Kuriboo/Kuribeh id 859-862 aggiunte ora — la nota
    // precedente li dava per assenti dal database, corretto qui) da mano,
    // Deck e/o Cimitero.
    // Vedi missingEffectNote su id 244 in cards.json: manca "non possono
    // essere sacrificati per un'Evocazione Tributo" — richiederebbe un
    // marcatore per-ISTANZA
    // (non per-carta: Kuriboh id 22 resta normalmente sacrificabile in
    // ogni altro contesto), diverso dal flag def.cannotBeTributed
    // esistente in questo motore (quello si applica a OGNI copia di una
    // carta, non solo a quelle evocate da questo specifico effetto).
    // ================================================================
    CardEffects.register(244, {
        canActivate(ctx) {
            const field = ctx.field(ctx.owner).filter((slot) => slot);
            if (field.length !== 1 || field[0].isFaceDown || field[0].card.level !== 5) return false;
            const kuribohIds = [22, 859, 860, 861, 862];
            const hand = ctx.hand(ctx.owner);
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'] || [];
            const grave = ctx.graveyard(ctx.owner);
            return kuribohIds.every((id) => hand.some((c) => c.id === id) || deck.some((c) => c.id === id) || grave.some((c) => c.id === id));
        },
        activate(ctx) {
            const field = ctx.field(ctx.owner);
            const ownIndex = field.findIndex((slot) => slot);
            if (ownIndex === -1) return;
            ctx.graveyard(ctx.owner).push(field[ownIndex].card);
            field[ownIndex] = null;

            const kuribohIds = [22, 859, 860, 861, 862];
            const hand = ctx.hand(ctx.owner);
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            const grave = ctx.graveyard(ctx.owner);

            kuribohIds.forEach((id) => {
                let card;
                let fromZone;
                const handIndex = hand.findIndex((c) => c.id === id);
                if (handIndex !== -1) {
                    [card] = hand.splice(handIndex, 1);
                    fromZone = 'hand';
                } else {
                    const deckIndex = Array.isArray(deck) ? deck.findIndex((c) => c.id === id) : -1;
                    if (deckIndex !== -1) {
                        [card] = deck.splice(deckIndex, 1);
                        gameState[countKey] = deck.length;
                        fromZone = 'deck';
                    } else {
                        const graveIndex = grave.findIndex((c) => c.id === id);
                        if (graveIndex === -1) return;
                        [card] = grave.splice(graveIndex, 1);
                        fromZone = 'graveyard';
                    }
                }
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) { grave.push(card); return; }
                ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', fromZone);
                // CORREZIONE di fedeltà: "non possono essere sacrificati per
                // un'Evocazione Tributo" — per QUESTA istanza soltanto (un
                // Kuriboh normale resta sacrificabile in ogni altro
                // contesto), tramite gameState.cannotBeTributedUids
                // (per-uid, costruito per Controllo Mentale/id 130).
                gameState.cannotBeTributedUids = gameState.cannotBeTributedUids || new Set();
                gameState.cannotBeTributedUids.add(card.uid);
            });
            ctx.log('🐿️ Crepuscolo a Cinque Stelle Special Summona i 5 fratelli Kuriboh!');
        }
    });

    // ================================================================
    // 363 — Cappelli Magici / Magical Hats (Trappola Normale)
    // Durante la Battle Phase dell'avversario: sceglie 2 Magie/Trappole
    // dal proprio Deck e 1 proprio mostro già in campo, li mette (o
    // rimette) tutti coperti in Posizione di Difesa — le 2 pescate dal
    // Deck diventano temporaneamente Mostri Normali 0/0 (stesso principio
    // di mutazione diretta dell'istanza in campo già usato per Roccaforte
    // la Fortezza Mobile, id 849) — e vengono distrutte alla fine della
    // Battle Phase (gameState.pendingMagicalHatsDestroy, processato in
    // enterEndPhase()/game-flow.js: Cappelli Magici stessa è già finita
    // nel Cimitero, Trappola Normale non Continua, quindi non può
    // reagire da sola con un proprio onBattlePhaseEnd — stesso schema di
    // gameState.pendingUltimateTurnCheck per id 341).
    // SEMPLIFICAZIONE: nessuna vera "mescolata" delle 3 caselle (il
    // proprio mostro resta nella propria casella, le 2 carte pescate
    // vanno in caselle libere) — nel vero gioco la mescolata serve solo a
    // confondere un avversario UMANO su quale carta coperta sia quale
    // (bluff), stesso ragionamento già applicato a Ombre Mutevoli (id
    // 769): qui il contenuto delle carte coperte non è comunque mai
    // mostrato all'avversario, quindi non ha alcun equivalente
    // meccanico significativo da implementare oltre a quanto già fatto.
    // ================================================================
    CardEffects.register(363, {
        canActivate(ctx) {
            if (gameState.currentPlayer === ctx.owner) return false;
            if (gameState.phase !== 'battle') return false;
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            const qualifyingDeckCards = Array.isArray(deck) ? deck.filter((c) => c.type === 'spell' || c.type === 'trap').length : 0;
            if (qualifyingDeckCards < 2) return false;
            const hasOwnMonster = ctx.field(ctx.owner).some((s) => s);
            const emptySlots = ctx.field(ctx.owner).filter((s) => !s).length;
            return hasOwnMonster && emptySlots >= 2;
        },
        activate(ctx) {
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            const chosen = [];
            for (let i = deck.length - 1; i >= 0 && chosen.length < 2; i--) {
                if (deck[i].type === 'spell' || deck[i].type === 'trap') chosen.push(deck.splice(i, 1)[0]);
            }
            if (chosen.length < 2) {
                deck.push(...chosen);
                return;
            }
            gameState[countKey] = deck.length;

            const field = ctx.field(ctx.owner);
            const monsterIndex = field.findIndex((s) => s);
            if (monsterIndex === -1) {
                deck.push(...chosen);
                gameState[countKey] = deck.length;
                return;
            }
            field[monsterIndex].isFaceDown = true;
            field[monsterIndex].position = 'defense';

            const pendingDestroy = [];
            chosen.forEach((card) => {
                const slotIndex = field.findIndex((s) => !s);
                if (slotIndex === -1) {
                    ctx.graveyard(ctx.owner).push(card);
                    return;
                }
                card.type = 'monster';
                card.level = 1;
                card.attack = 0;
                card.defense = 0;
                field[slotIndex] = { card: card, position: 'defense', isFaceDown: true, hasAttacked: false, canChangePosition: false };
                pendingDestroy.push(card.uid);
            });
            gameState.pendingMagicalHatsDestroy = gameState.pendingMagicalHatsDestroy || {};
            gameState.pendingMagicalHatsDestroy[ctx.owner] = (gameState.pendingMagicalHatsDestroy[ctx.owner] || []).concat(pendingDestroy);
            ctx.log("🎩 Cappelli Magici mette coperti in Difesa 2 carte del Deck travestite da Mostri e il proprio mostro!");
        }
    });

    // ================================================================
    // 364 — Labirinto Magico / Magical Labyrinth (Magia Equipaggiamento)
    // Equipaggiabile solo a "Muro del Labirinto" (id 337). Puoi
    // sacrificare il mostro equipaggiato per Special Summonare "Wall
    // Shadow" (id 857, aggiunta ora — la nota precedente la dava per
    // assente dal database, corretto qui) dal Deck. def.repeatableWhileContinuous
    // (introdotto per Offerta Suprema id 559): la stessa activate()
    // gestisce sia la prima attivazione (aggancio a Muro del Labirinto,
    // come ogni altro Equip via findEquipTarget/attachEquip) sia il
    // sacrificio successivo — distinti da ctx.card.equippedToOwner (non
    // ancora impostato = prima attivazione).
    // ================================================================
    CardEffects.register(364, {
        continuous: true,
        isEquip: true,
        repeatableWhileContinuous: true,
        canActivate(ctx) {
            if (!ctx.card.equippedToOwner) return findEquipTarget(ctx, (c) => c.id === 337) !== -1;
            const deck = gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            return Array.isArray(deck) && deck.some((c) => c.id === 857) && ctx.findEmptyMonsterSlot(ctx.owner) !== -1;
        },
        activate(ctx) {
            if (!ctx.card.equippedToOwner) {
                const i = findEquipTarget(ctx, (c) => c.id === 337);
                if (i !== -1) attachEquip(ctx, i);
                return;
            }
            const target = equippedTarget(ctx);
            const targetOwner = ctx.card.equippedToOwner;
            const targetIndex = ctx.card.equippedToIndex;
            ctx.field(targetOwner)[targetIndex] = null;
            ctx.graveyard(targetOwner).push(target);
            ctx.stField(ctx.owner)[ctx.index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);

            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const countKey = ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount';
            const deck = gameState[deckKey];
            const deckIndex = deck.findIndex((c) => c.id === 857);
            if (deckIndex === -1) return;
            const [wallShadow] = deck.splice(deckIndex, 1);
            gameState[countKey] = deck.length;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(wallShadow); return; }
            ctx.specialSummon(ctx.owner, wallShadow, slotIndex, 'attack', 'deck');
            ctx.log('🧱 Labirinto Magico sacrifica il mostro equipaggiato per Special Summonare Wall Shadow!');
        }
    });

    // ================================================================
    // EFFETTI COMPLETATI GRAZIE ALLE NUOVE CAPACITÀ DEL MOTORE (batch 1):
    // "prendi/dai il controllo" (ctx.takeControl, vedi ACTIONS.takeControl
    // in duel-engine.js), danno perforante (def.piercing, controllato in
    // resolveBattleDamage/actions.js), Flip Summon manuale che ora scatena
    // ON_FLIP (changeMonsterPosition/actions.js), Exodia nel Cimitero
    // (hasExodiaInGraveyard, game-flow.js) — più alcune carte che erano
    // segnate come bloccate ma in realtà erano già coperte da meccanismi
    // esistenti (buff continui via static()/gameState.atkDefBonus, buff
    // "fino a fine turno" via ctx.grantTemporaryAtkDefBonus, trigger
    // ricorrenti via onStandbyPhase/onEndPhase). Ogni missingEffectNote
    // corrispondente è stata rimossa da data/cards.json.
    // ================================================================

    // 147 — Cambio di Cuore / Change of Heart: prendi il controllo di 1
    // mostro scoperto avversario fino alla tua End Phase. Riferimento
    // canonico del meccanismo "prendi il controllo" per le altre carte
    // qui sotto.
    CardEffects.register(147, {
        declaredTargeting: { count: 1, cardType: 'monster' },
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            // "Scegli come bersaglio 1 mostro": con due o più mostri
            // scoperti di là, quale rubare lo decide il giocatore — prima
            // si prendeva il primo della fila.
            const candidati = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown) candidati.push({ owner: ctx.opponent, index, card: slot.card });
            });
            chooseFieldMonsterTarget(ctx, candidati, {
                title: '💫 Cambio di Cuore',
                text: 'Scegli quale mostro avversario prendere sotto controllo.'
            }, (scelta) => {
                const decl = ctx.declareTarget(scelta.owner, scelta.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!targetSlot) return;
                const stolen = targetSlot.card;
                if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex)) {
                    ctx.log(`💫 ${ctx.owner === 'player' ? 'Hai preso' : 'Il bot ha preso'} il controllo di ${stolen.name} fino alla End Phase!`);
                }
            });
        }
    });

    // 205 — Doppia Presa Magica: sacrifica 2 mostri propri, poi prendi il
    // controllo di 2 mostri scoperti avversari fino alla tua End Phase.
    // SEMPLIFICAZIONE: bersagli auto-selezionati (i primi trovati, stesso
    // stile di selezione automatica già usato altrove in questo file).
    CardEffects.register(205, {
        canActivate(ctx) {
            const ownCount = ctx.field(ctx.owner).filter((s) => s).length;
            const oppTargets = ctx.field(ctx.opponent).filter((s) => s && !s.isFaceDown).length;
            return ownCount >= 2 && oppTargets >= 2;
        },
        activate(ctx) {
            let sacrificed = 0;
            ctx.field(ctx.owner).forEach((slot, index) => {
                if (sacrificed >= 2 || !slot) return;
                ctx.destroyMonster(ctx.owner, index);
                sacrificed++;
            });
            let taken = 0;
            for (let i = 0; i < ctx.field(ctx.opponent).length && taken < 2; i++) {
                const slot = ctx.field(ctx.opponent)[i];
                if (slot && !slot.isFaceDown) {
                    const decl = ctx.declareTarget(ctx.opponent, i, { totalTargetCount: 2 });
                    if (!decl.allowed) continue;
                    const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                    if (!targetSlot) continue;
                    const name = targetSlot.card.name;
                    if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex)) {
                        ctx.log(`💫 Preso il controllo di ${name}!`);
                        taken++;
                    }
                }
            }
        }
    });

    // 226 — Controllore del Nemico: cambia Posizione a 1 mostro scoperto
    // avversario, OPPURE sacrifica 1 mostro proprio per prenderne il
    // controllo. SEMPLIFICAZIONE: nessuna scelta a due vie nella UI di
    // questo motore — se può sacrificare un proprio mostro lo fa (l'opzione
    // più forte), altrimenti si limita a cambiare Posizione.
    CardEffects.register(226, {
        declaredTargeting: { count: 1, cardType: 'monster' },
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            // Su QUALE mostro avversario agire lo sceglie il giocatore.
            // Resta la SEMPLIFICAZIONE dichiarata qui sopra sul RAMO (se
            // può sacrificare, prende il controllo): quella è una scelta
            // fra due effetti diversi, non fra bersagli, e servirebbe una
            // UI a due vie che questo motore non ha.
            const candidati = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown) candidati.push({ owner: ctx.opponent, index, card: slot.card });
            });
            chooseFieldMonsterTarget(ctx, candidati, {
                title: '🎮 Controllore del Nemico',
                text: 'Scegli su quale mostro avversario agire.'
            }, (scelta) => attivaControlloreDelNemico(ctx, scelta));
        }
    });

    /** Corpo di Controllore del Nemico (id 226), a bersaglio già scelto. */
    function attivaControlloreDelNemico(ctx, scelta) {
        {
            const decl = ctx.declareTarget(scelta.owner, scelta.index, { totalTargetCount: 1 });
            if (!decl.allowed) return;
            const ownIndex = ctx.field(ctx.owner).findIndex((s) => s);
            if (ownIndex !== -1) {
                const target = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!target) return;
                const name = target.card.name;
                ctx.destroyMonster(ctx.owner, ownIndex);
                if (ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex)) {
                    ctx.log(`💫 Preso il controllo di ${name}!`);
                }
            } else {
                const target = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!target) return;
                const newPosition = target.position === 'attack' ? 'defense' : 'attack';
                ctx.changePosition(decl.targetOwner, decl.targetIndex, newPosition);
                ctx.log(`🔄 ${target.card.name} cambia Posizione!`);
            }
        }
    }

    // 388 — Scatola Mistica: distruggi 1 mostro avversario, poi dai il
    // controllo di 1 tuo mostro all'avversario fino alla SUA End Phase
    // (percorso "inverso" di ctx.takeControl rispetto alle altre carte qui
    // sopra — stesso identico helper, owner/fromOwner invertiti). La
    // distruzione è un vero targeting in stile Yu-Gi-Oh (sceglie 1 mostro
    // specifico), quindi passa da ctx.declareTarget(...) — vedi
    // declareCardEffectTarget in duel-engine.js — così Signore dei D. (id
    // 353, protegge i Draghi), Gran Scudo Gardna (id 115, l'unica carta
    // coperta) e Specchietto della Fata (id 235, ridirige) possono
    // davvero reagire a QUESTA carta, non solo in test sintetici isolati.
    CardEffects.register(388, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s) && ctx.field(ctx.owner).some((s) => s);
        },
        activate(ctx) {
            // DUE scelte in sequenza, come dice il testo: prima quale
            // mostro avversario distruggere, poi quale dei propri cedergli.
            // La seconda va dentro la callback della prima — i picker sono
            // asincroni, e aprirle insieme mostrerebbe due liste in
            // contemporanea.
            const suoi = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot) suoi.push({ owner: ctx.opponent, index, card: slot.card });
            });
            const cediUnProprioMostro = () => {
                const miei = [];
                ctx.field(ctx.owner).forEach((slot, index) => {
                    if (slot) miei.push({ owner: ctx.owner, index, card: slot.card });
                });
                chooseFieldMonsterTarget(ctx, miei, {
                    title: '🎁 Scatola Mistica',
                    text: 'Scegli quale TUO mostro cedere in cambio all\'avversario.'
                }, (mio) => {
                    const slot = ctx.field(ctx.owner)[mio.index];
                    if (!slot) return;
                    const name = slot.card.name;
                    if (ctx.takeControl(ctx.opponent, ctx.owner, mio.index)) {
                        ctx.log(`⚠️ ${name} passa sotto il controllo dell'avversario!`);
                    }
                });
            };
            if (suoi.length === 0) { cediUnProprioMostro(); return; }
            chooseFieldMonsterTarget(ctx, suoi, {
                title: '🎁 Scatola Mistica',
                text: 'Scegli quale mostro avversario distruggere.'
            }, (suo) => {
                const decl = ctx.declareTarget(suo.owner, suo.index, { totalTargetCount: 1 });
                if (decl.allowed) ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
                cediUnProprioMostro();
            });
        }
    });

    // 405 — Anima Oscura Posseduta: effetto Ignition (sacrifica questa
    // carta scoperta; prendi il controllo di tutti i mostri scoperti di
    // Livello 3 o inferiore dell'avversario).
    CardEffects.register(405, {
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown && s.card.level <= 3);
        },
        activate(ctx) {
            ctx.destroyMonster(ctx.owner, ctx.index);
            const targets = [];
            ctx.field(ctx.opponent).forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.level <= 3) targets.push(i);
            });
            targets.forEach((i) => {
                const slot = ctx.field(ctx.opponent)[i];
                if (slot) {
                    const name = slot.card.name;
                    if (ctx.takeControl(ctx.owner, ctx.opponent, i)) ctx.log(`💫 Preso il controllo di ${name}!`);
                }
            });
        }
    });

    // ================================================================
    // 406 — Pumpking il Re dei Fantasmi / Pumpking the King of Ghosts
    // Guadagna 100 ATK/DEF finché "Castello delle Illusioni Oscure" (id
    // 142, già presente — CORREZIONE: la nota precedente affermava
    // erroneamente che "Castle of Dark Illusions" non fosse presente in
    // questo database) è sul Terreno. Inoltre, durante la propria
    // Standby Phase mentre Castello resta scoperto: +100 ATK/DEF
    // ulteriori, fino a un massimo di 4 volte (card.pumpkingStacks).
    // ================================================================
    CardEffects.register(406, {
        static(ctx) {
            const castleOnField = ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 142));
            if (!castleOnField) return;
            const stacks = Math.min(ctx.card.pumpkingStacks || 0, 4);
            const bonus = 100 + stacks * 100;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + bonus, def: e.def + bonus };
        },
        onStandbyPhase(ctx) {
            const castleOnField = ['player', 'bot'].some((owner) => ctx.field(owner).some((slot) => slot && !slot.isFaceDown && slot.card.id === 142));
            if (!castleOnField) return;
            if ((ctx.card.pumpkingStacks || 0) >= 4) return;
            ctx.card.pumpkingStacks = (ctx.card.pumpkingStacks || 0) + 1;
            ctx.log(`👻 Pumpking il Re dei Fantasmi guadagna altri 100 ATK/DEF grazie a Castello delle Illusioni Oscure (${ctx.card.pumpkingStacks}/4)!`);
        }
    });

    // 82 — Parshath il Cavaliere Alato: danno perforante contro mostri in
    // Posizione di Difesa (vedi def.piercing, controllato in
    // resolveBattleDamage/actions.js). CORREZIONE di fedeltà: aggiunta
    // la clausola mancante "quando infligge danno da battaglia: pesca 1
    // carta" — onDealsBattleDamage esiste già come aggancio generico
    // (usato ad es. da Folletto della Fiamma Furente id 681/Stregone
    // Mascherato Toon id 483), il commento originale che ne negava
    // l'esistenza era superato.
    CardEffects.register(82, {
        piercing: true,
        onDealsBattleDamage(ctx) {
            ctx.drawCards(ctx.owner, 1);
            ctx.log('⚔️ Parshath il Cavaliere Alato pesca 1 carta!');
        }
    });

    // 360 — Bestia Spada Impazzita: danno perforante contro mostri in
    // Posizione di Difesa.
    CardEffects.register(360, { piercing: true });

    // 454 — Drago Lancia: danno perforante contro mostri in Posizione di
    // Difesa. CORREZIONE di fedeltà: aggiunta la clausola mancante "se
    // attacca, viene cambiata in Posizione di Difesa" riusando
    // def.forcesDefenseAfterAttack (già esistente per Forza d'Attacco
    // Goblin id 269) — stessa SEMPLIFICAZIONE di timing già accettata lì
    // (applicata subito, non esattamente "a fine Damage Step").
    CardEffects.register(454, { piercing: true, forcesDefenseAfterAttack: true });

    // 125 — Cinghiale Soldato: -1000 ATK continuo se l'avversario
    // controlla almeno un mostro. Vedi missingEffectNote su id 125 in
    // cards.json: manca "evocabile SOLO tramite Flip Summon, altrimenti
    // distrutta".
    CardEffects.register(125, {
        static(ctx) {
            if (!ctx.field(ctx.opponent).some((s) => s)) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk - 1000, def: e.def };
        }
    });

    // 315 — Bomba a Tempo: durante la tua Standby Phase, sacrifica questa
    // carta e distruggi tutti gli altri tuoi mostri, infliggendo danno
    // pari a metà del loro ATK totale (esclusa questa carta) — usa
    // onStandbyPhase (firePhaseTrigger già lo scatena solo nella TUA
    // Standby Phase, esattamente "durante la tua Standby Phase" del testo
    // reale, senza bisogno di tracciare separatamente "è stata Flip
    // Summonata": può essere scoperta sul Terreno solo dopo esserlo stata).
    CardEffects.register(315, {
        onStandbyPhase(ctx) {
            const ownField = ctx.field(ctx.owner);
            let totalAtk = 0;
            ownField.forEach((slot, i) => {
                if (slot && i !== ctx.slotIndex) {
                    totalAtk += DuelEngine.getEffectiveAtk(slot.card);
                    ctx.destroyMonster(ctx.owner, i);
                }
            });
            ctx.destroyMonster(ctx.owner, ctx.slotIndex);
            const damage = Math.floor(totalAtk / 2);
            ctx.dealDamage(ctx.opponent, damage);
            ctx.log(`💣 Bomba a Tempo esplode, infliggendo ${damage} danni!`);
        }
    });

    // 161 — Patto con Exodia: richiede tutti e 5 i pezzi di Exodia nel
    // Cimitero (vedi hasExodiaInGraveyard in game-flow.js); Special Summon
    // di "Exodia Necross" (id 230) dalla mano.
    CardEffects.register(161, {
        canActivate(ctx) {
            return typeof hasExodiaInGraveyard === 'function' && hasExodiaInGraveyard(ctx.owner) && ctx.hand(ctx.owner).some((c) => c.id === 230);
        },
        activate(ctx) {
            const hand = ctx.hand(ctx.owner);
            const idx = hand.findIndex((c) => c.id === 230);
            if (idx === -1) return;
            const [necross] = hand.splice(idx, 1);
            const slotIndex = ctx.field(ctx.owner).findIndex((s) => s === null);
            if (slotIndex === -1) {
                ctx.log('❌ Il Terreno è pieno: impossibile Special Summonare Exodia Necross.');
                hand.push(necross); // torna in mano, il costo non è stato pagabile
                return;
            }
            ctx.specialSummon(ctx.owner, necross, slotIndex, 'attack');
        }
    });

    // ================================================================
    // 230 — Exodia Necross
    // Non può essere Special Summonato in nessun altro modo oltre a
    // Patto con Exodia (id 161, qui sopra — cannotBeSpecialSummoned).
    // Non può essere distrutta in battaglia (cannotBeDestroyedByBattle,
    // resolveBattleDamage/actions.js) né dall'effetto di una Magia/
    // Trappola (cannotBeDestroyedByCardEffect, nuovo flag centralizzato
    // in ACTIONS.destroyMonster, duel-engine.js). Una volta per turno,
    // durante la propria Standby Phase: +500 ATK permanente.
    // ================================================================
    // CORREZIONE di fedeltà: aggiunta la clausola di mantenimento
    // mancante ("distrutta a meno che tutti e 5 i pezzi di Exodia siano
    // nel Cimitero") — controllata nella propria Standby Phase (stesso
    // hook già esistente per il bonus ATK), usando hasExodiaInGraveyard
    // già presente in game-flow.js (usata anche da Patto con Exodia, id
    // 161). Il testo reale della carta è ESSO STESSO "una volta a turno,
    // durante la tua Standby Phase" (non un controllo continuo) — vedi
    // l'effetto in cards.json, verificato su YGOPRODeck.
    CardEffects.register(230, {
        cannotBeSpecialSummoned: true,
        cannotBeDestroyedByBattle: true,
        cannotBeDestroyedByCardEffect: true,
        static(ctx) {
            const bonus = (ctx.card.necrossStacks || 0) * 500;
            if (bonus === 0) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + bonus, def: e.def };
        },
        onStandbyPhase(ctx) {
            if (typeof hasExodiaInGraveyard === 'function' && !hasExodiaInGraveyard(ctx.owner)) {
                // Manda al Cimitero DIRETTAMENTE (non tramite
                // ctx.destroyMonster): questa carta ha
                // cannotBeDestroyedByCardEffect: true, che la
                // proteggerebbe anche da questo suo stesso vincolo di
                // mantenimento — quel flag protegge dagli effetti
                // AVVERSARI, non da questa regola intrinseca della carta.
                const field = ctx.field(ctx.owner);
                const index = field.findIndex((s) => s && s.card.uid === ctx.card.uid);
                if (index !== -1) {
                    ctx.log("💀 Exodia Necross viene distrutta: non tutti i pezzi di Exodia sono nel Cimitero!");
                    ctx.graveyard(ctx.owner).push(ctx.card);
                    field[index] = null;
                }
                return;
            }
            ctx.card.necrossStacks = (ctx.card.necrossStacks || 0) + 1;
            ctx.log(`💀 Exodia Necross guadagna 500 ATK permanenti (${ctx.card.necrossStacks} volte)!`);
        }
    });

    // 421 — Riryoku: dimezza l'ATK di 1 mostro scoperto e trasferisce
    // quella quantità a un altro, fino a fine turno (ctx.grantTemporaryAtkDefBonus,
    // già esistente in duel-engine.js). SEMPLIFICAZIONE: bersagli
    // auto-selezionati (i primi due mostri scoperti trovati).
    CardEffects.register(421, {
        canActivate(ctx) {
            let count = 0;
            ['player', 'bot'].forEach((o) => { ctx.field(o).forEach((s) => { if (s && !s.isFaceDown) count++; }); });
            return count >= 2;
        },
        activate(ctx) {
            const candidates = [];
            ['player', 'bot'].forEach((o) => {
                ctx.field(o).forEach((slot, index) => {
                    if (slot && !slot.isFaceDown) candidates.push({ owner: o, index: index });
                });
            });
            if (candidates.length < 2) return;
            const declFrom = ctx.declareTarget(candidates[0].owner, candidates[0].index, { totalTargetCount: 2 });
            if (!declFrom.allowed) return;
            const fromSlot = ctx.field(declFrom.targetOwner)[declFrom.targetIndex];
            if (!fromSlot) return;
            const remaining = candidates.filter((c) => !(c.owner === declFrom.targetOwner && c.index === declFrom.targetIndex));
            if (remaining.length === 0) return;
            const declTo = ctx.declareTarget(remaining[0].owner, remaining[0].index, { totalTargetCount: 2 });
            if (!declTo.allowed) return;
            const toSlot = ctx.field(declTo.targetOwner)[declTo.targetIndex];
            if (!toSlot || toSlot.card.uid === fromSlot.card.uid) return;
            const half = Math.floor(DuelEngine.getEffectiveAtk(fromSlot.card) / 2);
            ctx.grantTemporaryAtkDefBonus(fromSlot.card, -half, 0, false);
            ctx.grantTemporaryAtkDefBonus(toSlot.card, half, 0, false);
            ctx.log(`🔄 Riryoku sposta ${half} ATK da ${fromSlot.card.name} a ${toSlot.card.name}!`);
        }
    });

    // 439 — Incantesimo Ombra: -700 ATK continuo a 1 mostro scoperto
    // avversario preso di mira all'attivazione, che inoltre non può
    // attaccare né cambiare Posizione (gameState.cannotAttackUids/
    // cannotChangePositionUids, vedi duel-engine.js/engine/actions.js) finché
    // questa carta resta scoperta sul Terreno. Si autodistrugge se il
    // bersaglio non è più valido (stessa logica già usata per le Carte
    // Equipaggiamento in recomputeStaticEffects, riscritta qui perché
    // questa NON è una Carta Equipaggiamento/isEquip).
    CardEffects.register(439, {
        continuous: true,
        canActivate(ctx) {
            return ctx.field(ctx.opponent).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            // Quale mostro legare lo sceglie il giocatore: questa carta
            // resta in campo agganciata a quel bersaglio per tutta la
            // partita, quindi prendere "il primo scoperto" era la scelta
            // meno innocua di tutte.
            const candidati = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown) candidati.push({ owner: ctx.opponent, index, card: slot.card });
            });
            chooseFieldMonsterTarget(ctx, candidati, {
                title: '👻 Incantesimo Ombra',
                text: 'Scegli quale mostro avversario legare (-700 ATK, non può attaccare né cambiare Posizione).'
            }, (scelta) => {
                const decl = ctx.declareTarget(scelta.owner, scelta.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const targetSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!targetSlot) return;
                ctx.card.targetOwner = decl.targetOwner;
                ctx.card.targetIndex = decl.targetIndex;
                ctx.card.targetUid = targetSlot.card.uid;
                ctx.log(`👻 Incantesimo Ombra lega ${targetSlot.card.name}!`);
            });
        },
        static(ctx) {
            const targetSlot = ctx.card.targetOwner != null ? ctx.field(ctx.card.targetOwner)[ctx.card.targetIndex] : null;
            const validTarget = targetSlot && !targetSlot.isFaceDown && targetSlot.card.uid === ctx.card.targetUid;
            if (!validTarget) {
                ctx.stField(ctx.owner)[ctx.index] = null;
                ctx.graveyard(ctx.owner).push(ctx.card);
                return;
            }
            const e = gameState.atkDefBonus[targetSlot.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[targetSlot.card.uid] = { atk: e.atk - 700, def: e.def };
            gameState.cannotAttackUids[targetSlot.card.uid] = true;
            gameState.cannotChangePositionUids[targetSlot.card.uid] = true;
        }
    });

    // 445 — Dado Teschio: lancia un dado, tutti i mostri avversari perdono
    // ATK/DEF pari al risultato x100 fino a fine turno (ctx.grantTemporaryAtkDefBonus).
    CardEffects.register(445, {
        hasDiceRollEffect: true,
        activate(ctx) {
            const roll = 1 + Math.floor(ctx.random() * 6);
            const amount = roll * 100;
            if (window.FX) FX.playDiceRoll(roll);
            ctx.log(`🎲 Dado Teschio: hai lanciato un ${roll}!`);
            ctx.field(ctx.opponent).forEach((slot) => {
                if (slot) ctx.grantTemporaryAtkDefBonus(slot.card, -amount, -amount, false);
            });
        }
    });

    // 133 — Terra in Fiamme: distrugge le Magie Campo sul Terreno
    // all'attivazione, poi 500 danni ricorrenti (onStandbyPhase, già
    // esistente in duel-engine.js/firePhaseTrigger). SEMPLIFICAZIONE: il
    // danno scatta solo nella TUA Standby Phase (il motore scatena i
    // trigger di fase solo per il giocatore di turno sulle proprie carte)
    // — nella regola vera scatterebbe nella Standby Phase di ENTRAMBI.
    CardEffects.register(133, {
        continuous: true,
        activate(ctx) {
            ['player', 'bot'].forEach((o) => {
                const fs = o === 'player' ? gameState.playerFieldSpell : gameState.botFieldSpell;
                if (fs) {
                    ctx.graveyard(o).push(fs.card);
                    if (o === 'player') gameState.playerFieldSpell = null; else gameState.botFieldSpell = null;
                    ctx.log(`🔥 Terra in Fiamme distrugge ${fs.card.name}!`);
                }
            });
        },
        onStandbyPhase(ctx) {
            ctx.dealDamage(ctx.owner, 500);
            ctx.log('🔥 Terra in Fiamme infligge 500 danni!');
        }
    });

    // 221 — Ectoplasmatore: ogni tua End Phase, sacrifica 1 mostro
    // scoperto e infliggi all'avversario danno pari a metà del suo ATK
    // originale (onEndPhase, già esistente). Stessa SEMPLIFICAZIONE di id
    // 133 qui sopra (solo la TUA End Phase, non anche quella avversaria).
    CardEffects.register(221, {
        continuous: true,
        onEndPhase(ctx) {
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((s) => s && !s.isFaceDown);
            if (index === -1) return;
            const sacrificed = field[index].card;
            const halfAtk = Math.floor(sacrificed.attack / 2);
            ctx.destroyMonster(ctx.owner, index);
            ctx.dealDamage(ctx.opponent, halfAtk);
            ctx.log(`💀 Ectoplasmatore sacrifica ${sacrificed.name} e infligge ${halfAtk} danni!`);
        }
    });

    // ================================================================
    // BATCH 2: carte FLIP + lancio di dado, tutte costruite su meccanismi
    // già esistenti (onFlip scatenato anche da un Flip Summon manuale —
    // vedi changeMonsterPosition/actions.js — gameState.cannotAttackUids,
    // ctx.grantTemporaryAtkDefBonus): nessuna nuova capacità del motore.
    // ================================================================

    // 194 — Illusionista dagli Occhi Oscuri: FLIP, blocca l'attacco di 1
    // mostro bersaglio finché questa carta resta scoperta (gameState.cannotAttackUids,
    // ricalcolato ad ogni render in static() finché Illusionista è scoperta).
    // Il bersaglio lo sceglie il giocatore; i candidati restano ordinati
    // con quelli dell'AVVERSARIO per primi, che era la priorità della
    // vecchia selezione automatica — il bot prende sempre il primo della
    // lista, e così continua a bloccare un mostro nemico invece di uno
    // dei propri.
    CardEffects.register(194, {
        onFlip(ctx) {
            const suoi = collectFieldTargets(ctx, { zone: 'monster', owner: 'opponent' });
            const propri = collectFieldTargets(ctx, {
                zone: 'monster', owner: 'self',
                filter: (card) => card.uid !== ctx.card.uid
            });
            const candidati = [...suoi, ...propri];
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '👁️ Illusionista dagli Occhi Oscuri',
                text: 'Scegli quale mostro non potrà più attaccare.'
            }, (scelto) => {
                const decl = ctx.declareTarget(scelto.owner, scelto.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const finalSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!finalSlot) return;
                ctx.card.lockedTargetUid = finalSlot.card.uid;
                ctx.log(`👁️ Illusionista dagli Occhi Oscuri blocca ${finalSlot.card.name}!`);
            });
        },
        static(ctx) {
            if (ctx.card.lockedTargetUid === undefined) return;
            gameState.cannotAttackUids[ctx.card.lockedTargetUid] = true;
        }
    });

    // 209 — Suonatore di Draghi: FLIP, distruggi tutti i "Vaso
    // Cattura-Drago" (id 206) scoperti; se ne distruggi almeno uno, gira
    // in Attacco tutti i mostri Tipo Drago scoperti.
    CardEffects.register(209, {
        onFlip(ctx) {
            let destroyedAny = false;
            ['player', 'bot'].forEach((o) => {
                ctx.stField(o).forEach((slot, i) => {
                    if (slot && !slot.isFaceDown && slot.card.id === 206) {
                        ctx.graveyard(o).push(slot.card);
                        ctx.stField(o)[i] = null;
                        destroyedAny = true;
                    }
                });
            });
            if (!destroyedAny) return;
            ['player', 'bot'].forEach((o) => {
                ctx.field(o).forEach((slot, i) => {
                    if (slot && !slot.isFaceDown && slot.card.race === 'Drago') ctx.changePosition(o, i, 'attack');
                });
            });
            ctx.log('🎵 Suonatore di Draghi distrugge tutti i Vaso Cattura-Drago e gira i Draghi in Attacco!');
        }
    });

    // 242 — Stregone di Fuoco: FLIP, scarta a caso fino a 2 carte dalla
    // mano e infliggi 800 danni.
    // CORREZIONE di fedeltà: le 2 carte vanno BANDITE, non scartate al Cimitero.
    CardEffects.register(242, {
        onFlip(ctx) {
            const hand = ctx.hand(ctx.owner);
            const discardCount = Math.min(2, hand.length);
            for (let i = 0; i < discardCount; i++) {
                const randIndex = Math.floor(ctx.random() * hand.length);
                const [banished] = hand.splice(randIndex, 1);
                ctx.banish(ctx.owner, banished);
            }
            ctx.dealDamage(ctx.opponent, 800);
            ctx.log(`🔥 Stregone di Fuoco bandisce ${discardCount} carte a caso e infligge 800 danni!`);
        }
    });

    // 410 — Mietitore delle Carte: FLIP, distruggi 1 Trappola sul
    // Terreno avversario. SEMPLIFICAZIONE: il motore conosce sempre il
    // vero tipo di una carta Set (nessuna informazione nascosta reale),
    // quindi sceglie direttamente una Trappola vera — la clausola
    // "guardala prima, risparmiala se è una Magia" del testo reale
    // (pensata per un gioco a informazione nascosta) non si applica qui.
    CardEffects.register(410, {
        onFlip(ctx) {
            // Le Trappole coperte entrano nella lista: sono il bersaglio
            // tipico di questa carta, escluderle la renderebbe quasi
            // sempre inerte.
            const candidati = collectFieldTargets(ctx, {
                zone: 'st', owner: 'opponent', includiCoperte: true,
                filter: (card) => card.type === 'trap'
            });
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '✂️ Mietitore delle Carte',
                text: 'Scegli quale Trappola dell\'avversario distruggere.'
            }, (scelto) => {
                const destroyed = scelto.card;
                ctx.graveyard(scelto.owner).push(destroyed);
                ctx.stField(scelto.owner)[scelto.index] = null;
                ctx.log(`✂️ Mietitore delle Carte distrugge ${destroyed.name}!`);
            });
        }
    });

    // 273 — Dado Aggraziato: lancia un dado, i propri mostri guadagnano
    // ATK/DEF pari al risultato x100 fino a fine turno (ctx.grantTemporaryAtkDefBonus,
    // già esistente in duel-engine.js) — mirror di Dado Teschio (id 445)
    // qui sopra, sul proprio campo invece che su quello avversario.
    CardEffects.register(273, {
        hasDiceRollEffect: true,
        activate(ctx) {
            const roll = 1 + Math.floor(ctx.random() * 6);
            const amount = roll * 100;
            if (window.FX) FX.playDiceRoll(roll);
            ctx.log(`🎲 Dado Aggraziato: hai lanciato un ${roll}!`);
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot) ctx.grantTemporaryAtkDefBonus(slot.card, amount, amount, false);
            });
        }
    });

    // ================================================================
    // BATCH 3: Token (ACTIONS.createTokens) e ricerca nel Deck
    // (ACTIONS.searchDeckToHand), entrambe nuove in duel-engine.js — vedi
    // i commenti lì per i limiti (Token: nessuna restrizione-Tributo
    // applicata; ricerca: non trova nulla nel Duello Demo, che pesca da
    // un pool casuale invece che da un vero Deck).
    // ================================================================

    // 434 — Capro Espiatorio: Special Summon 4 Token "Pecora" (Bestia/
    // TERRA/Liv.1/0-0) in Difesa. Vedi missingEffectNote su id 434 in
    // cards.json per le clausole ancora mancanti.
    CardEffects.register(434, {
        activate(ctx) {
            const created = ctx.createTokens(ctx.owner, 4, { name: 'Token Pecora', race: 'Bestia', attribute: 'TERRA', level: 1, attack: 0, defense: 0 });
            ctx.log(`🐑 Capro Espiatorio evoca ${created} Token Pecora!`);
        }
    });

    // 386 — Moltiplicazione: sacrifica 1 Kuriboh (id 22) scoperto, poi
    // Special Summon quanti più Token "Kuriboh" (Demone/OSCURITÀ/Liv.1/
    // 300-200) possibile negli slot liberati/rimasti.
    CardEffects.register(386, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.id === 22);
        },
        activate(ctx) {
            const index = ctx.field(ctx.owner).findIndex((s) => s && !s.isFaceDown && s.card.id === 22);
            if (index === -1) return;
            ctx.destroyMonster(ctx.owner, index);
            const emptySlots = ctx.field(ctx.owner).filter((s) => s === null).length;
            const created = ctx.createTokens(ctx.owner, emptySlots, { name: 'Token Kuriboh', race: 'Demone', attribute: 'OSCURITÀ', level: 1, attack: 300, defense: 200 });
            ctx.log(`👾 Moltiplicazione evoca ${created} Token Kuriboh!`);
        }
    });

    // 154 — Clonazione: quando l'avversario Evoca Normalmente o tramite
    // Flip Summon un mostro con un Livello, Special Summon 1 Token con le
    // sue stesse statistiche (onOpponentSummon, stesso meccanismo di
    // risposta di Buco Trappola/id 40). Vedi missingEffectNote su id 154
    // in cards.json per la clausola ancora mancante.
    CardEffects.register(154, {
        canActivate(ctx) {
            return typeof ctx.summonedCard.level === 'number';
        },
        onOpponentSummon(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const template = { name: ctx.summonedCard.name, race: ctx.summonedCard.race, attribute: ctx.summonedCard.attribute, level: ctx.summonedCard.level, attack: ctx.summonedCard.attack, defense: ctx.summonedCard.defense };
            ctx.createTokens(ctx.owner, 1, template);
            ctx.log(`🎭 Clonazione crea un Token copia di ${ctx.summonedCard.name}!`);
        }
    });

    // 537 — Thunder Dragon: attivabile dalla mano scartando questa carta
    // (già gestito da activateCard() in duel-engine.js prima di chiamare
    // activate() qui sotto); cerca fino a 2 copie di se stessa nel Deck
    // (ACTIONS.searchDeckToHand). Vedi anche promptHandMonsterActivation
    // in js/engine/actions.js: nuovo aggancio UI per attivare un mostro dalla
    // mano senza che sia uno Special Summon.
    CardEffects.register(537, {
        activate(ctx) {
            ctx.searchDeckToHand(ctx.owner, (c) => c.id === 537, 2);
        }
    });

    // 533 — Berfomet: quando Evocata Normalmente o Special Summonata,
    // aggiungi 1 "Gazelle, Re delle Bestie Mitiche" (id 532) dal Deck
    // alla mano (ACTIONS.searchDeckToHand).
    // CORREZIONE di fedeltà: il vero Berfomet cerca solo su Evocazione
    // Normale o Flip, MAI su Special Summon (rimosso onSpecialSummon).
    CardEffects.register(533, {
        onSummon(ctx) { ctx.searchDeckToHand(ctx.owner, (c) => c.id === 532, 1); }
    });

    // ================================================================
    // BATCH 4: negazione Magie estesa a tutte le zone, reazione "quando
    // guadagni Life Points" (ACTIONS.dealDamage), reindirizzamento di un
    // attacco (declareCtx.redirectAttack in js/engine/actions.js) — vedi i
    // commenti nei rispettivi punti di duel-engine.js/engine/actions.js.
    // ================================================================

    // 455 — Cancellatore di Magie: nega tutte le Magie sul Terreno, di
    // entrambi i giocatori (canActivate ora controlla areSpellsNegatedFor
    // per QUALUNQUE zona, non solo le Magie Set — vedi il fix in
    // duel-engine.js/canActivate).
    CardEffects.register(455, {
        static(ctx) {
            gameState.spellsNegatedFor.player = true;
            gameState.spellsNegatedFor.bot = true;
        }
    });

    // 241 — Principessa di Fuoco: ogni volta che guadagni Life Points,
    // infliggi 500 danni all'avversario (onGainLifePoints, vedi
    // ACTIONS.dealDamage in duel-engine.js).
    CardEffects.register(241, {
        onGainLifePoints(ctx) {
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log('🔥 Principessa di Fuoco infligge 500 danni per il guadagno di Life Points!');
        }
    });

    // 214 — Spiritello dei Sogni: se attaccata, ridirige l'attacco a un
    // altro proprio mostro (declareCtx.redirectAttack, nuovo in
    // actions.js/resolveAttack — stesso identico meccanismo di risposta
    // di Muro d'Illusione/id 54, il mostro bersaglio dell'attacco può
    // rispondere con un proprio onAttackDeclare). SEMPLIFICAZIONE:
    // bersaglio alternativo auto-selezionato (il primo altro proprio
    // mostro scoperto trovato), non una vera scelta del giocatore.
    // NIENTE PICKER, e non per pigrizia: un handler dentro
    // onAttackDeclare si risolve come link di una Chain, e resolveChain
    // lo chiama e tira dritto dopo una pausa fissa senza aspettarlo
    // (vedi runHandler in duel-engine.js). Misurato su Fuoco di Copertura
    // (id 852): con una scelta fatta dopo 4 secondi la battaglia si era
    // già risolta e l'effetto arrivava a danno calcolato, cioè a vuoto.
    // Stesso motivo per cui le Trappole Contatore non sono mai state
    // migrate a una scelta asincrona.
    CardEffects.register(214, {
        onAttackDeclare(ctx) {
            const field = ctx.field(ctx.owner);
            const newIndex = field.findIndex((s, i) => s && i !== ctx.targetIndex);
            if (newIndex === -1) return;
            ctx.redirectAttack(newIndex);
            ctx.log(`🌙 Spiritello dei Sogni ridirige l'attacco verso ${field[newIndex].card.name}!`);
        }
    });

    // 469 — Il Sigillo di Orichalcos: +500 ATK continuo a tutti i propri
    // mostri (stesso schema delle Carte Equipaggiamento/mostri con buff
    // continuo già visti, applicato qui a tutto il campo invece che a un
    // solo bersaglio). Vedi missingEffectNote su id 469 in cards.json
    // per le altre clausole ancora mancanti.
    CardEffects.register(469, {
        static(ctx) {
            ctx.field(ctx.owner).forEach((slot) => {
                if (!slot || slot.isFaceDown) return;
                const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 500, def: e.def };
            });
        }
    });

    // ================================================================
    // BATCH 5: ON_POSITION_CHANGE su un effetto-carta reattivo (già
    // esistente, mai collegato prima), divieto d'attacco per Tipo mostro
    // (gameState.cannotAttackUids, batch 1), nuova reazione
    // onOwnMonsterDestroyed (vedi ON_DESTROY in duel-engine.js), danno
    // perforante esteso a un intero Tipo (gameState.piercingRacesFor),
    // danno estra "quando questa carta distrugge in battaglia"
    // (def.damageOnBattleDestroy, vedi resolveBattleDamage/actions.js).
    // ================================================================

    // ================================================================
    // 162 — Copione / Copycat
    // Se questa carta viene Evocata (Normale o Special — nessun
    // onSpecialSummon separato: il dispatcher in duel-engine.js ricade da
    // solo su onSummon quando onSpecialSummon non è definito, vedi il
    // commento lì su TRIGGER.ON_NORMAL_SUMMON/ON_SPECIAL_SUMMON): scegli 1
    // mostro scoperto dell'avversario; l'ATK/DEF di questa carta diventano
    // pari all'ATK/DEF ORIGINALI di quel bersaglio (scatto una tantum, non
    // un legame continuo — un cambiamento successivo dell'ATK/DEF del
    // bersaglio non si riflette più su Copione).
    // CORREZIONE rispetto alla nota precedente: "mutare le statistiche di
    // una carta condivisa" non è un rischio reale in questo motore — ogni
    // copia in campo è già un oggetto proprio (vedi il pattern {...carta,
    // uid: ...} usato ovunque per pescare/evocare), non un riferimento
    // condiviso a cardDatabase: la stessa identica tecnica di mutazione
    // diretta è già usata e verificata per Zombyra l'Oscuro (id 625,
    // atkLossOnBattleDestroy) senza intaccare le altre copie della carta.
    // ================================================================
    CardEffects.register(162, {
        onSummon(ctx) {
            const candidates = [];
            ctx.field(ctx.opponent).forEach((slot) => { if (slot && !slot.isFaceDown) candidates.push(slot.card); });
            if (candidates.length === 0) return;
            const applyCopy = (target) => {
                const index = ctx.field(ctx.opponent).findIndex((s) => s && s.card.uid === target.uid);
                if (index === -1) return;
                const decl = ctx.declareTarget(ctx.opponent, index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const finalSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!finalSlot) return;
                ctx.summonedCard.attack = finalSlot.card.attack;
                ctx.summonedCard.defense = finalSlot.card.defense;
                ctx.log(`🎭 Copione copia ATK/DEF di ${finalSlot.card.name}: diventa ${finalSlot.card.attack}/${finalSlot.card.defense}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                applyCopy(candidates[0]);
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '🎭 Copione',
                text: 'Scegli il mostro scoperto dell\'avversario da copiare (ATK/DEF originali).',
                onSelect: (card) => applyCopy(card)
            });
        }
    });

    // 163 — Pagliaccio Insolente: se passa da Difesa ad Attacco, rimanda
    // in mano 1 mostro dell'avversario (onPositionChange, già esistente
    // — vedi ACTIONS.changePosition in duel-engine.js). SEMPLIFICAZIONE:
    // bersaglio auto-selezionato.
    CardEffects.register(163, {
        onPositionChange(ctx) {
            if (ctx.fromPosition !== 'defense' || ctx.toPosition !== 'attack') return;
            const candidati = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot) candidati.push({ owner: ctx.opponent, index, card: slot.card });
            });
            chooseFieldMonsterTarget(ctx, candidati, {
                title: '🤡 Pagliaccio Insolente',
                text: 'Scegli quale mostro avversario rimandare in mano.'
            }, (scelta) => {
                const decl = ctx.declareTarget(scelta.owner, scelta.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                ctx.returnMonsterToHand(decl.targetOwner, decl.targetIndex);
                ctx.log('🤡 Pagliaccio Insolente rimanda in mano un mostro dell\'avversario!');
            });
        }
    });

    // 310 — Barriera d'Insetti: i mostri Tipo Insetto dell'avversario non
    // possono dichiarare un attacco (gameState.cannotAttackUids, stesso
    // meccanismo di Incantesimo Ombra/id 439, qui applicato a un intero
    // Tipo invece che a un solo bersaglio).
    CardEffects.register(310, {
        continuous: true,
        static(ctx) {
            ctx.field(ctx.opponent).forEach((slot) => {
                if (slot && !slot.isFaceDown && slot.card.race === 'Insetto') gameState.cannotAttackUids[slot.card.uid] = true;
            });
        }
    });

    // 380 — Michizure: quando un mostro viene mandato dal Terreno al tuo
    // Cimitero, distruggi 1 mostro sul Terreno (onOwnMonsterDestroyed,
    // nuovo in duel-engine.js/ON_DESTROY). SEMPLIFICAZIONE: bersaglio
    // auto-selezionato (priorità al Terreno avversario).
    CardEffects.register(380, {
        canActivate(ctx) {
            return ctx.field('player').some((s) => s) || ctx.field('bot').some((s) => s);
        },
        onOwnMonsterDestroyed(ctx) {
            // "Scegli come bersaglio 1 mostro sul Terreno; distruggilo."
            // Trappola reattiva: si attiva quando un proprio mostro viene
            // mandato al Cimitero, e si porta dietro chi vuole il
            // giocatore — prima prendeva il primo mostro avversario che
            // trovava, quindi mai uno proprio e mai una scelta fra piu'
            // bersagli avversari.
            const candidati = collectFieldTargets(ctx, { zone: 'monster', includiCoperte: true });
            if (candidati.length === 0) return;
            chooseFieldCardTarget(ctx, candidati, {
                title: '💀 Michizure',
                text: 'Scegli quale mostro trascinare con te.'
            }, (scelto) => {
                const decl = ctx.declareTarget(scelto.owner, scelto.index, { totalTargetCount: 1 });
                if (!decl.allowed) return;
                const destroyedSlot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!destroyedSlot) return;
                const destroyed = destroyedSlot.card;
                ctx.destroyMonster(decl.targetOwner, decl.targetIndex);
                ctx.log(`💀 Michizure distrugge ${destroyed.name}!`);
            });
        }
    });

    // 212 — Furia del Drago: i propri mostri Tipo Drago infliggono danno
    // perforante (gameState.piercingRacesFor, vedi resolveBattleDamage/
    // actions.js).
    CardEffects.register(212, {
        continuous: true,
        static(ctx) {
            gameState.piercingRacesFor[ctx.owner].add('Drago');
        }
    });

    // 526 — Skull Servant: 500 danni quando distrugge un mostro in
    // battaglia (def.damageOnBattleDestroy, controllato in
    // resolveBattleDamage/actions.js — solo un flag, nessuna funzione
    // necessaria, stesso stile di rejectsEquip/id 16).
    CardEffects.register(526, {
        damageOnBattleDestroy: 500
    });

    // ================================================================
    // BATCH 6: secondo attacco nella stessa Battle Phase (nuovo in
    // actions.js/resolveAttack — def.canAttackTwice o
    // slot.extraAttackGranted), più due carte la cui nota era ormai
    // superata da meccanismi già esistenti (ctx.zeroAttackerAtk,
    // ctx.grantTemporaryAtkDefBonus).
    // ================================================================

    // 538 — Sanga del Tuono: durante il calcolo dei danni, se attaccata,
    // azzera l'ATK dell'attaccante (una sola volta finché scoperta) —
    // stesso meccanismo di Suijin (id 71)/Kazejin (id 324) qui sopra.
    // Nota: questa carta era registrata SOLO come materiale di Fusione
    // (fusionMaterials di Il Guardiano del Cancello, id 33) — questo è il
    // suo effetto proprio come mostro autonomo scoperto sul Terreno.
    CardEffects.register(538, {
        canActivate(ctx) {
            return !ctx.card.sangaUsed;
        },
        onAttackDeclare(ctx) {
            ctx.card.sangaUsed = true;
            ctx.zeroAttackerAtk();
            ctx.log("⚡ Sanga del Tuono azzera l'ATK del mostro attaccante per questo scontro (effetto usabile una sola volta finché scoperta)!");
        }
    });

    // 440 — Scudo e Spada: scambia ATK e DEF di tutti i mostri scoperti
    // fino a fine turno — un bonus temporaneo (+/- la differenza tra i
    // due valori) tramite ctx.grantTemporaryAtkDefBonus, già esistente:
    // non serve mutare le statistiche originali condivise della carta.
    CardEffects.register(440, {
        activate(ctx) {
            ['player', 'bot'].forEach((o) => {
                ctx.field(o).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    const atk = slot.card.attack;
                    const def = slot.card.defense;
                    ctx.grantTemporaryAtkDefBonus(slot.card, def - atk, atk - def, false);
                });
            });
            ctx.log('🔄 Scudo e Spada scambia ATK e DEF di tutti i mostri scoperti!');
        }
    });

    // 294 — Cavaliere Hayabusa: può attaccare una seconda volta in ogni
    // Battle Phase (def.canAttackTwice, controllato in resolveAttack/
    // actions.js — solo un flag, nessuna funzione necessaria).
    CardEffects.register(294, {
        canAttackTwice: true
    });

    // 485 — Riavvolgimento Toon: concede a 1 proprio mostro scoperto un
    // secondo attacco in questa Battle Phase (slot.extraAttackGranted,
    // stesso meccanismo di Cavaliere Hayabusa qui sopra, ma concesso da
    // un'altra carta invece che permanente). SEMPLIFICAZIONE: bersaglio
    // auto-selezionato tra QUALUNQUE proprio mostro scoperto, non solo i
    // Toon (nessun tag "è un mostro Toon" nel database attuale).
    CardEffects.register(485, {
        canActivate(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown);
        },
        activate(ctx) {
            // A QUALE dei propri mostri concedere il secondo attacco lo
            // decide il giocatore: con più mostri in campo è la differenza
            // fra un attacco utile e uno sprecato.
            const candidati = [];
            ctx.field(ctx.owner).forEach((slot, index) => {
                if (slot && !slot.isFaceDown) candidati.push({ owner: ctx.owner, index, card: slot.card });
            });
            chooseFieldMonsterTarget(ctx, candidati, {
                title: '🎪 Riavvolgimento Toon',
                text: 'Scegli a quale tuo mostro concedere un secondo attacco in questa Battle Phase.'
            }, (scelta) => {
                const slot = ctx.field(ctx.owner)[scelta.index];
                if (!slot) return;
                slot.extraAttackGranted = true;
                ctx.log(`🎪 Riavvolgimento Toon concede un secondo attacco a ${slot.card.name}!`);
            });
        }
    });

})();
