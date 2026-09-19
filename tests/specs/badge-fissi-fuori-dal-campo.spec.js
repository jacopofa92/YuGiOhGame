// I badge `position: fixed` non devono stare dentro .game-container.
// =====================================================================
// È un errore strutturale che in questo progetto si è ripresentato TRE
// volte, ogni volta scoperto solo perché un utente notava qualcosa che
// "saltava": #playerInfo (intro camera-3D), #botInfo (scuotimento del
// cambio turno) e infine le tre pillole dell'angolo in alto a destra
// (Tempo/Turno, Abbandona, Difficoltà).
//
// Il meccanismo è sempre lo stesso: un antenato con un `transform`
// diventa il punto di riferimento dei suoi discendenti `position:
// fixed`, che smettono di essere ancorati al viewport — e
// .game-container riceve un transform in tre momenti diversi (intro
// camera-3D, annuncio "TURNO", ogni battaglia). Misurato prima del fix:
// i badge scivolavano di 28-37px a seconda dello schermo.
//
// Questo spec lo rende impossibile da reintrodurre in silenzio: un
// elemento fisso rimesso lì dentro fa fallire il test subito, senza
// aspettare che qualcuno se ne accorga giocando.
module.exports = {
    name: 'I badge fissi (Tempo/Abbandona/Difficoltà) restano ancorati allo schermo anche col campo trasformato',
    async run(t) {
        const ID_BADGE = ['duelTimerBadge', 'surrenderBtn', 'difficultyBadge'];

        // --- 1) Controllo strutturale: nessuno dentro .game-container --
        const struttura = await t.evaluate((ids) => {
            const campo = document.querySelector('.game-container');
            return ids.map((id) => {
                const el = document.getElementById(id);
                return {
                    id,
                    esiste: !!el,
                    dentroIlCampo: !!(el && campo && campo.contains(el)),
                    posizione: el ? getComputedStyle(el).position : null
                };
            });
        }, ID_BADGE);

        struttura.forEach((b) => {
            t.assert(b.esiste, `Il badge #${b.id} deve esistere nella pagina`);
            t.assert(b.posizione === 'fixed',
                `#${b.id} deve essere position:fixed (rilevato: ${b.posizione}) — se un giorno non lo fosse più, questo spec va ripensato`);
            t.assert(!b.dentroIlCampo,
                `#${b.id} è position:fixed e NON deve stare dentro .game-container: quel contenitore riceve un transform ` +
                `(intro camera-3D, annuncio TURNO, scossa di battaglia) e in quei momenti diventerebbe il suo punto di ` +
                `riferimento, sganciandolo dall'angolo dello schermo — oltre a ritagliarlo, visto che ha overflow:hidden`);
        });

        // --- 2) Prova dal vivo: col campo trasformato non si spostano --
        // Il badge Difficoltà è vuoto nel Duello Demo (`:empty` lo
        // nasconde): gli si dà un testo, altrimenti misurerebbe 0x0 e la
        // prova non direbbe nulla su di lui.
        const esito = await t.evaluate((ids) => {
            const badge = document.getElementById('difficultyBadge');
            const testoOriginale = badge ? badge.textContent : '';
            if (badge && !badge.textContent.trim()) badge.textContent = 'Prova';

            const misura = () => ids.map((id) => {
                const el = document.getElementById(id);
                const r = el.getBoundingClientRect();
                return { id, top: Math.round(r.top), destra: Math.round(window.innerWidth - r.right), largo: Math.round(r.width) };
            });

            const riposo = misura();
            const campo = document.querySelector('.game-container');
            // Lo stesso tipo di transform applicato da js/ui/fx-gsap.js
            // durante la scossa di una battaglia.
            campo.style.transform = 'translate3d(-18px, 6px, 0)';
            const durante = misura();
            campo.style.transform = '';
            if (badge) badge.textContent = testoOriginale;

            return riposo.map((r, i) => ({
                id: r.id,
                largo: r.largo,
                scostamento: Math.abs(r.top - durante[i].top) + Math.abs(r.destra - durante[i].destra)
            }));
        }, ID_BADGE);

        esito.forEach((b) => {
            t.assert(b.largo > 0, `Preparazione: #${b.id} deve avere una dimensione reale da misurare (rilevata ${b.largo}px)`);
            t.assert(b.scostamento === 0,
                `#${b.id} non deve muoversi di un pixel mentre .game-container è trasformato (scostamento rilevato: ${b.scostamento}px)`);
        });
    }
};
