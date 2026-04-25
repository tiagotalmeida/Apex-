import React, { useMemo } from 'react';
import { Coordinate } from '../types';
import { RideInfo } from '../App';
import { MOTOGP_TRACKS } from '../data/tracks';
import { getDistance } from '../services/locationService';
import { PinIcon } from './Icons';

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
    if (m === null) return '—';
    if (m < 1000) return `${m.toFixed(0)} m`;
    return `${(m / 1000).toFixed(0)} km`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 flex-shrink-0">
        <p className="label-sm text-racing-red mb-1">MotoGP Circuits</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Pit Wall</h1>
        {selectedRide && (
          <p className="text-sm text-slate-400 font-semibold mt-1">
            {selectedRide.year} {selectedRide.brand} {selectedRide.model}
          </p>
        )}
      </div>

      {!currentLocation && (
        <div className="mx-5 mb-3 rounded-2xl bg-racing-yellow/10 border border-racing-yellow/30 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-racing-yellow animate-pulse" />
          <p className="text-sm font-bold text-racing-yellow">Waiting for GPS lock…</p>
        </div>
      )}

      <div className="flex-grow overflow-y-auto no-scrollbar px-5 pb-8 space-y-2">
        {tracksWithDistance.map((track, i) => {
          const nearest = i === 0 && track.dist !== null;
          return (
            <div
              key={track.id}
              className={`relative rounded-2xl px-4 py-3.5 flex items-center justify-between overflow-hidden
                ${nearest ? 'surface-elevated' : 'surface-card'}`}
            >
              {nearest && <div className="absolute inset-0 grad-accent-soft pointer-events-none" />}
              <div className="relative flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">{track.flag}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-white truncate">{track.name}</span>
                    {nearest && (
                      <span className="text-[9px] font-bold rounded-full bg-racing-red text-white px-2 py-0.5 uppercase tracking-wider flex-shrink-0">
                        Nearest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <PinIcon className="w-3 h-3 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-400 truncate">{track.location}</span>
                  </div>
                </div>
              </div>

              <div className="relative text-right flex-shrink-0 ml-3">
                <p className={`timer-digit text-[15px] tabular-nums ${nearest ? 'text-racing-red' : 'text-slate-200'}`}>
                  {fmt(track.dist)}
                </p>
                {track.dist !== null && (
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Away</p>
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
