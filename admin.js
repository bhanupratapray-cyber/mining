let activeTab = 'dashboard';
let workers = [];
let supervisors = [];
let attendance = [];
let adminRole = '';

async function loadData() {
    workers = await db.getItem('workers') || [];
    supervisors = await db.getItem('supervisors') || [];
    attendance = await db.getItem('attendance') || [];
    
    // Set Dashboard Date to Today if not already set
    const dateInput = document.getElementById('dash-date');
    if (!dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    document.getElementById('theme-toggle').checked = (await db.getItem('app_theme')) === 'light';

    if(workers.length > 0) adminRole = workers[0].role;
    
    // History Default to Current Month
    const today = new Date();
    const monthStr = today.toISOString().slice(0, 7);
    if (!document.getElementById('hist-month').value) {
        document.getElementById('hist-month').value = monthStr;
        handleMonthChange();
    }
    populateHistoryRoles();
    
    renderDashboard();
    renderWorkersTab();
    renderSupervisorsTab();
    // Auto-load history for the current month
    renderHistory();
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

async function refreshDashboard() {
    const btn = document.getElementById('refresh-btn');
    if (btn) {
        btn.innerText = 'Refreshing...';
        btn.disabled = true;
    }
    
    // Sync with remote server for updated workers roster
    if (typeof performBackgroundSync === 'function') {
        await performBackgroundSync();
    }
    
    // Reload local variables from the DB (updates attendance if Supervisors recorded shifts locally)
    await loadData();
    
    if (btn) {
        btn.innerText = 'Refresh Data';
        btn.disabled = false;
    }
}

// Phase 7: Dashboard Shift Tracking
function renderDashboard() {
    const date = document.getElementById('dash-date').value;
    const blocks = document.getElementById('shift-blocks');
    const shifts = ['Shift 1', 'Shift 2', 'Shift 3'];
    
    let html = '';
    shifts.forEach(shift => {
        const record = attendance.find(a => a.date === date && a.shift === shift);
        html += `<div class="card" style="cursor: pointer;" onclick="openShiftDetails('${date}', '${shift}')">
            <h3>${shift}</h3>`;
        
        if (record) {
            const presentIds = Object.keys(record.records).filter(k => record.records[k]);
            const presentWorkers = workers.filter(w => presentIds.includes(String(w.id)));
            
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
    a.download = "Ray_Template.csv";
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
    const w = workers.find(x => String(x.id) === String(id));
    if(!w) return;
    
    document.getElementById('edit-w-id').value = w.id;
    document.getElementById('edit-w-name').value = w.name || '';
    document.getElementById('edit-w-contact').value = w.contact || '';
    document.getElementById('edit-w-role').value = w.role || '';
    document.getElementById('worker-modal').classList.remove('hidden');
}

async function saveWorker() {
    const id = document.getElementById('edit-w-id').value;
    const wIndex = workers.findIndex(x => String(x.id) === String(id));
    if(wIndex > -1) {
        // UI Feedback
        const btn = document.querySelector('#worker-modal .btn-success');
        const oldText = btn.innerText;
        btn.innerText = "Saving...";
        btn.disabled = true;

        workers[wIndex].name = document.getElementById('edit-w-name').value;
        workers[wIndex].contact = document.getElementById('edit-w-contact').value;
        workers[wIndex].role = document.getElementById('edit-w-role').value;
        
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'edit_worker', data: workers[wIndex] })
            });
            await db.setItem('workers', workers);
            renderWorkersTab();
            document.getElementById('worker-modal').classList.add('hidden');
        } catch(e) {
            alert("Error syncing edit to server.");
        }
        
        btn.innerText = oldText;
        btn.disabled = false;
    }
}

