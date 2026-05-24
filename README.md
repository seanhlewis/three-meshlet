# three-meshlet

`three-meshlet` is a ready-to-go Three.js meshlet library that embeds an offline Nanite-style WebGPU renderer demo in your app.

This repository includes the reusable JS API plus local demo assets, so you can clone, install, and run immediately.

## SEO Keywords

`three-meshlet`, `three meshlet`, `three.js meshlet library`, `threejs meshlet renderer`, `nanite-style renderer for threejs`, `webgpu meshlet demo`, `gltf mesh rendering`, `three.js LOD optimization`, `meshlet streaming`, `offline three.js renderer`

## Features

- Drop-in iframe embed for a meshlet renderer demo
- Ships with local/offline assets in `assets/demo-site/`
- ESM-first package (`type: module`)
- Simple API for mounting and cleanup

## Clone This Repository

```bash
git clone https://github.com/seanhlewis/three-meshlet.git
cd three-meshlet
```

## Install And Use In Your Project

Install directly from GitHub:

```bash
npm install github:seanhlewis/three-meshlet
```

Or install from a local clone:

```bash
npm install /path/to/three-meshlet
```

## Quick Usage

```html
<div id="meshlet-view" style="width:100%;height:70vh"></div>
<script type="module">
  import { mountThreeMeshlets } from 'three-meshlet';

  const container = document.getElementById('meshlet-view');
  const viewer = mountThreeMeshlets(container, {
    height: '70vh',
    title: 'Three Meshlet Viewer'
  });

  // Later:
  // viewer.destroy();
</script>
```

## API

### `mountThreeMeshlets(container, options?)`

Mounts the viewer iframe into a DOM element and returns:

- `frame`: iframe element
- `destroy()`: removes the iframe cleanly

### `createThreeMeshletsFrame(options?)`

Creates (but does not mount) an iframe element for manual placement.

### `getThreeMeshletsEntryUrl(entryUrl?)`

Resolves an absolute URL to the default local demo entry or a provided override.

## Options

Supported options for `mountThreeMeshlets` and `createThreeMeshletsFrame`:

- `entryUrl` (string)
- `title` (string, default: `Three Meshlets`)
- `className` (string)
- `width` (string or number, default: `100%`)
- `height` (string or number, default: `100%`)
- `sandbox` (string, iframe sandbox permissions)

## Project Structure

- `src/index.js`: package API entry
- `assets/demo-site/`: offline viewer assets and models
- `package.json`: package metadata and exports

## Requirements

- Modern browser with WebGPU support for best results
- Serve your host app over HTTP(S), not `file://`

## Troubleshooting

- Blank viewer: verify your browser supports WebGPU and the iframe is visible.
- Import issues: ensure your environment supports ESM and resolves package exports.
- Local install issues: delete `node_modules` and reinstall after pulling latest changes.

Credit: Nanite-style renderer for Three.js by @sea3dformat.
