# Hướng nội ≠ Nhút nhát — Remotion cinematic remake

Short dọc 9:16 (1080×1920, 30fps, 28s) dựng lại toàn bộ bằng Remotion + React + SVG — không dùng video gốc làm nền.

## Concept (giữ DNA bản gốc)
Một quán cà phê tối, nền đen, nhân vật trắng. Hai người cùng ngồi một mình:
- **HƯỚNG NỘI** (đỏ — cuốn sách) đọc sách, được mời thì từ chối nhẹ nhàng: *"Thôi, mình ổn mà."*
- **NHÚT NHÁT** (xanh lạnh — ánh cửa sổ) chỉ dám *nghĩ* lời chào trong bong bóng suy nghĩ đen.
- Cùng một lời mời *"Ngồi chung với tụi mình không?"* lặp lại hai lần → hai phản ứng trái ngược.
- Ẩn dụ thị giác chính: **suy nghĩ lật thành lời nói** (bong bóng đen → trắng, flash, chord bừng sáng), người nhút nhát bước từ ánh xanh lạnh vào vùng sáng ấm của nhóm.
- Kết: *"Có người im lặng vì thấy bình yên. / Có người im lặng vì chờ một lời mời."* → **"Hãy là người mở lời trước."**

## Cấu trúc
```
src/
  beats.ts            mốc thời gian (frame) — hình & tiếng cùng bám theo
  Main.tsx            camera, timeline nhân vật, bóng thoại, typography
  Soundtrack.tsx      cue SFX đồng bộ từng chuyển động + nhạc + ambience
  components/Figure   rig nhân vật 2.5D (IK tay/chân, biểu cảm, rim light)
  components/Set      bối cảnh: tường, cửa sổ + thành phố parallax, đèn, light cone, bụi, bàn
  components/Bubble   bóng suy nghĩ / bóng thoại (lật được), nhãn nhân vật
  lib/anim.ts         keyframe, easing, spring, noise, blink
scripts/
  generate-audio.mjs  tổng hợp toàn bộ nhạc + SFX bằng thuật toán
  stills.mjs          xuất khung hình kiểm tra
```

## Âm thanh & bản quyền
Toàn bộ nhạc (piano + pad, A thứ → Đô trưởng theo cung bậc cảm xúc), ambience quán cà phê, tiếng cười, bước chân, tiếng lật sách, nhịp tim, "pop" bóng thoại… đều **được tổng hợp từ code** trong `scripts/generate-audio.mjs` — không dùng sample bên thứ ba, dùng thương mại tự do.
Font **Montserrat** (SIL Open Font License) qua `@fontsource/montserrat`, có subset tiếng Việt.

## Chạy
```bash
npm install
npm run sfx        # tạo lại public/audio/*.wav
npm run studio     # xem & chỉnh trong Remotion Studio
npm run render     # xuất out/huong-noi-vs-nhut-nhat.mp4
```
Môi trường offline: đặt `REMOTION_CHROME=/đường/dẫn/chrome-headless-shell` để dùng Chrome có sẵn.
