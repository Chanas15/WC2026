# World Cup 2026 Live Dashboard

## Mục đích
Dashboard web hiển thị lịch thi đấu, tỷ số và bảng xếp hạng World Cup 2026.
Dữ liệu đọc từ Notion database, deploy trên Vercel, chia sẻ link cho bạn bè xem.

## Cấu trúc file
- `index.html` — Toàn bộ giao diện (HTML/CSS/JS trong 1 file). Tự fetch `/api/matches` mỗi 2 phút.
- `api/matches.js` — Serverless Function đọc 104 trận từ Notion database, trả về JSON.

## Phong cách giao diện
- Nền tối "sân vận động đêm" (#0A0E27), gradient tím/coral/vàng cúp
- Font: Archivo Black (heading) + Be Vietnam Pro (body)
- Tỷ số hiển thị kiểu "bảng điện tử" màu vàng neon
- Toàn bộ text bằng tiếng Việt

## Environment Variables (Vercel)
- `NOTION_TOKEN` — Notion Integration token
- `WC_DATABASE_ID` — ID database "⚽ Kết quả & Lịch thi đấu World Cup 2026"

## Dữ liệu Notion
Database có 104 trận (T1–T104), các cột chính:
Trận, Vòng đấu, Bảng, Ngày (VN), Giờ (VN), Đội 1, Đội 2, Tỷ số, Đội thắng, Trạng thái

Vòng đấu gồm: Vòng bảng (T1-72), Vòng 32 đội (T73-88), Vòng 16 đội (T89-96),
Tứ kết (T97-100), Bán kết (T101-102), Tranh hạng Ba (T103), Chung kết (T104)

Tỷ số được điền THỦ CÔNG vào Notion → dashboard tự đọc và tính bảng xếp hạng.

## Tính năng đã thêm (Claude Code)
- Highlight + auto-scroll đến trận "hôm nay" khi mở trang
- Đếm ngược (countdown) đến trận tiếp theo
- Tìm kiếm đội bóng
- Dark/Light mode toggle
- Đã fix bug: tính ngày "Hôm nay" theo timezone GMT+7 (trước đó bị lệch do dùng giờ server)
- UI nâng cấp: skeleton loading khi tải data, micro-animation, hover effect

## Lưu ý quan trọng
- KHÔNG hardcode token vào code — luôn dùng `process.env`
- Tính "Hôm nay" PHẢI theo giờ Việt Nam (GMT+7), không dùng giờ local của server/browser trực tiếp
- Dark mode là theme gốc (nền #0A0E27) — Light mode là theme bổ sung, giữ đúng tinh thần "sống động World Cup" ở cả 2 theme
- Bảng xếp hạng tự tính từ tỷ số (3đ thắng, 1đ hòa), tự sort theo Đ > HS > BT
- Giữ responsive cho mobile (bạn bè xem trên điện thoại)
- Người dùng là người mới học code, ưu tiên giải thích đơn giản, có ví dụ cụ thể
- Giao tiếp bằng tiếng Việt
