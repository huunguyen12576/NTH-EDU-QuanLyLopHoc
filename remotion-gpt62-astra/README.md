# GPT-6.2 Astra (tin đồn) · Video dọc 9:16 dựng bằng Remotion

Video teaser tin tức dạng dọc, 1080×1920, 30fps, dài 42,6 giây. Nội dung được trình bày là **tin đồn chưa xác nhận**.

## Ý tưởng chính
**"Lớn hơn, mà lại rẻ hơn."** Nếu tin đồn đúng, cuộc đua AI không còn là ai to nhất,
mà là ai đưa trí tuệ đến tay nhiều người nhất.

Mạch truyện: Tò mò (tên bị che) → Hé lộ (GPT-6.2 Astra) → Căng thẳng (10T? nhưng… GIÁ) → Nghịch lý (lớn hơn / rẻ hơn) → Thông điệp → Đọng lại (bình minh của ngôi sao, "HÔM NAY?").
Màu sắc đi theo cảm xúc: sáng → tối (đoạn căng thẳng về giá) → bình minh.

## Bản giao
| Tệp | Nội dung |
|---|---|
| `out/gpt62-astra-teaser.mp4` | Bản cuối: H.264 1080×1920, AAC 320k, −14 LUFS |
| `out/gpt62-astra-teaser.vi.srt` | Phụ đề tiếng Việt (đã căn theo các khoảng ngắt của giọng đọc) |
| `public/mix.wav` | Bản mix âm thanh cuối |
| `audio/voice_final.wav` · `audio/score_sfx.wav` | Các stem: giọng đọc đã xử lý, nhạc nền + hiệu ứng âm thanh |
| `src/` | Mã nguồn Remotion (React + TypeScript) |

## Dựng lại từ đầu
```bash
npm install
python3 scripts/make_audio.py      # tổng hợp nhạc nền + hiệu ứng âm thanh (numpy)
./scripts/mix.sh                   # xử lý giọng đọc + mix + chuẩn loudness
REMOTION_CHROME=/path/to/chrome-headless-shell npm run render
```
Giọng đọc: `GEMINI_KEY=... python3 scripts/tts.py gemini-3.8-flash-tts audio/voice_tts.wav` (giọng Charon, đọc liền một lượt `audio/voiceover.txt`).
Model Flash TTS đọc thành tiếng mọi câu hướng dẫn phong cách đi kèm, nên script chỉ gửi đúng phần lời thoại.
(`gemini-2.5-pro-preview-tts` báo HTTP 429 với cả hai key.) Bản đọc thử đầu tiên bị lỗi, giữ lại tại `audio/voice_v1_rejected.wav` để đối chiếu.
`scripts/regions.py` chép lại lời từng đoạn trong giọng đọc để kiểm tra nội dung và căn thời gian.
Phần chuyển động được dựng theo một đồng hồ "câu chuyện" riêng, rồi ánh xạ sang thời gian giọng đọc thật qua bảng `warp` trong `src/timeline.json`.
Không commit API key vào repo.

## Kiểm chứng thông tin
- Mọi nhận định (gợi ý từ Tibo, ~10T tham số, chi phí ngang Claude Opus 5.5, rẻ hơn GPT-6 Astra) đều lấy từ nội dung được cung cấp, và trên màn hình luôn gắn nhãn *tin đồn / ước đoán / chưa xác nhận*.
- Thẻ thông tin về Tibo ghi rõ là **diễn giải**, không phải trích nguyên văn. Biểu đồ giá **không có con số** và được ghi chú là "minh họa tương đối · không theo tỷ lệ".
- Thời điểm làm video (03/11/2026): không tìm thấy thông báo chính thức nào về GPT-6.2 Astra.

## Bản quyền asset
| Asset | Nguồn | Giấy phép |
|---|---|---|
| Font Be Vietnam Pro | @fontsource/be-vietnam-pro | SIL Open Font License 1.1, được dùng thương mại |
| Nhạc nền + hiệu ứng âm thanh | Tự tổng hợp từ đầu bằng code (`scripts/make_audio.py`), không dùng sample nào | Tác phẩm gốc, không có quyền của bên thứ ba |
| Giọng đọc | Google Gemini TTS (giọng Charon), tạo bằng API key của người dùng | Theo điều khoản Gemini API: nội dung tạo ra thuộc quyền sử dụng của người dùng |
| Hình ảnh, chuyển động (ngôi sao, sóng, lưới, biểu đồ) | Vẽ trong code (SVG/CSS) | Tác phẩm gốc |
| Logo OpenAI / Anthropic | **Không sử dụng.** Tên sản phẩm chỉ xuất hiện dưới dạng chữ, mang tính thông tin | — |
