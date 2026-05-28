//authGuard.js

/**
 * auth-guard.js — Quản lý session đăng nhập toàn trang
 * Nhúng vào: index.html, admin.html, public.html (trước các script khác)
 *
 * Chiến lược lưu session:
 *   - "Ghi nhớ đăng nhập" → localStorage  (tồn tại mãi)
 *   - Không ghi nhớ      → sessionStorage (mất khi đóng tab)
 *
 * Vấn đề đã fix:
 *   - sessionStorage KHÔNG chia sẻ khi mở tab mới (window.open)
 *     → Giải pháp: fallback sang localStorage với flag 'sessionOnly'
 *       rồi xóa khi user đóng trình duyệt (qua beforeunload)
 *   - admin.html / public.html hiển thị user hardcode
 *     → Giải pháp: hàm initPageUser() đọc session và render UI động
 */

// ─── HẰNG SỐ ────────────────────────────────────────────────
const AUTH_KEYS = {
    currentUser:   'currentUser',    // object user
    rememberLogin: 'rememberLogin',  // '1' nếu nhớ
    sessionOnly:   'sessionOnly',    // '1' nếu KHÔNG nhớ (để share tab)
    googleUser:    'googleUser',
    authToken:     'authToken',
};

// ─── ĐỌC SESSION ────────────────────────────────────────────

/**
 * Lấy user đang đăng nhập (kiểm tra cả localStorage & sessionStorage)
 * @returns {object|null}
 */
