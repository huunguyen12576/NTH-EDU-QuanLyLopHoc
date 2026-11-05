# BẠN GIẢ vs BẠN THẬT — phim ngắn Remotion (9:16)

Phim ngắn 32 giây, dựng lại toàn bộ bằng code từ video tham chiếu *neuronvisuals* ("Fake friend / Real friend"). Không dùng video gốc làm nền.

Phim giữ DNA của bản gốc: đêm tối, hai nhân vật que trắng viền mực, vỉa hè ướt dưới đèn đường, cửa sổ cam ấm, chiếc xe đỏ phóng qua vũng bùn. Hành động cũng giữ nguyên. Ở phần **bạn giả**, người bạn cười cợt, chọc tay vào má bạn mình. Ở phần **bạn thật**, người bạn tự nhảy vào vũng bùn rồi kéo nhau đứng dậy.

- **Output:** `out/ban-that-ban-gia_web.mp4` (H.264 CRF 21, có trong repo). Bản master CRF 16 tạo bằng `npm run render`. 1080×1920, 30fps, AAC 320k, 32s
- **Font:** Montserrat (SIL OFL), tự host, có subset tiếng Việt
- **Âm thanh:** nhạc và SFX tự tổng hợp bằng Python/NumPy, không dùng sample hay bản ghi của bên thứ ba, nên toàn quyền sử dụng thương mại. Loudness −14 LUFS, true peak ≤ −1 dBTP.

## Kịch bản: cùng một đêm, kể hai lần

| Thời gian | Hồi | Hình ảnh | Tâm lý học |
|---|---|---|---|
| 0–1.5s | **Hook** | Slow-motion: bức tường bùn treo lơ lửng trước mặt người bạn, đèn pha xe lóa, bóng hai người khổng lồ chạy trên tường. Chữ: *"Cùng một vũng bùn. / Hai kiểu bạn."* | Pattern interrupt + câu hỏi mở: khán giả biết trước tai nạn, chờ xem phản ứng |
| 1.5–2s | Tua ngược | Bùn bay ngược về vũng, hai người đi lùi | Motif "tua lại" biến video thành một thí nghiệm: cùng tình huống, khác lựa chọn |
| 2–11.7s | **BẠN GIẢ** | Hai người vừa đi vừa trò chuyện. Xe tạt bùn. A che mặt nên vẫn sạch, rồi ôm bụng cười chỉ trỏ. Cận cảnh: A chọc ngón tay vào má B, nhìn đầu ngón tay dính bùn, **chùi lên vai bạn**, nhếch mép nhìn thẳng ống kính, rồi bỏ đi. B đứng một mình, ánh sáng chuyển lạnh | Mỗi cử chỉ đều nói "tao giữ mình sạch". Màu lạnh, âm thanh mỏng dần, chỉ còn tiếng bùn nhỏ giọt |
| 11.7–12.7s | Tua ngược | Toàn bộ cảnh tua về đầu | "Nếu là một người bạn khác thì sao?" |
| 12.7–24.7s | **BẠN THẬT** | Cùng một đêm. A cũng bật cười như trước (trung thực: ai cũng có phản xạ đó), nhưng nhìn thấy mặt bạn thì nụ cười tắt. Nhạc ngưng, chỉ còn tiếng tim đập. A nhìn xuống vũng bùn, gật đầu, lùi lại lấy đà, rồi **nhảy ngửa vào bùn** (slow-motion 0.35×). Khi tiếng bùn văng vang lên, nhạc ấm bùng lên. B từ sửng sốt chuyển sang bật cười, đưa tay kéo A dậy. A áp lòng bàn tay lên má B: **cùng cử chỉ chạm má như ở phần bạn giả, nhưng ý nghĩa ngược lại** | Khoảng lặng trước quyết định là đỉnh cảm xúc. Lặp lại cử chỉ chạm má tạo vần thị giác để người xem tự so sánh |
| 24.7–32s | **Thông điệp** | Hai người lấm bùn khoác vai nhau bước đi dưới đèn đường (lặp lại cảnh mở đầu), để lại hai hàng dấu chân bùn. Camera cẩu lên. *"Ai cũng muốn đứng cạnh bạn / khi bạn còn sạch sẽ."* → **"Bạn thật / là người dám lấm bẩn cùng bạn."** | Kết bằng câu ngắn, có tính đối, dễ chia sẻ. Hình ảnh dấu chân đôi ở lại lâu hơn chữ |

