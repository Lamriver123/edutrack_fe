"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, RefreshCw, Image as ImageIcon, Video, File as FileIcon, FileText, Music } from "lucide-react";
import { profileApi } from "@/lib/api/profile";
import { useNotice } from "@/components/ui/notice-provider";

export function MediaHistory({
  onPreview,
  refreshTrigger,
}: {
  onPreview: (url: string) => void;
  refreshTrigger: number;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setNotice } = useNotice();

  const getMediaIcon = (url: string) => {
    const lower = url.toLowerCase();
    
    if (lower.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      return <Music size={24} className="shrink-0 text-purple-600" />;
    }
    
    if (lower.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i)) {
      return <ImageIcon size={24} className="shrink-0 text-[var(--brand-600)]" />;
    }
    
    if (lower.match(/\.(mp4|webm|mov)$/i)) {
      return <Video size={24} className="shrink-0 text-pink-600" />;
    }
    
    if (lower.match(/\.(pdf)$/i)) {
      return <FileText size={24} className="shrink-0 text-red-500" />;
    }
    
    return <FileIcon size={24} className="shrink-0 text-[var(--neutral-500)]" />;
  };

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const data = await profileApi.getMediaHistory();
        setUrls(data.recentMediaUrls);
      } catch (error) {
        console.error("Failed to load media history", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [refreshTrigger]);

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setNotice({
        type: "success",
        text: "Đã copy đường dẫn phương tiện.",
      });
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <RefreshCw className="size-5 animate-spin text-[var(--neutral-400)]" />
      </div>
    );
  }

  if (urls.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)] text-[13px] text-[var(--neutral-500)]">
        <p>Chưa có file nào được tải lên gần đây.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {urls.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-[var(--neutral-200)] bg-white px-4 py-3 text-[14px] shadow-[var(--shadow-xs)]"
        >
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <span className="text-[14px] font-bold text-[var(--neutral-400)] w-5 text-center">
              {index + 1}
            </span>
            {getMediaIcon(url)}
            <span className="truncate font-medium text-[var(--neutral-700)]">
              {url}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              title="Xem trước"
              onClick={() => onPreview(url)}
              className="grid size-7 place-items-center rounded bg-[var(--brand-50)] text-[var(--brand-600)] transition hover:bg-[var(--brand-100)]"
            >
              <ExternalLink size={14} />
            </button>
            <button
              title="Copy link"
              onClick={() => copyToClipboard(url)}
              className="grid size-7 place-items-center rounded bg-[var(--neutral-100)] text-[var(--neutral-600)] transition hover:bg-[var(--neutral-200)]"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
