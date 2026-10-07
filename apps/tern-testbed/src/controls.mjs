import { connect, html, ui } from '@stencil-hq/tern';

const session = await connect({ app: 'e2e-native-controls' });
if (!session) throw new Error('This fixture requires real native Tern; no plain-text substitute');
const surface = session.open({ id: 'controls', mode: 'inline', title: 'Native controls' });
let count = 0;
let value = '';
function render() {
  surface.render(ui.col({ key: 'form' },
    html.h1({ key: 'title' }, 'Native controls'),
    ui.editor({ key: 'value', text: value, placeholder: 'Value', maxLines: 4, onEdit: (event) => {
      value = value.slice(0, event.from) + event.text + value.slice(event.to);
      render();
    } }),
    html.button({ key: 'increment', onClick: () => { count++; render(); } }, 'Increment'),
    ui.text({ key: 'count', text: `Count: ${count}` }),
    html.label({ key: 'private' }, 'Protected', html.input({ key: 'secret', type: 'password', value: 'inert-secret-sentinel' })),
    html.label({ key: 'duplicateA' }, 'Duplicate', html.input({ key: 'inputA', type: 'text' })),
    html.label({ key: 'duplicateB' }, 'Duplicate', html.input({ key: 'inputB', type: 'text' })),
  ));
}
render();
try { for await (const input of session) { if (input.type === 'key' && input.key.name === 'escape') break; } }
finally { await session.close(); }
