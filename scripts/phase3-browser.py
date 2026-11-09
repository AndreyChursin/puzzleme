import os
from playwright.sync_api import sync_playwright
slots=list(range(12));v=42
for i in range(11,0,-1):
 v=(v*1664525+1013904223)&0xffffffff;j=int(v/4294967296*(i+1));slots[i],slots[j]=slots[j],slots[i]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':int(os.environ.get('WIDTH','1440')),'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:8080',wait_until='networkidle');canvas=page.locator('canvas');canvas.wait_for();canvas.scroll_into_view_if_needed();box=canvas.bounding_box()
 def pt(x,y):
  return (box['x']+20+x*.45,box['y']+20+y*.45)
 for i in range(12):
  k=slots[i];start=pt((k%4)*150+50,(k//4)*150+450);end=pt(50+(i%4)*100,50+(i//4)*100)
  page.mouse.move(*start);page.mouse.down();page.mouse.move(*end,steps=20);page.mouse.up();page.wait_for_timeout(100)
 page.get_by_text('Puzzle completed!',exact=False).wait_for()
 page.get_by_role('button',name='Restart',exact=True).click()
 page.get_by_text('ready · 0s · 12 groups').wait_for()
 assert not errors,errors
 print('PASS 12-piece completion, victory lock and restart')
 print('errors',errors)
 page.screenshot(path='artifacts/phase3.png',full_page=True)
 b.close()
