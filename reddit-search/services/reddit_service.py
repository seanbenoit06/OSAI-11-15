import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

from config import Settings

logger = logging.getLogger(__name__)


class RedditService:
    """Service for searching Reddit using the public JSON endpoints."""

    BASE_URL = "https://www.reddit.com"
    SEARCH_ENDPOINT = "/search.json"
    MAX_POST_BODY_LENGTH = 2000
    MAX_COMMENT_LENGTH = 1000
    
    # Subreddits to exclude (job postings, irrelevant topics, general interest)
    EXCLUDED_SUBREDDITS = {
        # Job postings
        "rustjob",
        "vuejsjobs",
        "frontenddevjobs",
        "jobboardsearch",
        "jobposting",
        "forhire",
        "hiring",
        "jobs",
        "recruitinghell",
        "losangelespreserved",  # Historic preservation, not tenant reviews
        
        # General interest / entertainment (not relevant for housing reviews)
        "damnthatsinteresting",
        "interestingasfuck",
        "marvelstudios",
        "pcmasterrace",
        "todayilearned",
        "antimoneymemes",
        "murderedbywords",
        "liverpoolfc",
        "shitamericanssay",
        "unusual_whales",
        "adhdwomen",
        "workreform",
        "hungergames",
        "linux",
        "buyfromeu",
        "retrogaming",
        "premierleague",
        "cinema",
        "tomodachilife",
        "britishsuccess",
        "monsterhunter",
        "soccer",
        "nfl",
        "noncredibledefense",
        "zenlesszonezero",
        "machinists",
        "technology",
        "harrypottergame",
        "unpopularopinion",
        "genshin_impact_leaks",
    }

    def __init__(self, settings: Settings):
        """Initialize HTTP client for Reddit JSON API."""
        self.settings = settings
        self.client = httpx.Client(
            base_url=self.BASE_URL,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate, br",
                "DNT": "1",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Cache-Control": "max-age=0",
            },
            timeout=30.0,
            follow_redirects=True,
        )

    def search_company_reviews(self, company_name: str) -> tuple[str, List[Dict[str, Any]]]:
        """
        Search Reddit for reviews about the specified company.

        Args:
            company_name: Name of the rental/housing company to search for

        Returns:
            Tuple of (formatted corpus string, list of source posts with metadata)
        """
        logger.info("Searching Reddit for reviews about: %s", company_name)
        params = {
            "q": f'"{company_name}"',
            "limit": self.settings.reddit_search_limit,
            "sort": "relevance",
            "t": "all",
            "type": "link",
        }

        try:
            response_json = self._get_json(self.SEARCH_ENDPOINT, params=params)
        except Exception:
            logger.exception("Failed to query Reddit JSON API")
            return "No Reddit reviews found for this company.", []

        children = response_json.get("data", {}).get("children", []) if response_json else []
        posts_data: List[Dict[str, Any]] = []

        for child in children:
            post = self._parse_post(child.get("data", {}))
            if post:
                posts_data.append(post)

        logger.info("Found %s relevant posts", len(posts_data))
        
        # Extract source information
        sources = [
            {
                "title": post["title"],
                "url": post["url"],
                "subreddit": post["subreddit"],
                "score": post["score"]
            }
            for post in posts_data
        ]
        
        return self._format_corpus(posts_data), sources

    def _parse_post(self, post_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse a single Reddit post entry."""
        if not post_data:
            return None
        
        # Filter out excluded subreddits (job postings, etc.)
        subreddit = post_data.get("subreddit", "").lower()
        if subreddit in self.EXCLUDED_SUBREDDITS:
            logger.debug(f"Skipping post from excluded subreddit: r/{subreddit}")
            return None

        created_utc = post_data.get("created_utc")
        if created_utc:
            post_age = datetime.utcnow() - datetime.utcfromtimestamp(created_utc)
            max_age = timedelta(days=self.settings.reddit_max_post_age_days)
            if post_age > max_age:
                return None

        title = post_data.get("title", "").strip()
        body = (post_data.get("selftext") or "").strip()

        if not title and not body:
            return None

        post = {
            "title": title or "(No title)",
            "score": post_data.get("score", 0),
            "subreddit": subreddit,
            "body": body[: self.MAX_POST_BODY_LENGTH],
            "url": f"{self.BASE_URL}{post_data.get('permalink', '')}",
            "comments": [],
        }

        if post_data.get("num_comments", 0) > 0:
            comments = self._fetch_comments(post_data.get("permalink"))
            post["comments"] = comments

        return post

    def _fetch_comments(self, permalink: Optional[str]) -> List[Dict[str, Any]]:
        """Fetch top-level comments for a post."""
        if not permalink:
            return []

        endpoint = f"{permalink.rstrip('/')}.json"
        comments: List[Dict[str, Any]] = []

        try:
            response_json = self._get_json(endpoint)
        except Exception:
            logger.warning("Failed to fetch comments for %s", permalink)
            return comments

        if not isinstance(response_json, list) or len(response_json) < 2:
            return comments

        comment_children = response_json[1].get("data", {}).get("children", [])
        for child in comment_children:
            if child.get("kind") != "t1":
                continue
            data = child.get("data", {})
            body = (data.get("body") or "").strip()
            if len(body) < 20:
                continue

            comments.append(
                {
                    "text": body[: self.MAX_COMMENT_LENGTH],
                    "score": data.get("score", 0),
                }
            )

            if len(comments) >= self.settings.reddit_comment_limit:
                break

        return comments

    def _get_json(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        attempt: int = 1,
    ) -> Dict[str, Any]:
        """Perform a GET request and return JSON with retry logic."""
        try:
            response = self.client.get(path, params=params)

            if response.status_code == 429 and attempt <= self.settings.reddit_max_retries:
                wait_time = self.settings.reddit_request_delay * (2 ** (attempt - 1))
                logger.warning("Rate limited by Reddit. Retrying in %.2f seconds", wait_time)
                time.sleep(wait_time)
                return self._get_json(path, params, attempt + 1)

            response.raise_for_status()
            json_data = response.json()
            time.sleep(self.settings.reddit_request_delay)
            return json_data

        except httpx.HTTPStatusError as exc:
            logger.error("HTTP error from Reddit API: %s", exc)
            raise
        except Exception as exc:
            logger.error("Error fetching Reddit data: %s", exc)
            raise

    def _format_corpus(self, posts_data: List[Dict[str, Any]]) -> str:
        """
        Format the Reddit posts data into a readable corpus string.

        Args:
            posts_data: List of post dictionaries with title, body, comments, etc.

        Returns:
            Formatted string corpus
        """
        if not posts_data:
            return "No Reddit reviews found for this company."

        corpus_lines: List[str] = []

        for idx, post in enumerate(posts_data, 1):
            corpus_lines.append(f"\n--- Post {idx} ---")
            corpus_lines.append(f"Title: {post['title']}")
            corpus_lines.append(f"Score: {post['score']}")
            corpus_lines.append(f"Subreddit: r/{post['subreddit']}")
            corpus_lines.append(f"Link: {post['url']}")

            if post["body"]:
                corpus_lines.append("\nPost Body:")
                corpus_lines.append(post["body"])

            if post["comments"]:
                corpus_lines.append("\nTop Comments:")
                for comment in post["comments"]:
                    corpus_lines.append(f"  [Score: {comment['score']}] {comment['text']}")

            corpus_lines.append("")

        return "\n".join(corpus_lines)


