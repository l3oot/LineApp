"""ถามทางเข้าเว็บต้องได้ URL ของแอป"""

from __future__ import annotations

import unittest

from src.orchestrator.intent_rules import (
    WEB_APP_URL,
    WEB_ENTRY_REPLY,
    classify_web_entry_intent,
)


class WebEntryIntentTests(unittest.TestCase):
    def test_web_questions_match(self) -> None:
        for text in (
            "เข้าเว็บยังไง",
            "ที่เข้าเว็ป",
            "ขอลิงก์เว็บ",
            "เว็บอยู่ไหน",
            "ทางเข้าเว็บไซต์",
        ):
            decision = classify_web_entry_intent(text)
            self.assertIsNotNone(decision, text)
            assert decision is not None
            self.assertEqual(decision.reason, "web_entry", text)
            self.assertEqual(decision.source, "rule", text)

    def test_reply_includes_url(self) -> None:
        self.assertIn(WEB_APP_URL, WEB_ENTRY_REPLY)
        self.assertEqual(WEB_APP_URL, "https://yaiphao.com/app")

    def test_unrelated_chat_is_not_web_entry(self) -> None:
        self.assertIsNone(classify_web_entry_intent("สภาพอากาศวันนี้"))
        self.assertIsNone(classify_web_entry_intent("ซื้อปุ๋ยข้าวโพด 500"))
        self.assertIsNone(classify_web_entry_intent("ขอลิงก์ราคามะนาว"))


if __name__ == "__main__":
    unittest.main()
