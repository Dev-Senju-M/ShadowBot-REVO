// Seed determinista por userId + día (resultados consistentes por día)
function seedRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}
function dailySeed(userId) {
  const hoy = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return parseInt(userId.slice(-6)) + parseInt(hoy);
}

module.exports = { seedRandom, dailySeed };
