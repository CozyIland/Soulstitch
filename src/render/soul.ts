// Die Seele als Geist aus blauem Feuer, ihr Funkenschweif und allgemeine Partikel
import { ctx } from '../core/canvas.ts';
import { TAU, clamp } from '../core/util.ts';
import { G } from '../core/state.ts';
import { circ } from './draw.ts';

// Die Seele: ein Geist aus blauem Feuer (x,y = Mitte des Kopfes)
export function soulFlame(x,y,s){
  if(s<=0)return;const t=G.time;
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(0,8,0,0,8,56);g.addColorStop(0,'rgba(70,160,255,.45)');g.addColorStop(1,'rgba(30,80,255,0)');
  ctx.fillStyle=g;ctx.fillRect(-56,-48,112,112);
  // Flammenzungen auf dem Kopf
  for(const[i,dx]of[[0,-6],[1,0],[2,6]]){const h=(i===1?17:11)+Math.sin(t*11+i*2.1)*3,tip=dx*1.3+Math.sin(t*7+i)*2;
    ctx.beginPath();ctx.moveTo(dx-4.5,-5);ctx.quadraticCurveTo(dx-4,-5-h*.6,tip,-5-h);ctx.quadraticCurveTo(dx+4,-5-h*.6,dx+4.5,-5);
    ctx.fillStyle='rgba(60,150,255,.65)';ctx.fill();
    ctx.beginPath();ctx.moveTo(dx-2,-5);ctx.quadraticCurveTo(dx-1.5,-5-h*.4,tip*.8,-5-h*.7);ctx.quadraticCurveTo(dx+1.5,-5-h*.4,dx+2,-5);
    ctx.fillStyle='rgba(190,240,255,.6)';ctx.fill()}
  // Geisterkörper mit wehendem Schweif
  const sw=Math.sin(t*2.6)*6,w1=Math.sin(t*4.1)*1.6,w2=Math.sin(t*3.7+1)*1.6;
  const body=()=>{ctx.beginPath();ctx.moveTo(-11,0);ctx.arc(0,0,11,Math.PI,0);
    ctx.bezierCurveTo(11,10,9+w1,18,6+w1+sw*.3,26);ctx.bezierCurveTo(4+sw*.6,32,sw*.9+3,36,sw,43);
    ctx.bezierCurveTo(sw*.7-3,35,-3+sw*.4,31,-6+w2+sw*.3,26);ctx.bezierCurveTo(-9+w2,18,-11,10,-11,0);ctx.closePath()};
  for(const[k,col]of[[1,'rgba(45,120,255,.7)'],[.8,'rgba(80,190,255,.55)'],[.58,'rgba(205,246,255,.85)']] as [number,string][]){
    ctx.save();ctx.translate(0,3*(1-k));ctx.scale(k,k);body();ctx.fillStyle=col;ctx.fill();ctx.restore()}
  // Nebelarme
  for(const sd of[-1,1]){const a=Math.sin(t*3+sd)*3;ctx.beginPath();ctx.moveTo(sd*9,7);ctx.quadraticCurveTo(sd*17,8+a,sd*19,2+a);ctx.quadraticCurveTo(sd*15,12,sd*8,14);
    ctx.fillStyle='rgba(80,180,255,.55)';ctx.fill()}
  ctx.globalCompositeOperation='source-over';
  // Gesicht: dunkle Augen mit Lichtpunkt, blinzelt ab und zu
  const bl=(t%4.3)>4.15?.15:1;
  for(const sd of[-1,1]){ctx.fillStyle='#0b1c40';ctx.beginPath();ctx.ellipse(sd*4.2,1,2.3,3.3*bl,0,0,TAU);ctx.fill();
    if(bl>.5)circ(ctx,sd*4.2+.7,-.4,.85,'#c8f8ff')}
  ctx.fillStyle='#0b1c40';ctx.beginPath();ctx.ellipse(0,7,1.5,1.1+Math.sin(t*2)*.3,0,0,TAU);ctx.fill();
  ctx.restore();
}

export function soulTrail(x,y,a){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<12;i++){const ph=(G.time*.9+i/12)%1;ctx.globalAlpha=(1-ph)*.7*a;
    circ(ctx,x+Math.sin(i*7.3+G.time*3)*(4+ph*8),y+32+ph*42,(1-ph)*2.2+.5,i%3?'#58b8ff':'#c8f4ff')}
  ctx.restore();ctx.globalAlpha=1;
}
export function updFx(dt){for(let i=G.fx.length-1;i>=0;i--){const f=G.fx[i];if(f.g)f.vy+=f.g*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.life-=dt;if(f.life<=0)G.fx.splice(i,1)}}
export function drawFx(){ctx.save();ctx.globalCompositeOperation='lighter';for(const f of G.fx){ctx.globalAlpha=clamp(f.life*3,0,1);circ(ctx,f.x,f.y,f.r,f.col)}ctx.restore();ctx.globalAlpha=1}
