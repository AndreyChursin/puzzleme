import { expect,it } from 'vitest';
import { createGame,generatePuzzle,selectPiece,moveGroup,releaseGroup,pauseGame,toPuzzle,zoomCamera } from './index';
const puzzle=generatePuzzle({rows:2,columns:3,pieceSize:100,seed:42});
it('shuffles deterministically outside solved positions and resets',()=>{
 const a=createGame(puzzle,42);expect(a).toEqual(createGame(puzzle,42));expect(a).not.toEqual(createGame(puzzle,43));
 expect(Object.values(a.pieces).every(p=>p.y>=300)).toBe(true);
 expect(moveGroup(selectPiece(a,'piece:0:0'),2,3)).not.toEqual(a);expect(createGame(puzzle,42)).toEqual(a);
});
it('selects, raises, moves and cancels selection without mutating input',()=>{
 const a=createGame(puzzle,42),s=selectPiece(a,'piece:0:0'),m=moveGroup(s,10,20);
 expect(s.order.at(-1)).toBe('piece:0:0');expect(m.pieces['piece:0:0']!.x).toBe(a.pieces['piece:0:0']!.x+10);
 expect(a.active).toBe(null);expect(selectPiece(m,null).active).toBe(null);
 expect(moveGroup(pauseGame(m),4,5)).toEqual(pauseGame(m));
});
it('merges correct neighbors at tolerance, moves entire groups, prevents duplicates and detects victory',()=>{
 let s=createGame(puzzle,2);
 s={...s,pieces:Object.fromEntries(puzzle.pieces.map(p=>[p.id,{x:p.column*100,y:p.row*100,group:p.id}]))};
 const near=moveGroup(selectPiece(s,'piece:0:0'),19,0);
 const won=releaseGroup(puzzle,near,20);
 expect(won.status).toBe('completed');expect(new Set(Object.values(won.pieces).map(p=>p.group)).size).toBe(1);
 expect(releaseGroup(puzzle,won)).toBe(won);expect(selectPiece(won,'piece:0:0')).toBe(won);
});
it('rejects distant neighbors and false proximity victory',()=>{
 const a=createGame(puzzle,1),s={...a,pieces:Object.fromEntries(puzzle.pieces.map(p=>[p.id,{x:0,y:0,group:p.id}]))};
 expect(releaseGroup(puzzle,selectPiece(s,'piece:0:0'),20).status).toBe('playing');
 expect(()=>releaseGroup(puzzle,selectPiece(s,'piece:0:0'),-1)).toThrow();
});
it('moves a connected group together',()=>{
 const a=createGame(puzzle,1),pieces={...a.pieces};pieces['piece:0:1']={...pieces['piece:0:1']!,group:'piece:0:0'};
 const s={...a,pieces},m=moveGroup(selectPiece(s,'piece:0:0'),5,8);
 for(const id of ['piece:0:0','piece:0:1'])expect(m.pieces[id]!.x-s.pieces[id]!.x).toBe(5);
 expect(m.pieces['piece:1:0']).toEqual(s.pieces['piece:1:0']);
});
it('preserves anchor under zoom and inverts viewport transforms',()=>{
 const c={x:20,y:40,scale:0.5},p={x:120,y:90};expect(toPuzzle(p,c)).toEqual({x:200,y:100});
 expect(toPuzzle(p,zoomCamera(c,2,p))).toEqual(toPuzzle(p,c));
});
it('supports group-to-group snapping at the tolerance boundary',()=>{
 const p=generatePuzzle({rows:1,columns:4,pieceSize:100,seed:4}),a=createGame(p,1);
 const s={...a,pieces:Object.fromEntries(p.pieces.map((piece,i)=>[piece.id,{x:i*100+(i<2?20:0),y:0,group:i<2?'left':'right'}]))};
 expect(releaseGroup(p,selectPiece(s,'piece:0:0'),19).status).toBe('playing');
 expect(releaseGroup(p,selectPiece(s,'piece:0:0'),20).status).toBe('completed');
});
it('records core transition timings for practical board sizes',()=>{
 for(const [rows,columns] of [[3,4],[6,8],[10,15]]){
  const p=generatePuzzle({rows:rows!,columns:columns!,pieceSize:100,seed:42});
  let s=selectPiece(createGame(p,42),p.pieces[0]!.id);
  const start=performance.now();for(let i=0;i<100;i++)s=moveGroup(s,1,1);
  releaseGroup(p,s);console.log(`${rows!*columns!} pieces: 100 moves + release ${(performance.now()-start).toFixed(2)}ms`);
 }
});
it('preserves two independently connected groups when joining and prevents duplicate merges',()=>{
 const p=generatePuzzle({rows:2,columns:3,pieceSize:100,seed:0}),a=createGame(p,0);
 const s={...a,pieces:Object.fromEntries(p.pieces.map((piece,i)=>[piece.id,{x:piece.column*100+(i%3===2?10:0),y:piece.row*100,group:i%3===2?'right':'left'}]))};
 const merged=releaseGroup(p,selectPiece(s,'piece:0:2'),10);
 expect(merged.status).toBe('completed');
 expect(new Set(Object.values(merged.pieces).map(v=>v.group)).size).toBe(1);
 expect(s.pieces['piece:0:2']!.x).toBe(210);
 expect(releaseGroup(p,merged)).toBe(merged);
});
it('cancels a drag without resurrecting selection or undoing pause/restart',async()=>{
 const {cancelDrag}=await import('./gameplay');
 const initial=createGame(puzzle,42), moved=moveGroup(selectPiece(initial,'piece:0:0'),30,40);
 expect(cancelDrag(moved,initial)).toEqual(initial);
 expect(cancelDrag({...moved,active:null},initial)).toEqual(initial);
 expect(cancelDrag(pauseGame(moved),initial)).toEqual(pauseGame(moved));
 const restarted=createGame(puzzle,43);
 expect(cancelDrag(restarted,initial)).toBe(restarted);
});
