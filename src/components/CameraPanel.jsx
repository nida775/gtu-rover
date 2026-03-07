import React, { useState, useEffect, useRef } from 'react';
import './CameraPanel.css';
import ROSLIB from 'roslib';

//ros ibaresini ekledim
function CameraPanel({ rosConnected, ros }) {
  const [cameraFeed, setCameraFeed] = useState(null);
  const [photos, setPhotos] = useState([]);
  const canvasRef = useRef(null);

  // ROSBridge'den kamera görüntüsü almak için
  useEffect(() => {
    if (!rosConnected || !ros) {
      setCameraFeed(null);
      return;
    }

    // Kamera topic'i - TOPIC ADINI KENDİ SİSTEMİNİZE GÖRE DEĞİŞTİRİN
    const cameraListener = new ROSLIB.Topic({
      ros: ros,
      name: '/camera/image_raw/compressed', // veya '/camera/rgb/image_raw/compressed'
      messageType: 'sensor_msgs/CompressedImage'
    });

    cameraListener.subscribe((message) => {
      // Base64 görüntüyü decode et
      const imageData = 'data:image/jpeg;base64,' + message.data;
      setCameraFeed(imageData);
    });

    console.log('📷 Kamera topic\'ine abone olundu');

    return () => {
      cameraListener.unsubscribe();
    };
  }, [rosConnected, ros]);

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