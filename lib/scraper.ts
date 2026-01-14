import { CheerioCrawler } from '@crawlee/cheerio';
import Parser from 'rss-parser';
import TurndownService from 'turndown';
import { prisma } from '@/lib/prisma';

const parser = new Parser();
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

type GithubRelease = {
  tag_name: string;
  name: string | null;
  body: string | null;
  prerelease: boolean;
  draft: boolean;
  published_at: string | null;
  html_url: string;
  zipball_url: string | null;
};

// Parse version from title
function parseVersionFromTitle(title: string): string {
  const match = title.match(/version\s+(\d+\.\d+(?:\.\d+)?)/i);
  if (match) {
    return `v${match[1]}`;
  }
  return 'v1.0.0';
}

// Extract month and year from title for default date
function extractMonthYearFromTitle(title: string): Date {
  const monthMatch = title.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
  );
  if (monthMatch) {
    const monthName = monthMatch[1];
    const year = parseInt(monthMatch[2], 10);
    const monthMap: Record<string, number> = {
      January: 1,
      February: 2,
      March: 3,
      April: 4,
      May: 5,
      June: 6,
      July: 7,
      August: 8,
      September: 9,
      October: 10,
      November: 11,
      December: 12,
    };
    return new Date(year, monthMap[monthName] - 1, 1);
  }
  return new Date();
}

