"""Prompt ดึงชื่อสินค้า และสรุปราคาเฉลี่ยสำหรับ LINE"""

AGRI_PRICE_EXTRACT_PROMPT_TEMPLATE = """
คุณช่วยแยกข้อความ LINE ที่เกี่ยวกับ "ราคา"

ข้อความ:
"{text}"

หน้าที่:
1. ถ้าเป็นคำถามราคาสินค้าเกษตร เช่น "ราคา" "ราคามะนาว" "ราคาเท่าไหร่" "ขอดูราคามะนาว"
   → isPriceQuestion=true
2. ถ้าเป็นบันทึกรายรับรายจ่ายที่มีจำนวนเงิน เช่น "ซื้อปุ๋ยราคา 6000" "ขายข้าว 20 บาท"
   → isPriceQuestion=false และ productQuery=null
3. ดึงเฉพาะชื่อสินค้าที่ผู้ใช้พิมพ์ ไม่เอาคำว่า ราคา เท่าไหร่ วันนี้ กิโล บาท หน่อย จ้า
4. ห้ามแต่งชื่อสินค้าที่ไม่มีในข้อความ
5. ถ้ายังไม่บอกชื่อสินค้า ให้ productQuery เป็น null

ตอบ JSON เท่านั้น ห้าม markdown ห้ามข้อความอื่น:
{"isPriceQuestion": true, "productQuery": "มะนาว"}
""".strip()


AGRI_PRICE_SUMMARIZE_PROMPT_TEMPLATE = """
คุณสรุปราคารับซื้อสินค้าเกษตรให้เกษตรกรอ่านในแชท LINE

ข้อมูลด้านล่างเป็นราคาเฉลี่ยทุกตลาดของวันล่าสุดแล้ว ห้ามคิดเลขใหม่

กฎ:
- ภาษาไทยล้วน ข้อความเดียว อ่านจบในแชท
- ความยาวรวมไม่เกิน 900 ตัวอักษร
- บอกชื่อสินค้า ราคาเฉลี่ย หน่วย และวันที่ล่าสุด
- ถ้ามีหลายรายการ ให้ขึ้นบรรทัดใหม่ทีละสินค้า
- ห้ามแต่งตัวเลขหรือสินค้าที่ไม่มีในข้อมูล
- ห้าม JSON ห้าม markdown
- ห้ามขึ้นต้นว่าคุณคือ AI
- ลงท้ายอบอุ่นได้ เช่น จ้า
- ใช้อิโมจิได้อย่างมาก 1 ตัว เช่น 🥬

คำค้นของผู้ใช้:
{product_query}

ราคาเฉลี่ยวันล่าสุด:
{price_data}
""".strip()


def build_agri_price_extract_prompt(text: str) -> str:
    return AGRI_PRICE_EXTRACT_PROMPT_TEMPLATE.replace("{text}", (text or "").strip())


def build_agri_price_summarize_prompt(product_query: str, price_data: str) -> str:
    return (
        AGRI_PRICE_SUMMARIZE_PROMPT_TEMPLATE
        .replace("{product_query}", (product_query or "").strip() or "-")
        .replace("{price_data}", (price_data or "").strip() or "-")
    )
