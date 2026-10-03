"""Scroll/focus and DOM-identity regressions for the offline browser preview.

Run: python tests/scroll_regression.py
Requires Playwright and Chromium (SACRA_CHROMIUM overrides /usr/bin/chromium).
SACRA_SCREENSHOTS optionally points to a directory for visual QA screenshots.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def load(page):
    page.set_content(ROOT.joinpath('index.html').read_text(), wait_until='domcontentloaded')
    page.add_style_tag(content='\n'.join(ROOT.joinpath(name).read_text() for name in ['assets/tokens.css', 'assets/topology.css']))
    for name in ['assets/themes.js', 'assets/topology.js']:
        page.add_script_tag(content=ROOT.joinpath(name).read_text())
    page.evaluate('SacraTopology.pause()')
    page.wait_for_timeout(80)


def position(page):
    return page.evaluate('''() => ({x:scrollX,y:scrollY,h:document.documentElement.scrollHeight,
      pane:document.querySelector('[data-scroll-key]')?.scrollTop||0,
      horizontal:document.querySelector('#viewport').scrollLeft})''')


def unchanged(before, after, keys=('x', 'y', 'h', 'pane', 'horizontal')):
    for key in keys:
        assert abs(before[key] - after[key]) <= 1, (key, before, after)


# Use viewBox-to-painted-rectangle projection, independently of getScreenCTM.
CHECK_PORTS = r'''() => {
 const svg=document.querySelector('.topology-edges');
 if(!svg||!svg.getBoundingClientRect().width)return 0;
 const rect=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;
 if(vb.width<=0||vb.height<=0)throw Error('missing measured viewBox');
 const point=(p,end)=>{const v=p.getPointAtLength(end?p.getTotalLength():0);return {x:rect.left+(v.x-vb.x)*rect.width/vb.width,y:rect.top+(v.y-vb.y)*rect.height/vb.height}};
 const selectors={main:'.root [data-node]',router:'.router [data-node]',worker1:'.workers > :nth-child(1)[data-node]',worker2:'.workers > :nth-child(2)[data-node]',worker3:'.workers > :nth-child(3)[data-node]',review:'.review [data-node]',architect:'.architect-rail [data-node]'};
 let count=0;
 for(const edge of svg.querySelectorAll('[data-edge]')){
  const isGate=edge.dataset.edge==='architect-review';
  for(const [slot,end] of [[edge.dataset.fromSlot,false],[edge.dataset.toSlot,true]]){
   if(!slot)continue;
   const card=document.querySelector(selectors[slot]);if(!card)throw Error('missing card '+slot);
   const r=card.getBoundingClientRect(),p=point(edge,end);
   const x=isGate?(end?r.left-3:r.right+3):(r.left+r.right)/2;
   const y=isGate?(r.top+r.bottom)/2:(end?r.top-3:r.bottom+3);
   if(Math.abs(p.x-x)>.15||Math.abs(p.y-y)>.15)throw Error(edge.dataset.edge+' port '+JSON.stringify({p,x,y}));
   count++;
  }
  // getBoundingClientRect is also a browser-painted bounding box, not our own
  // projection logic. This catches incorrect viewBox viewport mappings.
  const box=edge.getBBox(),actual=edge.getBoundingClientRect();
  const expected={left:rect.left+(box.x-vb.x)*rect.width/vb.width,top:rect.top+(box.y-vb.y)*rect.height/vb.height,width:box.width*rect.width/vb.width,height:box.height*rect.height/vb.height};
  for(const key of Object.keys(expected))if(Math.abs(actual[key]-expected[key])>.15)throw Error('painted '+key+' '+edge.dataset.edge);
 }
 return count;
}'''

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=os.environ.get('SACRA_CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 560}, reduced_motion='no-preference')
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    load(page)
    page.evaluate('''() => {
      for(let i=0;i<30;i++)SacraTopology.step();
      window.refs={card:document.querySelector('[data-node=worker]'),svg:document.querySelector('.topology-edges'),edge:document.querySelector('[data-edge=router-worker]'),log:document.querySelector('.event-log')};
      refs.card.click();refs.card.focus({preventScroll:true});window.scrollTo(0,450);
    }''')
    before = position(page)
    page.evaluate('for(let i=0;i<32;i++)SacraTopology.step()')
    unchanged(before, position(page))
    assert page.evaluate('''refs.card===document.activeElement && refs.card===document.querySelector('[data-node=worker]') && refs.svg===document.querySelector('.topology-edges') && refs.edge===document.querySelector('[data-edge=router-worker]') && refs.log===document.querySelector('.event-log')''')

    # Pausing, resuming, selecting another node and same-session adapter refreshes
    # must not send the viewport back to the top or reset its internal feed.
    for action in ['SacraTopology.pause()', 'document.querySelector("[data-node=review]").click()', 'SacraTopology.reset()']:
        page.evaluate(action)
        unchanged(before, position(page))
    page.evaluate('for(let i=0;i<30;i++)SacraTopology.step()')
    page.evaluate('''() => {
      const data=SacraTopology.snapshot().data;
      data.nodes.find(n=>n.id==='review').metrics={tokens:'123k',calls:'42'};
      SacraTopology.setData(data);
    }''')
    unchanged(before, position(page))
    assert page.evaluate('SacraTopology.state.selected') == 'review'
    assert page.evaluate('SacraTopology.snapshot().data.events.length') == 24
    assert page.evaluate('document.activeElement.dataset.node') == 'review'

    # Real timer ticks: sample every paint to catch even a one-frame jump.
    page.evaluate('''() => {window.samples=[];window.sampling=true;function sample(){if(!sampling)return;samples.push(scrollY);requestAnimationFrame(sample)}requestAnimationFrame(sample);SacraTopology.setSpeed(2);SacraTopology.play()}''')
    page.wait_for_timeout(1850)
    assert page.evaluate('samples.length') > 20
    assert page.evaluate('Math.max(...samples)-Math.min(...samples)') <= 1
    unchanged(before, position(page))
    page.evaluate('window.sampling=false')
    page.mouse.move(80, 240)
    page.mouse.wheel(0, 170)
    page.wait_for_timeout(250)
    scrolled = position(page)
    assert scrolled['y'] > before['y'] + 100, (before, scrolled)
    page.wait_for_timeout(1000)
    unchanged(scrolled, position(page))
    page.evaluate('SacraTopology.pause()')

    # Background shortcuts must not capture normal page-scrolling arrow keys.
    page.evaluate('document.querySelector("#terminal").focus({preventScroll:true});window.scrollTo(0,120)')
    page.keyboard.press('ArrowDown')
    page.wait_for_timeout(250)
    assert position(page)['y'] > 120
    page.evaluate('window.scrollTo(0,450);document.querySelector("[data-node=review]").focus({preventScroll:true})')
    before_escape = position(page)
    page.keyboard.press('Escape')
    unchanged(before_escape, position(page))
    assert page.evaluate('document.activeElement.id') == 'terminal'
    page.keyboard.press('t')
    page.wait_for_timeout(50)
    page.keyboard.press('ArrowDown')
    page.keyboard.press('Escape')
    unchanged(before_escape, position(page))

    # Nested scrolling in the live feed and code pane.
    page.evaluate('SacraTopology.setView("events");for(let i=0;i<30;i++)SacraTopology.step();document.querySelector(".event-log").scrollTop=120')
    feed = position(page)
    assert feed['pane'] >= 100, feed
    page.evaluate('window.feedRef=document.querySelector(".event-log");for(let i=0;i<20;i++)SacraTopology.step()')
    unchanged(feed, position(page))
    assert page.evaluate('feedRef===document.querySelector(".event-log")')
    page.evaluate('SacraTopology.play()')
    page.wait_for_timeout(1650)
    unchanged(feed, position(page))
    page.evaluate('SacraTopology.pause();SacraTopology.setView("bindings")')
    # Ensure an overflow condition even with compact platform fonts.
    page.add_style_tag(content='.t-code{max-height:140px}')
    page.evaluate('document.querySelector(".t-code").scrollTop=80')
    code = position(page)
    assert code['pane'] >= 70
    page.evaluate('for(let i=0;i<12;i++)SacraTopology.step()')
    unchanged(code, position(page))

    # Mobile-sized host + explicit wide terminal: retain horizontal and vertical scroll.
    page.set_viewport_size({'width': 390, 'height': 560})
    page.evaluate('SacraTopology.setView("topology");SacraTopology.setWidth("160");SacraTopology.setScale(1)')
    page.wait_for_timeout(100)
    page.evaluate('document.querySelector("#viewport").scrollLeft=280;window.scrollTo(0,260)')
    wide = position(page)
    assert wide['horizontal'] >= 250, wide
    page.evaluate('for(let i=0;i<24;i++)SacraTopology.step()')
    unchanged(wide, position(page))
    port_checks = page.evaluate(CHECK_PORTS)

    # Verify that geometry does not secretly depend on the old matrix API.
    page.set_viewport_size({'width': 1440, 'height': 560})
    page.evaluate('window.nativeCTM=SVGGraphicsElement.prototype.getScreenCTM;SVGGraphicsElement.prototype.getScreenCTM=function(){throw Error("CTM must not be needed by layout")};SacraTopology.setWidth("auto")')
    for scale in [1, .9, .8, .7]:
        page.evaluate('(s)=>SacraTopology.setScale(s)', scale)
        page.wait_for_timeout(60)
        page.evaluate('SacraTopology.step();SacraTopology.refreshLayout()')
        port_checks += page.evaluate(CHECK_PORTS)
    page.evaluate('() => {SVGGraphicsElement.prototype.getScreenCTM=window.nativeCTM;}')

    # Scrolled layout inside a translated/scaled integration host.
    for transform in ['translate(11px, 17px) scale(.85)', 'none']:
        page.evaluate('(value)=>document.querySelector(".shell").style.transform=value', transform)
        page.evaluate('SacraTopology.refreshLayout()')
        port_checks += page.evaluate(CHECK_PORTS)

    # Additional device pixel ratios and actual viewport sizes.
    dpr_cases = 0
    for dpr in [1, 2]:
        context = browser.new_context(device_scale_factor=dpr, reduced_motion='reduce')
        check = context.new_page()
        check.on('pageerror', lambda e: errors.append(str(e)))
        load(check)
        for width in [768, 1024, 1280, 1680, 1920]:
            check.set_viewport_size({'width': width, 'height': 740})
            for scale in [1, .8, .7]:
                check.evaluate('(s)=>SacraTopology.setScale(s)', scale)
                check.wait_for_timeout(35)
                port_checks += check.evaluate(CHECK_PORTS)
                dpr_cases += 1
        context.close()

    screenshots = os.environ.get('SACRA_SCREENSHOTS')
    if screenshots:
        out = Path(screenshots)
        out.mkdir(parents=True, exist_ok=True)
        page.set_viewport_size({'width': 1440, 'height': 800})
        page.evaluate('SacraTopology.setTheme("sacra",false);SacraTopology.setWidth("auto");SacraTopology.setScale(1);SacraTopology.reset();SacraTopology.step();SacraTopology.step();window.scrollTo(0,0)')
        page.wait_for_timeout(120)
        page.screenshot(path=str(out / 'after-fanout.png'), full_page=True)
        page.evaluate('SacraTopology.step();SacraTopology.step();SacraTopology.step();SacraTopology.setScale(.8)')
        page.wait_for_timeout(120)
        page.screenshot(path=str(out / 'after-merge-80.png'), full_page=True)
    assert not errors, errors
    report = {
        'browser': browser.version,
        'engine': 'Chromium',
        'full_page_scroll_and_constant_height': 'passed',
        'nested_event_and_code_scroll': 'passed',
        'horizontal_scroll': 'passed',
        'real_animation_and_wheel_scroll': 'passed',
        'focus_card_svg_edge_and_feed_identity': 'passed',
        'same_session_adapter_selection_and_events': 'passed',
        'escape_theme_and_native_arrow_scroll': 'passed',
        'getScreenCTM_independence': 'passed',
        'transformed_host': 'passed',
        'painted_port_checks': port_checks,
        'additional_dpr_viewport_scale_cases': dpr_cases,
        'page_errors': errors,
        'native_safari_tested': False,
    }
    ROOT.joinpath('tests/scroll-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False))
    browser.close()