// Clean HTML content and convert to Markdown
function cleanHtmlContent(content: string): string {
  if (!content) return '';

  try {
    const mdContent = turndownService.turndown(content);
    // Clean up extra whitespace and newlines
    return mdContent
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (e) {
    console.error('Error converting HTML to Markdown:', e);
    // Fallback: remove HTML tags
    return content.replace(/<[^>]*>/g, '').trim();
  }
}

function normalizeVersion(input: string): string {
  const trimmed = input.trim();
  const withoutPrefix = trimmed.startsWith('v') || trimmed.startsWith('V') ? trimmed.slice(1) : trimmed;
  return `v${withoutPrefix}`;
}

function parseGithubRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)(?:[/?#].*)?$/i);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };

  const shortMatch = trimmed.match(/^([^/]+)\/([^/#?]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };

  return null;
}

async function fetchGithubReleases(owner: string, repo: string): Promise<GithubRelease[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'logup-scraper',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const releases: GithubRelease[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub API error ${res.status} for ${owner}/${repo}`);

    const batch = (await res.json()) as GithubRelease[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    releases.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return releases;
}

// Main scraping function using Crawlee
export async function scrapeVSCodeFeed(): Promise<boolean> {
  const feedUrl = 'https://code.visualstudio.com/feed.xml';

  try {
    console.log(`Fetching RSS feed from ${feedUrl}...`);
    const feed = await parser.parseURL(feedUrl);
    console.log(`Found ${feed.items?.length || 0} entries in the feed`);

    // Get or create the project
    let project = await prisma.project.findFirst({
      where: { name: 'Visual Studio Code' },
    });

    if (!project) {
      console.log('Creating new VS Code project...');
      project = await prisma.project.create({
        data: {
          icon: '💻',
          name: 'Visual Studio Code',
          slug: 'visual-studio-code',
          latest_version: 'v1.0.0',
          latest_update_time: new Date(),
        },
      });
      console.log(`Created new VS Code project with ID: ${project.id}`);
    } else {
      console.log(`Found existing VS Code project with ID: ${project.id}`);
    }

    // Filter release entries
    const releaseEntries = feed.items?.filter((item) =>
      item.categories?.some((category) => category.toLowerCase() === 'release')
    ) || [];

    console.log(`Found ${releaseEntries.length} release entries`);

    // Fetch existing versions
    const existingVersions = await prisma.version.findMany({
      where: { project_id: project.id },
      select: { version: true },
    });
    const existingVersionSet = new Set(existingVersions.map((v: { version: string }) => v.version));
    console.log(`Found ${existingVersionSet.size} existing versions in the database`);

    // Create Crawlee crawler for fetching detailed content
    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: releaseEntries.length,
      maxConcurrency: 3,
      requestHandler: async ({ request, $, log }) => {
        const { entryIndex, rssContent } = request.userData as {
          entryIndex: number;
          rssContent: string;
        };

        const entry = releaseEntries[entryIndex];
        if (!entry?.title) return;

        console.log(`\nProcessing entry: ${entry.title}`);
        const startTime = Date.now();

        const version = parseVersionFromTitle(entry.title);
        const updateDate = extractMonthYearFromTitle(entry.title);

        // Start with RSS content
        let content = rssContent;
        content = cleanHtmlContent(content);

        // Extract detailed content from the page using Crawlee
        const contentSelectors = [
          'article',
          '.content',
          '.main-content',
          '.post-content',
          '.entry-content',
          'main',
          '.article-content',
        ];

        let detailedContent = '';
        for (const selector of contentSelectors) {
          const element = $(selector);
          if (element.length > 0) {
            detailedContent = element.html() || '';
            break;
          }
        }

        if (!detailedContent) {
          const body = $('body');
          body.find('header, footer, nav, aside').remove();
          detailedContent = body.html() || '';
        }

        if (detailedContent) {
          const detailedMd = cleanHtmlContent(detailedContent);
          content = `${content}\n\n## 详细内容\n\n${detailedMd}`;
        }

        const downloadUrl = `https://code.visualstudio.com/updates/${version.replace('v', '')}`;

        console.log(`Finished processing entry: ${entry.title}. Took ${Date.now() - startTime}ms`);

        // Save to database
        const isNew = !existingVersionSet.has(version);
        if (isNew) {
          await prisma.version.create({
            data: {
              project_id: project.id,
              version,
              update_time: updateDate,
              content,
              download_url: downloadUrl,
            },
          });
          console.log(`Created new version: ${version}`);
        } else {
          await prisma.version.updateMany({
            where: {
              project_id: project.id,
              version,
            },
            data: {
              update_time: updateDate,
              content,
              download_url: downloadUrl,
            },
          });
          console.log(`Updated version: ${version}`);
        }
      },
    });

    // Add requests for each release entry that has a link
    const urlsToCrawl: Array<{ url: string; userData: { entryIndex: number; rssContent: string } }> = [];

    for (let i = 0; i < releaseEntries.length; i++) {
      const entry = releaseEntries[i];
      if (!entry.title) continue;

      const version = parseVersionFromTitle(entry.title);
      const updateDate = extractMonthYearFromTitle(entry.title);

      // Get content from RSS feed
      const rssContent = entry.content || entry.contentSnippet || entry.title || '';
      const cleanedRssContent = cleanHtmlContent(rssContent);

      if (entry.link) {
        urlsToCrawl.push({
          url: entry.link,
          userData: {
            entryIndex: i,
            rssContent: cleanedRssContent,
          },
        });
      } else {
        // If no link, just save the RSS content directly
        const downloadUrl = `https://code.visualstudio.com/updates/${version.replace('v', '')}`;
        const isNew = !existingVersionSet.has(version);

        if (isNew) {
          await prisma.version.create({
            data: {
              project_id: project.id,
              version,
              update_time: updateDate,
              content: cleanedRssContent,
              download_url: downloadUrl,
            },
          });
        } else {
          await prisma.version.updateMany({
            where: {
              project_id: project.id,
              version,
            },
            data: {
              update_time: updateDate,
              content: cleanedRssContent,
              download_url: downloadUrl,
            },
          });
        }
      }
    }

    // Run the crawler
    if (urlsToCrawl.length > 0) {
      console.log(`Starting Crawlee crawler for ${urlsToCrawl.length} URLs...`);
      await crawler.addRequests(urlsToCrawl);
      await crawler.run();
    }

    // Update project's latest version info
    if (releaseEntries.length > 0 && releaseEntries[0].title) {
      const latestEntry = releaseEntries[0];
      const latestVersion = parseVersionFromTitle(latestEntry.title || '');
      const latestDate = extractMonthYearFromTitle(latestEntry.title || '');

      console.log(`\nUpdating project's latest version info...`);
      await prisma.project.update({
        where: { id: project.id },
        data: {
          latest_version: latestVersion,
          latest_update_time: latestDate,
        },
      });
      console.log(`Updated project to latest version: ${latestVersion}`);
    }

    console.log('\nRSS feed processing completed successfully!');
    return true;
  } catch (e) {
    console.error('Error scraping RSS feed:', e);
    return false;
  }
}

