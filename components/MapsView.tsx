import React, { useMemo } from 'react';
import { Coordinate } from '../types';
import { RideInfo } from '../App';
import { MOTOGP_TRACKS } from '../data/tracks';
import { getDistance } from '../services/locationService';

interface MapsViewProps {
  currentLocation: Coordinate | null;
  selectedRide: RideInfo | null;
  setSelectedRide: (ride: RideInfo | null) => void;
}

const MapsView: React.FC<MapsViewProps> = ({ currentLocation, selectedRide }) => {

  const tracksWithDistance = useMemo(() => {
    return MOTOGP_TRACKS.map(track => {
      const dist = currentLocation
        ? getDistance(currentLocation, {
            latitude:  track.startFinishLine.latitude,
            longitude: track.startFinishLine.longitude,
            accuracy: 0, timestamp: 0, speed: 0,
          })
        : null;
      return { ...track, dist };
    }).sort((a, b) => {
      if (a.dist === null) return 1;
      if (b.dist === null) return -1;
      return a.dist - b.dist;
    });
  }, [currentLocation]);

  const fmt = (m: number | null) => {
    if (m === null) return '---';
    if (m < 1000) return `${m.toFixed(0)} m`;
    return `${(m / 1000).toFixed(0)} km`;
  };

  return (
    <div className="flex flex-col h-full bg-racing-dark">
      {/* Header */}
      <div className="h-[3px] bg-gradient-to-r from-racing-red via-racing-orange to-transparent" />
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <p className="text-[9px] font-black tracking-[0.25em] text-racing-red uppercase">MotoGP Circuits</p>
        <h2 className="text-lg font-display text-white uppercase italic leading-none">Pit Wall</h2>
        {selectedRide && (
          <p className="text-[9px] font-black text-white/40 uppercase mt-0.5">
            {selectedRide.year} {selectedRide.brand} {selectedRide.model}
          </p>
        )}
      </div>

      {!currentLocation && (
        <div className="mx-4 mt-4 carbon border border-racing-yellow/30 px-4 py-3 flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-racing-yellow animate-pulse" />
          <p className="text-[10px] font-black text-racing-yellow uppercase tracking-widest">Waiting for GPS lock…</p>
        </div>
      )}

      <div className="flex-grow overflow-y-auto no-scrollbar pb-4">
        {tracksWithDistance.map((track, i) => {
          const nearest = i === 0 && track.dist !== null;
          return (
            <div
              key={track.id}
              className={`carbon border-b border-white/5 px-4 py-3.5 flex items-center justify-between
                ${nearest ? 'border-l-2 border-l-racing-red' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-gray-700 w-4 tabular-nums">{i + 1}</span>
                <div className="w-px h-8 bg-white/5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white uppercase tracking-tight leading-none">
                      {track.name}
                    </span>
                    {nearest && (
                      <span className="text-[7px] font-black bg-racing-red text-white px-1.5 py-0.5 uppercase tracking-wider">
                        NEAREST
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-base">{track.flag}</span>
                    <span className="text-[9px] font-bold text-gray-500 uppercase">{track.location}</span>
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-mono font-black tabular-nums ${nearest ? 'text-racing-red' : 'text-gray-400'}`}>
                  {fmt(track.dist)}
                </p>
                {track.dist !== null && (
                  <p className="text-[8px] font-bold text-gray-700 uppercase">from you</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MapsView;
