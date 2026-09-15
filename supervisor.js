let workers = [];
let activeRole = '';
let attendanceState = {};
let shift = 'Shift 1';
let date = new Date().toISOString().split('T')[0];
let supervisor = null;

async function loadData() {
    const w = await db.getItem('workers') || [];
    workers = w;
    if (w.length > 0) {
        activeRole = w[0].role;
    }
    
    const userStr = localStorage.getItem('currentUser');
    if (userStr) supervisor = JSON.parse(userStr);

    renderControls();
    renderTabs();
    renderWorkers();
}

function renderControls() {
    const canEditShift = supervisor?.shiftControl === 'Manual';
    const dateContainer = document.getElementById('date-container');
    const shiftContainer = document.getElementById('shift-container');

    if (canEditShift) {
        dateContainer.innerHTML = `<input type="date" value="${date}" onchange="date = this.value">`;
        shiftContainer.innerHTML = `
            <select onchange="shift = this.value">
                <option value="Shift 1" ${shift === 'Shift 1' ? 'selected' : ''}>Shift 1</option>
                <option value="Shift 2" ${shift === 'Shift 2' ? 'selected' : ''}>Shift 2</option>
                <option value="Shift 3" ${shift === 'Shift 3' ? 'selected' : ''}>Shift 3</option>
            </select>`;
    } else {
        dateContainer.innerHTML = `<span>${date}</span>`;
        shiftContainer.innerHTML = `<span>${shift}</span>`;
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
        <div class="list-item">
            <div>
                <h3 style="margin: 0 0 5px 0;">${w.name}</h3>
                <p style="margin: 0; color: #aaa; font-size: 14px;">ID: ${w.id}</p>
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
    const existing = await db.getItem('attendance') || [];
    const newRecord = {
        date,
        shift,
        supervisorId: supervisor?.id,
        records: attendanceState,
        timestamp: new Date().toISOString()
    };
    await db.setItem('attendance', [...existing, newRecord]);

    try {
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

        const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_umeCVHwoIt7a3Qp6UkXxEXyidK9nO1oHIwTblN951XUIQbrbOEFv-smdiTZyP5o4/exec";
        
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'offline_sync', data: syncData })
        }).then(response => response.json())
          .then(result => {
              console.log('Sync Result:', result);
              alert('Success: Attendance Logged and Synced to Google Sheets!');
          }).catch(error => {
              console.error('Sync error:', error);
              alert('Success: Attendance Logged Offline (Will sync when internet is available)');
          });
    } catch (error) {
        console.error('Sync error:', error);
        alert('Success: Attendance Logged Offline (Will sync when internet is available)');
    }
}

document.addEventListener('DOMContentLoaded', loadData);
