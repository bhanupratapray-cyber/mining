// db wrapper and initialization
const db = {
    getItem: (key) => {
        return new Promise((resolve) => {
            const data = localStorage.getItem(key);
            resolve(data ? JSON.parse(data) : null);
        });
    },
    setItem: (key, value) => {
        return new Promise((resolve) => {
            localStorage.setItem(key, JSON.stringify(value));
            resolve();
        });
    }
};

const initDB = async () => {
    const isSeeded = await db.getItem('seeded');
    if (!isSeeded) {
        await db.setItem('workers', [
            { id: '001', name: 'John Doe', gender: 'M', role: 'Driver', contact: '1234567890' },
            { id: '002', name: 'Jane Smith', gender: 'F', role: 'Operator', contact: '0987654321' },
            { id: '003', name: 'Bob Brown', gender: 'M', role: 'Helper', contact: '5551234567' },
        ]);
        await db.setItem('supervisors', [
            { id: 'S01', name: 'Super One', pin: '1234', shiftControl: 'Auto' },
            { id: 'S02', name: 'Super Two', pin: '5678', shiftControl: 'Manual' },
        ]);
        await db.setItem('admin', { username: 'admin', password: 'password123' });
        await db.setItem('attendance', []);
        await db.setItem('seeded', true);
    }
};

// Auto-init on load
initDB();
