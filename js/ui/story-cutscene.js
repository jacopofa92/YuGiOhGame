/**
 * story-cutscene.js — Intermezzi narrativi a dialoghi.
 * =====================================================================
 * Un momento di racconto fra una fase e l'altra di un torneo: il
 * dirigibile che decolla, la Torre Kaiba che si apre, il portone del
 * Castello di Pegasus. Impianto da visual novel — fondo scurito, ritratto
 * di chi parla, riquadro del dialogo in basso — perché è il linguaggio
 * che chi conosce la serie riconosce al primo sguardo.
 *
 * USO:
 *
 *     StoryCutscene.play([
 *         { chi: 'kaiba', testo: 'Il torneo entra nel vivo.' },
 *         { testo: 'Il dirigibile si stacca dal suolo.' }   // narratore
 *     ], {
 *         titolo: 'Il Dirigibile',
 *         sottotitolo: 'Quarti di finale'
 *     }).then(() => { ...prosegui... });
 *
 * `chi` è un id di js/data/characters-db.js (per nome e ritratto);
 * ometterlo significa "voce narrante", che viene resa come didascalia in
 * corsivo senza ritratto. Torna sempre una Promise che si risolve quando
 * l'ultima battuta è stata letta, saltata, o subito se non c'è nulla da
 * mostrare: chi chiama può incatenarci il resto del flusso senza
 * controllare nulla.
 *
 * SI PUÒ SEMPRE SALTARE, e non per pigrizia di chi legge: un torneo si
 * rigioca molte volte (il Regno dei Duellanti tiene perfino il conto dei
 * tentativi), e alla quinta partita gli stessi dialoghi diventerebbero un
 * ostacolo. Il pulsante "Salta" chiude l'intera scena, non solo la
 * battuta corrente.
 *
 * PERCHÉ NON GSAP: questa non è la pagina del duello, e il resto delle
 * pagine-menu non carica la libreria. Le poche animazioni che servono
 * (comparsa, dissolvenza, testo che si scrive) sono transizioni CSS e un
 * timer, che qui bastano — non c'è alcuna sequenza da orchestrare che lo
 * giustifichi.
 */
