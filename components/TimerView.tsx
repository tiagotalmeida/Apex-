import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Coordinate, Lap, Track } from '../types';
import { getDistance, formatSpeed, formatTime } from '../services/locationService';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { MOTOGP_TRACKS } from '../data/tracks';
import { fetchWeather, WeatherData } from '../services/weatherService';
import TrackMap from './TrackMap';
import { RideInfo } from '../App';

interface TimerViewProps {
  currentLocation: Coordinate | null;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  startFinishLine: Coordinate | null;
  setStartFinishLine: (coords: Coordinate | null) => void;
  laps: Lap[];
  setLaps: React.Dispatch<React.SetStateAction<Lap[]>>;
  currentSessionPath: Coordinate[];
  selectedRide: RideInfo | null;
}

const TimerView: React.FC<TimerViewProps> = ({
  currentLocation,
  isRecording,
  setIsRecording,
  startFinishLine,
  setStartFinishLine,
  laps,
  setLaps,
  currentSessionPath,
  selectedRide
}) => {
  const [currentLapStart, setCurrentLapStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [lastCrossTime, setLastCrossTime] = useState<number>(0);
  const [showTrackSelector, setShowTrackSelector] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const requestRef = useRef<number>(0);

  // Lap Detection Settings
  const [showSettings, setShowSettings] = useState(false);
  const [detectionRadius, setDetectionRadius] = useState<number>(25); // meters
  const [minLapTime, setMinLapTime] = useState<number>(20); // seconds

  // Auto Start/Stop Settings
  const [autoMode, setAutoMode] = useState<boolean>(false);
  const [autoStartSpeed, setAutoStartSpeed] = useState<number>(10); // kph
  const [autoStopSpeed, setAutoStopSpeed] = useState<number>(5); // kph
  const [autoStartDelay, setAutoStartDelay] = useState<number>(2); // seconds
  const [autoStopDelay, setAutoStopDelay] = useState<number>(5); // seconds

  // Timers for auto-logic
  const startThresholdTimer = useRef<number | null>(null);
  const stopThresholdTimer = useRef<number | null>(null);

  // Session Stats Calculations
  const sessionStats = useMemo(() => {
    const fastestLap = laps.length > 0 ? Math.min(...laps.map(l => l.time)) : null;
    const maxSpeedMps = currentSessionPath.length > 0 
      ? Math.max(...currentSessionPath.map(c => c.speed || 0)) 
      : 0;
    return { fastestLap, maxSpeedMps };
  }, [laps, currentSessionPath]);

  // Track new fastest lap for UI feedback
  useEffect(() => {
    if (laps.length > 0) {
      const lastLap = laps[laps.length - 1];
      const otherLaps = laps.slice(0, -1);
      const previousBest = otherLaps.length > 0 ? Math.min(...otherLaps.map(l => l.time)) : Infinity;
      
      if (lastLap.time < previousBest) {
        setIsNewBest(true);
        const timer = setTimeout(() => setIsNewBest(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [laps]);

  // Fetch weather when location changes significantly or on mount
  useEffect(() => {
    if (currentLocation && !weather) {
      fetchWeather(currentLocation.latitude, currentLocation.longitude)
        .then(setWeather)
        .catch(console.error);
    }
  }, [currentLocation, weather]);

  // Timer animation loop
  const animate = (time: number) => {
    if (isRecording && currentLapStart) {
      setElapsed(Date.now() - currentLapStart);
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRecording, currentLapStart]);

  // Auto Start / Stop Logic
  useEffect(() => {
    if (!autoMode || !currentLocation) return;

    const speedKph = (currentLocation.speed || 0) * 3.6;

    if (!isRecording) {
      // Logic for Auto Start
      if (speedKph >= autoStartSpeed) {
        if (!startThresholdTimer.current) {
          startThresholdTimer.current = Date.now();
        } else if (Date.now() - startThresholdTimer.current >= autoStartDelay * 1000) {
          startRecording();
          startThresholdTimer.current = null;
        }
      } else {
        startThresholdTimer.current = null;
      }
    } else {
      // Logic for Auto Stop
      if (speedKph <= autoStopSpeed) {
        if (!stopThresholdTimer.current) {
          stopThresholdTimer.current = Date.now();
        } else if (Date.now() - stopThresholdTimer.current >= autoStopDelay * 1000) {
          stopRecording();
          stopThresholdTimer.current = null;
        }
      } else {
        stopThresholdTimer.current = null;
      }
    }
  }, [currentLocation, autoMode, isRecording, autoStartSpeed, autoStopSpeed, autoStartDelay, autoStopDelay]);

  // Lap detection logic
  useEffect(() => {
    if (!isRecording || !currentLocation || !startFinishLine) return;

    const dist = getDistance(currentLocation, startFinishLine);
    const now = Date.now();

    if (dist < detectionRadius && (now - lastCrossTime) > (minLapTime * 1000)) {
      if (currentLapStart) {
        const lapTime = now - currentLapStart;
        
        const lapCoords = currentSessionPath.filter(c => c.timestamp >= currentLapStart && c.timestamp <= now);
        const lapMaxSpeed = lapCoords.length > 0 ? Math.max(...lapCoords.map(c => c.speed || 0)) : 0;

        const newLap: Lap = {
          number: laps.length + 1,
          time: lapTime,
          startTime: currentLapStart,
          endTime: now,
          maxSpeed: lapMaxSpeed
        };
        setLaps(prev => [...prev, newLap]);
        setCurrentLapStart(now);
        setLastCrossTime(now);
      } else {
        setCurrentLapStart(now);
        setLastCrossTime(now);
      }
    }
  }, [currentLocation, isRecording, startFinishLine, currentLapStart, lastCrossTime, laps.length, setLaps, detectionRadius, minLapTime, currentSessionPath]);

  const startRecording = () => {
    setIsRecording(true);
    if (!startFinishLine && currentLocation) {
      setStartFinishLine(currentLocation);
      setCurrentLapStart(Date.now());
      setLastCrossTime(Date.now());
    } else if (startFinishLine) {
      // Arm for next crossing if not immediate
      setLastCrossTime(Date.now() - (minLapTime * 1000) - 1000); 
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setCurrentLapStart(null);
    setElapsed(0);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
  const speedHistory = currentSessionPath.slice(-30).map((c, i) => ({
    time: i,
    speed: (c.speed || 0) * 3.6
  }));

  const distanceToLine = (currentLocation && startFinishLine) 
    ? getDistance(currentLocation, startFinishLine) 
    : null;

  const isNearLine = distanceToLine !== null && distanceToLine < detectionRadius;

  return (
    <div className="flex flex-col h-full space-y-4 p-4 relative">
      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm p-4 flex flex-col items-center justify-center animate-fade-in">
           <div className="bg-racing-card w-full max-w-sm rounded-xl border border-gray-700 p-6 space-y-6 overflow-y-auto no-scrollbar">
             <div className="flex justify-between items-center border-b border-gray-700 pb-4 sticky top-0 bg-racing-card z-10">
               <h2 className="text-xl font-display text-white">SETTINGS</h2>
               <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             
             <div className="space-y-6">
               <section>
                 <h3 className="text-xs font-bold text-racing-red uppercase tracking-widest mb-4">Lap Detection</h3>
                 <div className="space-y-4">
                   <div>
                     <div className="flex justify-between mb-2">
                        <label className="text-sm font-bold text-gray-400 uppercase">Detection Radius</label>
                        <span className="text-racing-yellow font-mono">{detectionRadius}m</span>
                     </div>
                     <input type="range" min="5" max="100" value={detectionRadius} onChange={(e) => setDetectionRadius(parseInt(e.target.value))} className="w-full accent-racing-red h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                   </div>
                   <div>
                     <div className="flex justify-between mb-2">
                        <label className="text-sm font-bold text-gray-400 uppercase">Min Lap Time</label>
                        <span className="text-racing-yellow font-mono">{minLapTime}s</span>
                     </div>
                     <input type="range" min="5" max="120" value={minLapTime} onChange={(e) => setMinLapTime(parseInt(e.target.value))} className="w-full accent-racing-red h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                   </div>
                 </div>
               </section>

               <section className="border-t border-gray-800 pt-6">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-xs font-bold text-racing-green uppercase tracking-widest">Auto Recording</h3>
                   <button 
                    onClick={() => setAutoMode(!autoMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoMode ? 'bg-racing-green' : 'bg-gray-700'}`}
                   >
                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoMode ? 'translate-x-6' : 'translate-x-1'}`} />
                   </button>
                 </div>
                 
                 {autoMode && (
                   <div className="space-y-4 animate-fade-in">
                     <div>
                       <div className="flex justify-between mb-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Start Threshold</label>
                          <span className="text-racing-yellow font-mono text-xs">{autoStartSpeed} KPH / {autoStartDelay}s</span>
                       </div>
                       <input type="range" min="5" max="50" step="5" value={autoStartSpeed} onChange={(e) => setAutoStartSpeed(parseInt(e.target.value))} className="w-full accent-racing-green h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-2" />
                       <input type="range" min="1" max="10" step="1" value={autoStartDelay} onChange={(e) => setAutoStartDelay(parseInt(e.target.value))} className="w-full accent-racing-green h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                     </div>
                     <div>
                       <div className="flex justify-between mb-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Stop Threshold</label>
                          <span className="text-racing-yellow font-mono text-xs">{autoStopSpeed} KPH / {autoStopDelay}s</span>
                       </div>
                       <input type="range" min="0" max="30" step="5" value={autoStopSpeed} onChange={(e) => setAutoStopSpeed(parseInt(e.target.value))} className="w-full accent-racing-red h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-2" />
                       <input type="range" min="2" max="30" step="1" value={autoStopDelay} onChange={(e) => setAutoStopDelay(parseInt(e.target.value))} className="w-full accent-racing-red h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                     </div>
                   </div>
                 )}
               </section>
             </div>
             
             <button onClick={() => setShowSettings(false)} className="w-full bg-racing-green text-black font-bold py-3 rounded-lg uppercase mt-4">Save</button>
           </div>
        </div>
      )}

      {/* Track Selector Modal */}
      {showTrackSelector && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm p-4 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-display text-white">SELECT TRACK</h2>
             <button onClick={() => setShowTrackSelector(false)} className="text-gray-400 p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="overflow-y-auto space-y-2 no-scrollbar pb-safe">
            {MOTOGP_TRACKS.map(track => (
              <button key={track.id} onClick={() => handleTrackSelect(track)} className="w-full bg-racing-card p-4 rounded-xl border border-gray-800 flex items-center justify-between hover:border-racing-red transition-colors text-left">
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
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
                <div className={`w-2 h-2 rounded-full ${currentLocation ? 'bg-racing-green' : 'bg-racing-red'} animate-pulse`} />
                <span className="text-[10px] text-gray-400 font-mono uppercase">GPS: {currentLocation?.accuracy.toFixed(0) || '--'}m</span>
            </div>
            {weather && (
              <div className="flex items-center space-x-1 mt-0.5">
                <span className="text-sm">{weather.icon}</span>
                <span className="text-[10px] font-bold text-white font-mono">{weather.temp.toFixed(0)}°C</span>
              </div>
            )}
          </div>
          {selectedRide && (
            <div className="hidden xs:flex flex-col border-l border-gray-700 pl-3">
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Active Ride</span>
              <span className="text-[10px] text-racing-purple font-black uppercase truncate max-w-[80px]">
                {selectedRide.brand} {selectedRide.model}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
             {autoMode && (
               <div className="flex items-center bg-racing-green/10 px-2 py-1 rounded border border-racing-green/30">
                 <span className="text-[8px] font-black text-racing-green uppercase tracking-tighter">Auto</span>
               </div>
             )}
             {startFinishLine ? (
                <div className={`flex items-center px-3 py-1.5 rounded-lg border transition-all duration-300 ${isNearLine ? 'bg-racing-green/20 border-racing-green shadow-[0_0_15px_rgba(52,199,89,0.3)] animate-pulse' : 'bg-racing-yellow/10 border-racing-yellow/30 shadow-[0_0_10px_rgba(255,204,0,0.1)]'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 transition-colors ${isNearLine ? 'text-racing-green' : 'text-racing-yellow'}`} viewBox="0 0 24 24" fill="currentColor">
                         <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V21a1 1 0 11-2 0V4zm9 1a1 1 0 110-2h8a1 1 0 011 1v12a1 1 0 01-1 1h-6.586l-2.293 2.293a1 1 0 01-1.414-1.414L12.586 16H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 011.414-1.414L14.414 13H19V5h-7z" clipRule="evenodd"/>
                    </svg>
                    <div className="flex flex-col leading-none">
                         <span className={`text-[10px] font-bold uppercase tracking-wider ${isNearLine ? 'text-racing-green' : 'text-racing-yellow'}`}>
                           {isNearLine ? 'IN RANGE' : 'LINE SET'}
                         </span>
                         {distanceToLine !== null && (
                            <span className="text-xs font-mono text-white">
                                {distanceToLine < 1000 ? `${distanceToLine.toFixed(0)}m` : `${(distanceToLine/1000).toFixed(1)}km`}
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
            </button>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="flex-grow flex flex-col items-center justify-center space-y-2 py-4 relative">
        {showMap && currentSessionPath.length > 2 ? (
            <div className="w-full aspect-square max-w-[280px] animate-fade-in">
                <TrackMap path={currentSessionPath} startFinishLine={startFinishLine} showPoints className="w-full h-full" />
            </div>
        ) : (
            <>
                {/* Session Record Prominent Indicator */}
                {sessionStats.fastestLap && (
                   <div className={`absolute top-0 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 transform ${isNewBest ? 'scale-110' : 'scale-100'}`}>
                      <div className={`flex flex-col items-center px-8 py-3 rounded-2xl border-2 shadow-xl backdrop-blur-md transition-all duration-300 ${isNewBest ? 'bg-racing-purple border-white animate-bounce' : 'bg-racing-purple/10 border-racing-purple/40 shadow-[0_0_20px_rgba(175,82,222,0.2)]'}`}>
                         <div className="flex items-center space-x-2">
                           <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isNewBest ? 'text-white' : 'text-racing-purple'} animate-pulse`} viewBox="0 0 20 20" fill="currentColor">
                             <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                           </svg>
                           <span className={`text-xs font-black uppercase tracking-[0.25em] ${isNewBest ? 'text-white' : 'text-racing-purple'}`}>
                             {isNewBest ? 'PURPLE LAP!' : 'SESSION BEST'}
                           </span>
                         </div>
                         <div className={`text-3xl font-display mt-1 tracking-tight ${isNewBest ? 'text-white' : 'text-white shadow-purple-500/50'}`}>
                           {formatTime(sessionStats.fastestLap)}
                         </div>
                      </div>
                   </div>
                )}

                {/* Live Preview Overlay */}
                {currentSessionPath.length > 2 && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-black/40 backdrop-blur-md rounded-bl-2xl border-b border-l border-gray-800 p-2 animate-fade-in z-20">
                        <TrackMap path={currentSessionPath} startFinishLine={startFinishLine} showPoints className="w-full h-full" />
                        <div className="absolute bottom-1 right-2 text-[6px] font-bold text-gray-500 uppercase tracking-widest">LIVE</div>
                    </div>
                )}

                <div className="text-racing-yellow text-xl font-display uppercase tracking-widest text-center">
                {currentLapStart ? `LAP ${laps.length + 1}` : (autoMode ? "AUTO ARMED" : "READY")}
                {selectedRide && !currentLapStart && (
                  <div className="text-[10px] text-gray-500 mt-1 font-sans">{selectedRide.brand} {selectedRide.model}</div>
                )}
                </div>
                <div className="text-7xl font-display text-white tracking-tighter tabular-nums">
                {formatTime(elapsed)}
                </div>
                <div className="text-gray-500 text-sm font-mono flex items-center space-x-2">
                  <span>LAST: {laps.length > 0 ? formatTime(laps[laps.length - 1].time) : "--:--.--"}</span>
                  {laps.length > 0 && sessionStats.fastestLap && laps[laps.length-1].time === sessionStats.fastestLap && (
                    <span className="w-2 h-2 rounded-full bg-racing-purple animate-pulse" title="Purple Lap" />
                  )}
                </div>
            </>
        )}
        
        <button 
            onClick={() => setShowMap(!showMap)}
            className="mt-4 px-3 py-1 bg-racing-dark border border-gray-800 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white transition-colors"
        >
            {showMap ? "Hide Track" : "Fullscreen Track"}
        </button>
      </div>

      {/* Session Bests Highlight */}
      {(sessionStats.fastestLap || sessionStats.maxSpeedMps > 0) && (
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          <div className="bg-gradient-to-br from-racing-purple/20 to-transparent border border-racing-purple/30 rounded-xl p-3 flex flex-col items-center">
            <span className="text-[10px] font-bold text-racing-purple uppercase tracking-widest mb-1">Session Best Lap</span>
            <span className="text-xl font-mono text-white">{sessionStats.fastestLap ? formatTime(sessionStats.fastestLap) : "--:--.--"}</span>
          </div>
          <div className="bg-gradient-to-br from-racing-yellow/20 to-transparent border border-racing-yellow/30 rounded-xl p-3 flex flex-col items-center">
            <span className="text-[10px] font-bold text-racing-yellow uppercase tracking-widest mb-1">Max Session Speed</span>
            <span className="text-xl font-mono text-white">{formatSpeed(sessionStats.maxSpeedMps, 'kph')} <span className="text-xs text-gray-500">KPH</span></span>
          </div>
        </div>
      )}

      {/* Speed & Graph */}
      <div className="h-40 bg-racing-card rounded-xl border border-gray-800 relative overflow-hidden">
        <div className="absolute top-3 left-4 z-10">
          <div className="text-3xl font-display text-white leading-none">{formatSpeed(currentSpeed, 'kph')}</div>
          <div className="text-[10px] text-gray-400 font-bold">KPH</div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={speedHistory}>
            <defs>
              <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#FF3B30" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <YAxis hide domain={[0, 'auto']} />
            <Area type="monotone" dataKey="speed" stroke="#FF3B30" strokeWidth={3} fillOpacity={1} fill="url(#colorSpeed)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 mt-auto">
        <div className="flex space-x-2">
            <button onClick={() => currentLocation && setStartFinishLine(currentLocation)} disabled={isRecording || !currentLocation} className="flex-1 bg-gray-800 active:bg-gray-700 text-white font-bold text-sm py-4 rounded-xl border border-gray-700 transition-colors disabled:opacity-50 flex flex-col items-center justify-center leading-none">
            <span>SET</span><span className="text-[10px] text-gray-400 mt-1 uppercase">GPS</span>
            </button>
            <button onClick={() => setShowTrackSelector(true)} disabled={isRecording} className="flex-1 bg-gray-800 active:bg-gray-700 text-white font-bold text-sm py-4 rounded-xl border border-gray-700 transition-colors disabled:opacity-50 flex flex-col items-center justify-center leading-none">
            <span>LOAD</span><span className="text-[10px] text-gray-400 mt-1 uppercase">Track</span>
            </button>
        </div>
        <button onClick={toggleRecording} className={`${isRecording ? 'bg-racing-red animate-pulse shadow-racing-red/20' : 'bg-racing-green shadow-racing-green/20'} text-black font-display text-xl uppercase py-4 rounded-xl transition-all shadow-lg`}>
          {isRecording ? "STOP" : "START"}
        </button>
      </div>
    </div>
  );
};

export default TimerView;