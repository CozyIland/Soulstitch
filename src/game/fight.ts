import { ctx } from '../core/canvas.ts';
import { W, H, GY, AL, AR, SP, OUT } from '../core/constants.ts';
import { TAU, rnd, clamp } from '../core/util.ts';
import { G } from '../core/state.ts';
import { beep } from '../core/audio.ts';
import { K, KP, mouse, touch, JB, DB } from '../core/input.ts';
import { txt, circ, poly, rr } from '../render/draw.ts';
import { drawBody } from '../render/body.ts';
import { drawShape } from '../render/shapes.ts';
import { bg, drawStage, shadow } from '../render/backgrounds.ts';
import { soulFlame } from '../render/soul.ts';
import { BOSSES, BALANCE, TEXTS, fmt } from '../data/index.ts';
import { GROUND_MOVES } from './constants.ts';
import { bossReward, bossMaxHp } from './stats.ts';
import type { Stats } from './stats.ts';
import { fightWon, nextFight, endRun } from './run.ts';
import type { Scene } from './scenes.ts';
import { prof, persist, stats, bonesTxt } from './profile.ts';
import { world, eb, pb, hz, shot, burst, hitP, aim, clearArena } from './world.ts';
import { A } from './attacks.ts';

// Ein Kampf gegen einen Boss: Intro-Banner → Kampf → Sieg-Banner oder Todessequenz.
type Phase='intro'|'play'|'clear'|'dead';
let phase:Phase='intro',pt=0,bossN=1,msg='',deadT=0,st:Stats=null;

