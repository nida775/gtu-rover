import { useEffect, useState } from "react";
import ROSLIB from "roslib";

const ROS_URL = "ws://localhost:9090"; // ROS çalışan bilgisayarın IP'si (farklı makineyse localhost yerine IP yaz)

// Tek bir ROS bağlantısı (tüm hook'lar paylaşır)
let ros = null;

function getRos() {
  if (!ros) {
    ros = new ROSLIB.Ros({ url: ROS_URL });
    ros.on("connection", () => console.log("✅ ROS bağlandı"));
    ros.on("error",      (e) => console.error("❌ ROS hata:", e));
    ros.on("close",      () => console.warn("⚠️ ROS bağlantısı kapandı"));
  }
  return ros;
}

// ─────────────────────────────────────────────
//  IMU Hook  →  /imu/data
// ─────────────────────────────────────────────
/*export function useImu() {
  const [imu, setImu] = useState(null);

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: getRos(),
      name: "/imu/data",
      messageType: "sensor_msgs/Imu",
    });

    topic.subscribe((msg) => {
      setImu({
        accel: {
          x: msg.linear_acceleration.x.toFixed(3),
          y: msg.linear_acceleration.y.toFixed(3),
          z: msg.linear_acceleration.z.toFixed(3),
        },
        gyro: {
          x: msg.angular_velocity.x.toFixed(3),
          y: msg.angular_velocity.y.toFixed(3),
          z: msg.angular_velocity.z.toFixed(3),
        },
        orientation: {
          x: msg.orientation.x.toFixed(3),
          y: msg.orientation.y.toFixed(3),
          z: msg.orientation.z.toFixed(3),
          w: msg.orientation.w.toFixed(3),
        },
      });
    });

    return () => topic.unsubscribe();
  }, []);

  return imu;
}*/

// ─────────────────────────────────────────────
//  GPS Hook  →  /gps/fix
// ─────────────────────────────────────────────
/*export function useGps() {
  const [gps, setGps] = useState(null);

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: getRos(),
      name: "/gps/fix",
      messageType: "sensor_msgs/NavSatFix",
    });

    topic.subscribe((msg) => {
      setGps({
        latitude:  msg.latitude.toFixed(6),
        longitude: msg.longitude.toFixed(6),
        altitude:  msg.altitude.toFixed(2),
      });
    });

    return () => topic.unsubscribe();
  }, []);

  return gps;
}*/
//gps ve ımu verisi almıyoruz şuanlık

// ─────────────────────────────────────────────
//  Sıcaklık Hook  →  /sensor/temperature
// ─────────────────────────────────────────────
export function useTemperature() {
  const [temp, setTemp] = useState(null);

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: getRos(),
      name: "/sensor/temperature",
      messageType: "sensor_msgs/Temperature",
    });

    topic.subscribe((msg) => {
      setTemp(msg.temperature.toFixed(1));
    });

    return () => topic.unsubscribe();
  }, []);

  return temp;
}

// ─────────────────────────────────────────────
//  Nem Hook  →  /sensor/humidity
// ─────────────────────────────────────────────
export function useHumidity() {
  const [hum, setHum] = useState(null);

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: getRos(),
      name: "/sensor/humidity",
      messageType: "sensor_msgs/RelativeHumidity",
    });

    topic.subscribe((msg) => {
      // 0.0-1.0 → %0-100
      setHum((msg.relative_humidity * 100).toFixed(1));
    });

    return () => topic.unsubscribe();
  }, []);

  return hum;
}

export function usePressure() {
  const [pressure, setPressure] = useState(null);

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: getRos(),
      name: "/sensor/pressure",
      messageType: "sensor_msgs/FluidPressure",
    });

    topic.subscribe((msg) => {
      setPressure(msg.fluid_pressure.toFixed(1));
    });

    return () => topic.unsubscribe();
  }, []);

  return pressure;
}

export function useGasData() {
  const [gas_data, setGasData] = useState({mq4:0 , mq7:0});

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: getRos(),
      name: "/sensor/gas_data",
      messageType: "sensor_msgs/Float32MultiArray",
    });

    topic.subscribe((msg) => {
      setGasData({
        mq4: msg.data[0].toFixed(2),
        mq7: msg.data[1].toFixed(2)
      });
    });

    return () => topic.unsubscribe();
  }, []);

  return gas_data;
}

export function usePh() {
  const [ph, setPh] = useState(7.00); //nötr

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: getRos(),
      name: "/sensor/ph",
      messageType: "sensor_msgs/Float32",
    });

    topic.subscribe((msg) => {
     setPh(msg.data.toFixed(2));
    });

    return () => topic.unsubscribe();
  }, []);

  return ph;
}


export function useco2() {
  const [co2, setco2] = useState(null);

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: getRos(),
      name: "/sensor/co2",
      messageType: "sensor_msgs/Float32",
    });

    topic.subscribe((msg) => {
      setco2(msg.data.toFixed(0));
    });

    return () => topic.unsubscribe();
  }, []);

  return co2;
}

export function useWeight() {
  const [weight, setWeight] = useState({w1:0, w2:0});

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: getRos(),
      name: "/sensor/weight",
      messageType: "sensor_msgs/Float32MultiArray",
    });

    topic.subscribe((msg) => {
      setWeight({
        w1: msg.data[0].toFixed(1),
        w2: msg.data[1].toFixed(1)
      });
    });

    return () => topic.unsubscribe();
  }, []);

  return weight;
}
