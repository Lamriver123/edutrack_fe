import type { Metadata } from "next";
import Link from "next/link";
import { InformationPage } from "@/components/public/information-page";

export const metadata: Metadata = {
  title: "Giới thiệu EduTrack Backup",
  description: "Giới thiệu EduTrack và chức năng sao lưu dữ liệu quản lý lớp học vào Google Drive của người quản trị.",
};

export default function AboutPage() {
  return (
    <InformationPage title="Quản lý lớp học, lưu giữ dữ liệu" description="EduTrack giúp giáo viên quản lý học sinh, thời khóa biểu, điểm danh, điểm số và học phí trong một ứng dụng.">
      <section>
        <h2>Công việc giảng dạy trong một nơi</h2>
        <ul>
          <li>Quản lý lớp học, danh sách học sinh và thông tin liên hệ phụ huynh.</li>
          <li>Theo dõi lịch dạy, điểm danh và kết quả học tập.</li>
          <li>Tổng hợp học phí, phát hành hóa đơn và theo dõi thanh toán.</li>
        </ul>
      </section>
      <section>
        <h2>EduTrack Backup và Google Drive</h2>
        <p>EduTrack Backup là chức năng sao lưu dữ liệu của hệ thống. Người quản trị kết nối tài khoản Google của mình để backend lưu các bản sao dữ liệu vào thư mục Google Drive đã chọn.</p>
        <p>Quyền Google Drive phục vụ việc tạo bản sao lưu, xem lịch sử bản sao lưu và dọn các bản cũ theo số lượng lưu giữ đã cấu hình. Việc kết nối được thực hiện bởi người quản trị; giáo viên sử dụng lớp học không cần cấp quyền Drive để đăng nhập EduTrack.</p>
      </section>
      <section>
        <h2>Quyền kiểm soát tài khoản Google</h2>
        <p>Chủ tài khoản xác nhận cấp quyền trên màn hình của Google và có thể thu hồi quyền trong phần kết nối ứng dụng của tài khoản Google. Chi tiết về dữ liệu được sử dụng và cách quản lý bản sao lưu nằm trong <Link href="/privacy">chính sách quyền riêng tư</Link> và <Link href="/terms">điều khoản sử dụng</Link>.</p>
      </section>
      <p><Link href="/login">Đăng nhập EduTrack</Link> để quản lý lớp học của bạn.</p>
    </InformationPage>
  );
}
