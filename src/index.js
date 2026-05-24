import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptClusterizer } from './vendor/meshopt_clusterizer.module.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';
import { MeshoptSimplifier } from './vendor/meshopt_simplifier.module.js';

export const MESHLET_MAX_VERTICES = 64;
export const MESHLET_MAX_TRIANGLES = 64;
export const LOD_COUNT = 6;
export const MATERIAL_TEXTURE_SIZE = 1024;

export const DEFAULT_LOD_TARGETS = Object.freeze( [
  { ratio: 1.0, error: 0.0, weights: [ 0.25, 0.25, 0.25, 0.5, 0.5 ], flags: [] },
  { ratio: 0.55, error: 0.004, weights: [ 0.2, 0.2, 0.2, 0.35, 0.35 ], flags: [ 'RegularizeLight' ] },
  { ratio: 0.25, error: 0.015, weights: [ 0.12, 0.12, 0.12, 0.2, 0.2 ], flags: [ 'RegularizeLight' ] },
  { ratio: 0.1, error: 0.05, weights: [ 0.08, 0.08, 0.08, 0.12, 0.12 ], flags: [ 'RegularizeLight' ] },
  { ratio: 0.04, error: 0.14, weights: [ 0.04, 0.04, 0.04, 0.06, 0.06 ], flags: [ 'Regularize' ] },
  { ratio: 0.015, error: 0.3, weights: [ 0.02, 0.02, 0.02, 0.03, 0.03 ], flags: [ 'Regularize' ] }
] );

function inferNameFromUrl( value ) {

  try {

    const parsed = new URL( value, typeof window !== 'undefined' ? window.location.href : undefined );
    const segments = parsed.pathname.split( '/' ).filter( Boolean );
    const last = segments[ segments.length - 1 ] || 'Mesh';

    return last.replace( /\.[^.]+$/, '' ) || 'Mesh';

  } catch {

    return 'Mesh';

  }

}

function normalizeFlags( flags ) {

  return Array.isArray( flags ) ? flags : [];

}

function ensureSourceArray( sources ) {

  if ( ! Array.isArray( sources ) || sources.length === 0 ) {

    throw new Error( 'Expected at least one source model.' );

  }

}

export function getThreeMeshletDracoDecoderPath() {

  return new URL( '../assets/draco/gltf/', import.meta.url ).toString();

}

export function getThreeMeshletDemoUrl( path = 'index.html' ) {

  const normalized = path.replace( /^\/+/, '' );

  return new URL( `../demo/${ normalized }`, import.meta.url ).toString();

}

export function createThreeMeshletGLTFLoader( options = {} ) {

  const { dracoDecoderPath = getThreeMeshletDracoDecoderPath() } = options;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath( dracoDecoderPath );

  return new GLTFLoader()
    .setDRACOLoader( dracoLoader )
    .setMeshoptDecoder( MeshoptDecoder );

}

export async function loadSourceModelFromUrl( options ) {

  if ( ! options || ! options.url ) {

    throw new Error( 'loadSourceModelFromUrl(options): options.url is required.' );

  }

  const loader = createThreeMeshletGLTFLoader( options.loaderOptions );
  const gltf = await loader.loadAsync( options.url );
  const name = options.name || inferNameFromUrl( options.url );

  return extractSourceModel( name, gltf, options.materialId ?? 0 );

}

export async function loadSourceModelFromArrayBuffer( options ) {

  if ( ! options || ! options.buffer ) {

    throw new Error( 'loadSourceModelFromArrayBuffer(options): options.buffer is required.' );

  }

  const loader = createThreeMeshletGLTFLoader( options.loaderOptions );
  const gltf = await new Promise( ( resolve, reject ) => {

    loader.parse( options.buffer, '', resolve, reject );

  } );

  return extractSourceModel( options.name || 'Mesh', gltf, options.materialId ?? 0 );

}

