/**
 * pack-opening.js — la cerimonia di apertura di una bustina, e i festeggiamenti
 * per un acquisto singolo.
 * =====================================================================
 * Prima comprare qualcosa era un click e un cambio di numero: la bustina
 * mostrava subito una griglia di carte già scoperte, e una carta o un
 * mazzo comprati non mostravano niente del tutto. Il momento in cui si
 * scopre cosa c'era dentro è il motivo per cui si compra una bustina —
 * saltarlo è come scartare un regalo dentro una busta trasparente.
 *
 * COSA SUCCEDE, nell'ordine:
 *   1. la bustina entra al centro, sospesa, e pulsa in attesa di essere
 *      aperta. Si apre al tocco (o da sola dopo 2,5s, perché aspettare un
 *      gesto che potrebbe non arrivare mai non è un'esperienza);
 *   2. si strappa: due metà che si separano, un lampo, una pioggia di
 *      scintille;
 *   3. le carte escono COPERTE e si dispongono in fila;
 *   4. si girano una alla volta, con un ritardo fra l'una e l'altra —
 *      è qui che sta l'attesa, e quindi il senso di tutto il resto;
 *   5. una carta rara si gira più lentamente e con più luce; un'ULTRA
 *      RARA ferma la fila, prende il centro dello schermo e fa esplodere
 *      lo sfondo.
 *
 * PERCHÉ UN FILE A SÉ: il Negozio (js/economy/shop-ui.js) è già lungo e
 * si occupa di cataloghi, prezzi e portafoglio; questa è tutta e sola
 * presentazione. Ed è riusabile — una futura ricompensa "bustina gratis"
 * a fine torneo può chiamare `PackOpening.apri(...)` senza passare dal
 * Negozio.
 *
 * RISPETTA `prefers-reduced-motion`: chi ha chiesto meno movimento vede
 * le stesse carte, scoperte subito, senza la sequenza.
 */
