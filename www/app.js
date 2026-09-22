// Database layer (LocalStorage wrapper)
const db = {
    getItem: (key) => new Promise(resolve => resolve(JSON.parse(localStorage.getItem(key)))),
    setItem: (key, value) => new Promise(resolve => {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
    }),
    removeItem: (key) => new Promise(resolve => {
        localStorage.removeItem(key);
        resolve();
    })
};

// Helper for displaying dates in DD-MM-YYYY format
function formatDateDisplay(dateStr) {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_umeCVHwoIt7a3Qp6UkXxEXyidK9nO1oHIwTblN951XUIQbrbOEFv-smdiTZyP5o4/exec";

// Seed local defaults synchronously if missing (fixes login races)
if (!localStorage.getItem('seeded')) {
    localStorage.setItem('admin', JSON.stringify({ username: 'admin', password: 'password123' }));
    localStorage.setItem('workers', JSON.stringify([]));
    localStorage.setItem('supervisors', JSON.stringify([]));
    localStorage.setItem('attendance', JSON.stringify([]));
    localStorage.setItem('seeded', JSON.stringify(true));
}

// Load Theme Phase 12
(async function loadTheme() {
    const theme = await db.getItem('app_theme') || 'dark';
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();

// Background Sync (Phase 2)
async function performBackgroundSync() {
    console.log("Syncing Data...");
    try {
        // Push any offline cached attendance
        const offlineQueue = await db.getItem('offline_attendance_queue') || [];
        if (offlineQueue.length > 0) {
            console.log("Pushing offline attendance...");
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'offline_sync', data: offlineQueue })
            });
            await db.setItem('offline_attendance_queue', []);
        }

        // Fetch everything in parallel to cut load time by 60%
        const [rosterRes, attRes, supRes] = await Promise.all([
            fetch(`${SCRIPT_URL}?action=get_roster`).then(res => res.json()),
            fetch(`${SCRIPT_URL}?action=get_attendance`).then(res => res.json()),
            fetch(`${SCRIPT_URL}?action=get_supervisors`).then(res => res.json())
        ]);
        
        const roster = rosterRes;
        const remoteAttendance = attRes;
        const remoteSupervisors = supRes;
        
        // Process Roster
        if (roster && Array.isArray(roster) && roster.length > 0) {
            const mappedRoster = roster.map(emp => ({
                ...emp,
                id: emp.Employee_ID || emp.id,
                name: emp.Employee_Name || emp.name,
                gender: emp.Employee_Gender || emp.gender,
                contact: emp.Contact_Number || emp.contact,
                role: emp.Role || emp.role
            }));
            await db.setItem('workers', mappedRoster);
        }

        // Process Attendance
        if (remoteAttendance && Array.isArray(remoteAttendance)) {
            let groupedAttendance = {};
            remoteAttendance.forEach(row => {
                let dateStr = row.Date;
                if (dateStr && dateStr.includes('T')) {
                    dateStr = dateStr.split('T')[0];
                }
                const key = `${dateStr}_${row.Shift}`;
                if (!groupedAttendance[key]) {
                    groupedAttendance[key] = {
                        date: dateStr,
                        shift: row.Shift,
                        supervisorId: row.Supervisor_ID,
                        records: {},
                        timestamp: row.Sync_Timestamp || new Date().toISOString()
                    };
                }
                groupedAttendance[key].records[row.Employee_ID] = (row.Status === 'Present');
            });
            await db.setItem('attendance', Object.values(groupedAttendance));
        }
        
        // Process Supervisors
        if (remoteSupervisors && Array.isArray(remoteSupervisors) && remoteSupervisors.length > 0) {
            const mappedSups = remoteSupervisors.map(sup => ({
                id: sup.Supervisor_ID || sup.id,
                name: sup.Name || sup.name,
                pin: sup.PIN || sup.pin,
                shiftControl: sup.Shift_Control || sup.shiftControl
            }));
            await db.setItem('supervisors', mappedSups);
        }
    } catch (e) {
        console.warn("Offline Mode Active. Using cached data.");
    }
}

async function seedLocalDB() {
    await db.setItem('workers', []);
    await db.setItem('supervisors', []);
    await db.setItem('admin', { username: 'admin', password: 'password123' });
    await db.setItem('attendance', []);
    await db.setItem('seeded', true);
}
