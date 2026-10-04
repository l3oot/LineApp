"""กฎแยกคำสั่งบันทึกออกจากแชท — ไม่เรียก LLM"""

from __future__ import annotations

import unittest

from src.orchestrator.intent_rules import classify_record_intent, sanitize_unverified_save
from src.service.llm_response_parser import (
    fallback_extract_from_text,
    looks_like_complete_transaction,
)


class RecordIntentTests(unittest.TestCase):
    def test_fertilizer_5000_is_record(self) -> None:
        decision = classify_record_intent("ซื้อปุ๋ยข้าวโพด 5000")
        self.assertIsNotNone(decision)
        assert decision is not None
        self.assertEqual(decision.intent, "record")
        self.assertEqual(decision.tool_name, "parse_expense")
        self.assertEqual(decision.source, "rule")
        self.assertGreaterEqual(decision.confidence, 0.95)

    def test_bare_500_is_money_not_quantity(self) -> None:
        decision = classify_record_intent("ซื้อปุ๋ยข้าวโพด 500")
        self.assertIsNotNone(decision)
        assert decision is not None
        self.assertEqual(decision.reason, "verb+amount")

    def test_explicit_baht_raises_confidence(self) -> None:
        decision = classify_record_intent("ซื้อปุ๋ยข้าวโพด 500 บาท")
        self.assertIsNotNone(decision)
        assert decision is not None
        self.assertEqual(decision.reason, "verb+amount_baht")
        self.assertAlmostEqual(decision.confidence, 0.99)

    def test_quantity_unit_is_not_forced_record(self) -> None:
        self.assertIsNone(classify_record_intent("ซื้อปุ๋ย 50 กิโลกรัม"))
        self.assertIsNone(classify_record_intent("ซื้อปุ๋ย 50 กก"))

    def test_questions_stay_on_llm_path(self) -> None:
        self.assertIsNone(classify_record_intent("ปลูกข้าวยังไง"))
        self.assertIsNone(classify_record_intent("จ่ายอะไรไปเท่าไหร่"))
        self.assertIsNone(classify_record_intent("ราคาข้าวโพดเท่าไหร่"))
        self.assertIsNone(classify_record_intent("รู้จักบุรีรัมย์ไหม"))

    def test_income_and_cost_prefix(self) -> None:
        self.assertIsNotNone(classify_record_intent("ขายวัว 20000"))
        self.assertIsNotNone(classify_record_intent("ค่าปุ๋ย 300"))
        self.assertIsNotNone(classify_record_intent("ได้ค่าแรง 1500"))

    def test_spending_word_without_record_verb(self) -> None:
        self.assertIsNone(classify_record_intent("ค่าใช้จ่ายเดือนนี้ 5000"))


class SaveClaimTests(unittest.TestCase):
    def test_blocks_hallucinated_confirmation(self) -> None:
        text, blocked = sanitize_unverified_save(
            "ยายบันทึกแล้วจ้า ซื้อปุ๋ยข้าวโพด 5,000 บาท ไว้ในรายการจ่ายแล้วนะจ๊ะ"
        )
        self.assertTrue(blocked)
        self.assertNotIn("บันทึกแล้ว", text)

    def test_keeps_normal_chat(self) -> None:
        text, blocked = sanitize_unverified_save("หลานอยากปลูกอะไรจ๊ะ บอกยายหน่อยนะจ๊ะ")
        self.assertFalse(blocked)
        self.assertIn("ปลูกอะไร", text)


class AmountUnitTests(unittest.TestCase):
    def test_bare_number_is_complete_price(self) -> None:
        self.assertTrue(looks_like_complete_transaction("ซื้อปุ๋ยข้าวโพด 500"))
        parsed = fallback_extract_from_text("ซื้อปุ๋ยข้าวโพด 500")
        self.assertIsNotNone(parsed)
        assert parsed is not None
        self.assertEqual(parsed.price, 500)
        self.assertEqual(parsed.type, "expense")
        self.assertEqual(parsed.main, "ซื้อปุ๋ยข้าวโพด")

    def test_quantity_is_not_a_price(self) -> None:
        self.assertFalse(looks_like_complete_transaction("ซื้อปุ๋ย 50 กิโลกรัม"))
        self.assertIsNone(fallback_extract_from_text("ซื้อปุ๋ย 50 กิโลกรัม"))

    def test_price_after_quantity(self) -> None:
        parsed = fallback_extract_from_text("ซื้อปุ๋ย 50 กิโลกรัม ราคา 800")
        self.assertIsNotNone(parsed)
        assert parsed is not None
        self.assertEqual(parsed.price, 800)


if __name__ == "__main__":
    unittest.main()
