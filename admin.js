let activeTab = 'dashboard';
let workers = [];
let attendance = [];

async function loadData() {
    const w = await db.getItem('workers') || [];
    const a = await db.getItem('attendance') || [];
    workers = w;
    attendance = a;
    
    renderWorkersTab();
}

function setActiveTab(tab) {
    document.getElementById(`tab-${activeTab}`).classList.remove('active');
    document.getElementById(`content-${activeTab}`).classList.add('hidden');
    
    activeTab = tab;
    
    document.getElementById(`tab-${activeTab}`).classList.add('active');
    document.getElementById(`content-${activeTab}`).classList.remove('hidden');
}

function renderWorkersTab() {
    const roles = Array.from(new Set(workers.map(w => w.role)));
    const tabsContainer = document.getElementById('admin-role-tabs');
    tabsContainer.innerHTML = roles.map(r => `
        <button class="btn-outline">${r}</button>
    `).join('');
    
    const listContainer = document.getElementById('admin-workers-list');
    listContainer.innerHTML = workers.map(w => `
        <div class="list-item">
            <div>
                <h3 style="margin: 0 0 5px 0;">${w.name} (${w.id})</h3>
                <p style="margin: 0; color: #aaa; font-size: 14px;">${w.contact}</p>
            </div>
            <button class="btn-outline" style="width: auto; padding: 5px 15px;">Edit</button>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadData);
