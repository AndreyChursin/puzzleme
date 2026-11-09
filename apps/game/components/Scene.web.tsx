import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { ComponentType } from 'react';
import { Text } from 'react-native';
async function loadScene(): Promise<{ default: ComponentType<object> }> {
  const module = await import('./Session');
  return { default: module.default };
}
export default function Scene() {
  return <WithSkiaWeb opts={{ locateFile: () => '/canvaskit.wasm' }}
    getComponent={loadScene}
    fallback={<Text>Loading local Skia renderer…</Text>} />;
}
