/**
 * pack-opening.js — la cerimonia di apertura di una bustina, e i
 * festeggiamenti per un acquisto.
 * =====================================================================
 * Prima comprare qualcosa era un click e un numero che cambiava. Il
 * momento in cui si scopre cosa c'era dentro è il motivo per cui si
 * compra una bustina: saltarlo è come scartare un regalo dentro una
 * busta trasparente.
 *
 * UNA CARTA ALLA VOLTA, e non tutte insieme. Il primo tentativo metteva
 * le dieci carte in una griglia che si girava a cascata: erano troppe per
 * stare in schermo, la griglia andava a capo, la scena diventava più alta
 * della finestra e compariva uno scorrimento in mezzo a un'animazione —
 * con le ultime carte che finivano sotto il pulsante. Il difetto non era
 * la misura di un margine: era la pretesa di mostrare dieci carte grandi
 * insieme.
 *
 * Adesso la scena ha tre fasce di altezza FISSA e non scorre mai:
 *
 *   ┌──────────────────────────────┐
 *   │  titolo + contatore  3 / 10  │  ← alta quanto il testo
 *   ├──────────────────────────────┤
 *   │                              │
 *   │      la carta in mostra      │  ← si prende quello che resta,
 *   │   (e dietro, il mazzetto     │    e la carta è misurata in vh:
 *   │    di quelle non ancora      │    non può sbordare per costruzione
 *   │    scoperte)                 │
 *   ├──────────────────────────────┤
 *   │  ▪ ▪ ▪ ▫ ▫ ▫ ▫ ▫ ▫ ▫         │  ← le carte già scoperte
 *   ├──────────────────────────────┤
 *   │         Continua ›           │
 *   └──────────────────────────────┘
 *
 * LA SEQUENZA: la bustina entra sospesa e si apre al tocco (o da sola
 * dopo 2,5s — aspettare un gesto che potrebbe non arrivare mai non è
 * un'esperienza); si strappa con un lampo; resta un mazzetto coperto da
 * cui le carte si alzano UNA ALLA VOLTA, si girano grandi al centro, e
 * scendono nella striscia in basso. Una rara arriva con più luce;
 * un'ULTRA RARA fa esplodere lo sfondo e resta in mostra più a lungo.
 * Toccando lo sfondo si salta alla fine: chi ha già capito cosa ha
 * trovato non deve restare a guardare.
 *
 * COSA NON FA: non decide niente. Le carte le ha già estratte e
 * accreditate chi chiama — questa funzione RACCONTA un esito già
 * avvenuto, come la cinematica di vittoria del duello. Se si fermasse a
 * metà, il giocatore avrebbe comunque le sue carte.
 *
 * È un file a sé e non dentro shop-ui.js (che si occupa di cataloghi,
 * prezzi e portafoglio) perché è tutta e sola presentazione, ed è
 * riusabile: una futura "bustina gratis" a fine torneo può chiamare
 * `PackOpening.apri(...)` senza passare dal Negozio.
 *
 * RISPETTA `prefers-reduced-motion`: chi ha chiesto meno movimento vede
 * le stesse carte, tutte scoperte subito, senza sequenza.
 */
