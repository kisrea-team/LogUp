require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// 排除非图标类图片的模式
const excludePatterns = [
  /shields\.io/i,
  /badge/i,
  /workflow/i,
  /actions/i,
  /travis/i,
  /circleci/i,
  /codecov/i,
  /coveralls/i,
  /button\.svg/i,
  /run\.pstmn\.io/i,
  /favicon/i,
  /\.ico$/i,
  /status/i,
  /discord/i,
  /twitter/i,
  /pypi/i,
  /npm/i,
  /crates\.io/i,
  /img\.shields/i,
  /githubusercontent\.com\/[^/]+\/[^/]+\/workflows/i,
];

// 优选包含这些关键词的图片
const preferPatterns = [/logo/i, /banner/i, /icon/i, /brand/i];

function isValidIcon(url) {
  return !excludePatterns.some(pattern => pattern.test(url));
}

function isPreferred(url) {
  return preferPatterns.some(pattern => pattern.test(url));
}

async function getProjectIcon(owner, repo) {
  const headers = GITHUB_TOKEN 
    ? { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'LogUp-Bot' }
    : { 'User-Agent': 'LogUp-Bot' };

  // 作者头像 URL
  const avatarUrl = `https://github.com/${owner}.png`;

  try {
    // 尝试从 README 获取符合图标特点的图片
    const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
    const readmeRes = await fetch(readmeUrl, { headers });

    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      const content = Buffer.from(readmeData.content, 'base64').toString('utf-8');

      // 提取所有图片 URL
      const images = [];
      const mdRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
      const imgRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;

      let match;
      while ((match = mdRegex.exec(content))) images.push(match[1]);
      while ((match = imgRegex.exec(content))) images.push(match[1]);

      // 优先选择符合图标特点的图片（包含 logo/banner/icon/brand）
      const preferred = images.filter(url => isValidIcon(url) && isPreferred(url));
      if (preferred.length > 0) {
        console.log(`  -> README logo found`);
        return preferred[0];
      }

      // 其次选择有效的非 badge 图片
      const valid = images.filter(isValidIcon);
      if (valid.length > 0) {
        console.log(`  -> README image found`);
        return valid[0];
      }
    }
  } catch (err) {
    console.log(`  -> README fetch error: ${err.message}`);
  }

  // 默认使用作者头像
  console.log(`  -> Using owner avatar`);
  return avatarUrl;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const projects = await prisma.project.findMany();
  console.log(`Found ${projects.length} projects to update\n`);

  let updated = 0;
  let failed = 0;
  let usedAvatar = 0;
  let usedLogo = 0;
  let usedImage = 0;

  for (const project of projects) {
    const [owner, repo] = project.name.split('/');
    if (!owner || !repo) {
      console.log(`[SKIP] ${project.name} - invalid format`);
      failed++;
      continue;
    }

    console.log(`[${updated + failed + 1}/${projects.length}] ${project.name}`);
    
    try {
      const iconUrl = await getProjectIcon(owner, repo);
      
      await prisma.project.update({
        where: { id: project.id },
        data: { icon: iconUrl }
      });
      
      // 统计图标来源
      if (iconUrl.includes('github.com/') && iconUrl.endsWith('.png') && !iconUrl.includes('/assets/')) {
        usedAvatar++;
      } else if (iconUrl.match(/logo|brand|icon/i)) {
        usedLogo++;
      } else {
        usedImage++;
      }
      
      console.log(`  -> Updated: ${iconUrl.substring(0, 60)}...\n`);
      updated++;
    } catch (err) {
      console.log(`  -> Error: ${err.message}\n`);
      failed++;
    }

    // Rate limiting
    await sleep(300);
  }

  console.log(`\n========================================`);
  console.log(`Total: ${projects.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`----------------------------------------`);
  console.log(`Avatar: ${usedAvatar}`);
  console.log(`Logo: ${usedLogo}`);
  console.log(`Other Image: ${usedImage}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
