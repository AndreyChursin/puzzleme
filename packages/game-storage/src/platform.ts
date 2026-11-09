import { File, Directory, Paths } from 'expo-file-system';
const root=()=>{const d=new Directory(Paths.document,'puzzleme');d.create({idempotent:true,intermediates:true});return d;};
const file=(key:string)=>new File(root(),encodeURIComponent(key));
export const storage={read:async(key:string)=>{const f=file(key);return f.exists?await f.text():file(`${key}.backup`).exists?await file(`${key}.backup`).text():null;},write:async(key:string,value:string)=>{const target=file(key),tmp=file(`${key}.tmp`);await tmp.write(value);if(target.exists){const backup=file(`${key}.backup`);if(backup.exists)backup.delete();await target.copy(backup);target.delete();}await tmp.move(target);}};
export async function cacheImage(key:string,uri:string){const target=file(`asset-${key}.jpg`);await new File(uri).copy(target);return target.uri;}
export async function readImage(key:string){const f=file(`asset-${key}.jpg`);return f.exists?f.uri:null;}
