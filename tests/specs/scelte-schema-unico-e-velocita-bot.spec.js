// 1) Lo scarto a fine turno e la scelta della casella dopo un Sacrificio
//    usano lo stesso schema del Tributo: banda + velo (classe su <body>),
//    nessun Annulla perché sono obbligatori, e tutto sparisce a scelta fatta.
// 2) "Velocità del bot": BotSpeed accorcia le pause di ritmo solo in modalità
//    veloce, e un valore sconosciuto ricade su "normale".
module.exports = {
    name: 'Scelte con schema unico (scarto, casella) e velocità del bot',
    async run(t) {
        const { page, assert } = t;
        await page.waitForTimeout(800);

        const scarto = await page.evaluate(() => {
            startHandDiscardSelection(1, () => {});
            const durante = {
                modo: document.body.classList.contains('discard-mode'),
                banda: document.getElementById('handDiscardPrompt').classList.contains('show'),
                bandaGrande: document.getElementById('handDiscardPrompt').classList.contains('selection-banner'),
                annulla: !!document.querySelector('#handDiscardPrompt .tribute-prompt-cancel')
            };
            hideHandDiscardPrompt();
            gameState.pendingHandDiscard = null;
            return { durante, dopo: document.body.classList.contains('discard-mode') };
        });
        assert(scarto.durante.modo && scarto.durante.banda && scarto.durante.bandaGrande, `Scarto: banda e velo attivi: ${JSON.stringify(scarto.durante)}`);
        assert(!scarto.durante.annulla, 'Lo scarto obbligatorio non ha Annulla');
        assert(!scarto.dopo, 'Finito lo scarto la modalità sparisce');

        const casella = await page.evaluate(() => {
            setPlacementPrompt(true);
            const durante = {
                modo: document.body.classList.contains('placement-mode'),
                banda: document.getElementById('placementPrompt').classList.contains('show')
            };
            clearSelection(); // deve ripulire anche questa modalità
            return { durante, dopo: document.body.classList.contains('placement-mode'), bandaDopo: document.getElementById('placementPrompt').classList.contains('show') };
        });
        assert(casella.durante.modo && casella.durante.banda, `Casella: banda e velo attivi: ${JSON.stringify(casella.durante)}`);
        assert(!casella.dopo && !casella.bandaDopo, 'clearSelection spegne anche la scelta della casella');

        const velocita = await page.evaluate(() => {
            const out = {};
            localStorage.setItem('ygoBotSpeed', 'normale');
            out.normale = BotSpeed.scale(1000);
            localStorage.setItem('ygoBotSpeed', 'veloce');
            out.veloce = BotSpeed.scale(1000);
            out.botMs = botMs(1000);
            localStorage.setItem('ygoBotSpeed', 'boh');
            out.sconosciuto = BotSpeed.scale(1000);
            localStorage.removeItem('ygoBotSpeed');
            return out;
        });
        assert(velocita.normale === 1000, 'Velocità normale: pause invariate');
        assert(velocita.veloce < 500 && velocita.botMs === velocita.veloce, `Velocità veloce: pause molto più brevi e botMs le usa: ${JSON.stringify(velocita)}`);
        assert(velocita.sconosciuto === 1000, 'Un valore sconosciuto ricade su normale');
    }
};
