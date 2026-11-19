// Ein Kampf: Intro-Banner → Kampf → Sieg-Banner oder Todessequenz.
// Gegner ist ein Gladiator (Nahkampf) oder – nur im Testmodus – einer der alten Schuss-Bosse
// als Vorschau auf die Magie in Akt II.
import { ctx } from '../core/canvas.ts';
import { W, H, GY, AL, AR, SP, OUT } from '../core/constants.ts';
import { TAU, rnd, clamp, inR } from '../core/util.ts';
import { G } from '../core/state.ts';
import { beep } from '../core/audio.ts';
import { touch, mouse, KP, ok } from '../core/input.ts';
import { actP } from '../core/bindings.ts';
import type { TouchButton } from '../core/input.ts';
import { txt, ptxt, circ, poly, rr } from '../render/draw.ts';
import { drawBody } from '../render/body.ts';
import { drawShape } from '../render/shapes.ts';
import { drawGladiator } from '../render/gladiator.ts';
import { bg, drawStage, shadow } from '../render/backgrounds.ts';
import { soulFlame } from '../render/soul.ts';
import { BOSSES, BALANCE, TEXTS, GLADIATOR, GLAD_ATTACKS, fmt } from '../data/index.ts';
import type { FightRef, GladAttackId } from '../data/index.ts';
import { GROUND_MOVES } from './constants.ts';
import { bossReward, bossMaxHp } from './stats.ts';
import type { Stats } from './stats.ts';
import { R, fightWon, nextFight, endRun, abortRun } from './run.ts';
import { go } from './scenes.ts';
import type { Scene } from './scenes.ts';
import { prof, persist, stats, bonesTxt, activeAbilities } from './profile.ts';
import { world, eb, pb, hz, shot, burst, hitP, aim, clearArena, overlap, playerBox } from './world.ts';
import type { Foe } from './world.ts';
import { A } from './attacks.ts';
import { resolveHit } from './abilities.ts';
import type { IncomingHit, HitResult, AbilityId } from './abilities.ts';
import { newPlayer, readIntent, updatePlayer, drawPlayer } from './player.ts';
import { createGlad, updateGlad, gladAttackBox, gladHurtbox, hurtGlad, gladDeflected, forceAttack, attackDef } from './gladiator.ts';
import type { Glad, GladEvent } from './gladiator.ts';

type Phase = 'intro' | 'play' | 'clear' | 'dead';
let phase: Phase = 'intro', pt = 0, msg = '', deadT = 0, st: Stats = null;
/** im Kampf aktive Fähigkeiten (vom Körper bestimmt, siehe profile.activeAbilities) */
let active: AbilityId[] = [];
let magic = false;         // alter Schuss-Boss: Spieler schießt statt zu schlagen
let glad: Glad | null = null;
/** kurze Schriftzüge über dem Geschehen (Parade, Schild …) */
const popups: { text: string; x: number; y: number; t: number; col: string; dur: number }[] = [];
const popup = (text: string, x: number, y: number, col = '#fff', dur = 0.9) => popups.push({ text, x, y, t: 0, col, dur });

// ---------- Pause ----------
let paused = false, pauseSel = 0;
const PAUSE_BTN = { x: W - 24, y: 66, r: 13 };
const PAUSE_ITEM = (i: number) => ({ x: W / 2 - 90, y: 120 + i * 40, w: 180, h: 32 });

// ---------- Hinweis, wenn eine Fähigkeit fehlt ----------
const AB_NAME: Record<AbilityId, string> = { block: 'Block', jump: 'Sprung', dodge: 'Dash' };
const hintT: Record<AbilityId, number> = { block: 0, jump: 0, dodge: 0 };
let blockWasHeld = false;
function missingHint(id: AbilityId): void {
  if (G.time - hintT[id] < 1.5) return;
  hintT[id] = G.time;
  const text = st.lvl[id] > 0 ? fmt(TEXTS.fight.inactive, { name: AB_NAME[id] }) : TEXTS.fight.missing[id];
  popup(text, clamp(world.p.x, 120, W - 120), world.p.y - 62, '#ffb070', 1.8);
  beep(160, .08, 'triangle', .04);
}

/** Laufende Nummer des Kampfes im Run (für Anzeigen) */
const fightNo = (): number => (R.run ? R.run.i + 1 : 1);
const fightCount = (): number => (R.run ? R.run.fights.length : 1);

/** Touch-Knöpfe für die aktiven Fähigkeiten */
const BUTTONS: Record<AbilityId, Omit<TouchButton, 'id'>> = {
  jump: { x: 598, y: 318, r: 28, label: 'SPRUNG' },
  dodge: { x: 534, y: 330, r: 22, label: 'DASH' },
  block: { x: 600, y: 250, r: 24, label: 'BLOCK' },
};

