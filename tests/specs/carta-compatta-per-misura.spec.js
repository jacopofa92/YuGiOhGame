// La carta "compatta" (senza barra del nome, stelle e riga Razza/Tipo, con
// la cornice sottile) la decide la MISURA della carta, non il dispositivo:
// vedi "CARTA COMPATTA" in fondo a js/ui/card.css. Prima la decideva la
// larghezza della finestra (<= 900px) più un elenco a mano dei posti con
// carte piccole in duelMonstersCore.html, quindi una carta grande su
// telefono restava compatta e un posto nuovo andava aggiunto all'elenco.
//
// Qui si costruisce la STESSA carta a misure diverse, in un contenitore
// qualunque (nessuna classe del duello), e si guarda cosa mostra.
module.exports = {
    name: 'Carta compatta: la decide la misura della carta, non la finestra',
    async run(t) {
        const esito = await t.evaluate(() => {
            const prova = document.createElement('div');
            prova.style.cssText = 'position:fixed;left:0;top:0;display:flex;gap:8px;z-index:99999';
            document.body.appendChild(prova);
            const carta = cardDatabase.find((c) => c.type === 'monster' && c.level >= 4);
            const misura = (larghezza, coperta) => {
                const el = createCardElement({ ...carta, uid: 'prova-' + larghezza + (coperta ? 'c' : '') }, !!coperta);
                el.style.setProperty('--card-w', larghezza + 'px');
                el.style.setProperty('--card-h', `calc(${larghezza}px / var(--card-ratio))`);
                prova.appendChild(el);
                const vis = (sel) => { const x = el.querySelector(sel); return !!x && getComputedStyle(x).display !== 'none'; };
                const corpo = getComputedStyle(el, '::before');
                return {
                    larghezza: Math.round(el.getBoundingClientRect().width),
                    altezza: Math.round(el.getBoundingClientRect().height),
                    nome: vis('.card-frame-top'), stelle: vis('.card-frame-stars'), riga: vis('.card-frame-typeline'),
                    statistiche: vis('.card-stats'), raggio: corpo.borderTopLeftRadius,
                    sfondo: corpo.backgroundImage !== 'none',
                };
            };
            const r = { piccola: misura(58), soglia: misura(72), sopra: misura(74), grande: misura(160), dorsoPiccolo: misura(58, true) };
            prova.remove();
            return r;
        });

        t.assert(!esito.piccola.nome && !esito.piccola.stelle && !esito.piccola.riga,
            'una carta da 58px è compatta (niente nome/stelle/riga): ' + JSON.stringify(esito.piccola));
        t.assert(esito.piccola.statistiche, 'la carta compatta tiene ATK/DEF');
        t.assert(esito.piccola.raggio === '1px', 'angolo 1px sulla carta compatta, trovato ' + esito.piccola.raggio);
        t.assert(!esito.soglia.nome, 'a 72px (la soglia) la carta è ancora compatta');
        t.assert(esito.sopra.nome && esito.sopra.riga, 'a 74px torna la cornice completa (miniature del Negozio)');
        t.assert(esito.grande.nome && esito.grande.stelle && esito.grande.riga,
            'una carta grande ha la cornice completa: ' + JSON.stringify(esito.grande));
        t.assert(esito.grande.raggio !== '1px', 'la carta classica non ha l\'angolo della compatta');
        t.assert(esito.piccola.sfondo && esito.grande.sfondo, 'il corpo colorato della carta (::before) si vede a ogni misura');
        t.assert(esito.dorsoPiccolo.raggio !== '1px', 'il dorso resta uguale a ogni misura, anche piccolo');
        t.assert(Math.abs(esito.grande.altezza - Math.round(160 / 0.685)) <= 1, 'proporzioni della carta da --card-ratio: altezza ' + esito.grande.altezza);
    }
};
