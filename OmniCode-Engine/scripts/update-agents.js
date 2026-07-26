#!/usr/bin/env node
// AI agentlarni yangilash skripti

const { OmniCodeAgent } = require('../agents/omni-agent/index.js');

async function updateAgents() {
  console.log('🔄 AI agentlarni yangilash skripti ishga tushdi...');

  const agent = new OmniCodeAgent();
  const success = await agent.selfUpdate();

  if (success) {
    console.log('\n✨ AI agent yangilandi!');
  } else {
    console.log('\n⚠️ AI agent yangilanmadi');
  }
}

updateAgents().catch(console.error);