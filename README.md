# ตรวจสอบเกณฑ์การรับสินค้า

Web App สำหรับตรวจสอบว่า สินค้าสามารถส่ง/รับได้หรือไม่ โดยใช้ `data/database.xlsx` เป็นฐานข้อมูล และคำนวณผลลัพธ์ Yes/No จากวันผลิต วันที่ส่งของ ห้าง และสินค้า

## โครงสร้างไฟล์

```text
index.html
style.css
app.js
assets/delivery-truck.png
data/database.xlsx
```

## วิธีใช้งานบน GitHub Pages

1. แตกไฟล์ ZIP
2. Upload ไฟล์ทั้งหมดขึ้น repository เดิม โดยให้ `index.html` อยู่ที่ root ของ repo
3. Commit changes
4. รอ GitHub Pages deploy จาก branch `main` และ folder `/root`

## หมายเหตุ

- ต้องเชื่อมต่อ internet เพื่อโหลด SheetJS library สำหรับอ่าน Excel
- ถ้าเปลี่ยนฐานข้อมูล ให้แทนที่ไฟล์ `data/database.xlsx` ด้วยชื่อไฟล์เดิม
