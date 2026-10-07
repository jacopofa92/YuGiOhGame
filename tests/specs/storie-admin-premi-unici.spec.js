// Lo sblocco amministrativo completa le mappe, non distribuisce premi; una
// ricompensa unica resta unica anche ricominciando la stessa campagna.
const path = require('path');

module.exports = {
    standalone: true,
    name: 'Storie admin al 100% senza premi e Obelisco non ripetibile al riavvio',
    async run({ browser, assert }) {
        const root = path.join(__dirname, '..', '..');
        const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
        await page.addInitScript(() => { window.AUTH_GATE_SKIP = true; });
        try {
            await page.goto('file:///' + path.join(root, 'storia.html').replace(/\\/g, '/') + '?campaign=anime');
            await page.waitForFunction(() => !!(window.SaveManager && window.StoryProgress && window.CardAcquisition));
            await page.addScriptTag({ path: path.join(root, 'js', 'dev', 'story-admin-tools.js') });
            const risultato = await page.evaluate(() => {
                SaveManager.createNew('Test storie admin');
                const primaCarte = SaveManager.getOwnedCount(30);
                const primaCrediti = SaveManager.getCurrency().credits;
                CloudSync.isAdmin = () => true;
                const sblocco = StoryAdminTools.completaTutteLeStorie();
                // Le carte e valute infinite dell'admin sono viste calcolate:
                // si torna utente normale per ispezionare il dato REALE.
                CloudSync.isAdmin = () => false;
                const stati = StoryProgress.getCampaigns()
                    .filter((campagna) => StoryProgress.getTappe(campagna.id).length > 0)
                    .flatMap((campagna) => {
                    const livelli = campagna.senzaLivelli ? [null] : ['facile', 'normale', 'difficile'];
                    return livelli.map((livello) => {
                        const key = livello && livello !== 'facile' ? `${campagna.id}@${livello}` : campagna.id;
                        return { key, stato: SaveManager.getStoryState(key) };
                    });
                    });
                const dopoAdmin = {
                    obelisco: SaveManager.getOwnedCount(30),
                    crediti: SaveManager.getCurrency().credits,
                    acquisizioni: SaveManager.getCardAcquisitionState()
                };

                // Simula una prima conclusione reale e poi la medesima
                // conclusione dopo "Ricomincia": la chiave di acquisizione
                // non fa parte del progresso che ricomincia azzera.
                CardAcquisition.onStoryProgress('anime', 'normale', [], true);
                const dopoPrimaVittoria = SaveManager.getOwnedCount(30);
                StoryProgress.ricomincia('anime');
                CardAcquisition.onStoryProgress('anime', 'normale', [], true);
                const dopoSecondaVittoria = SaveManager.getOwnedCount(30);
                return { sblocco, stati, primaCarte, primaCrediti, dopoAdmin, dopoPrimaVittoria, dopoSecondaVittoria };
            });

            assert(risultato.sblocco.ok, `Lo strumento admin deve riuscire: ${JSON.stringify(risultato.sblocco)}`);
            assert(risultato.stati.every((x) => x.stato && x.stato.finita && x.stato.premiata),
                'Ogni storia/difficoltà deve risultare finita e non deve lasciare premi finali da riscuotere');
            assert(risultato.dopoAdmin.obelisco === risultato.primaCarte
                && risultato.dopoAdmin.crediti === risultato.primaCrediti,
                `Lo sblocco amministrativo non deve distribuire carte o crediti: ${JSON.stringify(risultato)}`);
            assert(risultato.dopoPrimaVittoria === 1 && risultato.dopoSecondaVittoria === 1,
                `Obelisco deve essere assegnato una volta sola anche dopo Ricomincia: ${JSON.stringify(risultato)}`);
        } finally {
            await page.close();
        }
    }
};
