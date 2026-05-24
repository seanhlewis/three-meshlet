# three-meshlet

`three-meshlet` is a reusable Three.js meshlet library you can clone and run immediately. It focuses on practical mesh optimization workflows: load GLTF or GLB content, generate multi-LOD meshlet payloads, and feed that data into your own renderer pipeline.

The repository also includes a separate WebGPU demo app that showcases a Nanite-style renderer for Three.js, so the library and the demo stay cleanly split.

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

If you prefer local development from your clone:

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

## Run the separate demo app

From the repository root:

```bash
npm run demo
```

Open:

- http://127.0.0.1:8787/

The demo in `/demo` is independent from the package entry in `/src`, which keeps this repo useful both as a three.js meshlet library and as a reference implementation for a WebGPU meshlet renderer.

Credit: Nanite-style renderer for threejs by @sea3dformat.
