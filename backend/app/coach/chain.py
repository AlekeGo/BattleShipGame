import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.coach.prompts import SYSTEM_PROMPT, USER_TEMPLATE
from app.config import settings
from app.schemas.coach import CoachAnalysis

_chain = None


def _get_chain():
    global _chain
    if _chain is None:
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
        _chain = prompt | llm
    return _chain


async def analyze(features: dict, outcome: str, bot_difficulty: str) -> CoachAnalysis:
    chain = _get_chain()
    return await chain.ainvoke(
        {
            "features_json": json.dumps(features, indent=2),
            "outcome": outcome,
            "bot_difficulty": bot_difficulty,
        }
    )
