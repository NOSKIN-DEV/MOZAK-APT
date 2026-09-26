/**
 * Lugar físico (recinto) donde se realiza un evento.
 */
export interface Venue {
  id: string;
  name: string;
  address: string;
  commune: string;
  city: string;
  latitude: number;
  longitude: number;
}
