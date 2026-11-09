import { generatePuzzle } from './puzzle';
export const DIFFICULTIES = [12,24,48,96,150] as const;
export function normalizedSize(width:number,height:number,max=1600){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||width*height>100_000_000||!Number.isFinite(max)||max<1)throw new RangeError('Invalid or oversized image');
 const scale=Math.min(1,max/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
export function imagePuzzle(width:number,height:number,count:number,seed=42){
 normalizedSize(width,height);
 if(!DIFFICULTIES.some(n=>n===count))throw new RangeError('Invalid difficulty');
 let rows=1,score=Infinity;
 for(let r=1;r<=count;r++)if(count%r===0){const error=Math.abs(Math.log((count/r)/r/(width/height)));if(error<score){rows=r;score=error;}}
 const columns=count/rows;
 return generatePuzzle({rows,columns,pieceSize:100,pieceHeight:100*columns*height/(rows*width),seed});
}
