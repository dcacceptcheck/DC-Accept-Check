# DC Accept Check

Web App สำหรับตรวจสอบเกณฑ์การรับสินค้า โดยใช้ไฟล์ Excel `data/database.xlsx` เป็นฐานข้อมูล และคำนวณผลการส่งสินค้าเป็น Yes/No จากวันผลิต วันที่ส่งของ ห้าง และสินค้า

## วิธีใช้งานบน GitHub Pages

ให้อัปโหลดไฟล์และโฟลเดอร์ทั้งหมดนี้ขึ้น GitHub repository เดิมที่ root ของโปรเจกต์:

- `index.html`
- `style.css`
- `app.js`
- `README.md`
- `assets/`
- `data/`

ห้ามอัปโหลดทั้งโฟลเดอร์ซ้อนอีกชั้น เพราะ `index.html` ต้องอยู่หน้าแรกของ repository

## Logic การคำนวณ

- เลือกวันผลิต
- เลือกวันที่ส่งของ
- เลือกห้าง
- เลือกสินค้า
- ระบบคำนวณวันที่ไม่เกินเกณฑ์ที่ลูกค้ายอมรับจากอายุสินค้าและเกณฑ์รับสินค้า
- คืนค่า `Yes` หรือ `No`

## หมายเหตุ

App นี้เป็น Static Web App ทำงานผ่าน browser โดยตรง และเหมาะสำหรับ GitHub Pages


## Latest adjustment
- Reduced app header title font size.
- Limited desktop layout width to avoid overly wide display.
- Reduced delivery truck logo size to fit the app header.