// ---------- Gegner als Foe: einheitlich für HUD, Zielen und Nahkampftreffer ----------
function bossFoe(): Foe {
  return {
    get name() { return world.b.def.name; }, get hp() { return world.b.hp; }, get max() { return world.b.max; },
    get accent() { return world.b.def.accent; }, get x() { return world.b.x; }, get y() { return world.b.y; },
    get hidden() { return world.b.state === 'hidden'; },
    box() { const b = world.b; return { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }; },
    hurt: (dmg) => hurtBoss(dmg),
  };
}
function gladFoe(g: Glad): Foe {
  return {
    name: g.def.name, get hp() { return g.hp; }, max: g.max, accent: g.def.accent,
    get x() { return g.x; }, y: GY - 34, hidden: false,
    box: () => gladHurtbox(g),
    hurt(dmg, dir, knock, heavy) {
      if (phase !== 'play') return false;
      const r = hurtGlad(g, dmg, dir, knock, heavy);
      if (r.ev) gladSound(r.ev);
      if (r.ok) { burst(g.x, GY - 36, 8, g.def.accent); if (g.hp <= 0) winFight(); }
      return r.ok;
    },
  };
}

function startFight(ref: FightRef): void {
  st = stats();
  world.p = newPlayer(st);
  clearArena(); popups.length = 0;
  phase = 'intro'; pt = 1.7; msg = ''; deadT = 0; G.hitstop = 0;
  if (ref.kind === 'boss') {
    magic = true; glad = null;
    const n = ref.n, d = BOSSES[n - 1];
    const vr = BALANCE.boss.sizes[d.size - 1], gnd = GROUND_MOVES.includes(d.move);
    world.b = { def: d, n, hp: bossMaxHp(n), max: bossMaxHp(n), vr, r: vr * .68, gnd,
      x: d.move === 'center' ? W / 2 : gnd ? 500 : 460, y: gnd ? GY - vr : d.move === 'strafe' ? 85 : 150, f: -1,
      inv: 0, atk: 1, ai: 0, timers: [], state: 'move', st: 0, dir: rnd() < .5 ? -1 : 1, oa: 0,
      bvx: d.speed * SP * (rnd() < .5 ? -1 : 1) * .75, bvy: d.speed * SP * .6 };
    world.foe = bossFoe();
  } else {
    magic = false; world.b = null;
    glad = createGlad(GLADIATOR[ref.id]);
    world.foe = gladFoe(glad);
  }
  beep(196, .15); setTimeout(() => beep(147, .3), 150);
}

/** Ein Treffer auf die Spielfigur: Ausweichen, Parade, Block oder Schaden. src = Gladiator, wenn er der Angreifer ist. */
function hurtPlayer(hit: IncomingHit, fromGlad = false): HitResult {
  const p = world.p;
  if (G.debug.god || phase !== 'play' || p.inv > 0) return 'evade';
  const r = resolveHit(p, hit, active, st);
  if (r === 'evade') return r;
  if (r === 'parry') {
    G.hitstop = BALANCE.hitstop.parry; G.shake = Math.max(G.shake, 5);
    burst(p.x + p.f * 16, p.y - 24, 18, '#ffffff', 170); beep(1320, .12, 'square', .06, -300); beep(660, .2, 'triangle', .05);
    if (fromGlad && glad) gladDeflected(glad, true);
    popup('PARADE!', p.x + p.f * 10, p.y - 52, '#e8fbff');
    return r;
  }
  if (r === 'block') {
    G.hitstop = BALANCE.hitstop.light; p.vx = -p.f * BALANCE.block.pushback;
    burst(p.x + p.f * 14, p.y - 24, 10, '#9fe8ff', 120); beep(980, .07, 'square', .05, -400);
    if (fromGlad && glad) gladDeflected(glad, false);
    return r;
  }
  damagePlayer(Math.sign(p.x - hit.x) || -p.f);
  return r;
}

function damagePlayer(dir: number): void {
  const p = world.p;
  p.hp--; G.shake = 8; G.hitstop = BALANCE.hitstop.hurt;
  burst(p.x, p.y - 17, 16, '#ff3838'); beep(120, .3, 'sawtooth', .08, -80);
  p.hurt = true; p.atk = null; p.blocking = false;
  p.vx = dir * BALANCE.hurtKnockback;
  if (p.hp <= 0) { phase = 'dead'; deadT = 0; p.dieY = p.y; p.inv = 0; p.dashT = 0; persist(); burst(p.x, p.y - 17, 14, '#ddd4ba', 120); }
  else p.inv = BALANCE.player.hitInvulnerability + st.inv;
}

function hurtBoss(dmg: number): boolean {
  const b = world.b;
  if (b.state === 'hidden' || b.hp <= 0) return false;
  b.hp -= dmg; b.inv = .12; G.shake = Math.max(G.shake, 3); burst(b.x, b.y, 8, b.def.accent); beep(520, .06, 'square', .05, 200);
  if (b.hp <= .001) { b.hp = 0; b.timers.length = 0; winFight(); }
  return true;
}

/** Gegner besiegt: Belohnung, Banner, danach der nächste Kampf */
function winFight(): void {
  const p = world.p, foe = world.foe;
  eb.length = 0; hz.length = 0;
  phase = 'clear'; pt = 2.4; G.shake = 12; G.hitstop = BALANCE.hitstop.heavy;
  burst(foe.x, foe.y, 60, magic ? world.b.def.color : glad.def.body, 240); burst(foe.x, foe.y, 30, foe.accent, 160);
  beep(262, .1); setTimeout(() => beep(330, .1), 100); setTimeout(() => beep(392, .25), 200);
  const bonus = p.hurt ? 0 : BALANCE.rewards.noHitBonus;
  const gain = magic ? bossReward(world.b.n, p.hurt) : glad.def.bones + bonus;
  prof.save.bones += gain;
  fightWon(gain);
  if (!magic && R.run) prof.save.best = Math.max(prof.save.best, R.run.won);
  persist();
  msg = fmt(p.hurt ? TEXTS.fight.reward : TEXTS.fight.rewardNoHit, { gain, bonus: BALANCE.rewards.noHitBonus });
}

