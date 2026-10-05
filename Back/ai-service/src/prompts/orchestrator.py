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

# ใช้ตอนเลือกเครื่องมือเท่านั้น — สรุปผลเครื่องมือใช้ SYSTEM_PERSONA ตามเดิม
TOOL_ROUTER_RULES = (
    "ตัดสินจากข้อความล่าสุดเป็นหลัก "
    "ถ้าข้อความล่าสุดสั้นหรืออ้างอิงบริบท "
    "ให้อ่านประวัติแชทล่าสุดเพื่อเข้าใจว่าหลานหมายถึงอะไร "
    "(เช่น จังหวัด วัน สินค้าที่เพิ่งถาม)\n"
    "ต้องเรียกเครื่องมือเสมอ ห้ามตอบเป็นข้อความลอย\n"
    "ถ้าเป็นการคุยทั่วไป ให้เรียก reply_chat และใส่คำตอบใน reply\n"
    "ถ้าหลานสั่งบันทึกรายรับหรือรายจ่าย "
    "(มีกริยา ซื้อ ขาย จ่าย ได้ รับ และมีตัวเลข) "
    "ต้องเรียก parse_expense เท่านั้น และใส่ text เป็นข้อความเดิม\n"
    "ห้ามเรียก parse_expense แค่เพราะประวัติเคยบันทึก "
    "ถ้าข้อความล่าสุดไม่ใช่คำสั่งบันทึกใหม่\n"
    "ตัวเลขท้ายประโยคแบบนี้คือจำนวนเงินหน่วยบาท ไม่ใช่กิโลกรัมหรือปริมาณ "
    "แม้ไม่มีคำว่าบาท เช่น ซื้อปุ๋ยข้าวโพด 500 หมายถึง 500 บาท\n"
    "ห้ามพูดว่า บันทึกแล้ว จดแล้ว หรือลงรายการแล้ว "
    "การบันทึกเกิดเมื่อระบบได้ข้อมูลจาก parse_expense เท่านั้น\n"
    "ถ้าถามว่าจ่ายอะไรไปเท่าไหร่ ให้ใช้ list_transactions ไม่ใช่ parse_expense\n"
    "ถ้าถามอากาศ ให้ใช้ get_weather_forecast หรือ get_weather_daily\n"
    "ถ้าถามว่ารายการสินค้าอะไรบ้าง รายชื่อสินค้า มีสินค้าอะไร "
    "หรืออยากดูรายการสินค้าที่มีราคา ให้ใช้ list_agri_products\n"
    "ถ้าถามราคาผลผลิตเมื่อรู้ชื่อสินค้าแล้วเท่านั้น ให้ใช้ search_agri_prices\n"
    "คำถามวิธีทำ เช่น ปลูกข้าวยังไง ให้เรียก reply_chat "
    "ห้ามใช้ search_agri_prices แค่เพราะในประโยคมีคำว่าข้าว"
)


def format_history_transcript(history: list[dict[str, Any]] | None) -> str:
    """แปลง history เป็น transcript สั้น ๆ สำหรับใส่ใน prompt"""
    if not history:
        return ""
    lines: list[str] = []
    for turn in history:
        if not isinstance(turn, dict):
            continue
        role = str(turn.get("role") or "").strip().lower()
        content = str(turn.get("content") or "").strip()
        if not content:
            continue
        label = "หลาน" if role == "user" else "ยาย"
        lines.append(f"{label}: {content}")
    if not lines:
        return ""
    return "ประวัติแชทล่าสุด:\n" + "\n".join(lines) + "\n\n"


def build_tool_select_prompt(
    user_message: str,
    tools: list[dict[str, Any]],
    history: list[dict[str, Any]] | None = None,
) -> str:
    tools_json = json.dumps(tools, ensure_ascii=False, indent=2)
    history_block = format_history_transcript(history)
    return (
        f"{SYSTEM_PERSONA}\n\n"
        f"{TOOL_ROUTER_RULES}\n\n"
        "เลือกเครื่องมือที่เหมาะสมที่สุดจากรายการด้านล่าง\n"
        "ตอบเป็น JSON เท่านั้น ห้ามมี markdown:\n"
        '{"tool":"<tool_id>","arguments":{...},"reply":null}\n'
        "ถ้าคุยทั่วไป ให้เรียก reply_chat:\n"
        '{"tool":"reply_chat","arguments":{"reply":"ข้อความตอบหลาน"},"reply":null}\n'
        "ห้ามใส่คำว่าบันทึกแล้วใน reply\n\n"
        f"รายการเครื่องมือ:\n{tools_json}\n\n"
        f"{history_block}"
        f"ข้อความล่าสุดของหลาน:\n{user_message.strip()}\n"
    )


def build_summarize_prompt(
    user_message: str,
    tool_name: str,
    tool_result: Any,
    history: list[dict[str, Any]] | None = None,
) -> str:
    result_json = json.dumps(tool_result, ensure_ascii=False, default=str)
    if len(result_json) > 6000:
        result_json = result_json[:6000] + "…(ตัดท้าย)"
    history_block = format_history_transcript(history)
    return (
        f"{SYSTEM_PERSONA}\n\n"
        "สรุปผลจากเครื่องมือให้หลานเข้าใจง่าย เป็นภาษาไทยสั้น ๆ "
        "อย่าเล่า JSON ทั้งก้อน เน้นคำตอบที่ใช้งานได้จริง "
        "ห้ามบอกว่าบันทึกแล้วหรือลงรายการแล้ว\n"
        "ถ้าประวัติแชทช่วยให้สรุปตรงคำถาม follow-up ได้ ให้ใช้ได้\n"
        "ถ้าเป็นอากาศหรือราคาสินค้าเกษตร ต้องบอกวันที่ของข้อมูลชัดเจน "
        "(เช่น 5 ต.ค. 2569 หรือตาม date / data_date / dateKey ในผลลัพธ์) "
        "ห้ามใช้แค่คำว่า วันนี้ โดยไม่มีวันที่\n"
        "ถ้าเป็นรายการชื่อสินค้า ให้สรุปเป็นรายการสั้น ๆ "
        "แล้วบอกว่าถ้าอยากดูราคาให้พิมพ์ เช่น ราคามะนาว\n\n"
        f"{history_block}"
        f"ข้อความหลาน:\n{user_message.strip()}\n\n"
        f"เครื่องมือที่ใช้: {tool_name}\n"
        f"ผลลัพธ์:\n{result_json}\n"
    )