function startFight(n:number){
  bossN=n;const d=BOSSES[n-1];st=stats();
  world.p={x:140,y:GY,vy:0,gnd:true,hp:st.hp,inv:0,iv:0,cd:0,dcd:0,dashT:0,jb:0,mf:1,f:1,run:0,aim:0,jumps:0,hits:0,horned:true,hurt:false};
  const vr=BALANCE.boss.sizes[d.size-1],gnd=GROUND_MOVES.includes(d.move);
  world.b={def:d,n,hp:bossMaxHp(n),max:bossMaxHp(n),vr,r:vr*.68,gnd,x:d.move==='center'?W/2:gnd?500:460,y:gnd?GY-vr:d.move==='strafe'?85:150,f:-1,
     inv:0,atk:1,ai:0,timers:[],state:'move',st:0,dir:rnd()<.5?-1:1,oa:0,
     bvx:d.speed*SP*(rnd()<.5?-1:1)*.75,bvy:d.speed*SP*.6};
  clearArena();phase='intro';pt=1.7;msg='';deadT=0;
  beep(196,.15);setTimeout(()=>beep(147,.3),150);
}
function hurtPlayer(){
  const p=world.p;
  if(G.debug.god)return;
  if(phase!=='play'||p.inv>0||p.iv>0)return;
  p.hp--;G.shake=8;burst(p.x,p.y-17,16,'#ff3838');beep(120,.3,'sawtooth',.08,-80);
  p.hurt=true;
  if(p.hp<=0){phase='dead';deadT=0;p.dieY=p.y;p.inv=0;p.dashT=0;persist();burst(p.x,p.y-17,14,'#ddd4ba',120)}else p.inv=BALANCE.player.hitInvulnerability+st.inv;
}
function hurtBoss(dmg){
  const p=world.p,b=world.b;
  if(b.state==='hidden'||b.hp<=0)return false;
  b.hp-=dmg;b.inv=.12;G.shake=Math.max(G.shake,3);burst(b.x,b.y,8,b.def.accent);beep(520,.06,'square',.05,200);
  if(st.leech&&++p.hits%st.leech===0&&p.hp<st.hp){p.hp++;burst(p.x,p.y-17,12,'#40e0ff');beep(880,.12,'sine',.06,300)}
  if(b.hp<=.001){
    b.hp=0;b.timers.length=0;eb.length=0;hz.length=0;phase='clear';pt=2.4;burst(b.x,b.y,60,b.def.color,240);burst(b.x,b.y,30,b.def.accent,160);G.shake=12;
    beep(262,.1);setTimeout(()=>beep(330,.1),100);setTimeout(()=>beep(392,.25),200);
    const gain=bossReward(b.n,p.hurt);prof.save.bones+=gain;prof.save.best=Math.max(prof.save.best,b.n);persist();fightWon(gain);
    msg=fmt(p.hurt?TEXTS.fight.reward:TEXTS.fight.rewardNoHit,{gain,bonus:BALANCE.rewards.noHitBonus});
  }
  return true;
}
function updPlayer(dt){
  const p=world.p,b=world.b;
  let mx=(K('KeyD','ArrowRight')?1:0)-(K('KeyA','ArrowLeft')?1:0);
  const rage=st.rage&&p.hp===1,spd=st.speed*(rage?1.4:1);
  if(touch.joy&&Math.abs(touch.joy.dx)>.25)mx=Math.sign(touch.joy.dx);
  p.inv-=dt;p.iv-=dt;p.cd-=dt;p.dcd-=dt;p.jb-=dt;
  if(KP('Space','KeyW','ArrowUp'))p.jb=.12;
  const hold=K('Space','KeyW','ArrowUp');
  if(p.dashT>0){p.dashT-=dt;p.x+=p.ddx*460*dt;p.vy=0;
    if(st.horn&&!p.horned&&b.state!=='hidden'&&Math.hypot(p.x-b.x,p.y-17-b.y)<b.r+10){p.horned=true;hurtBoss(3);beep(160,.15,'sawtooth',.07)}
    G.fx.push({x:p.x,y:p.y-17+rnd(-10,10),vx:0,vy:0,life:.22,col:'#55ffff',r:3})}
  else{
    p.x+=mx*spd*dt;if(mx){p.run+=dt*spd*.085;p.mf=mx}else p.run=0;
    if(KP('ShiftLeft','ShiftRight','KeyK','KeyL')&&p.dcd<=0){p.dashT=.22;p.iv=.32;p.dcd=st.dcd;p.horned=false;p.ddx=mx||p.mf;beep(700,.08,'square',.04,400)}
    if(p.jb>0&&(p.gnd||st.dbl&&p.jumps<2)){p.vy=-BALANCE.player.jump*st.jmp;p.jumps=p.gnd?1:2;p.gnd=false;p.jb=0;beep(p.jumps>1?480:380,.07,'square',.03,260);
      if(p.jumps>1)for(let i=0;i<6;i++)G.fx.push({x:p.x+rnd(-6,6),y:p.y,vx:rnd(-50,50),vy:rnd(10,60),life:.3,col:'#8fd08f',r:2})}
    p.vy+=BALANCE.player.gravity*dt*(p.vy<0&&!hold?2.6:1);p.y+=p.vy*dt;
    if(p.y>=GY){p.y=GY;p.vy=0;if(!p.gnd){p.gnd=true;p.jumps=0;for(let i=0;i<4;i++)G.fx.push({x:p.x+rnd(-6,6),y:GY,vx:rnd(-40,40),vy:rnd(-30,0),life:.25,col:'#8a6a50',r:2})}}
  }
  p.x=clamp(p.x,AL+8,AR-8);
  // Touch: geschossen wird genau auf die Stelle, die rechts angetippt wird; sonst Blick in Laufrichtung
  const a=touch.mode?(touch.aim?Math.atan2(touch.aim.y-(p.y-25),touch.aim.x-p.x):(p.mf<0?Math.PI:0)):mouse.down?Math.atan2(mouse.y-(p.y-25),mouse.x-p.x):Math.atan2(b.y-(p.y-25),b.x-p.x);
  p.aim=a;p.f=Math.cos(a)>=0?1:-1;
  if((mouse.down||(touch.mode&&touch.aim)||K('KeyJ','KeyX'))&&p.cd<=0&&phase==='play'){
    for(const o of st.twin?[-.1,.1]:[0])pb.push({x:p.x+Math.cos(a)*12,y:p.y-25+Math.sin(a)*12,vx:Math.cos(a+o)*st.bs,vy:Math.sin(a+o)*st.bs,life:st.life,dmg:st.dmg,home:st.home});
    p.cd=BALANCE.player.fireCooldown/st.fr/(rage?1.4:1);beep(st.dmg>1?180:660,.05,'square',.03,st.dmg>1?-60:-200);
  }
}
function updBoss(dt){
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
  if(b.state!=='hidden'&&hitP(b.x,b.y,b.r))hurtPlayer();
}
function updBullets(dt){
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
    if(hitP(e.x,e.y,e.r*.85))hurtPlayer();
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
      if(h.t>=h.T&&Math.abs(p.x-h.x)<h.w/2+4)hurtPlayer();
      if(h.t>=h.T+h.act)hz.splice(i,1);
    }else{
      if(h.t>h.tele){
        h.a+=h.w*dt;
        if(h.b.state!=='hidden'){const ex=p.x-h.b.x,ey=p.y-17-h.b.y,c=Math.cos(h.a),s=Math.sin(h.a);
          if(ex*c+ey*s>0&&Math.abs(ex*s-ey*c)<11)hurtPlayer()}
      }
      if(h.t>h.tele+h.act)hz.splice(i,1);
    }
  }
}
function updFight(dt){
  pt-=dt;
  if(phase==='intro'){if(pt<=0)phase='play'}
  else if(phase==='play'){updPlayer(dt);updBoss(dt);updBullets(dt)}
  else if(phase==='dead'){deadT+=dt;updBullets(dt);if(deadT>=.6&&deadT-dt<.6){beep(260,2.2,'sine',.045,520);beep(392,2,'triangle',.02,700)}if(deadT>=2.4&&deadT-dt<2.4){beep(73,1.6,'triangle',.1);beep(110,1.2,'sine',.05,-30)}
    if(deadT>=4.8)endRun('death',fmt(TEXTS.abyss.death,{n:bossN,name:BOSSES[bossN-1].name}))}
  else if(phase==='clear'){updPlayer(dt);updBullets(dt);if(pt<=0)nextFight()}
  for(let i=G.fx.length-1;i>=0;i--){const f=G.fx[i];f.x+=f.vx*dt;f.y+=f.vy*dt;f.life-=dt;if(f.life<=0)G.fx.splice(i,1)}
}


