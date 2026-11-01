# Nhập CSV T10/2026
Người dùng xác nhận cột đầu là ngày hẹn: tháng 10–12 thuộc 2026, tháng 1 thuộc 2027; trống ngày để chưa hẹn. Ngày đặt là ngày tạo đơn trong hệ thống: SQL tính trực tiếp tại thời điểm nhập theo Asia/Ho_Chi_Minh, không lấy từ CSV hoặc thời điểm tạo file SQL. SĐT và địa chỉ chưa biết được để trống. Chạy lại file không thay đổi ngày đặt của đơn đã tồn tại.

Chạy `node scripts/prepare-csv-import.mjs <đường-dẫn-CSV> <loại-sản-phẩm>` để tạo file SQL riêng trong `private-imports/`: `lthnk-set-diy-2026.sql` cho `diy_kit` hoặc `lthnk-t10-2026.sql` cho `finished_product`. Loại sản phẩm là `diy_kit` hoặc `finished_product`; mặc định là `finished_product` để giữ tương thích với lệnh cũ. Ví dụ file Set DIY: `node scripts/prepare-csv-import.mjs "D:\Download\orders.csv" diy_kit`. File SQL có dữ liệu khách, được gitignore; không đưa vào public hoặc commit. Bản CSV nguồn không bị thay đổi.

File SQL gộp các migration đơn hàng cần cho import (002–008 và 012), rồi nhập dữ liệu qua RPC trong một transaction. Migration 012 bổ sung phân loại đơn, nền tảng bán hàng và URL người mua. Chạy toàn bộ file trong Supabase SQL Editor sau khi đã thiết lập tài khoản chủ shop. Không chạy lại migration tài khoản. Không tự thực thi migration trên cloud từ ứng dụng.

Mỗi dòng được coi là một sản phẩm hoàn chỉnh, số lượng 1, tên theo Phân loại và biến thể theo Màu; giữ toàn bộ dòng gốc trong ghi chú. `FALSE` được giữ trong dữ liệu gốc, đơn mới dùng trạng thái Đang chuẩn bị chứ không suy diễn đã sản xuất/giao hàng. IG/TT được chuẩn hóa Instagram/TikTok; SĐT mobile 9 chữ số được khôi phục số 0 đầu, hoặc lấy số 10 chữ số có sẵn trong địa chỉ. Những thông tin khác không được tự bịa.

Tiền đã trả = Giá + Ship - Còn lại và phải >= Đã cọc. Chuẩn hóa dấu phân cách hỗn hợp như 1.130,000 đ thành 1.130.000 VND. Giữ nguyên số dư gốc, không cộng cọc hai lần. ID nhập được tạo ổn định từ nội dung dòng; chạy lại cùng file không thêm đơn trùng và không ghi đè đơn đã sửa. Nếu sửa nguồn CSV, dòng thay đổi được coi là dữ liệu mới, cần đối chiếu trước khi nhập lại.

Bản đã chuẩn bị: 45 đơn, tổng 29.702.000 VND, đã trả 17.374.000 VND, còn lại 12.328.000 VND. 36 đơn chưa có SĐT sau khi trích từ địa chỉ, 30 đơn thiếu địa chỉ, 1 đơn chưa hẹn. Đã chạy thử SQL thực trên PostgreSQL nhúng, lần hai vẫn 45 đơn. Chưa nhập lên cloud: cần người dùng chạy file SQL trong SQL Editor.
