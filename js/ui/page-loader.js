/**
 * page-loader.js — schermata di caricamento condivisa per OGNI cambio
 * pagina del gioco (menu, Cartoteca, Creazione Deck, Duello Libero,
 * ecc.) — diversa dallo splash d'apertura di index.html (.splash-screen,
 * mostrato una sola volta per sessione di scheda, alla primissima
 * apertura dell'app): questa compare ad OGNI navigazione tra pagine,
 * per camuffare il tempo di caricamento reale (script/dati) dietro
 * un'animazione a tema invece di uno schermo bianco — stesso principio
 * dello splash, ma un componente condiviso (come js/ui/topbar.js) invece
 * di duplicare markup/CSS/JS in ogni pagina.
 *
 * USO: in ogni pagina che deve mostrarla,
 *   <head>: <link rel="stylesheet" href="js/ui/page-loader.css">
 *   <body>: <script src="js/ui/page-loader.js"></script>  ← PRIMISSIMO
 *           elemento di <body> (prima di qualunque altro markup), così
 *           copre il resto della pagina dal primissimo frame dipinto,
 *           esattamente come faceva #preIntroCover in duelMonstersCore.html
 *           (ora sostituito da questo stesso componente, vedi
 *           duel-session.js#start()).
 *
 * Per default si nasconde da sola dopo ALMENO 2 secondi dal momento in
 * cui questo script viene eseguito, aspettando anche il vero
 * window.load (cosicché la pagina reale sia già pronta sotto di lei —
 * stessa garanzia di hideSplashThen() in index.html). Una pagina con un
 * proprio momento più preciso in cui sparire (es. duelMonstersCore.html,
 * che aspetta l'inizio della propria cinematica invece del window.load
 * generico — la regola già esistente lì è "il caricamento del duello
 * non deve MAI aspettare nient'altro", quindi niente minimo di 2s in
 * quel caso) imposta `window.PAGE_LOADER_MANUAL_HIDE = true` PRIMA di
 * questo script e chiama `PageLoader.hide()` da sola quando è pronta.
 */
(function () {
    'use strict';

    // Via di fuga generica (es. index.html sulla PRIMISSIMA apertura
    // dell'app, quando deve comparire SOLO lo splash screen dedicato,
    // .splash-screen — vedi lì —, mai insieme a questo loader generico:
    // impostare window.PAGE_LOADER_SKIP = true PRIMA di questo script
    // salta la creazione dell'overlay per intero, window.PageLoader
    // resta undefined). Ogni chiamante di PageLoader.hide()/hideWhenReady()
    // in questo progetto controlla già `if (window.PageLoader)` prima di
    // invocarla, quindi funziona senza altre modifiche.
    if (window.PAGE_LOADER_SKIP) return;

    // Catturato SUBITO (primo statement eseguibile di questo script,
    // che è già il primissimo elemento del body): stesso identico scopo
    // di window.__splashStart in index.html, per garantire ALMENO 2
    // secondi a partire da QUI, non da quando il window.load arriva
    // (che potrebbe già essere "il caricamento è praticamente finito").
    window.__pageLoaderStart = performance.now();

    var el = document.createElement('div');
    el.id = 'pageLoader';
    el.className = 'page-loader';
    el.innerHTML =
        '<div class="page-loader-disk">' +
            '<div class="page-loader-disk-ring"></div>' +
            '<div class="page-loader-disk-ring2"></div>' +
            '<div class="page-loader-disk-glyph">🎴</div>' +
        '</div>' +
        '<div class="page-loader-bar"><div class="page-loader-bar-fill"></div></div>' +
        '<p class="page-loader-text">Caricamento…</p>';

    // document.currentScript è questo stesso tag <script> (un classico
    // script sincrono, mai async/defer/module) — inserire SUBITO DOPO
    // di lui, invece che in coda a document.body, è l'unico modo per
    // garantire che l'overlay compaia PRIMA che il resto del body (che
    // deve ancora essere parsato, essendo questo il primissimo script)
    // venga dipinto — stesso principio di #preIntroCover/.splash-screen,
    // che invece erano markup HTML letterale per lo stesso identico
    // motivo: qui l'unico modo di restare un componente condiviso
    // (niente markup duplicato in ogni pagina) senza perdere quella
    // garanzia.
    var currentScript = document.currentScript;
    if (currentScript && currentScript.parentNode) {
        currentScript.parentNode.insertBefore(el, currentScript.nextSibling);
    } else if (document.body) {
        document.body.insertBefore(el, document.body.firstChild);
    }

    var MIN_MS = 2000;
    var hidden = false;
    function hide() {
        if (hidden) return;
        hidden = true;
        el.classList.add('page-loader-hidden');
        setTimeout(function () { el.remove(); }, 550);
    }
    function hideWhenReady() {
        var elapsed = performance.now() - window.__pageLoaderStart;
        var remaining = Math.max(0, MIN_MS - elapsed);
        setTimeout(hide, remaining);
    }

    window.PageLoader = { hide: hide, hideWhenReady: hideWhenReady };

    if (!window.PAGE_LOADER_MANUAL_HIDE) {
        window.addEventListener('load', hideWhenReady);
    }
})();
