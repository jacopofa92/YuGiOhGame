/**
 * card-effects-8.js — Effetti delle carte, parte 8 di 8.
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

    const { searchDeckWithChoice, searchGraveyardWithChoice, chooseFieldMonsterTarget, chooseFieldCardTarget, collectFieldTargets, chooseCardFromList, offerHandDiscardChoice, resolveSpecialSummonBanishCost, maxRitualTributeLevel, performRitualTribute, returnSpellTrapToHand } = window.CardEffectsShared;

    // ================================================================
    // 1001-1008 — Il ciclo di Mostri Spirito di Legacy of Darkness (LOD),
    // tema mitologia giapponese. Tutti e 8 condividono lo stesso schema
    // "non Special Summonabile, torna in mano a fine turno se Evocato
    // Normalmente o girato scoperto" già rodato da Yata-Garasu (id 884)/
    // Maharaghi (id 755): cannotSpecialSummon + onSummon(via==='normal')/
    // onFlip che marcano ctx.card._returnToHandTurn, onEndPhase che
    // consulta quel marcatore e chiama ctx.returnMonsterToHand. Solo
    // l'abilità aggiuntiva di ciascuno cambia.
    // ================================================================

    // 1001 — Sacerdote di Asura / Asura Priest: solo lo schema Spirito.
    // SEMPLIFICAZIONE (vedi missingEffectNote): manca "può attaccare
    // tutti i mostri dell'avversario, una volta ciascuno" — un vero
    // attacco multiplo simultaneo su più bersagli in una sola Battle
    // Phase, meccanismo che nessun'altra carta di questo motore ha mai
    // richiesto (le carte con più attacchi esistenti, es. Hayabusa
    // Knight, attaccano più volte lo STESSO tipo di bersaglio scelto di
    // volta in volta, mai "tutti i mostri avversari" in un colpo solo) —
    // sproporzionato costruire quell'infrastruttura per una carta sola.
    CardEffects.register(1001, {
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
            ctx.log('🙏 Sacerdote di Asura ritorna in mano!');
        }
    });

    // 1002 — Fushi No Tori: schema Spirito + guadagna LP pari al danno da
    // battaglia inflitto (onDealsBattleDamage, nuovo campo ctx.damage —
    // actions.js, aggiunto in questa stessa sessione insieme al
    // moltiplicatore di danno per Soldato di Susa id 1007 qui sotto).
    CardEffects.register(1002, {
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
            ctx.log('🔥 Fushi No Tori ritorna in mano!');
        },
        onDealsBattleDamage(ctx) {
            ctx.dealDamage(ctx.owner, -(ctx.damage || 0));
            ctx.log(`🔥 Fushi No Tori guadagna ${ctx.damage || 0} Life Points!`);
        }
    });

    // 1003 — Grande Naso Lungo / Great Long Nose: schema Spirito + se
    // infligge danno da battaglia, l'avversario salta la sua PROSSIMA
    // Battle Phase — nuovo gameState.skipNextBattlePhaseFor (booleano
    // per-owner, sopravvive al cambio turno a differenza di
    // skipBattlePhaseFor già esistente, consumato in enterBattlePhase()
    // di game-flow.js, stesso schema di skipMainPhase1For).
    CardEffects.register(1003, {
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
            ctx.log('👃 Grande Naso Lungo ritorna in mano!');
        },
        onDealsBattleDamage(ctx) {
            gameState.skipNextBattlePhaseFor = gameState.skipNextBattlePhaseFor || {};
            gameState.skipNextBattlePhaseFor[ctx.opponent] = true;
            ctx.log(`👃 Grande Naso Lungo: ${ctx.opponent === 'player' ? 'salterai' : 'il bot salterà'} la prossima Battle Phase!`);
        }
    });

    // 1004 — Hino-Kagu-Tsuchi: schema Spirito + se infligge danno da
    // battaglia, l'avversario scarta l'intera mano alla sua prossima Draw
    // Phase PRIMA di pescare — nuovo gameState.discardHandBeforeDrawFor
    // (booleano per-owner, consumato in enterDrawPhaseInner() di
    // game-flow.js, stesso schema di skipNextBattlePhaseFor qui sopra).
    CardEffects.register(1004, {
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
            ctx.log('🔥 Hino-Kagu-Tsuchi ritorna in mano!');
        },
        onDealsBattleDamage(ctx) {
            gameState.discardHandBeforeDrawFor = gameState.discardHandBeforeDrawFor || {};
            gameState.discardHandBeforeDrawFor[ctx.opponent] = true;
            ctx.log(`🔥 Hino-Kagu-Tsuchi: ${ctx.opponent === 'player' ? 'scarterai' : 'il bot scarterà'} l'intera mano alla prossima Draw Phase!`);
        }
    });

    // 1005 — Coniglio Bianco di Inaba / Inaba White Rabbit: schema
    // Spirito + può attaccare direttamente (gameState.directAttackAllowedUids,
    // stesso schema incondizionato di Folletto della Fiamma Furente id
    // 681).
    CardEffects.register(1005, {
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
            ctx.log('🐇 Coniglio Bianco di Inaba ritorna in mano!');
        },
        static(ctx) {
            gameState.directAttackAllowedUids[ctx.card.uid] = true;
        }
    });

    // 1006 — Otohime: schema Spirito + quando Evocata Normalmente o
    // girata scoperta, cambia la Posizione di Battaglia di 1 mostro
    // scoperto avversario — bersaglio auto-selezionato (il primo
    // idoneo, stessa SEMPLIFICAZIONE di targeting già accettata ovunque
    // in questo file), passa comunque dal checkpoint condiviso
    // ctx.declareTarget.
    function otohimeChangeTarget(ctx) {
        const candidates = collectFieldTargets(ctx, { zone: 'monster', owner: 'opponent' });
        if (candidates.length === 0) return;
        chooseFieldCardTarget(ctx, candidates, {
            title: '🌊 Otohime',
            text: 'Scegli il mostro avversario a cui cambiare Posizione di Battaglia.'
        }, (scelto) => {
            const decl = ctx.declareTarget(scelto.owner, scelto.index);
            if (!decl.allowed) return;
            const slot = ctx.field(decl.targetOwner)[decl.targetIndex];
            if (!slot) return;
            ctx.changePosition(decl.targetOwner, decl.targetIndex, slot.position === 'attack' ? 'defense' : 'attack');
            ctx.log(`🌊 Otohime cambia la Posizione di Battaglia di ${slot.card.name}!`);
        });
    }
    CardEffects.register(1006, {
        cannotSpecialSummon: true,
        onSummon(ctx) {
            if (ctx.summonedVia === 'normal') {
                ctx.card._returnToHandTurn = gameState.turn;
                otohimeChangeTarget(ctx);
            }
        },
        onFlip(ctx) {
            ctx.card._returnToHandTurn = gameState.turn;
            otohimeChangeTarget(ctx);
        },
        onEndPhase(ctx) {
            if (ctx.card._returnToHandTurn !== gameState.turn) return;
            const field = ctx.field(ctx.owner);
            const index = field.findIndex((slot) => slot && slot.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.returnMonsterToHand(ctx.owner, index);
            ctx.log('🌊 Otohime ritorna in mano!');
        }
    });

    // 1007 — Soldato di Susa / Susa Soldier: schema Spirito + il danno da
    // battaglia inflitto da questa carta è dimezzato — nuovo
    // def.battleDamageMultiplier (numero fisso, 1 se assente su ogni
    // altra carta), applicato in actions.js PRIMA di applyDamage in
    // ognuno dei 3 punti che calcolano un danno da battaglia (attacco
    // diretto, vittoria in Posizione di Attacco, perforazione).
    CardEffects.register(1007, {
        cannotSpecialSummon: true,
        battleDamageMultiplier: 0.5,
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
            ctx.log('⚡ Soldato di Susa ritorna in mano!');
        }
    });

    // 1008 — Drago Yamata / Yamata Dragon: schema Spirito + se infligge
    // danno da battaglia, pesca carte finché non si hanno 5 carte in
    // mano.
    CardEffects.register(1008, {
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
            ctx.log('🐉 Drago Yamata ritorna in mano!');
        },
        onDealsBattleDamage(ctx) {
            const need = Math.max(0, 5 - ctx.hand(ctx.owner).length);
            if (need > 0) {
                ctx.drawCards(ctx.owner, need);
                ctx.log(`🐉 Drago Yamata: peschi finché non hai 5 carte in mano (+${need})!`);
            }
        }
    });

    // ================================================================
    // 1009-1013 — cluster "può attaccare direttamente" di Metal Raiders
    // (MRD): 5 mostri Livello 1-2 con la stessa identica riga di testo,
    // stesso schema incondizionato di Folletto della Fiamma Furente (id
    // 681)/Coniglio Bianco di Inaba (id 1005) qui sopra.
    // ================================================================
    [1009, 1010, 1011, 1012, 1013].forEach((id) => {
        CardEffects.register(id, {
            static(ctx) {
                gameState.directAttackAllowedUids[ctx.card.uid] = true;
            }
        });
    });

    // ================================================================
    // 1014-1019 — 3 coppie Mostro Rituale + Magia Rituale di Spell Ruler
    // (SRL), stesso identico schema di Rito del Guerriero Nero (id 56):
    // la Magia sacrifica automaticamente dal Terreno E/O dalla mano
    // (performRitualTribute/maxRitualTributeLevel, qui sopra in questo
    // file) i mostri con Livello più alto finché il totale richiesto non
    // è raggiunto, poi Special Summon il Mostro Rituale dalla mano. Il
    // Mostro Rituale stesso vieta Evocazione Normale/Set e Special
    // Summon per ogni altra via.
    // ================================================================

    // 1015 — Ricetta dell'Hamburger / Hamburger Recipe: Ritual Summon di
    // Hamburger Famelico (id 1014), Livello totale >= 6.
    CardEffects.register(1015, {
        canActivate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 1014);
            if (handIndex === -1) return false;
            return maxRitualTributeLevel(ctx, handIndex) >= 6;
        },
        activate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 1014);
            if (handIndex === -1) return;
            performRitualTribute(ctx, 6, handIndex);
            const hand = ctx.hand(ctx.owner);
            const finalHandIndex = hand.findIndex((c) => c.id === 1014);
            if (finalHandIndex === -1) return;
            const [ritualCard] = hand.splice(finalHandIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Hamburger Famelico finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack', 'graveyard');
            ctx.log('🍔 Ricetta dell\'Hamburger evoca Hamburger Famelico!');
        }
    });
    CardEffects.register(1014, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // 1017 — Giuramento della Tartaruga / Turtle Oath: Ritual Summon di
    // Tartaruga Granchio (id 1016), Livello totale >= 8.
    CardEffects.register(1017, {
        canActivate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 1016);
            if (handIndex === -1) return false;
            return maxRitualTributeLevel(ctx, handIndex) >= 8;
        },
        activate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 1016);
            if (handIndex === -1) return;
            performRitualTribute(ctx, 8, handIndex);
            const hand = ctx.hand(ctx.owner);
            const finalHandIndex = hand.findIndex((c) => c.id === 1016);
            if (finalHandIndex === -1) return;
            const [ritualCard] = hand.splice(finalHandIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Tartaruga Granchio finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack', 'graveyard');
            ctx.log('🐢 Giuramento della Tartaruga evoca Tartaruga Granchio!');
        }
    });
    CardEffects.register(1016, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // 1019 — Danza d'Apertura / Commencement Dance: Ritual Summon di
    // Spettacolo della Spada (id 1018), Livello totale >= 6.
    CardEffects.register(1019, {
        canActivate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 1018);
            if (handIndex === -1) return false;
            return maxRitualTributeLevel(ctx, handIndex) >= 6;
        },
        activate(ctx) {
            const handIndex = ctx.hand(ctx.owner).findIndex((c) => c.id === 1018);
            if (handIndex === -1) return;
            performRitualTribute(ctx, 6, handIndex);
            const hand = ctx.hand(ctx.owner);
            const finalHandIndex = hand.findIndex((c) => c.id === 1018);
            if (finalHandIndex === -1) return;
            const [ritualCard] = hand.splice(finalHandIndex, 1);
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) {
                ctx.graveyard(ctx.owner).push(ritualCard);
                ctx.log('⚠️ Il Terreno è pieno: Spettacolo della Spada finisce nel Cimitero.');
                return;
            }
            ctx.specialSummon(ctx.owner, ritualCard, slotIndex, 'attack', 'graveyard');
            ctx.log('⚔️ Danza d\'Apertura evoca Spettacolo della Spada!');
        }
    });
    CardEffects.register(1018, {
        cannotNormalSummon: true,
        cannotBeSpecialSummoned: true
    });

    // ================================================================
    // 1020-1030 — prima serie, terza ondata: Mostri Flip di Pharaonic
    // Guardian/Pharaoh's Servant/Spell Ruler/Metal Raiders/Legacy of
    // Darkness. Effetti indipendenti l'uno dall'altro, raggruppati qui
    // solo perché chiusi nella stessa sessione.
    // ================================================================

    // 1020 — Mummia Velenosa / Poison Mummy: FLIP, 500 danni diretti.
    CardEffects.register(1020, {
        onFlip(ctx) {
            ctx.dealDamage(ctx.opponent, 500);
            ctx.log('☠️ Mummia Velenosa infligge 500 danni!');
        }
    });

    // 1022 — Scarpe Mordaci / Bite Shoes: FLIP, cambia la Posizione di
    // Battaglia di 1 mostro scoperto sul Terreno (bersaglio
    // auto-selezionato: prima l'avversario, poi se non c'è nulla lì il
    // proprio campo — stessa SEMPLIFICAZIONE di targeting già accettata
    // ovunque in questo file).
    CardEffects.register(1022, {
        onFlip(ctx) {
            for (const owner of [ctx.opponent, ctx.owner]) {
                const index = ctx.field(owner).findIndex((slot) => slot && !slot.isFaceDown);
                if (index === -1) continue;
                const decl = ctx.declareTarget(owner, index);
                if (!decl.allowed) return;
                const slot = ctx.field(decl.targetOwner)[decl.targetIndex];
                if (!slot) return;
                ctx.changePosition(decl.targetOwner, decl.targetIndex, slot.position === 'attack' ? 'defense' : 'attack');
                ctx.log('👞 Scarpe Mordaci cambia la Posizione di Battaglia di un mostro!');
                return;
            }
        }
    });

    // 1023 — Parassita Bubbonico / Bubonic Vermin: FLIP, Special Summon
    // di una copia di sé dal Deck in Difesa coperta, poi rimescola.
    CardEffects.register(1023, {
        onFlip(ctx) {
            const deck = ctx.owner === 'player' ? gameState.playerDeck : gameState.botDeck;
            if (!Array.isArray(deck)) { ctx.log('🐀 Nessun Deck reale in questa modalità.'); return; }
            const index = deck.findIndex((c) => c.id === 1023);
            if (index === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [card] = deck.splice(index, 1);
            ctx.specialSummon(ctx.owner, card, slotIndex, 'defense', 'deck');
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            ctx.log('🐀 Parassita Bubbonico Special Summona una copia di sé dal Deck!');
        }
    });

    // 1024 — Bomba a Orologeria / Jigen Bakudan: dopo il FLIP, Ignition
    // attivabile SOLO durante la propria Standby Phase — si tributa da
    // sola (destroyAllMonsters include anche lei) e infligge danni pari
    // alla metà del totale ATK degli ALTRI mostri distrutti.
    CardEffects.register(1024, {
        canActivate(ctx) { return ctx.gameState.phase === 'standby'; },
        activate(ctx) {
            let totalAtk = 0;
            ctx.field(ctx.owner).forEach((slot) => {
                if (slot && slot.card.uid !== ctx.card.uid) totalAtk += DuelEngine.getEffectiveAtk(slot.card);
            });
            ctx.destroyAllMonsters(ctx.owner);
            const damage = Math.floor(totalAtk / 2);
            ctx.dealDamage(ctx.opponent, damage);
            ctx.log(`💣 Bomba a Orologeria si tributa e distrugge tutti i tuoi mostri: ${damage} danni all'avversario!`);
        }
    });

    // 1025 — L'Immortale del Tuono / The Immortal of Thunder: FLIP,
    // +3000 LP; quando lascia il Terreno per il Cimitero (onDestroy),
    // -5000 LP. SEMPLIFICAZIONE: onDestroy copre distruzione da
    // battaglia/effetto Carta, non ogni possibile "mandata al
    // Cimitero" (es. Tributo per un'Evocazione) — stesso limite già
    // accettato per altre carte con questo stesso hook in questo file.
    CardEffects.register(1025, {
        onFlip(ctx) {
            ctx.dealDamage(ctx.owner, -3000);
            ctx.log("⚡ L'Immortale del Tuono guadagna 3000 Life Points!");
        },
        onDestroy(ctx) {
            ctx.dealDamage(ctx.owner, 5000);
            ctx.log("⚡ L'Immortale del Tuono lascia il Terreno: perdi 5000 Life Points!");
        }
    });

    /**
     * Cerca 1 carta dal proprio Deck che soddisfa `matchFn` e la mette in
     * cima al Deck (deck.push — vedi drawCardsToHand in game-flow.js:
     * pop() pesca dalla FINE dell'array, quindi "in cima" = ultimo
     * elemento), oppure in mano se Necrovalley (id 890) è scoperta sul
     * Terreno — condiviso da Un Gufo Fortunato (1026)/Un Gatto di
     * Malaugurio (1027), stesso schema "tutorail al Deck o alla mano se
     * Necrovalley" del vero testo di entrambe le carte.
     */
    function searchAndPlaceOnTopOrHandIfNecrovalley(ctx, matchFn, emoji) {
        const deck = ctx.owner === 'player' ? gameState.playerDeck : gameState.botDeck;
        if (!Array.isArray(deck)) { ctx.log(`${emoji} Nessun Deck reale in questa modalità.`); return; }
        searchDeckWithChoice(ctx, matchFn, { title: `${emoji} Scegli una carta`, text: 'Scegli quale carta cercare nel Deck.' }, (card) => {
            const necrovalleyOnField = ['playerFieldSpell', 'botFieldSpell'].some((k) => { const fs = gameState[k]; return fs && !fs.isFaceDown && fs.card.id === 890; });
            if (necrovalleyOnField) {
                ctx.hand(ctx.owner).push(card);
                ctx.log(`${emoji} ${card.name} trovata e aggiunta alla mano (Necrovalley scoperta)!`);
            } else {
                deck.push(card);
                ctx.log(`${emoji} ${card.name} trovata e rimessa in cima al Deck!`);
            }
        });
    }

    // 1026 — Un Gufo Fortunato / An Owl of Luck: FLIP, cerca 1 Magia
    // Campo dal Deck.
    CardEffects.register(1026, {
        onFlip(ctx) {
            searchAndPlaceOnTopOrHandIfNecrovalley(ctx, (c) => c.type === 'spell' && c.subtype === 'field', '🦉');
        }
    });

    // 1027 — Un Gatto di Malaugurio / A Cat of Ill Omen: FLIP, cerca 1
    // Trappola dal Deck.
    CardEffects.register(1027, {
        onFlip(ctx) {
            searchAndPlaceOnTopOrHandIfNecrovalley(ctx, (c) => c.type === 'trap', '🐈‍⬛');
        }
    });

    // 1028 — Manipolatore di Draghi / Dragon Manipulator: FLIP, prende
    // il controllo di 1 mostro Tipo Drago scoperto avversario fino alla
    // End Phase — ctx.takeControl senza permanent:true ha GIÀ questa
    // identica durata (processTemporaryControlReturns, chiamato in
    // enterEndPhase di game-flow.js), nessuna infrastruttura nuova.
    CardEffects.register(1028, {
        onFlip(ctx) {
            const candidati = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.race === 'Drago') candidati.push({ owner: ctx.opponent, index, card: slot.card });
            });
            chooseFieldMonsterTarget(ctx, candidati, {
                title: '🐉 Manipolatore di Draghi',
                text: 'Scegli quale mostro Drago avversario prendere sotto controllo fino alla End Phase.'
            }, (scelta) => {
                const decl = ctx.declareTarget(scelta.owner, scelta.index);
                if (!decl.allowed) return;
                ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex, false);
                ctx.log('🐉 Manipolatore di Draghi prende il controllo di un mostro Drago avversario fino alla End Phase!');
            });
        }
    });

    // 1029 — Fauci dell'Oscura Dipartita / Jowls of Dark Demise: FLIP,
    // prende il controllo di 1 mostro scoperto avversario (qualunque
    // Tipo) fino alla End Phase, stesso meccanismo di 1028 qui sopra —
    // qui in più il mostro rubato può attaccare direttamente finché
    // resta sotto controllo, via il nuovo store generico
    // gameState.grantDirectAttackWhileControlledUids (duel-engine.js:
    // riapplicato ad ogni render in recomputeStaticEffects, svuotato in
    // processTemporaryControlReturns insieme al ritorno del controllo).
    CardEffects.register(1029, {
        onFlip(ctx) {
            const candidati = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown) candidati.push({ owner: ctx.opponent, index, card: slot.card });
            });
            chooseFieldMonsterTarget(ctx, candidati, {
                title: "👹 Fauci dell'Oscura Dipartita",
                text: 'Scegli quale mostro avversario prendere sotto controllo fino alla End Phase.'
            }, (scelta) => {
                const decl = ctx.declareTarget(scelta.owner, scelta.index);
                if (!decl.allowed) return;
                const stolenCard = ctx.field(decl.targetOwner)[decl.targetIndex].card;
                if (!ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex, false)) return;
                gameState.grantDirectAttackWhileControlledUids = gameState.grantDirectAttackWhileControlledUids || new Set();
                gameState.grantDirectAttackWhileControlledUids.add(stolenCard.uid);
                ctx.log("👹 Fauci dell'Oscura Dipartita prende il controllo di un mostro avversario fino alla End Phase: può attaccare direttamente!");
            });
        }
    });

    // 1030 — Barattolo Cobra / Cobra Jar: FLIP, Special Summon di un
    // Token Serpente Velenoso (costruito a mano, non tramite
    // ctx.createTokens — quell'helper forza sempre la Posizione di
    // Difesa, qui invece il token reale entra in Posizione di Attacco).
    // SEMPLIFICAZIONE (vedi missingEffectNote): manca il danno quando il
    // Token viene distrutto in battaglia.
    CardEffects.register(1030, {
        onFlip(ctx) {
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const token = {
                id: -1,
                uid: ctx.newTokenUid('token'),
                name: 'Token Serpente Velenoso',
                type: 'monster',
                isToken: true,
                level: 3,
                race: 'Rettile',
                attribute: 'TERRA',
                attack: 1200,
                defense: 1200
            };
            ctx.specialSummon(ctx.owner, token, slotIndex, 'attack', 'token');
            ctx.log('🐍 Barattolo Cobra Special Summona un Token Serpente Velenoso!');
        }
    });

    // ================================================================
    // 1031-1038 — prima serie, quarta ondata: gli ultimi 8 Mostri Flip
    // (Legacy of Darkness/Spell Ruler/Pharaoh's Servant). Restano fuori
    // Mysterious Guard/Morphing Jar #2/Parasite Paracide/Supply,
    // genuinamente più complesse (targeting multiplo condizionale,
    // mescolamento+escavazione, carta piantata nel Deck avversario,
    // tracciamento "mandata al Cimitero come materiale di Fusione") —
    // rimandate a una battuta dedicata.
    // ================================================================

    // 1031 — Domatore d'Ombre / Shadow Tamer: FLIP, prende il controllo
    // di 1 mostro Tipo Demone avversario fino alla End Phase — stesso
    // schema di Manipolatore di Draghi (id 1028)/Fauci dell'Oscura
    // Dipartita (id 1029), solo filtrato per razza diversa.
    CardEffects.register(1031, {
        onFlip(ctx) {
            const candidati = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown && slot.card.race === 'Demone') candidati.push({ owner: ctx.opponent, index, card: slot.card });
            });
            chooseFieldMonsterTarget(ctx, candidati, {
                title: '👤 Domatore d\'Ombre',
                text: 'Scegli quale mostro Demone avversario prendere sotto controllo fino alla End Phase.'
            }, (scelta) => {
                const decl = ctx.declareTarget(scelta.owner, scelta.index);
                if (!decl.allowed) return;
                ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex, false);
                ctx.log('👤 Domatore d\'Ombre prende il controllo di un mostro Demone avversario fino alla End Phase!');
            });
        }
    });

    // returnSpellTrapToHand vive ora fra gli helper condivisi, in cima a
    // js/engine/card-effects.js: serve a gruppi di carte lontani fra loro,
    // quindi non può stare dentro un singolo file-parte.


    // 1032 — Uccello Tornado / Tornado Bird: FLIP, fa tornare in mano
    // fino a 2 Magie/Trappole sul Terreno (di uno o entrambi i lati) —
    // a differenza di Turbine Gigante (id 262, TUTTE le Magie/Trappole
    // di entrambi), qui il limite è 2: auto-selezionate prima dal campo
    // avversario poi dal proprio.
    CardEffects.register(1032, {
        onFlip(ctx) {
            let count = 0;
            for (const owner of [ctx.opponent, ctx.owner]) {
                const stField = ctx.stField(owner);
                for (let i = 0; i < stField.length && count < 2; i++) {
                    if (stField[i]) {
                        returnSpellTrapToHand(ctx, owner, i);
                        count++;
                    }
                }
                if (count >= 2) break;
            }
            ctx.log(`🌪️ Uccello Tornado fa tornare in mano ${count} cart${count === 1 ? 'a' : 'e'} Magia/Trappola!`);
        }
    });

    // 1033 — Scarabeo Bombardiere / Bombardment Beetle: FLIP, guarda 1
    // mostro in Difesa coperta dell'avversario; se è un Mostro Effetto
    // lo distrugge (senza farne scattare il FLIP), altrimenti lo lascia
    // dov'è. "Mostro Effetto" qui = ha una registrazione reale E non è
    // vanilla (card.vanilla), stessa convenzione già usata altrove nel
    // dataset per distinguere le due categorie.
    CardEffects.register(1033, {
        onFlip(ctx) {
            const index = ctx.field(ctx.opponent).findIndex((slot) => slot && slot.isFaceDown && slot.position === 'defense');
            if (index === -1) return;
            const card = ctx.field(ctx.opponent)[index].card;
            const isEffectMonster = !card.vanilla && !!DuelEngine.getDefinition(card.id);
            ctx.log(`🪲 Scarabeo Bombardiere rivela ${card.name}!`);
            if (isEffectMonster) {
                ctx.destroyMonster(ctx.opponent, index);
                ctx.log(`🪲 ${card.name} è un Mostro Effetto: distrutto senza attivarne il FLIP!`);
            } else {
                ctx.log(`🪲 ${card.name} non è un Mostro Effetto: resta coperto.`);
            }
        }
    });

    // 1034 — Invasore del Trono / Invader of the Throne: FLIP, scambia
    // PERMANENTEMENTE il controllo con 1 mostro avversario (mai se
    // girata scoperta durante la Battle Phase, es. attaccata mentre
    // coperta) — due chiamate a ctx.takeControl con permanent:true (a
    // differenza di Domatore d'Ombre/Manipolatore di Draghi qui sopra,
    // "switch control" non torna mai da solo a fine turno).
    CardEffects.register(1034, {
        onFlip(ctx) {
            if (ctx.gameState.phase === 'battle') return;
            const myIndex = ctx.field(ctx.owner).findIndex((slot) => slot && slot.card.uid === ctx.card.uid);
            if (myIndex === -1) return;
            const candidati = [];
            ctx.field(ctx.opponent).forEach((slot, index) => {
                if (slot && !slot.isFaceDown) candidati.push({ owner: ctx.opponent, index, card: slot.card });
            });
            chooseFieldMonsterTarget(ctx, candidati, {
                title: '🏰 Invasore del Trono',
                text: 'Scegli con quale mostro avversario scambiare il controllo.'
            }, (scelta) => {
                const decl = ctx.declareTarget(scelta.owner, scelta.index);
                if (!decl.allowed) return;
                const theirCard = ctx.field(decl.targetOwner)[decl.targetIndex].card;
                ctx.takeControl(ctx.owner, decl.targetOwner, decl.targetIndex, true);
                ctx.takeControl(decl.targetOwner, ctx.owner, myIndex, true);
                ctx.log(`🏰 Invasore del Trono scambia il controllo con ${theirCard.name}!`);
            });
        }
    });

    // 1035 — Bollettino Meteo / Weather Report: FLIP, distrugge ogni
    // "Spada Rivelatrice" (id 8) scoperta dell'avversario.
    // SEMPLIFICAZIONE (vedi missingEffectNote): manca la seconda Battle
    // Phase concessa se ne distrugge almeno una.
    CardEffects.register(1035, {
        onFlip(ctx) {
            let count = 0;
            ctx.stField(ctx.opponent).forEach((slot, i) => {
                if (slot && !slot.isFaceDown && slot.card.id === 8) {
                    ctx.graveyard(ctx.opponent).push(slot.card);
                    ctx.stField(ctx.opponent)[i] = null;
                    count++;
                }
            });
            if (count > 0) ctx.log(`🌦️ Bollettino Meteo distrugge ${count} Spada Rivelatrice!`);
        }
    });

    // 1036 — Lanciere Sciocco / Spear Cretin: quando questa carta viene
    // distrutta DOPO essere stata girata scoperta (onDestroy scatta
    // solo per una carta già in campo, quindi copre esattamente questo
    // caso), entrambi i giocatori Special Summonano 1 mostro dal proprio
    // Cimitero — ora una vera scelta per ciascun lato
    // (searchGraveyardWithChoice), non più sempre il primo trovato.
    // SEMPLIFICAZIONE residua (vedi missingEffectNote): sempre scoperto
    // in Attacco, mai la Difesa coperta.
    CardEffects.register(1036, {
        // Ogni lato sceglie il PROPRIO mostro da rianimare (searchGraveyardWithChoice
        // apre un picker per il giocatore umano solo se ctx.owner === 'player'
        // — qui il chooser di ogni iterazione è `owner`, non
        // ctx.owner/controllore di questa carta, quindi serve un ctx
        // dedicato per il lato che non coincide con ctx.owner, stesso
        // pattern "opponentCtx" già usato per Gilasaurus id 266).
        onDestroy(ctx) {
            // Bug reale trovato scrivendo il test di questa correzione:
            // destroyMonster (duel-engine.js) manda GIÀ questa stessa carta
            // (Lanciere Sciocco) al Cimitero PRIMA di sparare onDestroy —
            // il filtro deve escludere ctx.card.uid, altrimenti sul lato
            // ctx.owner (dove risiede Lanciere Sciocco stesso) risulterebbero
            // 2 "candidati" invece di 1 (se stessa + il vero mostro da
            // rianimare), aprendo inutilmente un picker con una scelta
            // fasulla invece di auto-selezionare l'unico vero candidato.
            ['player', 'bot'].forEach((owner) => {
                if (ctx.findEmptyMonsterSlot(owner) === -1) return;
                const ownerCtx = owner === ctx.owner ? ctx : DuelEngine.makeContext(owner, {});
                searchGraveyardWithChoice(ownerCtx, owner, (c) => c.type === 'monster' && c.uid !== ctx.card.uid, {
                    title: '💀 Lanciere Sciocco',
                    text: 'Scegli quale mostro Special Summonare dal Cimitero.'
                }, (card) => {
                    // "scoperto in Attacco O coperto in Difesa": e' la
                    // seconda meta' della scelta, e cambia parecchio —
                    // rianimare coperto in Difesa nasconde la carta e ne
                    // riarma l'eventuale effetto FLIP. openPositionPicker
                    // offre esattamente questa coppia. Il bot resta
                    // sull'Attacco di sempre.
                    const completa = (position) => {
                        const slotIndex = ctx.findEmptyMonsterSlot(owner);
                        if (slotIndex === -1) { ctx.graveyard(owner).push(card); return; }
                        ctx.specialSummon(owner, card, slotIndex, position, 'graveyard');
                        ctx.log(`💀 Lanciere Sciocco fa Special Summonare ${card.name} (${owner === 'player' ? 'tuo' : 'del bot'}) dal Cimitero!`);
                    };
                    if (owner !== 'player' || !window.DuelEngineUI) { completa('attack'); return; }
                    window.DuelEngineUI.openPositionPicker(null, {
                        title: `${card.name}: in che Posizione?`,
                        onSelect: completa
                    });
                });
            });
        }
    });

    // 1037 — Assalitrice delle Fiamme / Lady Assailant of Flames: FLIP,
    // bandisce le prime 3 carte del proprio Deck (splice(-3,3): "in
    // cima" = fine dell'array, vedi drawCardsToHand in game-flow.js) e
    // infligge 800 danni.
    CardEffects.register(1037, {
        onFlip(ctx) {
            const deck = ctx.owner === 'player' ? gameState.playerDeck : gameState.botDeck;
            if (!Array.isArray(deck)) { ctx.log('🔥 Nessun Deck reale in questa modalità.'); return; }
            const banished = deck.splice(-3, 3);
            banished.forEach((c) => ctx.banish(ctx.owner, c));
            ctx.dealDamage(ctx.opponent, 800);
            ctx.log(`🔥 Assalitrice delle Fiamme bandisce ${banished.length} cart${banished.length === 1 ? 'a' : 'e'} e infligge 800 danni!`);
        }
    });

    // 1038 — Evocatore di Illusioni / Summoner of Illusions: FLIP,
    // tributa 1 altro mostro (scritto a mano, stesso schema di
    // Artigliere dei Guardiani della Tomba id 896) e Special Summon 1
    // Mostro Fusione dall'Extra Deck (ignora del tutto i materiali
    // richiesti, come da testo reale), distrutto in End Phase tramite
    // ctx.grantTemporaryAtkDefBonus(..., destroyAfter:true) — stesso
    // meccanismo già usato per bonus "fino a fine turno" con
    // distruzione programmata (es. Rimozione del Limitatore id 350),
    // qui riusato con bonus nullo solo per la scadenza programmata.
    // SEMPLIFICAZIONE (vedi missingEffectNote): Mostro Fusione
    // auto-selezionato (il primo nell'Extra Deck).
    CardEffects.register(1038, {
        onFlip(ctx) {
            const extraDeck = ctx.owner === 'player' ? gameState.playerExtraDeck : gameState.botExtraDeck;
            if (!Array.isArray(extraDeck) || extraDeck.length === 0) return;
            const sacrificabili = collectFieldTargets(ctx, {
                zone: 'monster', owner: 'self', includiCoperte: true,
                filter: (card) => card.uid !== ctx.card.uid
            });
            if (sacrificabili.length === 0) return;
            // Due scelte in fila, la seconda dentro la callback della
            // prima: quale mostro cedere e quale Fusione tirare fuori. La
            // seconda e' quella che conta di piu' — l'Extra Deck puo'
            // contenere mostri di potenza molto diversa, e prima usciva
            // sempre il primo.
            chooseFieldCardTarget(ctx, sacrificabili, {
                title: '🎭 Evocatore di Illusioni',
                text: 'Scegli quale tuo mostro tributare.'
            }, (scelto) => {
                const tributeSlot = ctx.field(ctx.owner)[scelto.index];
                if (!tributeSlot || tributeSlot.card.uid !== scelto.card.uid) return;
                chooseCardFromList(ctx, extraDeck.slice(), {
                    title: '🎭 Evocatore di Illusioni',
                    text: 'Scegli quale Mostro Fusione Special Summonare dall\'Extra Deck.'
                }, (fusionCard) => {
                    // Indici ricalcolati ORA: fra i due picker il Terreno e
                    // l'Extra Deck possono essere cambiati.
                    const fusionIndex = extraDeck.findIndex((c) => c.uid === fusionCard.uid);
                    if (fusionIndex === -1) return;
                    const tributeIndex = ctx.field(ctx.owner).findIndex((s) => s && s.card.uid === scelto.card.uid);
                    if (tributeIndex === -1) return;
                    const tributedCard = ctx.field(ctx.owner)[tributeIndex].card;
                    ctx.graveyard(ctx.owner).push(tributedCard);
                    ctx.field(ctx.owner)[tributeIndex] = null;
                    extraDeck.splice(fusionIndex, 1);
                    ctx.specialSummon(ctx.owner, fusionCard, tributeIndex, 'attack', 'extra');
                    ctx.grantTemporaryAtkDefBonus(fusionCard, 0, 0, true);
                    ctx.log(`🎭 Evocatore di Illusioni tributa ${tributedCard.name} e Special Summona ${fusionCard.name} dall'Extra Deck (distrutto in End Phase)!`);
                });
            });
        }
    });

    // ================================================================
    // 1039-1045 — prima serie, quinta ondata: 4 Mostri Effetto propedeutici
    // (materiali di Fusione) + 3 Mostri Fusione che li usano. A differenza
    // delle Fusioni vanilla di questo backlog (rimandate: richiederebbero
    // aggiungere anche i LORO materiali, mostri vanilla minori mai
    // prioritari per questo dataset), questi 3 hanno un vero effetto
    // proprio che giustifica implementarli subito insieme ai materiali
    // mancanti — vedi missingEffectNote su ciascuno per i limiti onesti.
    // ================================================================

    // 1039 — Saggio della Frontiera / Frontier Wiseman: "nega gli effetti
    // Magia che scelgono come bersaglio un tuo mostro Tipo Guerriero, e
    // se lo fai, distruggi quella Magia" — nuovo floodgate
    // def.protectsOwnRaceFromSpellTargeting (duel-engine.js,
    // declareCardEffectTarget), gemello più ristretto del già esistente
    // protectsRaceFromTargeting (Signore dei D. id 353: protegge
    // un'intera razza su ENTRAMBI i campi da OGNI effetto Carta) — qui
    // solo i PROPRI mostri Guerriero, solo da Magie. La "distruzione
    // della Magia" è già il comportamento naturale per una Magia
    // Normale (va comunque al Cimitero dopo la risoluzione, riuscita o
    // no); per una Magia Continua/Equip bloccata sul nascere resta una
    // SEMPLIFICAZIONE minore (nessuna carta di questo dataset la
    // Sacrifica esplicitamente).
    CardEffects.register(1039, {
        protectsOwnRaceFromSpellTargeting: 'Guerriero'
    });

    // 1040 — Drago della Caverna / Cave Dragon: SEMPLIFICAZIONE non
    // implementata (vedi missingEffectNote) — stesso schema di 1039.
    CardEffects.register(1040, {});

    // 1041 — Demone Minore / Lesser Fiend: "bandisci ogni mostro che
    // questa carta distrugge in battaglia" — riusa il già esistente
    // def.onDestroysMonsterByBattle (dodicesima ondata) invece del
    // "marca PRIMA dell'attacco" ipotizzato dalla nota originale: quel
    // hook fira DOPO che il mostro distrutto è già nel Cimitero del suo
    // proprietario, quindi basta redirigerlo da lì con
    // ctx.banishFromGraveyard (già generico, rispetta Necrovalley id 890)
    // invece di anticipare un flag prima ancora di sapere se l'attacco
    // andrà a segno. La clausola "trattata come Arcidemone" resta
    // inerte: nessuna carta di questo dataset la cerca per nome/razza
    // dichiarata.
    CardEffects.register(1041, {
        onDestroysMonsterByBattle(ctx) {
            ctx.banishFromGraveyard(ctx.destroyedCardOwner, ctx.destroyedCard);
        }
    });

    // 1042 — Maryokutai: Effetto Veloce dalla zona Mostro, attivabile
    // SOLO durante il turno dell'avversario, in risposta a una Magia
    // sulla Chain — stesso meccanismo di Effetto Veloce da campo già
    // usato da Ninja d'Assalto (id 459)/Spadaccino Mistico LV6 (id 865),
    // combinato con ctx.negateActivation() già esistente (nato per
    // Giudizio Solenne id 448) per negare l'attivazione in cima alla
    // Chain — nessuna infrastruttura nuova, solo una combinazione di due
    // meccanismi già pronti mai usati insieme prima.
    CardEffects.register(1042, {
        canRespondAsQuickEffect: true,
        canActivate(ctx) {
            if (ctx.owner === ctx.gameState.currentPlayer) return false; // solo durante il turno dell'AVVERSARIO
            const chain = ctx.gameState.chain;
            if (!chain || !chain.links || chain.links.length === 0) return false;
            const top = chain.links[chain.links.length - 1];
            return !!(top.card && top.card.type === 'spell' && !top.negated);
        },
        activate(ctx) {
            const index = ctx.field(ctx.owner).findIndex((slot) => slot && slot.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.field(ctx.owner)[index] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            if (ctx.negateActivation()) {
                ctx.log('🌊 Maryokutai si tributa e nega l\'attivazione della Magia avversaria!');
            }
        }
    });

    // 1043 — Balter Oscuro il Terribile / Dark Balter the Terrible
    // (Fusione di 1039+405): stesso Effetto Veloce di Maryokutai qui
    // sopra (canRespondAsQuickEffect + negateActivation), ma per
    // qualunque Magia Normale (non solo durante il turno avversario) e
    // pagando 1000 LP invece di tributarsi. SEMPLIFICAZIONE (vedi
    // missingEffectNote): manca la negazione dell'effetto dei Mostri
    // Effetto che questa carta distrugge in battaglia.
    CardEffects.register(1043, {
        fusionMaterials: [405, 1039],
        canRespondAsQuickEffect: true,
        canActivate(ctx) {
            const chain = ctx.gameState.chain;
            if (!chain || !chain.links || chain.links.length === 0) return false;
            const top = chain.links[chain.links.length - 1];
            return !!(top.card && top.card.type === 'spell' && top.card.subtype === 'normal' && !top.negated);
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 1000);
            if (ctx.negateActivation()) {
                ctx.log('👹 Balter Oscuro il Terribile paga 1000 LP e nega la Magia Normale!');
            }
        }
    });

    // 1044 — Drago Teschio Demoniaco / Fiend Skull Dragon (Fusione di
    // 1040+1041): nega ogni effetto FLIP mentre è scoperta
    // (gameState.flipEffectsGloballyNegated, nuovo floodgate globale —
    // vedi il commento su recomputeStaticEffects in duel-engine.js);
    // nega e distrugge le Trappole che la scelgono come bersaglio, via
    // il checkpoint di targeting condiviso (stesso schema di Gran Scudo
    // Gardna id 115, qui senza bisogno di girarsi scoperta perché già
    // lo è).
    CardEffects.register(1044, {
        fusionMaterials: [1040, 1041],
        static(ctx) {
            gameState.flipEffectsGloballyNegated = true;
        },
        onCardEffectTargetDeclare(ctx) {
            if (!ctx.sourceCard || ctx.sourceType !== 'trap') return;
            ctx.cancel();
            const trapOwner = ctx.sourceOwner;
            const trapIndex = ctx.stField(trapOwner).findIndex((slot) => slot && slot.card.uid === ctx.sourceCard.uid);
            if (trapIndex !== -1) ctx.destroySpellTrap(trapOwner, trapIndex);
            ctx.log(`🐲 Drago Teschio Demoniaco nega e distrugge ${ctx.sourceCard.name}!`);
        }
    });

    // 1045 — L'Ultimo Guerriero di un Altro Pianeta / The Last Warrior
    // from Another Planet (Fusione di 625+1042): se Special Summonata,
    // distrugge tutti gli altri mostri che il proprietario controlla e
    // impedisce ogni Special Summon ad entrambi i giocatori
    // (gameState.otherMonsterSummonsBlockedFor, già esistente per
    // Guardiano Falce del Terrore id 282 — qui impostato per ENTRAMBI i
    // lati invece che solo per l'avversario). SEMPLIFICAZIONE (vedi
    // missingEffectNote): copre solo la Special Summon, non anche
    // l'Evocazione Normale/Set come da testo reale.
    CardEffects.register(1045, {
        fusionMaterials: [625, 1042],
        onSummon(ctx) {
            if (ctx.summonedVia !== 'special') return;
            let count = 0;
            ctx.field(ctx.owner).forEach((slot, index) => {
                if (slot && slot.card.uid !== ctx.card.uid) {
                    ctx.destroyMonster(ctx.owner, index);
                    count++;
                }
            });
            ctx.log(`🌌 L'Ultimo Guerriero di un Altro Pianeta distrugge ${count} altr${count === 1 ? 'o mostro' : 'i mostri'}!`);
        },
        // gameState.otherMonsterSummonsBlockedFor viene azzerato e
        // ricalcolato ad OGNI render (recomputeStaticEffects,
        // duel-engine.js) — impostarlo in onSummon (una tantum) verrebbe
        // subito perso al render successivo. static() lo mantiene vero
        // finché questa carta resta scoperta sul Terreno, per ENTRAMBI i
        // lati (a differenza di Guardiano Falce del Terrore id 282, che
        // blocca solo il proprio controllore).
        static(ctx) {
            gameState.otherMonsterSummonsBlockedFor.player = true;
            gameState.otherMonsterSummonsBlockedFor.bot = true;
        }
    });

    // ================================================================
    // SESTA ONDATA PRIMA SERIE (id 1046-1059) — 14 Mostri Effetto minori.
    // ================================================================

    // 1046 — Ameba: quando il controllo di questa carta scoperta passa
    // all'avversario, infligge 2000 danni — una volta sola finché resta
    // scoperta (ctx.card.controlSwapEffectUsed, flag PER-ISTANZA diretto
    // sull'oggetto carta: si azzera da solo se una nuova copia viene
    // pescata, nessuno store condiviso necessario per un "una volta"
    // legato alla singola copia fisica). Usa il nuovo hook condiviso
    // def.onControlChangedToOpponent (ACTIONS.takeControl,
    // duel-engine.js) — ctx.owner è già chi ADESSO controlla la carta
    // (il "tuo" del testo), ctx.opponent il proprietario originale (il
    // "tuo avversario" del testo).
    CardEffects.register(1046, {
        onControlChangedToOpponent(ctx) {
            if (ctx.card.controlSwapEffectUsed) return;
            ctx.card.controlSwapEffectUsed = true;
            ctx.dealDamage(ctx.opponent, 2000);
            ctx.log('🟢 Ameba infligge 2000 danni quando il suo controllo passa!');
        }
    });

    // 1047 — Griggle: stesso hook di Ameba (1046), ma guadagna 3000 Life
    // Points invece di infliggere danno.
    CardEffects.register(1047, {
        onControlChangedToOpponent(ctx) {
            if (ctx.card.controlSwapEffectUsed) return;
            ctx.card.controlSwapEffectUsed = true;
            ctx.dealDamage(ctx.owner, -3000);
            ctx.log('🟡 Griggle guadagna 3000 Life Points quando il suo controllo passa!');
        }
    });

    // 1048 — Serpente Elettrico / Electric Snake: scartata dalla mano da
    // un effetto di una carta dell'avversario (ctx.discardedByOwner,
    // stesso discriminatore già usato da Re Neko Mane id 393) — pesca 2.
    CardEffects.register(1048, {
        onSentToGraveyardFromHand(ctx) {
            if (ctx.discardedByOwner !== ctx.opponent) return;
            ctx.drawCards(ctx.owner, 2);
            ctx.log('⚡ Serpente Elettrico pesca 2 carte!');
        }
    });

    // 1049 — La Fanciulla Infelice / The Unhappy Maiden: mandata al
    // Cimitero IN BATTAGLIA (onDestroy scatta comunque anche per un
    // effetto Carta, ma il testo reale copre solo la battaglia — nessun
    // discriminatore esplicito serve qui perché onDestroy da solo non
    // basta: usiamo ctx.destroyedByOwner === undefined && il fatto che
    // la carta sia stata rimossa da una battaglia si riconosce dalla
    // presenza di ctx.destroyedByOpponentCard OPPURE dal danno sul
    // proprio attacco. Per semplicità e coerenza con Nave di Yomi/1057
    // sotto, verifichiamo semplicemente che sia stata una battaglia
    // tramite lo stesso ctx.destroyedByOpponentCard — se assente
    // (distrutta da un effetto Carta, anche proprio), non scatta).
    // ctx.endBattlePhase() è lo stesso helper già usato da Nega Attacco
    // (id 820)/Tartaruga Elettromagnetica (id 223).
    CardEffects.register(1049, {
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard) return;
            ctx.endBattlePhase();
            ctx.log('😢 La Fanciulla Infelice termina immediatamente la Battle Phase!');
        }
    });

    // 1050 — Drago della Truppa / Troop Dragon: distrutto in battaglia,
    // Special Summon un'altra copia dal Deck — stesso schema di Bebè
    // Cerasauro (id 809): ctx.findEmptyMonsterSlot + splice dal Deck.
    CardEffects.register(1050, {
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            const index = deck.findIndex((c) => c.id === 1050);
            if (index === -1) return;
            const card = deck.splice(index, 1)[0];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
            ctx.specialSummon(ctx.owner, card, slotIndex, 'attack', 'deck');
            ctx.log('🐉 Drago della Truppa Special Summona un\'altra copia dal Deck!');
        }
    });

    // 1051 — Momonga Agile / Nimble Momonga: distrutto in battaglia,
    // guadagna 1000 LP (ctx.dealDamage negativo) poi Special Summon un
    // numero qualsiasi di altre copie dal Deck in Posizione di Difesa
    // COPERTA (ctx.specialSummon(..., 'defense', 'deck') imposta da solo
    // isFaceDown=true per la posizione 'defense', vedi ACTIONS.specialSummon
    // in duel-engine.js) — ripete finché ci sono sia slot liberi sia
    // copie nel Deck.
    CardEffects.register(1051, {
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard) return;
            ctx.dealDamage(ctx.owner, -1000);
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            if (!Array.isArray(deck)) return;
            let summoned = 0;
            let slotIndex;
            while ((slotIndex = ctx.findEmptyMonsterSlot(ctx.owner)) !== -1) {
                const index = deck.findIndex((c) => c.id === 1051);
                if (index === -1) break;
                const card = deck.splice(index, 1)[0];
                gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = deck.length;
                ctx.specialSummon(ctx.owner, card, slotIndex, 'defense', 'deck');
                summoned++;
            }
            ctx.log(`🐿️ Momonga Agile guadagna 1000 Life Points${summoned > 0 ? ` e Special Summona altre ${summoned} copie coperte dal Deck` : ''}!`);
        }
    });

    // 1052 — Des Lacooda: Ignition una volta per turno (ctx.hasUsedOncePerTurn/
    // markUsedOncePerTurn, stesso idioma già usato da decine di altre
    // carte in questo file) per coprirsi da solo in Posizione di Difesa;
    // quando Evocata Flip (onFlip), pesca 1 carta.
    CardEffects.register(1052, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            if (ctx.hasUsedOncePerTurn(`1052:${ctx.card.uid}`)) return false;
            return true;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`1052:${ctx.card.uid}`);
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.isFaceDown = true;
            slot.position = 'defense';
            ctx.log('🐫 Des Lacooda si copre in Posizione di Difesa!');
        },
        onFlip(ctx) {
            ctx.drawCards(ctx.owner, 1);
            ctx.log('🐫 Des Lacooda, Evocato Flip: pesca 1 carta!');
        }
    });

    // 1053 — Cavallo dell'Incubo / Nightmare Horse: può attaccare
    // direttamente SEMPRE, nessuna condizione (gameState.directAttackAllowedUids,
    // stesso schema incondizionato di Folletto della Fiamma Furente id 681).
    CardEffects.register(1053, {
        static(ctx) {
            gameState.directAttackAllowedUids[ctx.card.uid] = true;
        }
    });

    // 1054 — Tirapiedi Alato / Winged Minion: si tributa da solo, sceglie
    // 1 mostro Demone scoperto e gli dà +700/+700 finché resta scoperto —
    // mutazione diretta e permanente delle statistiche, stessa
    // convenzione già usata altrove in questo motore (es. Drago Berserk
    // id 110) per un bonus "finché resta scoperto" senza uno store
    // dedicato a scadenza. Tirapiedi Alato è ESSO STESSO un mostro Tipo
    // Demone: `i !== ctx.index` lo esclude dai propri candidati (stesso
    // accorgimento di Spadaccino di Fiamma Blu id 122) — nel gioco reale
    // il Tributo è un COSTO pagato prima che l'effetto si risolva, quindi
    // la carta non è più sul Terreno quando si sceglie il bersaglio.
    CardEffects.register(1054, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            return ctx.field(ctx.owner).some((s, i) => s && i !== ctx.index && !s.isFaceDown && s.card.race === 'Demone');
        },
        activate(ctx) {
            const candidates = [];
            ctx.field(ctx.owner).forEach((s, i) => { if (s && i !== ctx.index && !s.isFaceDown && s.card.race === 'Demone') candidates.push(s.card); });
            if (candidates.length === 0) return;
            const applyBuff = (target) => {
                const ownIndex = ctx.index;
                ctx.field(ctx.owner)[ownIndex] = null;
                ctx.graveyard(ctx.owner).push(ctx.card);
                target.attack += 700;
                target.defense += 700;
                ctx.log(`👹 Tirapiedi Alato si tributa: ${target.name} guadagna 700 ATK/DEF!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { applyBuff(candidates[0]); return; }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '👹 Tirapiedi Alato',
                text: 'Scegli 1 mostro Demone scoperto a cui dare +700 ATK/DEF (questa carta si tributa).',
                onSelect: applyBuff
            });
        }
    });

    // 1055 — Samurai Sasuke / Sasuke Samurai: testo identico a Paladino
    // del Drago Bianco (id 398)/Spadaccino Mistico LV2 (id 718) — riusa
    // lo stesso flag condiviso invece di reinventarlo.
    CardEffects.register(1055, {
        instantlyDestroysFaceDownDefender: true
    });

    // 1056 — Servitore del Catabolismo / Servant of Catabolism: attacco
    // diretto incondizionato, stesso schema di 1053 sopra.
    CardEffects.register(1056, {
        static(ctx) {
            gameState.directAttackAllowedUids[ctx.card.uid] = true;
        }
    });

    // 1057 — Nave di Yomi / Yomi Ship: distrutta in battaglia, distrugge
    // chi l'ha distrutta (ctx.destroyedByOpponentCard è già la carta
    // avversaria coinvolta nello scontro, popolato solo per una
    // distruzione da BATTAGLIA — vedi fireOnDestroy in actions.js).
    // SEMPLIFICAZIONE: se il mostro attaccante è già stato rimosso dal
    // campo (es. da un altro effetto simultaneo), non c'è nulla da
    // distruggere — nessuna carta di questo motore prevede oggi quel
    // caso per una ritorsione di questo tipo.
    CardEffects.register(1057, {
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard) return;
            const field = ctx.field(ctx.opponent);
            const index = field.findIndex((s) => s && s.card.uid === ctx.destroyedByOpponentCard.uid);
            if (index === -1) return;
            ctx.destroyMonster(ctx.opponent, index);
            ctx.log(`🚢 Nave di Yomi distrugge ${ctx.destroyedByOpponentCard.name} per ritorsione!`);
        }
    });

    // 1058 — Tuorlo Mucoso / Mucus Yolk: attacco diretto incondizionato
    // (come 1053/1056) + ogni volta che infligge danno da battaglia,
    // +1000 ATK "durante la tua prossima Standby Phase" — nuovo store
    // condiviso e generico gameState.pendingStandbyAtkBuffs (array di
    // {uid, owner, amount}, duel-engine.js/processPendingStandbyAtkBuffs,
    // agganciato in enterStandbyPhase() come processKiseitaiLifeGain già
    // esistente) invece di un campo specifico per questa sola carta —
    // riusabile da qualunque futura carta con lo stesso identico
    // schema "guadagna ATK alla PROSSIMA Standby Phase del controllore".
    CardEffects.register(1058, {
        static(ctx) {
            gameState.directAttackAllowedUids[ctx.card.uid] = true;
        },
        onDealsBattleDamage(ctx) {
            if (ctx.targetIndex !== -1) return;
            gameState.pendingStandbyAtkBuffs = gameState.pendingStandbyAtkBuffs || [];
            gameState.pendingStandbyAtkBuffs.push({ uid: ctx.card.uid, owner: ctx.owner, amount: 1000 });
            ctx.log('🥚 Tuorlo Mucoso guadagnerà 1000 ATK alla sua prossima Standby Phase!');
        }
    });

    // 1059 — Amuleto di Shabti / Charm of Shabti: attivabile dalla mano,
    // a velocità istantanea, durante il turno di UNO QUALUNQUE dei due
    // giocatori — questo motore non ha alcuna finestra di priorità per
    // un'attivazione dalla mano fuori da una Chain già aperta o da un
    // trigger nominato (stesso limite già accettato per Sentinella dei
    // Guardiani della Tomba, id 900): registrata senza hook funzionale,
    // SEMPLIFICAZIONE onestamente documentata in cards.json.
    CardEffects.register(1059, {});

    // ================================================================
    // SETTIMA ONDATA PRIMA SERIE (id 1060-1066) — 7 Mostri Effetto minori.
    // ================================================================

    // 1060 — Insetto dalle 8 Chele (Arsenal Bug): se non controlli altri
    // mostri Tipo Insetto, ATK/DEF diventano 1000 (base 2000/2000) —
    // gameState.atkDefBonus (bonus/malus DELTA sommato alla base, stesso
    // store condiviso già usato da decine di Magie Equipaggiamento in
    // questo file, es. Ciondolo Nero id 117), qui applicato come -1000
    // condizionale invece che come equip fisso.
    CardEffects.register(1060, {
        static(ctx) {
            const hasOtherInsect = ctx.field(ctx.owner).some((s) => s && s.card.uid !== ctx.card.uid && s.card.race === 'Insetto');
            if (!hasOtherInsect) {
                const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk - 1000, def: e.def - 1000 };
            }
        }
    });

    // 1061 — Shock di Byser (Byser Shock): quando Evocata (Normale o
    // Special, def.onSummon copre entrambe — vedi fireTrigger,
    // duel-engine.js), fa tornare in mano OGNI carta coperta sul
    // Terreno, di ENTRAMBI i giocatori — riusa returnSpellTrapToHand
    // (helper condiviso già esistente in questo file, nato per Turbine
    // Gigante id 262).
    CardEffects.register(1061, {
        onSummon(ctx) {
            ['player', 'bot'].forEach((owner) => {
                const st = ctx.stField(owner);
                for (let i = st.length - 1; i >= 0; i--) {
                    if (st[i] && st[i].isFaceDown) returnSpellTrapToHand(ctx, owner, i);
                }
            });
            ctx.log('👹 Shock di Byser fa tornare in mano tutte le carte coperte sul Terreno!');
        }
    });

    // 1062 — Sparajongler Esplosivo (Blast Juggler): attivabile SOLO
    // durante la propria Standby Phase, si tributa da sola per
    // distruggere 2 mostri scoperti con ATK 1000 o meno (di uno o
    // entrambi i lati) — sceglie una carta alla volta con
    // ctx.destroyTargetedMonster (checkpoint di targeting condiviso),
    // ricalcolando i candidati dopo ogni scelta (un bersaglio già
    // scelto/distrutto non può essere ripescato per il secondo).
    CardEffects.register(1062, {
        canActivate(ctx) {
            return gameState.phase === 'standby' && gameState.currentPlayer === ctx.owner;
        },
        activate(ctx) {
            const ownIndex = ctx.index;
            ctx.field(ctx.owner)[ownIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            const gatherCandidates = () => {
                const list = [];
                ['player', 'bot'].forEach((owner) => {
                    ctx.field(owner).forEach((s, i) => {
                        if (s && !s.isFaceDown && (s.card.attack || 0) <= 1000) list.push({ owner: owner, index: i, card: s.card });
                    });
                });
                return list;
            };
            const destroyOne = (entry) => {
                const result = ctx.destroyTargetedMonster(entry.owner, entry.index);
                if (result.allowed && result.card) ctx.log(`💣 Sparajongler Esplosivo distrugge ${result.card.name}!`);
            };
            const pickAndDestroy = (remaining) => {
                if (remaining <= 0) return;
                const candidates = gatherCandidates();
                if (candidates.length === 0) return;
                if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                    destroyOne(candidates[0]);
                    pickAndDestroy(remaining - 1);
                    return;
                }
                window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                    title: '💣 Sparajongler Esplosivo',
                    text: `Scegli ${remaining} mostr${remaining === 1 ? 'o' : 'i'} scoperto con ATK 1000 o meno da distruggere.`,
                    onSelect: (chosenCard) => {
                        const entry = candidates.find((c) => c.card.uid === chosenCard.uid);
                        if (entry) destroyOne(entry);
                        pickAndDestroy(remaining - 1);
                    }
                });
            };
            pickAndDestroy(2);
        }
    });

    // 1063 — Sentinella Cremisi (Crimson Sentry): si tributa per
    // rimandare in fondo al proprio Deck 1 proprio mostro distrutto in
    // battaglia QUESTO turno — nuovo tracker generico
    // gameState.battleDestroyedThisTurnFor (actions.js/game-flow.js, vedi
    // i commenti lì). "Fondo del Deck" = inizio dell'array (opposto di
    // "cima" = fine dell'array, stesso verso di drawCardsToHand/pop).
    CardEffects.register(1063, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const list = gameState.battleDestroyedThisTurnFor && gameState.battleDestroyedThisTurnFor[ctx.owner];
            if (!list || list.length === 0) return false;
            const grave = ctx.graveyard(ctx.owner);
            return list.some((c) => grave.some((g) => g.uid === c.uid));
        },
        activate(ctx) {
            const list = (gameState.battleDestroyedThisTurnFor && gameState.battleDestroyedThisTurnFor[ctx.owner]) || [];
            const grave = ctx.graveyard(ctx.owner);
            const stillInGrave = list.filter((c) => grave.some((g) => g.uid === c.uid));
            if (stillInGrave.length === 0) return;
            const ownIndex = ctx.index;
            ctx.field(ctx.owner)[ownIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            const returnToDeck = (target) => {
                const idx = grave.findIndex((g) => g.uid === target.uid);
                if (idx === -1) return;
                const [card] = grave.splice(idx, 1);
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                gameState[deckKey].unshift(card);
                gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = gameState[deckKey].length;
                ctx.log(`🔥 Sentinella Cremisi rimanda ${card.name} in fondo al Deck!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { returnToDeck(stillInGrave[0]); return; }
            window.DuelEngineUI.openCardListPicker(stillInGrave, {
                title: '🔥 Sentinella Cremisi',
                text: 'Scegli 1 tuo mostro distrutto in battaglia questo turno da rimandare in fondo al Deck (questa carta si tributa).',
                onSelect: returnToDeck
            });
        }
    });

    // 1064 — Sirena Curatrice (Cure Mermaid): finché resta scoperta,
    // guadagna 800 LP ad ogni propria Standby Phase — def.onStandbyPhase
    // (firePhaseTrigger, duel-engine.js) scatta già SOLO per chi
    // controlla la carta durante la SUA fase, nessuna condizione
    // aggiuntiva necessaria.
    CardEffects.register(1064, {
        onStandbyPhase(ctx) {
            ctx.dealDamage(ctx.owner, -800);
            ctx.log('🧜 Sirena Curatrice fa guadagnare 800 Life Points!');
        }
    });

    // 1065 — Fata Danzante (Dancing Fairy): stesso schema di Sirena
    // Curatrice (1064) sopra, ma SOLO se resta in Posizione di Difesa
    // scoperta (ctx.slot.position, già esposto da firePhaseTrigger).
    CardEffects.register(1065, {
        onStandbyPhase(ctx) {
            if (ctx.slot.position !== 'defense') return;
            ctx.dealDamage(ctx.owner, -1000);
            ctx.log('🧚 Fata Danzante fa guadagnare 1000 Life Points!');
        }
    });

    // 1066 — Elfa Oscura (Dark Elf): riusa requiresLifePointsToAttack
    // (già esistente, nato per Sirena Toon id 484/Teschio Evocato Toon
    // id 486) — nessun codice nuovo necessario.
    CardEffects.register(1066, {
        requiresLifePointsToAttack: 1000
    });

    // ================================================================
    // OTTAVA ONDATA PRIMA SERIE (id 1067-1074) — 8 Mostri Effetto minori.
    // ================================================================

    // 1067 — Scassinatori Scorpioni Oscuri (Dark Scorpion Burglars):
    // quando infligge danno da battaglia all'avversario (onDealsBattleDamage,
    // già dispatchato da fireOwnBattleDamageDealt per OGNI danno da
    // battaglia, non solo l'attacco diretto — vedi actions.js), scarta
    // (mill) 1 Magia dal Deck avversario al suo Cimitero.
    CardEffects.register(1067, {
        onDealsBattleDamage(ctx) {
            searchDeckWithChoice(ctx, (c) => c.type === 'spell', { deckOwner: ctx.opponent, title: '🗡️ Scassinatori Scorpioni Oscuri', text: "Scegli quale Magia mandare al Cimitero dal Deck dell'avversario." }, (card) => {
                ctx.graveyard(ctx.opponent).push(card);
                ctx.log(`🗡️ Scassinatori Scorpioni Oscuri manda ${card.name} dal Deck avversario al Cimitero!`);
            });
        }
    });

    // 1068 — Guerriero degli Abissi (Deepsea Warrior): finché "Umi" (id
    // 497) è sul Terreno, non è influenzato dagli effetti Magia — stesso
    // schema PER-ISTANZA già usato da Il Pescatore Leggendario (id 879,
    // vedi il commento lì): gameState.cannotBeTargetedBySpellsUids,
    // ricalcolato ad ogni render. SEMPLIFICAZIONE identica a id 879/285:
    // copre solo il "presa di mira", non ogni Magia che lo influenza
    // SENZA sceglierlo come bersaglio.
    CardEffects.register(1068, {
        static(ctx) {
            const umiPresent = ['playerFieldSpell', 'botFieldSpell'].some((key) => {
                const fs = ctx.gameState[key];
                return fs && !fs.isFaceDown && fs.card.id === 497;
            }) || gameState.virtualUmiPresent;
            if (!umiPresent) return;
            gameState.cannotBeTargetedBySpellsUids[ctx.card.uid] = true;
        }
    });

    // 1069 — Guardiana delle Fate (Fairy Guardian): si tributa per
    // rimandare in fondo al proprio Deck 1 propria Magia mandata al
    // Cimitero da un effetto dell'AVVERSARIO in QUESTO turno — nuovo
    // tracker generico gameState.spellsSentToGraveyardByOpponentThisTurnFor
    // (duel-engine.js/game-flow.js, vedi i commenti lì), stesso identico
    // schema di Sentinella Cremisi (id 1063) ma per Magie invece che
    // mostri distrutti in battaglia.
    CardEffects.register(1069, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const list = gameState.spellsSentToGraveyardByOpponentThisTurnFor && gameState.spellsSentToGraveyardByOpponentThisTurnFor[ctx.owner];
            if (!list || list.length === 0) return false;
            const grave = ctx.graveyard(ctx.owner);
            return list.some((c) => grave.some((g) => g.uid === c.uid));
        },
        activate(ctx) {
            const list = (gameState.spellsSentToGraveyardByOpponentThisTurnFor && gameState.spellsSentToGraveyardByOpponentThisTurnFor[ctx.owner]) || [];
            const grave = ctx.graveyard(ctx.owner);
            const stillInGrave = list.filter((c) => grave.some((g) => g.uid === c.uid));
            if (stillInGrave.length === 0) return;
            const ownIndex = ctx.index;
            ctx.field(ctx.owner)[ownIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            const returnToDeck = (target) => {
                const idx = grave.findIndex((g) => g.uid === target.uid);
                if (idx === -1) return;
                const [card] = grave.splice(idx, 1);
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                gameState[deckKey].unshift(card);
                gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = gameState[deckKey].length;
                ctx.log(`🧚 Guardiana delle Fate rimanda ${card.name} in fondo al Deck!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { returnToDeck(stillInGrave[0]); return; }
            window.DuelEngineUI.openCardListPicker(stillInGrave, {
                title: '🧚 Guardiana delle Fate',
                text: 'Scegli 1 tua Magia mandata al Cimitero da un effetto avversario questo turno da rimandare in fondo al Deck (questa carta si tributa).',
                onSelect: returnToDeck
            });
        }
    });

    // 1070 — Assalitore Lampo (Flash Assailant): -400 ATK/DEF per ogni
    // carta nella propria mano — gameState.atkDefBonus ricalcolato ad
    // ogni render dentro static(), stesso store condiviso già usato per
    // decine di bonus/malus in questo file.
    CardEffects.register(1070, {
        static(ctx) {
            const penalty = 400 * ctx.hand(ctx.owner).length;
            if (penalty === 0) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk - penalty, def: e.def - penalty };
        }
    });

    // 1071 — Mummia dall'Ascia Gigante (Giant Axe Mummy): Ignition una
    // volta per turno per coprirsi in Posizione di Difesa (stesso schema
    // di Des Lacooda id 1052). La seconda clausola del testo reale ("se
    // l'attaccante ha ATK inferiore alla DEF di questa carta, l'attaccante
    // viene distrutto") non richiede alcun codice: è già il comportamento
    // STANDARD di questo motore per qualunque mostro in Posizione di
    // Difesa (vedi "Risoluzione battaglia: le 6 combinazioni base" nella
    // suite di test) — il testo della carta descrive solo la meccanica
    // normale, non un'eccezione.
    CardEffects.register(1071, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            if (ctx.hasUsedOncePerTurn(`1071:${ctx.card.uid}`)) return false;
            return true;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`1071:${ctx.card.uid}`);
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.isFaceDown = true;
            slot.position = 'defense';
            ctx.log('🪓 Mummia dall\'Ascia Gigante si copre in Posizione di Difesa!');
        }
    });

    // 1072 — Tartaruga Gora (Gora Turtle): finché resta scoperta, i
    // mostri con ATK 1900+ (di ENTRAMBI i lati) non possono dichiarare un
    // attacco — gameState.cannotAttackUids, stesso store condiviso già
    // usato da Messaggero della Pace (id 880, soglia 1500), qui senza
    // alcun costo di mantenimento (il testo reale di Gora Turtle non ne
    // ha uno).
    CardEffects.register(1072, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (slot && !slot.isFaceDown && slot.card.attack >= 1900) {
                        gameState.cannotAttackUids[slot.card.uid] = true;
                    }
                });
            });
        }
    });

    // 1073 — Ala Grigia (Gray Wing): scarta 1 carta dalla mano durante
    // la propria Main Phase 1 per poter attaccare due volte questo turno
    // — riusa slot.extraAttackGranted (già esistente, nato per
    // Riavvolgimento Toon id 485: +1 attacco concesso una tantum,
    // azzerato ad ogni changeTurn()), impostato qui direttamente sulla
    // propria casella invece che da un'altra carta.
    CardEffects.register(1073, {
        canActivate(ctx) {
            if (gameState.phase !== 'main1' || gameState.currentPlayer !== ctx.owner) return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.extraAttackGranted) return false;
            return ctx.hand(ctx.owner).length > 0;
        },
        activate(ctx) {
            offerHandDiscardChoice(ctx, {
                title: '🐉 Ala Grigia',
                text: 'Scegli quale carta scartare dalla mano.'
            }, () => {
                const slot = ctx.field(ctx.owner)[ctx.index];
                if (slot) slot.extraAttackGranted = true;
                ctx.log('🐉 Ala Grigia scarta 1 carta: può attaccare due volte in questa Battle Phase!');
            });
        }
    });

    // 1074 — Hoshiningen: finché resta scoperta, tutti i mostri LUCE sul
    // Terreno (di ENTRAMBI i lati) guadagnano 500 ATK, tutti i mostri
    // OSCURITÀ ne perdono 400 — gameState.atkDefBonus, stesso schema di
    // Un Oceano Leggendario/decine di altre carte in questo file.
    CardEffects.register(1074, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    if (slot.card.attribute === 'LUCE') {
                        const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                        gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 500, def: e.def };
                    } else if (slot.card.attribute === 'OSCURITÀ') {
                        const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                        gameState.atkDefBonus[slot.card.uid] = { atk: e.atk - 400, def: e.def };
                    }
                });
            });
        }
    });

    // ================================================================
    // NONA ONDATA PRIMA SERIE (id 1075-1083) — 9 Mostri Effetto minori.
    // ================================================================

    // Cerca su ENTRAMBI i campi Mostro in quale casella si trova
    // `targetCard` (per uid) — nuovo helper condiviso, nato per Tigre Re
    // Wanghu (1077)/Kotodama (1078) qui sotto: entrambe reagiscono a
    // "un qualunque mostro Evocato/girato scoperto" (def.onAnyNormalOrFlipSummon/
    // onAnySpecialSummon, duel-engine.js) e devono localizzare la carta
    // appena arrivata per poterla poi distruggere — riusabile da
    // qualunque futura carta con lo stesso bisogno.
    function findCardFieldLocation(targetCard) {
        for (const owner of ['player', 'bot']) {
            const field = owner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
            const index = field.findIndex((s) => s && s.card.uid === targetCard.uid);
            if (index !== -1) return { owner: owner, index: index };
        }
        return null;
    }

    // 1075 — Jowgen lo Spiritualista (Jowgen the Spiritualist): scarta 1
    // carta a caso per distruggere ogni mostro Special Summonato sul
    // Terreno (di ENTRAMBI i lati, nuovo marcatore per-slot
    // slot.wasSpecialSummoned, ACTIONS.specialSummon in duel-engine.js) e
    // vietare PERMANENTEMENTE la Special Summon ad ENTRAMBI i giocatori
    // — gameState.specialSummonsPermanentlyBannedForBothSides (nuovo,
    // duel-engine.js/ACTIONS.specialSummon: a differenza di
    // otherMonsterSummonsBlockedFor, MAI azzerato da
    // recomputeStaticEffects, resta vero anche dopo che questa carta
    // lascia il Terreno — corretto per il ruling ufficiale reale).
    CardEffects.register(1075, {
        canActivate(ctx) {
            if (gameState.specialSummonsPermanentlyBannedForBothSides) return false;
            return ctx.hand(ctx.owner).length > 0;
        },
        activate(ctx) {
            ctx.discardRandomFromHand(ctx.owner);
            let destroyedCount = 0;
            ['player', 'bot'].forEach((owner) => {
                for (let i = ctx.field(owner).length - 1; i >= 0; i--) {
                    const slot = ctx.field(owner)[i];
                    if (slot && !slot.isFaceDown && slot.wasSpecialSummoned) {
                        ctx.destroyMonster(owner, i);
                        destroyedCount++;
                    }
                }
            });
            gameState.specialSummonsPermanentlyBannedForBothSides = true;
            ctx.log(`👤 Jowgen lo Spiritualista distrugge ${destroyedCount} mostr${destroyedCount === 1 ? 'o' : 'i'} Special Summonat${destroyedCount === 1 ? 'o' : 'i'} e vieta la Special Summon per sempre!`);
        }
    });

    // 1076 — Invito al Sonno Oscuro (Invitation to a Dark Sleep): quando
    // Evocata Normalmente (onSummon esclude la Special Summon dichiarando
    // anche onSpecialSummon come no-op, vedi fireTrigger/duel-engine.js:
    // se def.onSpecialSummon esiste, la Special Summon chiama SOLO
    // quello, mai onSummon), sceglie 1 mostro avversario scoperto: finché
    // questa carta resta scoperta, quel mostro non può attaccare. Flag
    // PER-ISTANZA sulla carta stessa (ctx.card.lockedAttackBanTargetUid)
    // + gameState.cannotAttackUids (già esistente) ricalcolato ad ogni
    // render dentro static().
    CardEffects.register(1076, {
        onSummon(ctx) {
            const candidates = ctx.field(ctx.opponent).filter((s) => s && !s.isFaceDown).map((s) => s.card);
            if (candidates.length === 0) return;
            const lockTarget = (target) => {
                ctx.card.lockedAttackBanTargetUid = target.uid;
                ctx.log(`😴 Invito al Sonno Oscuro impedisce a ${target.name} di attaccare finché resta scoperta!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                lockTarget(candidates.reduce((a, b) => (b.attack > a.attack ? b : a)));
                return;
            }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '😴 Invito al Sonno Oscuro',
                text: 'Scegli 1 mostro avversario scoperto che non potrà più attaccare finché questa carta resta scoperta.',
                onSelect: lockTarget
            });
        },
        onSpecialSummon() {},
        static(ctx) {
            if (!ctx.card.lockedAttackBanTargetUid) return;
            gameState.cannotAttackUids[ctx.card.lockedAttackBanTargetUid] = true;
        }
    });

    // 1077 — Tigre Re Wanghu (King Tiger Wanghu): "quando un mostro con
    // ATK 1400 o meno viene Evocato Normalmente o Special Summonato,
    // distruggilo" — def.onAnyNormalOrFlipSummon/onAnySpecialSummon
    // (broadcast a ogni carta scoperta di entrambi i lati, duel-engine.js),
    // findCardFieldLocation qui sopra per localizzare il bersaglio.
    // "Questa carta deve restare scoperta per attivarsi e risolversi":
    // già garantito per costruzione, il dispatcher chiama questo hook
    // SOLO sulle carte scoperte al momento dello scatto.
    CardEffects.register(1077, {
        onAnyNormalOrFlipSummon(ctx) { wanghuDestroyIfWeak(ctx, ctx.summonedCard); },
        onAnySpecialSummon(ctx) { wanghuDestroyIfWeak(ctx, ctx.summonedCard); }
    });
    function wanghuDestroyIfWeak(ctx, summonedCard) {
        if (!summonedCard || (summonedCard.attack || 0) > 1400) return;
        const loc = findCardFieldLocation(summonedCard);
        if (!loc) return;
        ctx.destroyMonster(loc.owner, loc.index);
        ctx.log(`🐯 Tigre Re Wanghu distrugge ${summonedCard.name} (ATK 1400 o meno)!`);
    }

    // 1078 — Kotodama: "se esistono mostri scoperti con lo stesso nome
    // sul Terreno, distruggili" — semplificato al caso reale più comune
    // (regola scritta sulla carta stessa): quando un mostro viene
    // Evocato/girato scoperto E un ALTRO mostro con lo stesso nome è già
    // scoperto, distruggi il NUOVO arrivato. Stesso schema di Tigre Re
    // Wanghu (1077) qui sopra, stesso helper condiviso.
    CardEffects.register(1078, {
        onAnyNormalOrFlipSummon(ctx) { kotodamaDestroyIfDuplicate(ctx, ctx.summonedCard); },
        onAnySpecialSummon(ctx) { kotodamaDestroyIfDuplicate(ctx, ctx.summonedCard); }
    });
    function kotodamaDestroyIfDuplicate(ctx, summonedCard) {
        if (!summonedCard) return;
        const loc = findCardFieldLocation(summonedCard);
        if (!loc) return;
        const hasDuplicate = ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown && s.card.uid !== summonedCard.uid && s.card.name === summonedCard.name));
        if (!hasDuplicate) return;
        ctx.destroyMonster(loc.owner, loc.index);
        ctx.log(`📿 Kotodama distrugge ${summonedCard.name}: un'altra copia era già scoperta sul Terreno!`);
    }

    // 1079 — Kryuel: distrutta in battaglia, lancia una moneta — se
    // "vinta" (50%, il "chiamala" del testo reale non cambia la
    // probabilità di un lancio equo, quindi risolto direttamente senza
    // un passaggio di scelta testa/croce), distruggi 1 mostro avversario
    // scoperto a scelta.
    CardEffects.register(1079, {
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard) return;
            const won = ctx.random() < 0.5;
            if (window.FX && typeof FX.playCoinFlip === 'function') FX.playCoinFlip(won);
            if (!won) { ctx.log('🪙 Kryuel lancia una moneta... sbagliata!'); return; }
            const candidates = ctx.field(ctx.opponent).filter((s) => s && !s.isFaceDown).map((s) => s.card);
            if (candidates.length === 0) { ctx.log('🪙 Kryuel indovina la moneta, ma l\'avversario non controlla mostri scoperti!'); return; }
            const destroyChosen = (target) => {
                const index = ctx.field(ctx.opponent).findIndex((s) => s && s.card.uid === target.uid);
                if (index === -1) return;
                const result = ctx.destroyTargetedMonster(ctx.opponent, index);
                if (result.allowed && result.card) ctx.log(`🪙 Kryuel indovina la moneta: distrugge ${result.card.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { destroyChosen(candidates[0]); return; }
            window.DuelEngineUI.openCardListPicker(candidates, {
                title: '🪙 Kryuel',
                text: 'Hai indovinato la moneta! Scegli 1 mostro avversario scoperto da distruggere.',
                onSelect: destroyChosen
            });
        }
    });

    // 1080 — Kycoo Distruttore di Fantasmi (Kycoo the Ghost Destroyer):
    // quando infligge danno da battaglia, bandisce fino a 2 mostri dal
    // Cimitero avversario (ctx.banishFromGraveyard, già esistente).
    // SEMPLIFICAZIONE dichiarata (vedi missingEffectNote): "l'avversario
    // non può bandire dal Cimitero" NON è implementato — nessun
    // checkpoint condiviso per-ATTORE (a differenza di isNecrovalleyProtectingGraveyard,
    // che protegge un Cimitero per-PROPRIETARIO indipendentemente da chi
    // banisce) esiste in questo motore per un floodgate legato a CHI
    // compie l'azione invece che a quale Cimitero viene toccato.
    CardEffects.register(1080, {
        onDealsBattleDamage(ctx) {
            const grave = ctx.graveyard(ctx.opponent).filter((c) => c.type === 'monster');
            if (grave.length === 0) return;
            const banishChosen = (cards) => {
                cards.forEach((card) => ctx.banishFromGraveyard(ctx.opponent, card));
                ctx.log(`👻 Kycoo Distruttore di Fantasmi bandisce ${cards.length} mostr${cards.length === 1 ? 'o' : 'i'} dal Cimitero avversario!`);
            };
            banishChosen(grave.slice(0, 2));
        }
    });

    // 1081 — Pantera Signora (Lady Panther): stesso identico schema di
    // Sentinella Cremisi (id 1063), ma torna in CIMA al Deck (fine
    // dell'array, stesso verso di drawCardsToHand/pop) invece che in
    // fondo — riusa lo stesso tracker gameState.battleDestroyedThisTurnFor.
    CardEffects.register(1081, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const list = gameState.battleDestroyedThisTurnFor && gameState.battleDestroyedThisTurnFor[ctx.owner];
            if (!list || list.length === 0) return false;
            const grave = ctx.graveyard(ctx.owner);
            return list.some((c) => grave.some((g) => g.uid === c.uid));
        },
        activate(ctx) {
            const list = (gameState.battleDestroyedThisTurnFor && gameState.battleDestroyedThisTurnFor[ctx.owner]) || [];
            const grave = ctx.graveyard(ctx.owner);
            const stillInGrave = list.filter((c) => grave.some((g) => g.uid === c.uid));
            if (stillInGrave.length === 0) return;
            const ownIndex = ctx.index;
            ctx.field(ctx.owner)[ownIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            const returnToDeckTop = (target) => {
                const idx = grave.findIndex((g) => g.uid === target.uid);
                if (idx === -1) return;
                const [card] = grave.splice(idx, 1);
                const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
                gameState[deckKey].push(card);
                gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = gameState[deckKey].length;
                ctx.log(`🐆 Pantera Signora rimanda ${card.name} in cima al Deck!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { returnToDeckTop(stillInGrave[0]); return; }
            window.DuelEngineUI.openCardListPicker(stillInGrave, {
                title: '🐆 Pantera Signora',
                text: 'Scegli 1 tuo mostro distrutto in battaglia questo turno da rimandare in cima al Deck (questa carta si tributa).',
                onSelect: returnToDeckTop
            });
        }
    });

    // 1082 — Ninfa dell'Acqua (Maiden of the Aqua): finché resta scoperta
    // e nessun Field Spell è attivo, il Terreno è trattato come "Umi" per
    // le carte che lo controllano (SENZA applicare il bonus/malus ATK/DEF
    // di Umi stessa) — nuovo gameState.virtualUmiPresent (globale, non
    // per-owner: "Umi" reale non lo è), consultato da Guerriero degli
    // Abissi (id 1068)/Il Pescatore Leggendario (id 879) accanto al
    // controllo diretto già esistente.
    CardEffects.register(1082, {
        static(ctx) {
            const anyFieldSpellActive = ['playerFieldSpell', 'botFieldSpell'].some((key) => {
                const fs = ctx.gameState[key];
                return fs && !fs.isFaceDown;
            });
            if (!anyFieldSpellActive) gameState.virtualUmiPresent = true;
        }
    });

    // 1083 — Fata Isterica (Hysteric Fairy): tributa 2 mostri sul proprio
    // Terreno (può includere se stessa) per guadagnare 1000 Life Points —
    // raccoglie le 2 scelte PRIMA di rimuoverle entrambe insieme (non una
    // alla volta), così scegliere se stessa come uno dei due bersagli non
    // altera gli indici delle scelte successive.
    CardEffects.register(1083, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            return ctx.field(ctx.owner).filter((s) => s).length >= 2;
        },
        activate(ctx) {
            const pickAndTribute = (remaining, gathered) => {
                if (remaining <= 0) {
                    gathered.forEach((entry) => {
                        ctx.field(ctx.owner)[entry.index] = null;
                        ctx.graveyard(ctx.owner).push(entry.card);
                    });
                    ctx.dealDamage(ctx.owner, -1000);
                    ctx.log('🧚 Fata Isterica tributa 2 mostri: guadagna 1000 Life Points!');
                    return;
                }
                const candidates = [];
                ctx.field(ctx.owner).forEach((s, i) => { if (s && !gathered.some((g) => g.index === i)) candidates.push({ index: i, card: s.card }); });
                if (candidates.length === 0) return;
                if (ctx.owner !== 'player' || !window.DuelEngineUI) {
                    gathered.push(candidates[0]);
                    pickAndTribute(remaining - 1, gathered);
                    return;
                }
                window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                    title: '🧚 Fata Isterica',
                    text: `Scegli ${remaining} tu${remaining === 1 ? 'o mostro' : 'oi mostri'} da tributare.`,
                    onSelect: (chosenCard) => {
                        const entry = candidates.find((c) => c.card.uid === chosenCard.uid);
                        if (entry) gathered.push(entry);
                        pickAndTribute(remaining - 1, gathered);
                    }
                });
            };
            pickAndTribute(2, []);
        }
    });

    // ================================================================
    // DECIMA ONDATA PRIMA SERIE (id 1084-1092) — 9 Mostri Effetto minori.
    // ================================================================

    // 1084 — Minar: stesso identico schema di Serpente Elettrico (id
    // 1048, sesta ondata) — ctx.discardedByOwner, ma infligge 1000 danni
    // invece di pescare 2.
    CardEffects.register(1084, {
        onSentToGraveyardFromHand(ctx) {
            if (ctx.discardedByOwner !== ctx.opponent) return;
            ctx.dealDamage(ctx.opponent, 1000);
            ctx.log('🐛 Minar infligge 1000 danni!');
        }
    });

    // 1085 — Mushroom Man #2: chi la controlla perde 300 LP ad ogni sua
    // Standby Phase (def.onStandbyPhase, già esistente) finché scoperta;
    // Ignition nella propria End Phase per pagare 500 LP e passare il
    // controllo all'avversario PERMANENTEMENTE (ctx.takeControl con
    // permanent=true, già esistente — mai tornerà da solo a fine turno).
    CardEffects.register(1085, {
        onStandbyPhase(ctx) {
            ctx.dealDamage(ctx.owner, 300);
            ctx.log('🍄 Mushroom Man #2: il controllore perde 300 Life Points!');
        },
        canActivate(ctx) {
            if (gameState.phase !== 'end' || gameState.currentPlayer !== ctx.owner) return false;
            return gameState[ctx.owner === 'player' ? 'playerLP' : 'botLP'] > 500;
        },
        activate(ctx) {
            ctx.dealDamage(ctx.owner, 500);
            ctx.takeControl(ctx.opponent, ctx.owner, ctx.index, true);
            ctx.log('🍄 Mushroom Man #2 passa il controllo all\'avversario!');
        }
    });

    // 1086 — Newdoria: distrutta in battaglia, mandata al Cimitero:
    // sceglie come bersaglio 1 mostro sul Terreno (di uno o dell'altro
    // lato) e lo distrugge — ctx.destroyTargetedMonster, checkpoint di
    // targeting condiviso.
    CardEffects.register(1086, {
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard) return;
            const candidates = [];
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((s, i) => { if (s && !s.isFaceDown) candidates.push({ owner: owner, index: i, card: s.card }); });
            });
            if (candidates.length === 0) return;
            const destroyChosen = (target) => {
                const entry = candidates.find((c) => c.card.uid === target.uid);
                if (!entry) return;
                const result = ctx.destroyTargetedMonster(entry.owner, entry.index);
                if (result.allowed && result.card) ctx.log(`👹 Newdoria distrugge ${result.card.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { destroyChosen(candidates[0].card); return; }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '👹 Newdoria',
                text: 'Scegli 1 mostro sul Terreno da distruggere.',
                onSelect: destroyChosen
            });
        }
    });

    // 1087 — Nuvia la Malvagia (Nuvia the Wicked): se Evocata Normalmente
    // (onSummon copre Normale+Flip, onSpecialSummon dichiarato come
    // no-op per escludere la Special Summon, stesso schema di Invito al
    // Sonno Oscuro id 1076), si autodistrugge subito. Finché scoperta,
    // -200 ATK per ogni mostro controllato dall'avversario (gameState.atkDefBonus).
    CardEffects.register(1087, {
        onSummon(ctx) {
            const index = ctx.field(ctx.owner).findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.destroyMonster(ctx.owner, index);
            ctx.log('👿 Nuvia la Malvagia si autodistrugge: Evocata Normalmente!');
        },
        onSpecialSummon() {},
        static(ctx) {
            const oppCount = ctx.field(ctx.opponent).filter((s) => s).length;
            if (oppCount === 0) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk - 200 * oppCount, def: e.def };
        }
    });

    // 1088 — Cavaliere Pinguino (Penguin Knight): mandata dal Deck al
    // Cimitero da un effetto dell'AVVERSARIO (mill, ctx.milledByOwner
    // già esistente): rimescola Cimitero+Deck insieme in un nuovo Deck.
    CardEffects.register(1088, {
        onSentToGraveyardFromDeck(ctx) {
            if (ctx.milledByOwner !== ctx.opponent) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const graveKey = ctx.owner === 'player' ? 'playerGraveyard' : 'botGraveyard';
            const merged = [...gameState[deckKey], ...gameState[graveKey]];
            // Math.random() e non ctx.random(): un RIMESCOLO non ha nulla
            // da accordare fra i due client di un Multiplayer. Quello che
            // cambia per entrambi — che il Cimitero si svuoti e il Deck
            // cresca — avviene uguale comunque; l'ORDINE tocca solo il
            // proprio Deck, che è privato e che l'avversario non simula
            // nemmeno. Vale per ogni altro rimescolo di questo file.
            for (let i = merged.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [merged[i], merged[j]] = [merged[j], merged[i]];
            }
            gameState[deckKey] = merged;
            gameState[graveKey] = [];
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = merged.length;
            ctx.log('🐧 Cavaliere Pinguino rimescola il Cimitero nel Deck!');
        }
    });

    // 1089 — Melma Rediviva (Revival Jam): distrutta in battaglia, mandata
    // al Cimitero: paga 1000 LP per rinascere scoperta in Posizione di
    // Difesa alla propria prossima Standby Phase — riusa
    // ctx.reviveFromGraveyardWithCountdown, esteso in questa stessa
    // sessione con un nuovo parametro `position` (default 'attack',
    // retrocompatibile) proprio per questa carta.
    CardEffects.register(1089, {
        onDestroy(ctx) {
            if (!ctx.destroyedByOpponentCard) return;
            const grave = ctx.graveyard(ctx.owner);
            const index = grave.findIndex((c) => c.uid === ctx.card.uid);
            if (index === -1) return;
            ctx.dealDamage(ctx.owner, 1000);
            const [card] = grave.splice(index, 1);
            ctx.reviveFromGraveyardWithCountdown(ctx.owner, card, 1, 'defense');
            ctx.log('🟢 Melma Rediviva paga 1000 Life Points: rinascerà scoperta in Posizione di Difesa alla tua prossima Standby Phase!');
        }
    });

    // 1090 — Guardiano Reale (Royal Keeper): Ignition una volta per turno
    // per coprirsi in Posizione di Difesa (stesso schema di Des Lacooda
    // id 1052); quando Evocata Flip, guadagna 300 ATK/DEF fino a fine
    // turno — ctx.grantTemporaryAtkDefBonus, già esistente.
    CardEffects.register(1090, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            if (ctx.hasUsedOncePerTurn(`1090:${ctx.card.uid}`)) return false;
            return true;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`1090:${ctx.card.uid}`);
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.isFaceDown = true;
            slot.position = 'defense';
            ctx.log('🛡️ Guardiano Reale si copre in Posizione di Difesa!');
        },
        onFlip(ctx) {
            ctx.grantTemporaryAtkDefBonus(ctx.card, 300, 300);
            ctx.log('🛡️ Guardiano Reale guadagna 300 ATK/DEF fino a fine turno!');
        }
    });

    // 1091 — Ryu-Kishin Pagliaccio (Ryu-Kishin Clown): quando Evocata
    // (Normale, Flip o Special — onSummon copre le prime due, onSpecialSummon
    // separato per la terza, stessa funzione condivisa), sceglie 1 mostro
    // scoperto sul Terreno (di uno o dell'altro lato, se stessa inclusa) e
    // ne cambia la Posizione di Battaglia — ctx.changePosition, già
    // esistente.
    function ryuKishinClownReact(ctx) {
        const candidates = [];
        ['player', 'bot'].forEach((owner) => {
            ctx.field(owner).forEach((s, i) => { if (s && !s.isFaceDown) candidates.push({ owner: owner, index: i, card: s.card, position: s.position }); });
        });
        if (candidates.length === 0) return;
        const toggle = (entry) => {
            const newPosition = entry.position === 'attack' ? 'defense' : 'attack';
            ctx.changePosition(entry.owner, entry.index, newPosition);
            ctx.log(`🤡 Ryu-Kishin Pagliaccio cambia la Posizione di Battaglia di ${entry.card.name}!`);
        };
        if (ctx.owner !== 'player' || !window.DuelEngineUI) {
            // Preferenza euristica per il bot/auto-pick: un mostro
            // avversario è quasi sempre un bersaglio più sensato del
            // proprio (il testo reale non esclude se stessa, ma
            // sceglierla di default sarebbe una mossa quasi sempre
            // sbagliata per l'IA).
            const preferred = candidates.find((c) => c.owner === ctx.opponent) || candidates[0];
            toggle(preferred);
            return;
        }
        window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
            title: '🤡 Ryu-Kishin Pagliaccio',
            text: 'Scegli 1 mostro scoperto di cui cambiare la Posizione di Battaglia.',
            onSelect: (chosenCard) => {
                const entry = candidates.find((c) => c.card.uid === chosenCard.uid);
                if (entry) toggle(entry);
            }
        });
    }
    CardEffects.register(1091, {
        onSummon(ctx) { ryuKishinClownReact(ctx); },
        onSpecialSummon(ctx) { ryuKishinClownReact(ctx); }
    });

    // 1092 — Senju delle Mille Mani (Senju of the Thousand Hands): quando
    // Evocata Normalmente o girata scoperta (onSummon; onSpecialSummon
    // dichiarato come no-op per escludere la Special Summon, stesso
    // schema di Invito al Sonno Oscuro id 1076/Nuvia la Malvagia id
    // 1087), aggiunge 1 Mostro Rituale dal Deck alla mano.
    CardEffects.register(1092, {
        onSummon(ctx) {
            searchDeckWithChoice(ctx, (c) => c.type === 'monster' && c.category === 'ritual', {
                title: '🙏 Senju delle Mille Mani',
                text: 'Scegli quale Mostro Rituale aggiungere alla mano dal Deck.'
            }, (card) => {
                ctx.hand(ctx.owner).push(card);
                ctx.log(`🙏 Senju delle Mille Mani aggiunge ${card.name} alla mano!`);
            });
        },
        onSpecialSummon() {}
    });

    // ================================================================
    // UNDICESIMA ONDATA PRIMA SERIE (id 1093-1102) — 10 Mostri Effetto minori.
    // ================================================================

    // 1093 — Anima di Purezza e Luce (Soul of Purity and Light): non può
    // essere Evocata Normalmente/Set, solo Special Summonata dalla mano
    // bandendo 2 mostri LUCE dal proprio Cimitero — riusa
    // getSpecialSummonBanishFilters/resolveSpecialSummonBanishCost
    // (nato per Inferno id 677/Fenrir id 698 in questa stessa sessione,
    // vedi actions.js/card-effects.js): la scelta dei 2 mostri da
    // bandire è ora vera (un picker in sequenza se il Cimitero ne offre
    // più di 2), non più "le prime 2 trovate" come prima. Finché
    // scoperta, i mostri avversari perdono 300 ATK SOLO durante la LORO
    // Battle Phase (gameState.atkDefBonus, ricalcolato ad ogni render
    // dentro static() — fuori dalla Battle Phase avversaria il malus
    // scompare da solo al render successivo).
    CardEffects.register(1093, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).filter((c) => c.type === 'monster' && c.attribute === 'LUCE').length >= 2;
        },
        getSpecialSummonBanishFilters() {
            const isLight = (c) => c.type === 'monster' && c.attribute === 'LUCE';
            return [isLight, isLight];
        },
        paySpecialSummonCost(ctx) {
            const isLight = (c) => c.type === 'monster' && c.attribute === 'LUCE';
            return resolveSpecialSummonBanishCost(ctx, [isLight, isLight], '☀️ Anima di Purezza e Luce bandisce 2 mostri LUCE dal Cimitero per essere Special Summonata!');
        },
        static(ctx) {
            if (gameState.phase !== 'battle' || gameState.currentPlayer !== ctx.opponent) return;
            ctx.field(ctx.opponent).forEach((s) => {
                if (!s || s.isFaceDown) return;
                const e = gameState.atkDefBonus[s.card.uid] || { atk: 0, def: 0 };
                gameState.atkDefBonus[s.card.uid] = { atk: e.atk - 300, def: e.def };
            });
        }
    });

    // 1094 — Spirito delle Fiamme (Spirit of Flames): stesso schema di
    // 1093 sopra, banditura di 1 mostro FUOCO dal Cimitero (getSpecialSummonBanishFilters/
    // resolveSpecialSummonBanishCost apre un picker SOLO se ce n'è più di
    // uno disponibile — altrimenti prende l'unico senza chiedere nulla).
    // Guadagna 300 ATK SOLO durante
    // la PROPRIA Battle Phase.
    CardEffects.register(1094, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.attribute === 'FUOCO');
        },
        getSpecialSummonBanishFilters() {
            return [(c) => c.type === 'monster' && c.attribute === 'FUOCO'];
        },
        paySpecialSummonCost(ctx) {
            return resolveSpecialSummonBanishCost(ctx, [(c) => c.type === 'monster' && c.attribute === 'FUOCO'], "🔥 Spirito delle Fiamme bandisce 1 mostro FUOCO dal Cimitero per essere Special Summonato!");
        },
        static(ctx) {
            if (gameState.phase !== 'battle' || gameState.currentPlayer !== ctx.owner) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + 300, def: e.def };
        }
    });

    // 1095 — Spirito della Brezza (Spirit of the Breeze): finché resta
    // scoperta in Posizione di ATTACCO (opposto di Fata Danzante id
    // 1065, che richiede Difesa), guadagna 1000 LP ad ogni propria
    // Standby Phase.
    CardEffects.register(1095, {
        onStandbyPhase(ctx) {
            if (ctx.slot.position !== 'attack') return;
            ctx.dealDamage(ctx.owner, -1000);
            ctx.log('🌬️ Spirito della Brezza fa guadagnare 1000 Life Points!');
        }
    });

    // 1096 — Sciame di Locuste (Swarm of Locusts): Ignition una volta
    // per turno per coprirsi (stesso schema di Des Lacooda id 1052);
    // quando Evocata Flip, distrugge 1 Magia/Trappola avversaria a
    // scelta — ctx.destroySpellTrap diretto, stesso stile già usato da
    // altre carte di questo file per un bersaglio Magia/Trappola (es.
    // Neve Battente id 215) senza passare dal checkpoint
    // ctx.declareTarget (riservato ai bersagli MOSTRO in questo dataset).
    CardEffects.register(1096, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            if (ctx.hasUsedOncePerTurn(`1096:${ctx.card.uid}`)) return false;
            return true;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`1096:${ctx.card.uid}`);
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.isFaceDown = true;
            slot.position = 'defense';
            ctx.log('🦗 Sciame di Locuste si copre in Posizione di Difesa!');
        },
        onFlip(ctx) {
            const candidates = [];
            ctx.stField(ctx.opponent).forEach((s, i) => { if (s) candidates.push({ index: i, card: s.card }); });
            if (candidates.length === 0) return;
            const destroyChosen = (target) => {
                const entry = candidates.find((c) => c.card.uid === target.uid);
                if (!entry) return;
                ctx.destroySpellTrap(ctx.opponent, entry.index);
                ctx.log(`🦗 Sciame di Locuste distrugge ${target.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { destroyChosen(candidates[0].card); return; }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🦗 Sciame di Locuste',
                text: 'Scegli 1 Magia/Trappola avversaria da distruggere.',
                onSelect: destroyChosen
            });
        }
    });

    // 1097 — Sciame di Scarabei (Swarm of Scarabs): stesso schema di
    // Sciame di Locuste (1096) sopra, ma distrugge 1 mostro avversario
    // invece di una Magia/Trappola — ctx.destroyTargetedMonster,
    // checkpoint di targeting condiviso.
    CardEffects.register(1097, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            if (ctx.hasUsedOncePerTurn(`1097:${ctx.card.uid}`)) return false;
            return true;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`1097:${ctx.card.uid}`);
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.isFaceDown = true;
            slot.position = 'defense';
            ctx.log('🪲 Sciame di Scarabei si copre in Posizione di Difesa!');
        },
        onFlip(ctx) {
            const candidates = [];
            ctx.field(ctx.opponent).forEach((s, i) => { if (s) candidates.push({ index: i, card: s.card }); });
            if (candidates.length === 0) return;
            const destroyChosen = (target) => {
                const entry = candidates.find((c) => c.card.uid === target.uid);
                if (!entry) return;
                const result = ctx.destroyTargetedMonster(ctx.opponent, entry.index);
                if (result.allowed && result.card) ctx.log(`🪲 Sciame di Scarabei distrugge ${result.card.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { destroyChosen(candidates[0].card); return; }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🪲 Sciame di Scarabei',
                text: 'Scegli 1 mostro avversario da distruggere.',
                onSelect: destroyChosen
            });
        }
    });

    // 1098 — Saggezza Corrotta (Tainted Wisdom): se questa carta, in
    // Posizione di Attacco, viene messa in Posizione di Difesa SCOPERTA:
    // rimescola il proprio Deck — def.onPositionChange (già esistente,
    // ctx.fromPosition/ctx.toPosition, stesso schema di Clown Stupido id
    // 530), scatta solo per un mostro GIÀ scoperto (mai per un Flip).
    CardEffects.register(1098, {
        onPositionChange(ctx) {
            if (ctx.fromPosition !== 'attack' || ctx.toPosition !== 'defense') return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const deck = gameState[deckKey];
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            ctx.log('🧠 Saggezza Corrotta rimescola il Deck!');
        }
    });

    // 1099 — Il Macellaio del Bistrot (The Bistro Butcher): quando
    // infligge danno da battaglia, l'avversario pesca 2 carte —
    // onDealsBattleDamage, già dispatchato per ogni danno da battaglia.
    CardEffects.register(1099, {
        onDealsBattleDamage(ctx) {
            ctx.drawCards(ctx.opponent, 2);
            ctx.log('🔪 Il Macellaio del Bistrot fa pescare 2 carte all\'avversario!');
        }
    });

    // 1100 — Il Piccolo Spadaccino di Aile (The Little Swordsman of
    // Aile): Ignition, tributa 1 ALTRO proprio mostro per guadagnare 700
    // ATK fino a fine turno — ctx.grantTemporaryAtkDefBonus, già esistente.
    CardEffects.register(1100, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            return ctx.field(ctx.owner).some((s, i) => s && i !== ctx.index);
        },
        activate(ctx) {
            const candidates = [];
            ctx.field(ctx.owner).forEach((s, i) => { if (s && i !== ctx.index) candidates.push({ index: i, card: s.card }); });
            if (candidates.length === 0) return;
            const tributeChosen = (target) => {
                const entry = candidates.find((c) => c.card.uid === target.uid);
                if (!entry) return;
                ctx.field(ctx.owner)[entry.index] = null;
                ctx.graveyard(ctx.owner).push(entry.card);
                ctx.grantTemporaryAtkDefBonus(ctx.card, 700, 0);
                ctx.log(`⚔️ Il Piccolo Spadaccino di Aile tributa ${entry.card.name}: guadagna 700 ATK fino a fine turno!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { tributeChosen(candidates[0].card); return; }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '⚔️ Il Piccolo Spadaccino di Aile',
                text: 'Scegli 1 altro tuo mostro da tributare per guadagnare 700 ATK fino a fine turno.',
                onSelect: tributeChosen
            });
        }
    });

    // 1101 — Lo Spirito della Roccia (The Rock Spirit): stesso schema di
    // Spirito delle Fiamme (1094) sopra — banditura di 1 mostro TERRA
    // dal Cimitero per la Special Summon; +300 ATK SOLO durante la
    // Battle Phase dell'AVVERSARIO (opposto di 1094, che è durante la
    // PROPRIA).
    CardEffects.register(1101, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.attribute === 'TERRA');
        },
        getSpecialSummonBanishFilters() {
            return [(c) => c.type === 'monster' && c.attribute === 'TERRA'];
        },
        paySpecialSummonCost(ctx) {
            return resolveSpecialSummonBanishCost(ctx, [(c) => c.type === 'monster' && c.attribute === 'TERRA'], '🗿 Lo Spirito della Roccia bandisce 1 mostro TERRA dal Cimitero per essere Special Summonato!');
        },
        static(ctx) {
            if (gameState.phase !== 'battle' || gameState.currentPlayer !== ctx.opponent) return;
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + 300, def: e.def };
        }
    });

    // 1102 — Unità Scagliapietre (Throwstone Unit): Ignition, tributa 1
    // mostro Tipo Guerriero sul proprio Terreno (se stessa inclusa, come
    // Tirapiedi Alato id 1054/Fata Isterica id 1083) per distruggere 1
    // mostro scoperto sul Terreno con DEF minore o uguale all'ATK di
    // questa carta — ATK letto PRIMA di rimuovere l'eventuale
    // auto-tributo, come da ruling reale (il costo si paga prima che
    // l'effetto si risolva).
    CardEffects.register(1102, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const hasWarriorTribute = ctx.field(ctx.owner).some((s) => s && s.card.race === 'Guerriero');
            if (!hasWarriorTribute) return false;
            const ownAtk = ctx.card.attack || 0;
            return ['player', 'bot'].some((owner) => ctx.field(owner).some((s) => s && !s.isFaceDown && (s.card.defense || 0) <= ownAtk));
        },
        activate(ctx) {
            const warriorCandidates = [];
            ctx.field(ctx.owner).forEach((s, i) => { if (s && s.card.race === 'Guerriero') warriorCandidates.push({ index: i, card: s.card }); });
            if (warriorCandidates.length === 0) return;
            const ownAtk = ctx.card.attack || 0;
            const destroyTarget = () => {
                const destroyCandidates = [];
                ['player', 'bot'].forEach((owner) => {
                    ctx.field(owner).forEach((s, i) => { if (s && !s.isFaceDown && (s.card.defense || 0) <= ownAtk) destroyCandidates.push({ owner: owner, index: i, card: s.card }); });
                });
                if (destroyCandidates.length === 0) return;
                const destroyChosen = (target) => {
                    const entry = destroyCandidates.find((c) => c.card.uid === target.uid);
                    if (!entry) return;
                    const result = ctx.destroyTargetedMonster(entry.owner, entry.index);
                    if (result.allowed && result.card) ctx.log(`🪨 Unità Scagliapietre distrugge ${result.card.name}!`);
                };
                if (ctx.owner !== 'player' || !window.DuelEngineUI) { destroyChosen(destroyCandidates[0].card); return; }
                window.DuelEngineUI.openCardListPicker(destroyCandidates.map((c) => c.card), {
                    title: '🪨 Unità Scagliapietre',
                    text: 'Scegli 1 mostro scoperto con DEF pari o inferiore all\'ATK di questa carta da distruggere.',
                    onSelect: destroyChosen
                });
            };
            const tributeChosen = (target) => {
                const entry = warriorCandidates.find((c) => c.card.uid === target.uid);
                if (!entry) return;
                ctx.field(ctx.owner)[entry.index] = null;
                ctx.graveyard(ctx.owner).push(entry.card);
                ctx.log(`🪨 Unità Scagliapietre tributa ${entry.card.name}!`);
                destroyTarget();
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { tributeChosen(warriorCandidates[0].card); return; }
            window.DuelEngineUI.openCardListPicker(warriorCandidates.map((c) => c.card), {
                title: '🪨 Unità Scagliapietre',
                text: 'Scegli 1 mostro Tipo Guerriero da tributare.',
                onSelect: tributeChosen
            });
        }
    });

    // 1103 — Spirito dell'Acqua (Aqua Spirit): stesso schema di Spirito
    // delle Fiamme (1094)/Lo Spirito della Roccia (1101) per la Special
    // Summon bandendo 1 mostro ACQUA dal Cimitero. Durante OGNI Standby
    // Phase dell'avversario, può cambiare la Posizione di Battaglia di 1
    // suo mostro scoperto — def.onOpponentStandbyPhase (già esistente,
    // gemello di onOpponentEndPhase usato da Destiny Board id 866) +
    // ctx.changePosition; il bersaglio deve restare in quella Posizione
    // per il resto del turno — gameState.cannotChangePositionUidsThisTurn
    // (già esistente, nato per Maledizione di Anubis id 655), aggiunto
    // qui per la prima volta da un effetto DIVERSO da quello per cui è
    // nato.
    CardEffects.register(1103, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.attribute === 'ACQUA');
        },
        getSpecialSummonBanishFilters() {
            return [(c) => c.type === 'monster' && c.attribute === 'ACQUA'];
        },
        paySpecialSummonCost(ctx) {
            return resolveSpecialSummonBanishCost(ctx, [(c) => c.type === 'monster' && c.attribute === 'ACQUA'], "🌊 Spirito dell'Acqua bandisce 1 mostro ACQUA dal Cimitero per essere Special Summonato!");
        },
        onOpponentStandbyPhase(ctx) {
            const candidates = [];
            ctx.field(ctx.opponent).forEach((s, i) => { if (s && !s.isFaceDown) candidates.push({ index: i, card: s.card, position: s.position }); });
            if (candidates.length === 0) return;
            const changeChosen = (entry) => {
                const newPosition = entry.position === 'attack' ? 'defense' : 'attack';
                ctx.changePosition(ctx.opponent, entry.index, newPosition);
                gameState.cannotChangePositionUidsThisTurn = gameState.cannotChangePositionUidsThisTurn || new Set();
                gameState.cannotChangePositionUidsThisTurn.add(entry.card.uid);
                ctx.log(`🌊 Spirito dell'Acqua cambia la Posizione di Battaglia di ${entry.card.name} per il resto del turno!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { changeChosen(candidates[0]); return; }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🌊 Spirito dell\'Acqua',
                text: 'Scegli 1 mostro avversario scoperto di cui cambiare la Posizione di Battaglia (resterà così per il resto del turno).',
                onSelect: (chosenCard) => {
                    const entry = candidates.find((c) => c.card.uid === chosenCard.uid);
                    if (entry) changeChosen(entry);
                }
            });
        }
    });

    // 1104 — Garuda lo Spirito del Vento (Garuda the Wind Spirit): stesso
    // schema di Spirito dell'Acqua (1103) sopra per la Special Summon
    // (banditura di 1 mostro VENTO dal Cimitero), ma reagisce alla End
    // Phase dell'avversario invece della Standby Phase, e senza il
    // vincolo "per il resto del turno" (il testo reale di questa carta
    // non lo richiede — la End Phase è comunque l'ultima fase del turno).
    CardEffects.register(1104, {
        cannotNormalSummon: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster' && c.attribute === 'VENTO');
        },
        getSpecialSummonBanishFilters() {
            return [(c) => c.type === 'monster' && c.attribute === 'VENTO'];
        },
        paySpecialSummonCost(ctx) {
            return resolveSpecialSummonBanishCost(ctx, [(c) => c.type === 'monster' && c.attribute === 'VENTO'], '🦅 Garuda lo Spirito del Vento bandisce 1 mostro VENTO dal Cimitero per essere Special Summonato!');
        },
        onOpponentEndPhase(ctx) {
            const candidates = [];
            ctx.field(ctx.opponent).forEach((s, i) => { if (s && !s.isFaceDown) candidates.push({ index: i, card: s.card, position: s.position }); });
            if (candidates.length === 0) return;
            const changeChosen = (entry) => {
                const newPosition = entry.position === 'attack' ? 'defense' : 'attack';
                ctx.changePosition(ctx.opponent, entry.index, newPosition);
                ctx.log(`🦅 Garuda lo Spirito del Vento cambia la Posizione di Battaglia di ${entry.card.name}!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { changeChosen(candidates[0]); return; }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🦅 Garuda lo Spirito del Vento',
                text: 'Scegli 1 mostro avversario scoperto di cui cambiare la Posizione di Battaglia.',
                onSelect: (chosenCard) => {
                    const entry = candidates.find((c) => c.card.uid === chosenCard.uid);
                    if (entry) changeChosen(entry);
                }
            });
        }
    });

    // ================================================================
    // DODICESIMA ONDATA PRIMA SERIE (id 1105-1113) — 9 Mostri Effetto minori.
    // ================================================================

    // 1105 — Drago Tiranno (Tyrant Dragon): può attaccare 2 volte nella
    // propria Battle Phase se l'avversario controlla ancora un mostro
    // dopo il primo attacco — def.getExtraAttackCount(ctx) (già
    // esistente, dinamico, ricalcolato ad ogni attacco, nato per Samurai
    // Armato - Ben Kei id 721). Nega e distrugge le Trappole che lo
    // scelgono come bersaglio — stesso schema di Drago Teschio Demoniaco
    // (id 1044, checkpoint di targeting condiviso).
    CardEffects.register(1105, {
        // "Non puo' essere Special Summonata dal Cimitero, a meno che tu
        // non tributi 1 mostro Tipo Drago": il divieto lo applica il
        // punto unico (ACTIONS.specialSummon, duel-engine.js), qui c'e'
        // solo la clausola di riscatto. Il Tributo si paga DENTRO
        // l'eccezione, perche' e' il prezzo per aggirare il divieto: se
        // nessun Drago e' disponibile la funzione torna false e la carta
        // resta nel Cimitero.
        cannotBeSpecialSummonedFromGraveyard: true,
        specialSummonFromGraveyardException(owner, card) {
            const campo = owner === 'player' ? gameState.playerMonsterField : gameState.botMonsterField;
            const i = campo.findIndex((s) => s && s.card.race === 'Drago' && s.card.uid !== card.uid);
            if (i === -1) return false;
            const tributato = campo[i].card;
            campo[i] = null;
            (owner === 'player' ? gameState.playerGraveyard : gameState.botGraveyard).push(tributato);
            addToLog(`🐉 ${tributato.name} viene tributato per Special Summonare ${card.name} dal Cimitero.`);
            return true;
        },
        getExtraAttackCount(ctx) {
            return ctx.field(ctx.opponent).some((s) => s) ? 1 : 0;
        },
        onCardEffectTargetDeclare(ctx) {
            if (!ctx.sourceCard || ctx.sourceType !== 'trap') return;
            ctx.cancel();
            const trapOwner = ctx.sourceOwner;
            const trapIndex = ctx.stField(trapOwner).findIndex((slot) => slot && slot.card.uid === ctx.sourceCard.uid);
            if (trapIndex !== -1) ctx.destroySpellTrap(trapOwner, trapIndex);
            ctx.log(`🐉 Drago Tiranno nega e distrugge ${ctx.sourceCard.name}!`);
        }
    });

    // 1106 — Vampire Baby: se distrugge un mostro in battaglia, alla fine
    // della Battle Phase può Special Summonarlo sul proprio Terreno —
    // nuovo def.onDestroysMonsterByBattle(ctx) (actions.js/fireOnDestroy;
    // vedi il commento lì sulla differenza rispetto al più vecchio
    // def.onDestroysMonsterInBattle, id 833/480/526/625/727) per
    // registrare il bersaglio, poi def.onBattlePhaseEnd (già esistente)
    // per completare la Special Summon se il bersaglio è ancora nel suo
    // Cimitero.
    CardEffects.register(1106, {
        onDestroysMonsterByBattle(ctx) {
            ctx.card._battleDestroyTurn = gameState.turn;
            ctx.card._battleDestroyedCard = ctx.destroyedCard;
            ctx.card._battleDestroyedCardOwner = ctx.destroyedCardOwner;
        },
        onBattlePhaseEnd(ctx) {
            if (ctx.card._battleDestroyTurn !== gameState.turn) return;
            const destroyed = ctx.card._battleDestroyedCard;
            const destroyedOwner = ctx.card._battleDestroyedCardOwner;
            ctx.card._battleDestroyedCard = null;
            if (!destroyed) return;
            const grave = ctx.graveyard(destroyedOwner);
            const idx = grave.findIndex((c) => c.uid === destroyed.uid);
            if (idx === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            grave.splice(idx, 1);
            ctx.specialSummon(ctx.owner, destroyed, slotIndex, 'attack', 'graveyard');
            ctx.log(`🧛 Vampire Baby Special Summona ${destroyed.name}!`);
        }
    });

    // 1107 — Bazoo il Divora-Anime (Bazoo the Soul-Eater): Ignition una
    // volta per turno, bandisce fino a 3 mostri dal proprio Cimitero per
    // guadagnare 300 ATK ciascuno fino alla fine del turno AVVERSARIO —
    // nuovo store generico e riusabile gameState.untilOpponentTurnAtkDefBonus/
    // untilOpponentTurnActiveUidsFor (game-flow.js/changeTurn,
    // duel-engine.js/getEffectiveAtk-Def), stesso schema di
    // orgothAtkDefBonus (id 395) ma senza duplicarlo una terza volta.
    // SEMPLIFICAZIONE: bandisce sempre il massimo disponibile (fino a 3)
    // invece di un'interfaccia per scegliere quanti.
    CardEffects.register(1107, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            if (ctx.hasUsedOncePerTurn(`1107:${ctx.card.uid}:${gameState.turn}`)) return false;
            return ctx.graveyard(ctx.owner).some((c) => c.type === 'monster');
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`1107:${ctx.card.uid}:${gameState.turn}`);
            const grave = ctx.graveyard(ctx.owner);
            const toBanish = [];
            for (let i = grave.length - 1; i >= 0 && toBanish.length < 3; i--) {
                if (grave[i].type === 'monster') toBanish.push(grave[i]);
            }
            let banishedCount = 0;
            toBanish.forEach((card) => { if (ctx.banishFromGraveyard(ctx.owner, card)) banishedCount++; });
            if (banishedCount === 0) return;
            gameState.untilOpponentTurnActiveUidsFor[ctx.owner].add(ctx.card.uid);
            const e = gameState.untilOpponentTurnAtkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.untilOpponentTurnAtkDefBonus[ctx.card.uid] = { atk: e.atk + 300 * banishedCount, def: e.def };
            ctx.log(`🐺 Bazoo il Divora-Anime bandisce ${banishedCount} mostr${banishedCount === 1 ? 'o' : 'i'}: guadagna ${300 * banishedCount} ATK fino alla fine del turno avversario!`);
        }
    });

    // 1108 — Falcos il Saggio Alato (Winged Sage Falcos): se distrugge in
    // battaglia un mostro avversario scoperto in Posizione di ATTACCO
    // (ctx.destroyedWasAttackPosition, nuovo campo del hook
    // onDestroysMonsterByBattle — vedi il commento su fireOnDestroy in
    // actions.js), lo rimanda in cima al Deck avversario invece di
    // lasciarlo nel Cimitero.
    CardEffects.register(1108, {
        onDestroysMonsterByBattle(ctx) {
            if (!ctx.destroyedWasAttackPosition) return;
            const grave = ctx.graveyard(ctx.destroyedCardOwner);
            const idx = grave.findIndex((c) => c.uid === ctx.destroyedCard.uid);
            if (idx === -1) return;
            const [card] = grave.splice(idx, 1);
            const deckKey = ctx.destroyedCardOwner === 'player' ? 'playerDeck' : 'botDeck';
            gameState[deckKey].push(card);
            gameState[ctx.destroyedCardOwner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = gameState[deckKey].length;
            ctx.log(`🦅 Falcos il Saggio Alato rimanda ${card.name} in cima al Deck avversario!`);
        }
    });

    // 1109 — Cavaliere Mistico di Sciacallo (Mystical Knight of Jackal):
    // stesso schema di Falcos (1108) sopra, ma senza il vincolo sulla
    // Posizione (il testo reale di questa carta non lo richiede).
    CardEffects.register(1109, {
        onDestroysMonsterByBattle(ctx) {
            const grave = ctx.graveyard(ctx.destroyedCardOwner);
            const idx = grave.findIndex((c) => c.uid === ctx.destroyedCard.uid);
            if (idx === -1) return;
            const [card] = grave.splice(idx, 1);
            const deckKey = ctx.destroyedCardOwner === 'player' ? 'playerDeck' : 'botDeck';
            gameState[deckKey].push(card);
            gameState[ctx.destroyedCardOwner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = gameState[deckKey].length;
            ctx.log(`⚔️ Cavaliere Mistico di Sciacallo rimanda ${card.name} in cima al Deck avversario!`);
        }
    });

    // 1110 — Mummia Errante (Wandering Mummy): Ignition una volta per
    // turno per coprirsi in Posizione di Difesa (stesso schema di Des
    // Lacooda id 1052). SEMPLIFICAZIONE: la clausola "riordina i mostri
    // coperti in Posizione di Difesa nelle tue zone Mostro" non ha alcun
    // effetto funzionale in questo motore — l'ordine delle caselle non
    // influenza nessuna meccanica esistente (a differenza del vero gioco
    // fisico, dove l'ordine spaziale delle carte coperte serve solo a
    // confondere l'avversario).
    CardEffects.register(1110, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            if (ctx.hasUsedOncePerTurn(`1110:${ctx.card.uid}`)) return false;
            return true;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`1110:${ctx.card.uid}`);
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.isFaceDown = true;
            slot.position = 'defense';
            ctx.log('🧟 Mummia Errante si copre in Posizione di Difesa!');
        }
    });

    // 1111 — Apprendista Strega (Witch's Apprentice): finché resta
    // scoperta, tutti i mostri OSCURITÀ guadagnano 500 ATK, tutti i
    // mostri LUCE ne perdono 400 — stesso identico schema di Hoshiningen
    // (id 1074), Attributi invertiti.
    CardEffects.register(1111, {
        static(ctx) {
            ['player', 'bot'].forEach((owner) => {
                ctx.field(owner).forEach((slot) => {
                    if (!slot || slot.isFaceDown) return;
                    if (slot.card.attribute === 'OSCURITÀ') {
                        const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                        gameState.atkDefBonus[slot.card.uid] = { atk: e.atk + 500, def: e.def };
                    } else if (slot.card.attribute === 'LUCE') {
                        const e = gameState.atkDefBonus[slot.card.uid] || { atk: 0, def: 0 };
                        gameState.atkDefBonus[slot.card.uid] = { atk: e.atk - 400, def: e.def };
                    }
                });
            });
        }
    });

    // 1112 — Spirito Silvano (Woodland Sprite): Ignition, manda al
    // Cimitero 1 Carta Equipaggiamento agganciata a questa carta
    // (ctx.stField + slot.card.equippedToUid, stesso schema già usato da
    // decine di Magie Equipaggiamento in questo file) per infliggere 500
    // danni.
    CardEffects.register(1112, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            return ctx.stField(ctx.owner).some((s) => s && !s.isFaceDown && s.card.equippedToUid === ctx.card.uid);
        },
        activate(ctx) {
            const candidates = [];
            ctx.stField(ctx.owner).forEach((s, i) => { if (s && !s.isFaceDown && s.card.equippedToUid === ctx.card.uid) candidates.push({ index: i, card: s.card }); });
            if (candidates.length === 0) return;
            const sendChosen = (target) => {
                const entry = candidates.find((c) => c.card.uid === target.uid);
                if (!entry) return;
                ctx.destroySpellTrap(ctx.owner, entry.index);
                ctx.dealDamage(ctx.opponent, 500);
                ctx.log(`🌿 Spirito Silvano manda ${entry.card.name} al Cimitero e infligge 500 danni!`);
            };
            if (ctx.owner !== 'player' || !window.DuelEngineUI) { sendChosen(candidates[0].card); return; }
            window.DuelEngineUI.openCardListPicker(candidates.map((c) => c.card), {
                title: '🌿 Spirito Silvano',
                text: 'Scegli 1 Carta Equipaggiamento agganciata a questa carta da mandare al Cimitero.',
                onSelect: sendChosen
            });
        }
    });

    // 1113 — Yado Karu: se passa da Posizione di Attacco a Difesa,
    // rimanda in fondo al proprio Deck tutte le carte della mano —
    // def.onPositionChange (già esistente). SEMPLIFICAZIONE: rimanda
    // sempre TUTTA la mano invece di un numero/ordine a scelta.
    CardEffects.register(1113, {
        onPositionChange(ctx) {
            if (ctx.fromPosition !== 'attack' || ctx.toPosition !== 'defense') return;
            const hand = ctx.hand(ctx.owner);
            if (hand.length === 0) return;
            const deckKey = ctx.owner === 'player' ? 'playerDeck' : 'botDeck';
            const moved = hand.splice(0, hand.length);
            gameState[deckKey].unshift(...moved);
            gameState[ctx.owner === 'player' ? 'playerDeckCount' : 'botDeckCount'] = gameState[deckKey].length;
            ctx.log(`🐢 Yado Karu rimanda ${moved.length} cart${moved.length === 1 ? 'a' : 'e'} dalla mano in fondo al Deck!`);
        }
    });

    // 1114 — Lupo Bicefalo (Twin-Headed Wolf): finché controlli un ALTRO
    // mostro Tipo Demone, annulla per sempre gli effetti dei Mostri FLIP
    // che questa carta distrugge in battaglia — riusa l'esistente
    // def.onDestroysMonsterInBattle (applyBattleDestroyBonus, actions.js
    // — vedi il commento su fireOnDestroy per la differenza rispetto al
    // più recente onDestroysMonsterByBattle) e lo stesso schema PERMANENTE
    // già usato da Bestia Ingranaggio Antico (id 833): gameState.monsterEffectsNegatedUidsFor
    // (immediato) + gameState.negatedEffectsForeverUids (anche nel
    // Cimitero). "Mostro Flip" riconosciuto da def.onFlip definito sulla
    // carta distrutta — stesso identico controllo già usato altrove in
    // questo file per distinguere un Mostro Flip Effetto da uno normale.
    CardEffects.register(1114, {
        onDestroysMonsterInBattle(ctx) {
            if (!ctx.destroyedCard) return;
            const destroyedDef = DuelEngine.getDefinition(ctx.destroyedCard.id);
            if (!destroyedDef || typeof destroyedDef.onFlip !== 'function') return;
            const hasOtherFiend = ctx.field(ctx.owner).some((s) => s && s.card.uid !== ctx.card.uid && s.card.race === 'Demone');
            if (!hasOtherFiend) return;
            gameState.monsterEffectsNegatedUidsFor = gameState.monsterEffectsNegatedUidsFor || { player: new Set(), bot: new Set() };
            gameState.monsterEffectsNegatedUidsFor[ctx.opponent].add(ctx.destroyedCard.uid);
            gameState.negatedEffectsForeverUids = gameState.negatedEffectsForeverUids || new Set();
            gameState.negatedEffectsForeverUids.add(ctx.destroyedCard.uid);
            ctx.log(`🐺 Lupo Bicefalo annulla per sempre gli effetti di ${ctx.destroyedCard.name}!`);
        }
    });

    // ================================================================
    // TREDICESIMA ONDATA PRIMA SERIE (id 1115-1117) — 3 Mostri Effetto minori.
    // ================================================================

    // 1115 — Scorpione dalle 8 Chele (8-Claws Scorpion): Ignition una
    // volta per turno per coprirsi (stesso schema di Des Lacooda id
    // 1052); quando attacca un mostro avversario coperto in Posizione
    // di Difesa, il suo ATK diventa 2400 SOLO per il calcolo dei danni
    // — def.onOwnAttackDeclare (già esistente, dispatchato SOLO
    // sull'attaccante stesso, nato per Jirai Gumo id 316/Spirit Ryu id
    // 630) + ctx.grantDamageStepOnlyBonus (già esistente, id 852).
    CardEffects.register(1115, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            if (ctx.hasUsedOncePerTurn(`1115:${ctx.card.uid}`)) return false;
            return true;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`1115:${ctx.card.uid}`);
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.isFaceDown = true;
            slot.position = 'defense';
            ctx.log('🦂 Scorpione dalle 8 Chele si copre in Posizione di Difesa!');
        },
        onOwnAttackDeclare(ctx) {
            if (ctx.targetIndex === -1) return;
            const targetSlot = ctx.field(ctx.opponent)[ctx.targetIndex];
            if (!targetSlot || !targetSlot.isFaceDown || targetSlot.position !== 'defense') return;
            const attackerCard = ctx.field(ctx.attackerOwner)[ctx.attackerIndex].card;
            ctx.grantDamageStepOnlyBonus(attackerCard, 2400 - attackerCard.attack, 0);
            ctx.log('🦂 Scorpione dalle 8 Chele: ATK diventa 2400 solo per il calcolo dei danni!');
        }
    });

    // 1116 — Uomo con Wdjat (A Man with Wdjat): quando Evocato
    // Normalmente e ad ogni propria Standby Phase, guarda 1 carta
    // coperta a scelta dell'avversario (rivelata nel log — nessun
    // cambiamento di stato, esattamente come il testo reale "restituita
    // alla sua posizione originale"). onSpecialSummon no-op per
    // escludere la Special Summon, stesso schema di Invito al Sonno
    // Oscuro (id 1076).
    function peekOpponentSetCard(ctx) {
        const candidates = [];
        ctx.field(ctx.opponent).forEach((s) => { if (s && s.isFaceDown) candidates.push(s.card); });
        ctx.stField(ctx.opponent).forEach((s) => { if (s && s.isFaceDown) candidates.push(s.card); });
        if (candidates.length === 0) return;
        const target = ctx.randomPick(candidates);
        ctx.log(`👁️ Uomo con Wdjat guarda una carta coperta dell'avversario: è ${target.name}!`);
    }
    CardEffects.register(1116, {
        onSummon(ctx) { peekOpponentSetCard(ctx); },
        onSpecialSummon() {},
        onStandbyPhase(ctx) { peekOpponentSetCard(ctx); }
    });

    // 1117 — Cobraman Sakuzy: Ignition una volta per turno per coprirsi
    // (stesso schema di Des Lacooda id 1052); quando Evocata Flip,
    // rivela nel log tutte le Magie/Trappole coperte dell'avversario
    // (nessun cambiamento di stato, stesso spirito di Uomo con Wdjat id
    // 1116 sopra).
    CardEffects.register(1117, {
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            if (ctx.hasUsedOncePerTurn(`1117:${ctx.card.uid}`)) return false;
            return true;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`1117:${ctx.card.uid}`);
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.isFaceDown = true;
            slot.position = 'defense';
            ctx.log('🐍 Cobraman Sakuzy si copre in Posizione di Difesa!');
        },
        onFlip(ctx) {
            const names = [];
            ctx.stField(ctx.opponent).forEach((s) => { if (s && s.isFaceDown) names.push(s.card.name); });
            if (names.length === 0) { ctx.log('🐍 Cobraman Sakuzy: l\'avversario non ha Magie/Trappole coperte da rivelare.'); return; }
            ctx.log(`🐍 Cobraman Sakuzy rivela le Magie/Trappole coperte dell'avversario: ${names.join(', ')}!`);
        }
    });

    // ================================================================
    // QUATTORDICESIMA ONDATA PRIMA SERIE (id 1118-1121) — 4 Mostri Effetto minori.
    // ================================================================

    // 1118 — Sovrano Oscuro Ha Des (Dark Ruler Ha Des): "nega gli effetti
    // dei mostri distrutti in battaglia dai TUOI mostri Demone" —
    // gameState.negatesFiendBattleKillsFor (nuovo, per-owner,
    // ricalcolato ogni render qui sotto), consultato in fireOnDestroy
    // (actions.js) insieme a `opponentBattleCard.race === 'Demone'` —
    // stesso identico schema/store di Onda di Diffusione (id 747), solo
    // con una condizione diversa al posto di un uid specifico.
    CardEffects.register(1118, {
        cannotBeSpecialSummonedFromGraveyard: true,
        static(ctx) {
            gameState.negatesFiendBattleKillsFor[ctx.owner] = true;
        }
    });

    // 1119 — Gradius' Option: non può essere Evocata Normalmente/Set,
    // solo Special Summonata dalla mano scegliendo 1 "Gradius" scoperto
    // sul proprio Terreno — riusa la coppia GENERICA canSpecialSummonFromHand/
    // paySpecialSummonCost (già esistente). ATK/DEF diventano identici a
    // quelli di Gradius, ricalcolati ogni render (gameState.atkDefBonus).
    // Se Gradius lascia il Terreno, questa carta si autodistrugge —
    // def.destroysSelfIfLinkedMonsterMissing (nuovo, opt-in, controllato
    // in recomputeStaticEffects PRIMA di ogni static(), stesso schema/
    // stesso motivo della pulizia degli Equip con bersaglio non più
    // valido qui sopra: mutazione diretta, mai ctx.destroyMonster).
    CardEffects.register(1119, {
        cannotNormalSummon: true,
        destroysSelfIfLinkedMonsterMissing: true,
        canSpecialSummonFromHand(ctx) {
            return ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.name === 'Gradius');
        },
        paySpecialSummonCost(ctx) {
            const gradiusSlot = ctx.field(ctx.owner).find((s) => s && !s.isFaceDown && s.card.name === 'Gradius');
            if (!gradiusSlot) return false;
            ctx.card.linkedMonsterUid = gradiusSlot.card.uid;
            return true;
        },
        static(ctx) {
            const gradiusSlot = ctx.field(ctx.owner).find((s) => s && !s.isFaceDown && s.card.uid === ctx.card.linkedMonsterUid);
            if (!gradiusSlot) return;
            const gradiusAtk = DuelEngine.getEffectiveAtk(gradiusSlot.card);
            const gradiusDef = DuelEngine.getEffectiveDef(gradiusSlot.card);
            const e = gameState.atkDefBonus[ctx.card.uid] || { atk: 0, def: 0 };
            gameState.atkDefBonus[ctx.card.uid] = { atk: e.atk + (gradiusAtk - ctx.card.attack), def: e.def + (gradiusDef - ctx.card.defense) };
        }
    });

    // 1120 — Il Cacciatore dalle 7 Armi (The Hunter with 7 Weapons):
    // quando Evocato Normalmente, dichiara 1 Tipo di mostro (SEMPLIFICAZIONE:
    // il più diffuso tra i mostri scoperti dell'avversario in quel
    // momento, stesso schema già accettato per Virus Infetta-Tribù) — se
    // combatte contro quel Tipo, +1000 ATK SOLO durante il calcolo dei
    // danni via def.damageStepBonus(ctx) (già esistente, generico per
    // attaccante O difensore — role/opponentCard/owner — a differenza di
    // onOwnAttackDeclare usato per 8-Claws Scorpion id 1115, che copre
    // solo il ruolo di attaccante).
    CardEffects.register(1120, {
        onSummon(ctx) {
            const raceCounts = {};
            ctx.field(ctx.opponent).forEach((s) => { if (s && !s.isFaceDown) raceCounts[s.card.race] = (raceCounts[s.card.race] || 0) + 1; });
            const declared = Object.keys(raceCounts).sort((a, b) => raceCounts[b] - raceCounts[a])[0];
            if (!declared) return;
            ctx.card.declaredRace = declared;
            ctx.log(`🏹 Il Cacciatore dalle 7 Armi dichiara il Tipo "${declared}"!`);
        },
        onSpecialSummon() {},
        damageStepBonus(ctx) {
            if (!ctx.card.declaredRace || !ctx.opponentCard || ctx.opponentCard.race !== ctx.card.declaredRace) return { atk: 0, def: 0 };
            return { atk: 1000, def: 0 };
        }
    });

    // 1121 — Thunder Nyan Nyan: se controlli un mostro non-LUCE, questa
    // carta si autodistrugge — riusa i monitor globali già esistenti
    // def.onAnyNormalOrFlipSummon/onAnySpecialSummon (nati per Misterioso
    // Burattinaio id 579/Torre d'Ossa Divora-Anime id 664, poi già
    // riusati per una reazione distruttiva da Tigre Re Wanghu/Kotodama
    // id 1077/1078) invece di controllare la condizione dentro static()
    // (evitato deliberatamente: chiamare un'azione distruttiva da dentro
    // static() è rischioso, vedi il commento su
    // destroysSelfIfLinkedMonsterMissing qui sopra) — controlla ad ogni
    // nuovo mostro che entra sul PROPRIO Terreno, non ad ogni render.
    function thunderNyanNyanCheckSelfDestruct(ctx) {
        const ownIndex = ctx.field(ctx.owner).findIndex((s) => s && s.card.uid === ctx.card.uid);
        if (ownIndex === -1) return;
        const hasNonLight = ctx.field(ctx.owner).some((s) => s && !s.isFaceDown && s.card.attribute !== 'LUCE');
        if (!hasNonLight) return;
        ctx.destroyMonster(ctx.owner, ownIndex);
        ctx.log('🐱 Thunder Nyan Nyan si autodistrugge: controlli un mostro non-LUCE!');
    }
    CardEffects.register(1121, {
        onAnyNormalOrFlipSummon(ctx) { thunderNyanNyanCheckSelfDestruct(ctx); },
        onAnySpecialSummon(ctx) { thunderNyanNyanCheckSelfDestruct(ctx); }
    });

    // 1122 — Scorpione d'Acciaio (Steel Scorpion): "un mostro non-Macchina
    // che attacca questa carta verrà distrutto alla End Phase del suo 2°
    // turno dopo l'attacco" — un trigger FORZATO e automatico sul lato
    // DIFENSORE, mai una scelta del giocatore, quindi usa il nuovo hook
    // def.onBeingAttacked (duel-engine.js, dispatch "1.5)" dentro
    // TRIGGER.ON_ATTACK_DECLARE) invece del pre-esistente onAttackDeclare
    // basato su Chain (riservato ad abilità OPZIONALI attivabili dal
    // difensore, es. Suijin/Kazejin "puoi annullare l'attacco"). La coda
    // ritardata riusa ctx.queueDelayedDestroyAtOpponentEndPhase, nuovo
    // meccanismo generico gemello di reviveFromGraveyardWithCountdown/
    // processSelfDestructAtOpponentEndPhase ma per un MOSTRO altrui
    // (l'attaccante, non Scorpione d'Acciaio stesso) — riusabile da
    // qualunque futura carta con lo stesso identico bisogno "distruggi un
    // mostro specifico fra N turni avversari da adesso".
    CardEffects.register(1122, {
        onBeingAttacked(ctx) {
            const attackerSlot = ctx.field(ctx.attackerOwner)[ctx.attackerIndex];
            if (!attackerSlot) return;
            if (attackerSlot.card.race === 'Macchina') return;
            ctx.queueDelayedDestroyAtOpponentEndPhase(ctx.owner, ctx.attackerOwner, attackerSlot.card, 2);
            ctx.log(`⚙️ ${attackerSlot.card.name} verrà distrutto alla 2ª End Phase del suo turno!`);
        }
    });

    // 1123 — Helpoemer: "alla fine della Battle Phase del tuo avversario,
    // se questa carta è nel Cimitero perché distrutta in battaglia, il
    // tuo avversario scarta 1 carta a caso" — usa il nuovo
    // def.canTriggerFromGraveyard (duel-engine.js, dentro
    // firePhaseTrigger: scansiona anche il Cimitero, opt-in generico,
    // riusabile da qualunque futura carta con lo stesso bisogno "se sono
    // nel Cimitero quando scatta questa fase") + il tracker già esistente
    // gameState.battleDestroyedThisTurnFor (nato per Sentinella Cremisi/
    // Lady Panther nella dodicesima ondata) per sapere se QUESTA
    // istanza è finita lì per una distruzione in battaglia. Il controllo
    // "Battle Phase dell'AVVERSARIO" (non la propria) si fa leggendo
    // ctx.gameState.currentPlayer — chi vive la fase — contro ctx.owner
    // (il controllore di Helpoemer): se coincidono è la PROPRIA Battle
    // Phase (non deve scattare), altrimenti è quella dell'avversario.
    // ctx.discardRandomFromHand riusa l'helper condiviso già esistente
    // (stesso usato da Criosfinge id 761 ecc.).
    // SEMPLIFICAZIONE dichiarata (vedi missingEffectNote in cards.json):
    // "non può essere Special Summonata dal Cimitero" NON è applicata —
    // richiederebbe controllare ~105 chiamate a ctx.specialSummon sparse
    // in questo file (nessun choke point condiviso "Special Summon da
    // GY" esiste in questo motore, a differenza di ctx.declareTarget per
    // il targeting), sproporzionato per questa singola clausola di una
    // sola carta.
    CardEffects.register(1123, {
        cannotBeSpecialSummonedFromGraveyard: true,
        canTriggerFromGraveyard: true,
        onBattlePhaseEnd(ctx) {
            if (ctx.gameState.currentPlayer === ctx.owner) return;
            const destroyedList = gameState.battleDestroyedThisTurnFor && gameState.battleDestroyedThisTurnFor[ctx.owner];
            const wasDestroyedByBattle = destroyedList && destroyedList.some((c) => c.uid === ctx.card.uid);
            if (!wasDestroyedByBattle) return;
            ctx.discardRandomFromHand(ctx.opponent);
            ctx.log(`💀 ${ctx.card.name} scatta dal Cimitero: l'avversario scarta 1 carta a caso!`);
        }
    });

    // 1127 — Campanella Cerimoniale / Ceremonial Bell: "entrambi i
    // giocatori tengono la mano rivelata" — puro effetto di UI, nessuna
    // logica di gioco. Floodgate GLOBALE booleano
    // (gameState.bothHandsRevealed, duel-engine.js, ricalcolato ad ogni
    // recomputeStaticEffects), consultato da renderBotHand() (game-flow.js)
    // per mostrare le vere carte del bot al posto dei dorsi finché questa
    // carta resta scoperta in campo (di ENTRAMBI i lati, indipendentemente
    // da chi la controlla — coerente col testo "entrambi i giocatori").
    CardEffects.register(1127, {
        static() {
            gameState.bothHandsRevealed = true;
        }
    });

    // 1128 — Skull Knight #2: "se Tributi questa carta per un'Evocazione
    // Tributo di un mostro Tipo Demone, Special Summon un'altra copia di
    // questa carta dal Deck, poi rimescola il Deck". Usa il nuovo
    // parametro opzionale `summonedCard` di def.onSacrificedForTribute
    // (duel-engine.js/actions.js/bot.js) — passato SOLO dai chiamanti che
    // rappresentano una vera Evocazione Tributo (non un sacrificio come
    // costo di qualcos'altro), quindi qui basta controllare che esista e
    // sia di Tipo Demone. Stesso pattern inline di ricerca+rimescolamento
    // già usato da Ultima Volontà (id 555, Fisher-Yates diretto
    // sull'array del Deck) invece di un nuovo helper condiviso "rimescola
    // e basta" — nessun'altra carta di questo dataset ne ha ancora
    // bisogno.
    CardEffects.register(1128, {
        onSacrificedForTribute(ctx) {
            if (!ctx.summonedCard || ctx.summonedCard.type !== 'monster' || ctx.summonedCard.race !== 'Demone') return;
            const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
            if (!Array.isArray(deck)) return;
            const deckIdx = deck.findIndex((c) => c.id === 1128);
            if (deckIdx === -1) return;
            const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
            if (slotIndex === -1) return;
            const [newCopy] = deck.splice(deckIdx, 1);
            ctx.specialSummon(ctx.owner, newCopy, slotIndex, 'attack', 'deck');
            for (let i = deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            ctx.log(`💀 ${ctx.card.name} Special Summona un'altra copia di se stessa dal Deck, poi rimescola il Deck!`);
        }
    });

    // ================================================================
    // 1129/1130 — Great Dezard / Fushioh Richie: coppia con evoluzione a
    // stadi collegata (stesso spirito di Destiny Board, ma più piccola:
    // qui basta un contatore per-istanza, non un intero stato condiviso).
    // Testo reale di Great Dezard: "quando questo mostro distrugge in
    // battaglia il seguente numero di mostri, si attivano in ordine i
    // seguenti effetti: Uno: finché scoperta in campo, annulla
    // l'attivazione e gli effetti di ogni Magia/Trappola che bersaglia
    // questa carta, poi distruggila. Due: puoi Special Summonare 1
    // Fushioh Richie dalla mano o dal Deck tributando questa carta,
    // durante la tua Main Phase." Fushioh Richie ripete la STESSA
    // clausola "annulla+distruggi" (sempre attiva, non a stadi) più "puoi
    // girarla a faccia in giù in Difesa una volta per turno" e "quando
    // viene girata scoperta: Special Summon 1 mostro Zombie dal
    // Cimitero".
    //
    // SEMPLIFICAZIONE dichiarata su ENTRAMBE (vedi missingEffectNote in
    // cards.json): la clausola "annulla+distruggi ogni Magia/Trappola che
    // bersaglia QUESTA carta" non è implementata — richiederebbe sapere,
    // PRIMA che una Magia/Trappola a bersaglio si risolva, se il
    // bersaglio scelto è ESATTAMENTE questa istanza. Il meccanismo
    // esistente per questo (`def.declaredTargeting`, consultato da Campo
    // di Riryoku id 636/La Perla del Drago id 652/Scudo Magico Tipo-8 id
    // 689) espone solo la CATEGORIA del bersaglio dichiarata dalla carta
    // in cima alla Chain (count/cardType/race), MAI l'istanza precisa —
    // stesso limite già documentato per le 9 carte "Categoria B
    // checkpoint di targeting" di questo file (vedi CLAUDE.md). Il resto
    // di entrambe le carte è pienamente implementato.
    //
    // Great Dezard: contatore per-istanza `card._battleDestructionCount`,
    // incrementato dal già esistente def.onDestroysMonsterByBattle
    // (dodicesima ondata di questa sessione) — a 2, sblocca un Ignition
    // che tributa Great Dezard per Special Summonare Fushioh Richie da
    // mano/Deck. Lo slot liberato dal tributo di Great Dezard stesso è
    // SEMPRE quello usato per Fushioh Richie (nessuna ricerca di slot
    // separata necessaria: tributare libera sempre esattamente 1 casella).
    // ================================================================
    function findFushiohRichieCandidate(ctx) {
        const handIdx = ctx.hand(ctx.owner).findIndex((c) => c.id === 1130);
        if (handIdx !== -1) return { zone: ctx.hand(ctx.owner), index: handIdx };
        const deck = ctx.gameState[ctx.owner === 'player' ? 'playerDeck' : 'botDeck'];
        if (Array.isArray(deck)) {
            const deckIdx = deck.findIndex((c) => c.id === 1130);
            if (deckIdx !== -1) return { zone: deck, index: deckIdx };
        }
        return null;
    }
    CardEffects.register(1129, {
        onDestroysMonsterByBattle(ctx) {
            ctx.card._battleDestructionCount = (ctx.card._battleDestructionCount || 0) + 1;
            if (ctx.card._battleDestructionCount === 2) {
                ctx.log(`🔮 ${ctx.card.name} ha distrutto 2 mostri in battaglia: ora puoi tributarlo per Special Summonare Fushioh Richie!`);
            }
        },
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            if ((ctx.card._battleDestructionCount || 0) < 2) return false;
            return findFushiohRichieCandidate(ctx) !== null;
        },
        activate(ctx) {
            const candidate = findFushiohRichieCandidate(ctx);
            if (!candidate) return;
            const selfIndex = ctx.field(ctx.owner).findIndex((s) => s && s.card.uid === ctx.card.uid);
            if (selfIndex === -1) return;
            ctx.field(ctx.owner)[selfIndex] = null;
            ctx.graveyard(ctx.owner).push(ctx.card);
            DuelEngine.notifySacrificedForTribute(ctx.owner, ctx.card);
            const [richie] = candidate.zone.splice(candidate.index, 1);
            ctx.specialSummon(ctx.owner, richie, selfIndex, 'attack', 'graveyard');
            ctx.log(`🔮 ${ctx.card.name} si tributa: Special Summon Fushioh Richie!`);
        }
    });

    // Fushioh Richie: nessun altro percorso di Evocazione registrato
    // (cannotNormalSummon, e nessun canSpecialSummonFromHand/Deck
    // proprio) — l'UNICO modo in cui questa carta entra in campo in
    // pratica è tramite l'activate() di Great Dezard qui sopra, stesso
    // schema di Larva Mostruosa/Grande Falena (id 50/52).
    CardEffects.register(1130, {
        cannotNormalSummon: true,
        canActivate(ctx) {
            if (!(gameState.phase === 'main1' || gameState.phase === 'main2') || gameState.currentPlayer !== ctx.owner) return false;
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot || slot.isFaceDown) return false;
            if (ctx.hasUsedOncePerTurn(`1130:${ctx.card.uid}`)) return false;
            return true;
        },
        activate(ctx) {
            ctx.markUsedOncePerTurn(`1130:${ctx.card.uid}`);
            const slot = ctx.field(ctx.owner)[ctx.index];
            if (!slot) return;
            slot.isFaceDown = true;
            slot.position = 'defense';
            ctx.log('💀 Fushioh Richie si mette a faccia in giù in Posizione di Difesa!');
        },
        onFlip(ctx) {
            if (ctx.findEmptyMonsterSlot(ctx.owner) === -1) return;
            searchGraveyardWithChoice(ctx, ctx.owner, (c) => c.type === 'monster' && c.race === 'Zombie', {
                title: '💀 Fushioh Richie',
                text: 'Scegli quale mostro Zombie Special Summonare dal Cimitero.'
            }, (chosen) => {
                const slotIndex = ctx.findEmptyMonsterSlot(ctx.owner);
                if (slotIndex === -1) { ctx.graveyard(ctx.owner).push(chosen); return; }
                ctx.specialSummon(ctx.owner, chosen, slotIndex, 'attack', 'graveyard');
                ctx.log(`💀 Fushioh Richie si gira scoperto: Special Summon ${chosen.name} dal Cimitero!`);
            });
        }
    });

    // ================================================================
    // CARTE SENZA CODICE BESPOKE — libreria per il futuro Card Maker
    // (vedi js/engine/effect-templates.js, js/data/custom-cards.js): una carta in
    // cardDatabase può dichiarare "effectTemplate"/"cloneEffectOf" invece
    // di avere un blocco CardEffects.register scritto a mano come tutti
    // quelli sopra. Scandisce cardDatabase una sola volta, qui in fondo
    // (dopo ogni registrazione bespoke di questo file, così cloneEffectOf
    // può riferirsi anche a una di quelle) — non tocca né sovrascrive MAI
    // una carta già registrata sopra.
    // ================================================================
    (function registerLibraryEffects() {
        if (typeof cardDatabase === 'undefined' || !Array.isArray(cardDatabase)) return;

        // Passata 1: "effectTemplate" — self-contenuti, nessuna dipendenza
        // da altre carte.
        cardDatabase.forEach((card) => {
            if (DuelEngine.getDefinition(card.id)) return; // già registrata: mai sovrascrivere
            if (card.effectTemplate && window.EffectTemplates) {
                const definition = EffectTemplates.build(card.effectTemplate.name, card.effectTemplate.params);
                if (definition) CardEffects.register(card.id, definition);
            }
        });

        // Passata 2: "cloneEffectOf" — ripetuta finché fa progressi, così
        // funziona anche clonare una carta che a sua volta clona
        // un'altra (limite di sicurezza: mai più passate delle carte
        // totali, per non restare bloccati su un riferimento circolare).
        let progressed = true;
        let safety = cardDatabase.length;
        while (progressed && safety-- > 0) {
            progressed = false;
            cardDatabase.forEach((card) => {
                if (card.cloneEffectOf === undefined || DuelEngine.getDefinition(card.id)) return;
                const source = DuelEngine.getDefinition(card.cloneEffectOf);
                if (source) {
                    CardEffects.register(card.id, source);
                    progressed = true;
                }
            });
        }
        cardDatabase.forEach((card) => {
            if (card.cloneEffectOf !== undefined && !DuelEngine.getDefinition(card.id)) {
                console.warn(`[card-effects] "${card.name}" (id ${card.id}): cloneEffectOf ${card.cloneEffectOf} non trovato (riferimento non valido o circolare).`);
            }
        });
    })();
})();
