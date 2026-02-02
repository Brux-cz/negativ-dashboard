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

/**
 * Get bounds centered exactly on the clicked point (no tile-snapping).
 * The rectangle spans gridSize tiles in width/height but is always
 * perfectly centered on the given center coordinate.
 */
export const getCenteredBounds = (center, tileZoom, gridSize) => {
  if (!center) return null;

  // Compute the geographic size of one tile at this zoom
  const t0 = tile2deg(0, 0, tileZoom);
  const t1 = tile2deg(1, 1, tileZoom);
  const tileW = t1.lon - t0.lon;
  const tileH = t0.lat - t1.lat; // lat decreases downward

  const halfW = (gridSize / 2) * tileW;
  const halfH = (gridSize / 2) * tileH;

  return [
    [center[0] + halfH, center[1] - halfW], // NW
    [center[0] - halfH, center[1] + halfW], // SE
  ];
};

/**
 * Get all tiles that intersect the given geographic bounds.
 * Returns tiles sorted top-left to bottom-right with their
 * grid position (gx, gy) for canvas placement.
 */
export const getTilesForBounds = (bounds, tileZoom) => {
  const [[nLat, wLon], [sLat, eLon]] = bounds;
  const nw = deg2tile(nLat, wLon, tileZoom);
  const se = deg2tile(sLat, eLon, tileZoom);

  const tiles = [];
  for (let y = nw.y; y <= se.y; y++) {
    for (let x = nw.x; x <= se.x; x++) {
      tiles.push({ x, y, gx: x - nw.x, gy: y - nw.y });
    }
  }

  return {
    tiles,
    cols: se.x - nw.x + 1,
    rows: se.y - nw.y + 1,
    originTile: nw, // top-left tile
  };
};
