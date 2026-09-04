import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Danh sách các route public (không yêu cầu đăng nhập)
  const publicPaths = ['/login', '/register', '/verify-otp', '/forgot-password'];

  // Bỏ qua các file tĩnh, ảnh, API và Next.js internals để tối ưu hiệu suất
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Kiểm tra xem user có cookie refresh token chưa (chứng tỏ đã đăng nhập)
  const hasRefreshToken = request.cookies.has('edutrack_refresh_token');

  // TRƯỜNG HỢP 1: Chưa đăng nhập mà truy cập đường dẫn lạ hoặc đường dẫn bảo vệ
  // (Đây là phần giải quyết vấn đề: bạn bè nhận được link nhưng chưa đăng nhập sẽ bị đẩy về login thay vì 404)
  if (!hasRefreshToken && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // TRƯỜNG HỢP 2: Đã đăng nhập nhưng lại cố vào lại trang login/register hoặc trang chủ
  if (hasRefreshToken && (isPublicPath || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // TRƯỜNG HỢP 3: Hợp lệ -> Cho phép đi tiếp
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Chạy middleware trên tất cả các route, NGOẠI TRỪ:
     * - api (các route API)
     * - _next/static (các file tĩnh của Next.js)
     * - _next/image (file tối ưu ảnh của Next.js)
     * - favicon.ico (icon website)
     */
    '/((?!api|_next/static|_next/image|logo.png).*)',
  ],
};
