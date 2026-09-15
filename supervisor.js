let workers = [];
let activeRole = '';
let attendanceState = {};
let shift = 'Shift 1';
let date = new Date().toISOString().split('T')[0];
let supervisor = null;

async function loadData() {
    workers = await db.getItem('workers') || [];
    if (workers.length > 0) {
        activeRole = workers[0].role;
    }
    
    const userStr = localStorage.getItem('currentUser');
    if (userStr) supervisor = JSON.parse(userStr);

    // Auto-calculate Shift based on time if strict mode
    if (supervisor?.shiftControl === 'Auto') {
        const hour = new Date().getHours();
        if(hour < 12) shift = 'Shift 1';
        else if (hour < 18) shift = 'Shift 2';
        else shift = 'Shift 3';
    }

    renderControls();
    renderTabs();
    renderWorkers();
}

function renderControls() {
    const canEditShift = supervisor?.shiftControl === 'Manual';
    const dateContainer = document.getElementById('date-container');
    const shiftContainer = document.getElementById('shift-container');

    if (canEditShift) {
        dateContainer.innerHTML = `<input type="date" class="input-field" style="margin:0; width:140px; padding:5px;" value="${date}" onchange="date = this.value">`;
        shiftContainer.innerHTML = `
            <select class="input-field" style="margin:0; width:100px; padding:5px;" onchange="shift = this.value">
                <option value="Shift 1" ${shift === 'Shift 1' ? 'selected' : ''}>Shift 1</option>
                <option value="Shift 2" ${shift === 'Shift 2' ? 'selected' : ''}>Shift 2</option>
                <option value="Shift 3" ${shift === 'Shift 3' ? 'selected' : ''}>Shift 3</option>
            </select>`;
    } else {
        dateContainer.innerHTML = `<span style="font-weight:bold; color:var(--text-color);">${date}</span>`;
        shiftContainer.innerHTML = `<span style="font-weight:bold; color:var(--text-color);">${shift} <span style="font-size:10px; color:var(--success);">(Auto)</span></span>`;
    }
}

function renderTabs() {
    const roles = Array.from(new Set(workers.map(w => w.role)));
    const tabsContainer = document.getElementById('role-tabs');
    tabsContainer.innerHTML = roles.map(r => `
        <button class="${activeRole === r ? 'btn-solid' : 'btn-outline'}" 
                onclick="setActiveRole('${r}')">${r}</button>
    `).join('');
}

function setActiveRole(role) {
    activeRole = role;
    renderTabs();
    renderWorkers();
}

function renderWorkers() {
    const filteredWorkers = workers.filter(w => w.role === activeRole);
    const listContainer = document.getElementById('workers-list');
    
    listContainer.innerHTML = filteredWorkers.map(w => `
        <div class="list-item card" style="margin-bottom:10px;">
            <div>
                <h3 style="margin: 0 0 5px 0;">${w.name}</h3>
                <p style="margin: 0; color: #888; font-size: 14px;">ID: ${w.id}</p>
            </div>
            <label class="toggle-switch">
                <input type="checkbox" 
                       ${attendanceState[w.id] ? 'checked' : ''} 
                       onchange="handleToggle('${w.id}', this.checked)">
                <span class="slider"></span>
            </label>
        </div>
    `).join('');
}

function handleToggle(id, checked) {
    attendanceState[id] = checked;
}

async function submitAttendance() {
    const btn = document.getElementById('submit-btn');
    btn.innerText = "Submitting...";
    btn.disabled = true;

    // Save locally
    const existing = await db.getItem('attendance') || [];
    const newRecord = {
        date,
        shift,
        supervisorId: supervisor?.id,
        records: attendanceState,
        timestamp: new Date().toISOString()
    };
    await db.setItem('attendance', [...existing, newRecord]);

    // Format for Sync
    const attendanceList = Object.keys(attendanceState).map(workerId => ({
        Employee_ID: workerId,
        Status: attendanceState[workerId] ? 'Present' : 'Absent'
    }));

    const syncData = [{
        Date: date,
        Shift: shift,
        Supervisor_ID: supervisor?.id || 'Unknown',
        Attendance: attendanceList
    }];

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'offline_sync', data: syncData })
        });
        const result = await response.json();
        alert('Success: Attendance Logged and Synced to Google Sheets!');
    } catch (error) {
        console.warn('Sync error (Offline Mode):', error);
        
        // Cache to offline queue
        const offlineQueue = await db.getItem('offline_attendance_queue') || [];
        offlineQueue.push(...syncData);
        await db.setItem('offline_attendance_queue', offlineQueue);

        alert('Success: Attendance Logged Offline (Will sync when internet is available)');
    }

    btn.innerText = "SUBMIT ATTENDANCE";
    btn.disabled = false;
}

document.addEventListener('DOMContentLoaded', loadData);
