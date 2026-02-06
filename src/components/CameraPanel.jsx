import React, { useState, useEffect, useRef } from 'react';
import './CameraPanel.css';

function CameraPanel({ rosConnected }) {
  const [cameraFeed, setCameraFeed] = useState(null);
  const [photos, setPhotos] = useState([]);
  const canvasRef = useRef(null);

  // ROSBridge'den kamera görüntüsü almak için
  useEffect(() => {
    if (rosConnected) {
      // Gerçek uygulamada burası ROSBridge topic'inden görüntü alacak
      // Örnek: /camera/image_raw topic'i
      console.log('Kamera topic\'ine abone olundu');
      
      // Simülasyon için placeholder
      setCameraFeed('https://via.placeholder.com/640x480/2c3e50/ffffff?text=Camera+Feed');
    }
  }, [rosConnected]);

  const takePhoto = () => {
    const timestamp = new Date().toLocaleString('tr-TR');
    const photo = {
      id: Date.now(),
      image: cameraFeed,
      timestamp: timestamp
    };
    
    setPhotos([photo, ...photos]);
    
    // Flash efekti
    const flash = document.createElement('div');
    flash.className = 'camera-flash';
    document.querySelector('.camera-view').appendChild(flash);
    setTimeout(() => flash.remove(), 200);
    
    console.log('Fotoğraf çekildi:', timestamp);
  };

  return (
    <div className="panel camera-panel">
      <div className="panel-header">
        <span>KAMERA</span>
        <button className="capture-button" onClick={takePhoto} disabled={!rosConnected}>
          📷 FOTOĞRAF ÇEK
        </button>
      </div>
      
      <div className="panel-content">
        <div className="camera-view">
          {rosConnected ? (
            cameraFeed ? (
              <img src={cameraFeed} alt="Camera Feed" className="camera-image" />
            ) : (
              <div className="camera-loading">Kamera yükleniyor...</div>
            )
          ) : (
            <div className="camera-disconnected">
              <div className="connection-icon">📡</div>
              <div>ROS Bağlantısı Bekleniyor...</div>
            </div>
          )}
        </div>
        
        {photos.length > 0 && (
          <div className="photo-gallery">
            <div className="gallery-header">Çekilen Fotoğraflar ({photos.length})</div>
            <div className="photo-grid">
              {photos.map(photo => (
                <div key={photo.id} className="photo-item">
                  <img src={photo.image} alt="Captured" />
                  <div className="photo-timestamp">{photo.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CameraPanel;