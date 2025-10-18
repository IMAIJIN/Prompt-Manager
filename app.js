// IndexedDB Setup
const DB_NAME = 'PromptManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'prompts';

let db;

// Initialize Database
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                objectStore.createIndex('category', 'category', { unique: false });
                objectStore.createIndex('title', 'title', { unique: false });
                objectStore.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
}

// Database Operations
async function addPrompt(prompt) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(prompt);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function updatePrompt(prompt) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(prompt);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deletePrompt(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getAllPrompts() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// App State
let prompts = [];
let currentEditId = null;
let currentFilter = 'all';
let searchTerm = '';

// DOM Elements
const addPromptBtn = document.getElementById('addPromptBtn');
const emptyAddBtn = document.getElementById('emptyAddBtn');
const promptModal = document.getElementById('promptModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const promptForm = document.getElementById('promptForm');
const promptsList = document.getElementById('promptsList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const modalTitle = document.getElementById('modalTitle');
const toast = document.getElementById('toast');
const charCount = document.getElementById('charCount');
const promptContent = document.getElementById('promptContent');

// Modal Functions
function openModal(editMode = false, promptData = null) {
    currentEditId = editMode ? promptData.id : null;
    modalTitle.textContent = editMode ? 'Edit Prompt' : 'New Prompt';
    
    if (editMode && promptData) {
        document.getElementById('promptTitle').value = promptData.title;
        document.getElementById('promptCategory').value = promptData.category;
        document.getElementById('promptContent').value = promptData.content;
        document.getElementById('promptTags').value = promptData.tags.join(', ');
        updateCharCount();
    } else {
        promptForm.reset();
        updateCharCount();
    }
    
    promptModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModalFunc() {
    promptModal.classList.remove('active');
    document.body.style.overflow = '';
    promptForm.reset();
    currentEditId = null;
}

// Toast Notification
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Character Counter
function updateCharCount() {
    const count = promptContent.value.length;
    charCount.textContent = count.toLocaleString();
}

// Copy to Clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }
        document.body.removeChild(textArea);
    }
}

// Format Date
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

// Render Prompts
function renderPrompts() {
    const filteredPrompts = prompts.filter(prompt => {
        const matchesSearch = !searchTerm || 
            prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prompt.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory = currentFilter === 'all' || prompt.category === currentFilter;
        
        return matchesSearch && matchesCategory;
    });

    if (filteredPrompts.length === 0) {
        promptsList.innerHTML = '';
        emptyState.classList.add('visible');
        return;
    }

    emptyState.classList.remove('visible');
    
    promptsList.innerHTML = filteredPrompts.map(prompt => `
        <div class="prompt-card" data-id="${prompt.id}">
            <div class="prompt-card-header">
                <div class="prompt-info">
                    <h3 class="prompt-title">${escapeHtml(prompt.title)}</h3>
                    <div class="prompt-meta">
                        <span class="prompt-category">${escapeHtml(prompt.category)}</span>
                        <span class="prompt-date">${formatDate(prompt.createdAt)}</span>
                    </div>
                </div>
                <div class="prompt-actions">
                    <button class="btn-action copy" onclick="copyPrompt(${prompt.id})" aria-label="Copy prompt">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="btn-action edit" onclick="editPrompt(${prompt.id})" aria-label="Edit prompt">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                    </button>
                    <button class="btn-action delete" onclick="deletePromptConfirm(${prompt.id})" aria-label="Delete prompt">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="prompt-content">${escapeHtml(prompt.content)}</div>
            ${prompt.tags.length > 0 ? `
                <div class="prompt-tags">
                    ${prompt.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
            <div class="prompt-footer">
                <button class="btn-expand btn-action btn-full" onclick="toggleCard(${prompt.id})">
                    <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <span>View Full Prompt</span>
                </button>
            </div>
        </div>
    `).join('');
}

// Toggle Card Expansion
function toggleCard(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
        const isExpanded = card.classList.contains('expanded');
        const expandBtn = card.querySelector('.btn-expand span');
        
        if (isExpanded) {
            card.classList.remove('expanded');
            expandBtn.textContent = 'View Full Prompt';
        } else {
            card.classList.add('expanded');
            expandBtn.textContent = 'Hide Prompt';
        }
    }
}

// Copy Prompt
function copyPrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
        copyToClipboard(prompt.content);
    }
}

// Edit Prompt
function editPrompt(id) {
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
        openModal(true, prompt);
    }
}

// Delete Prompt
function deletePromptConfirm(id) {
    if (confirm('Are you sure you want to delete this prompt?')) {
        deletePromptFunc(id);
    }
}

async function deletePromptFunc(id) {
    try {
        await deletePrompt(id);
        prompts = prompts.filter(p => p.id !== id);
        renderPrompts();
        updateCategoryFilter();
        showToast('Prompt deleted', 'success');
    } catch (error) {
        showToast('Error deleting prompt', 'error');
        console.error(error);
    }
}

// Update Category Filter
function updateCategoryFilter() {
    const categories = [...new Set(prompts.map(p => p.category))].sort();
    const categoryList = document.getElementById('categoryList');
    
    categoryFilter.innerHTML = '<option value="all">All Categories</option>' +
        categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
    
    categoryList.innerHTML = categories.map(cat => `<option value="${escapeHtml(cat)}">`).join('');
}

// Form Submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('promptTitle').value.trim();
    const category = document.getElementById('promptCategory').value.trim() || 'General';
    const content = document.getElementById('promptContent').value.trim();
    const tagsInput = document.getElementById('promptTags').value.trim();
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    const promptData = {
        title,
        category,
        content,
        tags,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    try {
        if (currentEditId) {
            promptData.id = currentEditId;
            promptData.createdAt = prompts.find(p => p.id === currentEditId).createdAt;
            await updatePrompt(promptData);
            const index = prompts.findIndex(p => p.id === currentEditId);
            prompts[index] = promptData;
            showToast('Prompt updated!', 'success');
        } else {
            const id = await addPrompt(promptData);
            promptData.id = id;
            prompts.push(promptData);
            showToast('Prompt created!', 'success');
        }
        
        closeModalFunc();
        renderPrompts();
        updateCategoryFilter();
    } catch (error) {
        showToast('Error saving prompt', 'error');
        console.error(error);
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load Initial Data
async function loadData() {
    try {
        await initDB();
        prompts = await getAllPrompts();
        renderPrompts();
        updateCategoryFilter();
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data', 'error');
    }
}

// Event Listeners
addPromptBtn.addEventListener('click', () => openModal());
emptyAddBtn.addEventListener('click', () => openModal());
closeModal.addEventListener('click', closeModalFunc);
cancelBtn.addEventListener('click', closeModalFunc);
promptForm.addEventListener('submit', handleFormSubmit);
promptContent.addEventListener('input', updateCharCount);

searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderPrompts();
});

categoryFilter.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderPrompts();
});

// Close modal on outside click
promptModal.addEventListener('click', (e) => {
    if (e.target === promptModal) {
        closeModalFunc();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape to close modal
    if (e.key === 'Escape' && promptModal.classList.contains('active')) {
        closeModalFunc();
    }
    
    // Ctrl/Cmd + K to open search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
    
    // Ctrl/Cmd + N to add new prompt
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !promptModal.classList.contains('active')) {
        e.preventDefault();
        openModal();
    }
});

// Make functions globally accessible
window.toggleCard = toggleCard;
window.copyPrompt = copyPrompt;
window.editPrompt = editPrompt;
window.deletePromptConfirm = deletePromptConfirm;

// Initialize app
loadData();
