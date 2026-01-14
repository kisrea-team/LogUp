#!/usr/bin/env python3
"""
VS Code RSS Feed Scraper
Scrapes the VS Code RSS feed and inserts data into the database according to the project structure.
"""

import feedparser
import requests
import re
from datetime import datetime, date
from database import db
from models import Project, Version
import markdownify
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tmt.v20180321 import tmt_client, models
import json
import os
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import time
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor

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

async def fetch_article_content(url, session):
    """Fetch detailed content from article URL (asynchronous version)"""
    try:
        # Use aiohttp with timeout
        timeout = aiohttp.ClientTimeout(total=30)  # 30 seconds timeout
        async with session.get(url, timeout=timeout) as response:
            response.raise_for_status()
            # Get text content (aiohttp should handle encoding automatically)
            content = await response.text()
            
        # Process content with BeautifulSoup
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            return await loop.run_in_executor(executor, fetch_article_content_sync, url)
    except Exception as e:
        print(f"Error fetching article content from {url}: {e}")
        return ""

def translate_to_chinese_sync(text):
    """Translate text to Chinese using Tencent Translate API (synchronous version)"""
    if not text or not isinstance(text, str) or not any(c.isalpha() for c in text):
        return text

    try:
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')
        region = os.getenv('TENCENT_REGION', 'ap-beijing')
        
        if not secret_id or not secret_key:
            raise ValueError("Tencent translation credentials not found")

        cred = credential.Credential(secret_id, secret_key)
        http_profile = HttpProfile(endpoint="tmt.tencentcloudapi.com")
        client_profile = ClientProfile(httpProfile=http_profile)
        client = tmt_client.TmtClient(cred, region, client_profile)
        
        req = models.TextTranslateRequest()
        req.SourceText = text
        req.Source = "en"
        req.Target = "zh"
        req.ProjectId = 0
        
        resp = client.TextTranslate(req)
        
        if resp.TargetText and any('\u4e00' <= char <= '\u9fff' for char in resp.TargetText):
            return resp.TargetText
        else:
            raise ValueError(f"Translation result did not contain Chinese characters. API response: {resp.TargetText}")

    except Exception as e:
        print(f"Translation error occurred: {e}")
        raise

async def translate_to_chinese(text):
    """Translate text to Chinese using Tencent Translate API (asynchronous version)"""
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as executor:
        return await loop.run_in_executor(executor, translate_to_chinese_sync, text)

async def process_entry(entry, project_id, existing_versions, session):
    """Process a single entry asynchronously"""
    try:
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
        
        # Try to fetch detailed content from article URL if available
        if entry.link:
            detailed_content = await fetch_article_content(entry.link, session)
            if detailed_content:
                # Convert detailed content to Markdown
                detailed_md = clean_html_content(detailed_content)
                content = f"{content}\n\n## 详细内容\n\n{detailed_md}"
        
        try:
            # Translate content to Chinese
            print(f"    Translating content for version {version}...")
            translated_content = await translate_to_chinese(content)
            print(f"    Translation successful for version {version}.")
        except Exception as e:
            print(f"    Skipping entry '{entry.title}' due to translation failure: {e}")
            return None # Skip this entry if translation fails
        
        download_url = f"https://code.visualstudio.com/updates/{version.replace('v', '')}"
        
        print(f"Finished processing entry: {entry.title}. Took {time.time() - start_time:.2f} seconds.")
        
        # Return the processed data
        return {
            'version': version,
            'update_date': update_date,
            'content': translated_content,
            'download_url': download_url,
            'project_id': project_id,
            'is_new': version not in existing_versions
        }
    except Exception as e:
        print(f"  Error processing entry '{entry.title}': {e}")
        return None

def save_versions_to_db(versions_data):
    """Save all version data to database in batches"""
    try:
        # Separate new and existing versions
        new_versions = [v for v in versions_data if v['is_new']]
        existing_versions = [v for v in versions_data if not v['is_new']]
        
        # Batch insert new versions
        if new_versions:
            print(f"\nAdding {len(new_versions)} new versions...")
            start_time = time.time()
            insert_query = "INSERT INTO versions (project_id, version, update_time, content, download_url) VALUES (%s, %s, %s, %s, %s)"
            # Prepare data for batch insert
            insert_data = [
                (v['project_id'], v['version'], v['update_date'], v['content'], v['download_url'])
                for v in new_versions
            ]
            # Execute batch insert
            for data in insert_data:
                db.execute_query(insert_query, data)
            print(f"Added {len(new_versions)} new versions. Took {time.time() - start_time:.2f} seconds.")
        
        # Batch update existing versions
        if existing_versions:
            print(f"\nUpdating {len(existing_versions)} existing versions...")
            start_time = time.time()
            update_query = "UPDATE versions SET update_time = %s, content = %s, download_url = %s WHERE project_id = %s AND version = %s"
            # Prepare data for batch update
            update_data = [
                (v['update_date'], v['content'], v['download_url'], v['project_id'], v['version'])
                for v in existing_versions
            ]
            # Execute batch update
            for data in update_data:
                db.execute_query(update_query, data)
            print(f"Updated {len(existing_versions)} existing versions. Took {time.time() - start_time:.2f} seconds.")
        
        return True
    except Exception as e:
        print(f"Error saving versions to database: {e}")
        return False

