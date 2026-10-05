import type { Metadata } from "next";
import Link from "next/link";
import { InformationPage } from "@/components/public/information-page";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng EduTrack Backup",
  description: "Điều kiện sử dụng chức năng sao lưu EduTrack Backup và kết nối Google Drive của người quản trị.",
};

export default function TermsPage() {
  return (
    <InformationPage title="Điều khoản sử dụng" description="Các điều kiện sử dụng chức năng sao lưu và tích hợp Google Drive của EduTrack Backup. Cập nhật ngày 05/10/2026.">
      <section>
        <h2>Phạm vi chức năng</h2>
        <p>EduTrack Backup tạo bản sao dữ liệu ứng dụng và lưu vào thư mục Drive được cấu hình bởi người quản trị hệ thống. Chức năng này phục vụ việc lưu giữ dữ liệu của hệ thống EduTrack đang được vận hành.</p>
      </section>
      <section>
        <h2>Quyền sử dụng dữ liệu và tài khoản</h2>
        <p>Người quản trị chỉ kết nối tài khoản và thư mục mà mình sở hữu hoặc được phép sử dụng. Người vận hành hệ thống có trách nhiệm bảo đảm việc sao lưu dữ liệu học sinh, phụ huynh và tài khoản được thực hiện theo quyền quản lý dữ liệu của mình.</p>
        <p>Chủ tài khoản kiểm soát việc cấp và thu hồi quyền Google, cũng như quyền chia sẻ các tệp sao lưu. Thông tin OAuth cần được giữ trong cấu hình backend và chỉ cung cấp cho người được phép quản trị hệ thống.</p>
      </section>
      <section>
        <h2>Điều kiện để sao lưu hoạt động</h2>
        <p>Việc tạo bản sao phụ thuộc vào kết nối cơ sở dữ liệu, hoạt động của backend, kết nối mạng, quyền Google Drive và dung lượng còn trống của tài khoản. Người quản trị cần theo dõi kết quả sao lưu và kiểm tra việc khôi phục dữ liệu phù hợp với nhu cầu của mình.</p>
      </section>
      <section>
        <h2>Lưu giữ bản sao và ngừng kết nối</h2>
        <p>Số lượng bản sao được giữ theo cấu hình. Bản sao cũ có thể được xóa sau khi có bản sao mới thành công; người quản trị nên tải về các bản cần giữ riêng trước khi chúng vượt quá giới hạn lưu giữ.</p>
        <p>Chủ tài khoản có thể thu hồi quyền Google và người quản trị có thể gỡ cấu hình OAuth để ngừng sao lưu. Các tệp đã tạo được quản lý trực tiếp trong Google Drive. Chi tiết nằm trong <Link href="/privacy">chính sách quyền riêng tư</Link>.</p>
      </section>
    </InformationPage>
  );
}
