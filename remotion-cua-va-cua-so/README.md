# CÁNH CỬA & CỬA SỔ: phim ngắn Remotion (9:16)

Phim ngắn 32 giây, dựng lại hoàn toàn bằng code từ video tham chiếu của *neuronvisuals* (“Strict parents vs Chill parents”, 11,2 giây). Không dùng hình hay tiếng nào từ video gốc.

Phim giữ DNA của bản gốc:
- Chia đôi màn hình: bố mẹ nghiêm khắc ở trên, bố mẹ dễ tính ở dưới.
- Đồng hồ LED đỏ ở giữa hai cảnh.
- Phòng ngủ ban đêm tông xanh lạnh, nhân vật que (con màu trắng, bố mẹ màu xám).
- Cửa ra vào, cửa sổ, đèn ngủ.
- Giữ nguyên lời thoại cốt lõi: *“Con chỉ cần xin phép thôi mà.” / “Con đã xin rồi.”*

- **Output:** `out/cua-va-cua-so_web.mp4` (H.264, có trong repo) và master CRF16 tạo bằng `npm run render`. Thông số: 1080×1920, 30fps, AAC 320k, 32s.
- **Font:** Montserrat (SIL OFL), tự host, có subset tiếng Việt.
- **Âm thanh:** toàn bộ nhạc và SFX đều tự tổng hợp bằng Python/NumPy/SciPy. Không dùng sample hay bản ghi của bên thứ ba, nên được toàn quyền sử dụng thương mại. Mức −15.6 LUFS, true peak −1.5 dBTP.

## Kịch bản

| Thời gian | Hồi | Hình ảnh | Tâm lý học |
|---|---|---|---|
| 0–1.9s | **Hook (in medias res)** | 01:40 sáng. Phòng tối, đứa trẻ lén trèo qua cửa sổ vào nhà. *Tách!* Đèn bật lên, bố mẹ đã ngồi chờ sẵn trong bóng tối. Dấu “!” hiện lên. | Gây tò mò ngay giây đầu: *“Chuyện gì đã xảy ra?”* |
| 1.9–2.9s | **Tua ngược** | Băng tua ngược, đồng hồ quay về 21:30, căn phòng trượt lên vị trí. Căn phòng thứ hai hiện ra. | Hứa hẹn câu trả lời và mở ra cấu trúc so sánh |
| 2.9–5s | **Cùng một câu hỏi** | *“Tối nay con đi chơi được không?”* Một bên trả lời *“Không.”* rồi đóng sập cửa. Bên kia: *“Được! Về trước 12 giờ nhé.”* | Hai biến số, một hằng số: người xem tự so sánh |
| 5–8s | **Cửa sổ** | Đứa trẻ bị cấm trèo lên giường, mở cửa sổ và biến mất. Gió lùa làm rèm bay. Đứa trẻ được cho phép thì đi ra bằng cửa chính. | Ẩn dụ trung tâm: cửa chính (minh bạch) và cửa sổ (che giấu) |
| 8–15s | **Đêm trôi** | Time-lapse: trăng di chuyển, đèn thành phố tắt dần. Bố mẹ nghiêm khắc phát hiện, *“?!”*, rồi ngồi chờ, ôm đầu. **23:58**, đứa trẻ được tin tưởng về nhà đúng giờ: *“Đi chơi vui không con?”*, rồi bật đèn và ngồi kể chuyện. | Tin tưởng được đáp lại bằng trách nhiệm (về trước 12 giờ) |
| 16–22s | **Đối chất** | Hook được trả lời trọn vẹn. *“Con chỉ cần xin phép thôi mà.”* / *“Con đã xin rồi.”* Nhạc tắt hẳn, chỉ còn một nốt piano trầm. Cùng lúc ở phòng bên: bố mẹ xoa đầu con, tắt đèn, đứa trẻ ngủ (*z z*). | Câu thoại cuối đảo ngược thế đứng của bố mẹ, để người xem tự vỡ lẽ |
| 24.5–32s | **Thông điệp** | *“Cấm đoán không giữ được con ở nhà. / Nó chỉ khiến con chọn cửa sổ.”* Một cánh cửa mở ra, ánh sáng ấm tràn xuống, bóng một đứa trẻ bước về qua cửa: ***“Hãy là cánh cửa con dám gõ.”*** | Khép lại bằng chính ẩn dụ thị giác của phim. Câu cuối ngắn, dễ nhớ, dễ chia sẻ |

## Kỹ thuật

- **Thời gian truyện tất định** (`src/timeline.ts`). Cả hai căn phòng là hàm thuần của *story time*. Phim ánh xạ frame → story time, nhờ vậy hook và đoạn tua ngược chỉ là phát lại cùng một thế giới theo chiều ngược. Đồng hồ, trăng và đèn thành phố đều suy ra từ giờ trong truyện.
- **Rig nhân vật** (`src/rig.ts`, `src/anim.ts`): forward kinematics với hơn 25 tư thế, keyframe có easing kiểu spring/back để chuyển động có trọng lượng và follow-through. Chu kỳ bước khóa theo quãng đường đi được nên chân không trượt. Có nhịp thở, xoay người kiểu 2.5D (lật trục X) và phối cảnh theo độ sâu.
- **Ánh sáng 2.5D** (`src/scene/Room.tsx`): lớp tối toàn cảnh, cộng thêm ánh sáng screen-blend từ đèn ngủ, hành lang và trăng. Có bóng đổ lên tường khi đèn ngủ bật, bóng đổ trên sàn do ánh sáng hành lang, contact shadow và phản chiếu trên sàn gỗ bóng. Nhân vật được chiếu sáng theo khoảng cách tới từng nguồn sáng, đầu có shading hình cầu. Thêm parallax cho bầu trời, rèm bay theo gió khi cửa sổ mở, bụi lơ lửng trong vệt trăng, camera handheld, vignette và film grain.
- **Đồng hồ 7 đoạn** tự vẽ, có glow, nhấp nháy mỗi khi sang phút, cùng phản chiếu bên dưới.
- **Âm thanh đồng bộ theo frame:**
  - `scripts/export-events.ts` xuất mọi bước chân từ chính chu kỳ đi của rig.
  - `audio/make_audio.py` đặt toàn bộ cue theo story time và dùng đúng cách ánh xạ của hình, áp dụng cho cả hook lẫn đoạn tua ngược.
  - Hai phòng được pan lệch nhau một chút để tách thành hai thế giới. Nhạc tự duck xuống gần câm trong khoảnh khắc đèn bật và câu thoại cuối.

## Lệnh

```bash
npm install
npm run studio          # xem và chỉnh trong Remotion Studio
npm run audio           # xuất sự kiện rồi tổng hợp lại soundtrack (cần python3 + numpy + scipy)
npm run render          # render MP4 ra out/
# Nếu môi trường không tải được Chrome: export REMOTION_CHROME=/đường/dẫn/chrome-headless-shell
scripts/sheet.sh <dir> <cols> <scale> <frame...>   # contact sheet để QA từng frame
```

Mọi mốc thời gian nằm ở `src/timeline.ts` (thời gian truyện `S`, cấu trúc phim `F`). Diễn xuất của nhân vật, đạo cụ và camera nằm ở `src/story.ts`.