export async function loadSourceModelsFromUrls( modelEntries, options = {} ) {

  if ( ! Array.isArray( modelEntries ) || modelEntries.length === 0 ) {

    throw new Error( 'loadSourceModelsFromUrls(modelEntries): at least one model entry is required.' );

  }

  const loaderOptions = options.loaderOptions || {};

  const sources = await Promise.all( modelEntries.map( ( entry, index ) => loadSourceModelFromUrl( {
    name: entry.name,
    url: entry.url,
    materialId: entry.materialId ?? index,
    loaderOptions
  } ) ) );

  assignSourceMaterialIds( sources );

  return sources;

}

export function assignSourceMaterialIds( sources ) {

  let materialBase = 0;

  for ( let i = 0; i < sources.length; i ++ ) {

    sources[ i ].materialBase = materialBase;
    materialBase += sources[ i ].materials.length;

  }

}

export function countSourceVertices( sources ) {

  let vertices = 0;
  for ( const source of sources ) vertices += source.positions.length / 3;

  return vertices;

}

export function mergeMeshletAssets( base, next, vertexBase ) {

  const meshletData = new Uint32Array( base.meshletData.length + next.meshletData.length );
  meshletData.set( base.meshletData );
  for ( let i = 0; i < next.meshletData.length / 4; i ++ ) {

    const dst = base.meshletData.length + i * 4;
    const src = i * 4;
    meshletData[ dst + 0 ] = next.meshletData[ src + 0 ] + base.meshletTopologyStats.decodedTopologyWords;
    meshletData[ dst + 1 ] = next.meshletData[ src + 1 ];
    meshletData[ dst + 2 ] = next.meshletData[ src + 2 ];
    meshletData[ dst + 3 ] = next.meshletData[ src + 3 ];

  }

  const meshletDecodeData = new Uint32Array( base.meshletDecodeData.length + next.meshletDecodeData.length );
  meshletDecodeData.set( base.meshletDecodeData );
  for ( let i = 0; i < next.meshletDecodeData.length / 4; i ++ ) {

    const dst = base.meshletDecodeData.length + i * 4;
    const src = i * 4;
    meshletDecodeData[ dst + 0 ] = next.meshletDecodeData[ src + 0 ] + base.meshletStreamData.length;
    meshletDecodeData[ dst + 1 ] = next.meshletDecodeData[ src + 1 ] + base.meshletTopologyStats.decodedTopologyWords;
    meshletDecodeData[ dst + 2 ] = next.meshletDecodeData[ src + 2 ];
    meshletDecodeData[ dst + 3 ] = next.meshletDecodeData[ src + 3 ] + vertexBase;

  }

  const meshletStreamData = new Uint8Array( base.meshletStreamData.length + next.meshletStreamData.length );
  meshletStreamData.set( base.meshletStreamData );
  meshletStreamData.set( next.meshletStreamData, base.meshletStreamData.length );
  const meshletStreamWords = new Uint32Array( meshletStreamData.buffer, meshletStreamData.byteOffset, meshletStreamData.byteLength / 4 ).slice();

  const chunkBoundsData = new Float32Array( base.chunkBoundsData.length + next.chunkBoundsData.length );
  chunkBoundsData.set( base.chunkBoundsData );
  chunkBoundsData.set( next.chunkBoundsData, base.chunkBoundsData.length );

  const lods = [
    ...base.lods,
    ...next.lods.map( ( lod ) => ( {
      triangleStart: lod.triangleStart + base.meshletTopologyStats.totalTriangles,
      numTriangles: lod.numTriangles,
      chunkStart: lod.chunkStart + base.totalChunks,
      numChunks: lod.numChunks,
      error: lod.error
    } ) )
  ];

  const lodOffsetsData = new Uint32Array( lods.length * 4 );
  const lodErrorData = new Float32Array( lods.length );
  for ( let i = 0; i < lods.length; i ++ ) {

    const lod = lods[ i ];
    lodOffsetsData.set( [ lod.triangleStart, lod.numTriangles, lod.chunkStart, lod.numChunks ], i * 4 );
    lodErrorData[ i ] = lod.error;

  }

  return {
    lods,
    meshletData,
    meshletStreamWords,
    meshletStreamData,
    meshletDecodeData,
    chunkBoundsData,
    lodOffsetsData,
    lodErrorData,
    totalChunks: base.totalChunks + next.totalChunks,
    maxMeshletsPerLod: Math.max( base.maxMeshletsPerLod, next.maxMeshletsPerLod ),
    meshletTopologyStats: {
      sourceCount: base.meshletTopologyStats.sourceCount + next.meshletTopologyStats.sourceCount,
      lodCount: LOD_COUNT,
      totalTriangles: base.meshletTopologyStats.totalTriangles + next.meshletTopologyStats.totalTriangles,
      encodedBytes: meshletStreamData.length,
      decodedTopologyWords: base.meshletTopologyStats.decodedTopologyWords + next.meshletTopologyStats.decodedTopologyWords
    }
  };

}