(function () {
    'use strict';

    const RITARDO_FRA_CARTE_MS = 380;
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

    /** Una carta vera con la cornice del duello, o un segnaposto se il renderer non c'è. */
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

    /**
     * Apre una bustina. `estratte` sono gli id nell'ordine in cui vanno
     * scoperti, `nuove` quelli mai posseduti prima (ricevono il bollino).
     * `onDone` viene chiamata alla chiusura — il Negozio la usa per
     * ridisegnare portafoglio e collezione.
     *
     * Le carte le ha già decise e accreditate chi chiama: qui non si
     * estrae niente e non si tocca il salvataggio. Questa funzione RACCONTA
     * un esito già avvenuto, come la cinematica di vittoria del duello —
     * se si fermasse a metà, il giocatore avrebbe comunque le sue carte.
     */
    function apri(busta, estratte, nuove, onDone) {
        const elenco = Array.isArray(estratte) ? estratte : [];
        const nuoveSet = new Set(nuove || []);

        const backdrop = el('div', 'po-backdrop');
        const scena = el('div', 'po-scena');
        backdrop.appendChild(scena);
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('po-in'));

        const chiudi = () => {
            backdrop.classList.remove('po-in');
            setTimeout(() => {
                backdrop.remove();
                if (typeof onDone === 'function') onDone();
            }, 260);
        };

        if (menoMovimento()) {
            mostraGriglia(scena, elenco, nuoveSet, chiudi, busta);
            return;
        }

        // --- 1. la bustina, in attesa ----------------------------------
        const bustina = el('div', 'po-bustina');
        bustina.appendChild(el('div', 'po-bustina-icona', (busta && busta.icona) || '🎴'));
        bustina.appendChild(el('div', 'po-bustina-nome', (busta && busta.nome) || 'Bustina'));
        bustina.appendChild(el('div', 'po-bustina-invito', 'Tocca per aprire'));
        scena.appendChild(bustina);

        let aperta = false;
        const apriBustina = () => {
            if (aperta) return;
            aperta = true;
            clearTimeout(timerAuto);

            // --- 2. lo strappo -----------------------------------------
            const r = bustina.getBoundingClientRect();
            bustina.classList.add('po-bustina-strappata');
            scintille(r.left + r.width / 2, r.top + r.height / 2, {
                count: 40, colors: ['#ffdf8c', '#f39c12', '#ffffff'], speed: 7, life: 900, spread: 360, gravity: 0.05, size: 4
            });
            if (window.SFX && typeof SFX.summon === 'function') SFX.summon('attack');
            if (window.NativeHaptics) NativeHaptics.success();

            const lampo = el('div', 'po-lampo');
            scena.appendChild(lampo);
            setTimeout(() => lampo.remove(), 520);

            setTimeout(() => {
                bustina.remove();
                mostraFila(scena, elenco, nuoveSet, chiudi, busta);
            }, 420);
        };

        bustina.addEventListener('click', apriBustina);
        const timerAuto = setTimeout(apriBustina, ATTESA_APERTURA_AUTOMATICA_MS);
    }

    /** Le carte escono coperte, poi si girano una alla volta. */
    function mostraFila(scena, elenco, nuoveSet, chiudi, busta) {
        const titolo = el('div', 'po-titolo', (busta && busta.nome) || 'Bustina');
        scena.appendChild(titolo);

        const fila = el('div', 'po-fila');
        scena.appendChild(fila);

        const celle = elenco.map((id, i) => {
            const cella = el('div', 'po-cella');
            const flip = el('div', 'po-flip');
            const retro = el('div', 'po-faccia po-retro');
            const fronte = el('div', 'po-faccia po-fronte');
            fronte.appendChild(nodoCarta(id, 'clamp(64px, 14vw, 104px)'));
            flip.appendChild(retro);
            flip.appendChild(fronte);
            cella.appendChild(flip);
            // Il nome e i bollini restano nascosti finché la carta non è
            // girata: leggerli prima toglierebbe alla rivelazione l'unica
            // cosa che ha da rivelare.
            const sotto = el('div', 'po-sotto');
            sotto.appendChild(el('div', 'po-nome', (cartaPerId(id) || {}).name || '???'));
            const r = rarita(id);
            if (r !== 'common' && window.CardRarity) {
                sotto.appendChild(el('span', 'po-rarita po-rarita-' + r, CardRarity.label(r)));
            }
            if (nuoveSet.has(id)) sotto.appendChild(el('span', 'po-nuova', '★ NUOVA'));
            cella.appendChild(sotto);
            cella.style.animationDelay = (i * 70) + 'ms';
            fila.appendChild(cella);
            return { cella, id, rarita: r };
        });

        const pulsante = el('button', 'po-chiudi', 'Continua ›');
        pulsante.type = 'button';
        pulsante.disabled = true;
        pulsante.onclick = chiudi;
        scena.appendChild(pulsante);

        // --- 4. si girano una alla volta -------------------------------
        let i = 0;
        const giraProssima = () => {
            if (i >= celle.length) {
                pulsante.disabled = false;
                pulsante.classList.add('po-chiudi-pronto');
                return;
            }
            const { cella, rarita: r } = celle[i];
            i++;
            cella.classList.add('po-girata', 'po-girata-' + r);
            const box = cella.getBoundingClientRect();
            if (r === 'ultra') {
                // --- 5. l'ultra rara ferma tutto -----------------------
                scena.classList.add('po-ultra-attiva');
                cella.classList.add('po-ultra');
                scintille(box.left + box.width / 2, box.top + box.height / 2, {
                    count: 70, colors: ['#ffd700', '#fff6dc', '#ffffff', '#ffb347'], speed: 9, life: 1200, spread: 360, gravity: 0.02, size: 5
                });
                if (window.NativeHaptics) NativeHaptics.success();
                setTimeout(() => { scena.classList.remove('po-ultra-attiva'); giraProssima(); }, 1500);
                return;
            }
            if (r !== 'common') {
                scintille(box.left + box.width / 2, box.top + box.height / 2, {
                    count: 24, colors: ['#8ad7ff', '#ffffff', '#c9e9ff'], speed: 4.5, life: 700, spread: 360, gravity: -0.02
                });
            }
            setTimeout(giraProssima, RITARDO_FRA_CARTE_MS);
        };
        setTimeout(giraProssima, 420);

        // Toccare lo sfondo scopre tutto subito: chi ha già capito cosa ha
        // trovato non deve restare a guardare un'animazione.
        scena.parentElement.addEventListener('click', (ev) => {
            if (ev.target !== scena.parentElement) return;
            celle.forEach(({ cella, rarita: r }) => cella.classList.add('po-girata', 'po-girata-' + r));
            i = celle.length;
            pulsante.disabled = false;
            pulsante.classList.add('po-chiudi-pronto');
        });
    }

    /** Versione senza sequenza, per chi ha chiesto meno movimento. */
    function mostraGriglia(scena, elenco, nuoveSet, chiudi, busta) {
        scena.appendChild(el('div', 'po-titolo', (busta && busta.nome) || 'Bustina'));
        const fila = el('div', 'po-fila');
        elenco.forEach((id) => {
            const cella = el('div', 'po-cella po-girata');
            const flip = el('div', 'po-flip');
            const fronte = el('div', 'po-faccia po-fronte');
            fronte.appendChild(nodoCarta(id, 'clamp(64px, 14vw, 104px)'));
            flip.appendChild(fronte);
            cella.appendChild(flip);
            const sotto = el('div', 'po-sotto');
            sotto.appendChild(el('div', 'po-nome', (cartaPerId(id) || {}).name || '???'));
            if (nuoveSet.has(id)) sotto.appendChild(el('span', 'po-nuova', '★ NUOVA'));
            cella.appendChild(sotto);
            fila.appendChild(cella);
        });
        scena.appendChild(fila);
        const pulsante = el('button', 'po-chiudi po-chiudi-pronto', 'Continua ›');
        pulsante.type = 'button';
        pulsante.onclick = chiudi;
        scena.appendChild(pulsante);
    }

    /**
     * Acquisto di UNA carta: la carta si alza dal suo posto nel Negozio,
     * si ingrandisce al centro con la luce della propria rarità, e si
     * ripone verso la Cartoteca. Breve di proposito — si comprano più
     * carte di fila, e una cerimonia lunga diventerebbe un ostacolo.
     */
    function festeggiaCarta(cardId, origineEl, onDone) {
        if (menoMovimento()) { if (onDone) onDone(); return; }
        const carta = cartaPerId(cardId);
        if (!carta || typeof window.createCardElement !== 'function') { if (onDone) onDone(); return; }

        const r = rarita(cardId);
        const backdrop = el('div', 'po-backdrop po-backdrop-leggero');
        const nodo = window.createCardElement(carta);
        nodo.className += ' po-acquisto po-acquisto-' + r;
        nodo.style.setProperty('--card-w', 'clamp(130px, 30vw, 190px)');
        nodo.style.setProperty('--card-h', 'calc(clamp(130px, 30vw, 190px) / 0.685)');
        backdrop.appendChild(nodo);

        const etichetta = el('div', 'po-acquisto-nome', carta.name);
        backdrop.appendChild(etichetta);
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

        const via = () => {
            backdrop.classList.remove('po-in');
            setTimeout(() => { backdrop.remove(); if (onDone) onDone(); }, 260);
        };
        backdrop.addEventListener('click', via);
        setTimeout(via, r === 'ultra' ? 1900 : 1300);
    }

    /**
     * Acquisto di un MAZZO: la scatola si apre e ne esce un ventaglio di
     * carte. Non si mostrano tutte e quaranta — un mazzo è un oggetto, non
     * un elenco: se ne vedono alcune, quel tanto che basta a far capire
     * che dentro c'è roba.
     */
    function festeggiaMazzo(deck, anteprimaIds, onDone) {
        if (menoMovimento()) { if (onDone) onDone(); return; }
        const backdrop = el('div', 'po-backdrop');
        const scena = el('div', 'po-scena');

        scena.appendChild(el('div', 'po-titolo', (deck && deck.nome) || 'Nuovo mazzo'));
        const scatola = el('div', 'po-scatola');
        scatola.appendChild(el('div', 'po-scatola-coperchio'));
        scatola.appendChild(el('div', 'po-scatola-corpo', (deck && deck.icona) || '📦'));
        scena.appendChild(scatola);

        const ventaglio = el('div', 'po-ventaglio');
        (anteprimaIds || []).slice(0, 5).forEach((id, i) => {
            const c = el('div', 'po-ventaglio-carta');
            c.style.setProperty('--i', i - 2);
            c.style.animationDelay = (250 + i * 110) + 'ms';
            c.appendChild(nodoCarta(id, 'clamp(56px, 12vw, 86px)'));
            ventaglio.appendChild(c);
        });
        scena.appendChild(ventaglio);

        const pulsante = el('button', 'po-chiudi po-chiudi-pronto', 'Continua ›');
        pulsante.type = 'button';
        scena.appendChild(pulsante);
        backdrop.appendChild(scena);
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('po-in'));

        setTimeout(() => {
            scatola.classList.add('po-scatola-aperta');
            const b = scatola.getBoundingClientRect();
            scintille(b.left + b.width / 2, b.top, {
                count: 48, colors: ['#ffdf8c', '#f39c12', '#ffffff'], speed: 6, life: 1000, spread: 160, baseAngle: -90, gravity: 0.04
            });
            if (window.NativeHaptics) NativeHaptics.success();
        }, 220);

        const via = () => {
            backdrop.classList.remove('po-in');
            setTimeout(() => { backdrop.remove(); if (onDone) onDone(); }, 260);
        };
        pulsante.onclick = via;
    }

    window.PackOpening = {
        apri: apri,
        festeggiaCarta: festeggiaCarta,
        festeggiaMazzo: festeggiaMazzo
    };
})();
