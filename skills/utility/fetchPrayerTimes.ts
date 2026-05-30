import axios from 'axios';

export const data = {
  name: 'fetchPrayerTimes',
  description: 'Fetch prayer times for a location',
  isHeavyTask: false,
};

export async function execute(location: string) {
  const response = await axios.get(`https://api.aladhan.com/v1/timingsByAddress?address=${encodeURIComponent(location)}`);
  const timings = response.data.data.timings;
  return timings;
}
