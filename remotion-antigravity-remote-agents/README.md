# «Bếp vẫn đỏ lửa» — Google Antigravity Remote Agents (9:16)

Phim ngắn 75.7 giây, 1080×1920, 30fps, dựng bằng Remotion + React + TypeScript.

## Deliverables
| File | Nội dung |
|---|---|
| `out/bep-van-do-lua.mp4` | Bản master H.264 CRF16, AAC 320k, −13.8 LUFS, true peak −1.4 dBTP |
| `out/bep-van-do-lua.srt` | Phụ đề theo timestamp thật của giọng đọc |
| `public/audio/charon_voice.wav` | File giọng Charon liền mạch, một lần gọi TTS (24 kHz mono) |
| `public/audio/mix.wav` | Bản mix cuối (48 kHz / 24-bit stereo) |
| `audio/stems/music.wav`, `audio/stems/sfx.wav` | Stem nhạc và hiệu ứng (chưa duck) |
| `audio/alignment.json` | Timestamp từng từ (forced alignment) |
| `docs/loi-doc.txt` | Lời đọc |
| `docs/ART_DIRECTION.md` | Art Direction Manifesto |
| `docs/LICENSES.md` | Thông tin bản quyền tài nguyên |

## Pipeline
1. **Giọng đọc:** `GK=<gemini key> python3 scripts/tts_charon.py <dir> gemini-3.8-flash-tts`. Gửi toàn bộ `narration.txt` trong một request, giọng Charon. Lần tạo đầu bị lỗi (model đọc luôn phần chỉ dẫn phong cách) nên đã tạo lại **cả file**, không vá từng đoạn.
2. **Kiểm tra bằng ASR:** `scripts/asr_check.py` dùng Gemini để chép lại lời từ audio, xác nhận file đọc đúng từng câu.
3. **Forced alignment:** `scripts/align.py`. Phương pháp: biết trước văn bản, tìm biên im lặng theo năng lượng, dùng quy hoạch động để khớp ranh giới cụm từ (theo dấu câu) với các khoảng lặng, rồi chia thời gian từng từ theo số âm tiết (tiếng Việt đơn âm tiết). Mốc đầu câu lệch dưới 0.2s so với mốc ASR. Các model alignment trên HuggingFace bị chặn mạng trong môi trường này nên phải tự làm cách trên.
4. **Timeline:** `npm run timeline` sinh `src/timeline.json` và file SRT. Mọi điểm cắt cảnh, chuyển động và cue âm thanh đều lấy từ timestamp thật. Hình chạy theo giọng.
5. **Âm thanh:** `npm run audio`. Nhạc và SFX tổng hợp bằng code, side-chain duck dưới giọng (nhạc thấp hơn giọng khoảng 11 dB). Cao trào (boom + hợp âm Bb maj9 + chuông) rơi đúng chữ "Google Antigravity… Remote Agents".
6. **Render:** `REMOTION_CHROME=<chrome-headless-shell> npm run render`.

## Cấu trúc cảnh (theo giọng đọc)
| # | Thời gian | Cảnh | Vai trò |
|---|---|---|---|
| 1 | 0–4.4s | Gập laptop, đốm lửa thoát ra, code vẫn tự viết | Hook / nghịch lý |
| 2 | 4.4–7.6s | "vô lý?", đường gập biến thành bếp ga | Mở vòng tò mò |
| 3 | 7.6–18s | Nồi "AI agent" trên bếp ga, người đứng canh, tắt máy là tắt bếp | Cách cũ |
| 4 | 18–27s | Nén nhang cháy, ánh màn hình lạnh, chữ "AI" bị gạch, hiện "thời gian" | Tension, insight |
| 5 | 27–34.8s | Im lặng, "Và giờ", đốm lửa bay lên, *Remote Agents*, ảnh thông báo thật, sơ đồ máy ↔ mây | Revelation |
| 6 | 34.8–41.9s | Nồi cơm điện ở "bếp của Google": bấm nút, người rời đi, *vẫn nấu.* | Payoff của ẩn dụ |
| 7 | 41.9–48.8s | Nguyên liệu GitHub / Google Drive / tệp, cửa sổ trình duyệt | Chi tiết |
| 8 | 48.8–54.8s | Bát cơm, đôi đũa, hơi cơm biến thành code, người đọc lại | Giới hạn ẩn dụ |
| 9 | 54.8–63.2s | Ba đốm lửa trên hành lang một điểm tụ | Bối cảnh cuộc đua |
| 10 | 63.2–69.8s | Câu hỏi thật sự | Đóng vòng |
| 11 | 69.8–75.7s | Laptop đã gập, đốm lửa vẫn cháy, *Bếp vẫn đỏ lửa.* | Khoảnh khắc đọng lại |
