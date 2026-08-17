(function () {
  "use strict";

  const canvas = document.getElementById("posterCanvas");
  const ctx = canvas.getContext("2d");
  const tableEditor = document.getElementById("tableEditor");
  const toast = document.getElementById("toast");
  const defaultBackground = "./assets/factory-aerial.png";
  const defaultState = {
    badgeText: "附件",
    titleText: "2026年江苏省先进级智能工厂拟入选公示名单",
    titleSize: 48,
    titleFont: "yahei",
    titlePositionX: 816,
    titlePositionY: 119,
    headerColor: "#0c4ca2",
    accentColor: "#0c4ca2",
    imageOpacity: 72,
    backgroundOffsetX: 8,
    backgroundOffsetY: 353,
    backgroundScale: 89,
    positionTarget: "background",
    backgroundSrc: defaultBackground,
    backgroundName: "factory-aerial.png",
    headers: ["序号", "企业名称", "工厂名称"],
    columnWidths: [14, 43, 43],
    columnAlignments: ["center", "left", "left"],
    rows: [
      ["638", "通鼎互联信息股份有限公司", "全流程数智集成的光电线缆全产业链智能工厂"],
      ["825", "江苏通鼎光电科技有限公司", "基于数智驱动的轨道交通装备智能制造工厂"],
      ["880", "江苏通鼎宽带有限公司", "智联通信系统智能工厂"]
    ]
  };

  const state = clone(defaultState);
  let backgroundImage = null;
  let toastTimer = null;
  let dragSession = null;
  let columnResizeSession = null;

  const iconPaths = {
    plus: '<path d="M8 2v12M2 8h12" />',
    download: '<path d="M8 2v8M4.5 7.5 8 11l3.5-3.5M3 14h10" />',
    upload: '<path d="M8 10V2M4.5 5.5 8 2l3.5 3.5M3 10.5V14h10v-3.5" />',
    rotate: '<path d="M3.2 6.2A5.2 5.2 0 1 1 3 9M3.2 2.8v3.4h3.4" />',
    chevron: '<path d="m3 6 5 5 5-5" />',
    trash: '<path d="M3 4.5h10M6 4.5V3h4v1.5M4.5 4.5l.6 9h5.8l.6-9M6.5 7v4M9.5 7v4" />',
    image: '<rect x="2" y="2" width="12" height="12" rx="1"/><circle cx="5.5" cy="5.5" r="1"/><path d="m3 12 3.5-3.5 2.2 2.2 1.6-1.6L13 12.8" />',
    type: '<path d="M3 3h10M8 3v10M5 13h6" />',
    crosshair: '<circle cx="8" cy="8" r="4"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2" />',
    alignLeft: '<path d="M2 3h9M2 6h7M2 9h9M2 12h6" />',
    alignCenter: '<path d="M3 3h10M5 6h6M3 9h10M5 12h6" />',
    alignRight: '<path d="M5 3h9M7 6h7M5 9h9M8 12h6" />'
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function icon(name) {
    return '<svg viewBox="0 0 16 16" aria-hidden="true">' + (iconPaths[name] || "") + "</svg>";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const normalized = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
    const number = Number.parseInt(normalized, 16);
    const red = (number >> 16) & 255;
    const green = (number >> 8) & 255;
    const blue = number & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function setValue(id, value) {
    const control = document.getElementById(id);
    if (control) control.value = value;
  }

  function updateOutputs() {
    document.getElementById("titleSizeOutput").textContent = `${state.titleSize} px`;
    document.getElementById("imageOpacityOutput").textContent = `${state.imageOpacity}%`;
    document.getElementById("backgroundOffsetXOutput").textContent = `${Math.round(state.backgroundOffsetX)} px`;
    document.getElementById("backgroundOffsetYOutput").textContent = `${Math.round(state.backgroundOffsetY)} px`;
    document.getElementById("backgroundScaleOutput").textContent = `${Math.round(state.backgroundScale)}%`;
    document.getElementById("headerColorOutput").textContent = state.headerColor.toUpperCase();
    document.getElementById("accentColorOutput").textContent = state.accentColor.toUpperCase();
    document.getElementById("tableSummary").textContent = `${state.headers.length} 列 · ${state.rows.length} 行`;
    document.getElementById("canvasStats").textContent = `${state.headers.length} 列 · ${state.rows.length} 行`;
    document.getElementById("backgroundName").textContent = state.backgroundName;
    updateColumnWidthSummary();
    updatePositionControls();
  }

  function hydrateControls() {
    setValue("badgeText", state.badgeText);
    setValue("titleText", state.titleText);
    setValue("titleSize", state.titleSize);
    setValue("titleFont", state.titleFont);
    setValue("headerColor", state.headerColor);
    setValue("accentColor", state.accentColor);
    setValue("imageOpacity", state.imageOpacity);
    setValue("backgroundOffsetX", state.backgroundOffsetX);
    setValue("backgroundOffsetY", state.backgroundOffsetY);
    setValue("backgroundScale", state.backgroundScale);
    setValue("backgroundScaleNumber", state.backgroundScale);
    updateOutputs();
  }

  function updatePositionControls() {
    const isTitle = state.positionTarget === "title";
    const targetName = isTitle ? "标题" : "背景图";
    const readout = isTitle
      ? `横向 ${Math.round((state.titlePositionX / canvas.width) * 100)}% / 纵向 ${Math.round(state.titlePositionY)} px`
      : `偏移 X ${Math.round(state.backgroundOffsetX)} px / Y ${Math.round(state.backgroundOffsetY)} px`;
    const targetOutput = document.getElementById("positionTargetOutput");
    const positionReadout = document.getElementById("positionReadout");
    if (targetOutput) targetOutput.textContent = targetName;
    if (positionReadout) positionReadout.textContent = readout;
    document.querySelectorAll("[data-action='select-position-target']").forEach((button) => {
      const active = button.dataset.positionTarget === state.positionTarget;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    canvas.dataset.dragTarget = state.positionTarget;
  }

  function getTitleFontFamily() {
    const families = {
      songti: '"Songti SC", "SimSun", "STSong", serif',
      yahei: '"Microsoft YaHei", "PingFang SC", sans-serif',
      heiti: '"SimHei", "STHeiti", "Heiti SC", "Microsoft YaHei", sans-serif',
      kaiti: '"KaiTi", "STKaiti", "楷体", serif',
      fangsong: '"FangSong", "STFangsong", "仿宋", serif'
    };
    return families[state.titleFont] || families.songti;
  }

  function getTitleMetrics() {
    const titleFamily = getTitleFontFamily();
    const titleLines = String(state.titleText || "").split("\n").slice(0, 2);
    const titleWidth = canvas.width - 360;
    let titleSize = clamp(Number(state.titleSize) || 48, 30, 72);
    titleLines.forEach((line) => {
      titleSize = Math.min(titleSize, fittedFont(line, titleWidth, titleSize, titleFamily, 700));
    });
    return {
      titleFamily,
      titleLines,
      titleSize,
      titleLineHeight: titleSize * 1.24,
      titleTop: state.titlePositionY,
      titleX: state.titlePositionX
    };
  }

  function renderTableEditor() {
    const widths = getColumnWidths();
    const gridTemplate = `44px ${widths.map((width) => `minmax(112px, ${width}fr)`).join(" ")} 30px`;
    tableEditor.innerHTML = `
      <div class="matrix-scroller">
        <div class="matrix-grid" style="grid-template-columns: ${gridTemplate}">
          <div class="matrix-corner is-header">表头</div>
          ${state.headers.map((header, columnIndex) => `
            <div class="matrix-cell is-header">
              <input type="text" value="${escapeHtml(header)}" data-cell-type="header" data-column-index="${columnIndex}" aria-label="第 ${columnIndex + 1} 列表头" />
              ${columnIndex < state.headers.length - 1 ? `<span class="matrix-column-resizer" data-column-index="${columnIndex}" aria-hidden="true"></span>` : ""}
              <button class="cell-remove" type="button" data-action="remove-column" data-column-index="${columnIndex}" title="删除第 ${columnIndex + 1} 列" aria-label="删除第 ${columnIndex + 1} 列">
                <span class="button-icon" data-icon="trash" aria-hidden="true">${icon("trash")}</span>
              </button>
            </div>
          `).join("")}
          <div class="matrix-endcap"></div>
          ${state.rows.map((row, rowIndex) => `
            <div class="matrix-corner">${String(rowIndex + 1).padStart(2, "0")}</div>
            ${state.headers.map((_, columnIndex) => `
              <div class="matrix-cell">
                <input type="text" value="${escapeHtml(row[columnIndex] ?? "")}" data-cell-type="body" data-row-index="${rowIndex}" data-column-index="${columnIndex}" aria-label="第 ${rowIndex + 1} 行第 ${columnIndex + 1} 列" />
              </div>
            `).join("")}
            <div class="matrix-cell matrix-endcap">
              <button class="cell-remove" type="button" data-action="remove-row" data-row-index="${rowIndex}" title="删除第 ${rowIndex + 1} 行" aria-label="删除第 ${rowIndex + 1} 行">
                <span class="button-icon" data-icon="trash" aria-hidden="true">${icon("trash")}</span>
              </button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    renderColumnControls();
    bindColumnResizers();
  }

  function normalizeColumnWidths(widths, count) {
    const fallback = Array(count).fill(100 / Math.max(count, 1));
    const source = Array.isArray(widths) ? widths.slice(0, count) : fallback;
    while (source.length < count) source.push(100 / Math.max(count, 1));
    const safe = source.map((width) => Math.max(5, Number(width) || 0));
    const total = safe.reduce((sum, width) => sum + width, 0) || 100;
    return safe.map((width) => (width / total) * 100);
  }

  function getColumnWidths() {
    state.columnWidths = normalizeColumnWidths(state.columnWidths, state.headers.length);
    return state.columnWidths;
  }

  function getColumnAlignment(columnIndex) {
    const value = state.columnAlignments && state.columnAlignments[columnIndex];
    return ["left", "center", "right"].includes(value) ? value : "left";
  }

  function updateColumnWidthSummary() {
    const summary = document.getElementById("columnWidthSummary");
    if (!summary) return;
    const widths = getColumnWidths();
    summary.textContent = `拖动表头边界 · 宽度总和 ${Math.round(widths.reduce((sum, width) => sum + width, 0))}%`;
  }

  function updateColumnControlNames() {
    document.querySelectorAll(".column-control-name").forEach((nameElement, columnIndex) => {
      const header = state.headers[columnIndex] || `列 ${columnIndex + 1}`;
      nameElement.textContent = header;
      nameElement.title = header;
    });
  }

  function renderColumnControls() {
    const controls = document.getElementById("columnControls");
    if (!controls) return;
    const widths = getColumnWidths();
    controls.innerHTML = state.headers.map((header, columnIndex) => {
      const alignment = getColumnAlignment(columnIndex);
      return `
        <div class="column-control-row">
          <span class="column-control-index">${String(columnIndex + 1).padStart(2, "0")}</span>
          <span class="column-control-name" title="${escapeHtml(header)}">${escapeHtml(header || `列 ${columnIndex + 1}`)}</span>
          <input class="column-width-input" type="number" min="5" max="90" step="1" value="${Math.round(widths[columnIndex])}" data-column-width-index="${columnIndex}" aria-label="第 ${columnIndex + 1} 列宽度百分比" />
          <div class="column-align-control" role="group" aria-label="第 ${columnIndex + 1} 列正文对齐方式">
            <button class="column-align-button${alignment === "left" ? " is-active" : ""}" type="button" data-action="set-column-align" data-column-index="${columnIndex}" data-align="left" aria-label="第 ${columnIndex + 1} 列左对齐" aria-pressed="${alignment === "left"}"><span class="button-icon" data-icon="alignLeft" aria-hidden="true">${icon("alignLeft")}</span></button>
            <button class="column-align-button${alignment === "center" ? " is-active" : ""}" type="button" data-action="set-column-align" data-column-index="${columnIndex}" data-align="center" aria-label="第 ${columnIndex + 1} 列居中" aria-pressed="${alignment === "center"}"><span class="button-icon" data-icon="alignCenter" aria-hidden="true">${icon("alignCenter")}</span></button>
            <button class="column-align-button${alignment === "right" ? " is-active" : ""}" type="button" data-action="set-column-align" data-column-index="${columnIndex}" data-align="right" aria-label="第 ${columnIndex + 1} 列右对齐" aria-pressed="${alignment === "right"}"><span class="button-icon" data-icon="alignRight" aria-hidden="true">${icon("alignRight")}</span></button>
          </div>
        </div>
      `;
    }).join("");
  }

  function applyColumnWidthsToEditor(preserveInput) {
    const grid = tableEditor.querySelector(".matrix-grid");
    if (grid) {
      const widths = getColumnWidths();
      grid.style.gridTemplateColumns = `44px ${widths.map((width) => `minmax(112px, ${width}fr)`).join(" ")} 30px`;
      tableEditor.querySelectorAll(".column-width-input").forEach((input) => {
        if (input !== preserveInput) {
          input.value = Math.round(widths[Number(input.dataset.columnWidthIndex)]);
        }
      });
    }
    updateColumnWidthSummary();
  }

  function setColumnWidth(columnIndex, requestedWidth) {
    const widths = getColumnWidths();
    if (widths.length <= 1) return;
    const currentWidth = widths[columnIndex];
    const nextWidth = clamp(Number(requestedWidth) || currentWidth, 5, 90);
    const otherTotal = 100 - currentWidth;
    const nextOtherTotal = 100 - nextWidth;
    state.columnWidths = widths.map((width, index) => {
      if (index === columnIndex) return nextWidth;
      return otherTotal > 0 ? (width / otherTotal) * nextOtherTotal : nextOtherTotal / (widths.length - 1);
    });
    state.columnWidths = normalizeColumnWidths(state.columnWidths, state.headers.length);
  }

  function bindColumnResizers() {
    tableEditor.querySelectorAll(".matrix-column-resizer").forEach((resizer) => {
      resizer.addEventListener("pointerdown", beginColumnResize);
    });
  }

  function beginColumnResize(event) {
    if (event.button !== 0) return;
    const columnIndex = Number(event.currentTarget.dataset.columnIndex);
    const headers = Array.from(tableEditor.querySelectorAll(".matrix-cell.is-header"));
    const currentCell = headers[columnIndex];
    const nextCell = headers[columnIndex + 1];
    if (!currentCell || !nextCell) return;
    const totalWidth = headers.reduce((sum, cell) => sum + cell.getBoundingClientRect().width, 0);
    columnResizeSession = {
      pointerId: event.pointerId,
      columnIndex,
      startX: event.clientX,
      startWidth: currentCell.getBoundingClientRect().width,
      totalWidth,
      pairWidth: currentCell.getBoundingClientRect().width + nextCell.getBoundingClientRect().width,
      resizer: event.currentTarget
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("is-dragging");
    event.preventDefault();
  }

  function moveColumnResize(event) {
    if (!columnResizeSession || event.pointerId !== columnResizeSession.pointerId) return;
    const session = columnResizeSession;
    const delta = event.clientX - session.startX;
    const nextPixelWidth = clamp(session.startWidth + delta, 36, session.pairWidth - 36);
    const pairPercent = ((session.pairWidth / session.totalWidth) * 100);
    const nextPercent = (nextPixelWidth / session.totalWidth) * 100;
    const widths = getColumnWidths().slice();
    widths[session.columnIndex] = nextPercent;
    widths[session.columnIndex + 1] = Math.max(5, pairPercent - nextPercent);
    state.columnWidths = normalizeColumnWidths(widths, state.headers.length);
    applyColumnWidthsToEditor();
    renderPoster();
    event.preventDefault();
  }

  function endColumnResize(event) {
    if (!columnResizeSession || event.pointerId !== columnResizeSession.pointerId) return;
    const resizer = columnResizeSession.resizer;
    if (resizer.hasPointerCapture(event.pointerId)) resizer.releasePointerCapture(event.pointerId);
    resizer.classList.remove("is-dragging");
    columnResizeSession = null;
  }

  function loadBackground(src, name, resetPlacement) {
    const image = new Image();
    image.onload = function () {
      backgroundImage = image;
      state.backgroundSrc = src;
      state.backgroundName = name;
      if (resetPlacement) {
        state.backgroundOffsetX = defaultState.backgroundOffsetX;
        state.backgroundOffsetY = defaultState.backgroundOffsetY;
        state.backgroundScale = defaultState.backgroundScale;
      }
      updateOutputs();
      renderPoster();
    };
    image.onerror = function () {
      showToast("背景图片读取失败，请重新选择图片");
    };
    image.src = src;
  }

  function getBackgroundLayout(image) {
    const width = canvas.width;
    const height = canvas.height;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * (state.backgroundScale / 100);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const centeredX = (width - drawWidth) / 2;
    const centeredY = (height - drawHeight) / 2;
    const x = centeredX + state.backgroundOffsetX;
    const y = centeredY + state.backgroundOffsetY;
    return { drawWidth, drawHeight, x, y };
  }

  function drawCoverImage(image, opacity) {
    const layout = getBackgroundLayout(image);
    ctx.save();
    ctx.globalAlpha = opacity / 100;
    ctx.drawImage(image, layout.x, layout.y, layout.drawWidth, layout.drawHeight);
    ctx.restore();
  }

  function wrapText(text, font, maxWidth, maxLines) {
    const source = String(text ?? "").split("\n");
    ctx.font = font;
    const lines = [];
    source.forEach((part) => {
      let current = "";
      Array.from(part || " ").forEach((character) => {
        const candidate = current + character;
        if (current && ctx.measureText(candidate).width > maxWidth) {
          lines.push(current);
          current = character;
        } else {
          current = candidate;
        }
      });
      if (current) lines.push(current);
    });
    if (!lines.length) lines.push("");
    if (lines.length <= maxLines) return lines;
    const visible = lines.slice(0, maxLines);
    let last = visible[maxLines - 1];
    while (last.length && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    visible[maxLines - 1] = `${last}…`;
    return visible;
  }

  function drawCellText(text, x, y, width, height, options) {
    const weight = options.weight || 500;
    let fontSize = options.fontSize;
    const family = options.family || '"Microsoft YaHei", "PingFang SC", sans-serif';
    const align = options.align || "left";
    const padding = options.padding ?? 18;
    const maxWidth = Math.max(20, width - padding * 2);
    let lines = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const font = `${weight} ${fontSize}px ${family}`;
      lines = wrapText(text, font, maxWidth, 2);
      if (lines.every((line) => ctx.measureText(line).width <= maxWidth)) break;
      fontSize -= 1;
    }
    const lineHeight = Math.max(18, fontSize * 1.25);
    const totalHeight = lines.length * lineHeight;
    const firstBaseline = y + (height - totalHeight) / 2 + fontSize;
    ctx.save();
    ctx.font = `${weight} ${fontSize}px ${family}`;
    ctx.fillStyle = options.color;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    const textX =
      align === "center"
        ? x + width / 2
        : align === "right"
          ? x + width - padding
          : x + padding;
    lines.forEach((line, index) => {
      ctx.fillText(line, textX, firstBaseline + index * lineHeight);
    });
    ctx.restore();
  }

  function fittedFont(text, maxWidth, startSize, family, weight) {
    let size = startSize;
    ctx.font = `${weight} ${size}px ${family}`;
    while (size > 24 && ctx.measureText(text).width > maxWidth) {
      size -= 1;
      ctx.font = `${weight} ${size}px ${family}`;
    }
    return size;
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawRibbon() {
    const y = 34;
    const height = 55;
    const width = 242;
    ctx.save();
    ctx.fillStyle = state.accentColor;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.lineTo(width - 36, y + height / 2);
    ctx.lineTo(width, y + height);
    ctx.lineTo(0, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hexToRgba("#061e49", 0.26);
    ctx.beginPath();
    ctx.moveTo(width - 70, y);
    ctx.lineTo(width, y);
    ctx.lineTo(width - 36, y + height / 2);
    ctx.lineTo(width - 70, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.font = '700 29px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(state.badgeText || "附件", 46, y + height / 2 + 1);
    ctx.restore();
  }

  function drawTitle() {
    const metrics = getTitleMetrics();
    ctx.save();
    ctx.fillStyle = state.accentColor;
    ctx.font = `700 ${metrics.titleSize}px ${metrics.titleFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    metrics.titleLines.forEach((line, index) => {
      ctx.fillText(line || " ", metrics.titleX, metrics.titleTop + index * metrics.titleLineHeight);
    });
    ctx.restore();
    return metrics;
  }

  function drawDivider(y) {
    const left = 146;
    const right = canvas.width - 146;
    ctx.save();
    ctx.strokeStyle = hexToRgba(state.accentColor, 0.68);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(state.accentColor, 0.42);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left + 120, y + 4);
    ctx.lineTo(right - 120, y + 4);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = hexToRgba(state.accentColor, 0.52);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, y - 11);
    ctx.lineTo(canvas.width / 2 + 11, y);
    ctx.lineTo(canvas.width / 2, y + 11);
    ctx.lineTo(canvas.width / 2 - 11, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 5, y - 5);
    ctx.lineTo(canvas.width / 2 + 5, y);
    ctx.lineTo(canvas.width / 2 - 5, y + 5);
    ctx.stroke();
    ctx.restore();
  }

  function drawTable(tableTop) {
    const width = canvas.width;
    const height = canvas.height;
    const left = 80;
    const tableWidth = width - left * 2;
    const totalRows = state.rows.length + 1;
    const availableHeight = height - tableTop - 90;
    const rowHeight = clamp(availableHeight / totalRows, 31, 82);
    const tableHeight = rowHeight * totalRows;
    const firstHeader = String(state.headers[0] || "");
    const narrowFirst = state.headers.length > 1 && /序号|编号|序列|no\.?/i.test(firstHeader);
    const widths = getColumnWidths().map((width) => width / 100);
    const headerFontSize = clamp(rowHeight * 0.34, 14, 28);
    const bodyFontSize = clamp(rowHeight * 0.31, 13, 26);
    const xPositions = [left];
    widths.forEach((ratio) => xPositions.push(xPositions[xPositions.length - 1] + tableWidth * ratio));

    ctx.save();
    ctx.fillStyle = "rgba(252, 253, 255, 0.76)";
    ctx.fillRect(left, tableTop, tableWidth, tableHeight);
    ctx.fillStyle = hexToRgba(state.headerColor, 0.98);
    ctx.fillRect(left, tableTop, tableWidth, rowHeight);

    state.rows.forEach((row, rowIndex) => {
      const rowY = tableTop + rowHeight * (rowIndex + 1);
      ctx.fillStyle = rowIndex % 2 === 0 ? "rgba(231, 240, 251, 0.72)" : "rgba(255, 255, 255, 0.76)";
      ctx.fillRect(left, rowY, tableWidth, rowHeight);
    });

    ctx.strokeStyle = hexToRgba(state.accentColor, 0.26);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left + 0.75, tableTop + 0.75, tableWidth - 1.5, tableHeight - 1.5);
    ctx.strokeStyle = hexToRgba(state.accentColor, 0.3);
    ctx.lineWidth = 1;
    for (let rowIndex = 1; rowIndex < totalRows; rowIndex += 1) {
      const lineY = tableTop + rowHeight * rowIndex + 0.5;
      ctx.beginPath();
      ctx.moveTo(left, lineY);
      ctx.lineTo(left + tableWidth, lineY);
      ctx.stroke();
    }
    xPositions.slice(1, -1).forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, tableTop);
      ctx.lineTo(x + 0.5, tableTop + tableHeight);
      ctx.stroke();
    });

    state.headers.forEach((header, columnIndex) => {
      drawCellText(header, xPositions[columnIndex], tableTop, tableWidth * widths[columnIndex], rowHeight, {
        fontSize: headerFontSize,
        weight: 700,
        align: "center",
        padding: 8,
        color: "#ffffff"
      });
    });

    state.rows.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        const rowY = tableTop + rowHeight * (rowIndex + 1);
        const isFirst = columnIndex === 0 && narrowFirst;
        drawCellText(cell || "", xPositions[columnIndex], rowY, tableWidth * widths[columnIndex], rowHeight, {
          fontSize: isFirst ? bodyFontSize + 1 : bodyFontSize,
          weight: isFirst ? 700 : 500,
          align: getColumnAlignment(columnIndex),
          padding: isFirst ? 8 : 20,
          color: isFirst ? state.accentColor : "#111c24"
        });
      });
    });
    ctx.restore();
  }

  function renderPoster() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#edf2f5";
    ctx.fillRect(0, 0, width, height);

    if (backgroundImage) drawCoverImage(backgroundImage, state.imageOpacity);

    const veil = ctx.createLinearGradient(0, 0, 0, 690);
    veil.addColorStop(0, "rgba(248, 250, 252, 0.98)");
    veil.addColorStop(0.62, "rgba(248, 250, 252, 0.94)");
    veil.addColorStop(1, "rgba(248, 250, 252, 0.22)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, width, 690);

    drawRibbon();
    const titleMetrics = drawTitle();
    const dividerY = Math.max(215, titleMetrics.titleTop + titleMetrics.titleLines.length * titleMetrics.titleLineHeight + 24);
    drawDivider(dividerY);
    drawTable(Math.min(dividerY + 46, 304));

    const bottomRuleY = height - 28;
    ctx.save();
    ctx.strokeStyle = hexToRgba(state.accentColor, 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, bottomRuleY);
    ctx.lineTo(width - 80, bottomRuleY);
    ctx.stroke();
    ctx.restore();

    document.getElementById("renderStatus").textContent = `已更新 · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function downloadPoster() {
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("导出失败，请稍后再试");
        return;
      }
      const link = document.createElement("a");
      link.download = "table-poster.png";
      link.href = URL.createObjectURL(blob);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      showToast("PNG 已导出");
    }, "image/png");
  }

  function resetAll() {
    Object.assign(state, clone(defaultState));
    hydrateControls();
    renderTableEditor();
    loadBackground(defaultBackground, defaultState.backgroundName, true);
    showToast("已恢复示例内容");
  }

  function handleInput(event) {
    const target = event.target;
    if (target.id === "badgeText") state.badgeText = target.value;
    if (target.id === "titleText") state.titleText = target.value;
    if (target.id === "titleSize") state.titleSize = Number(target.value);
    if (target.id === "titleFont") state.titleFont = target.value;
    if (target.id === "headerColor") state.headerColor = target.value;
    if (target.id === "accentColor") state.accentColor = target.value;
    if (target.id === "imageOpacity") state.imageOpacity = Number(target.value);
    if (target.id === "backgroundOffsetX") state.backgroundOffsetX = Number(target.value);
    if (target.id === "backgroundOffsetY") state.backgroundOffsetY = Number(target.value);
    if (target.id === "backgroundScale" || target.id === "backgroundScaleNumber") {
      state.backgroundScale = clamp(Number(target.value) || 1, 1, 2000);
      setValue("backgroundScale", state.backgroundScale);
      setValue("backgroundScaleNumber", state.backgroundScale);
    }
    if (target.dataset.columnWidthIndex !== undefined) {
      setColumnWidth(Number(target.dataset.columnWidthIndex), target.value);
      applyColumnWidthsToEditor(target);
    }
    if (target.dataset.cellType === "header") {
      state.headers[Number(target.dataset.columnIndex)] = target.value;
      updateColumnControlNames();
    }
    if (target.dataset.cellType === "body") state.rows[Number(target.dataset.rowIndex)][Number(target.dataset.columnIndex)] = target.value;
    updateOutputs();
    renderPoster();
  }

  function handleChange(event) {
    const target = event.target;
    if (target.dataset.columnWidthIndex === undefined) return;
    setColumnWidth(Number(target.dataset.columnWidthIndex), target.value);
    applyColumnWidthsToEditor();
    updateOutputs();
    renderPoster();
  }

  function handleAction(actionTarget) {
    const action = actionTarget.dataset.action;
    if (action === "add-row") {
      state.rows.push(Array(state.headers.length).fill(""));
      renderTableEditor();
      updateOutputs();
      renderPoster();
      showToast("已添加一行");
    }
    if (action === "add-column") {
      const previousWidths = getColumnWidths().slice();
      state.headers.push(`列 ${state.headers.length + 1}`);
      state.rows.forEach((row) => row.push(""));
      state.columnWidths = normalizeColumnWidths([...previousWidths, 100 / state.headers.length], state.headers.length);
      state.columnAlignments = Array.isArray(state.columnAlignments) ? state.columnAlignments : [];
      state.columnAlignments.push("left");
      renderTableEditor();
      updateOutputs();
      renderPoster();
      showToast("已添加一列");
    }
    if (action === "remove-row") {
      if (state.rows.length <= 1) {
        showToast("表格至少保留一行");
        return;
      }
      state.rows.splice(Number(actionTarget.dataset.rowIndex), 1);
      renderTableEditor();
      updateOutputs();
      renderPoster();
    }
    if (action === "remove-column") {
      if (state.headers.length <= 1) {
        showToast("表格至少保留一列");
        return;
      }
      const columnIndex = Number(actionTarget.dataset.columnIndex);
      state.headers.splice(columnIndex, 1);
      state.rows.forEach((row) => row.splice(columnIndex, 1));
      state.columnWidths.splice(columnIndex, 1);
      state.columnAlignments.splice(columnIndex, 1);
      state.columnWidths = normalizeColumnWidths(state.columnWidths, state.headers.length);
      renderTableEditor();
      updateOutputs();
      renderPoster();
    }
    if (action === "set-column-align") {
      const columnIndex = Number(actionTarget.dataset.columnIndex);
      state.columnAlignments[columnIndex] = actionTarget.dataset.align;
      renderColumnControls();
      renderPoster();
    }
    if (action === "select-position-target") {
      state.positionTarget = actionTarget.dataset.positionTarget === "title" ? "title" : "background";
      updateOutputs();
    }
    if (action === "reset-position") {
      if (state.positionTarget === "title") {
        state.titlePositionX = defaultState.titlePositionX;
        state.titlePositionY = defaultState.titlePositionY;
      } else {
        state.backgroundOffsetX = defaultState.backgroundOffsetX;
        state.backgroundOffsetY = defaultState.backgroundOffsetY;
      }
      updateOutputs();
      renderPoster();
      showToast(`已重置${state.positionTarget === "title" ? "标题" : "背景图"}位置`);
    }
    if (action === "upload-background") document.getElementById("backgroundInput").click();
    if (action === "reset-background") {
      loadBackground(defaultBackground, defaultState.backgroundName, true);
      showToast("已恢复默认背景");
    }
    if (action === "download") downloadPoster();
    if (action === "reset") resetAll();
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function beginCanvasDrag(event) {
    if (event.button !== 0) return;
    const point = getCanvasPoint(event);
    dragSession = {
      pointerId: event.pointerId,
      target: state.positionTarget,
      lastX: point.x,
      lastY: point.y
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging");
    event.preventDefault();
  }

  function moveCanvasDrag(event) {
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    const point = getCanvasPoint(event);
    const deltaX = point.x - dragSession.lastX;
    const deltaY = point.y - dragSession.lastY;
    dragSession.lastX = point.x;
    dragSession.lastY = point.y;

    if (dragSession.target === "title") {
      state.titlePositionX = clamp(state.titlePositionX + deltaX, 120, canvas.width - 120);
      state.titlePositionY = clamp(state.titlePositionY + deltaY, 36, 300);
    } else if (backgroundImage) {
      state.backgroundOffsetX += deltaX;
      state.backgroundOffsetY += deltaY;
    }
    updateOutputs();
    renderPoster();
    event.preventDefault();
  }

  function endCanvasDrag(event) {
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    dragSession = null;
    canvas.classList.remove("is-dragging");
  }

  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("click", (event) => {
    const actionTarget = event.target.closest("[data-action]");
    if (actionTarget) handleAction(actionTarget);
  });
  document.getElementById("backgroundInput").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadBackground(reader.result, file.name, true);
    reader.readAsDataURL(file);
    event.target.value = "";
  });

  canvas.addEventListener("pointerdown", beginCanvasDrag);
  canvas.addEventListener("pointermove", moveCanvasDrag);
  canvas.addEventListener("pointerup", endCanvasDrag);
  canvas.addEventListener("pointercancel", endCanvasDrag);
  document.addEventListener("pointermove", moveColumnResize);
  document.addEventListener("pointerup", endColumnResize);
  document.addEventListener("pointercancel", endColumnResize);

  document.querySelectorAll("[data-icon]").forEach((element) => {
    const name = element.dataset.icon;
    if (!element.innerHTML) element.innerHTML = icon(name);
  });

  hydrateControls();
  renderTableEditor();
  loadBackground(defaultBackground, defaultState.backgroundName);
})();
