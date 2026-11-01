# Hiệu năng và chuyển trang
Luồng ban đầu gọi proxy.getUser, session.getUser, profiles và employee_permissions nối tiếp. Hiện proxy dùng getClaims để kiểm tra JWT/refresh cookie; lớp dữ liệu vẫn gọi getUser và đọc hồ sơ kèm quyền bằng một truy vấn. RLS và trạng thái active tiếp tục được kiểm tra. Không cache quyền dùng chung giữa các request.

Sidebar và các thẻ trên Tổng quan dùng NavigationLink. Tải trước mặc định lấy loading boundary; khi rê chuột hoặc focus, Next.js tải trước toàn bộ route trong production. Không tải toàn bộ trang nội bộ ngay khi mở ứng dụng. Link hiển thị trạng thái pending ngay cả khi trang đích chưa sẵn sàng. loading.tsx có thông báo tiếng Việt và skeleton; đây là phản hồi giao diện, không phải giảm thời gian truy vấn.

Next.js không tự prefetch trong development. Lần đầu chuyển route có thể chậm do biên dịch. Đánh giá production bằng npm run build và npm start. HTTP timing không đo được thời gian vẽ hoặc hành vi client router; cần thử bằng trình duyệt để đánh giá cảm giác chuyển trang. Chưa có kiểm thử browser tự động cho hover/focus và pending.

Không dùng prefetch hoặc giao diện loading thay authorization. Page, server action và RLS vẫn kiểm tra quyền. Độ trễ còn phụ thuộc kết nối và vị trí Supabase; đặt Vercel gần database khi triển khai.
## Tạo và cập nhật đơn
Server action xác minh phiên bằng getUser, validate dữ liệu rồi gọi RPC bằng client của người dùng. Không đọc lại profiles/grants trước RPC: save_order và change_order_status đã kiểm tra active, orders.read và orders.write ngay trong database. Không dùng service-role cho các thao tác này. Các kiểm thử RLS/RPC tiếp tục kiểm tra tài khoản chỉ xem và tài khoản khóa không thể ghi.
Trang chi tiết tải đơn và lịch sử song song. Danh sách dùng useOptimistic để đổi màu dòng ngay trong action transition; lỗi hoặc kết thúc transition chưa có trạng thái mới sẽ tự trở về dữ liệu máy chủ. Có nhãn đang lưu, chỉ báo thành công sau phản hồi database. Màu theo trạng thái luôn kèm chữ để không phụ thuộc riêng vào màu sắc.
Lint, TypeScript, 19 kiểm thử và build đã đạt. Chưa đo thời gian tạo/cập nhật trên trình duyệt với Supabase Cloud sau thay đổi này; không tạo đơn giả trên cloud để benchmark.