/**
 * ============================================================
 *  WanderViet / TripSync — Utils Library
 *  Version: 1.0.0
 * ============================================================
 *
 *  Modules:
 *   1. Format     — Tiền tệ VND, ngày tháng tiếng Việt
 *   2. DOM        — Toast, Modal, Loader, Scroll helpers
 *   3. Validate   — Email, phone, form fields
 *   4. Storage    — LocalStorage / SessionStorage wrappers
 *   5. Http       — Fetch API wrapper (GET, POST, PUT, DELETE)
 *   6. Misc       — Debounce, throttle, slugify, copy-to-clipboard
 *
 *  Usage (ES Module):
 *    import { Format, DOM, Validate, Storage, Http, Misc } from './utils.js';
 *
 *  Usage (Global):
 *    <script src="utils.js"></script>
 *    Utils.Format.currency(3500000);
 * ============================================================
 */

/* ============================================================
   1. FORMAT
   ============================================================ */
const Format = (() => {

  /**
   * Format số thành tiền VND
   * @param {number} amount
   * @param {boolean} [short=false] — rút gọn: 3.5M, 32K
   * @returns {string}
   * @example Format.currency(3500000)        // "3.500.000 ₫"
   * @example Format.currency(3500000, true)  // "3,5M ₫"
   */
  function currency(amount, short = false) {
    if (isNaN(amount) || amount === null || amount === undefined) return '—';
    const num = Number(amount);
    if (short) {
      if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace('.0', '') + 'B ₫';
      if (num >= 1_000_000)     return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M ₫';
      if (num >= 1_000)         return (num / 1_000).toFixed(0) + 'K ₫';
      return num + ' ₫';
    }
    return num.toLocaleString('vi-VN') + ' ₫';
  }

  /**
   * Parse chuỗi tiền "3.500.000 ₫" → number 3500000
   * @param {string} str
   * @returns {number}
   */
  function parseCurrency(str) {
    if (!str) return 0;
    return Number(String(str).replace(/[^\d]/g, '')) || 0;
  }

  /**
   * Format ngày tháng theo kiểu Việt Nam
   * @param {Date|string|number} date
   * @param {'short'|'long'|'full'|'relative'} [style='short']
   * @returns {string}
   * @example Format.date(new Date(), 'short')    // "15/07/2025"
   * @example Format.date(new Date(), 'long')     // "15 tháng 7, 2025"
   * @example Format.date(new Date(), 'full')     // "Thứ Ba, 15 tháng 7, 2025"
   * @example Format.date(new Date(), 'relative') // "3 ngày trước"
   */
  function date(input, style = 'short') {
    if (!input) return '—';
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d)) return '—';

    if (style === 'relative') {
      const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60)          return 'vừa xong';
      if (diff < 3600)        return `${Math.floor(diff / 60)} phút trước`;
      if (diff < 86400)       return `${Math.floor(diff / 3600)} giờ trước`;
      if (diff < 2592000)     return `${Math.floor(diff / 86400)} ngày trước`;
      if (diff < 31536000)    return `${Math.floor(diff / 2592000)} tháng trước`;
      return `${Math.floor(diff / 31536000)} năm trước`;
    }

    const dd  = String(d.getDate()).padStart(2, '0');
    const mm  = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const months = ['tháng 1','tháng 2','tháng 3','tháng 4','tháng 5','tháng 6',
                    'tháng 7','tháng 8','tháng 9','tháng 10','tháng 11','tháng 12'];
    const days = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

    if (style === 'short') return `${dd}/${mm}/${yyyy}`;
    if (style === 'long')  return `${dd} ${months[d.getMonth()]}, ${yyyy}`;
    if (style === 'full')  return `${days[d.getDay()]}, ${dd} ${months[d.getMonth()]}, ${yyyy}`;
    return `${dd}/${mm}/${yyyy}`;
  }

  /**
   * Format khoảng thời gian (số ngày → "X ngày Y đêm")
   * @param {number} days
   * @returns {string}
   */
  function tripDuration(days) {
    if (!days || days < 1) return '—';
    return `${days} ngày ${days - 1} đêm`;
  }

  /**
   * Format số (1234567 → "1.234.567")
   * @param {number} num
   * @returns {string}
   */
  function number(num) {
    if (isNaN(num)) return '—';
    return Number(num).toLocaleString('vi-VN');
  }

  /**
   * Viết hoa chữ cái đầu mỗi từ (title case)
   * @param {string} str
   * @returns {string}
   */
  function titleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Rút gọn chuỗi dài
   * @param {string} str
   * @param {number} [maxLen=80]
   * @returns {string}
   */
  function truncate(str, maxLen = 80) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
  }

  return { currency, parseCurrency, date, tripDuration, number, titleCase, truncate };
})();


