import { apiRequest } from "./client";
import { tokenStorage } from "@/lib/auth/token-storage";
import type {
  InvoiceTemplate,
  SaveInvoiceTemplate,
  TemplateSaveMode,
  InvoiceRegionRegistry,
} from "@/types/invoice-template";

export const invoiceTemplateApi = {
  regions(signal?: AbortSignal) {
    return apiRequest<InvoiceRegionRegistry>("/invoice-templates/regions", {
      token: tokenStorage.getAccessToken(),
      signal,
    });
  },
  preview(html: string, css: string, signal?: AbortSignal) {
    return apiRequest<{ html: string }>("/invoice-templates/preview", {
      method: "POST",
      token: tokenStorage.getAccessToken(),
      body: JSON.stringify({ html, css }),
      signal,
    });
  },
  list(signal?: AbortSignal) {
    return apiRequest<InvoiceTemplate[]>("/invoice-templates", {
      token: tokenStorage.getAccessToken(),
      signal,
    });
  },
  getDefault(signal?: AbortSignal) {
    return apiRequest<InvoiceTemplate>("/invoice-templates/default", {
      token: tokenStorage.getAccessToken(),
      signal,
    });
  },
  save(
    template: InvoiceTemplate,
    payload: SaveInvoiceTemplate,
    mode: TemplateSaveMode,
  ) {
    const create =
      mode === "new" || template.readonly || template.type === "SYSTEM";
    return apiRequest<InvoiceTemplate>(
      create ? "/invoice-templates" : `/invoice-templates/${template.id}`,
      {
        method: create ? "POST" : "PATCH",
        token: tokenStorage.getAccessToken(),
        body: JSON.stringify(payload),
      },
    );
  },
  remove(templateId: string) {
    return apiRequest<{ message: string }>(
      `/invoice-templates/${templateId}`,
      {
        method: "DELETE",
        token: tokenStorage.getAccessToken(),
      },
    );
  },
};
