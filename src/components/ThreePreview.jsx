import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Terrain mesh component — renders height data as a displaced plane.
 */
const TerrainMesh = ({ terrain, textureUrl, verticalScale, flatMode }) => {
  const { heightData, resolution, realWidth, realHeight } = terrain;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(realWidth, realHeight, resolution - 1, resolution - 1);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const z = flatMode ? 0 : heightData[i] * verticalScale;
      pos.setZ(i, z);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [heightData, resolution, realWidth, realHeight, verticalScale, flatMode]);

  const texture = useMemo(() => {
    if (!textureUrl) return null;
    const tex = new THREE.TextureLoader().load(textureUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [textureUrl]);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      {texture ? (
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
      ) : (
        <meshStandardMaterial color="#4a7c4f" wireframe side={THREE.DoubleSide} />
      )}
    </mesh>
  );
};

/**
 * Buildings mesh component — renders extruded OSM buildings.
 */
const BuildingsMesh = ({ buildingMeshData }) => {
  const geometry = useMemo(() => {
    if (!buildingMeshData) return null;
    const { positions, indices, normals } = buildingMeshData;
    if (positions.length === 0) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [buildingMeshData]);

  if (!geometry) return null;

  // Buildings share the terrain's local frame (X=east, Y=north, Z=up,
  // centered on origin), so they get the same -90° X rotation as the terrain.
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#cccccc" flatShading />
    </mesh>
  );
};

/**
 * ThreePreview — interactive 3D viewer for terrain + buildings.
 *
 * Props:
 *   terrain: TerrainData | null
 *   textureUrl: string | null (data URL of ortho texture)
 *   buildingMeshData: { positions, indices, normals } | null
 *   verticalScale: number
 *   flatMode: boolean
 */
export const ThreePreview = ({ terrain, textureUrl, buildingMeshData, verticalScale = 1, flatMode = false }) => {
  if (!terrain) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-900 text-neutral-500">
        <p className="text-sm">Načti terén pro 3D náhled</p>
      </div>
    );
  }

  const { realWidth, realHeight } = terrain;
  const cameraDistance = Math.max(realWidth, realHeight) * 0.8;

  return (
    <div className="flex-1 relative bg-neutral-900">
      <Canvas
        camera={{
          position: [0, cameraDistance * 0.6, cameraDistance * 0.5],
          fov: 50,
          near: 1,
          far: cameraDistance * 10,
        }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[1, 2, 1]} intensity={0.8} />

        <TerrainMesh
          terrain={terrain}
          textureUrl={textureUrl}
          verticalScale={verticalScale}
          flatMode={flatMode}
        />

        {buildingMeshData && (
          <BuildingsMesh buildingMeshData={buildingMeshData} />
        )}

        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      {/* Legend overlay */}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg text-xs text-neutral-300">
        LMB otáčet • Scroll zoom • MMB posun
      </div>
    </div>
  );
};
