// Zeichenhelfer für Text und Grundformen
import { ctx } from '../core/canvas.ts';
import { OUT } from '../core/constants.ts';
import { TAU } from '../core/util.ts';

type G2D=CanvasRenderingContext2D;

/** Text mit dunkler Kontur; ser = Serifenschrift (Überschriften) */
export function txt(s:string,x:number,y:number,col='#efe6d0',al:CanvasTextAlign='left',sz=13,bold=false,ser=false){
  ctx.font=(bold?'bold ':'')+sz+'px '+(ser?'Georgia,"Times New Roman",serif':'"Trebuchet MS","Segoe UI",Verdana,sans-serif');
  ctx.textAlign=al;ctx.textBaseline='top';ctx.lineJoin='round';
  ctx.strokeStyle='rgba(10,6,8,.85)';ctx.lineWidth=Math.max(2.5,sz*.2);ctx.strokeText(s,x,y);
  ctx.fillStyle=col;ctx.fillText(s,x,y);
}
/** Text ohne Kontur, z. B. dunkle Schrift auf hellen Flächen */
export function ptxt(s:string,x:number,y:number,col:string,al:CanvasTextAlign='left',sz=13,bold=false){
  ctx.font=(bold?'bold ':'')+sz+'px "Trebuchet MS","Segoe UI",Verdana,sans-serif';
  ctx.textAlign=al;ctx.textBaseline='top';ctx.fillStyle=col;ctx.fillText(s,x,y);
}
export function circ(g:G2D,x:number,y:number,r:number,fill:string|CanvasGradient){g.beginPath();g.arc(x,y,Math.max(0,r),0,TAU);g.fillStyle=fill;g.fill()}
export function poly(g:G2D,pts:number[],fill:string|CanvasGradient|null,stroke:string|null=OUT,lw=1.2){
  g.beginPath();for(let i=0;i<pts.length;i+=2)i?g.lineTo(pts[i],pts[i+1]):g.moveTo(pts[i],pts[i+1]);g.closePath();
  if(fill){g.fillStyle=fill;g.fill()}
  if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.lineJoin='round';g.stroke()}
}
/** Rechteck mit runden Ecken (nur Pfad) */
export function rr(g:G2D,x:number,y:number,w:number,h:number,r:number){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
/** Hex-Farbe abdunkeln (f < 1) */
export function shade(hex:string,f:number){const n=parseInt(hex.slice(1),16),c=(v:number)=>Math.round(v*f);return'rgb('+c(n>>16)+','+c(n>>8&255)+','+c(n&255)+')'}
