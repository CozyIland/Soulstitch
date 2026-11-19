import { ctx } from '../core/canvas.ts';
import { OUT, LW } from '../core/constants.ts';
import { TAU } from '../core/util.ts';
import { PART } from '../data/index.ts';
import type { Equip } from '../data/index.ts';
import { circ, poly, rr, shade } from './draw.ts';

// ---------- Spielfigur (Füße bei x,y) ----------
// hinterer Arm/hinteres Bein = links, vorderer (zielender) Arm/vorderes Bein = rechts
// Gleicher Stil wie die Bosse: Umriss LW (unabhängig von der Größe), Licht von oben links,
// hintere Gliedmaßen dunkler, Nähte an den Gelenken.
/** Beine: [Länge, Dicke]; Rumpfbreite je Brustteil */
const LEG:Record<string,[number,number]>={runner:[12,4],stilt:[18,3],spring:[12,4],frog:[13,4.8]};
const TW:Record<string,number>={thin:9,plated:11,soldier:12,colossus:17,hollow:9};
const look=(id:string)=>PART[id].look??'';
/** Beinlänge des angelegten Körpers (für die Position der Brust) */
export const legLength=(eq:Equip)=>Math.max(LEG[look(eq.beinL)][0],LEG[look(eq.beinR)][0]);

export interface BodyOpts{
  f?:number;      // Blickrichtung 1/-1
  run?:number;    // Laufphase
  air?:boolean;   // in der Luft
  aim?:number;    // Zielwinkel des vorderen Arms
  flash?:boolean; // weiß aufblitzen (Dash)
  dead?:boolean;  // ohne Seele: dunkle Augen, kaltes Herz
}

