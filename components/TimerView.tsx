import React, { useState, useEffect, useRef } from 'react';
import { Coordinate, Lap, Track } from '../types';
import { getDistance, formatSpeed, formatTime } from '../services/locationService';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { MOTOGP_TRACKS } from '../data/tracks';

interface TimerViewProps {
  currentLocation: Coordinate | null;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  startFinishLine: Coordinate | null;
  setStartFinishLine: (coords: Coordinate | null) => void;
  laps: Lap[];
  setLaps: React.Dispatch<React.SetStateAction<Lap[]>>;
  currentSessionPath: Coordinate[];
}

const TimerView: React.FC<TimerViewProps> = ({
  currentLocation,
  isRecording,
  setIsRecording,
  startFinishLine,
  setStartFinishLine,
  laps,
  setLaps,
  currentSessionPath
}) => {
  const [currentLapStart, setCurrentLapStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [lastCrossTime, setLastCrossTime] = useState<number>(0);
  const [showTrackSelector, setShowTrackSelector] = useState(false);
  const requestRef = useRef<number>();

  // Lap Detection Settings
  const [showSettings, setShowSettings] = useState(false);
  const [detectionRadius, setDetectionRadius] = useState<number>(25); // meters
  const [minLapTime, setMinLapTime] = useState<number>(20); // seconds

  // Timer animation loop
  const animate = (time: number) => {
    if (isRecording && currentLapStart) {
      setElapsed(Date.now() - currentLapStart);
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [isRecording, currentLapStart]);

  // Lap detection logic
  useEffect(() => {
    if (!isRecording || !currentLocation || !startFinishLine) return;

    const dist = getDistance(currentLocation, startFinishLine);
    const now = Date.now();

    // Logic: distance < detectionRadius AND time > minLapTime
    // This prevents false positives (double triggers) and drift while in pits/near line
    if (dist < detectionRadius && (now - lastCrossTime) > (minLapTime * 1000)) {
      if (currentLapStart) {
        // Finish lap
        const lapTime = now - currentLapStart;
        const newLap: Lap = {
          number: laps.length + 1,
          time: lapTime,
          startTime: currentLapStart,
          endTime: now,
          maxSpeed: 0 // Placeholder, could calculate real max from path history
        };
        setLaps(prev => [...prev, newLap]);
        // Start new lap
        setCurrentLapStart(now);
        setLastCrossTime(now);
      } else {
        // First crossing (Start of Lap 1)
        setCurrentLapStart(now);
        setLastCrossTime(now);
      }
    }
  }, [currentLocation, isRecording, startFinishLine, currentLapStart, lastCrossTime, laps.length, setLaps, detectionRadius, minLapTime]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setCurrentLapStart(null);
      setElapsed(0);
    } else {
      setIsRecording(true);
      // If we have a line, we wait to cross it. If not, we might start immediately or ask to set line.
      // For simplicity here: if line exists, wait for cross. If no line, set line now and start.
      if (!startFinishLine && currentLocation) {
        setStartFinishLine(currentLocation);
        setCurrentLapStart(Date.now());
        setLastCrossTime(Date.now());
      } else if (startFinishLine) {
        // Wait for crossing logic to trigger start. 
        // We set lastCrossTime to a value that allows immediate trigger if close, 
        // minus the debounce time so it doesn't block immediate start if starting ON the line.
        setLastCrossTime(Date.now() - (minLapTime * 1000) - 1000); 
      }
    }
  };

  const handleTrackSelect = (track: Track) => {
    setStartFinishLine({
      latitude: track.startFinishLine.latitude,
      longitude: track.startFinishLine.longitude,
      accuracy: 0,
      timestamp: Date.now(),
      speed: 0
    });
    setShowTrackSelector(false);
  };

  const currentSpeed = currentLocation?.speed ?? 0;
  // Create a small history for the graph
  const speedHistory = currentSessionPath.slice(-30).map((c, i) => ({
    time: i,
    speed: (c.speed || 0) * 3.6 // kph
  }));

  // Calculate distance to line for display
  const distanceToLine = (currentLocation && startFinishLine) 
    ? getDistance(currentLocation, startFinishLine) 
    : null;

  return (
    <div className="flex flex-col h-full space-y-4 p-4 relative">
      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center animate-fade-in">
           <div className="bg-racing-card w-full max-w-sm rounded-xl border border-gray-700 p-6 space-y-6">
             <div className="flex justify-between items-center border-b border-gray-700 pb-4">
               <h2 className="text-xl font-display text-white">SETTINGS</h2>
               <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>

             <div className="space-y-4">
               <div>
                 <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-gray-400 uppercase">Detection Radius</label>
                    <span className="text-racing-yellow font-mono">{detectionRadius}m</span>
                 </div>
                 <input 
                    type="range" 
                    min="5" 
                    max="100" 
                    value={detectionRadius} 
                    onChange={(e) => setDetectionRadius(parseInt(e.target.value))}
                    className="w-full accent-racing-red h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                 />
                 <p className="text-xs text-gray-500 mt-1">Distance to line to trigger lap.</p>
               </div>

               <div>
                 <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-gray-400 uppercase">Min Lap Time</label>
                    <span className="text-racing-yellow font-mono">{minLapTime}s</span>
                 </div>
                 <input 
                    type="range" 
                    min="5" 
                    max="120" 
                    value={minLapTime} 
                    onChange={(e) => setMinLapTime(parseInt(e.target.value))}
                    className="w-full accent-racing-red h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                 />
                 <p className="text-xs text-gray-500 mt-1">Minimum time between laps (debounce).</p>
               </div>
             </div>

             <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-racing-green text-black font-bold py-3 rounded-lg uppercase"
             >
               Save
             </button>
           </div>
        </div>
      )}

      {/* Track Selector Modal */}
      {showTrackSelector && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm p-4 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-display text-white">SELECT TRACK</h2>
             <button onClick={() => setShowTrackSelector(false)} className="text-gray-400 p-2">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
          </div>
          <div className="overflow-y-auto space-y-2 no-scrollbar pb-safe">
            {MOTOGP_TRACKS.map(track => (
              <button
                key={track.id}
                onClick={() => handleTrackSelect(track)}
                className="w-full bg-racing-card p-4 rounded-xl border border-gray-800 flex items-center justify-between hover:border-racing-red transition-colors text-left"
              >
                <div>
                  <div className="font-bold text-white text-lg">{track.name}</div>
                  <div className="text-sm text-gray-500">{track.location}</div>
                </div>
                <div className="text-2xl">{track.flag}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top Status Bar */}
      <div className="flex justify-between items-center bg-racing-card p-3 rounded-lg border border-gray-800">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${currentLocation ? 'bg-racing-green' : 'bg-racing-red'} animate-pulse`} />
          <span className="text-xs text-gray-400 font-mono">GPS: {currentLocation?.accuracy.toFixed(1) || '--'}m</span>
        </div>
        <div className="flex items-center space-x-3">
             {startFinishLine ? (
                <div className="flex items-center bg-racing-yellow/10 px-3 py-1.5 rounded-lg border border-racing-yellow/30 shadow-[0_0_10px_rgba(255,204,0,0.1)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-racing-yellow mr-2" viewBox="0 0 24 24" fill="currentColor">
                         <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V21a1 1 0 11-2 0V4zm9 1a1 1 0 110-2h8a1 1 0 011 1v12a1 1 0 01-1 1h-6.586l-2.293 2.293a1 1 0 01-1.414-1.414L12.586 16H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 011.414-1.414L14.414 13H19V5h-7z" clipRule="evenodd"/>
                    </svg>
                    <div className="flex flex-col leading-none">
                         <span className="text-[10px] font-bold text-racing-yellow uppercase tracking-wider">Line Set</span>
                         {distanceToLine !== null && (
                            <span className="text-xs font-mono text-white">
                                {distanceToLine < 1000 
                                    ? `${distanceToLine.toFixed(0)}m away` 
                                    : `${(distanceToLine/1000).toFixed(1)}km away`}
                            </span>
                         )}
                    </div>
                </div>
             ) : (
                <div className="flex items-center px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/50">
                     <span className="text-xs text-gray-500 font-bold tracking-wider">NO LINE</span>
                </div>
             )}
            <button onClick={() => setShowSettings(true)} className="p-2 text-gray-400 hover:text-white bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="flex-grow flex flex-col items-center justify-center space-y-2 py-8">
        <div className="text-racing-yellow text-xl font-display uppercase tracking-widest">
          {currentLapStart ? `LAP ${laps.length + 1}` : "READY"}
        </div>
        <div className="text-7xl font-display text-white tracking-tighter tabular-nums">
          {formatTime(elapsed)}
        </div>
        <div className="text-gray-500 text-sm font-mono">
          LAST: {laps.length > 0 ? formatTime(laps[laps.length - 1].time) : "--:--.--"}
        </div>
      </div>

      {/* Speed & Graph */}
      <div className="h-48 bg-racing-card rounded-xl border border-gray-800 relative overflow-hidden">
        <div className="absolute top-4 left-4 z-10">
          <div className="text-4xl font-display text-white">{formatSpeed(currentSpeed, 'kph')}</div>
          <div className="text-xs text-gray-400">KPH</div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={speedHistory}>
            <defs>
              <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#FF3B30" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <YAxis hide domain={[0, 200]} />
            <Area type="monotone" dataKey="speed" stroke="#FF3B30" strokeWidth={3} fillOpacity={1} fill="url(#colorSpeed)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 mt-auto">
        <div className="flex space-x-2">
            <button
            onClick={() => {
                if (currentLocation) setStartFinishLine(currentLocation);
            }}
            disabled={isRecording || !currentLocation}
            className="flex-1 bg-gray-800 active:bg-gray-700 text-white font-bold text-sm py-4 rounded-xl border border-gray-700 transition-colors disabled:opacity-50 flex flex-col items-center justify-center leading-none"
            >
            <span>SET</span>
            <span className="text-[10px] text-gray-400 mt-1">GPS</span>
            </button>
            
            <button
            onClick={() => setShowTrackSelector(true)}
            disabled={isRecording}
            className="flex-1 bg-gray-800 active:bg-gray-700 text-white font-bold text-sm py-4 rounded-xl border border-gray-700 transition-colors disabled:opacity-50 flex flex-col items-center justify-center leading-none"
            >
            <span>LOAD</span>
            <span className="text-[10px] text-gray-400 mt-1">TRACK</span>
            </button>
        </div>

        <button
          onClick={toggleRecording}
          className={`${isRecording ? 'bg-racing-red animate-pulse' : 'bg-racing-green'} text-black font-display text-xl uppercase py-4 rounded-xl transition-all shadow-lg shadow-white/10`}
        >
          {isRecording ? "STOP" : "START"}
        </button>
      </div>
    </div>
  );
};

export default TimerView;