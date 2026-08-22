# Sincronizzazione Cloud (Supabase) — setup

Facoltativa: senza questi passaggi il gioco resta interamente giocabile offline, come sempre. Questi passaggi attivano, in Profilo → ☁️ Account Cloud, la sincronizzazione cross-device del salvataggio (nome, mazzi, record, valute) e delle carte create con il Card Maker.

## 1) Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com), crea un account (gratuito) e un nuovo progetto.
2. Aspetta che il progetto finisca di provisionarsi (1-2 minuti).

## 2) Crea le tabelle

1. Nella dashboard del progetto, apri **SQL Editor** → **New query**.
2. Incolla tutto il contenuto di [`schema.sql`](schema.sql) (in questa stessa cartella) e premi **Run**.
3. Verifica in **Table Editor** che siano comparse due tabelle: `saves` e `custom_cards`, entrambe con "RLS enabled".

## 3) Copia le credenziali

1. **Project Settings** (icona ingranaggio) → **API**.
2. Copia **Project URL** e la chiave **anon public** (MAI la `service_role`, che ha accesso pieno a tutto e non deve mai finire nel codice del browser).

## 4) Compila `js/cloud/supabase-config.js`

Apri `js/cloud/supabase-config.js` nel progetto e incolla i due valori:

```js
window.SUPABASE_CONFIG = {
    url: 'https://tuoprogetto.supabase.co',
    anonKey: 'eyJ...'
};
```

Salva. Ricarica `profilo.html`: la sezione ☁️ Account Cloud ora mostra il modulo di accesso/registrazione invece del messaggio "non configurato".

## 5) (Facoltativo) Email di conferma

Per default Supabase richiede la conferma email alla registrazione. Per un progetto personale/di test puoi disattivarla in **Authentication** → **Providers** → **Email** → disattiva "Confirm email", così l'accesso funziona subito dopo la registrazione senza dover controllare la posta.

## Come funziona in gioco

- **Registrati/Accedi**: crea un account o accedi con uno esistente.
- Al primo accesso su un dispositivo, se esiste già un salvataggio sul cloud, il gioco chiede se usare quello (sovrascrive il locale) o mantenere quello locale (lo carica sul cloud, sovrascrivendo quello online) — mai una sovrascrittura silenziosa.
- **⬆️ Carica su Cloud** / **⬇️ Scarica da Cloud**: sincronizzazione manuale in qualunque momento, per tenere allineati due dispositivi.

## Limiti onesti di questa prima versione

- Sincronizzazione a "sostituzione completa", non un vero merge: se giochi su due dispositivi contemporaneamente senza sincronizzare, l'ultimo che carica vince — non c'è unione intelligente dei progressi.
- Le immagini delle carte custom restano incorporate come base64 dentro la riga `custom_cards.card` (stesso formato di oggi in localStorage), non in Supabase Storage — funziona, ma per molte carte con immagini pesanti converrebbe migrare a Storage in futuro.
- Il Multiplayer (`server/server.js`) resta separato, non tocca Supabase — deliberatamente lasciato fuori da questa fase.
