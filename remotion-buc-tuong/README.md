# BỨC TƯỜNG — phim ngắn Remotion (9:16)

Phim ngắn 26 giây, dựng lại hoàn toàn bằng code từ video tham chiếu (*neuronvisuals*: “We built this wall together. Let's take it down together.”). Không dùng video gốc làm nền.

- **Output:** `out/buc-tuong_web.mp4` (bản web, có trong repo). Bản master tạo bằng `npm run render`. Thông số: 1080×1920, 30fps, H.264, AAC 320k.
- **DNA giữ nguyên:** nền đen, nhân vật que trắng, lửa đỏ, gạch 3D, sàn bóng phản chiếu. Màu chuyển từ đỏ lửa sang xám lạnh rồi sang ánh sáng trắng, đúng như bản gốc.
- **Font:** Montserrat (SIL OFL), tự host, gồm subset tiếng Việt.
- **Âm thanh:** nhạc và SFX đều tự tổng hợp bằng Python/NumPy, không dùng sample hay bản ghi của bên thứ ba. Toàn quyền sử dụng thương mại. Mức khoảng −15 LUFS.

## Kịch bản (show, don't tell)

| Thời gian | Hồi | Hình ảnh | Tâm lý học |
|---|---|---|---|
| 0–1.5s | **Hook** | Cận mặt: một người quát, chữ **“ÍCH KỶ!”** bật ra, nén lại thành viên gạch nung đỏ. Camera bám theo viên gạch rơi chậm rồi đập xuống sàn | Gián đoạn khuôn mẫu: ẩn dụ được hiểu ngay trong 1 giây, *lời nói = gạch* |
| 1.5–8.6s | **Leo thang** | Kéo lùi máy: hai người cãi nhau giữa biển lửa. Mỗi lời (“VÔ LÝ!”, “CỐ CHẤP!”, “LÚC NÀO CŨNG THẾ!”…) hóa gạch nung đỏ, nguội dần thành đá xám. Nhịp nhanh dần, mỗi câu sinh ra nhiều gạch hơn | Cơn giận tăng theo cấp số. Lời nói lúc nóng giận để lại thứ cứng và lạnh |
| 8.6s | **Bịt kín** | “KỆ NHAU!”: viên cuối khóa đỉnh tường. Tiếng nổ trầm, rồi lửa tắt phụt | Khoảnh khắc không thể quay lại |
| 8.6–14s | **Cô đơn** | Màu rút hết. Khói tàn. Hai người quay lưng bước đi, rồi cùng quay lại, cùng đặt tay lên tường, đúng một độ cao, mà không biết người kia cũng vậy. *“Bức tường này, ta đã cùng nhau xây.”* | Đối xứng gương: cả hai cùng đau như nhau |
| 14.7–16.8s | **Viên gạch đầu tiên** | Một người đẩy viên gạch ra. Ánh sáng lọt qua lỗ. Người kia giật mình, nhìn, rồi đưa tay vào. Hai bàn tay chạm nhau, tóe sáng. *“Vậy hãy cùng nhau gỡ bỏ nó.”* | Một người phải chủ động trước |
| 17.4–20s | **Sụp đổ** | Ánh sáng chạy theo mạch vữa, lan ra từ điểm chạm. Tường sụp theo vật lý thật (trọng lực, nảy, xoay), lan dần từ điểm chạm ra ngoài | Kết nối, không phải sức mạnh, mới làm tường đổ |
| 20–22s | **Hòa giải** | Vẫn nắm tay, hạ xuống thành cái bắt tay, rồi ôm nhau. Gạch tan thành bụi sáng bay lên | Tường hóa thành ánh sáng |
| 22–26s | **Thông điệp** | *“Mỗi lời nói nặng là một viên gạch. / **Hãy là người gỡ viên đầu tiên.**”* | Kết thúc bằng hành động cụ thể, dễ nhớ, dễ chia sẻ |

Bản gốc dùng câu chữ để nói “cùng nhau xây”. Bản này cho người xem *thấy* từng lời nói biến thành gạch. Cú hòa giải bắt đầu từ một người dám gỡ viên đầu tiên, và đó cũng là thông điệp cuối.

## Kỹ thuật

- **Engine 2.5D tự viết** (`src/engine`): camera pinhole có near-plane clipping, roll, rung tay và rung chấn khi va chạm. Đường camera là spline có easing nên chuyển động có trọng lượng.
- **Gạch 3D** shade Lambert, back-face culling, sắp lớp theo painter's algorithm. Gạch nung đỏ phát sáng rồi nguội thành xám. Lửa hắt sáng từ dưới lên. Mạch vữa để lộ ánh sáng lõi tường: đỏ khi cãi nhau, trắng khi hàn gắn.
- **Vật lý** (`story.ts`): mô phỏng rigid body tất định cho gạch rơi (trọng lực, nảy, ma sát, tự nằm phẳng). Thời điểm va chạm được xuất ra để đặt tiếng.
- **Rig nhân vật**: forward kinematics kết hợp IK hai khớp cho tay (chạm tường, đẩy gạch, nắm tay, ôm). Có chu kỳ đi bộ theo quãng đường, xoay người 2.5D.
- **Ánh sáng**: lửa thủ tục có bloom, tàn lửa, khói, bụi, đốm sáng. Sàn bóng phản chiếu toàn cảnh. Thêm vignette và film grain.
- **Đồng bộ âm thanh tuyệt đối**: `scripts/export-events.ts` xuất mọi sự kiện (tiếng quát, gạch bay, gạch khóa, va chạm vật lý, bước chân) và các đường cong nhiệt/ánh sáng. `audio/make_audio.py` dùng chúng để đặt từng âm thanh.

## Lệnh

```bash
npm install
npm run studio          # xem và chỉnh trong Remotion Studio
npm run audio           # xuất sự kiện rồi tổng hợp lại soundtrack (cần python3 + numpy + scipy)
npm run render          # render MP4 ra out/
# Môi trường không tải được Chrome: export REMOTION_CHROME=/đường/dẫn/chrome-headless-shell
```

Toàn bộ thời điểm của phim nằm trong `src/timeline.ts`. Sửa một mốc ở đó thì cả hình lẫn tiếng sẽ cùng dịch theo.
