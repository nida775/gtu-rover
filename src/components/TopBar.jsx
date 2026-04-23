import React from 'react';
import Battery from './Battery';
import StatusLights from './StatusLights';
import './TopBar.css';

function TopBar({ 
  batteryLevel, 
  onStart, 
  onStop, 
  onReset,
  autonomousMode,
  manualMode,
  emergencyStop,
  theme,
  onToggleTheme
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
        <h1 className="title title-typing">&lt;gtu_rover&gt;</h1>
      </div>
      
      <div className="topbar-right">
        <button
          type="button"
          className={`theme-icon-button ${theme === 'dark' ? 'is-dark' : 'is-light'}`}
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Light tema' : 'Dark tema'}
          aria-label={theme === 'dark' ? 'Light tema ac' : 'Dark tema ac'}
        >
          <span className="theme-icon" />
        </button>
        <StatusLights 
          autonomousMode={autonomousMode}
          manualMode={manualMode}
          emergencyStop={emergencyStop}
        />
        <Battery level={batteryLevel} />
      </div>
    </div>
  );
}

export default TopBar;import React from 'react';
import Battery from './Battery';
import StatusLights from './StatusLights';
import './TopBar.css';

function TopBar({ 
  batteryLevel, 
  onStart, 
  onStop, 
  onReset,
  autonomousMode,
  manualMode,
  emergencyStop,
  theme,
  onToggleTheme
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
        <h1 className="title title-typing">&lt;gtu_rover&gt;</h1>
      </div>
      
      <div className="topbar-right">
        <button
          type="button"
          className={`theme-icon-button ${theme === 'dark' ? 'is-dark' : 'is-light'}`}
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Light tema' : 'Dark tema'}
          aria-label={theme === 'dark' ? 'Light tema ac' : 'Dark tema ac'}
        >
          <span className="theme-icon" />
        </button>
        <StatusLights 
          autonomousMode={autonomousMode}
          manualMode={manualMode}
          emergencyStop={emergencyStop}
        />
        <Battery level={batteryLevel} />
      </div>
    </div>
  );
}

export default TopBar;
