/**
 * board-pieces.js — Pedine "3D" disegnate in SVG per le mappe dei tornei.
 * =====================================================================
 * Nate per la città di Battle City, dove i punti della mappa erano emoji
 * (🧑‍🎤 🕶️ 🃏 ❗ 🏪 🚁 ❓ 📍): minuscole, diverse da un sistema operativo
 * all'altro, e stonate sopra lo sfondo illustrato. Richiesta dell'utente:
 * "al posto delle emoticon metti qualcosa in 3D, come immagini".
 *
 * PERCHÉ SVG E NON IMMAGINI PNG: le pedine devono restare nitide a ogni
 * densità di schermo (il telefono va a 2-3x), pesare nulla (il gioco gira
 * offline, su file:// e nell'APK) e poter cambiare colore con lo stato
 * della casella senza un file per ogni combinazione. Il volume lo danno i
 * gradienti (luce da sinistra in alto, come nello sfondo della città), lo
 * spessore una seconda faccia più scura spostata in basso, e l'ombra a
 * terra un'ellisse sfocata: abbastanza per leggere "oggetto appoggiato sulla
 * mappa", non un'icona piatta.
 *
 * I GRADIENTI SONO DEFINITI UNA VOLTA SOLA (ensureDefs) e ogni pedina li
 * richiama per id. Due vincoli, già pagati in questo progetto col logo
 * (js/ui/game-logo.js): l'SVG che li contiene NON deve stare in un
 * contenitore `display:none` (un gradiente dentro un SVG non visualizzato
 * non si dipinge, e tutte le pedine resterebbero senza colore), e gli id
 * hanno un prefisso proprio (`bp-`) per non scontrarsi con altri SVG della
 * stessa pagina.
 *
 * Uso: BoardPieces.markup('duelist') → stringa HTML da mettere in una
 * casella. Il tipo sconosciuto torna stringa vuota (casella senza pedina),
 * mai un errore: un tipo di casella nuovo non deve rompere la mappa.
 */