function gladSound(e: GladEvent): void {
  switch (e) {
    case 'tele': {
      const a = attackDef(glad);
      if (a && a.blockable) beep(560, .12, 'triangle', .05, 120); else beep(240, .22, 'sawtooth', .06, -60);
      break;
    }
    case 'swing': beep(180, .12, 'sawtooth', .05, -100); break;
    case 'charge': beep(90, .3, 'sawtooth', .07, 60); break;
    case 'wall': G.shake = Math.max(G.shake, 6); beep(70, .25, 'sawtooth', .08); burst(glad.x + glad.f * 14, GY - 20, 12, '#c08050', 140); break;
    case 'guard': beep(820, .08, 'square', .05, 200); popup('SCHILD', glad.x, GY - 96, '#ffd27a'); break;
    case 'clang': beep(1400, .05, 'square', .05, -600); burst(glad.x + glad.f * 12, GY - 40, 8, '#ffd27a', 130); break;
    case 'stagger': beep(300, .2, 'triangle', .05, -150); break;
  }
}

function updGlad(dt: number): void {
  const p = world.p;
  for (const e of updateGlad(glad, dt, p.x)) gladSound(e);
  const box = gladAttackBox(glad);
  if (box && overlap(box, playerBox(p))) {
    const a = GLAD_ATTACKS[glad.atk];
    const r = hurtPlayer({ x: glad.x, dmg: a.dmg, blockable: a.blockable }, true);
    if (r !== 'evade') glad.hitDone = true;
  }
}