export function extractSourceModel( name, gltf, materialId ) {

  const positionList = [];
  const normalList = [];
  const colorList = [];
  const uvList = [];
  const indexList = [];
  const primitives = [];
  const materials = [];
  const materialMap = new Map();
  let vertexOffset = 0;

  const defaultMaterial = new THREE.MeshStandardMaterial();
  const tempPosition = new THREE.Vector3();
  const tempNormal = new THREE.Vector3();
  const tempSkinnedNormal = new THREE.Vector4();
  const normalMatrix = new THREE.Matrix3();

  const getMaterialId = ( material ) => {

    material = material || defaultMaterial;

    let id = materialMap.get( material );
    if ( id === undefined ) {

      id = materials.length;
      materials.push( material );
      materialMap.set( material, id );

    }

    return id;

  };

  gltf.scene.updateMatrixWorld( true );
  gltf.scene.traverse( ( child ) => {

    if ( ! child.isMesh ) return;

    if ( child.isSkinnedMesh ) child.skeleton.update();

    const geometry = child.geometry;
    const materialsForMesh = Array.isArray( child.material ) ? child.material : [ child.material ];
    if ( geometry.getAttribute( 'normal' ) === undefined ) geometry.computeVertexNormals();
    normalMatrix.getNormalMatrix( child.matrixWorld );

    const position = geometry.getAttribute( 'position' );
    const normal = geometry.getAttribute( 'normal' );
    const color = geometry.getAttribute( 'color' );
    const uv = geometry.getAttribute( 'uv' );
    const indices = getGeometryIndices( geometry );

    for ( let i = 0; i < position.count; i ++ ) {

      tempPosition.fromBufferAttribute( position, i );
      if ( child.isSkinnedMesh ) child.applyBoneTransform( i, tempPosition );
      tempPosition.applyMatrix4( child.matrixWorld );
      positionList.push( tempPosition.x, tempPosition.y, tempPosition.z );

      if ( normal ) {

        tempNormal.fromBufferAttribute( normal, i );

        if ( child.isSkinnedMesh ) {

          tempSkinnedNormal.set( tempNormal.x, tempNormal.y, tempNormal.z, 0 );
          child.applyBoneTransform( i, tempSkinnedNormal );
          tempNormal.set( tempSkinnedNormal.x, tempSkinnedNormal.y, tempSkinnedNormal.z );

        }

        tempNormal.applyMatrix3( normalMatrix ).normalize();
        normalList.push( tempNormal.x, tempNormal.y, tempNormal.z );

      } else {

        normalList.push( 0, 1, 0 );

      }

      if ( color ) {

        colorList.push(
          color.getX( i ),
          color.getY( i ),
          color.getZ( i ),
          color.itemSize >= 4 ? color.getW( i ) : 1
        );

      } else {

        colorList.push( 1, 1, 1, 1 );

      }

      if ( uv ) {

        uvList.push( uv.getX( i ), uv.getY( i ) );

      } else {

        uvList.push( 0, 0 );

      }

    }

    const groups = geometry.groups.length > 0 ? geometry.groups : [ { start: 0, count: indices.length, materialIndex: 0 } ];

    for ( const group of groups ) {

      const groupIndices = [];
      const end = Math.min( group.start + group.count, indices.length );

      for ( let i = group.start; i < end; i ++ ) {

        const index = indices[ i ] + vertexOffset;
        groupIndices.push( index );
        indexList.push( index );

      }

      if ( groupIndices.length >= 3 ) {

        primitives.push( {
          indices: new Uint32Array( groupIndices ),
          materialId: getMaterialId( materialsForMesh[ group.materialIndex ] )
        } );

      }

    }

    vertexOffset += position.count;

  } );

  if ( positionList.length === 0 ) {

    throw new Error( `${ name } did not contain a mesh.` );

  }

  const positions = new Float32Array( positionList );
  normalizePositions( positions );
  const bounds = computePositionBounds( positions );

  return {
    name,
    materialId,
    materialBase: 0,
    materials,
    primitives,
    bounds,
    positions,
    normals: new Float32Array( normalList ),
    colors: new Float32Array( colorList ),
    uvs: new Float32Array( uvList ),
    indices: new Uint32Array( indexList )
  };

}