/* ============================================================
   2. DOM
   ============================================================ */
const DOM = (() => {

  /* ── TOAST ──────────────────────────────────────────────── */

  let _toastContainer = null;

  function _getToastContainer() {
    if (!_toastContainer) {
      _toastContainer = document.getElementById('toast-container');
    }
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'toast-container';
      _toastContainer.className = 'toast-container';
      document.body.appendChild(_toastContainer);
    }
    return _toastContainer;
  }

  /**
   * Hiện toast notification
   * @param {string} message
   * @param {'success'|'error'|'info'|'warning'} [type='success']
   * @param {number} [duration=3000]
   */
  function toast(message, type = 'success', duration = 3000) {
    const icons = {
      success: 'bx-check-circle',
      error:   'bx-x-circle',
      info:    'bx-info-circle',
      warning: 'bx-error',
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class='bx ${icons[type] || icons.info}'></i> ${message}`;
    _getToastContainer().appendChild(el);

    // trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('show'));
    });

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  /* ── MODAL ───────────────────────────────────────────────── */

  /**
   * Mở modal (thêm class 'open')
   * @param {string} id — id của modal-overlay (không cần tiền tố 'modal-')
   */
  function openModal(id) {
    const el = document.getElementById(`modal-${id}`) || document.getElementById(id);
    if (el) el.classList.add('open');
  }

  /**
   * Đóng modal
   * @param {string} id
   */
  function closeModal(id) {
    const el = document.getElementById(`modal-${id}`) || document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  /**
   * Toggle modal
   * @param {string} id
   */
  function toggleModal(id) {
    const el = document.getElementById(`modal-${id}`) || document.getElementById(id);
    if (el) el.classList.toggle('open');
  }

  /**
   * Đóng modal khi click ra ngoài (backdrop)
   * Gọi một lần khi init
   */
  function initModalBackdrop() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open')
          .forEach(m => m.classList.remove('open'));
      }
    });
  }

  /* ── LOADER ─────────────────────────────────────────────── */

  let _loaderEl = null;

  /**
   * Hiện full-screen loader
   * @param {string} [text='Đang tải...']
   */
  function showLoader(text = 'Đang tải...') {
    if (!_loaderEl) {
      _loaderEl = document.createElement('div');
      _loaderEl.id = 'wv-loader';
      _loaderEl.innerHTML = `
        <div class="wv-loader-inner">
          <div class="wv-spinner"></div>
          <span class="wv-loader-text">${text}</span>
        </div>`;
      _injectLoaderCSS();
      document.body.appendChild(_loaderEl);
    } else {
      const t = _loaderEl.querySelector('.wv-loader-text');
      if (t) t.textContent = text;
    }
    _loaderEl.style.display = 'flex';
  }

  /** Ẩn loader */
  function hideLoader() {
    if (_loaderEl) _loaderEl.style.display = 'none';
  }

  function _injectLoaderCSS() {
    if (document.getElementById('wv-loader-style')) return;
    const s = document.createElement('style');
    s.id = 'wv-loader-style';
    s.textContent = `
      #wv-loader {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(26,26,46,0.55);
        backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
      }
      .wv-loader-inner {
        display: flex; flex-direction: column; align-items: center; gap: 14px;
        background: #fff; border-radius: 16px; padding: 32px 40px;
        box-shadow: 0 24px 64px rgba(0,0,0,0.18);
      }
      .wv-spinner {
        width: 40px; height: 40px;
        border: 3.5px solid #E8F2EB;
        border-top-color: #286cc5;
        border-radius: 50%;
        animation: wv-spin 0.7s linear infinite;
      }
      .wv-loader-text { font-size: 14px; font-weight: 500; color: #3D3D52; }
      @keyframes wv-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(s);
  }

  /* ── SCROLL ─────────────────────────────────────────────── */

  /**
   * Smooth scroll tới element
   * @param {string|Element} target — CSS selector hoặc DOM element
   * @param {number} [offset=80] — bù trừ chiều cao navbar
   */
  function scrollTo(target, offset = 80) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  /**
   * Kiểm tra element có trong viewport không
   * @param {Element} el
   * @param {number} [threshold=0.15]
   * @returns {boolean}
   */
  function isInViewport(el, threshold = 0.15) {
    const rect = el.getBoundingClientRect();
    const windowH = window.innerHeight || document.documentElement.clientHeight;
    return rect.top <= windowH * (1 - threshold) && rect.bottom >= 0;
  }

  /**
   * Thêm class khi element vào viewport (dùng cho scroll animation)
   * @param {string} selector — CSS selector
   * @param {string} [activeClass='visible']
   * @param {number} [threshold=0.15]
   */
  function observeInViewport(selector, activeClass = 'visible', threshold = 0.15) {
    const els = document.querySelectorAll(selector);
    if (!els.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add(activeClass);
            observer.unobserve(e.target);
          }
        });
      }, { threshold });
      els.forEach(el => observer.observe(el));
    } else {
      // Fallback
      const check = () => els.forEach(el => {
        if (isInViewport(el, threshold)) el.classList.add(activeClass);
      });
      window.addEventListener('scroll', check, { passive: true });
      check();
    }
  }

  /* ── NAVBAR SCROLL CLASS ─────────────────────────────────── */

  /**
   * Toggle class 'scrolled' trên navbar khi scroll
   * @param {string} [selector='#navbar']
   * @param {number} [offset=60]
   */
  function initNavbarScroll(selector = '#navbar', offset = 60) {
    const el = document.querySelector(selector);
    if (!el) return;
    const handler = () => el.classList.toggle('scrolled', window.scrollY > offset);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
  }

  /* ── MISC DOM ─────────────────────────────────────────────── */

  /**
   * Shorthand querySelector
   * @param {string} selector
   * @param {Element} [ctx=document]
   */
  function qs(selector, ctx = document) {
    return ctx.querySelector(selector);
  }

  /**
   * Shorthand querySelectorAll → Array
   * @param {string} selector
   * @param {Element} [ctx=document]
   */
  function qsa(selector, ctx = document) {
    return [...ctx.querySelectorAll(selector)];
  }

  /**
   * Hiện confirm dialog đẹp (sử dụng native confirm, có thể override)
   * @param {string} message
   * @param {Function} onConfirm
   * @param {string} [confirmText='Xác nhận']
   */
  function confirm(message, onConfirm, confirmText = 'Xác nhận') {
    // Dùng native confirm; có thể thay bằng custom modal nếu cần
    if (window.confirm(message)) onConfirm();
  }

  return {
    toast, openModal, closeModal, toggleModal, initModalBackdrop,
    showLoader, hideLoader,
    scrollTo, isInViewport, observeInViewport,
    initNavbarScroll,
    qs, qsa, confirm,
  };
})();


