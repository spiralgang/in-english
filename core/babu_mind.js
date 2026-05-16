'use strict';

const { execSync } = require('child_process');
let _impl = null;

function getImpl() {
  if (_impl) return _impl;
  try {
    execSync('sqlite3 --version', { timeout: 2000, stdio: 'ignore' });
    _impl = require('./babu_mind_sqlite');
    console.log('[babu_mind] Using SQLite');
  } catch {
    _impl = require('./babu_mind_json');
    console.log('[babu_mind] Using JSON');
  }
  return _impl;
}

module.exports = {
  get addBelief()        { return getImpl().addBelief; },
  get getBeliefs()       { return getImpl().getBeliefs; },
  get storeMemory()      { return getImpl().storeMemory; },
  get recallMemory()     { return getImpl().recallMemory; },
  get updateEmotion()    { return getImpl().updateEmotion; },
  get describeEmotion()  { return getImpl().describeEmotion; },
  get predictNextAction(){ return getImpl().predictNextAction; },
  get maintenance()      { return getImpl().maintenance; },
  get incrementStat()    { return getImpl().incrementStat; },
  get getStats()         { return getImpl().getStats; },
  get _flush()           { return getImpl()._flush; },
  get saveUserProfile()  { return getImpl().saveUserProfile; },
  get getUserProfile()   { return getImpl().getUserProfile; },
  get contradictBelief() { return getImpl().contradictBelief; },
  get clusterScenes()    { return getImpl().clusterScenes; },
  get decayMemories()    { return getImpl().decayMemories; },
};
