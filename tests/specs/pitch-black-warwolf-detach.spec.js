// Drago Nero Pece (id 404, Mostro Union): oltre all'aggancio a Lama
// Oscura (id 613, già implementato prima), ora implementa anche lo
// stacco VOLONTARIO ("puoi... staccarla e Special Summonarla scoperta
// in Posizione di Attacco") — riusa continuous:true +
// repeatableWhileContinuous:true, lo stesso meccanismo generico già
// usato da Offerta Suprema (id 559)/Pietra del Potere Nero Pece (id 751)
// per "riattiva una carta Continua già in campo", non nuova
// infrastruttura del motore.
module.exports = {
    name: 'Drago Nero Pece si stacca da Lama Oscura e torna sul Terreno (id 404)',
    async run(t) {
        const r1 = await t.evaluate(() => {
            const warwolf = { ...cardDatabase.find((c) => c.id === 404), uid: 'warwolf-1' };
            const darkBlade = { ...cardDatabase.find((c) => c.id === 613), uid: 'darkblade-1' };
            gameState.playerMonsterField = [{ card: warwolf, position: 'attack', isFaceDown: false }, { card: darkBlade, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.playerSTField = [null, null, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';

            // Aggancio (zona 'monster', come farebbe un vero click Ignition).
            const attachCtx = DuelEngine.makeContext('player', { card: warwolf, zone: 'monster', index: 0 });
            DuelEngine.getDefinition(404).activate(attachCtx);
            DuelEngine.recomputeStaticEffects();
            const afterAttach = {
                leftMonsterZone: gameState.playerMonsterField[0] === null,
                nowInSt: gameState.playerSTField.some((s) => s && s.card.uid === 'warwolf-1'),
                darkBladeBoosted: DuelEngine.getEffectiveAtk(darkBlade) === darkBlade.attack + 400
            };

            // Stacco (zona 'st', ricliccando la stessa carta già agganciata).
            const stIndex = gameState.playerSTField.findIndex((s) => s && s.card.uid === 'warwolf-1');
            const detachCtx = DuelEngine.makeContext('player', { card: warwolf, zone: 'st', index: stIndex });
            const canDetach = DuelEngine.getDefinition(404).canActivate(detachCtx);
            DuelEngine.getDefinition(404).activate(detachCtx);
            DuelEngine.recomputeStaticEffects();
            const afterDetach = {
                backInMonsterZone: gameState.playerMonsterField.some((s) => s && s.card.uid === 'warwolf-1' && !s.isFaceDown && s.position === 'attack'),
                leftSt: !gameState.playerSTField.some((s) => s && s.card.uid === 'warwolf-1'),
                darkBladeNoLongerBoosted: DuelEngine.getEffectiveAtk(darkBlade) === darkBlade.attack,
                stillHasEquippedFlag: !!warwolf.equippedToOwner
            };

            // Stesso turno: aggancio e stacco condividono lo stesso budget
            // "una volta per turno" -> un secondo riaggancio deve fallire.
            // Passa dal wrapper condiviso DuelEngine.canActivate (non da
            // def.canActivate direttamente): è LUI a imporre il controllo
            // usedIgnitionThisTurn per la zona 'monster' (duel-engine.js),
            // prima ancora di interpellare la carta stessa.
            const reAttachIndex = gameState.playerMonsterField.findIndex((s) => s && s.card.uid === 'warwolf-1');
            const canReattachSameTurn = DuelEngine.canActivate('player', 'monster', reAttachIndex);

            return { canDetach, afterAttach, afterDetach, canReattachSameTurn };
        });

        t.assert(r1.canDetach, "Lo stacco deve essere disponibile durante il proprio Main Phase dopo l'aggancio");
        t.assert(r1.afterAttach.leftMonsterZone, "Dopo l'aggancio, Drago Nero Pece deve lasciare la zona Mostro");
        t.assert(r1.afterAttach.nowInSt, "Dopo l'aggancio, Drago Nero Pece deve comparire nella zona Magia/Trappola");
        t.assert(r1.afterAttach.darkBladeBoosted, "Lama Oscura agganciata deve guadagnare +400 ATK");

        t.assert(r1.afterDetach.backInMonsterZone, 'Dopo lo stacco, Drago Nero Pece deve tornare scoperto in Posizione di Attacco sul Terreno');
        t.assert(r1.afterDetach.leftSt, 'Dopo lo stacco, Drago Nero Pece deve lasciare la zona Magia/Trappola');
        t.assert(r1.afterDetach.darkBladeNoLongerBoosted, 'Dopo lo stacco, Lama Oscura non deve più avere il bonus +400');
        t.assert(!r1.afterDetach.stillHasEquippedFlag, 'Dopo lo stacco, Drago Nero Pece non deve più risultare agganciato a nulla');

        t.assert(!r1.canReattachSameTurn, "Aggancio e stacco condividono lo stesso budget \"una volta per turno\": un secondo riaggancio nello stesso turno deve essere bloccato");
    }
};