/* ============================================================
   3. VALIDATE
   ============================================================ */
const Validate = (() => {

  /**
   * Kiểm tra email hợp lệ
   * @param {string} email
   * @returns {boolean}
   */
  function email(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  }

  /**
   * Kiểm tra số điện thoại Việt Nam
   * (0[3|5|7|8|9]xxxxxxxx hoặc +84...)
   * @param {string} phone
   * @returns {boolean}
   */
  function phone(phone) {
    const cleaned = String(phone).replace(/[\s.\-]/g, '');
    return /^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[0-6|8|9]|9[0-4|6-9])\d{7}$/.test(cleaned);
  }

  /**
   * Kiểm tra chuỗi không rỗng
   * @param {string} value
   * @returns {boolean}
   */
  function required(value) {
    return String(value ?? '').trim().length > 0;
  }

  /**
   * Kiểm tra độ dài tối thiểu
   * @param {string} value
   * @param {number} min
   * @returns {boolean}
   */
  function minLength(value, min) {
    return String(value ?? '').trim().length >= min;
  }

  /**
   * Kiểm tra độ dài tối đa
   * @param {string} value
   * @param {number} max
   * @returns {boolean}
   */
  function maxLength(value, max) {
    return String(value ?? '').trim().length <= max;
  }

  /**
   * Kiểm tra số nằm trong khoảng [min, max]
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {boolean}
   */
  function range(value, min, max) {
    const n = Number(value);
    return !isNaN(n) && n >= min && n <= max;
  }

  /**
   * Kiểm tra ngày hợp lệ
   * @param {string|Date} value
   * @returns {boolean}
   */
  function validDate(value) {
    const d = new Date(value);
    return d instanceof Date && !isNaN(d);
  }

  /**
   * Kiểm tra ngày kết thúc >= ngày bắt đầu
   * @param {string|Date} start
   * @param {string|Date} end
   * @returns {boolean}
   */
  function dateRange(start, end) {
    return new Date(end) >= new Date(start);
  }

  /**
   * Validate toàn bộ form — trả về danh sách lỗi
   * @param {Object} rules — { fieldName: { value, required?, email?, phone?, minLength?, maxLength? } }
   * @returns {{ valid: boolean, errors: Object }}
   * @example
   *   const { valid, errors } = Validate.form({
   *     ten:   { value: tenInput.value, required: true, minLength: 2 },
   *     email: { value: emailInput.value, required: true, email: true },
   *     sdt:   { value: sdtInput.value, phone: true },
   *   });
   */
  function form(rules) {
    const errors = {};
    const labels = {
      required:  'Trường này là bắt buộc',
      email:     'Email không hợp lệ',
      phone:     'Số điện thoại không hợp lệ',
      minLength: (n) => `Tối thiểu ${n} ký tự`,
      maxLength: (n) => `Tối đa ${n} ký tự`,
      range:     (min, max) => `Giá trị phải từ ${min} đến ${max}`,
      validDate: 'Ngày không hợp lệ',
      dateRange: 'Ngày kết thúc phải sau ngày bắt đầu',
    };

    for (const [field, rule] of Object.entries(rules)) {
      const v = rule.value;
      const errs = [];

      if (rule.required && !required(v))         errs.push(labels.required);
      if (rule.email    && v && !email(v))        errs.push(labels.email);
      if (rule.phone    && v && !phone(v))        errs.push(labels.phone);
      if (rule.minLength != null && v && !minLength(v, rule.minLength))
        errs.push(labels.minLength(rule.minLength));
      if (rule.maxLength != null && v && !maxLength(v, rule.maxLength))
        errs.push(labels.maxLength(rule.maxLength));
      if (rule.validDate && v && !validDate(v))   errs.push(labels.validDate);
      if (rule.range && v != null && !range(v, rule.range[0], rule.range[1]))
        errs.push(labels.range(rule.range[0], rule.range[1]));

      if (errs.length) errors[field] = errs;
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Hiển thị lỗi dưới input (thêm class 'error' + message)
   * @param {Object} errors — kết quả từ Validate.form()
   * @param {Object} fieldMap — { fieldName: inputElement | CSS selector }
   */
  function showErrors(errors, fieldMap) {
    // Reset
    Object.values(fieldMap).forEach(ref => {
      const el = typeof ref === 'string' ? document.querySelector(ref) : ref;
      if (!el) return;
      el.classList.remove('input-error');
      const msg = el.parentElement?.querySelector('.wv-error-msg');
      if (msg) msg.remove();
    });

    // Show errors
    for (const [field, msgs] of Object.entries(errors)) {
      const ref = fieldMap[field];
      if (!ref) continue;
      const el = typeof ref === 'string' ? document.querySelector(ref) : ref;
      if (!el) continue;
      el.classList.add('input-error');

      const msg = document.createElement('span');
      msg.className = 'wv-error-msg';
      msg.style.cssText = 'display:block;font-size:12px;color:#ef4444;margin-top:4px;';
      msg.textContent = msgs[0];
      el.parentElement?.appendChild(msg);
    }
  }

  return { email, phone, required, minLength, maxLength, range, validDate, dateRange, form, showErrors };
})();


/* ============================================================
   4. STORAGE
   ============================================================ */
const Storage = (() => {

  const PREFIX = 'wv_';

  function _key(k) { return PREFIX + k; }

  /* ── LOCAL STORAGE ──────────────────────────────────────── */

  /**
   * Lưu giá trị vào localStorage (tự động JSON.stringify)
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlMs] — thời gian hết hạn (milliseconds)
   */
  function set(key, value, ttlMs) {
    try {
      const payload = { v: value };
      if (ttlMs) payload.exp = Date.now() + ttlMs;
      localStorage.setItem(_key(key), JSON.stringify(payload));
    } catch (e) {
      console.warn('[WV Storage] set error:', e);
    }
  }

  /**
   * Lấy giá trị từ localStorage
   * @param {string} key
   * @param {*} [defaultValue=null]
   * @returns {*}
   */
  function get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(_key(key));
      if (!raw) return defaultValue;
      const payload = JSON.parse(raw);
      if (payload.exp && Date.now() > payload.exp) {
        localStorage.removeItem(_key(key));
        return defaultValue;
      }
      return payload.v ?? defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * Xóa key khỏi localStorage
   * @param {string} key
   */
  function remove(key) {
    localStorage.removeItem(_key(key));
  }

  /**
   * Xóa tất cả keys có prefix 'wv_'
   */
  function clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }

  /**
   * Kiểm tra key tồn tại
   * @param {string} key
   * @returns {boolean}
   */
  function has(key) {
    return get(key) !== null;
  }

  /* ── SESSION STORAGE ─────────────────────────────────────── */

  const Session = {
    /**
     * Lưu vào sessionStorage
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
      try {
        sessionStorage.setItem(_key(key), JSON.stringify(value));
      } catch (e) {
        console.warn('[WV Session] set error:', e);
      }
    },

    /**
     * Lấy từ sessionStorage
     * @param {string} key
     * @param {*} [defaultValue=null]
     */
    get(key, defaultValue = null) {
      try {
        const raw = sessionStorage.getItem(_key(key));
        return raw ? JSON.parse(raw) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },

    /**
     * Xóa key khỏi sessionStorage
     * @param {string} key
     */
    remove(key) {
      sessionStorage.removeItem(_key(key));
    },

    /** Xóa toàn bộ session có prefix */
    clear() {
      Object.keys(sessionStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => sessionStorage.removeItem(k));
    },
  };

  /* ── COOKIE helpers (đơn giản) ──────────────────────────── */

  const Cookie = {
    /**
     * Set cookie
     * @param {string} name
     * @param {string} value
     * @param {number} [days=7]
     */
    set(name, value, days = 7) {
      const exp = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie = `${PREFIX}${name}=${encodeURIComponent(value)};expires=${exp};path=/`;
    },

    /**
     * Get cookie
     * @param {string} name
     * @returns {string|null}
     */
    get(name) {
      const match = document.cookie.match(
        new RegExp('(?:^|; )' + PREFIX + name + '=([^;]*)')
      );
      return match ? decodeURIComponent(match[1]) : null;
    },

    /**
     * Xóa cookie
     * @param {string} name
     */
    remove(name) {
      document.cookie = `${PREFIX}${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    },
  };

  return { set, get, remove, clear, has, Session, Cookie };
})();


/* ============================================================
   5. HTTP — Fetch API Wrapper
   ============================================================ */
const Http = (() => {

  let _baseURL = '';
  let _defaultHeaders = { 'Content-Type': 'application/json' };
  let _onUnauthorized = null;

  /**
   * Cấu hình base URL và headers mặc định
   * @param {Object} config
   * @param {string} [config.baseURL]
   * @param {Object} [config.headers]
   * @param {Function} [config.onUnauthorized] — callback khi nhận 401
   * @example
   *   Http.config({ baseURL: 'https://api.wanderviet.vn/v1', headers: { 'X-App': 'WV' } });
   */
  function config({ baseURL = '', headers = {}, onUnauthorized } = {}) {
    _baseURL = baseURL.replace(/\/$/, '');
    _defaultHeaders = { ..._defaultHeaders, ...headers };
    if (onUnauthorized) _onUnauthorized = onUnauthorized;
  }

  /**
   * Thêm Authorization header (JWT token)
   * @param {string} token
   */
  function setToken(token) {
    if (token) _defaultHeaders['Authorization'] = `Bearer ${token}`;
    else delete _defaultHeaders['Authorization'];
  }

  /**
   * Core fetch wrapper
   * @param {string} endpoint
   * @param {RequestInit} [options]
   * @returns {Promise<any>}
   */
  async function _fetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${_baseURL}${endpoint}`;

    const mergedOptions = {
      ...options,
      headers: { ..._defaultHeaders, ...(options.headers || {}) },
    };

    DOM.showLoader();
    try {
      const response = await fetch(url, mergedOptions);

      if (response.status === 401 && _onUnauthorized) {
        _onUnauthorized(response);
        return null;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const message = errData.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new HttpError(message, response.status, errData);
      }

      // 204 No Content
      if (response.status === 204) return null;

      const contentType = response.headers.get('content-type') || '';
      return contentType.includes('application/json')
        ? response.json()
        : response.text();

    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(err.message || 'Network error', 0);
    } finally {
      DOM.hideLoader();
    }
  }

  /** Custom error class */
  class HttpError extends Error {
    constructor(message, status, data = {}) {
      super(message);
      this.name = 'HttpError';
      this.status = status;
      this.data = data;
    }
  }

  /**
   * GET request
   * @param {string} endpoint
   * @param {Object} [params] — query params
   * @returns {Promise<any>}
   * @example Http.get('/tours', { page: 1, limit: 10 })
   */
  function get(endpoint, params = {}) {
    const query = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return _fetch(endpoint + query, { method: 'GET' });
  }

  /**
   * POST request
   * @param {string} endpoint
   * @param {Object} body
   * @returns {Promise<any>}
   */
  function post(endpoint, body = {}) {
    return _fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   * @param {string} endpoint
   * @param {Object} body
   * @returns {Promise<any>}
   */
  function put(endpoint, body = {}) {
    return _fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * PATCH request
   * @param {string} endpoint
   * @param {Object} body
   * @returns {Promise<any>}
   */
  function patch(endpoint, body = {}) {
    return _fetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint
   * @returns {Promise<any>}
   */
  function del(endpoint) {
    return _fetch(endpoint, { method: 'DELETE' });
  }

  /**
   * Upload file (multipart/form-data)
   * @param {string} endpoint
   * @param {FormData} formData
   * @returns {Promise<any>}
   */
  function upload(endpoint, formData) {
    const headers = { ..._defaultHeaders };
    delete headers['Content-Type']; // let browser set boundary
    return _fetch(endpoint, { method: 'POST', headers, body: formData });
  }

  return { config, setToken, get, post, put, patch, delete: del, upload, HttpError };
})();


/* ============================================================
   6. MISC — Tiện ích tổng hợp
   ============================================================ */
const Misc = (() => {

  /**
   * Debounce — trì hoãn gọi function
   * @param {Function} fn
   * @param {number} [delay=300]
   * @returns {Function}
   * @example const onSearch = Misc.debounce(() => search(), 400);
   */
  function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Throttle — giới hạn tần suất gọi function
   * @param {Function} fn
   * @param {number} [limit=300]
   * @returns {Function}
   */
  function throttle(fn, limit = 300) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= limit) {
        last = now;
        fn.apply(this, args);
      }
    };
  }

  /**
   * Chuyển chuỗi → slug URL (tiếng Việt)
   * @param {string} str
   * @returns {string}
   * @example Misc.slugify('Hội An Cổ Phố') // "hoi-an-co-pho"
   */
  function slugify(str) {
    if (!str) return '';
    const map = {
      'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ': 'a',
      'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ': 'e',
      'ì|í|ị|ỉ|ĩ': 'i',
      'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ': 'o',
      'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ': 'u',
      'ỳ|ý|ỵ|ỷ|ỹ': 'y',
      'đ': 'd',
    };
    let result = str.toLowerCase();
    for (const [pattern, replacement] of Object.entries(map)) {
      result = result.replace(new RegExp(pattern, 'g'), replacement);
    }
    return result
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Copy text vào clipboard
   * @param {string} text
   * @param {string} [successMsg='Đã sao chép!']
   * @returns {Promise<void>}
   */
  async function copyToClipboard(text, successMsg = 'Đã sao chép!') {
    try {
      await navigator.clipboard.writeText(text);
      DOM.toast(successMsg, 'success');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      DOM.toast(successMsg, 'success');
    }
  }

  /**
   * Generate UUID v4 đơn giản
   * @returns {string}
   */
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /**
   * Deep clone object (JSON-safe)
   * @param {*} obj
   * @returns {*}
   */
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Merge objects sâu (shallow first level)
   * @param {...Object} sources
   * @returns {Object}
   */
  function merge(...sources) {
    return Object.assign({}, ...sources);
  }

  /**
   * Chờ n milliseconds
   * @param {number} ms
   * @returns {Promise<void>}
   * @example await Misc.sleep(500);
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Lấy giá trị random trong mảng
   * @param {Array} arr
   * @returns {*}
   */
  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Tính số ngày giữa 2 ngày
   * @param {Date|string} start
   * @param {Date|string} end
   * @returns {number}
   */
  function daysBetween(start, end) {
    const ms = new Date(end) - new Date(start);
    return Math.round(ms / 86400000);
  }

  /**
   * Kiểm tra thiết bị mobile
   * @returns {boolean}
   */
  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);
  }

  /**
   * Lấy params từ URL hiện tại
   * @returns {Object}
   * @example Misc.getQueryParams() // { page: '1', q: 'hoi an' }
   */
  function getQueryParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  }

  /**
   * Xây dựng query string từ object
   * @param {Object} params
   * @returns {string}
   */
  function buildQueryString(params) {
    return new URLSearchParams(params).toString();
  }

  return {
    debounce, throttle, slugify, copyToClipboard,
    uuid, clone, merge, sleep, randomFrom,
    daysBetween, isMobile, getQueryParams, buildQueryString,
  };
})();


/* ============================================================
   EXPORT — Hỗ trợ cả ES Module lẫn Global (window.Utils)
   ============================================================ */

const Utils = { Format, DOM, Validate, Storage, Http, Misc };

// ES Module export
export { Utils as default, Format, DOM, Validate, Storage, Http, Misc };

// Global fallback (dùng khi không dùng bundler)
if (typeof window !== 'undefined') {
  window.Utils = Utils;
}