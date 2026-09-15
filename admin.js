let activeTab = 'dashboard';
let workers = [];
let supervisors = [];
let attendance = [];
let adminRole = '';

async function loadData() {
    workers = await db.getItem('workers') || [];
    supervisors = await db.getItem('supervisors') || [];
    attendance = await db.getItem('attendance') || [];
    
    // Set Dashboard Date to Today
    document.getElementById('dash-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('theme-toggle').checked = (await db.getItem('app_theme')) === 'light';

    if(workers.length > 0) adminRole = workers[0].role;
    
    renderDashboard();
    renderWorkersTab();
    renderSupervisorsTab();
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
}

function setActiveTab(tab) {
    document.getElementById(`tab-${activeTab}`).classList.remove('active');
    document.getElementById(`content-${activeTab}`).classList.add('hidden');
    
    activeTab = tab;
    
    document.getElementById(`tab-${activeTab}`).classList.add('active');
    document.getElementById(`content-${activeTab}`).classList.remove('hidden');
    toggleMenu();
}

// Phase 7: Dashboard Shift Tracking
function renderDashboard() {
    const date = document.getElementById('dash-date').value;
    const blocks = document.getElementById('shift-blocks');
    const shifts = ['Shift 1', 'Shift 2', 'Shift 3'];
    
    let html = '';
    shifts.forEach(shift => {
        const record = attendance.find(a => a.date === date && a.shift === shift);
        html += `<div class="card" onclick="alert('Detailed View Coming Soon')">
            <h3>${shift}</h3>`;
        
        if (record) {
            const presentIds = Object.keys(record.records).filter(k => record.records[k]);
            const presentWorkers = workers.filter(w => presentIds.includes(w.id));
            
            // Count roles
            let rolesCount = {};
            presentWorkers.forEach(w => {
                rolesCount[w.role] = (rolesCount[w.role] || 0) + 1;
            });
            
            let roleSummary = Object.entries(rolesCount).map(([r, c]) => `${r}: ${c}`).join(', ');
            
            html += `<p style="margin:0 0 5px 0;"><strong>Supervisor:</strong> ${record.supervisorId}</p>`;
            html += `<p style="margin:0;"><strong>Present:</strong> ${presentWorkers.length} (${roleSummary || 'None'})</p>`;
        } else {
            // Simplified logic: If no record, just say not taken. 
            // Phase 7 says "Attendance was not taken yet."
            html += `<p style="color:#aaa;">Attendance was not taken yet.</p>`;
        }
        html += `</div>`;
    });
    
    blocks.innerHTML = html;
}

// Phase 8: Bulk Upload
let selectedCSV = null;
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.csv')) {
        document.getElementById('file-name').innerText = file.name;
        document.getElementById('upload-btn').style.display = 'block';
        selectedCSV = file;
    } else {
        alert('Please select a valid .csv file');
    }
}

function downloadTemplate() {
    const content = "Employee_Name,Employee_Gender,Role,Contact_Number\nJohn Doe,M,Driver,1234567890";
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Rocksteady_Template.csv";
    a.click();
}

async function processUpload() {
    if (!selectedCSV) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
        
        const newWorkers = [];
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            if (cols.length >= 4) {
                newWorkers.push({
                    Employee_Name: cols[0],
                    Employee_Gender: cols[1],
                    Role: cols[2],
                    Contact_Number: cols[3]
                });
            }
        }
        
        // Push to GAS Script
        try {
            document.getElementById('upload-btn').innerText = "Syncing...";
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'bulk_import', data: newWorkers })
            });
            const result = await response.json();
            alert(result.message);
            // Reload workers
            performBackgroundSync().then(loadData);
        } catch (error) {
            alert("Error syncing to database.");
        }
        
        document.getElementById('upload-btn').innerText = "UPLOAD & SYNC";
        document.getElementById('upload-btn').style.display = 'none';
        document.getElementById('file-name').innerText = '';
        selectedCSV = null;
    };
    reader.readAsText(selectedCSV);
}

// Phase 9: Manage Workers (Dynamic Roles)
function renderWorkersTab() {
    const roles = Array.from(new Set(workers.map(w => w.role)));
    const tabsContainer = document.getElementById('admin-role-tabs');
    tabsContainer.innerHTML = roles.map(r => `
        <button class="${adminRole === r ? 'btn-solid' : 'btn-outline'}" onclick="adminRole='${r}'; renderWorkersTab()">${r}</button>
    `).join('');
    
    const listContainer = document.getElementById('admin-workers-list');
    const filtered = workers.filter(w => w.role === adminRole);
    listContainer.innerHTML = filtered.map(w => `
        <div class="list-item">
            <div>
                <h3 style="margin: 0 0 5px 0;">${w.name} <span style="color:#aaa;font-size:14px;">(${w.id})</span></h3>
                <p style="margin: 0; color: #aaa; font-size: 14px;">${w.contact}</p>
            </div>
            <button class="btn-outline" style="width: auto; padding: 5px 15px;" onclick="openWorkerForm('${w.id}')">Edit</button>
        </div>
    `).join('');
}

function openWorkerForm(id) {
    const w = workers.find(x => x.id === id);
    document.getElementById('edit-w-id').value = w.id;
    document.getElementById('edit-w-name').value = w.name;
    document.getElementById('edit-w-contact').value = w.contact;
    document.getElementById('edit-w-role').value = w.role;
    document.getElementById('worker-modal').classList.remove('hidden');
}