async function removeWorker() {
    if(confirm("Are you sure you want to remove this employee? WARNING: Do not reuse this ID for new employees to preserve accurate attendance history!")) {
        const id = document.getElementById('edit-w-id').value;
        
        // UI Feedback
        const btn = document.querySelector('#worker-modal .btn-danger');
        const oldText = btn.innerText;
        btn.innerText = "Removing...";
        btn.disabled = true;
        
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'remove_worker', data: id })
            });
            
            workers = workers.filter(x => String(x.id) !== String(id));
            await db.setItem('workers', workers);
            renderWorkersTab();
            document.getElementById('worker-modal').classList.add('hidden');
        } catch(e) {
            alert("Error syncing removal to server.");
        }
        
        btn.innerText = oldText;
        btn.disabled = false;
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
    const s = supervisors.find(x => String(x.id) === String(id));
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
    
    // UI Feedback
    const btn = document.querySelector('#supervisor-modal .btn-success');
    const oldText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;
    
    if (editingSupId) {
        const idx = supervisors.findIndex(x => String(x.id) === String(editingSupId));
        supervisors[idx] = s;
    } else {
        supervisors.push(s);
    }
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: editingSupId ? 'edit_supervisor' : 'add_supervisor', data: s })
        });
        await db.setItem('supervisors', supervisors);
        renderSupervisorsTab();
        document.getElementById('supervisor-modal').classList.add('hidden');
    } catch(e) {
        alert("Error syncing supervisor to server.");
    }
    
    btn.innerText = oldText;
    btn.disabled = false;
}

async function removeSupervisor() {
    if(confirm("Revoke access for this supervisor?")) {
        const btn = document.getElementById('btn-remove-sup');
        const oldText = btn.innerText;
        btn.innerText = "Removing...";
        btn.disabled = true;
        
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'remove_supervisor', data: editingSupId })
            });
            supervisors = supervisors.filter(x => String(x.id) !== String(editingSupId));
            await db.setItem('supervisors', supervisors);
            renderSupervisorsTab();
            document.getElementById('supervisor-modal').classList.add('hidden');
        } catch(e) {
            alert("Error syncing removal to server.");
        }
        
        btn.innerText = oldText;
        btn.disabled = false;
    }
}

// Phase 11: History
function handleMonthChange() {
    const monthVal = document.getElementById('hist-month').value; // "YYYY-MM"
    if(monthVal) {
        const [year, month] = monthVal.split('-');
        // Get first day of the month
        const firstDay = new Date(year, month - 1, 1).toLocaleDateString('en-CA');
        // Get last day of the month
        const lastDay = new Date(year, month, 0).toLocaleDateString('en-CA');
        
        document.getElementById('hist-start').value = firstDay;
        document.getElementById('hist-end').value = lastDay;
        
        renderHistory();
    }
}

function populateHistoryRoles() {
    const roles = Array.from(new Set(workers.map(w => w.role)));
    const select = document.getElementById('hist-role');
    const currentVal = select.value || "All";
    
    let html = '<option value="All">All Roles</option>';
    roles.forEach(r => html += `<option value="${r}">${r}</option>`);
    select.innerHTML = html;
    select.value = currentVal;
}