(function () {
    'use strict';

    const DEFS_ID = 'bpDefs';

    const DEFS = `
        <linearGradient id="bp-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff6c2"/><stop offset=".45" stop-color="#f7bd3f"/><stop offset="1" stop-color="#9c5a0b"/>
        </linearGradient>
        <linearGradient id="bp-cyan-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#0a4a66"/><stop offset=".32" stop-color="#3fdcf5"/><stop offset=".68" stop-color="#168bb0"/><stop offset="1" stop-color="#052e44"/>
        </linearGradient>
        <radialGradient id="bp-cyan-head" cx=".36" cy=".3" r=".75">
            <stop offset="0" stop-color="#f0feff"/><stop offset=".42" stop-color="#55e2f8"/><stop offset="1" stop-color="#0a5f80"/>
        </radialGradient>
        <linearGradient id="bp-purple-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#170a22"/><stop offset=".32" stop-color="#6e2f92"/><stop offset=".68" stop-color="#3b1552"/><stop offset="1" stop-color="#0f0518"/>
        </linearGradient>
        <radialGradient id="bp-purple-head" cx=".36" cy=".3" r=".8">
            <stop offset="0" stop-color="#c9a4f2"/><stop offset=".45" stop-color="#5b2486"/><stop offset="1" stop-color="#1c0730"/>
        </radialGradient>
        <linearGradient id="bp-base-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#c4d3e4"/><stop offset="1" stop-color="#4a5a70"/>
        </linearGradient>
        <linearGradient id="bp-amber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff0a0"/><stop offset=".5" stop-color="#f7b21f"/><stop offset="1" stop-color="#c06f05"/>
        </linearGradient>
        <linearGradient id="bp-card-back" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#a0662a"/><stop offset=".55" stop-color="#6b3d16"/><stop offset="1" stop-color="#3c210b"/>
        </linearGradient>
        <radialGradient id="bp-holo" cx=".38" cy=".32" r=".78">
            <stop offset="0" stop-color="#c9fcff"/><stop offset=".42" stop-color="#1fb3d2"/><stop offset="1" stop-color="#05243a"/>
        </radialGradient>
        <radialGradient id="bp-pad" cx=".5" cy=".45" r=".6">
            <stop offset="0" stop-color="#6a2077"/><stop offset="1" stop-color="#25072d"/>
        </radialGradient>
        <linearGradient id="bp-wall-l" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#7f93ad"/><stop offset="1" stop-color="#3f4e63"/>
        </linearGradient>
        <linearGradient id="bp-wall-r" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#d7e3f0"/><stop offset="1" stop-color="#8296ae"/>
        </linearGradient>
        <linearGradient id="bp-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#e3ebf5"/><stop offset="1" stop-color="#6f8098"/>
        </linearGradient>`;

    /** Inserisce una volta sola, nel <body>, l'SVG con i gradienti condivisi. */
    function ensureDefs() {
        if (document.getElementById(DEFS_ID)) return;
        const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        holder.setAttribute('id', DEFS_ID);
        holder.setAttribute('aria-hidden', 'true');
        holder.setAttribute('width', '0');
        holder.setAttribute('height', '0');
        // Fuori dal flusso ma VISUALIZZATO: vedi il commento in cima al file.
        holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
        holder.innerHTML = `<defs>${DEFS}</defs>`;
        document.body.appendChild(holder);
    }

    // Ombra a terra comune a ogni pedina: è lei a "posarla" sulla mappa.
    const SHADOW = '<ellipse class="bp-shadow" cx="32" cy="57" rx="15" ry="3.6" fill="#000" opacity=".42"/>';
    // Basamento a disco, spessore + faccia superiore.
    const BASE = '<ellipse cx="32" cy="53.5" rx="13" ry="4.4" fill="#26313f"/><ellipse cx="32" cy="51.6" rx="13" ry="4.4" fill="url(#bp-base-top)"/>';

    const PIECES = {
        // Duellante: pedina azzurra col Duel Disk dorato al braccio.
        duelist: `${SHADOW}${BASE}
            <path d="M20.5 51 C21 40 25 33.5 32 33.5 C39 33.5 43 40 43.5 51 Z" fill="url(#bp-cyan-body)"/>
            <circle cx="32" cy="24.5" r="9" fill="url(#bp-cyan-head)"/>
            <ellipse cx="29" cy="20.8" rx="3.4" ry="2.2" fill="#fff" opacity=".55"/>
            <g transform="rotate(-24 18 42)">
                <ellipse cx="18" cy="43.6" rx="9.5" ry="3.6" fill="#7a4507"/>
                <ellipse cx="18" cy="42" rx="9.5" ry="3.6" fill="url(#bp-gold)" stroke="#fff3c0" stroke-width=".6"/>
                <circle cx="13.5" cy="42" r="1.1" fill="#22d3ee"/><circle cx="18" cy="41.3" r="1.1" fill="#22d3ee"/><circle cx="22.5" cy="42" r="1.1" fill="#22d3ee"/>
            </g>`,
        // Rare Hunter: incappucciato, viola scuro, Occhio del Millennio sul
        // petto. Anonimo apposta — l'identità si estrae entrando nella casella.
        hunter: `${SHADOW}${BASE}
            <path d="M19.5 51 C20 39 24 32 32 32 C40 32 44 39 44.5 51 Z" fill="url(#bp-purple-body)"/>
            <circle cx="32" cy="25" r="9" fill="url(#bp-purple-head)"/>
            <path d="M21.5 30.5 C20 15 44 15 42.5 30.5 C39 26 25 26 21.5 30.5 Z" fill="#12061c"/>
            <ellipse cx="32" cy="27.5" rx="5.4" ry="3.6" fill="#05010a"/>
            <circle cx="29.6" cy="27.4" r="1" fill="#e879f9"/><circle cx="34.4" cy="27.4" r="1" fill="#e879f9"/>
            <path d="M25.5 42 Q32 36.6 38.5 42 Q32 47.4 25.5 42 Z" fill="url(#bp-gold)"/>
            <circle cx="32" cy="42" r="2.1" fill="#3a0f52"/><circle cx="32" cy="42" r=".9" fill="#f5d0fe"/>`,
        // Carta Locazione: una carta in piedi, inclinata, con lo spessore
        // visibile e il bersaglio del radar acceso al centro.
        locator: `${SHADOW}
            <polygon points="45,11.5 49,14 50.5,52 46.5,50.5" fill="#2a1606"/>
            <polygon points="18,14.5 45,11.5 46.5,50.5 19.5,54" fill="url(#bp-card-back)" stroke="#f1c873" stroke-width="1.2" stroke-linejoin="round"/>
            <polygon points="22,19 41.5,16.8 42.6,46.4 23.2,48.9" fill="none" stroke="#f7d774" stroke-opacity=".55" stroke-width=".8"/>
            <circle cx="32.4" cy="32.8" r="8.4" fill="#062a3c" stroke="#22d3ee" stroke-width="1.4"/>
            <circle cx="32.4" cy="32.8" r="4.4" fill="none" stroke="#7df3ff" stroke-width="1"/>
            <circle cx="32.4" cy="32.8" r="1.7" fill="#e8fdff"/>
            <path d="M32.4 22.6 V26 M32.4 39.6 V43 M22.2 32.8 H25.6 M39.2 32.8 H42.6" stroke="#7df3ff" stroke-width="1.2" stroke-linecap="round"/>
            <polygon points="19,15.5 30,14.2 21.5,30" fill="#fff" opacity=".13"/>`,
        // Evento: cartello di pericolo estruso, ambra.
        event: `${SHADOW}
            <polygon points="35,12 58,53 13,53" fill="#6e4004"/>
            <polygon points="32,8.5 55,49.5 9,49.5" fill="url(#bp-amber)" stroke="#fff4c4" stroke-width="1" stroke-linejoin="round"/>
            <polygon points="32,15 49.5,46 14.5,46" fill="none" stroke="#7a4a05" stroke-opacity=".5" stroke-width="1.2"/>
            <path d="M29.6 22.5 H34.4 L33.4 36.5 H30.6 Z" fill="#3a2402"/>
            <circle cx="32" cy="41.6" r="2.6" fill="#3a2402"/>
            <polygon points="32,8.5 21,28 25,28" fill="#fff" opacity=".28"/>`,
        // Negozio: edificio isometrico con tenda a righe e insegna accesa.
        shop: `${SHADOW}
            <polygon points="13,27 32,36 32,56 13,47" fill="url(#bp-wall-l)"/>
            <polygon points="32,36 51,27 51,47 32,56" fill="url(#bp-wall-r)"/>
            <polygon points="13,27 32,18 51,27 32,36" fill="#2b3f57"/>
            <polygon points="16,27 32,19.5 48,27 32,34.5" fill="#3d5878"/>
            <polygon points="32,38 37,35.6 37,39.8 32,42.2" fill="#e04848"/>
            <polygon points="37,35.6 42,33.2 42,37.4 37,39.8" fill="#f5f5f5"/>
            <polygon points="42,33.2 47,30.8 47,35 42,37.4" fill="#e04848"/>
            <polygon points="36,43.5 42,40.6 42,51 36,53.9" fill="#1c2635"/>
            <polygon points="16,33 28,38.6 28,44 16,38.4" fill="#22d3ee" opacity=".75"/>
            <polygon points="17,33.6 21,35.5 21,37.2 17,35.3" fill="#e8fdff" opacity=".8"/>`,
        // Zona di decollo: piazzola isometrica con la H e l'elicottero
        // sospeso sopra, rotore sfocato.
        heliport: `${SHADOW}
            <ellipse cx="32" cy="49.5" rx="22" ry="8.6" fill="#1a0420"/>
            <ellipse cx="32" cy="47.2" rx="22" ry="8.6" fill="url(#bp-pad)" stroke="#e879f9" stroke-width="1.4"/>
            <ellipse cx="32" cy="47.2" rx="15.5" ry="5.8" fill="none" stroke="#f5d0fe" stroke-opacity=".6" stroke-width="1"/>
            <path d="M26.5 44.4 V50 M37.5 44.4 V50 M26.5 47.2 H37.5" stroke="#fdf4ff" stroke-width="2.2" stroke-linecap="round"/>
            <g class="bp-heli">
                <ellipse cx="32" cy="34" rx="5" ry="1.4" fill="#000" opacity=".25"/>
                <path d="M23 25 C23 20 27 18 31.5 18 C36.5 18 39 21 39 24.5 C39 27.6 36.4 28.6 32 28.6 C27 28.6 23 27.8 23 25 Z" fill="url(#bp-steel)" stroke="#3f4e63" stroke-width=".8"/>
                <path d="M38.6 23.6 L50 21.6 L50.6 24 L38.8 26" fill="#8296ae"/>
                <path d="M26 20.5 C27 18.8 29.5 18.4 31 18.5 L31 23.4 L25.2 23.4 Z" fill="#7df3ff" opacity=".85"/>
                <ellipse class="bp-rotor" cx="31.5" cy="15.6" rx="15" ry="1.6" fill="#dfe8f2" opacity=".55"/>
                <rect x="30.8" y="15.6" width="1.4" height="2.8" fill="#3f4e63"/>
            </g>`,
        // Casella ignota: sfera olografica del radar con il punto di domanda.
        hidden: `${SHADOW}
            <circle cx="32" cy="31" r="18" fill="url(#bp-holo)" opacity=".92"/>
            <ellipse cx="32" cy="31" rx="18" ry="5.4" fill="none" stroke="#7df3ff" stroke-opacity=".45" stroke-width="1"/>
            <ellipse cx="32" cy="31" rx="7" ry="18" fill="none" stroke="#7df3ff" stroke-opacity=".25" stroke-width="1"/>
            <ellipse cx="25.5" cy="22.5" rx="6" ry="3.6" fill="#fff" opacity=".4" transform="rotate(-32 25.5 22.5)"/>
            <text x="32" y="38" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="19" font-weight="900" fill="#e8fdff">?</text>`,
        // Casella già risolta: gettone d'acciaio spento con la spunta.
        done: `<ellipse cx="32" cy="45" rx="12" ry="3.4" fill="#000" opacity=".35"/>
            <ellipse cx="32" cy="41.6" rx="11.5" ry="4.2" fill="#2f3b4b"/>
            <ellipse cx="32" cy="39.6" rx="11.5" ry="4.2" fill="url(#bp-steel)"/>
            <path d="M27.4 39.4 L30.8 41.6 L36.8 37" fill="none" stroke="#2a3a4e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
        // Il segnalino del giocatore: puntina dorata in rilievo.
        player: `<ellipse cx="32" cy="58" rx="9" ry="2.8" fill="#000" opacity=".45"/>
            <path d="M32 57 C28 47 18.5 39 18.5 25.5 A13.5 13.5 0 1 1 45.5 25.5 C45.5 39 36 47 32 57 Z" fill="url(#bp-gold)" stroke="#6b3a05" stroke-width="1.2"/>
            <circle cx="32" cy="25.5" r="6.2" fill="#0b1830" stroke="#fff3c0" stroke-width="1"/>
            <circle cx="32" cy="25.5" r="2.3" fill="#22d3ee"/>
            <ellipse cx="26.5" cy="18" rx="4.4" ry="2.6" fill="#fff" opacity=".55" transform="rotate(-28 26.5 18)"/>`
    };

    /**
     * L'HTML di una pedina. `variant` aggiunge una classe (bp-<variant>) per
     * gli stati che la pagina vuole distinguere senza cambiare disegno.
     */
    function markup(kind, variant) {
        const body = PIECES[kind];
        if (!body) return '';
        ensureDefs();
        const cls = `bp-piece bp-${kind}${variant ? ' bp-' + variant : ''}`;
        return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${body}</svg>`;
    }

    window.BoardPieces = {
        markup: markup,
        ensureDefs: ensureDefs,
        kinds: () => Object.keys(PIECES)
    };
})();
