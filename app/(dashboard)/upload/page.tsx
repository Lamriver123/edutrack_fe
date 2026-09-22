import type { Metadata } from "next";
import { UploadPageContent } from "./upload-page-content";

export const metadata: Metadata = {
  title: "Upload File | EduTrack",
};

export default function UploadPage() {
  return <UploadPageContent />;
}
