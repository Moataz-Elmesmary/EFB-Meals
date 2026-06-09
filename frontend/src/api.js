import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const getMeals = () => axios.get(`${API_BASE}/api/meals`).then((r) => r.data);

export const createRequest = (payload) =>
  axios.post(`${API_BASE}/api/request`, payload).then((r) => r.data);

export const getKitchenRequests = () =>
  axios.get(`${API_BASE}/api/kitchen/requests`).then((r) => r.data);

export const createBudget = (requestId, formData) =>
  axios
    .post(`${API_BASE}/api/kitchen/budget/${requestId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then((r) => r.data);

export const markReady = (requestId) =>
  axios.post(`${API_BASE}/api/kitchen/ready/${requestId}`).then((r) => r.data);

export const fileUrl = (path) => (path ? `${API_BASE}${path}` : null);

export default API_BASE;
