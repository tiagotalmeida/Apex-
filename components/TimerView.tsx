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

const RPM_SEGS = 14;

const RpmBar: React.FC<{ speedMps: number; maxSpeedMps: number }> = ({ speedMps, maxSpeedMps }) => {
  const ratio = maxSpeedMps > 0 ? Math.min(speedMps / maxSpeedMps, 1) : 0;
  const lit = Math.round(ratio * RPM_SEGS);
  return (
    <div style={{ display: 'flex', gap: 3, height: 6 }}>
      {Array.from({ length: RPM_SEGS }).map((_, i) => (
        <div
          key={i}
          className={[
            'rpm-seg',
            i < lit ? 'lit' : '',
            i < lit && i >= 10 ? 'rpm-hot' : '',
            i < lit && i >= 12 ? 'rpm-red' : '',
          ].filter(Boolean).join(' ')}
        />
      ))}
    </div>
  );
};

interface SectorCardProps {
  label: string;
  time: number | null;
  bestTime: number | null;
  active?: boolean;
}

const SectorCard: React.FC<SectorCardProps> = ({ label, time, bestTime, active }) => {
  const isDone = time !== null && bestTime !== null;
  const isPb   = isDone && time! === bestTime;
  const isSlow = isDone && time! > bestTime! + 100;
  const isFast = isDone && !isPb && !isSlow;

  const stateClass = isPb ? 'sector-pb' : isSlow ? 'sector-slow' : isDone ? 'done' : '';
  const deltaLabel = isPb ? '★ BEST'
    : isSlow ? `+${((time! - bestTime!) / 1000).toFixed(3)}`
    : isFast ? `−${((bestTime! - time!) / 1000).toFixed(3)}`
    : '';
  const deltaColor = isPb ? 'var(--yellow)' : isSlow ? 'var(--accent)' : isFast ? 'var(--green)' : 'transparent';

  return (
    <div className={`sector-card px-2 py-2.5 text-center ${stateClass} ${active ? 'ring-1 ring-white/20' : ''}`}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
      <p className="time-mono" style={{ fontSize: 13, color: isDone ? '#fff' : 'var(--ink-4)' }}>
        {isDone ? (time! / 1000).toFixed(3) : '—'}
      </p>
      <p style={{ fontSize: 9, fontWeight: 700, color: deltaColor, marginTop: 2, minHeight: 12 }}>{deltaLabel}</p>
    </div>
  );
};

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

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    if (isRecording) {
      (navigator as any).wakeLock.request('screen')
        .then((lock: WakeLockSentinel) => { wakeLockRef.current = lock; })
        .catch(() => {});
    } else {
      wakeLockRef.current?.release().then(() => { wakeLockRef.current = null; }).catch(() => {});
    }
    return () => { wakeLockRef.current?.release().then(() => { wakeLockRef.current = null; }).catch(() => {}); };
  }, [isRecording]);

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
      const prevBest = laps.slice(0, -1).length > 0 ? Math.min(...laps.slice(0, -1).map(l => l.time)) : Infinity;
      if (lastLap.time < prevBest) {
        setIsNewBest(true);
        const t = setTimeout(() => setIsNewBest(false), 5000);
        return () => clearTimeout(t);
      }
    }
  }, [laps]);

  useEffect(() => {
    if (currentLocation && !weather) {
      fetchWeather(currentLocation.latitude, currentLocation.longitude).then(setWeather).catch(console.error);
    }
  }, [currentLocation, weather]);

  const animate = () => {
    if (isRecording && currentLapStart) setElapsed(Date.now() - currentLapStart);
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
        if (!startThresholdTimer.current) startThresholdTimer.current = Date.now();
        else if (Date.now() - startThresholdTimer.current >= autoStartDelay * 1000) { startRecording(); startThresholdTimer.current = null; }
      } else { startThresholdTimer.current = null; }
    } else {
      if (speedKph <= autoStopSpeed) {
        if (!stopThresholdTimer.current) stopThresholdTimer.current = Date.now();
        else if (Date.now() - stopThresholdTimer.current >= autoStopDelay * 1000) { stopRecording(); stopThresholdTimer.current = null; }
      } else { stopThresholdTimer.current = null; }
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
        setLaps(prev => [...prev, { number: prev.length + 1, time: lapTime, startTime: currentLapStart, endTime: now, maxSpeed: lapMaxSpeed }]);
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
  const stopRecording = () => { setIsRecording(false); setCurrentLapStart(null); setElapsed(0); };
  const toggleRecording = () => { if (isRecording) stopRecording(); else startRecording(); };

  const handleTrackSelect = (track: Track) => {
    setStartFinishLine({ latitude: track.startFinishLine.latitude, longitude: track.startFinishLine.longitude, accuracy: 0, timestamp: Date.now(), speed: 0 });
    setShowTrackSelector(false);
  };

  const handleRideChange = (field: keyof RideInfo, value: string) => {
    const updated = selectedRide ? { ...selectedRide, [field]: value } : { brand: '', model: '', year: '', [field]: value };
    if (field === 'brand') updated.model = '';
    setSelectedRide(updated);
    localStorage.setItem('apex_garage_ride', JSON.stringify(updated));
  };

  const currentSpeed = currentLocation?.speed ?? 0;
  const speedKph = Math.round(currentSpeed * 3.6);
  const speedHistory = currentSessionPath.slice(-40).map((c, i) => ({ time: i, speed: (c.speed || 0) * 3.6 }));
  const distanceToLine = (currentLocation && startFinishLine) ? getDistance(currentLocation, startFinishLine) : null;
  const isNearLine = distanceToLine !== null && distanceToLine < detectionRadius;
  const lastLap = laps.length > 0 ? laps[laps.length - 1] : null;
  const delta = lastLap && sessionStats.fastestLap ? lastLap.time - sessionStats.fastestLap : null;
  const deltaFaster = delta !== null && delta <= 0;

  // ── SETTINGS PANEL ───────────────────────────────────────────────────
  if (showSettings) return (
    <div className="absolute inset-0 z-[60] flex flex-col animate-fade-in" style={{ background: 'var(--surface-0)' }}>
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <p className="label-sm" style={{ color: 'var(--accent)' }}>Setup</p>
          <h2 className="text-2xl font-black text-white tracking-tight">Settings</h2>
        </div>
        <button onClick={() => setShowSettings(false)} className="w-10 h-10 rounded-full btn-ghost flex items-center justify-center">
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto no-scrollbar px-5 pb-6 space-y-4">
        <section className="apex-card p-5">
          <p className="label-sm mb-4">Machine</p>
          <div className="space-y-3">
            <SearchableDropdown options={Object.keys(MOTORCYCLE_DATA)} value={selectedRide?.brand || ''} onSelect={(v) => handleRideChange('brand', v)} placeholder="Brand" />
            <SearchableDropdown options={selectedRide?.brand ? MOTORCYCLE_DATA[selectedRide.brand] : []} value={selectedRide?.model || ''} onSelect={(v) => handleRideChange('model', v)} placeholder="Model" disabled={!selectedRide?.brand} />
            <SearchableDropdown options={YEARS} value={selectedRide?.year || ''} onSelect={(v) => handleRideChange('year', v)} placeholder="Year" />
          </div>
        </section>
        <section className="apex-card p-5">
          <p className="label-sm mb-4">Lap Gate</p>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Gate Radius</span>
                <span className="time-mono text-sm text-white">{detectionRadius} m</span>
              </div>
              <input type="range" min="5" max="100" step="5" value={detectionRadius} onChange={(e) => setDetectionRadius(parseInt(e.target.value))} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Min Lap Time</span>
                <span className="time-mono text-sm text-white">{minLapTime} s</span>
              </div>
              <input type="range" min="10" max="180" step="5" value={minLapTime} onChange={(e) => setMinLapTime(parseInt(e.target.value))} />
            </div>
          </div>
        </section>
        <section className="apex-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="label-sm">Auto Recording</p>
            <button
              onClick={() => setAutoMode(!autoMode)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${autoMode ? 'btn-success' : 'bg-white/10'}`}
            >
              <span className={`inline-block h-5 w-5 bg-white rounded-full shadow-lg transition-transform ${autoMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {autoMode && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--green)' }}>Start</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Trigger Speed</span><span className="time-mono text-sm text-white">{autoStartSpeed} kph</span></div>
                    <input type="range" min="5" max="60" step="5" value={autoStartSpeed} onChange={(e) => setAutoStartSpeed(parseInt(e.target.value))} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Sustain</span><span className="time-mono text-sm text-white">{autoStartDelay} s</span></div>
                    <input type="range" min="1" max="10" step="1" value={autoStartDelay} onChange={(e) => setAutoStartDelay(parseInt(e.target.value))} />
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--accent)' }}>Stop</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Speed Limit</span><span className="time-mono text-sm text-white">{autoStopSpeed} kph</span></div>
                    <input type="range" min="0" max="30" step="5" value={autoStopSpeed} onChange={(e) => setAutoStopSpeed(parseInt(e.target.value))} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2"><span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Cooldown</span><span className="time-mono text-sm text-white">{autoStopDelay} s</span></div>
                    <input type="range" min="2" max="60" step="1" value={autoStopDelay} onChange={(e) => setAutoStopDelay(parseInt(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
      <div className="px-5 pb-6">
        <button onClick={() => setShowSettings(false)} className="btn-primary w-full rounded-2xl py-4 text-[15px] font-bold tracking-wide">Done</button>
      </div>
    </div>
  );

  // ── TRACK SELECTOR ────────────────────────────────────────────────────
  if (showTrackSelector) return (
    <div className="absolute inset-0 z-50 flex flex-col animate-fade-in" style={{ background: 'var(--surface-0)' }}>
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <p className="label-sm" style={{ color: 'var(--accent)' }}>MotoGP</p>
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
            className="w-full apex-card px-4 py-3.5 flex items-center justify-between text-left transition-colors"
            style={{ width: '100%' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl flex-shrink-0">{track.flag}</span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-white truncate">{track.name}</div>
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--ink-4)' }}>{track.location}</div>
              </div>
            </div>
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--ink-4)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );

  // ── MAIN TIMER VIEW ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: 'var(--surface-0)' }}>

      {/* ── Status row ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isRecording ? (
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 flex-shrink-0"
              style={{ background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.3)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse-rec" style={{ background: 'var(--accent)' }} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>REC</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full px-3 py-1.5 flex-shrink-0 btn-ghost">
              <span className={`w-2 h-2 rounded-full ${currentLocation ? 'bg-racing-green' : 'animate-pulse bg-racing-red'}`} />
              <span className="time-mono text-[11px]" style={{ color: 'var(--ink-3)' }}>
                GPS {currentLocation?.accuracy.toFixed(0) ?? '—'}m
              </span>
            </div>
          )}
          {weather && (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 flex-shrink-0 btn-ghost">
              <span className="text-sm leading-none">{weather.icon}</span>
              <span className="time-mono text-[11px]" style={{ color: 'var(--ink-2)' }}>{weather.temp.toFixed(0)}°</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {autoMode && (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
              style={{ background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)', color: 'var(--green)' }}>Auto</span>
          )}
          {startFinishLine ? (
            <span className={`time-mono text-[11px] font-bold rounded-full px-2.5 py-1 transition-all ${isNearLine ? 'animate-pulse-rec' : ''}`}
              style={isNearLine
                ? { background: 'var(--green)', color: '#001912' }
                : { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink-3)' }}>
              {isNearLine ? 'Gate ✓' : `${distanceToLine!.toFixed(0)}m`}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 btn-ghost">No Gate</span>
          )}
          <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-full btn-ghost flex items-center justify-center">
            <SettingsIcon className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* ── Lap badge + minimap ── */}
      <div className="flex items-center justify-between px-4 pb-1 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isRecording ? 'grad-accent' : ''}`}
            style={!isRecording ? { background: 'var(--surface-2)', border: '1px solid var(--border)' } : {}}>
            <span className="timer-digit text-xl" style={{ color: isRecording ? '#fff' : 'var(--ink-4)', fontSize: 26 }}>
              {currentLapStart ? (laps.length + 1).toString().padStart(2, '0') : '--'}
            </span>
          </div>
          <div>
            <p className="label-tiny" style={{ color: currentLapStart ? 'var(--accent)' : 'var(--ink-4)' }}>
              {currentLapStart ? 'Current Lap' : autoMode ? 'Armed' : 'Ready'}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-4)' }}>
              {selectedRide ? `${selectedRide.brand} ${selectedRide.model}` : 'No machine'}
            </p>
          </div>
        </div>
        {currentSessionPath.length > 2 && (
          <button onClick={() => setShowMap(!showMap)} className="w-[52px] h-[52px] rounded-xl p-1.5 flex-shrink-0 relative overflow-hidden"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <TrackMap path={currentSessionPath} startFinishLine={startFinishLine} showPoints className="w-full h-full" />
            <span className="absolute top-0.5 right-1 text-[8px] font-bold uppercase"
              style={{ color: isRecording ? 'var(--green)' : 'var(--ink-4)' }}>
              {showMap ? 'Hide' : 'Live'}
            </span>
          </button>
        )}
      </div>

      {/* ── Hero timer ── */}
      <div className="flex-grow flex flex-col justify-center items-center px-4 relative">
        {showMap && currentSessionPath.length > 2 ? (
          <div className="w-full max-w-xs aspect-square apex-card p-3 animate-fade-in">
            <TrackMap path={currentSessionPath} startFinishLine={startFinishLine} showPoints className="w-full h-full" />
          </div>
        ) : (
          <>
            <div
              className={`timer-digit select-none ${isRecording ? 'timer-glow' : ''} ${isNewBest ? 'animate-flash-best' : ''}`}
              style={{ fontSize: 'clamp(68px, 20vw, 108px)', color: isNewBest ? 'var(--yellow)' : '#fff' }}
            >
              {formatTime(elapsed)}
            </div>

            {/* Delta pill */}
            {delta !== null ? (
              <div
                className={`mt-3 rounded-full px-5 py-2 time-mono font-bold text-xl ${deltaFaster ? 'delta-faster' : 'delta-slower'}`}
                style={{ color: deltaFaster ? 'var(--green)' : 'var(--accent)' }}
              >
                {deltaFaster ? '▼ ' : '▲ '}{delta > 0 ? '+' : ''}{(delta / 1000).toFixed(3)}
              </div>
            ) : (
              <div className="mt-3 rounded-full px-5 py-2 time-mono text-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink-4)' }}>
                —.———
              </div>
            )}

            {isNewBest && (
              <div className="mt-3 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider animate-fade-in"
                style={{ background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.3)', color: 'var(--yellow)' }}>
                ★ Fastest Lap
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sector S1 / S2 / S3 ── */}
      <div className="grid grid-cols-3 gap-2 px-4 flex-shrink-0">
        <SectorCard label="S1" time={null} bestTime={null} active={isRecording && !!currentLapStart} />
        <SectorCard label="S2" time={null} bestTime={null} />
        <SectorCard label="S3" time={null} bestTime={null} />
      </div>

      {/* ── Stats: Last / Best / Laps ── */}
      <div className="grid grid-cols-3 gap-2 px-4 pt-2 flex-shrink-0">
        <div className="apex-card px-3 py-2.5">
          <p className="label-tiny mb-1">Last</p>
          <p className="time-mono text-sm text-white">{lastLap ? formatTime(lastLap.time) : '--:--.--'}</p>
        </div>
        <div className="apex-card px-3 py-2.5"
          style={sessionStats.fastestLap ? { borderColor: 'rgba(255,214,10,0.35)' } : {}}>
          <p className="label-tiny mb-1">Best</p>
          <p className="time-mono text-sm" style={{ color: sessionStats.fastestLap ? 'var(--yellow)' : 'var(--ink-4)' }}>
            {sessionStats.fastestLap ? formatTime(sessionStats.fastestLap) : '--:--.--'}
          </p>
        </div>
        <div className="apex-card px-3 py-2.5">
          <p className="label-tiny mb-1">Laps</p>
          <p className="timer-digit text-white" style={{ fontSize: 24 }}>{laps.length.toString().padStart(2, '0')}</p>
        </div>
      </div>

      {/* ── Speed card + RPM ── */}
      <div className="px-4 pt-2 flex-shrink-0">
        <div className="apex-card overflow-hidden" style={{ paddingTop: 0 }}>
          <div style={{ position: 'relative', height: 52 }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span className="timer-digit text-white" style={{ fontSize: 42, lineHeight: 1 }}>{speedKph}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', lineHeight: 1 }}>kph</div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', lineHeight: 1, marginTop: 1 }}>Speed</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={52}>
              <AreaChart data={speedHistory} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF3B30" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#FF3B30" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={[0, 'auto']} />
                <Area type="monotone" dataKey="speed" stroke="#FF3B30" strokeWidth={2} fill="url(#sg)" isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '4px 12px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4 }}>RPM</div>
            <RpmBar speedMps={currentSpeed} maxSpeedMps={Math.max(sessionStats.maxSpeedMps, 1)} />
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="px-4 pt-2 pb-4 flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => currentLocation && setStartFinishLine(currentLocation)}
            disabled={isRecording || !currentLocation}
            className="flex-1 rounded-2xl btn-ghost py-3 flex flex-col items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <PinPlusIcon className="w-5 h-5" style={{ color: 'var(--accent)' } as React.CSSProperties} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-2)' }}>Set Gate</span>
          </button>
          <button
            onClick={() => setShowTrackSelector(true)}
            disabled={isRecording}
            className="flex-1 rounded-2xl btn-ghost py-3 flex flex-col items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FlagIcon className="w-5 h-5" style={{ color: 'var(--accent)' } as React.CSSProperties} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--ink-2)' }}>Circuit</span>
          </button>
          <button
            onClick={toggleRecording}
            className={`flex-[1.4] rounded-2xl py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.97] ${isRecording ? 'btn-primary' : 'btn-success'}`}
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
