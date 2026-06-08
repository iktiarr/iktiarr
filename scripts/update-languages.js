const fs = require("fs");

const username = process.env.USERNAME;
const token = process.env.GITHUB_TOKEN;

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

    if (!Array.isArray(data) || data.length === 0) break;

    repos = repos.concat(data);
    page++;
  }

  return repos;
}

async function main() {
  const repos = await getAllRepos();
  const totals = {};

  for (const repo of repos) {
    if (repo.fork || repo.archived) continue;

    const languages = await request(repo.languages_url);

    for (const [language, bytes] of Object.entries(languages)) {
      totals[language] = (totals[language] || 0) + bytes;
    }
  }

  const totalBytes = Object.values(totals).reduce((a, b) => a + b, 0);

  const languages = Object.entries(totals)
    .map(([language, bytes]) => ({
      language,
      percent: ((bytes / totalBytes) * 100).toFixed(1),
    }))
    .sort((a, b) => b.percent - a.percent);

  const output = languages
    .map((item) => `- **${item.language}**: ${item.percent}%`)
    .join("\n");

  const readme = fs.readFileSync("README.md", "utf8");

  const updated = readme.replace(
    /<!-- LANGUAGES:START -->[\s\S]*<!-- LANGUAGES:END -->/,
    `<!-- LANGUAGES:START -->\n${output}\n<!-- LANGUAGES:END -->`
  );

  fs.writeFileSync("README.md", updated);
}

main();
