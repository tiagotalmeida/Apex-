import { Coordinate } from "../types";

/**
 * Calculates distance between two coordinates in meters using Haversine formula.
 */
export const getDistance = (c1: Coordinate, c2: Coordinate): number => {
  const R = 6371e3; // metres
  const φ1 = (c1.latitude * Math.PI) / 180;
  const φ2 = (c2.latitude * Math.PI) / 180;
  const Δφ = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const Δλ = ((c2.longitude - c1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Formats speed from m/s to km/h or mph
 */
export const formatSpeed = (speedMps: number | null, unit: 'kph' | 'mph' = 'kph'): string => {
  if (speedMps === null) return '--';
  const val = unit === 'kph' ? speedMps * 3.6 : speedMps * 2.23694;
  return val.toFixed(0);
};

/**
 * Formats time in mm:ss.ms
 */
export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((ms % 1000) / 10); // Display 2 digits

  const m = minutes.toString().padStart(2, '0');
  const s = seconds.toString().padStart(2, '0');
  const mi = millis.toString().padStart(2, '0');

  return `${m}:${s}.${mi}`;
};