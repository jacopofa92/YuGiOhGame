// Secondo blocco del completamento TCG: le dieci carte Effetto rimaste.
// Copre i nuovi passaggi strutturali (redirect Cimitero, pescata sostituita,
// Special Summon sul campo avversario e memoria dei materiali Fusione).
module.exports = {
    name: 'Prima serie TCG: dieci effetti mancanti (1131-1140)',
    async run(t) {
        const result = await t.evaluate(() => {
            const clone = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });
            const filler = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && (c.level || 0) <= 4);

            // Esiliatore: qualunque push nel Cimitero viene reindirizzato.
            gameState.playerMonsterField = [{ card: clone(1131, 'banisher'), position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [];
            gameState.playerBanished = [];
            DuelEngine.recomputeStaticEffects();
            const exiled = { ...filler, uid: 'must-be-banished' };
            gameState.playerGraveyard.push(exiled);
            const banisherWorks = gameState.playerGraveyard.length === 0 && gameState.playerBanished.some((c) => c.uid === exiled.uid);

            // Togliere Esiliatore ripristina immediatamente il Cimitero.
            gameState.playerMonsterField[0] = null;
            DuelEngine.recomputeStaticEffects();
            const normalGrave = { ...filler, uid: 'normal-grave' };
            gameState.playerGraveyard.push(normalGrave);
            const graveRestored = gameState.playerGraveyard.some((c) => c.uid === normalGrave.uid);

            // Lava Golem tributa due mostri avversari e finisce sul loro campo.
            const lava = clone(1133, 'lava');
            gameState.playerHand = [lava];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [
                { card: { ...filler, uid: 'lava-a' }, position: 'attack', isFaceDown: false },
                { card: { ...filler, uid: 'lava-b' }, position: 'attack', isFaceDown: false },
                null, null, null
            ];
            gameState.botGraveyard = [];
            const lavaSummoned = DuelEngine.trySpecialSummonFromHand('player', 0);
            const lavaOnOpponent = gameState.botMonsterField.some((s) => s && s.card.uid === 'lava');
            const tributesPaid = gameState.botGraveyard.filter((c) => c.uid === 'lava-a' || c.uid === 'lava-b').length === 2;

            // Paracida pescato non compare in mano: si Evoca e infligge 1000.
            const parasite = clone(1139, 'parasite');
            parasite._parasiteOriginalOwner = 'bot';
            gameState.playerDeck = [parasite];
            gameState.playerDeckCount = 1;
            gameState.playerHand = [];
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.playerLP = 8000;
            drawCardsToHand('player', 1);
            const parasiteDraw = gameState.playerHand.length === 0
                && gameState.playerMonsterField.some((s) => s && s.card.uid === 'parasite')
                && gameState.playerLP === 7000;

            // Rifornimento recupera soltanto due materiali dello stesso gruppo.
            const supply = clone(1140, 'supply');
            const matA = { ...filler, uid: 'mat-a', _fusionMaterialGroup: 'fusion-x' };
            const matB = { ...filler, uid: 'mat-b', _fusionMaterialGroup: 'fusion-x' };
            // Sul posto IA la Decisione viene risolta sincronicamente; il
            // percorso persona usa lo stesso helper e apre il picker reale.
            gameState.botGraveyard = [matA, matB];
            gameState.botHand = [];
            DuelEngine.getDefinition(1140).onFlip(DuelEngine.makeContext('bot', { card: supply }));
            const supplyWorks = gameState.botHand.length === 2 && gameState.botGraveyard.length === 0;

            const allRegistered = [1131,1132,1133,1134,1135,1136,1137,1138,1139,1140]
                .every((id) => !!DuelEngine.getDefinition(id));
            return { banisherWorks, graveRestored, lavaSummoned, lavaOnOpponent, tributesPaid, parasiteDraw, supplyWorks, allRegistered };
        });

        t.assert(result.allRegistered, 'Tutte le dieci carte devono avere una definizione effetto');
        t.assert(result.banisherWorks && result.graveRestored, 'Esiliatore deve reindirizzare al bando solo finché resta scoperto');
        t.assert(result.lavaSummoned && result.lavaOnOpponent && result.tributesPaid, 'Golem di Lava deve tributare due mostri e finire sul Terreno avversario');
        t.assert(result.parasiteDraw, 'Parassita pescato deve saltare la mano, Evocarsi e infliggere 1000 danni');
        t.assert(result.supplyWorks, 'Rifornimento deve recuperare due materiali della stessa Fusione');

        const patrician = await t.evaluate(() => new Promise((resolve) => {
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const attacker = { ...base, uid: 'patrician-attacker', attack: 1500, defense: 1000 };
            const weak = { ...base, uid: 'patrician-weak', attack: 100, defense: 100 };
            const patrizio = { ...cardDatabase.find((c) => c.id === 1135), uid: 'patrician-self' };
            gameState.gameOver = false;
            gameState.phase = 'battle';
            gameState.currentPlayer = 'player';
            gameState.turn = 20;
            gameState.playerLP = 8000;
            gameState.botLP = 8000;
            gameState.playerMonsterField = [{ card: attacker, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [
                { card: weak, position: 'attack', isFaceDown: false, hasAttacked: false },
                { card: patrizio, position: 'attack', isFaceDown: false, hasAttacked: false },
                null, null, null
            ];
            DuelEngine.recomputeStaticEffects();
            resolveAttack('player', 0, 0, () => resolve({
                weakStillThere: !!gameState.botMonsterField[0],
                patrizioWasChosen: gameState.playerLP === 7500
            }));
        }));
        t.assert(patrician.weakStillThere && patrician.patrizioWasChosen,
            `Patrizio deve permettere al difensore IA di sostituire il bersaglio dichiarato con quello più favorevole (${JSON.stringify(patrician)})`);
    }
};
