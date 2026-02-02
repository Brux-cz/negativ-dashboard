import earcut from 'earcut';
import { getDistanceMeters } from './geoUtils';

/**
 * Convert lat/lon to local meters relative to the NW corner of bounds.
 */
const latLonToLocal = (lat, lon, bounds, realWidth, realHeight) => {
  const [[nLat, wLon], [sLat, eLon]] = bounds;
  const x = (lon - wLon) / (eLon - wLon) * realWidth;
  const y = (lat - nLat) / (sLat - nLat) * realHeight;
  return [x, y];
};

/**
 * Sample terrain height at a local (x, y) position from the height grid.
 */
const sampleHeight = (x, y, heightData, resolution, realWidth, realHeight, verticalScale) => {
  const col = Math.min(resolution - 1, Math.max(0, Math.floor(x / realWidth * (resolution - 1))));
  const row = Math.min(resolution - 1, Math.max(0, Math.floor(y / realHeight * (resolution - 1))));
  return heightData[row * resolution + col] * verticalScale;
};

/**
 * Generate merged 3D geometry for all buildings.
 *
 * @param {Building[]} buildings - from osmLoader
 * @param {TerrainData} terrain - from terrainLoader
 * @param {number} verticalScale - terrain vertical scale
 * @returns {{ positions: Float32Array, indices: Uint32Array, normals: Float32Array }}
 */
export const generateBuildingMeshData = (buildings, terrain, verticalScale = 1) => {
  const { heightData, resolution, bounds, realWidth, realHeight } = terrain;

  const allPositions = [];
  const allIndices = [];
  const allNormals = [];
  let vertexOffset = 0;

  for (const building of buildings) {
    // Convert polygon to local coordinates
    const localPoly = building.polygon.map(([lat, lon]) =>
      latLonToLocal(lat, lon, bounds, realWidth, realHeight)
    );

    // Check if building is within bounds
    const inBounds = localPoly.some(([x, y]) =>
      x >= 0 && x <= realWidth && y >= 0 && y <= realHeight
    );
    if (!inBounds) continue;

    // Average terrain height under building footprint
    let avgTerrainH = 0;
    for (const [x, y] of localPoly) {
      avgTerrainH += sampleHeight(x, y, heightData, resolution, realWidth, realHeight, verticalScale);
    }
    avgTerrainH /= localPoly.length;

    // Building height is relative to terrain, not absolute
    const baseZ = avgTerrainH + building.minHeight;
    const topZ = baseZ + (building.height - building.minHeight);

    // Triangulate the polygon for top/bottom caps
    const flatCoords = [];
    for (const [x, y] of localPoly) {
      flatCoords.push(x, y);
    }
    const triIndices = earcut(flatCoords);
    if (triIndices.length === 0) continue;

    const n = localPoly.length;

    // --- Top face ---
    const topStart = vertexOffset;
    for (const [x, y] of localPoly) {
      allPositions.push(x, y, topZ);
      allNormals.push(0, 0, 1);
    }
    for (const idx of triIndices) {
      allIndices.push(topStart + idx);
    }
    vertexOffset += n;

    // --- Bottom face ---
    const bottomStart = vertexOffset;
    for (const [x, y] of localPoly) {
      allPositions.push(x, y, baseZ);
      allNormals.push(0, 0, -1);
    }
    for (let i = triIndices.length - 1; i >= 0; i--) {
      allIndices.push(bottomStart + triIndices[i]);
    }
    vertexOffset += n;

    // --- Side walls ---
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [x0, y0] = localPoly[i];
      const [x1, y1] = localPoly[j];

      // Wall normal (pointing outward)
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len;
      const ny = dx / len;

      const wallStart = vertexOffset;
      // 4 vertices per wall quad
      allPositions.push(x0, y0, baseZ);  allNormals.push(nx, ny, 0);
      allPositions.push(x1, y1, baseZ);  allNormals.push(nx, ny, 0);
      allPositions.push(x1, y1, topZ);   allNormals.push(nx, ny, 0);
      allPositions.push(x0, y0, topZ);   allNormals.push(nx, ny, 0);

      // Two triangles
      allIndices.push(wallStart, wallStart + 1, wallStart + 2);
      allIndices.push(wallStart, wallStart + 2, wallStart + 3);

      vertexOffset += 4;
    }
  }

  return {
    positions: new Float32Array(allPositions),
    indices: new Uint32Array(allIndices),
    normals: new Float32Array(allNormals),
  };
};
