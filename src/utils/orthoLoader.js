import { getTilesForBounds } from './tileUtils';
import { orthoSources } from './constants';

/**
 * Convert geographic bounds to pixel coordinates within a tile canvas.
 */
const boundsToPixels = (bounds, tileZoom, originTile, tileSize) => {
  const n = Math.pow(2, tileZoom);
  const toPixelX = (lon) => ((lon + 180) / 360 * n - originTile.x) * tileSize;
  const toPixelY = (lat) => (
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n - originTile.y
  ) * tileSize;

  return {
    x: Math.round(toPixelX(bounds[0][1])),
    y: Math.round(toPixelY(bounds[0][0])),
    x2: Math.round(toPixelX(bounds[1][1])),
    y2: Math.round(toPixelY(bounds[1][0])),
  };
};

/**
 * Load ortho satellite texture for given bounds.
 *
 * @param {Object} params
 * @param {[[number,number],[number,number]]} params.bounds - geographic bounds
 * @param {number} params.tileZoom - tile zoom level
 * @param {string} params.sourceId - 'google' or 'esri'
 * @param {number} [params.outputSize] - desired output size in pixels (null = native)
 * @param {(progress: number) => void} [params.onProgress] - 0-100
 * @returns {Promise<string>} data URL of the cropped texture (JPEG)
 */
export const loadOrthoTexture = async ({ bounds, tileZoom, sourceId, outputSize, onProgress }) => {
  const source = orthoSources.find(s => s.id === sourceId) || orthoSources[0];
  const { tiles, cols, rows, originTile } = getTilesForBounds(bounds, tileZoom);

  const tileSize = 256;
  const canvas = document.createElement('canvas');
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
  const ctx = canvas.getContext('2d');

  // Download tiles in batches
  const batchSize = 10;
  let loaded = 0;

  for (let i = 0; i < tiles.length; i += batchSize) {
    const batch = tiles.slice(i, i + batchSize);
    await Promise.all(batch.map(tile =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, tile.gx * tileSize, tile.gy * tileSize, tileSize, tileSize);
          resolve();
        };
        img.onerror = () => {
          ctx.fillStyle = '#e5e5e5';
          ctx.fillRect(tile.gx * tileSize, tile.gy * tileSize, tileSize, tileSize);
          resolve();
        };
        img.src = source.tileUrl(tileZoom, tile.x, tile.y);
      })
    ));
    loaded += batch.length;
    onProgress?.(Math.round((loaded / tiles.length) * 100));
  }

  // Crop to exact bounds
  const crop = boundsToPixels(bounds, tileZoom, originTile, tileSize);
  const cropW = crop.x2 - crop.x;
  const cropH = crop.y2 - crop.y;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outputSize || cropW;
  outCanvas.height = outputSize || cropH;
  outCanvas.getContext('2d').drawImage(
    canvas, crop.x, crop.y, cropW, cropH,
    0, 0, outCanvas.width, outCanvas.height
  );

  return outCanvas.toDataURL('image/jpeg', 0.9);
};