export function createMaterialTextureArray( materials, channel, colorSpace = THREE.NoColorSpace ) {

  if ( typeof document === 'undefined' ) {

    throw new Error( 'createMaterialTextureArray requires a browser environment with document/canvas support.' );

  }

  const layerCount = Math.max( materials.length, 1 );
  const size = chooseMaterialTextureSize( materials, channel );
  const layerBytes = size * size * 4;
  const data = new Uint8Array( layerBytes * layerCount );
  const canvas = document.createElement( 'canvas' );
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext( '2d', { willReadFrequently: true } );

  if ( ! context ) {

    throw new Error( 'Could not create 2D canvas context for material texture extraction.' );

  }

  for ( let i = 0; i < layerCount; i ++ ) {

    const layer = buildMaterialTextureLayer( context, size, materials[ i ], channel );
    data.set( layer, i * layerBytes );

  }

  const map = new THREE.DataArrayTexture( data, size, size, layerCount );
  map.colorSpace = colorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;

  return map;

}

function chooseMaterialTextureSize( materials, channel ) {

  let size = 1;

  for ( const material of materials ) {

    const image = getMaterialTexture( material, channel )?.image;
    if ( image && image.width && image.height ) size = Math.max( size, image.width, image.height );

  }

  return Math.min( MATERIAL_TEXTURE_SIZE, THREE.MathUtils.ceilPowerOfTwo( size ) );

}

function buildMaterialTextureLayer( context, size, material, channel ) {

  const map = getMaterialTexture( material, channel );
  const fallback = getMaterialFallbackColor( material, channel );

  context.clearRect( 0, 0, size, size );

  if ( map && map.image && map.image.width && map.image.height ) {

    context.drawImage( map.image, 0, 0, size, size );

  } else {

    context.fillStyle = `rgba(${ fallback[ 0 ] }, ${ fallback[ 1 ] }, ${ fallback[ 2 ] }, ${ fallback[ 3 ] / 255 })`;
    context.fillRect( 0, 0, size, size );

  }

  const imageData = context.getImageData( 0, 0, size, size );
  const data = imageData.data;
  applyMaterialFactors( data, material, channel, Boolean( map ) );

  return data;

}

function getMaterialTexture( material, channel ) {

  if ( channel === 'baseColor' ) return material?.map || null;
  if ( channel === 'metalRoughness' ) return material?.metalnessMap || material?.roughnessMap || null;
  if ( channel === 'normal' ) return material?.normalMap || null;
  if ( channel === 'ao' ) return material?.aoMap || null;
  if ( channel === 'emissive' ) return material?.emissiveMap || null;

  return null;

}

function getMaterialFallbackColor( material, channel ) {

  if ( channel === 'baseColor' ) {

    const color = material?.color || new THREE.Color( 1, 1, 1 );

    return [ color.r * 255, color.g * 255, color.b * 255, ( material?.opacity ?? 1 ) * 255 ];

  }

  if ( channel === 'metalRoughness' ) return [ 0, ( material?.roughness ?? 1 ) * 255, ( material?.metalness ?? 0 ) * 255, 255 ];
  if ( channel === 'normal' ) return [ 128, 128, 255, 255 ];
  if ( channel === 'ao' ) return [ 255, 255, 255, 255 ];

  const emissive = material?.emissive || new THREE.Color( 0, 0, 0 );
  const intensity = material?.emissiveIntensity ?? 1;

  return [
    Math.min( emissive.r * intensity * 255, 255 ),
    Math.min( emissive.g * intensity * 255, 255 ),
    Math.min( emissive.b * intensity * 255, 255 ),
    255
  ];

}

