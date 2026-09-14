/**
 * duel-setup.js — il selettore "com'è fatto questo duello": mazzo,
 * arena, colonna sonora.
 * =====================================================================
 * Gemello di js/ui/duel-setup.css (questo costruisce il markup, quello
 * lo disegna), sullo stesso modello di deck-box.js/.css.
 *
 * Nato nella Sala d'Attesa del Multiplayer e subito estratto qui perché
 * la stessa scelta serve prima di un Duello Libero, in due pagine
 * diverse (la vista dentro index.html e la pagina standalone). Senza
 * questo file sarebbero state TRE copie della stessa cosa: in questo
 * progetto una copia a mano diverge sempre — le liste di arene e musiche
 * lo avevano già fatto, con una traccia etichettata male in una sola
 * delle due.
 *
 * Cosa NON fa, di proposito: non decide nulla al posto di chi lo usa.
 * Non lancia il duello, non salva impostazioni, non conosce il
 * Multiplayer. Espone la scelta corrente e avvisa quando cambia; l'unica
 * eccezione è il mazzo, che scrive davvero SaveManager.setActiveDeckId
 * perché "mazzo scelto" in questo gioco È il mazzo corrente (lo stesso
 * campo che imposta Creazione Deck), non una preferenza a parte.
 *
 * Uso:
 *   const setup = DuelSetup.mount(elemento, {
 *       decks: true,              // mostra il selettore di mazzi
 *       arena: true,              // mostra arena e musica (default: sì)
 *       readOnly: false,          // arena/musica in sola lettura
 *       deckHref: 'creazione-deck.html',  // dove mandare chi non ha mazzi
 *       onChange(sel) { ... }     // { field, music } dopo ogni scelta
 *   });
 *   setup.getSelection();         // { field, music } ('random' se non scelto)
 *   setup.showSelection({field, music});  // evidenzia una scelta altrui
 *   setup.setReadOnly(true);
 *   setup.stopPreview();          // sempre, prima di lasciare la schermata
 */
