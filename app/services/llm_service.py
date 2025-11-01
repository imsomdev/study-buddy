import asyncio
import json
import logging
import os
from typing import List

from cerebras.cloud.sdk import AsyncCerebras

from app.schemas.study import MCQChoice, MCQQuestion

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

client = AsyncCerebras(
    api_key=os.getenv("CEREBRAS_API_KEY"),
)


async def generate_mcq_questions_from_pages(
    pages_text: List[str], num_questions_per_page: int = 3
) -> List[MCQQuestion]:
    """
    Generate MCQ questions from document pages using Cerebras API.

    Args:
        pages_text: List of text content from each page
        num_questions_per_page: Number of questions to generate per page

    Returns:
        List of MCQQuestion objects
    """
    all_questions = []
    question_id = 1

    for page_idx, page_text in enumerate(pages_text):
        if not page_text.strip():
            continue
        
        prompt = f"""
        You are an educational expert. Based on the following text content, generate {num_questions_per_page} multiple choice questions (MCQs) with 4 options each. 
        Make sure the questions are relevant to the content and have one correct answer.
        The output should be in JSON format as follows:
        
        {{
            "questions": [
                {{
                    "id": 1,
                    "question": "What is the main concept discussed in the text?",
                    "choices": [
                        {{"id": "A", "text": "Option A"}},
                        {{"id": "B", "text": "Option B"}},
                        {{"id": "C", "text": "Option C"}},
                        {{"id": "D", "text": "Option D"}}
                    ],
                    "correct_answer": "B",
                    "explanation": "Brief explanation of why this is the correct answer"
                }}
            ]
        }}
        
        Here is the text content:
        {page_text[:4000]}  # Limiting to 4000 characters to avoid exceeding token limits
        """

        try:
            response = await client.chat.completions.create(
                model="qwen-3-235b-a22b-instruct-2507",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an educational expert that creates multiple choice questions from text content. Always respond with valid JSON format only, without any additional text.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},  # Ensure JSON response
            )

            content = response.choices[0].message.content
            parsed_response = json.loads(content)

            questions = parsed_response.get("questions", [])

            for question in questions:
                # Create MCQChoice objects from the choices
                choices = [
                    MCQChoice(id=choice["id"], text=choice["text"])
                    for choice in question.get("choices", [])
                ]

                # Create MCQQuestion object
                mcq_question = MCQQuestion(
                    id=question_id,
                    question=question.get("question", ""),
                    choices=choices,
                    correct_answer=question.get("correct_answer", ""),
                    explanation=question.get("explanation", ""),
                    page_number=page_idx + 1,
                )

                all_questions.append(mcq_question)
                question_id += 1

        except json.JSONDecodeError as e:
            logger.error(f"LLM response JSON parsing error for page {page_idx + 1}: {str(e)}")
            continue
        except Exception as e:
            logger.error(f"LLM API call failed for page {page_idx + 1}: {type(e).__name__} - {str(e)}")
            continue

        await asyncio.sleep(0.5)

    logger.info(f"MCQ generation completed: {len(all_questions)} questions from {len(pages_text)} pages")
    return all_questions
