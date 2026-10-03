// Static synthetic signal. No app.js, timer, network or native terminal dependencies.
(() => {
  'use strict';
  const history=Array.from({length:61},(_,i)=>({t:i*1000,value:i>25&&i<36?null:45+25*Math.sin(i*.19)}));
  const canvas=document.querySelector('canvas'),svg=document.querySelector('.coordinates');
  function draw(){
    const width=Math.max(1,Math.round(canvas.clientWidth)),height=180;
    canvas.width=width;canvas.height=height;
    const axes=TuiCoordinates.render(svg,{width,height,bounds:[0,100],windowMs:60000});
    for(const [selector,ticks] of [['.x-labels',axes.xTicks],['.y-labels',axes.yTicks]]){
      document.querySelector(selector).replaceChildren(...ticks.map(t=>{const span=document.createElement('span');span.textContent=t.label;span.style.setProperty('--fraction',t.fraction);return span;}));
    }
    const hex=getComputedStyle(document.body).getPropertyValue('--s-color-accent').trim();
    const color=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const raster=TuiCharts.raster({width,height,xMax:60000,bounds:[0,100],series:[{color,segments:TuiCharts.segments(history,'value',60000)}],background:null,grid:null});
    canvas.getContext('2d').putImageData(new ImageData(raster.pixels,width,height),0,0);
  }
  document.getElementById('values').replaceChildren(...history.map(p=>{
    const row=document.createElement('tr');
    for(const text of [(p.t-60000)/1000,p.value===null?'N/A':p.value.toFixed(1)]){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}return row;
  }));
  new ResizeObserver(draw).observe(canvas);draw();
})();
