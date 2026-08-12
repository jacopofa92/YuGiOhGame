# Yu-Gi-Oh! Duel Arena — Multiplayer: guida rapida

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
🎴 Server Duel Arena in ascolto sulla porta 8787
   WebSocket endpoint: ws://<indirizzo-server>:8787
```

- Se giochi **sullo stesso computer** (due schede del browser), nella lobby
  del gioco lascia l'indirizzo di default `ws://localhost:8787`.
- Se giochi con un amico **sulla stessa rete Wi-Fi/LAN**, trova l'indirizzo
  IP locale del computer che fa da server (es. `192.168.1.23`) e nella lobby
  inserite entrambi `ws://192.168.1.23:8787`. Puoi cambiare la porta con
  `PORT=3000 node server.js` se serve.

## 3) Giocare via Internet con un amico lontano

Per essere raggiungibile da fuori casa, il server deve girare su una macchina
con un indirizzo pubblico. Il modo più semplice è usare un servizio di
hosting gratuito che supporti Node.js e i WebSocket, ad esempio:

- **Render.com** (piano gratuito "Web Service")
- **Railway.app**
- **Fly.io**
- **Glitch.com**

Passi generali (validi per la maggior parte di questi servizi):

1. Crea un account sul servizio scelto.
2. Crea un nuovo progetto/servizio e carica (o collega da GitHub) la cartella
   `server/` di questo progetto.
3. Come comando di avvio imposta: `node server.js`
4. Il servizio ti darà un indirizzo pubblico tipo `https://tuo-progetto.onrender.com`.
   Il WebSocket corrispondente sarà `wss://tuo-progetto.onrender.com`
   (nota: `wss://`, con la "s", perché questi servizi espongono HTTPS —
   il server supporta questo scenario perché la piattaforma di hosting fa da
   proxy TLS davanti al nostro server in chiaro).
5. Nella lobby del gioco (sia tu che il tuo amico), inserite quell'indirizzo
   `wss://...` al posto di `ws://localhost:8787`.

In alternativa, se preferisci restare in locale, puoi usare un tunnel come
**ngrok** o **Cloudflare Tunnel** per esporre temporaneamente la porta 8787
del tuo computer con un indirizzo pubblico, senza dover "deployare" nulla.

## 4) Come si gioca

1. Apri `index.html` → **Multiplayer**.
2. Un giocatore clicca **Crea Stanza**: ottiene un codice di 5 caratteri.
3. Lo condivide con l'avversario (chat, messaggio, voce...).
4. L'altro giocatore va su **Entra in una Stanza**, inserisce il codice e
   clicca **Entra**.
5. Appena entrambi sono connessi, il duello parte automaticamente. Chi ha
   creato la stanza gioca per primo.

Durante la partita: le tue mosse (evocazioni, tributi, cambi posizione,
magie/trappole, attacchi, cambi fase) vengono inviate in tempo reale
all'avversario, e viceversa — incluse le animazioni epiche già presenti nel
gioco (scontri, distruzioni, danni, Tributo, Battle Phase).

## 5) Limiti di questa prima versione

- Non c'è (ancora) riconnessione automatica in caso di caduta della linea:
  se un giocatore si disconnette, l'altro riceve un avviso a schermo e deve
  tornare al menu per iniziare una nuova partita.
- Le stanze inutilizzate scadono automaticamente dopo 30 minuti.
- Il server tiene tutto in memoria (nessun database): se lo riavvii, tutte
  le stanze attive vengono perse.
