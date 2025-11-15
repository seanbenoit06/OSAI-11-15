from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager
from typing import List

from config import get_settings
from models.schemas import AnalyzeRequest, AnalyzeResponse, ErrorResponse, RedditSource
from services.reddit_service import RedditService
from services.openai_service import OpenAIService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global service instances
reddit_service = None
openai_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup and cleanup on shutdown."""
    global reddit_service, openai_service
    
    settings = get_settings()
    
    # Validate required settings
    if not settings.openai_api_key:
        logger.warning("OpenAI API key not configured. Set OPENAI_API_KEY.")
    
    # Initialize services
    reddit_service = RedditService(settings)
    openai_service = OpenAIService(settings)
    
    logger.info("Services initialized successfully")
    
    yield
    
    # Cleanup (if needed)
    logger.info("Shutting down services")


# Create FastAPI app
app = FastAPI(
    title="Reddit Review Analyzer API",
    description="Analyze online reviews about housing/rental companies from Reddit",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Chrome extension
# IMPORTANT: For production deployment, replace ["*"] with your Chrome extension origins:
# allow_origins=["chrome-extension://your-extension-id", "https://your-extension-id.chromiumapp.org"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Reddit Review Analyzer API",
        "version": "1.0.0",
        "endpoints": {
            "/analyze": "POST - Analyze reviews for a rental company",
            "/health": "GET - Health check"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    settings = get_settings()
    
    return {
        "status": "healthy",
        "openai_configured": bool(settings.openai_api_key),
    }


@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={
        200: {"description": "Successful analysis"},
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Server error"}
    }
)
async def analyze_company(request: AnalyzeRequest):
    """
    Analyze reviews for a rental/housing company.
    
    This endpoint:
    1. Searches Reddit for posts about the specified company
    2. Extracts relevant reviews and discussions
    3. Uses AI to analyze sentiment, risk level, and key insights
    4. Returns structured analysis results
    
    Args:
        request: AnalyzeRequest containing company_name
        
    Returns:
        AnalyzeResponse with sentiment analysis results
    """
    logger.info(f"Received analysis request for company: {request.company_name}")
    
    try:
        # Validate services are initialized
        if reddit_service is None or openai_service is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Services not properly initialized"
            )
        
        # Check configuration
        settings = get_settings()
        if not settings.openai_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI API key not configured. Please set OPENAI_API_KEY in .env file."
            )
        
        # Step 1: Search Reddit for reviews
        logger.info("Fetching Reddit reviews...")
        corpus, sources = reddit_service.search_company_reviews(request.company_name)
        
        if not corpus or corpus == "No Reddit reviews found for this company.":
            logger.warning(f"No reviews found for {request.company_name}")
            # Return a response indicating no data
            return AnalyzeResponse(
                overall_sentiment="unclear",
                risk_level="unknown",
                summary=f"No Reddit reviews found for {request.company_name}. This could mean the company is very small, new, or not frequently discussed online.",
                red_flags=[],
                positive_notes=[],
                sample_experiences=[],
                sources=[]
            )
        
        # Step 2: Analyze reviews with OpenAI
        logger.info("Analyzing reviews with AI...")
        analysis_result = openai_service.analyze_reviews(request.company_name, corpus)
        
        # Validate and enhance the analysis result
        if not analysis_result or not analysis_result.summary:
            logger.warning("OpenAI returned empty analysis, generating fallback")
            analysis_result = generate_fallback_analysis(request.company_name, sources)
        elif is_generic_response(analysis_result.summary):
            logger.warning("OpenAI returned generic response, enhancing with fallback data")
            analysis_result = enhance_analysis_with_sources(analysis_result, request.company_name, sources)
        
        # Add source information to the response
        analysis_result.sources = sources
        
        logger.info(f"Analysis complete for {request.company_name}")
        return analysis_result
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error analyzing company {request.company_name}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while analyzing the company: {str(e)}"
        )


def is_generic_response(summary: str) -> bool:
    """Check if the summary is a generic 'unable to provide' type response."""
    if not summary:
        return True
    
    generic_phrases = [
        "unable to provide",
        "cannot provide",
        "no information available",
        "insufficient data",
        "not enough information",
        "i don't have",
        "i cannot",
        "as an ai"
    ]
    
    summary_lower = summary.lower()
    return any(phrase in summary_lower for phrase in generic_phrases)


def generate_fallback_analysis(company_name: str, sources: List[RedditSource]) -> AnalyzeResponse:
    """Generate a basic analysis from Reddit sources when OpenAI fails."""
    num_sources = len(sources)
    
    summary = (
        f"Found {num_sources} Reddit discussion(s) about {company_name}. "
        f"The AI analysis service encountered an issue, but you can review the source posts below "
        f"to form your own opinion about this company."
    )
    
    return AnalyzeResponse(
        overall_sentiment="unclear",
        risk_level="unknown",
        summary=summary,
        red_flags=["AI analysis unavailable - review sources manually"],
        positive_notes=[],
        sample_experiences=[],
        sources=[]
    )


def enhance_analysis_with_sources(
    analysis: AnalyzeResponse, 
    company_name: str, 
    sources: List[RedditSource]
) -> AnalyzeResponse:
    """Enhance a generic AI response with actual source information."""
    num_sources = len(sources)
    
    # Create a better summary if the original is generic
    if is_generic_response(analysis.summary):
        analysis.summary = (
            f"Found {num_sources} Reddit post(s) discussing {company_name}. "
            f"While detailed analysis is limited, you can review the community discussions "
            f"and posts linked below to learn about tenant experiences with this company."
        )
    
    # Add a note about sources if there are any but analysis is thin
    if not analysis.red_flags and not analysis.positive_notes:
        analysis.red_flags = [f"Limited analysis available - found {num_sources} discussion(s) to review"]
    
    return analysis


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

