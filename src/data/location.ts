// Kartlenker – åpner kart-APPEN på telefonen (ingen innebygd iframe:
// null eksterne forespørsler fra siden selv, CSP forblir 'self').
// Søkebasert spørring er robust uten hardkodede koordinater.
const MAP_QUERY = encodeURIComponent('Vensmoen, Røkland, Saltdal');

export interface MapLink {
  /** Merkenavn – oversettes ikke */
  name: string;
  href: string;
}

export const mapLinks: MapLink[] = [
  {
    name: 'Google Maps',
    href: `https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`,
  },
  {
    name: 'Apple Maps',
    href: `https://maps.apple.com/?q=${MAP_QUERY}`,
  },
];
