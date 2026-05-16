/**
 * tools/search_github.js — GitHub repo search
 */
'use strict';

const axios = require('axios');

async function search(query, limit = 5) {
  try {
    const res = await axios.get('https://api.github.com/search/repositories', {
      params: { q: query, per_page: limit, sort: 'stars' },
      headers: {
        'User-Agent': 'ai-agent-cli',
        Accept: 'application/vnd.github.v3+json',
      },
      timeout: 10000,
    });

    return (res.data.items || []).map((r) => ({
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description || '',
      stars: r.stargazers_count,
      language: r.language || 'unknown',
    }));
  } catch (err) {
    console.error('[search_github] Error:', err.message);
    return [];
  }
}

function format(results) {
  if (!results.length) return '(tidak ada hasil)';
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.fullName} ⭐${r.stars}\n    ${r.description}\n    ${r.url}`
    )
    .join('\n\n');
}

module.exports = { search, format };