function applyMaterialFactors( data, material, channel, hasTexture ) {

  if ( channel === 'baseColor' ) {

    const color = material?.color || new THREE.Color( 1, 1, 1 );
    const opacity = material?.opacity ?? 1;
    if ( hasTexture ) multiplyTextureChannels( data, color.r, color.g, color.b, opacity );

  } else if ( channel === 'metalRoughness' ) {

    const roughness = hasTexture ? material?.roughness ?? 1 : 1;
    const metalness = hasTexture ? material?.metalness ?? 1 : 1;

    for ( let i = 0; i < data.length; i += 4 ) {

      data[ i + 1 ] = Math.min( data[ i + 1 ] * roughness, 255 );
      data[ i + 2 ] = Math.min( data[ i + 2 ] * metalness, 255 );

    }

  } else if ( channel === 'emissive' ) {

    const color = material?.emissive || new THREE.Color( 1, 1, 1 );
    const intensity = material?.emissiveIntensity ?? 1;
    if ( hasTexture ) multiplyTextureChannels( data, color.r * intensity, color.g * intensity, color.b * intensity, 1 );

  }

}

function multiplyTextureChannels( data, r, g, b, a ) {

  for ( let i = 0; i < data.length; i += 4 ) {

    data[ i + 0 ] = Math.min( data[ i + 0 ] * r, 255 );
    data[ i + 1 ] = Math.min( data[ i + 1 ] * g, 255 );
    data[ i + 2 ] = Math.min( data[ i + 2 ] * b, 255 );
    data[ i + 3 ] = Math.min( data[ i + 3 ] * a, 255 );

  }

}

function normalizePositions( positions ) {

  let minX = positions[ 0 ];
  let minY = positions[ 1 ];
  let minZ = positions[ 2 ];
  let maxX = positions[ 0 ];
  let maxY = positions[ 1 ];
  let maxZ = positions[ 2 ];

  for ( let i = 0; i < positions.length / 3; i ++ ) {

    const x = positions[ i * 3 + 0 ];
    const y = positions[ i * 3 + 1 ];
    const z = positions[ i * 3 + 2 ];

    minX = Math.min( minX, x );
    minY = Math.min( minY, y );
    minZ = Math.min( minZ, z );
    maxX = Math.max( maxX, x );
    maxY = Math.max( maxY, y );
    maxZ = Math.max( maxZ, z );

  }

  const centerX = ( minX + maxX ) * 0.5;
  const centerY = ( minY + maxY ) * 0.5;
  const centerZ = ( minZ + maxZ ) * 0.5;
  let radius = 0;

  for ( let i = 0; i < positions.length / 3; i ++ ) {

    const x = positions[ i * 3 + 0 ] - centerX;
    const y = positions[ i * 3 + 1 ] - centerY;
    const z = positions[ i * 3 + 2 ] - centerZ;

    radius = Math.max( radius, Math.sqrt( x * x + y * y + z * z ) );

  }

  const scale = radius > 0 ? 2.0 / radius : 1.0;

  for ( let i = 0; i < positions.length / 3; i ++ ) {

    positions[ i * 3 + 0 ] = ( positions[ i * 3 + 0 ] - centerX ) * scale;
    positions[ i * 3 + 1 ] = ( positions[ i * 3 + 1 ] - centerY ) * scale;
    positions[ i * 3 + 2 ] = ( positions[ i * 3 + 2 ] - centerZ ) * scale;

  }

}