// ---------- alte Schuss-Bosse (unverändert aus dem Prototyp) ----------
function updBoss(dt:number){
  const p=world.p,b=world.b;
  const d=b.def,sp=d.speed*SP,gy=GY-b.vr;b.inv-=dt;
  for(const t of b.timers.slice()){t.t-=dt;if(t.t<=0){b.timers.splice(b.timers.indexOf(t),1);t.fn()}}
  const go=(tx:number,ty:number,s=sp)=>{const ex=tx-b.x,ey=ty-b.y,m=Math.hypot(ex,ey);if(m>2){b.x+=ex/m*s*dt;b.y+=ey/m*s*dt}};
  if(b.state==='move'){
    b.f=p.x>=b.x?1:-1;
    switch(d.move){
      case'walk':{const dx=p.x-b.x;if(Math.abs(dx)>b.r+75)b.x+=Math.sign(dx)*sp*dt;break}
      case'right':b.x+=clamp(535-b.x,-sp*dt,sp*dt);break;
      case'center':b.x+=clamp(W/2-b.x,-sp*dt,sp*dt);break;
      case'air':go(W/2,150,Math.max(sp,60));break;
      case'orbit':b.oa+=dt*sp/120*b.dir;go(W/2+Math.cos(b.oa)*200,150+Math.sin(b.oa)*62,sp*1.6);break;
      case'strafe':b.x+=b.dir*sp*dt;b.y+=(85-b.y)*Math.min(1,dt*2.5);if(b.x<AL+70)b.dir=1;if(b.x>AR-70)b.dir=-1;break;
      case'bounce':b.x+=b.bvx*dt;b.y+=b.bvy*dt;
        if(b.x<AL+b.r)b.bvx=Math.abs(b.bvx);if(b.x>AR-b.r)b.bvx=-Math.abs(b.bvx);
        if(b.y<50+b.r)b.bvy=Math.abs(b.bvy);if(b.y>GY-b.r-8)b.bvy=-Math.abs(b.bvy);break;
      case'hover':go(p.x<W/2?AR-90:AL+90,165+Math.sin(G.time*1.3)*40,Math.max(sp,70));break;
    }
    if(b.gnd)b.y+=(gy-b.y)*Math.min(1,dt*12);
    b.atk-=dt;
    if(b.atk<=0){const at=d.attacks[b.ai++%d.attacks.length];A[at[0]](b,...(at.slice(1) as number[]));b.atk=d.cooldown*(.7+.3*b.hp/b.max)}
  }else if(b.state==='tele'){b.st-=dt;b.f=Math.cos(b.ca)>=0?1:-1;if(b.st<=0){b.state='charge';b.st=b.gnd?2:.55;beep(90,.2,'sawtooth',.06)}}
  else if(b.state==='charge'){
    b.x+=Math.cos(b.ca)*b.cs*dt;b.y+=Math.sin(b.ca)*b.cs*dt;b.st-=dt;
    G.fx.push({x:b.x+rnd(-b.r,b.r),y:b.y+rnd(-b.r,b.r),vx:0,vy:0,life:.25,col:d.color,r:4});
    const wall=b.x<AL+b.r||b.x>AR-b.r||b.y>GY-b.r||b.y<30;
    if(wall||b.st<=0){if(wall)G.shake=6;if(--b.cn>0){b.state='tele';b.x=clamp(b.x,AL+b.r,AR-b.r);b.ca=b.gnd?(p.x>b.x?0:Math.PI):aim(b);b.st=.5}else b.state='move'}
  }else if(b.state==='leap'){
    b.lt+=dt/.9;const t=Math.min(1,b.lt);b.x=b.lx+(b.tx-b.lx)*t;b.y=b.ly+(gy-b.ly)*t-Math.sin(Math.PI*t)*190;
    if(t>=1){b.state='move';G.shake=9;beep(70,.3,'sawtooth',.08);burst(b.x,GY,16,'#c08050',160);
      for(const s of[-1,1])eb.push({x:b.x+s*b.r,y:GY-7,vx:s*210,vy:0,r:7,life:4,col:'#ffb040',wave:1})}
  }else if(b.state==='hidden'){
    b.st-=dt;if(b.st<=0){b.x=b.tx;b.y=b.ty;b.state='move';burst(b.x,b.y,12,d.accent);A.ring(b,b.tn,70,rnd(TAU))}
  }
  b.x=clamp(b.x,AL+b.r,AR-b.r);b.y=Math.min(b.y,GY-b.r*.6);
  if(b.state!=='hidden'&&hitP(b.x,b.y,b.r))hurtPlayer({x:b.x,dmg:1,blockable:false});
}
function updBullets(dt:number){
  const p=world.p,b=world.b;
  for(let i=eb.length-1;i>=0;i--){
    const e=eb[i];e.life-=dt;
    if(e.orb){const o=e.orb;o.a+=o.da*dt;o.rad+=o.dr*dt;e.x=o.cx+Math.cos(o.a)*o.rad;e.y=o.cy+Math.sin(o.a)*o.rad}
    else{
      if(e.home){const s=Math.hypot(e.vx,e.vy);let a=Math.atan2(e.vy,e.vx),da=Math.atan2(p.y-17-e.y,p.x-e.x)-a;
        da=Math.atan2(Math.sin(da),Math.cos(da));a+=clamp(da,-e.home*dt,e.home*dt);e.vx=Math.cos(a)*s;e.vy=Math.sin(a)*s}
      if(e.ax!==undefined){e.vx+=e.ax*dt;e.vy+=e.ay*dt}
      if(e.g)e.vy+=e.g*dt;
      if(e.acc){const f=1+e.acc*dt;if(Math.hypot(e.vx,e.vy)<130*SP){e.vx*=f;e.vy*=f}}
      e.x+=e.vx*dt;e.y+=e.vy*dt;
      if(e.stick){
        if(e.x<AL+6||e.x>AR-6){e.vx*=-.6;e.x=clamp(e.x,AL+6,AR-6)}
        if(e.y>=GY-e.r){e.y=GY-e.r;e.vx=e.vy=0;e.g=0;e.stick=0;e.life=4.5}
      }
    }
    let out=e.x<AL-20||e.x>AR+20||e.y<-30||e.y>GY+2;
    if(e.bounce>0){
      if(e.x<AL+4||e.x>AR-4){e.vx*=-1;e.x=clamp(e.x,AL+4,AR-4);e.bounce--}
      if(e.y<24||e.y>GY-4){e.vy*=-1;e.y=clamp(e.y,24,GY-4);e.bounce--}
      out=false;
    }
    if(e.life<=0||out){
      eb.splice(i,1);
      if(e.split&&e.life<=0){for(let k=0;k<e.split;k++)shot(e.x,e.y,k*TAU/e.split,72);burst(e.x,e.y,10,'#fff');beep(260,.08)}
      continue;
    }
    if(hitP(e.x,e.y,e.r*.85))hurtPlayer({x:e.x,dmg:1,blockable:false});
  }
  for(let i=pb.length-1;i>=0;i--){
    const s=pb[i];
    if(s.home&&b.state!=='hidden'){const v=Math.hypot(s.vx,s.vy);let a=Math.atan2(s.vy,s.vx),da=Math.atan2(b.y-s.y,b.x-s.x)-a;
      da=Math.atan2(Math.sin(da),Math.cos(da));a+=clamp(da,-3*dt,3*dt);s.vx=Math.cos(a)*v;s.vy=Math.sin(a)*v}
    s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
    let dead=s.life<=0||s.x<AL||s.x>AR||s.y<0||s.y>GY+6;
    if(!dead&&b.state!=='hidden'&&phase==='play'&&Math.hypot(s.x-b.x,s.y-b.y)<b.r+4){dead=true;if(!hurtBoss(s.dmg))G.fx.push({x:s.x,y:s.y,vx:0,vy:-30,life:.2,col:'#999',r:2})}
    if(dead)pb.splice(i,1);
  }
  for(let i=hz.length-1;i>=0;i--){
    const h=hz[i];h.t+=dt;
    if(h.k==='col'){
      if(h.t>=h.T&&!h.hit){h.hit=1;G.shake=Math.max(G.shake,3);beep(90,.15,'sawtooth',.05);burst(h.x,GY,10,'#ffb040',150)}
      if(h.t>=h.T&&Math.abs(p.x-h.x)<h.w/2+4)hurtPlayer({x:h.x,dmg:1,blockable:false});
      if(h.t>=h.T+h.act)hz.splice(i,1);
    }else{
      if(h.t>h.tele){
        h.a+=h.w*dt;
        if(h.b.state!=='hidden'){const ex=p.x-h.b.x,ey=p.y-17-h.b.y,c=Math.cos(h.a),s=Math.sin(h.a);
          if(ex*c+ey*s>0&&Math.abs(ex*s-ey*c)<11)hurtPlayer({x:h.b.x,dmg:1,blockable:false})}
      }
      if(h.t>h.tele+h.act)hz.splice(i,1);
    }
  }
}

