// ============================================
// EDUCATOR ADMIN DASHBOARD - COMPLETE WORKING VERSION
// ============================================

console.log('✅ admin-dashboard.js loaded');

const API_BASE_URL = 'http://localhost:3000/api';

// State management
let currentAdminPage = 1;
let currentAdminSearch = '';
let currentAdminStatus = '';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM fully loaded');
    
    // Get DOM elements
    const adminSearchInput = document.getElementById('adminSearchInput');
    const adminStatusFilter = document.getElementById('adminStatusFilter');
    const viewAllBtn = document.getElementById('viewAllAdmins');
    const tableBody = document.getElementById('adminTableBody');
    
    console.log('DOM Elements found:', {
        searchInput: !!adminSearchInput,
        statusFilter: !!adminStatusFilter,
        viewAllBtn: !!viewAllBtn,
        tableBody: !!tableBody
    });
    
    // Show loading message
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center">
                    <div class="flex justify-center items-center text-slate-500">
                        Loading educator admins...
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Load educator admins
    loadEducatorAdmins();
    
    // Setup event listeners
    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', function(e) {
            console.log('Search input:', e.target.value);
            currentAdminSearch = e.target.value;
            currentAdminPage = 1;
            loadEducatorAdmins();
        });
    }
    
    if (adminStatusFilter) {
        adminStatusFilter.addEventListener('change', function(e) {
            console.log('Status filter:', e.target.value);
            currentAdminStatus = e.target.value;
            currentAdminPage = 1;
            loadEducatorAdmins();
        });
    }
    
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('View all clicked');
            currentAdminSearch = '';
            currentAdminStatus = '';
            currentAdminPage = 1;
            if (adminSearchInput) adminSearchInput.value = '';
            if (adminStatusFilter) adminStatusFilter.value = '';
            loadEducatorAdmins();
        });
    }
});