async def scrape_vs_code_feed():
    """Scrape VS Code RSS feed and store in database with async processing"""
    feed_url = "https://code.visualstudio.com/feed.xml"
    try:
        print(f"Fetching RSS feed from {feed_url}...")
        response = requests.get(feed_url)
        response.raise_for_status()
        feed = feedparser.parse(response.content)
        print(f"Found {len(feed.entries)} entries in the feed")

        if not db.connect():
            print("Failed to connect to database")
            return False

        # Get or create the project
        project_query = "SELECT id FROM projects WHERE name = 'Visual Studio Code' LIMIT 1"
        existing_project = db.execute_query(project_query)
        project_id = None
        if existing_project:
            project_id = existing_project[0]['id']
            print(f"Found existing VS Code project with ID: {project_id}")
        else:
            print("Creating new VS Code project...")
            project_query = "INSERT INTO projects (icon, name) VALUES (%s, %s)"
            project_id = db.execute_query(project_query, ('💻', 'Visual Studio Code'))
            if project_id:
                print(f"Created new VS Code project with ID: {project_id}")
            else:
                print("Failed to create project")
                return False

        release_entries = [entry for entry in feed.entries if any(tag.get('term') == 'release' for tag in entry.get('tags', []))]
        print(f"Found {len(release_entries)} release entries")

        # Optimization: Fetch all existing versions for this project at once
        print("Fetching existing versions from database...")
        start_time = time.time()
        versions_query = "SELECT version FROM versions WHERE project_id = %s"
        results = db.execute_query(versions_query, (project_id,))
        existing_versions = {row['version'] for row in results} if results else set()
        print(f"Found {len(existing_versions)} existing versions in the database. Query took {time.time() - start_time:.2f} seconds.")

        # Process entries asynchronously
        print(f"Processing {len(release_entries)} entries asynchronously...")
        
        # Create aiohttp session for async HTTP requests
        async with aiohttp.ClientSession() as session:
            # Process entries in smaller batches to avoid overwhelming the system
            batch_size = 5
            all_processed_data = []
            
            for i in range(0, len(release_entries), batch_size):
                batch = release_entries[i:i+batch_size]
                print(f"\nProcessing batch {i//batch_size + 1} ({len(batch)} entries)...")
                
                # Create tasks for processing entries in this batch
                tasks = [process_entry(entry, project_id, existing_versions, session) for entry in batch]
                
                # Wait for all tasks in this batch to complete
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Collect results
                for result in batch_results:
                    if result and not isinstance(result, Exception):
                        all_processed_data.append(result)
                
                # Small delay between batches to avoid overwhelming servers
                if i + batch_size < len(release_entries):
                    print(f"Waiting 2 seconds before next batch...")
                    await asyncio.sleep(2)
            
            # Save all collected data to database
            print(f"\nSaving {len(all_processed_data)} processed entries to database...")
            save_versions_to_db(all_processed_data)

        # Update project's latest version info
        if release_entries:
            latest_entry = release_entries[0]
            latest_version = parse_version_from_title(latest_entry.title)
            latest_date = extract_month_year_from_title(latest_entry.title)
            print("\nUpdating project's latest version info...")
            start_time = time.time()
            update_project_query = "UPDATE projects SET latest_version = %s, latest_update_time = %s WHERE id = %s"
            db.execute_query(update_project_query, (latest_version, latest_date, project_id))
            print(f"Updated project to latest version: {latest_version}. Took {time.time() - start_time:.2f} seconds.")

        print("\nRSS feed processing completed successfully!")
        return True
    except Exception as e:
        print(f"Error scraping RSS feed: {e}")
        return False
    finally:
        db.disconnect()

if __name__ == "__main__":
    # Run the async function
    import asyncio
    import sys
    
    # Set a longer timeout for the entire script on Windows
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(scrape_vs_code_feed())