// Dieci carte chiuse dalla revisione dei missingEffectNote, con i
// meccanismi generici nati per loro:
//   1043 Balter Oscuro, 1114 Lupo Bicefalo — def.negatesEffectsOfBattleVictims
//        (fireOnDestroy: vale in attacco E in difesa)
//   901  La Fanciulla Indulgente — solo i mostri distrutti in battaglia QUESTO turno
//   1121 Thunder Nyan Nyan — def.onOwnFieldGainsMonster (cambio di controllo)
//   523  Guardian Eatos — secondo effetto (Equip -> bandisci fino a 3, +500 ATK)
//   880  Messaggero della Pace — mantenimento a scelta
//   1040 Drago della Caverna — def.canNormalSummon + def.canDeclareAttack
//        (e il bug di cannotNormalSummon, controllato solo nel popover)
//   420  Anello Magnetico — gameState.mustBeAttackedUidsFor
//   772  Simorgh — danno anche nella End Phase avversaria, niente Special Summon
// Le battaglie passano da resolveAttack vero (stesso schema di
// battle-resolution.spec.js: si aspetta onComplete, non un tempo fisso).
module.exports = {
    name: 'Note chiuse (3): negazione in battaglia, bersaglio obbligato, Evocazione condizionata e altre 7 carte',
    async run(t) {
        const pulisci = () => t.evaluate(() => {
            if (!window.__logOrig) {
                window.__logOrig = window.addToLog;
                window.addToLog = (m) => { (window.__log = window.__log || []).push(m); window.__logOrig(m); };
            }
            window.__log = [];
            window.__battleDone = false;
            // Più battaglie di fila con 2900 danni l'una porterebbero a zero
            // i LP del bot: a duello finito resolveAttack non fa più nulla
            // (gameOver) e i casi successivi fallirebbero per finta.
            gameState.playerLP = 99999;
            gameState.botLP = 99999;
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            gameState.phase = 'battle';
            gameState.playerSTField = [null, null, null, null, null];
            gameState.botSTField = [null, null, null, null, null];
            gameState.monsterEffectsNegatedUidsFor = { player: new Set(), bot: new Set() };
            gameState.negatedEffectsForeverUids = new Set();
            gameState.playerGraveyard = [];
            gameState.botGraveyard = [];
        });
        const battaglia = async (setup) => {
            await pulisci();
            await t.evaluate(setup);
            await t.page.waitForFunction(() => window.__battleDone === true, null, { timeout: 8000 });
        };

        // --- 1043: annulla gli effetti di chi distrugge, in attacco e in difesa
        const conOnDestroy = await t.evaluate(() => {
            const c = cardDatabase.find((x) => x.type === 'monster' && !x.extraDeck && DuelEngine.getDefinition(x.id) && typeof DuelEngine.getDefinition(x.id).onDestroy === 'function');
            return c ? c.id : null;
        });
        t.assert(conOnDestroy !== null, 'Preparazione: serve un mostro con onDestroy');

        await t.evaluate((id) => { window.__vittimaId = id; }, conOnDestroy);
        await battaglia(() => {
            const balter = { ...cardDatabase.find((c) => c.id === 1043), attack: 3000, uid: 'balter-a' };
            const vittima = { ...cardDatabase.find((c) => c.id === window.__vittimaId), attack: 100, defense: 0, uid: 'vittima-a' };
            gameState.playerMonsterField = [{ card: balter, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: vittima, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            resolveAttack('player', 0, 0, () => { window.__battleDone = true; });
        });
        const balterAttacca = await t.evaluate(() => ({
            distrutta: !gameState.botMonsterField.some((s) => s && s.card.uid === 'vittima-a'),
            negata: gameState.negatedEffectsForeverUids.has('vittima-a')
        }));
        t.assert(balterAttacca.distrutta && balterAttacca.negata, `Balter che attacca annulla gli effetti della vittima: ${JSON.stringify(balterAttacca)}`);

        await battaglia(() => {
            const balter = { ...cardDatabase.find((c) => c.id === 1043), attack: 3000, uid: 'balter-d' };
            const attaccante = { ...cardDatabase.find((c) => c.id === window.__vittimaId), attack: 100, defense: 0, uid: 'vittima-d' };
            gameState.playerMonsterField = [{ card: balter, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: attaccante, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            resolveAttack('bot', 0, 0, () => { window.__battleDone = true; });
        });
        const balterDifende = await t.evaluate(() => ({
            distrutto: !gameState.botMonsterField.some((s) => s && s.card.uid === 'vittima-d'),
            negato: gameState.negatedEffectsForeverUids.has('vittima-d')
        }));
        t.assert(balterDifende.distrutto && balterDifende.negato, `Anche in DIFESA Balter annulla gli effetti dell'attaccante distrutto: ${JSON.stringify(balterDifende)}`);

        // Un mostro qualunque (senza la regola) non annulla nulla.
        await battaglia(() => {
            const normale = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && !DuelEngine.getDefinition(c.id)), attack: 3000, uid: 'normale' };
            const vittima = { ...cardDatabase.find((c) => c.id === window.__vittimaId), attack: 100, defense: 0, uid: 'vittima-n' };
            gameState.playerMonsterField = [{ card: normale, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: vittima, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            resolveAttack('player', 0, 0, () => { window.__battleDone = true; });
        });
        const senzaRegola = await t.evaluate(() => gameState.negatedEffectsForeverUids.has('vittima-n'));
        t.assert(!senzaRegola, 'Senza negatesEffectsOfBattleVictims nessun effetto viene annullato');

        // --- 1114: Lupo Bicefalo che DIFENDE da un Mostro Flip (prima non copriva la difesa)
        await battaglia(() => {
            const lupo = { ...cardDatabase.find((c) => c.id === 1114), attack: 3000, uid: 'lupo' };
            const demone = { ...cardDatabase.find((c) => c.type === 'monster' && c.race === 'Demone' && c.id !== 1114 && !c.extraDeck), uid: 'demone-2' };
            const flip = { ...cardDatabase.find((c) => c.id === 23), attack: 100, uid: 'flip-att' };
            gameState.playerMonsterField = [{ card: lupo, position: 'attack', isFaceDown: false, hasAttacked: false }, { card: demone, position: 'defense', isFaceDown: false, hasAttacked: false }, null, null, null];
            gameState.botMonsterField = [{ card: flip, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            resolveAttack('bot', 0, 0, () => { window.__battleDone = true; });
        });
        const lupo = await t.evaluate(() => ({
            negato: gameState.negatedEffectsForeverUids.has('flip-att'),
            campoP: gameState.playerMonsterField.map((s) => s && s.card.name),
            campoB: gameState.botMonsterField.map((s) => s && s.card.name),
            log: window.__log,
            stato: { phase: gameState.phase, current: gameState.currentPlayer, cannot: DuelEngine.cannotAttack('bot'), gameOver: gameState.gameOver }
        }));
        t.assert(lupo.negato, `Lupo Bicefalo in difesa, con un altro Demone, annulla gli effetti del Mostro Flip che distrugge: ${JSON.stringify(lupo)}`);

        // --- 420: Anello Magnetico, l'avversario può attaccare solo il mostro equipaggiato
        await t.evaluate(() => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck);
            const a = { ...base, attack: 1000, defense: 1000, uid: 'anello-a' };
            const b = { ...base, attack: 1000, defense: 1000, uid: 'anello-b' };
            const anello = { ...cardDatabase.find((c) => c.id === 420), uid: 'anello', equippedToUid: 'anello-a', equippedToOwner: 'player', equippedToIndex: 0 };
            gameState.playerMonsterField = [{ card: a, position: 'attack', isFaceDown: false }, { card: b, position: 'attack', isFaceDown: false }, null, null, null];
            gameState.playerSTField = [{ card: anello, isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: { ...base, attack: 3000, uid: 'att-bot' }, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            DuelEngine.recomputeStaticEffects();
        });
        const obbligati = await t.evaluate(() => DuelEngine.forcedAttackTargetIndexes('player'));
        t.assert(JSON.stringify(obbligati) === '[0]', `Il bersaglio obbligato è il mostro equipaggiato: ${JSON.stringify(obbligati)}`);
        const tentativo = await t.evaluate(() => new Promise((ok) => {
            const lpPrima = gameState.playerLP;
            resolveAttack('bot', 0, 1, () => {
                const altro = { bIntatto: !!gameState.playerMonsterField[1], attaccanteLibero: !gameState.botMonsterField[0].hasAttacked };
                resolveAttack('bot', 0, -1, () => ok({ ...altro, lpUguali: gameState.playerLP === lpPrima }));
            });
        }));
        t.assert(tentativo.bIntatto && tentativo.attaccanteLibero, `Attaccare l'altro mostro è rifiutato: ${JSON.stringify(tentativo)}`);
        t.assert(tentativo.lpUguali, 'Anche l\'attacco diretto è rifiutato finché c\'è il mostro equipaggiato');

        // --- 1040: Drago della Caverna
        const drago = await t.evaluate(() => {
            const cave = { ...cardDatabase.find((c) => c.id === 1040), uid: 'cave' };
            const altro = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.race !== 'Drago'), uid: 'altro' };
            const dragoAmico = { ...cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.race === 'Drago' && c.id !== 1040), uid: 'drago-2' };
            gameState.playerMonsterField = [null, null, null, null, null];
            const liberoVuoto = DuelEngine.normalSummonBlockReason('player', cave);
            gameState.playerMonsterField = [{ card: altro, position: 'defense', isFaceDown: true }, null, null, null, null];
            const conMostro = DuelEngine.normalSummonBlockReason('player', cave);
            const iaConMostro = AI_SHARED.canNormalSummonNow(cave, gameState, 'player');
            const def = DuelEngine.getDefinition(1040);
            gameState.playerMonsterField = [{ card: cave, position: 'attack', isFaceDown: false }, null, null, null, null];
            const attaccoDaSolo = def.canDeclareAttack(DuelEngine.makeContext('player', { card: cave, slotIndex: 0 }));
            gameState.playerMonsterField[1] = { card: dragoAmico, position: 'attack', isFaceDown: false };
            const attaccoConDrago = def.canDeclareAttack(DuelEngine.makeContext('player', { card: cave, slotIndex: 0 }));
            // Il bug: un "non Evocabile Normalmente" fisso (Metalzoa) passava
            // da attemptMonsterSummon e dall'IA come una carta qualunque.
            const metalzoa = { ...cardDatabase.find((c) => c.id === 377), uid: 'metalzoa' };
            gameState.playerMonsterField = [null, null, null, null, null];
            return {
                liberoVuoto, conMostro: !!conMostro, iaConMostro, attaccoDaSolo, attaccoConDrago,
                metalzoaBloccata: !!DuelEngine.normalSummonBlockReason('player', metalzoa),
                metalzoaIa: AI_SHARED.canNormalSummonNow(metalzoa, gameState, 'bot')
            };
        });
        t.assert(drago.liberoVuoto === null, 'Drago della Caverna si Evoca Normalmente con il Terreno vuoto');
        t.assert(drago.conMostro && drago.iaConMostro === false, 'Con un mostro (anche coperto) già in campo non si Evoca, né per il giocatore né per l\'IA');
        t.assert(drago.attaccoDaSolo === false && drago.attaccoConDrago === true, 'Attacca solo se controlli un altro Drago scoperto');
        t.assert(drago.metalzoaBloccata && drago.metalzoaIa === false, 'Un mostro con cannotNormalSummon non si Evoca Normalmente da nessuna strada');

        await battaglia(() => {
            const cave = { ...cardDatabase.find((c) => c.id === 1040), uid: 'cave-b' };
            gameState.playerMonsterField = [{ card: cave, position: 'attack', isFaceDown: false, hasAttacked: false }, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            window.__lpBot = gameState.botLP;
            resolveAttack('player', 0, -1, () => { window.__battleDone = true; });
        });
        const caveRifiutato = await t.evaluate(() => gameState.botLP === window.__lpBot && !gameState.playerMonsterField[0].hasAttacked);
        t.assert(caveRifiutato, 'resolveAttack rifiuta l\'attacco del Drago della Caverna senza un altro Drago');

        // --- 901, 1121, 523, 880, 772: chiamate dirette ai percorsi del motore
        const resto = await t.evaluate(() => {
            if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
            const base = cardDatabase.find((c) => c.type === 'monster' && !c.extraDeck && c.attribute !== 'LUCE');
            const out = {};

            // 901
            const fanciulla = { ...cardDatabase.find((c) => c.id === 901), uid: 'fanciulla' };
            const prima = { ...base, uid: 'gy-altro' };
            const caduto = { ...base, uid: 'gy-caduto' };
            gameState.playerMonsterField = [{ card: fanciulla, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [prima, caduto];
            gameState.playerHand = [];
            gameState.battleDestroyedThisTurnFor = { player: [caduto], bot: [] };
            window.DuelEngineUI = null;
            const ctx901 = DuelEngine.makeContext('player', { card: fanciulla, zone: 'monster', index: 0 });
            DuelEngine.getDefinition(901).activate(ctx901);
            out.fanciulla = gameState.playerHand.map((c) => c.uid);
            gameState.battleDestroyedThisTurnFor = { player: [], bot: [] };
            gameState.playerMonsterField = [{ card: fanciulla, position: 'attack', isFaceDown: false }, null, null, null, null];
            out.fanciullaSenza = DuelEngine.getDefinition(901).canActivate(ctx901);

            // 1121
            const nyan = { ...cardDatabase.find((c) => c.id === 1121), uid: 'nyan' };
            const preda = { ...base, uid: 'preda-scura' };
            gameState.playerMonsterField = [{ card: nyan, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.botMonsterField = [{ card: preda, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerGraveyard = [];
            DuelEngine.actions.takeControl('player', 'bot', 0, true);
            out.nyanDistrutta = !gameState.playerMonsterField.some((s) => s && s.card.uid === 'nyan');

            // 523
            const eatos = { ...cardDatabase.find((c) => c.id === 523), uid: 'eatos' };
            const spellEquip = { ...cardDatabase.find((c) => c.type === 'spell'), uid: 'eatos-equip', equippedToUid: 'eatos', equippedToOwner: 'player', equippedToIndex: 0 };
            gameState.playerMonsterField = [{ card: eatos, position: 'attack', isFaceDown: false }, null, null, null, null];
            gameState.playerSTField = [{ card: spellEquip, isFaceDown: false }, null, null, null, null];
            gameState.botGraveyard = [1, 2, 3, 4].map((n) => ({ ...base, uid: 'gyb-' + n }));
            gameState.temporaryAtkDefBonus = {};
            const ctx523 = DuelEngine.makeContext('player', { card: eatos, zone: 'monster', index: 0 });
            out.eatosPuo = DuelEngine.getDefinition(523).canActivate(ctx523);
            DuelEngine.getDefinition(523).activate(ctx523);
            out.eatos = {
                equipVia: !gameState.playerSTField.some((s) => s && s.card.uid === 'eatos-equip'),
                restanoNelCimitero: gameState.botGraveyard.length,
                bonus: (gameState.temporaryAtkDefBonus.eatos || {}).atk
            };
            gameState.playerGraveyard = [{ ...cardDatabase.find((c) => c.type === 'spell'), uid: 'solo-magia' }];
            out.eatosConMagia = DuelEngine.getDefinition(523).canSpecialSummonFromHand(DuelEngine.makeContext('player', { card: eatos }));
            gameState.playerGraveyard.push({ ...base, uid: 'un-mostro' });
            out.eatosConMostro = DuelEngine.getDefinition(523).canSpecialSummonFromHand(DuelEngine.makeContext('player', { card: eatos }));

            // 880
            const messaggero = (uid) => ({ ...cardDatabase.find((c) => c.id === 880), uid: uid });
            const standby = (owner, uid) => DuelEngine.getDefinition(880).onStandbyPhase(DuelEngine.makeContext(owner, { card: gameState[owner === 'player' ? 'playerSTField' : 'botSTField'][0].card, zone: 'st', index: 0 }));
            gameState.playerSTField = [{ card: messaggero('m-p'), isFaceDown: false }, null, null, null, null];
            gameState.playerLP = 4000;
            window.DuelEngineUI = { openChoicePopover(anchor, o) { o.choiceB.onSelect(); } };
            standby('player');
            out.messaggeroRifiutato = { via: !gameState.playerSTField[0], lp: gameState.playerLP };
            gameState.playerSTField = [{ card: messaggero('m-p2'), isFaceDown: false }, null, null, null, null];
            window.DuelEngineUI = { openChoicePopover(anchor, o) { o.choiceA.onSelect(); } };
            standby('player');
            out.messaggeroPagato = { resta: !!gameState.playerSTField[0], lp: gameState.playerLP };
            window.DuelEngineUI = null;
            gameState.botSTField = [{ card: messaggero('m-b'), isFaceDown: false }, null, null, null, null];
            gameState.botLP = 800;
            standby('bot');
            out.messaggeroBotBasso = !gameState.botSTField[0];

            // 772
            const def772 = DuelEngine.getDefinition(772);
            out.simorgh = { avversaria: typeof def772.onOpponentEndPhase === 'function', specialeVietata: !!def772.cannotSpecialSummon };
            return out;
        });
        t.assert(JSON.stringify(resto.fanciulla) === '["gy-caduto"]', `La Fanciulla riprende solo il mostro distrutto in battaglia questo turno: ${JSON.stringify(resto.fanciulla)}`);
        t.assert(resto.fanciullaSenza === false, 'Senza mostri distrutti in battaglia questo turno la Fanciulla non si attiva');
        t.assert(resto.nyanDistrutta, 'Thunder Nyan Nyan si distrugge quando ottieni il controllo di un mostro non-LUCE');
        t.assert(resto.eatosPuo && resto.eatos.equipVia && resto.eatos.restanoNelCimitero === 1 && resto.eatos.bonus === 1500,
            `Guardian Eatos: Equip al Cimitero, 3 mostri banditi, +1500 ATK (${JSON.stringify(resto.eatos)})`);
        t.assert(resto.eatosConMagia === true && resto.eatosConMostro === false, 'Guardian Eatos guarda solo i MOSTRI nel Cimitero per la Special Summon');
        t.assert(resto.messaggeroRifiutato.via && resto.messaggeroRifiutato.lp === 4000, `Rifiutando il pagamento il Messaggero viene distrutto: ${JSON.stringify(resto.messaggeroRifiutato)}`);
        t.assert(resto.messaggeroPagato.resta && resto.messaggeroPagato.lp === 3900, `Pagando resta e costa 100 LP: ${JSON.stringify(resto.messaggeroPagato)}`);
        t.assert(resto.messaggeroBotBasso, 'Il bot con pochi LP non paga il mantenimento');
        t.assert(resto.simorgh.avversaria && resto.simorgh.specialeVietata, 'Simorgh: danno anche nella End Phase avversaria e niente Special Summon');
    }
};
