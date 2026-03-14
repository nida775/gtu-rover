import React, { useState, useEffect } from 'react';
import ROSLIB from 'roslib';
import './CameraPanel.css';

function CameraPanel({ rosConnected, ros, roverNamespace = 'rover1' }) {
  const [cameraFeed, setCameraFeed] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [laserOn, setLaserOn] = useState(false);

  // Gimbal topic referansı
  const gimbalTopicRef = React.useRef(null);

  // Gimbal topic'i oluştur
  useEffect(() => {
    if (!rosConnected || !ros) return;

    gimbalTopicRef.current = new ROSLIB.Topic({
      ros: ros,
      name: `/${roverNamespace}/gimbal_cmd`,
      messageType: 'std_msgs/String'
    });
    // Gimbal topic'ini ROS'a kaydet

    console.log(`📡 Gimbal topic hazır: /${roverNamespace}/gimbal_cmd`);

    return () => {
      if (gimbalTopicRef.current) {
        gimbalTopicRef.current.unadvertise();
      }
    };
  }, [rosConnected, ros, roverNamespace]);

  // Kamera topic'inden görüntü al
  useEffect(() => {
    if (!rosConnected || !ros) {
      setCameraFeed(null);
      return;
    }

    const cameraListener = new ROSLIB.Topic({
      ros: ros,
      name: `/${roverNamespace}/camera/compressed`,
      messageType: 'sensor_msgs/CompressedImage'
    });
    // Kamera topic'ine abone ol ve gelen görüntüyü base64 formatına çevirerek state'e kaydet

    cameraListener.subscribe((message) => {
      const imageData = 'data:image/jpeg;base64,' + message.data;
      setCameraFeed(imageData);
    });

    console.log(`📷 Kamera topic'ine abone olundu: /${roverNamespace}/camera/compressed`);

    return () => {
      cameraListener.unsubscribe();
    };
  }, [rosConnected, ros, roverNamespace]);

  // Gimbal komutu gönder
  const sendGimbalCommand = (command) => {
    if (!rosConnected || !gimbalTopicRef.current) {
      console.warn('ROS bağlantısı yok veya gimbal topic hazır değil');
      return;
    }

    const msg = new ROSLIB.Message({ data: command });
    gimbalTopicRef.current.publish(msg);
    console.log('Gimbal komutu gönderildi:', command);
  };

  // Klavye kontrolü
  useEffect(() => {
    if (!rosConnected) return;

    const handleKeyDown = (event) => {
      // Eğer input/textarea içindeyse klavye kontrolünü devre dışı bırak
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch(event.key) {
        case 'ArrowUp':
          event.preventDefault();
          sendGimbalCommand('w');
          break;
        case 'ArrowDown':
          event.preventDefault();
          sendGimbalCommand('s');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          sendGimbalCommand('a');
          break;
        case 'ArrowRight':
          event.preventDefault();
          sendGimbalCommand('d');
          break;
        case 'l':
        case 'L':
          event.preventDefault();
          setLaserOn(prev => !prev);
          sendGimbalCommand('l');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rosConnected]);

  // Fotoğraf çek
  const takePhoto = () => {
    if (!cameraFeed) return;

    const timestamp = new Date().toLocaleString('tr-TR');
    const photo = {
      id: Date.now(),
      image: cameraFeed,
      timestamp: timestamp
    };
    
    setPhotos([photo, ...photos]);
    
    // Flash efekti
    const cameraView = document.querySelector('.camera-view');
    if (cameraView) {
      const flash = document.createElement('div');
      flash.className = 'camera-flash';
      cameraView.appendChild(flash);
      setTimeout(() => flash.remove(), 200);
    }
    
    console.log('📸 Fotoğraf çekildi:', timestamp);
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
