// Secondo lotto di carte che "sceglievano da sole": ora sceglie chi gioca.
// =====================================================================
// Continuazione di scelte-utente-mancanti.spec.js. L'audit incrociato
// (testo della carta che promette una scelta + codice che fa un
// findIndex/[0] su una zona + nessuno degli helper di scelta) segnalava
// 54 carte: una decina erano falsi positivi legittimi — cercano SÉ
// STESSE (id 496, 661, 739, 806) o una carta con nome unico — le altre
// erano bug veri.
//
// Qui ne sorveglio quattro, scelte una per FAMIGLIA di helper, così se
// una delle quattro meccaniche condivise si rompe il test se ne accorge:
//   - Terreno, entrambi i lati        -> Kaiser Glider (320)
//   - Terreno, con filtro e ordine    -> Esplosivo Ingranaggio Antico (839)
//   - propria mano                    -> Capitano Predone (714)
//   - Cimitero, DUE scelte in fila    -> Salvataggio (704)
//
// Come nello spec gemello, si sceglie sempre il SECONDO candidato: con
// un solo candidato una scelta vera e un auto-pick darebbero lo stesso
// risultato e il test non proverebbe nulla.
module.exports = {
    name: 'Secondo lotto di scelte restituite al giocatore (320 Kaiser Glider, 839 Esplosivo, 714 Capitano Predone, 704 Salvataggio)',
    async run(t) {
        const pickerAperto = () => t.evaluate(
            () => document.getElementById('cardListPickerModal').classList.contains('open')
        );
        const vociPicker = () => t.page.locator('#cardListPickerRow .card-list-item').count();
        const scegliVoce = async (n) => {
            await t.page.locator('#cardListPickerRow .card-list-item').nth(n).click();
            await t.page.waitForTimeout(220);
        };

        // --- 320 Kaiser Glider: quale mostro rimandare in mano ---------
        await t.evaluate(() => {
            const mostri = cardDatabase.filter((c) => c.type === 'monster' && !c.extraDeck && (c.level || 4) <= 4);
            gameState.botMonsterField = [
                { card: { ...mostri[0], uid: 'NEMICO-1' }, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                { card: { ...mostri[1], uid: 'NEMICO-2' }, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                null, null, null
            ];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botHand = [];
            const glider = { ...cardDatabase.find((c) => c.id === 320), uid: 'glider' };
            DuelEngine.getDefinition(320).onDestroy(DuelEngine.makeContext('player', { card: glider }));
        });
        t.assert(await pickerAperto(),
            'Kaiser Glider distrutto, con 2 mostri bersagliabili, deve aprire un picker: prima prendeva il primo dell\'avversario');
        const vociGlider = await vociPicker();
        t.assert(vociGlider === 2, `Il picker di Kaiser Glider deve elencare entrambi i mostri (rilevati ${vociGlider})`);
        await scegliVoce(1);
        const dopoGlider = await t.evaluate(() => gameState.botMonsterField.map((s) => (s ? s.card.uid : null)));
        t.assert(dopoGlider.filter(Boolean).join(',') === 'NEMICO-1',
            `Deve tornare in mano ESATTAMENTE il mostro scelto (NEMICO-2), non il primo (rimasti: ${JSON.stringify(dopoGlider)})`);

        // --- 839 Esplosivo Ingranaggio Antico: il danno dipende da CHI --
        // I candidati sono ordinati per ATK decrescente, quindi scegliere
        // il secondo deve produrre un danno DIVERSO dal primo: è la prova
        // che la scelta conta davvero e non è decorativa.
        const attesa = await t.evaluate(() => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const forte = { ...base, name: 'Ingranaggio Antico Forte', attack: 2000, uid: 'AG-FORTE' };
            const debole = { ...base, name: 'Ingranaggio Antico Debole', attack: 800, uid: 'AG-DEBOLE' };
            gameState.playerMonsterField = [
                { card: forte, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                { card: debole, position: 'attack', isFaceDown: false, hasAttacked: false, canChangePosition: false },
                null, null, null
            ];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.botLP = 8000;
            const carta = { ...cardDatabase.find((c) => c.id === 839), uid: 'esplosivo' };
            DuelEngine.getDefinition(839).activate(DuelEngine.makeContext('player', { card: carta, zone: 'st', index: 0 }));
            return { lpPrima: gameState.botLP };
        });
        t.assert(await pickerAperto(),
            'Esplosivo Ingranaggio Antico con 2 "Ingranaggio Antico" in campo deve aprire un picker');
        await scegliVoce(1);
        const dopoEsplosivo = await t.evaluate(() => ({
            lp: gameState.botLP,
            campo: gameState.playerMonsterField.map((s) => (s ? s.card.uid : null))
        }));
        // Secondo candidato = il più debole (800 ATK) -> 400 danni.
        t.assert(attesa.lpPrima - dopoEsplosivo.lp === 400,
            `Il danno deve venire dal mostro SCELTO (800 ATK -> 400 danni), non dal primo della lista: inflitti ${attesa.lpPrima - dopoEsplosivo.lp}`);
        t.assert(dopoEsplosivo.campo.filter(Boolean).join(',') === 'AG-FORTE',
            `Deve esplodere il mostro scelto, non l'altro (rimasti: ${JSON.stringify(dopoEsplosivo.campo)})`);

        // --- 714 Capitano Predone: quale mostro Evocare dalla mano -----
        await t.evaluate(() => {
            const bassi = cardDatabase.filter((c) => c.type === 'monster' && !c.extraDeck && (c.level || 4) <= 4);
            gameState.playerHand = [
                { ...bassi[0], uid: 'MANO-1' },
                { ...bassi[1], uid: 'MANO-2' }
            ];
            gameState.playerMonsterField = [null, null, null, null, null];
            const capitano = { ...cardDatabase.find((c) => c.id === 714), uid: 'capitano' };
            DuelEngine.getDefinition(714).onSummon(DuelEngine.makeContext('player', { card: capitano, summonedVia: 'normal' }));
        });
        t.assert(await pickerAperto(),
            'Capitano Predone con 2 mostri Evocabili in mano deve aprire un picker: prima prendeva il primo con hand.findIndex');
        await scegliVoce(1);
        const dopoCapitano = await t.evaluate(() => ({
            campo: gameState.playerMonsterField.filter(Boolean).map((s) => s.card.uid),
            mano: gameState.playerHand.map((c) => c.uid)
        }));
        t.assert(dopoCapitano.campo.includes('MANO-2'),
            `Deve arrivare in campo il mostro scelto (MANO-2), non il primo della mano (in campo: ${JSON.stringify(dopoCapitano.campo)})`);
        t.assert(dopoCapitano.mano.join(',') === 'MANO-1',
            `In mano deve restare l'altro (rilevato: ${JSON.stringify(dopoCapitano.mano)})`);

        // --- 704 Salvataggio: DUE scelte, una dopo l'altra -------------
        // Il caso delicato: i picker sono asincroni, quindi il secondo
        // deve vivere dentro la callback del primo. Sbagliando, o si
        // aprono due liste insieme o la seconda non si apre affatto.
        await t.evaluate(() => {
            const acqua = cardDatabase.filter((c) => c.type === 'monster' && !c.extraDeck);
            const fai = (n, uid) => ({ ...acqua[n], attribute: 'ACQUA', attack: 1000, uid: uid });
            gameState.playerGraveyard = [fai(0, 'ACQ-1'), fai(1, 'ACQ-2'), fai(2, 'ACQ-3')];
            gameState.playerHand = [];
            const carta = { ...cardDatabase.find((c) => c.id === 704), uid: 'salvataggio' };
            DuelEngine.getDefinition(704).activate(DuelEngine.makeContext('player', { card: carta, zone: 'st', index: 0 }));
        });
        t.assert(await pickerAperto(), 'Salvataggio deve aprire il picker per la PRIMA delle due carte');
        const vociPrima = await vociPicker();
        t.assert(vociPrima === 3, `La prima scelta deve elencare tutti e 3 i mostri ACQUA (rilevati ${vociPrima})`);
        await scegliVoce(1);                       // ACQ-2
        t.assert(await pickerAperto(),
            'Dopo la prima scelta Salvataggio deve aprire SUBITO il secondo picker: è la parte che si rompe se la sequenza non è annidata nella callback');
        const vociSeconda = await vociPicker();
        t.assert(vociSeconda === 2,
            `La seconda scelta deve elencare i 2 mostri rimasti, non di nuovo 3 (rilevati ${vociSeconda})`);
        await scegliVoce(1);                       // ACQ-3 (dei rimasti ACQ-1/ACQ-3)
        const dopoSalvataggio = await t.evaluate(() => ({
            mano: gameState.playerHand.map((c) => c.uid).sort(),
            cimitero: gameState.playerGraveyard.map((c) => c.uid)
        }));
        t.assert(dopoSalvataggio.mano.join(',') === 'ACQ-2,ACQ-3',
            `In mano devono finire i DUE mostri scelti (ACQ-2 e ACQ-3), non i primi del Cimitero (rilevati: ${JSON.stringify(dopoSalvataggio.mano)})`);
        t.assert(dopoSalvataggio.cimitero.join(',') === 'ACQ-1',
            `Nel Cimitero deve restare solo quello non scelto (rilevato: ${JSON.stringify(dopoSalvataggio.cimitero)})`);
    }
};
