"""กฎเลือกทางบันทึกรายการก่อนส่งให้ LLM

ข้อความอย่าง "ซื้อปุ๋ยข้าวโพด 5000" ต้องเข้า parse_expense ทันที
ไม่ให้โมเดลตอบเองว่าบันทึกแล้ว หรือตีตัวเลขเป็นปริมาณ
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# กริยาบันทึกรายรับ-รายจ่าย — จับทั้งคำนำหน้าและคำที่ไม่มีเว้นวรรค เช่น ซื้อปุ๋ย
_RECORD_VERB = re.compile(
    r"(ซื้อ|ขาย|(?<!ค่าใช้)จ่าย|ได้รับ|ได้เงิน|รับเงิน|ได้ค่า|รับค่า|(?:^|\s)ได้(?!ยิน)|(?:^|\s)ค่า(?!ใช้จ่าย))"
)
_QUESTION = re.compile(
    r"(?:ไหม|มั้ย|มั๊ย|หรือยัง|หรือเปล่า|หรือไม่|เท่าไหร่|เท่าไร|เท่าไหร|กี่|อะไร|ยังไง|ทำไม)"
)
_AMOUNT = re.compile(r"(?<!\d)(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?")
_AFTER_BAHT = re.compile(r"^\s*(?:บาท|฿)")
_AFTER_QTY = re.compile(
    r"^\s*(?:กิโลกรัม|กิโล|กก\.?|ลิตร|ตัน|กระสอบ|ถุง|ขีด|ไร่|เมตร|ฟอง|ตัว|ลูก)"
)
_FAKE_SAVE = re.compile(r"บันทึก(?:ให้)?แล้ว|จด(?:ให้|ไว้)?แล้ว|ลงรายการแล้ว")

_UNVERIFIED_SAVE_REPLY = (
    "ยายยังไม่ได้บันทึกรายการนะจ๊ะ "
    "ถ้าจะจดรายจ่าย พิมพ์แบบ ซื้อปุ๋ยข้าวโพด 500 บาท นะจ๊ะ"
)

WEB_APP_URL = "https://yaiphao.com/app"
WEB_ENTRY_REPLY = f"เข้าเว็บได้ที่ {WEB_APP_URL} นะจ๊ะ"

_WEB_WORD = r"(?:เว็บไซต์|เว็บ|เว็ป|เวป)"
_WEB_ENTRY = re.compile(
    rf"(?:"
    rf"เข้า(?:สู่)?{_WEB_WORD}"
    rf"|เปิด{_WEB_WORD}"
    rf"|(?:ลิงก์|ลิงค์|ลิ้งก์|ลิ้งค์|ลิ้ง|link|url)\s*{_WEB_WORD}"
    rf"|{_WEB_WORD}(?:\s*)(?:อยู่ที่ไหน|อยู่ไหน|ที่ไหน|ตรงไหน|ยังไง|อย่างไร|ได้ที่ไหน)"
    rf"|ทางเข้า{_WEB_WORD}"
    rf"|ขอ(?:ลิงก์|ลิงค์|ลิ้งก์|ลิ้งค์|url)\s*(?:เข้า)?{_WEB_WORD}"
    rf")",
    re.IGNORECASE,
)

# คำถามความรู้เกษตร — ไม่ใช่ราคา อากาศ หรือรายรับรายจ่าย
_AGRI_TOPIC = re.compile(
    r"(?:เกษตร|การเกษตร|ปลูก|เพาะ|หว่าน|ดำนา|เก็บเกี่ยว|"
    r"โรคพืช|ศัตรูพืช|วัชพืช|แมลงศัตรู|ปุ๋ย|ยาฆ่า|สารเคมีเกษตร|"
    r"พันธุ์|ดิน(?!สอ)|รดน้ำ|ให้น้ำ|ในนา|นาข้าว|ท้องนา|แปลงปลูก|"
    r"ข้าวโพด|มันสำปะหลัง|อ้อย|ยางพารา|ปาล์มน้ำมัน|"
    r"ทุเรียน|ลำไย|มังคุด|เงาะ|มะม่วง|มะนาว|ส้มโอ|กล้วย|มะพร้าว|"
    r"พริก|มะเขือ|ถั่ว|ขิง|กระเทียม|แตงโม|สับปะรด|"
    r"เลี้ยง(?:ไก่|ปลา|กุ้ง|วัว|หมู|เป็ด|โค)|ปศุสัตว์|"
    r"ใบเหลือง|ใบไหม้|ใบจุด|ใบหงิก|รากเน่า|โคนเน่า|ผลเน่า|"
    r"เพลี้ย|หนอน|ราแป้ง|ราสนิม|ไรแดง|ข้าว)"
)
_KNOWLEDGE_CUE = re.compile(
    r"(?:ไหม|มั้ย|มั๊ย|หรือยัง|หรือเปล่า|หรือไม่|อะไร|ยังไง|อย่างไร|ทำไม|"
    r"วิธี|แนะนำ|ควร|เกิดจาก|ความรู้|อยากรู้|อธิบาย|ดูแล|ป้องกัน|รักษา|"
    r"แก้|สูตร|คุ้ม|เท่าไหร่|เท่าไร|กี่)"
)
_NOT_AGRI_KNOWLEDGE = re.compile(
    r"(?:ราคา|กี่บาท|อากาศ|พยากรณ์|อุณหภูมิ|ความชื้น|ฝนตก|"
    r"รายรับ|รายจ่าย|รายการสินค้า|รายชื่อสินค้า|สินค้าที่มีราคา|"
    r"เข้าเว็บ|เว็บไซต์|เว็ป|ลิงก์เว็บ)"
)

# คำถามขอรายชื่อสินค้าที่มีราคา — ไม่ใช่ถามราคาของสินค้าชิ้นเดียว
_LIST_AGRI_PRODUCTS = re.compile(
    r"(?:รายการสินค้า|รายชื่อสินค้า|สินค้าที่มีราคา|คลังสินค้า|"
    r"มีสินค้า(?:อะไร|ไหน)?บ้าง|สินค้า(?:อะไร|ไหน)?บ้าง|"
    r"สินค้ามีอะไรบ้าง|ดู(?:รายการ)?สินค้า|"
    r"มีรายการ(?:สินค้า)?อะไรบ้าง)"
)


@dataclass(frozen=True)
class RouteDecision:
    intent: str
    tool_name: str | None
    confidence: float
    source: str
    reason: str


def _money_amounts(text: str) -> list[str]:
    """คืนชนิดของตัวเลขที่เป็นเงิน: baht = มีหน่วยบาท, bare = ตัวเลขลอยที่ไม่ได้ตามด้วยหน่วยปริมาณ"""
    kinds: list[str] = []
    for match in _AMOUNT.finditer(text):
        tail = text[match.end() :]
        if _AFTER_QTY.match(tail):
            continue
        if _AFTER_BAHT.match(tail):
            kinds.append("baht")
        else:
            kinds.append("bare")
    return kinds


def classify_record_intent(message: str) -> RouteDecision | None:
    """ถ้าเข้าเกณฑ์คำสั่งบันทึก คืน route ไป parse_expense — นอกนั้นให้ LLM ตัดสิน"""
    text = (message or "").strip()
    if not text or _QUESTION.search(text) or not _RECORD_VERB.search(text):
        return None
    kinds = _money_amounts(text)
    if not kinds:
        return None
    has_baht = "baht" in kinds
    return RouteDecision(
        intent="record",
        tool_name="parse_expense",
        confidence=0.99 if has_baht else 0.95,
        source="rule",
        reason="verb+amount_baht" if has_baht else "verb+amount",
    )


def classify_web_entry_intent(message: str) -> RouteDecision | None:
    """ถ้าถามทางเข้าเว็บ ให้ตอบ URL ของแอปตรง ๆ"""
    text = (message or "").strip()
    if not text or not _WEB_ENTRY.search(text):
        return None
    return RouteDecision(
        intent="chat",
        tool_name=None,
        confidence=0.97,
        source="rule",
        reason="web_entry",
    )


def classify_agri_knowledge_intent(message: str) -> RouteDecision | None:
    """คำถามหรือความรู้ด้านการเกษตร — ไม่รวมราคา อากาศ และบัญชีฟาร์ม"""
    text = (message or "").strip()
    if (
        not text
        or _NOT_AGRI_KNOWLEDGE.search(text)
        or not _AGRI_TOPIC.search(text)
        or not _KNOWLEDGE_CUE.search(text)
    ):
        return None
    return RouteDecision(
        intent="knowledge",
        tool_name="ask_agri_knowledge",
        confidence=0.93,
        source="rule",
        reason="agri_knowledge",
    )


def classify_list_agri_products_intent(message: str) -> RouteDecision | None:
    """ถ้าถามรายชื่อสินค้าที่มีราคา คืน route ไป list_agri_products"""
    text = (message or "").strip()
    if not text or not _LIST_AGRI_PRODUCTS.search(text):
        return None
    return RouteDecision(
        intent="lookup",
        tool_name="list_agri_products",
        confidence=0.96,
        source="rule",
        reason="list_agri_products",
    )


def sanitize_unverified_save(reply: str | None) -> tuple[str, bool]:
    """กันโมเดลพิมพ์ว่าบันทึกแล้วทั้งที่ยังไม่มี action จาก API"""
    text = (reply or "").strip()
    if not text or not _FAKE_SAVE.search(text):
        return text, False
    return _UNVERIFIED_SAVE_REPLY, True
