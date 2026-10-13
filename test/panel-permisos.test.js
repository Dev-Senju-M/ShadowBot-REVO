// Permisos del panel (src/web/permisos.js)
const { test } = require('node:test');
const assert = require('node:assert');
const { PermissionFlagsBits, Collection } = require('discord.js');
const { esAdmin, servidorPanel } = require('../src/web/permisos');

const miembro = (...permisos) => ({ permissions: { has: (p) => permisos.includes(p) } });

test('esAdmin: Administrador o Gestionar servidor', () => {
  assert.strictEqual(esAdmin(miembro(PermissionFlagsBits.Administrator)), true);
  assert.strictEqual(esAdmin(miembro(PermissionFlagsBits.ManageGuild)), true);
  assert.strictEqual(esAdmin(miembro(PermissionFlagsBits.ManageMessages)), false);
  assert.strictEqual(esAdmin(miembro()), false);
  assert.strictEqual(esAdmin(null), false);
});

test('servidorPanel: PANEL_GUILD_ID o el único servidor del bot', () => {
  const g1 = { id: 'g1' };
  const g2 = { id: 'g2' };
  const previo = process.env.PANEL_GUILD_ID;
  try {
    delete process.env.PANEL_GUILD_ID;
    assert.strictEqual(servidorPanel({ guilds: { cache: new Collection([['g1', g1]]) } }), g1);
    assert.strictEqual(servidorPanel({ guilds: { cache: new Collection([['g1', g1], ['g2', g2]]) } }), null);
    process.env.PANEL_GUILD_ID = 'g2';
    assert.strictEqual(servidorPanel({ guilds: { cache: new Collection([['g1', g1], ['g2', g2]]) } }), g2);
  } finally {
    if (previo === undefined) delete process.env.PANEL_GUILD_ID;
    else process.env.PANEL_GUILD_ID = previo;
  }
});
