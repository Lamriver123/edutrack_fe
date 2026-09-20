export type InvoiceTemplate = {
  id: string;
  name: string;
  type: "SYSTEM" | "CUSTOM";
  version: number;
  basedOnVersion: string;
  editorData: Record<string, unknown>;
  html: string;
  css: string;
  isDefault: boolean;
  status: "ACTIVE" | "ARCHIVED";
  readonly: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SaveInvoiceTemplate = Pick<
  InvoiceTemplate,
  "name" | "basedOnVersion" | "editorData" | "html" | "css"
> & { isDefault: true };

export type TemplateSaveMode = "new" | "overwrite";

export type InvoiceRegion = {
  key: string;
  label: string;
  height: number;
  html: string;
};
export type InvoiceRegionRegistry = { regions: InvoiceRegion[]; css: string };
export type InvoiceImage = {
  id: string;
  name: string;
  url: string;
  width?: number;
  height?: number;
  mimeType: string;
  size: number;
  createdAt: string;
};
export type InvoiceImagePage = {
  images: InvoiceImage[];
  nextCursor: string | null;
};
