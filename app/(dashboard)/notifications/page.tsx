import { Bell } from "lucide-react";
import { PushNotificationPanel } from "@/components/notifications/push-notification-panel";

export default function NotificationsPage() {
  return (
    <section className="grid gap-5">

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
