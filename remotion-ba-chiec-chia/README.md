# BA CHIẾC CHÌA: phim ngắn Remotion (9:16)

> **Không có AI giỏi nhất. Chỉ có AI hợp việc nhất.**

Phim ngắn 82 giây so sánh Gemini, Claude và ChatGPT qua một ẩn dụ gần với mọi gia đình Việt: **chùm chìa khóa của mẹ**. Mẹ chưa bao giờ hỏi chìa nào tốt nhất. Mẹ chỉ hỏi: *mình đang mở cửa nào?*

- **Video:** `out/ba-chiec-chia_web.mp4` (H.264, có trong repo). Bản master CRF16 được tạo bằng `npm run render`. Thông số: 1080×1920, 30fps, AAC 320k, −14 LUFS, true peak ≤ −1 dBTP.
- **Phụ đề:** `out/ba-chiec-chia.srt`, lấy theo timestamp thật của từng từ trong file giọng.
- **Lời đọc:** `voice/narration.txt`
- **Giọng đọc:** `voice/narration_charon.wav`, một file liền mạch từ **MỘT** lần gọi Gemini TTS, giọng `Charon`. Không cắt ghép, không chèn khoảng lặng, không time-stretch.
- **Nhạc và SFX:** `audio/stems/music_sfx.flac` (nền đã duck), `audio/stems/voice_48k.flac`, mix cuối `public/audio/mix.wav`
- **Art Direction Manifesto:** `docs/ART_DIRECTION.md`
- **Bản quyền:** `docs/LICENSES.md`

## Cấu trúc câu chuyện

| Thời gian | Nhịp | Hình | Vai trò |
|---|---|---|---|
| 0–8.9s | Hook | Ba cái tên tranh nhau hạng 1. Câu hỏi "giỏi nhất?" bị một nét son gạch bỏ. Một lỗ khóa sáng lên trong bóng tối | Nghịch lý: câu hỏi ai cũng hỏi lại là câu hỏi sai |
| 8.9–17.5s | Curiosity | Chùm chìa khóa của mẹ dưới một ngọn đèn. "Chìa nào tốt nhất?" mờ đi, "Mình đang mở cửa nào?" hiện lên | Human insight, ẩn dụ trung tâm |
| 17.5–45s | Tension | Ba chìa rời chùm. Mỗi chìa mở một cánh cửa sơn mài, bên trong là tấm thếp vàng ghi các việc nó làm tốt | Thông tin cốt lõi, mỗi cảnh một ý |
| 45–53s | Giới hạn ẩn dụ | 12 cánh cửa sáng gần hết. Một chìa vặn êm, một chìa phải vặn mạnh | Nói thẳng giới hạn của ẩn dụ để không làm người xem hiểu sai |
| 53–58s | **Revelation** | "giỏi nhất" bị gạch, "hợp việc nhất" bừng sáng. Cao trào nhạc | ONE BIG IDEA |
| 58–66s | Cách làm | "Việc thật của bạn": thử ba chìa trơn (cố ý không gắn tên), chìa nào mở êm thì cửa sáng | Hành động cụ thể, trung lập |
| 66–72s | Cảnh tỉnh | Vết rạn vỏ trứng lan trên chìa: "Chìa nào cũng có lúc sai", kèm dấu ✓ "tự kiểm tra lại" | Tính chính xác, có trách nhiệm |
| 72–82s | Emotional payoff | Quay lại chùm chìa của mẹ. Một cánh cửa sáng, một người bước vào | Khoảnh khắc đọng lại |

## Quy trình kỹ thuật

1. `voice/tts.py`: gửi toàn bộ lời đọc trong một lần gọi Gemini TTS (`Charon`). Cần biến môi trường `GEMINI_API_KEY`.
2. `voice/qa_listen.py`: nhờ Gemini nghe lại bản đọc để bắt lỗi phát âm. Bản được chọn đạt 9/10 về độ tự nhiên, 10/10 về độ rõ.
3. `voice/align.py`: **forced alignment**. Whisper-small (faster-whisper, CTranslate2 int8) lấy timestamp từng từ, sau đó đối chiếu với kịch bản gốc bằng difflib (198/199 từ khớp). Biên câu được bắt chính xác vào các khoảng lặng đo trên sóng âm.
4. `src/cues.ts`: **nguồn sự thật duy nhất**. Mọi nhịp hình và mọi cue âm thanh đều tính từ timestamp của từ. `scripts/export-cues.ts` xuất các cue này cho phần âm thanh, nên hình và tiếng không thể lệch nhau.
5. `audio/make_audio.py`: score và foley tổng hợp bằng NumPy. Nhạc duck theo envelope của giọng (−9 dB) và nới ra quanh cao trào. Loudness được chuẩn hóa theo BS.1770.
6. `scripts/make_textures.py`: tạo texture sơn then, thếp vàng và film grain bằng thủ tục, không dùng ảnh ngoài.
7. Toàn bộ hình ảnh vẽ bằng React và SVG: chìa, ổ khóa, cửa, icon, nhân vật.

## Lệnh

```bash
npm install
npm run studio                       # xem trong Remotion Studio
GEMINI_API_KEY=... python3 voice/tts.py gemini-3.8-flash-tts   # tạo lại giọng (cả file)
python3 voice/align.py voice/narration_charon.wav <whisper-small-ct2-dir> && cp voice/words.json src/
npx tsx scripts/export-cues.ts && python3 audio/make_audio.py  # dựng lại âm thanh
python3 scripts/make_srt.py          # phụ đề
npm run render                       # MP4 master
# Môi trường không tải được Chrome: export REMOTION_CHROME=/đường/dẫn/chrome-headless-shell
scripts/sheet.sh out/qa 6 1 5 10 ... # contact sheet để QA từng cảnh
```
