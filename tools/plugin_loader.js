'use strict';

const fs = require('fs');
const path = require('path');

const PLUGIN_DIR = path.resolve(__dirname, 'plugins');

function loadPlugins() {
  const plugins = {};
  if (!fs.existsSync(PLUGIN_DIR)) return plugins;

  const files = fs.readdirSync(PLUGIN_DIR).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    try {
      const plugin = require(path.join(PLUGIN_DIR, file));
      if (plugin.name && plugin.description && plugin.run) {
        plugins[plugin.name] = plugin;
        console.log(`[plugin] Loaded: ${plugin.name}`);
      }
    } catch (err) {
      console.error(`[plugin] Gagal load ${file}: ${err.message}`);
    }
  }
  return plugins;
}

module.exports = { loadPlugins, PLUGIN_DIR };
