import { describe, test, expect } from 'vitest';
import { generateBuildingMeshData } from './buildingGeometry';
import { exportTerrainOBJ, exportBuildingsOBJ } from './meshExporter';

/**
 * Orientation regression tests.
 *
 * Canonical target frame (chosen = terrain-to-3d convention):
 *   Z-up, meters, min-corner at (0,0,0), NO negative coords,
 *   +X = EAST (lon increases), +Y = NORTH (lat increases), Z = elevation.
 *
 * Synthetic terrain: 4x4 grid, pure SOUTH→NORTH height gradient.
 * heightData stores row 0 = NORTH (terrainLoader image-pixel convention),
 * so row 0 = 300 m (north, high), row 3 = 0 m (south, low).
 *
 * These tests assert the *target* behavior and therefore FAIL on the
 * current (buggy) code — that is the RED step.
 */

const RES = 4;
const REAL_W = 1000;
const REAL_H = 1000;
// bounds = [[nLat, wLon], [sLat, eLon]]
const N_LAT = 50.01;
const S_LAT = 50.0;
const W_LON = 14.0;
const E_LON = 14.01;

const makeTerrain = () => {
  const heightData = new Float32Array(RES * RES);
  for (let row = 0; row < RES; row++) {
    // row 0 = NORTH = highest (300), row 3 = SOUTH = 0
    const h = 300 - row * 100;
    for (let col = 0; col < RES; col++) {
      heightData[row * RES + col] = h;
    }
  }
  return {
    heightData,
    resolution: RES,
    bounds: [[N_LAT, W_LON], [S_LAT, E_LON]],
    realWidth: REAL_W,
    realHeight: REAL_H,
    minHeight: 0,
    maxHeight: 300,
  };
};

// Square footprint (~30 m) centered on a geographic point.
const squareBuilding = (lat, lon, id = 1) => {
  const d = 0.0003; // ~30 m in lat at this scale
  return {
    id,
    polygon: [
      [lat - d, lon - d],
      [lat - d, lon + d],
      [lat + d, lon + d],
      [lat + d, lon - d],
    ],
    height: 10,
    minHeight: 0,
    type: 'house',
    levels: null,
  };
};

// A point 87.5% toward the north edge (clearly in the northern half).
const NORTH_LAT = S_LAT + 0.875 * (N_LAT - S_LAT);
// A point 12.5% toward the north edge (clearly in the southern half).
const SOUTH_LAT = S_LAT + 0.125 * (N_LAT - S_LAT);
const MID_LON = (W_LON + E_LON) / 2;

const parseVerts = (obj) =>
  obj
    .split('\n')
    .filter((l) => l.startsWith('v '))
    .map((l) => l.slice(2).trim().split(/\s+/).map(Number));

const parseNormals = (obj) =>
  obj
    .split('\n')
    .filter((l) => l.startsWith('vn '))
    .map((l) => l.slice(3).trim().split(/\s+/).map(Number));

const parseUVs = (obj) =>
  obj
    .split('\n')
    .filter((l) => l.startsWith('vt '))
    .map((l) => l.slice(3).trim().split(/\s+/).map(Number));

