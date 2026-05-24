const DEFAULT_ENTRY = new URL('../assets/demo-site/index.html', import.meta.url);

function toAbsoluteUrl(value) {
  if (!value) return DEFAULT_ENTRY.toString();
  try {
    return new URL(value, import.meta.url).toString();
  } catch {
    return DEFAULT_ENTRY.toString();
  }
}

export function getThreeMeshletsEntryUrl(entryUrl) {
  return toAbsoluteUrl(entryUrl);
}

export function createThreeMeshletsFrame(options = {}) {
  const {
    entryUrl,
    title = 'Three Meshlets',
    className = '',
    width = '100%',
    height = '100%',
    sandbox = 'allow-scripts allow-same-origin allow-downloads'
  } = options;

  const frame = document.createElement('iframe');
  frame.src = getThreeMeshletsEntryUrl(entryUrl);
  frame.title = title;
  frame.className = className;
  frame.style.width = typeof width === 'number' ? `${width}px` : width;
  frame.style.height = typeof height === 'number' ? `${height}px` : height;
  frame.style.border = '0';
  frame.style.display = 'block';
  frame.setAttribute('loading', 'eager');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.setAttribute('sandbox', sandbox);

  return frame;
}

export function mountThreeMeshlets(container, options = {}) {
  if (!container || typeof container.appendChild !== 'function') {
    throw new Error('mountThreeMeshlets(container): container must be a DOM element.');
  }

  const frame = createThreeMeshletsFrame(options);
  container.appendChild(frame);

  return {
    frame,
    destroy() {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }
  };
}
