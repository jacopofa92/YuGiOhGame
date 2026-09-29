// Guardrail del revamp visivo di Buco Nero. La regola resta separata dal
// VFX: prima vengono fotografate le carte reali, poi distrutte, infine i
// loro duplicati grafici vengono risucchiati dalla singolarita'.
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'Buco Nero: singolarita 3D stratificata e carte risucchiate nel vortice',
    async run(t) {
        const root = path.join(__dirname, '..', '..');
        const baseFx = fs.readFileSync(path.join(root, 'js', 'ui', 'effects.js'), 'utf8');
        const gsapFx = fs.readFileSync(path.join(root, 'js', 'ui', 'fx-gsap.js'), 'utf8');
        const css = fs.readFileSync(path.join(root, 'js', 'ui', 'effects.css'), 'utf8');
        const cards = fs.readFileSync(path.join(root, 'js', 'engine', 'card-effects-1.js'), 'utf8');

        t.assert(baseFx.includes('fx-darkhole-lens')
            && baseFx.includes('fx-darkhole-disc')
            && baseFx.includes('fx-darkhole-core'),
        'Anche il fallback deve costruire lente, disco e orizzonte degli eventi');
        t.assert(gsapFx.includes("fxLayer('fx-gsap-darkhole-lens'")
            && gsapFx.includes("fxLayer('fx-gsap-darkhole-orbit'")
            && gsapFx.includes("fxLayer('fx-gsap-darkhole-mote'"),
        'Il backend GSAP deve includere lente gravitazionale, orbite e materia in caduta');
        t.assert(gsapFx.includes('Math.PI * 3.7') && gsapFx.includes('rotationX: 78'),
            'Le carte devono percorrere una spirale ampia e coricarsi sul disco 3D');
        t.assert(css.includes('@keyframes darkHoleCore') && css.includes('@keyframes darkHoleOrbitA'),
            'Il fallback CSS deve animare singolarita e orbite, non un solo cerchio piatto');

        const capture = cards.indexOf('sucked.push({ card: slot.card');
        const destroy = cards.indexOf('ctx.destroyAllMonsters()', capture);
        const play = cards.indexOf('FX.playDarkHoleVortex(sucked)', destroy);
        t.assert(capture !== -1 && capture < destroy && destroy < play,
            'Le carte vanno fotografate prima della distruzione e passate al vortice dopo');
    }
};
