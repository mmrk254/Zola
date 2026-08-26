/* Minimal Google Maps types for the hospital picker map. */
declare namespace google.maps {
  class Map {
    constructor(el: HTMLElement, opts?: object);
    fitBounds(bounds: LatLngBounds, padding?: number): void;
    setCenter(latLng: LatLngLiteral): void;
    setZoom(zoom: number): void;
  }
  class Marker {
    constructor(opts?: object);
    setMap(map: Map | null): void;
    addListener(event: string, handler: () => void): void;
  }
  class LatLngBounds {
    extend(latLng: LatLngLiteral): void;
  }
  class InfoWindow {
    constructor(opts?: object);
    open(opts: object): void;
    close(): void;
  }
  class DirectionsService {
    route(request: object, callback: (result: DirectionsResult | null, status: string) => void): void;
  }
  class DirectionsRenderer {
    constructor(opts?: object);
    setMap(map: Map | null): void;
    setDirections(result: DirectionsResult): void;
  }
  interface DirectionsResult { routes: Array<{ legs: Array<{ duration?: { text: string }; distance?: { text: string } }> }>; }
  enum TravelMode { DRIVING }
  enum SymbolPath {
    CIRCLE
  }
  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
}

declare const google: { maps: typeof google.maps };
