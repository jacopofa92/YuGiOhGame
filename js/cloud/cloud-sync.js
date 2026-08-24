/**
 * cloud-sync.js — Sincronizzazione CLOUD OPZIONALE (Supabase) del
 * salvataggio giocatore (js/save-manager.js) e delle carte custom
 * (js/data/custom-cards.js).
 * =====================================================================
 * "Opzionale" sul serio: se js/cloud/supabase-config.js non è compilato (o il
 * client js/vendor/supabase.min.js non è caricato), window.CloudSync
 * esiste comunque ma con `available: false` e ogni funzione torna una
 * Promise rifiutata con un messaggio chiaro — chi chiama (profilo.html)
 * mostra semplicemente la sezione "Account Cloud" come non configurata,
 * e il resto del gioco continua a funzionare esattamente come sempre in
 * locale. Nessuna pagina diversa da profilo.html DEVE caricare questo
 * file: la sincronizzazione è un'azione volontaria dell'utente, mai
 * automatica in sottofondo su altre pagine.
 *
 * Modello dati: vedi supabase/schema.sql.
 *   - public.saves: una riga per utente, colonna `data` jsonb = ESATTAMENTE
 *     l'oggetto di SaveManager.load() (nome, deck, deck attivo, record,
 *     valute, pacchetti posseduti).
 *   - public.custom_cards: una riga per CARTA custom (non un blob unico),
 *     colonna `card` jsonb = un elemento di CustomCards.list().
 * Sincronizzazione a "sostituzione completa" (non merge/diff campo per
 * campo): push scrive lo stato locale sopra quello cloud, pull scrive
 * quello cloud sopra quello locale — semplice e prevedibile, il prezzo è
 * che va SEMPRE l'utente a scegliere quale dei due tenere quando
 * entrambi esistono già (vedi profilo.html, che orchestra la scelta).
 */
