"use client";

import { useState, useRef, type ChangeEvent, useEffect } from "react";

import { UploadCloud, Scissors, ZoomIn, X, Loader2, Image as ImageIcon, Video, File as FileIcon, Mic, Square, PlayCircle } from "lucide-react";
import { profileApi } from "@/lib/api/profile";
import { QrCropBox, QrCropToolbar, type QrCropState, normalizeQrCrop } from "@/components/profile/profile-qr-crop";
import { useNotice } from "@/components/ui/notice-provider";
import { MediaTrimSlider } from "@/components/media/media-trim-slider";

const INITIAL_CROP: QrCropState = {
  height: 100,
  width: 100,
  x: 0,
  y: 0,
};

function formatFileSize(size: number) {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))}KB` : `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const bps = 16;
  const blockAlign = numCh * (bps / 8);
  const byteRate = sr * blockAlign;
  const dataSize = buffer.length * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);

  writeString(v, 0, 'RIFF');
  v.setUint32(4, 36 + dataSize, true);
  writeString(v, 8, 'WAVE');
  writeString(v, 12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, numCh, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, bps, true);
  writeString(v, 36, 'data');
  v.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numCh; ch++) channels.push(buffer.getChannelData(ch));

  let off = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }

  return new Blob([buf], { type: 'audio/wav' });
}