function computePositionBounds( positions ) {

  const min = new THREE.Vector3( Infinity, Infinity, Infinity );
  const max = new THREE.Vector3( - Infinity, - Infinity, - Infinity );
  const point = new THREE.Vector3();

  for ( let i = 0; i < positions.length / 3; i ++ ) {

    point.set(
      positions[ i * 3 + 0 ],
      positions[ i * 3 + 1 ],
      positions[ i * 3 + 2 ]
    );

    min.min( point );
    max.max( point );

  }

  const center = min.clone().add( max ).multiplyScalar( 0.5 );
  const size = max.clone().sub( min );
  const radius = size.length() * 0.5;

  return { center, size, radius };

}

function getGeometryIndices( geometry ) {

  if ( geometry.index ) {

    return new Uint32Array( geometry.index.array );

  }

  const position = geometry.getAttribute( 'position' );
  const indices = new Uint32Array( position.count );

  for ( let i = 0; i < indices.length; i ++ ) {

    indices[ i ] = i;

  }

  return indices;

}

export function buildVertexGeometry( sources ) {

  const vertexList = [];
  const normalList = [];
  const colorList = [];
  const uvList = [];
  const materials = sources.flatMap( ( source ) => source.materials );
  const textureMaps = createMaterialTextureArray( materials, 'baseColor', THREE.SRGBColorSpace );
  const metalRoughnessMap = createMaterialTextureArray( materials, 'metalRoughness' );
  const normalMap = createMaterialTextureArray( materials, 'normal' );
  const aoMap = createMaterialTextureArray( materials, 'ao' );
  const emissiveMap = createMaterialTextureArray( materials, 'emissive', THREE.SRGBColorSpace );

  for ( const source of sources ) {

    const vertexCount = source.positions.length / 3;

    for ( let i = 0; i < vertexCount; i ++ ) {

      vertexList.push(
        source.positions[ i * 3 + 0 ],
        source.positions[ i * 3 + 1 ],
        source.positions[ i * 3 + 2 ],
        1.0
      );

      if ( source.normals ) {

        normalList.push(
          source.normals[ i * 3 + 0 ],
          source.normals[ i * 3 + 1 ],
          source.normals[ i * 3 + 2 ],
          0.0
        );

      } else {

        normalList.push( 0, 1, 0, 0 );

      }

      if ( source.colors ) {

        colorList.push(
          source.colors[ i * 4 + 0 ],
          source.colors[ i * 4 + 1 ],
          source.colors[ i * 4 + 2 ],
          source.colors[ i * 4 + 3 ]
        );

      } else {

        colorList.push( 1, 1, 1, 1 );

      }

      uvList.push( source.uvs[ i * 2 + 0 ], source.uvs[ i * 2 + 1 ] );

    }

  }

  return {
    textureMaps,
    metalRoughnessMap,
    normalMap,
    aoMap,
    emissiveMap,
    vertexArray: new Float32Array( vertexList ),
    normalArray: new Float32Array( normalList ),
    colorArray: new Float32Array( colorList ),
    uvArray: new Float32Array( uvList ),
    totalVertices: vertexList.length / 4
  };

}

