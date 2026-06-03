import React, { useState, useEffect } from 'react';
import './MapPanel.css';
import ROSLIB from 'roslib';

function MapPanel({ rosConnected,ros }) {
  const [gpsData, setGpsData] = useState({ lat: 0, lon: 0 , alt:0});
  const [twistData, setTwistData] = useState({ linear_x: 0,angular_z:0 });
  const [imuData, setImuData] = useState({  pitch: 0, roll: 0 }); //headingde ekleyebilirim sonra

  useEffect(() => {
    if (!rosConnected || !ros) return;
      // ROSBridge topic'lerinden veri al
      // /gps/fix - GPS konumu
      // /imu/data - IMU sensör verileri
      
      const gpsListener = new ROSLIB.Topic({
        ros: ros,
        name: '/gps/fix',
        messageType: 'sensor_msgs/NavSatFix'
      });

      const twistListener = new ROSLIB.Topic({
        ros: ros,
        name: '/twist_data',
        messageType: 'geometry_msgs/Twist'
      });

      gpsListener.subscribe((message) => {
        setGpsData({ lat: message.latitude, lon: message.longitude , alt: message.altitude});
      });

      twistListener.subscribe((message) => {
        setTwistData({ linear_x: message.linear.x, angular_z: message.angular.z });
      });
      
      
      return () => {
        gpsListener.unsubscribe();
        console.log(`gps listener topic aboneligi kapatildi`);
        twistListener.unsubscribe();
        console.log(`twist listener topic aboneligi kapatildi`);
        
      };
 }, [rosConnected ,ros]);

  const getCompassDirection = () => {
    const directions = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
    const index = Math.round(twistData.angular_z * (180 / Math.PI) / 45) % 8;
    return directions[index];
  };

  return (
    <div className="panel map-panel">
      <div className="panel-header">
        HARİTA & SENSÖRLER
        <div className="connection-status">
          <div className={`status-dot ${rosConnected ? 'connected' : 'disconnected'}`}></div>
          <span>{rosConnected ? 'Bağlı' : 'Bağlı Değil'}</span>
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
                    style={{ transform: `rotate(${twistData.angular_z * (180 / Math.PI)}deg)` }}
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
                  <span className="data-label">Heading:</span>
                  <span className="data-value">{(twistData.angular_z * (180 / Math.PI)).toFixed(1)}° {getCompassDirection()}</span>
                </div>
              </div>
              
              <div className="data-row">
                <div className="data-item">
                  <span className="data-label">Pitch:</span>
                  <span className="data-value">{imuData.pitch.toFixed(1)}°</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Roll:</span>
                  <span className="data-value">{imuData.roll.toFixed(1)}°</span>
                </div>
              </div>
              
              <div className="data-row">
                <div className="data-item">
                  <span className="data-label">Velocity:</span>
                  <span className="data-value">{twistData.linear_x.toFixed(2)} m/s</span>
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