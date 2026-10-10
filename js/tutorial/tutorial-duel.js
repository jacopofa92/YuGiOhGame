/**
 * tutorial-duel.js — La lezione guidata col nonno.
 * =====================================================================
 * Un duello vero, ma preparato: mani e mazzi in ordine fisso, il nonno
 * (Solomon Muto) che spiega una cosa alla volta e mette in risalto il
 * punto dello schermo da toccare, e le altre mosse bloccate finché non si
 * fa quella giusta.
 *
 * COME UNA SANDBOX, NON COME UN PEZZO DEL MOTORE (richiesta esplicita
 * dell'utente: "non inquinare logiche di motore solide"):
 *  - questo file vive solo in duelMonstersCore.html?mode=tutorial e non fa
 *    nulla in nessun'altra modalità;
 *  - non tocca regole, fasi, carte o IA. Il duello lo gioca il motore di
 *    sempre: l'unica cosa sostituita è preparaManiIniziali() (chi comincia
 *    e le mani di partenza), lo stesso punto in cui la sandbox mette il
 *    suo stato preparato;
 *  - il turno del nonno lo gioca l'IA vera, livello Facile. Non serve
 *    scriverlo a mano: con in mano un solo mostro utile (Elfi Gemelli, 1900
 *    ATK) lo Evoca e attacca il Guerriero Celtico del giocatore, che è
 *    esattamente il momento in cui scatta la sua Trappola;
 *  - le mosse non previste dal passo in corso le ferma un ascoltatore sui
 *    click in fase di CAPTURE (gate più sotto): blocca il tocco prima che
 *    arrivi al gioco, invece di aggiungere controlli nelle funzioni di
 *    gioco. Spegnendo l'ascoltatore il duello torna quello di sempre.
 *
 * LA LEZIONE (il giocatore comincia, il nonno parte da 3000 LP):
 *   turno 1: Evocazione del Guerriero Celtico, Cilindro Magico coperto,
 *            fine turno (al primo turno non si attacca);
 *   turno 2: il nonno Evoca Elfi Gemelli e attacca; il giocatore attiva il
 *            Cilindro, che annulla l'attacco e gli infligge 1900 danni;
 *   turno 3: pescata di Raigeki (era in cima al mazzo), che distrugge i
 *            mostri del nonno; Evocazione Tributo del Teschio Evocato
 *            sacrificando il Celtico; Battle Phase e attacco diretto da
 *            2500, che chiude il duello (1100 LP rimasti al nonno).
 *
 * MAI BLOCCATI: ogni passo ha "↻ Ricomincia" (ricarica la lezione da
 * capo), e un passo che non si completa entro un tempo lungo lo offre in
 * evidenza.
 */
