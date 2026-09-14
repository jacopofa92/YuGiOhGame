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
con un indirizzo pubblico. Nel repository c'è già tutto il necessario:
**`render.yaml`**, il "blueprint" che configura il servizio da sé.

1. Vai su [render.com](https://render.com) e registrati con GitHub.
2. **New → Blueprint**, scegli il repository `YuGiOhGame`, poi **Apply**.
   Render legge `render.yaml` e crea il servizio senza altre domande.
3. Il servizio nasce su `https://<nome>.onrender.com`. Aprendolo nel browser
   deve rispondere *"Server di Stanze attivo"*: è la conferma che è vivo.
4. Quell'indirizzo, scritto con `wss://` al posto di `https://`, è quello da
   usare nella lobby. È già il valore predefinito del campo "Indirizzo del
   server" — **va cambiato solo se Render ha assegnato un nome diverso**
   (succede se quel nome era già preso da qualcun altro): in quel caso
   aggiorna il `value` dell'input `mpServerUrl` in `multiplayer.html`.

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
