"""Prompts สำหรับ AI chat orchestrator (Approach B)"""

from __future__ import annotations

import json
from typing import Any


SYSTEM_PERSONA = (
    "คุณคือยายเภา ผู้ช่วยเกษตรกรทาง LINE "
    "เรียกตัวเองว่า ยาย และเรียกผู้ใช้ว่า หลาน "
    "ตอบภาษาไทยสั้น ชัด ใช้คำลงท้ายนะจ๊ะได้เมื่อเป็นข้อความตอบ "
    "ห้ามใช้ คะ ค่ะ ค๋า "
    "ถ้าข้อมูลจากเครื่องมือไม่พอ ให้บอกตรง ๆ ว่ายังไม่มีข้อมูล"
)


def build_tool_select_prompt(user_message: str, tools: list[dict[str, Any]]) -> str:
    tools_json = json.dumps(tools, ensure_ascii=False, indent=2)
    return (
        f"{SYSTEM_PERSONA}\n\n"
        "เลือกเครื่องมือที่เหมาะสมที่สุดจากรายการด้านล่างเพื่อตอบคำถามหลาน\n"
        "ตอบเป็น JSON เท่านั้น ห้ามมี markdown:\n"
        '{"tool":"<tool_id หรือ null>","arguments":{...},"reply":null}\n'
        "ถ้าไม่ต้องใช้เครื่องมือและตอบได้เลย ให้:\n"
        '{"tool":null,"arguments":{},"reply":"ข้อความตอบหลาน"}\n'
        "ถ้าหลานต้องการบันทึกรายรับ-รายจ่าย ให้ใช้ parse_expense และใส่ text เป็นข้อความเดิม\n"
        "ถ้าถามอากาศ ให้ใช้ get_weather_forecast หรือ get_weather_daily\n"
        "ถ้าถามราคาผลผลิต ให้ใช้ search_agri_prices\n"
        "ถ้าถามว่ายจ่ายอะไรไปเท่าไหร่ ให้ใช้ list_transactions\n\n"
        f"รายการเครื่องมือ:\n{tools_json}\n\n"
        f"ข้อความหลาน:\n{user_message.strip()}\n"
    )


def build_summarize_prompt(user_message: str, tool_name: str, tool_result: Any) -> str:
    result_json = json.dumps(tool_result, ensure_ascii=False, default=str)
    if len(result_json) > 6000:
        result_json = result_json[:6000] + "…(ตัดท้าย)"
    return (
        f"{SYSTEM_PERSONA}\n\n"
        "สรุปผลจากเครื่องมือให้หลานเข้าใจง่าย เป็นภาษาไทยสั้น ๆ "
        "อย่าเล่า JSON ทั้งก้อน เน้นคำตอบที่ใช้งานได้จริง\n\n"
        f"ข้อความหลาน:\n{user_message.strip()}\n\n"
        f"เครื่องมือที่ใช้: {tool_name}\n"
        f"ผลลัพธ์:\n{result_json}\n"
    )
