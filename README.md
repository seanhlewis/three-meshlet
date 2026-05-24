# three-meshlet

`three-meshlet` is a Three.js meshlet library for GLTF and GLB assets. It loads source models, builds meshlets, and generates multi-LOD data you can use in a custom renderer or content pipeline.

The package is focused on mesh optimization for real-time rendering: triangle reduction by LOD, meshlet clustering, and compact payloads for large scenes. If you are working on WebGPU rendering, threejs performance tuning, or Nanite-style experiments, this gives you reusable preprocessing logic instead of one-off scripts.

This repository contains two parts: the reusable library in `src/` and a separate WebGPU demo app in `demo/`. Use the library in production code, and use the demo to inspect rendering behavior with the same model workflow.

## What you get

- A reusable three meshlet API for browser-based model processing.
- GLTFLoader setup with Draco and meshopt support.
- Meshlet payload generation with multiple LOD levels.
- Utilities to merge meshlet assets and build vertex/material textures.

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

For local development against your clone:

```bash
npm install /absolute/path/to/three-meshlet
```

## Typical workflow

1. Load one or more models (`.gltf` or `.glb`).
2. Build meshlet + LOD payloads.
3. Send that data into your renderer or export step.

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

## Meshlet output notes

`meshlets` includes data commonly needed for a meshlet renderer:

- `lods`: per-LOD ranges and error values.
- `meshletData`: packed meshlet metadata.
- `meshletStreamData` and `meshletDecodeData`: compressed meshlet decode payloads.
- `chunkBoundsData`: bounds used for culling.
- `totalChunks` and `maxMeshletsPerLod`: sizing information for runtime buffers.

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

Open:

- http://127.0.0.1:8787/

If port `8787` is in use:

```powershell
$env:PORT='8790'; npm run demo
```

Credit: Nanite-style renderer for threejs by @sea3dformat.
