'use strict';

const ArchitectAgent = require('./ArchitectAgent');
const ResearcherAgent = require('./ResearcherAgent');
const BuilderAgent = require('./BuilderAgent');
const QAAgent = require('./QAAgent');
const ProjectManagerAgent = require('./ProjectManagerAgent');

function createCrew(onMessage) {
  const architect = new ArchitectAgent();
  const researcher = new ResearcherAgent();
  const builder = new BuilderAgent();
  const qa = new QAAgent();
  const pm = new ProjectManagerAgent({ architect, researcher, builder, qa });

  // Link agents buat diskusi
  builder.setArchitect(architect);

  // Set message callback ke semua agent
  [architect, researcher, builder, qa, pm].forEach((a) =>
    a.onMessage(onMessage)
  );

  return { pm, architect, researcher, builder, qa };
}

module.exports = { createCrew };
