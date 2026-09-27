import { Bell } from "lucide-react";
import { PushNotificationPanel } from "@/components/notifications/push-notification-panel";

export default function NotificationsPage() {
  return (
    <section className="grid gap-5">
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-[var(--brand-600)]">
          Thông báo
        </p>
        <h2 className="mt-1 text-[26px] font-extrabold leading-tight text-[var(--brand-950)]">
          Thông báo
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--neutral-500)]">
          Quản lý thông báo trên thiết bị và theo dõi các nội dung cần chú ý.
        </p>
      </div>

      <PushNotificationPanel />

      <section className="grid min-h-64 place-items-center rounded-md border border-[var(--border)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
        <div className="max-w-md">
          <div className="mx-auto grid size-14 place-items-center rounded-md border border-[var(--border)] bg-[var(--brand-50)] text-[var(--brand-600)]">
            <Bell size={24} />
          </div>
          <h3 className="mt-4 text-[18px] font-extrabold text-[var(--brand-950)]">
            Chưa có thông báo mới
          </h3>
          <p className="mt-2 text-[14px] leading-6 text-[var(--neutral-500)]">
            Khi có thay đổi về học phí, lớp học hoặc lịch dạy, thông báo sẽ
            được hiển thị tại đây.
          </p>
        </div>
      </section>
    </section>
  );
}