function getCurrentUser() {
    try {
        // 1. Ưu tiên sessionStorage (tab hiện tại)
        let raw = sessionStorage.getItem(AUTH_KEYS.currentUser);
        if (raw) return JSON.parse(raw);

        // 2. Fallback: localStorage (remember hoặc cross-tab session)
        raw = localStorage.getItem(AUTH_KEYS.currentUser);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

/**
 * Kiểm tra trạng thái "ghi nhớ đăng nhập"
 * @returns {boolean}
 */
function isRemembered() {
    return localStorage.getItem(AUTH_KEYS.rememberLogin) === '1';
}

// ─── LƯU SESSION ────────────────────────────────────────────

/**
 * Lưu session sau khi đăng nhập thành công.
 * Gọi hàm này từ login.html thay cho các localStorage.setItem rải rác.
 *
 * @param {object} userObj  - Thông tin user { id, name, email, avatar, role }
 * @param {boolean} remember - Có tick "Ghi nhớ" không
 */
function saveSession(userObj, remember) {
    const json = JSON.stringify(userObj);

    if (remember) {
        // Lưu vĩnh viễn → localStorage
        localStorage.setItem(AUTH_KEYS.currentUser, json);
        localStorage.setItem(AUTH_KEYS.rememberLogin, '1');
        localStorage.removeItem(AUTH_KEYS.sessionOnly);
        sessionStorage.removeItem(AUTH_KEYS.currentUser);
    } else {
        // Không ghi nhớ → lưu cả hai nơi:
        //   sessionStorage: cho tab hiện tại
        //   localStorage:   để admin.html/public.html (tab mới) cũng đọc được
        sessionStorage.setItem(AUTH_KEYS.currentUser, json);
        localStorage.setItem(AUTH_KEYS.currentUser, json);
        localStorage.setItem(AUTH_KEYS.sessionOnly, '1');
        localStorage.removeItem(AUTH_KEYS.rememberLogin);
    }
}

// ─── XÓA SESSION ────────────────────────────────────────────

/**
 * Đăng xuất: xóa toàn bộ session
 */
function clearSession() {
    sessionStorage.removeItem(AUTH_KEYS.currentUser);
    localStorage.removeItem(AUTH_KEYS.currentUser);
    localStorage.removeItem(AUTH_KEYS.rememberLogin);
    localStorage.removeItem(AUTH_KEYS.sessionOnly);
    localStorage.removeItem(AUTH_KEYS.googleUser);
    localStorage.removeItem(AUTH_KEYS.authToken);
}

/**
 * Đăng xuất và chuyển về trang login
 */
function logout() {
    clearSession();
    window.location.href = 'login.html';
}

// ─── XỬ LÝ SESSION-ONLY KHI ĐÓNG TRÌNH DUYỆT ───────────────
// Nếu user không tick "Ghi nhớ", xóa localStorage khi đóng TẤT CẢ tab
// (dùng beforeunload + sessionStorage counter để detect)

(function handleSessionOnlyCleanup() {
    if (typeof window === 'undefined') return;

    const OPEN_TABS_KEY = '__wv_tabs';

    // Đếm số tab đang mở
    let tabCount = parseInt(sessionStorage.getItem(OPEN_TABS_KEY) || '0') + 1;
    sessionStorage.setItem(OPEN_TABS_KEY, String(tabCount));

    // Đồng bộ count lên localStorage để các tab khác đọc
    localStorage.setItem(OPEN_TABS_KEY, String(
        parseInt(localStorage.getItem(OPEN_TABS_KEY) || '0') + 1
    ));

    window.addEventListener('beforeunload', () => {
        const remaining = parseInt(localStorage.getItem(OPEN_TABS_KEY) || '1') - 1;
        if (remaining <= 0) {
            // Tab cuối cùng đóng → xóa session tạm nếu là sessionOnly
            if (localStorage.getItem(AUTH_KEYS.sessionOnly) === '1') {
                localStorage.removeItem(AUTH_KEYS.currentUser);
                localStorage.removeItem(AUTH_KEYS.sessionOnly);
                localStorage.removeItem(AUTH_KEYS.googleUser);
                localStorage.removeItem(AUTH_KEYS.authToken);
            }
            localStorage.removeItem(OPEN_TABS_KEY);
        } else {
            localStorage.setItem(OPEN_TABS_KEY, String(remaining));
        }
    });
})();

// ─── AUTH GUARD (bảo vệ trang cần đăng nhập) ────────────────

/**
 * Gọi ở đầu mỗi trang cần bảo vệ (admin, index, public nếu cần).
 * Nếu chưa đăng nhập → redirect về login.html.
 *
 * @param {object} [options]
 * @param {string[]} [options.allowedRoles]  - Mảng role được phép vào, vd ['admin']
 * @param {string}   [options.redirectTo]    - Trang redirect nếu không có quyền (mặc định: login.html)
 */
function requireAuth(options = {}) {
    const { allowedRoles = [], redirectTo = 'login.html' } = options;
    const user = getCurrentUser();

    if (!user) {
        window.location.replace(redirectTo);
        return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // Có đăng nhập nhưng không đủ quyền
        window.location.replace('index.html');
        return null;
    }

    return user;
}

// ─── RENDER USER UI TRÊN TRANG ───────────────────────────────

/**
 * Điền thông tin user vào UI của trang (sidebar, navbar, v.v.)
 * Tự động tìm các element theo data-auth-* attribute.
 *
 * Cách dùng trong HTML:
 *   <span data-auth="name"></span>
 *   <span data-auth="email"></span>
 *   <img  data-auth="avatar">
 *   <span data-auth="role"></span>
 *   <span data-auth="initials"></span>   ← 2 chữ cái đầu tên
 *
 * @param {object} user - Object user từ getCurrentUser()
 */
function renderUserUI(user) {
    if (!user) return;

    // Initials (vd "Minh Tuấn" → "MT")
    const initials = user.name
        ? user.name.trim().split(/\s+/).map(w => w[0]).slice(-2).join('').toUpperCase()
        : (user.email || '?')[0].toUpperCase();

    document.querySelectorAll('[data-auth]').forEach(el => {
        const field = el.getAttribute('data-auth');
        switch (field) {
            case 'name':     el.textContent = user.name || user.email; break;
            case 'email':    el.textContent = user.email; break;
            case 'role':     el.textContent = formatRole(user.role); break;
            case 'initials': el.textContent = initials; break;
            case 'avatar':
                if (el.tagName === 'IMG') {
                    el.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=2D5A3D&color=fff`;
                    el.alt = user.name || 'Avatar';
                } else {
                    el.textContent = initials;
                }
                break;
        }
    });
}

/**
 * Định dạng role thành tiếng Việt
 */
function formatRole(role) {
    const map = { admin: 'Quản trị viên', user: 'Thành viên', moderator: 'Điều hành viên' };
    return map[role] || role || 'Thành viên';
}

/**
 * Hàm tiện lợi: guard + render trong một bước.
 * Gọi ở đầu <script> của mỗi trang được bảo vệ.
 *
 * @param {object} [options] - Giống requireAuth options
 * @returns {object|null} user object hoặc null nếu redirect
 *
 * Ví dụ dùng trong admin.html:
 *   const user = initPageAuth({ allowedRoles: ['admin'] });
 *
 * Ví dụ dùng trong index.html / public.html:
 *   const user = initPageAuth();
 */
function initPageAuth(options = {}) {
    const user = requireAuth(options);
    if (user) renderUserUI(user);
    return user;
}

// ─── TỰ ĐỘNG CHUYỂN HƯỚNG NẾU ĐÃ ĐĂNG NHẬP (dùng ở login.html) ──

/**
 * Gọi ở login.html: nếu đã có session hợp lệ → redirect thẳng vào app.
 * @param {string} [destination] - Trang đích (mặc định: index.html)
 */
function redirectIfLoggedIn(destination = 'index.html') {
    const user = getCurrentUser();
    if (user) {
        window.location.replace(destination);
    }
}

// ─── EXPORT ─────────────────────────────────────────────────
if (typeof window !== 'undefined') {
    Object.assign(window, {
        getCurrentUser,
        isRemembered,
        saveSession,
        clearSession,
        logout,
        requireAuth,
        renderUserUI,
        initPageAuth,
        redirectIfLoggedIn,
        AUTH_KEYS,
    });
}