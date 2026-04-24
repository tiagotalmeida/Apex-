export interface Coordinate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed: number | null; // meters per second
  heading?: number | null; // degrees clockwise from North
}

export interface Lap {
  number: number;
  time: number; // milliseconds
  startTime: number;
  endTime: number;
  maxSpeed: number; // m/s
}

export interface SessionData {
  id: string;
  date: string;
  laps: Lap[];
  path: Coordinate[];
  startFinishLine: Coordinate | null;
  motorcycle?: {
    brand: string;
    model: string;
    year: string;
  };
  trackName?: string;
}

export enum AppTab {
  TIMER    = 'TIMER',
  ANALYSIS = 'ANALYSIS',
  GARAGE   = 'GARAGE',
  MAPS     = 'MAPS',
}

export interface Track {
  id: string;
  name: string;
  location: string;
  flag: string;
  startFinishLine: {
    latitude: number;
    longitude: number;
  };
}