import React, { useState, useEffect, useRef, useMemo } from 'react';
import ROSLIB from 'roslib';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './SciencePanel.css';

//useState: stores the data, when changed re-renders
//useEffect: runs side effects (like subscribing to ROS topics) after render
//useRef: keeps mutable data that doesn't trigger re-renders (like current sensor readings)
//useMemo: memoizes the sensor configuration object to avoid unnecessary re-creation on each render
//ROS bağlantısı sağlandığında, her sensör için ROS topic'lerine abone olunur ve gelen veriler state'e kaydedilir. Ayrıca, belirli aralıklarla (örneğin her saniye) mevcut sensor değerleri bir veri dizisine eklenir. Bu veri, grafik ve tablo bileşenlerinde görselleştirilir. Kullanıcı, hangi sensörlerin grafik ve tabloda gösterileceğini seçebilir ve verileri CSV formatında dışa aktarabilir.

//rosConnected=ROS bağlantısının durumunu belirten boolean
//ros=ROSLIB.Ros nesnesi (App.jsx'te), ROS bağlantısını temsil eder . Creates and manages a WebSocket connection to the ROS bridge server. 
function SciencePanel({ rosConnected, ros }) {
  const [sensorData, setSensorData] = useState([]);
  const [selectedSensors, setSelectedSensors] = useState(['temperature', 'humidity', 'pressure','gas_data','ph','co2','weight']);
  // selectedSensors: kullanıcı tarafından grafik ve tabloda gösterilmek istenen sensörlerin listesi
  // sensorData: her saniye güncellenen ve son 20 ölçümü tutan dizi, grafik ve tabloda görselleştirilir
  // currentReadings: her sensörün en son değerini tutar, ROS topic'lerinden gelen verilerle güncellenir
  const [currentReadings, setCurrentReadings] = useState({
    temperature: 0,
    humidity: 0,
    pressure: 0,
    co2: 0,
    ph: 7.00,
    weight: {w1: 0, w2: 0},
    gas_data: {mq4: 0, mq7: 0}
  });

  // sensorConfig'i useMemo ile sarmalayarak her render'da yeniden oluşmasını engelle
  const sensorConfig = useMemo(() => ({
    temperature: { 
      name: 'Sıcaklık', 
      unit: '°C', 
      color: '#ff6384', 
      min: 0, 
      max: 50, 
      topic: '/sensor/temperature',
      messageType: 'sensor_msgs/Temperature'
    },
    humidity: { 
      name: 'Nem', 
      unit: '%', 
      color: '#36a2eb', 
      min: 0, 
      max: 100, 
      topic: '/sensor/humidity',
      messageType: 'sensor_msgs/RelativeHumidity'
    },
    pressure: { 
      name: 'Basınç', 
      unit: 'hPa', 
      color: '#4bc0c0', 
      min: 900, 
      max: 1100, 
      topic: '/sensor/pressure',
      messageType: 'sensor_msgs/FluidPressure'
    },
    co2: { 
      name: 'CO₂', 
      unit: 'ppm', 
      color: '#ff9f40', 
      min: 300, 
      max: 1000, 
      topic: '/sensor/co2',
      messageType: 'std_msgs/Float32'
    },
    ph: { 
      name: 'pH', 
      unit: '', 
      color: '#9966ff', 
      min: 0, 
      max: 14, 
      topic: '/sensor/ph',
      messageType: 'std_msgs/Float32'
    },
    mq4: { 
      name: 'MQ4', 
      unit: 'V', 
      color: '#ffcd56', 
      min: 0, 
      max: 5, 
      topic: '/sensor/gas_data',
      messageType: 'std_msgs/Float32MultiArray',
      index: 0 // MQ4 verisi, Float32MultiArray mesajının 0. indeksinde
    },
    mq7: { 
      name: 'MQ7', 
      unit: 'V', 
      color: '#ff9f40', 
      min: 0, 
      max: 5, 
      topic: '/sensor/gas_data',
      messageType: 'std_msgs/Float32MultiArray',
      index: 1 // MQ7 verisi, Float32MultiArray mesajının 1. indeksinde
    },
    weight1: {
      name: 'Weight 1',
      unit: 'kg',
      color: '#36a2eb',
      min: 0,
      max: 100,
      topic: '/sensor/weight1',
      messageType: 'std_msgs/Float32MultiArray',
      index: 0 // Weight 1 verisi, Float32MultiArray mesajının 0. indeksinde
    },
    weight2: {
      name: 'Weight 2',
      unit: 'kg',
      color: '#4bc0c0',
      min: 0,
      max: 100,
      topic: '/sensor/weight2',
      messageType: 'std_msgs/Float32MultiArray',
      index: 1 // Weight 2 verisi, Float32MultiArray mesajının 1. indeksinde
    }
  }), []); // Boş array = sadece bir kere oluşturulur
  //messageType, hangi fieldı okuyacağımızı belirlemek için kullanılır. Ros topic'lerinden gelen mesajların türüne göre (örneğin sensor_msgs/Temperature, sensor_msgs/RelativeHumidity) ilgili değeri çıkarmak için kullanılır. 

  // currentReadings için ref kullan (veri kaydetme için)
  const currentReadingsRef = useRef(currentReadings);
  
  // Her currentReadings değiştiğinde ref'i güncelle
  useEffect(() => {
    currentReadingsRef.current = currentReadings;
  }, [currentReadings]);

  useEffect(() => {
    if (!rosConnected || !ros) return;
    //connection var mı? yoksa işlemi yapma

    const listeners = {};

    // Her sensör için topic oluştur
    Object.keys(sensorConfig).forEach(sensorKey => {
      const config = sensorConfig[sensorKey];
      
      const listener = new ROSLIB.Topic({
        ros: ros,
        name: config.topic,
        messageType: config.messageType
      });
      //ıt reuses the same ROSLIB.Topic constructor to create a listener for each sensor based on its topic and message type defined in sensorConfig.
      // Gelen mesajları işlemek için subscribe olur. Her sensör için Ros Topic Listener oluşturulur. Bu bir Websocket bağlantısıdır ve ROS'dan gelen verileri dinler. Gelen mesajlar, sensörün türüne göre işlenir ve currentReadings state'ine kaydedilir.
/*new ROSLIB.Ros()
    → creates a native browser WebSocket object
    → calls new WebSocket('ws://192.168.1.100:9090')
    → starts listening for open/close/error/message events
    → fires ros.on('connection', ...) when handshake succeeds
    → fires ros.on('error', ...)    when something breaks
    → fires ros.on('close', ...)    when disconnected*/
      listener.subscribe((message) => {
        let value = 0;
        //subscribe fonksiyonu, ROS topic'inden gelen mesajları dinler ve her yeni mesaj geldiğinde çalışır. Gelen mesajın türüne göre (örneğin sıcaklık, nem, basınç) ilgili değeri çıkarır ve currentReadings state'ini günceller. Böylece, bileşen her zaman sensörlerin en son değerlerini gösterir.
        // Message type'a göre veriyi çıkar
        if (config.messageType === 'sensor_msgs/Temperature') {
          value = message.temperature;
        } else if (config.messageType === 'sensor_msgs/RelativeHumidity') {
          value = message.relative_humidity * 100; // 0-1 → 0-100%
        } else if (config.messageType === 'sensor_msgs/FluidPressure') {
          value = message.fluid_pressure / 100; // Pa → hPa
        } else if (config.messageType === 'std_msgs/Float32') {
          value = message.data;
        } else if (config.messageType === 'std_msgs/Float32MultiArray') {
          const idx = config.index !== undefined ? config.index : 0;
          if (message.data && message.data.length > idx) {
            value = message.data[idx];
          } else {            console.warn(`⚠️ ${config.name} topic'inden beklenen veri gelmedi:`, message);
          }
        }
        
        setCurrentReadings(prev => ({
          ...prev,
          [sensorKey]: value
        }));
      });
      // currentReadings state'i, ROS topic'lerinden gelen verilerle güncellenir

      listeners[sensorKey] = listener;
      console.log(`📊 ${config.name} topic'ine abone olundu:`, config.topic);
    });

    // Veri kaydetme interval'i
    const dataInterval = setInterval(() => {
      const newData = {
        timestamp: new Date().toLocaleTimeString('tr-TR'),
        ...currentReadingsRef.current // ref kullan
      };

      setSensorData(prev => {
        const updated = [...prev, newData];
        return updated.slice(-20); // Son 20 veriyi tut
      });
    }, 1000);
    // Her saniye, currentReadingsRef'den en son sensor değerlerini alır ve sensorData dizisine ekler. Bu, grafik ve tabloda görselleştirilecek verileri oluşturur. 

    return () => {
      // Temizleme
      Object.values(listeners).forEach(listener => listener.unsubscribe());
      clearInterval(dataInterval);
    };
  }, [rosConnected, ros, sensorConfig]); // ✅ Artık sensorConfig dahil
  // clenaup function'ı, bileşen unmount olduğunda veya rosConnected/ros/sensorConfig değiştiğinde çalışır. ROS topic aboneliklerini iptal eder ve veri kaydetme interval'ini temizler.

  const toggleSensor = (sensor) => {
    setSelectedSensors(prev =>
      prev.includes(sensor)
        ? prev.filter(s => s !== sensor)
        : [...prev, sensor]
    );
  };
  // Kullanıcı, hangi sensörlerin grafik ve tabloda gösterileceğini seçebilir. toggleSensor fonksiyonu, selectedSensors state'ini günceller. Eğer sensör zaten seçiliyse listeden çıkarır, değilse ekler.

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
 // Verileri CSV formatında dışa aktarmak için exportData fonksiyonu oluşturulur. Bu fonksiyon, sensorData dizisindeki verileri CSV formatına dönüştürür, bir Blob oluşturur ve kullanıcıya indirme bağlantısı sunar.excel

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
