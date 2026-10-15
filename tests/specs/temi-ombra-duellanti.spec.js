'use strict';

const path = require('path');
const fs = require('fs');

module.exports = {
    standalone: true,
    name: 'Temi ombra: Pegasus/Heishin e Marik/DarkNite/Nitemare rispettano contesto ed eccezioni',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const ombre = '57. Duel of Shadows – The Millennium Mind.mp3';
        const marik = '58. Yugi vs. Marik – Wrath of the Shadow Realm.mp3';
        const altra = '07. Preliminary Face-Off.mp3';
        [ombre, marik, "59. King of Games - Yugi's Final Duel.mp3"].forEach((file) => {
            t.assert(fs.existsSync(path.join(radice, 'audio', 'soundtracks', file)), `Traccia assente: ${file}`);
        });

        const traccia = async (query) => {
            const page = await t.browser.newPage({ viewport: { width: 1000, height: 700 } });
            await page.addInitScript(() => {
                window.AUTH_GATE_SKIP = true;
                window.DUEL_RPS_SKIP = true;
                window.DUEL_FAST_OPENING = true;
            });
            try {
                await page.goto('file:///' + path.join(radice, 'duelMonstersCore.html').replace(/\\/g, '/') + '?' + query);
                await page.waitForFunction(() => {
                    const audio = document.getElementById('bgMusicAudio');
                    return !!(audio && audio.getAttribute('src'));
                }, null, { timeout: 20000 });
                return decodeURIComponent(await page.evaluate(() => document.getElementById('bgMusicAudio').getAttribute('src')));
            } finally {
                await page.close();
            }
        };

        const richiesta = '&music=' + encodeURIComponent(altra);
        const casi = [
            ['Pegasus nella Storia', 'mode=story&campaign=anime&tappa=anime-2-pegasus&character=pegasus' + richiesta, ombre],
            ['Heishin nella Torre', 'mode=torre&piano=20&character=heishin' + richiesta, ombre],
            ['Marik nella Storia', 'mode=story&campaign=anime&tappa=anime-4-marik&character=marik' + richiesta, marik],
            ['DarkNite in Rivincita', 'mode=rivincita&rivincita=prova&character=darkNite' + richiesta, marik],
            ['Nitemare in un Puzzle', 'mode=puzzle&puzzle=inesistente&character=nitemare' + richiesta, marik],
            ['Pegasus nel videonastro', 'mode=story&campaign=anime&tappa=anime-1-pegasus-video&character=pegasus' + richiesta, altra],
            ['Pegasus in Duello Libero', 'mode=free&character=pegasus' + richiesta, altra],
            ['Marik in Duello Libero', 'mode=free&character=marik' + richiesta, altra]
        ];
        for (const [nome, query, attesa] of casi) {
            const ricevuta = await traccia(query);
            t.assert(ricevuta.endsWith(attesa), `${nome}: attesa ${attesa}, ricevuta ${ricevuta}`);
        }
    }
};
