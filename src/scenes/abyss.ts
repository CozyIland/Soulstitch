// Der Abgrund: Körper wählen und Teile kaufen, Abstieg der Seele nach dem Tod, Inbesitznahme
import { ctx } from '../core/canvas.ts';
import { W, H, OUT } from '../core/constants.ts';
import { TAU, rnd, clamp, inR, pct } from '../core/util.ts';
import { G } from '../core/state.ts';
import { beep } from '../core/audio.ts';
import { KP, ok, mouse, touch } from '../core/input.ts';
import { txt, ptxt, rr } from '../render/draw.ts';
import { drawBody, legLength } from '../render/body.ts';
import { bg, shaftEmbers } from '../render/backgrounds.ts';
import { soulFlame, soulTrail, updFx, drawFx } from '../render/soul.ts';
import { PARTS, PART, SLOTS, BALANCE, RUN_FIGHTS, fightName } from '../data/index.ts';
import { prof, persist, stats, bonesTxt, activeAbilities } from '../game/profile.ts';
import { ABILITY_IDS } from '../game/constants.ts';
import type { AbilityId } from '../game/constants.ts';
import { canEquip, owned, reach } from '../game/stats.ts';
import { go } from '../game/scenes.ts';
import type { Scene } from '../game/scenes.ts';
import { startRun, fightsFrom, TEST_FIGHTS } from '../game/run.ts';

