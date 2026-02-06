import React from 'react';
import './Battery.css';

function Battery({ level }) {
  const getBatteryColor = () => {
    if (level > 50) return '#4CAF50';
    if (level > 20) return '#ff9800';
    return '#f44336';
  };

  return (
    <div className="battery-container">
      <div className="battery-frame">
        <div className="battery-tip"></div>
        <div className="battery-level-bg">
          <div 
            className="battery-level" 
            style={{ 
              width: `${level}%`,
              background: getBatteryColor()
            }}
          ></div>
        </div>
      </div>
      <span className="battery-percentage" style={{ color: getBatteryColor() }}>
        %{level}
      </span>
    </div>
  );
}

export default Battery;