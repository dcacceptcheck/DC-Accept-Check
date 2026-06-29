const DATA_FILE = "data/database.xlsx";

const els = {
  productionDate: document.getElementById("productionDate"),
  productionDatePicker: document.getElementById("productionDatePicker"),
  deliveryDate: document.getElementById("deliveryDate"),
  deliveryDatePicker: document.getElementById("deliveryDatePicker"),
  mallFilter: document.getElementById("mallFilter"),
  mallList: document.getElementById("mallList"),
  productFilter: document.getElementById("productFilter"),
  productList: document.getElementById("productList"),
  resultSection: document.getElementById("resultSection"),
  resultBody: document.getElementById("resultBody"),
  formMessage: document.getElementById("formMessage"),
};

let databaseRows = [];
let mallOptions = [];
let productOptions = [];
let databaseReady = false;

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

function normalizeChoice(value) {
  return cleanText(value).toLowerCase();
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

function formatISODate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
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

function setDateField(textInput, datePicker, date) {
  textInput.value = formatDate(date);
  datePicker.value = formatISODate(date);
}

function normalizeDateField(textInput, datePicker) {
  const parsed = parseDateInput(textInput.value);
  if (parsed) {
    setDateField(textInput, datePicker, parsed);
  } else if (!textInput.value.trim()) {
    datePicker.value = "";
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

function exactChoice(value, options) {
  const normalized = normalizeChoice(value);
  return options.find((option) => normalizeChoice(option) === normalized) || "";
}

function filterChoices(query, options) {
  const normalizedQuery = normalizeChoice(query);
  if (!normalizedQuery) return options;
  return options.filter((option) => normalizeChoice(option).includes(normalizedQuery));
}

function setFormMessage(message = "", state = "") {
  els.formMessage.textContent = message;
  els.formMessage.classList.toggle("is-error", state === "error");
}

function openCombo(combo, input, list, options) {
  if (input.disabled) return;
  renderComboList(combo, input, list, options);
  combo.classList.add("is-open");
  input.setAttribute("aria-expanded", "true");
}

function closeCombo(combo, input) {
  combo.classList.remove("is-open");
  input.setAttribute("aria-expanded", "false");
}

function renderComboList(combo, input, list, options) {
  const filtered = filterChoices(input.value, options);
  list.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "combo-empty";
    empty.textContent = "ไม่พบรายการ";
    list.appendChild(empty);
    return;
  }

  filtered.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "combo-option";
    button.setAttribute("role", "option");
    button.textContent = option;
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      input.value = option;
      closeCombo(combo, input);
      if (input === els.mallFilter) {
        refreshProductOptions(true);
      }
      renderResults();
    });
    list.appendChild(button);
  });
}

function setupCombo(input, list, getOptions, onInputChange) {
  const combo = input.closest(".combo");
  const toggle = combo.querySelector(".combo-toggle");

  input.addEventListener("focus", () => openCombo(combo, input, list, getOptions()));
  input.addEventListener("input", () => {
    openCombo(combo, input, list, getOptions());
    if (onInputChange) onInputChange();
    renderResults();
  });
  input.addEventListener("blur", () => {
    window.setTimeout(() => closeCombo(combo, input), 130);
  });

  toggle.addEventListener("click", () => {
    if (combo.classList.contains("is-open")) {
      closeCombo(combo, input);
    } else {
      input.focus();
      openCombo(combo, input, list, getOptions());
    }
  });
}

function refreshFilters() {
  mallOptions = uniqueSorted(databaseRows.map((row) => row.mall));
  refreshProductOptions(false);
}

function refreshProductOptions(clearProduct) {
  const selectedMall = exactChoice(els.mallFilter.value, mallOptions);

  if (!selectedMall) {
    productOptions = [];
    els.productFilter.value = "";
    els.productFilter.disabled = true;
    els.productFilter.placeholder = "กรุณาเลือกห้างก่อน";
    els.productFilter.closest(".combo").querySelector(".combo-toggle").disabled = true;
    return;
  }

  productOptions = uniqueSorted(
    databaseRows
      .filter((row) => row.mall === selectedMall)
      .map((row) => row.product)
  );

  els.productFilter.disabled = false;
  els.productFilter.placeholder = "กรุณาเลือก";
  els.productFilter.closest(".combo").querySelector(".combo-toggle").disabled = false;

  if (clearProduct || !exactChoice(els.productFilter.value, productOptions)) {
    els.productFilter.value = "";
  }
}