function renderHistory() {
    const start = document.getElementById('hist-start').value;
    const end = document.getElementById('hist-end').value;
    const roleFilter = document.getElementById('hist-role').value;
    const nameFilter = document.getElementById('hist-name').value.toLowerCase().trim();
    const table = document.getElementById('history-table');
    
    if(!start || !end) {
        table.innerHTML = "<tr><td>Please select a date range.</td></tr>";
        return;
    }

    let filteredAtt = attendance.filter(a => a.date >= start && a.date <= end);
    let filteredWorkers = workers;
    
    if (roleFilter && roleFilter !== "All") {
        filteredWorkers = filteredWorkers.filter(w => w.role === roleFilter);
    }
    
    if (nameFilter) {
        filteredWorkers = filteredWorkers.filter(w => w.name.toLowerCase().includes(nameFilter));
    }
    
    // Group dates and shifts
    let dateMap = {};
    let totalCompanyShifts = 0;
    
    filteredAtt.forEach(a => {
        if (!dateMap[a.date]) dateMap[a.date] = [];
        if (!dateMap[a.date].includes(a.shift)) {
            dateMap[a.date].push(a.shift);
            totalCompanyShifts++;
        }
    });
    
    const uniqueDates = Object.keys(dateMap).sort();
    const totalCompanyDays = uniqueDates.length;
    
    if (uniqueDates.length === 0) {
        table.innerHTML = "<tr><td style='padding:20px;text-align:center;'>No attendance records found for this period.</td></tr>";
        return;
    }
    
    if (filteredWorkers.length === 0) {
        table.innerHTML = "<tr><td style='padding:20px;text-align:center;'>No employees match the selected filters.</td></tr>";
        return;
    }
    
    // Build Header
    let html = `<thead><tr>
        <th rowspan="2" style="min-width: 150px; position: sticky; left: 0; background: var(--table-head-bg); z-index: 3; border-right: 2px solid var(--table-border-strong);">Worker Name</th>
        <th rowspan="2" style="min-width: 100px; position: sticky; left: 150px; background: var(--table-head-bg); z-index: 3; border-right: 2px solid var(--table-border-strong);">Role</th>`;
        
    let colorToggle = false;
    uniqueDates.forEach(date => {
        const bg = colorToggle ? 'var(--table-head-alt1)' : 'var(--table-head-alt2)';
        html += `<th colspan="${dateMap[date].length}" style="background: ${bg}; text-align: center; border-right: 2px solid var(--table-border-strong);">${formatDateDisplay(date)}</th>`;
        colorToggle = !colorToggle;
    });
    
    html += `<th rowspan="2" style="background: var(--table-head-bg); min-width: 100px; text-align:center;">Co. Days/Shifts</th>
             <th rowspan="2" style="background: var(--table-head-bg); min-width: 100px; text-align:center;">Days Present</th>
             <th rowspan="2" style="background: var(--table-head-bg); min-width: 100px; text-align:center;">Shifts Worked</th>
         </tr><tr>`;
         
    colorToggle = false;
    uniqueDates.forEach(date => {
        const bg = colorToggle ? 'var(--table-head-alt1)' : 'var(--table-head-alt2)';
        dateMap[date].sort().forEach(shift => {
            const shortShift = shift.replace('Shift ', 'S');
            const isLast = (shift === dateMap[date][dateMap[date].length - 1]);
            html += `<th style="background: ${bg}; text-align: center; font-size: 12px; border-right: ${isLast ? '2px solid var(--table-border-strong)' : '1px solid var(--table-border-light)'};">${shortShift}</th>`;
        });
        colorToggle = !colorToggle;
    });
    html += `</tr></thead><tbody>`;
    
    // Build Body
    filteredWorkers.forEach(w => {
        html += `<tr>
            <td style="position: sticky; left: 0; background: var(--table-sticky-bg); z-index: 1; border-right: 2px solid var(--table-border-strong);"><strong>${w.name}</strong></td>
            <td style="position: sticky; left: 150px; background: var(--table-sticky-bg); z-index: 1; color: var(--text-color); border-right: 2px solid var(--table-border-strong);">${w.role}</td>`;
            
        let empDaysPresent = new Set();
        let empShiftsWorked = 0;
        
        colorToggle = false;
        uniqueDates.forEach(date => {
            const bg = colorToggle ? 'var(--table-body-alt1)' : 'var(--table-body-alt2)';
            dateMap[date].sort().forEach(shift => {
                const record = filteredAtt.find(a => a.date === date && a.shift === shift);
                const isLast = (shift === dateMap[date][dateMap[date].length - 1]);
                const borderRight = isLast ? '2px solid var(--table-border-strong)' : '1px solid var(--table-border-light)';
                
                if (record && record.records[w.id]) {
                    empDaysPresent.add(date);
                    empShiftsWorked++;
                    html += `<td style="background: ${bg}; border-right: ${borderRight}; color: var(--success); font-weight:bold; text-align:center;">P</td>`;
                } else {
                    if (record) {
                        html += `<td style="background: ${bg}; border-right: ${borderRight}; color: var(--danger); font-weight:bold; text-align:center;">A</td>`;
                    } else {
                        html += `<td style="background: ${bg}; border-right: ${borderRight}; color: #888; text-align:center;">-</td>`;
                    }
                }
            });
            colorToggle = !colorToggle;
        });
        
        // Summaries
        html += `<td t="s" style="text-align: center; font-weight: bold; background: var(--table-summary-bg);">${totalCompanyDays} | ${totalCompanyShifts}</td>`;
        html += `<td style="text-align: center; font-weight: bold; background: var(--table-summary-bg); color: ${empDaysPresent.size === 0 ? '#888' : 'var(--primary)'};">${empDaysPresent.size}</td>`;
        html += `<td style="text-align: center; font-weight: bold; background: var(--table-summary-bg); color: ${empShiftsWorked === 0 ? '#888' : 'var(--primary)'};">${empShiftsWorked}</td>`;
        html += `</tr>`;
    });
    
    html += `</tbody>`;
    table.innerHTML = html;
}

