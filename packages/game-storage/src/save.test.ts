import {expect,it} from 'vitest';
import {imagePuzzle,createGame} from '@puzzleme/game-core';
import {decodeSave,encodeSave,type Save} from './save';
function fixture():Save{const p=imagePuzzle(800,600,12);return {version:2,algorithm:1,definition:{rows:p.rows,columns:p.columns,pieceSize:100,pieceHeight:p.pieceHeight??100,seed:42},image:{key:'gallery-1',width:800,height:600},state:createGame(p,42),seconds:22,settings:{count:12},statistics:{completed:2}};}
it('roundtrips positions, image, seed, elapsed time and statistics',()=>{const s=fixture();expect(decodeSave(encodeSave(s))).toEqual(s);});
it('migrates version 1 settings and statistics',()=>{const s={...fixture(),version:1,settings:undefined,statistics:undefined};expect(decodeSave(JSON.stringify(s)).statistics.completed).toBe(0);});
it.each(['{}','{','null','{"version":99}'])('rejects corrupted/outdated data %s',raw=>expect(()=>decodeSave(raw)).toThrow());
it('rejects invalid coordinates, disconnected groups and false completion',()=>{let s=fixture();s.state={...s.state,pieces:{...s.state.pieces,'piece:0:0':{x:NaN,y:0,group:'a'}}};expect(()=>encodeSave(s)).toThrow();s=fixture();s.state={...s.state,status:'completed'};expect(()=>encodeSave(s)).toThrow();});
it('restores connected groups and clears transient drag state',()=>{const s=fixture(),p=imagePuzzle(800,600,12);s.state={...s.state,status:'playing',active:'piece:0:0',pieces:Object.fromEntries(p.pieces.map(v=>[v.id,{x:v.column*100+20,y:v.row*(p.pieceHeight??100)+30,group:'all'}]))};const restored=decodeSave(encodeSave(s));expect(restored.state.active).toBe(null);expect(restored.state.status).toBe('paused');expect(new Set(Object.values(restored.state.pieces).map(p=>p.group)).size).toBe(1);});
