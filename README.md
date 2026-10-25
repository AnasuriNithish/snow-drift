# ❄️ SnowDrift: Plow Master

> A 3D winter snow-plowing game built with TypeScript and Vite. Clear the streets, beat the rival plow crews, and become the Plow Master.

![Status](https://img.shields.io/badge/status-in%20development-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-99%25-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/built%20with-Vite-646CFF?logo=vite&logoColor=white)
![Bun](https://img.shields.io/badge/runtime-Bun-000000?logo=bun&logoColor=white)
![Deployed on Netlify](https://img.shields.io/badge/deployed%20on-Netlify-00C7B7?logo=netlify&logoColor=white)

---

## 🌨️ About the Game

Snow is falling, the roads are buried, and the city needs you. Drive your heavy snowplow through a snowy town, push snow off the streets, and clear enough of the municipal area to hit the target. Along the way you'll race against AI-controlled rival crews, manage your diesel and nitro, and earn rewards for keeping the roads open.

The game runs entirely in the browser. No install, no sign-up, just open it and start plowing.

---

## ✨ Features

- **Municipal Clearance Goal.** Track how much of the town you've cleared in real time. Hit the target percentage to complete the job.
- **Rig Competition.** Five-way leaderboard against AI rivals: Blizzard Bob, Frosty Fiona, Alpine Ava, Turbo Sven, and you.
- **Realistic Plow Controls.** Monitor speed, RPM, diesel level, and nitro charge from the dashboard HUD.
- **Nitro Boost.** Hold `SPACE` to blast through deep drifts when you're running low on patience.
- **Collectibles and Objectives.** Track progress on in-level objectives with counters and earn coins as you go.
- **Reward System.** Coins and rewards accumulate as you clear more of the map.
- **Multiple Camera Modes.** Switch between Isometric 45°, Top-Down, and Chase Cam.
- **Day and Night Cycle.** Play in Morning, Dusk, Night, or Aurora lighting. Each one changes the mood of the snowfall.
- **Horn and Sound.** Honk at rivals with `H`, and toggle audio with the speaker button.
- **Hideable Controls Panel.** Press `C` to clean up the screen and enjoy the scenery.

---

## 🎮 Controls

| Key | Action |
| --- | --- |
| `SPACE` | Nitro boost (uses nitro charge) |
| `H` | Horn |
| `C` | Show or hide the controls panel |
| `R` | Reset the plow to the road |

> Additional plow and attachment controls appear on the in-game control bar. Use the on-screen hints to see the full set for your session.

---

## 🛠️ Tech Stack

- **Language:** TypeScript
- **Build tool:** Vite
- **Package manager and runtime:** Bun (`bun.lock` is included)
- **Hosting:** Netlify
- **Prototyping:** Built with Google AI Studio

---

## 📁 Project Structure

```
snow-drift/
├── src/              # Game source code (rendering, physics, UI, game logic)
├── index.html        # Entry HTML page
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
├── package.json      # Dependencies and scripts
├── bun.lock          # Bun lockfile
├── metadata.json     # App metadata used by Google AI Studio
├── .env.example      # Example environment variables
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed on your machine
- A modern browser with WebGL support (Chrome, Edge, Firefox, or Safari)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/AnasuriNithish/snow-drift.git
cd snow-drift

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env.local
# Open .env.local and fill in any required values

# 4. Start the development server
bun run dev
```

Then open the local URL printed in your terminal (usually `http://localhost:5173`).

### Production Build

```bash
bun run build
```

The optimized output is written to the `dist/` folder. You can preview it locally with:

```bash
bun run preview
```

---

## ☁️ Deployment

The game is deployed on Netlify. To deploy your own copy:

1. Push the repository to your GitHub account.
2. Create a new site on [Netlify](https://www.netlify.com) and connect it to the repository.
3. Set the build command to `bun run build` and the publish directory to `dist`.
4. Add any environment variables from `.env.example` in the Netlify dashboard.

---

## 🤝 Contributing

Contributions, ideas, and bug reports are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-idea`)
3. Commit your changes (`git commit -m "Add amazing idea"`)
4. Push to the branch (`git push origin feature/amazing-idea`)
5. Open a Pull Request

---

## 🗺️ Roadmap

- [ ] More maps and town layouts
- [ ] Additional plow attachments (salt spreader, snow blower)
- [ ] Upgradeable trucks and garage
- [ ] Weather events such as blizzards and ice storms
- [ ] Online leaderboards
- [ ] Mobile touch controls

---

## 🙏 Acknowledgements

- Prototyped with [Google AI Studio](https://aistudio.google.com)
- Built with [Vite](https://vitejs.dev), [TypeScript](https://www.typescriptlang.org), and [Bun](https://bun.sh)
- Hosted on [Netlify](https://www.netlify.com)

---

## 📄 License

This project does not currently specify a license. Add a `LICENSE` file to define how others may use the code.

---

<p align="center">
  Made with ❄️ and a lot of snow.<br/>
  <b>Keep the roads open, Plow Master.</b>
</p>
