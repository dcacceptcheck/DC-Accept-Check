# Receiving Check App

Web application แบบไม่ต้องมี server สำหรับตรวจสอบเกณฑ์การรับสินค้า โดยใช้ไฟล์ Excel เป็นฐานข้อมูล

## โครงสร้างไฟล์

```text
receiving-check-app/
├── index.html
├── style.css
├── app.js
└── data/
    └── database.xlsx
```

## วิธีคำนวณ

ระบบอ่านคอลัมน์ A-C จาก Excel:

- A = ห้าง
- B = สินค้า
- C = อายุสินค้า (นับจากวันผลิต)

จากนั้นให้ user กรอกวันผลิต และคำนวณเหมือน Excel:

```text
Column E = ROUNDDOWN(C * 0.25, 0) - 1
Column F = วันผลิต + Column E
Column G = วันที่ตรวจรับ / วันที่ปัจจุบัน
Column H = IF(G < F, "Yes", "No")
```

## วิธี Run บนเครื่องฟรี

เปิด terminal ที่โฟลเดอร์ `receiving-check-app` แล้วรัน:

```bash
python -m http.server 8000
```

จากนั้นเปิด browser:

```text
http://localhost:8000
```

มือถือที่อยู่ Wi-Fi เดียวกันสามารถเข้าได้ด้วย IP เครื่องคอมพิวเตอร์ เช่น:

```text
http://192.168.1.20:8000
```

## วิธี Deploy ฟรีสำหรับ external user

นำทั้งโฟลเดอร์ขึ้น GitHub Pages, Netlify หรือ static hosting อื่น ๆ แล้วส่ง URL ให้ user ใช้งานผ่าน browser ได้ทันที

> หมายเหตุ: ถ้า deploy แบบ public static hosting ไฟล์ `data/database.xlsx` จะถูกเปิดอ่านได้โดยคนที่เข้าถึง URL ดังนั้นไม่ควรใช้กับข้อมูลลับโดยไม่มีระบบ Authentication

## เปลี่ยนฐานข้อมูล Excel

แทนที่ไฟล์:

```text
data/database.xlsx
```

โดยต้องคงรูปแบบ header อย่างน้อย 3 คอลัมน์นี้:

```text
ห้าง | สินค้า | อายุสินค้า (นับจากวันผลิต)
```
