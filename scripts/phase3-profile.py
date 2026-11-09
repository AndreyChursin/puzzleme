"""Production Chromium interaction timing (not FPS); requires Python Playwright."""
import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000},has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:8080',wait_until='networkidle')
 cdp=page.context.new_cdp_session(page);cdp.send('Performance.enable')
 for count,rows,cols in [(12,3,4),(48,6,8),(150,10,15)]:
  page.get_by_role('button',name=f'{count} pieces',exact=True).click();page.wait_for_timeout(300)
  canvas=page.locator('canvas');box=canvas.bounding_box();scale=.45 if count==12 else 470/(rows*250+100)
  x=box['x']+20+50*scale;y=box['y']+20+(rows*100+150)*scale
  def tasks():return next(m['value'] for m in cdp.send('Performance.getMetrics')['metrics'] if m['name']=='TaskDuration')
  before=tasks();start=time.perf_counter()
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+30,y-30,steps=100);page.mouse.up()
  print(count,'pieces: 100 pointer moves wall ms',round((time.perf_counter()-start)*1000,1),'task ms',round((tasks()-before)*1000,1))
 # Restart then verify touch cancellation restores the canvas exactly.
 page.get_by_role('button',name='12 pieces',exact=True).click();page.wait_for_timeout(300)
 box=page.locator('canvas').bounding_box();x=box['x']+42.5;y=box['y']+222.5
 before=page.locator('canvas').screenshot()
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+50,'y':y-50}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
 page.wait_for_timeout(200)
 assert before==page.locator('canvas').screenshot(),'Cancelled drag changed canvas'
 assert not errors,errors
 print('PASS touch cancellation; no page errors')
 b.close()
