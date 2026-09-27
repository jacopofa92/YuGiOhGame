// Una Magia che chiede di scartare 1 carta non conta se stessa.
// =====================================================================
// Attivata DALLA MANO, la Magia sta ancora in mano quando si controlla se
// è attivabile: un `canActivate` scritto come "la mano non è vuota" la
// contava come la carta da scartare. Con in mano la sola Magia risultava
// attivabile, entrava in campo, non trovava niente da scartare e finiva
// al Cimitero senza fare nulla. Trovato da un audit sulle Carte
// Equipaggiamento (Flamberge del Male Infranto, id 727: restava senza
// bersaglio), con la stessa forma in Tributo ai Dannati (492) e Vortice
// Fulmineo (729). Vedi otherHandCards in js/engine/card-effects.js.
module.exports = {
    name: 'Magie con costo "scarta 1 carta": la carta stessa non conta come scarto (492/727/729)',
    async run(t) {
        const prova = (id, altre) => t.evaluate(([id, altre]) => {
            const nuova = (c, uid) => Object.assign(JSON.parse(JSON.stringify(c)), { uid: uid });
            const mostro = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            gameState.chain = { links: [] };
            gameState.playerMonsterField = [{ card: nuova(mostro, 'MIO'), position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: nuova(mostro, 'SUO'), position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.playerHand = [nuova(cardDatabase.find((c) => c.id === id), 'MAGIA')];
            for (let i = 0; i < altre; i++) gameState.playerHand.push(nuova(mostro, 'ALTRA' + i));
            return DuelEngine.canActivate('player', 'hand', 0);
        }, [id, altre]);

        for (const id of [492, 727, 729]) {
            const sola = await prova(id, 0);
            const conUnaltra = await prova(id, 1);
            t.assert(sola === false,
                `id ${id}: con in mano solo la Magia non c'è nulla da scartare, quindi non dev'essere attivabile`);
            t.assert(conUnaltra === true,
                `id ${id}: con un'altra carta in mano dev'essere attivabile`);
        }
    }
};
