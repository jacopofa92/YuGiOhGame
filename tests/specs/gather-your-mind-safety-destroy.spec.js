// Potere Raccolto (id 160): equipaggia TUTTE le Magie Equipaggiamento sul
// Terreno al bersaglio scelto — la clausola di sicurezza mancante era "se
// una di queste finisce equipaggiata a un bersaglio non corretto,
// distruggila". Verifica il nuovo equipTargetFilter (aggiunto ad ogni
// Equip di card-effects.js) e l'interazione con
// cannotBeDestroyedByCardEffectWhileEquipped (id 726).
module.exports = {
    name: 'Potere Raccolto distrugge le Magie Equipaggiamento finite su un bersaglio non corretto (id 160)',
    async run(t) {
        const r1 = await t.evaluate(() => {
            // Libro delle Arti Segrete (127, solo Incantatore) equipaggiato
            // a un Guerriero -> bersaglio SBAGLIATO -> deve essere distrutto.
            const book = { ...cardDatabase.find((c) => c.id === 127), uid: 'book-1' };
            // Spada Leggendaria (344, solo Guerriero) -> bersaglio GIUSTO -> deve restare.
            const sword = { ...cardDatabase.find((c) => c.id === 344), uid: 'sword-1' };
            const warrior = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Guerriero'), uid: 'warrior-1' };
            const gather = { ...cardDatabase.find((c) => c.id === 160), uid: 'gather-1' };

            gameState.playerMonsterField = [{ card: warrior, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerSTField = [{ card: book, isFaceDown: false, setOnTurn: gameState.turn }, { card: sword, isFaceDown: false, setOnTurn: gameState.turn }, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerGraveyard = [];

            const ctx = DuelEngine.makeContext('player', { card: gather });
            DuelEngine.getDefinition(160).activate(ctx);

            return {
                bookDestroyed: gameState.playerGraveyard.some((c) => c.uid === 'book-1'),
                bookGoneFromField: !gameState.playerSTField.some((s) => s && s.card.uid === 'book-1'),
                swordStillEquipped: gameState.playerSTField.some((s) => s && s.card.uid === 'sword-1' && s.card.equippedToUid === 'warrior-1'),
                warriorStillThere: gameState.playerMonsterField.some((s) => s && s.card.uid === 'warrior-1')
            };
        });
        t.assert(r1.bookDestroyed, 'Libro delle Arti Segrete (solo Incantatore) equipaggiato a un Guerriero deve essere distrutto e mandato al Cimitero');
        t.assert(r1.bookGoneFromField, 'Libro delle Arti Segrete distrutto deve lasciare il Terreno');
        t.assert(r1.swordStillEquipped, 'Spada Leggendaria (solo Guerriero) equipaggiata a un Guerriero è un bersaglio corretto: deve restare equipaggiata');
        t.assert(r1.warriorStillThere, 'Il mostro bersaglio non viene toccato dalla clausola di sicurezza');

        // Spada Fusione Lama Murasame (726, solo Guerriero, con
        // cannotBeDestroyedByCardEffectWhileEquipped) equipaggiata a un
        // mostro NON Guerriero -> bersaglio sbagliato, MA la sua stessa
        // protezione "non può essere distrutta da effetti Carta finché
        // equipaggiata" resta valida anche qui: deve sopravvivere.
        const r2 = await t.evaluate(() => {
            const murasame = { ...cardDatabase.find((c) => c.id === 726), uid: 'murasame-1' };
            const nonWarrior = { ...cardDatabase.find((c) => c.type === 'monster' && c.race !== 'Guerriero'), uid: 'nonwarrior-1' };
            const gather2 = { ...cardDatabase.find((c) => c.id === 160), uid: 'gather-2' };

            gameState.playerMonsterField = [{ card: nonWarrior, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            gameState.playerSTField = [{ card: murasame, isFaceDown: false, setOnTurn: gameState.turn }, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.playerGraveyard = [];

            const ctx = DuelEngine.makeContext('player', { card: gather2 });
            DuelEngine.getDefinition(160).activate(ctx);

            return {
                murasameSurvived: gameState.playerSTField.some((s) => s && s.card.uid === 'murasame-1'),
                murasameNotInGraveyard: !gameState.playerGraveyard.some((c) => c.uid === 'murasame-1')
            };
        });
        t.assert(r2.murasameSurvived, 'Spada Fusione Lama Murasame deve sopravvivere: cannotBeDestroyedByCardEffectWhileEquipped resta valida anche su un bersaglio sbagliato');
        t.assert(r2.murasameNotInGraveyard, 'Spada Fusione Lama Murasame non deve finire al Cimitero in questo caso');
    }
};
