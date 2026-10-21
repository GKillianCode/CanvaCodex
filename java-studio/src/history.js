// Large strings (notably embedded images) are shared by all history snapshots.
const prefix = "\u0000frame-history:";
export class ProjectHistory {
  constructor(value, limit = 60, maxBytes = 24000000) {
    this.pool = new Map();
    this.ids = new Map();
    this.nextId = 0;
    this.states = [this.encode(value)];
    this.index = 0;
    this.limit = Math.max(1, limit);
    this.maxBytes = maxBytes;
    this.group = null;
  }
  encode(value) {
    return JSON.stringify(value, (_, v) => {
      if (typeof v !== "string" || (v.length < 4096 && !v.startsWith(prefix)))
        return v;
      let id = this.ids.get(v);
      if (!id) {
        id = prefix + ++this.nextId;
        this.ids.set(v, id);
        this.pool.set(id, v);
      }
      return id;
    });
  }
  decode(state) {
    return JSON.parse(state, (_, v) =>
      typeof v === "string" && v.startsWith(prefix) ? this.pool.get(v) : v,
    );
  }
  matches(value) {
    return this.encode(value) === this.states[this.index];
  }
  collect() {
    const used = new Set();
    for (const state of this.states)
      JSON.parse(state, (_, v) => {
        if (typeof v === "string" && v.startsWith(prefix)) used.add(v);
        return v;
      });
    for (const [id, value] of this.pool)
      if (!used.has(id)) {
        this.pool.delete(id);
        this.ids.delete(value);
      }
  }
  get bytes() {
    return (
      this.states.reduce((n, s) => n + s.length * 2, 0) +
      [...this.pool.values()].reduce((n, s) => n + s.length * 2, 0)
    );
  }
  record(value, group = null) {
    const state = this.encode(value);
    if (state === this.states[this.index]) return;
    this.states.splice(this.index + 1);
    if (group && group === this.group && this.index > 0)
      this.states[this.index] = state;
    else {
      this.states.push(state);
      this.index++;
    }
    this.group = group;
    this.collect();
    // Keep the current state even when that document alone exceeds the budget.
    while (
      this.states.length > 1 &&
      (this.states.length > this.limit || this.bytes > this.maxBytes)
    ) {
      this.states.shift();
      this.index--;
      this.collect();
    }
  }
  undo() {
    this.group = null;
    return this.index > 0 ? this.decode(this.states[--this.index]) : null;
  }
  redo() {
    this.group = null;
    return this.index < this.states.length - 1
      ? this.decode(this.states[++this.index])
      : null;
  }
}
