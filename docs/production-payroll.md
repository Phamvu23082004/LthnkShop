# Sản lượng handmade và bảng lương

Sau các migration tài khoản, đơn hàng và doanh thu, chạy `supabase/migrations/202610310009_handmade_payroll.sql` trong Supabase SQL Editor. Migration tạo danh mục bộ phận mặc định gồm Phôi đầu, Tay, Chân, Thân, Mũ trùm, Hoa và Các bộ phận khác; đồng thời cấp quyền `employees.read` cho nhân viên đang hoạt động để họ dùng không gian sản lượng cá nhân.

Tại `/employees`, nhân viên ghi ngày hoàn thành, mẫu sản phẩm, kích thước và nhiều dòng bộ phận; có thể lưu nháp, gửi duyệt, xem lịch sử và sửa phiếu nháp hoặc bị trả. Không cần phiếu giao việc trước. Nhân viên chỉ đọc được phiếu, báo cáo và khoản lương của chính mình theo RLS.

Chủ shop quản lý danh mục và bảng giá theo bộ phận + mẫu sản phẩm + kích thước. Cần có đơn giá đang hoạt động cho từng dòng trước khi gửi phiếu. Đơn giá được chụp tại thời điểm gửi; duyệt một phần hoặc sửa bảng giá sau đó không đổi số tiền đã chốt. Chủ shop duyệt từng dòng bằng số lượng từ 0 đến số đã báo cáo. Phiếu chỉ chuyển sang Đã duyệt sau khi mọi dòng được xem xét; có thể trả phiếu để nhân viên sửa, thao tác này xóa các kết quả duyệt dở.

Bảng lương tính tiền công từ số lượng được duyệt nhân đơn giá đã chụp. Tạm ứng và khoản thanh toán đã ghi nhận được trừ; thưởng và phụ cấp được cộng. Các lần ghi nhận được lưu riêng để đối soát, không cập nhật/xóa trực tiếp. Bộ lọc hỗ trợ ngày, tháng, năm, khoảng ngày và toàn bộ thời gian; các khoản tạm ứng/thưởng/phụ cấp/thanh toán được gom theo tháng lương.

Dashboard của nhân viên hiển thị báo cáo gần đây, số phiếu chờ duyệt/cần chỉnh sửa và tiền công đã duyệt trong tháng hiện tại. Không dùng service-role trong trình duyệt; các thao tác ghi đi qua Server Actions rồi RPC kiểm tra quyền trong database.
