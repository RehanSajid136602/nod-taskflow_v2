/**
 * TaskFlow - Minimalist Task Manager Logic
 */

class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.init();
    }

    init() {
        // Theme initialization
        this.currentTheme = localStorage.getItem('theme') || 'light';
        if (this.currentTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }

        // DOM Elements
        this.taskList = document.getElementById('task-list');
        this.taskForm = document.getElementById('task-form');
        this.modal = document.getElementById('task-modal');
        this.addTaskBtn = document.getElementById('add-task-btn');
        this.themeToggleBtn = document.getElementById('theme-toggle');
        this.closeModalBtns = document.querySelectorAll('.close-modal');
        this.searchInput = document.getElementById('search-input');
        this.statusFilter = document.getElementById('status-filter');
        this.categoryFilter = document.getElementById('category-filter');
        this.sortSelect = document.getElementById('sort-select');
        
        // Custom Confirm Modal
        this.confirmModal = document.getElementById('confirm-modal');
        this.confirmActionBtn = document.getElementById('confirm-action');
        this.confirmCancelBtn = document.getElementById('confirm-cancel');
        this.notificationContainer = document.getElementById('notification-container');

        // Stats Elements
        this.totalStats = document.getElementById('total-tasks');
        this.completedStats = document.getElementById('completed-tasks');
        this.pendingStats = document.getElementById('pending-tasks');

        // Form Fields
        this.taskIdInput = document.getElementById('task-id');
        this.taskTitleInput = document.getElementById('task-title');
        this.taskPriorityInput = document.getElementById('task-priority');
        this.taskCategoryInput = document.getElementById('task-category');

        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        // Theme Toggle
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

        // Open Modal
        this.addTaskBtn.addEventListener('click', () => this.openModal());

        // Close Modal
        this.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Form Submit
        this.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Filters and Sort
        this.searchInput.addEventListener('input', () => this.render());
        this.statusFilter.addEventListener('change', () => this.render());
        this.categoryFilter.addEventListener('change', () => this.render());
        this.sortSelect.addEventListener('change', () => this.render());

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'n' && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                this.openModal();
            }
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Click outside modal
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // Drag and Drop (using event delegation)
        this.taskList.addEventListener('dragstart', (e) => {
            const card = e.target.closest('.task-card');
            if (card) {
                card.classList.add('dragging');
                e.dataTransfer.setData('text/plain', card.dataset.id);
            }
        });

        this.taskList.addEventListener('dragend', (e) => {
            const card = e.target.closest('.task-card');
            if (card) card.classList.remove('dragging');
        });

        this.taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingCard = document.querySelector('.dragging');
            const afterElement = this.getDragAfterElement(this.taskList, e.clientY);
            if (afterElement == null) {
                this.taskList.appendChild(draggingCard);
            } else {
                this.taskList.insertBefore(draggingCard, afterElement);
            }
        });

        this.taskList.addEventListener('drop', (e) => {
            e.preventDefault();
            this.updateTasksOrder();
        });
    }

    // Custom UI Components
    showNotification(message, type = 'info') {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;

        this.notificationContainer.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showConfirm(message, callback) {
        document.getElementById('confirm-message').textContent = message;
        this.confirmModal.style.display = 'block';

        const handleConfirm = () => {
            callback();
            this.closeConfirm();
            this.confirmActionBtn.removeEventListener('click', handleConfirm);
        };

        const handleCancel = () => {
            this.closeConfirm();
            this.confirmActionBtn.removeEventListener('click', handleConfirm);
        };

        this.confirmActionBtn.addEventListener('click', handleConfirm);
        this.confirmCancelBtn.onclick = handleCancel;
    }

    closeConfirm() {
        this.confirmModal.style.display = 'none';
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        this.currentTheme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.showNotification(`Switched to ${this.currentTheme} mode`, 'info');
    }

    // Modal Operations
    openModal(task = null) {
        if (task) {
            document.getElementById('modal-title').textContent = 'Edit Task';
            this.taskIdInput.value = task.id;
            this.taskTitleInput.value = task.title;
            this.taskPriorityInput.value = task.priority;
            this.taskCategoryInput.value = task.category;
        } else {
            document.getElementById('modal-title').textContent = 'New Task';
            this.taskForm.reset();
            this.taskIdInput.value = '';
        }
        this.modal.style.display = 'block';
        this.taskTitleInput.focus();
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.taskForm.reset();
    }

    // Task Operations
    saveTask() {
        const id = this.taskIdInput.value;
        const title = this.taskTitleInput.value.trim();
        
        if (!title) {
            this.showNotification('Please enter a task title', 'warning');
            return;
        }

        const taskData = {
            id: id || Date.now().toString(),
            title: title,
            priority: parseInt(this.taskPriorityInput.value),
            category: this.taskCategoryInput.value,
            completed: false,
            createdAt: id ? this.tasks.find(t => t.id === id).createdAt : new Date().toISOString()
        };

        if (id) {
            const index = this.tasks.findIndex(t => t.id === id);
            taskData.completed = this.tasks[index].completed;
            this.tasks[index] = taskData;
            this.showNotification('Task updated successfully', 'success');
        } else {
            this.tasks.unshift(taskData);
            this.showNotification('Task added successfully', 'success');
        }

        this.saveToLocalStorage();
        this.render();
        this.closeModal();
    }

    deleteTask(id) {
        this.showConfirm('Are you sure you want to delete this task?', () => {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveToLocalStorage();
            this.render();
            this.showNotification('Task deleted', 'error');
        });
    }

    toggleComplete(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveToLocalStorage();
            this.render();
        }
    }

    // Persistence
    saveToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    // UI Rendering
    render() {
        let filteredTasks = this.getFilteredTasks();
        this.sortTasks(filteredTasks);

        this.updateStats();

        if (filteredTasks.length === 0) {
            this.taskList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>${this.tasks.length === 0 ? 'No tasks yet. Start by adding one!' : 'No tasks match your filters.'}</p>
                </div>
            `;
            return;
        }

        this.taskList.innerHTML = filteredTasks.map(task => `
            <div class="task-card ${task.completed ? 'completed' : ''}" 
                 draggable="true" 
                 data-id="${task.id}">
                <label class="checkbox-container">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="app.toggleComplete('${task.id}')">
                    <span class="checkmark"></span>
                </label>
                <div class="task-content">
                    <h3>${this.escapeHtml(task.title)}</h3>
                    <div class="task-meta">
                        <span class="badge badge-priority-${task.priority}">${this.getPriorityLabel(task.priority)}</span>
                        <span class="badge badge-category">${task.category}</span>
                        <span><i class="far fa-calendar"></i> ${this.formatDate(task.createdAt)}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-icon edit" onclick="app.openModalById('${task.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="app.deleteTask('${task.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    getFilteredTasks() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const status = this.statusFilter.value;
        const category = this.categoryFilter.value;

        return this.tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm);
            const matchesStatus = status === 'all' || 
                (status === 'completed' && task.completed) || 
                (status === 'active' && !task.completed);
            const matchesCategory = category === 'all' || task.category === category;

            return matchesSearch && matchesStatus && matchesCategory;
        });
    }

    sortTasks(tasks) {
        const sortBy = this.sortSelect.value;
        tasks.sort((a, b) => {
            switch (sortBy) {
                case 'date-desc': return new Date(b.createdAt) - new Date(a.createdAt);
                case 'date-asc': return new Date(a.createdAt) - new Date(b.createdAt);
                case 'priority-desc': return b.priority - a.priority;
                case 'priority-asc': return a.priority - b.priority;
                default: return 0;
            }
        });
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;

        this.animateValue(this.totalStats, parseInt(this.totalStats.innerText), total, 300);
        this.animateValue(this.completedStats, parseInt(this.completedStats.innerText), completed, 300);
        this.animateValue(this.pendingStats, parseInt(this.pendingStats.innerText), pending, 300);
    }

    // Helper to find task and open modal
    openModalById(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) this.openModal(task);
    }

    // Drag and drop helper
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    updateTasksOrder() {
        const taskElements = [...this.taskList.querySelectorAll('.task-card')];
        const newOrderIds = taskElements.map(el => el.dataset.id);
        
        const orderedTasks = newOrderIds.map(id => this.tasks.find(t => t.id === id));
        // We only update the order in the current state, but filtering might affect this.
        // For a simple app, we'll replace the main tasks array with the new order for the visible items.
        // In a more complex app, we'd have an 'order' property.
        
        // Find tasks that weren't in the current view (filtered out)
        const visibleIds = new Set(newOrderIds);
        const hiddenTasks = this.tasks.filter(t => !visibleIds.has(t.id));
        
        this.tasks = [...orderedTasks, ...hiddenTasks];
        this.saveToLocalStorage();
    }

    // Utilities
    getPriorityLabel(priority) {
        return priority === 3 ? 'High' : priority === 2 ? 'Medium' : 'Low';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (date.toDateString() === now.toDateString()) {
            return 'Today';
        }
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }

        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        }

        if (diffDays < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'long' });
        }

        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    animateValue(obj, start, end, duration) {
        if (start === end) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
}

// Initialize App
const app = new TaskManager();