describe('terrain/building/ortho orientation', () => {
  test('budova na severu vzorkuje SEVERNÍ výšku terénu (Bug A)', () => {
    const terrain = makeTerrain();
    const northBuilding = squareBuilding(NORTH_LAT, MID_LON);
    const { positions } = generateBuildingMeshData([northBuilding], terrain, 1);

    expect(positions.length).toBeGreaterThan(0);

    // baseZ = avg terrain height under footprint (+ minHeight*scale, =0 here).
    // North footprint sits over the NORTH terrain (~300 m), not south (~0 m).
    let minZ = Infinity;
    for (let i = 2; i < positions.length; i += 3) minZ = Math.min(minZ, positions[i]);

    expect(minZ).toBeGreaterThan(250); // ≈300 (north). Buggy code reads south → ~100/0.
  });

  test('terén OBJ má min-corner origin, +Y=sever, žádné záporné Y (Bug B)', () => {
    const terrain = makeTerrain();
    const verts = parseVerts(exportTerrainOBJ(terrain, 1));

    const ys = verts.map((v) => v[1]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    expect(minY).toBeGreaterThanOrEqual(0); // no negative coords
    expect(minY).toBeCloseTo(0, 3); // min-corner at origin
    expect(maxY).toBeCloseTo(REAL_H, 0); // north edge at +realHeight

    // The northernmost terrain vertex (max Y) must also be the highest (Z≈300),
    // because our gradient peaks in the north. Ties geometry orientation to data.
    const northVert = verts.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(northVert[2]).toBeGreaterThan(250);
  });

  test('budovy OBJ ve stejném min-corner frame, žádné záporné souřadnice (Bug B)', () => {
    const terrain = makeTerrain();
    const north = squareBuilding(NORTH_LAT, MID_LON, 1);
    const south = squareBuilding(SOUTH_LAT, MID_LON, 2);
    const meshData = generateBuildingMeshData([north, south], terrain, 1);

    const obj = exportBuildingsOBJ(meshData, REAL_W, REAL_H);
    const verts = parseVerts(obj);
    expect(verts.length).toBeGreaterThan(0);

    for (const [x, y] of verts) {
      expect(x).toBeGreaterThanOrEqual(-1e-6); // no negative X
      expect(y).toBeGreaterThanOrEqual(-1e-6); // no negative Y
      expect(x).toBeLessThanOrEqual(REAL_W + 1e-6);
      expect(y).toBeLessThanOrEqual(REAL_H + 1e-6);
    }

    // North building footprint must end up in the northern half (Y > realH/2).
    const maxY = Math.max(...verts.map((v) => v[1]));
    expect(maxY).toBeGreaterThan(REAL_H / 2);
  });

  test('terén OBJ a budovy OBJ horizontálně sedí na sebe (sever↔sever)', () => {
    const terrain = makeTerrain();
    const north = squareBuilding(NORTH_LAT, MID_LON);
    const meshData = generateBuildingMeshData([north], terrain, 1);

    const terrainNorthY = Math.max(...parseVerts(exportTerrainOBJ(terrain, 1)).map((v) => v[1]));
    const buildingY = Math.max(...parseVerts(exportBuildingsOBJ(meshData, REAL_W, REAL_H)).map((v) => v[1]));

    // North building (87.5% north) must lie below the terrain's north edge
    // but clearly in the northern part — same frame, same direction.
    expect(buildingY).toBeGreaterThan(REAL_H * 0.7);
    expect(buildingY).toBeLessThanOrEqual(terrainNorthY + 1e-6);
  });

  test('terén OBJ normála ny má správné znaménko pro sever-stoupající svah', () => {
    const terrain = makeTerrain();
    const normals = parseNormals(exportTerrainOBJ(terrain, 1));

    // Interior vertex (row=1, col=1) in row-major order: idx = row*RES + col.
    const ny = normals[1 * RES + 1][1];

    // Slope rises toward north (+Y). Height-field normal tilts toward south:
    // n_y = -d h / d y < 0.
    expect(ny).toBeLessThan(0);
  });

  test('terén OBJ trojúhelníky mají winding nahoru (+Z) — ne naruby', () => {
    // Flat terrain → every face lies in the XY plane, geometric normal is
    // exactly ±Z. Mirroring py must not leave the mesh inside-out.
    const terrain = makeTerrain();
    terrain.heightData = new Float32Array(RES * RES); // all zeros = flat
    const obj = exportTerrainOBJ(terrain, 1);

    const verts = parseVerts(obj);
    const faces = obj
      .split('\n')
      .filter((l) => l.startsWith('f '))
      .map((l) =>
        l
          .slice(2)
          .trim()
          .split(/\s+/)
          .map((tok) => parseInt(tok.split('/')[0], 10) - 1),
      );

    expect(faces.length).toBeGreaterThan(0);

    for (const [a, b, c] of faces) {
      const v1 = verts[a];
      const v2 = verts[b];
      const v3 = verts[c];
      const e1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
      const e2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
      const nz = e1[0] * e2[1] - e1[1] * e2[0]; // z of cross product
      expect(nz).toBeGreaterThan(0); // CCW from above → faces point up
    }
  });

  test('nejsevernější terén OBJ vertex má UV v=1 (3ds Max OpenGL konzistence)', () => {
    const terrain = makeTerrain();
    const obj = exportTerrainOBJ(terrain, 1);
    const verts = parseVerts(obj);
    const uvs = parseUVs(obj);

    // index of the vertex with max Y (northernmost in target frame)
    let northIdx = 0;
    for (let i = 1; i < verts.length; i++) if (verts[i][1] > verts[northIdx][1]) northIdx = i;

    // OpenGL/3ds Max: V=1 = top of texture = north content of ortho JPEG.
    expect(uvs[northIdx][1]).toBeCloseTo(1, 3);
  });
});
