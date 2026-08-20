import client from "../../../shared/api/client";

export const importPreviewApi = {
  uploadSunflower(file, signal) {
    const body = new FormData();
    body.append("file", file);
    return client.post("/api/import-previews/sunflower", body, { signal });
  },
  getOpen(signal) {
    return client.get("/api/import-previews/open", {
      params: { sourceType: "sunflower_pdf" },
      signal,
    });
  },
  getById(batchId, signal) {
    return client.get(`/api/import-previews/${batchId}`, { signal });
  },
  updateRow(batchId, rowId, payload) {
    return client.patch(`/api/import-previews/${batchId}/rows/${rowId}`, payload);
  },
};
