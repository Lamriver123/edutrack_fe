"use client";

import type { Exam, Student } from "@/types/school";
import styles from "./exam-sheet.module.css";
import { StudentAvatar } from "../classroom-ui";
import { getStudentAvatar } from "../classroom-utils";
import { format } from "date-fns";
import { FileText } from "lucide-react";

const STT_COLUMN_WIDTH = 64;
const STUDENT_COLUMN_WIDTH = 280;
const SCORE_COLUMN_WIDTH = 120;

type ExamDesktopTableProps = {
  students: Student[];
  exams: Exam[];
  localScores: Record<string, number>;
  localNotes: Record<string, string>;
  dirtyCells: Set<string>;
  onEditExam: (exam: Exam) => void;
  onUploadEvidence: (examId: string, studentId: string) => void;
};

export function ExamDesktopTable({
  students,
  exams,
  localScores,
  localNotes,
  dirtyCells,
  onEditExam,
  onUploadEvidence,
}: ExamDesktopTableProps) {
  const tableWidth =
    STT_COLUMN_WIDTH + STUDENT_COLUMN_WIDTH + exams.length * SCORE_COLUMN_WIDTH;

  return (
    <div className={styles.sheetContainer}>
      <div className={styles.sheetWrapper}>
        <table
          className={styles.sheetTable}
          style={{ width: `max(100%, ${tableWidth}px)` }}
        >
          <colgroup>
            <col className={styles.sttColumn} />
            <col className={styles.studentColumn} />
            {exams.map((exam) => (
              <col className={styles.examColumn} key={exam.id} />
            ))}
            <col className={styles.spacerColumn} />
          </colgroup>
          <thead className={styles.sheetHeader}>
            <tr>
              <th className={styles.sttCol}>STT</th>
              <th className={`${styles.stickyCol} ${styles.studentHeaderCell}`}>
                Học sinh
              </th>
              {exams.map((exam) => (
                <th key={exam.id} className={styles.examHeaderCell}>
                  <button
                    className={styles.examHeaderButton}
                    onClick={() => onEditExam(exam)}
                  >
                    <span className={styles.examTitle} title={exam.title}>
                      {exam.title}
                    </span>
                    <span className={styles.examMeta}>
                      {format(new Date(exam.testDate), "dd/MM")}
                    </span>
                    <span className={styles.examMax}>
                      Max: {exam.maxScore}
                    </span>
                    {exam.fileUrl && (
                      <span className={styles.examFileIcon}>
                        <FileText size={14} />
                      </span>
                    )}
                  </button>
                </th>
              ))}
              <th aria-hidden="true" className={styles.spacerCell} />
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={student.id}>
                <td className={`text-center text-[12px] font-bold text-[var(--neutral-400)] ${styles.sttCol}`}>
                  {index + 1}
                </td>
                <td className={`${styles.stickyCol} ${styles.studentCell}`}>
                  <div className="flex items-center gap-2 p-2">
                    <div className="hidden sm:block">
                      <StudentAvatar alt={student.fullName} src={getStudentAvatar(student)} size="sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate sm:whitespace-normal sm:break-words text-[13px] font-bold text-[var(--neutral-700)]">
                        {student.fullName}
                      </div>
                      <div className="truncate text-[11px] text-[var(--neutral-400)]">
                        {student.studentCode}
                      </div>
                    </div>
                  </div>
                </td>
                {exams.map((exam) => {
                  const key = `${exam.id}:${student.id}`;
                  const isDirty = dirtyCells.has(key);
                  const score = localScores[key];
                  const note = localNotes[key]?.trim();

                  return (
                    <td key={exam.id} className={`${styles.scoreCell} ${isDirty ? styles.cellDirty : ""}`}>
                      <button 
                        className={`${styles.cellContent} w-full h-full hover:bg-[var(--neutral-50)] transition`}
                        onClick={() => onUploadEvidence(exam.id, student.id)}
                        title="Nhập điểm và minh chứng"
                      >
                        <span className="font-bold text-[14px] text-[var(--neutral-800)]">
                          {score !== undefined && score !== null ? score : "-"}
                        </span>
                        {note && (
                          <span className={styles.notePreview} title={note}>
                            {note}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
                <td aria-hidden="true" className={styles.spacerCell} />
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={exams.length + 3} className="p-8 text-center text-[14px] text-[var(--neutral-500)]">
                  Chưa có học sinh trong lớp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
