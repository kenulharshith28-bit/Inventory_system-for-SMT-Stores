// User Management Functions

function handleUserFormEnter(event) {
    if (event.key === 'Enter') {
        createUser();
    }
}

async function createUser() {
    const username = document.getElementById('new_username').value.trim();
    const password = document.getElementById('new_password').value.trim();
    const role = document.getElementById('assign_role').value;

    if (!username || !password) {
        showUserMessage('error', 'Please fill in both username and password');
        return;
    }

    if (password.length < 4) {
        showUserMessage('error', 'Password must be at least 4 characters');
        return;
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

        const result = await response.text();

        if (result === 'created') {
            showUserMessage('success', `✓ User "${username}" created successfully!`);
            document.getElementById('new_username').value = '';
            document.getElementById('new_password').value = '';
            document.getElementById('assign_role').value = 'user';
            await loadUsers();
        } else if (result === 'exists') {
            showUserMessage('error', `✗ Username "${username}" already exists`);
        } else if (result.startsWith('error:')) {
            showUserMessage('error', `✗ ${result.replace('error: ', '')}`);
        } else {
            showUserMessage('error', '✗ Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showUserMessage('error', '✗ Network error: ' + error.message);
    }
}

async function loadUsers() {
    try {
        const response = await fetch('../backend/get_users.php');
        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
            renderUsersTable(result.data);
        } else {
            showUserMessage('error', 'Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showUserMessage('error', 'Network error: ' + error.message);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');

    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #999;">
                    <i class="fas fa-users"></i> No users found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => {
        const createdDate = new Date(user.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const roleBadge = user.role === 'Admin' 
            ? '<span class="role-badge admin-role">Admin</span>'
            : '<span class="role-badge user-role">User</span>';

        return `
            <tr>
                <td>#${user.id}</td>
                <td><strong>${escapeHtml(user.username)}</strong></td>
                <td>${roleBadge}</td>
                <td><small>${createdDate}</small></td>
                <td>
                    <button class="btn-delete" onclick="deleteUser(${user.id}, '${escapeHtml(user.username)}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function deleteUser(userId, username) {
    if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        performDeleteUser(userId, username);
    }
}

async function performDeleteUser(userId, username) {
    try {
        const formData = new URLSearchParams();
        formData.append('id', userId); // Changed from 'user_id' to 'id' to match backend
        formData.append('username', username);

        const response = await fetch('../backend/delete_user.php', {
            method: 'POST',
            body: formData
        });

        const result = (await response.text()).trim();

        if (result === 'deleted') {
            showUserMessage('success', `✓ User "${username}" deleted successfully`);
            await loadUsers();
        } else if (result.startsWith('error:')) {
            showUserMessage('error', `✗ ${result.replace('error:', '').trim()}`);
        } else {
            showUserMessage('error', '✗ Failed to delete user: ' + result);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showUserMessage('error', '✗ Network error: ' + error.message);
    }
}

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
    `;

    if (type === 'success') {
        messageEl.style.background = '#10b981';
        messageEl.style.color = 'white';
    } else if (type === 'error') {
        messageEl.style.background = '#ef4444';
        messageEl.style.color = 'white';
    } else {
        messageEl.style.background = '#3b82f6';
        messageEl.style.color = 'white';
    }

    messageEl.textContent = message;
    document.body.appendChild(messageEl);

    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => messageEl.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Load users when section is shown
function loadUsersOnSectionChange(sectionName) {
    if (sectionName === 'users') {
        setTimeout(() => loadUsers(), 100);
    }
}
