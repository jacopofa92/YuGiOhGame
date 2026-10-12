// Menu e URL diretti devono condividere i requisiti narrativi delle modalità.
// Le Regole non sono più una voce parallela ai duelli: si consultano dal
// menu Tutorial.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RADICE = path.resolve(__dirname, '..', '..');
const leggi = (file) => fs.readFileSync(path.join(RADICE, file), 'utf8');

module.exports = {
    name: 'Menu: Regole nel Tutorial e sblocchi narrativi di Rivincite/Torre',
    async run(t) {
        const indice = leggi('index.html');
        const tutorial = leggi('tutorial.html');
        const rivincite = leggi('rivincite.html');
        const torre = leggi('torre.html');

        t.assert(!/label:\s*'Regole',\s*action:\s*'view'/.test(indice),
            'Regole non deve più essere una voce autonoma nel menu Duelli');
        t.assert(/href="regole\.html"[^>]*data-voce="regole"/.test(tutorial),
            'Il menu Tutorial deve contenere il collegamento alle Regole');
        t.assert(/richiedeModalita:\s*'rivincite'/.test(indice)
            && /richiedeModalita:\s*'torre'/.test(indice),
        'Rivincite e Torre devono dichiarare il proprio requisito nel menu');
        t.assert(/ModeUnlocks\.proteggiPagina\('rivincite'\)/.test(rivincite)
            && /ModeUnlocks\.proteggiPagina\('torre'\)/.test(torre),
        'Anche gli URL diretti devono applicare gli sblocchi');

        const save = { story: {}, acquisition: {} };
        const context = {
            window: {},
            sessionStorage: { setItem() {} },
            SaveManager: {
                getStoryState(id) { return save.story[id] || null; },
                getCardAcquisitionState() { return save.acquisition; }
            }
        };
        context.window = context;
        vm.runInNewContext(leggi('js/modes/mode-unlocks.js'), context);

        let accessi = {
            rivincite: context.ModeUnlocks.stato('rivincite'),
            torre: context.ModeUnlocks.stato('torre')
        };
        t.assert(!accessi.rivincite.sbloccato && !accessi.torre.sbloccato,
            'Un salvataggio nuovo deve avere entrambe le modalità bloccate');

        save.acquisition = { completedChapters: { regno: true } };
        accessi = {
            rivincite: context.ModeUnlocks.stato('rivincite'),
            torre: context.ModeUnlocks.stato('torre')
        };
        t.assert(accessi.torre.sbloccato && !accessi.rivincite.sbloccato,
            'Finire il Regno deve sbloccare soltanto la Torre');

        save.story['anime@normale'] = { finita: true };
        accessi = {
            rivincite: context.ModeUnlocks.stato('rivincite'),
            torre: context.ModeUnlocks.stato('torre')
        };
        t.assert(accessi.rivincite.sbloccato && accessi.torre.sbloccato,
            'Finire la storia anime a una difficoltà qualunque deve sbloccare Rivincite e mantenere la Torre accessibile');
    }
};
