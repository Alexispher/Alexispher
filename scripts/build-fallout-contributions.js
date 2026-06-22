const fs = require("fs");

const USERNAME = process.env.GITHUB_USERNAME || "Alexispher";
const OUTPUT = "fallout_contributions.svg";

const LANGUAGES = [
  "Python",
  "JavaScript",
  "Java",
  "Rust",
  "SQL",
  "HTML",
];

const query = `
query($login: String!) {
  user(login: $login) {
    login
    name
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            weekday
          }
        }
      }
    }
  }
}
`;

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function getContributionData() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN não encontrado.");
  }

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "fallout-retro-contributions",
    },
    body: JSON.stringify({
      query,
      variables: {
        login: USERNAME,
      },
    }),
  });

  const json = await response.json();

  if (!response.ok || json.errors) {
    console.error(JSON.stringify(json, null, 2));
    throw new Error("Erro ao buscar dados do GitHub GraphQL.");
  }

  return json.data.user;
}

function getLevel(count, max) {
  if (count === 0) return 0;

  const ratio = count / max;

  if (ratio <= 0.25) return 1;
  if (ratio <= 0.50) return 2;
  if (ratio <= 0.75) return 3;

  return 4;
}

function buildMonthLabels(weeks, gridX, gridY, cell, gap) {
  let labels = "";
  let lastMonth = "";

  weeks.forEach((week, index) => {
    const firstDay = week.contributionDays[0];

    if (!firstDay) return;

    const date = new Date(`${firstDay.date}T00:00:00Z`);
    const month = date
      .toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      })
      .toUpperCase();

    if (month !== lastMonth) {
      labels += `
        <text
          x="${gridX + index * (cell + gap)}"
          y="${gridY - 13}"
          class="month-label"
        >${month}</text>`;
      lastMonth = month;
    }
  });

  return labels;
}

function buildContributionGrid(calendar) {
  const weeks = calendar.weeks;
  const allDays = weeks.flatMap((week) => week.contributionDays);
  const max = Math.max(...allDays.map((day) => day.contributionCount), 1);

  const colors = [
    "#0b1d12",
    "#1d3b21",
    "#2f6b35",
    "#59a84a",
    "#b8ff6a",
  ];

  const gridX = 70;
  const gridY = 170;
  const cell = 7;
  const gap = 2;

  let rects = "";
  const monthLabels = buildMonthLabels(weeks, gridX, gridY, cell, gap);

  weeks.forEach((week, weekIndex) => {
    week.contributionDays.forEach((day) => {
      const x = gridX + weekIndex * (cell + gap);
      const y = gridY + day.weekday * (cell + gap);
      const level = getLevel(day.contributionCount, max);

      rects += `
        <rect
          x="${x.toFixed(2)}"
          y="${y.toFixed(2)}"
          width="${cell}"
          height="${cell}"
          rx="1.2"
          fill="${colors[level]}"
          stroke="#b8ff6a"
          stroke-opacity="${level === 0 ? "0.06" : "0.18"}"
        >
          <title>${day.date}: ${day.contributionCount} contribution(s)</title>
        </rect>`;
    });
  });

  return `
    ${monthLabels}

    <text x="45" y="${gridY + 7}" class="day-label">SUN</text>
    <text x="45" y="${gridY + 25}" class="day-label">TUE</text>
    <text x="45" y="${gridY + 43}" class="day-label">THU</text>
    <text x="45" y="${gridY + 61}" class="day-label">SAT</text>

    <g filter="url(#phosphorGlow)">
      ${rects}
    </g>`;
}

