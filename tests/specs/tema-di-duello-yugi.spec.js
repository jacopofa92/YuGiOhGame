// Contro un Yugi qualsiasi (Yugi Muto, Yami Yugi) in duello suona SEMPRE
// "King of Games - Yugi's Final Duel", qualunque musica chieda l'URL (scelta
// in Duello Libero, tappa della Storia, torneo). Contro chiunque altro
// resta la musica richiesta.
//
// Si apre il duello vero e si legge la traccia caricata nell'<audio>, non il
// valore calcolato: è quello che il giocatore sente.
//
// `standalone`: serve una pagina per ogni caso.
const path = require('path');
const fs = require('fs');

module.exports = {
    standalone: true,
    name: 'Duello contro Yugi: sempre il suo tema, contro gli altri la musica richiesta',
    async run(t) {
        const RADICE = path.join(__dirname, '..', '..');
        const TEMA = "King of Games - Yugi's Final Duel.mp3";
        t.assert(fs.existsSync(path.join(RADICE, 'audio', 'soundtracks', TEMA)), 'Il file del tema deve esistere in audio/soundtracks/');

        const traccia = async (query) => {
            const page = await t.browser.newPage({ viewport: { width: 1280, height: 800 } });
            await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; window.DUEL_RPS_SKIP = true; window.DUEL_FAST_OPENING = true; });
            try {
                await page.goto('file:///' + path.join(RADICE, 'duelMonstersCore.html').replace(/\\/g, '/') + '?' + query);
                await page.waitForFunction(() => !!document.getElementById('bgMusicAudio') && !!document.getElementById('bgMusicAudio').getAttribute('src'), null, { timeout: 20000 });
                return decodeURIComponent(await page.evaluate(() => document.getElementById('bgMusicAudio').getAttribute('src')));
            } finally {
                await page.close();
            }
        };

        const ALTRA = '07. Preliminary Face-Off.mp3';
        const yugi = await traccia('mode=free&character=yugiMuto&difficulty=Facile&music=' + encodeURIComponent(ALTRA));
        const yami = await traccia('mode=free&character=yamiYugi&difficulty=Facile&music=' + encodeURIComponent(ALTRA));
        const yugiSenzaMusica = await traccia('mode=free&character=yugiMuto&difficulty=Facile');
        const altro = await traccia('mode=free&character=joey&difficulty=Facile&music=' + encodeURIComponent(ALTRA));

        t.assert(yugi.endsWith(TEMA), `Yugi Muto: ${yugi}`);
        t.assert(yami.endsWith(TEMA), `Yami Yugi: ${yami}`);
        t.assert(yugiSenzaMusica.endsWith(TEMA), `Yugi senza musica richiesta: ${yugiSenzaMusica}`);
        t.assert(altro.endsWith(ALTRA), `Contro un altro Duellante resta la musica richiesta: ${altro}`);
    }
};
