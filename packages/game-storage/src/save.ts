import { generatePuzzle, imagePuzzle, getNeighbors, type PlayState, type PuzzleOptions } from '@puzzleme/game-core';
export interface Save {version:2;algorithm:1;definition:PuzzleOptions;image:{key:string;width:number;height:number};state:PlayState;seconds:number;settings:{count:number};statistics:{completed:number}}
export function decodeSave(raw:string):Save {
 if(raw.length>2_000_000)throw new Error('Save too large');
 const s=JSON.parse(raw) as Save;
 if((s.version as number)===1){s.version=2;s.algorithm=1;s.settings={count:s.definition.rows*s.definition.columns};s.statistics={completed:0};}
 if(s.version!==2||s.algorithm!==1)throw new Error('Unsupported save version');
 const puzzle=generatePuzzle(s.definition);
 if(puzzle.pieces.length>150||!s.image||!/^(gallery-[123]|photo-[a-zA-Z0-9-]+)$/.test(s.image.key)||!Number.isFinite(s.image.width)||!Number.isFinite(s.image.height)||s.image.width<=0||s.image.height<=0||!Number.isFinite(s.seconds)||s.seconds<0||!Number.isInteger(s.statistics?.completed)||s.statistics.completed<0||s.settings?.count!==puzzle.pieces.length)throw new Error('Invalid save');
 const expected=imagePuzzle(s.image.width,s.image.height,s.settings.count,s.definition.seed);
 if(expected.rows!==puzzle.rows||expected.columns!==puzzle.columns||Math.abs((expected.pieceHeight??100)-(puzzle.pieceHeight??puzzle.pieceSize))>1e-8||puzzle.pieceSize!==100)throw new Error('Image geometry mismatch');
 const state=s.state;
 if(!state||!['ready','playing','paused','completed'].includes(state.status)||!Array.isArray(state.order)||new Set(state.order).size!==puzzle.pieces.length||Object.keys(state.pieces).length!==puzzle.pieces.length)throw new Error('Invalid state');
 const groups=new Map<string,string[]>();
 for(const p of puzzle.pieces){const v=state.pieces[p.id];if(!v||!state.order.includes(p.id)||!Number.isFinite(v.x)||!Number.isFinite(v.y)||Math.abs(v.x)>1e7||Math.abs(v.y)>1e7||typeof v.group!=='string'||v.group.length>100)throw new Error('Invalid piece');groups.set(v.group,[...(groups.get(v.group)??[]),p.id]);}
 for(const ids of groups.values()){
  const origin=puzzle.pieces.find(p=>p.id===ids[0])!,at=state.pieces[origin.id]!;
  const seen=new Set([origin.id]),queue=[origin.id];
  while(queue.length){const current=queue.pop();const p=puzzle.pieces.find(p=>p.id===current)!;for(const id of Object.values(getNeighbors(puzzle,p)))if(id&&ids.includes(id)&&!seen.has(id)){seen.add(id);queue.push(id);}}
  if(seen.size!==ids.length)throw new Error('Disconnected group');
  for(const id of ids){const p=puzzle.pieces.find(p=>p.id===id)!,v=state.pieces[id]!;if(Math.abs(v.x-at.x-(p.column-origin.column)*puzzle.pieceSize)>1e-5||Math.abs(v.y-at.y-(p.row-origin.row)*(puzzle.pieceHeight??puzzle.pieceSize))>1e-5)throw new Error('Invalid group offsets');}
 }
 if(state.status==='completed'&&groups.size!==1)throw new Error('False completion');
 return {...s,state:{...state,active:null,status:state.status==='playing'?'paused':state.status}};
}
export const encodeSave=(s:Save)=>{decodeSave(JSON.stringify(s));return JSON.stringify(s);};
