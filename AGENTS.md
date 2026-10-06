<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Tài liệu dự án EduTrack

Đọc [PROJECT_GUIDE.md](PROJECT_GUIDE.md) để mở bản đồ BE + FE trước khi sửa chức năng. Hướng dẫn chi tiết và chỉ mục AST nằm trong repo backend sibling; chỉ đọc mục nghiệp vụ, diff và method liên quan.

Chạy `node scripts/project-index.cjs --check` từ backend để tìm source đã thay đổi. Sau sửa, cập nhật diễn giải guide và sinh lại index/snapshot. Không dùng checkbox kế hoạch cũ để kết luận tính năng đã triển khai khi source chưa có.
