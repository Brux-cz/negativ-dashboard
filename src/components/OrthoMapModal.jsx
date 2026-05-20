import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Map, X, Download, MapPin, ChevronDown } from 'lucide-react';

import { SelectionMap } from './MapComponents';
import {
  getCenteredBounds,
  getTilesForBounds,
  estimateFileSize,
  orthoSources,
  ORTHO_STORAGE_KEY
} from '../utils';

/**
 * OrthoMapModal - Ortho map download component
 */
export const OrthoMapModal = ({ isOpen, onClose }) => {
  // Load saved settings from localStorage
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(ORTHO_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  };

  const savedSettings = loadSettings();

  // Clear invalid source from localStorage if it doesn't exist anymore
  const getValidSource = () => {
    const found = orthoSources.find(s => s.id === savedSettings?.sourceId);
    if (!found && savedSettings?.sourceId) {
      localStorage.removeItem(ORTHO_STORAGE_KEY);
    }
    return found || orthoSources[0];
  };

  const [selectedSource, setSelectedSource] = useState(getValidSource);
  const [center, setCenter] = useState(savedSettings?.center || null);
  const [mapView, setMapView] = useState(savedSettings?.mapView || [50.0755, 14.4378]);
  const [mapZoom, setMapZoom] = useState(savedSettings?.mapZoom || 14);
  const [tileZoom, setTileZoom] = useState(savedSettings?.tileZoom || 18);
  const [gridSize, setGridSize] = useState(savedSettings?.gridSize || 7);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMapZoom, setCurrentMapZoom] = useState(14);
  const [searchResults, setSearchResults] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searching, setSearching] = useState(false);

  // New state for enhanced features
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [customWidth, setCustomWidth] = useState(2048);
  const [customHeight, setCustomHeight] = useState(2048);
  const [showDetails, setShowDetails] = useState(false);
  const modalRef = useRef(null);


  const handleZoomChange = useCallback((zoom) => {
    setCurrentMapZoom(Math.round(zoom));
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    const settings = {
      sourceId: selectedSource.id,
      center,
      mapView,
      mapZoom,
      tileZoom,
      gridSize,
    };
    localStorage.setItem(ORTHO_STORAGE_KEY, JSON.stringify(settings));
  }, [selectedSource, center, mapView, mapZoom, tileZoom, gridSize]);

  // Calculate actual output dimensions
  const outputDimensions = useMemo(() => {
    if (useCustomSize) {
      return { width: customWidth, height: customHeight };
    }
    const pixels = gridSize * 256;
    return { width: pixels, height: pixels };
  }, [useCustomSize, customWidth, customHeight, gridSize]);

  // Estimate file size (always JPG 85%)
  const estimatedSize = useMemo(() => {
    return estimateFileSize(outputDimensions.width, outputDimensions.height, 'jpg', 85);
  }, [outputDimensions]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't trigger if typing in input
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case '+':
        case '=':
          setTileZoom(z => Math.min(21, z + 1));
          break;
        case '-':
          setTileZoom(z => Math.max(13, z - 1));
          break;
        case 'Enter':
          if (center && !downloading) {
            handleDownload();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, center, downloading, onClose]);

  // Pixel sizes
  const pixelSizes = [
    { value: 7, pixels: 1792, label: '1792 px' },
    { value: 11, pixels: 2816, label: '2816 px' },
    { value: 15, pixels: 3840, label: '3840 px' },
    { value: 21, pixels: 5376, label: '5376 px' },
    { value: 31, pixels: 7936, label: '7936 px' },
    { value: 41, pixels: 10496, label: '10496 px' },
  ];


  const handleMapClick = useCallback((latlng) => {
    setCenter(latlng);
  }, []);

  // Real geocoding search using Nominatim
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    // Check if input is coordinates (lat, lon)
    const coordMatch = searchQuery.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        setCenter([lat, lon]);
        setMapView([lat, lon]);
        setMapZoom(17);
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
    setMapZoom(17);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Download tiles and stitch them
  const handleDownload = async () => {
    if (!center) return;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      const dlBounds = getCenteredBounds(center, tileZoom, gridSize);
      const { tiles, cols, rows, originTile } = getTilesForBounds(dlBounds, tileZoom);

      const tileSize = 256;

      // Full canvas covering all intersected tiles
      const canvas = document.createElement('canvas');
      canvas.width = cols * tileSize;
      canvas.height = rows * tileSize;
      const ctx = canvas.getContext('2d');

      const loadTile = (tile) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, tile.gx * tileSize, tile.gy * tileSize, tileSize, tileSize);
            resolve(true);
          };
          img.onerror = () => {
            ctx.fillStyle = '#e5e5e5';
            ctx.fillRect(tile.gx * tileSize, tile.gy * tileSize, tileSize, tileSize);
            resolve(false);
          };
          img.src = selectedSource.tileUrl(tileZoom, tile.x, tile.y);
        });
      };

      const batchSize = 10;
      let loaded = 0;
      const totalTiles = tiles.length;

      for (let i = 0; i < tiles.length; i += batchSize) {
        const batch = tiles.slice(i, i + batchSize);
        await Promise.all(batch.map(loadTile));
        loaded += batch.length;
        setDownloadProgress((loaded / totalTiles) * 100);
      }

      // Crop to exact bounds
      const n = Math.pow(2, tileZoom);
      const cropX = Math.round(((dlBounds[0][1] + 180) / 360 * n - originTile.x) * tileSize);
      const cropY = Math.round(((1 - Math.log(Math.tan(dlBounds[0][0] * Math.PI / 180) + 1 / Math.cos(dlBounds[0][0] * Math.PI / 180)) / Math.PI) / 2 * n - originTile.y) * tileSize);
      const cropX2 = Math.round(((dlBounds[1][1] + 180) / 360 * n - originTile.x) * tileSize);
      const cropY2 = Math.round(((1 - Math.log(Math.tan(dlBounds[1][0] * Math.PI / 180) + 1 / Math.cos(dlBounds[1][0] * Math.PI / 180)) / Math.PI) / 2 * n - originTile.y) * tileSize);

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = cropX2 - cropX;
      outputCanvas.height = cropY2 - cropY;
      outputCanvas.getContext('2d').drawImage(canvas, cropX, cropY, cropX2 - cropX, cropY2 - cropY, 0, 0, outputCanvas.width, outputCanvas.height);

      // Generate smart filename
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const latStr = center[0].toFixed(3).replace('.', '_');
      const lonStr = center[1].toFixed(3).replace('.', '_');
      const baseFilename = `ortho_${latStr}_${lonStr}_z${tileZoom}_${dateStr}`;

      // Export as JPG 85%
      outputCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${baseFilename}.jpg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        setDownloading(false);
        setDownloadProgress(0);
      }, 'image/jpeg', 0.85);

    } catch (error) {
      console.error('Download failed:', error);
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (!isOpen) return null;

  const cropBounds = getCenteredBounds(center, tileZoom, gridSize);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose} ref={modalRef}>
      <div className="bg-neutral-900 rounded-lg w-full h-full shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header - Dark */}
        <div className="px-5 py-4 border-b border-neutral-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Map className="w-5 h-5 text-neutral-900" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Ortho Map Downloader</h2>
              <p className="text-sm text-neutral-400">Klikni na mapu pro nastavení středu • <span className="text-neutral-500">ESC zavřít, +/- zoom, Enter stáhnout</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Map */}
          <SelectionMap
            mapView={mapView}
            mapZoom={mapZoom}
            tileUrl={selectedSource.url}
            bounds={cropBounds}
            center={center}
            onMapClick={handleMapClick}
            onZoomChange={handleZoomChange}
          >
            {/* Zoom indicator */}
            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg">
              <div className="text-sm font-mono font-bold text-white">Zoom: {currentMapZoom}</div>
            </div>

            {/* Center info */}
            {center && (
              <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg">
                <div className="text-xs text-neutral-400 mb-1">Střed výřezu</div>
                <div className="text-sm font-mono font-medium text-white">
                  {center[0].toFixed(6)}, {center[1].toFixed(6)}
                </div>
              </div>
            )}

            {/* Scale bar placeholder */}
            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-white rounded" />
                <span className="text-xs text-white font-mono">
                  {currentMapZoom >= 18 ? '50m' : currentMapZoom >= 15 ? '200m' : '1km'}
                </span>
              </div>
            </div>
          </SelectionMap>

          {/* Sidebar - Dark Mode */}
          <div className="w-96 bg-neutral-800 border-l border-neutral-700 overflow-y-auto shrink-0">
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

                  {/* Search results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 bg-neutral-700 border border-neutral-600 rounded-lg max-h-48 overflow-y-auto">
                      {searchResults.map((result, i) => (
                        <button
                          key={i}
                          onClick={() => selectSearchResult(result)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-600 border-b border-neutral-600 last:border-0 transition-colors"
                        >
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

                {/* Tile Zoom - Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-300">Zoom pro stažení</label>
                    <span className="text-sm font-mono text-white">{tileZoom}</span>
                  </div>
                  <input
                    type="range"
                    min={13}
                    max={21}
                    value={tileZoom}
                    onChange={e => setTileZoom(parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>13</span>
                    <span>15</span>
                    <span>17</span>
                    <span>19</span>
                    <span>21</span>
                  </div>
                  <button
                    onClick={() => setTileZoom(Math.min(21, Math.max(13, currentMapZoom)))}
                    className="text-xs text-white hover:text-neutral-300 mt-2"
                  >
                    Použít aktuální zoom mapy ({currentMapZoom})
                  </button>
                </div>

                {/* Pixel size - Presets + Custom */}
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">Velikost výřezu</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {pixelSizes.slice(0, 6).map(p => (
                      <button
                        key={p.value}
                        onClick={() => { setGridSize(p.value); setUseCustomSize(false); }}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          gridSize === p.value && !useCustomSize
                            ? 'bg-white text-neutral-900'
                            : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom size toggle */}
                  <button
                    onClick={() => setUseCustomSize(!useCustomSize)}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all mb-2 ${
                      useCustomSize
                        ? 'bg-white text-neutral-900'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    }`}
                  >
                    Vlastní velikost
                  </button>

                  {useCustomSize && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-neutral-500 mb-1 block">Šířka (px)</label>
                        <input
                          type="number"
                          value={customWidth}
                          onChange={e => setCustomWidth(parseInt(e.target.value) || 256)}
                          className="w-full px-3 py-2 text-sm bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-neutral-500 mb-1 block">Výška (px)</label>
                        <input
                          type="number"
                          value={customHeight}
                          onChange={e => setCustomHeight(parseInt(e.target.value) || 256)}
                          className="w-full px-3 py-2 text-sm bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Details - Collapsible */}
                <div>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full flex items-center justify-between text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                  >
                    <span>Detaily</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showDetails && (
                    <div className="mt-3 bg-neutral-700/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Rozlišení:</span>
                        <span className="font-mono text-white">{outputDimensions.width} × {outputDimensions.height} px</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Tiles:</span>
                        <span className="font-mono text-white">{gridSize * gridSize}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Odhad velikosti:</span>
                        <span className="font-mono text-white">~{estimatedSize.toFixed(1)} MB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Formát:</span>
                        <span className="font-mono text-white">JPG 85%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Download button */}
                <div className="pt-4 border-t border-neutral-700">
                  {downloading ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-300 flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generuji...
                        </span>
                        <span className="font-mono text-white">{Math.round(downloadProgress)}%</span>
                      </div>
                      <div className="w-full bg-neutral-700 rounded-full h-2">
                        <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${downloadProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleDownload}
                      disabled={!center}
                      className="w-full py-3.5 bg-white text-neutral-900 text-sm font-semibold rounded-lg hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-neutral-500 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Stáhnout JPG
                    </button>
                  )}
                  {!center && (
                    <p className="text-sm text-neutral-500 text-center mt-3">
                      Klikni na mapu pro výběr středu
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
