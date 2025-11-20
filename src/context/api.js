import axios from "axios";

const API = "https://foodweb-3v56.onrender.com/";
export default axios.create({
  baseURL: API,
});
export { API };











