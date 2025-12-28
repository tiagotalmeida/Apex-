import React, { useState, useEffect } from 'react';
import TimerView from './components/TimerView';
import GarageView from './components/GarageView';
import MapsView from './components/MapsView';
import TrackMap from './components/TrackMap';
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

  // Load saved sessions and ride from local storage on mount
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem('apex_sessions');
      if (storedSessions) {
        setSavedSessions(JSON.parse(storedSessions));
      }
      const storedRide = localStorage.getItem('apex_garage_ride');
      if (storedRide) {
        setSelectedRide(JSON.parse(storedRide));
      }
    } catch (e) {
      console.error("Failed to load local data", e);
    }
  }, []);

  // Geolocation setup
  useEffect(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        const newCoord: Coordinate = {
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          timestamp: position.timestamp
        };
        setCurrentLocation(newCoord);

        if (isRecording) {
          setSessionPath(prev => [...prev, newCoord]);
        }
      },
      (error) => {
        console.error("Error watching position:", error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [isRecording]);

  const toggleComparison = (id: string) => {
    setComparisonIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const sessionsToCompare = savedSessions.filter(s => comparisonIds.includes(s.id));

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      {/* App Content Area */}
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
          <GarageView 
            selectedRide={selectedRide} 
            setSelectedRide={setSelectedRide} 
          />
        )}
        {currentTab === AppTab.MAPS && (
          <MapsView 
            currentLocation={currentLocation} 
            selectedRide={selectedRide}
            setSelectedRide={setSelectedRide}
          />
        )}
        {currentTab === AppTab.ANALYSIS && (
            <div className="flex flex-col h-full bg-black">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-racing-dark">
                    <div>
                        <h2 className="text-2xl font-display text-white uppercase italic">Telemetry</h2>
                        <p className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mt-1">Session Data & Analysis</p>
                    </div>
                    {comparisonIds.length > 0 && (
                      <button 
                        onClick={() => setComparisonIds([])}
                        className="text-[10px] font-bold text-racing-red uppercase bg-racing-red/10 px-3 py-1 rounded border border-racing-red/30"
                      >
                        Clear Selection ({comparisonIds.length})
                      </button>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-8">
                    {/* Comparison View Section */}
                    {comparisonIds.length === 2 && sessionsToCompare.length === 2 && (
                      <div className="bg-racing-dark/50 rounded-2xl border-2 border-racing-purple/50 p-4 space-y-4 animate-fade-in shadow-[0_0_30px_rgba(175,82,222,0.15)]">
                        <div className="flex justify-between items-center px-2">
                           <h3 className="text-racing-purple font-display text-sm uppercase italic">Session Comparison</h3>
                           <div className="bg-racing-purple text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">VS</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           {sessionsToCompare.map((session, idx) => (
                             <div key={session.id} className="space-y-3">
                                <div className="text-center">
                                   <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                     {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                   </div>
                                   <div className="text-racing-yellow font-mono text-lg">
                                     {session.laps.length > 0 
                                         ? formatTime(Math.min(...session.laps.map(l => l.time))) 
                                         : '--:--.--'}
                                   </div>
                                   <div className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Best Lap</div>
                                </div>
                                <div className="h-40 bg-black/60 rounded-xl border border-gray-800 p-2">
                                   <TrackMap 
                                     path={session.path} 
                                     startFinishLine={session.startFinishLine} 
                                     strokeColor={idx === 0 ? "#AF52DE" : "#34C759"} 
                                     className="w-full h-full" 
                                   />
                                </div>
                                <div className="bg-black/40 rounded-lg p-2 space-y-1">
                                   {session.laps.slice(0, 5).map(lap => (
                                     <div key={lap.number} className="flex justify-between text-[10px]">
                                        <span className="text-gray-500 font-bold uppercase">L{lap.number}</span>
                                        <span className="text-white font-mono">{formatTime(lap.time)}</span>
                                     </div>
                                   ))}
                                   {session.laps.length > 5 && <div className="text-[8px] text-center text-gray-700 font-bold uppercase">...</div>}
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}

                    {/* Current Session Control */}
                    <div className="bg-racing-card rounded-xl border border-gray-700 p-5 shadow-xl">
                         <div className="flex justify-between items-start mb-6">
                             <div>
                                 <h3 className="text-racing-yellow font-bold uppercase tracking-widest text-xs">Active Session</h3>
                                 <div className="text-xs text-gray-500 font-mono mt-1">
                                    {laps.length} Laps • {sessionPath.length} Logged points
                                 </div>
                                 {selectedRide && (
                                   <div className="text-[10px] text-racing-purple font-bold uppercase tracking-tight mt-1">
                                     Ride: {selectedRide.year} {selectedRide.brand} {selectedRide.model}
                                   </div>
                                 )}
                             </div>
                             <div className="flex space-x-2">
                                 <button
                                     onClick={() => {
                                         if(window.confirm('Clear current session data?')) {
                                             setLaps([]);
                                             setSessionPath([]);
                                         }
                                     }}
                                     className="px-3 py-1.5 bg-gray-800 text-white text-[10px] font-bold rounded uppercase tracking-wider hover:bg-racing-red transition-colors"
                                 >
                                     Reset
                                 </button>
                                 <button
                                     onClick={() => {
                                         const newSession: SessionData = {
                                             id: Date.now().toString(),
                                             date: new Date().toISOString(),
                                             laps: laps,
                                             path: sessionPath,
                                             startFinishLine: startFinishLine
                                         };
                                         const updated = [newSession, ...savedSessions];
                                         setSavedSessions(updated);
                                         localStorage.setItem('apex_sessions', JSON.stringify(updated));
                                         alert('Session archived!');
                                     }}
                                     disabled={laps.length === 0}
                                     className="px-3 py-1.5 bg-racing-green text-black text-[10px] font-bold rounded uppercase tracking-wider hover:bg-green-400 transition-colors disabled:opacity-30"
                                 >
                                     Archive
                                 </button>
                             </div>
                         </div>
                         
                         {sessionPath.length > 2 && (
                             <div className="mb-6 h-40 bg-black/40 rounded-lg border border-gray-800 p-2 flex items-center justify-center">
                                 <TrackMap path={sessionPath} startFinishLine={startFinishLine} userLocation={currentLocation} className="w-full h-full" />
                             </div>
                         )}

                         {laps.length > 0 && (
                             <div className="space-y-2 border-t border-gray-700 pt-4">
                                 {laps.map((lap) => (
                                     <div key={lap.number} className="flex justify-between items-center p-2 bg-black/20 rounded">
                                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lap {lap.number.toString().padStart(2, '0')}</span>
                                         <span className="font-mono text-sm text-white">{formatTime(lap.time)}</span>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>

                    {/* Saved Sessions History */}
                    <div className="space-y-4">
                        <h3 className="text-white font-bold uppercase tracking-widest text-xs ml-1">Session History</h3>
                        {savedSessions.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl bg-racing-dark/30">
                                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">No archives found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 pb-12">
                                {savedSessions.map((session) => (
                                    <div key={session.id} className={`bg-racing-card rounded-xl border-2 transition-all overflow-hidden ${comparisonIds.includes(session.id) ? 'border-racing-purple shadow-[0_0_15px_rgba(175,82,222,0.1)]' : 'border-gray-800'}`}>
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex flex-col">
                                                    <span className="font-display text-white text-base">
                                                        {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                                        {new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-racing-yellow font-mono text-sm">
                                                        {session.laps.length > 0 
                                                            ? formatTime(Math.min(...session.laps.map(l => l.time))) 
                                                            : '--:--.--'}
                                                    </span>
                                                    <span className="text-[8px] text-gray-600 font-bold uppercase">Best Lap</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col space-y-4">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-20 h-20 bg-black/30 rounded border border-gray-800 p-1 flex-shrink-0">
                                                        <TrackMap 
                                                          path={session.path} 
                                                          startFinishLine={session.startFinishLine} 
                                                          strokeColor={comparisonIds.includes(session.id) ? "#AF52DE" : "#555"} 
                                                          userLocation={comparingSessionId === session.id ? currentLocation : null}
                                                          className="w-full h-full" 
                                                        />
                                                    </div>
                                                    <div className="flex-grow flex flex-col justify-center space-y-3">
                                                        <div className="flex space-x-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-mono text-xs">{session.laps.length}</span>
                                                                <span className="text-[8px] text-gray-600 uppercase font-bold">Laps</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-white font-mono text-xs">{(session.path.length / 10).toFixed(0)}s</span>
                                                                <span className="text-[8px] text-gray-600 uppercase font-bold">Log Size</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    if(isRecording) return alert('Stop recording first.');
                                                                    if(window.confirm('Restore this session to timer?')) {
                                                                        setLaps(session.laps);
                                                                        setSessionPath(session.path);
                                                                        setStartFinishLine(session.startFinishLine);
                                                                        setCurrentTab(AppTab.TIMER);
                                                                    }
                                                                }}
                                                                className="flex-grow bg-white text-black text-[10px] font-bold py-1.5 rounded uppercase hover:bg-gray-200 transition-colors"
                                                            >
                                                                Restore
                                                            </button>
                                                            <button
                                                                onClick={() => toggleComparison(session.id)}
                                                                className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase transition-colors ${comparisonIds.includes(session.id) ? 'bg-racing-purple text-white' : 'bg-gray-800 text-gray-400'}`}
                                                            >
                                                                {comparisonIds.includes(session.id) ? 'Selected' : 'Compare'}
                                                            </button>
                                                            <button
                                                                onClick={() => setComparingSessionId(comparingSessionId === session.id ? null : session.id)}
                                                                className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase transition-colors ${comparingSessionId === session.id ? 'bg-racing-red text-white' : 'bg-gray-800 text-gray-400'}`}
                                                            >
                                                                {comparingSessionId === session.id ? 'Live OFF' : 'Live Track'}
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    if(window.confirm('Delete archive?')) {
                                                                        const updated = savedSessions.filter(s => s.id !== session.id);
                                                                        setSavedSessions(updated);
                                                                        localStorage.setItem('apex_sessions', JSON.stringify(updated));
                                                                    }
                                                                }}
                                                                className="px-2 py-1.5 bg-gray-800 text-gray-400 rounded hover:text-racing-red transition-colors"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Live Preview */}
                                                {comparingSessionId === session.id && (
                                                  <div className="bg-black/60 rounded-lg p-4 border border-racing-red/30 animate-fade-in">
                                                     <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-racing-red uppercase animate-pulse">Live Position Monitoring</span>
                                                        <span className="text-[8px] text-gray-500 font-mono">Comparing to {new Date(session.date).toLocaleDateString()}</span>
                                                     </div>
                                                     <div className="h-64 w-full bg-racing-dark rounded flex items-center justify-center p-2">
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
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="bg-racing-dark border-t border-gray-800 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => setCurrentTab(AppTab.TIMER)} className={`flex flex-col items-center justify-center w-full h-full ${currentTab === AppTab.TIMER ? 'text-racing-red' : 'text-gray-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[10px] font-bold mt-1 uppercase">Timer</span>
          </button>
          <button onClick={() => setCurrentTab(AppTab.ANALYSIS)} className={`flex flex-col items-center justify-center w-full h-full ${currentTab === AppTab.ANALYSIS ? 'text-racing-red' : 'text-gray-500'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
            <span className="text-[10px] font-bold mt-1 uppercase">Data</span>
          </button>
          <button onClick={() => setCurrentTab(AppTab.GARAGE)} className={`flex flex-col items-center justify-center w-full h-full ${currentTab === AppTab.GARAGE ? 'text-racing-red' : 'text-gray-500'}`}>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-[10px] font-bold mt-1 uppercase">Garage</span>
          </button>
          <button onClick={() => setCurrentTab(AppTab.MAPS)} className={`flex flex-col items-center justify-center w-full h-full ${currentTab === AppTab.MAPS ? 'text-racing-red' : 'text-gray-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[10px] font-bold mt-1 uppercase">Pit Wall</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;