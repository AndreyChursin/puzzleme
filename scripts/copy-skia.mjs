import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync } from 'node:fs';
const require = createRequire(new URL('../apps/game/package.json', import.meta.url));
const skiaRequire = createRequire(require.resolve('@shopify/react-native-skia/package.json'));
const source = skiaRequire.resolve('canvaskit-wasm/bin/full/canvaskit.wasm');
const destination = new URL('../apps/game/public/', import.meta.url);
mkdirSync(destination, { recursive: true });
copyFileSync(source, new URL('canvaskit.wasm', destination));
