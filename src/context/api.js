import axios from "axios";

const API = "/";
export default axios.create({
  baseURL: API,
});
export { API };











