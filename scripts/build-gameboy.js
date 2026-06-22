const fs = require("fs");

const USERNAME = "Alexispher";
const OUTPUT = "gameboy_template.svg";

const query = `
query($login: String!) {
  user(login: $login) {
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
      "User-Agent": "retro-gameboy-contributions",
    },
    body: JSON.stringify({
      query,
      variables: { login: USERNAME },
    }),
  });

  const json = await response.json();

  if (!response.ok || json.errors) {
    console.error(json);
    throw new Error("Erro ao buscar contribuições no GitHub GraphQL.");
  }

  return json.data.user.contributionsCollection.contributionCalendar;
}

function getLevel(count, max) {
  if (count === 0) return 0;
  if (max <= 1) return 1;

  const ratio = count / max;

  if (ratio <= 0.25) return 1;
  if (ratio <= 0.50) return 2;
  if (ratio <= 0.75) return 3;

  return 4;
}

function buildContributionGrid(calendar) {
  const weeks = calendar.weeks;
  const allDays = weeks.flatMap((week) => week.contributionDays);
  const max = Math.max(...allDays.map((day) => day.contributionCount), 1);

  const palette = [
    "#263914",
    "#35551f",
    "#4d7a29",
    "#6fa832",
    "#9bd34a",
  ];

  const cell = 3.25;
  const gap = 0.9;

  const startX = 96;
  const startY = 174;

  let rects = "";

  weeks.forEach((week, weekIndex) => {
    week.contributionDays.forEach((day) => {
      const x = startX + weekIndex * (cell + gap);
      const y = startY + day.weekday * (cell + gap);
      const level = getLevel(day.contributionCount, max);

      rects += `
        <rect
          x="${x.toFixed(2)}"
          y="${y.toFixed(2)}"
          width="${cell}"
          height="${cell}"
          rx="0.7"
          fill="${palette[level]}"
        >
          <title>${day.date}: ${day.contributionCount} contribution(s)</title>
        </rect>`;
    });
  });

  return rects;
}

function buildSvg(calendar) {
  const grid = buildContributionGrid(calendar);
  const total = calendar.totalContributions;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="620" viewBox="0 0 400 620">
  <defs>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eee9e2"/>
      <stop offset="45%" stop-color="#d8d2cb"/>
      <stop offset="100%" stop-color="#b9b3ad"/>
    </linearGradient>

    <linearGradient id="bezelGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8d8798"/>
      <stop offset="100%" stop-color="#555063"/>
    </linearGradient>

    <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#a7b35b"/>
      <stop offset="100%" stop-color="#6f7d34"/>
    </linearGradient>

    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <path
    d="M28 18
       H372
       Q382 18 382 28
       V528
       Q382 544 370 556
       L320 606
       Q308 618 292 618
       H28
       Q18 618 18 608
       V28
       Q18 18 28 18Z"
    fill="url(#bodyGrad)"
    stroke="#9f9993"
    stroke-width="2"
    filter="url(#softShadow)"
  />

  <path d="M18 61 H382" stroke="#b9b3ad" stroke-width="3"/>
  <path d="M70 18 V61" stroke="#b9b3ad" stroke-width="2"/>
  <path d="M330 18 V61" stroke="#b9b3ad" stroke-width="2"/>

  <text x="92" y="43" font-family="Arial, sans-serif" font-size="8" fill="#777" letter-spacing="1">
    ◁ OFF · ON ▷
  </text>

  <path
    d="M48 86
       H354
       Q363 86 363 95
       V254
       Q363 269 353 279
       L329 303
       Q322 310 312 310
       H57
       Q48 310 48 301
       V95
       Q48 86 57 86Z"
    fill="url(#bezelGrad)"
  />

  <line x1="65" y1="108" x2="134" y2="108" stroke="#b92d66" stroke-width="2" stroke-linecap="round"/>
  <line x1="65" y1="114" x2="134" y2="114" stroke="#28387f" stroke-width="2" stroke-linecap="round"/>
  <text x="200" y="115" font-family="Arial, sans-serif" font-size="8" fill="#e1e1e1" text-anchor="middle" letter-spacing="1">
    DOT MATRIX WITH STEREO SOUND
  </text>
  <line x1="266" y1="108" x2="337" y2="108" stroke="#b92d66" stroke-width="2" stroke-linecap="round"/>
  <line x1="266" y1="114" x2="337" y2="114" stroke="#28387f" stroke-width="2" stroke-linecap="round"/>

  <circle cx="69" cy="191" r="6" fill="#3a2525"/>
  <circle cx="69" cy="191" r="4" fill="#e63946">
    <animate attributeName="opacity" values="0.45;1;0.45" dur="2s" repeatCount="indefinite"/>
  </circle>
  <text x="69" y="211" font-family="Arial, sans-serif" font-size="7" fill="#e2e2e2" text-anchor="middle">
    BATTERY
  </text>

  <rect x="86" y="139" width="228" height="116" rx="5" fill="url(#screenGrad)"/>
  <rect x="91" y="145" width="218" height="104" rx="4" fill="#8a9a40" opacity="0.7"/>

  <text x="200" y="160" font-family="Consolas, monospace" font-size="8" fill="#253814" text-anchor="middle" letter-spacing="1">
    ${total} CONTRIBUTIONS
  </text>

  ${grid}

  <text x="96" y="233" font-family="Consolas, monospace" font-size="6" fill="#263914">
    LESS
  </text>
  <rect x="119" y="228" width="4" height="4" fill="#263914"/>
  <rect x="126" y="228" width="4" height="4" fill="#35551f"/>
  <rect x="133" y="228" width="4" height="4" fill="#4d7a29"/>
  <rect x="140" y="228" width="4" height="4" fill="#6fa832"/>
  <rect x="147" y="228" width="4" height="4" fill="#9bd34a"/>
  <text x="158" y="233" font-family="Consolas, monospace" font-size="6" fill="#263914">
    MORE
  </text>

  <g opacity="0.13">
    <rect x="91" y="148" width="218" height="1.5" fill="#1e2b10"/>
    <rect x="91" y="158" width="218" height="1.5" fill="#1e2b10"/>
    <rect x="91" y="168" width="218" height="1.5" fill="#1e2b10"/>
    <rect x="91" y="178" width="218" height="1.5" fill="#1e2b10"/>
    <rect x="91" y="188" width="218" height="1.5" fill="#1e2b10"/>
    <rect x="91" y="198" width="218" height="1.5" fill="#1e2b10"/>
    <rect x="91" y="208" width="218" height="1.5" fill="#1e2b10"/>
    <rect x="91" y="218" width="218" height="1.5" fill="#1e2b10"/>
    <rect x="91" y="228" width="218" height="1.5" fill="#1e2b10"/>
    <rect x="91" y="238" width="218" height="1.5" fill="#1e2b10"/>
  </g>

  <path d="M94 143 H306 Q310 143 310 147 V157 Q226 143 94 187Z" fill="#ffffff" opacity="0.08"/>

  <text x="70" y="337" font-family="Arial, sans-serif" font-size="16" fill="#26358f" font-style="italic" font-weight="700">
    Retro
  </text>
  <text x="121" y="337" font-family="Arial, sans-serif" font-size="24" fill="#26358f" font-style="italic" font-weight="900">
    GAME BOY
  </text>
  <text x="271" y="328" font-family="Arial, sans-serif" font-size="8" fill="#26358f">
    TM
  </text>

  <circle cx="96" cy="424" r="59" fill="#c5c0bf" opacity="0.8"/>
  <rect x="80" y="365" width="32" height="118" rx="6" fill="#151515"/>
  <rect x="37" y="408" width="118" height="32" rx="6" fill="#151515"/>
  <circle cx="96" cy="424" r="15" fill="#050505"/>
  <circle cx="96" cy="424" r="9" fill="#222"/>

  <g transform="rotate(-25 282 421)">
    <rect x="220" y="384" width="132" height="54" rx="27" fill="#c5c0bf" opacity="0.85"/>
    <circle cx="253" cy="411" r="22" fill="#9f1239"/>
    <circle cx="253" cy="411" r="17" fill="#cf2f68"/>
    <circle cx="315" cy="411" r="22" fill="#9f1239"/>
    <circle cx="315" cy="411" r="17" fill="#cf2f68"/>
    <text x="253" y="461" font-family="Arial, sans-serif" font-size="13" fill="#26358f" font-weight="900" text-anchor="middle">B</text>
    <text x="315" y="461" font-family="Arial, sans-serif" font-size="13" fill="#26358f" font-weight="900" text-anchor="middle">A</text>
  </g>

  <g transform="rotate(-24 190 520)">
    <rect x="132" y="506" width="48" height="14" rx="7" fill="#8f8a96"/>
    <rect x="205" y="506" width="48" height="14" rx="7" fill="#8f8a96"/>
    <text x="156" y="542" font-family="Arial, sans-serif" font-size="10" fill="#26358f" font-weight="900" text-anchor="middle">
      SELECT
    </text>
    <text x="229" y="542" font-family="Arial, sans-serif" font-size="10" fill="#26358f" font-weight="900" text-anchor="middle">
      START
    </text>
  </g>

  <g transform="rotate(-25 304 535)">
    <rect x="264" y="492" width="7" height="62" rx="4" fill="#77726d"/>
    <rect x="278" y="492" width="7" height="62" rx="4" fill="#77726d"/>
    <rect x="292" y="492" width="7" height="62" rx="4" fill="#77726d"/>
    <rect x="306" y="492" width="7" height="62" rx="4" fill="#77726d"/>
    <rect x="320" y="492" width="7" height="62" rx="4" fill="#77726d"/>
    <rect x="334" y="492" width="7" height="62" rx="4" fill="#77726d"/>
  </g>

  <text x="82" y="586" font-family="Arial, sans-serif" font-size="9" fill="#777" letter-spacing="1">
    🎧 PHONES
  </text>
</svg>`;
}

async function main() {
  const calendar = await getContributionData();
  const svg = buildSvg(calendar);

  fs.writeFileSync(OUTPUT, svg, "utf8");

  console.log(`Arquivo ${OUTPUT} gerado com sucesso.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
