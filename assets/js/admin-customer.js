import { db, auth } from './firebase.js';
import { ref, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import emailjs from 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm';

let allMessages = {};
let currentFilter = 'all';
let selectedMessages = new Set();
let currentReplyData = {};

document.addEventListener('DOMContentLoaded', () => {
    // ✅ emailjs.init هنا جوه DOMContentLoaded عشان يشتغل صح
    emailjs.init("nS-LCttWLiId737aQ"); // ← حط الـ Public Key بتاعك هنا

    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: 'toast-top-right',
        timeOut: 3000
    };

    initCustomerService();
    setupMobileSidebar();
    setupSearch();
});


async function initCustomerService() {
    setupRealtimeListeners();
}

function setupRealtimeListeners() {
    onValue(ref(db, 'contactMessages'), (snapshot) => {
        if (!snapshot.exists()) {
            allMessages = {};
            updateDashboard(allMessages);
            return;
        }

        allMessages = snapshot.val();
        updateDashboard(allMessages);
    });
}

function updateDashboard(messages) {
    const messageList = Object.entries(messages).map(([id, msg]) => ({
        id,
        ...msg
    }));

    const total = messageList.length;
    const unread = messageList.filter(m => !m.read).length;
    const read = messageList.filter(m => m.read).length;
    const uniqueUsers = new Set(messageList.map(m => m.email)).size;

    document.getElementById('totalMessagesCount').textContent = total;
    document.getElementById('unreadMessagesCount').textContent = unread;
    document.getElementById('readMessagesCount').textContent = read;
    document.getElementById('uniqueUsersCount').textContent = uniqueUsers;

    applyFiltersAndSearch();
}

function applyFiltersAndSearch() {
    const searchTerm = document.getElementById('searchMessage')?.value.toLowerCase().trim() || '';
    let filtered = Object.entries(allMessages).map(([id, msg]) => ({
        id,
        ...msg
    }));

    if (currentFilter === 'read') {
        filtered = filtered.filter(m => m.read);
    } else if (currentFilter === 'unread') {
        filtered = filtered.filter(m => !m.read);
    }

    if (searchTerm) {
        filtered = filtered.filter(m => 
            (m.name || '').toLowerCase().includes(searchTerm) ||
            (m.email || '').toLowerCase().includes(searchTerm) ||
            (m.message || '').toLowerCase().includes(searchTerm)
        );
    }

    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
    });

    displayMessages(filtered);
}

function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h5>No messages found</h5>
                <p>There are no messages matching your criteria.</p>
            </div>
        `;
        updateBulkActionsUI();
        return;
    }

    container.innerHTML = messages.map(msg => {
        const isRead = msg.read || false;
        const isSelected = selectedMessages.has(msg.id);
        const avatar = (msg.name || msg.email || 'U').charAt(0).toUpperCase();
        
        let date = 'Just now';
        
        if (msg.time || msg.createdAt) {
            try {
                const rawDate = msg.time || msg.createdAt;
                const timestamp = new Date(rawDate);

                if (!isNaN(timestamp.getTime())) {
                    date = timestamp.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            } catch (e) {
                console.error('Date parsing error:', e);
                date = 'Invalid date';
            }
        }

        // ✅ escape الداتا عشان متكسرش الـ HTML لو في quotes في الاسم أو الإيميل
        const safeName = (msg.name || 'Anonymous').replace(/'/g, "\\'");
        const safeEmail = (msg.email || '').replace(/'/g, "\\'");

        return `
            <div class="message-card ${isRead ? 'read' : ''}">
                <div class="message-header">
                    <div class="d-flex align-items-center gap-3 flex-wrap">
                        <input type="checkbox" 
                               class="form-check-input message-checkbox" 
                               data-message-id="${msg.id}"
                               ${isSelected ? 'checked' : ''}
                               onchange="toggleMessageSelection('${msg.id}')">
                        
                        <div class="message-user-info">
                            <div class="user-avatar">${avatar}</div>
                            <div class="user-details">
                                <h6>${msg.name || 'Anonymous'}</h6>
                                <small>${msg.email || 'No email'}</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="message-meta">
                        ${!isRead ? '<span class="badge bg-warning">Unread</span>' : '<span class="badge bg-success">Read</span>'}
                        <small class="text-muted"><i class="bi bi-clock me-1"></i>${date}</small>
                    </div>
                </div>

                <div class="message-body">
                    <p>${msg.message || 'No message content'}</p>
                </div>

                <div class="message-actions">
                    ${!isRead ? 
                        `<button onclick="markAsRead('${msg.id}')" class="btn btn-sm btn-success">
                            <i class="bi bi-check me-1"></i>Mark as Read
                        </button>` : 
                        `<button onclick="markAsUnread('${msg.id}')" class="btn btn-sm btn-outline-warning">
                            <i class="bi bi-envelope me-1"></i>Mark as Unread
                        </button>`
                    }
                    
                    <!-- ✅ زرار Reply جوه كل message card -->
                    <button onclick="replyToMessage('${msg.id}', '${safeEmail}', '${safeName}')" class="btn btn-sm btn-primary">
                        <i class="bi bi-reply me-1"></i>Reply
                    </button>

                    <button onclick="deleteMessage('${msg.id}')" class="btn btn-sm btn-outline-danger">
                        <i class="bi bi-trash me-1"></i>Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');

    updateBulkActionsUI();
}

