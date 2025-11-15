from openai import OpenAI
import json
import logging
from typing import Dict, Any

from config import Settings
from models.schemas import AnalyzeResponse

logger = logging.getLogger(__name__)


class OpenAIService:
    """Service for analyzing Reddit corpus using OpenAI API."""
    
    def __init__(self, settings: Settings):
        """Initialize OpenAI service with API client."""
        self.settings = settings
        self.client = OpenAI(api_key=settings.openai_api_key)
        
    def analyze_reviews(self, company_name: str, corpus: str) -> AnalyzeResponse:
        """
        Analyze Reddit reviews using OpenAI API.
        
        Args:
            company_name: Name of the company being analyzed
            corpus: Formatted Reddit reviews text
            
        Returns:
            AnalyzeResponse with sentiment analysis results
        """
        logger.info(f"Analyzing reviews for {company_name} using OpenAI")
        
        # Construct the analysis prompt
        prompt = self._build_prompt(company_name, corpus)
        
        try:
            # Call OpenAI API with JSON mode
            # Note: GPT-5 models have different parameters than GPT-4
            api_params = {
                "model": self.settings.openai_model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert at analyzing rental and housing company reviews. You extract sentiment, identify risk factors, and summarize tenant experiences objectively. Always return valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "response_format": {"type": "json_object"},
            }
            
            # GPT-5 models have different parameter requirements
            is_gpt5 = "gpt-5" in self.settings.openai_model.lower()
            
            if is_gpt5:
                # GPT-5: use max_completion_tokens, temperature must be default (1.0)
                api_params["max_completion_tokens"] = 2000
            else:
                # GPT-4 and earlier: use max_tokens, can set temperature
                api_params["max_tokens"] = 2000
                api_params["temperature"] = 0.3
            
            response = self.client.chat.completions.create(**api_params)
            
            # Parse the response
            result_text = response.choices[0].message.content
            logger.debug(f"OpenAI response: {result_text}")
            
            result_json = json.loads(result_text)
            
            # Validate and create response object
            analysis_response = AnalyzeResponse(**result_json)
            
            # Additional validation: Check if response seems fabricated
            self._validate_response_integrity(analysis_response, corpus)
            
            # Check for generic "unable to provide" responses
            if self._is_generic_ai_response(analysis_response):
                logger.warning("OpenAI returned generic 'unable to provide' response")
                # Don't raise error, let main.py handle enhancement with sources
            
            logger.info(f"Analysis complete: sentiment={analysis_response.overall_sentiment}, risk={analysis_response.risk_level}")
            logger.debug(f"Summary preview: {analysis_response.summary[:100] if analysis_response.summary else 'None'}")
            return analysis_response
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {e}")
            # Return a fallback response
            return self._create_fallback_response("unclear")
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            raise
    
    def _build_prompt(self, company_name: str, corpus: str) -> str:
        """
        Build the analysis prompt with company name and corpus.
        
        Args:
            company_name: Name of the company
            corpus: Reddit reviews text
            
        Returns:
            Complete prompt string
        """
        prompt = f"""You are analyzing online reviews about a housing / rental company.

Company name: "{company_name}"

Below is raw text from Reddit search results. Each block may contain a title, score, subreddit, and a trimmed post body from one or more users.

CRITICAL INSTRUCTIONS:

1. Focus ONLY on experiences where people talk about this company as a landlord / property manager / housing provider.

2. Ignore side discussions, jokes, or off-topic comments.

3. IF NO RELEVANT TENANT/RENTER EXPERIENCES ARE FOUND:
   - Set overall_sentiment = "unclear"
   - Set risk_level = "unknown"  
   - Set summary = "No substantive tenant reviews found in the provided Reddit posts."
   - Set red_flags, positive_notes, and sample_experiences to EMPTY lists []
   
4. DO NOT make up or infer information that is not explicitly stated in the Reddit posts.

5. DO NOT include information from posts that are:
   - Job postings
   - Company announcements
   - General discussions about housing WITHOUT specific experiences with this company
   - Posts where the company is only mentioned in passing

From the text, extract:

- overall_sentiment: one of ["positive", "mixed", "negative", "unclear"]
- risk_level: one of ["low", "medium", "high", "unknown"] based on how serious and common the complaints are
- summary: 2–4 sentences summarizing how renters feel about this company (or state no reviews found)
- red_flags: list of short bullet phrases describing ACTUAL problems mentioned (e.g. "maintenance is slow", "deposit not returned")
- positive_notes: list of short bullet phrases for ACTUAL good points mentioned. Empty list if none.
- sample_experiences: 2–4 very short paraphrased examples from ACTUAL tenant stories. Empty list if none found.

VERIFICATION CHECKLIST:
- ✓ Each red flag must be mentioned in at least one Reddit post
- ✓ Each sample experience must come from an actual post, not invented
- ✓ If uncertain or data is thin, use "unclear" and empty lists
- ✓ Only include information directly from tenant/renter experiences

Return ONLY valid JSON with these keys:
overall_sentiment, risk_level, summary, red_flags, positive_notes, sample_experiences

Reddit reviews:
====
{corpus}
====
"""
        return prompt
    
    def _validate_response_integrity(self, response: AnalyzeResponse, corpus: str) -> None:
        """
        Validate that the AI response isn't hallucinating information.
        
        Args:
            response: The AnalyzeResponse to validate
            corpus: The original Reddit corpus text
            
        Raises:
            Warning if suspicious patterns detected
        """
        corpus_lower = corpus.lower()
        
        # Check 1: If corpus says "No Reddit reviews found", response should be unclear
        if "no reddit reviews found" in corpus_lower:
            if response.overall_sentiment != "unclear" or response.red_flags or response.positive_notes:
                logger.warning("AI generated content despite no reviews found - resetting to unclear")
                response.overall_sentiment = "unclear"
                response.risk_level = "unknown"
                response.red_flags = []
                response.positive_notes = []
                response.sample_experiences = []
        
        # Check 2: If response has many details but corpus is very short, likely hallucinating
        if len(corpus) < 500 and (len(response.red_flags) > 3 or len(response.sample_experiences) > 2):
            logger.warning("Suspicious: Detailed response from minimal corpus - may be hallucinating")
        
        # Check 3: Verify sentiment matches content
        if response.overall_sentiment == "negative" and response.risk_level == "high":
            if not response.red_flags:
                logger.warning("Negative/high risk but no red flags - inconsistent response")
                response.risk_level = "unknown"
        
        logger.debug("Response integrity validation passed")
    
    def _is_generic_ai_response(self, response: AnalyzeResponse) -> bool:
        """
        Check if the AI returned a generic 'unable to provide' type response.
        
        Args:
            response: The AnalyzeResponse to check
            
        Returns:
            True if response seems generic/unhelpful
        """
        if not response.summary:
            return True
        
        generic_phrases = [
            "unable to provide",
            "cannot provide",
            "insufficient",
            "i don't have",
            "i cannot",
            "as an ai language model"
        ]
        
        summary_lower = response.summary.lower()
        has_generic_phrase = any(phrase in summary_lower for phrase in generic_phrases)
        
        # If it has generic phrase AND no actual data, it's generic
        if has_generic_phrase and not response.red_flags and not response.positive_notes:
            return True
        
        return False
    
    def _create_fallback_response(self, sentiment: str = "unclear") -> AnalyzeResponse:
        """
        Create a fallback response when analysis fails.
        
        Args:
            sentiment: Sentiment to use in fallback
            
        Returns:
            Default AnalyzeResponse
        """
        return AnalyzeResponse(
            overall_sentiment=sentiment,
            risk_level="unknown",
            summary="Unable to analyze reviews due to insufficient or unclear data.",
            red_flags=[],
            positive_notes=[],
            sample_experiences=[],
            sources=[]
        )

