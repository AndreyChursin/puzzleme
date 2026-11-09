import {it,expect} from 'vitest';
import {imagePuzzle,normalizedSize,DIFFICULTIES,createGame,selectPiece,releaseGroup,validatePuzzle} from './index';
it('downscales without upscaling or changing aspect ratio',()=>{expect(normalizedSize(4000,2000)).toEqual({width:1600,height:800});expect(normalizedSize(20,30)).toEqual({width:20,height:30});});
it.each([[0,2],[NaN,20],[100000,100000],[-2,3]])('rejects invalid image dimensions', (w,h)=>expect(()=>normalizedSize(w,h)).toThrow());
it.each(DIFFICULTIES)('preserves landscape, portrait and square images at %s pieces', count=>{for(const [w,h] of [[800,600],[600,800],[700,700]]){const p=imagePuzzle(w!,h!,count);expect(p.pieces.length).toBe(count);expect(p.columns*p.pieceSize/(p.rows*(p.pieceHeight??p.pieceSize))).toBeCloseTo(w!/h!);expect(validatePuzzle(p)).toEqual([]);expect(imagePuzzle(w!,h!,count)).toEqual(p);}});
it('snaps rectangular pieces by correct solved height',()=>{const p=imagePuzzle(600,800,12),s=createGame(p,42);const pieces=Object.fromEntries(p.pieces.map(v=>[v.id,{x:v.column*100,y:v.row*(p.pieceHeight??100),group:v.id}]));expect(releaseGroup(p,selectPiece({...s,pieces},p.pieces[0]!.id)).status).toBe('completed');});
