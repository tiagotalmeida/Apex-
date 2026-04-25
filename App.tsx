import React, { useState, useEffect } from 'react';
import TimerView from './components/TimerView';
import GarageView from './components/GarageView';
import MapsView from './components/MapsView';
import TrackMap from './components/TrackMap';
import { StopwatchIcon, ChartIcon, BikeIcon, PinIcon, TrashIcon } from './components/Icons';
import { Coordinate, Lap, AppTab, SessionData } from './types';
import { formatTime } from './services/locationService';

export interface RideInfo {
  brand: string;
  model: string;
  year: string;
}

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.TIMER);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [startFinishLine, setStartFinishLine] = useState<Coordinate | null>(null);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [sessionPath, setSessionPath] = useState<Coordinate[]>([]);
  const [savedSessions, setSavedSessions] = useState<SessionData[]>([]);
  const [comparingSessionId, setComparingSessionId] = useState<string | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [selectedRide, setSelectedRide] = useState<RideInfo | null>(null);

  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem('apex_sessions');
      if (storedSessions) setSavedSessions(JSON.parse(storedSessions));
      const storedRide = localStorage.getItem('apex_garage_ride');
      if (storedRide) setSelectedRide(JSON.parse(storedRide));
    } catch (e) {
      console.error("Failed to load local data", e);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        const newCoord: Coordinate = {
          latitude, longitude, accuracy, speed, heading,
          timestamp: position.timestamp
        };
        setCurrentLocation(newCoord);
        if (isRecording) setSessionPath(prev => [...prev, newCoord]);
      },
      (error) => console.error("Error watching position:", error.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [isRecording]);

  const toggleComparison = (id: string) => {
    setComparisonIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const sessionsToCompare = savedSessions.filter(s => comparisonIds.includes(s.id));

  return (
    <div className="flex flex-col h-screen text-white font-sans overflow-hidden">
      <main className="flex-grow overflow-hidden relative">
        {currentTab === AppTab.TIMER && (
          <TimerView
            currentLocation={currentLocation}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            startFinishLine={startFinishLine}
            setStartFinishLine={setStartFinishLine}
            laps={laps}
            setLaps={setLaps}
            currentSessionPath={sessionPath}
            selectedRide={selectedRide}
            setSelectedRide={setSelectedRide}
          />
        )}
        {currentTab === AppTab.GARAGE && (
          <GarageView selectedRide={selectedRide} setSelectedRide={setSelectedRide} />
        )}
        {currentTab === AppTab.MAPS && (
          <MapsView currentLocation={currentLocation} selectedRide={selectedRide} setSelectedRide={setSelectedRide} />
        )}
        {currentTab === AppTab.ANALYSIS && (
          <div className="flex flex-col h-full">
            <div className="px-5 pt-6 pb-4 flex justify-between items-center flex-shrink-0">
              <div>
                <p className="label-sm text-racing-red mb-1">Session</p>
                <h1 className="text-3xl font-black text-white tracking-tight">Telemetry</h1>
              </div>
              {comparisonIds.length > 0 && (
                <button
                  onClick={() => setComparisonIds([])}
                  className="rounded-full btn-ghost text-xs font-bold px-3 py-1.5"
                >
                  Clear · {comparisonIds.length}
                </button>
              )}
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar px-5 pb-8 space-y-5">

              {/* Head-to-head */}
              {comparisonIds.length === 2 && sessionsToCompare.length === 2 && (
                <div className="rounded-3xl surface-elevated overflow-hidden animate-fade-in">
                  <div className="px-5 py-4 flex justify-between items-center border-b border-white/5">
                    <p className="label-sm text-racing-red">Head to Head</p>
                    <div className="rounded-full grad-accent text-white text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-wider">VS</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-white/5">
                    {sessionsToCompare.map((session, idx) => (
                      <div key={session.id} className="p-4 space-y-3">
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                          <div className={`timer-digit text-xl tabular-nums ${idx === 0 ? 'text-racing-red' : 'text-emerald-400'}`}>
                            {session.laps.length > 0
                              ? formatTime(Math.min(...session.laps.map(l => l.time)))
                              : '--:--.--'}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Best</div>
                        </div>
                        <div className="aspect-square rounded-xl bg-white/[0.03] border border-white/5 p-2">
                          <TrackMap
                            path={session.path}
                            startFinishLine={session.startFinishLine}
                            strokeColor={idx === 0 ? "#FF1744" : "#10B981"}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="space-y-1">
                          {session.laps.slice(0, 5).map(lap => (
                            <div key={lap.number} className="flex justify-between py-1">
                              <span className="text-[11px] font-bold text-slate-400">L{lap.number}</span>
                              <span className="timer-digit text-xs text-white tabular-nums">{formatTime(lap.time)}</span>
                            </div>
                          ))}
                          {session.laps.length > 5 && (
                            <div className="text-[10px] text-center text-slate-500 font-semibold pt-1">+{session.laps.length - 5} more</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active session */}
              <div className="rounded-3xl surface-card overflow-hidden">
                <div className="px-5 py-4 flex justify-between items-center gap-3 border-b border-white/5">
                  <div className="min-w-0">
                    <p className="label-sm text-racing-red mb-0.5">Active</p>
                    <div className="flex items-center gap-1.5 text-sm text-slate-300 font-semibold flex-wrap">
                      <span>{laps.length} laps</span>
                      <span className="text-slate-600">·</span>
                      <span>{sessionPath.length} pts</span>
                      {selectedRide && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400 truncate">{selectedRide.brand} {selectedRide.model}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { if(window.confirm('Clear current session?')) { setLaps([]); setSessionPath([]); } }}
                      className="rounded-full btn-ghost text-xs font-bold px-3 py-1.5"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        const newSession: SessionData = {
                          id: Date.now().toString(),
                          date: new Date().toISOString(),
                          laps,
                          path: sessionPath,
                          startFinishLine,
                          motorcycle: selectedRide ? { brand: selectedRide.brand, model: selectedRide.model, year: selectedRide.year } : undefined
                        };
                        const updated = [newSession, ...savedSessions];
                        setSavedSessions(updated);
                        localStorage.setItem('apex_sessions', JSON.stringify(updated));
                        alert('Session archived!');
                      }}
                      disabled={laps.length === 0}
                      className="rounded-full btn-success text-xs font-bold px-3 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Archive
                    </button>
                  </div>
                </div>

                {sessionPath.length > 2 && (
                  <div className="mx-5 my-4 aspect-[16/9] rounded-2xl bg-white/[0.03] border border-white/5 p-2">
                    <TrackMap path={sessionPath} startFinishLine={startFinishLine} userLocation={currentLocation} className="w-full h-full" />
                  </div>
                )}

                {laps.length > 0 ? (
                  <div className="px-5 pb-4">
                    {laps.map((lap) => (
                      <div key={lap.number} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                        <span className="text-sm font-bold text-slate-300">Lap {lap.number.toString().padStart(2, '0')}</span>
                        <span className="timer-digit text-sm text-white tabular-nums">{formatTime(lap.time)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-slate-500 font-semibold">No laps recorded yet</p>
                  </div>
                )}
              </div>

              {/* Session history */}
              <div>
                <p className="label-sm mb-3 px-1">Session History</p>
                {savedSessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
                    <p className="text-sm text-slate-500 font-semibold">No archives found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedSessions.map((session) => {
                      const selected = comparisonIds.includes(session.id);
                      return (
                        <div key={session.id} className={`rounded-2xl overflow-hidden transition-all
                          ${selected ? 'surface-elevated ring-2 ring-racing-red/40' : 'surface-card'}`}>
                          <div className="px-4 py-3 flex justify-between items-start gap-3 border-b border-white/5">
                            <div className="min-w-0">
                              <p className="text-[15px] font-bold text-white truncate">
                                {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mt-0.5 flex-wrap">
                                <span>{new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                {session.motorcycle && (
                                  <>
                                    <span className="text-slate-600">·</span>
                                    <span className="truncate">{session.motorcycle.brand} {session.motorcycle.model}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="timer-digit text-[15px] text-white tabular-nums">
                                {session.laps.length > 0
                                  ? formatTime(Math.min(...session.laps.map(l => l.time)))
                                  : '--:--.--'}
                              </p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Best</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4">
                            <div className="w-16 h-16 rounded-xl bg-white/[0.03] border border-white/5 p-1 flex-shrink-0">
                              <TrackMap
                                path={session.path}
                                startFinishLine={session.startFinishLine}
                                strokeColor={selected ? "#FF1744" : "#64748b"}
                                userLocation={comparingSessionId === session.id ? currentLocation : null}
                                className="w-full h-full"
                              />
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex gap-4 mb-2">
                                <div>
                                  <p className="timer-digit text-white text-sm tabular-nums">{session.laps.length}</p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Laps</p>
                                </div>
                                <div>
                                  <p className="timer-digit text-white text-sm tabular-nums">{(session.path.length / 10).toFixed(0)}s</p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Log</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  onClick={() => {
                                    if(isRecording) return alert('Stop recording first.');
                                    if(window.confirm('Restore this session?')) {
                                      setLaps(session.laps);
                                      setSessionPath(session.path);
                                      setStartFinishLine(session.startFinishLine);
                                      setCurrentTab(AppTab.TIMER);
                                    }
                                  }}
                                  className="rounded-full bg-white text-black text-[11px] font-bold px-3 py-1.5"
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => toggleComparison(session.id)}
                                  className={`rounded-full text-[11px] font-bold px-3 py-1.5 transition-colors
                                    ${selected
                                      ? 'btn-primary'
                                      : 'btn-ghost'}`}
                                >
                                  {selected ? 'Selected' : 'Compare'}
                                </button>
                                <button
                                  onClick={() => setComparingSessionId(comparingSessionId === session.id ? null : session.id)}
                                  className={`rounded-full text-[11px] font-bold px-3 py-1.5 transition-colors
                                    ${comparingSessionId === session.id
                                      ? 'btn-primary'
                                      : 'btn-ghost'}`}
                                >
                                  {comparingSessionId === session.id ? 'Live Off' : 'Live'}
                                </button>
                                <button
                                  onClick={() => {
                                    if(window.confirm('Delete archive?')) {
                                      const updated = savedSessions.filter(s => s.id !== session.id);
                                      setSavedSessions(updated);
                                      localStorage.setItem('apex_sessions', JSON.stringify(updated));
                                    }
                                  }}
                                  className="rounded-full btn-ghost px-2.5 py-1.5 hover:text-racing-red transition-colors"
                                  aria-label="Delete"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {comparingSessionId === session.id && (
                            <div className="border-t border-white/5 p-4 animate-fade-in">
                              <div className="flex justify-between items-center mb-3">
                                <span className="label-sm text-racing-red animate-pulse">Live Position</span>
                                <span className="text-xs text-slate-400 font-semibold">{new Date(session.date).toLocaleDateString()}</span>
                              </div>
                              <div className="aspect-[16/10] rounded-xl bg-white/[0.03] border border-white/5 p-2">
                                <TrackMap
                                  path={session.path}
                                  startFinishLine={session.startFinishLine}
                                  userLocation={currentLocation}
                                  className="w-full h-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Navigation bar — modern floating pill style */}
      <nav className={`pb-safe flex-shrink-0 ${isRecording ? 'hidden' : ''}`}>
        <div className="px-3 pb-3 pt-1">
          <div className="surface-glass rounded-3xl grid grid-cols-4 p-1.5">
            {([
              { tab: AppTab.TIMER, label: 'Timer', Icon: StopwatchIcon },
              { tab: AppTab.ANALYSIS, label: 'Data', Icon: ChartIcon },
              { tab: AppTab.GARAGE, label: 'Garage', Icon: BikeIcon },
              { tab: AppTab.MAPS, label: 'Tracks', Icon: PinIcon },
            ] as const).map(({ tab, label, Icon }) => {
              const active = currentTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(tab)}
                  className={`relative rounded-2xl h-14 flex flex-col items-center justify-center gap-0.5 transition-all
                    ${active ? 'grad-accent shadow-lg shadow-racing-red/30' : 'active:bg-white/5'}`}
                >
                  <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span className={`text-[10px] font-bold tracking-wide ${active ? 'text-white' : 'text-slate-500'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default App;
