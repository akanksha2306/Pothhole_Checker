/**
 * Reverse geocoding (coords -> street name) via OpenStreetMap Nominatim.
 *
 * Best-effort by design: streetName is a nice-to-have, so ANY failure — network,
 * timeout, rate limit, unexpected payload — degrades to null and never throws.
 * Nominatim's usage policy requires a descriptive User-Agent.
 *
 * https://operations.osmfoundation.org/policies/nominatim/
 */
import { z } from 'zod';

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const TIMEOUT_MS = 3_000;
const USER_AGENT = 'PotholeWatch/0.1 (development)';

const nominatimResponseSchema = z.object({
  address: z
    .object({
      road: z.string().min(1).optional(),
      pedestrian: z.string().min(1).optional(),
      neighbourhood: z.string().min(1).optional(),
      suburb: z.string().min(1).optional(),
    })
    .optional(),
});

export class GeocodeService {
  /** Returns "road" (falling back to suburb-level names), or null on any failure. */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const url = new URL(NOMINATIM_REVERSE_URL);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', latitude.toFixed(6));
      url.searchParams.set('lon', longitude.toFixed(6));

      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        console.warn(`[geocode] Nominatim responded ${response.status} — skipping street name`);
        return null;
      }

      const payload: unknown = await response.json();
      const parsed = nominatimResponseSchema.parse(payload);
      const address = parsed.address;

      return address?.road ?? address?.pedestrian ?? address?.suburb ?? address?.neighbourhood ?? null;
    } catch (error) {
      console.warn(
        '[geocode] reverse geocode failed — skipping street name:',
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }
}

/** Singleton; stateless. */
export const geocodeService = new GeocodeService();
