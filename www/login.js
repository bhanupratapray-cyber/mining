// Handle Loading Screen
document.addEventListener('DOMContentLoaded', async () => {
    // Dot animation
    let dotCount = 0;
    const dotsEl = document.getElementById('dots');
    const dotInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        if(dotsEl) dotsEl.innerText = '.'.repeat(dotCount);
    }, 500);

    const loadingText = document.getElementById('loading-text');

    if (!navigator.onLine) {
        if(loadingText) loadingText.innerText = "Offline Mode Active";
    } else {
        // Wait up to 5 seconds for sync to complete before showing login
        // If it takes longer, it continues syncing in the background invisibly!
        const syncPromise = performBackgroundSync().catch(e => console.error("Sync failed:", e));
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 5000));
        
        await Promise.race([syncPromise, timeoutPromise]);
    }
    
    setTimeout(() => {
        clearInterval(dotInterval);
        const ls = document.getElementById('loading-screen');
        const login = document.getElementById('login-screen');
        if(ls && login) {
            ls.classList.add('hidden');
            login.classList.remove('hidden');
        }
    }, 500); // Small visual buffer
});

let currentRole = 'supervisor';

function setRole(role) {
    currentRole = role;
    document.getElementById('error-msg').classList.add('hidden');
    
    if (role === 'supervisor') {
        document.getElementById('tab-supervisor').classList.add('active');
        document.getElementById('tab-admin').classList.remove('active');
        document.getElementById('supervisor-form').classList.remove('hidden');
        document.getElementById('admin-form').classList.add('hidden');
    } else {
        document.getElementById('tab-admin').classList.add('active');
        document.getElementById('tab-supervisor').classList.remove('active');
        document.getElementById('admin-form').classList.remove('hidden');
        document.getElementById('supervisor-form').classList.add('hidden');
    }
}

async function handleLogin() {
    const errorMsg = document.getElementById('error-msg');
    const loginBtn = document.getElementById('login-btn');
    errorMsg.classList.add('hidden');
    
    // UI Spinner Feedback
    loginBtn.innerText = "Loading...";
    loginBtn.disabled = true;
    
    // Artificial small delay for UX
    await new Promise(r => setTimeout(r, 500));
    
    try {
        if (currentRole === 'supervisor') {
            const id = document.getElementById('sup-id').value.trim();
            const pin = document.getElementById('sup-pin').value.trim();
            
            const supervisors = await db.getItem('supervisors') || [];
            const valid = supervisors.find(s => String(s.id) === String(id) && String(s.pin) === String(pin));
            
            if (valid) {
                localStorage.setItem('currentUser', JSON.stringify(valid));
                localStorage.setItem('userRole', 'supervisor');
                window.location.href = 'supervisor.html';
            } else {
                showError('Access Denied: Invalid ID or PIN');
            }
        } else {
            const username = document.getElementById('admin-user').value.trim();
            const password = document.getElementById('admin-pass').value.trim();
            
            if (username === 'Goyal' && password === '9694') {
                localStorage.setItem('userRole', 'admin');
                window.location.href = 'admin.html';
            } else {
                showError('Access Denied: Invalid Username or Password');
            }
        }
    } catch (e) {
        showError('Login error');
    }
    
    loginBtn.innerText = "ENTER SITE";
    loginBtn.disabled = false;
}

function showError(msg) {
    const errorMsg = document.getElementById('error-msg');
    errorMsg.innerText = msg;
    errorMsg.classList.remove('hidden');
}
