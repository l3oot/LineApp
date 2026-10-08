"""คำถามความรู้เกษตรต้องไปที่แชท Pathumma และใช้เฉพาะเหตุการณ์ done"""

from __future__ import annotations

import unittest
from unittest.mock import patch

from src.client.agri_chat import build_agri_messages, done_text_from_sse_line
from src.dto.chat import ChatTurn
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


class AgriKnowledgeRouteTests(unittest.TestCase):
    def test_rule_returns_done_text(self) -> None:
        with patch("src.orchestrator.tool_loop.ask_agri_chat", return_value="หว่านข้าวแบบนี้") as mocked:
            response = run_tool_loop(
                "ปลูกข้าวยังไง",
                None,
                history=[ChatTurn(role="user", content="สวัสดี")],
            )
        mocked.assert_called_once()
        sent = mocked.call_args.args[0]
        self.assertEqual(sent[0], {"role": "user", "text": "สวัสดี"})
        self.assertEqual(sent[-1], {"role": "user", "text": "ปลูกข้าวยังไง"})
        self.assertEqual(response.reply_text, "หว่านข้าวแบบนี้")
        self.assertEqual(response.route_intent, "knowledge")
        self.assertEqual(response.tools_used, ["ask_agri_knowledge"])
        self.assertEqual(response.source_model, "agri-pathumma")


if __name__ == "__main__":
    unittest.main()
