import { useMemo, useState } from 'react';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { generatePuzzle, traverseEdge } from '@puzzleme/game-core';

const colors = ['#a8c7b2', '#83aaa2', '#d5ddb5', '#e3c898', '#b3cbd2'];
/** Static assembled preview; native and Web consume the same cubic commands. */
export function TestScene() {
  const [width, setWidth] = useState(440);
  const paths = useMemo(() => {
    const puzzle = generatePuzzle({ rows: 3, columns: 4, pieceSize: 100, seed: 42 });
    return puzzle.pieces.map(piece => {
      const commands = piece.edges.flatMap(traverseEdge);
      const path = Skia.PathBuilder.Make();
      path.moveTo(commands[0]!.start.x, commands[0]!.start.y);
      commands.forEach(s => path.cubicTo(s.control1.x, s.control1.y, s.control2.x, s.control2.y, s.end.x, s.end.y));
      path.close();
      return { id: piece.id, path: path.detach(), color: colors[(piece.row + piece.column) % colors.length]! };
    });
  }, []);
  return <Canvas accessibilityLabel="Assembled 12-piece jigsaw puzzle preview" onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{ width: '100%', height: width * 320 / 420 }} testID="skia-puzzle-preview">
    <Group transform={[{ scale: width / 420 }, { translateX: 10 }, { translateY: 10 }]}>
      {paths.map(({ id, path, color }) => <Group key={id}>
        <Path path={path} color={color} />
        <Path path={path} style="stroke" strokeWidth={1.5} color="#254f46" strokeJoin="round" />
      </Group>)}
    </Group>
  </Canvas>;
}