function updFight(dt: number): void {
  // Hitstop: ein paar Hundertstel alles anhalten, damit Treffer wuchtig wirken
  active = activeAbilities(st); // Debug kann das mitten im Kampf ändern
  // alle Fähigkeits-Knöpfe zeigen; was der Körper nicht kann, ist ausgegraut
  touch.buttons = [...(['block', 'dodge', 'jump'] as AbilityId[]).map((id) => ({ id, ...BUTTONS[id], on: active.includes(id) })), { id: 'pause' as const, ...PAUSE_BTN, label: '' }];
  if (updPause()) return;
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  const p = world.p;
  pt -= dt;
  if (phase === 'intro') { if (pt <= 0) phase = 'play'; }
  else if (phase === 'play') {
    const intent = readIntent();
    // Fähigkeit gedrückt, die der Körper nicht hat: kurz erklären, warum nichts passiert
    if (intent.blockHeld && !blockWasHeld && !active.includes('block')) missingHint('block');
    if (intent.jumpPressed && !active.includes('jump')) missingHint('jump');
    if (intent.dodgePressed && !active.includes('dodge')) missingHint('dodge');
    blockWasHeld = intent.blockHeld;
    updatePlayer(p, st, intent, dt, { magic, canAct: true, active });
    if (magic) { updBoss(dt); updBullets(dt); } else updGlad(dt);
  }
  else if (phase === 'dead') {
    deadT += dt; if (magic) updBullets(dt);
    if (deadT >= .6 && deadT - dt < .6) { beep(260, 2.2, 'sine', .045, 520); beep(392, 2, 'triangle', .02, 700); }
    if (deadT >= 2.4 && deadT - dt < 2.4) { beep(73, 1.6, 'triangle', .1); beep(110, 1.2, 'sine', .05, -30); }
    if (deadT >= 4.8) endRun('death', fmt(TEXTS.abyss.death, { name: world.foe.name }));
  }
  else if (phase === 'clear') {
    updatePlayer(p, st, readIntent(), dt, { magic, canAct: false, active });
    if (magic) updBullets(dt);
    if (pt <= 0) nextFight();
  }
  for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > popups[i].dur) popups.splice(i, 1); }
  for (let i = G.fx.length - 1; i >= 0; i--) { const f = G.fx[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; if (f.life <= 0) G.fx.splice(i, 1); }
}