(function () {
    'use strict';

    const ANTEPRIMA_MAX_MS = 20000;

    // Un solo elemento audio per pagina: due anteprime insieme sarebbero
    // solo rumore. Vive fuori dall'istanza perché il vincolo è dell'utente
    // (un paio di orecchie), non del componente.
    let anteprima = null;
    let anteprimaBtn = null;
    let anteprimaStop = null;

    function musicaDiPagina() { return document.getElementById('bgMusicAudio'); }

    function fermaAnteprima() {
        if (anteprimaStop) { clearTimeout(anteprimaStop); anteprimaStop = null; }
        if (anteprima) { anteprima.pause(); anteprima = null; }
        if (anteprimaBtn) {
            anteprimaBtn.textContent = '▶';
            anteprimaBtn.classList.remove('suona');
            anteprimaBtn = null;
        }
        const bg = musicaDiPagina();
        // Se la musica della pagina era stata messa in pausa per
        // l'assaggio, riprende. Un play() rifiutato dal browser non è un
        // errore da mostrare: la musica riprenderà al primo gesto vero.
        if (bg && bg.paused) bg.play().catch(() => {});
    }

    function alternaAnteprima(file, btn, onBloccata) {
        const eraLoStesso = anteprimaBtn === btn;
        fermaAnteprima();
        if (eraLoStesso) return;

        const bg = musicaDiPagina();
        if (bg && !bg.paused) bg.pause();

        anteprima = new Audio(window.ArenaOptions.audioFor(file));
        anteprima.volume = 0.6;
        anteprimaBtn = btn;
        btn.textContent = '⏸';
        btn.classList.add('suona');
        anteprima.play().catch(() => {
            if (onBloccata) onBloccata();
            fermaAnteprima();
        });
        anteprima.onended = fermaAnteprima;
        // Un assaggio, non l'ascolto integrale.
        anteprimaStop = setTimeout(fermaAnteprima, ANTEPRIMA_MAX_MS);
    }

    /**
     * Fa scorrere il nome sul coperchio quando non ci sta. Va richiamata
     * quando i selettori sono VISIBILI: un elemento nascosto misura zero,
     * e ogni nome risulterebbe "che ci sta" — da qui `refresh()` sul
     * controller, che le schermate chiamano al momento di mostrarsi.
     */
    function adattaNomi(radice) {
        radice.querySelectorAll('.ds-deck .dbx-name').forEach((coperchio) => {
            const testo = coperchio.querySelector('.dbx-name-text');
            if (!testo) return;
            coperchio.classList.remove('is-scorrevole');
            const eccesso = testo.scrollWidth - coperchio.clientWidth;
            if (eccesso <= 2) return;
            coperchio.classList.add('is-scorrevole');
            coperchio.style.setProperty('--ds-name-shift', eccesso + 'px');
            // Velocità costante invece di durata fissa: un nome appena più
            // lungo non deve strisciare, uno lunghissimo non deve sfrecciare.
            coperchio.style.setProperty('--ds-name-time', Math.max(5, 4 + eccesso / 12).toFixed(1) + 's');
        });
    }

    function segna(radice, selettore, valore, attributo) {
        radice.querySelectorAll(selettore).forEach((el) => {
            el.setAttribute('aria-pressed', String(el.dataset[attributo] === String(valore)));
        });
    }

    function gruppo(etichetta) {
        const box = document.createElement('div');
        box.className = 'ds-group';
        const lab = document.createElement('span');
        lab.className = 'ds-group-label';
        lab.textContent = etichetta;
        box.appendChild(lab);
        return box;
    }

    function mount(container, options) {
        const opts = options || {};
        const radice = typeof container === 'string' ? document.querySelector(container) : container;
        if (!radice) return null;

        const scelta = {
            field: (opts.initial && opts.initial.field) || window.ArenaOptions.RANDOM,
            music: (opts.initial && opts.initial.music) || window.ArenaOptions.RANDOM
        };

        radice.classList.add('ds-setup');
        // `compact`: per chi lo monta dentro una finestra che sotto ha
        // ancora dei comandi (vedi duel-setup.css).
        radice.classList.toggle('ds-setup--compact', !!opts.compact);
        radice.classList.toggle('ds-setup--readonly', !!opts.readOnly);
        radice.innerHTML = '';

        const avvisa = () => { if (opts.onChange) opts.onChange({ field: scelta.field, music: scelta.music }); };

        // --- Mazzi (facoltativo) ---------------------------------------
        if (opts.decks) {
            const g = gruppo('🃏 Il tuo mazzo');
            const strip = document.createElement('div');
            strip.className = 'ds-strip';
            const mazzi = (window.SaveManager && SaveManager.getDecks && SaveManager.getDecks()) || [];

            if (mazzi.length === 0) {
                const vuoto = document.createElement('div');
                vuoto.className = 'ds-empty';
                vuoto.innerHTML = 'Non hai ancora un mazzo tuo: si duella con un mazzo generato al momento.<br>'
                    + `<a href="${opts.deckHref || 'creazione-deck.html'}">Creane uno in Creazione Deck</a>`;
                g.appendChild(vuoto);
            } else {
                mazzi.forEach((mazzo) => {
                    const el = document.createElement('div');
                    el.className = 'ds-deck';
                    el.setAttribute('role', 'button');
                    el.setAttribute('tabindex', '0');
                    el.dataset.deckId = mazzo.id;

                    const conteggio = (mazzo.main || []).reduce((tot, v) => tot + (v.qty || 1), 0);
                    // Sotto le 40 carte il mazzo non è legale: si può
                    // comunque scegliere (il motore non lo rifiuta), ma va
                    // detto PRIMA del duello, non scoperto durante.
                    const avviso = conteggio < 40 ? ' <span class="ds-deck-warn">⚠</span>' : '';
                    el.innerHTML = (window.DeckBox ? window.DeckBox.markup({
                        name: mazzo.name,
                        color: mazzo.color || window.DeckBox.colorForId(mazzo.id)
                    }) : '')
                        + `<div class="ds-deck-meta">${conteggio} carte${avviso}</div>`;

                    const seleziona = () => {
                        if (!SaveManager.setActiveDeckId || !SaveManager.setActiveDeckId(mazzo.id)) return;
                        segna(radice, '.ds-deck', mazzo.id, 'deckId');
                        if (opts.onDeckChange) opts.onDeckChange(mazzo);
                        if (window.NativeHaptics) NativeHaptics.light();
                    };
                    el.onclick = seleziona;
                    el.onkeydown = (ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); seleziona(); }
                    };
                    strip.appendChild(el);
                });
                g.appendChild(strip);
            }
            radice.appendChild(g);
        }

        // Arena e musica si possono lasciare fuori: la Sala d'Attesa del
        // Multiplayer le tiene in un riquadro separato da quello del
        // mazzo, perché hanno un padrone diverso (il mazzo è personale,
        // l'arena la decide chi ha creato la stanza).
        if (opts.arena === false) {
            adattaNomi(radice);
            return {
                getSelection: () => ({ field: scelta.field, music: scelta.music }),
                showSelection: () => {},
                setReadOnly: (ro) => radice.classList.toggle('ds-setup--readonly', !!ro),
                refresh: () => adattaNomi(radice),
                stopPreview: fermaAnteprima,
                element: radice
            };
        }

        // --- Arene ------------------------------------------------------
        const gArene = gruppo('🏟️ Arena');
        const stripArene = document.createElement('div');
        stripArene.className = 'ds-strip';

        const casuale = document.createElement('button');
        casuale.type = 'button';
        casuale.className = 'ds-field ds-field--random';
        casuale.textContent = '🎲';
        casuale.title = 'Arena casuale';
        casuale.dataset.file = window.ArenaOptions.RANDOM;
        stripArene.appendChild(casuale);

        window.ArenaOptions.FIELDS.forEach((campo) => {
            const el = document.createElement('button');
            el.type = 'button';
            el.className = 'ds-field';
            el.dataset.file = campo.file;
            el.style.backgroundImage = `url('${window.ArenaOptions.imageFor(campo.file)}')`;
            const nome = document.createElement('span');
            nome.className = 'ds-field-name';
            nome.textContent = campo.nome;
            el.appendChild(nome);
            stripArene.appendChild(el);
        });

        stripArene.querySelectorAll('.ds-field').forEach((el) => {
            el.onclick = () => {
                scelta.field = el.dataset.file;
                segna(radice, '.ds-field', scelta.field, 'file');
                if (window.NativeHaptics) NativeHaptics.light();
                avvisa();
            };
        });
        gArene.appendChild(stripArene);
        radice.appendChild(gArene);

        // --- Colonne sonore --------------------------------------------
        const gMusica = gruppo('🎵 Musica di battaglia');
        const tracce = document.createElement('div');
        tracce.className = 'ds-tracks';

        const aggiungiTraccia = (file, nome, anteprimabile) => {
            // Riga come <div role="button"> e non <button>: dentro c'è un
            // secondo pulsante (l'anteprima), e un pulsante dentro un
            // pulsante è markup non valido — i browser lo "riparano"
            // spezzando l'annidamento, con risultati imprevedibili.
            const riga = document.createElement('div');
            riga.className = 'ds-track';
            riga.setAttribute('role', 'button');
            riga.setAttribute('tabindex', '0');
            riga.dataset.file = file;

            const etichetta = document.createElement('span');
            etichetta.className = 'ds-track-name';
            etichetta.textContent = nome;
            riga.appendChild(etichetta);

            if (anteprimabile) {
                const play = document.createElement('button');
                play.type = 'button';
                play.className = 'ds-preview';
                play.textContent = '▶';
                play.title = 'Ascolta un assaggio';
                play.onclick = (ev) => {
                    ev.stopPropagation(); // ascoltare non significa scegliere
                    alternaAnteprima(file, play, opts.onPreviewBlocked);
                };
                riga.appendChild(play);
            }

            const seleziona = () => {
                scelta.music = file;
                segna(radice, '.ds-track', scelta.music, 'file');
                if (window.NativeHaptics) NativeHaptics.light();
                avvisa();
            };
            riga.onclick = seleziona;
            riga.onkeydown = (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); seleziona(); }
            };
            tracce.appendChild(riga);
        };

        aggiungiTraccia(window.ArenaOptions.RANDOM, '🎲 Casuale', false);
        window.ArenaOptions.TRACKS.forEach((t) => aggiungiTraccia(t.file, t.nome, true));
        gMusica.appendChild(tracce);
        radice.appendChild(gMusica);

        segna(radice, '.ds-field', scelta.field, 'file');
        segna(radice, '.ds-track', scelta.music, 'file');
        if (opts.decks) {
            segna(radice, '.ds-deck', SaveManager.getActiveDeckId ? SaveManager.getActiveDeckId() : null, 'deckId');
        }
        adattaNomi(radice);

        return {
            /** La scelta corrente, ancora "casuale" se tale: risolverla spetta a chi avvia il duello. */
            getSelection: () => ({ field: scelta.field, music: scelta.music }),
            /** Evidenzia una scelta decisa da qualcun altro (in Multiplayer, quella di chi ha creato la stanza). */
            showSelection: (sel) => {
                if (!sel) return;
                if (sel.field) segna(radice, '.ds-field', sel.field, 'file');
                if (sel.music) segna(radice, '.ds-track', sel.music, 'file');
            },
            setReadOnly: (ro) => radice.classList.toggle('ds-setup--readonly', !!ro),
            /** Da chiamare quando i selettori diventano visibili: vedi adattaNomi. */
            refresh: () => adattaNomi(radice),
            stopPreview: fermaAnteprima,
            element: radice
        };
    }

    window.DuelSetup = { mount: mount, stopPreview: fermaAnteprima };
})();
