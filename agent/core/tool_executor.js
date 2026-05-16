'use strict';

const path = require('path');

const searchWeb = require('../../tools/search_web');
const fetchUrl = require('../../tools/fetch_url');
const searchGithub = require('../../tools/search_github');
const filesystem = require('../../tools/filesystem');
const fileTool = require('../../tools/file');

const PROJECT_ROOT = path.resolve(__dirname, '../../');

async function executeAction(action, input) {
  const { loadPlugins } = require('../../tools/plugin_loader');
  const plugins = loadPlugins();

  if (plugins[action]) {
    try {
      const result = await Promise.resolve(
        plugins[action].run(input)
      );

      return String(result);
    } catch (err) {
      return `Plugin error: ${err.message}`;
    }
  }

  switch (action) {
    case 'search_web': {
      const results = await searchWeb.search(String(input));
      return searchWeb.format(results);
    }

    case 'fetch_url': {
      const page = await fetchUrl.fetch(String(input));

      return (
        page.content?.slice(0, 2000) ||
        'Konten kosong'
      );
    }

    case 'search_github': {
      const results = await searchGithub.search(String(input));
      return searchGithub.format(results);
    }

    case 'read_file': {
      const abs = path.resolve(
        PROJECT_ROOT,
        String(input)
      );

      const res = filesystem.readFile(abs);

      return res.error
        ? res.error
        : res.content?.slice(0, 2000);
    }

    case 'list_files': {
      const items = filesystem.listDir(PROJECT_ROOT);

      if (items.error) return items.error;

      return items
        .map(
          (i) =>
            `${i.type === 'dir' ? 'D' : 'F'} ${i.name}`
        )
        .join('\n');
    }

    case 'write_file': {
      const { filename, content } =
        typeof input === 'object'
          ? input
          : JSON.parse(input);

      const abs = path.resolve(
        PROJECT_ROOT,
        filename
      );

      await fileTool.write(abs, content);

      return `File ${filename} berhasil disimpan`;
    }

    case 'run_code': {
      const { execSync } = require('child_process');

      const result = execSync(
        `node -e ${JSON.stringify(String(input))}`,
        {
          timeout: 10000,
          encoding: 'utf8',
        }
      );

      return result || '(tidak ada output)';
    }

    default:
      return 'Action tidak dikenali';
  }
}

module.exports = {
  executeAction,
};
