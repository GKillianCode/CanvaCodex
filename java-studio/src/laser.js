export class LaserTrail {
  constructor(lifetime = 900) { this.lifetime = lifetime; this.points = []; this.active = false; this.stroke = 0; }
  begin(point, now, color, size) { this.active = true; this.stroke++; this.color = color; this.size = size; this.append(point, now); }
  append(point, now) { if (!this.active) return; this.points.push({ ...point, now, stroke: this.stroke, color: this.color, size: this.size }); if (this.points.length > 600) this.points.shift(); }
  end() { this.active = false; }
  clear() { this.end(); this.points = []; }
  prune(now) { this.points = this.points.filter(p => now - p.now < this.lifetime); return this.points.length > 0; }
  draw(ctx, now) {
    this.prune(now); ctx.save(); ctx.lineCap = 'round';
    this.points.forEach((p, i) => { const prev = this.points[i - 1]; ctx.globalAlpha = Math.max(0, 1 - (now - p.now) / this.lifetime) ** 2; ctx.strokeStyle = p.color; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 18; ctx.lineWidth = p.size;
      if (prev?.stroke === p.stroke) { ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
    }); ctx.restore();
  }
}
