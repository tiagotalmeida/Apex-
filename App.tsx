import React, { useState, useEffect } from 'react';
import TimerView from './components/TimerView';
import GarageView from './components/GarageView';
import MapsView from './components/MapsView';
import { Coordinate, Lap, AppTab, SessionData } from './types';
import { formatTime } from './services/locationService';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.TIMER);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [startFinishLine, setStartFinishLine] = useState<Coordinate | null>(null);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [sessionPath, setSessionPath] = useState<Coordinate[]>([]);
  const [savedSessions, setSavedSessions] = useState<SessionData[]>([]);

  // Load saved sessions from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('apex_sessions');
      if (stored) {
        setSavedSessions(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load sessions", e);
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
        const { latitude, longitude, accuracy, speed } = position.coords;
        const newCoord: Coordinate = {
          latitude,
          longitude,
          accuracy,
          speed,
          timestamp: position.timestamp
        };
        setCurrentLocation(newCoord);

        if (isRecording) {
          setSessionPath(prev => [...prev, newCoord]);
        }
      },
      (error) => {
        console.error("Error watching position", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [isRecording]);

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
          />
        )}
        {currentTab === AppTab.GARAGE && <GarageView />}
        {currentTab === AppTab.MAPS && <MapsView currentLocation={currentLocation} />}
        {currentTab === AppTab.ANALYSIS && (
            <div className="flex flex-col h-full bg-black">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-display text-white">ANALYSIS</h2>
                        <p className="text-gray-400 text-xs mt-1">Manage and review your sessions</p>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto no-scrollbar p-6 space-y-8">
                    {/* Current Session Control */}
                    <div className="bg-racing-card rounded-xl border border-gray-700 p-5">
                         <div className="flex justify-between items-start mb-4">
                             <div>
                                 <h3 className="text-racing-yellow font-bold uppercase tracking-wider text-sm">Current Session</h3>
                                 <div className="text-xs text-gray-400 mt-1">
                                    {laps.length} Laps recorded • {sessionPath.length} Data points
                                 </div>
                             </div>
                             <div className="flex space-x-2">
                                 <button
                                     onClick={() => {
                                         if(window.confirm('Clear current session data?')) {
                                             setLaps([]);
                                             setSessionPath([]);
                                         }
                                     }}
                                     className="px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition-colors"
                                 >
                                     RESET
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
                                         alert('Session saved successfully!');
                                     }}
                                     disabled={laps.length === 0}
                                     className="px-4 py-2 bg-racing-green text-black text-xs font-bold rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                     SAVE
                                 </button>
                             </div>
                         </div>
                         
                         {/* Mini lap list for current session */}
                         {laps.length > 0 && (
                             <div className="mt-4 border-t border-gray-700 pt-4 max-h-48 overflow-y-auto no-scrollbar space-y-2">
                                 {laps.map((lap) => (
                                     <div key={lap.number} className="flex justify-between text-sm">
                                         <span className="text-gray-400">Lap {lap.number}</span>
                                         <span className="font-mono text-white">{formatTime(lap.time)}</span>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>

                    {/* Saved Sessions List */}
                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-4">History</h3>
                        {savedSessions.length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-gray-800 rounded-xl">
                                <p className="text-gray-600 text-sm">No saved sessions.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {savedSessions.map((session) => (
                                    <div key={session.id} className="bg-racing-card rounded-xl border border-gray-800 p-4 hover:border-racing-red transition-colors group">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-display text-lg text-white">
                                                {new Date(session.date).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-gray-500 font-mono">
                                                {new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="text-xs text-gray-400">
                                                <div>LAPS: <span className="text-white">{session.laps.length}</span></div>
                                                <div>BEST: <span className="text-racing-yellow">
                                                    {session.laps.length > 0 
                                                        ? formatTime(Math.min(...session.laps.map(l => l.time))) 
                                                        : '--:--.--'}
                                                </span></div>
                                            </div>
                                            <div className="flex space-x-2">
                                                 <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if(window.confirm('Delete this session?')) {
                                                            const updated = savedSessions.filter(s => s.id !== session.id);
                                                            setSavedSessions(updated);
                                                            localStorage.setItem('apex_sessions', JSON.stringify(updated));
                                                        }
                                                    }}
                                                    className="p-2 text-gray-500 hover:text-racing-red"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if(isRecording) {
                                                            alert('Stop recording first.');
                                                            return;
                                                        }
                                                        if(window.confirm('Load this session? Current unsaved data will be replaced.')) {
                                                            setLaps(session.laps);
                                                            setSessionPath(session.path);
                                                            setStartFinishLine(session.startFinishLine);
                                                            alert("Session loaded.");
                                                        }
                                                    }}
                                                    className="bg-white text-black text-xs font-bold px-3 py-2 rounded hover:bg-gray-200"
                                                >
                                                    LOAD
                                                </button>
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
          <button
            onClick={() => setCurrentTab(AppTab.TIMER)}
            className={`flex flex-col items-center justify-center w-full h-full ${currentTab === AppTab.TIMER ? 'text-racing-red' : 'text-gray-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-bold mt-1 uppercase">Timer</span>
          </button>

          <button
            onClick={() => setCurrentTab(AppTab.ANALYSIS)}
            className={`flex flex-col items-center justify-center w-full h-full ${currentTab === AppTab.ANALYSIS ? 'text-racing-red' : 'text-gray-500'}`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <span className="text-[10px] font-bold mt-1 uppercase">Data</span>
          </button>

          <button
            onClick={() => setCurrentTab(AppTab.GARAGE)}
            className={`flex flex-col items-center justify-center w-full h-full ${currentTab === AppTab.GARAGE ? 'text-racing-red' : 'text-gray-500'}`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] font-bold mt-1 uppercase">Garage</span>
          </button>

          <button
            onClick={() => setCurrentTab(AppTab.MAPS)}
            className={`flex flex-col items-center justify-center w-full h-full ${currentTab === AppTab.MAPS ? 'text-racing-red' : 'text-gray-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-bold mt-1 uppercase">Pit Wall</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;