// ---------- Leichenhaufen: Körperteile tauschen und kaufen ----------
let pSel=0,pCol=0,oSel=0,pileMsg='',pileBuy=-1;
/** Bildschirmbereiche: Plätze, Teile-Karten, Arena-Knopf */
const ROW=(i:number)=>({x:232,y:62+i*31,w:178,h:28}),CARD=(i:number)=>({x:420,y:62+i*44,w:210,h:42}),GOB={x:420,y:302,w:210,h:44};
/** Fähigkeiten-Chips links unten */
const CHIP=(i:number)=>({x:14+i*70,y:282,w:64,h:20});
/** Knopf zur Steuerungs-Übersicht */
const HELP={x:240,y:318,w:170,h:26};
const ARCH:Record<AbilityId,{n:string;icon:string;col:string}>={block:{n:'Block',icon:'⛨',col:'#e8c060'},jump:{n:'Sprung',icon:'⤒',col:'#7ad07a'},dodge:{n:'Dash',icon:'»',col:'#6fd8ff'}};
/** Fähigkeit vorziehen: sie wird bevorzugt aktiv (bei Limit 1: die einzige) */
function pickAbility(id:AbilityId){
  if(stats().lvl[id]===0){beep(110,.15,'sawtooth');return}
  prof.save.sel=[id,...prof.save.sel.filter(x=>x!==id)];persist();beep(600,.06,'triangle',.05,200);stitchFx();
}
function resetPile(m:string){G.fx.length=0;pileMsg=m;pCol=0;pSel=Math.min(pSel,6);syncOpt()}
function syncOpt(){if(pSel<7){oSel=PARTS[SLOTS[pSel].t].findIndex(q=>q.id===prof.save.eq[SLOTS[pSel].k])}pileBuy=-1}
function actOpt(i){
  const sl=SLOTS[pSel],q=PARTS[sl.t][i];
  if(prof.save.eq[sl.k]===q.id){oSel=i;pileBuy=-1;return}
  if(canEquip(prof.save,sl,q)){oSel=i;pileBuy=-1;prof.save.eq[sl.k]=q.id;persist();beep(520,.06);stitchFx();return}
  if(pileBuy!==i){oSel=i;pileBuy=i;beep(300,.03);return}   // erstes Antippen: nur auswählen
  if(prof.save.bones>=q.p){
    prof.save.bones-=q.p;prof.save.own[q.id]=(prof.save.own[q.id]|0)+1;prof.save.eq[sl.k]=q.id;persist();pileBuy=-1;stitchFx();
    beep(523,.08);setTimeout(()=>beep(784,.12),80);
  }else beep(110,.2,'sawtooth');
}
function drawPile(){
  ctx.drawImage(bg.morgue,0,0,W,H);shaftEmbers();
  drawBody(112,264,3.4,prof.save.eq,{run:0,dead:true});
  const sp=soulPos();soulTrail(sp.x,sp.y,1);soulFlame(sp.x,sp.y,1);drawFx();
  drawPileUI(1);
}
function drawPileUI(al:number){
  ctx.globalAlpha=al;
  txt('Leichenhaufen',14,8,'#f4ead4','left',26,true,true);
  if(prof.test)txt('TESTMODUS',212,16,'#ffb040','left',13,true);
  txt('☠ '+bonesTxt()+' Knochen',W-58,12,'#f0e0b0','right',17,true);
  txt(pileMsg,14,40,'#d0c8b0','left',12);
  const s=stats(),act=activeAbilities(s);
  rr(ctx,8,266,214,86,6);ctx.fillStyle='rgba(16,10,12,.82)';ctx.fill();
  txt('FÄHIGKEITEN · '+act.length+' von '+prof.save.limit+' aktiv',16,269,'#9a8a80','left',9,true);
  ABILITY_IDS.forEach((id,i)=>{const r=CHIP(i),a=ARCH[id],lv=s.lvl[id],on=act.includes(id);
    rr(ctx,r.x,r.y,r.w,r.h,6);ctx.fillStyle=on?a.col:lv?'rgba(255,255,255,.06)':'rgba(0,0,0,.3)';ctx.fill();
    ctx.strokeStyle=lv?a.col:'rgba(255,255,255,.12)';ctx.lineWidth=on?2:1.2;ctx.stroke();
    const label=a.icon+' '+a.n+(lv===2?' II':lv?'':' '+s.arch[id]+'/'+BALANCE.archetype.level1);
    if(on)ptxt(label,r.x+r.w/2,r.y+5,'#140e10','center',10,true);else txt(label,r.x+r.w/2,r.y+4,lv?a.col:'#6e625c','center',10,true)});
  txt('Herzen '+s.hp+'   Tempo '+pct(s.speed/BALANCE.player.speed)+'   Sprung '+pct(s.jmp),16,307,'#8fe6ff','left',10.5,true);
  txt('Schaden '+pct(s.dmg)+'   Schlag '+pct(s.fr)+'   Reichw. '+pct(reach(s)),16,322,'#8fe6ff','left',10.5,true);
  txt('Größe '+s.size+' · Gewicht '+s.weight+(s.lvl.jump===2?' · Doppelsprung':s.lvl.block===2?' · leichte Parade':s.lvl.dodge===2?' · schneller Dash':''),16,337,'#9a8a80','left',10,true);
  // Plätze
  SLOTS.forEach((sl,i)=>{const r=ROW(i),sel=i===pSel,q=PART[prof.save.eq[sl.k]];
    rr(ctx,r.x,r.y,r.w,r.h,5);ctx.fillStyle=sel?'rgba(110,210,255,.22)':'rgba(0,0,0,.35)';ctx.fill();
    if(sel){ctx.strokeStyle=pCol===0?'#8fe6ff':'rgba(110,210,255,.5)';ctx.lineWidth=1.2;ctx.stroke()}
    txt(sl.n.toUpperCase(),r.x+8,r.y+2,sel?'#8fe6ff':'#9a8a80','left',9,true);
    txt(q.n,r.x+8,r.y+12,q.p?'#ffd890':'#d0c8b0','left',12,sel)});
  // Teile für den gewählten Platz
  if(pSel<7){const sl=SLOTS[pSel],pair=sl.t==='arm'||sl.t==='bein';
    PARTS[sl.t].forEach((q,i)=>{const r=CARD(i),on=prof.save.eq[sl.k]===q.id,ce=canEquip(prof.save,sl,q),sel=i===oSel&&pCol===1||i===pileBuy;
      rr(ctx,r.x,r.y,r.w,r.h,6);ctx.fillStyle=on?'rgba(90,200,255,.18)':sel?'rgba(255,216,120,.16)':'rgba(0,0,0,.4)';ctx.fill();
      if(on||sel){ctx.strokeStyle=on?'#5ff':'#ffd878';ctx.lineWidth=1.3;ctx.stroke()}
      ctx.fillStyle=q.col;ctx.fillRect(r.x+6,r.y+6,4,30);
      txt(q.n,r.x+16,r.y+3,'#fff','left',12,true);
      txt(q.d,r.x+16,r.y+17,'#d0c8b0','left',9.5);
      const tag=(q.arch?ARCH[q.arch].icon+' '+ARCH[q.arch].n+' +'+(q.pts||1)+'   ':'')+'Größe '+q.size+' · Gewicht '+q.weight;
      txt(tag,r.x+16,r.y+29,q.arch?ARCH[q.arch].col:'#8a7a70','left',9,true);
      const n=owned(prof.save,q.id),stt=on?['ANGELEGT','#5ff']:ce?['anlegen','#8fe6ff']:['☠ '+q.p+(pair&&n===1?' (2.)':''),prof.save.bones>=q.p?'#ffd878':'#ff6050'];
      txt(stt[0],r.x+r.w-8,r.y+4,stt[1],'right',10,true)});
  }
  const hint=(()=>{if(pSel>=7)return'';const sl=SLOTS[pSel],q=PARTS[sl.t][pileBuy];
    if(q)return prof.save.bones>=q.p?'Nochmal antippen: für '+q.p+' Knochen kaufen':'Zu wenig Knochen ('+prof.save.bones+'/'+q.p+')';
    return sl.t==='arm'||sl.t==='bein'?'Wirkt pro '+(sl.t==='arm'?'Arm':'Bein')+', zwei gleiche verdoppeln.':'Antippen: anlegen oder kaufen'})();
  txt(hint,W-14,285,pileBuy>=0?'#ffd878':'#9a8a80','right',10,pileBuy>=0);
  // Kampf-Knopf
  rr(ctx,GOB.x,GOB.y,GOB.w,GOB.h,8);ctx.fillStyle=pSel===7?'#2f7f9c':(G.time*2|0)%2?'#24627a':'#1d5266';ctx.fill();
  ctx.strokeStyle=pSel===7?'#fff':OUT;ctx.lineWidth=1.6;ctx.stroke();
  txt('In die Arena',GOB.x+GOB.w/2,GOB.y+5,'#fff','center',15,true);
  txt(prof.test?testLabel():'Neuer Lauf · '+RUN_FIGHTS.length+' Kämpfe',GOB.x+GOB.w/2,GOB.y+25,'#d8f4ff','center',prof.test?9.5:10.5);
  if(prof.test){txt('‹',GOB.x+14,GOB.y+8,'#ffd878','center',24,true);txt('›',GOB.x+GOB.w-14,GOB.y+8,'#ffd878','center',24,true)}
  if(!touch.mode)txt('W/S · A/D · Enter · 1–3: Fähigkeit',232,284,'#6e625c','left',10);
  rr(ctx,HELP.x,HELP.y,HELP.w,HELP.h,6);ctx.fillStyle='rgba(16,10,12,.8)';ctx.fill();ctx.strokeStyle='rgba(240,224,176,.35)';ctx.lineWidth=1.2;ctx.stroke();
  txt('?  Steuerung'+(touch.mode?'':' (H)'),HELP.x+HELP.w/2,HELP.y+7,'#f0e0b0','center',11,true);
  ctx.globalAlpha=1;
}
function updPile(){
  if(pCol===0){
    if(KP('KeyW','ArrowUp')){pSel=(pSel+7)%8;syncOpt();beep(300,.03)}
    if(KP('KeyS','ArrowDown')){pSel=(pSel+1)%8;syncOpt();beep(300,.03)}
    if(pSel<7&&KP('KeyD','ArrowRight','Enter','NumpadEnter','Space')){pCol=1;syncOpt();beep(360,.03)}
    else if(pSel===7&&ok())go('possess');
    if(pSel===7&&prof.test){const d=(KP('KeyD','ArrowRight')?1:0)-(KP('KeyA','ArrowLeft')?1:0);if(d)stepTest(d)}
  }else{
    const n=PARTS[SLOTS[pSel].t].length;
    if(KP('KeyW','ArrowUp')){oSel=(oSel+n-1)%n;pileBuy=-1;beep(300,.03)}
    if(KP('KeyS','ArrowDown')){oSel=(oSel+1)%n;pileBuy=-1;beep(300,.03)}
    if(ok())actOpt(oSel);
    if(KP('KeyA','ArrowLeft','Escape')){pCol=0;syncOpt();beep(250,.03)}
  }
  for(const [k,i] of [['Digit1',0],['Digit2',1],['Digit3',2]] as [string,number][])if(KP(k))pickAbility(ABILITY_IDS[i]);
  if(KP('KeyH')||(mouse.click&&inR(HELP,mouse.x,mouse.y))){beep(520,.06);go('help','abyss');return}
  if(mouse.click){const x=mouse.x,y=mouse.y;
    ABILITY_IDS.forEach((id,i)=>{if(inR(CHIP(i),x,y))pickAbility(id)});
    for(let i=0;i<7;i++)if(inR(ROW(i),x,y)){if(pSel!==i){pSel=i;syncOpt();beep(300,.03)}pCol=1}
    if(pSel<7)for(let i=0;i<PARTS[SLOTS[pSel].t].length;i++)if(inR(CARD(i),x,y)){pCol=1;actOpt(i)}
    if(inR(GOB,x,y)){
      if(prof.test&&x<GOB.x+36)stepTest(-1)
      else if(prof.test&&x>GOB.x+GOB.w-36)stepTest(1)
      else go('possess')}
  }
}