(function () {
    'use strict';

    /**
     * Millisecondi fra un carattere e il successivo. 18 sembrava giusto
     * sulla carta, ma misurato su una battuta vera da ~200 caratteri
     * voleva dire quasi quattro secondi di attesa prima ancora di poter
     * andare avanti: troppi, per un intermezzo che sta in mezzo alla
     * voglia di duellare. A 11 una battuta lunga si scrive in poco più di
     * due secondi e si legge comunque a ritmo naturale.
     */
    const PASSO_TESTO = 11;
    /** Quanto resta a schermo il cartello con il titolo della scena, prima del primo dialogo. */
    const CARTELLO_MS = 1400;

    /**
     * Le scene in attesa. Due intermezzi possono essere chiesti quasi
     * insieme (un torneo che risolve un esito e subito cambia fase): senza
     * coda finirebbero uno SOPRA l'altro, entrambi a schermo, con due
     * pulsanti "Salta" sovrapposti — osservato in prova. Qui la seconda
     * aspetta che la prima abbia finito, invece di essere persa o
     * disegnata sopra.
     */
    let inCorso = false;
    const coda = [];

    function personaggio(id) {
        if (!id || typeof characterDatabase === 'undefined') return null;
        return characterDatabase.find((c) => c.id === id) || null;
    }

    function menoAnimazioni() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    /**
     * @param {Array} battute - [{ chi?: string, testo: string }]
     * @param {object} [opzioni] - { titolo, sottotitolo }
     * @returns {Promise<void>} risolta a scena conclusa (o saltata)
     */
    function play(battute, opzioni) {
        const righe = (battute || []).filter((b) => b && b.testo);
        if (righe.length === 0) return Promise.resolve();

        if (inCorso) {
            // Una scena alla volta: questa aspetta il suo turno.
            return new Promise((risolviInCoda) => {
                coda.push(() => play(battute, opzioni).then(risolviInCoda));
            });
        }
        inCorso = true;

        const opt = opzioni || {};
        const veloce = menoAnimazioni();

        return new Promise((risolvi) => {
            const scena = document.createElement('div');
            scena.className = 'sc-scena';

            // Cartello d'apertura (facoltativo): il titolo della scena, che
            // dà il "dove siamo" prima ancora che qualcuno parli.
            let cartello = null;
            if (opt.titolo) {
                cartello = document.createElement('div');
                cartello.className = 'sc-cartello';
                const t = document.createElement('div');
                t.className = 'sc-cartello-titolo';
                t.textContent = opt.titolo;
                const filo = document.createElement('div');
                filo.className = 'sc-cartello-filo';
                cartello.appendChild(t);
                cartello.appendChild(filo);
                if (opt.sottotitolo) {
                    const s = document.createElement('div');
                    s.className = 'sc-cartello-sotto';
                    s.textContent = opt.sottotitolo;
                    cartello.appendChild(s);
                }
                scena.appendChild(cartello);
            }

            const ritratto = document.createElement('div');
            ritratto.className = 'sc-ritratto';
            const ritrattoImg = document.createElement('img');
            // Immagine dichiaratamente decorativa: il nome di chi parla è
            // già scritto nel riquadro, e un alt non vuoto lampeggerebbe
            // come testo mentre l'immagine carica (stesso motivo per cui
            // le carte in duello hanno alt="").
            ritrattoImg.alt = '';
            ritratto.appendChild(ritrattoImg);
            scena.appendChild(ritratto);

            const box = document.createElement('div');
            box.className = 'sc-box';
            const chiEl = document.createElement('span');
            chiEl.className = 'sc-chi';
            const testoEl = document.createElement('div');
            testoEl.className = 'sc-testo';
            const avanti = document.createElement('span');
            avanti.className = 'sc-avanti';
            avanti.textContent = '▼';
            box.appendChild(chiEl);
            box.appendChild(testoEl);
            box.appendChild(avanti);
            scena.appendChild(box);

            const salta = document.createElement('button');
            salta.type = 'button';
            salta.className = 'sc-salta';
            salta.textContent = 'Salta ›';
            scena.appendChild(salta);

            document.body.appendChild(scena);
            requestAnimationFrame(() => scena.classList.add('is-visibile'));

            let indice = -1;
            let battitura = null;
            let completa = false;
            let chiusa = false;

            // La barra spaziatrice e Invio avanzano come il tocco, Esc
            // chiude: su desktop sono i gesti che vengono naturali.
            // Dichiarata qui perché sia `chiudi` sia la registrazione più
            // sotto possano riferirsi alla STESSA funzione — un listener
            // rimosso con un riferimento diverso resterebbe attaccato.
            const tasti = (e) => {
                if (chiusa) return;
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); avanza(); }
                else if (e.key === 'Escape') chiudi();
            };

            function fermaBattitura() {
                if (battitura) { clearInterval(battitura); battitura = null; }
            }

            function mostraTutto() {
                fermaBattitura();
                testoEl.textContent = righe[indice].testo;
                completa = true;
                box.classList.add('is-completa');
            }

            function prossima() {
                indice++;
                if (indice >= righe.length) { chiudi(); return; }
                const riga = righe[indice];
                const chi = personaggio(riga.chi);

                box.classList.toggle('is-narratore', !chi);
                box.classList.remove('is-completa');
                completa = false;

                if (chi) {
                    chiEl.textContent = chi.name;
                    // Il ritratto si ricarica solo se cambia davvero: fra due
                    // battute dello stesso personaggio non deve rifare
                    // l'entrata, altrimenti "sfarfalla" ad ogni riga.
                    if (ritrattoImg.getAttribute('src') !== chi.image) {
                        ritrattoImg.src = chi.image;
                        ritratto.style.transition = 'none';
                        ritratto.style.opacity = '0';
                        ritratto.style.transform = 'translateX(-50%) scale(0.94)';
                        requestAnimationFrame(() => {
                            ritratto.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                            ritratto.style.opacity = '1';
                            ritratto.style.transform = '';
                        });
                    }
                } else {
                    chiEl.textContent = '';
                    ritratto.style.opacity = '0';
                    ritrattoImg.removeAttribute('src');
                }

                if (veloce) { mostraTutto(); return; }

                // Testo che si scrive. `slice` invece di concatenare
                // carattere per carattere: se la battuta contiene accenti o
                // emoji, concatenare a mano rischia di spezzarli a metà.
                testoEl.textContent = '';
                let n = 0;
                battitura = setInterval(() => {
                    n++;
                    testoEl.textContent = riga.testo.slice(0, n);
                    if (n >= riga.testo.length) mostraTutto();
                }, PASSO_TESTO);
            }

            function avanza() {
                // Primo tocco su una battuta ancora in scrittura: la
                // completa invece di saltarla. È la convenzione di ogni
                // gioco con i dialoghi, e evita di perdere una riga per un
                // tocco di troppo.
                if (!completa) { mostraTutto(); return; }
                prossima();
            }

            function chiudi() {
                if (chiusa) return;
                chiusa = true;
                fermaBattitura();
                // I listener globali non devono sopravvivere alla scena:
                // restare in ascolto della tastiera dopo che l'intermezzo
                // è finito vorrebbe dire intercettare la barra spaziatrice
                // per il resto della sessione.
                document.removeEventListener('keydown', tasti);
                scena.classList.remove('is-visibile');
                const via = () => {
                    scena.remove();
                    inCorso = false;
                    risolvi();
                    // Chi era in attesa parte solo ORA, a scena rimossa.
                    const successiva = coda.shift();
                    if (successiva) successiva();
                };
                if (veloce) via();
                else setTimeout(via, 450);
            }

            scena.addEventListener('click', (e) => {
                if (e.target === salta) return;
                avanza();
            });
            salta.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.NativeHaptics) NativeHaptics.light();
                chiudi();
            });
            document.addEventListener('keydown', tasti);

            // Il cartello resta un istante da solo, poi lascia il posto al
            // primo dialogo. Senza titolo si parte subito.
            const avvio = () => {
                if (cartello) {
                    cartello.style.transition = 'opacity 0.4s ease';
                    cartello.style.opacity = '0';
                    setTimeout(() => cartello.remove(), 420);
                }
                box.style.transition = 'opacity 0.35s ease';
                box.style.opacity = '1';
                prossima();
            };

            if (cartello) {
                // Il filo dorato si apre sotto al titolo: un solo dettaglio
                // animato, che dà l'idea del sipario che si alza.
                const filo = cartello.querySelector('.sc-cartello-filo');
                requestAnimationFrame(() => {
                    filo.style.transition = 'transform 0.9s ease';
                    filo.style.transform = 'scaleX(1)';
                });
                setTimeout(avvio, veloce ? 300 : CARTELLO_MS);
            } else {
                requestAnimationFrame(avvio);
            }
        });
    }

    window.StoryCutscene = { play: play };
})();
