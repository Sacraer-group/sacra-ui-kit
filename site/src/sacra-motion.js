/* SACRA Motion 1.4.0. Zero dependencies. Geometry is calculated in real WASM.
 * Load wasm/geometry-binary.js before this file (embedded bytes support file://).
 * Public: await SacraMotion.ready; SacraMotion.mount(canvas, options).
 */
(function (global) {
  'use strict';
  const specs = [
    { id:0, name:'Тор / деформация', code:'TORUS' }, { id:1, name:'Лента Мёбиуса', code:'RIBBON' },
    { id:2, name:'Орбитальная сетка', code:'ORBIT' }, { id:3, name:'Волновое поле', code:'FIELD' },
    { id:4, name:'Контурная сфера', code:'SPHERE' }, { id:5, name:'Пучок Лиссажу', code:'BUNDLE' }
  ];
  const all = new Set(), media = matchMedia('(prefers-reduced-motion: reduce)');
  let core = null, raf = 0, error = null;
  const bound = (n,a,b,d) => Number.isFinite(Number(n)) ? Math.max(a,Math.min(b,Number(n))) : d;
  const bytes = () => Uint8Array.from(atob(global.SACRA_WASM_BINARY.base64), c => c.charCodeAt(0));
  const ready = (async () => {
    if (!global.WebAssembly) throw new Error('WebAssembly недоступен в этом браузере.');
    if (!global.SACRA_WASM_BINARY) throw new Error('Не загружен geometry-binary.js.');
    const result = await WebAssembly.instantiate(bytes(), {});
    if (WebAssembly.Module.imports(result.module).length !== 0) throw new Error('Модуль должен быть без импортов.');
    core = result.instance.exports;
    if(core.geometry_version() !== 10400) throw new Error('Несовместимая версия geometry.wasm.');
    return {instance:result.instance, module:result.module, bytes:global.SACRA_WASM_BINARY.bytes, sha256:global.SACRA_WASM_BINARY.sha256};
  })();
  ready.catch(e => { error=e; });
  function needsFrame(v) { return core && !v.dead && v.playing && v.visible && !document.hidden; }
  function schedule() { if (!raf && [...all].some(needsFrame)) raf=requestAnimationFrame(tick); }
  function tick(now) {
    raf=0;
    for (const v of all) {
      if (!needsFrame(v)) {v.lastTime=0;continue;}
      if (v.lastTime && now-v.lastTime < 1000/v.fpsLimit-1) continue;
      const dt=v.lastTime ? Math.min((now-v.lastTime)/1000,.1) : 0;
      v.lastTime=now; v.phase+=dt*v.speed;
      v.draw();
      v.frameCounter++;
      if (!v.statsTime) v.statsTime=now;
      const interval=now-v.statsTime;
      if(interval>=800) {v.fps=1000*Math.max(0,v.frameCounter-1)/interval;v.frameCounter=1;v.statsTime=now;v.report();}
    }
    schedule();
  }
  document.addEventListener('visibilitychange',()=>{
    for(const v of all) {v.lastTime=0;v.frameCounter=0;v.statsTime=0;v.report();}
    if(document.hidden) {cancelAnimationFrame(raf);raf=0;} else schedule();
  });
  const motionChange=()=>{if(media.matches) {for(const v of all) v.pause();}};
  if (media.addEventListener) media.addEventListener('change',motionChange);

  class View {
    constructor(canvas,options={}) {
      if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('mount expects a canvas');
      this.canvas=canvas; this.ctx=canvas.getContext('2d');
      if(!this.ctx) throw new Error('Canvas 2D недоступен.');
      this.mode=Math.round(bound(options.mode,0,5,0)); this.density=Math.round(bound(options.density,8,64,28));
      this.speed=bound(options.speed,0.1,3,0.65); this.deformation=bound(options.deformation,0,1,0.65);
      this.yaw=bound(options.yaw,-6,6,-.3); this.pitch=bound(options.pitch,-3,3,.94);
      this.zoom=bound(options.zoom,.5,1.35,1); this.fpsLimit=bound(options.fpsLimit,1,60,30);
      this.phase=bound(options.phase,0,1e5,0); this.grid=options.grid!==false;
      this.playing=options.autoplay!==false && !media.matches; this.visible=false;this.dead=false;
      this.fps=0;this.lastTime=0;this.statsTime=0;this.frameCounter=0;this.computeMs=0;this.renderMs=0;this.calls=0;
      this.onStats=typeof options.onStats==='function'?options.onStats:()=>{};
      this.abort=new AbortController();const signal=this.abort.signal;
      this.palette={};this.updatePalette();
      this.canvas.dataset.engine='loading';
      all.add(this);
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
      this.observer=new IntersectionObserver(entries=>{
        this.visible=entries[0].isIntersecting;this.lastTime=0;this.statsTime=0;this.frameCounter=0;
        this.report();schedule();
      },{threshold:.01});this.observer.observe(canvas);
      if(options.interactive!==false) {
        canvas.style.touchAction='pan-y';
        canvas.addEventListener('pointerdown',e=>{
          if(e.button!==0)return;
          this.drag={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch};canvas.setPointerCapture(e.pointerId);
        },{signal});
        canvas.addEventListener('pointermove',e=>{
          if(!this.drag)return;
          this.yaw=bound(this.drag.yaw+(e.clientX-this.drag.x)*.009,-6,6,0);
          this.pitch=bound(this.drag.pitch+(e.clientY-this.drag.y)*.009,-3,3,0);this.draw();this.report();
        },{signal});
        ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,()=>{this.drag=null;},{signal}));
        canvas.addEventListener('keydown',e=>{
          if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
            e.preventDefault();this.yaw+=e.key==='ArrowLeft'?-.08:e.key==='ArrowRight'?.08:0;
            this.pitch+=e.key==='ArrowUp'?-.08:e.key==='ArrowDown'?.08:0;this.yaw=bound(this.yaw,-6,6,0);this.pitch=bound(this.pitch,-3,3,0);this.draw();this.report();
          } else if(e.code==='Space') {e.preventDefault();this.playing?this.pause():this.play();}
        },{signal});
      }
      this.resize();
      ready.then(()=>{if(this.dead)return;canvas.dataset.engine='wasm';this.draw();this.report();schedule();}).catch(e=>{
        if(this.dead)return;canvas.dataset.engine='error';this.playing=false;this.report();
        canvas.dispatchEvent(new CustomEvent('sacra:error',{bubbles:true,detail:e.message}));
      });
    }
    updatePalette() {
      const c=getComputedStyle(this.canvas);const get=(n,d)=>c.getPropertyValue('--s-color-'+n).trim()||d;
      this.palette={surface:get('surface','#1B2027'),accent:get('accent','#F2CC4D'),border:get('border-strong','#414B58'),muted:get('muted','#9BA3AE')};
    }
    resize() {
      if(this.dead)return;
      const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);
      this.dpr=Math.min(global.devicePixelRatio||1,2);
      this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.draw();
    }
    calculate() {
      if(!core)return null;
      const start=performance.now(); const points=core.geometry_frame(this.mode,this.phase,this.density,this.yaw,this.pitch,this.deformation);
      this.computeMs=performance.now()-start;this.calls++;this.points=points;
      return {data:new Float32Array(core.memory.buffer,core.vertices_ptr(),points*3),lines:core.line_count(),samples:core.samples_per_line()};
    }
    draw() {
      if(this.dead)return;
      const start=performance.now(),c=this.ctx,w=this.width||1,h=this.height||1;
      c.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);c.globalAlpha=1;c.fillStyle=this.palette.surface;c.fillRect(0,0,w,h);
      if(this.grid) {
        c.strokeStyle=this.palette.border;c.lineWidth=.7;c.setLineDash([3,7]);c.strokeRect(20,20,w-40,h-40);
        c.beginPath();c.moveTo(w/2,28);c.lineTo(w/2,h-28);c.moveTo(28,h/2);c.lineTo(w-28,h/2);c.stroke();c.setLineDash([]);
        for(let x=20;x<w-10;x+=24) {c.beginPath();c.moveTo(x,20);c.lineTo(x,26+(x%48===20?5:0));c.moveTo(x,h-20);c.lineTo(x,h-26);c.stroke();}
        for(const [x,y] of [[20,20],[w-20,20],[20,h-20],[w-20,h-20]]) {c.beginPath();c.moveTo(x-7,y);c.lineTo(x+7,y);c.moveTo(x,y-7);c.lineTo(x,y+7);c.stroke();}
      }
      const g=this.calculate();if(!g)return;
      const scale=Math.min(w*.3,h*.32)*this.zoom,order=[];
      for(let j=0;j<g.lines;j++) {let z=0;for(let k=0;k<g.samples;k++)z+=g.data[(j*g.samples+k)*3+2];order.push([j,z/g.samples]);}
      order.sort((a,b)=>b[1]-a[1]);c.strokeStyle=this.palette.accent;
      for(const [j,z] of order) {
        const cross=j>=this.density;c.globalAlpha=bound((cross?.34:.69)-z*.22,.17,.95,.5);c.lineWidth=cross?.7:1.05;
        c.beginPath();for(let k=0;k<g.samples;k++){const i=(j*g.samples+k)*3,x=w/2+g.data[i]*scale,y=h/2+g.data[i+1]*scale;k?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
      }
      c.globalAlpha=1;this.renderMs=performance.now()-start;this.canvas.dataset.frameCalls=String(this.calls);
    }
    state() {return {mode:this.mode,density:this.density,speed:this.speed,deformation:this.deformation,yaw:this.yaw,pitch:this.pitch,zoom:this.zoom,phase:this.phase,grid:this.grid,fpsLimit:this.fpsLimit};}
    stats() {return {engine:core?'wasm':error?'error':'loading',playing:this.playing,visible:this.visible,active:!!needsFrame(this),fps:this.fps,computeMs:this.computeMs,renderMs:this.renderMs,calls:this.calls,vertices:this.points||0,memoryBytes:core?core.memory.buffer.byteLength:0,mode:this.mode,error:error?.message||null};}
    report() {if(!this.dead)this.onStats(this.stats());}
    set(next={}) {
      const limits={mode:[0,5],density:[8,64],speed:[.1,3],deformation:[0,1],yaw:[-6,6],pitch:[-3,3],zoom:[.5,1.35],fpsLimit:[1,60],phase:[0,1e5]};
      for(const [key,[lo,hi]] of Object.entries(limits)) if(key in next)this[key]=bound(next[key],lo,hi,this[key]);
      this.mode=Math.round(this.mode);this.density=Math.round(this.density);if('grid' in next)this.grid=!!next.grid;
      this.draw();this.report();schedule();return this;
    }
    play() {this.playing=true;this.lastTime=0;this.frameCounter=0;this.statsTime=0;this.report();schedule();return this;}
    pause() {this.playing=false;this.lastTime=0;this.report();return this;}
    step(dt=1/30) {this.pause();this.phase+=bound(dt,0,1,1/30)*this.speed;this.draw();this.report();return this;}
    reset() {this.set({mode:0,density:28,speed:.65,deformation:.65,yaw:-.3,pitch:.94,zoom:1,phase:0,grid:true});return this;}
    toSVG() {
      const g=this.calculate();if(!g)throw new Error('WASM ещё не загружен.');const w=800,h=500,s=Math.min(w*.3,h*.32)*this.zoom;
      const paths=[];
      for(let j=0;j<g.lines;j++){let p=[],z=0;for(let k=0;k<g.samples;k++){let i=(j*g.samples+k)*3;p.push((w/2+g.data[i]*s).toFixed(2)+','+(h/2+g.data[i+1]*s).toFixed(2));z+=g.data[i+2];}
        paths.push({z:z/g.samples,d:'M'+p.join('L'),cross:j>=this.density});}
      paths.sort((a,b)=>b.z-a.z);
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" role="img"><title>SACRA '+specs[this.mode].code+' / WASM snapshot</title><rect width="800" height="500" fill="'+this.palette.surface+'"/><g fill="none" stroke="'+this.palette.accent+'">'+paths.map(p=>'<path d="'+p.d+'" stroke-width="'+(p.cross?.7:1.05)+'" opacity="'+bound((p.cross?.34:.69)-p.z*.22,.17,.95,.5).toFixed(2)+'"/>').join('')+'</g></svg>';
    }
    destroy() {this.dead=true;this.pause();this.abort.abort();this.observer.disconnect();this.resizeObserver.disconnect();all.delete(this);if(!all.size){cancelAnimationFrame(raf);raf=0;}}
  }
  global.SacraMotion={ready,mount:(canvas,options)=>new View(canvas,options),presets:specs,wasmBytes:bytes,version:'1.4.0'};
})(window);
