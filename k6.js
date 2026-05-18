import http from 'k6/http';

export let options = {
  scenarios: {
    step_load: {
      executor: 'ramping-arrival-rate',
      startRate: 2,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 2, duration: '10s' },
        { target: 4, duration: '10s' },
        { target: 6, duration: '10s' },
        { target: 8, duration: '10s' },
        { target: 10, duration: '10s' },
        { target: 12, duration: '10s' },
        { target: 15, duration: '10s' },
        { target: 20, duration: '10s' },
      ],
    },
  },
};

export default function () {
  let res = http.get('http://127.0.0.1:8000/parse?text=%E0%B8%82%E0%B8%B2%E0%B8%A2%E0%B8%9C%E0%B8%B1%E0%B8%81%20600');

  console.log(res.body); // 👉 ตรงนี้แหละ
}
