# TODO

Lista di lavoro aggiornata al 9 ottobre 2026. Codex riprende il 14 ottobre.

## 1. Liberare spazio sul disco C: — subito

Il 9 ottobre il disco era a 0 GB liberi (poi circa 0,9 GB). Con così poco spazio
possono fallire git, i test, OneDrive e il lavoro di Codex.

- [ ] Pulizia disco di Windows, con "Pulisci file di sistema".
- [ ] Svuotare la cartella Download e il Cestino.
- [ ] OneDrive: impostare "File su richiesta" sulle cartelle che non servono offline.
- [ ] Obiettivo: almeno 15-20 GB liberi.

## 2. Test rossi su `main` — prima che riprenda l'audit dei duellanti

Falliscono su `main` anche senza il lavoro grafico e di sync del 9 ottobre
(verificato). Gli unici cambiamenti di quel giorno a carte, motore e IA sono i
commit dell'audit dei duellanti (Toon, Pegasus, Yami Yugi, audit della serie
principale).

- [ ] `duello-gemello` va in errore prima di finire. È il test che controlla che
      il Multiplayer a passo comune resti allineato: il più importante dei tre.
- [ ] `duello-senza-testa`: "la partita col bersaglio sparito prima del calcolo
      dei danni deve attraversare il caso e finire" — trovate 0.
- [ ] `guardrail-bersagli-dichiarati`: carte il cui effetto bersaglia un mostro
      senza passare dal checkpoint di targeting (fra le altre 492, 549, 632,
      747, 793, 820).
- [ ] Rimettere verdi tutti e tre prima di continuare l'audit.

## 3. Prove a mano sul telefono (APK) e sul PC

I test automatici coprono queste cose, ma alcune si giudicano solo dal vero.

- [ ] **Sync**: giocare sul desktop, aprire l'APK e controllare che arrivino i
      progressi (e viceversa).
- [ ] **Storie azzerate**: riaprendo il gioco le storie devono essere ripartite
      da zero, su entrambi i dispositivi. Carte, crediti, mazzi e Sfide restano.
- [ ] **Carte vive**: nell'APK aprire la scheda di una carta Super o Segreta e
      inclinare il telefono. Se l'effetto è troppo forte o debole, si regola con
      `GRADI_MASSIMI` in `js/ui/card-renderer.js`.
- [ ] **Profondità del menu**: provarla e spegnerla dalle Impostazioni.
- [ ] **Effetti del duello**: due duelli veri — scoprire un mostro coperto,
      metterne uno in Difesa, guardare ATK/DEF che cambiano, i Life Point sotto
      1000.
- [ ] **Editor Mappa**: "📂 Collega file" su `js/data/story-ritocchi.js` e
      modificare un nodo; poi commit e push del file.

## 4. Suite completa

- [ ] Lanciarla quando i test del punto 2 sono verdi e Codex ha chiuso il suo
      giro. Il 9 ottobre sono entrate molte modifiche ed è stata eseguita solo
      una parte mirata dei test.

## 5. Aperti, non urgenti

- [ ] `modalita-storia` e `storia-livelli`: la carta in premio "Spirit Message"
      copre il clic del test. Il gioco funziona; vanno chiusi i premi nel test.
- [ ] Strumenti di simulazione della Storia (`tools/simula-storia-deck.js`,
      `tools/audit-fattoriale-storia.js`): non leggono i ritocchi dell'Editor
      Mappa. Se si cambia un avversario dall'editor, le simulazioni non lo sanno.
- [ ] Azzeramento del profilo da un dispositivo: verificare dal vero che gli
      altri dispositivi non lo riportino in vita.
- [ ] Idea grafica rimasta fuori: le pile del Deck e del Cimitero con uno
      spessore vero.
- [ ] Cartelle rimaste in `.git/worktrees` bloccate dai permessi della sandbox
      di Codex: `git worktree prune` quando Codex non lavora.
