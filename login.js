// Handle Loading Screen
document.addEventListener('DOMContentLoaded', async () => {
    // Dot animation
    let dotCount = 0;
    const dotsEl = document.getElementById('dots');
    const dotInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        dotsEl.innerText = '.'.repeat(dotCount);
    }, 500);

    // Timeout logic for slow internet
    const syncPromise = performBackgroundSync();
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 5000));
    
    const result = await Promise.race([syncPromise, timeoutPromise]);
    
    if (result === 'timeout') {
        document.getElementById('loading-text').innerText = "Offline Mode Active";
    }
    
    setTimeout(() => {
        clearInterval(dotInterval);
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
    }, 1000); // Allow brief display of offline message or graceful fade
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
            const id = document.getElementById('sup-id').value;
            const pin = document.getElementById('sup-pin').value;
            
            const supervisors = await db.getItem('supervisors') || [];
            const valid = supervisors.find(s => s.id === id && s.pin === pin);
            
            if (valid) {
                localStorage.setItem('currentUser', JSON.stringify(valid));
                localStorage.setItem('userRole', 'supervisor');
                window.location.href = 'supervisor.html';
            } else {
                showError('Access Denied: Invalid ID or PIN');
            }
        } else {
            const username = document.getElementById('admin-user').value;
            const password = document.getElementById('admin-pass').value;
            
            const adminData = await db.getItem('admin');
            if (adminData && adminData.username === username && adminData.password === password) {
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
