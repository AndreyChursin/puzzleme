import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';
import * as Manipulator from 'expo-image-manipulator';
import { TestScene } from '@puzzleme/game-renderer';
import { DIFFICULTIES, normalizedSize, imagePuzzle, createGame, generatePuzzle, type PlayState } from '@puzzleme/game-core';
import { storage, cacheImage, readImage, decodeSave, encodeSave, type Save } from '@puzzleme/game-storage';
// Metro statically discovers bundled assets through literal requires.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gallery=[require('../assets/gallery-1.jpg'),require('../assets/gallery-2.jpg'),require('../assets/gallery-3.jpg')] as const;
async function bundled(key:string){
 try{const cached=await readImage(key);if(cached)return cached;}catch{/* Bundled resources remain usable when persistence is unavailable. */}
 const asset=Asset.fromModule(gallery[Number(key.slice(-1))-1]!);await asset.downloadAsync();const uri=asset.localUri??asset.uri;
 try{return await cacheImage(key,uri);}catch{return uri;}
}
const fresh=(width:number,height:number,count:number,key:string,completed=0):Save=>{
 const p=imagePuzzle(width,height,count);
 return {version:2,algorithm:1,definition:{rows:p.rows,columns:p.columns,pieceSize:100,pieceHeight:p.pieceHeight??100,seed:p.seed},image:{key,width,height},state:createGame(p,42),seconds:0,settings:{count},statistics:{completed}};
};
export default function Session(){
 const [session,setSession]=useState<{save:Save;uri:string;revision:number}|null>(null),[message,setMessage]=useState('Loading local puzzle…'),[busy,setBusy]=useState(false);
 const lifetime=useRef(0);
 const pending=useRef<Save|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),queue=useRef(Promise.resolve());
 const flush=useCallback(()=>{if(timer.current)clearTimeout(timer.current);const s=pending.current;if(!s)return;queue.current=queue.current.catch(()=>{}).then(()=>storage.write('current',encodeSave(s))).then(()=>setMessage('Saved locally')).catch(()=>setMessage('Could not save: storage unavailable or quota exceeded. Keep this page open.'));},[]);
 useEffect(()=>{let alive=true;(async()=>{try{
  const raw=await storage.read('current');
  if(raw){const save=decodeSave(raw);lifetime.current=save.statistics.completed;const uri=save.image.key.startsWith('gallery-')?await bundled(save.image.key):await readImage(save.image.key);if(!uri)throw new Error('Saved image missing or evicted');if(alive){setSession({save,uri,revision:0});setMessage('Restored local puzzle');}return;}
  if(alive){setSession({save:fresh(800,600,12,'gallery-1'),uri:await bundled('gallery-1'),revision:0});setMessage('Local puzzle');}
 }catch{if(alive)setMessage('Save or image unavailable. Choose a gallery image to recover; the old save is retained until a new game is saved.');}})();
 const sub=AppState.addEventListener('change',state=>{if(state!=='active')flush();});
 const visibility=()=>{if(document.visibilityState==='hidden')flush();};
 if(Platform.OS==='web'){document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',flush);}
 return()=>{alive=false;sub.remove();if(Platform.OS==='web'){document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',flush);}flush();};},[flush]);
 const update=useCallback((state:PlayState,seconds:number)=>{if(!session)return;const old=pending.current??session.save;const completed=state.status==='completed'&&old.state.status!=='completed'?old.statistics.completed+1:old.statistics.completed;
 lifetime.current=completed;pending.current={...session.save,state,seconds,statistics:{completed}};if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(flush,500);},[session,flush]);
 const choose=async(key:string,uri:string,width:number,height:number,count=session?.save.settings.count??12)=>{const completed=pending.current?.statistics.completed??session?.save.statistics.completed??lifetime.current;pending.current=null;if(timer.current)clearTimeout(timer.current);setSession(s=>({save:fresh(width,height,count,key,completed),uri,revision:(s?.revision??0)+1}));};
 const chooseGallery=async(i:number)=>{try{const key=`gallery-${i+1}`;await choose(key,await bundled(key),i===1?600:i===2?700:800,i===1?800:i===2?700:600);}catch{setMessage('Bundled image unavailable. Try again with the app online.');}};
 const importPhoto=async()=>{setBusy(true);try{
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:1,exif:true});if(result.canceled)return;const asset=result.assets[0]!;
  if(asset.mimeType&&!/^image\/(jpeg|png|webp|heic|heif)$/.test(asset.mimeType))throw new Error('Unsupported image');
  normalizedSize(asset.width,asset.height);
  const decoded=await Manipulator.manipulateAsync(asset.uri,[],{compress:1,format:Manipulator.SaveFormat.JPEG});
  const size=normalizedSize(decoded.width,decoded.height);
  // Decode and re-encode pixels: platform decoders apply EXIF orientation. Do not rotate twice.
  const image=await Manipulator.manipulateAsync(decoded.uri,[{resize:size}],{compress:.88,format:Manipulator.SaveFormat.JPEG});
  const key=`photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,uri=await cacheImage(key,image.uri);
  await choose(key,uri,image.width,image.height);setMessage('Photo processed locally');
 }catch{setMessage('Image could not be processed or cached. Try a smaller JPEG/PNG; the current puzzle is unchanged.');}finally{setBusy(false);}};
 const puzzle=useMemo(()=>session?generatePuzzle(session.save.definition):null,[session]);
 return <View><Text accessibilityLiveRegion="polite">{message}</Text><View style={{flexDirection:'row',flexWrap:'wrap'}}>
 {gallery.map((_,i)=><Pressable key={i} disabled={busy} accessibilityRole="button" onPress={()=>void chooseGallery(i)}><Text style={{padding:10}}>Gallery {i+1}</Text></Pressable>)}
 <Pressable accessibilityRole="button" disabled={busy} onPress={()=>void importPhoto()}><Text style={{padding:10}}>{busy?'Processing…':'Import photo'}</Text></Pressable>
 {DIFFICULTIES.map(n=><Pressable key={n} accessibilityRole="button" disabled={!session||busy} onPress={()=>{if(session)void choose(session.save.image.key,session.uri,session.save.image.width,session.save.image.height,n);}}><Text style={{padding:10}}>{n} pieces</Text></Pressable>)}</View>
 {session&&puzzle&&<TestScene key={session.revision} puzzle={puzzle} imageUri={session.uri} initialState={session.save.state} initialSeconds={session.save.seconds} onChange={update}/>}
 </View>;
}
