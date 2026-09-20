type PdfBlobResponse = {
  blob: Blob;
};

export async function openPdfInNewTab(
  loadPdf: () => Promise<PdfBlobResponse>,
) {
  const viewer = window.open("about:blank", "_blank");

  if (!viewer) {
    throw new Error(
      "Trình duyệt đã chặn tab xem PDF. Vui lòng cho phép mở cửa sổ bật lên.",
    );
  }

  viewer.opener = null;
  viewer.document.title = "Đang mở hóa đơn...";

  try {
    const download = await loadPdf();
    const pdfBlob =
      download.blob.type === "application/pdf"
        ? download.blob
        : new Blob([download.blob], { type: "application/pdf" });
    const objectUrl = URL.createObjectURL(pdfBlob);
    viewer.location.replace(objectUrl);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60 * 1000);
  } catch (error) {
    viewer.close();
    throw error;
  }
}
