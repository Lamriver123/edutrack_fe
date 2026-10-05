import type { Metadata } from "next";
import { InformationPage } from "@/components/public/information-page";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư EduTrack Backup",
  description: "Cách EduTrack Backup truy cập, sử dụng và lưu giữ dữ liệu Google Drive phục vụ sao lưu dữ liệu ứng dụng.",
};

export default function PrivacyPage() {
  return (
    <InformationPage title="Chính sách quyền riêng tư" description="Chính sách này mô tả chức năng sao lưu và tích hợp Google Drive của EduTrack Backup. Cập nhật ngày 05/10/2026.">
      <section>
        <h2>Dữ liệu phục vụ sao lưu</h2>
        <p>Backend tạo bản sao dữ liệu ứng dụng EduTrack, bao gồm dữ liệu tài khoản, học sinh, lớp học, lịch học, điểm danh, điểm số, học phí và các cấu hình đang lưu trong cơ sở dữ liệu. Bản sao được lưu trong thư mục Drive do người quản trị cấu hình.</p>
        <p>Qua Google Drive API, chức năng sao lưu sử dụng thông tin thư mục và tệp như tên, mã định danh, thời điểm tạo, kích thước và quyền thêm tệp. Các thông tin này dùng để kiểm tra thư mục, ghi nhận bản sao đã tạo và quản lý lịch sử sao lưu.</p>
      </section>
      <section>
        <h2>Quyền Google Drive và mục đích sử dụng</h2>
        <p>EduTrack Backup yêu cầu quyền Google Drive để làm việc với thư mục có sẵn mà chủ tài khoản chọn. Phạm vi quyền Google cấp có thể rộng hơn một thư mục; chức năng sao lưu được cấu hình để thao tác trong thư mục đích và dọn các tệp mang tên bản sao lưu EduTrack.</p>
        <p>Dữ liệu nhận qua Google Drive API được dùng để vận hành và quản lý bản sao lưu. Chức năng này không dùng dữ liệu Drive cho quảng cáo, bán dữ liệu hoặc huấn luyện mô hình AI.</p>
      </section>
      <section>
        <h2>Lưu trữ và chia sẻ</h2>
        <p>Thông tin OAuth cần để duy trì kết nối được lưu trong cấu hình backend. Mật khẩu tài khoản Google không được gửi đến hoặc lưu trong EduTrack Backup. Các tệp sao lưu được lưu trên Google Drive của tài khoản đã cấp quyền.</p>
        <p>Quyền truy cập các tệp sao lưu phụ thuộc vào cấu hình chia sẻ thư mục và tệp của chủ tài khoản Google Drive. Google xử lý và lưu trữ các tệp theo chính sách của dịch vụ Google Drive.</p>
      </section>
      <section>
        <h2>Lưu giữ, xóa và thu hồi quyền</h2>
        <p>Số lượng bản sao lưu được giữ theo cấu hình của người quản trị. Khi tạo bản sao mới thành công, hệ thống có thể xóa các bản sao EduTrack cũ vượt quá số lượng đó. Chủ tài khoản có thể xem, tải về hoặc xóa các tệp trực tiếp trên Drive.</p>
        <p>Bạn có thể thu hồi quyền tại <a href="https://myaccount.google.com/connections">trang kết nối ứng dụng của tài khoản Google</a>. Việc thu hồi quyền ngăn các lần truy cập tiếp theo khi Google vô hiệu hóa token; các tệp đã tạo vẫn nằm trên Drive cho đến khi được xóa. Người quản trị có thể xóa thông tin OAuth khỏi cấu hình backend để ngừng sử dụng kết nối.</p>
      </section>
      <section>
        <h2>Liên hệ về dữ liệu</h2>
        <p>Liên hệ người quản trị EduTrack đang vận hành hệ thống để yêu cầu hỗ trợ về dữ liệu và bản sao lưu. Email hỗ trợ của tích hợp Google được hiển thị trong phần thông tin ứng dụng trên màn hình cấp quyền Google.</p>
      </section>
    </InformationPage>
  );
}