export async function scrapeGithubReleasesWithCrawlee(): Promise<boolean> {
  const repoInputs = (process.env.GITHUB_REPOS || 'https://github.com/vercel/next.js,https://github.com/facebook/react')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (repoInputs.length === 0) return true;

  try {
    for (const input of repoInputs) {
      const parsed = parseGithubRepoUrl(input);
      if (!parsed) {
        console.warn(`Skipping invalid GitHub repo: ${input}`);
        continue;
      }

      const { owner, repo } = parsed;
      const projectName = `${owner}/${repo}`;

      let project = await prisma.project.findFirst({
        where: { name: projectName },
        select: { id: true },
      });

      if (!project) {
        const slug = `${owner}-${repo}`.toLowerCase();
        const slugExists = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
        const created = await prisma.project.create({
          data: {
            icon: 'GH',
            name: projectName,
            slug: slugExists ? null : slug,
            latest_version: 'v0.0.0',
            latest_update_time: new Date(0),
          },
          select: { id: true },
        });
        project = created;
      }

      const existingVersions = await prisma.version.findMany({
        where: { project_id: project.id },
        select: { version: true },
      });
      const existingVersionSet = new Set(existingVersions.map((v) => v.version));

      const releases = await fetchGithubReleases(owner, repo);
      const stableReleases = releases.filter((r) => !r.draft && !r.prerelease && r.tag_name);

      if (stableReleases.length === 0) continue;

      const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: stableReleases.length,
        maxConcurrency: 3,
        requestHandler: async ({ request, $ }) => {
          const userData = request.userData as {
            release: GithubRelease;
            projectId: number;
          };

          const release = userData.release;
          const version = normalizeVersion(release.tag_name);
          const updateDate = release.published_at ? new Date(release.published_at) : new Date();

          let content = (release.body || '').trim();

          if (!content) {
            const main = $('.markdown-body').first();
            if (main.length > 0) content = cleanHtmlContent(main.html() || '');
          }

          if (!content) content = `Release ${release.tag_name}`;

          const downloadUrl =
            release.zipball_url || `https://github.com/${owner}/${repo}/archive/refs/tags/${release.tag_name}.zip`;

          const isNew = !existingVersionSet.has(version);
          if (isNew) {
            await prisma.version.create({
              data: {
                project_id: userData.projectId,
                version,
                update_time: updateDate,
                content,
                download_url: downloadUrl,
              },
              select: { id: true },
            });
            existingVersionSet.add(version);
          } else {
            await prisma.version.updateMany({
              where: { project_id: userData.projectId, version },
              data: {
                update_time: updateDate,
                content,
                download_url: downloadUrl,
              },
            });
          }
        },
      });

      const requests = stableReleases.map((release) => ({
        url: release.html_url,
        userData: { release, projectId: project.id },
      }));

      await crawler.addRequests(requests);
      await crawler.run();

      const latest = stableReleases[0];
      const latestVersion = normalizeVersion(latest.tag_name);
      const latestDate = latest.published_at ? new Date(latest.published_at) : new Date();

      await prisma.project.updateMany({
        where: { id: project.id },
        data: {
          latest_version: latestVersion,
          latest_update_time: latestDate,
        },
      });
    }

    return true;
  } catch (e) {
    console.error('Error scraping GitHub releases:', e);
    return false;
  }
}

// For use in Next.js API routes
export async function POST() {
  try {
    const success = await scrapeVSCodeFeed();
    return Response.json(
      { success, message: success ? 'Scraping completed successfully' : 'Scraping failed' },
      { status: success ? 200 : 500 }
    );
  } catch (e) {
    console.error('API error:', e);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
