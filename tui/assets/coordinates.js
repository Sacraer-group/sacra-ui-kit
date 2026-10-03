/* SACRA technical chart frame — screenshot-inspired rulers, actual data coordinates.
 * Independent from the raster mode. SVG is the browser frame, not terminal output. */
(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function timeLabel(ms){
  if(ms===0)return 'now';
  const seconds=Math.round(Math.abs(ms)/1000),minutes=Math.floor(seconds/60),rest=seconds%60;
  return '−'+(minutes?(rest?minutes+':'+String(rest).padStart(2,'0'):minutes+'m'):seconds+'s');
 }
 function model({width,height,bounds=[0,100],windowMs=60000}){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw new RangeError('Positive chart dimensions required');
  if(!Array.isArray(bounds)||bounds.length!==2||!bounds.every(Number.isFinite)||bounds[1]<=bounds[0])throw new RangeError('Ascending finite bounds required');
  if(!Number.isFinite(windowMs)||windowMs<=0)throw new RangeError('Positive time window required');
  const detailed=width>=340, yDetailed=height>=135;
  const ticks=(count,fn)=>Array.from({length:count+1},(_,i)=>fn(i/count));
  return {width,height,bounds,windowMs,pad:12,
   xTicks:ticks(detailed?4:2,f=>({fraction:f,value:(f-1)*windowMs,label:timeLabel((f-1)*windowMs)})),
   yTicks:ticks(yDetailed?4:2,f=>({fraction:f,value:bounds[1]-f*(bounds[1]-bounds[0]),label:String(Number((bounds[1]-f*(bounds[1]-bounds[0])).toFixed(2)))})),
   xDivisions:clamp(Math.floor(width/80)*4,8,24),yDivisions:8,
   zero:bounds[0]<=0&&bounds[1]>=0?(bounds[1]/(bounds[1]-bounds[0])):null};
 }
 function render(svg,options){
  const m=model(options),p=m.pad,w=m.width,h=m.height;
  svg.setAttribute('viewBox',`0 0 ${w+2*p} ${h+2*p}`);
  svg.setAttribute('preserveAspectRatio','none');
  let ruler='',grid='',cross='';
  for(let i=1;i<m.xDivisions;i++){
   const x=p+w*i/m.xDivisions,major=i%(m.xDivisions/4)===0,length=major?10:5;
   ruler+=`M${x},${p}v${length}M${x},${p+h}v${-length}`;
  }
  for(let i=1;i<m.yDivisions;i++){
   const y=p+h*i/m.yDivisions,length=i%2===0?8:4;
   ruler+=`M${p},${y}h${length}M${p+w},${y}h${-length}`;
  }
  if(options.grid!==false){
   for(const f of [.25,.75])grid+=`M${p+w*f},${p}v${h}M${p},${p+h*f}h${w}`;
  }
  for(const x of [p,p+w])for(const y of [p,p+h])cross+=`M${x-8},${y}h16M${x},${y-8}v16`;
  const center=options.grid!==false?`M${p+w/2},${p}v${h}M${p},${p+h/2}h${w}`:'';
  const frame=`M${p},${p}H${p+w}V${p+h}H${p}Z`;
  const zero=m.zero!==null&&m.zero!==0&&m.zero!==1?`<path class="coordinate-zero" d="M${p},${p+h*m.zero}h${w}"/>`:'';
  svg.innerHTML=`<g fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"><path class="coordinate-grid" d="${grid}" stroke-dasharray="3 8"/><path class="coordinate-center" d="${center}" stroke-dasharray="4 9"/><path class="coordinate-frame" d="${frame}" stroke-dasharray="4 9"/>${zero}<path class="coordinate-rulers" d="${options.grid===false?'':ruler}"/><path class="coordinate-crosses" d="${cross}"/></g>`;
  return m;
 }
 const api={model,render,timeLabel};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TuiCoordinates=api;
})(typeof window==='undefined'?globalThis:window);
