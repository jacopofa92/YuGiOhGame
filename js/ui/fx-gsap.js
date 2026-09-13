/**
 * fx-gsap.js — Backend di animazione basato su GSAP (js/vendor/gsap.min.js).
 * =====================================================================
 * E' un PLUGIN, nel senso pieno del termine: rimpiazza alcune animazioni
 * di js/ui/effects.js con una versione a timeline, e nient'altro nel
 * progetto sa che esiste.
 *
 *   - Per SPEGNERLO senza toccare il codice: window.FX_BACKEND = 'css'.
 *   - Per RIMUOVERLO del tutto: cancellare questo file e il suo <script>.
 *     Il gioco torna esattamente alle animazioni CSS di base, senza che
 *     serva modificare una riga altrove.
 *   - Per FORZARLO anche se un altro backend venisse registrato dopo:
 *     window.FX_BACKEND = 'gsap'.
 *
 * PERCHE' GSAP E NON PIXI. Il campo di duello e' fatto di elementi DOM
 * (le carte sono nodi, non sprite): GSAP anima il DOM, ed e' esattamente
 * il lavoro che serve qui. PixiJS e' un renderer WebGL su canvas — puo'
 * solo stare sopra o sotto le carte, mai intrecciarsi con loro, e le
 * particelle di effects.js girano gia' su un canvas 2D che funziona.
 * Per i colpi di scena a schermo intero c'e' gia' FX.playVideoOverlay
 * (filmati pre-renderizzati), che costa meno e rende di piu'.
 *
 * COSA AGGIUNGE DAVVERO rispetto alle versioni CSS, che restano buone:
 * sequenze vere. Le animazioni di base sono catene di setTimeout e toggle
 * di classi, dove ogni ritardo e' un numero scritto a mano da tenere
 * allineato al CSS; qui una timeline descrive l'intera sequenza in un
 * punto solo, con easing che il CSS non ha (elastic, back) e la
 * possibilita' di interromperla pulita.
 *
 * DIPENDENZA PIGRA: gsap.min.js viene caricato dopo l'evento 'load' (vedi
 * duelMonstersCore.html), quindi al momento in cui questo file gira la
 * libreria di solito NON c'e' ancora. Non e' un problema: il backend si
 * registra comunque dichiarando `requires: ['gsap']`, e la facciata FX lo
 * considera attivo solo quando quel globale esiste davvero. L'unica
 * accortezza e' richiamare FX.refreshBackend() quando la libreria
 * atterra, cosa che facciamo in fondo a questo file.
 *
 * NOTA SUL RISPETTO DELL'UTENTE: prefers-reduced-motion e' gestito una
 * volta sola dalla facciata (js/ui/effects.js), che in quel caso non
 * chiama affatto il backend. Qui dentro non serve ricontrollarlo.
 */
