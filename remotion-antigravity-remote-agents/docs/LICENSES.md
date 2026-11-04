# Bản quyền tài nguyên

| Tài nguyên | Nguồn | Giấy phép / Trạng thái |
|---|---|---|
| Giọng đọc `public/audio/charon_voice.wav` | Gemini TTS, model `gemini-3.8-flash-tts`, giọng **Charon**, tạo trong **một lần gọi duy nhất** | Nội dung tạo ra qua Gemini API theo Điều khoản dịch vụ của Google Gemini API. Người dùng chịu trách nhiệm tuân thủ điều khoản đó khi dùng thương mại |
| Nhạc nền & toàn bộ sound design | Tự tổng hợp bằng numpy trong `audio/make_audio.py`, không dùng sample, bản ghi bên thứ ba hay dịch vụ tạo nhạc | Thuộc quyền sở hữu của dự án, dùng thương mại an toàn |
| Toàn bộ hình ảnh, chuyển động | Vẽ bằng code (React/SVG/CSS) | Thuộc dự án |
| `public/img/antigravity_card.png` | Cắt từ clip người dùng cung cấp (ảnh chụp giao diện thông báo "Introducing Remote Agents" trong Antigravity) | Ảnh chụp giao diện sản phẩm của Google, dùng với mục đích bình luận/đưa tin. Tên "Google", "Antigravity", "GitHub", "Google Drive", "Claude Code", "Codex" là nhãn hiệu của chủ sở hữu tương ứng. Phim không dùng logo |
| Be Vietnam Pro, Noto Serif Display, JetBrains Mono | Fontsource (npm) | SIL Open Font License 1.1 |
| Grain texture | Tạo bằng numpy | Thuộc dự án |

## Kiểm chứng nội dung
- Các thông tin "agent chạy trên đám mây và vẫn làm việc sau khi bạn đóng ứng dụng", "xem từ bất kỳ trình duyệt nào (antigravity.google.com)" và nguồn dữ liệu "Upload Files / Google Drive / GitHub" đều lấy trực tiếp từ thông báo trong ứng dụng ở clip gốc.
- Câu "Google đang nấu rất nghiêm túc" là **nhận định** của người viết nội dung gốc, không phải dữ kiện.
- Màn hình trình duyệt danh sách agent là **minh họa** và có ghi chú "Minh họa giao diện" ngay trên màn hình. Phim không đưa ra con số thống kê nào.
