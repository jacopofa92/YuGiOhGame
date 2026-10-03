Colonne sonore del gioco.

Le tracce hanno un NUMERO progressivo nel nome ("56. Battle for the Millennium.mp3"):
una traccia nuova prende il numero successivo all'ultimo (oggi 57).

Tracce importanti, usate direttamente dal codice:
- 56. Battle for the Millennium.mp3  — colonna sonora del menu principale, in loop
  (js/audio/audio-manager.js, index.html e le altre pagine menu).
- 57. King of Games - Yugi's Final Duel.mp3 — tema fisso dei duelli di Torneo e Storia
  contro Yugi Muto e Yami Yugi (js/data/characters-db.js, `duelTrackSempre`).

Se si rinomina una traccia, aggiornare TUTTI i punti che la nominano: cercare il nome
intero in js/ e nelle pagine .html (tests/specs/guardrail-riferimenti-audio.spec.js
boccia un riferimento a un file che non esiste).
