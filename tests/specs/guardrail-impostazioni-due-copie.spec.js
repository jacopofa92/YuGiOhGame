// Le Impostazioni esistono in DUE copie, e devono offrire le stesse cose.
// =====================================================================
// La schermata vive in due posti: la vista fusa dentro index.html, che è
// quella che si apre dal menu ed è quindi l'unica che un giocatore vede,
// e la pagina autonoma impostazioni.html, ormai raggiungibile solo
// aprendola a mano. È esattamente il rischio di drift fra pagine
// duplicate già documentato in CLAUDE.md, e si è materializzato: la riga
// "Visualizzazione ologramma" era stata aggiunta solo alla pagina, quindi
// dal menu quell'impostazione non c'era — e la stessa cosa stava per
// succedere a "Campo inclinato", messa anch'essa solo nella pagina.
//
// Il difetto è silenzioso in modo particolarmente cattivo: nessun errore,
// nessuna riga rotta, semplicemente un'opzione che non si trova. Ed è
// invisibile a chi la aggiunge, perché la pagina autonoma si apre e
// funziona benissimo.
//
// Il controllo è STATICO (si leggono i due sorgenti) e volutamente
// grossolano: confronta le ETICHETTE delle righe, non la struttura. Non
// pretende che le due copie siano identiche — hanno id diversi, testi di
// contorno diversi e la vista ha una topbar sua — pretende solo che nessuna
// impostazione esista in una sola delle due.
const fs = require('fs');
const path = require('path');

/** Le etichette delle righe di impostazione presenti in un sorgente. */
function etichette(html, dentro) {
    const testo = dentro ? (html.split(dentro)[1] || '') : html;
    const trovate = [];
    const re = /class="settings-row-label"[^>]*>([^<]+)</g;
    let m;
    while ((m = re.exec(testo)) !== null) trovate.push(m[1].trim());
    return trovate;
}

module.exports = {
    name: 'Guardrail: le due copie delle Impostazioni offrono le stesse voci',
    standalone: true,
    async run({ assert }) {
        const RADICE = path.join(__dirname, '..', '..');
        const pagina = fs.readFileSync(path.join(RADICE, 'impostazioni.html'), 'utf8');
        const menu = fs.readFileSync(path.join(RADICE, 'index.html'), 'utf8');

        const nellaPagina = etichette(pagina);
        // Nel menu si guarda solo dentro la vista Impostazioni: index.html
        // contiene anche altre viste fuse, e una riga di quelle non
        // c'entra nulla con questa schermata.
        const nelMenu = etichette(menu, 'id="view-impostazioni"');

        assert(nellaPagina.length >= 5,
            `Poche voci lette da impostazioni.html (${nellaPagina.length}): il controllo non proverebbe nulla`);
        assert(nelMenu.length >= 5,
            `Poche voci lette dalla vista in index.html (${nelMenu.length}): forse il marcatore della vista è cambiato`);

        const soloNellaPagina = nellaPagina.filter((e) => nelMenu.indexOf(e) === -1);
        assert(soloNellaPagina.length === 0,
            'Impostazioni presenti nella pagina autonoma ma NON nel menu, dove il giocatore le cerca: '
            + soloNellaPagina.join(', '));

        const soloNelMenu = nelMenu.filter((e) => nellaPagina.indexOf(e) === -1);
        assert(soloNelMenu.length === 0,
            'Impostazioni presenti nel menu ma non nella pagina autonoma (la deriva nell\'altro verso): '
            + soloNelMenu.join(', '));

        // E le due scelte di resa devono esserci davvero: se un domani
        // sparissero da ENTRAMBE le copie il confronto qui sopra tornerebbe
        // comunque verde.
        ['Visualizzazione ologramma', 'Campo inclinato'].forEach((voce) => {
            assert(nelMenu.indexOf(voce) !== -1, `Manca "${voce}" dal menu Impostazioni`);
        });
    }
};
