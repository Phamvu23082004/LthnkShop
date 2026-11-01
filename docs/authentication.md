# Tài khoản, xác thực và phân quyền
## Luồng thực tế
Supabase Auth lưu người dùng và mật khẩu băm trong auth.users. public.profiles lưu tên, email đồng bộ từ Auth, vai trò admin (chủ shop) hoặc staff (nhân viên), cờ active. Không lưu mật khẩu trong bảng nghiệp vụ. public.employee_permissions chứa quyền bổ sung; public.account_audit lưu lịch sử quản lý tài khoản.
SSR dùng cookie qua @supabase/ssr. src/proxy.ts cập nhật token/cookie, getUser xác minh với Auth. getSession xác minh user và đọc trạng thái/quyền từ database ở mỗi request; React cache chỉ tái sử dụng trong một lượt render, không cache dùng chung giữa người dùng. Mỗi trang và server action tự kiểm tra quyền; sidebar chỉ phục vụ giao diện.
Response được đánh dấu private/no-store. Không bật Cache Components cho dữ liệu cá nhân ở giai đoạn này.

## Ma trận
| Chức năng | Chủ shop đang hoạt động | Nhân viên đang hoạt động |
| --- | --- | --- |
| Tổng quan, tài khoản cá nhân, đổi mật khẩu | Có | Có |
| Tạo/khóa tài khoản, đổi vai trò, cấp quyền | Có | Không |
| Danh sách hồ sơ/quyền nhân viên | Có | Chỉ bản thân |
| Nhật ký tài khoản | Có | Không |
| Đơn hàng, kho, doanh thu, nhân viên | Có | Cần capability tương ứng |
Nhân viên có employees.read chỉ được tới trang nghiệp vụ nhân viên đang là placeholder; quyền đó không mở bảng tài khoản hoặc hồ sơ riêng của người khác. Khi phát triển module nhân viên cần bảng hồ sơ nghiệp vụ và chính sách riêng.

## Tạo và quản lý tài khoản
Chủ shop nhập email, tên và mật khẩu ban đầu đủ mạnh. Server xác minh chủ shop rồi gọi Auth Admin API bằng khóa server-only. Trigger tạo hồ sơ inactive/staff, bỏ qua role và active trong user_metadata. Chỉ RPC manage_account có kiểm tra chủ shop mới kích hoạt được hồ sơ.
Auth API và PostgreSQL không có transaction chung: nếu cấp quyền thất bại, server xóa tài khoản Auth vừa tạo để hoàn tác; nếu xóa thất bại, tài khoản vẫn bị khóa và UI báo rõ để quản trị xử lý. Email unique ngăn tạo trùng khi gửi lại.
manage_account giữ advisory transaction lock cho các thay đổi vai trò/trạng thái, kiểm tra lại quyền sau khi lấy lock, chặn mất chủ shop cuối cùng, cập nhật grants và audit cùng transaction. Khóa tài khoản có hiệu lực ở request tiếp theo kể cả JWT chưa hết hạn. Không có xóa tài khoản qua UI nhằm giữ dấu vết.
Service-role chỉ dùng tạo/hoàn tác Auth; các thay đổi quyền dùng client của chính chủ shop. Khóa không được import từ client code. Không tin JWT user_metadata cho phân quyền. RPC bootstrap chỉ grant service_role và tự từ chối nếu đã có chủ shop.

## RLS
Tất cả bảng public được tạo trong milestone này bật RLS. anon không có quyền đọc/ghi. authenticated chỉ SELECT, không INSERT/UPDATE/DELETE trực tiếp. Hồ sơ và grants: chỉ bản thân đang hoạt động hoặc chủ shop. Audit: chỉ chủ shop. Helpers private có security definer, search_path rỗng và tên bảng đầy đủ; không có recursion policy.
RPC công khai duy nhất cho quản lý quyền kiểm tra actor nội bộ và validate toàn bộ tham số. SQL tests kiểm tra metadata không tự nâng quyền, cô lập hồ sơ, chặn ghi trực tiếp, chặn nhân viên gọi RPC/quyền bootstrap, cấp/thu hồi capability, tài khoản khóa và chủ shop cuối cùng.

## Vận hành và giới hạn
Tắt public signup trong Supabase Dashboard; không chỉ ẩn trang đăng ký. Bật rate limits Supabase Auth. Ứng dụng không triển khai bộ đếm đăng nhập giả trong bộ nhớ máy chủ.
Mật khẩu mới yêu cầu 12–128 ký tự, chữ và số; đổi mật khẩu phải nhập lại mật khẩu hiện tại. Chưa có email recovery tự động/MFA hay bắt buộc đổi mật khẩu ban đầu. Chủ shop hỗ trợ phục hồi qua quản trị Supabase đáng tin cậy; không gửi service key cho nhân viên.
Nếu bootstrap email đã tồn tại: không xóa người dùng cũ. Sau khi kiểm tra danh tính trong Dashboard, một quản trị database có thể gọi bootstrap_owner với đúng UUID và tên từ SQL Editor khi chưa có owner; hàm vẫn chặn bootstrap lần hai.
SQL migration chưa tự động áp dụng lên cloud. Kiểm thử RLS phải chạy trên local/test DB; các check TypeScript/build không thay thế kiểm thử Supabase thật.
Tham khảo: https://supabase.com/docs/guides/auth/server-side/creating-a-client và https://supabase.com/docs/reference/javascript/auth-admin-createuser

## Kiểm thử tự động
npm test chạy kiểm thử quyền/validation và migration + bộ kiểm tra RLS trên PostgreSQL nhúng PGlite. Schema auth/users và auth.uid được mô phỏng theo hợp đồng JWT của Supabase. Đây là kiểm thử SQL thực, không thay cho kiểm thử mạng Supabase Auth hoặc đồng thời nhiều kết nối; cần kiểm tra thêm trên dự án development trước khi dùng thật.

API khởi tạo /api/setup/owner được cho qua proxy đăng nhập nhưng tự xác thực token thiết lập server-only; RPC bootstrap_owner giữ khóa và chặn lặp khi đã có bất kỳ chủ shop. Xóa token sau thiết lập. Xem setup-api.md.
