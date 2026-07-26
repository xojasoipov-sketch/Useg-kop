#!/usr/bin/env node
// Barcha loyihalarni test qilish skripti

const fs = require('fs-extra');
const path = require('path');

async function testAllProjects() {
  console.log('🧪 Barcha loyihalarni test qilish...');

  const projectsDir = path.join(__dirname, '../projects');
  const projects = await fs.readdir(projectsDir);

  for (const project of projects) {
    const projectPath = path.join(projectsDir, project);
    const packageJsonPath = path.join(projectPath, 'package.json');

    try {
      const packageJson = await fs.readJson(packageJsonPath);
      console.log(`✅ ${project} - ${packageJson.version}`);
    } catch (error) {
      console.log(`⚠️ ${project} - package.json mavjud emas`);
    }
  }

  console.log('\n🎉 Test yakunlandi!');
}

testAllProjects().catch(console.error);