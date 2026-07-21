import json
import re
from datetime import date, timedelta

from openai import AsyncOpenAI

from ..core.config import settings


def _meeting_date(goal: str) -> str:
    """Return a helpful, explicit date when a weekday is mentioned."""
    weekdays = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6,
    }
    match = re.search(r"\b(next\s+)?(" + "|".join(weekdays) + r")\b", goal.lower())
    if not match:
        return "To be confirmed"
    target = weekdays[match.group(2)]
    today = date.today()
    days = (target - today.weekday()) % 7
    if match.group(1) or days == 0:
        days += 7
    result = today + timedelta(days=days)
    return f"{result.strftime('%A')}, {result.day} {result.strftime('%B %Y')}"


def _person_after_with(goal: str) -> str:
    match = re.search(r"\bwith\s+(.+?)(?=\s+(?:next|this|tomorrow|today|on|at)\b|[.,;]|$)", goal, re.IGNORECASE)
    return match.group(1).strip() if match else "the attendee"


def fallback_work_product(goal: str) -> dict:
    """Produce a useful, reviewable office-work draft without an AI provider."""
    text = goal.lower()
    if any(word in text for word in ("meeting", "calendar", "schedule", "appointment")):
        person = _person_after_with(goal)
        meeting_date = _meeting_date(goal)
        return {
            "title": "Meeting plan and invitation draft",
            "type": "meeting",
            "content": (
                "MEETING PLAN\n"
                f"Attendee: {person}\n"
                f"Requested date: {meeting_date}\n"
                "Time and time zone: Confirm with the attendee\n"
                "Suggested duration: 30 minutes\n\n"
                "INVITATION DRAFT\n"
                f"Subject: Meeting next Wednesday\n\n"
                f"Hi {person},\n\n"
                f"Could we schedule a 30-minute meeting on {meeting_date}? "
                "Please share a time that works for you and I will send the calendar invitation.\n\n"
                "Best,\n[Your name]\n\n"
                "Before sending: add the meeting purpose, confirm the time zone, and choose a time."
            ),
        }
    if any(word in text for word in ("email", "gmail", "reply", "message")):
        return {
            "title": "Email draft",
            "type": "email",
            "content": (
                "EMAIL DRAFT\n"
                f"Request: {goal}\n\n"
                "Subject: Follow-up\n\n"
                "Hello,\n\n"
                "I’m writing to follow up on this request. Please let me know if you need any additional details or if there is a preferred next step.\n\n"
                "Best,\n[Your name]\n\n"
                "Before sending: confirm the recipient, subject, facts, and any dates or attachments."
            ),
        }
    if any(word in text for word in ("research", "competitor", "market", "analysis", "compare")):
        return {
            "title": "Research brief",
            "type": "research",
            "content": (
                "RESEARCH BRIEF\n"
                f"Objective: {goal}\n\n"
                "Questions to answer\n"
                "• Which companies, segments, or options should be compared?\n"
                "• What evidence supports each finding?\n"
                "• What opportunity, risk, or recommendation follows?\n\n"
                "REPORT OUTLINE\n"
                "1. Executive summary\n2. Scope and sources\n3. Findings and comparison\n4. Risks and assumptions\n5. Recommendation and next steps\n\n"
                "Before sharing: verify sources, dates, prices, and claims."
            ),
        }
    if any(word in text for word in ("proposal", "brief", "draft", "write", "document")):
        return {
            "title": "Document draft",
            "type": "document",
            "content": (
                "WORKING DRAFT\n"
                f"Purpose: {goal}\n\n"
                "1. Executive summary\n"
                "State the decision or outcome this document supports.\n\n"
                "2. Background\n"
                "Add the context, audience, and problem to solve.\n\n"
                "3. Recommendation\n"
                "Describe the proposed approach, expected benefit, and owner.\n\n"
                "4. Delivery plan\n"
                "List milestones, dependencies, cost, and success measures.\n\n"
                "Before sharing: replace the guidance with project facts and confirm the audience."
            ),
        }
    if any(word in text for word in ("launch", "campaign", "announce")):
        return {
            "title": "Launch plan",
            "type": "launch",
            "content": (
                "LAUNCH PLAN\n"
                f"Outcome: {goal}\n\n"
                "1. Define the audience, message, and success measure.\n"
                "2. Prepare the announcement, supporting material, and owner for each channel.\n"
                "3. Confirm launch date, approval owner, and customer support coverage.\n"
                "4. Publish only after approval, then monitor responses and report results.\n\n"
                "Before publishing: confirm claims, dates, links, and the channels to use."
            ),
        }
    return {
        "title": "Custom work brief",
        "type": "custom",
        "content": (
            "CUSTOM WORK BRIEF\n"
            f"Requested outcome: {goal}\n\n"
            "SCOPE AND DELIVERABLES\n"
            "• Define the finished result and the people it is for.\n"
            "• List the information, files, and decisions needed.\n"
            "• Prepare a first draft or action plan for review.\n\n"
            "WORK PLAN\n"
            "1. Confirm the outcome, audience, and deadline.\n2. List missing information and dependencies.\n3. Complete the draft or action plan.\n4. Review facts, owners, and hand-off details before sharing.\n\n"
            "REVIEW CHECKLIST\n"
            "Confirm the result fits its audience, the next actions are clear, and any external step has approval."
        ),
    }


def _valid_work_product(value: object, fallback: dict) -> dict:
    if not isinstance(value, dict):
        return fallback
    title = value.get("title")
    content = value.get("content")
    if not isinstance(title, str) or not title.strip() or not isinstance(content, str) or not content.strip():
        return fallback
    return {
        "title": title.strip()[:180],
        "type": str(value.get("type") or fallback["type"])[:50],
        "content": content.strip()[:12000],
    }


async def parse_goal(goal: str) -> dict:
    """Create a classified goal and a usable draft, with a safe local fallback."""
    social = [name for name in ("twitter", "linkedin", "facebook", "whatsapp") if name in goal.lower()]
    fallback = {
        "action": "multi_platform_social_publish" if social else "automation",
        "summary": goal,
        "entities": {"channels": social},
        "requiresApproval": bool(social),
        "workProduct": fallback_work_product(goal),
    }
    if not settings.openai_api_key:
        return fallback
    try:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model=settings.proxima_openai_model,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Return strict JSON with action, summary, entities, requiresApproval, and workProduct. "
                        "workProduct must be an object with title, type, and content. Create a detailed, "
                        "ready-to-review office-work draft for the user's request: for meetings include a "
                        "meeting plan and invitation; for email include a subject and complete email; for research "
                        "include a research brief and report outline; for proposals include a structured proposal. "
                        "For any other office task, create a custom work brief with the requested outcome, audience, "
                        "deliverables, missing inputs, a practical step-by-step plan, risks or dependencies, and a review checklist. "
                        "Use only facts supplied by the user. Mark missing details as needing confirmation. "
                        "Never claim that an email, calendar event, or other external action has happened."
                    ),
                },
                {"role": "user", "content": goal},
            ],
        )
        result = json.loads(response.choices[0].message.content or "{}")
        return {**fallback, **result, "workProduct": _valid_work_product(result.get("workProduct"), fallback["workProduct"])}
    except Exception:
        return fallback
