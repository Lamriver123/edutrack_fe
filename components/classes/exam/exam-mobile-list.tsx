"use client";

import { useState } from "react";
import type { Exam, Student } from "@/types/school";
import { format } from "date-fns";
import { FileText, Search, Calendar, Camera } from "lucide-react";
import { StudentAvatar, TextInput } from "../classroom-ui";
import { getStudentAvatar, normalizeVisibleText } from "../classroom-utils";

type ExamMobileListProps = {
  students: Student[];
  exams: Exam[];
  localScores: Record<string, number>;
  localNotes: Record<string, string>;
  dirtyCells: Set<string>;
  onScoreChange: (examId: string, studentId: string, value: string) => void;
  onNoteChange: (examId: string, studentId: string, value: string) => void;
  onEditExam: (exam: Exam) => void;
  onUploadEvidence: (examId: string, studentId: string) => void;
};

export function ExamMobileList({
  students,
  exams,
  localScores,
  localNotes,
  dirtyCells,
  onScoreChange,
  onNoteChange,
  onEditExam,
  onUploadEvidence,
}: ExamMobileListProps) {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const activeExamId = exams.some((exam) => exam.id === selectedExamId)
    ? selectedExamId
    : exams[0]?.id ?? null;
  const selectedExam = exams.find((e) => e.id === activeExamId);

  const filteredStudents = students.filter((s) => {
    if (!search) return true;
    const query = normalizeVisibleText(search);
    const text = normalizeVisibleText(`${s.fullName} ${s.studentCode}`);
    return text.includes(query);
  });

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white rounded-lg border border-[var(--neutral-200)]">
        <FileText className="text-[var(--neutral-300)] mb-3" size={48} />
        <h3 className="text-[16px] font-bold text-[var(--neutral-800)] mb-1">
          Chưa có bài kiểm tra
        </h3>
        <p className="text-[14px] text-[var(--neutral-500)]">
          Tạo bài kiểm tra đầu tiên để bắt đầu nhập điểm.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Exam Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 snap-x hide-scrollbar">
        {exams.map((exam) => {
          const isSelected = activeExamId === exam.id;
          return (
            <button
              key={exam.id}
              onClick={() => setSelectedExamId(exam.id)}
              className={`flex min-w-[168px] flex-shrink-0 snap-start flex-col items-start rounded-md border p-3 text-left transition ${
                isSelected
                  ? "border-[var(--brand-500)] bg-[var(--brand-50)] ring-1 ring-[var(--brand-500)]"
                  : "border-[var(--neutral-200)] bg-white hover:border-[var(--neutral-300)]"
              }`}
              type="button"
            >
              <span className="font-bold text-[14px] text-[var(--neutral-800)] truncate w-full mb-1">
                {exam.title}
              </span>
              <div className="flex items-center gap-1 text-[12px] text-[var(--neutral-500)]">
                <Calendar size={12} />
                <span>{format(new Date(exam.testDate), "dd/MM/yyyy")}</span>
              </div>
              <div className="mt-2 text-[12px] font-semibold text-[var(--brand-700)]">
                Max: {exam.maxScore}
              </div>
            </button>
          );
        })}
      </div>

      {selectedExam && (
        <div className="flex flex-col overflow-hidden rounded-md border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
          <div className="p-4 border-b border-[var(--neutral-100)] flex justify-between items-start bg-[var(--neutral-50)]">
            <div>
              <h3 className="font-bold text-[16px] text-[var(--neutral-800)]">{selectedExam.title}</h3>
              <p className="text-[13px] text-[var(--neutral-500)] mt-1">{selectedExam.description || "Không có mô tả"}</p>
            </div>
            <button
              onClick={() => onEditExam(selectedExam)}
              className="flex h-9 items-center gap-1 rounded-md border border-[var(--border)] bg-white px-3 text-[13px] font-bold text-[var(--brand-600)] transition hover:bg-[var(--brand-50)]"
              type="button"
            >
              Sửa
            </button>
          </div>
          
          <div className="p-3 border-b border-[var(--neutral-100)]">
             <TextInput
              icon={<Search size={18} />}
              label=""
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm học sinh..."
              value={search}
            />
          </div>

          <div className="divide-y divide-[var(--neutral-100)]">
            {filteredStudents.map((student) => {
              const key = `${selectedExam.id}:${student.id}`;
              const score = localScores[key];
              const note = localNotes[key] || "";
              const isDirty = dirtyCells.has(key);

              return (
                <div key={student.id} className="flex flex-col gap-3 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <StudentAvatar alt={student.fullName} src={getStudentAvatar(student)} size="sm" />
                      <div className="min-w-0">
                        <div className="font-bold text-[14px] text-[var(--neutral-800)] truncate">
                          {student.fullName}
                        </div>
                        <div className="text-[12px] text-[var(--neutral-500)] truncate">
                          {student.studentCode}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        aria-label={`Thêm minh chứng cho ${student.fullName}`}
                        className="grid size-10 place-items-center rounded-md text-[var(--neutral-400)] transition hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)]"
                        onClick={() => onUploadEvidence(selectedExam.id, student.id)}
                        type="button"
                      >
                        <Camera size={18} />
                      </button>
                      <div className={`relative w-[70px] ${isDirty ? "ring-2 ring-[var(--brand-400)] ring-offset-1 rounded-md" : ""}`}>
                        <input
                          className="w-full text-center h-10 border border-[var(--neutral-200)] rounded-md font-bold text-[15px] focus:outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                          max={selectedExam.maxScore}
                          min={0}
                          onChange={(e) => onScoreChange(selectedExam.id, student.id, e.target.value)}
                          placeholder="-"
                          step="0.1"
                          type="number"
                          value={score !== undefined && score !== null ? score : ""}
                        />
                      </div>
                    </div>
                  </div>
                  <input
                    className="h-10 w-full rounded-md border border-[var(--neutral-200)] px-3 text-[13px] font-semibold text-[var(--neutral-700)] outline-none transition placeholder:text-[var(--neutral-400)] focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
                    maxLength={80}
                    onChange={(e) => onNoteChange(selectedExam.id, student.id, e.target.value)}
                    placeholder="Ghi chú điểm, VD: 20/30 câu"
                    value={note}
                  />
                </div>
              );
            })}
            
            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-[14px] text-[var(--neutral-500)]">
                Không tìm thấy học sinh nào.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
