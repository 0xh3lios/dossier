// A stand-in for the deployed Harbor contracts: the same operations the
// dossiers abstract, implemented plainly so a walk can be replayed against
// something that is not the model. A fork of mainnet would play this role for
// a real protocol.
export class Harbor {
  constructor() {
    this.vault = { debt: 0, free: 0, issued: 0, ceiling: 2 };
    this.adapter = { held: 0, live: true, halted: false };
    this.token = { supply: 0 };
    this.timelock = { scheduled: false, remaining: 0, early: false };
    this.breaker = { halted: false };
    this.oracle = { stale: 0 };
    this.sent = {};
  }
  send(name) { this.sent[name] = (this.sent[name] || 0) + 1; }
  // Every call either applies or reverts; a revert leaves state untouched.
  call(component, method, args = {}) {
    const a = Number(args.amount ?? 0);
    const v = this.vault, j = this.adapter, t = this.token, p = this.timelock, m = this.breaker, o = this.oracle;
    const revert = (why) => { const e = new Error(why); e.reverted = true; throw e; };
    switch (`${component}.${method}`) {
      case 'vault.borrow': if (v.debt + a > v.ceiling) revert('ceiling'); v.debt += a; v.free += a; return;
      case 'vault.repay': if (a > v.free || a > v.debt) revert('insufficient'); v.debt -= a; v.free -= a; return;
      case 'vault.move': if (a > v.free) revert('insufficient free'); v.free -= a; v.issued += a; return;
      case 'vault.release': if (a > v.issued) revert('insufficient issued'); v.issued -= a; v.free += a; return;
      case 'vault.change': if (v.ceiling < 4) v.ceiling += 1; return;
      case 'adapter.exit': if (j.halted) revert('halted'); if (j.held + a > 4) revert('cap'); this.call('vault', 'move', { amount: a }); j.held += a; this.send('move'); this.call('token', 'mint', { amount: a }); this.send('mint'); return;
      case 'adapter.enter': if (a > j.held) revert('insufficient held'); this.call('token', 'burn', { amount: a }); this.send('burn'); j.held -= a; this.call('vault', 'release', { amount: a }); this.send('release'); return;
      case 'adapter.halt': if (j.halted) revert('already halted'); j.halted = true; j.live = false; return;
      case 'token.mint': if (t.supply + a > 4) revert('cap'); t.supply += a; return;
      case 'token.burn': if (a > t.supply) revert('insufficient supply'); t.supply -= a; return;
      case 'token.transfer': return;
      case 'timelock.tick': if (p.scheduled && p.remaining > 0) p.remaining -= 1; if (o.stale < 3) o.stale += 1; return;
      case 'timelock.schedule': if (p.scheduled) revert('scheduled'); p.scheduled = true; p.remaining = 2; return;
      case 'timelock.execute': if (!p.scheduled) revert('nothing scheduled'); if (p.remaining > 0) revert('delay'); p.early = p.remaining > 0; p.scheduled = false; this.send('change'); this.call('vault', 'change'); return;
      case 'timelock.cancel': if (!p.scheduled) revert('nothing scheduled'); p.scheduled = false; return;
      case 'breaker.stop': if (m.halted) revert('spent'); m.halted = true; this.send('halt'); this.call('adapter', 'halt'); return;
      case 'oracle.tick': if (o.stale < 3) o.stale += 1; return;
      case 'oracle.post-a': case 'oracle.post-b': if (o.stale === 0) revert('fresh'); o.stale = 0; return;
      default: revert(`unknown call ${component}.${method}`);
    }
  }
  // The abstract state the dossiers speak of.
  snapshot(component) {
    switch (component) {
      case 'vault': return { state: 'Open', ...this.vault };
      case 'adapter': return { state: this.adapter.halted ? 'Halted' : 'Open', held: this.adapter.held, live: this.adapter.live };
      case 'token': return { state: 'Live', supply: this.token.supply };
      case 'timelock': return { state: this.timelock.scheduled ? 'Scheduled' : 'Idle', remaining: this.timelock.remaining, early: this.timelock.early };
      case 'breaker': return { state: this.breaker.halted ? 'Spent' : 'Armed', halted: this.breaker.halted };
      case 'oracle': return { state: this.oracle.stale === 0 ? 'Fresh' : 'Stale', stale: this.oracle.stale };
    }
    return {};
  }
}