export async function buildThreeMeshletAsset( sources, options = {} ) {

  ensureSourceArray( sources );

  await Promise.all( [ MeshoptClusterizer.ready, MeshoptSimplifier.ready ] );

  const lodTargets = options.lodTargets || DEFAULT_LOD_TARGETS;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

  const lods = [];
  const lodOffsetsList = [];
  const lodErrorList = [];
  const meshletDataList = [];
  const meshletDecodeDataList = [];
  const chunkBoundsList = [];
  const meshletStreamList = [];

  let topologyWords = 0;
  let totalTriangles = 0;
  let totalChunks = 0;
  let totalVertices = 0;
  let maxMeshletsPerLod = 0;
  let completedLods = 0;
  const totalLods = sources.length * lodTargets.length;
  const reportProgress = async ( source, message, progress ) => {

    if ( onProgress ) await onProgress( `${ source.name }: ${ message }`, Math.min( ( completedLods + progress ) / Math.max( totalLods, 1 ), 1 ) );

  };

  for ( const source of sources ) {

    const vertexCount = source.positions.length / 3;
    const vertexBase = totalVertices;
    const sourceScale = MeshoptSimplifier.getScale( source.positions, 3 );
    const simplifierAttributes = buildSimplifierAttributes( source, vertexCount );
    let previousLodError = 0;

    for ( let i = 0; i < lodTargets.length; i ++ ) {

      const target = lodTargets[ i ];
      let error = 0;

      await reportProgress( source, `preparing LOD ${ i + 1 }/${ lodTargets.length }`, 0.05 );
      await reportProgress( source, `building meshlets for LOD ${ i + 1 }/${ lodTargets.length }`, 0.35 );

      const lod = {
        triangleStart: totalTriangles,
        numTriangles: 0,
        chunkStart: totalChunks,
        numChunks: 0,
        error
      };

      for ( let p = 0; p < source.primitives.length; p ++ ) {

        const primitive = source.primitives[ p ];
        let indices = primitive.indices;

        if ( i > 0 ) {

          const targetIndexCount = Math.max( 3, Math.floor( primitive.indices.length * target.ratio / 3 ) * 3 );
          const simplified = MeshoptSimplifier.simplifyWithAttributes(
            primitive.indices,
            source.positions,
            3,
            simplifierAttributes.data,
            simplifierAttributes.stride,
            target.weights,
            null,
            targetIndexCount,
            target.error,
            normalizeFlags( target.flags )
          );

          if ( simplified[ 0 ].length >= 3 ) {

            indices = simplified[ 0 ];
            error = Math.max( error, simplified[ 1 ] * sourceScale );

          }

        }

        const meshletBuffers = MeshoptClusterizer.buildMeshlets(
          indices,
          source.positions,
          3,
          MESHLET_MAX_VERTICES,
          MESHLET_MAX_TRIANGLES,
          0.25
        );
        const bounds = MeshoptClusterizer.computeMeshletBounds( meshletBuffers, source.positions, 3 );

        await reportProgress( source, `compressing LOD ${ i + 1 }/${ lodTargets.length }, part ${ p + 1 }/${ source.primitives.length }`, 0.55 );

        for ( let m = 0; m < meshletBuffers.meshletCount; m ++ ) {

          if ( m % 16 === 0 ) {

            await reportProgress( source, `compressing part ${ p + 1 }/${ source.primitives.length } meshlet ${ m + 1 }/${ meshletBuffers.meshletCount } for LOD ${ i + 1 }/${ lodTargets.length }`, 0.55 + 0.4 * ( ( p + m / Math.max( meshletBuffers.meshletCount, 1 ) ) / source.primitives.length ) );

          }

          const meshlet = MeshoptClusterizer.extractMeshlet( meshletBuffers, m );
          const meshletVertexCount = meshlet.vertices.length;
          const triangleCount = meshlet.triangles.length / 3;
          const outputOffset = topologyWords;
          const encodedMeshlet = MeshoptClusterizer.encodeMeshlet( meshlet.vertices, meshlet.triangles, 3 );

          while ( meshletStreamList.length % 4 !== 0 ) {

            meshletStreamList.push( 0 );

          }

          const streamOffset = meshletStreamList.length;
          for ( let e = 0; e < encodedMeshlet.length; e ++ ) meshletStreamList.push( encodedMeshlet[ e ] );

          meshletDataList.push( outputOffset, triangleCount | ( meshletVertexCount << 8 ), source.materialBase + primitive.materialId, 0 );
          meshletDecodeDataList.push(
            streamOffset,
            outputOffset,
            encodedMeshlet.length | ( meshletVertexCount << 16 ) | ( triangleCount << 24 ),
            vertexBase
          );

          chunkBoundsList.push( bounds[ m ].centerX, bounds[ m ].centerY, bounds[ m ].centerZ, bounds[ m ].radius );

          topologyWords += meshletVertexCount + triangleCount;
          totalTriangles += triangleCount;
          totalChunks ++;
          lod.numTriangles += triangleCount;
          lod.numChunks ++;

        }

      }

      if ( i > 0 ) error = Math.max( error, previousLodError * 1.05 );
      lod.error = error;

      maxMeshletsPerLod = Math.max( maxMeshletsPerLod, lod.numChunks );
      lods.push( lod );
      lodOffsetsList.push( lod.triangleStart, lod.numTriangles, lod.chunkStart, lod.numChunks );
      lodErrorList.push( lod.error );
      previousLodError = lod.error;
      completedLods ++;
      await reportProgress( source, `finished LOD ${ i + 1 }/${ lodTargets.length }`, 0.0 );

    }

    totalVertices += vertexCount;

  }

  while ( meshletStreamList.length % 4 !== 0 ) meshletStreamList.push( 0 );

  const meshletStreamData = new Uint8Array( meshletStreamList );
  const meshletStreamWords = new Uint32Array( meshletStreamData.buffer, meshletStreamData.byteOffset, meshletStreamData.byteLength / 4 ).slice();

  return {
    lods,
    meshletData: new Uint32Array( meshletDataList ),
    meshletStreamWords,
    meshletStreamData,
    meshletDecodeData: new Uint32Array( meshletDecodeDataList ),
    chunkBoundsData: new Float32Array( chunkBoundsList ),
    lodOffsetsData: new Uint32Array( lodOffsetsList ),
    lodErrorData: new Float32Array( lodErrorList ),
    totalChunks,
    maxMeshletsPerLod,
    meshletTopologyStats: {
      sourceCount: sources.length,
      lodCount: lodTargets.length,
      totalTriangles,
      encodedBytes: meshletStreamData.length,
      decodedTopologyWords: topologyWords
    }
  };

}

