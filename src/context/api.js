import axios from "axios";

const API = "https://foodweb-3v56.onrender.com/";
export default axios.create({
  baseURL: API,
});
export { API };

// helper: returns frontend image URL — supports GridFS ids (ObjectId 24 hex) and legacy filenames
export function getImageUrl(image) {
  if (!image) return "/no-image.jpg";
  // if looks like a Mongo ObjectId (24 hex chars) — use GridFS endpoint
  if (/^[0-9a-fA-F]{24}$/.test(image)) {
    return `${API}api/uploads/${image}`;
  }
  // otherwise fallback to static uploads folder (legacy)
  return `/uploads/${image}`;
}











