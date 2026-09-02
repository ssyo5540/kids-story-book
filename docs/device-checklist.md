# Device checklist (run before each release and after player changes)

For each of **iOS Safari (tab)**, **iOS Home Screen app**, **Android Chrome (tab + installed)**, **iPadOS Safari landscape**, **desktop Chrome/Safari/Firefox**:

- [ ] Play a story, lock the screen → audio continues for at least 5 minutes.
- [ ] Lock screen shows title, collection and cover; play/pause and ±15 s work.
- [ ] Pause, lock for 60 s, resume from the lock screen → note whether it resumes (iOS is known to be unreliable).
- [ ] Switch apps while playing, come back → position and play/pause state are in sync.
- [ ] Sleep timer 10 min with the screen locked → stops at the right wall-clock time (fade on Android/desktop, hard stop on iOS).
- [ ] Background sounds play together with narration and pause with it.
- [ ] Switch voice mid-story → resumes at the same paragraph.
- [ ] Bluetooth headphones: play/pause buttons; unplugging pauses.
- [ ] Phone call interruption → paused state shown correctly afterwards.
- [ ] Airplane mode → a downloaded story plays; a non-downloaded story shows the offline message.
- [ ] Install prompt/banner appears once; icon and splash look right; theme colour applied.
- [ ] Telugu/Tamil/Kannada/Malayalam titles render in Baloo (no fallback boxes).
- [ ] Reduced-motion setting → no twinkling stars, no page animations.