(function () {
    'use strict';

    const CARTE = {
        celtico: 4,      // Guerriero Celtico, Lv4 1400
        cilindro: 10,    // Cilindro Magico, Trappola
        teschio: 13,     // Teschio Evocato, Lv6 2500
        raigeki: 409,    // Raigeki, Magia
        elfi: 24,        // Elfi Gemelli, Lv4 1900 (del nonno)
        servo: 526,      // Skull Servant, 300 (riempitivo)
        robolady: 528    // Robolady, 450 (riempitivo)
    };
    const LP_NONNO = 3000;
    const PREMIO_CREDITI = 200;

    let uidContatore = 0;
    function istanzia(id) {
        const modello = typeof cardDatabase !== 'undefined' && cardDatabase.find((c) => c.id === id);
        if (!modello) return null;
        uidContatore++;
        return Object.assign({}, modello, { uid: 'tutorial-' + uidContatore + '-' + id });
    }
    function carte(ids) { return ids.map(istanzia).filter(Boolean); }

    /**
     * Prende il posto di preparaManiIniziali() (js/engine/game-flow.js)
     * solo per questa lezione. Il mazzo si pesca dalla FINE (pop), quindi
     * l'ultima carta dell'elenco è la prima pescata: Raigeki arriva al
     * turno 3 (al turno 1 non si pesca).
     */
    function preparaLezione() {
        gameState.currentPlayer = 'player';
        gameState.playerHand = carte([CARTE.celtico, CARTE.cilindro, CARTE.teschio]);
        gameState[Tavolo.chiave('player', 'Deck')] = carte([
            CARTE.servo, CARTE.robolady, CARTE.celtico, CARTE.servo, CARTE.robolady,
            CARTE.servo, CARTE.robolady, CARTE.servo, CARTE.raigeki
        ]);
        gameState.botHand = carte([CARTE.elfi, CARTE.servo, CARTE.robolady]);
        gameState[Tavolo.chiave('bot', 'Deck')] = carte([
            CARTE.servo, CARTE.robolady, CARTE.servo, CARTE.robolady,
            CARTE.servo, CARTE.robolady, CARTE.servo, CARTE.robolady
        ]);
        ['player', 'bot'].forEach((posto) => {
            gameState[Tavolo.chiave(posto, 'DeckCount')] = gameState[Tavolo.chiave(posto, 'Deck')].length;
            // L'Extra Deck del mazzo attivo non serve alla lezione, e una
            // Fusione possibile sarebbe solo una distrazione.
            gameState[Tavolo.chiave(posto, 'ExtraDeck')] = [];
        });
        gameState.botLP = LP_NONNO;
    }

    // ------------------------------------------------------------------
    // Lettura dello stato (solo lettura: il tutorial non scrive mai sulle
    // regole dopo la preparazione).
    // ------------------------------------------------------------------
    const inCampo = (posto, id) => (Tavolo.mostri(posto) || []).some((s) => s && s.card && s.card.id === id);
    const inMagieTrappole = (posto, id) => (Tavolo.magieTrappole(posto) || []).some((s) => s && s.card && s.card.id === id);
    const nelCimitero = (posto, id) => (gameState[Tavolo.chiave(posto, 'Graveyard')] || []).some((c) => c && c.id === id);
    const mostriAvversari = () => (Tavolo.mostri('bot') || []).filter(Boolean).length;
    const cartaInMano = (id) => (gameState.playerHand || []).find((c) => c && c.id === id);
    const selezionata = (id) => !!(gameState.selectedCard && gameState.selectedCard.card && gameState.selectedCard.card.id === id);
    const modaleAperto = () => !!document.querySelector('#activateModal.open');
    const popoverAperto = () => document.getElementById('quickPopover');

    function elCartaInMano(id) {
        const c = cartaInMano(id);
        return c ? document.querySelector(`#playerHand [data-uid="${c.uid}"]`) : null;
    }
    const selCartaInMano = (id) => {
        const c = cartaInMano(id);
        return c ? `#playerHand [data-uid="${c.uid}"]` : '#playerHand .__nessuna';
    };
    const SEL_MOSTRI = '#playerFieldBoard .field-slot[data-owner="player"][data-type="monster"]';
    const SEL_MT = '#playerFieldBoard .field-slot[data-owner="player"][data-type="st"]';
    const SEL_POPOVER = '#quickPopover';
    function primaCasellaLibera(tipo) {
        const campo = tipo === 'monster' ? Tavolo.mostri('player') : Tavolo.magieTrappole('player');
        const i = (campo || []).findIndex((s) => !s);
        return i < 0 ? null : document.querySelector(`#playerFieldBoard .field-slot[data-owner="player"][data-type="${tipo}"][data-index="${i}"]`);
    }
    function casellaConMostro(id) {
        const i = (Tavolo.mostri('player') || []).findIndex((s) => s && s.card && s.card.id === id);
        return i < 0 ? null : document.querySelector(`${SEL_MOSTRI}[data-index="${i}"]`);
    }

    /**
     * Bersaglio di un'Evocazione/piazzamento: prima la carta in mano, poi
     * (carta selezionata) la casella libera, e quando compare la scelta di
     * Posizione il riquadro con i pulsanti.
     */
    function bersaglioPiazzamento(id, tipo) {
        if (popoverAperto()) return popoverAperto();
        if (selezionata(id)) return primaCasellaLibera(tipo) || elCartaInMano(id);
        return elCartaInMano(id);
    }

    // ------------------------------------------------------------------
    // I passi. Ognuno: testo del nonno, cosa mettere in risalto, cosa si
    // può toccare, e quando è fatto (controllato ogni 200ms). `avanti`:
    // passo di sola spiegazione, si prosegue col pulsante; `pronto` dice
    // quando il pulsante può comparire.
    // ------------------------------------------------------------------
    const PASSI = [
        {
            testo: 'Benvenuto nella mia bottega! Prima di lasciarti andare per il mondo, facciamo un piccolo duello insieme: ti mostro come si gioca, un passo alla volta.',
            avanti: true
        },
        {
            testo: 'Questi sono i tuoi Life Point: 8000. Se arrivano a zero, perdi il duello. Per questa lezione io parto con 3000: portali a zero e hai vinto.',
            bersaglio: () => document.getElementById('playerInfo'),
            avanti: true
        },
        {
            testo: 'Questa è la tua mano. Ogni turno peschi una carta, tranne il primissimo turno di chi comincia.',
            bersaglio: () => document.getElementById('playerHand'),
            avanti: true
        },
        {
            testo: 'Il turno è diviso in fasi. Adesso sei nella Main Phase 1: è qui che si evocano i mostri e si giocano Magie e Trappole.',
            bersaglio: () => document.getElementById('phaseStepper'),
            avanti: true,
            pronto: () => gameState.phase === 'main1' && gameState.currentPlayer === 'player',
            attesa: 'Un attimo, il turno si sta preparando…'
        },
        {
            testo: 'Evochiamo il primo mostro. Tocca il Guerriero Celtico, poi una casella mostro libera, e scegli la posizione di Attacco. Puoi anche trascinarlo direttamente sulla casella.',
            bersaglio: () => bersaglioPiazzamento(CARTE.celtico, 'monster'),
            consenti: () => [selCartaInMano(CARTE.celtico), SEL_MOSTRI, SEL_POPOVER],
            fatto: () => inCampo('player', CARTE.celtico)
        },
        {
            testo: 'Bene! Ora la Trappola. Le Trappole si mettono coperte e si attivano più avanti, di solito nel turno dell\'avversario. Tocca il Cilindro Magico e poi una casella Magia/Trappola libera.',
            bersaglio: () => bersaglioPiazzamento(CARTE.cilindro, 'st'),
            consenti: () => [selCartaInMano(CARTE.cilindro), SEL_MT, SEL_POPOVER],
            fatto: () => inMagieTrappole('player', CARTE.cilindro)
        },
        {
            testo: 'Nel primo turno del duello non si può attaccare. Passa il turno: tocca "Fine".',
            bersaglio: () => document.querySelector('.phase-step[data-phase="end"]'),
            consenti: () => ['.phase-step[data-phase="end"]'],
            fatto: () => gameState.currentPlayer === 'bot'
        },
        {
            testo: 'Adesso tocca a me. Guarda cosa faccio…',
            bersaglio: () => document.getElementById('botFieldBoard'),
            consenti: () => ['#activateModal'],
            fatto: () => modaleAperto() || nelCimitero('player', CARTE.cilindro)
        },
        {
            testo: 'Il mio Elfo ti attacca! È il momento della tua Trappola: il Cilindro Magico annulla l\'attacco e mi infligge danni pari all\'ATK del mio mostro. Premi "Attiva".',
            bersaglio: () => document.getElementById('activateConfirmBtn'),
            consenti: () => ['#activateConfirmBtn'],
            fatto: () => nelCimitero('player', CARTE.cilindro) || gameState.botLP < LP_NONNO
        },
        {
            testo: 'Ahi! 1900 danni: mi restano 1100 Life Point. Un attacco fermato al momento giusto può cambiare un duello. Ora torna il tuo turno, e hai appena pescato una carta.',
            bersaglio: () => document.getElementById('botInfo'),
            avanti: true,
            pronto: () => gameState.currentPlayer === 'player' && gameState.phase === 'main1' && !!cartaInMano(CARTE.raigeki),
            attesa: 'Il mio turno sta finendo…'
        },
        {
            testo: 'Hai pescato Raigeki: una Magia che distrugge tutti i mostri del tuo avversario. Le Magie si attivano dalla mano. Toccala e attivala.',
            bersaglio: () => (modaleAperto() ? document.getElementById('activateConfirmBtn')
                : popoverAperto() || elCartaInMano(CARTE.raigeki)),
            consenti: () => [selCartaInMano(CARTE.raigeki), SEL_POPOVER, '#activateConfirmBtn'],
            fatto: () => nelCimitero('player', CARTE.raigeki) && mostriAvversari() === 0
        },
        {
            testo: 'Il mio campo è vuoto! Ora un mostro più forte: il Teschio Evocato è di Livello 6, e per evocarlo devi sacrificare (Tributo) un tuo mostro. Tocca il Teschio, poi il tuo Guerriero Celtico, poi la casella dove metterlo.',
            bersaglio: () => {
                if (modaleAperto()) return document.querySelector('#activateModal .modal-btn.attack');
                if (popoverAperto()) return popoverAperto();
                // Sacrificio fatto: il gioco chiede dove piazzare il Teschio
                // (vedi resolveTributeSummonPlacement in actions.js).
                if (gameState.pendingTributePlacement) return primaCasellaLibera('monster');
                if (selezionata(CARTE.teschio) || gameState.pendingTributeSummon) return casellaConMostro(CARTE.celtico) || primaCasellaLibera('monster');
                return elCartaInMano(CARTE.teschio);
            },
            consenti: () => [selCartaInMano(CARTE.teschio), SEL_MOSTRI, SEL_POPOVER, '#activateModal', '#cardListPickerModal'],
            fatto: () => inCampo('player', CARTE.teschio)
        },
        {
            testo: 'Eccolo! Ora si combatte: tocca "Battaglia" per entrare nella Battle Phase.',
            bersaglio: () => document.querySelector('.phase-step[data-phase="battle"]'),
            consenti: () => ['.phase-step[data-phase="battle"]'],
            fatto: () => gameState.phase === 'battle'
        },
        {
            testo: 'Io non ho mostri: puoi attaccarmi direttamente! Trascina il Teschio Evocato verso il mio lato del campo.',
            bersaglio: () => casellaConMostro(CARTE.teschio),
            consenti: () => [SEL_MOSTRI, '#botFieldBoard', '#botInfo', SEL_POPOVER],
            fatto: () => !!gameState.gameOver
        }
    ];

    // ------------------------------------------------------------------
    // Il riquadro del nonno e il riflettore.
    // ------------------------------------------------------------------
    let passo = -1;
    let attivo = false;
    let obbligatoria = false;
    let elCoach = null;
    let elSpot = null;
    let inizioPasso = 0;
    const TROPPO_TEMPO_MS = 90000;

    function costruisci() {
        elSpot = document.createElement('div');
        elSpot.className = 'tut-spot';
        elSpot.setAttribute('aria-hidden', 'true');
        document.body.appendChild(elSpot);

        elCoach = document.createElement('div');
        elCoach.className = 'tut-coach';
        elCoach.id = 'tutorialCoach';
        elCoach.setAttribute('role', 'dialog');
        elCoach.setAttribute('aria-live', 'polite');
        elCoach.innerHTML = `
            <div class="tut-ritratto"><img alt="" src="images/characters/solomonMuto.jpg"></div>
            <div class="tut-corpo">
                <div class="tut-nome">Solomon Muto <span class="tut-passo"></span></div>
                <p class="tut-testo"></p>
                <div class="tut-azioni">
                    <button type="button" class="tut-avanti">Avanti ›</button>
                    <button type="button" class="tut-ricomincia" title="Ricomincia la lezione da capo">↻ Ricomincia</button>
                </div>
            </div>`;
        document.body.appendChild(elCoach);
        const img = elCoach.querySelector('img');
        img.onerror = () => img.remove();
        elCoach.querySelector('.tut-avanti').onclick = () => {
            const p = PASSI[passo];
            if (p && p.avanti && (!p.pronto || p.pronto())) vaiA(passo + 1);
        };
        elCoach.querySelector('.tut-ricomincia').onclick = () => {
            // La lezione non è una partita da difendere: ricominciarla non
            // deve chiedere conferme del browser.
            window.onbeforeunload = null;
            if (window.DuelSession) DuelSession.finished = true;
            window.location.reload();
        };
    }

    function vaiA(i) {
        passo = i;
        inizioPasso = Date.now();
        elCoach.classList.remove('tut-coach--fermo');
        if (passo >= PASSI.length) { spegni(); return; }
        aggiornaTesto();
    }

    function aggiornaTesto() {
        const p = PASSI[passo];
        if (!p) return;
        const pronto = !p.pronto || p.pronto();
        elCoach.querySelector('.tut-testo').textContent = (!pronto && p.attesa) ? p.attesa : p.testo;
        elCoach.querySelector('.tut-passo').textContent = `· ${passo + 1}/${PASSI.length}`;
        const avanti = elCoach.querySelector('.tut-avanti');
        avanti.hidden = !(p.avanti && pronto);
    }

    function posiziona() {
        if (!attivo) return;
        const p = PASSI[passo];
        const el = p && p.bersaglio ? p.bersaglio() : null;
        const r = el && el.getBoundingClientRect();
        if (r && r.width > 0 && r.height > 0) {
            const margine = 8;
            elSpot.style.left = (r.left - margine) + 'px';
            elSpot.style.top = (r.top - margine) + 'px';
            elSpot.style.width = (r.width + margine * 2) + 'px';
            elSpot.style.height = (r.height + margine * 2) + 'px';
            elSpot.classList.add('tut-spot--su');
            // Il nonno sta dalla parte opposta di ciò che indica, così non
            // lo copre mai.
            elCoach.classList.toggle('tut-coach--alto', r.top + r.height / 2 > window.innerHeight / 2);
        } else {
            elSpot.classList.remove('tut-spot--su');
            elCoach.classList.remove('tut-coach--alto');
        }
        requestAnimationFrame(posiziona);
    }

    function controlla() {
        if (!attivo) return;
        if (typeof gameState !== 'undefined' && gameState && gameState.gameOver) { spegni(); return; }
        const p = PASSI[passo];
        if (p && p.fatto && p.fatto()) { vaiA(passo + 1); return; }
        aggiornaTesto();
        // Un passo fermo da molto: si offre il Ricomincia in evidenza.
        if (Date.now() - inizioPasso > TROPPO_TEMPO_MS) elCoach.classList.add('tut-coach--fermo');
    }

    // ------------------------------------------------------------------
    // Il cancello: un tocco fuori da ciò che il passo permette non arriva
    // al gioco. pointerdown ferma anche l'inizio di un trascinamento;
    // pointermove/pointerup restano liberi, così un trascinamento iniziato
    // su una carta permessa arriva fino in fondo.
    // ------------------------------------------------------------------
    function permesso(target) {
        if (!target || !target.closest) return true;
        if (target.closest('#tutorialCoach')) return true;
        // Leggere (e chiudere) la descrizione di una carta non è una mossa:
        // su telefono il pannello copre mezzo campo, e senza la sua ✕ si
        // resterebbe con il campo coperto.
        if (target.closest('.card-info-panel')) return true;
        // Nella lezione rifatta dal menu si può uscire: la finestra di resa
        // resta usabile.
        if (!obbligatoria && target.closest('#surrenderBtn, #surrenderModal')) return true;
        const p = PASSI[passo];
        const elenco = p && p.consenti ? p.consenti() : [];
        return elenco.some((sel) => target.closest(sel));
    }
    function cancello(e) {
        if (!attivo) return;
        if (permesso(e.target)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.type === 'pointerdown' && elCoach) {
            elCoach.classList.remove('tut-coach--scuoti');
            void elCoach.offsetWidth;
            elCoach.classList.add('tut-coach--scuoti');
        }
    }

    function accendi() {
        attivo = true;
        costruisci();
        window.addEventListener('pointerdown', cancello, true);
        window.addEventListener('click', cancello, true);
        vaiA(0);
        requestAnimationFrame(posiziona);
        setInterval(controlla, 200);
    }

    function spegni() {
        attivo = false;
        window.removeEventListener('pointerdown', cancello, true);
        window.removeEventListener('click', cancello, true);
        if (elCoach) elCoach.remove();
        if (elSpot) elSpot.remove();
    }

    // ------------------------------------------------------------------
    // Ingresso e uscita, chiamati da js/duel-session.js.
    // ------------------------------------------------------------------
    function avvia() {
        const t = window.SaveManager ? SaveManager.getTutorial() : { daFare: false, completata: false };
        obbligatoria = t.daFare && !t.completata;
        // Le battute automatiche dei duellanti parlerebbero sopra il nonno.
        // Ogni chiamata nel gioco è già protetta da `if (window.DuelDialogues)`.
        window.DuelDialogues = null;
        window.preparaManiIniziali = preparaLezione;
        initGame();
        if (obbligatoria) {
            // Al primo avvio la lezione non si salta: niente Abbandona, e il
            // tasto Indietro di Android non apre la resa.
            const resa = document.getElementById('surrenderBtn');
            if (resa) resa.style.display = 'none';
            if (window.NativeBackButton) NativeBackButton.setHandler(() => true);
        }
        accendi();
    }

    /** Fine del duello: aggiorna la lezione nel salvataggio e torna le voci da mostrare. */
    function chiudi(vinto, abbandono) {
        spegni();
        if (!window.SaveManager) return [];
        if (!vinto) {
            return [{
                nota: true,
                icon: '🔁',
                rule: abbandono
                    ? 'Lezione interrotta: puoi rifarla quando vuoi da Duelli › Lezione col nonno.'
                    : 'Lezione non completata: riprova, il nonno ti aspetta.'
            }];
        }
        const prima = SaveManager.getTutorial();
        SaveManager.setTutorial({ daFare: false, completata: true });
        if (prima.premiata) {
            return [{ nota: true, icon: '🎓', rule: 'Lezione completata di nuovo. Il premio della lezione si riceve solo la prima volta.' }];
        }
        SaveManager.addCurrency('credits', PREMIO_CREDITI);
        SaveManager.setTutorial({ premiata: true });
        return [{
            currency: 'credits',
            amount: PREMIO_CREDITI,
            icon: '💰',
            nome: 'Crediti',
            rule: 'Premio per la prima lezione col nonno completata: si riceve una volta sola.'
        }];
    }

    window.TutorialDuel = { avvia: avvia, chiudi: chiudi, _passi: PASSI, _passo: () => passo };
})();
