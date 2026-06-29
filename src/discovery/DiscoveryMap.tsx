import { useState } from 'react'
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import type { LatLng } from '../lib/distance.ts'
import { haversineMeters } from '../lib/distance.ts'
import type { DiscoveryPlace } from '../lib/discovery.ts'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
// Show "Search this area" once the map has been panned this far from the
// center the current results are around.
const SEARCH_HERE_THRESHOLD_M = 1_000

/** Map view of the discovery results (PRD §7 F1, §9). Renders the same
 *  `shown` set the list uses — no extra Nearby Search. Pan the map and a
 *  "Search this area" button re-runs the search around the new center
 *  (PRD §11.2 Q10). Tap a pin → place detail. Classic Marker (no Map ID). */
export function DiscoveryMap({
  origin,
  searchCenter,
  places,
  onSelect,
  onSearchHere,
}: {
  origin: LatLng
  searchCenter: LatLng
  places: DiscoveryPlace[]
  onSelect: (placeId: string) => void
  onSearchHere: (center: LatLng) => void
}) {
  const [mapCenter, setMapCenter] = useState<LatLng>(searchCenter)
  const moved = haversineMeters(mapCenter, searchCenter) > SEARCH_HERE_THRESHOLD_M

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl">
      <APIProvider apiKey={MAPS_KEY}>
        <Map
          defaultCenter={{ lat: searchCenter.latitude, lng: searchCenter.longitude }}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI
          colorScheme="DARK"
          style={{ width: '100%', height: '100%' }}
          onCameraChanged={(ev) =>
            setMapCenter({
              latitude: ev.detail.center.lat,
              longitude: ev.detail.center.lng,
            })
          }
        >
          <Marker
            position={{ lat: origin.latitude, lng: origin.longitude }}
            title="You"
          />
          {places.map((d) => (
            <Marker
              key={d.place.id}
              position={{
                lat: d.place.location.latitude,
                lng: d.place.location.longitude,
              }}
              title={d.place.name}
              onClick={() => onSelect(d.place.id)}
            />
          ))}
        </Map>
      </APIProvider>

      {moved && (
        <button
          type="button"
          onClick={() => onSearchHere(mapCenter)}
          className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 shadow-lg"
        >
          🔍 Search this area
        </button>
      )}
    </div>
  )
}
