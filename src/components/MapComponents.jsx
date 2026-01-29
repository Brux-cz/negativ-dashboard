import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getDistanceMeters, formatDistance } from '../utils';

// Custom marker icon for center point
export const centerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#171717" stroke-width="2"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/**
 * Map click handler component - handles map clicks and zoom changes
 */
export const MapClickHandler = ({ onMapClick, onZoomChange }) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
    zoomend() {
      onZoomChange(map.getZoom());
    }
  });

  // Report initial zoom
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
};

/**
 * Dark overlay component - darkens area outside crop bounds
 */
export const DarkOverlay = ({ bounds }) => {
  const map = useMap();
  const [points, setPoints] = useState(null);

  useEffect(() => {
    if (!bounds) {
      setPoints(null);
      return;
    }

    const updatePoints = () => {
      const mapBounds = map.getBounds();
      const mapNW = map.latLngToContainerPoint(mapBounds.getNorthWest());
      const mapSE = map.latLngToContainerPoint(mapBounds.getSouthEast());
      const cropNW = map.latLngToContainerPoint(L.latLng(bounds[0][0], bounds[0][1]));
      const cropSE = map.latLngToContainerPoint(L.latLng(bounds[1][0], bounds[1][1]));

      setPoints({ mapNW, mapSE, cropNW, cropSE });
    };

    updatePoints();
    map.on('move zoom', updatePoints);

    return () => {
      map.off('move zoom', updatePoints);
    };
  }, [map, bounds]);

  if (!points) return null;

  const { mapNW, mapSE, cropNW, cropSE } = points;

  // Create SVG path for dark overlay with hole for crop area
  const pathD = `
    M ${mapNW.x - 100} ${mapNW.y - 100}
    L ${mapSE.x + 100} ${mapNW.y - 100}
    L ${mapSE.x + 100} ${mapSE.y + 100}
    L ${mapNW.x - 100} ${mapSE.y + 100}
    Z
    M ${cropNW.x} ${cropNW.y}
    L ${cropNW.x} ${cropSE.y}
    L ${cropSE.x} ${cropSE.y}
    L ${cropSE.x} ${cropNW.y}
    Z
  `;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 500,
      }}
    >
      <path d={pathD} fill="rgba(0, 0, 0, 0.6)" fillRule="evenodd" />
    </svg>
  );
};

/**
 * Dimension labels component - shows real-world dimensions on crop edges
 * Uses portal to render labels outside MapContainer while accessing map context
 */
export const DimensionLabels = ({ bounds, portalContainer }) => {
  const map = useMap();
  const [dimensions, setDimensions] = useState(null);

  useEffect(() => {
    if (!bounds) {
      setDimensions(null);
      return;
    }

    const updateDimensions = () => {
      const [[lat1, lon1], [lat2, lon2]] = bounds;
      const width = getDistanceMeters(lat1, lon1, lat1, lon2);
      const height = getDistanceMeters(lat1, lon1, lat2, lon1);

      const cropNW = map.latLngToContainerPoint(L.latLng(lat1, lon1));
      const cropSE = map.latLngToContainerPoint(L.latLng(lat2, lon2));
      const centerX = (cropNW.x + cropSE.x) / 2;
      const centerY = (cropNW.y + cropSE.y) / 2;

      setDimensions({
        width: formatDistance(width),
        height: formatDistance(height),
        topX: centerX,
        topY: cropNW.y - 8,
        leftX: cropNW.x - 8,
        leftY: centerY,
      });
    };

    updateDimensions();
    map.on('move zoom', updateDimensions);

    return () => {
      map.off('move zoom', updateDimensions);
    };
  }, [map, bounds]);

  if (!dimensions || !portalContainer) return null;

  return ReactDOM.createPortal(
    <>
      {/* Top dimension (width) */}
      <div
        style={{
          position: 'absolute',
          left: dimensions.topX,
          top: dimensions.topY,
          transform: 'translate(-50%, -100%)',
          zIndex: 600,
          pointerEvents: 'none',
        }}
        className="bg-black/80 text-white text-xs font-mono px-2 py-1 rounded whitespace-nowrap"
      >
        {dimensions.width}
      </div>
      {/* Left dimension (height) */}
      <div
        style={{
          position: 'absolute',
          left: dimensions.leftX,
          top: dimensions.leftY,
          transform: 'translate(-100%, -50%) rotate(-90deg)',
          transformOrigin: 'right center',
          zIndex: 600,
          pointerEvents: 'none',
        }}
        className="bg-black/80 text-white text-xs font-mono px-2 py-1 rounded whitespace-nowrap"
      >
        {dimensions.height}
      </div>
    </>,
    portalContainer
  );
};

/**
 * Map view controller - moves map when center changes
 */
export const MapViewController = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [map, center, zoom]);

  return null;
};