// Testmodus: Start-Kampf wählen (Gladiatoren, dann die alten Schuss-Bosse als Magie-Vorschau)
function stepTest(d:number){const n=TEST_FIGHTS.length;prof.testFight=(prof.testFight+d+n)%n;beep(300,.03)}
function testLabel(){const f=TEST_FIGHTS[prof.testFight];return (f.kind==='boss'?'Magie · Boss '+f.n+' · ':'Kampf '+(prof.testFight+1)+' · ')+fightName(f)}

// Nach dem Tod sinkt die Seele durch den Schacht zum Leichenhaufen und sucht sich dort einen Körper aus
const SOUL={x:180,y:180},UI=2.4;
let fallT=0;
const soulPos=()=>({x:SOUL.x+Math.sin(G.time*1.3)*4,y:SOUL.y+Math.sin(G.time*2.1)*5});
const chestPos=()=>({x:115,y:264-(legLength(prof.save.eq)+6.5)*3.4});

// Seele näht ein Teil an: blaue Funken fliegen von der Seele zum Körper
function stitchFx(){const sp=soulPos(),c=chestPos();
  for(let i=0;i<18;i++){const t=rnd(.35,.6);G.fx.push({x:sp.x,y:sp.y,vx:(c.x-sp.x)/t+rnd(-40,40),vy:(c.y-sp.y)/t+rnd(-40,40),life:t,col:i%2?'#58b8ff':'#c8f4ff',r:rnd(1.2,2.4)})}}
