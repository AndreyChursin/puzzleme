import { useState } from 'react';
import { Canvas, Circle, Group, Path, Rect, RoundedRect, Skia } from '@shopify/react-native-skia';
/** Shared native/web Skia smoke scene. No puzzle rules or generated topology. */
export function TestScene() {
  const [width, setWidth] = useState(440);
  const mountain = Skia.Path.MakeFromSVGString('M 0 290 L 110 140 L 170 215 L 285 65 L 440 290 Z');
  const foreground = Skia.Path.MakeFromSVGString('M 0 305 L 90 225 L 190 300 L 310 190 L 440 310 L 440 360 L 0 360 Z');
  const seam = Skia.Path.MakeFromSVGString('M 220 0 L 220 60 C 190 45 190 95 220 80 L 220 175 L 290 175 C 275 145 325 145 310 175 L 440 175 M 220 175 L 220 245 C 250 230 250 280 220 265 L 220 350 M 0 175 L 70 175 C 55 205 105 205 90 175 L 220 175');
  return <Canvas onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', height: width * 350 / 440 }} testID="skia-test-scene">
    <Group transform={[{ scale: width / 440 }]}>
    <RoundedRect x={0} y={0} width={440} height={350} r={24} color="#c4d9d8" />
    <Group clip={{ x: 0, y: 0, width: 440, height: 350 }}>
      <Circle cx={330} cy={75} r={35} color="#f9e7b4" />
      {mountain && <Path path={mountain} color="#638b87" />}
      {foreground && <Path path={foreground} color="#254f46" />}
      <Rect x={0} y={318} width={440} height={32} color="#173e37" />
      {seam && <Path path={seam} style="stroke" strokeWidth={2} color="#f5f3ed" opacity={0.7} />}
    </Group>
    </Group>
  </Canvas>;
}
