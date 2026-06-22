const fs = require("fs");

const USERNAME = process.env.GITHUB_USERNAME || "Alexispher";
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
      "User-Agent": "retro-contribution-panel",
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
        <text x="${gridX + index * (cell + gap)}" y="${gridY - 14}" class="month">
          ${month}
        </text>`;
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
    "#07130a",
    "#1d3b21",
    "#2f6b35",
    "#55a448",
    "#b8ff6a",
  ];

  const gridX = 96;
  const gridY = 150;
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
          rx="1.4"
          fill="${colors[level]}"
          stroke="#9fe870"
          stroke-opacity="${level === 0 ? "0.08" : "0.22"}"
        >
          <title>${day.date}: ${day.contributionCount} contribution(s)</title>
        </rect>`;
    });
  });

  return `
    ${buildMonthLabels(weeks, gridX, gridY, cell, gap)}

    <text x="54" y="${gridY + 8}" class="day">SUN</text>
    <text x="54" y="${gridY + 28.4}" class="day">TUE</text>
    <text x="54" y="${gridY + 48.8}" class="day">THU</text>
    <text x="54" y="${gridY + 69.2}" class="day">SAT</text>

    <g>
      ${rects}
    </g>`;
}

function buildSvg(user) {
  const login = escapeXml(user.login);
  const calendar = user.contributionsCollection.contributionCalendar;
  const total = calendar.totalContributions;
  const grid = buildContributionGrid(calendar);
  const generatedAt = new Date().toISOString().slice(0, 10);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="850" height="340" viewBox="0 0 850 340" role="img" aria-labelledby="title desc">
  <title id="title">${login} GitHub Contributions</title>
  <desc id="desc">Retro terminal style GitHub contribution calendar.</desc>

  <defs>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38382b"/>
      <stop offset="50%" stop-color="#1d2119"/>
      <stop offset="100%" stop-color="#0b0d09"/>
    </linearGradient>

    <linearGradient id="screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#07130a"/>
      <stop offset="100%" stop-color="#020403"/>
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000000" flood-opacity="0.45"/>
    </filter>

    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="4" height="1" fill="#b8ff6a" opacity="0.035"/>
    </pattern>

    <style>
      .title {
        font-family: Consolas, "Courier New", monospace;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 2px;
        fill: #d7c06a;
      }

      .label {
        font-family: Consolas, "Courier New", monospace;
        font-size: 11px;
        fill: #8fdc73;
        letter-spacing: 1px;
      }

      .main {
        font-family: Consolas, "Courier New", monospace;
        font-size: 18px;
        font-weight: 700;
        fill: #b8ff6a;
      }

      .total {
        font-family: Consolas, "Courier New", monospace;
        font-size: 26px;
        font-weight: 900;
        fill: #b8ff6a;
      }

      .month {
        font-family: Consolas, "Courier New", monospace;
        font-size: 9px;
        fill: #76b867;
      }

      .day {
        font-family: Consolas, "Courier New", monospace;
        font-size: 8px;
        fill: #5e9654;
      }

      .line {
        stroke: #b8ff6a;
        stroke-opacity: 0.22;
        stroke-width: 1;
      }

      .legend {
        font-family: Consolas, "Courier New", monospace;
        font-size: 9px;
        fill: #76b867;
      }
    </style>
  </defs>

  <rect width="850" height="340" rx="20" fill="#050705"/>

  <g filter="url(#shadow)">
    <rect x="18" y="18" width="814" height="304" rx="18" fill="url(#frame)" stroke="#7d7652" stroke-width="2"/>

    <circle cx="44" cy="40" r="4" fill="#9fe870"/>
    <circle cx="60" cy="40" r="4" fill="#d7c06a"/>
    <circle cx="76" cy="40" r="4" fill="#8b5a34"/>

    <text x="98" y="45" class="title">RETRO CONTRIBUTION TERMINAL</text>

    <rect x="34" y="62" width="782" height="240" rx="12" fill="url(#screen)" stroke="#9fe870" stroke-opacity="0.45"/>
    <rect x="34" y="62" width="782" height="240" rx="12" fill="url(#scanlines)"/>

    <text x="58" y="94" class="main">WASTELAND DEV-TERM // USER: ${login}</text>
    <text x="58" y="118" class="label">GITHUB CONTRIBUTION MATRIX // LAST 12 MONTHS</text>

    <line x1="58" y1="130" x2="790" y2="130" class="line"/>

    ${grid}

    <text x="58" y="260" class="legend">LESS</text>
    <rect x="94" y="253" width="9" height="9" rx="1.5" fill="#07130a" stroke="#9fe870" stroke-opacity="0.14"/>
    <rect x="110" y="253" width="9" height="9" rx="1.5" fill="#1d3b21"/>
    <rect x="126" y="253" width="9" height="9" rx="1.5" fill="#2f6b35"/>
    <rect x="142" y="253" width="9" height="9" rx="1.5" fill="#55a448"/>
    <rect x="158" y="253" width="9" height="9" rx="1.5" fill="#b8ff6a"/>
    <text x="178" y="260" class="legend">MORE</text>

    <text x="610" y="260" class="label">TOTAL CONTRIBUTIONS</text>
    <text x="610" y="288" class="total">${total}</text>

    <text x="58" y="288" class="legend">BUILD: ${generatedAt}</text>
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
