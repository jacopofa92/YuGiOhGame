// Sfide (js/data/challenges-db.js + js/challenges/challenge-tracker.js):
// verifica i DUE veri punti di aggancio nel motore, non solo la logica del
// tracker isolata — ACTIONS.specialSummon (duel-engine.js, esposta su un
// ctx tramite DuelEngine.makeContext — ACTIONS stessa è un const privato
// dell'IIFE, mai un vero global) deve far avanzare una sfida
// 'summonMonster' passando dal dispatcher condiviso ON_SPECIAL_SUMMON, e
// SOLO per il giocatore umano (mai per il bot, mai per un Token id -1).
// Il secondo aggancio (DuelSession.finish() in duel-session.js per
// 'defeatCharacter'/'winDuels') non è testabile qui (DuelSession non è
// caricato dalla sandbox demo) — coperto invece dalla verifica manuale
// con Playwright descritta in CLAUDE.md/nella sessione che ha introdotto
// questa funzionalità.
const { freezeNaturalGameLoop } = require('../helpers/harness');

module.exports = {
    name: 'Sfide: ACTIONS.specialSummon fa avanzare summonMonster solo per il giocatore, mai per bot o Token',
    async run(t) {
        await freezeNaturalGameLoop(t.page);

        const result = await t.evaluate(() => {
            if (!SaveManager.hasSave()) SaveManager.createNew('TestSfide');
            // Sfida nota dal catalogo reale: 'summon-blue-eyes-5' (cardId 1, target 5).
            const before = SaveManager.getChallengeProgress('summon-blue-eyes-5');

            const blueEyes = { ...cardDatabase.find((c) => c.id === 1), uid: 'be-1' };
            gameState.playerMonsterField = [null, null, null, null, null];
            gameState.botMonsterField = [null, null, null, null, null];
            const ctx = DuelEngine.makeContext('player', {});

            // 1) Giocatore: deve avanzare di 1.
            ctx.specialSummon('player', blueEyes, 0, 'attack');
            const afterPlayer = SaveManager.getChallengeProgress('summon-blue-eyes-5');

            // 2) Bot: NON deve avanzare oltre (stesso cardId, owner diverso).
            const blueEyes2 = { ...cardDatabase.find((c) => c.id === 1), uid: 'be-2' };
            ctx.specialSummon('bot', blueEyes2, 0, 'attack');
            const afterBot = SaveManager.getChallengeProgress('summon-blue-eyes-5');

            // 3) Token (id -1) del giocatore: NON deve avanzare nessuna sfida 'summonMonster' inesistente per id -1 né rompere nulla.
            let tokenThrew = false;
            try {
                const token = { id: -1, name: 'Token di prova', type: 'monster', attack: 0, defense: 0, level: 1, race: 'Guerriero', attribute: 'TERRA' };
                ctx.specialSummon('player', token, 1, 'attack');
            } catch (e) { tokenThrew = true; }

            return { before, afterPlayer, afterBot, tokenThrew };
        });

        t.assert(result.before.count === 0, `Prima di qualunque evocazione il conteggio deve essere 0, ottenuto ${result.before.count}`);
        t.assert(result.afterPlayer.count === 1, `Dopo un'Evocazione Speciale del GIOCATORE il conteggio deve salire a 1, ottenuto ${result.afterPlayer.count}`);
        t.assert(result.afterBot.count === 1, `Un'Evocazione del BOT non deve far avanzare la sfida (deve restare 1), ottenuto ${result.afterBot.count}`);
        t.assert(!result.tokenThrew, 'Evocare un Token (id -1) non deve lanciare eccezioni nel checkpoint delle Sfide');
    }
};
