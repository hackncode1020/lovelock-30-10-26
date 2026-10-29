# Love Lock 🔒❤️

**Locked forever. No key. No exit. 🔐**

A romantic, mobile-first website: a night bridge over a glowing river, fairy lights, and hundreds of padlocks on the railing. Type your person's pet name, engrave it on a golden padlock, lock it, and throw the key into the river.

🔗 **Live:** https://lovelock-hackncode.sites.tab.bot/
💌 **Personalised:** https://lovelock-hackncode.sites.tab.bot/?name=Jaan
🎬 **Auto-play demo:** https://lovelock-hackncode.sites.tab.bot/?demo=1&name=Jaan

Day 4 of 100 days of love-coding by **[@hack.n.code](https://www.instagram.com/hack.n.code/)** 💻❤️

## ✨ Features

- 🌉 **Animated night scene** (canvas): twinkling stars, moon, city skyline, a shimmering river with reflections, a bridge with fairy lights and lamp posts, and lots of swinging padlocks on the railing
- 💫 **Intro splash** with a bobbing lock
- ✍️ **Name input** with pet-name chips (my love, sweetheart, cutiee, baby, Jaan)
- 🔏 **Engraving animation**: "You + <name> ❤️" is engraved letter by letter, with a glowing tool tip and sparks
- 🔒 **Click-shut lock**: the shackle snaps down with a click sound, a flash and a sparkle burst
- 🗝️ **Throw the key**: swipe up (or tap) and the key spins through the air into the river
- 💦 **Splash + ripples**, then **hearts rising from the water**
- 🎆 **Fireworks** (including heart-shaped bursts) and "Locked forever. No key. No exit. 🔐❤️"
- 💗 **Love meter** that fills to ∞
- ⏳ **Forever counter**: counts the seconds since you locked it
- 📜 **5 promises** that appear one by one
- 🧱 **Lock Wall**: other padlocks with cute messages (and yours, saved on your device)
- 📥 **Downloadable lock card** (canvas → PNG, 1080×1350)
- 💬 **WhatsApp share** with a personalised `?name=` link
- 🎵 **Music on/off**: a soft romantic synth track made live with the WebAudio API (no audio files)
- ↺ **Replay**
- 🎬 `?demo=1` auto-play mode for screen recording

## 🛠️ Tech

Plain **HTML + CSS + JavaScript + Canvas**. No libraries, no frameworks, no audio files.

```
index.html   – screens, panels, modals
style.css    – glassy mobile-first UI
app.js       – scene, padlock + engraving, key throw, particles, fireworks, audio synth, card, share
```

## 🚀 Run it

Just open `index.html` in a browser, or use any static server:

```bash
npx serve .
```

## 💡 Use it

`?name=<pet name>` personalises the lock, e.g. `?name=sweetheart`. Default is "my love".

---

Made with ❤️ by **@hack.n.code** · Comment **LOCK** on the reel for more code 💬
