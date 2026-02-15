// Update the API calls to handle MongoDB response format
async loadQuizzes() {
    try {
        // Build query string
        const queryParams = new URLSearchParams({
            page: this.currentPage,
            limit: this.pageSize,
            ...this.filters
        }).toString();

        const response = await fetch(`${this.apiBase}/classes/all/quizzes?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.renderQuizzes(data.quizzes);
            this.updateStats(data.stats);
            this.updatePagination(data.total, data.totalPages);
        } else {
            throw new Error(data.error || 'Failed to load quizzes');
        }
    } catch (error) {
        console.error('Error loading quizzes:', error);
        this.showError('Failed to load quizzes');
    }
}

// Update renderQuizzes to handle MongoDB _id
renderQuizzes(quizzes) {
    const tbody = document.getElementById('quizzesTableBody');
    if (!tbody) return;

    if (!quizzes || quizzes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-file-alt fa-3x"></i>
                    <h4>No Quizzes Found</h4>
                    <p>${this.filters.search ? 'Try a different search term' : 'Create your first quiz!'}</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = quizzes.map(quiz => `
        <tr data-quiz-id="${quiz._id}">
            <td>
                <div class="quiz-title-cell">
                    <i class="fas fa-file-alt ${this.getSubjectIcon(quiz.classSubject || quiz.subject)}"></i>
                    <div>
                        <strong>${quiz.title}</strong>
                        <small>${quiz.description || 'No description'}</small>
                    </div>
                </div>
            </td>
            <td>${quiz.className || quiz.classId?.className || 'N/A'}</td>
            <td>
                <span class="subject-badge ${this.getSubjectColor(quiz.classSubject || quiz.subject)}">
                    ${quiz.classSubject || quiz.subject}
                </span>
            </td>
            <td>
                <span class="status-badge ${quiz.status}">
                    ${quiz.status.toUpperCase()}
                </span>
            </td>
            <td>${quiz.questionCount || quiz.questions?.length || 0}</td>
            <td>${quiz.dueDate ? this.formatDate(quiz.dueDate) : 'No due date'}</td>
            <td>
                <div class="score-display">
                    ${quiz.avgScore ? `
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${quiz.avgScore}%"></div>
                        </div>
                        <span>${Math.round(quiz.avgScore)}%</span>
                    ` : 'N/A'}
                </div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" data-action="edit" data-quiz-id="${quiz._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" data-action="preview" data-quiz-id="${quiz._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" data-action="results" data-quiz-id="${quiz._id}">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                    <button class="btn-icon" data-action="more" data-quiz-id="${quiz._id}">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    this.attachActionListeners();
}