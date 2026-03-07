import React from 'react';
import './StatusLights.css';

function StatusLights({ autonomousMode, manualMode, emergencyStop }) {
  return (
    <div className="status-lights">
      <div className="status-light-item">
        <div className={`status-light ${autonomousMode ? 'active yellow' : ''}`}></div>
        <span className="status-label">AUTO</span>
      </div>
      <div className="status-light-item">
        <div className={`status-light ${manualMode ? 'active green' : ''}`}></div>
        <span className="status-label">MANUAL</span>
      </div>
      <div className="status-light-item">
        <div className={`status-light ${emergencyStop ? 'active red' : ''}`}></div>
        <span className="status-label">E-STOP</span>
      </div>
    </div>
  );
}

export default StatusLights;