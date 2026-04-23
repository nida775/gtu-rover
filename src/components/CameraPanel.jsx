import React, { useEffect, useRef, useState } from 'react';
import './CameraPanel.css';
import ROSLIB from 'roslib';
import { WebrtcSer } from './WebrtcSer'; 

const roverNamespace = 'rover1';
const CAMERA_OPTIONS = [
  { id: 'zed_right', 
    label: 'ZED2 RIGHT Camera', 
    topic: '/zed/zed_node/right/color/rect/image/compressed', 
    resolution: '1080p', 
    role: 'RGB VIEW',
    msgtype: 'sensor_msgs/msg/CompressedImage'},
  { id: 'zed_left', 
    label: 'ZED2 Left Camera', 
    topic: '/zed/zed_node/left/color/rect/image/compressed', 
    resolution: '1080p', 
    role: 'RGB VIEW',
    msgtype: 'sensor_msgs/msg/CompressedImage'},
  { id: 'zed_depth', 
    label: 'ZED2 depth', 
    topic: '/zed/zed_node/depth/depth_registered/compressed', 
    resolution: '1080p', 
    role: 'DEPTH',
    msgtype: 'sensor_msgs/msg/CompressedImage'},
  { id: 'camera1', 
    label: 'camera 1', 
    topic: `/rover1/camera/compressed`, 
    webrtcsrc: 'rover_camera',
    resolution: '1080p', 
    role: 'gimbal movements',
    msgtype: 'sensor_msgs/msg/CompressedImage'}, //çalışmazsa msg ekle araya
    
];

const createCameraPlaceholder = (camera) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#08131f" />
          <stop offset="100%" stop-color="#123146" />
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill="url(#bg)" />
      <rect x="30" y="30" width="580" height="420" rx="18" fill="none" stroke="#3dd9eb" stroke-opacity="0.45" />
      <circle cx="320" cy="240" r="88" fill="#0b1f30" stroke="#8fff9c" stroke-opacity="0.45" />
      <text x="320" y="185" fill="#8fff9c" font-family="Arial, sans-serif" font-size="20" text-anchor="middle">ROS CAMERA STREAM</text>
      <text x="320" y="235" fill="#ffffff" font-family="Arial, sans-serif" font-size="34" font-weight="700" text-anchor="middle">${camera.label}</text>
      <text x="320" y="275" fill="#9ed7e2" font-family="Courier New, monospace" font-size="18" text-anchor="middle">${camera.topic}</text>
      <text x="320" y="330" fill="#85b1cc" font-family="Arial, sans-serif" font-size="15" text-anchor="middle">Gercek akista bu alan ROSBridge image topic verisi ile degisecek.</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

