import React from 'react';
import './Battery.css';

function Battery({ level }) {
  const getBatteryColor = () => {
    if (level > 50) return '#6fff7d';
    if (level > 20) return '#f59e0b';
    return '#ff6b7a';
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
