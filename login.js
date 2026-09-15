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
    errorMsg.classList.add('hidden');
    
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
                errorMsg.innerText = 'Access Denied: Invalid ID or PIN';
                errorMsg.classList.remove('hidden');
            }
        } else {
            const username = document.getElementById('admin-user').value;
            const password = document.getElementById('admin-pass').value;
            
            const adminData = await db.getItem('admin');
            if (adminData && adminData.username === username && adminData.password === password) {
                localStorage.setItem('userRole', 'admin');
                window.location.href = 'admin.html';
            } else {
                errorMsg.innerText = 'Access Denied: Invalid Username or Password';
                errorMsg.classList.remove('hidden');
            }
        }
    } catch (e) {
        errorMsg.innerText = 'Login error';
        errorMsg.classList.remove('hidden');
    }
}
