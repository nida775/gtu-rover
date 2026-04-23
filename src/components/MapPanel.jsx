import React, { useState, useEffect } from 'react';
import './MapPanel.css';

function MapPanel({ rosConnected,ros }) {
  const [gpsData, setGpsData] = useState({ lat: 40.7128, lon: -74.0060 });
  const [imuData, setImuData] = useState({ heading: 0, pitch: 0, roll: 0 });
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    if (rosConnected) {
      // ROSBridge topic'lerinden veri al
      // /gps/fix - GPS konumu
      // /imu/data - IMU sensör verileri
      
      // Simülasyon
      const interval = setInterval(() => {
        setGpsData({
          lat: 40.7128 + (Math.random() - 0.5) * 0.001,
          lon: -74.0060 + (Math.random() - 0.5) * 0.001
        });
        
        setImuData({
          heading: Math.random() * 360,
          pitch: (Math.random() - 0.5) * 30,
          roll: (Math.random() - 0.5) * 30
        });
        
        setSpeed(Math.random() * 5);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [rosConnected]);

  const getCompassDirection = () => {
    const directions = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
    const index = Math.round(imuData.heading / 45) % 8;
    return directions[index];
  };

  return (
    <div className="panel map-panel">
      <div className="panel-header">
        MAP & SENSORS
        <div className="connection-status">
          <div className={`status-dot ${rosConnected ? 'connected' : 'disconnected'}`}></div>
          <span>{rosConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      <div className="panel-content">
        {rosConnected ? (
          <>
            <div className="map-view">
              <div className="map-placeholder">
                <div className="map-marker">📍</div>
                <div className="compass-overlay">
                  <div 
                    className="compass-needle" 
                    style={{ transform: `rotate(${imuData.heading}deg)` }}
                  >
                    ↑
                  </div>
                  <div className="compass-direction">{getCompassDirection()}</div>
                </div>
              </div>
            </div>
            
            <div className="sensor-data">
              <div className="data-row">
                <div className="data-item">
                  <span className="data-label">GPS Konum:</span>
                  <span className="data-value">
                    {gpsData.lat.toFixed(6)}°, {gpsData.lon.toFixed(6)}°
                  </span>
                </div>
              </div>
              
              <div className="data-row">
                <div className="data-item">
                  <span className="data-label">Yön (Heading):</span>
                  <span className="data-value">{imuData.heading.toFixed(1)}° {getCompassDirection()}</span>
                </div>
              </div>
              
              <div className="data-row">
                <div className="data-item">
                  <span className="data-label">Eğim (Pitch):</span>
                  <span className="data-value">{imuData.pitch.toFixed(1)}°</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Yalpalama (Roll):</span>
                  <span className="data-value">{imuData.roll.toFixed(1)}°</span>
                </div>
              </div>
              
              <div className="data-row">
                <div className="data-item">
                  <span className="data-label">Hız:</span>
                  <span className="data-value">{speed.toFixed(2)} m/s</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="disconnected-message">
            ROS Bağlantısı Bekleniyor...
          </div>
        )}
      </div>
    </div>
  );
}

export default MapPanel;
