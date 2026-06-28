const DATABASE_URL = "data/database.xlsx";
const PREFERRED_SHEET_NAME = "Sheet2";

let databaseRows = [];
let lastResults = [];

const els = {
  databaseStatus: document.getElementById("databaseStatus"),
  productionDate: document.getElementById("productionDate"),
  currentDate: document.getElementById("currentDate"),
  mallFilter: document.getElementById("mallFilter"),
  productFilter: document.getElementById("productFilter"),
  excelFile: document.getElementById("excelFile"),
  summary: document.getElementById("summary"),
  resultCaption: document.getElementById("resultCaption"),
  resultBody: document.getElementById("resultBody"),
  downloadCsv: document.getElementById("downloadCsv"),
};

document.addEventListener("DOMContentLoaded", async () => {
  els.currentDate.value = toISODateLocal(new Date());

  [els.productionDate, els.currentDate, els.mallFilter, els.productFilter].forEach((el) => {
    el.addEventListener("change", renderResults);
  });

  els.excelFile.addEventListener("change", handleManualExcelUpload);
  els.downloadCsv.addEventListener("click", downloadCsv);

  await loadExcelFromUrl(DATABASE_URL);
});

async function loadExcelFromUrl(url) {
  try {
    setStatus("กำลังโหลดฐานข้อมูล...", "");
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    parseWorkbook(buffer, "database.xlsx");
  } catch (error) {
    console.error(error);
    databaseRows = [];
    setStatus("โหลด Excel ไม่สำเร็จ: ให้เลือกไฟล์เอง", "error");
    renderResults();
  }
}

function handleManualExcelUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => parseWorkbook(e.target.result, file.name);
  reader.onerror = () => setStatus("อ่านไฟล์ไม่สำเร็จ", "error");
  reader.readAsArrayBuffer(file);
}

function parseWorkbook(arrayBuffer, fileName) {
  try {
    if (!window.XLSX) {
      throw new Error("SheetJS library is not loaded");
    }

    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames.includes(PREFERRED_SHEET_NAME)
      ? PREFERRED_SHEET_NAME
      : workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: true,
    });

    const headerRowIndex = findHeaderRow(rawRows);
    if (headerRowIndex < 0) {
      throw new Error("ไม่พบ header row ที่มีคอลัมน์ ห้าง / สินค้า / อายุสินค้า");
    }

    const headers = rawRows[headerRowIndex].map(normalizeText);
    const col = {
      mall: findColumn(headers, ["ห้าง"]),
      product: findColumn(headers, ["สินค้า"]),
      shelfLife: findColumn(headers, ["อายุสินค้า", "นับจากวันผลิต"]),
    };

    if (col.mall < 0 || col.product < 0 || col.shelfLife < 0) {
      throw new Error("รูปแบบไฟล์ Excel ไม่ตรงกับ template ที่ต้องการ");
    }

    databaseRows = rawRows
      .slice(headerRowIndex + 1)
      .map((row, index) => ({
        rowNo: headerRowIndex + index + 2,
        mall: cleanText(row[col.mall]),
        product: cleanText(row[col.product]),
        shelfLifeDays: toNumber(row[col.shelfLife]),
      }))
      .filter((row) => row.mall && row.product && Number.isFinite(row.shelfLifeDays));

    populateFilters(databaseRows);
    setStatus(`พร้อมใช้งาน: ${databaseRows.length} รายการ`, "ready");
    renderResults();
  } catch (error) {
    console.error(error);
    databaseRows = [];
    setStatus(error.message || "ประมวลผล Excel ไม่สำเร็จ", "error");
    renderResults();
  }
}

function findHeaderRow(rows) {
  return rows.findIndex((row) => {
    const text = row.map(normalizeText).join("|");
    return text.includes("ห้าง") && text.includes("สินค้า") && text.includes("อายุสินค้า");
  });
}

function findColumn(headers, keywords) {
  return headers.findIndex((header) => keywords.every((kw) => header.includes(normalizeText(kw))));
}

function populateFilters(rows) {
  const selectedMall = els.mallFilter.value;
  const selectedProduct = els.productFilter.value;

  setSelectOptions(els.mallFilter, uniqueSorted(rows.map((row) => row.mall)), "ทั้งหมด");
  setSelectOptions(els.productFilter, uniqueSorted(rows.map((row) => row.product)), "ทั้งหมด");

  if ([...els.mallFilter.options].some((option) => option.value === selectedMall)) {
    els.mallFilter.value = selectedMall;
  }
  if ([...els.productFilter.options].some((option) => option.value === selectedProduct)) {
    els.productFilter.value = selectedProduct;
  }
}

