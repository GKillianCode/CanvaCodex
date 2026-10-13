export class ProjectHistory {
  constructor(value, limit = 60, maxBytes = 24000000) {
    this.states = [JSON.stringify(value)]; this.index = 0; this.limit = limit; this.maxBytes = maxBytes; this.group = null;
  }
  record(value, group = null) {
    const state = JSON.stringify(value);
    if (state === this.states[this.index]) return;
    this.states.splice(this.index + 1);
    if (group && group === this.group && this.index > 0) this.states[this.index] = state;
    else { this.states.push(state); this.index++; }
    this.group = group;
    while (this.states.length > 2 && (this.states.length > this.limit || this.states.reduce((n,s)=>n+s.length*2,0) > this.maxBytes)) { this.states.shift(); this.index--; }
  }
  undo() { this.group = null; return this.index > 0 ? JSON.parse(this.states[--this.index]) : null; }
  redo() { this.group = null; return this.index < this.states.length - 1 ? JSON.parse(this.states[++this.index]) : null; }
}
