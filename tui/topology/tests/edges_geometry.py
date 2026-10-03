"""Check actual SVG ports and collision-free buses, not just finite card bounds.

Requires Playwright and Chromium. SACRA_CHROMIUM overrides the executable path.
Browser fixtures are loaded from the archive's local bytes; no network is used.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

def load(page):
    page.set_content(ROOT.joinpath('index.html').read_text(encoding='utf-8'), wait_until='domcontentloaded')
    page.add_style_tag(content='\n'.join(ROOT.joinpath(p).read_text(encoding='utf-8') for p in ['assets/tokens.css', 'assets/topology.css']))
    for path in ['assets/themes.js', 'assets/topology.js']:
        page.add_script_tag(content=ROOT.joinpath(path).read_text(encoding='utf-8'))
    boot_playing=page.evaluate('SacraTopology.state.playing')
    page.evaluate('SacraTopology.pause()')
    page.wait_for_timeout(80)
    return boot_playing

CHECK = r'''() => {
 const fail=m=>{throw new Error(m)},near=(a,b)=>Math.abs(a-b)<.3;
 const root=document.querySelector('.graph-wrap');if(!root)return {paths:0,compact:true};
 const svg=root.querySelector('.topology-edges'),paths=[...svg.querySelectorAll('[data-edge]')];
 if(!svg.getBoundingClientRect().width){if(paths.length)fail('stale paths in compact mode');return {paths:0,compact:true};}
 const box=s=>{const e=root.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return r.width&&r.height?r:null;};
 const cards={main:box('.row.root > [data-node]'),router:box('.row.router > [data-node]'),worker1:box('.row.workers > [data-node]:nth-child(1)'),worker2:box('.row.workers > [data-node]:nth-child(2)'),worker3:box('.row.workers > [data-node]:nth-child(3)'),review:box('.row.review > [data-node]'),architect:box('.architect-rail > [data-node]')};
 const occupied=[...Object.entries(cards).filter(([,r])=>r),...['a','b'].map(id=>['label-'+id,box('.branch-label.'+id)]).filter(([,r])=>r)];
 const map=Object.fromEntries(paths.map(el=>[el.dataset.edge,el]));
 const point=(p,last)=>new DOMPoint(...[p.getPointAtLength(last?p.getTotalLength():0).x,p.getPointAtLength(last?p.getTotalLength():0).y]).matrixTransform(p.getScreenCTM());
 const gap=3*svg.getScreenCTM().d;
 const expect=(p,r,side,last)=>{
  const t=point(p,last),x=side==='left'?r.left-gap:side==='right'?r.right+gap:(r.left+r.right)/2;
  const y=side==='bottom'?r.bottom+gap:side==='top'?r.top-gap:(r.top+r.bottom)/2;
  if(!near(t.x,x)||!near(t.y,y))fail(`${p.dataset.edge}: port ${side} (${t.x},${t.y}) expected (${x},${y})`);
 };
 for(const p of paths){
  const from=cards[p.dataset.fromSlot],to=cards[p.dataset.toSlot],architect=p.dataset.edge==='architect-review';
  if(from)expect(p,from,architect?'right':'bottom',false);
  if(to)expect(p,to,architect?'left':'top',true);
  const nums=p.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number),pts=[];
  for(let i=0;i<nums.length;i+=2)pts.push(new DOMPoint(nums[i],nums[i+1]).matrixTransform(p.getScreenCTM()));
  for(let i=1;i<pts.length;i++){
   const a=pts[i-1],b=pts[i];
   if(!near(a.x,b.x)&&!near(a.y,b.y))fail(p.dataset.edge+': diagonal');
   for(const [name,r] of occupied){
    const eps=.4;
    const horizontal=near(a.y,b.y)&&a.y>r.top+eps&&a.y<r.bottom-eps&&Math.max(a.x,b.x)>r.left+eps&&Math.min(a.x,b.x)<r.right-eps;
    const vertical=near(a.x,b.x)&&a.x>r.left+eps&&a.x<r.right-eps&&Math.max(a.y,b.y)>r.top+eps&&Math.min(a.y,b.y)<r.bottom-eps;
    if(horizontal||vertical)fail(p.dataset.edge+': overlaps '+name);
   }
  }
  const marker=p.getAttribute('marker-end');
  if(marker){
   const tri=svg.querySelector('#'+marker.slice(5,-1)+' path');
   if(getComputedStyle(tri).fill!==getComputedStyle(p).stroke)fail(p.dataset.edge+': mismatched arrow colour');
  }
 }
 for(const suffix of ['worker','explorer','researcher']){
  const branch=map['router-'+suffix],collector=map[suffix+'-review'];
  if(branch){const a=point(map['router-fanout'],true),b=point(branch,false);if(!near(a.x,b.x)||!near(a.y,b.y))fail('split disconnected');}
  if(collector){const a=point(map['merge-review'],false),b=point(collector,true);if(!near(a.x,b.x)||!near(a.y,b.y))fail('merge disconnected');}
 }
 if(Boolean(cards.architect&&cards.review)!==Boolean(map['architect-review']))fail('phantom or missing architect');
 return {paths:paths.length,compact:false};
}'''

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('SACRA_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1680,'height':1100},reduced_motion='no-preference')
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    load(page)
    # Disable transitions for exhaustive static geometry/color checks, then test motion separately.
    test_style=page.add_style_tag(content='*,*::before,*::after{transition:none!important}')
    page.evaluate('window.checkEdges='+CHECK)
    result=page.evaluate('''async () => {
     const frame=()=>new Promise(r=>requestAnimationFrame(r));let cases=0,compact=0;
     for(const theme of SacraThemes.all){
      SacraTopology.setTheme(theme.id,false);
      for(const width of ['auto','160','120','96','80'])for(const scale of [1,.9,.8,.7]){
       SacraTopology.setWidth(width);SacraTopology.setScale(scale);await frame();await frame();await frame();
       for(let phase=0;phase<8;phase++){
        SacraTopology.step();
        const check=checkEdges();cases++;compact+=Number(check.compact);
       }
      }
     }
     return {cases,compact};
    }''')
    # Additional real phase renders, content growth and adapter IDs independent of fixed visual slots.
    page.evaluate('SacraTopology.setWidth("auto");SacraTopology.setScale(1);SacraTopology.reset()');page.wait_for_timeout(100)
    for _ in range(8):
        page.evaluate('SacraTopology.step()');page.evaluate(CHECK)
    page.evaluate('''() => {
      const data=SacraTopology.snapshot().data;
      for(const n of data.nodes){n.id='custom-'+n.slot;n.model.name='a-very-long-provider-model-name-that-must-wrap-in-a-small-card';}
      data.nodes.find(n=>n.slot==='worker1').metrics={tokens:'0',calls:'15',extra:'very long metric value '.repeat(20)};
      SacraTopology.setData(data);
    }''')
    page.wait_for_timeout(100);page.evaluate(CHECK)
    for slot in ['architect','worker2','router']:
        page.evaluate('(slot)=>{const data=SacraTopology.snapshot().data;data.nodes=data.nodes.filter(n=>n.slot!==slot);SacraTopology.setData(data)}',slot)
        page.wait_for_timeout(40);page.evaluate(CHECK)
    # Fresh page for width/zoom changes with the actual preview CSS (no forced refresh in the assertions).
    motion=browser.new_page(viewport={'width':1680,'height':1100},reduced_motion='no-preference')
    motion.on('pageerror',lambda e:errors.append(str(e)));load(motion)
    motion.evaluate('window.checkEdges='+CHECK)
    # Stay in an inactive phase to avoid comparing halfway-transitioned stroke colours.
    motion.evaluate('SacraTopology.state.phase=0;SacraTopology.refreshLayout()')
    motion_result=motion.evaluate('''async()=>{
      const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));let count=0;
      for(const width of ['160','120','80','auto']){
       SacraTopology.setWidth(width);
       for(let n=0;n<12;n++){await frame();checkEdges();count++;}
      }
      for(const scale of [.7,.8,.9,1]){SacraTopology.setScale(scale);await frame();await frame();checkEdges();count++;}
      return count;
    }''')
    # Container ResizeObserver must catch font/height changes without an API call.
    motion.add_style_tag(content='.node-foot{font-size:13px!important}')
    motion.wait_for_timeout(100);motion.evaluate(CHECK)
    motion.evaluate('SacraTopology.step();SacraTopology.step();SacraTopology.play()')
    assert motion.locator('.edge.is-active').first.evaluate('(e)=>getComputedStyle(e).animationPlayState')=='running'
    motion.evaluate('SacraTopology.pause()')
    assert motion.locator('.edge.is-active').first.evaluate('(e)=>getComputedStyle(e).animationPlayState')=='paused'
    reduced=browser.new_page(viewport={'width':1200,'height':900},reduced_motion='reduce')
    assert load(reduced) is False
    # Responsive windows and local scrolling; underlying coordinates must stay aligned.
    for width in [390,768,1024,1440,1920]:
        reduced.set_viewport_size({'width':width,'height':1000});reduced.wait_for_timeout(80);reduced.evaluate(CHECK)
    assert not errors,errors
    browser.close()
    report={**result,'live_resize_zoom_checks':motion_result,'adapter_and_content_growth':'passed','missing_slots':'passed','play_pause':'passed','reduced_motion':'passed','page_errors':errors,'browser':'Chromium','method':'local HTML/CSS/JS byte fixtures (no network)'}
    ROOT.joinpath('tests/edges-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
