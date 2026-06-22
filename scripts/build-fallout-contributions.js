const fs = require("fs");

const USERNAME = process.env.GITHUB_USERNAME || "Alexispher";
const PROFILE_LABEL = process.env.PROFILE_LABEL || "Hcv11";
const OUTPUT = "fallout_contributions.svg";

const query = `
query($login: String!) {
  user(login: $login) {
    login
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
      "User-Agent": "fallout-contribution-screen",
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
    throw new Error("Erro ao buscar contribuições no GitHub.");
  }

  return json.data.user;
}

function getLevel(count, max) {
  if (count === 0) return 0;

  const ratio = count / max;

  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
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
        <text x="${gridX + index * (cell + gap)}" y="${gridY - 11}" class="month">${month}</text>`;
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
    "#061108",
    "#17341b",
    "#245f2a",
    "#48a13e",
    "#b8ff6a",
  ];

  const gridX = 58;
  const gridY = 108;
  const cell = 8;
  const gap = 2.2;

  let rects = "";

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
          stroke="#8fdc73"
          stroke-opacity="${level === 0 ? "0.07" : "0.2"}"
        >
          <title>${day.date}: ${day.contributionCount} contribution(s)</title>
        </rect>`;
    });
  });

  return `
    ${buildMonthLabels(weeks, gridX, gridY, cell, gap)}

    <text x="20" y="${gridY + 7}" class="day">SUN</text>
    <text x="20" y="${gridY + 27.4}" class="day">TUE</text>
    <text x="20" y="${gridY + 47.8}" class="day">THU</text>
    <text x="20" y="${gridY + 68.2}" class="day">SAT</text>

    <g>
      ${rects}
    </g>`;
}

function buildSvg(user) {
  const login = escapeXml(user.login);
  const profile = escapeXml(PROFILE_LABEL);
  const calendar = user.contributionsCollection.contributionCalendar;
  const grid = buildContributionGrid(calendar);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="650" height="230" viewBox="0 0 650 230" role="img" aria-labelledby="title desc">
  <title id="title">${login} GitHub Contributions</title>
  <desc id="desc">Fallout-inspired retro GitHub contribution matrix.</desc>

  <defs>
    <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#071509"/>
      <stop offset="100%" stop-color="#020403"/>
    </linearGradient>

    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="4" height="1" fill="#9fe870" opacity="0.045"/>
    </pattern>

    <pattern id="noise" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="5" r="0.6" fill="#9fe870" opacity="0.06"/>
      <circle cx="15" cy="11" r="0.5" fill="#d7c06a" opacity="0.04"/>
      <circle cx="9" cy="19" r="0.4" fill="#9fe870" opacity="0.05"/>
    </pattern>

    <style>
      .screen-title {
        font-family: Consolas, "Courier New", monospace;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 1.4px;
        fill: #d7c06a;
      }

      .label {
        font-family: Consolas, "Courier New", monospace;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1px;
        fill: #8fdc73;
      }

      .month {
        font-family: Consolas, "Courier New", monospace;
        font-size: 8px;
        font-weight: 700;
        fill: #7abd67;
      }

      .day {
        font-family: Consolas, "Courier New", monospace;
        font-size: 7px;
        fill: #5f9c54;
      }

      .legend {
        font-family: Consolas, "Courier New", monospace;
        font-size: 8px;
        font-weight: 700;
        fill: #7abd67;
      }

      .line {
        stroke: #9fe870;
        stroke-width: 1;
        stroke-opacity: 0.22;
      }

      @keyframes flicker {
        0%, 100% { opacity: 1; }
        45% { opacity: 0.96; }
        46% { opacity: 0.9; }
        47% { opacity: 0.98; }
      }

      .crt {
        animation: flicker 4s infinite;
      }
    </style>
  </defs>

  <rect width="650" height="230" rx="10" fill="#010302"/>

  <rect
    x="8"
    y="8"
    width="634"
    height="214"
    rx="10"
    fill="url(#screen)"
    stroke="#9fe870"
    stroke-opacity="0.45"
    stroke-width="1.4"
  />

  <rect x="8" y="8" width="634" height="214" rx="10" fill="url(#noise)" />
  <rect x="8" y="8" width="634" height="214" rx="10" fill="url(#scanlines)" />

  <g class="crt">
    <text x="28" y="36" class="screen-title">WASTELAND DEV-TERM // USER: ${login}</text>

    <text x="28" y="58" class="label">PROFILE: ${profile}</text>
    <text x="28" y="78" class="label">GITHUB CONTRIBUTION MATRIX // LAST 12 MONTHS</text>

    <line x1="28" y1="88" x2="575" y2="88" class="line"/>

    ${grid}

    <text x="58" y="197" class="legend">LESS</text>
    <rect x="96" y="190" width="8" height="8" rx="1.2" fill="#061108" stroke="#8fdc73" stroke-opacity="0.12"/>
    <rect x="112" y="190" width="8" height="8" rx="1.2" fill="#17341b"/>
    <rect x="128" y="190" width="8" height="8" rx="1.2" fill="#245f2a"/>
    <rect x="144" y="190" width="8" height="8" rx="1.2" fill="#48a13e"/>
    <rect x="160" y="190" width="8" height="8" rx="1.2" fill="#b8ff6a"/>
    <text x="180" y="197" class="legend">MORE</text>
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
