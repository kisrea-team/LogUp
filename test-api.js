/**
 * 简单的 API 测试脚本
 * 在依赖安装完成后运行此脚本来测试 API 功能
 */

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('开始测试 API...\n');

  try {
    // 测试 1: 获取项目列表
    console.log('测试 1: GET /api/projects');
    const response1 = await fetch(`${BASE_URL}/api/projects?page=1&per_page=5`);
    const data1 = await response1.json();
    console.log('✓ 项目列表获取成功');
    console.log(`  - 总项目数: ${data1.total}`);
    console.log(`  - 当前页: ${data1.page}/${data1.total_pages}\n`);

    // 测试 2: 创建新项目
    console.log('测试 2: POST /api/projects');
    const newProject = {
      icon: '🚀',
      name: 'Test Project',
      slug: 'test-project',
      latest_version: 'v1.0.0',
      latest_update_time: new Date().toISOString(),
    };
    const response2 = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject),
    });
    const createdProject = await response2.json();
    console.log('✓ 项目创建成功');
    console.log(`  - 项目 ID: ${createdProject.id}`);
    console.log(`  - 项目名称: ${createdProject.name}\n`);

    // 测试 3: 获取单个项目
    console.log('测试 3: GET /api/projects/[id]');
    const response3 = await fetch(`${BASE_URL}/api/projects/${createdProject.id}`);
    const project = await response3.json();
    console.log('✓ 单个项目获取成功');
    console.log(`  - 项目: ${project.name}\n`);

    // 测试 4: 创建版本
    console.log('测试 4: POST /api/versions');
    const newVersion = {
      project_id: createdProject.id,
      version: 'v1.0.0',
      update_time: new Date().toISOString(),
      content: '# Test Version\n\nThis is a test version content.',
      download_url: 'https://example.com/download',
    };
    const response4 = await fetch(`${BASE_URL}/api/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVersion),
    });
    const createdVersion = await response4.json();
    console.log('✓ 版本创建成功');
    console.log(`  - 版本 ID: ${createdVersion.id}`);
    console.log(`  - 版本号: ${createdVersion.version}\n`);

    // 测试 5: 获取项目版本
    console.log('测试 5: GET /api/projects/[id]/versions');
    const response5 = await fetch(`${BASE_URL}/api/projects/${createdProject.id}/versions`);
    const versions = await response5.json();
    console.log('✓ 项目版本获取成功');
    console.log(`  - 版本数量: ${versions.length}\n`);

    console.log('所有测试通过！');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testAPI();