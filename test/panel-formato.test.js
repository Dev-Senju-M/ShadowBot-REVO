// Vista previa segura del mensaje (web/panel/js/formato.js)
const { test } = require('node:test');
const assert = require('node:assert');
const { escapar, formatearMensaje } = require('../web/panel/js/formato.js');

test('formatearMensaje: aplica el formato básico de Discord', () => {
  const html = formatearMensaje('### Hola {user}\n**negrita** *cursiva* __sub__ ~~no~~ `código`\nsoy {tag}', { usuario: 'Ana', tag: 'ana' });
  assert.strictEqual(html,
    '<div class="h3">Hola <span class="mencion">@Ana</span></div>'
    + '<strong>negrita</strong> <em>cursiva</em> <u>sub</u> <s>no</s> <code>código</code><br>'
    + 'soy ana');
});

test('formatearMensaje: nunca deja pasar HTML del usuario', () => {
  const html = formatearMensaje('<script>alert(1)</script> <img src=x onerror=alert(1)> {user}', { usuario: '<b>Eva</b>' });
  assert.ok(!html.includes('<script'), html);
  assert.ok(!html.includes('<img'), html);
  assert.ok(!html.includes('<b>'), html);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('@&lt;b&gt;Eva&lt;/b&gt;'));
});

test('escapar: caracteres especiales de HTML', () => {
  assert.strictEqual(escapar(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});
