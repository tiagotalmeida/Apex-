import { Track } from "../types";

export const MOTOGP_TRACKS: Track[] = [
  {
    id: 'mugello',
    name: 'Mugello Circuit',
    location: 'Italy',
    flag: '🇮🇹',
    startFinishLine: { latitude: 43.996160, longitude: 11.371457 }
  },
  {
    id: 'catalunya',
    name: 'Circuit de Barcelona-Catalunya',
    location: 'Spain',
    flag: '🇪🇸',
    startFinishLine: { latitude: 41.565187, longitude: 2.256860 }
  },
  {
     id: 'cota',
     name: 'Circuit of the Americas',
     location: 'USA',
     flag: '🇺🇸',
     startFinishLine: { latitude: 30.132800, longitude: -97.642457 }
  },
  {
      id: 'silverstone',
      name: 'Silverstone Circuit',
      location: 'UK',
      flag: '🇬🇧',
      startFinishLine: { latitude: 52.069273, longitude: -1.022066 }
  },
  {
      id: 'sepang',
      name: 'Sepang International Circuit',
      location: 'Malaysia',
      flag: '🇲🇾',
      startFinishLine: { latitude: 2.760527, longitude: 101.737189 }
  },
  {
      id: 'phillip_island',
      name: 'Phillip Island',
      location: 'Australia',
      flag: '🇦🇺',
      startFinishLine: { latitude: -38.500755, longitude: 145.241556 }
  },
  {
      id: 'jerez',
      name: 'Circuito de Jerez',
      location: 'Spain',
      flag: '🇪🇸',
      startFinishLine: { latitude: 36.706173, longitude: -6.029671 }
  },
  {
      id: 'assen',
      name: 'TT Circuit Assen',
      location: 'Netherlands',
      flag: '🇳🇱',
      startFinishLine: { latitude: 52.956793, longitude: 6.524450 }
  }
];