function legacyDrawWorld(): void {
  const b=world.b,d=b.def;
  // Gefahrenzonen
  for(const h of hz){
    if(h.k==='col'){
      if(h.t<h.T){const f=h.t/h.T;ctx.fillStyle='rgba(255,70,40,'+(.08+.2*f)+')';ctx.fillRect(h.x-h.w/2,24,h.w,GY-24);
        const c=(G.time*12|0)%2?'#ff5040':'#ffb040';ctx.fillStyle=c;ctx.fillRect(h.x-h.w/2,GY-3,h.w,4);poly(ctx,[h.x-7,GY-12,h.x+7,GY-12,h.x,GY-3],c,null)}
      else{const gr=ctx.createLinearGradient(h.x-h.w/2-6,0,h.x+h.w/2+6,0);gr.addColorStop(0,'rgba(255,120,40,0)');gr.addColorStop(.3,'#ffb050');gr.addColorStop(.5,'#fff6dc');gr.addColorStop(.7,'#ffb050');gr.addColorStop(1,'rgba(255,120,40,0)');
        ctx.fillStyle=gr;ctx.fillRect(h.x-h.w/2-6,0,h.w+12,GY+4)}
    }else if(h.b.state!=='hidden'){
      const on=h.t>h.tele,c=Math.cos(h.a),s=Math.sin(h.a),x1=h.b.x+c*h.b.r,y1=h.b.y+s*h.b.r,x2=h.b.x+c*900,y2=h.b.y+s*900;
      ctx.save();ctx.beginPath();ctx.rect(0,0,W,GY+14);ctx.clip();ctx.lineCap='round';
      const ln=(w:number,col:string)=>{ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
      if(on){ctx.globalCompositeOperation='lighter';ln(26,'rgba(255,90,40,.35)');ln(15,'#ff7040');ctx.globalCompositeOperation='source-over';ln(6,'#fff4e0')}
      else{ctx.setLineDash([8,7]);ln(1.6,(G.time*14|0)%2?'#ff5040':'#a03020');ctx.setLineDash([])}
      ctx.restore();
    }
  }
  // Boss
  if(b.state==='leap'){ctx.fillStyle='rgba(255,70,40,'+(.3+.3*Math.sin(G.time*20))+')';ctx.beginPath();ctx.ellipse(b.tx,GY+4,b.vr,7,0,0,TAU);ctx.fill()}
  if(b.state==='hidden'){ctx.strokeStyle=d.accent;ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.tx,b.ty,b.vr*(.3+Math.max(0,b.st)),G.time*8,G.time*8+4.5);ctx.stroke()}
  else if(phase!=='clear'){
    let ox=0;
    if(b.state==='tele'){ox=Math.sin(G.time*70)*2.5;
      for(let t=b.r+12;t<b.r+150;t+=22){const ax=b.x+Math.cos(b.ca)*t,ay=b.y+Math.sin(b.ca)*t;ctx.globalAlpha=(((G.time*10|0)+(t/22|0))%3)?.35:1;
        ctx.save();ctx.translate(ax,ay);ctx.rotate(b.ca);poly(ctx,[-5,-7,5,0,-5,7,-1,0],'#ff5040',null);ctx.restore()}ctx.globalAlpha=1}
    shadow(b.x,b.y+b.vr,b.vr*.9);
    drawShape(d.shape,b.x+ox,b.y+(b.gnd?0:Math.sin(G.time*3)*3),b.vr,b.f,d.color,d.accent,b.inv>0&&(G.time*20|0)%2);
  }
}
function legacyDrawShots(): void {
  // Geschosse
  ctx.lineCap='round';
  for(const s of pb){const m=Math.hypot(s.vx,s.vy),ux=s.vx/m,uy=s.vy/m,w=s.dmg>1?6:3.5;
    ctx.strokeStyle='rgba(60,255,255,.35)';ctx.lineWidth=w+4;ctx.beginPath();ctx.moveTo(s.x-ux*14,s.y-uy*14);ctx.lineTo(s.x,s.y);ctx.stroke();
    ctx.strokeStyle='#5ff';ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(s.x-ux*10,s.y-uy*10);ctx.lineTo(s.x,s.y);ctx.stroke();circ(ctx,s.x,s.y,w*.45,'#fff')}
  for(const e of eb){
    if(e.wave){const hgt=20+Math.sin(G.time*30+e.x)*4;poly(ctx,[e.x-9,GY+2,e.x-3,GY-hgt*.6,e.x,GY-hgt,e.x+3,GY-hgt*.6,e.x+9,GY+2],'#ff8030',OUT,1.2);poly(ctx,[e.x-4,GY+2,e.x,GY-hgt*.6,e.x+4,GY+2],'#ffe080',null)}
    else{ctx.globalAlpha=.28;circ(ctx,e.x,e.y,e.r*1.9,e.col);ctx.globalAlpha=1;circ(ctx,e.x,e.y,e.r,e.col);
      ctx.strokeStyle=OUT;ctx.lineWidth=.8;ctx.stroke();circ(ctx,e.x-e.r*.2,e.y-e.r*.25,e.r*.48,'#fff')}
  }
}

