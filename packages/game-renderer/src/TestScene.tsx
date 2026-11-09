import { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, PanResponder, Platform } from 'react-native';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { createGame, generatePuzzle, traverseEdge, selectPiece, moveGroup, releaseGroup, pauseGame, toPuzzle, zoomCamera, type Camera } from '@puzzleme/game-core';

const boardStyle={height:500,touchAction:'none' as const,userSelect:'none' as const,backgroundColor:'#edf0e5'};
export function TestScene() {
  const puzzle=useMemo(()=>generatePuzzle({rows:3,columns:4,pieceSize:100,seed:42}),[]);
  const paths=useMemo(()=>Object.fromEntries(puzzle.pieces.map(piece=>{
    const builder=Skia.PathBuilder.Make(), commands=piece.edges.flatMap(traverseEdge);
    builder.moveTo(commands[0]!.start.x,commands[0]!.start.y);
    commands.forEach(s=>builder.cubicTo(s.control1.x,s.control1.y,s.control2.x,s.control2.y,s.end.x,s.end.y));builder.close();
    return [piece.id,builder.detach()];
  })),[puzzle]);
  const [state,setState]=useState(()=>createGame(puzzle,42));
  const [width,setWidth]=useState(440), [camera,setCamera]=useState<Camera>({x:20,y:20,scale:0.45});
  const [seconds,setSeconds]=useState(0);
  const live=useRef({state,camera,width});live.current={state,camera,width};
  const last=useRef({x:0,y:0}), cancelled=useRef(state), pinch=useRef(0);
  useEffect(()=>{if(state.status!=='playing')return;const t=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(t);},[state.status]);
  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:()=>true,
    onPanResponderTerminationRequest:()=>false,
    onPanResponderGrant:e=>{
      const s=live.current.state,c=live.current.camera;
      cancelled.current=s;last.current={x:e.nativeEvent.locationX,y:e.nativeEvent.locationY};pinch.current=0;
      const at=toPuzzle(last.current,c);
      const id=[...s.order].reverse().find(id=>{const p=puzzle.pieces.find(p=>p.id===id)!,a=s.pieces[id]!;return paths[id]!.contains(at.x-a.x+p.column*100,at.y-a.y+p.row*100);});
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
      }else if(s.active){const next=moveGroup(s,(at.x-last.current.x)/c.scale,(at.y-last.current.y)/c.scale);live.current.state=next;setState(next);}
      else {const next={...c,x:c.x+at.x-last.current.x,y:c.y+at.y-last.current.y};live.current.camera=next;setCamera(next);}
      last.current=at;
    },
    onPanResponderRelease:()=>{const next=releaseGroup(puzzle,live.current.state);live.current.state=next;setState(next);},
    onPanResponderTerminate:()=>{live.current.state=cancelled.current;setState(cancelled.current);},
  }),[paths,puzzle]);
  const wheelHandlers=Platform.OS==='web'?{onWheel:(e:{preventDefault:()=>void; nativeEvent:{deltaX:number;deltaY:number;ctrlKey:boolean}})=>{
    e.preventDefault();if(state.status==='completed'||state.status==='paused')return;
    setCamera(c=>e.nativeEvent.ctrlKey?zoomCamera(c,Math.exp(-e.nativeEvent.deltaY*0.01),{x:width/2,y:250}):{...c,x:c.x-e.nativeEvent.deltaX,y:c.y-e.nativeEvent.deltaY});
  }}:{};
  const fit=()=>setCamera({x:15,y:15,scale:Math.min((width-30)/600,470/1100)});
  return <View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {['−','+','Fit','Reset view','Pause','Restart'].map(label=><Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={()=>{
        if(label==='Restart'){setState(createGame(puzzle,42));setSeconds(0);fit();}
        else if(label==='Pause')setState(pauseGame(state));
        else if(label==='Fit'||label==='Reset view')fit();
        else setCamera(zoomCamera(camera,label==='+'?1.2:1/1.2,{x:width/2,y:250}));
      }}><Text style={{padding:8,color:'#254f46'}}>{label}</Text></Pressable>)}
    </View>
    <Text accessibilityLiveRegion="polite">{state.status} · {seconds}s · {new Set(Object.values(state.pieces).map(p=>p.group)).size} groups</Text>
    {state.status==='completed'&&<View style={{padding:20,backgroundColor:'#d5ddb5',borderRadius:12}}><Text accessibilityRole="alert">Puzzle completed! {seconds}s — Restart to play again.</Text></View>}
    <View {...responder.panHandlers} {...wheelHandlers} onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={boardStyle}>
      <Canvas style={{width:'100%',height:500}} accessibilityLabel="Interactive puzzle board">
        <Group transform={[{translateX:camera.x},{translateY:camera.y},{scale:camera.scale}]}>
          {state.order.map(id=>{const p=puzzle.pieces.find(p=>p.id===id)!,a=state.pieces[id]!;
            const selected=state.active!==null&&a.group===state.pieces[state.active]!.group;
            const connected=Object.values(state.pieces).filter(p=>p.group===a.group).length>1;
            return <Group key={id} transform={[{translateX:a.x-p.column*100},{translateY:a.y-p.row*100}]}>
              <Path path={paths[id]!} color={connected?'#83aaa2':'#e3c898'}/>
              <Path path={paths[id]!} style="stroke" strokeWidth={selected?4:1.5} color={selected?'#d16438':'#254f46'}/>
            </Group>;
          })}
        </Group>
      </Canvas>
    </View>
    <Text>Drag pieces to connect matching neighbors. Drag empty space to pan; pinch or use +/− to zoom.</Text>
  </View>;
}
