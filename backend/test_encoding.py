#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from scraper import (
    parse_version_from_title,
    extract_month_year_from_title,
    clean_html_content,
    fetch_article_content_sync,
    translate_to_chinese_sync
)
import feedparser
import requests

# Fetch RSS feed
feed_url = "https://code.visualstudio.com/feed.xml"
response = requests.get(feed_url)
response.encoding = 'utf-8'
feed = feedparser.parse(response.text)

# Get release entries
release_entries = [entry for entry in feed.entries if any(tag.get('term') == 'release' for tag in entry.get('tags', []))]
entry = release_entries[0]

print("Entry title:", entry.title)
print("Entry content preview:", repr(entry.content[0].value[:200]) if entry.content else 'No content')

# Parse version and date
version = parse_version_from_title(entry.title)
update_date = extract_month_year_from_title(entry.title)
print("Version:", version)
print("Update date:", update_date)

# Clean HTML content
content = clean_html_content(entry.content[0].value if entry.content else "")
print("Cleaned content preview:", repr(content[:200]) if content else 'No content')

# Try to fetch detailed content
if entry.link:
    detailed_content = fetch_article_content_sync(entry.link)
    print("Detailed content preview:", repr(detailed_content[:200]) if detailed_content else 'No detailed content')
    
    if detailed_content:
        detailed_md = clean_html_content(detailed_content)
        content = f"{content}\n\n## 详细内容\n\n{detailed_md}"
        print("Combined content preview:", repr(content[:200]))

# Try to translate (this might not work without credentials)
translated_content = translate_to_chinese_sync(content)
print("Translated content preview:", repr(translated_content[:200]))