function drawFight(): void {
  const p = world.p, foe = world.foe;
  ctx.save(); if (G.shake > 0) ctx.translate(rnd(-G.shake, G.shake) * .6, rnd(-G.shake, G.shake) * .6);
  drawStage();
  if (magic) legacyDrawWorld();
  else if (phase !== 'clear') drawGladiator(glad);
  if (phase === 'dead') deadBody();
  else { shadow(p.x, p.y, 12); drawPlayer(p, st, magic); }
  if (magic) legacyDrawShots();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of G.fx) { ctx.globalAlpha = clamp(f.life * 4, 0, 1); circ(ctx, f.x, f.y, f.r || 2, f.col); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(bg.front, 0, 0, W, H);
  ctx.restore();
  for (const u of popups) { ctx.globalAlpha = clamp((u.dur - u.t) * 2, 0, 1); txt(u.text, u.x, u.y - u.t * 14, u.col, 'center', u.dur > 1 ? 12 : 14, true); }
  ctx.globalAlpha = 1;

  // HUD
  const gr = ctx.createLinearGradient(0, 0, 0, 50); gr.addColorStop(0, 'rgba(8,5,7,.85)'); gr.addColorStop(1, 'rgba(8,5,7,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 50);
  const label = (magic ? 'BOSS ' + world.b.n + '/' + BOSSES.length : 'KAMPF ' + fightNo() + '/' + fightCount()) + ' · ' + foe.name;
  txt(label, W / 2, 6, '#f4ead4', 'center', 15, true, true);
  const pw = Math.min(15, 380 / foe.max), x0 = W / 2 - foe.max * pw / 2;
  for (let i = 0; i < foe.max; i++) {
    rr(ctx, x0 + i * pw, 27, pw - 2, 8, 2); ctx.fillStyle = i < foe.hp ? foe.accent : '#2a1c1e'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
    if (i < foe.hp) { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x0 + i * pw + 1, 28, pw - 4, 2.5); }
  }
  for (let i = 0; i < st.hp; i++) {
    ctx.save(); ctx.translate(20 + i * 20, 17); ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-11, -3, -5, -10, 0, -4); ctx.bezierCurveTo(5, -10, 11, -3, 0, 6);
    ctx.fillStyle = i < p.hp ? '#ff3858' : '#3a1c22'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
  }
  if (active.includes('dodge')) {
    rr(ctx, 12, 30, 62, 6, 3); ctx.fillStyle = '#182a30'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
    const dk = clamp(1 - p.dcd / st.dcd, 0, 1); if (dk > .1) { rr(ctx, 12, 30, 62 * dk, 6, 3); ctx.fillStyle = dk >= 1 ? '#5ff' : '#2a8a96'; ctx.fill(); }
  }
  const AB: Record<AbilityId, [string, string]> = { block: ['⛨ BLOCK', '#e8c060'], jump: ['⤒ SPRUNG', '#7ad07a'], dodge: ['» DASH', '#6fd8ff'] };
  active.forEach((id, i) => txt(AB[id][0] + (st.lvl[id] === 2 ? ' II' : ''), 12 + i * 62, 40, AB[id][1], 'left', 9.5, true));
  txt((prof.test ? 'TESTMODUS' : 'Rekord ' + prof.save.best) + '   ☠ ' + bonesTxt(), W - 12, 40, '#b0a090', 'right', 12);
  if (touch.mode && phase !== 'dead') {
    for (const q of touch.buttons) {
      if (q.id === 'pause') continue;
      const held = (q.id === 'block' && touch.blockId !== null) || (q.id === 'jump' && touch.jumpId !== null);
      ctx.globalAlpha = !q.on ? .12 : held ? .7 : .4; circ(ctx, q.x, q.y, q.r, '#fff'); ctx.globalAlpha = 1;
      ctx.strokeStyle = q.on ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
      txt(q.label, q.x, q.y - 6, q.on ? '#fff' : '#8a7a70', 'center', 10, true);
    }
    const joy = touch.joy;
    if (joy) { ctx.globalAlpha = .3; circ(ctx, joy.ox, joy.oy, 30, '#fff'); ctx.globalAlpha = .7; circ(ctx, joy.ox + joy.dx * 26, joy.oy + (joy.up ? -22 : 0), 14, joy.up ? '#ffd040' : '#5ff'); ctx.globalAlpha = 1; }
    const am = touch.aim;
    if (am && magic) {
      ctx.strokeStyle = 'rgba(255,96,80,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(am.x, am.y, 10, 0, TAU);
      ctx.moveTo(am.x - 15, am.y); ctx.lineTo(am.x - 5, am.y); ctx.moveTo(am.x + 5, am.y); ctx.lineTo(am.x + 15, am.y);
      ctx.moveTo(am.x, am.y - 15); ctx.lineTo(am.x, am.y - 5); ctx.moveTo(am.x, am.y + 5); ctx.lineTo(am.x, am.y + 15); ctx.stroke();
    } else if (!am && fightNo() === 1 && !magic) txt('rechts tippen: zuschlagen', W - 170, 96, 'rgba(255,255,255,.55)', 'center', 11, true);
  }
  // Pause-Knopf (für Maus und Touch)
  if (phase !== 'dead') {
    ctx.globalAlpha = .55; circ(ctx, PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.r, '#140e10'); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#f0e0b0'; ctx.fillRect(PAUSE_BTN.x - 5, PAUSE_BTN.y - 6, 3.5, 12); ctx.fillRect(PAUSE_BTN.x + 1.5, PAUSE_BTN.y - 6, 3.5, 12);
  }
  const band = (c: string) => { ctx.fillStyle = c; ctx.fillRect(0, 138, W, 74); };
  if (phase === 'intro') {
    band('rgba(0,0,0,.62)');
    txt(magic ? 'BOSS ' + world.b.n : 'KAMPF ' + fightNo(), W / 2, 146, foe.accent, 'center', 14, true);
    txt(foe.name, W / 2, 166, '#fff', 'center', 30, true, true);
  }
  if (phase === 'clear') {
    band('rgba(0,0,0,.62)');
    txt(fightNo() >= fightCount() ? TEXTS.fight.clearedLast : TEXTS.fight.cleared, W / 2, 150, '#5ff', 'center', 30, true, true);
    if (msg) txt(msg, W / 2, 190, '#ffd040', 'center', 13, true);
  }
  if(phase==='dead'){
    // alles außer der Leiche versinkt im Schwarz, dann YOU DIED
    const a=clamp((deadT-.5)/1.8,0,1);ctx.fillStyle='rgba(0,0,0,'+a+')';ctx.fillRect(0,0,W,H);
    // nur die Seele steigt aus der Leiche auf, als bläulich leuchtende Flamme
    const sa=clamp((deadT-.5)/.6,0,1);
    if(sa>0){const k=clamp((deadT-.6)/4.2,0,1),sx=p.x+Math.sin(deadT*1.7)*6*k,sy=GY-14-(GY-14-70)*(1-(1-k)*(1-k));
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<16;i++){const ph=(G.time*.9+i/16)%1;ctx.globalAlpha=(1-ph)*.8*sa;
        circ(ctx,sx+Math.sin(i*7.3+G.time*3)*(4+ph*10),sy+36+ph*60,(1-ph)*2.4+.6,i%3?'#58b8ff':'#c8f4ff')}
      ctx.restore();ctx.globalAlpha=1;soulFlame(sx,sy,sa*.95)}
    const ta=clamp((deadT-2.4)/.9,0,1)*clamp((4.8-deadT)/.5,0,1);
    if(ta>0){ctx.globalAlpha=ta;ctx.shadowColor='#a00';ctx.shadowBlur=26;txt(TEXTS.fight.died,W/2,128+(1-ta)*6,'#c8281c','center',58,true,true);ctx.shadowBlur=0;
      txt(fmt(TEXTS.fight.defeatedBy,{name:world.foe.name,n:fightNo()}),W/2,204,'#8a7a70','center',13,false,true);ctx.globalAlpha=1}
  }
}

