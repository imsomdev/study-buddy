import asyncio
import json
import os
from typing import List

from cerebras.cloud.sdk import AsyncCerebras

from app.schemas.study import MCQChoice, MCQQuestion

# Load environment variables from .env file
from dotenv import load_dotenv

load_dotenv()

# Initialize Cerebras client with API key from environment variable
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

        # Construct the prompt for the OpenAI API
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
            # Call the OpenAI API
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

            # Extract the JSON response
            content = response.choices[0].message.content
            parsed_response = json.loads(content)

            # Extract questions from the response
            questions = parsed_response.get("questions", [])

            # Process each question and add it to the results
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

        except json.JSONDecodeError:
            # Handle case where API doesn't return valid JSON
            print(f"Error: Could not parse JSON response for page {page_idx}")
            continue
        except Exception as e:
            # Handle other API errors
            print(f"Error calling Cloud API for page {page_idx}: {str(e)}")
            continue

        # Small delay to avoid rate limiting
        await asyncio.sleep(0.5)

    return all_questions


async def generate_flashcards_from_pages(
    pages_text: List[str], num_cards_per_page: int = 5
) -> List[dict]:
    """
    Generate flashcards from document pages using Cerebras API.

    Args:
        pages_text: List of text content from each page
        num_cards_per_page: Number of flashcards to generate per page

    Returns:
        List of flashcard dictionaries with front, back, and explanation
    """
    all_flashcards = []

    for page_idx, page_text in enumerate(pages_text):
        if not page_text.strip():
            continue

        # Construct the prompt for the API
        prompt = f"""
        You are an educational expert. Based on the following text content, generate {num_cards_per_page} study flashcards.
        Each flashcard should have:
        - A question or term on the front
        - The answer or definition on the back
        - A brief explanation for better understanding
        
        Focus on key concepts, definitions, and important facts from the text.
        
        The output should be in JSON format as follows:
        
        {{
            "flashcards": [
                {{
                    "front": "What is the definition of X?",
                    "back": "X is defined as...",
                    "explanation": "This concept is important because..."
                }}
            ]
        }}
        
        Here is the text content:
        {page_text[:4000]}
        """

        try:
            # Call the Cerebras API
            response = await client.chat.completions.create(
                model="qwen-3-235b-a22b-instruct-2507",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an educational expert that creates study flashcards from text content. Always respond with valid JSON format only, without any additional text.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
            )

            # Extract the JSON response
            content = response.choices[0].message.content
            parsed_response = json.loads(content)

            # Extract flashcards from the response
            flashcards = parsed_response.get("flashcards", [])

            for card in flashcards:
                all_flashcards.append({
                    "front": card.get("front", ""),
                    "back": card.get("back", ""),
                    "explanation": card.get("explanation", "")
                })

        except json.JSONDecodeError:
            print(f"Error: Could not parse JSON response for page {page_idx}")
            continue
        except Exception as e:
            print(f"Error calling Cloud API for page {page_idx}: {str(e)}")
            continue

        # Small delay to avoid rate limiting
        await asyncio.sleep(0.5)

    return all_flashcards
