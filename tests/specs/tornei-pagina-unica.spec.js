// La selezione Tornei deve avere una sola implementazione canonica.
// =====================================================================
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'Tornei: una sola pagina canonica, collegata dal menu e dai ritorni',
    standalone: true,
    async run({ assert }) {
        const root = path.join(__dirname, '..', '..');
        const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
        const tournamentPages = [
            'torneo-regno-duellanti.html',
            'torneo-battle-city.html',
            'torneo-kaiba.html'
        ];

        assert(!index.includes('id="view-tornei"'),
            'index.html non deve contenere una seconda vista Tornei');
        assert(index.includes("label: 'Tornei', action: 'link', href: 'tornei.html'"),
            'Il menu principale deve aprire la pagina canonica tornei.html');
        assert(fs.existsSync(path.join(root, 'tornei.html')),
            'La pagina canonica tornei.html deve esistere');

        tournamentPages.forEach((file) => {
            const html = fs.readFileSync(path.join(root, file), 'utf8');
            assert(html.includes("window.location.href = 'tornei.html'")
                || html.includes("location.href = 'tornei.html'"),
            `${file} deve tornare alla pagina canonica tornei.html`);
        });
    }
};
