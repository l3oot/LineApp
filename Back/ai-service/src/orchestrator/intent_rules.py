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
