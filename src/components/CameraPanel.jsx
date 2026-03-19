import React, { useState, useEffect } from 'react';
import ROSLIB from 'roslib';
import { WebrtcSer} from './WebrtcSer';
import './CameraPanel.css';

function CameraPanel({ rosConnected, ros, roverNamespace = 'rover1' }) {
  
  const [photos, setPhotos] = useState([]);
  const [laserOn, setLaserOn] = useState(false);
  const jetson_IP = '192.168.1.65'; // Jetson cihazınızın IP adresini buraya yazın
  const streamUrl = `http://${jetson_IP}:1984/api/webrtc?src=rover_camera`; // WebRTC stream URL'si
  const { videoRef, status } = WebrtcSer(streamUrl); // WebRTC bağlantı durumunu alın
  
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

    const handkeydownListener = (event) => {
      // Eğer input/textarea içindeyse klavye kontrolünü devre dışı bırak
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      else if (event.key === 'l' || event.key === 'L') {
        setLaserOn(prev => !prev);
        const msg = new ROSLIB.Message({ data: 'lazer' });
        gimbalTopicRef.current.publish(msg);
        console.log('Lazer komutu gönderildi:', !laserOn ? 'açıldı' : 'kapandı');
      }
      else if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(event.key)) {
        const cmd = event.key.toLowerCase();
        const msg = new ROSLIB.Message({ data: cmd });
        gimbalTopicRef.current.publish(msg);
        console.log('Gimbal komutu gönderildi:', cmd);
      }
    };

    window.addEventListener('keydown', handkeydownListener);

    return () => {
      window.removeEventListener('keydown', handkeydownListener);
      if (gimbalTopicRef.current) {
        gimbalTopicRef.current.unadvertise(); // Gimbal topic'ini ROS'tan kaldır
        gimbalTopicRef.current = null;
      }
    };
  }, [rosConnected, ros, roverNamespace]);

  // Kamera topic'inden görüntü al . eski versiyon useffect ileydi sildim.
  

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
      
      <div className="camera-video-container">
        <video ref={videoRef} autoPlay playsInline muted  className='camera-view'/>
        {status !== 'streaming' && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>
              {status === 'connecting' && 'Kameraya bağlanılıyor...'}
              {status === 'connected' && 'Video bekleniyor...'}
              {status === 'disconnected' && 'Kamera bağlantısı yok'}
              {status === 'failed' && 'Bağlantı başarısız! go2rtc çalışıyor mu?'}
              {status === 'error' && 'Hata oluştu. Console\'u kontrol edin.'}
            </p>
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
  );
}

export default CameraPanel;
