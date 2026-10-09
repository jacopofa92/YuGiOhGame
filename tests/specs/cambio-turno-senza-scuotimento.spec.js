// L'annuncio di cambio turno (flash, barre, le due parole che si scontrano)
// non scuote più lo schermo: richiesta esplicita, perché capita a ogni
// turno e uno scossone del campo ogni volta stanca. Lo scuotimento resta
// per i colpi veri (danni, distruzioni), che qui non si toccano.
//
// Si lancia l'annuncio dalla sua strada vera (l'evento 'annuncio-turno' che
// emette il cambio turno, js/engine/fasi.js) e si guarda il campo con un
// MutationObserver: basta che la classe compaia anche per un istante.
module.exports = {
    name: 'Cambio turno: l\'annuncio non scuote più lo schermo',
    async run(t) {
        const esito = await t.evaluate(() => new Promise((risolvi) => {
            const campo = document.querySelector('.game-container');
            let scosso = false;
            const osserva = new MutationObserver(() => { if (campo.classList.contains('fx-shake')) scosso = true; });
            osserva.observe(campo, { attributes: true, attributeFilter: ['class'] });
            EventiDuello.emetti('annuncio-turno', 'TURNO', 'Bot', 'Turno 2');
            setTimeout(() => {
                osserva.disconnect();
                risolvi({ scosso, annuncio: !!document.getElementById('battleStartOverlay') });
            }, 700);
        }));
        t.assert(esito.annuncio, 'l\'annuncio di cambio turno deve comparire comunque');
        t.assert(!esito.scosso, 'il cambio turno non deve scuotere lo schermo (.fx-shake sul campo)');
    }
};
