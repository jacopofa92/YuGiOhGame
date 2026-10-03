// Contro un Yugi qualsiasi (Yugi Muto, Yami Yugi) in Torneo e nella Storia
// suona SEMPRE "King of Games - Yugi's Final Duel", qualunque musica chieda
// l'URL. In Duello Libero NO: lì resta la musica scelta dal giocatore. Contro
// chiunque altro resta la musica richiesta.
//
// Si apre il duello vero e si legge la traccia caricata nell'<audio>, non il
// valore calcolato: è quello che il giocatore sente.
//
// `standalone`: serve una pagina per ogni caso.
const path = require('path');
const fs = require('fs');

module.exports = {
    standalone: true,
    name: 'Duello contro Yugi: il suo tema in Torneo e Storia, non in Duello Libero',
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
        const musica = '&music=' + encodeURIComponent(ALTRA);
        // Torneo e Storia: il tema vince sulla musica richiesta.
        const yugiTorneo = await traccia('mode=tournament&tournament=battleCity&character=yugiMuto&difficulty=Facile' + musica);
        const yamiTorneo = await traccia('mode=tournament&tournament=battleCity&character=yamiYugi&difficulty=Facile' + musica);
        const yugiStoria = await traccia('mode=story&campaign=anime&tappa=anime-1-joey&character=yugiMuto&difficulty=Facile' + musica);
        const yamiStoriaSenzaMusica = await traccia('mode=story&campaign=anime&tappa=anime-1-joey&character=yamiYugi&difficulty=Facile');
        // Duello Libero: NO, resta la scelta del giocatore.
        const yugiLibero = await traccia('mode=free&character=yugiMuto&difficulty=Facile' + musica);
        const yamiLibero = await traccia('mode=free&character=yamiYugi&difficulty=Facile' + musica);
        // Contro chiunque altro in Torneo/Storia: la musica richiesta.
        const altroTorneo = await traccia('mode=tournament&tournament=battleCity&character=joey&difficulty=Facile' + musica);

        t.assert(yugiTorneo.endsWith(TEMA), `Yugi Muto in torneo: ${yugiTorneo}`);
        t.assert(yamiTorneo.endsWith(TEMA), `Yami Yugi in torneo: ${yamiTorneo}`);
        t.assert(yugiStoria.endsWith(TEMA), `Yugi Muto nella Storia: ${yugiStoria}`);
        t.assert(yamiStoriaSenzaMusica.endsWith(TEMA), `Yami Yugi nella Storia senza musica richiesta: ${yamiStoriaSenzaMusica}`);
        t.assert(yugiLibero.endsWith(ALTRA), `In Duello Libero contro Yugi Muto resta la musica scelta: ${yugiLibero}`);
        t.assert(yamiLibero.endsWith(ALTRA), `In Duello Libero contro Yami Yugi resta la musica scelta: ${yamiLibero}`);
        t.assert(altroTorneo.endsWith(ALTRA), `Contro un altro Duellante in torneo resta la musica richiesta: ${altroTorneo}`);
    }
};