export function MediaUploadBoard({ onUploadSuccess }: { onUploadSuccess: (url: string) => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const { setNotice } = useNotice();

  // Editor states
  const [crop, setCrop] = useState<QrCropState>(INITIAL_CROP);
  const [isEditing, setIsEditing] = useState(false);
  const [videoRange, setVideoRange] = useState({ start: 0, end: 0, max: 0 });
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Recording states
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const formatRecordTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      recordChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
        const newFile = new File([blob], `recorded-${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFile(newFile);
        setPreviewUrl(URL.createObjectURL(newFile));
        setIsEditing(false);
        setIsRecordingMic(false);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecordingMic(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError("Không thể truy cập Micro. Vui lòng kiểm tra quyền trên trình duyệt.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Dung lượng file không được vượt quá 10MB");
      return;
    }

    setError("");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsEditing(false);
    setCrop(INITIAL_CROP);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setIsEditing(false);
    setError("");
  };

  const handleMediaLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    const media = e.target as HTMLMediaElement;
    const dur = media.duration;

    if (isFinite(dur) && dur > 0) {
      setVideoRange({ start: 0, end: dur, max: dur });
      return;
    }

    // WebM from MediaRecorder often has Infinity duration.
    // Workaround: seek to a huge value → browser resolves real duration.
    const onSeeked = () => {
      media.removeEventListener("seeked", onSeeked);
      const realDur = isFinite(media.duration) && media.duration > 0
        ? media.duration
        : recordTime || 10; // fallback to recorded seconds
      media.currentTime = 0;
      setVideoRange({ start: 0, end: realDur, max: realDur });
    };
    media.addEventListener("seeked", onSeeked);
    media.currentTime = 1e7; // seek to a very large time
  };

  const applyImageCrop = async () => {
    if (!selectedFile) return;
    try {
      const image = new window.Image();
      const objectUrl = URL.createObjectURL(selectedFile);
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = objectUrl;
      });

      const normalizedCrop = normalizeQrCrop(crop);
      const sourceX = Math.round((image.naturalWidth * normalizedCrop.x) / 100);
      const sourceY = Math.round((image.naturalHeight * normalizedCrop.y) / 100);
      const sourceWidth = Math.round((image.naturalWidth * normalizedCrop.width) / 100);
      const sourceHeight = Math.round((image.naturalHeight * normalizedCrop.height) / 100);

      const canvas = document.createElement("canvas");
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sourceWidth, sourceHeight);
      ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);

      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, selectedFile.type || "image/png", 0.95));
      if (!blob) throw new Error("Blob failed");

      const ext = (blob.type || "image/png").split("/")[1];
      const newFile = new File([blob], `cropped-${Date.now()}.${ext}`, { type: blob.type });
      
      setSelectedFile(newFile);
      setPreviewUrl(URL.createObjectURL(newFile));
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError("Không thể cắt ảnh.");
    }
  };

  const applyMediaTrim = async () => {
    if (!selectedFile) return;
    const isAudio = selectedFile.type.startsWith('audio/');

    if (isAudio) {
      await applyAudioTrimInstant();
    } else {
      await applyVideoTrimRealtime();
    }
  };

  // --- Instant audio trim via Web Audio API ---
  const applyAudioTrimInstant = async () => {
    if (!selectedFile) return;
    try {
      setIsRecording(true);
      setError("Đang cắt audio...");

      const arrayBuffer = await selectedFile.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.max(0, Math.floor(videoRange.start * sampleRate));
      const endSample = Math.min(audioBuffer.length, Math.floor(videoRange.end * sampleRate));
      const length = endSample - startSample;
      const channels = audioBuffer.numberOfChannels;

      if (length <= 0) {
        throw new Error("Đoạn cắt không hợp lệ.");
      }

      // Slice the buffer
      const offlineCtx = new OfflineAudioContext(channels, length, sampleRate);
      const newBuffer = offlineCtx.createBuffer(channels, length, sampleRate);

      for (let ch = 0; ch < channels; ch++) {
        const src = audioBuffer.getChannelData(ch);
        const dst = newBuffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          dst[i] = src[startSample + i];
        }
      }

      // Encode to WAV
      const wavBlob = encodeWav(newBuffer);
      const newFile = new File([wavBlob], `trimmed-${Date.now()}.wav`, { type: 'audio/wav' });

      setSelectedFile(newFile);
      setPreviewUrl(URL.createObjectURL(newFile));
      setIsEditing(false);
      setIsRecording(false);
      setError("");
      audioCtx.close();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi cắt audio.");
      setIsRecording(false);
    }
  };

  // --- Real-time video trim (no browser API for instant video re-encode) ---
  const applyVideoTrimRealtime = async () => {
    if (!selectedFile || !videoRef.current) return;
    try {
      setIsRecording(true);
      setError("Đang xử lý cắt video (đợi theo thời gian thực)...");
      const video = videoRef.current;

      const anyVideo = video as any;
      const stream = anyVideo.captureStream ? anyVideo.captureStream() : anyVideo.mozCaptureStream ? anyVideo.mozCaptureStream() : null;

      if (!stream) {
        throw new Error("Trình duyệt không hỗ trợ cắt video trực tiếp.");
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const newFile = new File([blob], `trimmed-${Date.now()}.webm`, { type: 'video/webm' });
        setSelectedFile(newFile);
        setPreviewUrl(URL.createObjectURL(newFile));
        setIsEditing(false);
        setIsRecording(false);
        setError("");
      };

      video.currentTime = videoRange.start;
      recorder.start();
      video.play();

      const checkInterval = setInterval(() => {
        if (video.currentTime >= videoRange.end) {
          clearInterval(checkInterval);
          video.pause();
          recorder.stop();
        }
      }, 100);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi cắt video.");
      setIsRecording(false);
    }
  };

  const playSelection = () => {
    const isAudio = selectedFile?.type.startsWith('audio/');
    const mediaRef = isAudio ? audioRef : videoRef;
    if (mediaRef.current) {
      mediaRef.current.currentTime = videoRange.start;
      mediaRef.current.play();
      
      const checkInterval = setInterval(() => {
        if (mediaRef.current && mediaRef.current.currentTime >= videoRange.end) {
          mediaRef.current.pause();
          clearInterval(checkInterval);
        }
      }, 100);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError("");
    try {
      const res = await profileApi.uploadMedia(selectedFile);
      onUploadSuccess(res.url);
      clearSelection();
      setNotice({
        type: "success",
        text: "Tải lên phương tiện thành công.",
      });
    } catch (err: any) {
      setNotice({
        type: "error",
        text: err.message || "Tải lên phương tiện thất bại.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid gap-4">
      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-[13px] text-rose-600 border border-rose-100">
          {error}
        </div>
      )}

      {!selectedFile ? (
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative flex w-full min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)] transition hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)]">
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              accept="image/*,video/mp4,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
            />
            <div className="grid size-12 place-items-center rounded-full bg-white shadow-[var(--shadow-sm)] text-[var(--brand-500)] mb-3">
              <UploadCloud size={24} />
            </div>
            <p className="font-bold text-[var(--neutral-700)] text-[14px]">Kéo thả file hoặc bấm để chọn</p>
            <p className="text-[12px] text-[var(--neutral-500)] mt-1">Hỗ trợ Ảnh, Video (MP4), Audio, Tài liệu (Tối đa 10MB)</p>
          </div>
          
          <div className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
            {!isRecordingMic ? (
              <button onClick={startRecording} className="flex items-center gap-2 rounded-lg bg-[var(--brand-50)] px-4 py-2 text-[14px] font-bold text-[var(--brand-600)] transition hover:bg-[var(--brand-100)]">
                <Mic size={18} /> Ghi âm trực tiếp
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <div className="size-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[14px] font-bold font-mono">{formatRecordTime(recordTime)}</span>
                </div>
                <button onClick={stopRecording} className="flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-[14px] font-bold text-white transition hover:bg-rose-600">
                  <Square size={16} fill="currentColor" /> Dừng ghi âm
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--neutral-200)] bg-white p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--neutral-100)]">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-[var(--brand-50)] text-[var(--brand-600)]">
                {selectedFile.type.startsWith('image/') ? <ImageIcon size={20} /> : selectedFile.type.startsWith('video/') ? <Video size={20} /> : <FileIcon size={20} />}
              </div>
              <div>
                <p className="text-[14px] font-bold text-[var(--neutral-800)] truncate max-w-[200px] sm:max-w-[300px]">{selectedFile.name}</p>
                <p className="text-[12px] text-[var(--neutral-500)]">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button onClick={clearSelection} disabled={isUploading || isRecording} className="grid size-8 place-items-center rounded-full text-[var(--neutral-400)] hover:bg-[var(--neutral-100)] hover:text-[var(--neutral-700)] disabled:opacity-50">
              <X size={16} />
            </button>
          </div>

          {!isEditing ? (
            <div className="flex flex-col gap-4">
              <div className="relative mx-auto max-h-[300px] w-full overflow-hidden rounded-lg bg-[var(--neutral-900)] flex items-center justify-center">
                {selectedFile.type.startsWith('image/') && (
                  <img src={previewUrl} alt="Preview" className="max-h-[300px] object-contain" />
                )}
                {selectedFile.type.startsWith('video/') && (
                  <video src={previewUrl} controls className="max-h-[300px] max-w-full" />
                )}
                {selectedFile.type.startsWith('audio/') && (
                  <div className="flex h-[150px] w-full items-center justify-center px-8">
                    <audio src={previewUrl} controls className="w-full outline-none" />
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-2">
                {(selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/') || selectedFile.type.startsWith('audio/')) && (
                  <button onClick={() => setIsEditing(true)} className="flex h-9 items-center gap-2 rounded-lg bg-[var(--neutral-100)] px-4 text-[13px] font-bold text-[var(--neutral-700)] hover:bg-[var(--neutral-200)]">
                    <Scissors size={15} /> Cắt chỉnh sửa
                  </button>
                )}
                <button onClick={uploadFile} disabled={isUploading} className="flex h-9 items-center gap-2 rounded-lg bg-[var(--brand-600)] px-6 text-[13px] font-bold text-white hover:bg-[var(--brand-700)] disabled:opacity-70">
                  {isUploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                  Tải lên
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {selectedFile.type.startsWith('image/') && (
                <>
                  <div className="relative mx-auto overflow-hidden rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-900)]">
                    <img src={previewUrl} alt="Editor" className="max-h-[400px] object-contain block select-none" draggable={false} />
                    <QrCropBox crop={crop} onChange={setCrop} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <QrCropToolbar onReset={() => setCrop(INITIAL_CROP)} />
                    <button onClick={applyImageCrop} className="h-9 rounded-lg bg-[var(--brand-600)] px-5 text-[13px] font-bold text-white hover:bg-[var(--brand-700)]">
                      Lưu cắt ảnh
                    </button>
                  </div>
                </>
              )}

              {(selectedFile.type.startsWith('video/') || selectedFile.type.startsWith('audio/')) && (
                <>
                  <div className="relative mx-auto rounded-lg overflow-hidden bg-[var(--neutral-900)] w-full flex items-center justify-center">
                    {selectedFile.type.startsWith('video/') ? (
                      <video ref={videoRef} src={previewUrl} onLoadedMetadata={handleMediaLoadedMetadata} controls className="max-h-[300px] max-w-full block" />
                    ) : (
                      <div className="flex h-[150px] w-full items-center justify-center px-8">
                        <audio ref={audioRef} src={previewUrl} onLoadedMetadata={handleMediaLoadedMetadata} controls className="w-full outline-none" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col mt-2 px-2">
                    <MediaTrimSlider
                      start={videoRange.start}
                      end={videoRange.end}
                      max={videoRange.max}
                      onChange={(r) => setVideoRange(prev => ({...prev, start: r.start, end: r.end}))}
                    />
                  </div>
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <button onClick={playSelection} disabled={isRecording} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--brand-200)] px-4 text-[13px] font-bold text-[var(--brand-600)] hover:bg-[var(--brand-50)] disabled:opacity-50 transition">
                      <PlayCircle size={15} /> Nghe đoạn chọn
                    </button>
                    <button onClick={applyMediaTrim} disabled={isRecording} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 text-[13px] font-bold text-white hover:bg-[var(--brand-700)] disabled:opacity-50 transition">
                      {isRecording ? <Loader2 size={15} className="animate-spin" /> : <><Scissors size={15} /> Cắt đoạn</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
