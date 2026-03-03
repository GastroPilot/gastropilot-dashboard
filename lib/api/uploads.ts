import { getApiBaseUrl } from "./config";

async function uploadFile(endpoint: string, file: File): Promise<{ url: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/v1${endpoint}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload fehlgeschlagen" }));
    throw new Error(error.detail || "Upload fehlgeschlagen");
  }

  return response.json();
}

export const uploadsApi = {
  uploadMenuItemImage: (file: File) => uploadFile("/uploads/menu-item-image", file),
  uploadRestaurantImage: (file: File) => uploadFile("/uploads/restaurant-image", file),
};
