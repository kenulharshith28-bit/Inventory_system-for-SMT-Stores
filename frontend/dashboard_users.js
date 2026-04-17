/**
 * User Management Functions
 * Admin-only user creation and management
 */

/**
 * Handle Enter key in user form (submit on Enter)
 */
function handleUserFormEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        createUser();
    }
}

/**
 * Create New User
 */
async function createUser() {
    const username = document.getElementById('new_username')?.value.trim() || '';
    const password = document.getElementById('new_password')?.value.trim() || '';
    const role = document.getElementById('assign_role')?.value || 'user';

    if (!username || !password) {
        showUserMessage('error', '✗ Username and password are required');
        return;
    }

    const createBtn = document.querySelector('button[onclick="createUser()"]');
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Creating...</span>';
    }

    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('role', role);

        const response = await fetch('../backend/create_user.php', {
            method: 'POST',
            body: formData
        });

        const result = (await response.text()).trim();

        if (result === 'created') {
            showUserMessage('success', `✓ User "${username}" created successfully!`);
            document.getElementById('new_username').value = '';
            document.getElementById('new_password').value = '';
            await loadUsers();
        } else if (result === 'exists') {
            showUserMessage('error', `✗ Username "${username}" already exists`);
        } else {
            showUserMessage('error', `✗ ${result}`);
        }
    } catch (error) {
        showUserMessage('error', `✗ Network error: ${error.message}`);
    } finally {
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.innerHTML = '<i class="fas fa-user-plus"></i> <span>Create Account</span>';
        }
    }
}

/**
 * Load All Users
 */
async function loadUsers() {
    console.log('Fetching users list...');
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    try {
        const response = await fetch('../backend/get_users.php');
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            renderUsersTable(result.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:red;">${result.error || 'Failed to load users'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:red;">Network error loading users</td></tr>`;
    }
}

/**
 * Render Users Table
 */
function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:#999;">No users found</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(user => {
        const roleBadge = (user.role || '').toLowerCase() === 'admin' 
            ? '<span class="status-badge done">Admin</span>'
            : '<span class="status-badge pending">User</span>';

        const date = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';

        return `
            <tr>
                <td>#${user.id}</td>
                <td><strong>${escapeHtml(user.username)}</strong></td>
                <td>${roleBadge}</td>
                <td><small>${date}</small></td>
                <td>
                    <button class="btn-icon delete" onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Delete User
 */
function deleteUser(userId, username) {
    if (confirm(`Are you sure you want to delete user "${username}"?`)) {
        performDeleteUser(userId, username);
    }
}

async function performDeleteUser(userId, username) {
    try {
        const formData = new URLSearchParams();
        formData.append('id', userId);

        const response = await fetch('../backend/delete_user.php', {
            method: 'POST',
            body: formData
        });

        const result = (await response.text()).trim();

        if (result === 'deleted') {
            showUserMessage('success', `✓ User "${username}" deleted!`);
            await loadUsers();
        } else {
            showUserMessage('error', `✗ ${result}`);
        }
    } catch (error) {
        showUserMessage('error', `✗ Network error: ${error.message}`);
    }
}

/**
 * Show User Message
 */
function showUserMessage(type, message) {
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        color: white;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
    `;

    messageEl.textContent = message;
    document.body.appendChild(messageEl);

    setTimeout(() => {
        messageEl.style.opacity = '0';
        messageEl.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => messageEl.remove(), 500);
    }, 3000);
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
