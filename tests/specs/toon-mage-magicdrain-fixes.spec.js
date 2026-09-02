// Tre carte chiuse insieme (fix contenuti, ciascuna piccola):
// - Teschio Evocato Toon (id 486): il Sacrificio per il proprio Special
//   Summon ora passa da un picker interattivo (getSpecialSummonSacrificeCandidates)
//   invece di scegliere sempre il primo mostro trovato.
// - Mago Apprendista (id 737): "posiziona 1 Segnalino Magia su 1 carta
//   che può riceverne" ora è generico (def.acceptsSpellCounters), copre
//   anche Abile Mago Oscuro (id 736) che il controllo hardcoded precedente
//   (solo 734/751) non vedeva.
// - Drenaggio Magico (id 770): l'avversario ora scarta 1 Magia dalla
//   mano per salvare la propria attivazione, se ne ha una disponibile.
module.exports = {
    name: 'Teschio Evocato Toon (486), Mago Apprendista (737) e Drenaggio Magico (770): fix del backlog carte',
    async run(t) {
        // 486: il Sacrificio pre-scelto (gameState.pendingSpecialSummonSacrificeUid)
        // deve essere quello effettivamente sacrificato, non il primo del campo.
        const r1 = await t.evaluate(() => {
            const toonSkull = { ...cardDatabase.find((c) => c.id === 486), uid: 'toonskull-1' };
            const toonWorld = { ...cardDatabase.find((c) => c.id === 487), uid: 'toonworld-1' };
            const firstMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'first-1' };
            const chosenMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'chosen-1' };

            gameState.playerHand = [toonSkull];
            gameState.playerMonsterField = [{ card: firstMonster, position: 'attack', isFaceDown: false }, { card: chosenMonster, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.playerSTField = [{ card: toonWorld, isFaceDown: false, setOnTurn: gameState.turn }, null, null, null, null];
            gameState.playerGraveyard = [];

            gameState.pendingSpecialSummonSacrificeUid = 'chosen-1';
            const ok = DuelEngine.trySpecialSummonFromHand('player', 0);

            return {
                ok,
                chosenGone: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'chosen-1'),
                firstStillThere: gameState.playerMonsterField.some((s) => s && s.card.uid === 'first-1'),
                chosenInGraveyard: gameState.playerGraveyard.some((c) => c.uid === 'chosen-1'),
                toonSkullSummoned: gameState.playerMonsterField.some((s) => s && s.card.uid === 'toonskull-1')
            };
        });
        t.assert(r1.ok, 'Teschio Evocato Toon deve riuscire a essere Special Summonato');
        t.assert(r1.chosenGone, 'Il mostro PRE-SCELTO (non il primo del campo) deve essere quello sacrificato');
        t.assert(r1.firstStillThere, 'Il primo mostro del campo, non scelto, deve restare intatto');
        t.assert(r1.chosenInGraveyard, 'Il mostro sacrificato deve finire nel Cimitero');
        t.assert(r1.toonSkullSummoned, 'Teschio Evocato Toon deve comparire sul Terreno');

        // 737: Abile Mago Oscuro (736) deve ora essere un bersaglio valido
        // per il Segnalino Magia di Mago Apprendista (prima il controllo
        // hardcoded riconosceva solo 734/751).
        const r2 = await t.evaluate(() => {
            const apprentice = { ...cardDatabase.find((c) => c.id === 737), uid: 'apprentice-1' };
            const skilledMage = { ...cardDatabase.find((c) => c.id === 736), uid: 'skilledmage-1' };
            gameState.botMonsterField = [{ card: skilledMage, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerMonsterField = [null, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: apprentice, slotIndex: -1 });
            DuelEngine.getDefinition(737).onSummon(ctx);
            return gameState.botMonsterField[0].card.spellCounters;
        });
        t.assert(r2 === 1, `Abile Mago Oscuro deve ricevere il Segnalino Magia di Mago Apprendista (letto: ${r2})`);

        // 770: l'avversario con una Magia di scorta in mano deve scartarla
        // per salvare la propria attivazione (Drenaggio Magico NON annulla).
        const r3 = await t.evaluate(() => {
            const drain = { ...cardDatabase.find((c) => c.id === 770), uid: 'drain-1' };
            const spareSpell = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'sparespell-1' };
            const activatedSpell = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'activatedspell-1' };
            gameState.botHand = [spareSpell];
            gameState.botGraveyard = [];
            gameState.chain = { active: true, links: [{ owner: 'bot', card: activatedSpell, handlerName: 'activate', def: {}, ctx: {} }] };
            const ctx = DuelEngine.makeContext('player', { card: drain });
            DuelEngine.getDefinition(770).activate(ctx);
            return {
                spareDiscarded: !gameState.botHand.some((c) => c.uid === 'sparespell-1'),
                spareInGraveyard: gameState.botGraveyard.some((c) => c.uid === 'sparespell-1'),
                chainStillHasLink: gameState.chain.links.length === 1
            };
        });
        t.assert(r3.spareDiscarded, "L'avversario con una Magia di scorta deve scartarla");
        t.assert(r3.spareInGraveyard, 'La Magia scartata deve finire nel Cimitero');
        t.assert(r3.chainStillHasLink, "L'attivazione originale NON deve essere annullata quando l'avversario scarta per salvarla");

        // Senza Magie di scorta, Drenaggio Magico deve invece annullare come prima.
        const r4 = await t.evaluate(() => {
            const drain2 = { ...cardDatabase.find((c) => c.id === 770), uid: 'drain-2' };
            const activatedSpell2 = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'activatedspell-2' };
            gameState.botHand = [];
            gameState.chain = { active: true, links: [{ owner: 'bot', card: activatedSpell2, handlerName: 'activate', def: {}, ctx: {}, negated: false }] };
            const ctx = DuelEngine.makeContext('player', { card: drain2 });
            DuelEngine.getDefinition(770).activate(ctx);
            return gameState.chain.links.length > 0 ? gameState.chain.links[0].negated : null;
        });
        t.assert(r4 === true, "Senza Magie di scorta in mano, Drenaggio Magico deve annullare l'attivazione come prima");
    }
};