function getValidation() {
  if (!databaseReady) {
    return { valid: false, message: "กำลังโหลดฐานข้อมูล..." };
  }

  const productionDateText = els.productionDate.value.trim();
  const deliveryDateText = els.deliveryDate.value.trim();
  const mallText = els.mallFilter.value.trim();
  const productText = els.productFilter.value.trim();

  if (!productionDateText || !deliveryDateText || !mallText || !productText) {
    return { valid: false, message: "กรุณากรอกข้อมูลให้ครบทั้ง 4 ค่า" };
  }

  const productionDate = parseDateInput(productionDateText);
  if (!productionDate) {
    return { valid: false, message: "รูปแบบวันผลิตไม่ถูกต้อง กรุณากรอกเป็น วัน/เดือน/ปี เช่น 01/05/2026", error: true };
  }

  const deliveryDate = parseDateInput(deliveryDateText);
  if (!deliveryDate) {
    return { valid: false, message: "รูปแบบวันที่ส่งของไม่ถูกต้อง กรุณากรอกเป็น วัน/เดือน/ปี เช่น 29/06/2026", error: true };
  }

  const mall = exactChoice(mallText, mallOptions);
  if (!mall) {
    return { valid: false, message: "กรุณาเลือกห้างจากรายการ", error: true };
  }

  refreshProductOptions(false);

  const product = exactChoice(productText, productOptions);
  if (!product) {
    return { valid: false, message: "กรุณาเลือกสินค้าจากรายการ", error: true };
  }

  return { valid: true, productionDate, deliveryDate, mall, product };
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
  const validation = getValidation();

  if (!validation.valid) {
    els.resultSection.classList.add("is-hidden");
    els.resultBody.innerHTML = "";
    setFormMessage(validation.message, validation.error ? "error" : "");
    return;
  }

  setFormMessage("");
  els.resultSection.classList.remove("is-hidden");
  els.resultBody.innerHTML = "";

  const rows = databaseRows.filter((row) => row.mall === validation.mall && row.product === validation.product);

  if (!rows.length) {
    els.resultSection.classList.add("is-hidden");
    setFormMessage("ไม่พบข้อมูลที่ตรงกับตัวกรอง", "error");
    return;
  }

  rows.forEach((row) => {
    const acceptedUntil = addDays(validation.productionDate, row.criteriaDays);
    const result = validation.deliveryDate < acceptedUntil ? "Yes" : "No";

    const tr = document.createElement("tr");
    tr.appendChild(createCell("ส่ง?", createBadge(result)));
    tr.appendChild(createCell("ห้าง", row.mall));
    tr.appendChild(createCell("สินค้า", row.product));
    tr.appendChild(createCell("อายุสินค้า", `${row.shelfLifeDays.toLocaleString("th-TH")} วัน`));
    tr.appendChild(createCell("วันผลิต", formatDate(validation.productionDate)));
    tr.appendChild(createCell("เกณฑ์รับสินค้า (วัน)", `${row.criteriaDays.toLocaleString("th-TH")} วัน`));
    tr.appendChild(createCell("วันที่ไม่เกินเกณฑ์ที่ลูกค้ายอมรับ", formatDate(acceptedUntil)));
    tr.appendChild(createCell("วันที่ส่งของ", formatDate(validation.deliveryDate)));
    els.resultBody.appendChild(tr);
  });
}

async function loadDatabase() {
  try {
    setFormMessage("กำลังโหลดฐานข้อมูล...");

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

    databaseReady = true;
    refreshFilters();
    renderResults();
  } catch (error) {
    console.error(error);
    databaseReady = false;
    els.resultSection.classList.add("is-hidden");
    setFormMessage(error.message || "โหลดฐานข้อมูลไม่สำเร็จ", "error");
  }
}

function bindDateField(textInput, datePicker) {
  textInput.addEventListener("blur", () => {
    normalizeDateField(textInput, datePicker);
    renderResults();
  });

  textInput.addEventListener("input", () => {
    const parsed = parseDateInput(textInput.value);
    datePicker.value = parsed ? formatISODate(parsed) : "";
    renderResults();
  });

  datePicker.addEventListener("change", () => {
    const parsed = parseDateInput(datePicker.value);
    if (parsed) {
      setDateField(textInput, datePicker, parsed);
    }
    renderResults();
  });
}

function bindEvents() {
  bindDateField(els.productionDate, els.productionDatePicker);
  bindDateField(els.deliveryDate, els.deliveryDatePicker);

  setupCombo(
    els.mallFilter,
    els.mallList,
    () => mallOptions,
    () => refreshProductOptions(true)
  );

  setupCombo(
    els.productFilter,
    els.productList,
    () => productOptions,
    null
  );

  document.addEventListener("click", (event) => {
    document.querySelectorAll(".combo.is-open").forEach((combo) => {
      if (!combo.contains(event.target)) {
        const input = combo.querySelector("input");
        closeCombo(combo, input);
      }
    });
  });
}

function init() {
  setDateField(els.deliveryDate, els.deliveryDatePicker, todayDateOnly());
  bindEvents();
  loadDatabase();
}

document.addEventListener("DOMContentLoaded", init);
