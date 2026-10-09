/**
 * duel-feedback.js — i "riscontri" visivi dei momenti che prima passavano
 * in silenzio (o solo nel registro) durante un duello.
 * =====================================================================
 * Richiesta dell'utente ("altri effetti grafici mancanti nel duello?"),
 * tutti e sei i punti proposti:
 *   1. ATK/DEF che cambiano: un numero fluttuante (+500 / −1000) sopra il
 *      mostro e un lampo sul suo valore;
 *   2. una carta BANDITA dal Terreno: si dissolve in un varco viola,
 *      diverso da una distruzione;
 *   3. un'attivazione ANNULLATA: un sigillo ⛔ che incrina la carta;
 *   4. un mostro che cambia Posizione: ruota davvero di 90°;
 *   5. un TOKEN che nasce: un lampo e una nuvola di fumo;
 *   6. Life Point critici (≤ 1000): il riquadro dei LP pulsa di rosso e,
 *      per i propri, i bordi dello schermo si scuriscono.
 *
 * COME FUNZIONA, ed è la scelta che conta: 1, 2, 4 e 5 non sono agganciati
 * alle carte che li causano (sarebbero centinaia di punti, e una carta
 * nuova se ne dimenticherebbe). `sync()` gira a ogni ridisegno del duello
 * (ridisegnaDuello in game-flow.js, subito dopo gli ologrammi), fotografa
 * il Terreno e lo CONFRONTA con la fotografia precedente: un mostro con
 * l'ATK diverso, uno sparito e ritrovato fra le carte bandite, uno nuovo
 * che è un Token, uno con la Posizione cambiata. Qualunque carta abbia
 * causato la differenza, oggi o domani, il riscontro c'è. Solo
 * l'annullamento (3) non si vede dallo stato: lo segnala il motore con
 * l'evento 'attivazione-negata' (js/engine/eventi-duello.js).
 *
 * Tutto sta su un livello suo (#duelFeedbackLayer), fuori dal Terreno,
 * come gli ologrammi (js/ui/monster-hologram.js, vedi lì il perché): il
 * Terreno si ridisegna di continuo e un effetto appeso a una casella
 * morirebbe a metà. La rotazione del cambio di Posizione è l'unica cosa
 * applicata alla carta stessa, con la Web Animations API, che non tocca
 * gli attributi del nodo — quindi non lo fa sostituire al ridisegno
 * successivo (vedi riconciliaBoard in game-flow.js).
 *
 * Mai rimbalzi negli atterraggi (preferenza esplicita dell'utente): ogni
 * movimento arriva e si ferma. Con "riduci movimento" restano solo le
 * informazioni (i numeri, il sigillo, il riquadro rosso), senza moto.
 */
