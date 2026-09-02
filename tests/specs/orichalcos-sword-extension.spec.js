// Spada Sigillante di Orichalcos (id 396): oltre alla clausola base già
// implementata (nega gli effetti del mostro equipaggiato), ora implementa
// anche la seconda clausola — "se hai una carta in Field Zone: estendi
// questo effetto a un altro mostro Effetto che controlli, fino alla
// fine del turno avversario" — riusando repeatableWhileContinuous
// (stesso meccanismo di Drago Nero Pece id 404) e un secondo store
// (gameState.orichalcosExtendedNegationUidsFor) che sopravvive al reset
// per-render di monsterEffectsNegatedUidsFor.
module.exports = {
    name: 'Spada Sigillante di Orichalcos estende la negazione a un secondo mostro via Field Zone (id 396)',
    async run(t) {
        const r1 = await t.evaluate(() => {
            const sword = { ...cardDatabase.find((c) => c.id === 396), uid: 'sword-1' };
            const equipped = { ...cardDatabase.find((c) => c.type === 'monster' && c.subtype === 'effect'), uid: 'equipped-1' };
            const secondEffectMonster = { ...cardDatabase.find((c) => c.type === 'monster' && c.subtype === 'effect' && c.id !== equipped.id), uid: 'second-1' };
            const someFieldSpell = { ...cardDatabase.find((c) => c.type === 'spell' && c.subtype === 'field'), uid: 'fieldspell-1' };

            gameState.playerMonsterField = [{ card: equipped, position: 'attack', isFaceDown: false }, { card: secondEffectMonster, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.playerSTField = [{ card: sword, isFaceDown: false, setOnTurn: gameState.turn, equippedToOwner: 'player', equippedToIndex: 0, equippedToUid: 'equipped-1' }, null, null, null, null];
            sword.equippedToOwner = 'player';
            sword.equippedToIndex = 0;
            sword.equippedToUid = 'equipped-1';
            gameState.playerFieldSpell = { card: someFieldSpell, isFaceDown: false };
            gameState.orichalcosExtendedNegationUidsFor = { player: new Set(), bot: new Set() };

            const ctx = DuelEngine.makeContext('player', { card: sword, zone: 'st', index: 0 });
            const canExtend = DuelEngine.getDefinition(396).canActivate(ctx);
            DuelEngine.getDefinition(396).activate(ctx);
            DuelEngine.recomputeStaticEffects();

            const firstRenderNegated = gameState.monsterEffectsNegatedUidsFor.player.has('second-1');
            // Un secondo render (es. dopo un click qualunque nell'interfaccia)
            // NON deve far sparire l'estensione: monsterEffectsNegatedUidsFor
            // viene azzerato e ricostruito da zero ad OGNI chiamata di
            // recomputeStaticEffects, quindi questo verifica davvero che
            // orichalcosExtendedNegationUidsFor venga ri-iniettato ogni volta.
            DuelEngine.recomputeStaticEffects();
            const secondRenderStillNegated = gameState.monsterEffectsNegatedUidsFor.player.has('second-1');

            const equippedStillNegatedToo = gameState.monsterEffectsNegatedUidsFor.player.has('equipped-1');
            const storedInExtensionSet = gameState.orichalcosExtendedNegationUidsFor.player.has('second-1');

            return { canExtend, firstRenderNegated, secondRenderStillNegated, equippedStillNegatedToo, storedInExtensionSet };
        });

        t.assert(r1.canExtend, "L'estensione deve essere disponibile: Field Zone presente, un secondo mostro Effetto idoneo sul campo");
        t.assert(r1.storedInExtensionSet, 'Il bersaglio esteso deve essere registrato in gameState.orichalcosExtendedNegationUidsFor');
        t.assert(r1.firstRenderNegated, 'Il secondo mostro Effetto deve risultare con gli effetti negati subito dopo l\'estensione');
        t.assert(r1.secondRenderStillNegated, 'La negazione estesa deve sopravvivere a un secondo recomputeStaticEffects (non solo al primo)');
        t.assert(r1.equippedStillNegatedToo, 'Il mostro originariamente equipaggiato deve restare negato anche lui (clausola base intatta)');
    }
};
