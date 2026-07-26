#!/usr/bin/env node
// Loyihalarni oʻrnatish skripti

const { OmniCodeAgent } = require('../agents/omni-agent/index.js');

async function setupProjects() {
  console.log('🚀 Loyihalar oʻrnatish skripti ishga tushdi...');

  const agent = new OmniCodeAgent();
  await agent.setupProjects();

  console.log('\n✨ Loyihalar oʻrnatish yakunlandi!');
}

setupProjects().catch(console.error);