from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ddgs import DDGS
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DDGS Search API",
    description="DuckDuckGo 搜索服务，供 AI Agent 调用，解决链接检索问题",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/search")
def search_text(
    q: str = Query(..., description="搜索关键词"),
    max_results: int = Query(10, ge=1, le=30, description="返回数量"),
    site: Optional[str] = Query(None, description="限定站点，如 sspai.com"),
):
    """
    通用网页搜索。
    - `q`: 搜索词，支持中英文
    - `site`: 限定搜索范围，如 `site=sspai.com` 只返回少数派结果
    - 返回 title、url、body 字段
    """
    query = f"site:{site} {q}" if site else q
    try:
        logger.info(f"text search: {query}")
        results = DDGS().text(query, max_results=max_results, region='cn-zh', safesearch='moderate', backend='auto')
        logger.info(f"text results: {len(results) if results else 0} found")
        return {"query": query, "results": results or []}
    except Exception as e:
        logger.error("search error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search/news")
def search_news(
    q: str = Query(..., description="搜索关键词"),
    max_results: int = Query(10, ge=1, le=30, description="返回数量"),
):
    """
    新闻搜索，适合查找近期热点、版本发布动态等。
    - 返回 date、title、body、url、source 字段
    """
    try:
        logger.info(f"news search: {q}")
        results = DDGS().news(q, max_results=max_results, region='cn-zh')
        logger.info(f"news results: {len(results) if results else 0} found")
        return {"query": q, "results": results or []}
    except Exception as e:
        logger.error("news search error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search/images")
def search_images(
    q: str = Query(..., description="搜索关键词"),
    max_results: int = Query(5, ge=1, le=20, description="返回数量"),
):
    """
    图片搜索，用于获取项目 Logo/图标 URL。
    - 返回 title、image、thumbnail、url 字段
    """
    try:
        logger.info(f"image search: {q}")
        results = DDGS().images(q, max_results=max_results, region='cn-zh')
        logger.info(f"image results: {len(results) if results else 0} found")
        return {"query": q, "results": results or []}
    except Exception as e:
        logger.error("image search error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
