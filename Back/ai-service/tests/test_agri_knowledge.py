"""คำถามความรู้เกษตรต้องไปที่แชท Pathumma และใช้เฉพาะเหตุการณ์ done"""

from __future__ import annotations

import unittest
from unittest.mock import patch

from src.client.agri_chat import build_agri_messages, done_text_from_sse_line
from src.dto.chat import ChatTurn
from src.orchestrator.agri_rewrite import (
    INPUT_TOKEN_BUDGET,
    fit_source_to_budget,
    normalize_agri_markup,
    rewrite_agri_for_yai,
)
from src.orchestrator.intent_rules import classify_agri_knowledge_intent
from src.orchestrator.tool_loop import run_tool_loop


class AgriKnowledgeIntentTests(unittest.TestCase):
    def test_knowledge_questions_match(self) -> None:
        for text in (
            "ปลูกทุเรียนคุ้มไหม",
            "ข้าวใบเหลืองเกิดจากอะไร",
            "ปลูกข้าวยังไง",
            "ปุ๋ยสูตรอะไรดี",
            "อยากรู้เรื่องโรคพืช",
            "เลี้ยงไก่ยังไง",
        ):
            decision = classify_agri_knowledge_intent(text)
            self.assertIsNotNone(decision, text)
            assert decision is not None
            self.assertEqual(decision.intent, "knowledge", text)
            self.assertEqual(decision.tool_name, "ask_agri_knowledge", text)

    def test_other_intents_are_not_knowledge(self) -> None:
        for text in (
            "ราคามะนาวเท่าไหร่",
            "อากาศวันนี้ฝนตกไหม",
            "ซื้อปุ๋ยข้าวโพด 500",
            "สวัสดี",
            "เข้าเว็บยังไง",
            "รายการสินค้ามีอะไรบ้าง",
            "ดินสอสีอะไร",
        ):
            self.assertIsNone(classify_agri_knowledge_intent(text), text)


class AgriSseTests(unittest.TestCase):
    def test_only_done_text_is_used(self) -> None:
        self.assertIsNone(done_text_from_sse_line('data: {"type":"delta","text":"ที"}'))
        self.assertIsNone(done_text_from_sse_line('data: {"type":"plan","mode":"chat"}'))
        self.assertEqual(
            done_text_from_sse_line('data: {"type":"done","text":"หว่านข้าวแบบนี้","steps":[]}'),
            "หว่านข้าวแบบนี้",
        )
        self.assertIsNone(done_text_from_sse_line("data: [DONE]"))
        self.assertIsNone(done_text_from_sse_line('data: {"type":"done","text":"  "}'))

    def test_messages_use_text_field(self) -> None:
        messages = build_agri_messages(
            "แล้วใบเหลืองล่ะ",
            [{"role": "user", "content": "ปลูกข้าวยังไง"}, {"role": "assistant", "content": "หว่าน"}],
        )
        self.assertEqual(
            messages,
            [
                {"role": "user", "text": "ปลูกข้าวยังไง"},
                {"role": "assistant", "text": "หว่าน"},
                {"role": "user", "text": "แล้วใบเหลืองล่ะ"},
            ],
        )


_CHART = """พื้นที่โดยรวมเป็นแบบนี้
```chart
{"title": "พื้นที่ปลูกข้าว จ.บุรีรัมย์ แยกตามชั้นความเหมาะสม", "unit": "ไร่",
 "rows": [{"label": "S1 เหมาะสมสูง", "value": 242975},
          {"label": "S2 เหมาะสมปานกลาง", "value": 2250030}]}
```
"""

_TABLE = """| ระดับความเหมาะสม | พื้นที่ (ไร่) |
| --- | --- |
| S1 เหมาะสมสูง | 242,975 |
| N ไม่เหมาะสม | 1,630,720 |
"""


class AgriMarkupTests(unittest.TestCase):
    def test_chart_becomes_spoken_lines(self) -> None:
        text = normalize_agri_markup(_CHART)
        self.assertNotIn("```", text)
        self.assertIn("พื้นที่ปลูกข้าว จ.บุรีรัมย์ แยกตามชั้นความเหมาะสม", text)
        self.assertIn("S1 เหมาะสมสูง: 242,975 ไร่", text)
        self.assertIn("S2 เหมาะสมปานกลาง: 2,250,030 ไร่", text)
        self.assertIn("พื้นที่โดยรวมเป็นแบบนี้", text)

    def test_markdown_table_becomes_lines(self) -> None:
        text = normalize_agri_markup(_TABLE)
        self.assertNotIn("|", text)
        self.assertIn("S1 เหมาะสมสูง: 242,975", text)
        self.assertIn("N ไม่เหมาะสม: 1,630,720", text)


class AgriRewriteBudgetTests(unittest.TestCase):
    def test_long_source_is_cut_to_input_budget(self) -> None:
        source = "ข" * (INPUT_TOKEN_BUDGET + 500)
        fitted, trimmed = fit_source_to_budget("ปลูกข้าวยังไง", source)
        self.assertTrue(trimmed)
        self.assertIn("ตัดท้าย", fitted)
        self.assertLess(len(fitted), len(source))

    def test_overflow_retries_with_shorter_source(self) -> None:
        seen: list[int] = []

        def fake_llm(prompt: str) -> dict[str, str]:
            seen.append(len(prompt))
            if len(seen) == 1:
                raise RuntimeError("all LLM providers failed") from RuntimeError(
                    "context_length_exceeded: maximum context length"
                )
            return {"result": "เหมาะสมสูง 242,975 ไร่นะจ๊ะ", "source_model": "typhoon"}

        with patch("src.orchestrator.agri_rewrite.run_llm", side_effect=fake_llm):
            reply, model = rewrite_agri_for_yai("ปลูกข้าวที่ไหนดี", "ข" * 4000)
        self.assertEqual(reply, "เหมาะสมสูง 242,975 ไร่นะจ๊ะ")
        self.assertEqual(model, "typhoon")
        self.assertGreaterEqual(len(seen), 2)
        self.assertLess(seen[-1], seen[0])


class AgriKnowledgeRouteTests(unittest.TestCase):
    def test_rule_sends_done_text_through_yai_rewrite(self) -> None:
        with (
            patch("src.orchestrator.tool_loop.ask_agri_chat", return_value="หว่านข้าวแบบนี้") as mocked,
            patch(
                "src.orchestrator.tool_loop.rewrite_agri_for_yai",
                return_value=("หว่านแบบนี้นะจ๊ะ", "typhoon"),
            ) as rewrite,
        ):
            response = run_tool_loop(
                "ปลูกข้าวยังไง",
                None,
                history=[ChatTurn(role="user", content="สวัสดี")],
            )
        mocked.assert_called_once()
        rewrite.assert_called_once()
        self.assertEqual(rewrite.call_args.args[0], "ปลูกข้าวยังไง")
        self.assertEqual(rewrite.call_args.args[1], "หว่านข้าวแบบนี้")
        sent = mocked.call_args.args[0]
        self.assertEqual(sent[0], {"role": "user", "text": "สวัสดี"})
        self.assertEqual(sent[-1], {"role": "user", "text": "ปลูกข้าวยังไง"})
        self.assertEqual(response.reply_text, "หว่านแบบนี้นะจ๊ะ")
        self.assertEqual(response.route_intent, "knowledge")
        self.assertEqual(response.tools_used, ["ask_agri_knowledge"])
        self.assertEqual(response.source_model, "typhoon")


if __name__ == "__main__":
    unittest.main()
