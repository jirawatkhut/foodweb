// helper to build image URL for frontend
// If `image` looks like a MongoDB ObjectId (24 hex chars) we use GridFS route,
// otherwise fall back to legacy `/uploads/<filename>` static path or a placeholder.
export default function getImageUrl(image) {
  if (!image) return "/no-image.jpg";
  if (typeof image === "string" && /^[a-fA-F0-9]{24}$/.test(image)) {
    return `/api/images/file/${image}`;
  }
  return `/uploads/${image}`;
}
