const fs = require('fs');
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Personaggi: pedine nelle UI, ritratti pieni solo nella griglia Duello Libero',
    async run(t) {
        const radice = path.join(__dirname, '..', '..');
        const page = await t.browser.newPage({ viewport: { width: 1280, height: 900 } });
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto('file:///' + path.join(radice, 'duello-libero.html').replace(/\\/g, '/'));
            await page.waitForFunction(() => typeof characterDatabase !== 'undefined' && Array.isArray(characterDatabase)
                && typeof getCharacterPawnImage === 'function' && document.querySelectorAll('.cube img').length > 0);
            const dati = await page.evaluate(() => ({
                personaggi: characterDatabase.map((c) => ({ id: c.id, pedina: getCharacterPawnImage(c.image) })),
                griglia: [...document.querySelectorAll('.cube img')].slice(0, 8).map((img) => img.getAttribute('src'))
            }));

            dati.personaggi.forEach((c) => {
                t.assert(c.pedina && c.pedina.startsWith('images/characters/pedine/'), `Pedina non risolta per ${c.id}: ${c.pedina}`);
                t.assert(fs.existsSync(path.join(radice, c.pedina)), `File pedina mancante per ${c.id}: ${c.pedina}`);
            });
            t.assert(dati.griglia.length > 0 && dati.griglia.every((src) => src && !src.includes('/pedine/')),
                `La griglia Duello Libero deve conservare i ritratti pieni: ${JSON.stringify(dati.griglia)}`);
        } finally {
            await page.close();
        }
    }
};
