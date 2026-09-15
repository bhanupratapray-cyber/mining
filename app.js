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

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_umeCVHwoIt7a3Qp6UkXxEXyidK9nO1oHIwTblN951XUIQbrbOEFv-smdiTZyP5o4/exec";

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

        // Fetch new roster from backend
        const response = await fetch(`${SCRIPT_URL}?action=get_roster`);
        const roster = await response.json();
        
        if (roster && Array.isArray(roster) && roster.length > 0) {
            await db.setItem('workers', roster);
        }
    } catch (e) {
        console.warn("Offline Mode Active. Using cached data.");
    }
    
    // Seed initial test data if empty
    const isSeeded = await db.getItem('seeded');
    if (!isSeeded) {
        await seedLocalDB();
    }
}

async function seedLocalDB() {
    await db.setItem('workers', [
        { id: '001', name: 'Ramesh', gender: 'M', role: 'Driver', contact: '1234567890' },
    { id: '002', name: 'Pooja', gender: 'F', role: 'Operator', contact: '0987654321' },
    { id: '003', name: 'Suresh', gender: 'M', role: 'Helper', contact: '5551234567' },
    { id: '004', name: 'Amit', gender: 'M', role: 'Tyre mechanic', contact: '9876543210' },
    { id: '005', name: 'Sunita', gender: 'F', role: 'Operator', contact: '8765432109' },
    { id: '006', name: 'Vijay', gender: 'M', role: 'Driver', contact: '7654321098' },
    { id: '007', name: 'Kavita', gender: 'F', role: 'Helper', contact: '6543210987' },
    { id: '008', name: 'Rahul', gender: 'M', role: 'Tyre mechanic', contact: '5432109876' },
    { id: '009', name: 'Neha', gender: 'F', role: 'Operator', contact: '4321098765' },
    { id: '010', name: 'Anil', gender: 'M', role: 'Driver', contact: '3210987654' },
    { id: '011', name: 'Meera', gender: 'F', role: 'Helper', contact: '2109876543' },
    { id: '012', name: 'Sanjay', gender: 'M', role: 'Tyre mechanic', contact: '1098765432' },
    { id: '013', name: 'Anita', gender: 'F', role: 'Operator', contact: '9988776655' },
    { id: '014', name: 'Vikram', gender: 'M', role: 'Driver', contact: '8877665544' },
    { id: '015', name: 'Priya', gender: 'F', role: 'Helper', contact: '7766554433' },
    { id: '016', name: 'Manoj', gender: 'M', role: 'Tyre mechanic', contact: '6655443322' },
    { id: '017', name: 'Geeta', gender: 'F', role: 'Operator', contact: '5544332211' },
    { id: '018', name: 'Deepak', gender: 'M', role: 'Driver', contact: '4433221100' },
    { id: '019', name: 'Sneha', gender: 'F', role: 'Helper', contact: '3322110099' },
    { id: '020', name: 'Raj', gender: 'M', role: 'Tyre mechanic', contact: '2211009988' },
    ]);
    await db.setItem('supervisors', [
        { id: 'S01', name: 'Super One', pin: '1234', shiftControl: 'Auto' },
        { id: 'S02', name: 'Super Two', pin: '5678', shiftControl: 'Manual' },
    ]);
    await db.setItem('admin', { username: 'admin', password: 'password123' });
    await db.setItem('attendance', []);
    await db.setItem('seeded', true);
}
