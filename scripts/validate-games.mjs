import fs from 'node:fs';

const games = JSON.parse(fs.readFileSync('games.json', 'utf8'));
const allowedVerdicts = new Set(['halal', 'caution', 'haram', 'unreviewed']);
const slugs = new Set();

if (!Array.isArray(games)) throw new Error('games.json must be an array');

for (const game of games) {
  if (!game.name || !game.slug) {
    throw new Error('Every game needs name and slug');
  }

  if (slugs.has(game.slug)) {
    throw new Error(`Duplicate slug: ${game.slug}`);
  }

  if (!allowedVerdicts.has(game.verdict)) {
    throw new Error(`${game.slug}: invalid verdict "${game.verdict}"`);
  }

  if (game.verdict === 'unreviewed' && game.stores?.length) {
    throw new Error(`${game.slug}: unreviewed game cannot have stores`);
  }

  if (game.verdict === 'unreviewed' && game.screeningStatus !== 'unreviewed') {
    throw new Error(`${game.slug}: unreviewed verdict requires unreviewed screeningStatus`);
  }

  slugs.add(game.slug);
}

console.log(`Validated ${games.length} games — all OK`);
