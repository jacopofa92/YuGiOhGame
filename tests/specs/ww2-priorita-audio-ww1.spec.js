const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'Storia WW2: priorita ai suoni bellici WW1 con fallback standard',
    standalone: true,
    async run(t) {
        const root = path.resolve(__dirname, '..', '..');
        const source = fs.readFileSync(path.join(root, 'js', 'audio', 'audio-library.js'), 'utf8');
        const warDir = path.join(root, 'audio', 'standard', 'ww1');
        const covered = fs.readdirSync(warDir)
            .filter((name) => /\.(mp3|ogg)$/i.test(name))
            .map((name) => path.parse(name).name);

        t.assert(source.includes("campaignId === 'ww2' ? 'ww1' : null"),
            'La priorita bellica deve attivarsi soltanto nella campagna ww2');
        t.assert(source.indexOf('audio/standard/${campaignStandardFolder}/${effectName}')
            < source.indexOf('audio/standard/${effectName}'),
            'Il resolver deve provare la variante WW1 prima dello standard generale');
        t.assert(covered.includes('attackSwing') && covered.includes('lifePointsLost')
            && covered.includes('lifePointsGained'),
            `La cartella WW1 non contiene tutti i suoni bellici attesi: ${covered.join(', ')}`);
    }
};
