export interface Coordinate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed: number | null; // meters per second
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
}

export enum AppTab {
  TIMER = 'TIMER',
  ANALYSIS = 'ANALYSIS',
  GARAGE = 'GARAGE', // Image Editing
  MAPS = 'MAPS' // Nearby Services
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        content: string;
      }[];
    }[];
  };
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