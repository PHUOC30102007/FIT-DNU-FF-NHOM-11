//api.js

/**
 * api.js - Cấu hình và helper cho Fetch API
 * Áp dụng: JSON & Fetch API, Promise, Error Handling, Loading states
 */

const API_CONFIG = {
    baseUrl:  'https://6a0367ff2afe8349b4b52e50.mockapi.io/api/v1',
    baseUrl2: 'https://6a03c8fe2afe8349b4b57ae0.mockapi.io/api/v1',
    endpoints: {
        trips:        '/trips',
        places:       '/places',
        destinations: '/destinations',
        members:      '/members',
        budgets:      '/budgets',
        notes:        '/notes'
    },
    timeout: 10000,
};

let apiState = {
    loading: false,
    error: null,
    cache: new Map()
};

function getFullUrl(endpoint)  { return `${API_CONFIG.baseUrl}${endpoint}`; }
function getFullUrl2(endpoint) { return `${API_CONFIG.baseUrl2}${endpoint}`; }

function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('authToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// ─── Core fetch (showLoading mặc định TẮT để tránh crash khi DOM chưa sẵn sàng) ───
async function fetchAPI(url, options = {}) {
    const config = {
        method: 'GET',
        headers: getHeaders(),
        ...options,
    };
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    try {
        const response = await fetch(url, { ...config, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') throw new Error('Yêu cầu bị hết thời gian chờ');
        throw error;
    }
}

// ─── CRUD — API 1 ───
async function apiGet(endpoint, id = null) {
    const url = id ? `${getFullUrl(endpoint)}/${id}` : getFullUrl(endpoint);
    return fetchAPI(url);
}
async function apiPost(endpoint, data) {
    return fetchAPI(getFullUrl(endpoint), { method: 'POST', body: data });
}
async function apiPut(endpoint, id, data) {
    return fetchAPI(`${getFullUrl(endpoint)}/${id}`, { method: 'PUT', body: data });
}
async function apiDelete(endpoint, id) {
    return fetchAPI(`${getFullUrl(endpoint)}/${id}`, { method: 'DELETE' });
}

// ─── CRUD — API 2 ───
async function apiGet2(endpoint, id = null) {
    const url = id ? `${getFullUrl2(endpoint)}/${id}` : getFullUrl2(endpoint);
    return fetchAPI(url);
}
async function apiPost2(endpoint, data) {
    return fetchAPI(getFullUrl2(endpoint), { method: 'POST', body: data });
}
async function apiPut2(endpoint, id, data) {
    return fetchAPI(`${getFullUrl2(endpoint)}/${id}`, { method: 'PUT', body: data });
}
async function apiDelete2(endpoint, id) {
    return fetchAPI(`${getFullUrl2(endpoint)}/${id}`, { method: 'DELETE' });
}

// ─── Gọi cả 2 API đồng thời ───
async function apiGetBoth(endpoint, id = null) {
    const [res1, res2] = await Promise.allSettled([
        apiGet(endpoint, id),
        apiGet2(endpoint, id)
    ]);
    const api1 = res1.status === 'fulfilled'
        ? (Array.isArray(res1.value) ? res1.value : [res1.value]).map(i => ({ ...i, _source: 'api1' }))
        : [];
    const api2 = res2.status === 'fulfilled'
        ? (Array.isArray(res2.value) ? res2.value : [res2.value]).map(i => ({ ...i, _source: 'api2' }))
        : [];
    if (res1.status === 'rejected') console.warn('[API 1 lỗi]', res1.reason?.message);
    if (res2.status === 'rejected') console.warn('[API 2 lỗi]', res2.reason?.message);
    return { api1, api2, combined: [...api1, ...api2] };
}

async function getAllPlaces() {
    const { combined } = await apiGetBoth(API_CONFIG.endpoints.places);
    return combined;
}

async function getAllTrips() {
    const { combined } = await apiGetBoth(API_CONFIG.endpoints.trips);
    return combined;
}

// ─── UI Helpers ───
function showAppLoading(show) {
    apiState.loading = show;
    if (typeof document === 'undefined') return;
    let loader = document.getElementById('app-loader');
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'app-loader';
            loader.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.8);z-index:9999;';
            loader.innerHTML = `<div style="text-align:center">
                <div style="width:40px;height:40px;border:4px solid #e6e6ed;border-top-color:#2D5A3D;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto"></div>
                <p style="margin-top:12px;color:#7A7A96;font-size:14px">Đang tải dữ liệu...</p>
            </div>
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    } else if (loader) {
        loader.style.display = 'none';
    }
}

function showToast(message, type = 'error') {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:360px;';
        document.body.appendChild(container);
    }
    const colors = { error:'#DC2626', success:'#2D5A3D', warning:'#D97706', info:'#2563EB' };
    const icons  = { error:'bx-x-circle', success:'bx-check-circle', warning:'bx-error', info:'bx-info-circle' };
    const toast  = document.createElement('div');
    toast.style.cssText = `background:${colors[type]||colors.error};color:#fff;padding:12px 16px;border-radius:10px;display:flex;align-items:center;gap:10px;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,0.15);animation:slideIn 0.2s ease`;
    toast.innerHTML = `<i class="bx ${icons[type]||icons.error}" style="font-size:18px;flex-shrink:0"></i><span style="flex:1">${message}</span><button onclick="this.parentNode.remove()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;line-height:1;padding:0">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// ─── Exports ───
if (typeof window !== 'undefined') {
    Object.assign(window, {
        API_CONFIG, apiState, fetchAPI,
        apiGet, apiPost, apiPut, apiDelete,
        apiGet2, apiPost2, apiPut2, apiDelete2,
        apiGetBoth, getAllPlaces, getAllTrips,
        showAppLoading, showToast
    });
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_CONFIG, apiState, fetchAPI,
        apiGet, apiPost, apiPut, apiDelete,
        apiGet2, apiPost2, apiPut2, apiDelete2,
        apiGetBoth, getAllPlaces, getAllTrips,
        showAppLoading, showToast
    };
}