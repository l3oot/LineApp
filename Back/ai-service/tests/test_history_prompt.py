"""ทดสอบ format history transcript สำหรับ chat context"""

from __future__ import annotations

import unittest

from src.prompts.orchestrator import (
    build_summarize_prompt,
    build_tool_select_prompt,
    format_history_transcript,
)


class HistoryPromptTests(unittest.TestCase):
    def test_format_empty(self) -> None:
        self.assertEqual(format_history_transcript(None), "")
        self.assertEqual(format_history_transcript([]), "")

    def test_format_transcript(self) -> None:
        text = format_history_transcript(
            [
                {"role": "user", "content": "อากาศอยุธยา"},
                {"role": "assistant", "content": "วันนี้แดดออก"},
            ]
        )
        self.assertIn("หลาน: อากาศอยุธยา", text)
        self.assertIn("ยาย: วันนี้แดดออก", text)

    def test_tool_select_includes_history(self) -> None:
        prompt = build_tool_select_prompt(
            "แล้วพรุ่งนี้ล่ะ",
            [{"id": "get_weather_forecast", "description": "weather", "parameters": {}}],
            history=[
                {"role": "user", "content": "อากาศอยุธยา"},
                {"role": "assistant", "content": "วันนี้แดดออก"},
            ],
        )
        self.assertIn("ประวัติแชทล่าสุด", prompt)
        self.assertIn("อากาศอยุธยา", prompt)
        self.assertIn("แล้วพรุ่งนี้ล่ะ", prompt)
        self.assertIn("ห้ามเรียก parse_expense แค่เพราะประวัติเคยบันทึก", prompt)

    def test_summarize_requires_data_date(self) -> None:
        prompt = build_summarize_prompt(
            "ราคามะนาว",
            "search_agri_prices",
            {"productName": "มะนาว", "dateKey": "2026-10-05"},
        )
        self.assertIn("ต้องบอกวันที่ของข้อมูลชัดเจน", prompt)
        self.assertIn("ห้ามใช้แค่คำว่า วันนี้ โดยไม่มีวันที่", prompt)


if __name__ == "__main__":
    unittest.main()
