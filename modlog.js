const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');

async function sendModLog(guild, embed) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!config.modLogChannel) return;
  const canal = guild.channels.cache.get(config.modLogChannel);
  if (!canal) return;
  await canal.send({ embeds: [embed] }).catch(console.error);
}

module.exports = { sendModLog };
