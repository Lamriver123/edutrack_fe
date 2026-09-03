import { Bell } from "lucide-react";
import { FeaturePlaceholder } from "@/components/dashboard/feature-placeholder";

export default function NotificationsPage() {
  return (
    <FeaturePlaceholder
      description="Theo dõi các nhắc việc học phí, lớp học và thông tin cần giáo viên xử lý."
      eyebrow="Thông báo"
      icon={Bell}
      items={[
        "Cảnh báo học phí khi học sinh đạt 8/10 buổi.",
        "Thông báo sẵn sàng xuất phiếu khi đủ chu kỳ.",
        "Đánh dấu đã đọc và lọc thông báo theo loại.",
      ]}
      title="Thông báo"
    />
  );
}
