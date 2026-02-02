import { getCenteredBounds, getTilesForBounds } from './tileUtils';
import { getDistanceMeters } from './geoUtils';
import { elevationSource } from './constants';

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
 * Load terrain elevation data for a given center point.
 *
 * @param {Object} params
 * @param {[number,number]} params.center - [lat, lon]
 * @param {number} params.tileZoom - elevation tile zoom (10-14)
 * @param {number} params.gridSize - grid size in tiles (1-4)
 * @param {number} params.meshResolution - output grid size (128/256/512)
 * @param {(progress: number) => void} [params.onProgress] - 0-100
 * @returns {Promise<TerrainData>}
 *
 * @typedef {Object} TerrainData
 * @property {Float32Array} heightData - normalized heights (min subtracted)
 * @property {number} resolution - meshResolution
 * @property {[[number,number],[number,number]]} bounds - geographic bounds
 * @property {number} realWidth - meters
 * @property {number} realHeight - meters
 * @property {number} minHeight - original minimum elevation
 * @property {number} maxHeight - original maximum elevation
 */
export const loadTerrain = async ({ center, tileZoom, gridSize, meshResolution, onProgress }) => {
  const bounds = getCenteredBounds(center, tileZoom, gridSize);
  const { tiles, cols, rows, originTile } = getTilesForBounds(bounds, tileZoom);

  const tileSize = 256;
  const canvas = document.createElement('canvas');
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Download elevation tiles
  let loaded = 0;
  for (const tile of tiles) {
    await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, tile.gx * tileSize, tile.gy * tileSize, tileSize, tileSize);
        resolve();
      };
      img.onerror = () => {
        ctx.fillStyle = '#808080';
        ctx.fillRect(tile.gx * tileSize, tile.gy * tileSize, tileSize, tileSize);
        resolve();
      };
      img.src = elevationSource.tileUrl(tileZoom, tile.x, tile.y);
    });
    loaded++;
    onProgress?.(Math.round((loaded / tiles.length) * 60));
  }

  // Crop to exact bounds
  const crop = boundsToPixels(bounds, tileZoom, originTile, tileSize);
  const cropW = crop.x2 - crop.x;
  const cropH = crop.y2 - crop.y;
  const imageData = ctx.getImageData(crop.x, crop.y, cropW, cropH);

  // Resample to mesh resolution
  const outputSize = meshResolution;
  const heightData = new Float32Array(outputSize * outputSize);
  const scaleX = cropW / outputSize;
  const scaleY = cropH / outputSize;

  let minHeight = Infinity;
  let maxHeight = -Infinity;

  for (let y = 0; y < outputSize; y++) {
    for (let x = 0; x < outputSize; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const idx = (srcY * cropW + srcX) * 4;

      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const h = elevationSource.decodeHeight(r, g, b);

      heightData[y * outputSize + x] = h;
      minHeight = Math.min(minHeight, h);
      maxHeight = Math.max(maxHeight, h);
    }
    onProgress?.(60 + Math.round((y / outputSize) * 30));
  }

  // Normalize (subtract min)
  for (let i = 0; i < heightData.length; i++) {
    heightData[i] -= minHeight;
  }

  const [[lat1, lon1], [lat2, lon2]] = bounds;
  const realWidth = getDistanceMeters(lat1, lon1, lat1, lon2);
  const realHeight = getDistanceMeters(lat1, lon1, lat2, lon1);

  onProgress?.(95);

  return {
    heightData,
    resolution: outputSize,
    bounds,
    realWidth,
    realHeight,
    minHeight,
    maxHeight,
  };
};