(function () {
    'use strict';

    const LAYER_ID = 'duelFeedbackLayer';
    const LP_CRITICI = 1000;

    /** La fotografia del Terreno all'ultimo ridisegno: uid → stato. null = nessuna (inizio duello). */
    let precedente = null;

    function movimentoRidotto() {
        try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    }

    function layer() {
        let el = document.getElementById(LAYER_ID);
        if (!el) {
            el = document.createElement('div');
            el.id = LAYER_ID;
            el.setAttribute('aria-hidden', 'true');
            document.body.appendChild(el);
        }
        return el;
    }

    /** Un elemento effimero sul livello: si toglie da solo dopo `vitaMs`. */
    function effimero(classe, rect, vitaMs) {
        const el = document.createElement('div');
        el.className = classe;
        if (rect) {
            el.style.left = Math.round(rect.x) + 'px';
            el.style.top = Math.round(rect.y) + 'px';
            el.style.width = Math.round(rect.w) + 'px';
            el.style.height = Math.round(rect.h) + 'px';
        }
        layer().appendChild(el);
        setTimeout(() => el.remove(), vitaMs);
        return el;
    }

    function rettangolo(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return null;
        return { x: r.left, y: r.top, w: r.width, h: r.height };
    }

    function elementoCarta(uid) {
        return typeof findFieldCardElementByUid === 'function' ? findFieldCardElementByUid(uid) : null;
    }

    function artDi(card) {
        return card && window.getCardImagePath ? getCardImagePath(card) : '';
    }

    // ================================================================
    // Fotografia del Terreno
    // ================================================================
    function fotografa() {
        const foto = new Map();
        if (typeof Tavolo === 'undefined' || !window.DuelEngine) return foto;
        ['player', 'bot'].forEach((owner) => {
            (Tavolo.mostri(owner) || []).forEach((slot, indice) => {
                if (!slot || !slot.card || slot.card.uid == null) return;
                const el = elementoCarta(slot.card.uid);
                foto.set(slot.card.uid, {
                    owner: owner, indice: indice, card: slot.card,
                    coperta: !!slot.isFaceDown,
                    posizione: slot.position,
                    atk: DuelEngine.getEffectiveAtk(slot.card),
                    def: DuelEngine.getEffectiveDef(slot.card),
                    token: !!slot.card.isToken,
                    el: el, rect: rettangolo(el)
                });
            });
        });
        return foto;
    }

    function uidBanditi() {
        const s = new Set();
        if (typeof Tavolo === 'undefined') return s;
        ['player', 'bot'].forEach((owner) => (Tavolo.banditi(owner) || []).forEach((c) => { if (c && c.uid != null) s.add(c.uid); }));
        return s;
    }

    /**
     * Confronta il Terreno di adesso con quello dell'ultimo ridisegno e
     * fa partire i riscontri. Va chiamata DOPO renderFields, che ha appena
     * messo a schermo le carte da cui legge le posizioni.
     */
    function sync() {
        if (typeof gameState === 'undefined' || !gameState || !gameState.playerMonsterField) return;
        const ora = fotografa();
        if (precedente) {
            ora.forEach((o, uid) => {
                const p = precedente.get(uid);
                if (!p) {
                    if (o.token && o.rect) tokenNato(o.rect);
                    return;
                }
                // Un mostro che si sta SCOPRENDO ha già il suo giro in 3D
                // (CardRenderer.playFlipReveal): niente altro sopra.
                if (p.coperta && !o.coperta) return;
                if (!o.coperta && o.rect) {
                    const dAtk = o.atk - p.atk;
                    const dDef = o.def - p.def;
                    if (dAtk || dDef) variazioneStat(o.el, o.rect, dAtk, dDef);
                }
                if (p.posizione !== o.posizione && o.el) ruotaPosizione(o.el, o.posizione);
            });
            const banditi = uidBanditi();
            precedente.forEach((p, uid) => {
                if (!ora.has(uid) && banditi.has(uid) && p.rect) cartaBandita(p.rect, p.coperta ? null : p.card);
            });
        }
        precedente = ora;
        lpCritici();
    }

    // ================================================================
    // 1. ATK/DEF che cambiano
    // ================================================================
    function variazioneStat(cardEl, rect, dAtk, dDef) {
        const box = effimero('df-variazione', { x: rect.x, y: rect.y - 6, w: rect.w, h: 0 }, 1700);
        [['ATK', dAtk], ['DEF', dDef]].forEach(([nome, d]) => {
            if (!d) return;
            const riga = document.createElement('span');
            riga.className = 'df-variazione-riga ' + (d > 0 ? 'df-su' : 'df-giu');
            riga.textContent = `${d > 0 ? '+' : '−'}${Math.abs(d)} ${nome}`;
            box.appendChild(riga);
        });
        // Il lampo sul valore sotto la carta: con la Web Animations API, che
        // non cambia gli attributi del nodo (vedi in cima al file).
        const slot = cardEl && cardEl.closest('.field-slot');
        const badge = slot && slot.querySelector('.field-stats-badge');
        if (badge && typeof badge.animate === 'function' && !movimentoRidotto()) {
            const colore = (dAtk || dDef) > 0 ? 'rgba(111,224,138,0.95)' : 'rgba(255,107,91,0.95)';
            badge.animate([
                { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' },
                { transform: 'scale(1.22)', boxShadow: `0 0 14px 3px ${colore}`, offset: 0.3 },
                { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' }
            ], { duration: 900, easing: 'cubic-bezier(.22,.7,.25,1)' });
        }
    }

    // ================================================================
    // 2. Carta bandita dal Terreno
    // ================================================================
    function cartaBandita(rect, card) {
        const varco = effimero('df-varco', rect, 1100);
        const art = artDi(card);
        if (art) {
            const fantasma = document.createElement('div');
            fantasma.className = 'df-varco-carta';
            fantasma.style.backgroundImage = `url("${art.replace(/"/g, '\\"')}")`;
            varco.appendChild(fantasma);
        } else {
            varco.classList.add('df-varco--coperta');
        }
        if (window.FX && typeof FX.spawnParticles === 'function' && !movimentoRidotto()) {
            FX.spawnParticles(rect.x + rect.w / 2, rect.y + rect.h / 2, { count: 18, colors: ['#b98cff', '#5b2a86', '#ffffff'], speed: 3 });
        }
    }

    // ================================================================
    // 3. Attivazione annullata (evento del motore)
    // ================================================================
    function attivazioneNegata(card, owner, zona, indice) {
        // Se la carta è ancora sul Terreno (una Continua, un effetto di un
        // mostro) il sigillo va su di lei; altrimenti (una Normale è già al
        // Cimitero) al centro dello schermo, con la sua illustrazione.
        const el = card && card.uid != null ? elementoCarta(card.uid) : null;
        const rect = rettangolo(el);
        if (rect) {
            const sigillo = effimero('df-negata', rect, 1500);
            sigillo.innerHTML = '<span class="df-negata-crepe"></span><span class="df-negata-timbro">⛔</span>';
            if (typeof el.animate === 'function' && !movimentoRidotto()) {
                el.animate([{ filter: 'none' }, { filter: 'grayscale(1) brightness(0.6)', offset: 0.35 }, { filter: 'none' }],
                    { duration: 1400, easing: 'ease-out' });
            }
            return;
        }
        const w = Math.min(170, window.innerWidth * 0.32);
        const centro = { x: window.innerWidth / 2 - w / 2, y: window.innerHeight / 2 - w * 0.75, w: w, h: w * 1.46 };
        const box = effimero('df-negata df-negata--centro', centro, 1600);
        const art = artDi(card);
        box.innerHTML = `${art ? `<span class="df-negata-art" style="background-image:url('${art.replace(/'/g, "\\'")}')"></span>` : ''}
            <span class="df-negata-crepe"></span><span class="df-negata-timbro">⛔</span>
            <span class="df-negata-testo">${card && card.name ? escapeHtml(card.name) + ' — ' : ''}annullata</span>`;
    }
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // ================================================================
    // 4. Cambio di Posizione
    // ================================================================
    /**
     * La carta in Difesa è ruotata di 90° dal CSS (`transform` su
     * .defense-pos). Si anima la proprietà `rotate`, che si SOMMA al
     * transform invece di sostituirlo: partendo dall'angolo opposto si
     * vede la carta girare dalla Posizione vecchia alla nuova.
     */
    function ruotaPosizione(cardEl, nuova) {
        if (!cardEl || typeof cardEl.animate !== 'function' || movimentoRidotto()) return;
        if (cardEl.closest('.card-flip-outer')) return; // già girata dal Flip
        const da = nuova === 'defense' ? '-90deg' : '90deg';
        cardEl.animate([{ rotate: da }, { rotate: '0deg' }], { duration: 460, easing: 'cubic-bezier(.22,.7,.25,1)' });
        const rect = rettangolo(cardEl);
        if (rect) effimero('df-soffio', rect, 700);
    }

    // ================================================================
    // 5. Token che nasce
    // ================================================================
    function tokenNato(rect) {
        const fumo = effimero('df-fumo', rect, 1000);
        for (let i = 0; i < 7; i++) {
            const sbuffo = document.createElement('span');
            sbuffo.className = 'df-fumo-sbuffo';
            sbuffo.style.setProperty('--a', `${i * (360 / 7)}deg`);
            sbuffo.style.setProperty('--d', `${(i % 3) * 60}ms`);
            fumo.appendChild(sbuffo);
        }
    }

    // ================================================================
    // 6. Life Point critici
    // ================================================================
    function lpCritici() {
        const critico = (lp) => typeof lp === 'number' && lp > 0 && lp <= LP_CRITICI;
        const io = critico(gameState.playerLP);
        const lui = critico(gameState.botLP);
        const infoIo = document.getElementById('playerInfo');
        const infoLui = document.getElementById('botInfo');
        if (infoIo) infoIo.classList.toggle('df-lp-critici', io);
        if (infoLui) infoLui.classList.toggle('df-lp-critici', lui);
        // La vignetta solo per i PROPRI: è la tensione di chi sta per
        // perdere, non un'informazione sull'avversario.
        let vignetta = document.getElementById('dfVignetta');
        if (io && !vignetta) {
            vignetta = document.createElement('div');
            vignetta.id = 'dfVignetta';
            vignetta.className = 'df-vignetta';
            vignetta.setAttribute('aria-hidden', 'true');
            document.body.appendChild(vignetta);
        } else if (!io && vignetta) {
            vignetta.remove();
        }
    }

    // ================================================================
    // Aggancio agli eventi del motore
    // ================================================================
    function aggancia() {
        if (!window.EventiDuello || typeof EventiDuello.ascolta !== 'function') return false;
        EventiDuello.ascolta('attivazione-negata', attivazioneNegata);
        // Un duello nuovo: la fotografia di prima non c'entra più, o il
        // primo ridisegno "vedrebbe" sparire tutti i mostri della partita
        // precedente.
        EventiDuello.ascolta('partita-azzerata', () => { precedente = null; });
        return true;
    }
    if (!aggancia()) document.addEventListener('DOMContentLoaded', aggancia, { once: true });

    window.DuelFeedback = {
        sync: sync,
        // Esposti per i test e per chi volesse farli partire a mano.
        _variazioneStat: variazioneStat,
        _cartaBandita: cartaBandita,
        _attivazioneNegata: attivazioneNegata,
        _tokenNato: tokenNato
    };
})();
