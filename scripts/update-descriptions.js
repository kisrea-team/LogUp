require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 项目描述数据（AI 生成或翻译）
const projectDescriptions = {
  'vercel/next.js': {
    summar: 'React 全栈框架',
    describe: '用于生产环境的 React 全栈框架，支持 SSR、SSG、API 路由等功能，提供卓越的开发体验和性能优化。'
  },
  'vuejs/core': {
    summar: '渐进式 JS 框架',
    describe: '易学易用的渐进式 JavaScript 框架，提供响应式数据绑定和组件化开发，适合构建现代化 Web 应用。'
  },
  'sveltejs/kit': {
    summar: 'Svelte 全栈框架',
    describe: '基于 Svelte 的全栈应用框架，支持 SSR、路由、预渲染等功能，编译时优化带来极致性能。'
  },
  'denoland/deno': {
    summar: '现代 JS/TS 运行时',
    describe: '安全可靠的 JavaScript 和 TypeScript 运行时，内置包管理器、格式化工具，支持从 URL 直接导入模块。'
  },
  'torvalds/linux': {
    summar: 'Linux 内核源码',
    describe: 'Linux 操作系统内核源代码，开源软件的典范，支撑着全球无数服务器和设备的运行。'
  },
  'microsoft/vscode': {
    summar: '开源代码编辑器',
    describe: '微软开源的代码编辑器，支持调试、Git、语法高亮、智能提示，拥有丰富的扩展生态系统。'
  },
  'twbs/bootstrap': {
    summar: '前端 UI 框架',
    describe: '最受欢迎的 HTML、CSS 和 JavaScript 框架，提供响应式布局和丰富的 UI 组件，快速构建现代化网站。'
  },
  'avelino/awesome-go': {
    summar: 'Go 资源精选列表',
    describe: '精选的 Go 语言框架、库和软件资源列表，涵盖 Web 开发、数据库、机器学习等各类工具。'
  },
  'yt-dlp/yt-dlp': {
    summar: '音视频下载工具',
    describe: '功能强大的命令行音视频下载工具，支持 YouTube、Bilibili 等数千个网站，可下载多种格式和清晰度。'
  },
  'codecrafters-io/build-your-own-x': {
    summar: '编程学习资源集',
    describe: '通过从零构建技术来掌握编程，涵盖数据库、编译器、操作系统、搜索引擎等各类项目的教程合集。'
  },
  'vinta/awesome-python': {
    summar: 'Python 资源精选列表',
    describe: '精选的 Python 框架、库和软件资源，涵盖 Web 开发、数据科学、机器学习、自动化等领域。'
  },
  'facebook/react': {
    summar: '前端 UI 库',
    describe: '用于构建用户界面的 JavaScript 库，采用组件化和虚拟 DOM 技术，是现代前端开发的主流选择。'
  },
  'openclaw/openclaw': {
    summar: 'AI 个人助手',
    describe: '跨平台 AI 个人助手应用，支持多种操作系统和平台，以龙虾的方式提供智能服务。'
  },
  'n8n-io/n8n': {
    summar: '工作流自动化平台',
    describe: '支持原生 AI 能力的工作流自动化平台，可视化构建与代码相结合，支持自托管，集成 400+ 服务。'
  },
  'flutter/flutter': {
    summar: '跨平台 UI 框架',
    describe: 'Google 出品的跨平台 UI 框架，一套代码可构建移动、Web、桌面应用，渲染性能出色。'
  },
  'massgravel/Microsoft-Activation-Scripts': {
    summar: 'Windows 激活工具',
    describe: '开源的 Windows 和 Office 激活工具，支持 HWID、Ohook、TSforge、KMS 等多种激活方式。'
  },
  'freeCodeCamp/freeCodeCamp': {
    summar: '免费编程学习平台',
    describe: '免费学习编程的平台，提供数学、编程、计算机科学等课程，通过实战项目掌握开发技能。'
  },
  'public-apis/public-apis': {
    summar: '免费 API 集合',
    describe: '免费 API 接口列表合集，涵盖天气、金融、娱乐、社交等各类公开 API，方便开发者快速集成。'
  },
  'EbookFoundation/free-programming-books': {
    summar: '免费编程书籍',
    describe: '免费编程书籍和学习资源合集，涵盖多种编程语言和技术领域，助力开发者成长。'
  },
  'kamranahmedse/developer-roadmap': {
    summar: '开发者学习路线图',
    describe: '交互式开发者学习路线图和指南，涵盖前端、后端、DevOps 等方向，帮助规划职业发展路径。'
  },
  'awesome-selfhosted/awesome-selfhosted': {
    summar: '自托管软件列表',
    describe: '可在自有服务器上部署的免费软件和 Web 应用列表，涵盖博客、网盘、邮件等各类服务。'
  },
  'trekhleb/javascript-algorithms': {
    summar: 'JS 算法与数据结构',
    describe: 'JavaScript 实现的算法和数据结构集合，包含详细解释和链接，适合学习和面试准备。'
  },
  'tensorflow/tensorflow': {
    summar: '机器学习框架',
    describe: '开源机器学习框架，支持深度学习、神经网络训练和推理，广泛应用于 AI 研究和生产环境。'
  },
  'Significant-Gravitas/AutoGPT': {
    summar: 'AI 自主代理平台',
    describe: '让 AI 触手可及的平台，提供工具让你专注于重要的事情，实现 AI 自主任务执行。'
  },
  'ohmyzsh/ohmyzsh': {
    summar: 'Zsh 框架',
    describe: '社区驱动的 Zsh 配置框架，包含 300+ 插件和 140+ 主题，让终端更美观高效。'
  },
  'ollama/ollama': {
    summar: '本地大模型运行工具',
    describe: '在本地轻松运行 Llama、DeepSeek、Qwen、Gemma 等大语言模型，支持模型管理和 API 调用。'
  },
  'huggingface/transformers': {
    summar: 'ML 模型框架',
    describe: '最先进的机器学习模型框架，支持文本、视觉、音频、多模态模型的训练和推理。'
  },
  'Snailclimb/JavaGuide': {
    summar: 'Java 面试指南',
    describe: 'Java 面试和后端通用面试指南，覆盖计算机基础、数据库、分布式、高并发与系统设计。'
  },
  'f/prompts.chat': {
    summar: 'AI 提示词分享平台',
    describe: '分享、发现和收集社区 AI 提示词的平台，开源免费，支持私有化部署。'
  },
  'openai/openai-python': {
    summar: 'OpenAI Python SDK',
    describe: 'OpenAI 官方 Python SDK，提供便捷的 API 调用接口，支持 GPT、DALL-E、Whisper 等模型。'
  },
  'langchain-ai/langchain': {
    summar: 'LLM 应用开发框架',
    describe: '构建大语言模型应用的开发框架，支持链式调用、记忆管理、工具集成，简化 AI 应用开发流程。'
  },
  'microsoft/autogen': {
    summar: '多代理对话框架',
    describe: '微软开源的多代理对话框架，支持多个 AI 代理协作完成复杂任务，适用于自动化工作流。'
  },
  'AUTOMATIC1111/stable-diffusion-webui': {
    summar: 'SD Web 图形界面',
    describe: 'Stable Diffusion 的 Web 图形界面，提供直观的图像生成操作，支持多种模型和插件。'
  },
  'comfyanonymous/ComfyUI': {
    summar: 'SD 节点式工作流',
    describe: '基于节点的 Stable Diffusion 图形界面，通过连接节点构建复杂的图像生成工作流。'
  },
  'ggerganov/llama.cpp': {
    summar: 'LLM 推理引擎',
    describe: '高性能大语言模型推理引擎，支持 CPU 和 GPU 加速，可在消费级硬件上运行大模型。'
  },
  'meta-llama/llama': {
    summar: 'Meta 大语言模型',
    describe: 'Meta 开源的大语言模型系列，包括 Llama、Llama 2、Llama 3 等，性能优异，可商用。'
  },
  'deepseek-ai/DeepSeek-Coder': {
    summar: 'DeepSeek 编程模型',
    describe: 'DeepSeek 出品的编程专用大语言模型，在代码生成、补全、调试等任务上表现优异。'
  },
  'anthropics/anthropic-sdk-python': {
    summar: 'Anthropic Python SDK',
    describe: 'Anthropic 官方 Python SDK，提供 Claude API 调用接口，支持对话、文本生成等功能。'
  }
};

async function main() {
  const projects = await prisma.project.findMany();
  console.log(`Found ${projects.length} projects\n`);

  let updated = 0;
  let skipped = 0;

  for (const project of projects) {
    const desc = projectDescriptions[project.name];
    if (!desc) {
      console.log(`[SKIP] ${project.name} - no description defined`);
      skipped++;
      continue;
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        summar: desc.summar,
        describe: desc.describe
      }
    });

    console.log(`[OK] ${project.name}`);
    console.log(`     summar: ${desc.summar}`);
    console.log(`     describe: ${desc.describe.substring(0, 30)}...\n`);
    updated++;
  }

  console.log(`========================================`);
  console.log(`Total: ${projects.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
