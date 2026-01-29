// Tile math utilities for map coordinate conversions

/**
 * Convert latitude/longitude to tile coordinates
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {number} zoom - Zoom level
 * @returns {{x: number, y: number}} Tile coordinates
 */
export const deg2tile = (lat, lon, zoom) => {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y };
};

/**
 * Convert tile coordinates to latitude/longitude
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {number} zoom - Zoom level
 * @returns {{lat: number, lon: number}} Geographic coordinates
 */
export const tile2deg = (x, y, zoom) => {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
  const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const lon = x / Math.pow(2, zoom) * 360 - 180;
  return { lat, lon };
};

/**
 * Get tile bounds for crop rectangle
 * @param {[number, number]} center - Center coordinates [lat, lon]
 * @param {number} tileZoom - Tile zoom level
 * @param {number} gridSize - Grid size (number of tiles)
 * @returns {[[number, number], [number, number]] | null} Bounds or null
 */
export const getTileBounds = (center, tileZoom, gridSize) => {
  if (!center) return null;
  const centerTile = deg2tile(center[0], center[1], tileZoom);
  const halfGrid = Math.floor(gridSize / 2);

  const topLeft = tile2deg(centerTile.x - halfGrid, centerTile.y - halfGrid, tileZoom);
  const bottomRight = tile2deg(centerTile.x + halfGrid + 1, centerTile.y + halfGrid + 1, tileZoom);

  return [[topLeft.lat, topLeft.lon], [bottomRight.lat, bottomRight.lon]];
};