function updFall(dt){
  fallT+=dt;updFx(dt);
  if(fallT>UI+.5||(fallT>.8&&(ok()||mouse.click)))go('abyss');
}
function drawFall(){
  const t=fallT,k=clamp(t/2.1,0,1),e=k*k*(3-2*k),sp=soulPos();
  ctx.drawImage(bg.morgue,0,0,W,H);shaftEmbers();
  drawBody(112,264,3.4,prof.save.eq,{run:0,dead:true});
  const x=113+(sp.x-113)*e+Math.sin(t*2.4)*14*(1-e),y=-40+(sp.y+40)*e;
  soulTrail(x,y,1);soulFlame(x,y,1);
  const bl=1-clamp(t/.7,0,1);if(bl>0){ctx.fillStyle='rgba(0,0,0,'+bl+')';ctx.fillRect(0,0,W,H)}
  if(t>UI-.4)drawPileUI(clamp((t-UI+.4)/.45,0,1));
}
// Seele fährt in den gewählten Körper, dann beginnt der Lauf
let posT=0,posFrom={x:0,y:0},posHit=false;
function updPossess(dt){
  posT+=dt;updFx(dt);
  if(!posHit&&posT>=.75){posHit=true;const c=chestPos();
    for(let i=0;i<30;i++){const a=rnd(TAU),v=rnd(40,160);G.fx.push({x:c.x,y:c.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.3,.7),col:i%2?'#58b8ff':'#e0ffff',r:rnd(1.5,3)})}
    beep(523,.12);setTimeout(()=>beep(784,.18),90);setTimeout(()=>beep(1046,.3,'triangle',.05),180)}
  if(posT>=1.7){G.fx.length=0;startRun(prof.test?fightsFrom(TEST_FIGHTS[prof.testFight]):RUN_FIGHTS)}
}
function drawPossess(){
  const t=posT,c=chestPos();
  ctx.drawImage(bg.morgue,0,0,W,H);shaftEmbers();
  drawBody(112,264,3.4,prof.save.eq,{run:0,dead:t<.75});
  if(t<.75){const k=clamp(t/.75,0,1),e=k*k,x=posFrom.x+(c.x-posFrom.x)*e,y=posFrom.y+(c.y-posFrom.y)*e;soulTrail(x,y,1-k);soulFlame(x,y,1-k*.6)}
  else{const f=clamp(1-(t-.75)/.35,0,1);if(f>0){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,140);
    g.addColorStop(0,'rgba(140,220,255,'+f+')');g.addColorStop(1,'rgba(40,120,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()}}
  drawFx();
  const ui=clamp(1-t/.3,0,1);if(ui>0)drawPileUI(ui);
  const bl=clamp((t-1.2)/.5,0,1);if(bl>0){ctx.fillStyle='rgba(0,0,0,'+bl+')';ctx.fillRect(0,0,W,H)}
}

/** Abgrund: Körper wählen. arg = Meldung oben; ohne arg bleibt die Auswahl, wie sie war. */
export const abyssScene:Scene={
  enter:(m)=>{if(typeof m==='string')resetPile(m)},
  update:(dt)=>{updPile();updFx(dt)},
  draw:drawPile,
};
/** Run-Ende nach dem Tod: die Seele sinkt durch den Schacht herab. */
export const descentScene:Scene={
  enter:(m)=>{resetPile(typeof m==='string'?m:pileMsg);fallT=0;beep(700,2,'sine',.035,-500)},
  update:updFall,
  draw:drawFall,
};
/** Die Seele fährt in den gewählten Körper, dann startet der Run. */
export const possessScene:Scene={
  enter:()=>{posT=0;posFrom=soulPos();posHit=false;beep(330,.7,'sine',.04,500)},
  update:updPossess,
  draw:drawPossess,
};
