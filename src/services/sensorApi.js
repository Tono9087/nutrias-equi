// Centralized sensor API communication

export async function getLatestSensorReading() {
  const res = await fetch('/api/sensor');
  return res.json();
}