function exportHistory(format) {
    const table = document.getElementById('history-table');
    if (!table || table.rows.length <= 1) {
        alert("No data to export!");
        return;
    }
    
    // CSV or Excel
    if (format === 'csv' || format === 'excel') {
        if (typeof XLSX === 'undefined') {
            alert('Export library is not loaded yet. Please check your internet connection.');
            return;
        }
        
        // Parse the table HTML directly into a workbook
        const wb = XLSX.utils.table_to_book(table, {sheet: "Attendance"});
        
        if (format === 'csv') {
            XLSX.writeFile(wb, "attendance_history.csv", { bookType: "csv" });
        } else {
            XLSX.writeFile(wb, "attendance_history.xlsx");
        }
    } 
    // PDF
    else if (format === 'pdf') {
        if (!window.jspdf) {
            alert('PDF library is not loaded yet. Please check your internet connection.');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape'); 
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // 1. Draw a beautiful Blue Gradient Banner at the top
        for (let i = 0; i <= 38; i++) {
            // Gradient from dark blue (25, 50, 80) to lighter blue (41, 128, 185)
            let r = Math.round(25 + ((41 - 25) * (i / 38)));
            let g = Math.round(50 + ((128 - 50) * (i / 38)));
            let b = Math.round(80 + ((185 - 80) * (i / 38)));
            doc.setFillColor(r, g, b);
            doc.rect(0, i, pageWidth, 1.5, 'F');
        }
        
        // 2. Add Company Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Y.L.A Infrastructure Pvt Ltd.", pageWidth / 2, 16, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Official Attendance Sheet", pageWidth / 2, 24, { align: 'center' });
        
        // 3. Format Month and Date Range dynamically
        const monthVal = document.getElementById('hist-month').value;
        const monthText = monthVal ? new Date(monthVal + '-01').toLocaleDateString('en-US', {month: 'long', year: 'numeric'}) : "Custom Range";
        const startRaw = document.getElementById('hist-start').value;
        const endRaw = document.getElementById('hist-end').value;
        const start = startRaw ? formatDateDisplay(startRaw) : '';
        const end = endRaw ? formatDateDisplay(endRaw) : '';
        
        doc.setFontSize(10);
        doc.text(`Month: ${monthText}   |   Date Range: ${start} to ${end}`, pageWidth / 2, 32, { align: 'center' });
        
        // 4. Render Table with attractive styles
        doc.autoTable({
            html: '#history-table',
            startY: 42,
            theme: 'grid',
            styles: { 
                fontSize: 7, 
                cellPadding: 1.5,
                lineColor: [220, 220, 220],
                lineWidth: 0.1
            },
            headStyles: { 
                fillColor: [41, 128, 185], 
                textColor: 255,
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Very light blue-grey striped rows
            },
            tableWidth: 'auto',
            didParseCell: function(data) {
                // Style Present/Absent marks specifically for readability
                if (data.section === 'body') {
                    const txt = data.cell.text[0];
                    if (txt === 'P') {
                        data.cell.styles.textColor = [39, 174, 96]; // Green
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.halign = 'center';
                    } else if (txt === 'A') {
                        data.cell.styles.textColor = [192, 57, 43]; // Red
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.halign = 'center';
                    } else if (txt === '-') {
                        data.cell.styles.textColor = [180, 180, 180];
                        data.cell.styles.halign = 'center';
                    }
                }
            }
        });
        
        doc.save("Attendance_Sheet_YLA.pdf");
    }
    // Compressed PDF (Summary Only)
    else if (format === 'compressed_pdf') {
        if (!window.jspdf) {
            alert('PDF library is not loaded yet.');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('portrait'); // Portrait fits summaries perfectly
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // 1. Draw Gradient Banner
        for (let i = 0; i <= 38; i++) {
            let r = Math.round(25 + ((41 - 25) * (i / 38)));
            let g = Math.round(50 + ((128 - 50) * (i / 38)));
            let b = Math.round(80 + ((185 - 80) * (i / 38)));
            doc.setFillColor(r, g, b);
            doc.rect(0, i, pageWidth, 1.5, 'F');
        }
        
        // 2. Company Header
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Y.L.A Infrastructure Pvt Ltd.", pageWidth / 2, 16, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Attendance Summary", pageWidth / 2, 24, { align: 'center' });
        
        // 3. Format Month and Date Range
        const monthVal = document.getElementById('hist-month').value;
        const monthText = monthVal ? new Date(monthVal + '-01').toLocaleDateString('en-US', {month: 'long', year: 'numeric'}) : "Custom Range";
        const startRaw = document.getElementById('hist-start').value;
        const endRaw = document.getElementById('hist-end').value;
        const start = startRaw ? formatDateDisplay(startRaw) : '';
        const end = endRaw ? formatDateDisplay(endRaw) : '';
        doc.setFontSize(10);
        doc.text(`Month: ${monthText}   |   Date Range: ${start} to ${end}`, pageWidth / 2, 32, { align: 'center' });
        
        // 4. Extract Summary Data
        const rows = Array.from(table.rows);
        const head = [['Employee Name', 'Role', 'Co. Days | Shifts', 'Days Present', 'Shifts Worked']];
        const body = [];
        
        // Data starts at row index 2
        for (let i = 2; i < rows.length; i++) {
            const cells = rows[i].cells;
            if (cells.length >= 5) {
                const len = cells.length;
                body.push([
                    cells[0].innerText.trim(), // Name
                    cells[1].innerText.trim(), // Role
                    cells[len - 3].innerText.trim(), // Co Days/Shifts
                    cells[len - 2].innerText.trim(), // Days Present
                    cells[len - 1].innerText.trim()  // Shifts Worked
                ]);
            }
        }
        
        // 5. Render Table
        doc.autoTable({
            head: head,
            body: body,
            startY: 42,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.1 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center', valign: 'middle', fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                2: { halign: 'center' },
                3: { halign: 'center', textColor: [39, 174, 96], fontStyle: 'bold' },
                4: { halign: 'center', textColor: [39, 174, 96], fontStyle: 'bold' }
            }
        });
        
        doc.save("Attendance_Summary_YLA.pdf");
    }
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

function openShiftDetails(date, shift) {
    const record = attendance.find(a => a.date === date && a.shift === shift);
    if (!record) {
        alert("Attendance was not taken yet for this shift.");
        return;
    }
    
    const presentIds = Object.keys(record.records).filter(k => record.records[k]);
    const presentWorkers = workers.filter(w => presentIds.includes(String(w.id)));
    
    document.getElementById('shift-details-title').innerText = `${shift} (${formatDateDisplay(date)})`;
    
    let html = '';
    if (presentWorkers.length === 0) {
        html = '<p style="color: #aaa;">No employees were present during this shift.</p>';
    } else {
        // Group by role
        let rolesCount = {};
        presentWorkers.forEach(w => {
            if(!rolesCount[w.role]) rolesCount[w.role] = [];
            rolesCount[w.role].push(w.name);
        });
        
        for (let role in rolesCount) {
            html += `<h4 style="margin: 10px 0 5px 0; color: var(--primary);">${role} (${rolesCount[role].length})</h4>`;
            html += `<ul style="margin: 0 0 10px 0; padding-left: 20px;">`;
            rolesCount[role].forEach(name => {
                html += `<li>${name}</li>`;
            });
            html += `</ul>`;
        }
    }
    
    document.getElementById('shift-details-list').innerHTML = html;
    document.getElementById('shift-details-modal').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', loadData);

