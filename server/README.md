# Yu-Gi-Oh! Millennium Duel Arena — Multiplayer: guida rapida

## Perché serve un server?

Il Duello Demo (contro il Bot) e la Cartoteca funzionano semplicemente aprendo
i file `.html` nel browser, senza bisogno di nulla. Il **Multiplayer**, per
poter far dialogare in tempo reale due giocatori su computer diversi, ha
invece bisogno di un piccolo server che faccia da "postino" tra i due client.

Quel server è `server/server.js`. **Non richiede alcuna installazione**:
è scritto usando solo moduli nativi di Node.js (nessun `npm install`).

## 1) Requisiti

- [Node.js](https://nodejs.org) versione 18 o superiore installato sul
  computer che farà da server (basta scaricarlo dal sito ufficiale).

## 2) Avvio in locale (per testare, o per giocare sulla stessa rete Wi-Fi)

Apri un terminale nella cartella `server/` e lancia:

```
node server.js
```

Vedrai:

```
🎴 Server Millennium Duel Arena in ascolto sulla porta 8787
   WebSocket endpoint: ws://<indirizzo-server>:8787
```

- Se giochi **sullo stesso computer** (due schede del browser), nella lobby
  del gioco lascia l'indirizzo di default `ws://localhost:8787`.
- Se giochi con un amico **sulla stessa rete Wi-Fi/LAN**, trova l'indirizzo
  IP locale del computer che fa da server (es. `192.168.1.23`) e nella lobby
  inserite entrambi `ws://192.168.1.23:8787`. Puoi cambiare la porta con
  `PORT=3000 node server.js` se serve.

## 3) Giocare via Internet con un amico lontano

Il relay ufficiale gira su Render ed è definito da `render.yaml`. Ogni push
su `main` ridistribuisce automaticamente il servizio
`millennium-duel-arena-relay`:

```text
https://millennium-duel-arena-relay.onrender.com
wss://millennium-duel-arena-relay.onrender.com
```

Il primo indirizzo risponde *"Server di Stanze attivo"*; il secondo è già il
valore predefinito di `#mpServerUrl` in `multiplayer.html`. Per creare un relay
separato si può collegare il repository privato a un altro servizio Node con
supporto WebSocket e avviare `node server.js`.

In alternativa, se preferisci restare in locale, puoi usare un tunnel come
**ngrok** o **Cloudflare Tunnel** per esporre temporaneamente la porta 8787
del tuo computer con un indirizzo pubblico, senza dover "deployare" nulla.

## 4) Come si gioca

1. Apri `index.html` → **Multiplayer**.
2. Un giocatore clicca **Crea Stanza**: ottiene un codice di 5 caratteri.
3. Lo condivide con l'avversario (chat, messaggio, voce...).
4. L'altro giocatore va su **Entra in una Stanza**, inserisce il codice e
   clicca **Entra**.
5. Entrambi scelgono il mazzo e si dichiarano pronti. La morra cinese decide
   chi sceglie il primo giocatore; soltanto dopo parte il duello.

Durante la partita entrambi i client eseguono lo stesso motore con mazzi e
seme condivisi. Viaggiano soltanto comandi e decisioni numerati, in lotti:
è il protocollo a passo comune versione 2. Il protocollo precedente basato
su mosse raccontate e fotografie dello stato è stato rimosso.

## 5) Riconnessione automatica e anti-desync (Multiplayer Avanzato)

- Se la connessione cade MA la scheda del browser resta aperta (Wi-Fi che
  sfarfalla, laptop in sospensione, cambio rete), il gioco prova da solo a
  riconnettersi (qualche tentativo, con attesa crescente) e torna nella
  STESSA stanza — l'avversario vede solo un breve avviso "in attesa che
  torni", non l'interruzione della partita. I lotti numerati permettono di
  richiedere i passi mancanti e riprendere nello stesso ordine.
- Ogni comando porta un riassunto dello stato del mittente. Se le due copie
  divergono, il gioco si ferma esplicitamente: non esiste più una fotografia
  legacy capace di sovrascrivere e nascondere una divergenza.
- Limite dichiarato: questo copre la connessione che cade e torna, NON la
  chiusura vera della scheda/il riavvio del browser — a quel punto lo stato
  locale del giocatore è perso e la partita non è recuperabile (il server
  non salva mai la partita in sé, solo chi è in quale stanza).

## 6) Altri limiti di questa versione

- Le stanze inutilizzate scadono automaticamente dopo 30 minuti; un
  giocatore disconnesso viene rimosso definitivamente (e l'avversario
  avvisato) dopo 45 secondi senza che si sia riconnesso.
- Il server tiene tutto in memoria (nessun database): se lo riavvii, tutte
  le stanze attive vengono perse.
- Il server controlla solo che i messaggi abbiano una forma valida (e
  limita quanti messaggi al secondo accetta da ciascun client) — non
  verifica che una mossa rispetti davvero le regole del duello: quella
  logica vive tutta nel client (vedi `js/engine/duel-engine.js`), il server resta
  un postino.
