const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'Grande Guerra: audio WW1 prioritario con fallback standard',
    async run(t) {
        const source = fs.readFileSync(path.join(process.cwd(), 'js/audio/audio-library.js'), 'utf8');
        t.assert(/campaignId === ['"]ww1['"] \? ['"]ww1['"]/.test(source),
            'Il resolver audio non riconosce campaign=ww1 della Grande Guerra.');
        t.assert(/themedState === ['"]pending['"]\) return true/.test(source),
            'Durante il caricamento WW1 parte ancora prematuramente il fallback standard.');
        t.assert(/themedState !== ['"]missing['"]/.test(source)
            && /audio\/standard\/\$\{effectName\}/.test(source),
            'Manca il fallback audio/standard quando il file WW1 non esiste.');

        const ww1Files = fs.readdirSync(path.join(process.cwd(), 'audio/standard/ww1'));
        const standardFiles = fs.readdirSync(path.join(process.cwd(), 'audio/standard'));
        ['attackSwing.mp3', 'lifePointsGained.mp3', 'lifePointsLost.mp3'].forEach((name) => {
            t.assert(ww1Files.includes(name), `File prioritario WW1 mancante: ${name}`);
            t.assert(standardFiles.includes(name), `Fallback standard mancante: ${name}`);
        });
    }
};
