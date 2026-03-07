import React, { useEffect, useRef, useState } from 'react';
import ROSLIB from 'roslib';
import './LogPanel.css';

function LogPanel({ rosConnected, ros }) {
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
    // Başlangıç logları
    addLog('Sistem başlatılıyor...', 'info');
  }, []);

  useEffect(() => {
    if (!rosConnected || !ros) return;

    try {
      const rosoutListener = new ROSLIB.Topic({
        ros: ros,
        name: '/rosout',
        messageType: 'rosgraph_msgs/Log'
      });

      rosoutListener.subscribe((message) => {
        const logType = getLogTypeFromLevel(message.level);
        addLog(message.msg, logType);
      });

      console.log('📋 ROS log topic\'lerine abone olundu');

      return () => {
        rosoutListener.unsubscribe();
      };
    } catch (error) {
      console.log('ROS log topic subscribe hatası:', error);
    }
  }, [rosConnected, ros]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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

  const getLogTypeFromLevel = (level) => {
    switch (level) {
      case 1: // DEBUG
      case 2: // INFO
        return 'info';
      case 4: // WARN
        return 'warning';
      case 8: // ERROR
      case 16: // FATAL
        return 'error';
      default:
        return 'info';
    }
  };



  return (
    <div className="panel log-panel">
      <div className="panel-header">
        <span>SİSTEM LOGLARI</span>
      </div>
      
      <div className="panel-content">
        <div className="log-container">
          {(logs || []).length === 0 ? (
            <div className="no-logs">Henüz log kaydı yok</div>
          ) : (
            (logs || []).map(log => (
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