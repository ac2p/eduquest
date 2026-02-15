// Replace the loadClasses function with MongoDB version
async loadClasses() {
    try {
        const response = await fetch(`${this.apiBase}/classes/my-classes`, {
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // MongoDB returns nested data differently
            this.renderClasses(data.classes);
        } else {
            throw new Error(data.error || 'Failed to load classes');
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        this.showError('Failed to load classes. Please try again.');
    }
}

// Update renderClasses to handle MongoDB _id
renderClasses(classes) {
    const container = document.getElementById('classesContainer');
    if (!container) return;

    if (classes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users fa-3x"></i>
                <h3>No Classes Yet</h3>
                <p>Create your first class to get started!</p>
                <button class="btn-primary" id="createFirstClassBtn">
                    <i class="fas fa-plus"></i> Create Your First Class
                </button>
            </div>
        `;
        
        document.getElementById('createFirstClassBtn')?.addEventListener('click', () => {
            this.showCreateClassModal();
        });
        return;
    }

    container.innerHTML = classes.map(classItem => `
        <div class="class-card" data-class-id="${classItem._id}" data-subject="${classItem.subject}">
            <div class="class-card-header">
                <h3>${classItem.className}</h3>
                <span class="subject-badge ${this.getSubjectColor(classItem.subject)}">
                    ${classItem.subject}
                </span>
            </div>
            <div class="class-card-body">
                <p class="grade">${classItem.grade || 'No grade specified'}</p>
                <div class="class-stats">
                    <div class="stat">
                        <i class="fas fa-user-graduate"></i>
                        <span>${classItem.studentCount || 0} Students</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-file-alt"></i>
                        <span>${classItem.quizCount || 0} Quizzes</span>
                    </div>
                </div>
                ${classItem.status === 'archived' ? `
                    <div class="archived-banner">
                        <i class="fas fa-archive"></i> Archived
                    </div>
                ` : ''}
            </div>
            <div class="class-card-footer">
                <button class="btn-small open-class-btn" data-class-id="${classItem._id}">
                    <i class="fas fa-door-open"></i> Open Class
                </button>
                ${classItem.status === 'archived' ? `
                    <button class="btn-text restore-class-btn" data-class-id="${classItem._id}">
                        Restore
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');

    // Add event listeners
    document.querySelectorAll('.open-class-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const classId = e.currentTarget.dataset.classId;
            this.openClass(classId);
        });
    });
}