function setSelectOptions(select, values, defaultLabel) {
  select.innerHTML = `<option value="">${defaultLabel}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function renderResults() {
  if (!databaseRows.length) {
    lastResults = [];
    els.summary.innerHTML = "";
    els.resultCaption.textContent = "ยังไม่มีฐานข้อมูล Excel พร้อมใช้งาน";
    setEmptyTable("ยังไม่มีฐานข้อมูล Excel พร้อมใช้งาน");
    els.downloadCsv.disabled = true;
    return;
  }

  if (!els.productionDate.value) {
    lastResults = [];
    els.summary.innerHTML = "";
    els.resultCaption.textContent = "กรุณากรอกวันผลิตเพื่อเริ่มคำนวณ";
    setEmptyTable("กรุณากรอกวันผลิต");
    els.downloadCsv.disabled = true;
    return;
  }

  const productionDate = parseInputDate(els.productionDate.value);
  const currentDate = parseInputDate(els.currentDate.value || toISODateLocal(new Date()));
  const mall = els.mallFilter.value;
  const product = els.productFilter.value;

  const filtered = databaseRows.filter((row) => {
    return (!mall || row.mall === mall) && (!product || row.product === product);
  });

  lastResults = filtered.map((row) => {
    // Excel formula in Column E: =ROUNDDOWN(C2*0.25,0)-1
    const criteriaDays = Math.floor(row.shelfLifeDays * 0.25) - 1;
    // Excel formula in Column F: =D2+E2
    const productionPlus25 = addDays(productionDate, criteriaDays);
    // Excel formula in Column H: =IF(G2<F2,"Yes","No")
    const result = currentDate < productionPlus25 ? "Yes" : "No";

    return {
      mall: row.mall,
      product: row.product,
      shelfLifeDays: row.shelfLifeDays,
      productionDate: toISODateLocal(productionDate),
      criteriaDays,
      productionPlus25: toISODateLocal(productionPlus25),
      currentDate: toISODateLocal(currentDate),
      result,
    };
  });

  renderSummary(lastResults);
  renderTable(lastResults);
  els.resultCaption.textContent = `แสดง ${lastResults.length} รายการ จากฐานข้อมูล ${databaseRows.length} รายการ`;
  els.downloadCsv.disabled = lastResults.length === 0;
}

function renderSummary(results) {
  const yes = results.filter((row) => row.result === "Yes").length;
  const no = results.filter((row) => row.result === "No").length;
  els.summary.innerHTML = `
    <div class="summary-card">
      <div class="label">ทั้งหมด</div>
      <div class="value">${results.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Yes</div>
      <div class="value">${yes}</div>
    </div>
    <div class="summary-card">
      <div class="label">No</div>
      <div class="value">${no}</div>
    </div>
  `;
}

function renderTable(results) {
  if (!results.length) {
    setEmptyTable("ไม่พบรายการตามเงื่อนไขที่เลือก");
    return;
  }

  els.resultBody.innerHTML = results
    .map((row) => {
      const badgeClass = row.result === "Yes" ? "yes" : "no";
      return `
        <tr>
          <td>${escapeHtml(row.mall)}</td>
          <td>${escapeHtml(row.product)}</td>
          <td>${formatNumber(row.shelfLifeDays)}</td>
          <td>${row.productionDate}</td>
          <td>${formatNumber(row.criteriaDays)}</td>
          <td>${row.productionPlus25}</td>
          <td>${row.currentDate}</td>
          <td><span class="badge ${badgeClass}">${row.result}</span></td>
        </tr>
      `;
    })
    .join("");
}

function setEmptyTable(message) {
  els.resultBody.innerHTML = `<tr><td colspan="8" class="empty-state">${escapeHtml(message)}</td></tr>`;
}

function downloadCsv() {
  if (!lastResults.length) return;

  const headers = [
    "ห้าง",
    "สินค้า",
    "อายุสินค้า",
    "วันผลิต",
    "เกณฑ์รับสินค้า (วัน)",
    "วันผลิต+25%",
    "วันที่ตรวจรับ",
    "Column H",
  ];

  const lines = [
    headers.join(","),
    ...lastResults.map((row) => [
      row.mall,
      row.product,
      row.shelfLifeDays,
      row.productionDate,
      row.criteriaDays,
      row.productionPlus25,
      row.currentDate,
      row.result,
    ].map(csvEscape).join(",")),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receiving-check-${toISODateLocal(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function setStatus(text, type) {
  els.databaseStatus.textContent = text;
  els.databaseStatus.className = `status-pill ${type || ""}`.trim();
}

function parseInputDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const clone = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  clone.setDate(clone.getDate() + days);
  return clone;
}

function toISODateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeText(value) {
  return cleanText(value).replace(/\s+/g, "").toLowerCase();
}

function cleanText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function toNumber(value) {
  if (typeof value === "number") return value;
  const text = cleanText(value).replace(/,/g, "");
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
}

function formatNumber(value) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