function CameraPanel({ rosConnected , ros  }) {
  const [selectedCameraId, setSelectedCameraId] = useState(CAMERA_OPTIONS[0].id);
  const [cameraFeed, setCameraFeed] = useState(null);
  const [photos, setPhotos] = useState([]);
  const cameraViewRef = useRef(null);
  const cameratopicRef = useRef(null);
  const activeCamera = CAMERA_OPTIONS.find((camera) => camera.id === selectedCameraId) ?? CAMERA_OPTIONS[0];
  const activeCameraPhotos = photos.filter((photo) => photo.cameraId === activeCamera.id);
  const latestPhoto = activeCameraPhotos[0] ?? null;
  
    // Gimbal topic referansı
  const gimbalTopicRef = React.useRef(null);
  const [laserOn, setLaserOn] = useState(false);
  
    // webrtc
  const streamUrl = `http://localhost:1984/api/webrtc?src=rover_camera`;
  const {videoRef, status } = WebrtcSer(streamUrl);
  // Gimbal topic'i oluştur
  useEffect(() => {
    if (!rosConnected || !ros) return;

    gimbalTopicRef.current = new ROSLIB.Topic({
      ros: ros,
      name: `/${roverNamespace}/gimbal_cmd`,
      messageType: 'std_msgs/String'
    });
    // Gimbal topic'ini ROS'a kaydet

    console.log(`Gimbal topic is ready : /${roverNamespace}/gimbal_cmd`);

    return () => {
      if (gimbalTopicRef.current) {
        gimbalTopicRef.current.unadvertise();
      }
    };
  }, [rosConnected, ros, roverNamespace]);
  
  // ROSBridge'den kamera görüntüsü almak için
  useEffect(() => {
    if (!rosConnected || !ros) {
      setCameraFeed(null);
      return;
    }
    cameratopicRef.current = new ROSLIB.Topic({
    	ros : ros,
    	name : activeCamera.topic,
    	messageType : activeCamera.msgtype
    
    });
    cameratopicRef.current.subscribe((message) => {
    	setCameraFeed(`data:image/jpeg;base64,${message.data}`);
    });
    console.log(`${activeCamera.topic} topic'ine abone olundu`);
    setCameraFeed(createCameraPlaceholder(activeCamera));

    return () => {
    	if (cameratopicRef.current) {
    		cameratopicRef.current.unsubscribe();
    		console.log(`${activeCamera.topic} topic aboneligi kapatildi`);
    	}
    };
  }, [activeCamera, rosConnected ,ros]);
  
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


  const takePhoto = () => {
    if (!cameraFeed) {
      return;
    }

    const timestamp = new Date().toLocaleString('tr-TR');
    const photo = {
      id: Date.now(),
      image: cameraFeed,
      cameraId: activeCamera.id,
      cameraLabel: activeCamera.label,
      topic: activeCamera.topic,
      timestamp: timestamp
    };
    
    setPhotos((prevPhotos) => [photo, ...prevPhotos]);
    
    // Flash efekti
    const flash = document.createElement('div');
    flash.className = 'camera-flash';
    cameraViewRef.current?.appendChild(flash);
    setTimeout(() => flash.remove(), 200);
    
    console.log(`${activeCamera.label} icin fotograf cekildi:`, timestamp);
  };

  return (
    <div className="panel camera-panel">
      <div className="panel-header">
        <span>CAMERA</span>
        <button className="capture-button" onClick={takePhoto} disabled={!rosConnected}>
          📷 TAKE PHOTO
        </button>
      </div>
      
      <div className="panel-content">
        <div className="camera-workspace">
          <aside className="camera-sidebar">
            <div className="camera-status-card">
              <div className="camera-status-topline">
                <span className={`camera-status-dot ${rosConnected ? 'online' : 'offline'}`}></span>
                <span>{rosConnected ? 'ROS stream is active' : 'Waiting for Ros connection'}</span>
              </div>
              <div className="camera-status-grid">
                <div className="camera-status-item">
                  <span className="camera-status-label">Active Camera</span>
                  <strong>{activeCamera.label}</strong>
                </div>
                <div className="camera-status-item">
                  <span className="camera-status-label">Resolution</span>
                  <strong>{activeCamera.resolution}</strong>
                </div>
                <div className="camera-status-item">
                  <span className="camera-status-label">Record Count</span>
                  <strong>{activeCameraPhotos.length}</strong>
                </div>
                <div className="camera-status-item">
                  <span className="camera-status-label">Latest Frame</span>
                  <strong>{latestPhoto ? latestPhoto.timestamp.split(' ')[1] ?? latestPhoto.timestamp : '--:--:--'}</strong>
                </div>
              </div>
            </div>

            <div className="camera-selector-block" role="tablist" aria-label="Kamera secimi">
              {CAMERA_OPTIONS.map((camera) => (
                <button
                  key={camera.id}
                  type="button"
                  className={`camera-option ${camera.id === activeCamera.id ? 'active' : ''}`}
                  onClick={() => setSelectedCameraId(camera.id)}
                  aria-pressed={camera.id === activeCamera.id}
                >
                  <div className="camera-option-topline">
                    <span className="camera-option-label">{camera.label}</span>
                    <span className="camera-option-resolution">{camera.resolution}</span>
                  </div>
                  <span className="camera-option-role">{camera.role}</span>
                  <span className="camera-option-topic">{camera.topic}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="camera-main">
            <div className="camera-stage-header">
              <div>
                <div className="camera-meta-label">Canli goruntu</div>
                <div className="camera-meta-value">{activeCamera.label}</div>
                <div className="camera-meta-topic">{activeCamera.topic}</div>
              </div>

              <div className="camera-stage-actions">
                <div className="camera-stage-chip">{activeCamera.role}</div>
                <div className="camera-stage-chip">{activeCamera.resolution}</div>
              </div>
            </div>

            <div className="camera-view" ref={cameraViewRef}>
		{activeCamera.webrtcsrc ? (
		    <div className="webrtc-container" style={{ width: '100%', height: '100%' }}>
		      <video
			ref={videoRef}
			autoPlay
			playsInline
			muted
			controls        // ← DEBUG için ekle (geçici)
			className="camera-video"
			style={{
			    width: '100%',
			    height: '100%',
			    objectFit: 'contain',
			    background: '#000'  // ← Siyah arkaplan (debug için)
			  }}
		      />
		      <div className="camera-overlay">
			<span className={`camera-badge status-${status}`}>{status.toUpperCase()}</span>
			<span className="camera-topic-badge">WebRTC: {activeCamera.webrtcsrc}</span>
		      </div>
		    </div>
		  ) : rosConnected ? (
                cameraFeed ? (
                  <>
                    <img src={cameraFeed} alt={activeCamera.label} className="camera-image" />
                    <div className="camera-overlay">
                      <span className="camera-badge">{activeCamera.label}</span>
                      <span className="camera-topic-badge">{activeCamera.topic}</span>
                    </div>
                  </>
                ) : (
                  <div className="camera-loading">Uploading Camera...</div>
                )
              ) : (
                <div className="camera-disconnected">
                  <div className="connection-icon">📡</div>
                  <div>Waiting For Ros Connection...</div>
                </div>
              )}
            </div>

            <div className="photo-gallery">
              <div className="gallery-header-row">
                <div className="gallery-header">Lastest Frames</div>
                <div className="gallery-subtitle">{activeCamera.label} icin {activeCameraPhotos.length} kayit</div>
              </div>

              {photos.length > 0 ? (
                <div className="photo-grid">
                  {photos.map(photo => (
                    <div key={photo.id} className={`photo-item ${photo.cameraId === activeCamera.id ? 'active' : ''}`}>
                      <img src={photo.image} alt="Captured" />
                      <div className="photo-camera-label">{photo.cameraLabel}</div>
                      <div className="photo-timestamp">{photo.timestamp}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-gallery">No frames recorded yet.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default CameraPanel;
