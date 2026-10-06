# EduTrack frontend — tra cứu trước khi sửa

Hướng dẫn toàn dự án được lưu trong repository backend để có một bản nghiệp vụ chung.

- Khi hai repo cạnh nhau: [Hướng dẫn BE + FE](../edutrack_be/docs/project-guide.md), [Chỉ mục source](../edutrack_be/docs/project-code-index.md).
- Khi xem riêng repo trên GitHub: [Hướng dẫn trong repo backend](https://github.com/Lamriver123/edutrack_be/blob/main/docs/project-guide.md), [Chỉ mục trong repo backend](https://github.com/Lamriver123/edutrack_be/blob/main/docs/project-code-index.md). Các link này có hiệu lực sau khi tài liệu được push.

Mở bảng file theo chức năng ở mục 2, sau đó mục FE/API/session hoặc nghiệp vụ đang sửa. Từ backend chạy `node scripts/project-index.cjs --check` để tìm source thay đổi; chỉ đọc diff và symbol liên quan.

Sau sửa FE, cập nhật phần guide tương ứng và regenerate chỉ mục BE + FE từ backend. Hướng dẫn Next.js trong AGENTS.md vẫn áp dụng khi viết code Next.
