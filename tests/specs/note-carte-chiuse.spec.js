// Carte il cui missingEffectNote era diventato falso, o lo e' diventato
// adesso.
// =====================================================================
// Nascono tutte dallo stesso giro di revisione: rileggere ogni
// missingEffectNote di data/cards.json contro il codice vero, invece di
// fidarsi di com'e' scritto. Alcune note descrivevano un limite che
// l'infrastruttura arrivata dopo aveva gia' tolto di mezzo; altre
// dicevano "servirebbe un meccanismo che non esiste" quando quel
// meccanismo esisteva gia'.
//
// Qui si sorveglia il COMPORTAMENTO, cosi' una nota non puo' tornare a
// essere vera in silenzio:
//   125  Cinghiale Soldato   — si autodistrugge se Evocata a faccia in su
//   434  Capro Espiatorio    — i Token non sono sacrificabili
//   244  Crepuscolo 5 Stelle — stessa cosa per i 5 Kuriboh (era gia' fatto,
//                              ma la nota lo dava per impossibile)
//   898  Guardia dei G.d.T.  — il bersaglio lo sceglie il giocatore
//   1038 Evocatore Illusioni — due scelte: chi tributare, quale Fusione
//   891  Necropaura Oscura   — idem, ma la scelta si apre in END PHASE
module.exports = {
    name: 'Note carte diventate false: 125 autodistruzione, 434/244 Tributo vietato, 898/1038/891 vera scelta',
    async run(t) {
        // --- 125: Evocabile solo tramite Flip Summon -------------------
        // Un Set e' permesso (e' l'unico modo di arrivare al Flip Summon);
        // una vera Evocazione Normale a faccia in su no. Il motore
        // distingue i due casi con summonedPosition, ed e' esattamente
        // quello che la nota dava per "non ancora verificato".
        const cinghiale = await t.evaluate(() => {
            const carta = { ...cardDatabase.find((c) => c.id === 125), uid: 'boar-1' };
            gameState.playerMonsterField = [{ card: carta, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerGraveyard = [];
            DuelEngine.getDefinition(125).onSummon(DuelEngine.makeContext('player', {
                summonedCard: carta, summonedSlotIndex: 0, summonedPosition: 'attack', summonedVia: 'normal'
            }));
            const dopoNormale = {
                inCampo: gameState.playerMonsterField.some((s) => s && s.card.uid === 'boar-1'),
                nelCimitero: gameState.playerGraveyard.some((c) => c.uid === 'boar-1')
            };

            const coperta = { ...cardDatabase.find((c) => c.id === 125), uid: 'boar-2' };
            gameState.playerMonsterField = [{ card: coperta, position: 'defense', isFaceDown: true, hasAttacked: false, canChangePosition: false }, null, null, null, null];
            gameState.playerGraveyard = [];
            DuelEngine.getDefinition(125).onSummon(DuelEngine.makeContext('player', {
                summonedCard: coperta, summonedSlotIndex: 0, summonedPosition: 'defense', summonedVia: 'normal'
            }));
            const dopoSet = gameState.playerMonsterField.some((s) => s && s.card.uid === 'boar-2');
            return { dopoNormale, dopoSet };
        });
        t.assert(!cinghiale.dopoNormale.inCampo && cinghiale.dopoNormale.nelCimitero,
            `Evocato Normalmente a faccia in su, Cinghiale Soldato deve autodistruggersi (rilevato ${JSON.stringify(cinghiale.dopoNormale)})`);
        t.assert(cinghiale.dopoSet,
            'Messo COPERTO deve invece restare in campo: e\' l\'unico modo di arrivare poi al Flip Summon, vietarlo sarebbe rendere la carta ingiocabile');

        // --- 434: i Token Pecora non si possono sacrificare ------------
        // Il divieto e' per-ISTANZA (gameState.cannotBeTributedUids, nato
        // per Controllo Mentale): un Token qualunque di un'ALTRA carta
        // resta sacrificabile, quindi il test controlla entrambe le cose.
        const capro = await t.evaluate(() => {
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.cannotBeTributedUids = new Set();
            const carta = { ...cardDatabase.find((c) => c.id === 434), uid: 'scapegoat-1' };
            DuelEngine.getDefinition(434).activate(DuelEngine.makeContext('player', { card: carta, zone: 'st', index: 0 }));
            const token = gameState.playerMonsterField.filter(Boolean).map((s) => s.card);
            const vietati = token.filter((c) => gameState.cannotBeTributedUids.has(c.uid)).length;

            // Controprova sullo stesso helper: senza l'opzione, un Token
            // resta sacrificabile come sempre.
            gameState.playerMonsterField = [null, null, null, null, null];
            DuelEngine.actions.createTokens('player', 1, { name: 'Token Libero', race: 'Bestia', attribute: 'TERRA', level: 1, attack: 0, defense: 0 });
            const libero = gameState.playerMonsterField.filter(Boolean)[0];
            return {
                creati: token.length,
                vietati: vietati,
                liberoVietato: !!(libero && gameState.cannotBeTributedUids.has(libero.card.uid))
            };
        });
        t.assert(capro.creati === 4, `Capro Espiatorio deve creare 4 Token (rilevati ${capro.creati})`);
        t.assert(capro.vietati === 4, `Tutti e 4 i Token devono essere non sacrificabili (rilevati ${capro.vietati})`);
        t.assert(!capro.liberoVietato,
            'Un Token creato senza chiedere quell\'opzione deve restare sacrificabile: il divieto e\' della carta, non dei Token in quanto tali');

        // --- 244: stessa clausola, per i 5 fratelli Kuriboh -----------
        const crepuscolo = await t.evaluate(() => {
            gameState.cannotBeTributedUids = new Set();
            const liv5 = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), level: 5, uid: 'liv5-1' };
            gameState.playerMonsterField = [{ card: liv5, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false }, null, null, null, null];
            gameState.playerHand = [22, 859, 860, 861, 862].map((id, i) => ({ ...cardDatabase.find((c) => c.id === id), uid: `kuri-${i}` }));
            gameState.playerGraveyard = [];
            gameState.playerDeck = [];
            const carta = { ...cardDatabase.find((c) => c.id === 244), uid: 'twilight-1' };
            DuelEngine.getDefinition(244).activate(DuelEngine.makeContext('player', { card: carta, zone: 'st', index: 0 }));
            const inCampo = gameState.playerMonsterField.filter(Boolean).map((s) => s.card);
            return {
                evocati: inCampo.length,
                vietati: inCampo.filter((c) => gameState.cannotBeTributedUids.has(c.uid)).length
            };
        });
        t.assert(crepuscolo.evocati > 0 && crepuscolo.evocati === crepuscolo.vietati,
            `Ogni Kuriboh evocato da Crepuscolo a Cinque Stelle dev'essere non sacrificabile (evocati ${crepuscolo.evocati}, vietati ${crepuscolo.vietati})`);

        // --- 898: quale mostro avversario rimandare in mano ------------
        const pickerAperto = () => t.evaluate(
            () => document.getElementById('cardListPickerModal').classList.contains('open')
        );
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const posa = (uid, atk) => ({
                card: { ...base, uid: uid, attack: atk }, position: 'attack',
                isFaceDown: false, hasAttacked: false, canChangePosition: false
            });
            gameState.botMonsterField = [posa('GDT-FORTE', 2400), posa('GDT-DEBOLE', 900), null, null, null];
            gameState.botHand = [];
            const guardia = { ...cardDatabase.find((c) => c.id === 898), uid: 'guardia-1' };
            gameState.playerMonsterField = [{ card: guardia, position: 'defense', isFaceDown: false, hasAttacked: false, canChangePosition: false }, null, null, null, null];
            DuelEngine.getDefinition(898).onFlip(DuelEngine.makeContext('player', { card: guardia, slotIndex: 0 }));
        });
        t.assert(await pickerAperto(),
            'Guardia dei Guardiani della Tomba con 2 bersagli deve aprire un picker: prima prendeva sempre quello con l\'ATK piu\' alto');
        // I candidati sono ordinati per ATK decrescente (l'euristica che il
        // bot continua a seguire), quindi la voce 1 e' il piu' DEBOLE:
        // sceglierlo prova che la scelta conta.
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();
        await t.page.waitForFunction(
            () => !gameState.botMonsterField.some((s) => s && s.card.uid === 'GDT-DEBOLE'),
            undefined, { timeout: 20000 }
        );
        const dopoGuardia = await t.evaluate(() => gameState.botMonsterField.filter(Boolean).map((s) => s.card.uid));
        t.assert(dopoGuardia.join(',') === 'GDT-FORTE',
            `Deve tornare in mano il mostro SCELTO, non quello con l'ATK piu' alto (rimasti: ${JSON.stringify(dopoGuardia)})`);

        // --- 1038: chi tributare, e quale Fusione tirare fuori ---------
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const fusioni = cardDatabase.filter((c) => c.extraDeck).slice(0, 2);
            const evocatore = { ...cardDatabase.find((c) => c.id === 1038), uid: 'evocatore-1' };
            const posa = (uid) => ({
                card: { ...base, uid: uid }, position: 'attack',
                isFaceDown: false, hasAttacked: false, canChangePosition: false
            });
            gameState.playerMonsterField = [
                { card: evocatore, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                posa('ALLEATO-1'), posa('ALLEATO-2'), null, null
            ];
            gameState.playerExtraDeck = fusioni.map((c, i) => ({ ...c, uid: `FUS-${i}` }));
            gameState.playerGraveyard = [];
            DuelEngine.getDefinition(1038).onFlip(DuelEngine.makeContext('player', { card: evocatore, slotIndex: 0 }));
        });
        t.assert(await pickerAperto(), 'Evocatore di Illusioni con 2 mostri tributabili deve far scegliere QUALE tributare');
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();   // ALLEATO-2
        await t.page.waitForFunction(
            () => {
                const voci = document.querySelectorAll('#cardListPickerRow .card-list-item');
                return document.getElementById('cardListPickerModal').classList.contains('open') && voci.length === 2;
            },
            undefined, { timeout: 20000 }
        );
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();   // FUS-1
        await t.page.waitForFunction(
            () => gameState.playerMonsterField.some((s) => s && s.card.uid === 'FUS-1'),
            undefined, { timeout: 20000 }
        );
        const dopoEvocatore = await t.evaluate(() => ({
            campo: gameState.playerMonsterField.filter(Boolean).map((s) => s.card.uid),
            cimitero: gameState.playerGraveyard.map((c) => c.uid),
            extra: gameState.playerExtraDeck.map((c) => c.uid)
        }));
        t.assert(dopoEvocatore.campo.includes('FUS-1'),
            `Deve arrivare in campo la Fusione SCELTA, non la prima dell'Extra Deck (campo: ${JSON.stringify(dopoEvocatore.campo)})`);
        t.assert(dopoEvocatore.cimitero.includes('ALLEATO-2') && dopoEvocatore.campo.includes('ALLEATO-1'),
            `Deve essere tributato il mostro SCELTO (ALLEATO-2), non il primo (cimitero: ${JSON.stringify(dopoEvocatore.cimitero)})`);
        t.assert(dopoEvocatore.extra.join(',') === 'FUS-0',
            `Nell'Extra Deck deve restare solo la Fusione non scelta (rilevato: ${JSON.stringify(dopoEvocatore.extra)})`);

        // --- 891: il bersaglio si sceglie, e si sceglie in END PHASE ---
        // Unico punto di questa revisione fuori da card-effects*.js:
        // Necropaura Oscura si equipaggia dal Cimitero durante la End
        // Phase, quindi il picker si apre da enterEndPhase (game-flow.js).
        // Vale la pena sorvegliarlo proprio per quello: se il cambio turno
        // non aspettasse una scelta aperta, l'effetto si perderebbe.
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const posa = (uid, atk) => ({
                card: { ...base, uid: uid, attack: atk }, position: 'attack',
                isFaceDown: false, hasAttacked: false, canChangePosition: false
            });
            gameState.botMonsterField = [posa('NEC-FORTE', 2600), posa('NEC-DEBOLE', 1100), null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            const necro = { ...cardDatabase.find((c) => c.id === 891), uid: 'necro-1' };
            gameState.playerGraveyard = [necro];
            gameState.currentPlayer = 'player';
            gameState.pendingNecrofearRevival = { 'necro-1': { forTurn: gameState.turn, owner: 'player' } };
            enterEndPhase();
        });
        t.assert(await pickerAperto(),
            'Necropaura Oscura con 2 bersagli deve far scegliere: prima prendeva sempre quello con l\'ATK piu\' alto');
        // Voce 1 = il piu' debole (lista ordinata per ATK decrescente).
        await t.page.locator('#cardListPickerRow .card-list-item').nth(1).click();
        await t.page.waitForFunction(
            () => gameState.playerSTField.some((s) => s && s.card.uid === 'necro-1'),
            undefined, { timeout: 20000 }
        );
        const dopoNecro = await t.evaluate(() => {
            const equip = gameState.playerSTField.find((s) => s && s.card.uid === 'necro-1');
            return {
                agganciataA: equip ? equip.card._necrofearControlledUid : null,
                campoMio: gameState.playerMonsterField.filter(Boolean).map((s) => s.card.uid),
                campoSuo: gameState.botMonsterField.filter(Boolean).map((s) => s.card.uid)
            };
        });
        t.assert(dopoNecro.agganciataA === 'NEC-DEBOLE',
            `Deve equipaggiarsi al mostro SCELTO, non a quello con l'ATK piu' alto (rilevato ${dopoNecro.agganciataA})`);
        t.assert(dopoNecro.campoMio.includes('NEC-DEBOLE') && !dopoNecro.campoSuo.includes('NEC-DEBOLE'),
            `Il controllo del mostro scelto deve passare davvero di lato (mio: ${JSON.stringify(dopoNecro.campoMio)}, suo: ${JSON.stringify(dopoNecro.campoSuo)})`);
    }
};
