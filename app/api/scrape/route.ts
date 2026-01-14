import { scrapeVSCodeFeed } from '@/lib/scraper';

export async function POST() {
  try {
    const success = await scrapeVSCodeFeed();
    return Response.json(
      { success, message: success ? 'Scraping completed successfully' : 'Scraping failed' },
      { status: success ? 200 : 500 }
    );
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