export async function buildThreeMeshletAssetFromUrls( modelEntries, options = {} ) {

  const sources = await loadSourceModelsFromUrls( modelEntries, { loaderOptions: options.loaderOptions } );

  return {
    sources,
    meshlets: await buildThreeMeshletAsset( sources, options )
  };

}

export async function buildThreeMeshletAssetFromArrayBuffers( modelEntries, options = {} ) {

  if ( ! Array.isArray( modelEntries ) || modelEntries.length === 0 ) {

    throw new Error( 'buildThreeMeshletAssetFromArrayBuffers(modelEntries): at least one model entry is required.' );

  }

  const sources = await Promise.all( modelEntries.map( ( entry, index ) => loadSourceModelFromArrayBuffer( {
    name: entry.name,
    buffer: entry.buffer,
    materialId: entry.materialId ?? index,
    loaderOptions: options.loaderOptions
  } ) ) );

  assignSourceMaterialIds( sources );

  return {
    sources,
    meshlets: await buildThreeMeshletAsset( sources, options )
  };

}

function buildSimplifierAttributes( source, vertexCount ) {

  const stride = 5;
  const data = new Float32Array( vertexCount * stride );

  for ( let i = 0; i < vertexCount; i ++ ) {

    data[ i * stride + 0 ] = source.normals[ i * 3 + 0 ];
    data[ i * stride + 1 ] = source.normals[ i * 3 + 1 ];
    data[ i * stride + 2 ] = source.normals[ i * 3 + 2 ];
    data[ i * stride + 3 ] = source.uvs[ i * 2 + 0 ];
    data[ i * stride + 4 ] = source.uvs[ i * 2 + 1 ];

  }

  return {
    data,
    stride,
    weights: [ 0.25, 0.25, 0.25, 0.5, 0.5 ]
  };

}

export default {
  DEFAULT_LOD_TARGETS,
  LOD_COUNT,
  MESHLET_MAX_TRIANGLES,
  MESHLET_MAX_VERTICES,
  MATERIAL_TEXTURE_SIZE,
  assignSourceMaterialIds,
  buildThreeMeshletAsset,
  buildThreeMeshletAssetFromArrayBuffers,
  buildThreeMeshletAssetFromUrls,
  buildVertexGeometry,
  countSourceVertices,
  createMaterialTextureArray,
  createThreeMeshletGLTFLoader,
  extractSourceModel,
  getThreeMeshletDemoUrl,
  getThreeMeshletDracoDecoderPath,
  loadSourceModelFromArrayBuffer,
  loadSourceModelFromUrl,
  loadSourceModelsFromUrls,
  mergeMeshletAssets
};