(function () {
    'use strict';

    /** Quanto resta in mostra una carta prima di scendere nella striscia. */
    const MOSTRA_MS = { common: 620, rare: 900, ultra: 1900 };
    const ATTESA_APERTURA_AUTOMATICA_MS = 2500;

    function menoMovimento() {
        try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    }

    function el(tag, className, testo) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (testo != null) e.textContent = testo;
        return e;
    }

    function cartaPerId(cardId) {
        const lista = (typeof cardDatabase !== 'undefined' && cardDatabase) || [];
        return lista.find((c) => c.id === cardId) || null;
    }

    /**
     * Una carta vera con la cornice del duello. La larghezza arriva da
     * fuori come stringa CSS: chi la usa sa in quale fascia della scena
     * sta, e solo lui può misurarla in modo che non sbordi.
     */
    function nodoCarta(cardId, larghezza) {
        const carta = cartaPerId(cardId);
        if (!carta || typeof window.createCardElement !== 'function') return el('div', 'po-carta-mancante', '?');
        const nodo = window.createCardElement(carta);
        nodo.style.setProperty('--card-w', larghezza);
        nodo.style.setProperty('--card-h', `calc(${larghezza} / 0.685)`);
        return nodo;
    }

    function rarita(cardId) {
        return (window.CardRarity && typeof CardRarity.of === 'function') ? CardRarity.of(cardId) : 'common';
    }

    function scintille(x, y, opzioni) {
        if (window.FX && typeof FX.spawnParticles === 'function') FX.spawnParticles(x, y, opzioni);
    }

    function centroDi(nodo) {
        const r = nodo.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r };
    }

    // ==================================================================
    // Apertura bustina
    // ==================================================================
    function apri(busta, estratte, nuove, onDone) {
        const elenco = Array.isArray(estratte) ? estratte.slice() : [];
        const nuoveSet = new Set(nuove || []);

        const backdrop = el('div', 'po-backdrop');
        const scena = el('div', 'po-scena');
        backdrop.appendChild(scena);
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('po-in'));

        let chiuso = false;
        const chiudi = () => {
            if (chiuso) return;
            chiuso = true;
            backdrop.classList.remove('po-in');
            setTimeout(() => {
                backdrop.remove();
                if (typeof onDone === 'function') onDone();
            }, 260);
        };

        if (menoMovimento()) {
            scenaSenzaMovimento(scena, elenco, nuoveSet, chiudi, busta);
            return;
        }

        const bustina = el('div', 'po-bustina');
        bustina.appendChild(el('div', 'po-bustina-luccichio'));
        bustina.appendChild(el('div', 'po-bustina-icona', (busta && busta.icona) || '🎴'));
        bustina.appendChild(el('div', 'po-bustina-nome', (busta && busta.nome) || 'Bustina'));
        bustina.appendChild(el('div', 'po-bustina-invito', 'Tocca per aprire'));
        scena.appendChild(bustina);

        let aperta = false;
        const apriBustina = () => {
            if (aperta) return;
            aperta = true;
            clearTimeout(timerAuto);

            const c = centroDi(bustina);
            bustina.classList.add('po-bustina-strappata');
            scintille(c.x, c.y, {
                count: 46, colors: ['#ffdf8c', '#f39c12', '#ffffff'], speed: 8, life: 950, spread: 360, gravity: 0.04, size: 4
            });
            if (window.SFX && typeof SFX.summon === 'function') SFX.summon('attack');
            if (window.NativeHaptics) NativeHaptics.success();

            const lampo = el('div', 'po-lampo');
            backdrop.appendChild(lampo);
            setTimeout(() => lampo.remove(), 560);

            setTimeout(() => {
                bustina.remove();
                sequenza(backdrop, scena, elenco, nuoveSet, chiudi, busta);
            }, 430);
        };

        bustina.addEventListener('click', apriBustina);
        const timerAuto = setTimeout(apriBustina, ATTESA_APERTURA_AUTOMATICA_MS);
    }

    /**
     * Il cuore: mazzetto coperto, una carta alla volta in mostra, e la
     * striscia che si riempie. Le tre fasce hanno altezze indipendenti e
     * NESSUNA di loro scorre — è così che la scena sta sempre in schermo,
     * su qualunque formato, senza doverla misurare caso per caso.
     */
    function sequenza(backdrop, scena, elenco, nuoveSet, chiudi, busta) {
        const testa = el('div', 'po-testa');
        testa.appendChild(el('div', 'po-titolo', (busta && busta.nome) || 'Bustina'));
        const contatore = el('div', 'po-contatore', `0 / ${elenco.length}`);
        testa.appendChild(contatore);
        scena.appendChild(testa);

        const palco = el('div', 'po-palco');
        scena.appendChild(palco);

        // Il mazzetto di quelle ancora da scoprire: qualche retro
        // sovrapposto, non uno per carta — dieci nodi sovrapposti costano
        // e non si distinguono comunque.
        const mazzetto = el('div', 'po-mazzetto');
        for (let i = 0; i < Math.min(4, elenco.length); i++) {
            const retro = el('div', 'po-retro po-mazzetto-carta');
            retro.style.setProperty('--i', i);
            mazzetto.appendChild(retro);
        }
        palco.appendChild(mazzetto);

        const striscia = el('div', 'po-striscia');
        scena.appendChild(striscia);

        const pulsante = el('button', 'po-chiudi', 'Continua ›');
        pulsante.type = 'button';
        pulsante.onclick = chiudi;
        scena.appendChild(pulsante);

        let i = 0;
        let saltato = false;
        let timer = null;

        /** Aggiunge una miniatura alla striscia delle carte già viste. */
        function aggiungiAllaStriscia(id) {
            const r = rarita(id);
            const slot = el('div', 'po-slot po-slot-' + r);
            slot.appendChild(nodoCarta(id, 'clamp(24px, min(6.5vw, 8vh), 44px)'));
            if (nuoveSet.has(id)) slot.appendChild(el('span', 'po-slot-nuova', '★'));
            slot.title = ((cartaPerId(id) || {}).name || '') + (nuoveSet.has(id) ? ' — nuova' : '');
            slot.onclick = () => { if (window.CardDetail) CardDetail.open(cartaPerId(id)); };
            striscia.appendChild(slot);
        }

        function finisci() {
            saltato = true;
            clearTimeout(timer);
            palco.querySelectorAll('.po-mostra').forEach((n) => n.remove());
            mazzetto.style.display = 'none';
            while (striscia.children.length < elenco.length) {
                aggiungiAllaStriscia(elenco[striscia.children.length]);
            }
            contatore.textContent = `${elenco.length} / ${elenco.length}`;
            const conUltra = elenco.some((id) => rarita(id) === 'ultra');
            const quanteNuove = elenco.filter((id) => nuoveSet.has(id)).length;
            palco.appendChild(el('div', 'po-riepilogo',
                (conUltra ? '✨ Hai trovato un\'ULTRA RARA! ' : '')
                + (quanteNuove > 0 ? `${quanteNuove} mai avute prima su ${elenco.length}.` : 'Nessuna nuova questa volta.')));
            pulsante.classList.add('po-chiudi-pronto');
        }

        function prossima() {
            if (saltato) return;
            if (i >= elenco.length) { finisci(); return; }
            const id = elenco[i];
            const r = rarita(id);
            i++;
            contatore.textContent = `${i} / ${elenco.length}`;
            if (i >= elenco.length - 3) {
                const ultimo = mazzetto.lastElementChild;
                if (ultimo) ultimo.remove();
            }

            const mostra = el('div', 'po-mostra po-mostra-' + r);
            // Misurata in vh oltre che in vw: la fascia centrale è ciò che
            // AVANZA fra testa, striscia e pulsante, quindi una carta
            // misurata sulla sola larghezza sborderebbe su uno schermo
            // basso — è esattamente com'era nata la versione con lo
            // scorrimento.
            mostra.appendChild(nodoCarta(id, 'clamp(92px, min(28vw, 26vh), 180px)'));
            const targhetta = el('div', 'po-targhetta');
            targhetta.appendChild(el('div', 'po-nome', (cartaPerId(id) || {}).name || '???'));
            if (r !== 'common' && window.CardRarity) {
                targhetta.appendChild(el('span', 'po-rarita po-rarita-' + r, CardRarity.label(r)));
            }
            if (nuoveSet.has(id)) targhetta.appendChild(el('span', 'po-nuova', '★ NUOVA'));
            mostra.appendChild(targhetta);
            palco.appendChild(mostra);

            requestAnimationFrame(() => {
                const c = centroDi(mostra);
                if (r === 'ultra') {
                    backdrop.classList.add('po-ultra-attiva');
                    scintille(c.x, c.y, {
                        count: 80, colors: ['#ffd700', '#fff6dc', '#ffffff', '#ffb347'],
                        speed: 10, life: 1300, spread: 360, gravity: 0.02, size: 5
                    });
                    if (window.NativeHaptics) NativeHaptics.success();
                } else if (r === 'rare') {
                    scintille(c.x, c.y, {
                        count: 28, colors: ['#8ad7ff', '#ffffff', '#c9e9ff'], speed: 5, life: 750, spread: 360, gravity: -0.02
                    });
                }
            });

            timer = setTimeout(() => {
                if (saltato) return;
                backdrop.classList.remove('po-ultra-attiva');
                // La carta scende nella striscia: si toglie il nodo grande
                // e si aggiunge la miniatura, che entra con un suo piccolo
                // ingresso — il passaggio si legge come "riposta via"
                // senza dover animare un volo vero fra due contenitori che
                // si ridimensionano.
                mostra.classList.add('po-mostra-via');
                setTimeout(() => mostra.remove(), 260);
                aggiungiAllaStriscia(id);
                prossima();
            }, MOSTRA_MS[r] || MOSTRA_MS.common);
        }

        // Toccare lo sfondo (non la striscia, non il pulsante) salta alla
        // fine.
        backdrop.addEventListener('click', (ev) => {
            if (ev.target !== backdrop && ev.target !== palco && ev.target !== scena) return;
            if (!saltato) finisci();
        });

        setTimeout(prossima, 420);
    }

    /** Tutte scoperte e ferme, per chi ha chiesto meno movimento. */
    function scenaSenzaMovimento(scena, elenco, nuoveSet, chiudi, busta) {
        scena.appendChild(el('div', 'po-titolo', (busta && busta.nome) || 'Bustina'));
        const striscia = el('div', 'po-striscia po-striscia-larga');
        elenco.forEach((id) => {
            const slot = el('div', 'po-slot po-slot-' + rarita(id));
            slot.appendChild(nodoCarta(id, 'clamp(40px, 9vw, 64px)'));
            if (nuoveSet.has(id)) slot.appendChild(el('span', 'po-slot-nuova', '★'));
            striscia.appendChild(slot);
        });
        scena.appendChild(striscia);
        const pulsante = el('button', 'po-chiudi po-chiudi-pronto', 'Continua ›');
        pulsante.type = 'button';
        pulsante.onclick = chiudi;
        scena.appendChild(pulsante);
    }

    // ==================================================================
    // Acquisto di UNA carta
    // ==================================================================
    /**
     * La carta si alza, si ingrandisce con la luce della propria rarità e
     * si ripone. Breve di proposito: se ne comprano più di fila, e una
     * cerimonia lunga diventerebbe un ostacolo invece di un premio.
     */
    function festeggiaCarta(cardId, origineEl, onDone) {
        if (menoMovimento()) { if (onDone) onDone(); return; }
        const carta = cartaPerId(cardId);
        if (!carta || typeof window.createCardElement !== 'function') { if (onDone) onDone(); return; }

        const r = rarita(cardId);
        const backdrop = el('div', 'po-backdrop po-backdrop-leggero');
        const gruppo = el('div', 'po-acquisto-gruppo');
        const nodo = nodoCarta(cardId, 'clamp(120px, min(30vw, 38vh), 190px)');
        nodo.classList.add('po-acquisto', 'po-acquisto-' + r);
        gruppo.appendChild(nodo);
        gruppo.appendChild(el('div', 'po-acquisto-nome', carta.name));
        backdrop.appendChild(gruppo);
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('po-in'));

        const box = origineEl && origineEl.getBoundingClientRect();
        if (box) {
            scintille(box.left + box.width / 2, box.top + box.height / 2, {
                count: r === 'ultra' ? 46 : 22,
                colors: r === 'ultra' ? ['#ffd700', '#fff6dc', '#ffffff'] : ['#8ad7ff', '#ffffff', '#c9e9ff'],
                speed: 5, life: 800, spread: 360, gravity: -0.03
            });
        }
        if (window.NativeHaptics) NativeHaptics.success();

        let via = false;
        const chiudi = () => {
            if (via) return;
            via = true;
            backdrop.classList.remove('po-in');
            setTimeout(() => { backdrop.remove(); if (onDone) onDone(); }, 260);
        };
        backdrop.addEventListener('click', chiudi);
        setTimeout(chiudi, r === 'ultra' ? 1900 : 1300);
    }

    // ==================================================================
    // Acquisto di un MAZZO
    // ==================================================================
    /**
     * La scatola VERA del mazzo (js/ui/deck-box.js, la stessa in 3D che si
     * vede in Creazione Deck, nel Negozio e nel Profilo) si apre, e ne
     * esce un ventaglio di carte.
     *
     * Si riusa quel componente invece di disegnare una scatola qui: era
     * la parte che stonava di più — un rettangolo con un'emoji sopra
     * accanto alle scatole vere della stessa pagina. E così un mazzo ha
     * lo stesso colore e lo stesso aspetto ovunque compaia, senza che
     * nessuno debba tenere allineate due versioni.
     *
     * Non si mostrano quaranta carte: un mazzo è un oggetto, non un
     * elenco — e l'elenco completo ha già il suo pulsante "Vedi le carte"
     * nel Negozio.
     */
    function festeggiaMazzo(deck, anteprimaIds, onDone) {
        const backdrop = el('div', 'po-backdrop');
        const scena = el('div', 'po-scena po-scena-mazzo');

        scena.appendChild(el('div', 'po-titolo', (deck && deck.nome) || 'Nuovo mazzo'));
        scena.appendChild(el('div', 'po-sottotitolo', 'Le sue carte sono entrate nella tua collezione.'));

        const palco = el('div', 'po-palco po-palco-mazzo');

        // Il ventaglio sta DIETRO la scatola nel DOM ma sopra nello
        // z-index: le carte devono sembrare uscire da dentro.
        const ventaglio = el('div', 'po-ventaglio');
        const ids = (anteprimaIds || []).slice(0, 5);
        ids.forEach((id, k) => {
            const c = el('div', 'po-ventaglio-carta');
            // Posizione nel ventaglio calcolata attorno al centro: con un
            // numero dispari la carta di mezzo resta dritta, con uno pari
            // il ventaglio resta comunque simmetrico.
            c.style.setProperty('--i', k - (ids.length - 1) / 2);
            c.style.animationDelay = (420 + k * 90) + 'ms';
            c.appendChild(nodoCarta(id, 'clamp(52px, min(13vw, 16vh), 88px)'));
            ventaglio.appendChild(c);
        });
        palco.appendChild(ventaglio);

        const scatola = el('div', 'po-scatola');
        if (window.DeckBox && typeof DeckBox.markup === 'function') {
            scatola.innerHTML = DeckBox.markup({
                name: (deck && deck.nome) || 'Mazzo',
                color: (deck && deck.colore) || DeckBox.colorForId((deck && deck.packId) || 'mazzo'),
                coverSrc: (deck && deck.copertina) || null
            });
        } else {
            // La scatola vera non c'è (pagina che non carica deck-box.js):
            // meglio niente scatola che un rettangolo diverso da tutte
            // quelle della stessa pagina.
            scatola.appendChild(el('div', 'po-scatola-icona', (deck && deck.icona) || '📦'));
        }
        palco.appendChild(scatola);
        scena.appendChild(palco);

        const pulsante = el('button', 'po-chiudi po-chiudi-pronto', 'Continua ›');
        pulsante.type = 'button';
        scena.appendChild(pulsante);
        backdrop.appendChild(scena);
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('po-in'));

        if (!menoMovimento()) {
            setTimeout(() => {
                scatola.classList.add('po-scatola-aperta');
                const b = scatola.getBoundingClientRect();
                scintille(b.left + b.width / 2, b.top + b.height * 0.2, {
                    count: 52, colors: ['#ffdf8c', '#f39c12', '#ffffff'], speed: 7, life: 1100, spread: 150, baseAngle: -90, gravity: 0.03
                });
                if (window.NativeHaptics) NativeHaptics.success();
            }, 300);
        } else {
            scatola.classList.add('po-scatola-aperta');
        }

        let via = false;
        pulsante.onclick = () => {
            if (via) return;
            via = true;
            backdrop.classList.remove('po-in');
            setTimeout(() => { backdrop.remove(); if (onDone) onDone(); }, 260);
        };
    }

    window.PackOpening = {
        apri: apri,
        festeggiaCarta: festeggiaCarta,
        festeggiaMazzo: festeggiaMazzo
    };
})();
