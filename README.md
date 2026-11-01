# LTHNK Handmade Management
Ứng dụng quản lý nội bộ dùng Next.js App Router, TypeScript, Tailwind, shadcn/ui và Supabase. Giai đoạn hiện tại: đăng nhập, tài khoản, phân quyền. Các nghiệp vụ khác là trang chờ triển khai.

## Chạy trên máy
Node.js 22 LTS trở lên. Mở PowerShell tại thư mục dự án:
```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```
Chỉ copy .env.example khi chưa có .env.local. Truy cập http://localhost:3000.
Ứng dụng không giả lập đăng nhập khi thiếu Supabase: trang login giải thích cấu hình còn thiếu. Khởi động lại dev server sau khi thay đổi biến môi trường.

## Kết nối Supabase thật
1. Trong Supabase Dashboard, lấy Project URL và publishable key; điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY vào .env.local.
2. Điền SUPABASE_SERVICE_ROLE_KEY từ mục API keys vào cùng file. Đây là khóa bí mật chỉ máy chủ dùng để tạo tài khoản; không đưa lên trình duyệt hoặc gửi vào chat.
3. Mở SQL Editor của dự án DEVELOPMENT, đọc và chạy supabase/migrations/202610310001_accounts.sql một lần. Nếu database đã có bảng profiles hoặc cấu trúc riêng, phải đối chiếu trước, không chạy đè. Migration không tự chạy qua npm.
4. Authentication → Sign In / Providers → Email: tắt cho phép đăng ký mới (Allow new users to sign up); tắt anonymous sign-ins. Giữ email/password hoạt động. Thiết lập rate limits và CAPTCHA cho môi trường công khai nếu cần.
5. Tạo chủ shop đầu tiên:
```powershell
node --env-file=.env.local scripts/bootstrap-owner.mjs
```
Nhập email, họ tên và mật khẩu khi được hỏi. Mật khẩu nhập ẩn, không lưu trong file hay lịch sử lệnh. Chỉ chạy được khi chưa có chủ shop hoạt động. Nếu email đã tồn tại trong Auth, xem docs/authentication.md.
6. Đăng nhập → Tài khoản → tạo nhân viên. Nhân viên mới tự có quyền báo cáo sản lượng cá nhân; các quyền khác do chủ shop cấp. Gửi mật khẩu qua kênh riêng và yêu cầu đổi ở Tài khoản của tôi. Chưa có luồng email khôi phục mật khẩu tự động.

## Kiểm tra
```powershell
npm run lint
npm run typecheck
npm test
npm run build
```
Kiểm thử RLS trong supabase/tests/accounts_rls.sql cần database Supabase LOCAL dùng riêng cho test. Các test bọc transaction và rollback; không chạy trên database sản xuất.
Không đưa dữ liệu thật vào các phân hệ khác trước khi chúng có RLS và kiểm thử riêng.

## Triển khai
Vercel: chọn Root Directory lthnk-handmade-management, preset Next.js. Cấu hình các biến môi trường riêng cho preview và production. Chạy migration đã kiểm chứng trên database mục tiêu theo quy trình có backup. Không dùng khóa database sản xuất trong preview.
Thiết kế tham khảo giữ nguyên tại ../design/stitch. Mẫu đăng nhập được chuyển sang React, giữ bố cục hai cột và tông nâu ấm. Các nút PIN/NFC và số liệu minh họa không được chuyển thành tính năng giả.
Xem docs/authentication.md và AGENTS.md để biết hợp đồng bảo mật.

## Tạo chủ shop bằng API trước đăng nhập
Xem [hướng dẫn API thiết lập](docs/setup-api.md). API yêu cầu BOOTSTRAP_TOKEN server-only và chỉ tạo chủ shop đầu tiên.

## Quản lý đơn hàng
Xem [hướng dẫn đơn hàng](docs/orders.md). Chạy migration mới 202610310002_orders.sql sau migration tài khoản; không chạy lại migration cũ. Nhân viên cần cả quyền xem và ghi để tạo/sửa/hủy đơn.

## Danh mục sản phẩm và màu
Chạy migration 202610310006_product_catalog.sql sau các migration đơn hàng trước đó. Chủ shop mở /orders/products để quản lý danh mục. Form tạo/sửa đơn chọn sản phẩm rồi màu tương ứng và tự điền giá. Xem docs/product-catalog.md. File nhập CSV đã gộp danh mục và được kiểm tra chạy lại không trùng đơn.

## Dashboard và doanh thu
Chạy migration 202610310008_revenue_dashboard.sql sau khi thiết lập đơn hàng. Báo cáo xuất hiện tại Dashboard/Tổng quan (/) cho chủ shop hoặc nhân viên có analytics.read. Có lọc ngày/tháng/năm/khoảng ngày, biểu đồ tháng và top sản phẩm. Đọc docs/analytics.md để hiểu khác biệt doanh số/đã thu/cọc/công nợ và phạm vi theo nhóm đơn đặt trong kỳ.

## Sản lượng handmade và bảng lương
Chạy migration `202610310009_handmade_payroll.sql` sau migration doanh thu. Module `/employees` có báo cáo nhiều dòng, duyệt từng dòng, danh mục bộ phận, đơn giá theo mẫu/kích thước và bảng lương. Xem [docs/production-payroll.md](docs/production-payroll.md) để biết quy trình, quyền và cách đơn giá được chốt.
