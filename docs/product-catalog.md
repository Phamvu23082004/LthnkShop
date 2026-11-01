# Chọn sản phẩm và màu
Chạy migration 202610310006_product_catalog.sql sau 005. Không tự áp dụng cloud. /orders/products dành cho chủ shop: thêm sản phẩm (DIY/thành phẩm), thêm màu/mẫu, giá mặc định, đổi màu/giá, ngừng bán một màu. Nhân viên chỉ đọc danh mục khi có orders.read; mọi thay đổi danh mục qua RPC owner-only và có audit.
Migration lấy danh mục từ order_items đã có, giá mặc định lấy bản mới nhất; không thay đổi tiền, tên hoặc màu trong đơn cũ. Chỉ bổ sung liên kết ID. Nếu chưa có đơn, chủ shop thêm danh mục trên trang mới hoặc dùng file nhập CSV đã cập nhật.
Tạo đơn: chọn sản phẩm, chọn màu của đúng sản phẩm; giá tự điền và có thể điều chỉnh theo thỏa thuận. Đổi sản phẩm xóa màu cũ. Màu ngừng bán không dùng cho dòng mới, vẫn có thể giữ nguyên trên đơn cũ. Chưa có quản lý tồn kho liên quan.
save_order là wrapper có kiểm tra active/quyền và khóa giao dịch, xác thực quan hệ sản phẩm/màu rồi chụp tên, loại, màu. Lưu order_items có FK kép variant_id/product_id. Hàm ghi giao dịch cũ được chuyển vào private.save_order_snapshot, revoke mọi quyền gọi trực tiếp cho anon/authenticated. Chỉ wrapper gọi được. Không dùng service-role trong thao tác đơn.
Giá trong mỗi dòng là giá chốt của đơn, không tham chiếu động tới giá danh mục. Import cũ được phân giải bằng tên/loại/màu khớp chính xác. File nhập CSV có bước tạo danh mục từ dữ liệu nguồn trước khi gọi save_order, không ghi đè giá danh mục đã có.

## Nhóm sản phẩm hoàn chỉnh của shop
Twinkle, Bonet, Khăn, Túi, Bikini, Khác được thêm bằng migration 007. Không tạo trùng tên chỉ khác chữ hoa/thường; không xóa các sản phẩm khác hoặc thay đổi màu/giá/ID đang có. Không tự tạo màu hay giá giả cho các sản phẩm mới; chủ shop bổ sung tại /orders/products trước khi chọn để bán. File nhập CSV đã gộp danh mục này.
