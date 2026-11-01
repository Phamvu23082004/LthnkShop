# API tạo chủ shop trước đăng nhập
POST /api/setup/owner tạo chủ shop đầu tiên. Không cần cookie đăng nhập; bắt buộc Authorization: Bearer <BOOTSTRAP_TOKEN>. Endpoint không phải đăng ký công khai và không nhận role từ người gọi. Nhân viên được tạo trong trang Tài khoản sau đăng nhập.

1. Hoàn thiện .env.local với URL, publishable key, service-role key Supabase.
2. Chạy supabase/migrations/202610310001_accounts.sql trong SQL Editor sau khi đối chiếu database. File nay đã đầy đủ; không chạy đè nếu đã có bảng cùng tên.
3. Tạo bí mật bằng: node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
4. Tự thêm BOOTSTRAP_TOKEN=<bí mật vừa tạo> vào .env.local. Không đưa bí mật vào NEXT_PUBLIC hoặc gửi qua chat.
5. Khởi động lại npm run dev.
6. Gọi bằng Postman/Thunder Client:
   - Method: POST
   - URL: http://localhost:3000/api/setup/owner
   - Authorization: Bearer Token, nhập mã BOOTSTRAP_TOKEN
   - Content-Type: application/json
   - Body JSON:
```json
{"fullName":"Chủ shop LTHNK","email":"email-cua-ban@example.com","password":"THAY_BANG_MAT_KHAU_RIENG_12_KY_TU_CO_CHU_VA_SO"}
```
Không dùng mật khẩu ví dụ làm mật khẩu thật. Response không trả lại mật khẩu hay khóa.
201: tạo thành công; 400: sai JSON/input; 401: sai token; 404: API chưa bật; 409: đã có chủ shop/email trùng/hoàn tác provisioning; 413: body quá 4 KiB; 415: sai content type; 503: lỗi cấu hình/kết nối.
Sau 201, xóa BOOTSTRAP_TOKEN, khởi động lại và vào /login. Tắt public signup trong Supabase. Database chặn bootstrap lần hai bằng transaction lock ngay cả khi hai request đến cùng lúc.
Nếu Auth đã có email nhưng chưa có hồ sơ chủ shop, API không chiếm tài khoản đó: dùng script/quản trị database sau khi xác minh UUID. Không gọi API lên production qua HTTP không mã hóa.

## Phạm vi kiểm thử
Test tự động dùng adapter giả cho giao tiếp Auth và PostgreSQL nhúng cho RLS/RPC. Không thay thế kiểm thử với Supabase Cloud thật. Docker không cần cho API này.
