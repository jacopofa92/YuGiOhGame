/**
 * Cerimonia per una carta GUADAGNATA (drop, Storia o Sfida).
 * Non decide né accredita nulla: visualizza un premio già persistito.
 * Una coda impedisce a due ricompense simultanee di sovrapporsi.
 */
(function () {
    'use strict';
    const STORAGE_KEY = 'duelArenaPendingCardDrops';
    // Prima di questo istante la carta sta ancora compiendo la rotazione
    // d'ingresso: permettere di chiudere il fondale produceva una cerimonia
    // troncata e, con premi in coda, due animazioni quasi sovrapposte.
    const REVEAL_TEXT_MS = 1650;
    const REVEAL_READY_MS = 2450;
    const queue = [];
    let active = false;

    function reducedMotion() {
        try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    }
    function cardById(id) {
        const db = typeof cardDatabase !== 'undefined' ? cardDatabase : (window.cardDatabase || []);
        return db.find((c) => c.id === Number(id)) || null;
    }
    function rarity(id) {
        if (window.CardRarity) return CardRarity.of(Number(id));
        if ([30, 31, 472].indexOf(Number(id)) !== -1) return 'mythic';
        if ([11, 41, 42, 43, 44, 246, 866, 867, 868, 869, 870].indexOf(Number(id)) !== -1) return 'secret';
        return 'legendary';
    }
    function label(r) {
        return window.CardRarity ? CardRarity.label(r) : ({ mythic: 'Mitica', secret: 'Segreta', legendary: 'Leggendaria' }[r] || r);
    }
    function make(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }
    function cardNode(entry) {
        const data = cardById(entry.cardId);
        if (data && typeof window.createCardElement === 'function') return window.createCardElement(data);
        const fallback = make('div', 'cdrop-fallback-card');
        const img = document.createElement('img');
        img.alt = entry.nome || 'Carta ottenuta';
        img.src = `images/cards/${entry.cardId}.jpg`;
        fallback.appendChild(img);
        fallback.appendChild(make('div', 'cdrop-fallback-name', entry.nome || `Carta #${entry.cardId}`));
        return fallback;
    }
    function particles(root, amount) {
        const layer = make('div', 'cdrop-particles');
        for (let i = 0; i < amount; i++) {
            const p = make('i', 'cdrop-particle');
            p.style.setProperty('--a', `${(360 / amount) * i + (i % 3) * 7}deg`);
            p.style.setProperty('--d', `${80 + (i * 37) % 190}px`);
            p.style.setProperty('--delay', `${(i % 7) * 35}ms`);
            p.style.setProperty('--size', `${2 + (i % 4)}px`);
            layer.appendChild(p);
        }
        root.appendChild(layer);
    }

    function showNext() {
        if (active || !queue.length || !document.body) return;
        active = true;
        const entry = queue.shift();
        const r = rarity(entry.cardId);
        const overlay = make('div', `cdrop-overlay cdrop-${r}`);
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', `Carta ottenuta: ${entry.nome || ''}`);

        const depth = make('div', 'cdrop-depth');
        depth.appendChild(make('div', 'cdrop-horizon'));
        depth.appendChild(make('div', 'cdrop-ring cdrop-ring-a'));
        depth.appendChild(make('div', 'cdrop-ring cdrop-ring-b'));
        depth.appendChild(make('div', 'cdrop-ring cdrop-ring-c'));
        overlay.appendChild(depth);
        // Poche particelle ben separate sono piu leggibili e molto meno
        // costose dei vecchi 42-72 punti, soprattutto nella WebView Android.
        particles(overlay, r === 'mythic' ? 36 : r === 'secret' ? 30 : 24);

        const content = make('div', 'cdrop-content');
        content.appendChild(make('div', 'cdrop-kicker', 'RICOMPENSA OTTENUTA'));
        const stage = make('div', 'cdrop-stage');
        const card = make('div', 'cdrop-card');
        card.appendChild(make('div', 'cdrop-card-back'));
        const face = make('div', 'cdrop-card-front');
        face.appendChild(cardNode(entry));
        card.appendChild(face);
        stage.appendChild(make('div', 'cdrop-beam'));
        stage.appendChild(card);
        content.appendChild(stage);
        content.appendChild(make('div', 'cdrop-name', entry.nome || `Carta #${entry.cardId}`));
        content.appendChild(make('div', 'cdrop-rarity', label(r)));
        if (entry.rule) content.appendChild(make('div', 'cdrop-rule', entry.rule));
        // La carta è già nel salvataggio: il pulsante chiude soltanto la
        // cerimonia, quindi non deve fingere di effettuare ora l'accredito.
        const button = make('button', 'cdrop-continue', 'Continua ›');
        button.type = 'button';
        button.disabled = !reducedMotion();
        button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
        content.appendChild(button);
        overlay.appendChild(content);
        document.body.appendChild(overlay);

        const close = () => {
            if (button.disabled) return;
            if (overlay.classList.contains('cdrop-leaving')) return;
            overlay.classList.add('cdrop-leaving');
            setTimeout(() => { overlay.remove(); active = false; showNext(); }, reducedMotion() ? 20 : 380);
        };
        button.onclick = close;
        requestAnimationFrame(() => overlay.classList.add('cdrop-visible'));
        if (window.NativeHaptics) NativeHaptics.success();
        if (window.SFX && typeof SFX.summon === 'function') SFX.summon('effect');
        if (reducedMotion()) {
            overlay.classList.add('cdrop-reduced', 'cdrop-revealed', 'cdrop-ready');
        } else {
            setTimeout(() => {
                if (overlay.isConnected && !overlay.classList.contains('cdrop-leaving')) {
                    overlay.classList.add('cdrop-revealed');
                }
            }, REVEAL_TEXT_MS);
            setTimeout(() => {
                if (!overlay.isConnected || overlay.classList.contains('cdrop-leaving')) return;
                button.disabled = false;
                button.setAttribute('aria-disabled', 'false');
                overlay.classList.add('cdrop-ready');
                button.focus({ preventScroll: true });
            }, REVEAL_READY_MS);
        }
    }

    function enqueue(entry) {
        if (!entry || !entry.cardId) return;
        queue.push(Object.assign({}, entry));
        showNext();
    }
    function persist(entry) {
        try {
            const values = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
            values.push(entry);
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        } catch (e) { /* Il premio è già nel save: si perde solo la cerimonia. */ }
    }
    function drain() {
        try {
            const values = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
            sessionStorage.removeItem(STORAGE_KEY);
            values.forEach(enqueue);
        } catch (e) { /* noop */ }
    }

    window.CardDropAnimation = { enqueue, persist, drain };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', drain);
    else drain();
})();
