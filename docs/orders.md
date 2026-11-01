# Quản lý đơn hàng
## Cài đặt
Chạy migration mới supabase/migrations/202610310002_orders.sql trong Supabase SQL Editor sau migration tài khoản 202610310001. Không chạy lại migration tài khoản. Chưa tự áp dụng lên Supabase Cloud.
Migration thêm orders, order_items, order_status_history, order_revisions và hai RPC save_order/change_order_status; mở rộng danh sách capability cho manage_account. Bảng và RPC đều kiểm tra quyền. Chủ shop có toàn bộ quyền; nhân viên cần orders.read để xem, và cả orders.read + orders.write để tạo/sửa/hủy/cập nhật trạng thái. Cấp trong trang Tài khoản.
Nếu chưa migration, danh sách hiển thị hướng dẫn thay vì dữ liệu giả.

## Thao tác
/orders: tìm theo mã, khách, SĐT, kênh, tên hoặc phân loại sản phẩm; lọc trạng thái và ngày đặt theo ngày/tháng/năm/khoảng ngày; phân trang 20 đơn. /orders/new tạo; /orders/[id] chi tiết và lịch sử; /orders/[id]/edit chỉnh sửa.
Mỗi dòng sản phẩm là thông tin chụp tại thời điểm bán: tên, DIY hoặc thành phẩm, phân loại tự do, số lượng và đơn giá. Chưa có catalog/inventory ở milestone này nên nhập tên thủ công; chưa trừ hoặc giữ tồn DIY. Không giả lập tích hợp kho.
Mã DH-YYYY-00000001 sinh trong DB; sequence có thể có khoảng trống khi giao dịch thất bại. Ngày đặt và hẹn dùng date, hiển thị DD/MM/YYYY. Giờ lịch sử theo Asia/Ho_Chi_Minh.

## Tiền và lịch sử
Tổng = tổng các dòng + ship - giảm giá. Giảm giá không vượt tiền hàng. Tiền cọc nằm trong tổng đã thanh toán: 0 ≤ cọc ≤ đã trả ≤ tổng đơn. Còn lại = tổng - đã trả. Tính bằng BigInt ở domain và numeric trong DB, giới hạn tổng 1.000 tỷ VND, đơn giá 1 tỷ, số lượng 10.000/dòng và 100 dòng/đơn. Trình duyệt chỉ xem trước; máy chủ và DB xác thực lại.
Trạng thái được cập nhật thủ công, có thể chuyển giữa các trạng thái chưa hủy; không tích hợp vận chuyển. Mọi thay đổi thực sự đều ghi người thực hiện, trạng thái trước/sau, lý do và thời gian. Không ghi lịch sử trùng khi trạng thái không đổi.
Hủy yêu cầu lý do và xác nhận, giữ dữ liệu thanh toán để đối soát; không tự hoàn tiền. Đơn đã hủy không sửa/mở lại. Việc hoàn tiền và ledger khoản thu sẽ triển khai cùng analytics; các trường hiện tại là số dư chụp, không phải sổ thu tiền theo ngày.
Sửa đơn lưu snapshot toàn bộ input trong order_revisions; cập nhật version và lock tránh ghi đè. Tạo mới có request_id duy nhất chống gửi trùng. RPC lưu đơn/dòng/lịch sử trong cùng transaction; lỗi bất kỳ sẽ rollback toàn bộ.
## Kiểm tra
npm test có kiểm thử số tiền, nhiều sản phẩm, ngày nhuận/bộ lọc, RLS và RPC PostgreSQL nhúng: chỉ xem không được ghi, inactive bị chặn, không ghi trực tiếp, chống gửi trùng, phiên bản cũ, rollback, lịch sử/hủy. Chưa kiểm thử trình duyệt tự động hoặc Supabase Cloud cho module mới. Không tạo dữ liệu đơn giả trên cloud để kiểm thử.

## Trạng thái khởi tạo và lọc
Đơn mới bắt đầu ở Đang chuẩn bị. Chạy migration 202610310004_order_default_preparing.sql nếu đã cài module trước đây. Migration giữ nguyên đơn và lịch sử cũ. File nhập CSV được tạo lại đã gộp migration này. Bộ lọc hỗ trợ ngày đặt/ngày hẹn, ngày/tháng/năm/khoảng ngày và giữ tham số khi phân trang. Form lọc dùng điều hướng client của Next.js, reset đúng khi quay lại URL cũ.

## Quy trình ba trạng thái
Trạng thái sản xuất chỉ gồm Chưa Làm (preparing), Đang Làm (producing), Hoàn Thành (completed). Đơn mới là Chưa Làm. Hủy đơn là thao tác riêng, giữ dấu cancelled để bảo toàn dữ liệu. Migration 005 đổi pending thành preparing, ready/shipping thành producing và ghi lịch sử chuyển đổi; không sửa lịch sử cũ. Ngày trả đơn là due_on (ngày hẹn giao), có sắp xếp gần nhất/xa nhất và ngày đặt mới nhất. Chưa có ngày trả xếp cuối, giữ sort khi lọc/phân trang.