function deadBody(){
  const p=world.p;
  const k=clamp(deadT/.45,0,1),e=k*k,y=p.dieY+(GY-p.dieY)*e;
  ctx.save();ctx.translate(p.x,y-3*e);ctx.rotate(-Math.PI/2*e*p.f);drawBody(0,0,1.2,prof.save.eq,{f:p.f,aim:magic?p.aim:undefined});ctx.restore();
}

/** Pause-Menü: gibt true zurück, solange das Spiel angehalten ist. */
function updPause(): boolean {
  const clickPause = mouse.click && Math.hypot(mouse.x - PAUSE_BTN.x, mouse.y - PAUSE_BTN.y) < PAUSE_BTN.r + 8;
  if (!paused) {
    if ((KP('Escape') || actP('pause') || clickPause) && phase !== 'dead') { paused = true; pauseSel = 0; mouse.click = false; beep(330, .06); }
    if (clickPause) mouse.click = false;
    return paused;
  }
  const n = TEXTS.pause.items.length;
  if (KP('KeyW', 'ArrowUp')) { pauseSel = (pauseSel + n - 1) % n; beep(300, .03); }
  if (KP('KeyS', 'ArrowDown')) { pauseSel = (pauseSel + 1) % n; beep(300, .03); }
  let pick = ok() ? pauseSel : -1;
  if (mouse.click) for (let i = 0; i < n; i++) if (inR(PAUSE_ITEM(i), mouse.x, mouse.y)) pick = i;
  if (KP('Escape') || actP('pause') || clickPause) pick = 0;
  mouse.click = false;
  if (pick === 0) { paused = false; beep(440, .05); }
  else if (pick === 1) go('help', 'fight');
  else if (pick === 2) { paused = false; abortRun(); go('abyss', TEXTS.abyss.aborted); }
  else if (pick === 3) { paused = false; abortRun(); go('title'); }
  return true;
}

function drawPause(): void {
  ctx.fillStyle = 'rgba(8,5,7,.78)'; ctx.fillRect(0, 0, W, H);
  txt(TEXTS.pause.title, W / 2, 62, '#f4ead4', 'center', 30, true, true);
  TEXTS.pause.items.forEach((label, i) => {
    const r = PAUSE_ITEM(i), sel = i === pauseSel;
    rr(ctx, r.x, r.y, r.w, r.h, 7); ctx.fillStyle = sel ? '#24627a' : 'rgba(20,14,16,.9)'; ctx.fill();
    ctx.strokeStyle = sel ? '#bff' : 'rgba(240,224,176,.35)'; ctx.lineWidth = sel ? 2 : 1.2; ctx.stroke();
    txt(label, W / 2, r.y + 8, '#fff', 'center', 14, true);
  });
  const lv = (['block', 'jump', 'dodge'] as AbilityId[]).map((id) => (active.includes(id) ? '✓ ' : st.lvl[id] ? '○ ' : '✕ ') + AB_NAME[id]).join('    ');
  ptxt('Dein Körper:   ' + lv, W / 2, 292, '#b0a090', 'center', 11, true);
  ptxt('✓ aktiv   ○ vorhanden, nicht gewählt   ✕ fehlt', W / 2, 308, '#6e625c', 'center', 9.5);
}

/** Ohne Kampf-Referenz (z. B. zurück aus der Steuerung) geht der laufende Kampf einfach weiter. */
export const fightScene: Scene = {
  enter: (ref) => { if (ref) { paused = false; startFight(ref as FightRef); } },
  update: updFight,
  draw: () => { drawFight(); if (paused) drawPause(); },
};

/** Für Debug und Tests */
export const fightDebug = {
  info: () => ({
    phase, n: fightNo(), name: world.foe ? world.foe.name : '', hp: world.foe ? world.foe.hp : 0,
    php: world.p ? world.p.hp : 0, px: world.p ? world.p.x : 0, py: world.p ? world.p.y : 0, eb: eb.length, pb: pb.length,
    glad: glad ? { state: glad.state, atk: glad.atk, x: glad.x } : null,
  }),
  kill: () => {
    if (phase !== 'play') return;
    if (glad) { glad.hp = 0; glad.state = 'dead'; winFight(); } else hurtBoss(world.b.hp);
  },
  die: () => { if (phase === 'play') { world.p.hp = 1; damagePlayer(-world.p.f); } },
  /** Gladiator sofort einen Angriff ankündigen lassen */
  attack: (id: GladAttackId) => { if (glad && phase === 'play') { forceAttack(glad, id, world.p.x); gladSound('tele'); } },
  /** Spielfigur an eine Stelle setzen und ausrichten */
  place: (x: number, f: number) => { if (world.p) { world.p.x = x; world.p.f = f; world.p.mf = f; } },
  gladAt: (x: number) => { if (glad) glad.x = x; },
};
