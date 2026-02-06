import React from 'react';
import Battery from './Battery';
import StatusLights from './StatusLights';
import './TopBar.css';

function TopBar({ 
  batteryLevel, 
  rosConnected, 
  onStart, 
  onStop, 
  onReset,
  autonomousMode,
  manualMode,
  emergencyStop,
  onToggleScience,
  showScience
}) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <button 
          className="control-button start-button" 
          onClick={onStart}
          disabled={emergencyStop}
        >
          START
        </button>
        <button 
          className="control-button stop-button" 
          onClick={onStop}
        >
          STOP
        </button>
        <button 
          className="control-button reset-button" 
          onClick={onReset}
          disabled={!emergencyStop}
        >
          RESET
        </button>
      </div>
      
      <div className="topbar-center">
        <h1 className="title">GTU ROVER</h1>
      </div>
      
      <div className="topbar-right">
        <StatusLights 
          autonomousMode={autonomousMode}
          manualMode={manualMode}
          emergencyStop={emergencyStop}
        />
        <Battery level={batteryLevel} />
        <button 
          className="science-toggle-button"
          onClick={onToggleScience}
        >
          {showScience ? 'MAIN VIEW' : 'SCIENCE'}
        </button>
      </div>
    </div>
  );
}

export default TopBar;