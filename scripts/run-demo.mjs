import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );
const demoRoot = path.resolve( __dirname, '..', 'demo' );
const port = Number.parseInt( process.env.PORT || '8787', 10 );

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function sendError( res, status, message ) {

  res.writeHead( status, { 'Content-Type': 'text/plain; charset=utf-8' } );
  res.end( message );

}

function normalizeRequestPath( urlPath ) {

  const decoded = decodeURIComponent( urlPath.split( '?' )[ 0 ] );
  const clean = decoded === '/' ? '/index.html' : decoded;

  return clean;

}

const server = http.createServer( async ( req, res ) => {

  const requestPath = normalizeRequestPath( req.url || '/' );
  const absolutePath = path.resolve( demoRoot, `.${ requestPath }` );

  if ( ! absolutePath.startsWith( demoRoot ) ) {

    sendError( res, 403, 'Forbidden' );
    return;

  }

  try {

    const stat = await fs.stat( absolutePath );

    if ( stat.isDirectory() ) {

      const indexPath = path.join( absolutePath, 'index.html' );
      const indexStat = await fs.stat( indexPath );

      if ( ! indexStat.isFile() ) {

        sendError( res, 404, 'Not Found' );
        return;

      }

      res.writeHead( 200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      } );
      createReadStream( indexPath ).pipe( res );
      return;

    }

    const extension = path.extname( absolutePath ).toLowerCase();
    const contentType = MIME_TYPES[ extension ] || 'application/octet-stream';

    res.writeHead( 200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    } );
    createReadStream( absolutePath ).pipe( res );

  } catch ( error ) {

    if ( error && error.code === 'ENOENT' ) {

      sendError( res, 404, 'Not Found' );
      return;

    }

    console.error( error );
    sendError( res, 500, 'Internal Server Error' );

  }

} );

server.listen( port, () => {

  console.log( `three-meshlet demo server running: http://127.0.0.1:${ port }/` );
  console.log( `Serving files from: ${ demoRoot }` );

} );

server.on( 'error', ( error ) => {

  if ( error && error.code === 'EADDRINUSE' ) {

    console.error( `Port ${ port } is already in use. Set a different port, for example: PORT=8790 npm run demo` );
    process.exit( 1 );

  }

  console.error( error );
  process.exit( 1 );

} );
