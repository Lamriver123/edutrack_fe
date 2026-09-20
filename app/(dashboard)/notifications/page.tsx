import { Bell } from "lucide-react";
import { FeaturePlaceholder } from "@/components/dashboard/feature-placeholder";

export default function NotificationsPage() {
  return (
    <FeaturePlaceholder
      description="Theo dõi các nhắc việc học phí, lớp học và thông tin cần giáo viên xử lý."
      emptyText="Khi có thay đổi cần chú ý, thông báo sẽ được hiển thị tại đây."
      emptyTitle="Chưa có thông báo mới"
      eyebrow="Thông báo"
      icon={Bell}
      title="Thông báo"
    />
  );
}
