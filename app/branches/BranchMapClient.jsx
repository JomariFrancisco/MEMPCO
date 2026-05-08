'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

const MINDANAO_CENTER = [7.9, 123.6];
const MINDANAO_BOUNDS = [
  [4.5, 121.0],
  [10.9, 127.5],
];

function createBranchIcon(branch, { isActive = false, isHovered = false } = {}) {
  const areaClass = branch.area === 'Area 2' ? 'locator-map-pin--area2' : 'locator-map-pin--area1';
  const activeClass = isActive ? ' is-active' : '';
  const hoveredClass = isHovered ? ' is-hovered' : '';

  return L.divIcon({
    className: 'locator-map-pin-wrapper',
    html: `<span class="locator-map-pin ${areaClass}${activeClass}${hoveredClass}"></span>`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -30],
  });
}

function createClusterIcon() {
  return L.divIcon({
    html: `<span class="locator-cluster-pin"></span>`,
    className: 'locator-cluster-pin-wrapper',
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -32],
  });
}

function MapViewportController({ branches, activeBranch, mapMode }) {
  const map = useMap();

  const branchesKey = useMemo(
    () => branches.map((branch) => `${branch.id}:${branch.lat}:${branch.lng}`).join('|'),
    [branches]
  );

  useEffect(() => {
    if (!branches.length) return;

    if (mapMode === 'overview' || !activeBranch) {
      if (branches.length === 1) {
        map.setView([branches[0].lat, branches[0].lng], 14, { animate: true });
        return;
      }

      const bounds = L.latLngBounds(branches.map((branch) => [branch.lat, branch.lng]));
      map.fitBounds(bounds.pad(0.12), {
        animate: true,
        duration: 1,
      });
      return;
    }

    map.flyTo([activeBranch.lat, activeBranch.lng], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.8,
    });
  }, [map, branches, branchesKey, activeBranch, mapMode]);

  return null;
}

export default function BranchMapClient({
  branches,
  activeBranch,
  hoveredBranchId,
  mapMode,
  onSelectBranch,
}) {
  return (
    <MapContainer
      center={MINDANAO_CENTER}
      zoom={8}
      minZoom={7}
      maxZoom={18}
      zoomControl={false}
      scrollWheelZoom
      className="locator-leaflet-map"
      maxBounds={MINDANAO_BOUNDS}
      maxBoundsViscosity={0.9}
      preferCanvas
    >
      <ZoomControl position="bottomright" />

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapViewportController
        branches={branches}
        activeBranch={activeBranch}
        mapMode={mapMode}
      />

      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        spiderfyOnMaxZoom
        removeOutsideVisibleBounds
        maxClusterRadius={45}
        iconCreateFunction={createClusterIcon}
      >
        {branches.map((branch) => (
          <Marker
            key={branch.id}
            position={[branch.lat, branch.lng]}
            icon={createBranchIcon(branch, {
              isActive: activeBranch?.id === branch.id,
              isHovered: hoveredBranchId === branch.id,
            })}
            eventHandlers={{
              click: () => onSelectBranch(branch.id),
            }}
          >
            <Popup>
              <div className="locator-popup">
                <strong>{branch.name}</strong>
                <span>
                  {branch.area} • {branch.category}
                </span>
                <p>{branch.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}