# สรุปการสนทนา: AI เกษตร, API และการเชื่อมต่อ Chatbot บน Linux

> สรุปประเด็นที่คุยกันในบทสนทนานี้ พร้อมข้อควรตรวจสอบก่อนนำไปใช้จริง

## 1. Pathumma ThaiLLM มี API หรือไม่

- มีแนวทางใช้งานผ่านบริการ API ที่เกี่ยวข้องกับ AI for Thai/NECTEC แต่ต้องตรวจสอบ **endpoint, การสมัคร, API key และรายชื่อโมเดลที่เปิดให้เรียกจริง** จากเอกสารทางการ
- อีกแนวทางคือดาวน์โหลดโมเดลแล้ว **self-host** ผ่าน vLLM เพื่อเปิด OpenAI-compatible API เช่น `POST /v1/chat/completions`
- Self-host ไม่ได้แปลว่าไม่มีต้นทุน: ต้องมีเครื่องประมวลผลและดูแลระบบเอง

แหล่งอ้างอิง:
- https://www.pathumma.in.th/
- https://huggingface.co/nectec/models

### โมเดล Pathumma ที่กล่าวถึง

| กลุ่ม | โมเดลที่กล่าวถึง | งานที่เหมาะ |
|---|---|---|
| Text/Reasoning | `Pathumma-llm-text-4.0.0` | สนทนาและเหตุผล |
| ThaiLLM Think | `pathumma-thaillm-8b-think-3.0.0` | Reasoning / tool calling |
| ThaiLLM 2.0 | `Pathumma-ThaiLLM-qwen3-8b-it-2.0.0` | Chat / instruction |
| ThaiLLM 2.0 Think | `Pathumma-ThaiLLM-qwen3-8b-think-2.0.0` | Reasoning |
| Vision | ตระกูล Pathumma Vision | วิเคราะห์ภาพและเอกสาร |
| Speech-to-Text | Pathumma STT / Whisper Thai | ถอดเสียงภาษาไทย |
| Text-to-Speech | Pathumma F5-TTS | สร้างเสียงพูด |
| Guardrail | Pathumma Guardrail | ตรวจ/จัดประเภทเนื้อหา |

> หมายเหตุ: รายชื่อโมเดลที่ดาวน์โหลดได้ **ไม่เท่ากับ** รายชื่อ model ID ที่ API สาธารณะรองรับ ต้องตรวจสอบเป็นรายบริการ

## 2. AI เกษตรที่มี API หรือโค้ดให้ใช้งาน

| ตัวเลือก | ลักษณะ | งานที่เหมาะ | ข้อควรระวังเรื่องคำว่า “ฟรี” |
|---|---|---|---|
| Hugging Face Agriculture Models | แหล่งรวมโมเดล; บางตัวมี hosted inference | ตรวจโรคพืช/จำแนกภาพ | ไม่ใช่ทุกโมเดลมี API พร้อมใช้ และโควตาขึ้นกับ provider |
| PlantHealthEngine | บริการตรวจสุขภาพพืชผ่าน API | ส่งภาพตรวจโรค | ตรวจสอบ free plan, rate limit และเงื่อนไขปัจจุบัน |
| Smart Agriculture API | โครงการโอเพนซอร์ส | แนะนำพืช/ปุ๋ย/ผลผลิต/โรค | อาจต้อง deploy เอง; ตรวจสอบ license และความพร้อม production |
| AgroGuard | โครงการโอเพนซอร์ส | Crop, disease, weather, chat | อาจต้อง deploy เอง; ตรวจสอบ endpoint และ dependency ใน repository |
| Gemini API + Agricultural RAG | General LLM + ฐานความรู้เกษตร | Chatbot เกษตรภาษาไทย | Free tier ขึ้นกับรุ่นและเงื่อนไขการใช้งาน |

แหล่งอ้างอิงที่ให้ไว้:
- https://huggingface.co/models?other=plant-disease
- https://huggingface.co/docs/inference-providers/index
- https://planthealthengine.com/pricing
- https://github.com/sahillad05/smart-agriculture-api
- https://github.com/Alphathanlwin/AgroGuard
- https://ai.google.dev/gemini-api/docs/pricing

### แนวทางสำหรับแอปเกษตรไทย

