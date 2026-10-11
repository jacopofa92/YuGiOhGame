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

Per essere raggiungibile da fuori casa, il server deve girare su una macchina
con un indirizzo pubblico. Nel repository c'è già tutto il necessario:
**`render.yaml`**, il "blueprint" che configura il servizio da sé.

1. Vai su [render.com](https://render.com) e registrati con GitHub.
2. **New → Blueprint**, scegli il repository privato
   `jacopofa92/millennium-duel-arena`, poi **Apply**.
   Render legge `render.yaml` e crea il servizio senza altre domande.
3. `render.yaml` crea il servizio `millennium-duel-arena-relay`. Aprendo
   `https://millennium-duel-arena-relay.onrender.com` nel browser deve
   comparire *"Server di Stanze attivo"*: è la conferma che è vivo.
4. La lobby usa già
   `wss://millennium-duel-arena-relay.onrender.com`. Se il nome del servizio
   cambia, aggiornare anche `#mpServerUrl` in `multiplayer.html`.

Da quel momento né tu né i tuoi amici dovete più toccare nulla: la lobby
punta già al server pubblico.

**Il limite del piano gratuito, da conoscere**: dopo 15 minuti senza traffico
l'istanza viene sospesa, e alla richiesta successiva impiega **circa un
minuto** a tornare su. Durante una partita non succede mai (i messaggi del
duello sono traffico), ma la prima connessione dopo una pausa lunga aspetta.
Il gioco è attrezzato per questo: insiste invece di arrendersi al primo
tentativo, e la lobby dice esplicitamente che il server si sta svegliando.
Se un giorno quell'attesa diventasse fastidiosa, l'unico vero rimedio è un
piano a pagamento (l'istanza resta sempre accesa) oppure riscrivere il relay
per una piattaforma che non sospende nulla, come Cloudflare Workers con i
Durable Objects.

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
seme condivisi. In rete viaggiano soltanto comandi e decisioni numerati; non
viaggiano fotografie del campo o vecchie "mosse raccontate". Questo è il
protocollo a passo comune versione 2.

## 5) Riconnessione e limiti

- Se la linea cade mentre la scheda resta aperta, il client tenta la
  riconnessione automatica e rientra nella stessa stanza entro la finestra
  di grazia di 45 secondi. I lotti numerati permettono di riprendere dal
  primo passo mancante.
- Chiudere davvero la scheda o riavviare il browser perde invece lo stato
  locale della partita: il relay non salva un duello completo.
- Le stanze inutilizzate scadono dopo 30 minuti. Se il relay viene riavviato,
  le stanze in memoria vanno perse.
- Il server valida forma, dimensione e frequenza dei messaggi, ma non è un
  arbitro delle regole: entrambi i client possiedono in memoria anche mazzo
  e mano avversari. Per un competitivo anti-cheat servirebbe un motore
  autorevole sul server.
