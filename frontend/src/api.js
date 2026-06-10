import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const getMeals = () => axios.get(`${API_BASE}/api/meals`).then((r) => r.data);

export const createRequest = (payload) =>
  axios.post(`${API_BASE}/api/request`, payload).then((r) => r.data);

export const getKitchenRequests = () =>
  axios.get(`${API_BASE}/api/kitchen/requests`).then((r) => r.data);

export const getMyRequests = () =>
  axios.get(`${API_BASE}/api/my-requests`).then((r) => r.data);

// Kitchen actions
export const setBudget = (id, payload) => axios.post(`${API_BASE}/api/kitchen/set-budget/${id}`, payload).then((r) => r.data);
export const rejectOrder = (id, reason) => axios.post(`${API_BASE}/api/kitchen/reject-order/${id}`, { reason }).then((r) => r.data);
export const approveBudget = (id) => axios.post(`${API_BASE}/api/kitchen/approve/${id}`).then((r) => r.data);
export const rejectBudget = (id, reason) => axios.post(`${API_BASE}/api/kitchen/reject/${id}`, { reason }).then((r) => r.data);
export const addKitchenNote = (id, note) => axios.post(`${API_BASE}/api/kitchen/note/${id}`, { note }).then((r) => r.data);

// Requester uploads the budget document (PDF). Amount was set by the kitchen.
export const uploadBudget = (id, formData) =>
  axios
    .post(`${API_BASE}/api/budget/upload/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);

export const fileUrl = (path) => (path ? `${API_BASE}${path}` : null);

export default API_BASE;