(function () {
    'use strict';

    if (!window.FX || typeof FX.registerBackend !== 'function') {
        // effects.js non caricato (o versione precedente al sistema a
        // backend): questo file non ha nulla a cui agganciarsi.
        return;
    }

    /** Centro di un elemento in coordinate di viewport — gemella di quella in effects.js, che non e' esposta. */
    function centerOf(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
    }

    /**
     * Un elemento usa-e-getta posizionato a schermo, rimosso da solo.
     * Gli effetti di base fanno lo stesso con spawnDomFx(), che pero' e'
     * interna a effects.js: qui serve una versione propria, minima.
     */
    function fxLayer(className, x, y, w, h) {
        const el = document.createElement('div');
        el.className = className;
        el.style.position = 'fixed';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        if (w !== undefined) el.style.width = w + 'px';
        if (h !== undefined) el.style.height = h + 'px';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '9998';
        document.body.appendChild(el);
        return el;
    }

    const impls = {
        /**
         * Evocazione: la carta "atterra" invece di limitarsi ad accendersi.
         * back.out da' il piccolo rimbalzo che il CSS non sa fare senza
         * keyframe scritti a mano, e l'anello d'urto parte in contemporanea
         * invece che a un setTimeout indovinato.
         */
        playSummonShockwave: function (monsterElement) {
            if (!monsterElement) return;
            const c = centerOf(monsterElement);

            const ring = fxLayer('fx-gsap-ring', c.x, c.y);
            gsap.set(ring, { xPercent: -50, yPercent: -50, width: 40, height: 40, borderRadius: '50%', border: '3px solid #ffdf8c', opacity: 0.9 });
            gsap.to(ring, {
                width: Math.max(monsterElement.offsetWidth * 3.2, 180),
                height: Math.max(monsterElement.offsetWidth * 3.2, 180),
                opacity: 0,
                duration: 0.7,
                ease: 'power2.out',
                onComplete: () => ring.remove()
            });

            gsap.timeline()
                .fromTo(monsterElement,
                    { scale: 0.72, y: -26, filter: 'brightness(2.2)' },
                    { scale: 1, y: 0, filter: 'brightness(1)', duration: 0.55, ease: 'back.out(2.2)' })
                .to(monsterElement, { clearProps: 'transform,filter', duration: 0 });

            if (typeof FX.spawnParticles === 'function') {
                FX.spawnParticles(c.x, c.y, { count: 26, speed: 5, life: 700, size: 3, spread: 360, gravity: 0.04 });
            }
        },

        /**
         * Danno ai Life Points: scossa con smorzamento vero al posto della
         * classe .fx-shake a durata fissa. Il colpo parte forte e si
         * spegne, invece di vibrare uguale per 450ms.
         */
        playDamageEffect: function (amount, opts) {
            const container = document.querySelector('.game-container') || document.body;
            const forza = Math.min(18, 6 + (Number(amount) || 0) / 260);

            gsap.timeline()
                .to(container, { x: -forza, duration: 0.05, ease: 'none' })
                .to(container, { x: forza * 0.8, duration: 0.06 })
                .to(container, { x: -forza * 0.5, duration: 0.06 })
                .to(container, { x: forza * 0.25, duration: 0.06 })
                .to(container, { x: 0, duration: 0.08, ease: 'power2.out', clearProps: 'transform' });

            const vignetta = fxLayer('fx-gsap-vignette', 0, 0, window.innerWidth, window.innerHeight);
            gsap.set(vignetta, { background: 'radial-gradient(circle, rgba(255,0,0,0) 45%, rgba(255,0,0,0.55) 100%)', opacity: 0 });
            gsap.to(vignetta, {
                opacity: 1, duration: 0.12, ease: 'power2.out',
                onComplete: () => gsap.to(vignetta, { opacity: 0, duration: 0.42, onComplete: () => vignetta.remove() })
            });

            // Il numero che sale: la parte che i giocatori guardano davvero,
            // e che l'animazione di base non ha affatto. `anchorEl` e' il
            // nome che usa gia' il chiamante (vedi playDamageEffect in
            // js/ui/effects.js); senza, si mette al centro dello schermo.
            const target = (opts && opts.anchorEl) || null;
            const p = target ? centerOf(target) : { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
            const testo = fxLayer('fx-gsap-damage-number', p.x, p.y);
            testo.textContent = '-' + (Number(amount) || 0);
            gsap.set(testo, {
                xPercent: -50, yPercent: -50,
                color: '#ff5b5b', fontWeight: 900, fontSize: 'clamp(1.6rem, 5vw, 3rem)',
                textShadow: '0 0 12px rgba(255,0,0,0.8), 0 2px 6px rgba(0,0,0,0.9)',
                scale: 0.4, opacity: 0
            });
            gsap.timeline({ onComplete: () => testo.remove() })
                .to(testo, { scale: 1.15, opacity: 1, duration: 0.22, ease: 'back.out(3)' })
                .to(testo, { scale: 1, duration: 0.1 })
                .to(testo, { y: '-=42', opacity: 0, duration: 0.5, ease: 'power1.in' }, '+=0.25');
        },

        /**
         * Tributo: la carta viene risucchiata verso l'alto e sbriciolata,
         * invece di sfumare sul posto. Il senso e' "questa carta se ne va
         * per farne arrivare un'altra", e si vede.
         */
        playTributeSacrifice: function (cardElement) {
            if (!cardElement) return;
            const c = centerOf(cardElement);

            gsap.timeline()
                .to(cardElement, { scale: 1.12, filter: 'brightness(1.8)', duration: 0.16, ease: 'power2.out' })
                .to(cardElement, { scale: 0.1, y: -70, rotation: 12, opacity: 0, duration: 0.5, ease: 'power2.in' })
                .to(cardElement, { clearProps: 'transform,filter,opacity', duration: 0 });

            if (typeof FX.spawnParticles === 'function') {
                FX.spawnParticles(c.x, c.y, {
                    count: 34, speed: 6, life: 900, size: 3, spread: 120, baseAngle: -90,
                    gravity: -0.03, colors: ['#ffdf8c', '#f39c12', '#ffffff']
                });
            }
        },

        /**
         * Scontro in battaglia: i due mostri si vanno addosso e il lampo
         * scoppia nel punto d'impatto. Nella versione di base attaccante e
         * bersaglio non si muovono affatto — qui la carica c'e' davvero, ed
         * e' la ragione principale per cui vale la pena di una timeline.
         */
        playBattleClashEpic: function (attackerEl, targetEl) {
            const a = attackerEl ? centerOf(attackerEl) : null;
            const t = targetEl ? centerOf(targetEl) : null;
            const point = t || a;
            if (!point) return;
            const midX = a && t ? (a.x + t.x) / 2 : point.x;
            const midY = a && t ? (a.y + t.y) / 2 : point.y;

            const tl = gsap.timeline();

            if (attackerEl && a && t) {
                // Rincula, poi carica verso il bersaglio fermandosi a meta'.
                const dx = (t.x - a.x) * 0.42;
                const dy = (t.y - a.y) * 0.42;
                tl.to(attackerEl, { x: -dx * 0.22, y: -dy * 0.22, duration: 0.14, ease: 'power2.out' })
                  .to(attackerEl, { x: dx, y: dy, duration: 0.16, ease: 'power3.in' })
                  .to(attackerEl, { x: 0, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'transform' }, '+=0.05');
            }

            const lampo = fxLayer('fx-gsap-clash', midX, midY);
            gsap.set(lampo, {
                xPercent: -50, yPercent: -50, width: 30, height: 30, borderRadius: '50%',
                background: 'radial-gradient(circle, #ffffff 0%, #ffdf8c 45%, rgba(243,156,18,0) 70%)',
                opacity: 0
            });
            tl.to(lampo, { opacity: 1, width: 220, height: 220, duration: 0.16, ease: 'power3.out' }, a && t ? 0.3 : 0)
              .to(lampo, { opacity: 0, width: 300, height: 300, duration: 0.3, ease: 'power2.out', onComplete: () => lampo.remove() });

            if (targetEl) {
                tl.to(targetEl, { x: 6, duration: 0.05, repeat: 5, yoyo: true, clearProps: 'transform' }, a && t ? 0.32 : 0.02);
            }

            if (typeof FX.spawnParticles === 'function') {
                setTimeout(() => {
                    FX.spawnParticles(midX, midY, { count: 46, speed: 9, life: 800, size: 4, spread: 360, gravity: 0.05 });
                }, a && t ? 300 : 0);
            }
        }
    };

    FX.registerBackend('gsap', { requires: ['gsap'], impls: impls });

    // gsap.min.js arriva DOPO l'evento 'load' (caricamento pigro): al
    // momento della registrazione qui sopra il globale non esiste ancora,
    // quindi la facciata ha appena concluso che il backend non e'
    // utilizzabile. Va rivalutato quando la libreria atterra davvero —
    // niente polling: si guarda al primo frame utile dopo il 'load' e si
    // riprova qualche volta a intervalli crescenti, poi si lascia perdere.
    (function attendiGsap() {
        let tentativi = 0;
        function riprova() {
            if (window.gsap) { FX.refreshBackend(); return; }
            if (++tentativi > 12) return; // ~10s: se non e' arrivata, non arrivera'
            setTimeout(riprova, 200 * tentativi);
        }
        if (document.readyState === 'complete') riprova();
        else window.addEventListener('load', riprova, { once: true });
    })();
})();
