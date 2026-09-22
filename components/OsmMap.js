'use client';

import { useEffect, useRef, useState } from 'react';

const PASTO = [1.2136, -77.2811];

export default function OsmMap({ value, onChange }) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const L = await import('leaflet');
      if (cancelled || !elementRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(elementRef.current, {
        center: PASTO,
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      map.on('click', (event) => {
        placeMarker(event.latlng.lat, event.latlng.lng, map, L);
      });

      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 100);

      if (value?.lat != null && value?.lng != null) {
        placeMarker(value.lat, value.lng, map, L, false);
      }
    }

    function placeMarker(lat, lng, map, L, emit = true) {
      const point = [Number(lat), Number(lng)];
      const icon = L.divIcon({
        className: 'colacteos-map-marker',
        html: '<span></span>',
        iconSize: [30, 40],
        iconAnchor: [15, 38],
      });

      if (!markerRef.current) markerRef.current = L.marker(point, { icon }).addTo(map);
      else markerRef.current.setLatLng(point);

      if (emit) onChange({ lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) });
    }

    start();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []); // Map is initialized once.

  function useMyLocation() {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no permite obtener la ubicación.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const map = mapRef.current;
        const L = leafletRef.current;
        if (!map || !L) return;
        const lat = Number(coords.latitude.toFixed(7));
        const lng = Number(coords.longitude.toFixed(7));
        const icon = L.divIcon({ className: 'colacteos-map-marker', html: '<span></span>', iconSize: [30, 40], iconAnchor: [15, 38] });
        if (!markerRef.current) markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
        else markerRef.current.setLatLng([lat, lng]);
        map.setView([lat, lng], 16);
        onChange({ lat, lng });
      },
      () => setGeoError('No fue posible acceder a tu ubicación. Puedes marcarla manualmente en el mapa.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function clearLocation() {
    if (markerRef.current && mapRef.current) {
      markerRef.current.removeFrom(mapRef.current);
      markerRef.current = null;
    }
    onChange(null);
  }

  return (
    <div className="mt-4">
      <div ref={elementRef} className="h-[340px] w-full overflow-hidden rounded-xl border-2 border-[#b4c4ec] bg-[#c8e1f2]" aria-label="Mapa de OpenStreetMap para seleccionar ubicación" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={useMyLocation} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#173462]">Usar mi ubicación</button>
        {value && <button type="button" onClick={clearLocation} className="rounded-lg border border-white/50 px-3 py-2 text-sm font-bold text-white">Limpiar ubicación</button>}
      </div>
      <p className="mt-2 text-sm text-[#e9efff]">
        {value ? `Ubicación seleccionada: ${value.lat}, ${value.lng}` : 'La ubicación en el mapa es opcional.'}
      </p>
      {geoError && <p className="mt-2 text-sm font-semibold text-[#ffd8d8]">{geoError}</p>}
    </div>
  );
}
