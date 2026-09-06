// Quinta ondata prima serie: 3 Mostri Fusione con effetto reale + i loro
// 4 materiali propedeutici (id 1039-1045). Verifica i 3 meccanismi
// genuinamente nuovi: Effetto Veloce da campo con negateActivation,
// floodgate globale anti-FLIP, blocco Special Summon per entrambi i lati.
module.exports = {
    name: 'Quinta ondata prima serie: negazione da campo, floodgate anti-FLIP, blocco Special Summon (id 1039-1045)',
    async run(t) {
        // Maryokutai (1042): nega una Magia SOLO durante il turno avversario.
        const maryokutaiResult = await t.evaluate(() => {
            const maryokutai = { ...cardDatabase.find((c) => c.id === 1042), uid: 'maryokutai-1' };
            const spell = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'spell-1' };
            gameState.playerMonsterField = [{ card: maryokutai, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [];
            gameState.currentPlayer = 'bot'; // turno del BOT: per Maryokutai (controllato dal player) è il turno dell'avversario
            gameState.chain = { active: true, links: [{ owner: 'bot', card: spell, negated: false }] };
            const ctx = DuelEngine.makeContext('player', { card: maryokutai });
            const canActivateOpponentTurn = DuelEngine.getDefinition(1042).canActivate(ctx);
            DuelEngine.getDefinition(1042).activate(ctx);
            return {
                canActivateOpponentTurn: canActivateOpponentTurn,
                negated: gameState.chain.links[0].negated,
                tributed: !gameState.playerMonsterField.some((s) => s && s.card.uid === 'maryokutai-1'),
                inGraveyard: gameState.playerGraveyard.some((c) => c.uid === 'maryokutai-1')
            };
        });
        t.assert(maryokutaiResult.canActivateOpponentTurn, 'Maryokutai deve poter rispondere durante il turno del bot (avversario del suo controllore)');
        t.assert(maryokutaiResult.negated, 'Maryokutai deve negare davvero la Magia in cima alla Chain');
        t.assert(maryokutaiResult.tributed && maryokutaiResult.inGraveyard, 'Maryokutai deve tributarsi (lasciare il Terreno e finire nel Cimitero)');

        const maryokutaiOwnTurn = await t.evaluate(() => {
            const maryokutai = { ...cardDatabase.find((c) => c.id === 1042), uid: 'maryokutai-2' };
            const spell = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'spell-2' };
            gameState.playerMonsterField = [{ card: maryokutai, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.currentPlayer = 'player'; // proprio turno: NON deve poter rispondere
            gameState.chain = { active: true, links: [{ owner: 'player', card: spell, negated: false }] };
            const ctx = DuelEngine.makeContext('player', { card: maryokutai });
            return DuelEngine.getDefinition(1042).canActivate(ctx);
        });
        t.assert(maryokutaiOwnTurn === false, 'Maryokutai NON deve poter rispondere durante il proprio turno');

        // Balter Oscuro il Terribile (1043): nega una Magia Normale pagando 1000 LP, in qualunque momento (non solo turno avversario).
        const balterResult = await t.evaluate(() => {
            const balter = { ...cardDatabase.find((c) => c.id === 1043), uid: 'balter-1' };
            const normalSpell = { ...cardDatabase.find((c) => c.type === 'spell' && c.subtype === 'normal'), uid: 'nspell-1' };
            gameState.playerMonsterField = [{ card: balter, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerLP = 8000;
            gameState.currentPlayer = 'player';
            gameState.chain = { active: true, links: [{ owner: 'player', card: normalSpell, negated: false }] };
            const ctx = DuelEngine.makeContext('player', { card: balter });
            const canActivate = DuelEngine.getDefinition(1043).canActivate(ctx);
            DuelEngine.getDefinition(1043).activate(ctx);
            return { canActivate: canActivate, negated: gameState.chain.links[0].negated, lpPaid: 8000 - gameState.playerLP, stillOnField: gameState.playerMonsterField.some((s) => s && s.card.uid === 'balter-1') };
        });
        t.assert(balterResult.canActivate, 'Balter Oscuro il Terribile deve poter rispondere anche durante il PROPRIO turno (a differenza di Maryokutai)');
        t.assert(balterResult.negated, 'Deve negare davvero la Magia Normale');
        t.assert(balterResult.lpPaid === 1000, `Deve pagare 1000 LP (rilevati ${balterResult.lpPaid})`);
        t.assert(balterResult.stillOnField, 'A differenza di Maryokutai, Balter Oscuro NON si tributa: resta sul Terreno');

        // Drago Teschio Demoniaco (1044): floodgate globale anti-FLIP.
        // Insetto Divoratore Mostruoso (id 23) come sonda: scelto sul
        // campo del BOT (non del player) per far prendere all'hook il
        // ramo di auto-selezione invece del picker UI umano (ctx.owner
        // !== 'player'), stesso accorgimento già rodato in
        // swords-of-revealing-light-flip.spec.js.
        const fiendSkullFlipBlockResult = await t.evaluate(() => {
            const dragon = { ...cardDatabase.find((c) => c.id === 1044), uid: 'dragon-1' };
            const flipMonster = { ...cardDatabase.find((c) => c.id === 23), uid: 'flip-1' };
            const strong = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'strong-1', attack: 3000, defense: 0 };
            gameState.playerMonsterField = [{ card: dragon, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: strong, position: 'attack', isFaceDown: false }, { card: flipMonster, position: 'defense', isFaceDown: true }, null, null, null];
            window.FX = null;
            DuelEngine.recomputeStaticEffects();
            const globallyNegatedWithDragon = gameState.flipEffectsGloballyNegated;
            const ctx = DuelEngine.makeContext('bot', { card: flipMonster, slotIndex: 1 });
            DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_FLIP, ctx);
            const destroyedDespiteDragon = !gameState.botMonsterField.some((s) => s && s.card.uid === 'strong-1');
            return { globallyNegatedWithDragon: globallyNegatedWithDragon, destroyedDespiteDragon: destroyedDespiteDragon };
        });
        t.assert(fiendSkullFlipBlockResult.globallyNegatedWithDragon, 'gameState.flipEffectsGloballyNegated deve essere true mentre Drago Teschio Demoniaco è scoperto');
        t.assert(!fiendSkullFlipBlockResult.destroyedDespiteDragon, 'Il FLIP di Insetto Divoratore Mostruoso NON deve avere effetto mentre Drago Teschio Demoniaco è scoperto');

        const flipWorksWithoutDragon = await t.evaluate(() => {
            const flipMonster = { ...cardDatabase.find((c) => c.id === 23), uid: 'flip-2' };
            const strong = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'strong-2', attack: 3000, defense: 0 };
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [{ card: strong, position: 'attack', isFaceDown: false }, { card: flipMonster, position: 'defense', isFaceDown: true }, null, null, null];
            DuelEngine.recomputeStaticEffects();
            const ctx = DuelEngine.makeContext('bot', { card: flipMonster, slotIndex: 1 });
            DuelEngine.fireTrigger(DuelEngine.TRIGGER.ON_FLIP, ctx);
            return !gameState.botMonsterField.some((s) => s && s.card.uid === 'strong-2');
        });
        t.assert(flipWorksWithoutDragon, 'Senza Drago Teschio Demoniaco sul Terreno, il FLIP deve funzionare normalmente (nessuna regressione)');

        // L'Ultimo Guerriero di un Altro Pianeta (1045): distrugge gli altri propri mostri e blocca ogni Special Summon per ENTRAMBI i lati.
        const lastWarriorResult = await t.evaluate(() => {
            const warrior = { ...cardDatabase.find((c) => c.id === 1045), uid: 'warrior-1' };
            const ally = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'ally-1' };
            gameState.playerMonsterField = [{ card: warrior, position: 'attack', isFaceDown: false }, { card: ally, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', { card: warrior, summonedVia: 'special' });
            DuelEngine.getDefinition(1045).onSummon(ctx);
            const allyDestroyed = !gameState.playerMonsterField.some((s) => s && s.card.uid === 'ally-1');
            DuelEngine.recomputeStaticEffects();
            const blockedForPlayer = gameState.otherMonsterSummonsBlockedFor.player;
            const blockedForBot = gameState.otherMonsterSummonsBlockedFor.bot;
            // Verifica REALE: un tentativo di Special Summon di un mostro qualunque per il bot deve fallire.
            const testMonster = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'blocked-test-1' };
            const specialSummonResult = DuelEngine.actions.specialSummon('bot', testMonster, 0, 'attack');
            return { allyDestroyed: allyDestroyed, blockedForPlayer: blockedForPlayer, blockedForBot: blockedForBot, specialSummonResult: specialSummonResult };
        });
        t.assert(lastWarriorResult.allyDestroyed, 'Deve distruggere l\'altro mostro proprio quando Special Summonata');
        t.assert(lastWarriorResult.blockedForPlayer && lastWarriorResult.blockedForBot, 'otherMonsterSummonsBlockedFor deve essere true per ENTRAMBI i lati');
        t.assert(lastWarriorResult.specialSummonResult === false, 'Un tentativo di Special Summon del bot deve fallire davvero mentre questa carta è scoperta');
    }
};
