# Audit carte TCG mancanti di Yugi e Yami Yugi

Audit eseguito il 16 ottobre 2026 confrontando `data/cards.json` con le
liste TCG di Yugi pubblicate nel database ufficiale Yu-Gi-Oh! Neuron.

## Perimetro

- solo carte realmente pubblicate nel TCG;
- personaggi e strategie della serie originale `Duel Monsters`: questo non
  significa necessariamente carte appartenenti alle primissime espansioni
  TCG, perché diverse carte viste o associate a Yugi sono state stampate
  ufficialmente solo negli anni successivi;
- escluse le carte rimaste esclusivamente anime/manga;
- priorità alla riconoscibilità, alle combo complete e a effetti che
  aggiungono gioco reale, non alla completezza enciclopedica.

Fonti di confronto:

- Battle City: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=5c175322e786536dd4861dbc99b19f57&dno=8&request_locale=en
- mazzo Gadget/Duello Cerimoniale: https://www.db.yugioh-card.com/yugiohdb/member_deck.action?cgid=434cbafa736d94deff8ad8e5c556c350&dno=5&request_locale=en
- prodotto `Yugi's Legendary Decks`: https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&pid=18809001&request_locale=en&rp=99999
- Arcana Knight Joker e relativo nucleo: https://www.db.yugioh-card.com/yugiohdb/card_search.action?cid=6454&ope=2&request_locale=en

## Priorità A — lacune eccellenti da chiudere

| Gruppo | Carte mancanti | Perché |
|---|---|---|
| Guerrieri Magnetici | Gamma il Guerriero Magnetico; Valkyrion il Guerriero Magnetico | Alpha e Beta esistono già, ma la combo è oggi incompleta e non può raggiungere il proprio boss. |
| Cavalieri delle Figure | Cavaliere della Regina; Cavaliere del Re; Cavaliere di Jack; Cavaliere Arcano Joker | È un nucleo riconoscibile di Yugi. Il Re evoca Jack dal Deck e Joker è la Fusione TCG dei tre. |
| Yugi Muto finale | Gandora il Drago della Distruzione | Carta simbolo del vero Yugi e rimozione di massa con costo pesante. |
| Maghi Silenti | Mago Silente LV4; Mago Silente LV8 | Progressione caratteristica del Duello Cerimoniale, con Segnalini Magia e immunità alle Magie. |
| Spadaccini Silenti | Spadaccino Silente LV3; Spadaccino Silente LV5; Spadaccino Silente LV7 | Linea completa LV e secondo asse principale del mazzo finale di Yugi. |
| Difesa e tempo | Marshmallon; Sarcofago d'Oro | Due carte molto riconoscibili: muro con danno e ricerca ritardata dal Deck. |

Queste 14 carte formano un lotto coerente. Nessuna richiede Synchro, Xyz,
Pendulum o Link. Richiedono però primitive affidabili per le evocazioni LV,
i Segnalini Magia, il bando temporaneo dal Deck e la procedura speciale di
Valkyrion.

## Priorità B — ottime aggiunte successive

| Carte mancanti | Valore nel gioco |
|---|---|
| Blockman | Produce Token in base ai turni trascorsi scoperto; interessante ma non fondamentale. |
| Mago Nero Esperto; Mago Bianco Esperto | Rendono le Magie giocate una risorsa e supportano Mago Nero/Buster Blader. |
| Il Tricky | Evocazione Speciale semplice tramite scarto; utile anche all'IA. |
| Controllo della Mente (`Brain Control`) | Da non confondere con `Controllo Mentale` già presente: paga 800 LP e prende temporaneamente un mostro Evocabile Normalmente. |
| Carta della Santità | Iconica, ma il testo TCG è molto più debole e diverso dalla versione anime; va implementato quello TCG. |
| Sipario di Magia Oscura; Formula Magica | Supporti classici del Mago Nero presenti nella lista Battle City ufficiale. |
| Corda dell'Anima; Distruzione a Catena; Tragedia | Trappole canoniche con interazioni utili, ma meno identitarie dei nuclei in Priorità A. |
| Unione dei Maghi; Dedizione attraverso Luce e Oscurità | Completano alcune giocate memorabili e il passaggio al Mago Nero del Caos. |
| Ripristino Miracoloso | Recupero dedicato ai Guerrieri Magnetici; acquista valore dopo Gamma/Valkyrion. |

## Esclusioni verificate

- `Ragnarok`, la Magia usata da Yugi contro Yami Marik, è una carta
  esclusivamente anime e non è mai stata pubblicata nel TCG. Era stata
  inclusa per errore nella prima revisione dell'audit e va quindi esclusa
  dall'implementazione. Non va confusa con il mostro TCG `Divine Dragon
  Ragnarok` né con l'espansione `Storm of Ragnarok`.

## Carte importanti già presenti

Non vanno duplicate: Alpha e Beta il Guerriero Magnetico, Gadget Verde,
Gadget Rosso, Gadget Giallo, Roccaforte la Fortezza Mobile, Paladino Oscuro,
Chimera la Bestia Mitica Volante, Cavaliere della Fiamma Oscura, Cavaliere
del Miraggio, Guardiano Celtico Sgradito, Onda di Diffusione, Recupero dei
Mostri, Ectoplasmatore, Spada della Forza di Luce e Cappelli Magici.

## Decisione tecnica consigliata

Implementare prima le 14 carte di Priorità A in un branch dedicato, senza
toccare subito i deck avversari. Solo dopo i test funzionali si valuta un
nuovo profilo `hard` di Yami Yugi e, separatamente, un profilo finale di
Yugi Muto: inserire tutto direttamente nei deck attuali renderebbe difficile
capire se gli effetti sono corretti o se il bilanciamento è cambiato.