## Kỹ thuật

- **Engine 2.5D tự viết** (`src/world`, `src/scene`). Camera pinhole phối cảnh thật, có lens shift, roll, rung tay và rung chấn khi va chạm. Thị sai giữa tường, vỉa hè, nhân vật, cột đèn và xe là thị sai thật.
- **Rig nhân vật 3D** (`rig.ts`) dùng forward kinematics: thân, đầu, tay, chân theo góc khớp, quay yaw/pitch toàn thân. Bàn chân tự bám đất. Có chu kỳ đi bộ procedural và quỹ đạo nhảy đạn đạo.
- **Vẽ nhân vật** (`figure.ts`): chi dạng capsule sắp theo độ sâu, viền mực, shading hình trụ theo hướng nguồn sáng chính, rim light. Khuôn mặt vẽ *trên mặt cầu* của đầu (affine cục bộ) nên mắt và miệng co giãn đúng phối cảnh khi quay đầu. Biểu cảm được blend tham số: vui, buồn, sốc, nhếch mép, cười lớn.
- **Bùn**: hơn 300 vết bùn gắn vào xương, lan theo sóng từ dưới lên khi bị tạt, có vệt chảy, vết sáng ướt, chỗ bùn mỏng lộ màu trắng. Mỗi giọt bùn bắn tung tóe có quỹ đạo vật lý (g = 9.8), dừng khi chạm người, mặt đất hoặc tường. Có motion blur theo shutter. Vũng bùn loang trên vỉa hè, giọt bùn nhỏ từ người xuống, dấu chân bùn.
- **Ánh sáng**: đèn đường có chùm sáng volumetric (buffer độ phân giải thấp), quầng sáng, bụi lơ lửng và vũng sáng trên mặt đất. Cửa sổ hắt sáng ấm. Đèn pha xe chiếu bóng hai nhân vật lên tường. Bóng đổ từ đèn đường. Phản chiếu trên vỉa hè ướt và mặt đường. Depth of field theo circle-of-confusion. Grade màu lạnh/ấm theo cảm xúc. Vignette và film grain.
- **Xe đỏ**: profile ép đùn 3D với back-face culling, sơn metallic, kính phản chiếu, bánh xe quay, motion blur nhiều lớp.
- **Thời gian kể chuyện**: mọi thứ là hàm thuần của thời gian cảnh `s` (`src/timeline.ts`). Nhờ đó tua ngược, slow-motion và time-ramp ở hook đều có sẵn, khung hình nào cũng tất định.
- **Âm thanh đồng bộ tuyệt đối**: `scripts/export-events.ts` lấy mọi sự kiện (từng bước chân từ khung xương, tiếng cười theo nhịp rung người, tạt bùn, chọc, chùi, nhảy, vỗ…) theo *khung hình output*. `audio/make_audio.py` đặt âm thanh đúng khung hình đó. Trong slow-motion, âm thanh được hạ pitch theo đúng tốc độ phát.

## Lệnh

```bash
npm install
npm run studio          # xem và chỉnh trong Remotion Studio
npm run audio           # xuất sự kiện + tổng hợp soundtrack (cần python3, numpy, scipy, ffmpeg)
npm run render          # render MP4 master ra out/
# Môi trường không tải được Chrome: export REMOTION_CHROME=/đường/dẫn/chrome-headless-shell
scripts/sheet.sh /tmp/qa 6 0 100 200 300   # contact sheet để QA từng khung hình
```
