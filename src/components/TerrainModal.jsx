import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mountain, X, Download, MapPin, ChevronDown, Eye, Box } from 'lucide-react';

import { SelectionMap } from './MapComponents';
import { ThreePreview } from './ThreePreview';
import { loadTerrain } from '../utils/terrainLoader';
import { loadOrthoTexture } from '../utils/orthoLoader';
import { fetchBuildings } from '../utils/osmLoader';
import { generateBuildingMeshData } from '../utils/buildingGeometry';
import { exportTerrainOBJ, exportBuildingsOBJ, downloadBlob, downloadDataUrl } from '../utils/meshExporter';
import { getCenteredBounds, getDistanceMeters, formatDistance, orthoSources, TERRAIN_STORAGE_KEY } from '../utils';

/**
 * TerrainModal - 3D Terrain Mesh Download + Preview component
 */
export const TerrainModal = ({ isOpen, onClose }) => {
  // Load saved settings
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(TERRAIN_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  };

  const savedSettings = loadSettings();

  const [selectedSource, setSelectedSource] = useState(
    orthoSources.find(s => s.id === savedSettings?.sourceId) || orthoSources[0]
  );
  const [center, setCenter] = useState(savedSettings?.center || null);
  const [mapView, setMapView] = useState(savedSettings?.mapView || [50.0755, 14.4378]);
  const [mapZoom, setMapZoom] = useState(savedSettings?.mapZoom || 14);
  const [tileZoom, setTileZoom] = useState(savedSettings?.tileZoom || 12);
  const [gridSize, setGridSize] = useState(savedSettings?.gridSize || 3);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMapZoom, setCurrentMapZoom] = useState(14);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [verticalScale, setVerticalScale] = useState(savedSettings?.verticalScale || 1);
  const [meshResolution, setMeshResolution] = useState(savedSettings?.meshResolution || 256);
  const [generateTexture, setGenerateTexture] = useState(savedSettings?.generateTexture ?? true);
  const [textureSource, setTextureSource] = useState(savedSettings?.textureSource || 'google');
  const [showDetails, setShowDetails] = useState(false);

  // 3D Preview state
  const [viewMode, setViewMode] = useState('map'); // 'map' | '3d'
  const [sceneData, setSceneData] = useState(null); // { terrain, textureUrl }
  const [flatMode, setFlatMode] = useState(false);
  const [loadingScene, setLoadingScene] = useState(false);

  // OSM Buildings state
  const [showBuildings, setShowBuildings] = useState(false);
  const [buildings, setBuildings] = useState(null); // raw OSM data
  const [buildingMeshData, setBuildingMeshData] = useState(null);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [buildingCount, setBuildingCount] = useState(0);

  const modalRef = useRef(null);

  const handleZoomChange = useCallback((zoom) => {
    setCurrentMapZoom(Math.round(zoom));
  }, []);

  // Save settings
  useEffect(() => {
    const settings = {
      sourceId: selectedSource.id,
      center, mapView, mapZoom, tileZoom, gridSize,
      verticalScale, meshResolution, generateTexture, textureSource,
    };
    localStorage.setItem(TERRAIN_STORAGE_KEY, JSON.stringify(settings));
  }, [selectedSource, center, mapView, mapZoom, tileZoom, gridSize, verticalScale, meshResolution, generateTexture, textureSource]);

  // Reset scene when parameters change
  useEffect(() => {
    setSceneData(null);
    setBuildings(null);
    setBuildingMeshData(null);
    setBuildingCount(0);
    if (viewMode === '3d') setViewMode('map');
  }, [center, tileZoom, gridSize, meshResolution]);

  const gridSizes = [
    { value: 1, label: '1×1' },
    { value: 2, label: '2×2' },
    { value: 3, label: '3×3' },
    { value: 4, label: '4×4' },
  ];

  const meshResolutions = [
    { value: 128, label: '128×128' },
    { value: 256, label: '256×256' },
    { value: 512, label: '512×512' },
  ];

  const handleMapClick = useCallback((latlng) => {
    setCenter(latlng);
  }, []);

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const coordMatch = searchQuery.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        setCenter([lat, lon]);
        setMapView([lat, lon]);
        setMapZoom(14);
        setSearchResults([]);
        return;
      }
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSearchResults(data.map(item => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      })));
    } catch (e) {
      console.error('Search failed:', e);
    }
    setSearching(false);
  };

  const selectSearchResult = (result) => {
    setCenter([result.lat, result.lon]);
    setMapView([result.lat, result.lon]);
    setMapZoom(14);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Load scene data (terrain + texture) and switch to 3D view
  const loadScene = async () => {
    if (!center) return;

    setLoadingScene(true);
    setDownloadProgress(0);

    try {
      const terrain = await loadTerrain({
        center, tileZoom, gridSize, meshResolution,
        onProgress: (p) => setDownloadProgress(p * 0.7),
      });

      let textureUrl = null;
      if (generateTexture) {
        const texZoom = Math.min(tileZoom + 2, 19);
        textureUrl = await loadOrthoTexture({
          bounds: terrain.bounds,
          tileZoom: texZoom,
          sourceId: textureSource,
          outputSize: meshResolution * 2,
          onProgress: (p) => setDownloadProgress(70 + p * 0.3),
        });
      }

      setSceneData({ terrain, textureUrl });
      setViewMode('3d');
      setDownloadProgress(100);
    } catch (error) {
      console.error('Scene load failed:', error);
    }

    setLoadingScene(false);
    setDownloadProgress(0);
  };

  // Load OSM buildings
  const loadBuildings = async () => {
    if (!sceneData?.terrain) return;

    setLoadingBuildings(true);
    try {
      const rawBuildings = await fetchBuildings(sceneData.terrain.bounds);
      setBuildings(rawBuildings);
      setBuildingCount(rawBuildings.length);

      const meshData = generateBuildingMeshData(rawBuildings, sceneData.terrain, verticalScale);
      setBuildingMeshData(meshData);
    } catch (error) {
      console.error('Building load failed:', error);
    }
    setLoadingBuildings(false);
  };

  // Regenerate building geometry when vertical scale changes
  useEffect(() => {
    if (buildings && sceneData?.terrain) {
      const meshData = generateBuildingMeshData(buildings, sceneData.terrain, verticalScale);
      setBuildingMeshData(meshData);
    }
  }, [verticalScale, flatMode]);

  // Toggle buildings
  useEffect(() => {
    if (showBuildings && !buildings && sceneData?.terrain) {
      loadBuildings();
    }
  }, [showBuildings]);

  // Export OBJ
  const handleExport = () => {
    if (!sceneData?.terrain) return;

    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const latStr = center[0].toFixed(3).replace('.', '_');
    const lonStr = center[1].toFixed(3).replace('.', '_');
    const baseFilename = `terrain_${latStr}_${lonStr}_z${tileZoom}_${dateStr}`;

    // Terrain OBJ
    const terrainOBJ = exportTerrainOBJ(sceneData.terrain, verticalScale);
    downloadBlob(terrainOBJ, `${baseFilename}.obj`);

    // Texture
    if (sceneData.textureUrl) {
      downloadDataUrl(sceneData.textureUrl, `${baseFilename}_texture.jpg`);
    }

    // Buildings OBJ
    if (showBuildings && buildingMeshData && buildingMeshData.positions.length > 0) {
      const buildingsOBJ = exportBuildingsOBJ(buildingMeshData);
      downloadBlob(buildingsOBJ, `${baseFilename}_buildings.obj`);
    }
  };

  const bounds = getCenteredBounds(center, tileZoom, gridSize);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key) {
        case '+': case '=': setTileZoom(z => Math.min(14, z + 1)); break;
        case '-': setTileZoom(z => Math.max(10, z - 1)); break;
        case 'Enter':
          if (center && !downloading && !loadingScene) {
            if (viewMode === '3d' && sceneData) handleExport();
            else loadScene();
          }
          break;
        case 'Escape': onClose(); break;
        case 'Tab':
          e.preventDefault();
          if (sceneData) setViewMode(v => v === 'map' ? '3d' : 'map');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, center, downloading, loadingScene, viewMode, sceneData, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-neutral-900 rounded-lg w-full h-full shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Mountain className="w-5 h-5 text-neutral-900" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">3D Terrain</h2>
              <p className="text-sm text-neutral-400">
                SRTM Elevation Data → OBJ Mesh • <span className="text-neutral-500">ESC zavřít, Tab přepnout, Enter {viewMode === '3d' ? 'export' : 'náhled'}</span>
              </p>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            {sceneData && (
              <div className="flex bg-neutral-800 rounded-lg p-1 mr-2">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    viewMode === 'map' ? 'bg-white text-neutral-900' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Mapa
                </button>
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    viewMode === '3d' ? 'bg-white text-neutral-900' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  3D Náhled
                </button>
              </div>
            )}
            <button onClick={onClose} className="text-neutral-400 hover:text-white p-2 hover:bg-neutral-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map or 3D Preview */}
          {viewMode === 'map' ? (
            <SelectionMap
              mapView={mapView}
              mapZoom={mapZoom}
              tileUrl={selectedSource.url}
              bounds={bounds}
              center={center}
              onMapClick={handleMapClick}
              onZoomChange={handleZoomChange}
            >
              <div className="absolute bottom-4 left-4 z-[1000] bg-black/70 text-white text-xs px-2 py-1 rounded">
                Zoom: {currentMapZoom}
              </div>
            </SelectionMap>
          ) : (
            <ThreePreview
              terrain={sceneData?.terrain}
              textureUrl={sceneData?.textureUrl}
              buildingMeshData={showBuildings ? buildingMeshData : null}
              verticalScale={verticalScale}
              flatMode={flatMode}
            />
          )}

          {/* Sidebar */}
          <div className="w-96 bg-neutral-800 border-l border-neutral-700 flex flex-col overflow-y-auto">
            <div className="p-5 space-y-6">
              {/* Search */}
              <div>
                <label className="text-sm font-medium text-neutral-300 mb-2 block">Hledat místo</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Adresa nebo 50.0755, 14.4378"
                    className="flex-1 px-3 py-2.5 text-sm bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-3 py-2.5 bg-white text-neutral-900 rounded-lg hover:bg-neutral-200 disabled:bg-neutral-600 transition-colors"
                  >
                    {searching ? '...' : <MapPin className="w-4 h-4" />}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 bg-neutral-700 border border-neutral-600 rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((result, i) => (
                      <button key={i} onClick={() => selectSearchResult(result)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-600 border-b border-neutral-600 last:border-0">
                        <div className="truncate text-white">{result.name}</div>
                        <div className="text-xs font-mono text-neutral-400">
                          {result.lat.toFixed(5)}, {result.lon.toFixed(5)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Map Source */}
              <div>
                <label className="text-sm font-medium text-neutral-300 mb-2 block">Zdroj mapy</label>
                <div className="flex gap-2">
                  {orthoSources.map(source => (
                    <button
                      key={source.id}
                      onClick={() => setSelectedSource(source)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedSource.id === source.id
                          ? 'bg-white text-neutral-900'
                          : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                      }`}
                    >
                      {source.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tile zoom */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-neutral-300">Detail terénu (zoom)</label>
                  <span className="text-sm font-mono text-white">{tileZoom}</span>
                </div>
                <input
                  type="range" min={10} max={14} value={tileZoom}
                  onChange={e => setTileZoom(parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>10</span><span>11</span><span>12</span><span>13</span><span>14</span>
                </div>
                <button
                  onClick={() => setTileZoom(Math.min(14, Math.max(10, currentMapZoom)))}
                  className="text-xs text-white hover:text-neutral-300 mt-2"
                >
                  Použít aktuální zoom mapy ({currentMapZoom})
                </button>
              </div>

              {/* Grid size */}
              <div>
                <label className="text-sm font-medium text-neutral-300 mb-2 block">Velikost oblasti</label>
                <div className="grid grid-cols-4 gap-2">
                  {gridSizes.map(g => (
                    <button
                      key={g.value}
                      onClick={() => setGridSize(g.value)}
                      className={`py-2.5 text-sm font-medium rounded-lg transition-all ${
                        gridSize === g.value ? 'bg-white text-neutral-900' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mesh resolution */}
              <div>
                <label className="text-sm font-medium text-neutral-300 mb-2 block">Rozlišení mesh</label>
                <div className="grid grid-cols-3 gap-2">
                  {meshResolutions.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setMeshResolution(r.value)}
                      className={`py-2.5 text-sm font-medium rounded-lg transition-all ${
                        meshResolution === r.value ? 'bg-white text-neutral-900' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vertical scale */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-neutral-300">Vertikální měřítko</label>
                  <span className="text-sm font-mono text-white">{verticalScale}×</span>
                </div>
                <input
                  type="range" min="0.5" max="5" step="0.5" value={verticalScale}
                  onChange={(e) => setVerticalScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-1">
                  <span>0.5×</span><span>1× (reálné)</span><span>5×</span>
                </div>
              </div>

              {/* Texture option */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox" checked={generateTexture}
                    onChange={(e) => setGenerateTexture(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-white focus:ring-white"
                  />
                  <span className="text-sm font-medium text-neutral-300">Stáhnout ortho texturu</span>
                </label>
                {generateTexture && (
                  <div className="flex gap-2 pl-6">
                    {['google', 'esri'].map(src => (
                      <button
                        key={src}
                        onClick={() => setTextureSource(src)}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                          textureSource === src ? 'bg-white text-neutral-900' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                      >
                        {src === 'google' ? 'Google' : 'Esri'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3D Preview section — visible after scene is loaded */}
              {sceneData && (
                <>
                  <div className="border-t border-neutral-700 pt-4">
                    {/* Flat mode toggle */}
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input
                        type="checkbox" checked={flatMode}
                        onChange={(e) => setFlatMode(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-white focus:ring-white"
                      />
                      <span className="text-sm font-medium text-neutral-300">Plochý terén (placka)</span>
                    </label>

                    {/* OSM Buildings toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox" checked={showBuildings}
                        onChange={(e) => setShowBuildings(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-white focus:ring-white"
                      />
                      <span className="text-sm font-medium text-neutral-300">OSM Budovy</span>
                    </label>
                    {showBuildings && (
                      <div className="mt-2 pl-6 text-xs text-neutral-400">
                        {loadingBuildings ? (
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Načítám budovy z OpenStreetMap...
                          </span>
                        ) : buildingCount > 0 ? (
                          <span>Načteno {buildingCount} budov</span>
                        ) : (
                          <span>Žádné budovy v oblasti</span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Details */}
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                >
                  <span>Detaily</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                </button>
                {showDetails && bounds && (
                  <div className="mt-3 bg-neutral-700/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Rozlišení:</span>
                      <span className="font-mono text-white">{meshResolution} × {meshResolution}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Grid:</span>
                      <span className="font-mono text-white">{gridSize} × {gridSize} tiles</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Oblast:</span>
                      <span className="font-mono text-white">
                        {formatDistance(getDistanceMeters(bounds[0][0], bounds[0][1], bounds[0][0], bounds[1][1]))} × {formatDistance(getDistanceMeters(bounds[0][0], bounds[0][1], bounds[1][0], bounds[0][1]))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Vertikální:</span>
                      <span className="font-mono text-white">{verticalScale}×</span>
                    </div>
                    {sceneData && (
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Výškový rozsah:</span>
                        <span className="font-mono text-white">
                          {sceneData.terrain.minHeight.toFixed(0)}–{sceneData.terrain.maxHeight.toFixed(0)} m
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-neutral-700 space-y-3">
                {(downloading || loadingScene) ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-300 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {loadingScene ? 'Načítám scénu...' : 'Generuji mesh...'}
                      </span>
                      <span className="font-mono text-white">{Math.round(downloadProgress)}%</span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${downloadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Preview button */}
                    <button
                      onClick={loadScene}
                      disabled={!center}
                      className="w-full py-3 bg-neutral-700 text-white text-sm font-semibold rounded-lg hover:bg-neutral-600 disabled:bg-neutral-700 disabled:text-neutral-500 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      {sceneData ? 'Obnovit 3D náhled' : '3D Náhled'}
                    </button>

                    {/* Export button */}
                    <button
                      onClick={handleExport}
                      disabled={!sceneData}
                      className="w-full py-3.5 bg-white text-neutral-900 text-sm font-semibold rounded-lg hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-neutral-500 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Export OBJ{showBuildings && buildingCount > 0 ? ' + Budovy' : ''}
                    </button>
                  </>
                )}
                {!center && (
                  <p className="text-sm text-neutral-500 text-center mt-3">
                    Klikni na mapu pro výběr oblasti
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
