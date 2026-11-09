import type { Point } from './grid';
import type { PuzzleDefinition } from './puzzle';
import { getNeighbors } from './validation';
export interface Placement { readonly x: number; readonly y: number; readonly group: string }
export interface PlayState { readonly pieces: Readonly<Record<string, Placement>>; readonly order: readonly string[]; readonly active: string | null; readonly status: 'ready' | 'playing' | 'paused' | 'completed' }
export interface Camera { x: number; y: number; scale: number }
export const toPuzzle = (p: Point, c: Camera): Point => ({ x: (p.x-c.x)/c.scale, y: (p.y-c.y)/c.scale });
export function zoomCamera(c: Camera, factor: number, anchor: Point): Camera {
  const p = toPuzzle(anchor,c), scale = Math.max(0.15,Math.min(4,c.scale*factor));
  return { x: anchor.x-p.x*scale, y: anchor.y-p.y*scale, scale };
}
export function createGame(puzzle: PuzzleDefinition, seed: number): PlayState {
  let value = seed >>> 0;
  const random = () => { value = (Math.imul(value,1664525)+1013904223)>>>0; return value/4294967296; };
  const slots = puzzle.pieces.map((_,i)=>i);
  for(let i=slots.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [slots[i],slots[j]]=[slots[j]!,slots[i]!]; }
  return { pieces: Object.fromEntries(puzzle.pieces.map((p,i)=>[p.id,{ x: (slots[i]!%puzzle.columns)*puzzle.pieceSize*1.5, y: (Math.floor(slots[i]!/puzzle.columns)*1.5+puzzle.rows+1)*puzzle.pieceSize, group:p.id }])), order:puzzle.pieces.map(p=>p.id), active:null, status:'ready' };
}
export function selectPiece(s: PlayState,id: string | null): PlayState {
  if(s.status==='paused'||s.status==='completed') return s;
  if(!id||!s.pieces[id]) return {...s,active:null};
  const group=s.pieces[id]!.group;
  return {...s,active:id,status:'playing',order:[...s.order.filter(k=>s.pieces[k]!.group!==group),...s.order.filter(k=>s.pieces[k]!.group===group)]};
}
export function moveGroup(s: PlayState,dx:number,dy:number): PlayState {
  if(!s.active||s.status!=='playing'||!Number.isFinite(dx)||!Number.isFinite(dy)) return s;
  const group=s.pieces[s.active]!.group;
  return {...s,pieces:Object.fromEntries(Object.entries(s.pieces).map(([id,p])=>[id,p.group===group?{...p,x:p.x+dx,y:p.y+dy}:p]))};
}
export function releaseGroup(puzzle:PuzzleDefinition,s:PlayState,tolerance=20):PlayState {
  if(!s.active||s.status!=='playing') return s;
  if(!Number.isFinite(tolerance)||tolerance<0) throw new RangeError('Invalid snap tolerance');
  let next=s;
  let merged=true;
  while(merged) {
    merged=false;
    const moving=next.pieces[next.active!]!.group;
    for(const piece of puzzle.pieces) {
      const a=next.pieces[piece.id]!;
      if(a.group!==moving) continue;
      for(const neighborId of Object.values(getNeighbors(puzzle,piece))) {
        if(!neighborId) continue;
        const neighbor=puzzle.pieces.find(p=>p.id===neighborId)!;
        const b=next.pieces[neighborId]!;
        if(a.group===b.group) continue;
        const dx=b.x-(neighbor.column-piece.column)*puzzle.pieceSize-a.x;
        const dy=b.y-(neighbor.row-piece.row)*puzzle.pieceSize-a.y;
        if(Math.hypot(dx,dy)>tolerance) continue;
        next=moveGroup(next,dx,dy);
        next={...next,pieces:Object.fromEntries(Object.entries(next.pieces).map(([id,p])=>[id,p.group===moving?{...p,group:b.group}:p]))};
        merged=true;break;
      }
      if(merged) break;
    }
  }
  const first=puzzle.pieces[0]!, origin=next.pieces[first.id]!;
  const won=puzzle.pieces.every(p=>{const a=next.pieces[p.id]!;return a.group===origin.group&&Math.abs(a.x-origin.x-(p.column-first.column)*puzzle.pieceSize)<1e-6&&Math.abs(a.y-origin.y-(p.row-first.row)*puzzle.pieceSize)<1e-6;});
  return {...next,active:null,status:won?'completed':'playing'};
}
export const pauseGame=(s:PlayState):PlayState=>s.status==='completed'?s:{...s,active:null,status:s.status==='paused'?'playing':'paused'};
