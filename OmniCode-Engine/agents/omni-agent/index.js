// OmniCode AI Agent - Asosiy AI agent
const { Octokit } = require('@octokit/rest');
const fs = require('fs-extra');
const path = require('path');
const simpleGit = require('simple-git');
const axios = require('axios');

class OmniCodeAgent {
  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    this.currentProject = null;
    this.projects = {
      'Useg-kop': { path: 'projects/Useg-kop', type: 'public', language: 'JavaScript' },
      'ipost-smm-ai': { path: 'projects/ipost-smm-ai', type: 'public', language: 'JavaScript' },
      'Emergent': { path: 'projects/Emergent', type: 'private', language: 'HTML' },
      'sadiprimetizim-crm': { path: 'projects/sadiprimetizim-crm', type: 'private', language: 'TypeScript' },
      'Bolt-sadiprimetizim-crm': { path: 'projects/Bolt-sadiprimetizim-crm', type: 'private', language: 'TypeScript' }
    };
  }

  async initialize() {
    console.log('🚀 OmniCode AI Agent ishga tushdi...');

    // Loyihalarni oʻrnatish
    await this.setupProjects();

    // Asosiy menyu
    this.showMainMenu();
  }

  async setupProjects() {
    console.log('\n📁 Loyihalar oʻrnatilmoqda...');

    for (const [projectName, projectInfo] of Object.entries(this.projects)) {
      const projectPath = projectInfo.path;

      try {
        // Papka mavjudligini tekshirish
        const exists = await fs.pathExists(projectPath);

        if (!exists) {
          console.log(`⏳ ${projectName} klonlanmoqda...`);

          // GitHubdan klonlash
          const repoUrl = `https://github.com/xojasoipov-sketch/${projectName}.git`;
          await simpleGit().clone(repoUrl, projectPath);

          console.log(`✅ ${projectName} muvaffaqiyatli klonlandi`);
        } else {
          console.log(`📂 ${projectName} allaqachon mavjud`);
        }

        // Loyihani yangilash
        await this.updateProject(projectName);
      } catch (error) {
        console.error(`❌ ${projectName} klonlashda xatolik:`, error.message);
      }
    }

    console.log('\n🎉 Barcha loyihalar muvaffaqiyatli oʻrnatildi!');
  }

  async updateProject(projectName) {
    const projectPath = this.projects[projectName].path;

    try {
      await simpleGit(projectPath).pull();
      console.log(`🔄 ${projectName} yangilandi`);
    } catch (error) {
      console.error(`⚠️ ${projectName} yangilanishda xatolik:`, error.message);
    }
  }

  showMainMenu() {
    console.log('\n📋 Asosiy menyu:');
    console.log('1. Loyiha tanlash');
    console.log('2. Loyiha yaratish');
    console.log('3. AI agentni yangilash');
    console.log('4. Chiqish');

    // Bu yerda foydalanuvchi kiritishini kutish kerak
    // Ammo CLI da foydalanuvchi kiritishini kutish uchun async function kerak
    this.handleUserInput();
  }

  async handleUserInput() {
    // Bu yerda foydalanuvchi kiritishini kutish uchun async function
    // Ammo hozircha konsolga chiqarish bilan cheklanaman
    console.log('\n💡 Maslahat: Loyiha tanlash uchun "1" ni kiriting va Enter tugmasini bosing');
  }

  // AI agentni oʻzini yangilash funksiyasi
  async selfUpdate() {
    console.log('\n🔄 AI agent oʻzini yangilayapti...');

    try {
      // GitHubdan soʻnggi versiyani olish
      const response = await axios.get('https://api.github.com/repos/xojasoipov-sketch/OmniCode-Engine/contents/agents/omni-agent/index.js', {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });

      // Yangilangan kodni yozish
      await fs.writeFile(path.join(__dirname, 'index.js'), response.data);

      console.log('✅ AI agent oʻzini muvaffaqiyatli yangiladi!');
      return true;
    } catch (error) {
      console.error('❌ Oʻzini yangilashda xatolik:', error.message);
      return false;
    }
  }
}

// Agentni ishga tushirish
const agent = new OmniCodeAgent();
agent.initialize().catch(console.error);