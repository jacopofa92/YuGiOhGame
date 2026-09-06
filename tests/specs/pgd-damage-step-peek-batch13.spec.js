// Tredicesima ondata prima serie: 3 Mostri Effetto minori (id 1115-1117).
// Verifica il riuso di def.onOwnAttackDeclare (dispatchato SOLO
// sull'attaccante, mai broadcast a tutto il campo) + ctx.grantDamageStepOnlyBonus
// (entrambi già esistenti prima di questa sessione, scoperti tramite un
// grep mirato invece di essere ricostruiti da zero — vedi la lezione
// sulla falsa nota "Categoria A" di id 630 in CLAUDE.md).
module.exports = {
    name: 'Tredicesima ondata prima serie: ATK durante il Damage Step, rivelazione informativa (id 1115-1117)',
    async run(t) {
        // Scorpione dalle 8 Chele (1115): ATK diventa 2400 SOLO per il calcolo dei danni quando attacca un mostro coperto in Difesa; nessun effetto contro un attacco diretto o un bersaglio scoperto.
        const scorpionResult = await t.evaluate(() => {
            const scorpion = { ...cardDatabase.find((c) => c.id === 1115), uid: 'scorpion-1', attack: 300 };
            const faceDownDefender = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'scorpion-target-1' };
            gameState.playerMonsterField = [{ card: scorpion, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: faceDownDefender, position: 'defense', isFaceDown: true }, null, null, null, null];
            gameState.damageStepOnlyBonusFor = {};
            const ctx = DuelEngine.makeContext('player', { card: scorpion, attackerOwner: 'player', attackerIndex: 0, targetIndex: 0 });
            DuelEngine.getDefinition(1115).onOwnAttackDeclare(ctx);
            const bonus = DuelEngine.getDamageStepBonus(scorpion, faceDownDefender, 'attacker');
            const atkDuringDamageStep = scorpion.attack + bonus.atk;
            const bonusConsumed = !gameState.damageStepOnlyBonusFor[scorpion.uid];

            // Ignition per coprirsi.
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            const igCtx = DuelEngine.makeContext('player', { card: scorpion, index: 0 });
            const canActivate = DuelEngine.getDefinition(1115).canActivate(igCtx);
            DuelEngine.getDefinition(1115).activate(igCtx);
            const flipped = gameState.playerMonsterField[0].isFaceDown && gameState.playerMonsterField[0].position === 'defense';
            return { atkDuringDamageStep: atkDuringDamageStep, bonusConsumed: bonusConsumed, canActivate: canActivate, flipped: flipped };
        });
        t.assert(scorpionResult.atkDuringDamageStep === 2400, `Scorpione dalle 8 Chele deve avere ATK 2400 solo per il calcolo dei danni (rilevati ${scorpionResult.atkDuringDamageStep})`);
        t.assert(scorpionResult.bonusConsumed, 'Il bonus deve consumarsi dopo una sola lettura (one-shot)');
        t.assert(scorpionResult.canActivate && scorpionResult.flipped, 'Scorpione dalle 8 Chele deve potersi coprire con la propria Ignition');

        const scorpionNoBonusResult = await t.evaluate(() => {
            const scorpion = { ...cardDatabase.find((c) => c.id === 1115), uid: 'scorpion-2', attack: 300 };
            const faceUpDefender = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck), uid: 'scorpion-target-2' };
            gameState.botMonsterField = [{ card: faceUpDefender, position: 'defense', isFaceDown: false }, null, null, null, null];
            gameState.damageStepOnlyBonusFor = {};
            const ctx = DuelEngine.makeContext('player', { card: scorpion, attackerOwner: 'player', attackerIndex: 0, targetIndex: 0 });
            DuelEngine.getDefinition(1115).onOwnAttackDeclare(ctx);
            return !!gameState.damageStepOnlyBonusFor[scorpion.uid];
        });
        t.assert(!scorpionNoBonusResult, 'Scorpione dalle 8 Chele NON deve applicare il bonus contro un mostro in Difesa SCOPERTA (non coperta)');

        // Uomo con Wdjat (1116): rivela nel log 1 carta coperta a caso dell'avversario quando Evocato Normalmente e ad ogni propria Standby Phase; nulla se Special Summonato.
        const wdjatResult = await t.evaluate(() => {
            const wdjat = { ...cardDatabase.find((c) => c.id === 1116), uid: 'wdjat-1' };
            const setSpell = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'wdjat-set-1' };
            gameState.botSTField = [{ card: setSpell, isFaceDown: true }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            const logCountBefore = gameState.duelLog ? gameState.duelLog.length : 0;
            const ctx = DuelEngine.makeContext('player', { card: wdjat });
            DuelEngine.getDefinition(1116).onSummon(ctx);
            DuelEngine.getDefinition(1116).onStandbyPhase(ctx);
            const specialHandler = DuelEngine.getDefinition(1116).onSpecialSummon;
            const noThrowOnSpecial = (() => { try { specialHandler(ctx); return true; } catch (e) { return false; } })();
            // Nessuna asserzione sul contenuto esatto del log (dipende dall'implementazione di addToLog) — verifichiamo solo che entrambe le chiamate non abbiano modificato alcuno stato di gioco (il vero test è "non lancia eccezioni e non cambia isFaceDown/posizione della carta coperta").
            const setSpellUntouched = gameState.botSTField[0].isFaceDown === true && gameState.botSTField[0].card.uid === 'wdjat-set-1';
            return { noThrowOnSpecial: noThrowOnSpecial, setSpellUntouched: setSpellUntouched };
        });
        t.assert(wdjatResult.noThrowOnSpecial, 'Uomo con Wdjat: onSpecialSummon deve essere un no-op sicuro (nessuna eccezione)');
        t.assert(wdjatResult.setSpellUntouched, 'La carta coperta guardata da Uomo con Wdjat non deve cambiare stato (resta coperta, nessuno spostamento)');

        // Cobraman Sakuzy (1117): Ignition per coprirsi; al FLIP non deve toccare le Magie/Trappole coperte dell'avversario.
        const cobramanResult = await t.evaluate(() => {
            const cobraman = { ...cardDatabase.find((c) => c.id === 1117), uid: 'cobraman-1' };
            const setTrap = { ...cardDatabase.find((c) => c.type === 'trap'), uid: 'cobraman-set-1' };
            gameState.playerMonsterField = [{ card: cobraman, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botSTField = [{ card: setTrap, isFaceDown: true }, null, null, null, null];
            gameState.phase = 'main1';
            gameState.currentPlayer = 'player';
            const ctx = DuelEngine.makeContext('player', { card: cobraman, index: 0 });
            const canActivate = DuelEngine.getDefinition(1117).canActivate(ctx);
            DuelEngine.getDefinition(1117).activate(ctx);
            const flipped = gameState.playerMonsterField[0].isFaceDown && gameState.playerMonsterField[0].position === 'defense';
            const flipCtx = DuelEngine.makeContext('player', { card: cobraman, index: 0 });
            let threw = false;
            try { DuelEngine.getDefinition(1117).onFlip(flipCtx); } catch (e) { threw = true; }
            const trapUntouched = gameState.botSTField[0].isFaceDown === true && gameState.botSTField[0].card.uid === 'cobraman-set-1';
            return { canActivate: canActivate, flipped: flipped, threw: threw, trapUntouched: trapUntouched };
        });
        t.assert(cobramanResult.canActivate && cobramanResult.flipped, 'Cobraman Sakuzy deve potersi coprire con la propria Ignition');
        t.assert(!cobramanResult.threw, 'Cobraman Sakuzy: onFlip non deve lanciare eccezioni');
        t.assert(cobramanResult.trapUntouched, 'La Trappola coperta rivelata da Cobraman Sakuzy non deve cambiare stato');
    }
};
