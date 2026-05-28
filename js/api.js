//api.js

/**
 * api.js - Cấu hình và helper cho Fetch API
 * Áp dụng: JSON & Fetch API, Promise, Error Handling, Loading states
 */

const API_CONFIG = {
    baseUrl: 'https://6a0367ff2afe8349b4b52e50.mockapi.io/api/v1', 
    endpoints: {
        trips: '/trips',
        places: '/places',
        members: '/members',
        budgets: '/budgets',
        notes: '/notes'
    },
    timeout: 10000, // 10 seconds
};

// Biến toàn cục để quản lý trạng thái
let apiState = {
    loading: false,
    error: null,
    cache: new Map() // Cache dữ liệu nếu cần
};

/**
 * Helper tạo URL đầy đủ
 * @param {string} endpoint - Đường dẫn endpoint
 * @returns {string} URL đầy đủ
 */
function getFullUrl(endpoint) {
    return `${API_CONFIG.baseUrl}${endpoint}`;
}

/**
 * Tạo headers cho request
 * @param {boolean} isJson - Có phải JSON không
 * @returns {object} Headers object
 */
function getHeaders(isJson = true) {
    const headers = {
        'Content-Type': 'application/json',
    };
    // Thêm Authorization token nếu có
    const token = localStorage.getItem('authToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Fetch API với xử lý đầy đủ
 * @param {string} url - URL đầy đủ
 * @param {object} options - Options cho fetch
 * @returns {Promise} Promise trả về data hoặc lỗi
 */
async function fetchAPI(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: getHeaders(true),
    };

    const config = { ...defaultOptions, ...options };
    
    // Xử lý body nếu có
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    return new Promise((resolve, reject) => {
        // Hiển thị loading nếu cần
        if (options.showLoading !== false) {
            showAppLoading(true);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

        fetch(url, { ...config, signal: controller.signal })
            .then(response => {
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response.json();
            })
            .then(data => {
                showAppLoading(false);
                resolve(data);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                showAppLoading(false);
                
                // Xử lý các loại lỗi
                let errorMessage = 'Đã xảy ra lỗi kết nối';
                if (error.name === 'AbortError') {
                    errorMessage = 'Yêu cầu bị hết thời gian chờ';
                } else if (error.message.includes('HTTP')) {
                    errorMessage = error.message;
                }
                
                reject(new Error(errorMessage));
            });
    });
}

// ==================== CRUD Operations ====================

/**
 * GET - Lấy danh sách hoặc một bản ghi
 * @param {string} endpoint - Endpoint
 * @param {string|number} id - ID (tùy chọn)
 * @returns {Promise}
 */
async function apiGet(endpoint, id = null) {
    const url = id ? `${getFullUrl(endpoint)}/${id}` : getFullUrl(endpoint);
    return fetchAPI(url, { method: 'GET' });
}

/**
 * POST - Tạo mới bản ghi
 * @param {string} endpoint - Endpoint  
 * @param {object} data - Dữ liệu tạo mới
 * @returns {Promise}
 */
async function apiPost(endpoint, data) {
    return fetchAPI(getFullUrl(endpoint), {
        method: 'POST',
        body: data
    });
}

/**
 * PUT - Cập nhật bản ghi
 * @param {string} endpoint - Endpoint
 * @param {string|number} id - ID bản ghi
 * @param {object} data - Dữ liệu cập nhật
 * @returns {Promise}
 */
async function apiPut(endpoint, id, data) {
    return fetchAPI(`${getFullUrl(endpoint)}/${id}`, {
        method: 'PUT',
        body: data
    });
}

/**
 * DELETE - Xóa bản ghi
 * @param {string} endpoint - Endpoint
 * @param {string|number} id - ID bản ghi
 * @returns {Promise}
 */
async function apiDelete(endpoint, id) {
    return fetchAPI(`${getFullUrl(endpoint)}/${id}`, {
        method: 'DELETE'
    });
}

/**
 * Hiển thị/ẩn loading spinner
 * @param {boolean} show - Hiển thị hay không
 */
function showAppLoading(show) {
    apiState.loading = show;
    
    // Tìm hoặc tạo spinner nếu chưa có
    let loader = document.getElementById('app-loader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'app-loader';
            loader.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75';
            loader.style.zIndex = '9999';
            loader.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Đang tải dữ liệu...</p>
                </div>
            `;
            // Thêm Bootstrap nếu chưa có
            if (!document.querySelector('link[href*="bootstrap"]')) {
                addBootstrapCSS();
            }
            document.body.appendChild(loader);
        }
        loader.classList.remove('d-none');
    } else if (loader) {
        loader.classList.add('d-none');
    }
}

/**
 * Thêm Bootstrap CSS vào trang nếu chưa có
 */
function addBootstrapCSS() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
    document.head.appendChild(link);
}

/**
 * Hiển thị thông báo lỗi (Toast)
 * @param {string} message - Thông báo lỗi
 * @param {string} type - Loại thông báo (error, success, warning, info)
 */
function showToast(message, type = 'error') {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast show position-relative`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const bgClass = {
        error: 'bg-danger',
        success: 'bg-success',
        warning: 'bg-warning',
        info: 'bg-info'
    }[type] || 'bg-danger';
    
    const iconClass = {
        error: 'bx-x-circle',
        success: 'bx-check-circle',
        warning: 'bx-exclamation-circle',
        info: 'bx-info-circle'
    }[type] || 'bx-x-circle';
    
    toast.innerHTML = `
        <div class="toast-body d-flex align-items-center gap-2 ${bgClass} text-white p-3">
            <i class="bx ${iconClass} fs-5"></i>
            <span class="flex-grow-1">${message}</span>
            <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="Close" onclick="this.closest('.toast').remove()"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Tự động xóa sau 5 giây
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

/**
 * Tạo container cho toast
 * @returns {HTMLElement}
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    container.style.maxWidth = '400px';
    document.body.appendChild(container);
    return container;
}

// Export các hàm để sử dụng ở file khác
if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
    window.apiState = apiState;
    window.fetchAPI = fetchAPI;
    window.apiGet = apiGet;
    window.apiPost = apiPost;
    window.apiPut = apiPut;
    window.apiDelete = apiDelete;
    window.showAppLoading = showAppLoading;
    window.showToast = showToast;
}

// Export dưới dạng module nếu dùng ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_CONFIG,
        apiState,
        fetchAPI,
        apiGet,
        apiPost,
        apiPut,
        apiDelete,
        showAppLoading,
        showToast
    };
}