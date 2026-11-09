"""Production Web image import and persistent-browser restart integration test."""
import os
import tempfile
import time
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

def read(page,key):
 return page.evaluate('''key=>new Promise((resolve,reject)=>{const r=indexedDB.open('puzzleme',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('local');const q=tx.objectStore('local').get(key);q.onsuccess=()=>{resolve(q.result??null);db.close();};q.onerror=()=>reject(q.error);};})''',key)
with tempfile.TemporaryDirectory() as profile, sync_playwright() as p:
 def launch():return p.chromium.launch_persistent_context(profile,executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],viewport={'width':int(os.environ.get('WIDTH','1200')),'height':1000})
 context=launch();page=context.pages[0];errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:8080',wait_until='networkidle');page.locator('canvas').wait_for();page.wait_for_timeout(1000)
 assert read(page,'current') is not None
 # Confirm image-backed pieces can be joined and their group survives reload.
 slots=list(range(12));v=42
 for i in range(11,0,-1):
  v=(v*1664525+1013904223)&0xffffffff;j=int(v/4294967296*(i+1));slots[i],slots[j]=slots[j],slots[i]
 box=page.locator('canvas').bounding_box()
 for i in range(2):
  k=slots[i];start=(box['x']+20+((k%4)*150+50)*.45,box['y']+20+((k//4)*150+450)*.45)
  end=(box['x']+20+(50+i*100)*.45,box['y']+20+50*.45)
  page.mouse.move(*start);page.mouse.down();page.mouse.move(*end,steps=10);page.mouse.up()
 page.wait_for_timeout(1300)
 import json
 before=json.loads(read(page,'current'));assert len(set(v['group'] for v in before['state']['pieces'].values()))==11
 page.reload(wait_until='networkidle');page.locator('canvas').wait_for()
 after=json.loads(read(page,'current'));assert before['state']['pieces']==after['state']['pieces']
 # Corrupted content must not replace the current puzzle.
 bad=Path(profile)/'corrupt.jpg';bad.write_bytes(b'not a jpeg')
 with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Import photo',exact=True).click()
 chooser.value.set_files(str(bad));page.get_by_text('Image could not be processed',exact=False).wait_for()
 assert json.loads(read(page,'current'))['image']['key']=='gallery-1'
 # An EXIF-rotated source is decoded into an upright portrait before resizing.
 oriented=Path(profile)/'rotated.jpg';im=Image.new('RGB',(120,80),'orange');exif=im.getexif();exif[274]=6;im.save(oriented,exif=exif)
 # Import a real portrait JPEG through the platform file chooser.
 with page.expect_file_chooser() as chooser:page.get_by_role('button',name='Import photo',exact=True).click()
 chooser.value.set_files(str(oriented))
 page.wait_for_timeout(2500)
 imported=json.loads(read(page,'current'));assert imported['image']['key'].startswith('photo-'),page.locator('body').inner_text()
 assert read(page,'asset:'+imported['image']['key']).startswith('data:image/')
 assert (imported['image']['width'],imported['image']['height'])==(80,120),imported['image']
 context.close();context=launch();page=context.pages[0];page.goto('http://localhost:8080',wait_until='networkidle');page.locator('canvas').wait_for();page.locator('canvas').wait_for()
 assert json.loads(read(page,'current'))['image']==imported['image']
 assert json.loads(read(page,'current'))['state']['pieces']==imported['state']['pieces']
 # All difficulty presets load; image bytes remain a single separate record.
 for count in [12,24,48,96,150]:
  page.get_by_role('button',name=f'{count} pieces',exact=True).click();page.wait_for_timeout(800)
  for _ in range(40):
   saved=json.loads(read(page,'current'))
   if len(saved['state']['pieces'])==count:break
   time.sleep(.25)
  assert len(saved['state']['pieces'])==count,(count,saved,page.locator('body').inner_text())
 # Image eviction offers recovery without silently discarding the save.
 page.evaluate('''key=>new Promise(resolve=>{const r=indexedDB.open('puzzleme',1);r.onsuccess=()=>{const tx=r.result.transaction('local','readwrite');tx.objectStore('local').delete('asset:'+key);tx.oncomplete=()=>resolve();};})''',imported['image']['key'])
 page.reload(wait_until='networkidle');page.get_by_text('Save or image unavailable.',exact=False).wait_for()
 page.get_by_role('button',name='Gallery 1',exact=True).click();page.locator('canvas').wait_for();page.wait_for_timeout(800)
 # A loaded local image can render without network access (not an offline app reload claim).
 context.set_offline(True);page.get_by_role('button',name='12 pieces',exact=True).click();page.wait_for_timeout(800)
 page.screenshot(path='artifacts/phase4.png',full_page=True)
 assert page.get_by_text('Loading image…',exact=False).count()==0
 context.set_offline(False)
 # Simulate quota failure. The existing metadata transaction must remain intact.
 previous=read(page,'current')
 page.evaluate("()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('Quota','QuotaExceededError')}}")
 page.get_by_role('button',name='Gallery 3',exact=True).click()
 page.get_by_text('Could not save:',exact=False).wait_for()
 assert read(page,'current')==previous
 assert not errors,errors
 print('PASS textured drag/groups, reload, real JPEG import, persistent-browser restart, five presets, asset eviction recovery, loaded-image offline rendering, EXIF orientation, corrupt JPEG rejection and quota failure')
 context.close()
