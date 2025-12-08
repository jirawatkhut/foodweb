import axios from "axios";

// For Vite, use VITE_API_URL. Fallback to '/' for same-origin during local dev.
const API = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? String(import.meta.env.VITE_API_URL)
  : "/";

export default axios.create({
  baseURL: API,
});
export { API };











