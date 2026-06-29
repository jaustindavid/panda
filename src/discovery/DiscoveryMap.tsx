import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import type { LatLng } from '../lib/distance.ts'
import type { DiscoveryPlace } from '../lib/discovery.ts'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

/** Map view of the discovery results (PRD §7 F1, §9). Renders the same
 *  `shown` set the list uses — no extra Nearby Search. Lazy: the Maps JS API
 *  only loads when this mounts (i.e. when the user opens the map). Tap a pin
 *  → place detail. Uses the classic Marker (no Map ID needed). */
export function DiscoveryMap({
  origin,
  places,
  onSelect,
}: {
  origin: LatLng
  places: DiscoveryPlace[]
  onSelect: (placeId: string) => void
}) {
  const center = { lat: origin.latitude, lng: origin.longitude }
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-xl">
      <APIProvider apiKey={MAPS_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI
          colorScheme="DARK"
          style={{ width: '100%', height: '100%' }}
        >
          <Marker position={center} title="You" />
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
    </div>
  )
}
