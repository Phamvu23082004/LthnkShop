<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Quy ước LTHNK Handmade Management
## Kiến trúc
Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Supabase Auth/PostgreSQL. src/app giữ route/layout mỏng; src/features chứa actions/schema nghiệp vụ; src/lib/auth và src/lib/supabase giữ adapter và kiểm tra quyền. Server Components mặc định. UI tiếng Việt, VND, DD/MM/YYYY, timezone Asia/Ho_Chi_Minh.
Mẫu Stitch gốc ở ../design/stitch, không sửa hoặc ghi đè. Thiết kế mới đã cung cấp ưu tiên tông nâu ấm/bố cục hai cột; font heading Quicksand và body Be Vietnam Pro theo yêu cầu ban đầu.
## Bảo mật
Không localStorage auth, không tài khoản giả. Xác minh getUser server-side, đọc role/active/grants từ DB. Không tin role trong user_metadata. Không cache dữ liệu cá nhân giữa người dùng. Mỗi page/action/query kiểm tra quyền riêng; sidebar không phải hàng rào bảo mật.
Service-role chỉ có trong file server-only và script quản trị, không NEXT_PUBLIC, không log. RLS bật trên mọi bảng public; mặc định không client writes. RPC security definer phải search_path rỗng, kiểm tra actor nội bộ và grant EXECUTE rõ ràng.
Tạo tài khoản: Auth trigger tạo staff inactive; owner RPC kích hoạt, cấp quyền và audit cùng transaction. Không xóa chủ shop cuối cùng. Bất kỳ thay đổi vai trò/trạng thái phải giữ advisory lock thống nhất. Public signup phải tắt trong Supabase.
## Quy tắc nghiệp vụ
Sản phẩm gồm bộ DIY đóng sẵn và thành phẩm. Báo cáo sản lượng nhiều loại linh kiện, quản trị duyệt và chụp đơn giá; lương chỉ tính số lượng đã duyệt. Tồn kho dùng ledger, available=on_hand-reserved, không âm. Tiền cọc là một loại khoản thu, không cộng doanh thu hai lần. Tiền VND dùng integer numeric, không tính tiền bằng float. Không SPX/in nhãn.
Module đơn hàng có orders.read/orders.write, RPC giao dịch và RLS. Sản lượng nhân viên dùng employees.read, phiếu và dữ liệu lương chỉ đọc của chính nhân viên; danh mục, duyệt và ghi nhận lương chỉ chủ shop. Đơn giá được chụp khi gửi báo cáo, số tiền công chỉ tính số lượng được duyệt. Kho vẫn là placeholder. Dashboard/doanh thu dùng RPC get_revenue_dashboard, chỉ analytics.read được xem; cọc là một phần paid_vnd, không cộng hai lần. Báo cáo hiện lọc nhóm đơn theo ordered_on, không phải dòng tiền theo paid_at. Đơn hủy loại khỏi doanh số/công nợ nhưng tiền đã thu còn giữ được tách riêng. Tiền cọc nằm trong tổng thanh toán; hủy đơn giữ số liệu thanh toán và không tự hoàn tiền. Đơn hủy không chỉnh sửa. Không tự áp dụng migration lên cloud.
## Kiểm tra
npm run lint; npm run typecheck; npm test; npm run build. SQL migration và RLS cần kiểm thử trước khi chạy production. Không ghi đè .env.local hoặc lộ credentials. Cập nhật README khi đổi thiết lập.

## Danh mục sản phẩm
products/product_variants là danh mục dùng trong đơn; màu phải thuộc đúng sản phẩm. Chỉ chủ shop ghi danh mục qua save_catalog_variant. public.save_order xác minh lựa chọn rồi gọi private.save_order_snapshot; hàm private không được cấp EXECUTE cho client. Tên/màu/giá trong đơn là snapshot; sửa danh mục không thay đổi lịch sử. Khi đổi sản phẩm phải xóa lựa chọn màu cũ. Giữ tương thích file nhập CSV và kiểm thử chống ghi đè dữ liệu cũ.
