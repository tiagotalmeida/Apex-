import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Coordinate, Lap, Track } from '../types';
import { getDistance, formatSpeed, formatTime } from '../services/locationService';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { MOTOGP_TRACKS } from '../data/tracks';
import { fetchWeather, WeatherData } from '../services/weatherService';
import TrackMap from './TrackMap';
import { RideInfo } from '../App';
import SearchableDropdown from './SearchableDropdown';
import { MOTORCYCLE_DATA, YEARS } from '../data/motorcycles';

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
  setSelectedRide: (ride: RideInfo | null) => void;
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
  selectedRide,
  setSelectedRide
}) => {
  const [currentLapStart, setCurrentLapStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [lastCrossTime, setLastCrossTime] = useState<number>(0);
  const [showTrackSelector, setShowTrackSelector] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const requestRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Acquire / release Wake Lock based on recording state
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    if (isRecording) {
      (navigator as any).wakeLock.request('screen')
        .then((lock: WakeLockSentinel) => { wakeLockRef.current = lock; })
        .catch(() => {});
    } else {
      wakeLockRef.current?.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
    }

    return () => {
      wakeLockRef.current?.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
    };
  }, [isRecording]);

  // Lap Detection Settings
  const [showSettings, setShowSettings] = useState(false);
  const [detectionRadius, setDetectionRadius] = useState<number>(25); // meters
  const [minLapTime, setMinLapTime] = useState<number>(20); // seconds

  // Auto Start/Stop Settings
  const [autoMode, setAutoMode] = useState<boolean>(false);
  const [autoStartSpeed, setAutoStartSpeed] = useState<number>(10); // kph
  const [autoStartDelay, setAutoStartDelay] = useState<number>(2); // seconds
  const [autoStopSpeed, setAutoStopSpeed] = useState<number>(5); // kph
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

  const handleRideChange = (field: keyof RideInfo, value: string) => {
    const updated = selectedRide ? { ...selectedRide, [field]: value } : { brand: '', model: '', year: '', [field]: value };
    if (field === 'brand') updated.model = '';
    setSelectedRide(updated);
    localStorage.setItem('apex_garage_ride', JSON.stringify(updated));
  };

  const currentSpeed = currentLocation?.speed ?? 0;
  const speedHistory = currentSessionPath.slice(-40).map((c, i) => ({
    time: i,
    speed: (c.speed || 0) * 3.6
  }));

  const distanceToLine = (currentLocation && startFinishLine)
    ? getDistance(currentLocation, startFinishLine)
    : null;
  const isNearLine = distanceToLine !== null && distanceToLine < detectionRadius;

  const lastLap = laps.length > 0 ? laps[laps.length - 1] : null;
  const delta = lastLap && sessionStats.fastestLap
    ? lastLap.time - sessionStats.fastestLap
    : null;

  // ── SETTINGS PANEL ─────────────────────────────────────────────────────────
  if (showSettings) return (
    <div className="absolute inset-0 z-[60] bg-black flex flex-col stripe-top animate-fade-in">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <div>
          <p className="text-[9px] font-black tracking-[0.25em] text-racing-red uppercase">Setup</p>
          <h2 className="text-lg font-display text-white uppercase italic tracking-wider leading-none">Calibration</h2>
        </div>
        <button onClick={() => setShowSettings(false)} className="w-9 h-9 flex items-center justify-center border border-white/10 text-gray-400 hover:text-white hover:border-racing-red transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar px-4 py-6 space-y-8">

        {/* Machine */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-0.5 h-4 bg-racing-red" />
            <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase">Machine</span>
          </div>
          <div className="space-y-2 carbon p-3 border border-white/5">
            <SearchableDropdown options={Object.keys(MOTORCYCLE_DATA)} value={selectedRide?.brand || ''} onSelect={(val) => handleRideChange('brand', val)} placeholder="Brand" />
            <SearchableDropdown options={selectedRide?.brand ? MOTORCYCLE_DATA[selectedRide.brand] : []} value={selectedRide?.model || ''} onSelect={(val) => handleRideChange('model', val)} placeholder="Model" disabled={!selectedRide?.brand} />
            <SearchableDropdown options={YEARS} value={selectedRide?.year || ''} onSelect={(val) => handleRideChange('year', val)} placeholder="Year" />
          </div>
        </section>

        {/* Lap Gate */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-0.5 h-4 bg-racing-red" />
            <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase">Lap Gate</span>
          </div>
          <div className="space-y-6 carbon p-4 border border-white/5">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Gate Radius</span>
                <span className="text-[11px] font-mono text-racing-yellow font-bold">{detectionRadius} m</span>
              </div>
              <input type="range" min="5" max="100" step="5" value={detectionRadius} onChange={(e) => setDetectionRadius(parseInt(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Min Lap Time</span>
                <span className="text-[11px] font-mono text-racing-yellow font-bold">{minLapTime} s</span>
              </div>
              <input type="range" min="10" max="180" step="5" value={minLapTime} onChange={(e) => setMinLapTime(parseInt(e.target.value))} className="w-full" />
            </div>
          </div>
        </section>

        {/* Auto Recording */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-0.5 h-4 transition-colors ${autoMode ? 'bg-racing-green' : 'bg-white/20'}`} />
              <span className="text-[10px] font-black tracking-[0.2em] text-white uppercase">Auto Recording</span>
            </div>
            <button onClick={() => setAutoMode(!autoMode)} className={`relative inline-flex h-5 w-10 items-center transition-colors ${autoMode ? 'bg-racing-green' : 'bg-white/10'}`}>
              <span className={`inline-block h-3.5 w-3.5 bg-white transition-transform ${autoMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {autoMode && (
            <div className="space-y-6 carbon p-4 border border-white/5 animate-fade-in">
              <div>
                <p className="text-[8px] font-black text-racing-green uppercase tracking-widest mb-3">— Start Logic</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1"><span className="text-[10px] text-gray-500 uppercase font-bold">Trigger Speed</span><span className="text-[10px] font-mono text-white">{autoStartSpeed} KPH</span></div>
                    <input type="range" min="5" max="60" step="5" value={autoStartSpeed} onChange={(e) => setAutoStartSpeed(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><span className="text-[10px] text-gray-500 uppercase font-bold">Sustain</span><span className="text-[10px] font-mono text-white">{autoStartDelay} s</span></div>
                    <input type="range" min="1" max="10" step="1" value={autoStartDelay} onChange={(e) => setAutoStartDelay(parseInt(e.target.value))} className="w-full" />
                  </div>
                </div>
              </div>
              <div className="border-t border-white/5 pt-4">
                <p className="text-[8px] font-black text-racing-red uppercase tracking-widest mb-3">— Stop Logic</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1"><span className="text-[10px] text-gray-500 uppercase font-bold">Speed Limit</span><span className="text-[10px] font-mono text-white">{autoStopSpeed} KPH</span></div>
                    <input type="range" min="0" max="30" step="5" value={autoStopSpeed} onChange={(e) => setAutoStopSpeed(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><span className="text-[10px] text-gray-500 uppercase font-bold">Cooldown</span><span className="text-[10px] font-mono text-white">{autoStopDelay} s</span></div>
                    <input type="range" min="2" max="60" step="1" value={autoStopDelay} onChange={(e) => setAutoStopDelay(parseInt(e.target.value))} className="w-full" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="p-4 border-t border-white/5">
        <button onClick={() => setShowSettings(false)} className="cut-corner-lg w-full bg-racing-red text-white font-black py-4 uppercase tracking-[0.2em] text-sm active:opacity-80 transition-opacity">
          Confirm
        </button>
      </div>
    </div>
  );

  // ── TRACK SELECTOR ──────────────────────────────────────────────────────────
  if (showTrackSelector) return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col stripe-top animate-fade-in">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <div>
          <p className="text-[9px] font-black tracking-[0.25em] text-racing-red uppercase">MotoGP Circuits</p>
          <h2 className="text-lg font-display text-white uppercase italic leading-none">Select Track</h2>
        </div>
        <button onClick={() => setShowTrackSelector(false)} className="w-9 h-9 flex items-center justify-center border border-white/10 text-gray-400 hover:border-racing-red transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-grow overflow-y-auto no-scrollbar pb-safe">
        {MOTOGP_TRACKS.map((track, i) => (
          <button
            key={track.id}
            onClick={() => handleTrackSelect(track)}
            className="w-full carbon border-b border-white/5 px-4 py-3.5 flex items-center justify-between active:bg-white/5 transition-colors text-left"
            style={{ animationDelay: `${i * 20}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-0.5 h-8 bg-racing-red/30" />
              <div>
                <div className="text-sm font-black text-white uppercase tracking-tight">{track.name}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase">{track.location}</div>
              </div>
            </div>
            <span className="text-xl">{track.flag}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── MAIN TIMER VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-racing-dark relative overflow-hidden">

      {/* Red speed stripe at top */}
      <div className="h-[3px] bg-gradient-to-r from-racing-red via-racing-orange to-transparent flex-shrink-0" />

      {/* ── Status bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${currentLocation ? 'bg-racing-green' : 'bg-racing-red'} animate-pulse`} />
            <span className="text-[9px] font-mono font-bold text-gray-500 uppercase">GPS {currentLocation?.accuracy.toFixed(0) || '--'}m</span>
          </div>
          {weather && (
            <div className="flex items-center gap-1 border-l border-white/10 pl-3">
              <span className="text-xs">{weather.icon}</span>
              <span className="text-[9px] font-mono font-bold text-white">{weather.temp.toFixed(0)}°C</span>
            </div>
          )}
          {selectedRide && (
            <div className="border-l border-white/10 pl-3">
              <span className="text-[9px] font-black text-racing-red uppercase tracking-tight">{selectedRide.brand} {selectedRide.model}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {autoMode && <span className="text-[8px] font-black text-racing-green border border-racing-green/40 px-1.5 py-0.5 uppercase tracking-wider">AUTO</span>}
          {startFinishLine ? (
            <span className={`text-[8px] font-black border px-1.5 py-0.5 uppercase tracking-wider transition-all ${isNearLine ? 'text-racing-green border-racing-green animate-pulse-fast' : 'text-racing-yellow border-racing-yellow/40'}`}>
              {isNearLine ? '◉ IN RANGE' : `${distanceToLine!.toFixed(0)}m`}
            </span>
          ) : (
            <span className="text-[8px] font-black text-gray-600 border border-white/5 px-1.5 py-0.5 uppercase">NO LINE</span>
          )}
          <button onClick={() => setShowSettings(true)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white border border-white/5 hover:border-racing-red transition-colors">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>

      {/* ── Main timer area ─────────────────────────────────────────────── */}
      <div className="flex-grow flex flex-col items-center justify-center relative px-4 py-2">

        {/* Live track minimap */}
        {currentSessionPath.length > 2 && !showMap && (
          <div className="absolute top-0 right-0 w-20 h-20 border-b border-l border-white/10 p-1 z-20">
            <TrackMap path={currentSessionPath} startFinishLine={startFinishLine} showPoints className="w-full h-full" />
            <div className="absolute bottom-0.5 right-1 text-[5px] font-black text-racing-red uppercase tracking-widest animate-pulse-fast">LIVE</div>
          </div>
        )}

        {showMap && currentSessionPath.length > 2 ? (
          <div className="w-full aspect-square max-w-[260px] animate-fade-in border border-white/10">
            <TrackMap path={currentSessionPath} startFinishLine={startFinishLine} showPoints className="w-full h-full" />
          </div>
        ) : (
          <>
            {/* Lap counter */}
            <div className="flex items-center gap-3 mb-1">
              {isRecording && <div className="w-2 h-2 bg-racing-red rounded-full animate-pulse-fast" />}
              <span className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase">
                {currentLapStart ? `Lap ${laps.length + 1}` : autoMode ? 'Armed' : 'Ready'}
              </span>
              {isRecording && <div className="w-2 h-2 bg-racing-red rounded-full animate-pulse-fast" />}
            </div>

            {/* MAIN TIME — biggest element on screen */}
            <div className={`font-mono font-black text-white leading-none tabular-nums timer-glow select-none ${isNewBest ? 'text-racing-yellow animate-flash-best' : ''}`}
              style={{ fontSize: 'clamp(52px, 15vw, 72px)', letterSpacing: '-0.02em' }}>
              {formatTime(elapsed)}
            </div>

            {/* Delta vs best */}
            {delta !== null && (
              <div className={`mt-1 font-mono font-black text-xl tabular-nums animate-slide-right ${delta > 0 ? 'text-racing-red' : 'text-racing-green'}`}>
                {delta > 0 ? '+' : ''}{(delta / 1000).toFixed(3)}
              </div>
            )}

            {/* Last lap */}
            <div className="mt-2 flex items-center gap-2 text-gray-600 text-xs font-mono font-bold tracking-widest uppercase">
              <span>Last</span>
              <span className="text-gray-300">{lastLap ? formatTime(lastLap.time) : '--:--.--'}</span>
              {isNewBest && <span className="text-racing-yellow text-[8px] font-black animate-pulse-fast">◆ BEST</span>}
            </div>
          </>
        )}

        <button onClick={() => setShowMap(!showMap)} className="mt-3 text-[9px] font-black text-gray-600 hover:text-racing-red uppercase tracking-widest transition-colors">
          {showMap ? '▲ TIMER' : '▼ MAP'}
        </button>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      {(sessionStats.fastestLap || sessionStats.maxSpeedMps > 0) && (
        <div className="grid grid-cols-2 border-t border-white/5 flex-shrink-0">
          <div className="px-4 py-2.5 border-r border-white/5">
            <p className="data-label mb-0.5">Session Best</p>
            <p className="font-mono font-black text-white text-base tabular-nums">
              {sessionStats.fastestLap ? formatTime(sessionStats.fastestLap) : '--:--.--'}
            </p>
          </div>
          <div className="px-4 py-2.5">
            <p className="data-label mb-0.5">Top Speed</p>
            <p className="font-mono font-black text-white text-base tabular-nums">
              {formatSpeed(sessionStats.maxSpeedMps, 'kph')} <span className="text-[10px] text-gray-600 font-bold">KPH</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Speed graph ────────────────────────────────────────────────── */}
      <div className="h-[88px] carbon border-t border-white/5 relative overflow-hidden flex-shrink-0">
        <div className="absolute left-3 top-2 z-10">
          <span className="font-mono font-black text-white leading-none" style={{ fontSize: 28 }}>
            {formatSpeed(currentSpeed, 'kph')}
          </span>
          <span className="text-[9px] font-black text-gray-600 uppercase ml-1">kph</span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={speedHistory} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8001A" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#E8001A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={[0, 'auto']} />
            <Area type="monotone" dataKey="speed" stroke="#E8001A" strokeWidth={2} fill="url(#sg)" isAnimationActive={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-0 border-t border-white/5 flex-shrink-0">
        <button
          onClick={() => currentLocation && setStartFinishLine(currentLocation)}
          disabled={isRecording || !currentLocation}
          className="carbon border-r border-white/5 py-4 flex flex-col items-center justify-center gap-0.5 disabled:opacity-30 active:bg-white/5 transition-colors"
        >
          <span className="text-xs font-black text-white uppercase">Set</span>
          <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">GPS Pin</span>
        </button>
        <button
          onClick={() => setShowTrackSelector(true)}
          disabled={isRecording}
          className="carbon border-r border-white/5 py-4 flex flex-col items-center justify-center gap-0.5 disabled:opacity-30 active:bg-white/5 transition-colors"
        >
          <span className="text-xs font-black text-white uppercase">Track</span>
          <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Select</span>
        </button>
        <button
          onClick={toggleRecording}
          className={`py-4 flex flex-col items-center justify-center gap-0.5 font-black text-sm uppercase tracking-wider transition-all active:opacity-80
            ${isRecording
              ? 'bg-racing-red text-white shadow-glow-red animate-pulse-fast'
              : 'bg-racing-green text-black shadow-glow-green'
            }`}
        >
          <span>{isRecording ? '■ STOP' : '▶ START'}</span>
        </button>
      </div>
    </div>
  );
};

export default TimerView;