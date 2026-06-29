const DATA_FILE = "data/database.xlsx";

const els = {
  databaseStatus: document.getElementById("databaseStatus"),
  productionDate: document.getElementById("productionDate"),
  deliveryDate: document.getElementById("deliveryDate"),
  mallFilter: document.getElementById("mallFilter"),
  productFilter: document.getElementById("productFilter"),
  resultBody: document.getElementById("resultBody"),
  resultCaption: document.getElementById("resultCaption"),
};

let databaseRows = [];
let currentProducts = [];

function toArabicDigits(value) {
  const thai = "๐๑๒๓๔๕๖๗๘๙";
  return String(value ?? "").replace(/[๐-๙]/g, (digit) => String(thai.indexOf(digit)));
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHeader(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, "");
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = toArabicDigits(value).replace(/,/g, "").trim();
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function todayDateOnly() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDateInput(value) {
  const text = toArabicDigits(value).trim();
  if (!text) return null;

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const dashMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const compactMatch = text.match(/^(\d{2})(\d{2})(\d{4})$/);

  let day;
  let month;
  let year;

  if (slashMatch) {
    day = Number(slashMatch[1]);
    month = Number(slashMatch[2]);
    year = Number(slashMatch[3]);
  } else if (dashMatch) {
    year = Number(dashMatch[1]);
    month = Number(dashMatch[2]);
    day = Number(dashMatch[3]);
  } else if (compactMatch) {
    day = Number(compactMatch[1]);
    month = Number(compactMatch[2]);
    year = Number(compactMatch[3]);
  } else {
    return null;
  }

  const date = new Date(year, month - 1, day);
  const isValid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isValid ? date : null;
}

function normalizeDateField(input) {
  const parsed = parseDateInput(input.value);
  if (parsed) {
    input.value = formatDate(parsed);
  }
}

function addDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + Number(days));
  return result;
}

function findValueByExact(row, headers) {
  const wanted = headers.map(normalizeHeader);
  const key = Object.keys(row).find((candidate) => wanted.includes(normalizeHeader(candidate)));
  return key ? row[key] : undefined;
}

function findValueByContains(row, includeTerms, excludeTerms = []) {
  const include = includeTerms.map(normalizeHeader);
  const exclude = excludeTerms.map(normalizeHeader);

  const key = Object.keys(row).find((candidate) => {
    const normalized = normalizeHeader(candidate);
    return include.every((term) => normalized.includes(term)) && !exclude.some((term) => normalized.includes(term));
  });

  return key ? row[key] : undefined;
}

function readRow(row) {
  const mall = cleanText(findValueByExact(row, ["ห้าง"]) ?? findValueByContains(row, ["ห้าง"]));
  const product = cleanText(findValueByExact(row, ["สินค้า"]) ?? findValueByContains(row, ["สินค้า"]));
  const shelfLifeDays = toNumber(
    findValueByExact(row, ["อายุสินค้า", "อายุสินค้า (นับจากวันผลิต)"]) ??
    findValueByContains(row, ["อายุสินค้า"])
  );

  const criteriaDaysFromFile = toNumber(
    findValueByContains(row, ["เกณฑ์", "กี่วัน"]) ??
    findValueByContains(row, ["ต้องไม่เกินกี่วัน"])
  );

  const criteriaPercent = toNumber(
    findValueByContains(row, ["เกณฑ์", "%"]) ??
    findValueByContains(row, ["กี่%"])
  );

  let criteriaDays = criteriaDaysFromFile;
  if (criteriaDays === null && shelfLifeDays !== null && criteriaPercent !== null) {
    criteriaDays = Math.floor(shelfLifeDays * criteriaPercent) - 1;
  }
  if (criteriaDays === null && shelfLifeDays !== null) {
    criteriaDays = Math.floor(shelfLifeDays * 0.25) - 1;
  }

  if (!mall || !product || shelfLifeDays === null || criteriaDays === null) return null;

  return {
    mall,
    product,
    shelfLifeDays,
    criteriaDays,
  };
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
}

function setSelectOptions(select, values, firstLabel = "ทั้งหมด") {
  const selected = select.value;
  select.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = firstLabel;
  select.appendChild(first);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (values.includes(selected)) {
    select.value = selected;
  }
}

function refreshFilters() {
  const malls = uniqueSorted(databaseRows.map((row) => row.mall));
  setSelectOptions(els.mallFilter, malls);
  refreshProductFilter();
}

function refreshProductFilter() {
  const mall = els.mallFilter.value;
  currentProducts = uniqueSorted(
    databaseRows
      .filter((row) => !mall || row.mall === mall)
      .map((row) => row.product)
  );
  setSelectOptions(els.productFilter, currentProducts);
}

function getFilteredRows() {
  const mall = els.mallFilter.value;
  const product = els.productFilter.value;

  return databaseRows.filter((row) => {
    if (mall && row.mall !== mall) return false;
    if (product && row.product !== product) return false;
    return true;
  });
}

function setStatus(text, state = "") {
  els.databaseStatus.textContent = text;
  els.databaseStatus.classList.remove("is-ready", "is-error");
  if (state) els.databaseStatus.classList.add(state);
}

function emptyResult(message) {
  els.resultBody.innerHTML = `<tr><td colspan="8" class="empty-state">${message}</td></tr>`;
}

