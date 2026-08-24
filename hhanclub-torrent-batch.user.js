// ==UserScript==
// @name         HHClub 当前页种子筛选与批量下载
// @namespace    https://hhanclub.net/
// @version      1.3.0
// @description  按关键词、下载状态、大小、官种和促销状态筛选，支持多选并批量下载 .torrent 文件
// @match        https://hhanclub.net/torrents.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const APP_ID = 'hhclub-torrent-batch';
  const ROW_SELECTOR = '.torrent-table-sub-info';
  const DOWNLOAD_SELECTOR = 'a[href*="download.php"]';
  const DETAILS_SELECTOR = 'a[href*="details.php?id="]:not([href*="dllist="])';
  const DOWNLOAD_DELAY_MS = 500;

  if (document.getElementById(APP_ID)) return;

  const rows = [...document.querySelectorAll(ROW_SELECTOR)]
    .filter((row) => row.querySelector(DOWNLOAD_SELECTOR));

  if (!rows.length) return;

  const state = {
    query: '',
    selectedOnly: false,
    excludeActive: false,
    minSizeMb: null,
    maxSizeMb: null,
    official: 'all',
    free: 'all',
    downloading: false,
  };

  const style = document.createElement('style');
  style.textContent = `
    #${APP_ID} {
      position: sticky;
      top: 8px;
      z-index: 1000;
      box-sizing: border-box;
      width: min(95%, 1500px);
      margin: 12px auto;
      padding: 12px;
      color: #1f2937;
      background: rgba(255, 255, 255, 0.97);
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
      font-size: 14px;
    }
    #${APP_ID} .hhb-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    #${APP_ID} .hhb-row + .hhb-row { margin-top: 8px; }
    #${APP_ID} input[type="search"] {
      flex: 1 1 360px;
      min-width: 220px;
      height: 34px;
      padding: 0 10px;
      color: #111827;
      background: #fff;
      border: 1px solid #9ca3af;
      border-radius: 6px;
      outline: none;
    }
    #${APP_ID} input[type="search"]:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
    }
    #${APP_ID} .hhb-filter-group {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }
    #${APP_ID} input[type="number"],
    #${APP_ID} select {
      height: 32px;
      box-sizing: border-box;
      padding: 0 7px;
      color: #111827;
      background: #fff;
      border: 1px solid #9ca3af;
      border-radius: 6px;
    }
    #${APP_ID} input[type="number"] { width: 92px; }
    #${APP_ID} button {
      height: 32px;
      padding: 0 11px;
      color: #1f2937;
      background: #f3f4f6;
      border: 1px solid #9ca3af;
      border-radius: 6px;
      cursor: pointer;
    }
    #${APP_ID} button:hover:not(:disabled) { background: #e5e7eb; }
    #${APP_ID} button:disabled { cursor: not-allowed; opacity: 0.55; }
    #${APP_ID} .hhb-download {
      color: #fff;
      background: #2563eb;
      border-color: #1d4ed8;
      font-weight: 700;
    }
    #${APP_ID} .hhb-download:hover:not(:disabled) { background: #1d4ed8; }
    #${APP_ID} .hhb-count { font-weight: 700; }
    #${APP_ID} .hhb-status { color: #4b5563; }
    #${APP_ID} .hhb-option {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      user-select: none;
    }
    .hhb-check-cell {
      display: flex;
      flex: 0 0 38px;
      align-self: stretch;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      border-right: 1px solid rgba(107, 114, 128, 0.25);
    }
    .hhb-check-cell input {
      width: 17px;
      height: 17px;
      cursor: pointer;
      accent-color: #2563eb;
    }
    ${ROW_SELECTOR}.hhb-selected {
      outline: 2px solid #2563eb;
      outline-offset: -2px;
    }
    ${ROW_SELECTOR}[hidden] { display: none !important; }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('section');
  panel.id = APP_ID;
  panel.innerHTML = `
    <div class="hhb-row">
      <input class="hhb-filter" type="search" placeholder="筛选当前页：输入关键词，空格分隔且全部匹配" autocomplete="off">
      <label class="hhb-option"><input class="hhb-selected-only" type="checkbox">仅显示已选</label>
      <span class="hhb-count" aria-live="polite"></span>
    </div>
    <div class="hhb-row hhb-filters">
      <label class="hhb-option" title="排除站点标记为 seeding 或 leeching 的种子"><input class="hhb-exclude-active" type="checkbox">排除已下载/正在下载</label>
      <label class="hhb-filter-group">大小(MB)
        <input class="hhb-min-size" type="number" min="0" step="1" placeholder="最小">
        <span>—</span>
        <input class="hhb-max-size" type="number" min="0" step="1" placeholder="最大">
      </label>
      <label class="hhb-filter-group">官种
        <select class="hhb-official">
          <option value="all">全部</option>
          <option value="yes">仅官种</option>
          <option value="no">排除官种</option>
        </select>
      </label>
      <label class="hhb-filter-group">Free
        <select class="hhb-free">
          <option value="all">全部</option>
          <option value="yes">仅 Free</option>
          <option value="no">排除 Free</option>
        </select>
      </label>
      <button type="button" data-action="reset-filters">重置过滤</button>
    </div>
    <div class="hhb-row">
      <button type="button" data-action="select-visible">全选可见</button>
      <button type="button" data-action="unselect-visible">取消可见</button>
      <button type="button" data-action="invert-visible">反选可见</button>
      <button type="button" data-action="clear">清空选择</button>
      <button type="button" class="hhb-download" data-action="download">批量下载已选</button>
      <span class="hhb-status" aria-live="polite">就绪</span>
    </div>
  `;

  const list = rows[0].parentElement;
  const insertionRoot = list?.parentElement ?? document.querySelector('#mainContent') ?? document.body;
  insertionRoot.insertBefore(panel, list ?? insertionRoot.firstChild);

  const filterInput = panel.querySelector('.hhb-filter');
  const selectedOnlyInput = panel.querySelector('.hhb-selected-only');
  const excludeActiveInput = panel.querySelector('.hhb-exclude-active');
  const minSizeInput = panel.querySelector('.hhb-min-size');
  const maxSizeInput = panel.querySelector('.hhb-max-size');
  const officialSelect = panel.querySelector('.hhb-official');
  const freeSelect = panel.querySelector('.hhb-free');
  const countNode = panel.querySelector('.hhb-count');
  const statusNode = panel.querySelector('.hhb-status');
  const downloadButton = panel.querySelector('[data-action="download"]');

  function parseSizeMb(text) {
    const match = text.match(/([\d.]+)\s*(KB|MB|GB|TB)/i);
    if (!match) return null;
    const value = Number.parseFloat(match[1]);
    const factors = { KB: 1 / 1024, MB: 1, GB: 1024, TB: 1024 * 1024 };
    return value * factors[match[2].toUpperCase()];
  }

  function matchesChoice(value, choice) {
    return choice === 'all' || (choice === 'yes' ? value : !value);
  }

  const items = rows.map((row, index) => {
    const downloadLink = row.querySelector(DOWNLOAD_SELECTOR);
    const detailsLink = row.querySelector(DETAILS_SELECTOR);
    const title = (detailsLink?.textContent || `torrent-${index + 1}`).trim();
    const searchText = row.innerText.toLocaleLowerCase();
    const progressTitle = row.querySelector('[title^="seeding "], [title^="leeching "]')?.title || '';
    const sizeText = row.querySelector('.torrent-info-text-size')?.textContent || '';
    const sizeMb = parseSizeMb(sizeText);
    const isOfficial = [...row.querySelectorAll('.tag')]
      .some((tag) => tag.textContent.trim() === '官方');
    const isFree = Boolean(row.querySelector('.promotion-tag-free'))
      || [...row.querySelectorAll('.promotion-tag')]
        .some((tag) => tag.textContent.trim() === '免费');

    const cell = document.createElement('label');
    cell.className = 'hhb-check-cell';
    cell.title = `选择：${title}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', `选择 ${title}`);
    cell.appendChild(checkbox);
    row.prepend(cell);

    const item = {
      row,
      checkbox,
      downloadLink,
      title,
      searchText,
      sizeMb,
      isOfficial,
      isFree,
      isActive: /^(?:seeding|leeching)\b/i.test(progressTitle),
    };
    checkbox.addEventListener('change', () => {
      row.classList.toggle('hhb-selected', checkbox.checked);
      if (state.selectedOnly) applyFilter();
      else updateCounts();
    });
    return item;
  });

  function selectedItems() {
    return items.filter((item) => item.checkbox.checked);
  }

  function visibleItems() {
    return items.filter((item) => !item.row.hidden);
  }

  function updateCounts() {
    const visible = visibleItems().length;
    const selected = selectedItems().length;
    countNode.textContent = `显示 ${visible}/${items.length} · 已选 ${selected}`;
    downloadButton.textContent = state.downloading
      ? '正在批量下载…'
      : `批量下载已选 (${selected})`;
    downloadButton.disabled = state.downloading || selected === 0;
  }

  function applyFilter() {
    const terms = state.query
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    for (const item of items) {
      const matchesQuery = terms.every((term) => item.searchText.includes(term));
      const matchesSelection = !state.selectedOnly || item.checkbox.checked;
      const matchesActivity = !state.excludeActive || !item.isActive;
      const matchesMinSize = state.minSizeMb === null
        || (item.sizeMb !== null && item.sizeMb >= state.minSizeMb);
      const matchesMaxSize = state.maxSizeMb === null
        || (item.sizeMb !== null && item.sizeMb <= state.maxSizeMb);
      const matchesOfficial = matchesChoice(item.isOfficial, state.official);
      const matchesFree = matchesChoice(item.isFree, state.free);
      item.row.hidden = !(
        matchesQuery
        && matchesSelection
        && matchesActivity
        && matchesMinSize
        && matchesMaxSize
        && matchesOfficial
        && matchesFree
      );
    }
    updateCounts();
  }

  function setChecked(item, checked) {
    item.checkbox.checked = checked;
    item.row.classList.toggle('hhb-selected', checked);
  }

  function sanitizeFilename(name) {
    const clean = name
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .replace(/[. ]+$/g, '')
      .trim()
      .slice(0, 180);
    return `${clean || 'torrent'}.torrent`;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function triggerBlobDownload(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  }

  async function fetchTorrent(item) {
    const response = await fetch(item.downloadLink.href, {
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get('content-type') || '';
    const bytes = new Uint8Array(await response.arrayBuffer());
    const looksLikeTorrent = /application\/(?:x-)?bittorrent/i.test(contentType)
      || bytes[0] === 0x64;

    if (!bytes.length || !looksLikeTorrent) {
      throw new Error(`响应不是种子文件 (${contentType || '未知类型'}, ${bytes.length} bytes)`);
    }

    return { filename: sanitizeFilename(item.title), bytes };
  }

  async function fetchTorrentWithRetry(item) {
    try {
      return await fetchTorrent(item);
    } catch (firstError) {
      await sleep(800);
      try {
        return await fetchTorrent(item);
      } catch (secondError) {
        throw new Error(`${secondError.message}；重试前：${firstError.message}`);
      }
    }
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
      }
      table[index] = value >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
    return (crc ^ 0xffffffff) >>> 0;
  }

  function zipHeader(size) {
    const bytes = new Uint8Array(size);
    return { bytes, view: new DataView(bytes.buffer) };
  }

  function dosDateTime(date) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    };
  }

  function createZip(entries) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    const now = dosDateTime(new Date());
    let offset = 0;
    let centralSize = 0;

    for (const entry of entries) {
      const name = encoder.encode(entry.filename);
      const checksum = crc32(entry.bytes);
      const local = zipHeader(30);
      local.view.setUint32(0, 0x04034b50, true);
      local.view.setUint16(4, 20, true);
      local.view.setUint16(6, 0x0800, true);
      local.view.setUint16(8, 0, true);
      local.view.setUint16(10, now.time, true);
      local.view.setUint16(12, now.date, true);
      local.view.setUint32(14, checksum, true);
      local.view.setUint32(18, entry.bytes.length, true);
      local.view.setUint32(22, entry.bytes.length, true);
      local.view.setUint16(26, name.length, true);
      localParts.push(local.bytes, name, entry.bytes);

      const central = zipHeader(46);
      central.view.setUint32(0, 0x02014b50, true);
      central.view.setUint16(4, 20, true);
      central.view.setUint16(6, 20, true);
      central.view.setUint16(8, 0x0800, true);
      central.view.setUint16(10, 0, true);
      central.view.setUint16(12, now.time, true);
      central.view.setUint16(14, now.date, true);
      central.view.setUint32(16, checksum, true);
      central.view.setUint32(20, entry.bytes.length, true);
      central.view.setUint32(24, entry.bytes.length, true);
      central.view.setUint16(28, name.length, true);
      central.view.setUint32(42, offset, true);
      centralParts.push(central.bytes, name);

      offset += local.bytes.length + name.length + entry.bytes.length;
      centralSize += central.bytes.length + name.length;
    }

    const end = zipHeader(22);
    end.view.setUint32(0, 0x06054b50, true);
    end.view.setUint16(8, entries.length, true);
    end.view.setUint16(10, entries.length, true);
    end.view.setUint32(12, centralSize, true);
    end.view.setUint32(16, offset, true);
    return new Blob([...localParts, ...centralParts, end.bytes], { type: 'application/zip' });
  }

  function archiveFilename() {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    return `hhanclub-torrents-${stamp}.zip`;
  }

  async function batchDownload() {
    const queue = selectedItems();
    if (!queue.length || state.downloading) return;

    state.downloading = true;
    updateCounts();
    const entries = [];
    const failures = [];

    for (let index = 0; index < queue.length; index += 1) {
      const item = queue[index];
      statusNode.textContent = `获取 ${index + 1}/${queue.length}：${item.title}`;

      try {
        entries.push(await fetchTorrentWithRetry(item));
      } catch (error) {
        console.error('[HHClub 批量下载]', item.title, error);
        failures.push(`${item.title}：${error.message || String(error)}`);
      }

      if (index < queue.length - 1) await sleep(DOWNLOAD_DELAY_MS);
    }

    try {
      if (entries.length === 1) {
        triggerBlobDownload(
          new Blob([entries[0].bytes], { type: 'application/x-bittorrent' }),
          entries[0].filename,
        );
      } else if (entries.length > 1) {
        statusNode.textContent = `正在打包 ${entries.length} 个种子…`;
        triggerBlobDownload(createZip(entries), archiveFilename());
      }
    } catch (error) {
      failures.push(`生成下载文件：${error.message || String(error)}`);
    }

    state.downloading = false;
    statusNode.textContent = failures.length
      ? `完成：成功 ${entries.length}，失败 ${failures.length}；首个错误：${failures[0]}`
      : `完成：已下载 ${entries.length === 1 ? '1 个种子' : `${entries.length} 个种子的 ZIP`}`;
    updateCounts();
  }

  filterInput.addEventListener('input', () => {
    state.query = filterInput.value;
    applyFilter();
  });

  selectedOnlyInput.addEventListener('change', () => {
    state.selectedOnly = selectedOnlyInput.checked;
    applyFilter();
  });
  excludeActiveInput.addEventListener('change', () => {
    state.excludeActive = excludeActiveInput.checked;
    applyFilter();
  });

  function updateSizeFilter() {
    state.minSizeMb = minSizeInput.value === '' ? null : Number(minSizeInput.value);
    state.maxSizeMb = maxSizeInput.value === '' ? null : Number(maxSizeInput.value);
    applyFilter();
  }

  minSizeInput.addEventListener('input', updateSizeFilter);
  maxSizeInput.addEventListener('input', updateSizeFilter);

  officialSelect.addEventListener('change', () => {
    state.official = officialSelect.value;
    applyFilter();
  });

  freeSelect.addEventListener('change', () => {
    state.free = freeSelect.value;
    applyFilter();
  });

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    if (action === 'select-visible') {
      visibleItems().forEach((item) => setChecked(item, true));
      applyFilter();
    } else if (action === 'unselect-visible') {
      visibleItems().forEach((item) => setChecked(item, false));
      applyFilter();
    } else if (action === 'invert-visible') {
      visibleItems().forEach((item) => setChecked(item, !item.checkbox.checked));
      applyFilter();
    } else if (action === 'clear') {
      items.forEach((item) => setChecked(item, false));
      applyFilter();
    } else if (action === 'reset-filters') {
      filterInput.value = '';
      selectedOnlyInput.checked = false;
      excludeActiveInput.checked = false;
      minSizeInput.value = '';
      maxSizeInput.value = '';
      officialSelect.value = 'all';
      freeSelect.value = 'all';
      Object.assign(state, {
        query: '',
        selectedOnly: false,
        excludeActive: false,
        minSizeMb: null,
        maxSizeMb: null,
        official: 'all',
        free: 'all',
      });
      applyFilter();
    } else if (action === 'download') {
      void batchDownload();
    }
  });

  applyFilter();
})();
