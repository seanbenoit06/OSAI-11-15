from functools import lru_cache
import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()


class Settings(BaseModel):
    reddit_user_agent: str = Field(
        default_factory=lambda: os.getenv(
            "REDDIT_USER_AGENT",
            "reddit-review-analyzer/1.0 (Educational project)",
        )
    )
    reddit_search_limit: int = Field(
        default_factory=lambda: int(os.getenv("REDDIT_SEARCH_LIMIT", "40"))
    )
    reddit_comment_limit: int = Field(
        default_factory=lambda: int(os.getenv("REDDIT_COMMENT_LIMIT", "8"))
    )
    reddit_request_delay: float = Field(
        default_factory=lambda: float(os.getenv("REDDIT_REQUEST_DELAY", "1.5"))
    )
    reddit_max_retries: int = Field(
        default_factory=lambda: int(os.getenv("REDDIT_MAX_RETRIES", "3"))
    )
    reddit_max_post_age_days: int = Field(
        default_factory=lambda: int(os.getenv("REDDIT_MAX_POST_AGE_DAYS", str(365 * 3)))
    )
    openai_api_key: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    openai_model: str = Field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o-mini"))


@lru_cache
def get_settings() -> "Settings":
    return Settings()
