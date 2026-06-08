const fs = require("fs");

const username = process.env.USERNAME;
const token = process.env.GITHUB_TOKEN;

const colors = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  PHP: "#4F5D95",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Svelte: "#ff3e00",
  Vue: "#41b883",
  React: "#61dafb",
  Dart: "#00B4AB",
  Shell: "#89e051",
  Blade: "#f7523f",
  SCSS: "#c6538c",
  Other: "#cccccc",
};

async function request(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

async function getAllRepos() {
  let page = 1;
  let repos = [];

  while (true) {
    const data = await request(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&type=owner`
    );

    if (data.length === 0) break;

    repos = repos.concat(data);
    page++;
  }

  return repos;
}

function getPercent(value, total) {
  return ((value / total) * 100).toFixed(1);
}

function buildLanguageBar(languages) {
  return languages
    .map((item) => {
      const color = colors[item.name] || colors.Other;
      return `<span title="${item.name} ${item.percent}%" style="display:inline-block;height:8px;width:${item.percent}%;background-color:${color};"></span>`;
    })
    .join("");
}

function buildLanguageList(languages) {
  return languages
    .map((item) => {
      const color = colors[item.name] || colors.Other;

      return `<span style="display:inline-block;margin-right:16px;margin-bottom:8px;">
  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${color};"></span>
  <strong>${item.name}</strong> ${item.percent}%
</span>`;
    })
    .join("\n");
}

async function main() {
  if (!username || !token) {
    throw new Error("USERNAME atau GITHUB_TOKEN belum tersedia.");
  }

  const repos = await getAllRepos();
  const totals = {};

  for (const repo of repos) {
    if (repo.fork) continue;
    if (repo.archived) continue;

    const languages = await request(repo.languages_url);

    for (const [language, bytes] of Object.entries(languages)) {
      totals[language] = (totals[language] || 0) + bytes;
    }
  }

  const totalBytes = Object.values(totals).reduce((total, value) => total + value, 0);

  let languages = Object.entries(totals)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percent: Number(getPercent(bytes, totalBytes)),
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const topLanguages = languages.slice(0, 5);
  const otherLanguages = languages.slice(5);

  if (otherLanguages.length > 0) {
    const otherBytes = otherLanguages.reduce((total, item) => total + item.bytes, 0);

    topLanguages.push({
      name: "Other",
      bytes: otherBytes,
      percent: Number(getPercent(otherBytes, totalBytes)),
    });
  }

  const output = `
<div>
  <div style="width:100%;height:8px;border-radius:8px;overflow:hidden;background:#ddd;display:flex;">
    ${buildLanguageBar(topLanguages)}
  </div>

  <br />

  <div>
    ${buildLanguageList(topLanguages)}
  </div>
</div>
`.trim();

  const readme = fs.readFileSync("README.md", "utf8");

  const updatedReadme = readme.replace(
    /<!-- LANGUAGES:START -->[\s\S]*<!-- LANGUAGES:END -->/,
    `<!-- LANGUAGES:START -->\n${output}\n<!-- LANGUAGES:END -->`
  );

  fs.writeFileSync("README.md", updatedReadme);
}

main();