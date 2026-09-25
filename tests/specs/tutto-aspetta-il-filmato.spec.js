// Mentre un filmato di Evocazione è a schermo, il gioco sta fermo.
// =====================================================================
// Segnalato dall'utente: "tutto il gioco deve attendere la fine del
// video". Il filmato copre lo schermo e intercetta i click, quindi il
// difetto non era l'input — era quello che continuava a girare SOTTO:
// la Catena avanzava a tempo fisso, gli effetti si risolvevano, il campo
// cambiava, e a video finito ci si ritrovava davanti a una situazione
// diversa senza aver visto succedere niente.
//
// Il difetto è invisibile a un test che guardi solo lo stato finale: a
// filmato concluso tutto è andato "a posto" comunque. Si misura quindi
// il MOMENTO: cosa è successo mentre la cinematica era in corso.
//
// Il filmato vero non serve e non si usa: `FX.isCinematicPlaying` è il
// segnale che tutto il motore consulta, e falsificarlo prova
// esattamente il meccanismo senza dipendere da quali .mp4 esistano
// nella cartella video/ (che nel repository può benissimo essere vuota).
// Il sorgente si legge da Node e non con `fetch` dentro la pagina: la
// suite apre il gioco da `file://`, dove fetch è bloccata dalle regole
// di origine del browser.
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'Filmato di Evocazione: la Catena e le fasi restano ferme finché non finisce',
    async run(t) {
        const page = t.page;

        // --- Il punto unico che tutti consultano ---------------------
        const centrale = await page.evaluate(() => ({
            haFlag: typeof FX.isCinematicPlaying === 'function',
            loLeggeIlBlocco: typeof isBlockingModalOpen === 'function',
            haAttesa: typeof afterBlockingUi === 'function'
        }));
        t.assert(centrale.haFlag, 'FX.isCinematicPlaying è il segnale che il resto del motore consulta');
        t.assert(centrale.loLeggeIlBlocco, 'isBlockingModalOpen deve esistere: è il punto unico che risponde "c\'è qualcosa a schermo?"');
        t.assert(centrale.haAttesa,
            'afterBlockingUi deve esistere: è come la Catena aspetta senza rubare il timer delle transizioni di fase');

        // --- Con la cinematica accesa, tutto risulta bloccato --------
        const conCinematica = await page.evaluate(() => {
            const vero = FX.isCinematicPlaying;
            FX.isCinematicPlaying = () => true;
            const bloccato = isBlockingModalOpen();
            FX.isCinematicPlaying = vero;
            return { bloccato: bloccato, senza: isBlockingModalOpen() };
        });
        t.assert(conCinematica.bloccato,
            'Con un filmato a schermo il gioco deve risultare bloccato');
        t.assert(!conCinematica.senza,
            'Senza filmato né modali non dev\'essere bloccato niente (altrimenti il duello non ripartirebbe mai)');

        // --- E chi aspetta, aspetta DAVVERO --------------------------
        // Si prova il meccanismo nei due sensi sulla stessa chiamata: non
        // parte finché la cinematica è accesa, e parte appena si spegne.
        // Un controllo del solo "poi parte" resterebbe verde anche se non
        // avesse mai aspettato.
        const attesa = await page.evaluate(() => new Promise((ok) => {
            const vero = FX.isCinematicPlaying;
            let cinematica = true;
            FX.isCinematicPlaying = () => cinematica;
            let partita = false;
            afterBlockingUi(() => { partita = true; }, 30);
            setTimeout(() => {
                const durante = partita;
                cinematica = false;
                setTimeout(() => {
                    FX.isCinematicPlaying = vero;
                    ok({ durante: durante, dopo: partita });
                }, 500);
            }, 600);
        }));
        t.assert(!attesa.durante,
            'Il lavoro rimandato NON deve partire mentre il filmato è ancora a schermo');
        t.assert(attesa.dopo,
            'Finito il filmato, il lavoro rimandato deve partire (altrimenti il duello resterebbe bloccato per sempre)');

        // --- La Catena passa da lì -----------------------------------
        // Analisi del sorgente e non del comportamento: far risolvere una
        // Chain vera sotto un finto filmato richiederebbe di tenere
        // bloccato il motore per l'intera durata del test, e a quel punto
        // si misurerebbe il finto più del vero.
        const sorgente = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'engine', 'duel-engine.js'), 'utf8');
        t.assert(/attendiUiBloccante\(/.test(sorgente),
            'La risoluzione della Catena deve passare dall\'attesa condivisa, non da un setTimeout diretto');
        const avanzamentiDiretti = (sorgente.match(/setTimeout\(\(\) => \{\s*if \(typeof renderChainStack/g) || []).length;
        t.assert(avanzamentiDiretti === 0,
            `La Catena non deve avere avanzamenti a tempo fisso rimasti indietro (${avanzamentiDiretti})`);
    }
};
