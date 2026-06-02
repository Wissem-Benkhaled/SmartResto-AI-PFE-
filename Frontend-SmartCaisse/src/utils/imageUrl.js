export function resolveImageUrl(imagePath, apiBaseUrl = "") {
  if (!imagePath || typeof imagePath !== "string") return "";

  const trimmedPath = imagePath.trim().replace(/\\/g, "/");
  if (!trimmedPath) return "";

  if (/^(https?:)?\/\//i.test(trimmedPath) || /^(data:|blob:)/i.test(trimmedPath)) {
    return trimmedPath;
  }

  if (trimmedPath.startsWith("/products/") || trimmedPath.startsWith("/assets/") || trimmedPath.startsWith("/images/")) {
    return trimmedPath;
  }

  const normalizedBase = String(apiBaseUrl || "").replace(/\/$/, "");
  const normalizedPath = trimmedPath.replace(/^\/+/, "");

  if (!normalizedBase) {
    return `/${normalizedPath}`;
  }

  return `${normalizedBase}/${normalizedPath}`;
}