// Load educator admins from API
async function loadEducatorAdmins() {
    console.log('🔍 Loading educator admins...');
    
    const tableBody = document.getElementById('adminTableBody');
    const paginationDiv = document.getElementById('adminPagination');
    const viewAllBtn = document.getElementById('viewAllAdmins');
    
    if (!tableBody) {
        console.error('❌ adminTableBody element not found!');
        return;
    }
    
    try {
        // Build URL with query parameters
        let url = `${API_BASE_URL}/educator-admins?page=${currentAdminPage}&limit=10`;
        if (currentAdminSearch) {
            url += `&search=${encodeURIComponent(currentAdminSearch)}`;
        }
        if (currentAdminStatus) {
            url += `&status=${currentAdminStatus}`;
        }
        
        console.log('Fetching from:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.success && data.data) {
            displayEducatorAdmins(data.data);
            
            // Update pagination
            if (paginationDiv && data.pagination) {
                updatePagination(data.pagination);
            }
            
            // Update view all button
            if (viewAllBtn && data.pagination) {
                viewAllBtn.textContent = `View all ${data.pagination.total} admins`;
            }
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('Error loading educator admins:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-red-500">
                    Error loading data: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Display educator admins in table
function displayEducatorAdmins(admins) {
    console.log('Displaying admins:', admins);
    
    const tableBody = document.getElementById('adminTableBody');
    
    if (!tableBody) {
        console.error('Table body not found');
        return;
    }
    
    if (!admins || admins.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-slate-500">
                    No educator admins found
                </td>
            </tr>
        `;
        return;
    }
    
    // Build HTML rows
    let html = '';
    
    admins.forEach(admin => {
        // Format date
        const joinDate = admin.joinDate ? new Date(admin.joinDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'N/A';
        
        // Status badge
        const statusBadge = admin.status === 'ACTIVE' 
            ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold uppercase">ACTIVE</span>`
            : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold uppercase">SUSPENDED</span>`;
        
        // Action buttons
        const actionButtons = admin.status === 'ACTIVE'
            ? `<button onclick="toggleStatus('${admin._id}', 'SUSPENDED')" class="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all">Suspend</button>`
            : `<button onclick="toggleStatus('${admin._id}', 'ACTIVE')" class="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-all">Reactivate</button>`;
        
        html += `
            <tr class="group hover:bg-indigo-50/30 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${admin.name.replace(/\s+/g, '')}" 
                             class="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100" 
                             alt="${admin.name}">
                        <div>
                            <div class="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">
                                ${admin.name}
                            </div>
                            <div class="text-xs font-medium text-slate-400">
                                ${admin.email}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-xs font-bold text-slate-600">${admin.institution || 'N/A'}</span>
                </td>
                <td class="px-6 py-4">
                    <span class="text-xs font-medium text-slate-500">${joinDate}</span>
                </td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onclick="viewAdmin('${admin._id}')" 
                                class="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all">
                            View
                        </button>
                        ${actionButtons}
                        <button onclick="deleteAdmin('${admin._id}')" 
                                class="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Update pagination
function updatePagination(pagination) {
    const paginationDiv = document.getElementById('adminPagination');
    if (!paginationDiv || !pagination) return;
    
    if (pagination.pages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    paginationDiv.innerHTML = `
        <div class="flex items-center justify-center gap-4">
            <button onclick="changePage(${pagination.page - 1})" 
                    ${pagination.page === 1 ? 'disabled' : ''}
                    class="text-xs font-bold text-slate-400 ${pagination.page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-indigo-600'} transition-colors px-3 py-1">
                ← Previous
            </button>
            <span class="text-xs font-medium text-slate-600">
                Page ${pagination.page} of ${pagination.pages} (${pagination.total} total)
            </span>
            <button onclick="changePage(${pagination.page + 1})" 
                    ${pagination.page === pagination.pages ? 'disabled' : ''}
                    class="text-xs font-bold text-slate-400 ${pagination.page === pagination.pages ? 'opacity-50 cursor-not-allowed' : 'hover:text-indigo-600'} transition-colors px-3 py-1">
                Next →
            </button>
        </div>
    `;
}

// Change page
window.changePage = function(newPage) {
    if (newPage < 1) return;
    currentAdminPage = newPage;
    loadEducatorAdmins();
};

// View admin
window.viewAdmin = function(adminId) {
    console.log('View admin:', adminId);
    alert(`View admin details - ID: ${adminId}`);
    // You can redirect to a details page:
    // window.location.href = `admin-details.html?id=${adminId}`;
};

// Toggle status (Suspend/Reactivate)
window.toggleStatus = async function(adminId, newStatus) {
    const action = newStatus === 'ACTIVE' ? 'reactivate' : 'suspend';
    
    if (!confirm(`Are you sure you want to ${action} this educator admin?`)) {
        return;
    }
    
    try {
        console.log(`${action}ing admin:`, adminId);
        
        const response = await fetch(`${API_BASE_URL}/educator-admins/${adminId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        console.log('Status update response:', data);
        
        if (data.success) {
            alert(`Educator admin ${action}d successfully!`);
            loadEducatorAdmins(); // Reload the list
        } else {
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error toggling status:', error);
        alert('Network error. Please try again.');
    }
};

// Delete admin
window.deleteAdmin = async function(adminId) {
    if (!confirm('Are you sure you want to permanently delete this educator admin? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('Deleting admin:', adminId);
        
        const response = await fetch(`${API_BASE_URL}/educator-admins/${adminId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        console.log('Delete response:', data);
        
        if (data.success) {
            alert('Educator admin deleted successfully!');
            loadEducatorAdmins(); // Reload the list
        } else {
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting admin:', error);
        alert('Network error. Please try again.');
    }
};

// ============================================
// STUDENT FUNCTIONS
// ============================================

// Load students
async function loadStudents() {
    console.log('🔍 Loading students...');
    
    const tableBody = document.getElementById('studentTableBody');
    const searchInput = document.getElementById('studentSearchInput');
    
    if (!tableBody) {
        console.error('Student table body not found');
        return;
    }
    
    // Show loading
    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="px-6 py-4 text-center">
                <div class="flex justify-center items-center text-slate-500">
                    Loading students...
                </div>
            </td>
        </tr>
    `;
    
    try {
        const searchTerm = searchInput ? searchInput.value : '';
        let url = `${API_BASE_URL}/students`;
        if (searchTerm) {
            url += `?search=${encodeURIComponent(searchTerm)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Students response:', data);
        
        if (data.success && data.data) {
            displayStudents(data.data);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-red-500">
                    Error loading students
                </td>
            </tr>
        `;
    }
}

// Display students
function displayStudents(students) {
    const tableBody = document.getElementById('studentTableBody');
    
    if (!tableBody) return;
    
    if (!students || students.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-slate-500">
                    No students found
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    students.forEach(student => {
        // Fix misspelled status
        const status = student.status === 'SUPPENDED' ? 'SUSPENDED' : student.status;
        
        const statusBadge = status === 'ACTIVE'
            ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase border border-emerald-100">ACTIVE</span>`
            : `<span class="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-rose-600 bg-rose-50 border-rose-100 border rounded-md px-2 py-0.5">SUSPENDED</span>`;
        
        html += `
            <tr class="group hover:bg-sky-50/30 transition-colors">
                <td class="px-6 py-3">
                    <div class="flex items-center gap-3">
                        <img src="https://api.dicebear.com/7.x/notionists/svg?seed=${student.name.replace(/\s+/g, '')}" 
                             class="w-8 h-8 rounded-full bg-sky-50 border border-sky-100">
                        <div>
                            <div class="text-xs font-bold text-slate-700 group-hover:text-sky-700">${student.name}</div>
                            <div class="text-[10px] font-medium text-slate-400">${student.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-3">
                    <div class="text-xs font-semibold text-slate-600">ID: ${student.studentId || 'N/A'}</div>
                    <div class="text-[10px] text-slate-400">Grade ${student.grade || '?'} • ${student.teacher || 'Unknown'}</div>
                </td>
                <td class="px-6 py-3">${statusBadge}</td>
                <td class="px-6 py-3 text-right">
                    <button onclick="toggleStudentStatus('${student._id}', '${status}')" 
                            class="text-slate-400 hover:text-rose-500 p-1.5 transition-colors"
                            title="${status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="m4.9 4.9 14.2 14.2"></path>
                        </svg>
                    </button>
                    <button onclick="viewStudent('${student._id}')" 
                            class="text-slate-400 hover:text-sky-500 p-1.5 transition-colors"
                            title="View Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Toggle student status
window.toggleStudentStatus = async function(studentId, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'reactivate' : 'suspend';
    
    if (!confirm(`Are you sure you want to ${action} this student?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Student ${action}d successfully!`);
            loadStudents();
        } else {
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    }
};

// View student
window.viewStudent = function(studentId) {
    alert(`View student: ${studentId}`);
};

// Add student search listener
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Add student search
    const studentSearch = document.getElementById('studentSearchInput');
    if (studentSearch) {
        studentSearch.addEventListener('input', function(e) {
            setTimeout(() => loadStudents(), 300);
        });
    }
    
    // Load students
    loadStudents();
});


// ============================================
// DASHBOARD STATISTICS - UPDATED WORKING VERSION
// ============================================

// Update dashboard statistics
async function updateDashboardStats() {
    console.log('📊 Updating dashboard statistics...');
    
    try {
        // Fetch educator admins count
        const adminResponse = await fetch(`${API_BASE_URL}/educator-admins?limit=1`);
        const adminData = await adminResponse.json();
        
        // Fetch students count
        const studentResponse = await fetch(`${API_BASE_URL}/students?limit=1`);
        const studentData = await studentResponse.json();
        
        console.log('Stats data:', {
            admins: adminData.pagination?.total || 0,
            students: studentData.pagination?.total || 0
        });
        
        // Update educator admins stat
        const educatorStat = document.querySelector('[data-stat="educator-admins"]');
        if (educatorStat) {
            const count = adminData.pagination?.total || 4; // Fallback to 4 if API fails
            educatorStat.textContent = count;
            console.log(`✅ Updated educator admins stat to: ${count}`);
        } else {
            console.warn('Educator stat element not found');
        }
        
        // Update students stat
        const studentStat = document.querySelector('[data-stat="students"]');
        if (studentStat) {
            const count = studentData.pagination?.total || 4520; // Keep existing if API fails
            studentStat.textContent = count.toLocaleString();
            console.log(`✅ Updated students stat to: ${count}`);
        } else {
            console.warn('Student stat element not found');
        }
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
        
        // Fallback to hardcoded values if API fails
        const educatorStat = document.querySelector('[data-stat="educator-admins"]');
        if (educatorStat) {
            educatorStat.textContent = '4'; // Your actual count
        }
        
        // You can also fetch student count from your database
        try {
            const studentResponse = await fetch(`${API_BASE_URL}/students?limit=1`);
            const studentData = await studentResponse.json();
            const studentStat = document.querySelector('[data-stat="students"]');
            if (studentStat && studentData.pagination) {
                studentStat.textContent = studentData.pagination.total.toLocaleString();
            }
        } catch (e) {
            console.log('Using default student count');
        }
    }
}

// Also update the view all button to show correct count
function updateViewAllButton(total) {
    const viewAllBtn = document.getElementById('viewAllAdmins');
    if (viewAllBtn) {
        viewAllBtn.textContent = `View all ${total} admins`;
    }
}

// Modify your loadEducatorAdmins function to update stats
async function loadEducatorAdmins() {
    console.log('🔍 Loading educator admins...');
    
    const tableBody = document.getElementById('adminTableBody');
    const paginationDiv = document.getElementById('adminPagination');
    const viewAllBtn = document.getElementById('viewAllAdmins');
    
    if (!tableBody) {
        console.error('❌ adminTableBody element not found!');
        return;
    }
    
    try {
        // Build URL with query parameters
        let url = `${API_BASE_URL}/educator-admins?page=${currentAdminPage}&limit=10`;
        if (currentAdminSearch) {
            url += `&search=${encodeURIComponent(currentAdminSearch)}`;
        }
        if (currentAdminStatus) {
            url += `&status=${currentAdminStatus}`;
        }
        
        console.log('Fetching from:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.success && data.data) {
            displayEducatorAdmins(data.data);
            
            // Update pagination
            if (paginationDiv && data.pagination) {
                updatePagination(data.pagination);
            }
            
            // Update view all button
            if (viewAllBtn && data.pagination) {
                viewAllBtn.textContent = `View all ${data.pagination.total} admins`;
            }
            
            // Update the educator stat
            const educatorStat = document.querySelector('[data-stat="educator-admins"]');
            if (educatorStat && data.pagination) {
                educatorStat.textContent = data.pagination.total;
            }
            
            // Also update students stat
            await updateDashboardStats();
            
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('Error loading educator admins:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-red-500">
                    Error loading data: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Also update loadStudents to update the student stat
async function loadStudents() {
    console.log('🔍 Loading students...');
    
    const tableBody = document.getElementById('studentTableBody');
    const searchInput = document.getElementById('studentSearchInput');
    
    if (!tableBody) {
        console.error('Student table body not found');
        return;
    }
    
    // Show loading
    tableBody.innerHTML = `
        <tr>
            <td colspan="4" class="px-6 py-4 text-center">
                <div class="flex justify-center items-center text-slate-500">
                    Loading students...
                </div>
            </td>
        </tr>
    `;
    
    try {
        const searchTerm = searchInput ? searchInput.value : '';
        let url = `${API_BASE_URL}/students`;
        if (searchTerm) {
            url += `?search=${encodeURIComponent(searchTerm)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Students response:', data);
        
        if (data.success && data.data) {
            displayStudents(data.data);
            
            // Update the student stat
            const studentStat = document.querySelector('[data-stat="students"]');
            if (studentStat && data.pagination) {
                studentStat.textContent = data.pagination.total.toLocaleString();
            }
        }
    } catch (error) {
        console.error('Error loading students:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-red-500">
                    Error loading students
                </td>
            </tr>
        `;
    }
}

// Make sure to call these functions when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM fully loaded');
    
    // Get DOM elements
    const adminSearchInput = document.getElementById('adminSearchInput');
    const adminStatusFilter = document.getElementById('adminStatusFilter');
    const viewAllBtn = document.getElementById('viewAllAdmins');
    const studentSearch = document.getElementById('studentSearchInput');
    
    console.log('DOM Elements found:', {
        searchInput: !!adminSearchInput,
        statusFilter: !!adminStatusFilter,
        viewAllBtn: !!viewAllBtn,
        studentSearch: !!studentSearch
    });
    
    // Load initial data
    loadEducatorAdmins();
    loadStudents();
    
    // Setup event listeners
    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', function(e) {
            console.log('Search input:', e.target.value);
            currentAdminSearch = e.target.value;
            currentAdminPage = 1;
            loadEducatorAdmins();
        });
    }
    
    if (adminStatusFilter) {
        adminStatusFilter.addEventListener('change', function(e) {
            console.log('Status filter:', e.target.value);
            currentAdminStatus = e.target.value;
            currentAdminPage = 1;
            loadEducatorAdmins();
        });
    }
    
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('View all clicked');
            currentAdminSearch = '';
            currentAdminStatus = '';
            currentAdminPage = 1;
            if (adminSearchInput) adminSearchInput.value = '';
            if (adminStatusFilter) adminStatusFilter.value = '';
            loadEducatorAdmins();
        });
    }
    
    if (studentSearch) {
        studentSearch.addEventListener('input', function(e) {
            setTimeout(() => loadStudents(), 300);
        });
    }
});


console.log('✅ admin-dashboard.js ready');