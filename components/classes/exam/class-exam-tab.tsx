"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { schoolApi } from "@/lib/api/school";
import type {
  ClassroomDetail,
  CreateExamPayload,
  Exam,
  ExamScore,
  Student,
  TakeExamScoreEntry,
  UpdateExamPayload,
} from "@/types/school";
import { Plus, Save, Loader2, Trash2 } from "lucide-react";
import { ConfirmDialog, NoticeBanner, PrimaryAction } from "../classroom-ui";
import type { Notice } from "../classroom-types";
import { ExamDesktopTable } from "./exam-desktop-table";
import { ExamMobileList } from "./exam-mobile-list";
import { ExamCreateModal } from "./exam-create-modal";
import { ExamEvidenceModal } from "./exam-evidence-modal";

type ClassExamTabProps = {
  classroom: ClassroomDetail;
};

type PendingEvidenceFile = {
  id: string;
  file: File;
  previewUrl: string;
};

export function ClassExamTab({ classroom }: ClassExamTabProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [localScores, setLocalScores] = useState<Record<string, number>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [localEvidenceImages, setLocalEvidenceImages] = useState<Record<string, string[]>>({});
  const [pendingEvidenceFiles, setPendingEvidenceFiles] = useState<Record<string, PendingEvidenceFile[]>>({});
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set());
  const pendingEvidenceRef = useRef<Record<string, PendingEvidenceFile[]>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<Exam | undefined>();
  const [deleteExamConfirmId, setDeleteExamConfirmId] = useState<string | null>(null);
  const [showSaveScoresConfirm, setShowSaveScoresConfirm] = useState(false);

  const [evidenceModalData, setEvidenceModalData] = useState<{examId: string, studentId: string} | null>(null);

  const activeStudents = useMemo(() => 
    students.filter(s => s.status === 'active'),
  [students]);

  useEffect(() => {
    fetchExamSheet();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroom.id]);

  useEffect(() => {
    pendingEvidenceRef.current = pendingEvidenceFiles;
  }, [pendingEvidenceFiles]);

  useEffect(() => {
    return () => {
      revokePendingEvidenceFiles();
    };
  }, []);

  async function fetchExamSheet() {
    try {
      setIsLoading(true);
      const data = await schoolApi.getExamSheet(classroom.id);
      if (data) {
        setExams(data.exams);
        setScores(data.scores);
        setStudents(data.students);
        
        const initialScores: Record<string, number> = {};
        const initialNotes: Record<string, string> = {};
        const initialEvidence: Record<string, string[]> = {};
        data.scores.forEach(s => {
          const key = `${s.examId}:${s.studentId}`;
          initialScores[key] = s.score;
          if (s.note) {
            initialNotes[key] = s.note;
          }
          if (s.evidenceImages && s.evidenceImages.length > 0) {
            initialEvidence[key] = s.evidenceImages;
          }
        });
        setLocalScores(initialScores);
        setLocalNotes(initialNotes);
        setLocalEvidenceImages(initialEvidence);
        revokePendingEvidenceFiles();
        setPendingEvidenceFiles({});
        setDirtyCells(new Set());
      }
    } catch {
      setNotice({ type: "error", text: "Không thể tải dữ liệu điểm số." });
    } finally {
      setIsLoading(false);
    }
  }

  function handleScoreChange(examId: string, studentId: string, value: string) {
    const key = `${examId}:${studentId}`;
    let numValue: number | undefined = undefined;
    
    if (value.trim() !== "") {
      numValue = parseFloat(value);
      if (isNaN(numValue)) numValue = undefined;
    }

    setLocalScores(prev => {
      const next = { ...prev };

      if (numValue === undefined) {
        delete next[key];
      } else {
        next[key] = numValue;
      }

      return next;
    });
    setDirtyCells(prev => new Set(prev).add(key));
  }

  function handleNoteChange(examId: string, studentId: string, value: string) {
    const key = `${examId}:${studentId}`;

    setLocalNotes(prev => {
      const next = { ...prev };
      if (value.trim() === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setDirtyCells(prev => new Set(prev).add(key));
  }

  function handleRequestSaveScores() {
    if (dirtyCells.size === 0 || isSaving) return;
    setShowSaveScoresConfirm(true);
  }

  async function handleSaveScores() {
    if (dirtyCells.size === 0) return;

    try {
      setIsSaving(true);
      setShowSaveScoresConfirm(false);

      const scoresPayload: TakeExamScoreEntry[] = [];
      for (const key of Array.from(dirtyCells)) {
        const [examId, studentId] = key.split(":");
        const score = localScores[key];
        const note = (localNotes[key] ?? "").trim();
        
        const existingScore = scores.find(s => s.examId === examId && s.studentId === studentId);
        const persistedEvidenceImages = localEvidenceImages[key] || existingScore?.evidenceImages || [];
        const pendingFiles = pendingEvidenceFiles[key] || [];

        if (score === undefined || Number.isNaN(score)) {
          if (existingScore) {
            scoresPayload.push({
              examId,
              studentId,
              score: null,
              note: "",
              evidenceImages: [],
            });
            continue;
          }

          if (note || persistedEvidenceImages.length > 0 || pendingFiles.length > 0) {
            setNotice({
              type: "error",
              text: "Vui lòng nhập điểm trước khi lưu ghi chú hoặc ảnh minh chứng.",
            });
            return;
          }

          continue;
        }

        const uploadedEvidenceImages: string[] = [];
        for (const pendingFile of pendingFiles) {
          const uploadRes = await schoolApi.uploadExamEvidenceImage(classroom.id, pendingFile.file);
          uploadedEvidenceImages.push(uploadRes.url);
        }
        
        scoresPayload.push({
          examId,
          studentId,
          score,
          note,
          evidenceImages: [...persistedEvidenceImages, ...uploadedEvidenceImages],
        });
      }

      if (scoresPayload.length > 0) {
        await schoolApi.takeExamScoresBatch(classroom.id, { scores: scoresPayload });
        setNotice({ type: "success", text: "Đã lưu điểm thành công!" });
        setDirtyCells(new Set());
        revokePendingEvidenceFiles();
        setPendingEvidenceFiles({});
        // Refresh to get updated IDs if any new score was created
        await fetchExamSheet(); 
        return;
      }
      setDirtyCells(new Set());
      setNotice({ type: "success", text: "Không có điểm nào cần lưu." });
    } catch (error: unknown) {
      setNotice({
        type: "error",
        text: getApiErrorMessage(error, "Có lỗi xảy ra khi lưu điểm."),
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotice(null), 3000);
    }
  }

  async function handleCreateOrUpdateExam(payload: CreateExamPayload, file?: File | null) {
    try {
      let finalFileUrl = payload.fileUrl;
      let finalFileName = payload.fileName;

      if (file) {
        const uploadRes = await schoolApi.uploadExamFile(classroom.id, file);
        finalFileUrl = uploadRes.url;
        finalFileName = file.name;
      }

      const finalPayload: CreateExamPayload = {
        ...payload,
        fileUrl: finalFileUrl,
        fileName: finalFileName,
      };

      if (examToEdit) {
        await schoolApi.updateExam(classroom.id, examToEdit.id, finalPayload as UpdateExamPayload);
        setNotice({ type: "success", text: "Cập nhật bài kiểm tra thành công!" });
      } else {
        await schoolApi.createExam(classroom.id, finalPayload);
        setNotice({ type: "success", text: "Tạo bài kiểm tra thành công!" });
      }
      
      setIsCreateModalOpen(false);
      setExamToEdit(undefined);
    } catch {
      setNotice({ type: "error", text: "Có lỗi xảy ra khi lưu bài kiểm tra." });
    }
  }

  async function handleDeleteExam() {
    if (!deleteExamConfirmId) return;
    try {
      await schoolApi.deleteExam(classroom.id, deleteExamConfirmId);
      setNotice({ type: "success", text: "Đã xóa bài kiểm tra." });
      setDeleteExamConfirmId(null);
      fetchExamSheet();
    } catch {
      setNotice({ type: "error", text: "Không thể xóa bài kiểm tra." });
    }
  }

  async function handleUploadEvidence(file: File) {
    if (!evidenceModalData) return;
    const { examId, studentId } = evidenceModalData;
    const key = `${examId}:${studentId}`;
    const previewUrl = URL.createObjectURL(file);
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${file.name}`;

    setPendingEvidenceFiles(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { id, file, previewUrl }],
    }));
    setDirtyCells(prev => new Set(prev).add(key));
  }

  function handleRemoveEvidence(imageUrl: string) {
    if (!evidenceModalData) return;
    const { examId, studentId } = evidenceModalData;
    const key = `${examId}:${studentId}`;
    const pendingItem = pendingEvidenceFiles[key]?.find((item) => item.previewUrl === imageUrl);

    if (pendingItem) {
      URL.revokeObjectURL(pendingItem.previewUrl);
      setPendingEvidenceFiles(prev => {
        const remaining = (prev[key] || []).filter((item) => item.id !== pendingItem.id);
        const next = { ...prev };
        if (remaining.length > 0) {
          next[key] = remaining;
        } else {
          delete next[key];
        }
        return next;
      });
      setDirtyCells(prev => new Set(prev).add(key));
      return;
    }
    
    setLocalEvidenceImages(prev => {
      const current = prev[key] || scores.find(s => s.examId === examId && s.studentId === studentId)?.evidenceImages || [];
      return { ...prev, [key]: current.filter(url => url !== imageUrl) };
    });
    setDirtyCells(prev => new Set(prev).add(key));
  }

  function revokePendingEvidenceFiles() {
    Object.values(pendingEvidenceRef.current)
      .flat()
      .forEach((item) => URL.revokeObjectURL(item.previewUrl));
    pendingEvidenceRef.current = {};
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--neutral-400)]">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="text-[14px]">Đang tải bảng điểm...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div>
          <h2 className="text-[18px] font-extrabold text-[var(--neutral-800)]">
            Bảng điểm học sinh
          </h2>
          <p className="mt-1 text-[13px] text-[var(--neutral-500)]">
            Quản lý các bài kiểm tra và điểm số của {activeStudents.length} học sinh.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setExamToEdit(undefined);
              setIsCreateModalOpen(true);
            }}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--brand-50)] px-4 text-[14px] font-bold text-[var(--brand-700)] transition hover:bg-[var(--brand-100)]"
          >
            <Plus size={16} />
            Tạo bài KT
          </button>
          
          <PrimaryAction
            disabled={dirtyCells.size === 0 || isSaving}
            onClick={handleRequestSaveScores}
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Lưu thay đổi {dirtyCells.size > 0 && `(${dirtyCells.size})`}
          </PrimaryAction>
        </div>
      </div>

      {notice && <NoticeBanner notice={notice} />}

      {/* Desktop View */}
      <div className="hidden lg:block">
        <ExamDesktopTable 
          students={activeStudents}
          exams={exams}
          localScores={localScores}
          localNotes={localNotes}
          dirtyCells={dirtyCells}
          onEditExam={(exam) => {
            setExamToEdit(exam);
            setIsCreateModalOpen(true);
          }}
          onUploadEvidence={(examId, studentId) => setEvidenceModalData({ examId, studentId })}
        />
      </div>

      {/* Mobile/Tablet View */}
      <div className="block lg:hidden">
        <ExamMobileList 
          students={activeStudents}
          exams={exams}
          localScores={localScores}
          localNotes={localNotes}
          dirtyCells={dirtyCells}
          onScoreChange={handleScoreChange}
          onNoteChange={handleNoteChange}
          onEditExam={(exam) => {
            setExamToEdit(exam);
            setIsCreateModalOpen(true);
          }}
          onUploadEvidence={(examId, studentId) => setEvidenceModalData({ examId, studentId })}
        />
      </div>

      {/* Create / Edit Exam Modal */}
      {isCreateModalOpen && (
        <ExamCreateModal
          examToEdit={examToEdit}
          onClose={() => {
            setIsCreateModalOpen(false);
            setExamToEdit(undefined);
          }}
          onSubmit={handleCreateOrUpdateExam}
          isSubmitting={false}
        />
      )}

      {/* Evidence Modal */}
      {evidenceModalData && (
        <ExamEvidenceModal
          examId={evidenceModalData.examId}
          studentId={evidenceModalData.studentId}
          studentName={activeStudents.find(s => s.id === evidenceModalData.studentId)?.fullName || ""}
          examTitle={exams.find(e => e.id === evidenceModalData.examId)?.title || ""}
          existingImages={[
            ...(localEvidenceImages[`${evidenceModalData.examId}:${evidenceModalData.studentId}`] || scores.find(s => s.examId === evidenceModalData.examId && s.studentId === evidenceModalData.studentId)?.evidenceImages || []),
            ...(pendingEvidenceFiles[`${evidenceModalData.examId}:${evidenceModalData.studentId}`] || []).map((item) => item.previewUrl),
          ]}
          onClose={() => setEvidenceModalData(null)}
          onUpload={handleUploadEvidence}
          isUploading={isSaving}
          score={localScores[`${evidenceModalData.examId}:${evidenceModalData.studentId}`]?.toString() || ""}
          note={localNotes[`${evidenceModalData.examId}:${evidenceModalData.studentId}`] || ""}
          maxScore={exams.find(e => e.id === evidenceModalData.examId)?.maxScore || 10}
          onScoreChange={(value) => handleScoreChange(evidenceModalData.examId, evidenceModalData.studentId, value)}
          onNoteChange={(value) => handleNoteChange(evidenceModalData.examId, evidenceModalData.studentId, value)}
          onRemove={handleRemoveEvidence}
        />
      )}

      {/* Quick edit delete button from the modal if editing */}
      {examToEdit && isCreateModalOpen && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
            <button
              onClick={() => setDeleteExamConfirmId(examToEdit.id)}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-bold text-[var(--error-600)] shadow-lg border border-[var(--error-200)] hover:bg-[var(--error-50)]"
            >
              <Trash2 size={16} />
              Xóa bài kiểm tra này
            </button>
         </div>
      )}

      {deleteExamConfirmId !== null && (
        <ConfirmDialog
          confirmText="Xóa bài kiểm tra"
          description="Hành động này sẽ xóa bài kiểm tra và toàn bộ điểm số liên quan. Bạn có chắc chắn muốn xóa?"
          onCancel={() => setDeleteExamConfirmId(null)}
          onConfirm={handleDeleteExam}
          title="Xóa bài kiểm tra"
          tone="danger"
        />
      )}

      {showSaveScoresConfirm && (
        <ConfirmDialog
          confirmText="Lưu điểm"
          description={`Bạn đang lưu ${dirtyCells.size} thay đổi điểm số, ghi chú hoặc minh chứng. Ảnh minh chứng mới sẽ được tải lên sau khi xác nhận.`}
          isLoading={isSaving}
          onCancel={() => setShowSaveScoresConfirm(false)}
          onConfirm={handleSaveScores}
          title="Xác nhận lưu điểm"
        />
      )}
    </div>
  );
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error !== "object" || error === null || !("response" in error)) {
    return fallback;
  }

  const response = error as {
    response?: {
      data?: {
        message?: unknown;
      };
    };
  };
  const message = response.response?.data?.message;

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === "string").join(", ");
  }

  return fallback;
}
