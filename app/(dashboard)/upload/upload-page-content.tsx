"use client";

import { useState } from "react";
import { MediaUploadBoard } from "@/components/media/media-upload-board";
import { MediaHistory } from "@/components/media/media-history";
import { FolderUp, History, ExternalLink, X, Music } from "lucide-react";

export function UploadPageContent() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' | 'audio' } | null>(null);

  const handleUploadSuccess = (url: string) => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handlePreview = (url: string) => {
    const lower = url.toLowerCase();
    const isImage = lower.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i);
    const isVideo = lower.match(/\.(mp4|webm|ogg|mov)$/i);
    const isAudio = lower.match(/\.(mp3|wav|ogg|m4a)$/i);

    if (isImage) {
      setPreviewMedia({ url, type: 'image' });
    } else if (isAudio) {
      setPreviewMedia({ url, type: 'audio' });
    } else if (isVideo) {
      setPreviewMedia({ url, type: 'video' });
    } else {
      const viewer = window.open("about:blank", "_blank");
      if (!viewer) {
        alert("Trình duyệt đã chặn tab xem trước. Vui lòng cho phép mở cửa sổ bật lên.");
        return;
      }
      viewer.document.title = "Đang tải tệp...";
      
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.blob();
        })
        .then((blob) => {
          let type = blob.type;
          if (url.toLowerCase().endsWith(".pdf") && type !== "application/pdf") {
            type = "application/pdf";
          }
          const finalBlob = new Blob([blob], { type });
          const objectUrl = URL.createObjectURL(finalBlob);
          viewer.location.replace(objectUrl);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60 * 1000);
        })
        .catch((error) => {
          console.error("Failed to fetch file for preview:", error);
          // Fallback if fetch fails (e.g., CORS issue)
          viewer.location.replace(url);
        });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-12 mx-auto w-full">
      <div className="md:col-span-8 flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-[var(--neutral-200)] pb-3">
          <div className="grid size-8 place-items-center rounded-lg bg-[var(--brand-100)] text-[var(--brand-600)]">
            <FolderUp size={18} />
          </div>
          <h2 className="text-[16px] font-extrabold text-[var(--neutral-900)]">Tải lên phương tiện</h2>
        </div>
        
        <MediaUploadBoard onUploadSuccess={handleUploadSuccess} />
      </div>

      <div className="md:col-span-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-[var(--neutral-200)] pb-3">
          <div className="grid size-8 place-items-center rounded-lg bg-teal-100 text-teal-600">
            <History size={18} />
          </div>
          <h2 className="text-[16px] font-extrabold text-[var(--neutral-900)]">Lịch sử tải lên</h2>
        </div>
        
        <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
          <p className="mb-4 text-[13px] text-[var(--neutral-500)]">Hiển thị tối đa 5 file được tải lên gần nhất.</p>
          <MediaHistory refreshTrigger={refreshTrigger} onPreview={handlePreview} />
        </div>
      </div>

      {previewMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--neutral-900)]/80 p-4">
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-black shadow-2xl flex items-center justify-center min-w-[300px] min-h-[150px]">
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30 transition backdrop-blur"
            >
              <X size={20} />
            </button>
            {previewMedia.type === 'video' && (
              <video src={previewMedia.url} controls autoPlay className="max-h-[90vh] max-w-[90vw] object-contain" />
            )}
            {previewMedia.type === 'audio' && (
              <div className="flex flex-col h-[300px] w-[400px] max-w-[90vw] items-center justify-center bg-zinc-900 px-8">
                <div className="flex-1 flex items-center justify-center">
                  <div className="grid size-24 place-items-center rounded-full bg-zinc-800 text-purple-400 border-4 border-zinc-700">
                    <Music size={40} />
                  </div>
                </div>
                <div className="w-full pb-8">
                  <audio src={previewMedia.url} controls autoPlay className="w-full outline-none" />
                </div>
              </div>
            )}
            {previewMedia.type === 'image' && (
              <img src={previewMedia.url} alt="Preview full" className="max-h-[90vh] max-w-[90vw] object-contain" />
            )}
          </div>
        </div>
      )}

    </div>
  );
}
