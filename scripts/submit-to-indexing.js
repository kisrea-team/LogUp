/**
 * 对比运营前后的 sitemap.xml，将新增 URL 提交到 Google Indexing API
 *
 * 环境变量：
 *   GOOGLE_SA_JSON      - Google 服务账号 JSON 字符串（从 GitHub Secret 注入）
 *   SITE_URL            - 站点根 URL，例如 https://zitons-logup-re.hf.space
 *   SITEMAP_BEFORE_FILE - 运营前 sitemap 的本地路径（/tmp/sitemap_before.xml）
 */

const { google } = require('googleapis');
const fs = require('fs');
const https = require('https');
const http = require('http');

const SITE_URL = process.env.SITE_URL || 'https://zitons-logup-re.hf.space';
const SITEMAP_BEFORE_FILE = process.env.SITEMAP_BEFORE_FILE || '/tmp/sitemap_before.xml';
const SA_JSON_STRING = process.env.GOOGLE_SA_JSON;

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        lib.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parseSitemapUrls(xml) {
    const urls = new Set();
    const re = /<loc>\s*(.*?)\s*<\/loc>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
        urls.add(m[1].trim());
    }
    return urls;
}

async function main() {
    // 1. 读取运营前的 sitemap
    let beforeXml = '';
    if (fs.existsSync(SITEMAP_BEFORE_FILE)) {
        beforeXml = fs.readFileSync(SITEMAP_BEFORE_FILE, 'utf8');
    } else {
        console.log('未找到运营前 sitemap 文件，跳过对比（将提交所有当前 URL）');
    }
    const beforeUrls = parseSitemapUrls(beforeXml);
    console.log(`运营前 URL 数量: ${beforeUrls.size}`);

    // 2. 等待 sitemap 刷新（HF Spaces 冷启动缓冲）
    console.log('等待 15 秒让站点 sitemap 刷新...');
    await new Promise(r => setTimeout(r, 15000));

    // 3. 获取运营后的 sitemap
    const sitemapUrl = `${SITE_URL}/sitemap.xml`;
    console.log(`获取最新 sitemap: ${sitemapUrl}`);
    let afterXml = '';
    try {
        afterXml = await fetchUrl(sitemapUrl);
    } catch (err) {
        console.error('获取 sitemap 失败:', err.message);
        process.exit(1);
    }
    const afterUrls = parseSitemapUrls(afterXml);
    console.log(`运营后 URL 数量: ${afterUrls.size}`);

    // 4. 找出新增 URL
    const newUrls = [...afterUrls].filter(url => !beforeUrls.has(url));
    console.log(`新增 URL 数量: ${newUrls.length}`);
    if (newUrls.length === 0) {
        console.log('无新增 URL，跳过提交');
        return;
    }
    newUrls.forEach(u => console.log('  新增:', u));

    // 5. 初始化 Google Auth
    if (!SA_JSON_STRING) {
        console.error('未设置 GOOGLE_SA_JSON 环境变量，跳过提交');
        process.exit(0);
    }
    const saJson = JSON.parse(SA_JSON_STRING);
    const auth = new google.auth.GoogleAuth({
        credentials: saJson,
        scopes: ['https://www.googleapis.com/auth/indexing'],
    });
    const indexing = google.indexing({ version: 'v3', auth });

    // 6. 提交新增 URL
    let successCount = 0;
    for (const url of newUrls) {
        try {
            await indexing.urlNotifications.publish({
                requestBody: { url, type: 'URL_UPDATED' },
            });
            console.log(`✓ 已提交: ${url}`);
            successCount++;
        } catch (err) {
            const msg = err.response?.data?.error?.message || err.message;
            console.error(`✗ 提交失败 ${url}: ${msg}`);
        }
        // Google Indexing API 限额：每秒最多 200 次，此处加小延迟
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\n提交完成：${successCount}/${newUrls.length} 成功`);
}

main().catch(err => {
    console.error('脚本异常:', err);
    process.exit(1);
});