/* ===========================
   📧 REPLY FUNCTIONS
=========================== */
window.replyToMessage = function(messageId, email, name) {
    currentReplyData = { messageId, email, name };
    document.getElementById('replyToEmail').textContent = `${name} By email <${email}>`;
    document.getElementById('replyBody').value = '';
    new bootstrap.Modal(document.getElementById('replyModal')).show();
};

window.sendReply = async function() {
    const subject = document.getElementById('replySubject').value.trim();
    const body = document.getElementById('replyBody').value.trim();

    if (!body) {
        toastr.warning('⚠️ Please write a reply first');
        return;
    }

    const sendBtn = document.querySelector('#replyModal .btn-primary');
    const originalHTML = sendBtn.innerHTML;
    sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sending...';
    sendBtn.disabled = true;

    try {
        await emailjs.send("service_9tszh71", "template_1nej7un", {
            to_email: currentReplyData.email,
            to_name: currentReplyData.name,
            subject: subject,
            message: body,
        });

        // ✅ بعد الإرسال، اعمله mark as read تلقائي
        await markAsRead(currentReplyData.messageId);

        bootstrap.Modal.getInstance(document.getElementById('replyModal')).hide();
        toastr.success('✅ Reply sent successfully!');
    } catch (error) {
        console.error(error);
        toastr.error('❌ Failed to send reply. Check your EmailJS settings.');
    } finally {
        // ✅ رجّع الزرار لحالته الأصلية
        sendBtn.innerHTML = originalHTML;
        sendBtn.disabled = false;
    }
};

/* ===========================
   📋 MESSAGE ACTIONS
=========================== */
window.markAsRead = async function(messageId) {
    try {
        await update(ref(db, `contactMessages/${messageId}`), {
            read: true,
            readAt: new Date().toISOString()
        });
        toastr.success('Message marked as read');
    } catch (error) {
        console.error('Error:', error);
        toastr.error('Failed to update message');
    }
};

window.markAsUnread = async function(messageId) {
    try {
        await update(ref(db, `contactMessages/${messageId}`), {
            read: false
        });
        toastr.info('Message marked as unread');
    } catch (error) {
        console.error('Error:', error);
        toastr.error('Failed to update message');
    }
};

window.deleteMessage = async function(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
        await remove(ref(db, `contactMessages/${messageId}`));
        toastr.success('Message deleted');
    } catch (error) {
        console.error('Error:', error);
        toastr.error('Failed to delete message');
    }
};

