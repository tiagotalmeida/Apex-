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
import { SettingsIcon, CloseIcon, PlayIcon, StopIcon, PinPlusIcon, FlagIcon } from './Icons';

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

  const [showSettings, setShowSettings] = useState(false);
  const [detectionRadius, setDetectionRadius] = useState<number>(25);
  const [minLapTime, setMinLapTime] = useState<number>(20);

  const [autoMode, setAutoMode] = useState<boolean>(false);
  const [autoStartSpeed, setAutoStartSpeed] = useState<number>(10);
  const [autoStartDelay, setAutoStartDelay] = useState<number>(2);
  const [autoStopSpeed, setAutoStopSpeed] = useState<number>(5);
  const [autoStopDelay, setAutoStopDelay] = useState<number>(5);

  const startThresholdTimer = useRef<number | null>(null);
  const stopThresholdTimer = useRef<number | null>(null);

  const sessionStats = useMemo(() => {
    const fastestLap = laps.length > 0 ? Math.min(...laps.map(l => l.time)) : null;
    const maxSpeedMps = currentSessionPath.length > 0
      ? Math.max(...currentSessionPath.map(c => c.speed || 0))
      : 0;
    return { fastestLap, maxSpeedMps };
  }, [laps, currentSessionPath]);

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

  useEffect(() => {
    if (currentLocation && !weather) {
      fetchWeather(currentLocation.latitude, currentLocation.longitude)
        .then(setWeather)
        .catch(console.error);
    }
  }, [currentLocation, weather]);

  const animate = () => {
    if (isRecording && currentLapStart) {
      setElapsed(Date.now() - currentLapStart);
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRecording, currentLapStart]);

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
    if (isRecording) stopRecording();
    else startRecording();
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

  // ── SETTINGS PANEL ────────────────────────────────────────────────────
  if (showSettings) return (
    <div className="absolute inset-0 z-[60] flex flex-col animate-fade-in" style={{ background: 'linear-gradient(180deg, #0b0b12 0%, #050508 100%)' }}>
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <p className="label-sm text-racing-red mb-1">Setup</p>
          <h2 className="text-2xl font-black text-white tracking-tight">Settings</h2>
        </div>
        <button onClick={() => setShowSettings(false)} className="w-10 h-10 rounded-full btn-ghost flex items-center justify-center">
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar px-5 pb-6 space-y-5">

        <section className="rounded-3xl surface-card p-5">
          <p className="label-sm mb-4">Machine</p>
          <div className="space-y-3">
            <SearchableDropdown options={Object.keys(MOTORCYCLE_DATA)} value={selectedRide?.brand || ''} onSelect={(v) => handleRideChange('brand', v)} placeholder="Brand" />
            <SearchableDropdown options={selectedRide?.brand ? MOTORCYCLE_DATA[selectedRide.brand] : []} value={selectedRide?.model || ''} onSelect={(v) => handleRideChange('model', v)} placeholder="Model" disabled={!selectedRide?.brand} />
            <SearchableDropdown options={YEARS} value={selectedRide?.year || ''} onSelect={(v) => handleRideChange('year', v)} placeholder="Year" />
          </div>
        </section>

        <section className="rounded-3xl surface-card p-5">
          <p className="label-sm mb-4">Lap Gate</p>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-300 font-semibold">Gate Radius</span>
                <span className="text-sm text-white font-bold tabular-nums">{detectionRadius} m</span>
              </div>
              <input type="range" min="5" max="100" step="5" value={detectionRadius} onChange={(e) => setDetectionRadius(parseInt(e.target.value))} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-300 font-semibold">Min Lap Time</span>
                <span className="text-sm text-white font-bold tabular-nums">{minLapTime} s</span>
              </div>
              <input type="range" min="10" max="180" step="5" value={minLapTime} onChange={(e) => setMinLapTime(parseInt(e.target.value))} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="label-sm">Auto Recording</p>
            <button
              onClick={() => setAutoMode(!autoMode)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${autoMode ? 'bg-emerald-500' : 'bg-white/10'}`}
            >
              <span className={`inline-block h-5 w-5 bg-white rounded-full shadow-lg transition-transform ${autoMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {autoMode && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-3">Start</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm text-slate-300 font-semibold">Trigger Speed</span><span className="text-sm text-white font-bold tabular-nums">{autoStartSpeed} kph</span></div>
                    <input type="range" min="5" max="60" step="5" value={autoStartSpeed} onChange={(e) => setAutoStartSpeed(parseInt(e.target.value))} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm text-slate-300 font-semibold">Sustain</span><span className="text-sm text-white font-bold tabular-nums">{autoStartDelay} s</span></div>
                    <input type="range" min="1" max="10" step="1" value={autoStartDelay} onChange={(e) => setAutoStartDelay(parseInt(e.target.value))} />
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-racing-red mb-3">Stop</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm text-slate-300 font-semibold">Speed Limit</span><span className="text-sm text-white font-bold tabular-nums">{autoStopSpeed} kph</span></div>
                    <input type="range" min="0" max="30" step="5" value={autoStopSpeed} onChange={(e) => setAutoStopSpeed(parseInt(e.target.value))} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm text-slate-300 font-semibold">Cooldown</span><span className="text-sm text-white font-bold tabular-nums">{autoStopDelay} s</span></div>
                    <input type="range" min="2" max="60" step="1" value={autoStopDelay} onChange={(e) => setAutoStopDelay(parseInt(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="px-5 pb-6">
        <button onClick={() => setShowSettings(false)} className="btn-primary w-full rounded-2xl py-4 text-[15px] font-bold tracking-wide">
          Done
        </button>
      </div>
    </div>
  );

  // ── TRACK SELECTOR ────────────────────────────────────────────────────
  if (showTrackSelector) return (
    <div className="absolute inset-0 z-50 flex flex-col animate-fade-in" style={{ background: 'linear-gradient(180deg, #0b0b12 0%, #050508 100%)' }}>
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <p className="label-sm text-racing-red mb-1">MotoGP</p>
          <h2 className="text-2xl font-black text-white tracking-tight">Pick a Circuit</h2>
        </div>
        <button onClick={() => setShowTrackSelector(false)} className="w-10 h-10 rounded-full btn-ghost flex items-center justify-center">
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto no-scrollbar px-5 pb-6 space-y-2">
        {MOTOGP_TRACKS.map((track) => (
          <button
            key={track.id}
            onClick={() => handleTrackSelect(track)}
            className="w-full rounded-2xl surface-card px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl flex-shrink-0">{track.flag}</span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-white truncate">{track.name}</div>
                <div className="text-xs text-slate-400 font-semibold truncate">{track.location}</div>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );

  // ── MAIN TIMER VIEW ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full relative overflow-hidden">

      {/* Status pill row */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isRecording ? (
            <div className="flex items-center gap-2 rounded-full bg-racing-red/15 border border-racing-red/30 px-3 py-1.5 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-racing-red animate-pulse-rec shadow-lg shadow-racing-red/60" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-racing-red">REC</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full ${currentLocation ? 'bg-emerald-400' : 'bg-racing-red animate-pulse'}`} />
              <span className="text-[11px] font-bold text-slate-300 tabular-nums">
                GPS {currentLocation?.accuracy.toFixed(0) ?? '—'}m
              </span>
            </div>
          )}
          {weather && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 flex-shrink-0">
              <span className="text-sm leading-none">{weather.icon}</span>
              <span className="text-[11px] font-bold text-slate-200 tabular-nums">{weather.temp.toFixed(0)}°</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {autoMode && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2.5 py-1">Auto</span>
          )}
          {startFinishLine ? (
            <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 tabular-nums transition-all
              ${isNearLine
                ? 'bg-emerald-500 text-black animate-pulse-rec'
                : 'bg-white/5 border border-white/10 text-slate-300'}`}
            >
              {isNearLine ? 'Gate' : `${distanceToLine!.toFixed(0)}m`}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-white/5 border border-white/10 text-slate-500 px-2.5 py-1">No Gate</span>
          )}
          <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-full btn-ghost flex items-center justify-center">
            <SettingsIcon className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Hero timer area */}
      <div className="flex-grow flex flex-col justify-center relative px-5">

        {/* Lap + minimap row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg
              ${isRecording ? 'grad-accent shadow-racing-red/30' : 'bg-white/5 border border-white/10'}`}>
              <span className={`timer-digit text-2xl ${isRecording ? 'text-white' : 'text-slate-400'}`}>
                {currentLapStart ? (laps.length + 1).toString().padStart(2, '0') : '--'}
              </span>
            </div>
            <div>
              <p className="label-sm">{currentLapStart ? 'Current Lap' : autoMode ? 'Armed' : 'Ready'}</p>
              <p className="text-sm text-slate-400 font-semibold">{selectedRide ? `${selectedRide.brand} ${selectedRide.model}` : 'No machine'}</p>
            </div>
          </div>

          {currentSessionPath.length > 2 && (
            <button
              onClick={() => setShowMap(!showMap)}
              className="w-[60px] h-[60px] rounded-2xl surface-card p-1.5 flex-shrink-0 relative overflow-hidden"
            >
              <TrackMap path={currentSessionPath} startFinishLine={startFinishLine} showPoints className="w-full h-full" />
              <span className={`absolute top-1 right-1.5 text-[8px] font-bold uppercase tracking-wider
                ${isRecording ? 'text-emerald-400' : 'text-slate-500'}`}>
                {showMap ? 'Hide' : 'Live'}
              </span>
            </button>
          )}
        </div>

        {/* Expanded map OR hero time */}
        {showMap && currentSessionPath.length > 2 ? (
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[320px] aspect-square rounded-3xl surface-card p-3 animate-fade-in">
              <TrackMap path={currentSessionPath} startFinishLine={startFinishLine} showPoints className="w-full h-full" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div
              className={`timer-digit ${isRecording ? 'timer-glow' : ''} select-none transition-colors
                ${isNewBest ? 'text-racing-yellow animate-flash-best' : 'text-white'}`}
              style={{ fontSize: 'clamp(64px, 20vw, 104px)' }}
            >
              {formatTime(elapsed)}
            </div>

            {delta !== null ? (
              <div
                className={`mt-5 rounded-full px-5 py-2 timer-digit text-2xl tabular-nums shadow-lg
                  ${delta > 0 ? 'grad-danger text-white shadow-red-500/20' : 'grad-success text-black shadow-emerald-500/20'}`}
              >
                {delta > 0 ? '+' : ''}{(delta / 1000).toFixed(3)}
              </div>
            ) : (
              <div className="mt-5 rounded-full bg-white/5 border border-white/10 px-5 py-2 timer-digit text-2xl text-slate-600 tabular-nums">
                —.———
              </div>
            )}

            {isNewBest && (
              <div className="mt-4 rounded-full px-4 py-1.5 bg-racing-yellow/15 border border-racing-yellow/40 text-racing-yellow text-[11px] font-bold uppercase tracking-wider animate-fade-in">
                ★ Fastest Lap
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="px-5 pt-3 flex-shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl surface-card px-3 py-3">
            <p className="label-tiny mb-1">Last</p>
            <p className="timer-digit text-white text-[15px] tabular-nums">{lastLap ? formatTime(lastLap.time) : '--:--.--'}</p>
          </div>
          <div className="rounded-2xl surface-card px-3 py-3">
            <p className="label-tiny mb-1">Best</p>
            <p className="timer-digit text-racing-yellow text-[15px] tabular-nums">{sessionStats.fastestLap ? formatTime(sessionStats.fastestLap) : '--:--.--'}</p>
          </div>
          <div className="rounded-2xl surface-card px-3 py-3">
            <p className="label-tiny mb-1">Laps</p>
            <p className="timer-digit text-white text-[15px] tabular-nums">{laps.length.toString().padStart(2, '0')}</p>
          </div>
        </div>
      </div>

      {/* Speed card */}
      <div className="px-5 pt-3 flex-shrink-0">
        <div className="relative h-[90px] rounded-2xl surface-card overflow-hidden">
          <div className="absolute inset-y-0 left-4 flex items-center z-10 pointer-events-none gap-2">
            <span className="timer-digit text-white tabular-nums" style={{ fontSize: 42, letterSpacing: '-0.03em' }}>
              {formatSpeed(currentSpeed, 'kph')}
            </span>
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-bold text-racing-red uppercase tracking-wider leading-none">kph</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none mt-1">Speed</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={speedHistory} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF1744" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#FF1744" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, 'auto']} />
              <Area type="monotone" dataKey="speed" stroke="#FF1744" strokeWidth={2.5} fill="url(#sg)" isAnimationActive={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 pt-3 pb-5 flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => currentLocation && setStartFinishLine(currentLocation)}
            disabled={isRecording || !currentLocation}
            className="flex-1 rounded-2xl btn-ghost py-3.5 flex flex-col items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <PinPlusIcon className="w-5 h-5 text-racing-red" />
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Set Gate</span>
          </button>
          <button
            onClick={() => setShowTrackSelector(true)}
            disabled={isRecording}
            className="flex-1 rounded-2xl btn-ghost py-3.5 flex flex-col items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <FlagIcon className="w-5 h-5 text-racing-red" />
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Circuit</span>
          </button>
          <button
            onClick={toggleRecording}
            className={`flex-[1.4] rounded-2xl py-3.5 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98]
              ${isRecording ? 'btn-primary' : 'btn-success'}`}
          >
            {isRecording ? <StopIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            <span className="text-[12px] font-bold uppercase tracking-wider">{isRecording ? 'Stop' : 'Start'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimerView;
