#!/usr/bin/env python3
"""
VS Code RSS Feed Scraper - Test Version
Scrapes and translates one VS Code release entry without updating the database.
"""

import feedparser
import requests
import re
from datetime import datetime, date
import markdownify
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tmt.v20180321 import tmt_client, models
import os
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import time

# Load environment variables from backend directory
backend_dir = os.path.dirname(__file__)
os.chdir(backend_dir)
load_dotenv()

def parse_version_from_title(title):
    """Extract version number from release title"""
    match = re.search(r'version\s+(\d+\.\d+(?:\.\d+)?)', title, re.IGNORECASE)
    if match:
        return f"v{match.group(1)}"
    return "v1.0.0"

def extract_month_year_from_title(title):
    """Extract month and year from title for default date"""
    month_match = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})', title, re.IGNORECASE)
    if month_match:
        month_name = month_match.group(1)
        year = int(month_match.group(2))
        month_map = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
            'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
        }
        return date(year, month_map[month_name], 1)
    return date.today()

def clean_html_content(content):
    """Convert HTML content to Markdown format and remove HTML tags"""
    if not content:
        return ""
    try:
        # Ensure content is properly encoded
        if isinstance(content, bytes):
            content = content.decode('utf-8')
        
        # Use markdownify to convert HTML to Markdown with better formatting
        md_content = markdownify.markdownify(content, heading_style="ATX")
        # Clean up extra whitespace and newlines
        md_content = re.sub(r'\n\s*\n', '\n\n', md_content)
        md_content = re.sub(r'\n{3,}', '\n\n', md_content)  # Limit consecutive newlines to 2
        md_content = md_content.strip()
        return md_content
    except Exception as e:
        print(f"Error converting HTML to Markdown: {e}")
        # Fallback to simple tag removal
        clean = re.compile('<.*?>')
        cleaned_content = re.sub(clean, '', content).strip()
        return cleaned_content

def translate_to_chinese_sync(text):
    """Translate text to Chinese using Tencent Translate API (synchronous version)"""
    try:
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')
        region = os.getenv('TENCENT_REGION', 'ap-beijing')
        if not secret_id or not secret_key:
            print("Warning: Tencent translation credentials not found")
            return text
        cred = credential.Credential(secret_id, secret_key)
        http_profile = HttpProfile()
        http_profile.endpoint = "tmt.tencentcloudapi.com"
        client_profile = ClientProfile()
        client_profile.httpProfile = http_profile
        client = tmt_client.TmtClient(cred, region, client_profile)
        req = models.TextTranslateRequest()
        req.SourceText = text
        req.Source = "en"  # Explicitly set source language to English
        req.Target = "zh"
        req.ProjectId = 0
        resp = client.TextTranslate(req)
        # Ensure the response text is properly encoded
        target_text = resp.TargetText
        if isinstance(target_text, bytes):
            target_text = target_text.decode('utf-8')
        return target_text
    except Exception as e:
        print(f"Translation error: {e}")
        return text

def fetch_article_content_sync(url):
    """Fetch detailed content from article URL (synchronous version)"""
    try:
        response = requests.get(url, timeout=30)  # Increase timeout to 30 seconds
        response.raise_for_status()
        # Explicitly set encoding to utf-8
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        for script in soup(["script", "style"]):
            script.decompose()
        content_selectors = ['article', '.content', '.main-content', '.post-content', '.entry-content', 'main', '.article-content']
        content = ""
        for selector in content_selectors:
            element = soup.select_one(selector)
            if element:
                content = str(element)
                break
        if not content:
            body = soup.find('body')
            if body:
                for element in body.find_all(['header', 'footer', 'nav', 'aside']):
                    element.decompose()
                content = str(body)
        return content[:5000] if content else ""
    except Exception as e:
        print(f"Error fetching article content from {url}: {e}")
        return ""

def test_single_entry():
    """Test processing a single entry without database updates"""
    feed_url = "https://code.visualstudio.com/feed.xml"
    try:
        print(f"Fetching RSS feed from {feed_url}...")
        response = requests.get(feed_url)
        response.raise_for_status()
        feed = feedparser.parse(response.content)
        print(f"Found {len(feed.entries)} entries in the feed")

        release_entries = [entry for entry in feed.entries if any(tag.get('term') == 'release' for tag in entry.get('tags', []))]
        print(f"Found {len(release_entries)} release entries")

        if not release_entries:
            print("No release entries found")
            return

        # Process only the first entry
        entry = release_entries[0]
        print(f"\nProcessing entry: {entry.title}")
        start_time = time.time()
        version = parse_version_from_title(entry.title)
        update_date = extract_month_year_from_title(entry.title)
        
        # Get content from RSS feed
        rss_content = entry.content[0].value if entry.content else ""
        if not rss_content:
            rss_content = entry.summary if entry.summary else entry.title
            
        # Clean and format the RSS content
        content = clean_html_content(rss_content)
        print(f"Original content length: {len(content)}")
        print(f"Original content preview: {content[:200]}")
        
        # Try to fetch detailed content from article URL if available
        if entry.link:
            print(f"Fetching detailed content from: {entry.link}")
            detailed_content = fetch_article_content_sync(entry.link)
            if detailed_content:
                # Convert detailed content to Markdown
                detailed_md = clean_html_content(detailed_content)
                content = f"{content}\n\n## 详细内容\n\n{detailed_md}"
                print(f"Detailed content added, new length: {len(content)}")
        
        # Translate content
        print(f"Translating content for version {version}...")
        translated_content = translate_to_chinese_sync(content)
        print(f"Translated content length: {len(translated_content)}")
        print(f"Translated content preview: {translated_content[:200]}")
        
        # Check for Chinese characters
        has_chinese = any(ord(c) > 127 for c in translated_content)
        print(f"Translated content has Chinese characters: {has_chinese}")
        
        download_url = f"https://code.visualstudio.com/updates/{version.replace('v', '')}"
        
        print(f"Finished processing entry: {entry.title}. Took {time.time() - start_time:.2f} seconds.")
        
        # Print full results
        print("\n" + "="*50)
        print("FULL RESULTS:")
        print("="*50)
        print(f"Version: {version}")
        print(f"Update Date: {update_date}")
        print(f"Download URL: {download_url}")
        print(f"Has Chinese: {has_chinese}")
        print("\nTranslated Content:")
        print("-" * 30)
        print(translated_content)
        print("="*50)
        
    except Exception as e:
        print(f"Error processing entry: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_single_entry()