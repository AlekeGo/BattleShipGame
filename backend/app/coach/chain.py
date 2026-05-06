import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.coach.prompts import SYSTEM_PROMPT, USER_TEMPLATE
from app.config import settings
from app.schemas.coach import CoachAnalysis


def build_chain():
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        temperature=0.3,
    ).with_structured_output(CoachAnalysis)

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            ("user", USER_TEMPLATE),
        ]
    )

    return prompt | llm


async def analyze(features: dict, outcome: str, bot_difficulty: str) -> CoachAnalysis:
    chain = build_chain()
    return await chain.ainvoke(
        {
            "features_json": json.dumps(features, indent=2),
            "outcome": outcome,
            "bot_difficulty": bot_difficulty,
        }
    )
