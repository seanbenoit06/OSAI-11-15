from typing import List, Literal
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Request model for the /analyze endpoint."""
    company_name: str = Field(
        ...,
        min_length=1,
        description="Name of the housing/rental company to analyze",
        example="ABC Property Management"
    )


class RedditSource(BaseModel):
    """Information about a Reddit post source."""
    title: str = Field(..., description="Post title")
    url: str = Field(..., description="Direct link to Reddit post")
    subreddit: str = Field(..., description="Subreddit name")
    score: int = Field(..., description="Post upvotes/score")


class AnalyzeResponse(BaseModel):
    """Response model containing sentiment analysis results."""
    overall_sentiment: Literal["positive", "mixed", "negative", "unclear"] = Field(
        ...,
        description="Overall sentiment from reviews"
    )
    risk_level: Literal["low", "medium", "high", "unknown"] = Field(
        ...,
        description="Risk level based on complaint severity and frequency"
    )
    summary: str = Field(
        ...,
        description="2-4 sentence summary of how renters feel about the company"
    )
    red_flags: List[str] = Field(
        default_factory=list,
        description="List of common problems mentioned in reviews"
    )
    positive_notes: List[str] = Field(
        default_factory=list,
        description="List of positive aspects mentioned in reviews"
    )
    sample_experiences: List[str] = Field(
        default_factory=list,
        description="2-4 short paraphrased examples of typical experiences"
    )
    sources: List[RedditSource] = Field(
        default_factory=list,
        description="List of Reddit posts that were analyzed"
    )


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    detail: str = Field(default="", description="Additional error details")

