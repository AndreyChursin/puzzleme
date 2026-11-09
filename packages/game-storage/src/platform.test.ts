import {vi,it,expect,beforeEach} from 'vitest';
const fake=vi.hoisted(()=>({files:new Map<string,string>(),failMove:false}));
vi.mock('expo-file-system',()=>{
 class Directory {uri:string;constructor(...parts:unknown[]){this.uri=parts.map(p=>typeof p==='object'?(p as Directory).uri:p).join('/');}create(){}}
 class File {
  uri:string;constructor(...parts:unknown[]){this.uri=parts.map(p=>typeof p==='object'?(p as Directory).uri:p).join('/');}
  get exists(){return fake.files.has(this.uri);}
  text(){return Promise.resolve(fake.files.get(this.uri)!);}
  async write(value:string){await Promise.resolve();fake.files.set(this.uri,value);}
  async copy(to:File){await Promise.resolve();if(!this.exists)throw new Error('Missing image');fake.files.set(to.uri,fake.files.get(this.uri)!);}
  delete(){fake.files.delete(this.uri);}
  async move(to:File){await Promise.resolve();if(fake.failMove)throw new Error('Interrupted write');await this.copy(to);this.delete();}
 }
 return {Directory,File,Paths:{document:'/doc'}};
});
import {storage,cacheImage,readImage} from './platform';
beforeEach(()=>{fake.files.clear();fake.failMove=false;});
it('writes and reads metadata and recovers previous generation after an interrupted replacement',async()=>{await storage.write('current','first');expect(await storage.read('current')).toBe('first');fake.failMove=true;await expect(storage.write('current','second')).rejects.toThrow();expect(await storage.read('current')).toBe('first');});
it('copies image bytes to documents and detects a missing asset',async()=>{expect(await readImage('photo-1')).toBe(null);fake.files.set('/temporary/photo','jpeg');const uri=await cacheImage('photo-1','/temporary/photo');fake.files.delete('/temporary/photo');expect(await readImage('photo-1')).toBe(uri);expect(fake.files.get(uri)).toBe('jpeg');});
