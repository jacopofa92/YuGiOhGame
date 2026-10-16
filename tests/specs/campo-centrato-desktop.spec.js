module.exports = {
    name: 'Campo desktop centrato e indipendente dal box informazioni carta',
    async run(t) {
        for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
            await t.page.setViewportSize(viewport);
            await t.page.waitForTimeout(100);

            const misura = async (mostraInfo) => t.evaluate((visible) => {
                const panel = document.getElementById('cardInfoPanel');
                panel.classList.toggle('visible', visible);
                const battlefield = document.querySelector('.battlefield').getBoundingClientRect();
                const playerRow = document.querySelector('#playerFieldBoard .field-row').getBoundingClientRect();
                const botRow = document.querySelector('#botFieldBoard .field-row').getBoundingClientRect();
                const centro = (rect) => rect.left + rect.width / 2;
                return {
                    battlefield: centro(battlefield),
                    player: centro(playerRow),
                    bot: centro(botRow)
                };
            }, mostraInfo);

            const chiuso = await misura(false);
            const aperto = await misura(true);
            for (const stato of [chiuso, aperto]) {
                t.assert(Math.abs(stato.player - stato.battlefield) <= 1.5,
                    `Il campo giocatore non e' centrato a ${viewport.width}x${viewport.height}: ${JSON.stringify(stato)}`);
                t.assert(Math.abs(stato.bot - stato.battlefield) <= 1.5,
                    `Il campo avversario non e' centrato a ${viewport.width}x${viewport.height}: ${JSON.stringify(stato)}`);
            }
            t.assert(Math.abs(aperto.player - chiuso.player) <= 0.5,
                `Aprire il box carta non deve spostare il campo a ${viewport.width}x${viewport.height}`);
        }
    }
};