/* ===========================
   ✅ MULTI-SELECT
=========================== */
window.selectAllMessages = function() {
    const checkboxes = document.querySelectorAll('.message-checkbox');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (selectAllCheckbox && selectAllCheckbox.checked) {
        checkboxes.forEach(cb => {
            const messageId = cb.dataset.messageId;
            selectedMessages.add(messageId);
            cb.checked = true;
        });
    } else {
        selectedMessages.clear();
        checkboxes.forEach(cb => cb.checked = false);
    }
    
    updateBulkActionsUI();
};

window.toggleMessageSelection = function(messageId) {
    if (selectedMessages.has(messageId)) {
        selectedMessages.delete(messageId);
    } else {
        selectedMessages.add(messageId);
    }

    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const totalCheckboxes = document.querySelectorAll('.message-checkbox').length;

    if (selectAllCheckbox) {
        if (selectedMessages.size === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedMessages.size === totalCheckboxes) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    updateBulkActionsUI();
};

function updateBulkActionsUI() {
    const count = selectedMessages.size;
    const bulkActions = document.getElementById('bulkActionsBar');
    const selectedCount = document.getElementById('selectedCount');

    if (bulkActions && selectedCount) {
        if (count > 0) {
            bulkActions.style.display = 'flex';
            selectedCount.textContent = count;
        } else {
            bulkActions.style.display = 'none';
            selectedCount.textContent = '0';
        }
    }
}

window.bulkMarkAsRead = async function() {
    if (selectedMessages.size === 0) {
        toastr.warning('⚠️ Please select messages first');
        return;
    }

    try {
        const promises = [];
        selectedMessages.forEach(id => {
            promises.push(update(ref(db, `contactMessages/${id}`), {
                read: true,
                readAt: new Date().toISOString()
            }));
        });

        await Promise.all(promises);
        
        selectedMessages.clear();
        
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
        
        toastr.success(`✅ ${promises.length} message(s) marked as read`);
        updateBulkActionsUI();
    } catch (error) {
        console.error('Error:', error);
        toastr.error('❌ Failed to update messages');
    }
};

window.bulkMarkAsUnread = async function() {
    if (selectedMessages.size === 0) {
        toastr.warning('⚠️ Please select messages first');
        return;
    }

    try {
        const promises = [];
        selectedMessages.forEach(id => {
            promises.push(update(ref(db, `contactMessages/${id}`), {
                read: false
            }));
        });

        await Promise.all(promises);
        
        selectedMessages.clear();
        
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
        
        toastr.success(`✅ ${promises.length} message(s) marked as unread`);
        updateBulkActionsUI();
    } catch (error) {
        console.error('Error:', error);
        toastr.error('❌ Failed to update messages');
    }
};

window.bulkDeleteMessages = async function() {
    if (selectedMessages.size === 0) {
        toastr.warning('⚠️ Please select messages first');
        return;
    }

    if (!confirm(`Delete ${selectedMessages.size} message(s)?`)) return;

    try {
        const promises = [];
        selectedMessages.forEach(id => {
            promises.push(remove(ref(db, `contactMessages/${id}`)));
        });

        await Promise.all(promises);
        
        selectedMessages.clear();
        
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
        
        toastr.success(`✅ ${promises.length} message(s) deleted`);
        updateBulkActionsUI();
    } catch (error) {
        console.error('Error:', error);
        toastr.error('❌ Failed to delete messages');
    }
};
document.getElementById('sendReplyBtn')?.addEventListener('click', sendReply);
window.sendReply = sendReply;
window.replyToMessage = replyToMessage;

/* ===========================
   🔍 FILTER & SEARCH
=========================== */
window.filterMessages = function(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-tabs .btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('filter' + type.charAt(0).toUpperCase() + type.slice(1)).classList.add('active');
    applyFiltersAndSearch();
};

function setupSearch() {
    document.getElementById('searchMessage')?.addEventListener('input', applyFiltersAndSearch);
}

function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('active');
        });
    }
}

/* 🚪 EVENT LOGOUT
=========================== */
window.logout = function(e) {
    if (e) e.preventDefault(); 
    localStorage.removeItem('admin_session');
    
    localStorage.clear();
    sessionStorage.clear();

    window.location.replace("../../login.html");
};