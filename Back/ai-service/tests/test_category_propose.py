"""ชื่อหมวดที่ LLM เสนอมา — จับคู่ของเดิม หรือคงไว้ให้ user-service สร้างเงียบ ๆ"""

from __future__ import annotations

import unittest
from uuid import uuid4

from src.service.category_service import (
    resolve_category,
    resolve_or_propose_category,
    sanitize_proposed_category_name,
)
from src.dto.extract import AiExtractStructured
from src.service.llm_response_parser import sanitize_ids, structured_from_dict


class ProposeCategoryTests(unittest.TestCase):
    def test_sanitize_rejects_digits_and_blank(self) -> None:
        self.assertEqual(sanitize_proposed_category_name("  ปุ๋ย  "), "ปุ๋ย")
        self.assertIsNone(sanitize_proposed_category_name("ปุ๋ย 500"))
        self.assertIsNone(sanitize_proposed_category_name("   "))

    def test_resolve_or_propose_keeps_new_name(self) -> None:
        cid, name = resolve_or_propose_category([], "ค่าน้ำมัน", "expense")
        self.assertIsNone(cid)
        self.assertEqual(name, "ค่าน้ำมัน")

    def test_resolve_or_propose_uses_existing(self) -> None:
        category_id = uuid4()
        categories = [{"categoryId": str(category_id), "name": "ปุ๋ย", "type": "expense"}]
        cid, name = resolve_or_propose_category(categories, "ปุ๋ย", "expense")
        self.assertEqual(cid, category_id)
        self.assertEqual(name, "ปุ๋ย")

    def test_unmatched_name_is_not_dropped_by_legacy_resolve(self) -> None:
        cid, name = resolve_category([], "ค่าอาหาร", "expense")
        self.assertIsNone(cid)
        self.assertIsNone(name)

    def test_structured_keeps_proposed_name_when_list_empty(self) -> None:
        structured = structured_from_dict(
            {
                "main": "ซื้อปุ๋ยข้าวโพด",
                "price": 500,
                "type": "expense",
                "categoryName": "ปุ๋ย",
            },
            [],
            [],
        )
        self.assertIsNotNone(structured)
        assert structured is not None
        self.assertIsNone(structured.categoryId)
        self.assertEqual(structured.categoryName, "ปุ๋ย")

    def test_sanitize_ids_keeps_proposed_name_when_id_is_fake(self) -> None:
        structured = AiExtractStructured(
            main="ซื้อปุ๋ยข้าวโพด",
            price=500,
            type="expense",
            categoryId=uuid4(),
            categoryName="ปุ๋ย",
        )
        cleaned = sanitize_ids(structured, [], [])
        self.assertIsNotNone(cleaned)
        assert cleaned is not None
        self.assertIsNone(cleaned.categoryId)
        self.assertEqual(cleaned.categoryName, "ปุ๋ย")


if __name__ == "__main__":
    unittest.main()