function buildLanguageIcon(name, x, y) {
  const safeName = escapeXml(name);

  const icon = {
    Python: `
      <g transform="translate(${x + 13} ${y + 8})">
        <path d="M4 2 H17 Q21 2 21 6 V12 H10 Q6 12 6 16 V19 H3 Q0 19 0 15 V9 Q0 6 4 6 H13 V4 H4 Z" fill="#b8ff6a" opacity="0.85"/>
        <circle cx="6" cy="5" r="1.3" fill="#07120b"/>
        <path d="M8 14 H19 Q23 14 23 18 V24 Q23 27 19 27 H10 V25 H19 V23 H6 Q2 23 2 19 V14 Z" fill="#6cff5d" opacity="0.65"/>
        <circle cx="17" cy="24" r="1.3" fill="#07120b"/>
      </g>`,
    JavaScript: `
      <g transform="translate(${x + 12} ${y + 7})">
        <rect x="0" y="0" width="24" height="24" rx="3" fill="#b8ff6a" opacity="0.85"/>
        <text x="12" y="17" text-anchor="middle" class="icon-dark">JS</text>
      </g>`,
    Java: `
      <g transform="translate(${x + 13} ${y + 6})">
        <path d="M8 2 C15 7 1 10 10 14" fill="none" stroke="#b8ff6a" stroke-width="2" stroke-linecap="round"/>
        <path d="M14 1 C21 7 7 10 16 14" fill="none" stroke="#6cff5d" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M3 16 H22 L20 25 H5 Z" fill="none" stroke="#b8ff6a" stroke-width="2"/>
        <path d="M22 18 Q27 18 25 22 Q24 25 20 24" fill="none" stroke="#b8ff6a" stroke-width="2"/>
      </g>`,
    Rust: `
      <g transform="translate(${x + 12} ${y + 7})">
        <circle cx="12" cy="12" r="11" fill="none" stroke="#b8ff6a" stroke-width="2"/>
        <circle cx="12" cy="12" r="6" fill="#b8ff6a" opacity="0.25"/>
        <text x="12" y="16" text-anchor="middle" class="icon-green">RS</text>
      </g>`,
    SQL: `
      <g transform="translate(${x + 13} ${y + 7})">
        <ellipse cx="12" cy="5" rx="11" ry="4" fill="none" stroke="#b8ff6a" stroke-width="2"/>
        <path d="M1 5 V19 C1 22 23 22 23 19 V5" fill="none" stroke="#b8ff6a" stroke-width="2"/>
        <ellipse cx="12" cy="19" rx="11" ry="4" fill="none" stroke="#6cff5d" stroke-width="1.5"/>
      </g>`,
    HTML: `
      <g transform="translate(${x + 12} ${y + 6})">
        <path d="M3 1 H25 L22 25 L14 28 L6 25 Z" fill="#b8ff6a" opacity="0.25" stroke="#b8ff6a" stroke-width="2"/>
        <text x="14" y="18" text-anchor="middle" class="icon-green">&lt;/&gt;</text>
      </g>`,
  }[name];

  return `
    <g class="language-card">
      <rect x="${x}" y="${y}" width="118" height="38" rx="6"/>
      ${icon}
      <text x="${x + 45}" y="${y + 24}" class="language-text">${safeName}</text>
    </g>`;
}

function buildLanguagePanel() {
  const startX = 614;
  const startY = 170;
  const gapX = 128;
  const gapY = 48;

  return LANGUAGES.map((language, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);

    return buildLanguageIcon(
      language,
      startX + col * gapX,
      startY + row * gapY
    );
  }).join("");
}

