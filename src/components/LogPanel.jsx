import React, { useState, useEffect, useRef } from 'react';
import './LogPanel.css';

function LogPanel({ rosConnected }) {
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    const newLog = {
      id: Date.now(),
      timestamp,
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  };

  useEffect(() => {
    // İlk başlangıç logları
    addLog('Sistem başlatılıyor...', 'info');
    
    setTimeout(() => {
      addLog('ROS Master bağlantısı deneniyor...', 'warning');
    }, 1000);
    
    setTimeout(() => {
      if (rosConnected) {
        addLog('ROSBridge bağlantısı başarılı!', 'success');
        addLog('/camera/image_raw topic\'ine abone olundu', 'success');
        addLog('/gps/fix topic\'ine abone olundu', 'success');
        addLog('/imu/data topic\'ine abone olundu', 'success');
        addLog('/cmd_vel topic\'i yayına hazır', 'success');
      }
    }, 2000);
  }, [rosConnected]);

  useEffect(() => {
    // Otomatik scroll
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
    addLog('Loglar temizlendi', 'info');
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="panel log-panel">
      <div className="panel-header">
        <span>SİSTEM LOGLARI</span>
        <button className="clear-logs-button" onClick={clearLogs}>
          🗑️ Temizle
        </button>
      </div>
      
      <div className="panel-content">
        <div className="log-container">
          {logs.length === 0 ? (
            <div className="no-logs">Henüz log kaydı yok</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className={`log-entry log-${log.type}`}>
                <span className="log-icon">{getLogIcon(log.type)}</span>
                <span className="log-timestamp">{log.timestamp}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}

export default LogPanel;