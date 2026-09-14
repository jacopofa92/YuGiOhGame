/**
 * field-ambience.js — Vita ambientale del Terreno di duello.
 * =====================================================================
 * Ogni tanto, e solo in certe arene, qualcosa attraversa il campo: oggi
 * una raffica di sabbia nelle arene dell'Antico Egitto, domani magari
 * pioggia su un'altra. Non è un effetto di carta e non ha nulla a che
 * vedere con la partita: nessuna funzione del motore sa che questo file
 * esiste, e cancellarlo (con il suo <script>) riporta il duello esatto di
 * prima.
 *
 * QUANDO SI ACCENDE. Tre condizioni, tutte necessarie:
 *   1) i Dettagli video sono su "Alti" (js/ui/video-quality.js,
 *      Impostazioni). È il primo effetto che quel livello accende: su
 *      "Normali" questo file crea zero elementi e non avvia alcun timer;
 *   2) l'arena in corso è fra quelle che l'ambiente dichiara;
 *   3) il giocatore non ha chiesto meno animazioni
 *      (prefers-reduced-motion).
 *
 * COME AGGIUNGERNE UNO NUOVO. Una voce in AMBIENTI, e nient'altro:
 *
 *     { nome: 'pioggia',
 *       campi: ['kaibaStadium_2.jpg'],
 *       tinta: () => ({...}),
 *       strati: [...],
 *       pausa: [6000, 14000] }
 *
 * Non serve toccare né l'orchestrazione (scelta dell'ambiente, pause
 * casuali, sospensione a scheda nascosta, pulizia) né il CSS di base
 * degli strati: si scrivono solo le classi della nuova trama in
 * js/ui/field-ambience.css.
 *
 * PERCHÉ GSAP. Ogni raffica è una sequenza — entra, attraversa, si
 * dissolve — con tre strati che partono sfasati e a velocità diverse.
 * Con le transizioni CSS sarebbe una catena di setTimeout con i ritardi
 * scritti a mano in due posti (CSS e JS) da tenere allineati; una
 * timeline la descrive in un punto solo e, soprattutto, si può
 * INTERROMPERE pulita a metà — cosa che serve davvero qui, perché il
 * duello può finire o l'impostazione cambiare mentre la sabbia sta
 * ancora attraversando lo schermo.
 *
 * DIPENDENZA PIGRA: gsap.min.js viene caricato dopo l'evento 'load'
 * (vedi duelMonstersCore.html), quindi quando questo file gira la
 * libreria di solito non c'è ancora — si aspetta con lo stesso schema
 * già usato da js/ui/fx-gsap.js, senza polling infinito.
 */
