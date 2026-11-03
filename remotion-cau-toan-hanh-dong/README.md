# CẦU TOÀN vs HÀNH ĐỘNG — phim ngắn Remotion (9:16)

Phim ngắn 29 giây làm lại hoàn toàn bằng code từ video tham chiếu (*neuronvisuals*: “Don't follow blindly”).
Phim giữ DNA của bản gốc: nền đen, nhân vật que trắng, khối gạch 3D, khăn bịt mắt đỏ, đám đông, vực thẳm, dòng chữ gõ từng ký tự.
Ẩn dụ được chuyển sang chủ đề **cầu toàn và hành động**.

- **Output:** `out/cau-toan-vs-hanh-dong.mp4` — 1080×1920, 30fps, H.264 CRF16 + AAC 320k, 29s
- **Font:** Montserrat (SIL OFL), tự host, gồm subset tiếng Việt
- **Âm thanh:** nhạc và SFX đều tự tổng hợp bằng Python/NumPy, không dùng sample hay bản ghi của bên thứ ba. Toàn quyền sử dụng thương mại. Mức −14.6 LUFS.

## Kịch bản (show, don't tell)

| Thời gian | Hồi | Hình ảnh | Tâm lý học |
|---|---|---|---|
| 0–2s | **Hook** | Cận cảnh: gạch nứt, một người bịt mắt rơi chậm xuống vực | Pattern interrupt: mất mát xảy ra ngay giây đầu |
| 2–6.5s | **Reveal** | Camera kéo lùi: cả đám đông bịt mắt *giậm chân tại chỗ*, đều tăm tắp, trong khi mép gạch sụp dần. *“Họ chờ mọi thứ thật hoàn hảo. / Nhưng mặt đất không chờ ai.”* | Cầu toàn = bận rộn mà không tiến lên. Thời gian = mặt đất bị ăn mòn |
| 6.8–10s | **Tỉnh thức** | Một người dừng lại, giật khăn bịt mắt, khăn đỏ rơi xuống sàn. Người đó thấy vực thẳm | Ánh sáng và âm thanh thu hẹp về một nhân vật (tiếng tim đập, tiếng giậm chân nghe như dưới nước) |
| 10–13s | **Níu kéo** | Người đó quay lại kéo người bên cạnh, nhưng bị đẩy ngược ra mép vực (giữ nguyên hành động trong bản gốc) | Đám đông chống lại người dám khác biệt |
| 13–14.3s | **Bước hụt** | Gót chân rơi vào khoảng không, cả thế giới im bặt | Căng thẳng tột độ |
| 14.3s | **Twist** | **Một viên gạch trồi lên từ vực, đỡ lấy bàn chân** | Trong bản gốc, nhân vật rơi xuống. Ở đây, hành động tạo ra con đường |
| 15–23s | **Hành động** | Mỗi bước chân, một viên gạch trắng *lệch, không hoàn hảo* khóa vào chỗ, và một nốt nhạc vang lên cao dần. Phía sau, người đã đẩy anh rơi xuống vực | Bước đi không hoàn hảo vẫn hơn đứng yên chờ hoàn hảo |
| 20–23s | **Đối lập** | Cảnh toàn: chữ **CẦU TOÀN** vỡ vụn rơi xuống như gạch, chữ **HÀNH ĐỘNG** trồi lên khóa vào chỗ | Gắn hai khái niệm vào hai thế giới trong cùng một khung hình |
| 23–29s | **Thông điệp** | *“Đừng chờ hoàn hảo. / **Hãy đặt viên gạch đầu tiên.**”* Một viên gạch đỏ rơi xuống và khóa vào chỗ | Kết thúc bằng một lời kêu gọi hành động cụ thể, dễ chia sẻ |

## Kỹ thuật

- **Engine 2.5D tự viết** (`src/engine`): camera pinhole có near-plane clipping, roll và rung tay kiểu handheld, cộng hưởng chấn động khi có va chạm. Camera đi theo spline Catmull-Rom với easing để chuyển động có trọng lượng.
- **Gạch 3D** được shade Lambert, có back-face culling và vẽ theo painter's algorithm qua 2 pass: dưới mặt sàn và trên mặt sàn. Sàn bóng có phản chiếu mờ. Mép vực sụp theo từng ô gạch, lệch nhịp ngẫu nhiên theo từng hàng.
- **Rig nhân vật** dùng forward kinematics: giậm chân, đi bộ, chới với khi rơi. Rơi theo trọng lực thật (g = 9.8), xoay theo mô-men.
- **Depth of field** theo circle-of-confusion, có focus pull. Thêm sương theo chiều sâu, glow, vignette và film grain.
- **Đồng bộ âm thanh tuyệt đối:** `scripts/export-events.ts` xuất mọi sự kiện (gạch vỡ, người rơi, bước chân, gạch khóa) từ chính logic cảnh. `audio/make_audio.py` dùng danh sách này để đặt âm thanh đúng từng khung hình.

## Lệnh

```bash
npm install
npm run studio          # xem và chỉnh trong Remotion Studio
npm run audio           # xuất sự kiện rồi tổng hợp lại soundtrack (cần python3 + numpy + scipy)
npm run render          # render MP4 ra out/
# Môi trường không tải được Chrome: export REMOTION_CHROME=/đường/dẫn/chrome-headless-shell
```

Toàn bộ thời điểm của phim nằm trong `src/timeline.ts`. Sửa một mốc ở đó thì cả hình lẫn tiếng sẽ cùng dịch theo.
