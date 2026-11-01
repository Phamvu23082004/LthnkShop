# Dashboard và doanh thu cơ bản
## Cài đặt và quyền
Chạy migration 202610310008_revenue_dashboard.sql sau khi có các bảng đơn hàng. Chủ shop hoặc staff có analytics.read được xem tại Dashboard/Tổng quan (/). Staff không có quyền chỉ thấy truy cập nhanh, không nhận dữ liệu tài chính từ server. RPC kiểm tra quyền/active trong database, chỉ trả aggregate và tên sản phẩm, không trả khách/SĐT/địa chỉ/ID đơn. Không dùng service-role, không cache báo cáo dùng chung.
Một RPC đọc nhất quán tổng hợp toàn bộ đơn theo bộ lọc; không giới hạn ở 20 đơn hoặc giới hạn 1000 dòng API. Không JOIN order_items vào phép cộng tiền đơn, tránh nhân tiền theo số sản phẩm. Không có dữ liệu giả.

## Ý nghĩa số liệu
Bộ lọc ngày/tháng/năm/khoảng ngày áp dụng ordered_on (ngày đặt), theo date lịch Việt Nam. Mặc định tháng hiện tại, có tất cả thời gian. Đây là báo cáo theo NHÓM ĐƠN đặt trong kỳ, không phải sổ dòng tiền phát sinh trong kỳ.
- Tổng đơn bao gồm đơn hủy. Đang xử lý là các đơn chưa hoàn thành/chưa hủy.
- Doanh số = sum(total_vnd) của đơn chưa hủy, đã gồm ship và giảm giá.
- Doanh số hoàn thành = giá trị các đơn completed.
- Tổng tiền thực thu = sum(paid_vnd), gồm cả cọc và tiền còn ghi nhận ở đơn hủy.
- Tiền cọc = sum(deposit_vnd), là tập con đã thu; tuyệt đối không cộng paid + deposit.
- Công nợ = sum(remaining_vnd) của đơn chưa hủy.
- Đối soát: đã thu ở đơn chưa hủy + công nợ = doanh số.
Đơn hủy không tự hoàn tiền; phần đã thu của đơn hủy tách riêng để đối soát. Hệ thống chưa có ledger thu/hoàn tiền theo từng giao dịch, nên chưa thể khẳng định thời điểm thu thực tế. Khi có ledger, bổ sung báo cáo theo paid_at thay vì đổi nghĩa âm thầm.
Tiền serialize từ PostgreSQL bằng chuỗi số nguyên, format qua BigInt để không mất chính xác. Biểu đồ dùng tỷ lệ BigInt trước khi đổi sang phần trăm.

## Biểu đồ và sản phẩm bán chạy
Biểu đồ theo tháng đặt đơn, chỉ tính phần khoảng đã chọn, điền 0 cho tháng không có đơn. Có chọn chỉ số, chọn cột xem số tiền, và bảng số liệu truy cập bằng bàn phím. Các series không cộng chồng cọc vào thực thu.
Top 10 sản phẩm theo tổng số lượng, loại trừ đơn hủy. Dùng tên/type snapshot; tiền hàng là tổng dòng trước giảm giá và ship, không đồng nhất doanh số đơn.
Đơn chưa có ngày đặt: tính trong tất cả thời gian và có cảnh báo; loại khỏi bộ lọc ngày cụ thể/biểu đồ tháng. Không tự gán ngày lịch sử.

## Kiểm thử
SQL chạy trên PostgreSQL nhúng: đối soát cọc, hủy, nhiều item không nhân tổng, tháng rỗng/ngày biên, undated và quyền xem riêng analytics.read; anon/staff chỉ orders.read/inactive bị từ chối. UI chưa có kiểm thử browser tự động. Không tạo giao dịch giả trên database cloud để kiểm thử.