function createCell(label, value, extraClass = "") {
  const cell = document.createElement("td");
  cell.setAttribute("data-label", label);
  if (extraClass) cell.className = extraClass;

  if (value instanceof Node) {
    cell.appendChild(value);
  } else {
    cell.textContent = value;
  }

  return cell;
}

function createBadge(result) {
  const badge = document.createElement("span");
  const normalized = result === "Yes" ? "yes" : "no";
  badge.className = `badge ${normalized}`;
  badge.textContent = result;
  return badge;
}

function renderResults() {
  if (!databaseRows.length) {
    els.resultCaption.textContent = "ยังไม่พบข้อมูลในฐานข้อมูล";
    emptyResult("ยังไม่พบข้อมูลในฐานข้อมูล");
    return;
  }

  const productionDate = parseDateInput(els.productionDate.value);
  const deliveryDate = parseDateInput(els.deliveryDate.value);

  if (!els.productionDate.value.trim()) {
    els.resultCaption.textContent = "กรุณากรอกวันผลิตเพื่อเริ่มคำนวณ";
    emptyResult("ยังไม่มีผลลัพธ์");
    return;
  }

  if (!productionDate) {
    els.resultCaption.textContent = "รูปแบบวันผลิตไม่ถูกต้อง กรุณากรอกเป็น วัน/เดือน/ปี เช่น 01/05/2026";
    emptyResult("กรุณาตรวจสอบรูปแบบวันผลิต");
    return;
  }

  if (!deliveryDate) {
    els.resultCaption.textContent = "รูปแบบวันที่ส่งของไม่ถูกต้อง กรุณากรอกเป็น วัน/เดือน/ปี เช่น 28/06/2026";
    emptyResult("กรุณาตรวจสอบรูปแบบวันที่ส่งของ");
    return;
  }

  const rows = getFilteredRows();
  if (!rows.length) {
    els.resultCaption.textContent = "ไม่พบข้อมูลที่ตรงกับตัวกรอง";
    emptyResult("ไม่พบข้อมูลที่ตรงกับตัวกรอง");
    return;
  }

  els.resultBody.innerHTML = "";

  let yesCount = 0;
  rows.forEach((row) => {
    const acceptedUntil = addDays(productionDate, row.criteriaDays);
    const result = deliveryDate < acceptedUntil ? "Yes" : "No";
    if (result === "Yes") yesCount += 1;

    const tr = document.createElement("tr");
    tr.appendChild(createCell("ส่ง?", createBadge(result)));
    tr.appendChild(createCell("ห้าง", row.mall));
    tr.appendChild(createCell("สินค้า", row.product));
    tr.appendChild(createCell("อายุสินค้า", `${row.shelfLifeDays.toLocaleString("th-TH")} วัน`));
    tr.appendChild(createCell("วันผลิต", formatDate(productionDate)));
    tr.appendChild(createCell("เกณฑ์รับสินค้า (วัน)", `${row.criteriaDays.toLocaleString("th-TH")} วัน`));
    tr.appendChild(createCell("วันที่ไม่เกินเกณฑ์ที่ลูกค้ายอมรับ", formatDate(acceptedUntil)));
    tr.appendChild(createCell("วันที่ส่งของ", formatDate(deliveryDate)));
    els.resultBody.appendChild(tr);
  });

  const noCount = rows.length - yesCount;
  els.resultCaption.textContent = `พบ ${rows.length.toLocaleString("th-TH")} รายการ | Yes ${yesCount.toLocaleString("th-TH")} รายการ | No ${noCount.toLocaleString("th-TH")} รายการ`;
}

async function loadDatabase() {
  try {
    if (!window.XLSX) {
      throw new Error("ไม่สามารถโหลด XLSX library ได้ กรุณาตรวจสอบ internet connection");
    }

    const response = await fetch(DATA_FILE, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`โหลดไฟล์ฐานข้อมูลไม่สำเร็จ (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: false });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });

    databaseRows = rawRows.map(readRow).filter(Boolean);

    if (!databaseRows.length) {
      throw new Error("ไม่พบ row ที่อ่านได้จาก Excel กรุณาตรวจสอบ header ของไฟล์ database.xlsx");
    }

    setStatus(`โหลดฐานข้อมูลแล้ว ${databaseRows.length.toLocaleString("th-TH")} รายการ`, "is-ready");
    refreshFilters();
    renderResults();
  } catch (error) {
    console.error(error);
    setStatus("โหลดฐานข้อมูลไม่สำเร็จ", "is-error");
    els.resultCaption.textContent = error.message || "โหลดฐานข้อมูลไม่สำเร็จ";
    emptyResult("โหลดฐานข้อมูลไม่สำเร็จ");
  }
}

function bindEvents() {
  [els.productionDate, els.deliveryDate].forEach((input) => {
    input.addEventListener("blur", () => {
      normalizeDateField(input);
      renderResults();
    });
    input.addEventListener("input", renderResults);
  });

  els.mallFilter.addEventListener("change", () => {
    refreshProductFilter();
    renderResults();
  });

  els.productFilter.addEventListener("change", renderResults);
}

function init() {
  els.deliveryDate.value = formatDate(todayDateOnly());
  bindEvents();
  loadDatabase();
}

document.addEventListener("DOMContentLoaded", init);
