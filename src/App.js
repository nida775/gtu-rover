import React, { useState, useEffect } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import CameraPanel from './components/CameraPanel';
import MapPanel from './components/MapPanel';
import LogPanel from './components/LogPanel';
import TaskPanel from './components/TaskPanel';
import SciencePanel from './components/SciencePanel';

function App() {
  const [rosConnected, setRosConnected] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(50);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [showScience, setShowScience] = useState(false);

  // ROS bağlantısı simülasyonu
  useEffect(() => {
    // Gerçek uygulamada burası ROSBridge bağlantısı olacak
    const timer = setTimeout(() => {
      setRosConnected(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    if (!emergencyStop) {
      setManualMode(true);
      console.log('Rover başlatıldı');
    }
  };

  const handleStop = () => {
    setEmergencyStop(true);
    setManualMode(false);
    setAutonomousMode(false);
    console.log('Acil durdurma aktif');
  };

  const handleReset = () => {
    setEmergencyStop(false);
    console.log('Sistem yeniden başlatıldı');
  };

  return (
    <div className="App">
      <TopBar 
        batteryLevel={batteryLevel}
        rosConnected={rosConnected}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
        autonomousMode={autonomousMode}
        manualMode={manualMode}
        emergencyStop={emergencyStop}
        onToggleScience={() => setShowScience(!showScience)}
        showScience={showScience}
      />
      
      {!showScience ? (
        <div className="content-grid">
          <div className="camera-section">
            <CameraPanel rosConnected={rosConnected} />
          </div>
          
          <div className="map-section">
            <MapPanel rosConnected={rosConnected} />
          </div>
          
          <div className="log-section">
            <LogPanel rosConnected={rosConnected} />
          </div>
          
          <div className="task-section">
            <TaskPanel />
          </div>
        </div>
      ) : (
        <SciencePanel rosConnected={rosConnected} />
      )}
    </div>
  );
}

export default App;
