import { db } from './firebase.js';
import { ref, update, push, set, get, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let allUsers = {};

async function initUsers() {
    await loadUsers();
    setupRealtimeListeners();
}

async function loadUsers() {
    try {
        const snapshot = await get(ref(db, 'users'));
        allUsers = snapshot.exists() ? snapshot.val() : {};
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}
document.getElementById('searchUser')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    const filteredUsers = Object.fromEntries(
        Object.entries(allUsers).filter(([_, user]) => {
            const userName = (user.displayName || user.email.split('@')[0]).toLowerCase();
            const userEmail = user.email.toLowerCase();
            
            return userName.includes(searchTerm) || userEmail.includes(searchTerm);
        })
    );

    displayUsers(filteredUsers);
});
window.toggleUserStatus = async function(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    const actionText = newStatus === 'blocked' ? 'Block' : 'Activate';
    
    if (confirm(`Are you sure you want to ${actionText} this user?`)) {
        try {
            const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const { db } = await import('./firebase.js'); 
            
            await update(ref(db, `users/${userId}`), { status: newStatus });
            toastr.info(`User ${newStatus} successfully!`);
        } catch (error) {
            console.error("Error updating status:", error);
            toastr.error("Failed to update status");
        }
    }
};
window.resetUserPassword = async function(userId) {
    if (!confirm("Reset this user's password to default (123456)?")) return;

    try {
        await update(ref(db, `users/${userId}`), {
            password: "123456"
        });

        toastr.success("Password reset to default (123456)");
    } catch (error) {
        console.error("Error resetting password:", error);
        toastr.error("Failed to reset password");
    }
};

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');

    // تأمين البيانات
    const safeUsers = users || {};
    const userEntries = Object.entries(safeUsers);
    
    // نحول كل يوزر لكائن كامل
    const userList = userEntries.map(([id, user]) => ({
        id,
        ...user
    }));

    const totalUsers = userList.length;

    const activeUsers = userList.filter(u =>
        !u.status || u.status === 'active'
    ).length;

    const blockedUsers = userList.filter(u =>
        u.status === 'blocked'
    ).length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const newUsers = userList.filter(u => {
        if (!u.createdAt) return false;

        const createdDate = new Date(u.createdAt);

        if (isNaN(createdDate)) return false;

        return (
            createdDate.getMonth() === currentMonth &&
            createdDate.getFullYear() === currentYear
        );
    }).length;

    const totalEl = document.getElementById('totalUsersCount');
    const activeEl = document.getElementById('activeUsersCount');
    const blockedEl = document.getElementById('blockedUsersCount');
    const newEl = document.getElementById('newUsersCount');

    if (totalEl) totalEl.textContent = totalUsers;
    if (activeEl) activeEl.textContent = activeUsers;
    if (blockedEl) blockedEl.textContent = blockedUsers;
    if (newEl) newEl.textContent = newUsers;

    if (totalUsers === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    No users found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = userEntries.map(([userId, user]) => {

        const status = user.status || 'active';
        const isBlocked = status === 'blocked';

        const statusBadge = isBlocked
            ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-3">Blocked</span>'
            : '<span class="badge bg-success-subtle text-success border border-success-subtle px-3">Active</span>';

        let userName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
        userName = userName.replace(/\d+/g, '');

        return `
            <tr>
                <td class="text-capitalize fw-semibold">${userName}</td>
                <td><span class="text-muted">${user.email || '-'}</span></td>
                <td>
                    <span class="badge bg-light text-dark border">
                        <i class="bi ${user.role === 'admin' ? 'bi-shield-lock text-primary' : 'bi-person'} me-1"></i>
                        ${user.role || 'customer'}
                    </span>
                </td>
                <td>${statusBadge}</td>
                <td class="text-center">
                    <div class="btn-group shadow-sm">
                        <button onclick="toggleUserStatus('${userId}', '${status}')"
                                class="btn btn-sm ${isBlocked ? 'btn-outline-success' : 'btn-outline-warning'}"
                                title="${isBlocked ? 'Unblock' : 'Block'} User">
                            <i class="bi ${isBlocked ? 'bi-unlock' : 'bi-slash-circle'}"></i>
                        </button>
                        <button onclick="resetUserPassword('${userId}')"
                                class="btn btn-sm btn-outline-primary"
                                title="Reset Password">
                                 <i class="bi bi-key"></i>
                        </button>
                        <button onclick="deleteUser('${userId}')"
                                class="btn btn-sm btn-outline-danger"
                                title="Delete User">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
document.addEventListener('DOMContentLoaded', () => {
    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: 'toast-top-right',
        timeOut: 3000
    };

    initUsers(); 
});
window.addUser = async function() {
    const email = document.getElementById('userEmail').value.trim();
    const role = document.getElementById('userRole').value;

    if (!email || !role) {
        toastr.warning('Please fill all fields!');
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        toastr.warning('Please enter a valid email address!');
        return;
    }

    const validRoles = ['seller', 'customer'];
    if (!validRoles.includes(role.toLowerCase())) {
        toastr.error('Invalid role! Please choose Seller or Customer.');
        return;
    }

    try {
        const newUserRef = push(ref(db, 'users'));
        await set(newUserRef, {
            email: email,
            role: role.toLowerCase(),
            status: 'active',
            createdAt: new Date().toISOString()
        });
        
        document.getElementById('addUserForm').reset();
        
        const modalElement = document.getElementById('addUserModal'); 
        const modalInstance = bootstrap.Modal.getInstance(modalElement); 
        if (modalInstance) {
            modalInstance.hide();
        }

        toastr.success('User added successfully!');
        
        // ------------------
    } catch (error) {
        console.error('Error adding user:', error);
        toastr.error('Failed to add user');
    }
};


window.deleteUser = async function(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        await remove(ref(db, `users/${userId}`));
        toastr.success('User deleted successfully!');
    } catch (error) {
        console.error('Error deleting user:', error);
        toastr.error('Failed to delete user');
    }
};

function setupRealtimeListeners() {
    onValue(ref(db, 'users'), snapshot => {
        allUsers = snapshot.exists() ? snapshot.val() : {};
        displayUsers(allUsers);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('active');
        });
    }

    // قفل السايد بار لو ضغطت على الطبقة المظلمة
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('active');
        });
    }
});