```text
Mobile App / LINE Bot
        |
    Spring Boot
        |
   +----+------------------+
   |                       |
General LLM + RAG     Plant Disease Model
   |                       |
ตอบคำถามเกษตรไทย      วิเคราะห์ภาพพืช
   |
แหล่งข้อมูลเกษตรไทยที่เชื่อถือได้
```

- LLM ช่วยสื่อสารและอธิบายเป็นภาษาไทย
- RAG เพิ่มความรู้จากแหล่งข้อมูลเกษตรที่ตรวจสอบได้
- Vision model วิเคราะห์ภาพโรคพืช โดยต้องตรวจสอบความแม่นยำกับพืชและโรคที่ใช้งานจริง

## 3. ถ้า Chatbot เกษตรเข้าเว็บได้โดยไม่ต้อง Login แต่ไม่มี API

มีทางเลือกสำหรับ **ส่งคำถามและดึงคำตอบ** ดังนี้

| วิธี | หลักการ | ความยากโดยทั่วไป | ข้อจำกัด |
|---|---|---|---|
| HTTP endpoint ที่เว็บใช้อยู่ | ดู Network → Fetch/XHR แล้วตรวจ request | ง่าย ถ้า endpoint เปิดให้ใช้อย่างถูกต้อง | อาจเป็น private API, มี token/session หรือข้อห้ามใช้งาน |
| HTML scraping | ดาวน์โหลด HTML แล้ว parse | ง่ายเฉพาะหน้า static | เว็บ chat แบบ dynamic มักใช้ไม่ได้ |
| SSE / WebSocket | เชื่อมช่องทาง streaming ของเว็บ | ปานกลางถึงยาก | ต้องเข้าใจ protocol และสิทธิ์การใช้งาน |
| Playwright / Selenium | เปิดเว็บ กรอกข้อความ รอและอ่านข้อความ | ปานกลาง | กิน RAM, selector เปลี่ยนแล้วพังได้ |
| Headless browser microservice | แยก browser automation เป็นบริการ API | ค่อนข้างยาก | ต้องจัดการ concurrency, timeout, session และ monitoring |
| Reverse-engineer ระบบที่ซับซ้อน | วิเคราะห์ request/response และ flow | ยาก | เปราะและเสี่ยงขัดข้อกำหนด |

**ข้อสำคัญ:** เว็บที่ไม่ต้อง Login ไม่ได้หมายความว่า API ภายในเป็น public API หรืออนุญาตให้ใช้เชิงอัตโนมัติ ตรวจ Terms of Service, robots policy (ตามความเกี่ยวข้อง), rate limits และขออนุญาตเจ้าของบริการเมื่อจำเป็น ไม่ควร bypass CAPTCHA, anti-bot หรือการควบคุมสิทธิ์

### วิธีตรวจสอบเบื้องต้น

1. เปิดเว็บ Chatbot ใน Chrome
2. กด `F12` → `Network` → `Fetch/XHR`
3. ส่งคำถามทดลอง
4. ดู request URL, method, payload, response และ header
5. ตรวจเพิ่มเติมที่แท็บ `WS` หรือ response แบบ `text/event-stream`
6. ประเมินว่าสามารถใช้ endpoint นั้นได้อย่างได้รับอนุญาตหรือไม่

ตัวอย่าง **สมมติ** ของ HTTP API:

```http
POST https://example.com/chat
Content-Type: application/json

{"message":"ข้าวใบเหลืองเกิดจากอะไร"}
```

## 4. Deploy บน Linux: วิธีไหนง่ายหรือยาก

ทุกวิธีสามารถทำบน Linux ได้ แต่ความยากและทรัพยากรต่างกัน

| วิธี | ความยากโดยประมาณ | ต้องมี Browser Engine? | เหมาะกับ |
|---|---|---|---|
| เรียก REST API โดยตรง | 1/5 | ไม่ต้อง | ตัวเลือกแรกเมื่อมี API ที่ได้รับอนุญาต |
| HTML scraping | 2/5 | ไม่จำเป็นสำหรับ static HTML | เว็บเนื้อหาคงที่ |
| SSE / WebSocket | 3/5 | ไม่ต้อง ถ้ามี protocol ที่เรียกได้โดยตรง | ระบบตอบแบบ streaming |
| Playwright | 3/5 | ต้องมี | เว็บ chat ที่ต้องโต้ตอบผ่าน UI |
| Headless browser microservice | 4/5 | ต้องมี | แยก browser automation ออกจาก Spring Boot |
| Reverse-engineer protocol ซับซ้อน | 5/5 | ขึ้นกับระบบ | กรณีเฉพาะและต้องตรวจสิทธิ์ |

