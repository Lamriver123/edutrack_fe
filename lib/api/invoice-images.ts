import { apiRequest } from "./client";
import { tokenStorage } from "@/lib/auth/token-storage";
import type { InvoiceImage, InvoiceImagePage } from "@/types/invoice-template";

export const invoiceImagesApi = {
  list(before?: string, signal?: AbortSignal) {
    return apiRequest<InvoiceImagePage>(
      `/invoice-images${before ? `?before=${encodeURIComponent(before)}` : ""}`,
      { token: tokenStorage.getAccessToken(), signal },
    );
  },
  upload(file: File, signal?: AbortSignal) {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<InvoiceImage>("/invoice-images", {
      method: "POST",
      token: tokenStorage.getAccessToken(),
      body,
      signal,
    });
  },
  archive(id: string) {
    return apiRequest<{ id: string; archived: boolean }>(
      `/invoice-images/${id}`,
      { method: "DELETE", token: tokenStorage.getAccessToken() },
    );
  },
};
