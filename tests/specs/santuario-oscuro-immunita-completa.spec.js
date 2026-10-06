// Le Spirit Message Special Summonate da Santuario Oscuro sono mostri non
// influenzati dagli effetti di altre carte, non soltanto non bersagliabili.
// Verifica i choke point condivisi usati sia dagli effetti singoli sia da
// quelli di massa; Destiny Board resta l'eccezione prevista dal testo.
module.exports = {
    name: 'Santuario Oscuro protegge le Spirit Message anche dagli effetti non mirati',
    async run(t) {
        const r = await t.evaluate(() => {
            const message = { ...cardDatabase.find((c) => c.id === 867), uid: 'spirit-immune', type: 'monster', attack: 0, defense: 0, level: 1 };
            const normal = { ...cardDatabase.find((c) => c.id === 71), uid: 'normal-destroyed' };
            const blackHole = { ...cardDatabase.find((c) => c.id === 7), uid: 'black-hole-source' };
            const destinyBoard = { ...cardDatabase.find((c) => c.id === 866), uid: 'destiny-source' };
            gameState.playerMonsterField = [
                { card: message, position: 'attack', isFaceDown: false },
                { card: normal, position: 'attack', isFaceDown: false },
                null, null, null
            ];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerHand = [];
            gameState.playerGraveyard = [];
            gameState.botGraveyard = [];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            DuelEngine.recomputeStaticEffects();

            const hostile = DuelEngine.makeContext('bot', { card: blackHole });
            hostile.destroyAllMonsters();
            const survivesMass = gameState.playerMonsterField[0] && gameState.playerMonsterField[0].card.uid === 'spirit-immune';
            const normalDestroyed = gameState.playerMonsterField[1] === null;
            hostile.changePosition('player', 0, 'defense');
            hostile.grantTemporaryAtkDefBonus(message, 1000, 1000, false);
            const positionUnchanged = gameState.playerMonsterField[0].position === 'attack';
            const noBonus = !gameState.temporaryAtkDefBonus['spirit-immune'];
            const noReturn = hostile.returnMonsterToHand('player', 0) === null
                && gameState.playerMonsterField[0] && gameState.playerHand.length === 0;
            const noControl = hostile.takeControl('bot', 'player', 0, true) === false
                && gameState.playerMonsterField[0] && gameState.botMonsterField.every((s) => !s);

            const allowed = DuelEngine.makeContext('player', { card: destinyBoard });
            allowed.changePosition('player', 0, 'defense');
            return {
                survivesMass, normalDestroyed, positionUnchanged, noBonus, noReturn, noControl,
                destinyBoardAllowed: gameState.playerMonsterField[0].position === 'defense'
            };
        });
        t.assert(r.survivesMass, 'la Spirit Message deve sopravvivere a una distruzione di massa');
        t.assert(r.normalDestroyed, 'un mostro normale nello stesso campo deve essere distrutto');
        t.assert(r.positionUnchanged && r.noBonus, 'posizione e statistiche non devono essere modificate da altre carte');
        t.assert(r.noReturn && r.noControl, 'non deve tornare in mano né cambiare controllore per effetto di altre carte');
        t.assert(r.destinyBoardAllowed, 'Destiny Board deve restare l’eccezione autorizzata all’immunità');
    }
};
