import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './SciencePanel.css';

function SciencePanel({ rosConnected }) {
  const [sensorData, setSensorData] = useState([]);
  const [selectedSensors, setSelectedSensors] = useState(['temperature', 'humidity', 'pressure']);
  const [currentReadings, setCurrentReadings] = useState({
    temperature: 0,
    humidity: 0,
    pressure: 0,
    co2: 0,
    ph: 0,
    conductivity: 0
  });

  const sensorConfig = {
    temperature: { name: 'Sıcaklık', unit: '°C', color: '#ff6384', min: 0, max: 50 },
    humidity: { name: 'Nem', unit: '%', color: '#36a2eb', min: 0, max: 100 },
    pressure: { name: 'Basınç', unit: 'hPa', color: '#4bc0c0', min: 900, max: 1100 },
    co2: { name: 'CO₂', unit: 'ppm', color: '#ff9f40', min: 300, max: 1000 },
    ph: { name: 'pH', unit: '', color: '#9966ff', min: 0, max: 14 },
    conductivity: { name: 'İletkenlik', unit: 'µS/cm', color: '#ffcd56', min: 0, max: 2000 }
  };

  useEffect(() => {
    if (rosConnected) {
      // ROSBridge'den sensör verilerini almak için
      const interval = setInterval(() => {
        const newData = {
          timestamp: new Date().toLocaleTimeString('tr-TR'),
          temperature: 20 + Math.random() * 10,
          humidity: 40 + Math.random() * 30,
          pressure: 1000 + Math.random() * 50,
          co2: 400 + Math.random() * 200,
          ph: 6 + Math.random() * 3,
          conductivity: 500 + Math.random() * 1000
        };

        setCurrentReadings(newData);
        setSensorData(prev => {
          const updated = [...prev, newData];
          // Son 20 veriyi tut
          return updated.slice(-20);
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [rosConnected]);

  const toggleSensor = (sensor) => {
    setSelectedSensors(prev =>
      prev.includes(sensor)
        ? prev.filter(s => s !== sensor)
        : [...prev, sensor]
    );
  };

  const exportData = () => {
    const csv = [
      ['Zaman', ...Object.keys(sensorConfig).map(key => sensorConfig[key].name)].join(','),
      ...sensorData.map(row =>
        [row.timestamp, ...Object.keys(sensorConfig).map(key => row[key].toFixed(2))].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensor_data_${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="science-panel-container">
      <div className="science-header">
        <h2>BİLİMSEL ÖLÇÜM PANELİ</h2>
        <button onClick={exportData} className="export-button" disabled={sensorData.length === 0}>
          📊 Verileri Dışa Aktar
        </button>
      </div>

      {/* Anlık Değerler */}
      <div className="current-readings">
        {Object.entries(sensorConfig).map(([key, config]) => (
          <div
            key={key}
            className={`reading-card ${selectedSensors.includes(key) ? 'active' : ''}`}
            onClick={() => toggleSensor(key)}
            style={{ borderColor: config.color }}
          >
            <div className="reading-name">{config.name}</div>
            <div className="reading-value" style={{ color: config.color }}>
              {currentReadings[key].toFixed(2)}
            </div>
            <div className="reading-unit">{config.unit}</div>
          </div>
        ))}
      </div>

      {/* Grafik */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>Zaman Serisi Grafiği</h3>
          <div className="chart-legend">
            {selectedSensors.map(sensor => (
              <span key={sensor} className="legend-item">
                <span
                  className="legend-color"
                  style={{ background: sensorConfig[sensor].color }}
                ></span>
                {sensorConfig[sensor].name}
              </span>
            ))}
          </div>
        </div>
        
        {rosConnected && sensorData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#666" />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ddd',
                  borderRadius: '8px'
                }}
              />
              {selectedSensors.map(sensor => (
                <Line
                  key={sensor}
                  type="monotone"
                  dataKey={sensor}
                  stroke={sensorConfig[sensor].color}
                  strokeWidth={2}
                  dot={false}
                  name={sensorConfig[sensor].name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-data">
            {rosConnected ? 'Veri toplanıyor...' : 'ROS Bağlantısı Bekleniyor...'}
          </div>
        )}
      </div>

      {/* Veri Tablosu */}
      <div className="data-table-container">
        <h3>Ölçüm Verileri</h3>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Zaman</th>
                {selectedSensors.map(sensor => (
                  <th key={sensor}>{sensorConfig[sensor].name} ({sensorConfig[sensor].unit})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensorData.slice(-10).reverse().map((row, index) => (
                <tr key={index}>
                  <td>{row.timestamp}</td>
                  {selectedSensors.map(sensor => (
                    <td key={sensor}>{row[sensor].toFixed(2)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SciencePanel;