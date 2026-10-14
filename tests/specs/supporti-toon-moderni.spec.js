module.exports = {
    name: 'Supporti Toon moderni: Regno, Segnalibro e Signora Arpia',
    async run(t) {
        const result = await t.evaluate(() => {
            const copy = (id, uid) => ({ ...cardDatabase.find((c) => c.id === id), uid });

            resetGameState();
            const kingdom = copy(1266, 'kingdom');
            gameState.botDeck = [copy(3, 'k1'), copy(4, 'k2'), copy(5, 'k3'), copy(6, 'k4')];
            gameState.botDeckCount = 4;
            const kingdomDef = DuelEngine.getDefinition(1266);
            const kingdomCtx = DuelEngine.makeContext('bot', { card: kingdom, zone: 'fieldSpell' });
            const kingdomReady = kingdomDef.canActivate(kingdomCtx);
            kingdomDef.activate(kingdomCtx);
            const kingdomBanishesThree = gameState.botDeck.length === 1 && gameState.botBanished.length === 3;

            const toon = copy(481, 'kingdom-toon');
            gameState.botFieldSpell = { card: kingdom, isFaceDown: false };
            gameState.botMonsterField[0] = { card: toon, position: 'attack', isFaceDown: false };
            DuelEngine.recomputeStaticEffects();
            const kingdomGrantsDirect = gameState.directAttackAllowedUids[toon.uid] === true;
            const kingdomBlocksTarget = !DuelEngine.makeContext('player', { card: copy(4, 'target-source') })
                .declareTarget('bot', 0).allowed;
            const deckBeforeProtection = gameState.botDeck.length;
            const kingdomProtects = DuelEngine.tryProtectToonWithWorld('bot', toon);
            const kingdomPaysFromDeck = kingdomProtects && gameState.botDeck.length === deckBeforeProtection - 1;

            resetGameState();
            const kingdomForMermaid = copy(1266, 'kingdom-mermaid');
            gameState.playerFieldSpell = { card: kingdomForMermaid, isFaceDown: false };
            gameState.playerHand = [copy(484, 'mermaid')];
            const oldToonRecognizesKingdom = DuelEngine.canSpecialSummonFromHand('player', 0);

            resetGameState();
            const bookmark = copy(1267, 'bookmark');
            const kingdomInDeck = copy(1266, 'kingdom-search');
            gameState.botDeck = [kingdomInDeck];
            gameState.botDeckCount = 1;
            const bookmarkDef = DuelEngine.getDefinition(1267);
            const bookmarkCtx = DuelEngine.makeContext('bot', { card: bookmark, zone: 'hand' });
            const bookmarkReady = bookmarkDef.canActivate(bookmarkCtx);
            bookmarkDef.activate(bookmarkCtx);
            const bookmarkSearches = gameState.botHand.some((card) => card.uid === kingdomInDeck.uid)
                && gameState.botDeck.length === 0;
            const bookmarkOncePerTurn = !bookmarkDef.canActivate(bookmarkCtx);

            resetGameState();
            const protectedKingdom = copy(1266, 'protected-kingdom');
            const graveBookmark = copy(1267, 'grave-bookmark');
            gameState.botFieldSpell = { card: protectedKingdom, isFaceDown: false };
            gameState.botGraveyard = [graveBookmark];
            DuelEngine.makeContext('player', { card: copy(607, 'destroy-world') }).destroyFieldSpell('bot');
            const bookmarkProtectsWorld = !!gameState.botFieldSpell
                && gameState.botBanished.some((card) => card.uid === graveBookmark.uid)
                && !gameState.botGraveyard.some((card) => card.uid === graveBookmark.uid);

            resetGameState();
            const harpie = copy(1268, 'toon-harpie');
            const otherToon = copy(481, 'other-toon');
            const enemySpell = copy(607, 'enemy-spell');
            gameState.botFieldSpell = { card: copy(1266, 'kingdom-harpie'), isFaceDown: false };
            gameState.botMonsterField[0] = { card: otherToon, position: 'attack', isFaceDown: false };
            gameState.botHand = [harpie];
            gameState.playerSTField[0] = { card: enemySpell, isFaceDown: true };
            const harpieCanSummon = DuelEngine.canSpecialSummonFromHand('bot', 0);
            const harpieSummoned = DuelEngine.trySpecialSummonFromHand('bot', 0);
            DuelEngine.recomputeStaticEffects();
            const harpieDestroysBackrow = !gameState.playerSTField[0]
                && gameState.playerGraveyard.some((card) => card.uid === enemySpell.uid);
            const harpieAttacksDirectly = gameState.directAttackAllowedUids[harpie.uid] === true;
            gameState.botHand = [copy(1268, 'toon-harpie-2')];
            const harpieOncePerTurn = !DuelEngine.canSpecialSummonFromHand('bot', 0);

            const notesLegacy = [1266, 1267, 1268].every((id) => {
                const card = cardDatabase.find((entry) => entry.id === id);
                return card && typeof card.legacyOfficialEffect === 'string' && card.legacyOfficialEffect.length > 20;
            });

            return {
                kingdomReady, kingdomBanishesThree, kingdomGrantsDirect, kingdomBlocksTarget,
                kingdomPaysFromDeck, oldToonRecognizesKingdom, bookmarkReady, bookmarkSearches,
                bookmarkOncePerTurn, bookmarkProtectsWorld, harpieCanSummon, harpieSummoned,
                harpieDestroysBackrow, harpieAttacksDirectly, harpieOncePerTurn, notesLegacy
            };
        });
        Object.entries(result).forEach(([name, value]) => {
            t.assert(value, `${name} deve essere vero: ${JSON.stringify(result)}`);
        });
    }
};
