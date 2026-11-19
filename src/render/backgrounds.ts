// Gemalte Hintergründe (einmal pro Auflösung vorberechnet) und Lichteffekte
import { cv, ctx } from '../core/canvas.ts';
import { W, H, GY, OUT, LW } from '../core/constants.ts';
import { TAU, rnd, clamp } from '../core/util.ts';
import { G } from '../core/state.ts';
import { circ, poly, rr } from './draw.ts';

function mk(fn:(g:CanvasRenderingContext2D)=>void){const c=document.createElement('canvas');c.width=Math.round(W*S);c.height=Math.round(H*S);const g=c.getContext('2d') as CanvasRenderingContext2D;g.scale(c.width/W,c.height/H);fn(g);return c}
const mir=(pts:number[])=>pts.map((v,i)=>i%2?v:W-v);
function both(g:CanvasRenderingContext2D,pts:number[],fill:string|CanvasGradient,stroke:string|null=OUT,lw=1.2){poly(g,pts,fill,stroke,lw);poly(g,mir(pts),fill,stroke,lw)}
function antler(g:CanvasRenderingContext2D,x:number,y:number,s:number,f:number,cols:[number,string][]=[[3.6,OUT],[2.4,'#6e5a50'],[.8,'#9a7e6e']]){
  const P=[[0,0,-4,-16,2,-28,-2,-42],[-4,-16,-12,-24,-10,-36],[2,-28,9,-34,8,-45],[0,0,7,-8,6,-17]];
  for(const[w,c]of cols)for(const pts of P){
    g.beginPath();
    for(let i=0;i<pts.length;i+=2){const px=x+(pts[i]-(w<1?.5:0))*s*f,py=y+pts[i+1]*s;i?g.lineTo(px,py):g.moveTo(px,py)}
    g.lineWidth=w*s;g.strokeStyle=c;g.lineJoin='miter';g.lineCap='butt';g.stroke();
  }
}
export function paintArena(g){
  const cx=W/2;let gr=g.createLinearGradient(0,0,0,GY);
  gr.addColorStop(0,'#171215');gr.addColorStop(.6,'#33262a');gr.addColorStop(1,'#2a2022');g.fillStyle=gr;g.fillRect(0,0,W,H);
  // Ränge des Knochenkolosseums mit Schädelpublikum
  for(let r=0;r<4;r++){const y=30+r*44;g.fillStyle=['#1f181c','#251d21','#2c2226','#32272a'][r];g.fillRect(0,y,W,44);
    g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,y,W,3);g.fillStyle='rgba(255,220,180,.05)';g.fillRect(0,y+3,W,1.5);
    for(let x=6+(r%2)*17;x<W;x+=34){
      g.fillStyle='#110c0f';g.beginPath();g.moveTo(x,y+44);g.lineTo(x,y+22);g.arc(x+11,y+22,11,Math.PI,0);g.lineTo(x+22,y+44);g.fill();
      if((x*7+r*13)%5>1){const c=['#4a4038','#5a4e44','#6a5c50','#786858'][r];circ(g,x+11,y+31,5.5,c);g.fillStyle=c;g.fillRect(x+8,y+35,6,4);
        g.fillStyle='#110c0f';g.fillRect(x+8,y+30,2.2,2.4);g.fillRect(x+12,y+30,2.2,2.4)}}}
  gr=g.createRadialGradient(cx,GY-70,10,cx,GY-70,300);gr.addColorStop(0,'rgba(255,150,55,.75)');gr.addColorStop(.5,'rgba(255,120,40,.25)');gr.addColorStop(1,'rgba(255,120,40,0)');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  // Stachelpalisade, zum Tor hin heller
  const pc=['#523c38','#66463a','#7c523a','#96603a','#b06e38','#ca8038'];
  for(let i=0;i<6;i++){const x0=160+i*16.5,ty=92+i*11;
    both(g,[x0,GY-4,x0,ty+30,x0+5,ty,x0+17,ty+36,x0+17,GY-4],pc[i]);
    both(g,[x0+11,GY-4,x0+11,ty+30,x0+17,ty+36,x0+17,GY-4],'rgba(0,0,0,.2)',null)}
  // Tor
  gr=g.createRadialGradient(cx,GY-50,4,cx,GY-50,120);gr.addColorStop(0,'#fff0b8');gr.addColorStop(.4,'#ffae48');gr.addColorStop(1,'#c05a1a');
  poly(g,[258,GY-22,258,160,286,136,cx,118,354,136,382,160,382,GY-22],gr,OUT,1.6);
  poly(g,[294,134,cx,108,346,134,336,148,304,148],'#5c4842',OUT,1.6);
  poly(g,[304,148,cx,140,336,148,cx,156],'#473632');
  both(g,[270,166,306,176,298,198,278,188],'rgba(150,70,20,.8)');
  both(g,[280,204,306,210,300,GY-22,286,GY-22],'rgba(170,85,25,.65)');
  // Monolithen
  both(g,[0,GY+16,0,74,26,42,96,22,152,36,164,GY-4,150,GY+16],'#3a3336',OUT,1.6);
  both(g,[26,42,96,22,152,36,130,50,42,62],'#4e4649');
  for(const m of[0,1]){gr=g.createLinearGradient(0,40,0,GY);gr.addColorStop(0,'#b06a3a');gr.addColorStop(1,'#6a4434');
    const q=[152,36,164,GY-4,138,GY-4,130,50];poly(g,m?mir(q):q,gr)}
  both(g,[0,74,26,42,42,62,34,GY+16,0,GY+16],'#2b2528');
  both(g,[42,62,130,50,118,150,60,170],'rgba(255,255,255,.03)',null);
  // Stufen
  poly(g,[246,GY-22,394,GY-22,394,GY-16,246,GY-16],'#8e5e3c');
  poly(g,[238,GY-16,402,GY-16,402,GY-10,238,GY-10],'#77523a');
  poly(g,[230,GY-10,410,GY-10,410,GY-4,230,GY-4],'#624636');
  // Plattform: Oberseite, Vorderkante, Sockel mit Spitze
  gr=g.createRadialGradient(cx,GY-4,8,cx,GY-4,340);gr.addColorStop(0,'#d8924c');gr.addColorStop(.3,'#8e5e40');gr.addColorStop(.7,'#56443f');gr.addColorStop(1,'#463b39');
  poly(g,[12,GY-4,628,GY-4,640,GY+16,0,GY+16],gr,OUT,1.6);
  g.strokeStyle='rgba(0,0,0,.16)';g.lineWidth=.8;
  for(const[a,c]of[[90,60],[200,180],[cx-40,cx-56],[cx+40,cx+56],[440,460],[550,580]]){g.beginPath();g.moveTo(a,GY-4);g.lineTo(c,GY+16);g.stroke()}
  poly(g,[0,GY+16,640,GY+16,640,GY+36,0,GY+36],'#2f282a',OUT,1.6);
  poly(g,[0,GY+36,640,GY+36,640,H,0,H],'#1f1a1c',OUT,1.6);
  poly(g,[0,GY+36,640,GY+36,cx,GY+56],'#282224',null);
  g.fillStyle='rgba(255,180,110,.10)';g.fillRect(0,GY+16,W,2);
  // Dornen und Knochenäste
  for(const[x,h]of[[214,16],[222,24],[206,11],[190,14]])both(g,[x-2.5,GY-4,x,GY-4-h,x+2.5,GY-4],'#2a2224');
  for(const[x,y,s,f]of[[104,GY-2,2.2,1],[60,GY,1.7,-1],[150,GY-3,1.3,1],[24,GY+4,1.4,1]]){antler(g,x,y,s,f);antler(g,W-x,y,s,-f)}
}
export function paintFront(g){
  const dark:[number,string][]=[[3.6,'#0c090a'],[2.4,'#151012']];
  antler(g,6,H+26,3.4,1,dark);antler(g,W-6,H+26,3.4,-1,dark);antler(g,52,H+40,2.6,-1,dark);antler(g,W-52,H+40,2.6,1,dark);
  const gr=g.createRadialGradient(W/2,H/2,190,W/2,H/2,410);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=gr;g.fillRect(0,0,W,H);
}
export function paintMorgue(g){
  // Gruft unter dem Knochenkolosseum: derselbe Stein, dieselben Schädelnischen wie oben in der Arena
  let gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#130e11');gr.addColorStop(.55,'#271d21');gr.addColorStop(1,'#1b1417');g.fillStyle=gr;g.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=18)for(let x=((y/18)%2)*16-16;x<W;x+=32){
    g.fillStyle=(x*7+y*3)%11<3?'rgba(255,215,180,.06)':'rgba(255,215,180,.03)';g.fillRect(x+1,y+1,30,15);
    g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x,y+16,32,2);g.fillRect(x,y,1.5,18)}
  // Grabnischen mit Schädeln
  for(let x=8;x<226;x+=36){const y=56;
    g.fillStyle='#0f0a0d';g.beginPath();g.moveTo(x,y+46);g.lineTo(x,y+16);g.arc(x+14,y+16,14,Math.PI,0);g.lineTo(x+28,y+46);g.closePath();g.fill();
    g.strokeStyle='rgba(255,215,180,.08)';g.lineWidth=2;g.stroke();
    if((x/36|0)%3!==1){circ(g,x+14,y+33,6.5,'#6a5c50');g.fillStyle='#6a5c50';g.fillRect(x+10.5,y+37,7,4.5);
      g.fillStyle='#110c0f';g.fillRect(x+10.5,y+31,2.6,2.8);g.fillRect(x+15,y+31,2.6,2.8)}
    else for(const[a,b2]of[[x+6,y+40],[x+22,y+36]]){g.strokeStyle='#5a4e44';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(a,b2);g.lineTo(x+14,y+42);g.stroke()}}
  g.fillStyle='#33262a';g.fillRect(0,102,232,6);g.fillStyle='rgba(255,220,180,.06)';g.fillRect(0,102,232,1.5);g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,108,232,3);
  // Schacht in der Decke: von oben fällt das Feuerlicht der Arena herein (und die Toten)
  gr=g.createLinearGradient(0,0,0,320);gr.addColorStop(0,'rgba(255,165,75,.34)');gr.addColorStop(1,'rgba(255,140,60,0)');
  g.fillStyle=gr;g.beginPath();g.moveTo(80,0);g.lineTo(146,0);g.lineTo(262,320);g.lineTo(-38,320);g.fill();
  g.fillStyle='#0a0607';g.beginPath();g.ellipse(113,0,40,12,0,0,TAU);g.fill();g.strokeStyle='#3a2c2c';g.lineWidth=3;g.stroke();
  gr=g.createRadialGradient(113,0,4,113,0,50);gr.addColorStop(0,'rgba(255,190,100,.55)');gr.addColorStop(1,'rgba(255,150,60,0)');g.fillStyle=gr;g.fillRect(60,0,106,50);
  // Riesiger Leichenhaufen
  let seed=11;const R=()=>(seed=seed*16807%2147483647)/2147483647;
  const top=x=>262+Math.pow(Math.abs(x-112)/170,1.5)*110;
  g.beginPath();g.moveTo(-40,H);for(let x=-40;x<=290;x+=6)g.lineTo(x,top(x));g.lineTo(290,H);g.closePath();
  gr=g.createLinearGradient(0,256,0,H);gr.addColorStop(0,'#3e2e2c');gr.addColorStop(1,'#140e10');g.fillStyle=gr;g.fill();
  g.strokeStyle=OUT;g.lineWidth=LW;g.stroke();
  const bone=(x,y,a,l)=>{const dx=Math.cos(a)*l/2,dy=Math.sin(a)*l/2;
    for(const[w,c]of[[3.4+LW,OUT],[3.4,'#b0a088']]){g.strokeStyle=c;g.lineWidth=w;g.lineCap='round';g.beginPath();g.moveTo(x-dx,y-dy);g.lineTo(x+dx,y+dy);g.stroke()}
    circ(g,x-dx,y-dy,2.5,'#c2b296');circ(g,x+dx,y+dy,2.5,'#c2b296')};
  const skull=(x,y,r)=>{circ(g,x,y,r,'#8e7e68');g.strokeStyle=OUT;g.lineWidth=LW*.8;g.stroke();
    g.fillStyle='rgba(255,240,210,.14)';g.beginPath();g.arc(x-r*.3,y-r*.3,r*.45,0,TAU);g.fill();
    g.fillStyle='#140e10';g.fillRect(x-r*.55,y-r*.1,r*.38,r*.38);g.fillRect(x+r*.15,y-r*.1,r*.38,r*.38)};
  const corpse=(x,y,a,s)=>{g.save();g.translate(x,y);g.rotate(a);g.scale(s,s);
    const c=['#7a6a5c','#86705e','#6a6058'][R()*3|0],w=LW/s;
    for(const[x1,y1,x2,y2]of[[-6,-2,-14,-8],[-6,2,-15,6],[6,-2,15,-5],[6,2,14,8]])
      for(const[lw,cc]of[[2.8+w*1.3,OUT],[2.8,c]]){g.strokeStyle=cc;g.lineWidth=lw;g.lineCap='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()}
    rr(g,-8,-4.5,16,9,3);g.fillStyle=c;g.fill();g.strokeStyle=OUT;g.lineWidth=w;g.stroke();
    g.beginPath();g.moveTo(-3,-3);g.lineTo(-1,-1);g.moveTo(-1,-3);g.lineTo(-3,-1);g.lineWidth=w*.55;g.stroke();
    circ(g,-11,0,4.6,'#8e7e68');g.lineWidth=w;g.stroke();g.restore()};
  for(let i=0;i<150;i++){const x=R()*330-40,t=top(x),y=t+6+R()*(H-t);if(y>H+6)continue;const k=R();
    if(k<.3)corpse(x,y,R()*TAU,1.3+R()*.6);else if(k<.65)bone(x,y,R()*TAU,14+R()*14);else skull(x,y,5+R()*4)}
  for(const x of[6,40,74,98,138,166,198,232])skull(x,top(x)+2,6+R()*2);
  corpse(66,top(66)+4,.3,1.6);corpse(176,top(176)+6,-.4,1.5);bone(124,top(124)+3,.2,22);bone(96,top(96)+4,-.5,18);
  // Feuerschein von oben auf der Spitze des Haufens
  gr=g.createRadialGradient(112,268,4,112,268,120);gr.addColorStop(0,'rgba(255,160,70,.22)');gr.addColorStop(1,'rgba(255,140,60,0)');g.fillStyle=gr;g.fillRect(-10,150,250,210);
  gr=g.createLinearGradient(0,268,0,H);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=gr;g.fillRect(-40,256,340,H);
  gr=g.createRadialGradient(W/2,H/2,190,W/2,H/2,410);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=gr;g.fillRect(0,0,W,H);
}
// Glut, die durch den Schacht in die Gruft rieselt
export function shaftEmbers(){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<22;i++){const e=EMB[i],h=(G.time*e.s*.5+e.o)%280,k=h/280;ctx.globalAlpha=(1-k)*.75;
    circ(ctx,113+(e.x-320)*.22*(1+k*2.5)+Math.sin(G.time*1.2+e.ph)*7,h,e.r,'#ffb050')}
  ctx.restore();ctx.globalAlpha=1;
}
/** Vorberechnete Hintergründe in Bildschirmauflösung; S = Pixel pro Spieleinheit */
export const bg={arena:null as HTMLCanvasElement,front:null as HTMLCanvasElement,morgue:null as HTMLCanvasElement};
let S=2;
export function resize(){
  const r=cv.getBoundingClientRect(),ns=clamp(Math.round(r.width*(window.devicePixelRatio||1)/W*4)/4,1,3);
  if(ns===S&&bg.arena)return;
  S=ns;cv.width=Math.round(W*S);cv.height=Math.round(H*S);
  bg.arena=mk(paintArena);bg.front=mk(paintFront);bg.morgue=mk(paintMorgue);
}
export const EMB=Array.from({length:40},()=>({x:200+rnd(240),o:rnd(260),s:rnd(18,50),ph:rnd(TAU),r:rnd(.8,2)}));


export function drawStage(){
  ctx.drawImage(bg.arena,0,0,W,H);
  ctx.globalCompositeOperation='lighter';
  const fl=.10+.05*Math.sin(G.time*7)+.03*Math.sin(G.time*13.3);
  const gr=ctx.createRadialGradient(W/2,GY-60,10,W/2,GY-60,240);gr.addColorStop(0,'rgba(255,160,60,'+fl+')');gr.addColorStop(1,'rgba(255,120,40,0)');
  ctx.fillStyle=gr;ctx.fillRect(60,30,520,300);
  for(const e of EMB){const h=(G.time*e.s+e.o)%260;ctx.globalAlpha=(1-h/260)*.8;circ(ctx,e.x+Math.sin(G.time*1.4+e.ph)*10,GY-h,e.r,'#ffb050')}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
export function shadow(x,y,w){const k=clamp(1-(GY-y)/260,.25,1);ctx.fillStyle='rgba(0,0,0,'+(.38*k)+')';ctx.beginPath();ctx.ellipse(x,GY+4,w*k,w*k*.22,0,0,TAU);ctx.fill()}
