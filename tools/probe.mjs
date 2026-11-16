import * as G from '../src/game.js';
const lamp = process.argv[2] || 'azure';
const tot = [], co = [], mu = []; let fam = 0, pure = 0;
for (let n = 0; n < 4000; n++) {
  const run = G.newRun(lamp, 0, n * 31 + 7);
  G.spin(run);
  const r = G.evaluate(run);
  tot.push(r.total); co.push(r.coins); mu.push(r.mult);
  fam += r.lines.filter(l => l.kind === 'family').length; pure += r.lines.filter(l => l.kind === 'pure').length;
}
const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * p)];
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(lamp, 'total p10/p50/p90/mean', q(tot, .1), q(tot, .5), q(tot, .9), avg(tot).toFixed(0), '| coins p50', q(co, .5), '| mult p50', q(mu, .5), '| fam lines/spin', (fam / 4000).toFixed(2), 'pure', (pure / 4000).toFixed(2));