(function () {
    'use strict';

    // =================================================================
    // Catalogo degli ambienti
    // =================================================================

    /**
     * Tinte della sabbia. Non una sola: la stessa raffica che di giorno è
     * polvere dorata controluce, di notte è un velo pallido che prende la
     * luce della luna. Usare l'oro caldo anche di notte la faceva sembrare
     * illuminata da un sole che in quell'arena non c'è.
     */
    function tintaSabbia(campo) {
        const notte = /Notte/i.test(campo);
        // Di GIORNO la tinta NON è l'ocra della sabbia: è quasi bianca.
        // Un primo tentativo usava il colore della sabbia vera
        // (rgba(226,186,120)) e il risultato era invisibile — l'arena
        // diurna è già tutta ocra, e ocra su ocra non si stacca. Una
        // raffica controluce è anche più fedele: la polvere sollevata dal
        // sole si vede perché RIFLETTE la luce, non per il proprio colore.
        return notte
            ? { piena: 'rgba(202, 210, 232, 0.55)', debole: 'rgba(172, 184, 214, 0.28)' }
            : { piena: 'rgba(255, 245, 222, 0.72)', debole: 'rgba(255, 236, 198, 0.34)' };
    }

    const AMBIENTI = [
        {
            nome: 'sabbia',
            // Le arene dell'Antico Egitto, giorno e notte. Il Palazzo in
            // Rovina è deliberatamente fuori: è un interno, una raffica di
            // sabbia lì racconterebbe una cosa che non si vede nell'arte.
            campi: [
                'anticoEgittoGiorno_1.jpg',
                'anticoEgittoGiorno_2.jpg',
                'anticoEgittoNotte_1.jpg',
                'anticoEgittoNotte_2.jpg',
                'anticoEgittoNotte_3.jpg'
            ],
            tinta: tintaSabbia,
            // Quanto aspettare fra una raffica e la successiva: un minimo e
            // un massimo, sorteggiati ogni volta. Deve restare un evento
            // raro — qualcosa che si nota e poi passa, non un effetto
            // costante che dopo due minuti è solo rumore di fondo.
            pausa: [14000, 34000],
            // Gli strati della raffica, dal fondo al primo piano. `quota`
            // è l'opacità massima che quello strato raggiunge, `durata` i
            // secondi che impiega ad attraversare, `ritardo` lo sfasamento
            // rispetto all'inizio della raffica.
            // TRE strati, non quattro: ognuno è una superficie grande da
            // rasterizzare, e il quarto (un secondo velo di granuli sul
            // fondo) non aggiungeva nulla che si notasse — vedi la nota
            // sulle prestazioni in field-ambience.css.
            strati: [
                { classe: 'fa-sabbia-velo', piano: 'fondo', quota: 0.55, durata: 7.5, ritardo: 0, deriva: 26 },
                { classe: 'fa-sabbia-granuli', piano: 'fondo', quota: 0.7, durata: 5.4, ritardo: 0.5, deriva: 16 },
                // L'unico davanti alle carte, e il più tenue di tutti: è
                // quello che dà la profondità, ma se si nota davvero sta
                // già dando fastidio a chi sta leggendo una carta.
                { classe: 'fa-sabbia-strisce', piano: 'primopiano', quota: 0.22, durata: 3.6, ritardo: 1.1, deriva: 32 }
            ]
        }
    ];

    // =================================================================
    // Stato
    // =================================================================

    let ambienteAttivo = null;   // la voce di AMBIENTI scelta per questa arena
    let elementi = [];           // gli strati DOM, creati una volta sola
    let timeline = null;         // la raffica attualmente in corso, se c'è
    let prossima = null;         // timer che fa partire la prossima raffica
    let sospeso = false;

    function menoAnimazioni() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function dettagliAlti() {
        // Senza il modulo dei Dettagli video non si accende nulla: il
        // livello "Alti" è una scelta esplicita, non un default implicito.
        return !!(window.VideoQuality && window.VideoQuality.isAlti());
    }

    /**
     * L'arena in corso. `DUEL_ARENA_CUSTOM_FIELD` è impostata in cima al
     * <body> di duelMonstersCore.html quando si arriva con ?field=; senza
     * quel parametro vale il Terreno di default della pagina.
     */
    function campoCorrente() {
        return window.DUEL_ARENA_CUSTOM_FIELD || 'dirigibileKaiba.jpg';
    }

    function trovaAmbiente(campo) {
        return AMBIENTI.find((a) => a.campi.indexOf(campo) !== -1) || null;
    }

    function fraDueNumeri(min, max) {
        return min + Math.random() * (max - min);
    }

    // =================================================================
    // Strati
    // =================================================================

    function creaElementi(ambiente, campo) {
        const tinta = ambiente.tinta ? ambiente.tinta(campo) : { piena: '#fff', debole: 'rgba(255,255,255,0.3)' };
        elementi = ambiente.strati.map((strato) => {
            const el = document.createElement('div');
            el.className = `fa-strato fa-strato--${strato.piano} ${strato.classe}`;
            el.style.setProperty('--fa-tinta', tinta.piena);
            el.style.setProperty('--fa-tinta-debole', tinta.debole);
            el.setAttribute('aria-hidden', 'true');
            document.body.appendChild(el);
            return { el: el, cfg: strato };
        });
    }

    function rimuoviElementi() {
        elementi.forEach(({ el }) => el.remove());
        elementi = [];
    }

    // =================================================================
    // La raffica
    // =================================================================

    /**
     * Una singola passata. Tutto ciò che la rende diversa dalla
     * precedente si sorteggia qui: il verso, l'inclinazione, quanto è
     * densa, quanto dura. Due raffiche identiche di fila sono il modo più
     * sicuro per far sembrare finto un effetto ambientale.
     */
    function raffica() {
        if (!ambienteAttivo || !window.gsap || !elementi.length) return;
        // Una raffica alla volta. Senza questa guardia, una seconda
        // chiamata mentre la prima è a metà schermo rimette gli strati al
        // punto di partenza con opacità zero: la sabbia sparisce di colpo
        // e ricompare dall'altra parte (osservato campionando le opacità
        // nel tempo). Può succedere solo se qualcuno la invoca a mano,
        // ma è proprio quello che fanno le prove e le verifiche.
        if (timeline && timeline.isActive()) return;

        // Da destra o da sinistra. `verso` serve anche a inclinare la
        // deriva verticale nello stesso senso, altrimenti la sabbia
        // sembrerebbe soffiata da due venti diversi insieme.
        const verso = Math.random() < 0.5 ? 1 : -1;
        // Quanto "tira" questa raffica: una passata leggera e una vera
        // tempesta usano gli stessi strati, cambia solo l'intensità.
        const forza = fraDueNumeri(0.55, 1);
        const ritmo = fraDueNumeri(0.82, 1.3);

        timeline = gsap.timeline({
            onComplete: () => {
                timeline = null;
                programmaProssima();
            }
        });

        elementi.forEach(({ el, cfg }) => {
            // La corsa è tutta e sola l'ECCEDENZA dello strato rispetto
            // allo schermo (vedi la larghezza in field-ambience.css): così
            // il pattern scorre per intero da un bordo all'altro senza che
            // il suo margine entri mai nell'inquadratura, e la misura vive
            // in un posto solo — cambiare la larghezza nel CSS aggiorna
            // questa da sé, invece di lasciare due numeri da tenere
            // allineati a mano.
            const corsa = Math.max(0, el.offsetWidth - window.innerWidth);
            const partenza = verso > 0 ? -corsa : 0;
            const arrivo = verso > 0 ? 0 : -corsa;
            const durata = cfg.durata * ritmo;
            // Deriva verticale: la sabbia non viaggia mai perfettamente in
            // orizzontale. Poca per gli strati di fondo (lontani), di più
            // per quello in primo piano, che così sembra passare più
            // vicino all'osservatore.
            const salita = cfg.deriva * fraDueNumeri(0.6, 1.4) * (Math.random() < 0.5 ? 1 : -1);

            gsap.set(el, { x: partenza, y: -salita / 2, opacity: 0 });

            timeline
                .to(el, {
                    x: arrivo,
                    y: salita / 2,
                    duration: durata,
                    ease: 'none'   // il vento non accelera né frena: attraversa
                }, cfg.ritardo)
                // Entra e se ne va con la stessa passata: l'opacità sale
                // nel primo terzo e scende nell'ultimo, così la raffica non
                // compare né sparisce di colpo a schermo.
                .fromTo(el,
                    { opacity: 0 },
                    { opacity: cfg.quota * forza, duration: durata * 0.34, ease: 'sine.out' },
                    cfg.ritardo)
                .to(el, { opacity: 0, duration: durata * 0.38, ease: 'sine.in' },
                    cfg.ritardo + durata * 0.62);
        });
    }

    function programmaProssima() {
        if (!ambienteAttivo || sospeso) return;
        clearTimeout(prossima);
        const [min, max] = ambienteAttivo.pausa;
        prossima = setTimeout(raffica, fraDueNumeri(min, max));
    }

    // =================================================================
    // Accensione e spegnimento
    // =================================================================

    function ferma() {
        clearTimeout(prossima);
        prossima = null;
        if (timeline) { timeline.kill(); timeline = null; }
        rimuoviElementi();
        ambienteAttivo = null;
    }

    /**
     * Accende l'ambiente giusto per l'arena in corso, se ce n'è uno e se
     * le condizioni ci sono. Richiamabile più volte senza danni: se è già
     * acceso per la stessa arena non fa nulla.
     */
    function avvia(campoRichiesto) {
        const campo = campoRichiesto || campoCorrente();
        const ambiente = trovaAmbiente(campo);

        if (!ambiente || !dettagliAlti() || menoAnimazioni() || !window.gsap) {
            ferma();
            return false;
        }
        if (ambienteAttivo === ambiente && elementi.length) return true;

        ferma();
        ambienteAttivo = ambiente;
        creaElementi(ambiente, campo);
        // La prima raffica non parte subito: si entra in duello e la scena
        // deve essere quella dell'arena, non un effetto che si presenta.
        clearTimeout(prossima);
        prossima = setTimeout(raffica, fraDueNumeri(4000, 9000));
        return true;
    }

    // A scheda nascosta non ha senso continuare: i timer di GSAP e il
    // nostro setTimeout terrebbero occupata la CPU (e la batteria) per
    // un'animazione che nessuno sta guardando.
    document.addEventListener('visibilitychange', () => {
        sospeso = document.hidden;
        if (!ambienteAttivo) return;
        if (sospeso) {
            clearTimeout(prossima);
            if (timeline) timeline.pause();
        } else {
            if (timeline) timeline.play();
            else programmaProssima();
        }
    });

    window.FieldAmbience = {
        avvia: avvia,
        ferma: ferma,
        /** Fa partire una raffica adesso, senza aspettare la pausa: serve alle prove e alle verifiche. */
        raffica: raffica,
        /** Quale ambiente è acceso ora (null se nessuno) — usata dalle verifiche automatiche. */
        attivo: () => (ambienteAttivo ? ambienteAttivo.nome : null),
        /** Esposto perché una prova possa elencare le arene coperte senza duplicarle a mano. */
        AMBIENTI: AMBIENTI
    };

    // gsap.min.js arriva DOPO l'evento 'load' (caricamento pigro): stesso
    // schema di attesa di js/ui/fx-gsap.js — qualche tentativo a
    // intervalli crescenti, poi si lascia perdere senza rumore.
    (function attendiGsap() {
        let tentativi = 0;
        function riprova() {
            if (window.gsap) { avvia(); return; }
            if (++tentativi > 12) return; // ~10s: se non è arrivata, non arriverà
            setTimeout(riprova, 200 * tentativi);
        }
        if (document.readyState === 'complete') riprova();
        else window.addEventListener('load', riprova, { once: true });
    })();
})();