function buildSvg(user) {
  const login = escapeXml(user.login);
  const name = escapeXml(user.name || user.login);
  const calendar = user.contributionsCollection.contributionCalendar;
  const total = calendar.totalContributions;
  const grid = buildContributionGrid(calendar);
  const languagePanel = buildLanguagePanel();

  const generatedAt = new Date().toISOString().slice(0, 10);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520" role="img" aria-labelledby="title desc">
  <title id="title">${login} GitHub Contributions - Retro Terminal</title>
  <desc id="desc">A Fallout-inspired retro terminal displaying GitHub contributions and programming language icons.</desc>

  <defs>
    <radialGradient id="screenGlow" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#193c21"/>
      <stop offset="70%" stop-color="#07120b"/>
      <stop offset="100%" stop-color="#020403"/>
    </radialGradient>

    <linearGradient id="metalFrame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4b4a38"/>
      <stop offset="35%" stop-color="#2c2d24"/>
      <stop offset="100%" stop-color="#11140f"/>
    </linearGradient>

    <filter id="terminalShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000000" flood-opacity="0.55"/>
    </filter>

    <filter id="phosphorGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="0.45" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="4" height="1" fill="#b8ff6a" opacity="0.055"/>
    </pattern>

    <pattern id="noiseDots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="4" r="0.7" fill="#b8ff6a" opacity="0.08"/>
      <circle cx="14" cy="10" r="0.6" fill="#b8ff6a" opacity="0.05"/>
      <circle cx="9" cy="18" r="0.5" fill="#d7c06a" opacity="0.06"/>
    </pattern>

    <style>
      .frame-title {
        font-family: Consolas, "Courier New", monospace;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 2px;
        fill: #d7c06a;
      }

      .terminal-text {
        font-family: Consolas, "Courier New", monospace;
        fill: #b8ff6a;
      }

      .big-number {
        font-family: Consolas, "Courier New", monospace;
        font-size: 42px;
        font-weight: 900;
        fill: #b8ff6a;
        filter: url(#phosphorGlow);
      }

      .small-label {
        font-family: Consolas, "Courier New", monospace;
        font-size: 10px;
        fill: #78b96b;
        letter-spacing: 1.2px;
      }

      .month-label {
        font-family: Consolas, "Courier New", monospace;
        font-size: 9px;
        fill: #88d27b;
        letter-spacing: 0.8px;
      }

      .day-label {
        font-family: Consolas, "Courier New", monospace;
        font-size: 8px;
        fill: #5b9352;
      }

      .panel-line {
        stroke: #b8ff6a;
        stroke-opacity: 0.22;
        stroke-width: 1;
      }

      .panel-box {
        fill: #061009;
        stroke: #b8ff6a;
        stroke-opacity: 0.35;
      }

      .language-card rect {
        fill: #07120b;
        stroke: #b8ff6a;
        stroke-opacity: 0.35;
      }

      .language-text {
        font-family: Consolas, "Courier New", monospace;
        font-size: 12px;
        font-weight: 700;
        fill: #b8ff6a;
      }

      .icon-dark {
        font-family: Consolas, "Courier New", monospace;
        font-size: 10px;
        font-weight: 900;
        fill: #07120b;
      }

      .icon-green {
        font-family: Consolas, "Courier New", monospace;
        font-size: 8px;
        font-weight: 900;
        fill: #b8ff6a;
      }

      @keyframes flicker {
        0%, 100% { opacity: 1; }
        45% { opacity: 0.96; }
        46% { opacity: 0.84; }
        47% { opacity: 0.98; }
        70% { opacity: 0.92; }
      }

      .crt {
        animation: flicker 4s infinite;
      }
    </style>
  </defs>

  <rect width="900" height="520" rx="24" fill="#050705"/>

  <g filter="url(#terminalShadow)">
    <rect x="18" y="18" width="864" height="484" rx="22" fill="url(#metalFrame)" stroke="#79765b" stroke-width="2"/>

    <rect x="34" y="54" width="832" height="410" rx="18" fill="#020403" stroke="#a69b63" stroke-width="1.5"/>
    <rect x="44" y="64" width="812" height="390" rx="14" fill="url(#screenGlow)" stroke="#b8ff6a" stroke-opacity="0.28"/>

    <g class="crt">
      <rect x="44" y="64" width="812" height="390" rx="14" fill="url(#noiseDots)"/>
      <rect x="44" y="64" width="812" height="390" rx="14" fill="url(#scanlines)"/>

      <text x="64" y="96" class="frame-title">WASTELAND DEV-TERM // USER: ${login}</text>
      <text x="64" y="118" class="small-label">PROFILE: ${name}</text>
      <text x="64" y="139" class="small-label">GITHUB CONTRIBUTION MATRIX // LAST 12 MONTHS</text>

      <line x1="64" y1="150" x2="548" y2="150" class="panel-line"/>

      ${grid}

      <text x="70" y="274" class="small-label">LESS</text>
      <rect x="104" y="267" width="9" height="9" rx="1.5" fill="#0b1d12" stroke="#b8ff6a" stroke-opacity="0.12"/>
      <rect x="119" y="267" width="9" height="9" rx="1.5" fill="#1d3b21"/>
      <rect x="134" y="267" width="9" height="9" rx="1.5" fill="#2f6b35"/>
      <rect x="149" y="267" width="9" height="9" rx="1.5" fill="#59a84a"/>
      <rect x="164" y="267" width="9" height="9" rx="1.5" fill="#b8ff6a"/>
      <text x="185" y="274" class="small-label">MORE</text>

      <rect x="598" y="92" width="238" height="62" rx="8" class="panel-box"/>
      <text x="614" y="116" class="small-label">TOTAL CONTRIBUTIONS</text>
      <text x="614" y="146" class="big-number">${total}</text>

      <text x="614" y="354" class="small-label">LANGUAGE MODULES DETECTED</text>
      <line x1="614" y1="365" x2="828" y2="365" class="panel-line"/>

      ${languagePanel}

      <rect x="614" y="382" width="222" height="48" rx="8" class="panel-box"/>
      <text x="630" y="403" class="small-label">STATUS: ONLINE</text>
      <text x="630" y="421" class="small-label">BUILD: ${generatedAt}</text>

      <text x="64" y="428" class="small-label">SYSTEM MESSAGE:</text>
      <text x="64" y="446" class="terminal-text" font-size="13">
        &gt; Contribution field stabilized. Retro phosphor render complete.
      </text>
    </g>

    <circle cx="58" cy="35" r="5" fill="#b8ff6a" opacity="0.75"/>
    <circle cx="76" cy="35" r="5" fill="#d7c06a" opacity="0.7"/>
    <circle cx="94" cy="35" r="5" fill="#8b4d2a" opacity="0.7"/>

    <text x="122" y="40" class="frame-title">RETRO CONTRIBUTION TERMINAL</text>
  </g>
</svg>`;
}

async function main() {
  const user = await getContributionData();
  const svg = buildSvg(user);

  fs.writeFileSync(OUTPUT, svg, "utf8");

  console.log(`${OUTPUT} gerado com sucesso.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
