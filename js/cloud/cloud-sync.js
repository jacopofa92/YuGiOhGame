/**
 * cloud-sync.js — Autenticazione (con approvazione admin, replica dello
 * stesso meccanismo del progetto "Fioxify" — stesso autore) e
 * sincronizzazione del salvataggio giocatore (js/save-manager.js) e
 * delle carte custom (js/data/custom-cards.js) via Supabase.
 * =====================================================================
 * Se js/cloud/supabase-config.js non è compilato (o il client
 * js/vendor/supabase.min.js non è caricato), window.CloudSync esiste
 * comunque ma con `available: false` e ogni funzione torna una Promise
 * rifiutata con un messaggio chiaro. CARICATO DA OGNI PAGINA del gioco
 * (js/cloud/auth-gate.js lo usa per decidere se mostrare la pagina o
 * rimandare al login — vedi lì), non più solo da profilo.html/index.html
 * come quando la sincronizzazione era puramente facoltativa: l'accesso
 * con un account approvato è ora OBBLIGATORIO per giocare (decisione
 * esplicita dell'utente, non più "continua in locale").
 *
 * Modello dati: vedi supabase/schema.sql.
 *   - public.profiles: una riga per utente (creata da sola alla
 *     registrazione), status ('pending'/'approved'/'rejected') + is_admin
 *     — signIn nega l'accesso finché lo status non è 'approved' (o
 *     is_admin), ensureApprovedSession() è il controllo usato da
 *     auth-gate.js ad ogni caricamento pagina (funziona anche offline
 *     dopo un primo accesso online riuscito, vedi il commento lì).
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
    // Stato di approvazione del profilo (public.profiles — vedi
    // supabase/schema.sql, sezione "APPROVAZIONE ADMIN", replica dello
    // stesso meccanismo del progetto Fioxify) — { status, is_admin } o
    // null finché non ancora noto. Aggiornato da refreshProfile() più
    // sotto, MAI letto direttamente dal chiamante: usa isApproved()/
    // isAdmin()/getProfile().
    let cachedProfile = null;
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

    // Chiave localStorage per l'ultimo stato di approvazione CONFERMATO
    // online per un dato utente — NON una cache HTTP/Service-Worker, ma
    // un marcatore esplicito legato all'uid, usato SOLO da
    // ensureApprovedSession() più sotto per restare utilizzabile offline
    // (es. l'APK dopo il primo accesso online, vedi il commento lì) senza
    // dover fingere che "loggato" implichi "approvato" — un utente il cui
    // account viene rifiutato/revocato DOPO il primo accesso resta
    // bloccato al prossimo controllo online, non per sempre offline.
    const APPROVED_UID_KEY = 'ygoApprovedUserId';
    function rememberApproved(userId) {
        try { localStorage.setItem(APPROVED_UID_KEY, userId); } catch (e) { /* noop */ }
    }
    function forgetApproved() {
        try { localStorage.removeItem(APPROVED_UID_KEY); } catch (e) { /* noop */ }
    }
    function wasApprovedOffline(userId) {
        try { return localStorage.getItem(APPROVED_UID_KEY) === userId; } catch (e) { return false; }
    }

    /** Interroga public.profiles per l'utente `userId` — status 'pending' di default se la riga non esiste ancora o la query fallisce (es. offline: vedi ensureApprovedSession, che non passa mai da qui per il percorso offline). */
    function fetchProfile(userId) {
        return client.from('profiles').select('status, is_admin').eq('id', userId).single()
            .then(({ data, error }) => {
                if (error) return { status: 'pending', is_admin: false };
                return data;
            });
    }

    // Promise risolta la PRIMA volta che la sessione persistita (se
    // esiste — sopravvive alla chiusura della pagina/app, vedi il
    // supabase-js sotto, che la tiene in localStorage per default) viene
    // davvero letta — a differenza di onAuthChange (che chiama subito il
    // suo ascoltatore con cachedUser, ma quello vale ANCORA null al primo
    // giro perché getSession() è asincrona), questa Promise è il modo
    // corretto per un chiamante come js/cloud/auth-gate.js di aspettare
    // lo stato VERO prima di decidere se rimandare al login — usata da
    // waitForUser() più sotto.
    let initialSessionPromise = Promise.resolve(null);

    if (available) {
        initialSessionPromise = client.auth.getSession().then(({ data }) => {
            cachedUser = (data && data.session && data.session.user) || null;
            notifyAuthListeners();
            return cachedUser;
        });
        client.auth.onAuthStateChange((event, session) => {
            cachedUser = (session && session.user) || null;
            if (!cachedUser) cachedProfile = null;
            if (event === 'PASSWORD_RECOVERY') {
                recoveryListeners.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });
            }
            notifyAuthListeners();
        });
    }

    function getUser() {
        return cachedUser;
    }

    /** Risolta con l'utente (o null) DOPO che la sessione persistita è stata davvero controllata almeno una volta — vedi il commento su initialSessionPromise qui sopra. */
    function waitForUser() {
        return initialSessionPromise;
    }

    /** Ultimo profilo noto ({status, is_admin}) dell'utente corrente, o null se non ancora caricato/nessun utente. */
    function getProfile() {
        return cachedProfile;
    }

    function isAdmin() {
        return !!(cachedProfile && cachedProfile.is_admin);
    }

    function isApproved() {
        return !!(cachedProfile && (cachedProfile.is_admin || cachedProfile.status === 'approved'));
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

    /**
     * Punto d'ingresso UNICO per ogni pagina del gioco (vedi
     * js/cloud/auth-gate.js, incluso in ogni pagina come js/ui/page-loader.js)
     * per sapere se l'utente corrente può usare il gioco ORA, gestendo da
     * sola sia il caso online sia quello offline:
     *   - Nessuna sessione Supabase (mai loggato, o sloggato) -> false,
     *     nessuna chiamata di rete.
     *   - Sessione presente: prova SEMPRE a riconfermare lo stato online
     *     (fetchProfile), così un account appena approvato/rifiutato da
     *     un admin si riflette al prossimo avvio con rete disponibile —
     *     mai un semplice "loggato quindi approvato" permanente.
     *   - Se la rete non risponde (rifiutata/andata in timeout): ricade
     *     sull'ultimo stato CONFERMATO online per QUESTO uid
     *     (wasApprovedOffline) — questo è il meccanismo che rende
     *     possibile "autenticati online al primo avvio, poi anche
     *     offline" per l'APK: non è una cache HTTP che scade da sola, è
     *     un marcatore esplicito per-utente aggiornato solo da una vera
     *     verifica online riuscita, mai da un semplice tentativo.
     * Torna sempre una Promise<boolean>, mai rifiutata.
     */
    function ensureApprovedSession() {
        if (!available) return Promise.resolve(false);
        if (!cachedUser) return Promise.resolve(false);
        const userId = cachedUser.id;
        return Promise.race([
            fetchProfile(userId),
            new Promise((resolve) => setTimeout(() => resolve(null), 6000))
        ]).then((profile) => {
            if (!profile) {
                // Rete assente/troppo lenta: nessuna risposta entro il
                // tetto d'attesa — ricade sull'ultimo stato confermato
                // offline invece di bloccare l'utente a tempo indeterminato.
                const approvedOffline = wasApprovedOffline(userId);
                if (approvedOffline) cachedProfile = cachedProfile || { status: 'approved', is_admin: false };
                return approvedOffline;
            }
            cachedProfile = profile;
            const approved = !!(profile.is_admin || profile.status === 'approved');
            if (approved) rememberApproved(userId);
            else forgetApproved();
            return approved;
        }).catch(() => wasApprovedOffline(userId));
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

    /**
     * Registra un nuovo account — replica lo stesso meccanismo del
     * progetto Fioxify: controlla PRIMA (RPC check_registration_email,
     * eseguibile anche da anon — vedi schema.sql) se l'email esiste già,
     * per un messaggio preciso invece del generico errore di Supabase
     * Auth. La riga in public.profiles nasce da sola in stato 'pending'
     * (trigger handle_new_user, schema.sql) — questa funzione fa SEMPRE
     * signOut subito dopo: niente sessione attiva finché un admin non
     * approva dal pannello Admin (admin.html), l'utente resta sulla
     * schermata di login con un messaggio "in attesa di approvazione".
     */
    function signUp(email, password) {
        if (!available) return rejectUnavailable();
        return client.rpc('check_registration_email', { check_email: email }).then(({ data: existingStatus }) => {
            if (existingStatus) {
                const messages = {
                    pending: 'Esiste già una registrazione in attesa di approvazione con questa email.',
                    approved: 'Esiste già un account con questa email. Prova ad accedere o usa "Password dimenticata?".',
                    rejected: 'La registrazione con questa email non è stata approvata. Contatta l\'amministratore.'
                };
                throw new Error(messages[existingStatus] || 'Email già registrata.');
            }
            return client.auth.signUp({ email, password }).then(({ error }) => {
                if (error) throw error;
                rememberEmail(email);
                return client.auth.signOut().then(() => undefined);
            });
        });
    }

    /**
     * Accede con email+password — a differenza di un semplice
     * signInWithPassword, verifica SUBITO lo stato di approvazione del
     * profilo (public.profiles) e nega l'accesso (con signOut immediato,
     * nessuna sessione "a metà" in giro) se l'account non è ancora stato
     * approvato da un admin o è stato rifiutato — stesso comportamento
     * del progetto Fioxify.
     */
    function signIn(email, password) {
        if (!available) return rejectUnavailable();
        return client.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
            if (error) throw error;
            return fetchProfile(data.user.id).then((profile) => {
                cachedProfile = profile;
                const approved = !!(profile.is_admin || profile.status === 'approved');
                if (!approved) {
                    forgetApproved();
                    return client.auth.signOut().then(() => {
                        throw new Error(
                            profile.status === 'rejected'
                                ? 'La tua registrazione non è stata approvata.'
                                : 'Il tuo account è in attesa di approvazione da parte di un amministratore.'
                        );
                    });
                }
                rememberApproved(data.user.id);
                rememberEmail(email);
                return data.user;
            });
        });
    }

    function signOut() {
        if (!available) return rejectUnavailable();
        return client.auth.signOut().then(({ error }) => { if (error) throw error; });
    }

    // ------------------------------------------------------------------
    // ADMIN — pannello di approvazione (admin.html), accessibile solo a
    // chi ha is_admin=true (le policy RLS in schema.sql rifiutano queste
    // query per chiunque altro, questa è solo la comodità lato client).
    // ------------------------------------------------------------------

    /** Elenco completo di tutti i profili (in attesa + già decisi), più recenti prima — per il pannello Admin. */
    function adminListProfiles() {
        if (!available) return rejectUnavailable();
        return client.from('profiles').select('id, email, status, is_admin, created_at')
            .order('created_at', { ascending: false })
            .then(({ data, error }) => { if (error) throw error; return data; });
    }

    /** Approva/rifiuta un account (status: 'approved' | 'rejected' | 'pending'). */
    function adminSetProfileStatus(userId, status) {
        if (!available) return rejectUnavailable();
        return client.from('profiles').update({ status }).eq('id', userId)
            .then(({ error }) => { if (error) throw error; });
    }

    /** Conteggio delle registrazioni in attesa — per il badge del pannello Admin. */
    function adminPendingCount() {
        if (!available) return rejectUnavailable();
        return client.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending')
            .then(({ count, error }) => { if (error) throw error; return count || 0; });
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
        forgetApproved();
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
        waitForUser: waitForUser,
        getProfile: getProfile,
        isAdmin: isAdmin,
        isApproved: isApproved,
        ensureApprovedSession: ensureApprovedSession,
        onAuthChange: onAuthChange,
        onPasswordRecovery: onPasswordRecovery,
        getRememberedEmail: getRememberedEmail,
        signUp: signUp,
        signIn: signIn,
        signOut: signOut,
        resetPassword: resetPassword,
        updatePassword: updatePassword,
        deleteAccount: deleteAccount,
        adminListProfiles: adminListProfiles,
        adminSetProfileStatus: adminSetProfileStatus,
        adminPendingCount: adminPendingCount,
        pushSave: pushSave,
        pullSave: pullSave,
        fetchCloudSave: fetchCloudSave,
        pushCustomCards: pushCustomCards,
        pullCustomCards: pullCustomCards,
        fetchCloudCustomCards: fetchCloudCustomCards
    };
})();
