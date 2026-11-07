# ĐỘNG LỰC vs KỶ LUẬT — phim ngắn Remotion (9:16)

Phim ngắn 26 giây dựng lại hoàn toàn bằng code từ video tham chiếu (*neuronvisuals*: "Motivated vs Disciplined"). Không dùng video gốc làm nền.

Phim giữ DNA của bản gốc:
- nền đen, hai nhân vật que trắng đứng trong hai giá tạ, khăn buộc đầu đỏ
- bộ đếm **NGÀY 001** của từng người và tờ lịch lật từ 1/1 đến 31/12
- người "động lực" bùng lên rồi tắt, bộ đếm quay về 001, còn người "kỷ luật" lớn dần

Toàn bộ nội dung được Việt hoá.

- **Output:** `out/dong-luc-vs-ky-luat_web.mp4` (bản web, có trong repo). Bản master CRF16 tạo bằng `npm run render`. 1080×1920, 30fps, H.264 + AAC 320k, 26s.
- **Font:** Montserrat (SIL OFL), tự host, gồm subset tiếng Việt.
- **Âm thanh:** nhạc và SFX đều tự tổng hợp bằng Python/NumPy, không dùng sample hay bản ghi của bên thứ ba. Toàn quyền sử dụng thương mại. Mức ≈ −14 LUFS.

## Kịch bản (show, don't tell)

| Thời gian | Hồi | Hình ảnh | Tâm lý học |
|---|---|---|---|
| 0–0.15s | **Bóng tối** | Màn đen, tiếng điện rít | Khoảng lặng trước cú đánh |
| 0.15–2.4s | **Hook** | Đèn bật như sét đánh. Cận cảnh người khăn đỏ đẩy tạ như điên, lửa đỏ và tàn lửa bay | Pattern interrupt: năng lượng cực đại ngay giây đầu |
| 0.8–2.4s | **Reveal** | Camera kéo lùi. Ngọn đèn thứ hai bật lên, lộ ra người bên cạnh đang tập chậm, đều và lặng lẽ | Đặt hai thế giới cạnh nhau trong cùng một khung hình |
| 2.4–4.3s | **Ngày 1** | Ngọn lửa lụi. Người động lực gác tạ, ngồi phịch xuống, rút điện thoại ra | Động lực thường tắt ngay trong ngày đầu tiên |
| 4.3–13.3s | **Một năm** | Lịch lật nhanh dần. Người kỷ luật lắp thêm bánh tạ (3 lần), sáng lên và to dần, để lại vệt time-lapse. Người động lực lướt điện thoại; mỗi lần màn hình loé đỏ thì bật dậy, tập điên cuồng rồi tắt, bộ đếm lại về **001** (đỏ). Mỗi lần bùng cháy ngắn hơn lần trước. Thùng đồ chất đống trong giá của anh | Vòng lặp dopamine: cảm hứng mượn từ màn hình. Người động lực đặt 3 bánh ngay ngày 1, còn người kỷ luật bắt đầu với 1 bánh |
| 13.3–16.5s | **31/12** | Tờ lịch đáp xuống nặng nề. Góc máy thấp, nhịp tim. Người kỷ luật nâng mức tạ nặng nhất, ánh sáng bùng nổ, nhạc chuyển từ Rê thứ sang Rê trưởng | Cao trào: phần thưởng của sự lặp lại |
| 17–20s | **Twist: 1/1** | Năm mới. Người động lực lại bật dậy với **NGÀY 001**, người kỷ luật đã **NGÀY 366** | Gọi lại cú hook: vòng lặp không bao giờ thoát |
| 20–26s | **Thông điệp** | *"Động lực luôn bắt đầu lại từ **ngày 1.**"* / ***"Kỷ luật thì không."*** Rep cuối cùng, bộ đếm lên **367** | Kết bằng một câu ngắn, đối xứng, dễ chia sẻ |

**Âm thanh kể chuyện:**
- Nhịp rep của người kỷ luật chính là **nhịp trống** của phim (pan phải).
- Người động lực có tiếng lửa gầm, tiếng tạ va lộn xộn và tiếng *power-down* mỗi khi tắt (pan trái).
- Mỗi lần bộ đếm về 001 có tiếng bíp đi xuống.

## Kỹ thuật

- **Engine 2.5D** (`src/engine`):
  - Camera pinhole có near-clipping, spline Catmull-Rom, rung tay và chấn động khi va chạm.
  - Hộp 3D và bánh tạ hình trụ 18 cạnh (`prism.ts`), shade Lambert, painter's algorithm.
  - Phản chiếu trên sàn bóng: render lại cả scene đối xứng qua mặt sàn, làm mờ, rồi mask.
- **Rig nhân vật** (`figure.ts`): nhìn chính diện, IK hai khớp cho tay và chân, khuỷu tay bị foreshorten khi đẩy tạ. Các tư thế gồm đẩy tạ, nhún gối, ngồi gục và cầm điện thoại. Thân nhân vật có viền, shading và highlight để tạo khối.
- **Logic câu chuyện** (`story.ts`) là hàm thuần của frame: lịch, lịch rep, các đợt bùng cháy, bánh tạ, thùng rơi theo trọng lực có nảy, camera.
- **Đồng bộ âm thanh tuyệt đối:** `scripts/export-events.ts` xuất mọi sự kiện cùng đường cong "lửa" theo từng frame. `audio/make_audio.py` dùng dữ liệu này để tổng hợp soundtrack.

## Lệnh

```bash
npm install
npm run studio          # xem và chỉnh trong Remotion Studio
npm run audio           # xuất sự kiện rồi tổng hợp lại soundtrack (cần python3 + numpy + scipy)
npm run render          # render MP4 ra out/
# Môi trường không tải được Chrome: export REMOTION_CHROME=/đường/dẫn/chrome-headless-shell
```

Mọi mốc thời gian nằm trong `src/timeline.ts`. Sửa một mốc ở đó thì cả hình lẫn tiếng sẽ cùng dịch theo.
