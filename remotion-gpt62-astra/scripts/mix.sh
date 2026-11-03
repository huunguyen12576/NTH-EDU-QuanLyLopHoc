#!/bin/bash
# Voice: trim prompt read-out, place at voiceAt, EQ/comp/subtle room; mix with ducked score; -14 LUFS.
set -e
ffmpeg -y -v error -i audio/voice_tts.wav -af "aresample=48000,highpass=f=75,equalizer=f=180:t=q:w=1:g=1.5,equalizer=f=3200:t=q:w=1.2:g=2,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3,aecho=0.9:0.6:28|47:0.10|0.06,adelay=350|350,apad=whole_dur=42.6,pan=stereo|c0=c0|c1=c0" -ar 48000 audio/voice_final.wav
ffmpeg -y -v error -i audio/score_sfx.wav -i audio/voice_final.wav -filter_complex \
"[1:a]asplit=2[v][sc];[0:a]volume=0.55[m];[m][sc]sidechaincompress=threshold=0.04:ratio=5:attack=20:release=350[md];[md][v]amix=inputs=2:normalize=0:weights='1 1.0',loudnorm=I=-14:TP=-1.0:LRA=9,atrim=0:42.6" -ar 48000 public/mix.wav
ffmpeg -hide_banner -i public/mix.wav -af ebur128=peak=true -f null - 2>&1 | grep -A12 Summary | grep -E "I:|Peak:"