async function saveWorker() {
    const id = document.getElementById('edit-w-id').value;
    const wIndex = workers.findIndex(x => x.id === id);
    if(wIndex > -1) {
        workers[wIndex].name = document.getElementById('edit-w-name').value;
        workers[wIndex].contact = document.getElementById('edit-w-contact').value;
        workers[wIndex].role = document.getElementById('edit-w-role').value;
        await db.setItem('workers', workers);
        renderWorkersTab();
    }
    document.getElementById('worker-modal').classList.add('hidden');
}

async function removeWorker() {
    if(confirm("Are you sure you want to remove this employee? Their ID will be recycled.")) {
        const id = document.getElementById('edit-w-id').value;
        workers = workers.filter(x => x.id !== id);
        await db.setItem('workers', workers);
        renderWorkersTab();
        document.getElementById('worker-modal').classList.add('hidden');
    }
}

// Phase 10: Manage Supervisors
function renderSupervisorsTab() {
    const list = document.getElementById('admin-supervisors-list');
    list.innerHTML = supervisors.map(s => `
        <div class="list-item">
            <div>
                <h3 style="margin: 0 0 5px 0;">${s.name} <span style="color:#aaa;font-size:14px;">(${s.id})</span></h3>
                <span style="background: ${s.shiftControl === 'Auto' ? 'var(--primary)' : 'var(--success)'}; color: #000; padding: 2px 5px; border-radius: 3px; font-size: 12px; font-weight: bold;">${s.shiftControl} Mode</span>
            </div>
            <button class="btn-outline" style="width: auto; padding: 5px 15px;" onclick="openSupervisorEdit('${s.id}')">Edit</button>
        </div>
    `).join('');
}

let editingSupId = null;
function openSupervisorForm() {
    editingSupId = null;
    document.getElementById('sup-modal-title').innerText = "Add Supervisor";
    document.getElementById('edit-s-id').value = '';
    document.getElementById('edit-s-name').value = '';
    document.getElementById('edit-s-pin').value = '';
    document.getElementById('edit-s-shift').value = 'Auto';
    document.getElementById('btn-remove-sup').style.display = 'none';
    document.getElementById('supervisor-modal').classList.remove('hidden');
}

function openSupervisorEdit(id) {
    editingSupId = id;
    const s = supervisors.find(x => x.id === id);
    document.getElementById('sup-modal-title').innerText = "Edit Supervisor";
    document.getElementById('edit-s-id').value = s.id;
    document.getElementById('edit-s-name').value = s.name;
    document.getElementById('edit-s-pin').value = s.pin;
    document.getElementById('edit-s-shift').value = s.shiftControl;
    document.getElementById('btn-remove-sup').style.display = 'inline-block';
    document.getElementById('supervisor-modal').classList.remove('hidden');
}

async function saveSupervisor() {
    const id = document.getElementById('edit-s-id').value;
    const s = {
        id: id,
        name: document.getElementById('edit-s-name').value,
        pin: document.getElementById('edit-s-pin').value,
        shiftControl: document.getElementById('edit-s-shift').value
    };
    
    if (editingSupId) {
        const idx = supervisors.findIndex(x => x.id === editingSupId);
        supervisors[idx] = s;
    } else {
        supervisors.push(s);
    }
    
    await db.setItem('supervisors', supervisors);
    renderSupervisorsTab();
    document.getElementById('supervisor-modal').classList.add('hidden');
}

async function removeSupervisor() {
    if(confirm("Revoke access for this supervisor?")) {
        supervisors = supervisors.filter(x => x.id !== editingSupId);
        await db.setItem('supervisors', supervisors);
        renderSupervisorsTab();
        document.getElementById('supervisor-modal').classList.add('hidden');
    }
}

// Phase 11: History
function renderHistory() {
    const start = document.getElementById('hist-start').value;
    const end = document.getElementById('hist-end').value;
    const table = document.getElementById('history-table');
    
    if(!start || !end) {
        table.innerHTML = "<tr><td>Please select a date range.</td></tr>";
        return;
    }

    let filtered = attendance.filter(a => a.date >= start && a.date <= end);
    
    // Get unique dates
    const dates = Array.from(new Set(filtered.map(a => `${a.date} (${a.shift})`))).sort();
    
    let html = `<tr>
        <th>Worker Name</th>
        <th>Role</th>`;
    dates.forEach(d => html += `<th>${d}</th>`);
    html += `</tr>`;
    
    workers.forEach(w => {
        html += `<tr>
            <td>${w.name}</td>
            <td>${w.role}</td>`;
        
        dates.forEach(d => {
            // Find the shift record
            const [rDate, rShiftRaw] = d.split(' (');
            const rShift = rShiftRaw.replace(')', '');
            const record = filtered.find(a => a.date === rDate && a.shift === rShift);
            
            if (record && record.records[w.id]) {
                html += `<td style="color: var(--success); font-weight:bold;">P</td>`;
            } else {
                html += `<td style="color: var(--danger); font-weight:bold;">A</td>`;
            }
        });
        html += `</tr>`;
    });
    
    table.innerHTML = html;
}

function exportHistory() {
    // Phase 11 logic for exporting
    alert("Export feature relies on Google Sheets API backend. CSV compiled natively coming soon.");
}

// Phase 12: Settings
function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
}
function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}
async function toggleTheme(isLight) {
    const theme = isLight ? 'light' : 'dark';
    if(isLight) {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    await db.setItem('app_theme', theme);
}

document.addEventListener('DOMContentLoaded', loadData);
