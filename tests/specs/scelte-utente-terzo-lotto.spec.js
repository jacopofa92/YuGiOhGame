// Terzo lotto di carte che "sceglievano da sole": ora sceglie chi gioca.
// =====================================================================
// Seguito di scelte-utente-mancanti.spec.js e scelte-utente-secondo-lotto.js.
// Qui il pezzo grosso e' il PRIMO caso: le Carte Equipaggiamento.
//
// Non era un buco di una carta, era un buco di una FAMIGLIA: quasi ogni
// Equip del dataset diceva "equipaggia questa carta a 1 mostro che
// controlli" e agganciava il primo mostro idoneo da sinistra, perche' la
// coppia findEquipTarget/attachEquip era copiata come riga sola in una
// quarantina di registrazioni. Ora passano tutte dallo stesso
// equipToChosenTarget, quindi questo test sorveglia l'helper condiviso:
// se si rompe lui, si rompono tutte insieme.
//
// Come negli spec gemelli si sceglie sempre il SECONDO candidato: con un
// solo candidato una scelta vera e un auto-pick darebbero lo stesso
// risultato, e il test non proverebbe nulla.
module.exports = {
    name: 'Terzo lotto di scelte restituite al giocatore (Equip generiche, 421 Riryoku, 811 Colpo di Coda, 419 Anello della Distruzione)',
    async run(t) {
        const pickerAperto = () => t.evaluate(
            () => document.getElementById('cardListPickerModal').classList.contains('open')
        );
        const vociPicker = () => t.page.locator('#cardListPickerRow .card-list-item').count();
        const scegliVoce = async (n) => {
            await t.page.locator('#cardListPickerRow .card-list-item').nth(n).click();
            await t.page.waitForTimeout(220);
        };

        // --- Carte Equipaggiamento: a QUALE mostro si aggancia ----------
        // Id 117 e' una Equip senza filtro, cioe' il caso piu' semplice e
        // piu' diffuso: se la scelta funziona qui, funziona per tutte le
        // altre, che si distinguono solo per il filtro passato all'helper.
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck
                && !(DuelEngine.getDefinition(c.id) || {}).rejectsEquip);
            const posa = (uid) => ({
                card: { ...base, uid: uid }, position: 'attack',
                isFaceDown: false, hasAttacked: false, canChangePosition: false
            });
            gameState.playerMonsterField = [posa('EQ-A'), posa('EQ-B'), null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            const equip = { ...cardDatabase.find((c) => c.id === 117), uid: 'equip-117' };
            gameState.playerSTField = [{ card: equip, isFaceDown: false, setOnTurn: 0 }, null, null, null, null];
            DuelEngine.getDefinition(117).activate(DuelEngine.makeContext('player', { card: equip, zone: 'st', index: 0 }));
        });
        t.assert(await pickerAperto(),
            'Una Carta Equipaggiamento con 2 mostri idonei deve aprire un picker: prima agganciava sempre il primo da sinistra');
        const vociEquip = await vociPicker();
        t.assert(vociEquip === 2, `Il picker dell'Equip deve elencare entrambi i mostri (rilevati ${vociEquip})`);
        await scegliVoce(1);
        const dopoEquip = await t.evaluate(() => {
            const e = gameState.playerSTField[0].card;
            return { uid: e.equippedToUid, index: e.equippedToIndex };
        });
        t.assert(dopoEquip.uid === 'EQ-B' && dopoEquip.index === 1,
            `L'Equip deve agganciarsi al mostro SCELTO (EQ-B, casella 1), non al primo: ${JSON.stringify(dopoEquip)}`);

        // --- 421 Riryoku: DUE scelte, e l'ordine cambia tutto -----------
        // La prima carta perde meta' ATK, la seconda se lo prende: sono
        // due picker distinti, e il secondo deve escludere il bersaglio
        // gia' scelto.
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const posa = (uid, atk) => ({
                card: { ...base, uid: uid, attack: atk }, position: 'attack',
                isFaceDown: false, hasAttacked: false, canChangePosition: false
            });
            gameState.botMonsterField = [posa('BOT-1', 1000), posa('BOT-2', 2000), null, null, null];
            gameState.playerMonsterField = [posa('PLY-1', 1500), null, null, null, null];
            gameState.atkDefBonus = {};
            const carta = { ...cardDatabase.find((c) => c.id === 421), uid: 'riryoku' };
            DuelEngine.getDefinition(421).activate(DuelEngine.makeContext('player', { card: carta, zone: 'st', index: 0 }));
        });
        t.assert(await pickerAperto(), 'Riryoku deve aprire il picker per il PRIMO dei due bersagli');
        const vociRiryoku = await vociPicker();
        t.assert(vociRiryoku === 3, `La prima scelta di Riryoku deve elencare tutti e 3 i mostri scoperti (rilevati ${vociRiryoku})`);
        await scegliVoce(1);                       // BOT-2 (2000 ATK) perde meta'
        t.assert(await pickerAperto(),
            'Dopo la prima scelta Riryoku deve aprire SUBITO il secondo picker: e\' la parte che si rompe se la sequenza non e\' annidata nella callback');
        const vociRiryoku2 = await vociPicker();
        t.assert(vociRiryoku2 === 2,
            `La seconda scelta deve escludere il bersaglio gia' scelto (attesi 2, rilevati ${vociRiryoku2})`);
        // Seconda lista: prima il proprio campo (PLY-1), poi l'avversario
        // (BOT-1). La voce 1 e' quindi BOT-1.
        await scegliVoce(1);
        const dopoRiryoku = await t.evaluate(() => ({
            bot1: DuelEngine.getEffectiveAtk(gameState.botMonsterField[0].card),
            bot2: DuelEngine.getEffectiveAtk(gameState.botMonsterField[1].card),
            ply1: DuelEngine.getEffectiveAtk(gameState.playerMonsterField[0].card)
        }));
        t.assert(dopoRiryoku.bot2 === 1000,
            `Il mostro scelto per primo deve dimezzarsi (2000 -> 1000), rilevato ${dopoRiryoku.bot2}`);
        t.assert(dopoRiryoku.bot1 === 2000,
            `Il mostro scelto per secondo deve incassare i 1000 ATK (1000 -> 2000), rilevato ${dopoRiryoku.bot1}`);
        t.assert(dopoRiryoku.ply1 === 1500,
            `Il mostro NON scelto non deve essere toccato, rilevato ${dopoRiryoku.ply1}`);

        // --- 811 Colpo di Coda: la prima scelta decide la seconda -------
        // Il Livello del Dinosauro scelto e' la soglia dei bersagli
        // ammessi, quindi prendere "il primo Dinosauro che trovo" poteva
        // escludere mostri che un altro Dinosauro dello stesso campo
        // avrebbe raggiunto. Qui il Dinosauro di Livello 5 vedrebbe 1
        // bersaglio, quello di Livello 8 tutti e 3.
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const posa = (uid, level, extra) => ({
                card: { ...base, uid: uid, level: level, ...(extra || {}) }, position: 'attack',
                isFaceDown: false, hasAttacked: false, canChangePosition: false
            });
            gameState.playerMonsterField = [
                posa('DINO-5', 5, { race: 'Dinosauro' }),
                posa('DINO-8', 8, { race: 'Dinosauro' }),
                null, null, null
            ];
            gameState.botMonsterField = [posa('NEM-3', 3), posa('NEM-6', 6), posa('NEM-7', 7), null, null];
            gameState.botHand = [];
            const carta = { ...cardDatabase.find((c) => c.id === 811), uid: 'colpo-di-coda' };
            DuelEngine.getDefinition(811).activate(DuelEngine.makeContext('player', { card: carta, zone: 'st', index: 0 }));
        });
        t.assert(await pickerAperto(), 'Colpo di Coda deve far scegliere PRIMA quale Dinosauro usare');
        const vociDino = await vociPicker();
        t.assert(vociDino === 2, `Devono comparire entrambi i Dinosauri di Livello 5+ (rilevati ${vociDino})`);
        await scegliVoce(1);                       // DINO-8: soglia Livello 8
        t.assert(await pickerAperto(), 'Scelto il Dinosauro, deve aprirsi il picker dei bersagli');
        const vociBersagli = await vociPicker();
        t.assert(vociBersagli === 3,
            `Con il Dinosauro di Livello 8 devono essere bersagliabili tutti e 3 i mostri: col Livello 5 sarebbe stato 1 solo (rilevati ${vociBersagli})`);
        await scegliVoce(1);                       // NEM-6
        t.assert(await pickerAperto(), 'Colpo di Coda rimanda in mano fino a 2 mostri: deve aprirsi il secondo picker');
        const vociBersagli2 = await vociPicker();
        t.assert(vociBersagli2 === 2,
            `Il secondo giro deve elencare i mostri rimasti, non di nuovo 3 (rilevati ${vociBersagli2})`);
        await scegliVoce(0);                       // NEM-3
        const dopoCoda = await t.evaluate(() => gameState.botMonsterField.filter(Boolean).map((s) => s.card.uid));
        t.assert(dopoCoda.join(',') === 'NEM-7',
            `Devono tornare in mano esattamente i due mostri scelti, non i primi due del campo (rimasti: ${JSON.stringify(dopoCoda)})`);

        // --- 419 Anello della Distruzione: la scelta e' a doppio taglio -
        // L'ATK del bersaglio e' anche il danno che subisce PER PRIMO chi
        // attiva la carta, quindi sceglierlo da soli poteva far perdere il
        // duello proprio a chi l'ha giocata.
        await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const posa = (uid, atk) => ({
                card: { ...base, uid: uid, attack: atk }, position: 'attack',
                isFaceDown: false, hasAttacked: false, canChangePosition: false
            });
            gameState.botMonsterField = [posa('ANE-1', 2500), posa('ANE-2', 800), null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerLP = 8000;
            gameState.botLP = 8000;
            const carta = { ...cardDatabase.find((c) => c.id === 419), uid: 'anello' };
            DuelEngine.getDefinition(419).activate(DuelEngine.makeContext('player', { card: carta, zone: 'st', index: 0 }));
        });
        t.assert(await pickerAperto(), 'Anello della Distruzione con 2 bersagli validi deve aprire un picker');
        await scegliVoce(1);                       // ANE-2, 800 ATK
        const dopoAnello = await t.evaluate(() => ({
            playerLP: gameState.playerLP,
            botLP: gameState.botLP,
            campo: gameState.botMonsterField.filter(Boolean).map((s) => s.card.uid)
        }));
        t.assert(dopoAnello.campo.join(',') === 'ANE-1',
            `Deve saltare il mostro scelto (ANE-2), non il primo (rimasti: ${JSON.stringify(dopoAnello.campo)})`);
        t.assert(8000 - dopoAnello.playerLP === 800,
            `Il danno deve venire dal mostro SCELTO (800 ATK), non dai 2500 del primo: subiti ${8000 - dopoAnello.playerLP}`);
        t.assert(8000 - dopoAnello.botLP === 800,
            `Lo stesso danno va rigirato all'avversario: inflitti ${8000 - dopoAnello.botLP}`);
    }
};