function drawFight(){
  const p=world.p,b=world.b;
  ctx.save();if(G.shake>0)ctx.translate(rnd(-G.shake,G.shake)*.6,rnd(-G.shake,G.shake)*.6);
  drawStage();
  const d=b.def;
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
  // Spieler
  if(phase==='dead')deadBody();
  else{
    shadow(p.x,p.y,12);
    if(!(p.inv>0&&(G.time*16|0)%2))drawBody(p.x,p.y,1.2,prof.save.eq,{f:p.f,run:p.run,air:!p.gnd,aim:p.aim,flash:p.dashT>0});
  }
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
  ctx.globalCompositeOperation='lighter';
  for(const f of G.fx){ctx.globalAlpha=clamp(f.life*4,0,1);circ(ctx,f.x,f.y,f.r||2,f.col)}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.drawImage(bg.front,0,0,W,H);
  ctx.restore();
  // HUD
  const gr=ctx.createLinearGradient(0,0,0,50);gr.addColorStop(0,'rgba(8,5,7,.85)');gr.addColorStop(1,'rgba(8,5,7,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,W,50);
  txt('BOSS '+b.n+'/'+BOSSES.length+' · '+d.name,W/2,6,'#f4ead4','center',15,true,true);
  const pw=Math.min(15,380/b.max),x0=W/2-b.max*pw/2;
  for(let i=0;i<b.max;i++){rr(ctx,x0+i*pw,27,pw-2,8,2);ctx.fillStyle=i<b.hp?d.accent:'#2a1c1e';ctx.fill();ctx.strokeStyle=OUT;ctx.lineWidth=1;ctx.stroke();
    if(i<b.hp){ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(x0+i*pw+1,28,pw-4,2.5)}}
  for(let i=0;i<st.hp;i++){ctx.save();ctx.translate(20+i*20,17);ctx.beginPath();ctx.moveTo(0,6);ctx.bezierCurveTo(-11,-3,-5,-10,0,-4);ctx.bezierCurveTo(5,-10,11,-3,0,6);
    ctx.fillStyle=i<p.hp?'#ff3858':'#3a1c22';ctx.fill();ctx.strokeStyle=OUT;ctx.lineWidth=1.4;ctx.stroke();ctx.restore()}
  rr(ctx,12,30,62,6,3);ctx.fillStyle='#182a30';ctx.fill();ctx.strokeStyle=OUT;ctx.lineWidth=1;ctx.stroke();
  const dk=clamp(1-p.dcd/st.dcd,0,1);if(dk>.1){rr(ctx,12,30,62*dk,6,3);ctx.fillStyle=dk>=1?'#5ff':'#2a8a96';ctx.fill()}
  txt((prof.test?'TESTMODUS':'Rekord '+prof.save.best)+'   ☠ '+bonesTxt(),W-12,40,'#b0a090','right',12);
  if(touch.mode&&phase!=='dead'){
    for(const[q,l]of[[JB,'SPRUNG'],[DB,'DASH']] as [typeof JB,string][]){ctx.globalAlpha=.4;circ(ctx,q.x,q.y,q.r,'#fff');ctx.globalAlpha=1;ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.stroke();txt(l,q.x,q.y-6,'#fff','center',10,true)}
    if(touch.joy){ctx.globalAlpha=.3;circ(ctx,touch.joy.ox,touch.joy.oy,30,'#fff');ctx.globalAlpha=.7;circ(ctx,touch.joy.ox+touch.joy.dx*26,touch.joy.oy+(touch.joy.up?-22:0),14,touch.joy.up?'#ffd040':'#5ff');ctx.globalAlpha=1}
    if(touch.aim){ctx.strokeStyle='rgba(255,96,80,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(touch.aim.x,touch.aim.y,10,0,TAU);ctx.moveTo(touch.aim.x-15,touch.aim.y);ctx.lineTo(touch.aim.x-5,touch.aim.y);ctx.moveTo(touch.aim.x+5,touch.aim.y);ctx.lineTo(touch.aim.x+15,touch.aim.y);ctx.moveTo(touch.aim.x,touch.aim.y-15);ctx.lineTo(touch.aim.x,touch.aim.y-5);ctx.moveTo(touch.aim.x,touch.aim.y+5);ctx.lineTo(touch.aim.x,touch.aim.y+15);ctx.stroke()}
    else if(bossN===1)txt('rechts tippen: dorthin schießen',W-150,248,'rgba(255,255,255,.55)','center',11,true);
  }
  const band=(c:string)=>{ctx.fillStyle=c;ctx.fillRect(0,138,W,74)};
  if(phase==='intro'){band('rgba(0,0,0,.62)');txt('BOSS '+b.n,W/2,146,d.accent,'center',14,true);txt(d.name,W/2,166,'#fff','center',30,true,true)}
  if(phase==='clear'){band('rgba(0,0,0,.62)');txt(bossN>=BOSSES.length?TEXTS.fight.clearedLast:TEXTS.fight.cleared,W/2,150,'#5ff','center',30,true,true);if(msg)txt(msg,W/2,190,'#ffd040','center',13,true)}
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
      txt(fmt(TEXTS.fight.defeatedBy,{name:d.name,n:bossN}),W/2,204,'#8a7a70','center',13,false,true);ctx.globalAlpha=1}
  }
}

function deadBody(){
  const p=world.p;
  const k=clamp(deadT/.45,0,1),e=k*k,y=p.dieY+(GY-p.dieY)*e;
  ctx.save();ctx.translate(p.x,y-3*e);ctx.rotate(-Math.PI/2*e*p.f);drawBody(0,0,1.2,prof.save.eq,{f:p.f,aim:p.aim});ctx.restore();
}

export const fightScene:Scene={enter:(n)=>startFight(n as number),update:updFight,draw:drawFight};

/** Für Debug und Tests */
export const fightDebug={
  info:()=>({phase,bossN,hp:world.b?world.b.hp:0,eb:eb.length,pb:pb.length}),
  kill:()=>{if(phase==='play'&&world.b)hurtBoss(world.b.hp)},
  die:()=>{if(phase!=='play')return;const p=world.p,god=G.debug.god;G.debug.god=false;p.inv=0;p.iv=0;p.hp=1;hurtPlayer();G.debug.god=god},
};
