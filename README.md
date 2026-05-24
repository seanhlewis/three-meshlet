# three-meshlet

`three-meshlet` is a practical Three.js meshlet library for teams building real-time 3D apps on the web. If you are working with heavy GLTF or GLB assets and need cleaner performance, this package helps you convert source geometry into meshlet data with multiple LOD levels that you can plug into your own renderer pipeline.

Instead of treating mesh optimization like a separate offline chore, you can keep everything in one JavaScript workflow: load models, process geometry, and generate meshlet payloads that are ready for modern threejs rendering strategies. It is especially useful when you are experimenting with meshlet streaming patterns, distance-based detail reduction, or Nanite-style ideas in a Three.js project.

This repo also ships a separate WebGPU demo app that mirrors a Nanite-style renderer for threejs. The library code stays in `src/`, while the demo lives in `demo/`, so you can use the package in production projects and still keep a runnable visual reference nearby.

## Clone the repository

```bash
git clone https://github.com/seanhlewis/three-meshlet.git
cd three-meshlet
```

## Install

```bash
npm install three
npm install github:seanhlewis/three-meshlet
```

If you want to develop against your local clone:

```bash
npm install /absolute/path/to/three-meshlet
```

## Use the library

```js
import {
  buildThreeMeshletAssetFromUrls,
  getThreeMeshletDracoDecoderPath
} from 'three-meshlet';

const { sources, meshlets } = await buildThreeMeshletAssetFromUrls(
  [
    { name: 'DamagedHelmet', url: '/models/DamagedHelmet.gltf' },
    { name: 'CoffeeMug', url: '/models/coffeeMug.glb' }
  ],
  {
    loaderOptions: {
      dracoDecoderPath: getThreeMeshletDracoDecoderPath()
    },
    onProgress: (message, progress) => {
      console.log(message, Math.round(progress * 100) + '%');
    }
  }
);

console.log(sources.length, meshlets.totalChunks);
```

## Build from in-memory buffers

```js
import { buildThreeMeshletAssetFromArrayBuffers } from 'three-meshlet';

const entry = {
  name: 'UploadedModel',
  buffer: await file.arrayBuffer()
};

const { meshlets } = await buildThreeMeshletAssetFromArrayBuffers([entry]);
console.log(meshlets.meshletTopologyStats);
```

## Why people use it

- Build a three meshlet pipeline directly inside your app code.
- Prepare GLTF geometry for level-of-detail transitions without bolting on a separate toolchain.
- Explore WebGPU mesh rendering ideas with a concrete, working three.js reference.
- Reuse meshlet generation logic across visualization tools, editors, and runtime viewers.

## Main exports

- `createThreeMeshletGLTFLoader(options?)`
- `loadSourceModelFromUrl(options)`
- `loadSourceModelFromArrayBuffer(options)`
- `loadSourceModelsFromUrls(entries, options?)`
- `assignSourceMaterialIds(sources)`
- `buildThreeMeshletAsset(sources, options?)`
- `buildThreeMeshletAssetFromUrls(entries, options?)`
- `buildThreeMeshletAssetFromArrayBuffers(entries, options?)`
- `mergeMeshletAssets(base, next, vertexBase)`
- `buildVertexGeometry(sources)`
- `getThreeMeshletDracoDecoderPath()`
- `getThreeMeshletDemoUrl(path?)`

## Run the demo app

From the repository root:

```bash
npm run demo
```

Then open:

- http://127.0.0.1:8787/

If port `8787` is busy, run it on another port:

```powershell
$env:PORT='8790'; npm run demo
```

Credit: Nanite-style renderer for threejs by @sea3dformat.