(function () {
    'use strict';

    const config = window.SUPABASE_CONFIG || {};
    const hasConfig = !!(config.url && config.anonKey);
    const hasLib = typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function';
    const available = hasConfig && hasLib;

    const client = available ? window.supabase.createClient(config.url, config.anonKey) : null;

    const NOT_AVAILABLE_ERROR = new Error('Sincronizzazione cloud non configurata: vedi js/cloud/supabase-config.js.');
    function rejectUnavailable() {
        return Promise.reject(NOT_AVAILABLE_ERROR);
    }

    // ------------------------------------------------------------------
    // Autenticazione
    // ------------------------------------------------------------------
    let cachedUser = null;
    const authListeners = [];
    // Ascoltatori dell'evento 'PASSWORD_RECOVERY': separati da authListeners
    // sopra perché non è un cambio "loggato/sloggato" come gli altri, ma un
    // momento preciso e transitorio (l'utente ha appena cliccato il link
    // ricevuto via email) in cui chi ascolta deve mostrare "imposta una
    // nuova password", non il solito stato loggato/sloggato — vedi
    // resetPassword/updatePassword più sotto.
    const recoveryListeners = [];

    function notifyAuthListeners() {
        authListeners.forEach((fn) => { try { fn(cachedUser); } catch (e) { /* noop */ } });
    }

    if (available) {
        client.auth.getSession().then(({ data }) => {
            cachedUser = (data && data.session && data.session.user) || null;
            notifyAuthListeners();
        });
        client.auth.onAuthStateChange((event, session) => {
            cachedUser = (session && session.user) || null;
            if (event === 'PASSWORD_RECOVERY') {
                recoveryListeners.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });
            }
            notifyAuthListeners();
        });
    }

    function getUser() {
        return cachedUser;
    }

    /** Registra `fn(user|null)`, richiamata subito con lo stato attuale e poi ad ogni cambio di sessione (login/logout). */
    function onAuthChange(fn) {
        authListeners.push(fn);
        fn(cachedUser);
    }

    /** Registra `fn()`, richiamata quando l'utente arriva da un link di recupero password (vedi resetPassword più sotto) — non chiamata subito, solo se/quando succede davvero. */
    function onPasswordRecovery(fn) {
        recoveryListeners.push(fn);
    }

    // ------------------------------------------------------------------
    // "Ricorda email" — puramente locale (localStorage), NON legato
    // all'account/sessione: serve solo a precompilare il campo email dei
    // form di accesso la prossima volta che si apre il gioco su QUESTO
    // dispositivo, così non va ridigitata ad ogni accesso. Aggiornata da
    // signIn/signUp qui sotto ad ogni accesso/registrazione riuscita.
    // ------------------------------------------------------------------
    const LAST_EMAIL_KEY = 'ygoLastCloudEmail';
    function rememberEmail(email) {
        try { if (email) localStorage.setItem(LAST_EMAIL_KEY, email); } catch (e) { /* noop */ }
    }
    function getRememberedEmail() {
        try { return localStorage.getItem(LAST_EMAIL_KEY) || ''; } catch (e) { return ''; }
    }

    function signUp(email, password) {
        if (!available) return rejectUnavailable();
        return client.auth.signUp({ email, password }).then(({ data, error }) => {
            if (error) throw error;
            rememberEmail(email);
            return data.user;
        });
    }

    function signIn(email, password) {
        if (!available) return rejectUnavailable();
        return client.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
            if (error) throw error;
            rememberEmail(email);
            return data.user;
        });
    }

    function signOut() {
        if (!available) return rejectUnavailable();
        return client.auth.signOut().then(({ error }) => { if (error) throw error; });
    }

    /**
     * Invia l'email "reimposta la tua password" (gestita interamente da
     * Supabase Auth). Il link dentro porta l'utente su `redirectTo` con
     * una sessione temporanea di tipo 'recovery': onAuthStateChange qui
     * sopra la riconosce e avvisa chi ha chiamato onPasswordRecovery,
     * così index.html può mostrare "imposta una nuova password" invece
     * del solito gate Accedi/Registrati.
     */
    function resetPassword(email) {
        if (!available) return rejectUnavailable();
        if (!email) return Promise.reject(new Error('Inserisci la tua email per recuperare la password.'));
        const here = window.location.href.split('#')[0].replace(/[^/]*$/, '') + 'index.html';
        return client.auth.resetPasswordForEmail(email, { redirectTo: here }).then(({ error }) => { if (error) throw error; });
    }

    /** Imposta una NUOVA password per l'utente della sessione corrente — usata sia dal link "password dimenticata" (sessione 'recovery') sia, in teoria, da un cambio password volontario a sessione normale. */
    function updatePassword(newPassword) {
        if (!available) return rejectUnavailable();
        return client.auth.updateUser({ password: newPassword }).then(({ error }) => { if (error) throw error; });
    }

    /**
     * Cancella DEFINITIVAMENTE l'account cloud dell'utente loggato (righe in
     * saves/custom_cards comprese, via "on delete cascade" — vedi
     * supabase/schema.sql#delete_own_account). Non tocca il salvataggio
     * LOCALE: dopo la cancellazione il gioco resta giocabile offline con i
     * dati che c'erano già su questo dispositivo. Irreversibile: la
     * conferma "scrivi ELIMINA" vive in profilo.html, non qui.
     */
    function deleteAccount() {
        if (!available) return rejectUnavailable();
        if (!cachedUser) return Promise.reject(new Error('Devi accedere prima di eliminare l\'account.'));
        return client.rpc('delete_own_account').then(({ error }) => {
            if (error) throw error;
            return client.auth.signOut();
        });
    }

    // ------------------------------------------------------------------
    // Salvataggio (public.saves — una riga per utente)
    // ------------------------------------------------------------------
    function pushSave() {
        if (!available) return rejectUnavailable();
        if (!cachedUser) return Promise.reject(new Error('Devi accedere prima di sincronizzare.'));
        const data = window.SaveManager ? SaveManager.load() : null;
        if (!data) return Promise.reject(new Error('Nessun salvataggio locale da caricare.'));
        return client.from('saves')
            .upsert({ user_id: cachedUser.id, data, updated_at: new Date().toISOString() })
            .then(({ error }) => { if (error) throw error; return data; });
    }

    /** Scarica il salvataggio cloud SENZA applicarlo — usata da profilo.html per decidere se c'è un conflitto prima di sovrascrivere il locale. Torna null se l'utente non ha ancora nessun salvataggio sul cloud. */
    function fetchCloudSave() {
        if (!available) return rejectUnavailable();
        if (!cachedUser) return Promise.reject(new Error('Devi accedere prima di sincronizzare.'));
        return client.from('saves').select('data, updated_at').eq('user_id', cachedUser.id).maybeSingle()
            .then(({ data, error }) => {
                if (error) throw error;
                return data ? { data: data.data, updatedAt: data.updated_at } : null;
            });
    }

    /** Scarica il salvataggio cloud e lo applica come salvataggio locale attivo (sovrascrive il locale). */
    function pullSave() {
        return fetchCloudSave().then((cloud) => {
            if (!cloud) return null;
            if (!window.SaveManager) throw new Error('js/save-manager.js non caricato in questa pagina.');
            return SaveManager.applyExternalSave(cloud.data);
        });
    }

    // ------------------------------------------------------------------
    // Carte custom (public.custom_cards — una riga per carta)
    // ------------------------------------------------------------------
    function pushCustomCards() {
        if (!available) return rejectUnavailable();
        if (!cachedUser) return Promise.reject(new Error('Devi accedere prima di sincronizzare.'));
        if (!window.CustomCards) return Promise.reject(new Error('js/data/custom-cards.js non caricato in questa pagina.'));
        const cards = CustomCards.list();
        // Sostituzione completa: cancella tutte le righe di questo utente
        // e reinserisce lo stato locale attuale — evita la complessità di
        // far combaciare id locali (100000+) con gli id auto-generati di
        // Postgres ad ogni singola modifica.
        return client.from('custom_cards').delete().eq('user_id', cachedUser.id).then(({ error: delError }) => {
            if (delError) throw delError;
            if (cards.length === 0) return cards;
            const rows = cards.map((card) => ({ user_id: cachedUser.id, card }));
            return client.from('custom_cards').insert(rows).then(({ error }) => {
                if (error) throw error;
                return cards;
            });
        });
    }

    function fetchCloudCustomCards() {
        if (!available) return rejectUnavailable();
        if (!cachedUser) return Promise.reject(new Error('Devi accedere prima di sincronizzare.'));
        return client.from('custom_cards').select('card').eq('user_id', cachedUser.id)
            .then(({ data, error }) => {
                if (error) throw error;
                return (data || []).map((row) => row.card);
            });
    }

    function pullCustomCards() {
        return fetchCloudCustomCards().then((cards) => {
            if (!window.CustomCards) throw new Error('js/data/custom-cards.js non caricato in questa pagina.');
            CustomCards.replaceAll(cards);
            return cards;
        });
    }

    window.CloudSync = {
        available: available,
        getUser: getUser,
        onAuthChange: onAuthChange,
        onPasswordRecovery: onPasswordRecovery,
        getRememberedEmail: getRememberedEmail,
        signUp: signUp,
        signIn: signIn,
        signOut: signOut,
        resetPassword: resetPassword,
        updatePassword: updatePassword,
        deleteAccount: deleteAccount,
        pushSave: pushSave,
        pullSave: pullSave,
        fetchCloudSave: fetchCloudSave,
        pushCustomCards: pushCustomCards,
        pullCustomCards: pullCustomCards,
        fetchCloudCustomCards: fetchCloudCustomCards
    };
})();
