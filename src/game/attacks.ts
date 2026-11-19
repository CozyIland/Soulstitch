// Angriffsmuster der Bosse. Welcher Boss welche Muster nutzt, steht in data/bosses.json.
import { GY, AL, AR, SP } from '../core/constants.ts';
import { TAU, rnd, clamp } from '../core/util.ts';
import { beep } from '../core/audio.ts';
import { world, eb, hz, shot, after, burst, aim } from './world.ts';
import type { Boss } from './world.ts';
import type { AttackName } from './constants.ts';

type AttackFn=(b:Boss,...args:number[])=>void;

export const A:Record<AttackName,AttackFn>={
 aimed(b,n=1,s=80){for(let i=0;i<n;i++)after(b,i*.18,()=>{shot(b.x,b.y,aim(b),s);beep(330,.04)})},
 fan(b,n=3,spr=.5,s=80){const a=aim(b);for(let i=0;i<n;i++)shot(b.x,b.y,a+(i/(n-1)-.5)*spr,s);beep(300,.06)},
 ring(b,n=8,s=65,off=0){for(let i=0;i<n;i++)shot(b.x,b.y,off+i*TAU/n,s);beep(220,.08)},
 spiral(b,dur=2,arms=1,s=70,rot=2.5){const a0=rnd(TAU);for(let t=0;t<dur;t+=.09)after(b,t,()=>{for(let k=0;k<arms;k++)shot(b.x,b.y,a0+t*rot+k*TAU/arms,s)})},
 flower(b,n=10,s=60){for(let j=0;j<3;j++)after(b,j*.45,()=>A.ring(b,n,s+j*8,j*Math.PI/n))},
 accRing(b,n=10){for(let i=0;i<n;i++)shot(b.x,b.y,i*TAU/n+rnd(.3),18,{acc:1.5,col:'#44ffff'});beep(500,.1,'square',.05,300)},
 // Ansturm: Bodenbosse rennen quer durch die Arena, fliegende stürzen auf dich
 charge(b,n=1,s=250){b.state='tele';b.ca=b.gnd?(world.p.x>b.x?0:Math.PI):aim(b);b.st=.65;b.cs=s*SP;b.cn=n;beep(140,.3,'sawtooth',.05,200)},
 // Sprung auf deine Position, Landung schickt zwei Bodenwellen los
 slam(b){b.state='leap';b.lt=0;b.lx=b.x;b.ly=b.y;b.tx=clamp(world.p.x,AL+b.r,AR-b.r);beep(200,.4,'triangle',.06,300)},
 tpRing(b,n=8){b.state='hidden';b.st=.6;b.tn=n;burst(b.x,b.y,12,b.def.color);let i=0;
   do{b.tx=rnd(AL+50,AR-50);b.ty=rnd(70,GY-b.vr-20)}while(Math.hypot(b.tx-world.p.x,b.ty-world.p.y)<120&&i++<20)},
 beam(b,n=1,w=0,tele=.8,act=.45){const a=aim(b);for(let k=0;k<n;k++)hz.push({k:'beam',b,a:a+k*TAU/n,w:w*(b.dir||1),t:0,tele,act});beep(900,.5,'sine',.03,-500)},
 // Knochensäulen von oben
 rain(b,n=6){for(let i=0;i<n;i++)after(b,i*.14,()=>hz.push({k:'col',x:i%3===0?world.p.x:rnd(AL+20,AR-20),w:30,t:0,T:.9,act:.2}))},
 // Decke mit Lücke oder niedrige Welle zum Überspringen
 wall(b,s=55){
   if(rnd()<.5){const gx=clamp(world.p.x+rnd(-170,170),AL+50,AR-50);for(let x=AL+8;x<AR;x+=24)if(Math.abs(x-gx)>46)shot(x,22,Math.PI/2,s)}
   else{const right=rnd()<.5,x0=right?AR-4:AL+4,a=right?Math.PI:0;for(const h of[8,22,36])shot(x0,GY-h,a,s*2.2);
     after(b,.55,()=>{for(const h of[8,22])shot(x0,GY-h,a,s*2.2)})}
   beep(110,.25,'sawtooth')},
 homing(b,n=1){for(let i=0;i<n;i++)shot(b.x,b.y,aim(b)+(i-(n-1)/2)*1.2,52,{home:1.7,life:4.5,col:'#d070ff',r:5.5})},
 // im Bogen geworfen, bleiben am Boden liegen
 mines(b,n=5){for(let i=0;i<n;i++)eb.push({x:b.x,y:b.y,vx:rnd(-240,240),vy:rnd(-340,-140),g:600,stick:1,r:5.5,life:9,col:'#ffa030'})},
 orbit(b,n=6){for(let i=0;i<n;i++)eb.push({x:b.x,y:b.y,vx:0,vy:0,r:4.5,life:6,col:'#ffff88',orb:{cx:b.x,cy:b.y,a:i*TAU/n,rad:12,da:1.9,dr:42}})},
 boom(b,n=1,spr=.6){const a0=aim(b);for(let i=0;i<n;i++){const a=a0+(n>1?(i/(n-1)-.5)*spr:0);
   shot(b.x,b.y,a,170,{ax:-Math.cos(a)*135*SP,ay:-Math.sin(a)*135*SP,life:2.7,col:'#66ff88',r:5.5})}beep(600,.15,'square',.04,-300)},
 split(b,n=8){shot(b.x,b.y,aim(b),75,{r:8,life:1.1,split:n,col:'#ffffff'})},
 bouncer(b,n=3){const a=aim(b);for(let i=0;i<n;i++)shot(b.x,b.y,a+(i/(n-1)-.5)*1,85,{bounce:2,life:6,col:'#88ccff'})}
};
