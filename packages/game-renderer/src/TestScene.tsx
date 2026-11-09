import { useMemo, useRef, useState, useEffect, memo } from 'react';
import { View, Text, Pressable, PanResponder, Platform } from 'react-native';
import { Canvas, Group, Path, Skia, type SkPath, Image, useImage, type SkImage } from '@shopify/react-native-skia';
import { createGame, traverseEdge, selectPiece, moveGroup, releaseGroup, pauseGame, toPuzzle, zoomCamera, type Camera, cancelDrag, type Placement, type PlayState, type PuzzleDefinition } from '@puzzleme/game-core';

const boardStyle={height:500,touchAction:'none' as const,userSelect:'none' as const,backgroundColor:'#edf0e5'};
const Piece = memo(function Piece({path, placement, x, y, selected, connected, image, imageWidth, imageHeight}:{path:SkPath;placement:Placement;x:number;y:number;selected:boolean;connected:boolean;image:SkImage|null;imageWidth:number;imageHeight:number}) {
  return <Group transform={[{translateX:placement.x-x},{translateY:placement.y-y}]}>
    <Path path={path} color={connected?'#83aaa2':'#e3c898'}/>{image&&<Group clip={path}><Image image={image} x={0} y={0} width={imageWidth} height={imageHeight} fit="fill"/></Group>}
    <Path path={path} style="stroke" strokeWidth={selected?4:1.5} color={selected?'#d16438':'#254f46'}/>
  </Group>;
});
export interface BoardProps {puzzle:PuzzleDefinition;imageUri:string;initialState?:PlayState;initialSeconds?:number;onChange?:(state:PlayState,seconds:number)=>void}
export function TestScene({puzzle,imageUri,initialState,initialSeconds=0,onChange}:BoardProps) {
  const {rows,columns}=puzzle;
  const pieceHeight=puzzle.pieceHeight??100;
  const image=useImage(imageUri);
  const paths=useMemo(()=>Object.fromEntries(puzzle.pieces.map(piece=>{
    const builder=Skia.PathBuilder.Make(), commands=piece.edges.flatMap(traverseEdge);
    builder.moveTo(commands[0]!.start.x,commands[0]!.start.y);
    commands.forEach(s=>builder.cubicTo(s.control1.x,s.control1.y,s.control2.x,s.control2.y,s.end.x,s.end.y));builder.close();
    return [piece.id,builder.detach()];
  })),[puzzle]);
  const byId=useMemo(()=>new Map(puzzle.pieces.map(p=>[p.id,p])),[puzzle]);
  const [state,setState]=useState(()=>initialState??createGame(puzzle,puzzle.seed));
  const [width,setWidth]=useState(440), [camera,setCamera]=useState<Camera>({x:20,y:20,scale:rows===3?0.45:470/((rows*2.5+1)*pieceHeight)});
  const [seconds,setSeconds]=useState(initialSeconds);
  useEffect(()=>{onChange?.(state,seconds);},[state,seconds,onChange]);
  const live=useRef({state,camera,width});live.current={state,camera,width};
  const last=useRef({x:0,y:0}), cancelled=useRef(state), pinch=useRef(0), initialCamera=useRef(camera);
  useEffect(()=>{if(state.status!=='playing')return;const t=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(t);},[state.status]);
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:()=>true,
    onPanResponderTerminationRequest:()=>false,
    onPanResponderGrant:e=>{
      const s=live.current.state,c=live.current.camera;
      cancelled.current=s;initialCamera.current=c;last.current={x:e.nativeEvent.locationX,y:e.nativeEvent.locationY};pinch.current=0;
      const at=toPuzzle(last.current,c);
      const id=[...s.order].reverse().find(id=>{const p=byId.get(id)!,a=s.pieces[id]!;return paths[id]!.contains(at.x-a.x+p.column*100,at.y-a.y+p.row*pieceHeight);});
      const next=selectPiece(s,id??null);live.current.state=next;setState(next);
    },
    onPanResponderMove:e=>{
      const {state:s,camera:c}=live.current;
      if(s.status==='paused'||s.status==='completed')return;
      const touches=e.nativeEvent.touches;
      const at={x:e.nativeEvent.locationX,y:e.nativeEvent.locationY};
      if(touches.length>1){
        const distance=Math.hypot(touches[0]!.pageX-touches[1]!.pageX,touches[0]!.pageY-touches[1]!.pageY);
        if(pinch.current){const next=zoomCamera(c,distance/pinch.current,at);live.current.camera=next;setCamera(next);}
        pinch.current=distance;
        const next={...s,active:null};live.current.state=next;setState(next);
      }else if(pinch.current){pinch.current=0;last.current=at;return;}
      else if(s.active){const next=moveGroup(s,(at.x-last.current.x)/c.scale,(at.y-last.current.y)/c.scale);live.current.state=next;setState(next);}
      else {const next={...c,x:c.x+at.x-last.current.x,y:c.y+at.y-last.current.y};live.current.camera=next;setCamera(next);}
      last.current=at;
    },
    onPanResponderRelease:()=>{const next=releaseGroup(puzzle,live.current.state);live.current.state=next;setState(next);},
    onPanResponderTerminate:()=>{const next=cancelDrag(live.current.state,cancelled.current);live.current.state=next;setState(next);live.current.camera=initialCamera.current;setCamera(initialCamera.current);},
  }),[paths,puzzle,byId,pieceHeight]);
  const wheelHandlers=Platform.OS==='web'?{onWheel:(e:{preventDefault:()=>void; nativeEvent:{deltaX:number;deltaY:number;ctrlKey:boolean}})=>{
    e.preventDefault();if(state.status==='completed'||state.status==='paused')return;
    setCamera(c=>e.nativeEvent.ctrlKey?zoomCamera(c,Math.exp(-e.nativeEvent.deltaY*0.01),{x:width/2,y:250}):{...c,x:c.x-e.nativeEvent.deltaX,y:c.y-e.nativeEvent.deltaY});
  }}:{};
  const groupSizes=useMemo(()=>{
    const sizes=new Map<string,number>();
    for(const p of Object.values(state.pieces))sizes.set(p.group,(sizes.get(p.group)??0)+1);
    return sizes;
  },[state.pieces]);
  const fit=()=>setCamera({x:15,y:15,scale:Math.min(0.45,(width-30)/(columns*150),470/((rows*2.5+1)*pieceHeight))});
  return <View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {['−','+','Fit','Reset view',state.status==='paused'?'Resume':'Pause','Restart'].map(label=><Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={()=>{
        if(label==='Restart'){setState(createGame(puzzle,42));setSeconds(0);fit();}
        else if(label==='Pause'||label==='Resume')setState(pauseGame(state));
        else if(label==='Fit'||label==='Reset view')fit();
        else setCamera(zoomCamera(camera,label==='+'?1.2:1/1.2,{x:width/2,y:250}));
      }}><Text style={{padding:8,color:'#254f46'}}>{label}</Text></Pressable>)}
    </View>
    <Text accessibilityLiveRegion="polite">{state.status} · {seconds}s · {new Set(Object.values(state.pieces).map(p=>p.group)).size} groups</Text>
    {state.status==='completed'&&<View style={{padding:20,backgroundColor:'#d5ddb5',borderRadius:12}}><Text accessibilityRole="alert">Puzzle completed! {seconds}s — Restart to play again.</Text></View>}
    <View {...responder.panHandlers} {...wheelHandlers} onLayout={e=>{const w=e.nativeEvent.layout.width;setWidth(w);setCamera({x:20,y:20,scale:Math.min(0.45,(w-30)/(columns*150),470/((rows*2.5+1)*pieceHeight))});}} style={boardStyle}>
      <Canvas style={{width:'100%',height:500}} accessibilityLabel="Interactive puzzle board">
        <Group transform={[{translateX:camera.x},{translateY:camera.y},{scale:camera.scale}]}>
          {state.order.map(id=>{const p=byId.get(id)!,a=state.pieces[id]!;
            return <Piece key={id} path={paths[id]!} placement={a} x={p.column*100} y={p.row*pieceHeight} image={image} imageWidth={columns*100} imageHeight={rows*pieceHeight}
              selected={state.active!==null&&a.group===state.pieces[state.active]!.group}
              connected={(groupSizes.get(a.group)??0)>1}/>;
          })}
        </Group>
      </Canvas>
    </View>
    {!image&&<Text>Loading image… If it cannot be decoded, choose a different gallery image.</Text>}
    <Text>Drag pieces to connect matching neighbors. Drag empty space to pan; pinch or use +/− to zoom.</Text>
  </View>;
}