/** Zeichnet den Körper mit den Füßen bei (x,y) in Größe s. */
export function drawBody(x:number,y:number,s:number,eq:Equip,o:BodyOpts={}){
  const k=PART[eq.kopf],t=PART[eq.brust],h=PART[eq.herz],aB=PART[eq.armL],aF=PART[eq.armR],lB=PART[eq.beinL],lF=PART[eq.beinR];
  const f=o.f||1,ph=o.run||0,fl=o.flash,C=c=>fl?'#fff':c,D=c=>fl?'#fff':shade(c,.7),L=LW/s;
  const leg=legLength(eq),hip=-leg,tw=TW[t.look],th=13,sh=hip-th+3,hy=hip-th-6;
  const lx=o.aim===undefined?.45:Math.cos(o.aim)*f,ly=o.aim===undefined?.9:Math.sin(o.aim);
  ctx.save();ctx.translate(x,y);ctx.scale(s*f,s);ctx.lineJoin='round';ctx.lineCap='round';
  const seg=(x1,y1,x2,y2,w,col)=>{for(const[lw,c]of[[w+L*1.3,OUT],[w,col]]){ctx.strokeStyle=c;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}};
  const stitch=(cx,cy,r)=>{if(fl)return;ctx.strokeStyle=OUT;ctx.lineWidth=L*.55;ctx.beginPath();ctx.moveTo(cx-r,cy-r);ctx.lineTo(cx+r,cy+r);ctx.moveTo(cx+r,cy-r);ctx.lineTo(cx-r,cy+r);ctx.stroke()};
  const arm=(q,x0,y0,dx,dy,col)=>{
    const lk=q.look,w=lk==='cannon'?5.2:lk==='shield'?3.8:3.2,len=lk==='spear'?12:10,x1=x0+dx*len,y1=y0+dy*len;
    seg(x0,y0,x1,y1,w,col(q.col));
    if(lk==='cannon')seg(x1,y1,x1+dx*3.5,y1+dy*3.5,w+1.6,col('#3a4256'));
    if(lk==='spear')poly(ctx,[x1+dx*7,y1+dy*7,x1-dy*2.6,y1+dx*2.6,x1+dy*2.6,y1-dx*2.6],col('#efe4c8'),OUT,L);
    if(lk==='shield'){ // runder Knochenschild an der Hand
      circ(ctx,x1,y1,4.6,col('#e6dcc2'));ctx.strokeStyle=OUT;ctx.lineWidth=L;ctx.beginPath();ctx.arc(x1,y1,4.6,0,TAU);ctx.stroke();
      if(!fl){circ(ctx,x1,y1,1.5,col('#9a8a70'));ctx.lineWidth=L*.5;ctx.beginPath();ctx.arc(x1,y1,3.2,-2.2,-.6);ctx.stroke()}}
    if(lk==='claw'&&!fl){ctx.strokeStyle=OUT;ctx.lineWidth=1.6+L;ctx.beginPath();
      for(const d of[-.55,0,.55]){const c=Math.cos(d),sn=Math.sin(d);ctx.moveTo(x1,y1);ctx.lineTo(x1+(dx*c-dy*sn)*5.5,y1+(dx*sn+dy*c)*5.5)}ctx.stroke();
      ctx.strokeStyle='#f6e8d8';ctx.lineWidth=1.4;ctx.stroke()}
    stitch(x0+dx*3.2,y0+dy*3.2,.9);
  };
  const legD=(q,x0,x1,y1,col)=>{
    seg(x0,hip,x1,y1,LEG[q.look][1],col(q.col));
    if(q.look==='frog')poly(ctx,[x1-1.5,y1+1.2,x1+5.5,y1+1.2,x1+3,y1-1.5],col(q.col),OUT,L);
    if(q.look==='spring'&&!fl){ctx.strokeStyle='#d8f0c0';ctx.lineWidth=L*.6;ctx.beginPath();ctx.moveTo(x0,hip+2);ctx.lineTo((x0+x1)/2,(hip+y1)/2);ctx.stroke()}
    stitch(x0+(x1-x0)*.25,hip+(y1-hip)*.25,.9);
  };
  {const dx=-.25-Math.sin(ph)*.4,dy=.95,m=Math.hypot(dx,dy);arm(aB,-tw/2+1.5,sh,dx/m,dy/m,D)}
  if(o.air){legD(lB,-2,-5,hip+leg*.62,D);legD(lF,2.2,5,hip+leg*.8,C)}
  else{const sA=Math.sin(ph)*5,cA=Math.cos(ph);legD(lB,-2,-2+sA,-1-Math.max(0,cA)*3,D);legD(lF,2.2,2.2-sA,-1-Math.max(0,-cA)*3,C)}
  // Rumpf
  rr(ctx,-tw/2,hip-th,tw,th+2,3.5);ctx.fillStyle=C(t.col);ctx.fill();
  if(!fl){const g=ctx.createLinearGradient(-tw/2,hip-th,tw/2,hip+2);g.addColorStop(0,'rgba(255,255,255,.3)');g.addColorStop(1,'rgba(0,0,0,.42)');ctx.fillStyle=g;ctx.fill()}
  ctx.strokeStyle=OUT;ctx.lineWidth=L;ctx.stroke();
  if(t.look==='hollow'&&!fl){ctx.fillStyle='#1a1214';ctx.beginPath();ctx.ellipse(0,hip-th/2+1,tw/2-2,th/2-3,0,0,TAU);ctx.fill()}
  if(!fl){
    ctx.beginPath();for(let i=0;i<tw-3;i+=3){ctx.moveTo(-tw/2+2+i,hip-2.5);ctx.lineTo(-tw/2+3.2+i,hip-4.5)}
    if(t.look==='hollow'){ctx.moveTo(-tw/2+1.5,hip-th+5);ctx.lineTo(tw/2-1.5,hip-th+5);ctx.moveTo(-tw/2+1.5,hip-th+8);ctx.lineTo(tw/2-1.5,hip-th+8)}
    if(t.look==='plated')for(let i=0;i<3;i++){ctx.moveTo(-tw/2+1.5,hip-th+5+i*3);ctx.lineTo(tw/2-1.5,hip-th+5+i*3)}
    ctx.moveTo(0,hip-th+1);ctx.lineTo(0,hip-th+4);
    ctx.strokeStyle=OUT;ctx.lineWidth=L*.55;ctx.stroke();
    stitch(-tw/2+2.2,hip-th+2.4,1);
    if(o.dead)circ(ctx,1,hip-th+6.5,1.7,'#3a2626');else{ctx.shadowColor=h.col;ctx.shadowBlur=7;circ(ctx,1,hip-th+6.5,2,h.col);ctx.shadowBlur=0}
  }
  // Kopf
  const head=(cx,cy,r)=>{ctx.beginPath();ctx.arc(cx,cy,r,0,TAU);ctx.fillStyle=C(k.col);ctx.fill();
    if(!fl){const g=ctx.createLinearGradient(cx-r,cy-r,cx+r*.6,cy+r);g.addColorStop(0,'rgba(255,255,255,.32)');g.addColorStop(1,'rgba(0,0,0,.4)');ctx.fillStyle=g;ctx.fill()}
    ctx.strokeStyle=OUT;ctx.lineWidth=L;ctx.stroke()};
  const eye=(cx,cy,r)=>{if(fl)return;circ(ctx,cx,cy,r*1.25,'#140e10');if(o.dead)return;ctx.shadowColor='#3ff';ctx.shadowBlur=6;circ(ctx,cx,cy,r*.8,'#7ff');ctx.shadowBlur=0};
  const teeth=()=>{if(fl)return;ctx.beginPath();ctx.moveTo(1.5,hy+3.8);ctx.lineTo(5.5,hy+3.8);for(const tx of[2.5,3.9,5.1]){ctx.moveTo(tx,hy+3);ctx.lineTo(tx,hy+4.6)}ctx.lineWidth=L*.5;ctx.strokeStyle=OUT;ctx.stroke()};
  const seam=(cx,cy,r)=>{if(fl)return;ctx.beginPath();ctx.arc(cx,cy,r*.75,-2.4,-1.4);ctx.lineWidth=L*.5;ctx.strokeStyle=OUT;ctx.stroke();stitch(cx-r*.42,cy-r*.55,.7);stitch(cx-r*.05,cy-r*.73,.7)};
  if(k.look==='twin'){head(-4,hy+1.5,5.2);head(4.5,hy-1,5.4);eye(-2,hy+1,1.3);eye(6.5,hy-1.5,1.4);stitch(.2,hy+2,1)}
  else if(k.look==='horn'){
    poly(ctx,[-4,hy-4,-9,hy-13,-1,hy-6],C('#efe2c4'),OUT,L);poly(ctx,[2,hy-6,4,hy-15,6.5,hy-4.5],C('#efe2c4'),OUT,L);
    head(.5,hy,6.8);eye(1.2,hy-.6,1.4);eye(4.8,hy-.6,1.4);teeth()}
  else if(k.look==='crow'){head(.5,hy,6.8);poly(ctx,[5,hy-1.5,12.5,hy+1.5,5,hy+3.5],C('#e0b040'),OUT,L);eye(2.6,hy-1.4,1.7);seam(.5,hy,6.8)}
  else{head(.5,hy,6.8);eye(1.2,hy-.6,1.4);eye(4.8,hy-.6,1.4);teeth();seam(.5,hy,6.8)}
  arm(aF,tw/2-2,sh,lx,ly,C);
  ctx.restore();
}