- HTTP API ใช้ทรัพยากรน้อยกว่า browser automation โดยทั่วไป
- Playwright/Chromium อาจใช้ RAM หลักหลายร้อย MB ต่อ browser และสูงขึ้นตามจำนวน page/session
- ตัวเลข RAM ที่เคยกล่าวถึงเป็นเพียง **ประมาณการ** ไม่ใช่ข้อกำหนดตายตัว ต้อง benchmark บนเครื่องจริง

## 5. Playwright บน Linux ต้องเปิด Browser ไหม

**ต้องใช้ browser engine แต่ไม่จำเป็นต้องเปิดหน้าต่าง GUI**

- `headless: true`: Chromium ทำงานเบื้องหลัง ไม่มีหน้าต่าง GUI เหมาะกับ Linux Server
- `headless: false`: มีหน้าต่าง browser; บน server ที่ไม่มีจอต้องเตรียม display server เช่น Xvfb
- ไม่ต้องลง Google Chrome แบบ Desktop แยกเสมอไป เพราะ Playwright ติดตั้ง browser binary ที่รองรับได้

ติดตั้งตัวอย่าง:

```bash
npm install playwright
npx playwright install --with-deps chromium
```

ตัวอย่าง Node.js (selector เป็นตัวอย่าง ต้องปรับให้ตรงเว็บจริง):

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('https://example.com/chat');
    await page.locator('#message').fill('ข้าวใบเหลืองเกิดจากอะไร');
    await page.locator('#send').click();

    // ตัวอย่างเบื้องต้น: งานจริงควรรอจนการสร้างคำตอบเสร็จ
    const answer = await page.locator('.assistant-message').last().innerText();
    console.log(answer);
  } finally {
    await browser.close();
  }
})();
```

> `innerText()` ไม่ได้รับประกันว่า AI stream จบแล้ว ใน production ควรตรวจสถานะเสร็จสิ้นหรือเงื่อนไขเฉพาะเว็บ และตั้ง timeout/error handling

### Architecture ที่แนะนำเมื่อจำเป็นต้องใช้ Playwright

```text
Mobile App / LINE Bot
        |
        v
Spring Boot API          (Docker Container 1)
        |
        v
Node.js + Playwright     (Docker Container 2)
        |
        v
Chromium Headless
        |
        v
เว็บไซต์ AI เกษตรภายนอก
        |
        v
ส่งคำตอบกลับ Spring Boot
```

ประโยชน์ของการแยก container:
- Restart หรือ scale บริการ browser ได้แยกจาก backend
- กำหนด CPU/RAM limit, timeout และจำนวน concurrent browser sessions
- เพิ่ม queue, retry แบบระมัดระวัง, logging และ health check ได้

## 6. ข้อสรุปและลำดับการตัดสินใจ

1. **หา official API ก่อน** เพราะเสถียรและดูแลง่ายที่สุด
2. ถ้าไม่มี ให้ตรวจ Network ว่าเว็บใช้ REST, SSE หรือ WebSocket และ **ตรวจสิทธิ์การใช้งาน**
3. ถ้าไม่มี API ที่อนุญาต แต่อนุญาตให้ทำ automation ผ่าน UI ให้ทดลอง Playwright headless
4. ถ้าจะให้ผู้ใช้หลายคนใช้งาน ให้แยก Playwright เป็น microservice พร้อมจำกัด concurrency และตรวจ resource usage
5. ถ้าต้องการ production ที่ยั่งยืน ให้พิจารณา official/partner API หรือ self-host โมเดลแทนการพึ่ง UI ของเว็บบุคคลที่สาม

### ข้อมูลที่ยังต้องรู้ก่อนลงมือ

- URL ของ chatbot เกษตรเป้าหมาย
- เงื่อนไขการใช้งานและการอนุญาตให้ automate
- Linux distro, RAM/CPU, Docker หรือไม่
- จำนวนผู้ใช้พร้อมกันและปริมาณคำถามต่อวัน
- ต้องรองรับ streaming, รูปภาพ, หรือข้อความอย่างเดียว
