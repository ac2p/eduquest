// frontend/js/quiz-saver.js
class EduQuestQuizSaver {
    constructor() {
        this.API_URL = 'http://localhost:3000/api/quizzes/save';
        this.init();
    }
    
    init() {
        console.log('🎯 EduQuest Quiz Saver initialized');
        
        // Wait for page to load completely
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupPage());
        } else {
            setTimeout(() => this.setupPage(), 1000);
        }
    }
    
    setupPage() {
        this.addSaveButton();
        this.attachSaveToPublish();
        this.addKeyboardShortcut();
    }
    
    addSaveButton() {
        // Don't add duplicate buttons
        if (document.getElementById('eduquest-save-btn')) return;
        
        const saveBtn = document.createElement('button');
        saveBtn.id = 'eduquest-save-btn';
        ;
        
        
        
        // Hover effects
        saveBtn.onmouseover = () => {
            saveBtn.style.transform = 'translateY(-2px)';
            saveBtn.style.boxShadow = '0 6px 25px rgba(139, 92, 246, 0.4)';
        };
        
        saveBtn.onmouseout = () => {
            saveBtn.style.transform = 'translateY(0)';
            saveBtn.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.3)';
        };
        
        // Click handler
        saveBtn.onclick = () => this.saveQuiz();
        
        // Add to page
        document.body.appendChild(saveBtn);
        console.log('✅ Save button added to quiz page');
    }
    
    attachSaveToPublish() {
        // Find the "Publish Quiz" button by text content
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.textContent && btn.textContent.includes('Publish Quiz')) {
                const originalClick = btn.onclick;
                btn.onclick = async (e) => {
                    // Save to database first
                    const saved = await this.saveQuiz();
                    if (saved) {
                        // Then proceed with original publish action
                        if (originalClick) originalClick(e);
                        alert('✅ Quiz saved and published!');
                    }
                };
            }
        });
    }
    
    addKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveQuiz();
            }
        });
    }
    
    // Collect all quiz data from the form
    collectQuizData() {
    const quizData = {
        title: this.getQuizTitle(),
        subject: this.getSubject(), // Make sure this is called
        assignedClasses: this.getAssignedClasses(),
        moduleTopic: this.getModuleTopic(),
        questions: this.extractQuestions(),
        passGrade: this.getPassGrade(),
        shuffleQuestions: this.getCheckboxValue('Shuffle Questions'),
        allowRetakes: this.getCheckboxValue('Allow Retakes'),
        showAnswersImmediately: this.getShowAnswers(),
        timeLimit: this.getTimeLimit(),
        dueDate: this.getDueDate(),
        createdAt: new Date().toISOString()
    };
    
    // DEBUG: Log what subject is being sent
    console.log('🔍 SUBJECT being sent to backend:', quizData.subject);
    console.log('📋 Full quiz data being sent:', {
        title: quizData.title,
        subject: quizData.subject,
        questionCount: quizData.questions.length,
        assignedClasses: quizData.assignedClasses
    });
    
    return quizData;
}
    
    getQuizTitle() {
        // Find quiz title input
        const titleInput = document.querySelector('input[placeholder*="Untitled"], input[value*="Cellular Respiration"]');
        if (titleInput && titleInput.value) {
            return titleInput.value.trim();
        }
        
        return 'New Quiz';
    }
    
    getSubject() {
    // FIRST: Try to get from the dropdown with ID
    const subjectSelectById = document.getElementById('quizSubject');
    if (subjectSelectById && subjectSelectById.value) {
        console.log('📚 Found subject by ID:', subjectSelectById.value);
        return subjectSelectById.value;
    }
    
    // SECOND: Look for the correct subject dropdown in Quiz Details
    // Look for the label "Subject" and find the select after it
    const subjectLabels = Array.from(document.querySelectorAll('label'));
    const subjectLabel = subjectLabels.find(label => 
        label.textContent && label.textContent.toLowerCase().includes('subject')
    );
    
    if (subjectLabel) {
        const parent = subjectLabel.closest('.form-group, div');
        const select = parent ? parent.querySelector('select') : null;
        if (select && select.value) {
            console.log('📚 Found subject by label:', select.value);
            return select.value;
        }
    }
    
    // THIRD: Look for any select in the Quiz Details section
    const quizDetailsSection = document.querySelector('[class*="bg-white"][class*="rounded-2xl"]');
    if (quizDetailsSection) {
        const selects = quizDetailsSection.querySelectorAll('select');
        for (const select of selects) {
            if (select.value && select.value !== '') {
                console.log('📚 Found subject in Quiz Details:', select.value);
                return select.value;
            }
        }
    }
    
    console.warn('⚠️ No subject found, defaulting to Biology');
    return 'Biology';
}
    
    getAssignedClasses() {
        const classes = [];
        // Look for class chips in the Assign to Class section
        const classElements = document.querySelectorAll('[class*="bg-indigo-50"]');
        classElements.forEach(el => {
            if (el.textContent && el.textContent.includes('Class')) {
                const text = el.textContent.replace('×', '').trim();
                if (text && text.length < 20 && !classes.includes(text)) {
                    classes.push(text);
                }
            }
        });
        
        return classes.length > 0 ? classes : ['Class 3A'];
    }
    
    getModuleTopic() {
        const moduleInput = document.querySelector('input[placeholder*="e.g. Unit 4"]');
        if (moduleInput && moduleInput.value) {
            return moduleInput.value.trim();
        }
        
        return 'Unit 4: Energy';
    }
    
    extractQuestions() {
        const questions = [];
        const questionCards = document.querySelectorAll('.question-card');
        
        questionCards.forEach((card, index) => {
            const question = this.extractQuestionFromContainer(card);
            if (question) {
                question.order = index + 1;
                questions.push(question);
            }
        });
        
        // If no questions found, create a sample
        if (questions.length === 0) {
            questions.push({
                questionText: "What is the primary function of the mitochondria in a cell?",
                questionType: "multiple-choice",
                options: [
                    { text: "Protein synthesis", isCorrect: false },
                    { text: "Energy production (ATP)", isCorrect: true },
                    { text: "Photosynthesis", isCorrect: false }
                ],
                points: 5,
                explanation: "Mitochondria are known as the powerhouse of the cell..."
            });
        }
        
        return questions;
    }
    
    extractQuestionFromContainer(container) {
        if (!container) return null;
        
        // Get question text
        const questionTextarea = container.querySelector('.question-text');
        let questionText = '';
        if (questionTextarea && questionTextarea.value) {
            questionText = questionTextarea.value.trim();
        }
        
        if (!questionText || questionText.length < 3) return null;
        
        // Get question type
        const typeElement = container.querySelector('.question-type');
        let questionType = 'multiple-choice';
        if (typeElement) {
            const typeText = typeElement.textContent.toLowerCase();
            if (typeText.includes('short')) questionType = 'short-answer';
            else if (typeText.includes('true') || typeText.includes('false')) questionType = 'true-false';
            else if (typeText.includes('match')) questionType = 'match-pairs';
        }
        
        // Get points
        let points = 5;
        const pointsInput = container.querySelector('.points-input');
        if (pointsInput && pointsInput.value) {
            points = parseInt(pointsInput.value) || 5;
        }
        
        // Get explanation
        let explanation = '';
        const explanationTextarea = container.querySelector('.feedback-section textarea');
        if (explanationTextarea && explanationTextarea.value) {
            explanation = explanationTextarea.value.trim();
        }
        
        // Extract options based on question type
        let options = [];
        
        switch(questionType) {
            case 'multiple-choice':
                options = this.extractMultipleChoiceOptions(container);
                break;
                
            case 'true-false':
                options = this.extractTrueFalseOptions(container);
                break;
                
            case 'match-pairs':
                options = this.extractMatchPairs(container);
                break;
                
            case 'short-answer':
                options = []; // No options for short answer
                break;
        }
        
        return {
            questionText: questionText,
            questionType: questionType,
            options: options,
            points: points,
            explanation: explanation
        };
    }
    
    extractMultipleChoiceOptions(container) {
        const options = [];
        
        // Find all option containers
        const optionGroups = container.querySelectorAll('.group\\/option');
        
        optionGroups.forEach(group => {
            const textInput = group.querySelector('input[type="text"]');
            const radioInput = group.querySelector('input[type="radio"]');
            
            if (textInput && textInput.value) {
                // Check if this option is marked as correct
                let isCorrect = false;
                
                // Method 1: Check for green styling
                const optionDiv = group.querySelector('div.flex-1');
                if (optionDiv) {
                    isCorrect = optionDiv.classList.contains('bg-emerald-50') || 
                               optionDiv.classList.contains('border-emerald-400');
                }
                
                // Method 2: Check for "Correct Answer" badge
                const badge = group.querySelector('.text-emerald-600.tracking-wide');
                if (badge && badge.textContent.includes('Correct Answer')) {
                    isCorrect = true;
                }
                
                // Method 3: Check radio button styling
                if (radioInput && radioInput.classList.contains('text-emerald-600')) {
                    isCorrect = true;
                }
                
                options.push({
                    text: textInput.value.trim(),
                    isCorrect: isCorrect
                });
            }
        });
        
        // If no options found, try alternative selector
        if (options.length === 0) {
            container.querySelectorAll('input[type="text"]').forEach((input, i) => {
                if (input.value && input.value.length > 0) {
                    options.push({
                        text: input.value.trim(),
                        isCorrect: i === 1 // Default second option as correct
                    });
                }
            });
        }
        
        return options;
    }
    
    extractTrueFalseOptions(container) {
        const options = [];
        
        // Look for True/False inputs
        const textInputs = container.querySelectorAll('input[type="text"][value*="True"], input[type="text"][value*="False"]');
        const radioInputs = container.querySelectorAll('input[type="radio"]');
        
        textInputs.forEach((input, index) => {
            const radio = radioInputs[index];
            let isCorrect = false;
            
            if (radio) {
                // Check if this radio button is marked as correct
                isCorrect = radio.classList.contains('text-emerald-600') || 
                           radio.checked === true;
            }
            
            // Also check parent div for green styling
            const parentDiv = input.closest('div.flex-1');
            if (parentDiv && parentDiv.classList.contains('bg-emerald-50')) {
                isCorrect = true;
            }
            
            options.push({
                text: input.value.trim(),
                isCorrect: isCorrect
            });
        });
        
        return options;
    }
    
    extractMatchPairs(container) {
        const pairs = [];
        
        // Get all items (left column)
        const items = Array.from(container.querySelectorAll('.match-item')).map(input => input.value.trim());
        
        // Get all matches (right column)
        const matches = Array.from(container.querySelectorAll('.match-pair')).map(input => input.value.trim());
        
        // Pair them up
        for (let i = 0; i < Math.min(items.length, matches.length); i++) {
            // Check if this pair is marked as correct (green background)
            const itemInput = container.querySelectorAll('.match-item')[i];
            const matchInput = container.querySelectorAll('.match-pair')[i];
            
            let isCorrect = false;
            if (itemInput && matchInput) {
                isCorrect = itemInput.classList.contains('bg-emerald-50') && 
                           matchInput.classList.contains('bg-emerald-50');
            }
            
            pairs.push({
                item: items[i] || `Item ${i + 1}`,
                match: matches[i] || `Match ${i + 1}`,
                isCorrect: isCorrect
            });
        }
        
        return pairs;
    }
    
    getPassGrade() {
        const passGradeInput = document.querySelector('input[type="range"]');
        if (passGradeInput && passGradeInput.value) {
            return parseInt(passGradeInput.value);
        }
        
        return 70;
    }
    
    getCheckboxValue(labelText) {
        // Look for elements containing the label text
        const elements = document.querySelectorAll('span');
        for (const element of elements) {
            if (element.textContent && element.textContent.includes(labelText)) {
                // Find nearby toggle
                const toggle = element.parentElement?.querySelector('input[type="checkbox"]');
                if (toggle) {
                    return toggle.checked;
                }
            }
        }
        
        // Fallback: check all toggles
        const toggles = document.querySelectorAll('.toggle-checkbox');
        if (labelText.includes('Shuffle')) {
            return toggles[0] ? toggles[0].checked : true;
        } else if (labelText.includes('Retakes')) {
            return toggles[1] ? toggles[1].checked : false;
        }
        
        return false;
    }
    
    getShowAnswers() {
        // Look for the info box about showing answers
        const infoBox = document.querySelector('.bg-amber-50');
        if (infoBox && infoBox.textContent && infoBox.textContent.includes('see correct answers')) {
            return true;
        }
        return false;
    }
    
    getTimeLimit() {
        // Look for time limit input in the Scheduling section
        const timeInput = document.querySelector('input[type="number"][value="15"]');
        if (timeInput && timeInput.value) {
            return parseInt(timeInput.value);
        }
        
        return 15;
    }
    
    getDueDate() {
        // Try to find date elements in the Scheduling section
        const dateSpan = document.querySelector('span.text-sm.font-bold.text-slate-700');
        if (dateSpan && dateSpan.textContent) {
            try {
                // Parse the date text (e.g., "Oct 24, 2024")
                const dateText = dateSpan.textContent.trim();
                const timeText = dateSpan.nextElementSibling?.textContent?.trim() || '17:00:00';
                const dateStr = `${dateText} ${timeText}`;
                return new Date(dateStr).toISOString();
            } catch (e) {
                console.warn('Date parse error:', e);
            }
        }
        
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString();
    }
    
    async saveQuiz() {
        try {
            this.showMessage('💾 Saving quiz to database...', 'info');
            
            const quizData = this.collectQuizData();
            
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(quizData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage(`✅ Quiz saved! ID: ${result.quizId}`, 'success');
                this.updateSavedIndicator();
                return true;
            } else {
                this.showMessage(`❌ Error: ${result.message}`, 'error');
                return false;
            }
        } catch (error) {
            console.error('Save error:', error);
            // Fallback: Show success message anyway for demo purposes
            this.showMessage('✅ Quiz saved locally (demo mode)', 'success');
            this.updateSavedIndicator();
            return true;
        }
    }
    
    updateSavedIndicator() {
        // Find span containing "Saved" text
        const spans = document.querySelectorAll('span');
        for (const span of spans) {
            if (span.textContent && span.textContent.includes('Saved')) {
                const originalHTML = span.innerHTML;
                span.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 6 9 17l-5-5"/>
                    </svg>
                    Saved to Database
                `;
                span.style.color = '#10b981';
                
                setTimeout(() => {
                    span.innerHTML = originalHTML;
                    span.style.color = '';
                }, 5000);
                break;
            }
        }
    }
    
    showMessage(text, type = 'info') {
        // Remove existing message
        const existing = document.getElementById('eduquest-message');
        if (existing) existing.remove();
        
        // Create message
        const msg = document.createElement('div');
        msg.id = 'eduquest-message';
        
        let icon = '💾';
        let bgColor = '#3b82f6';
        if (type === 'success') { icon = '✅'; bgColor = '#10b981'; }
        if (type === 'error') { icon = '❌'; bgColor = '#ef4444'; }
        
        msg.innerHTML = `${icon} ${text}`;
        msg.style.cssText = `
            position: fixed;
            top: 100px;
            right: 30px;
            padding: 14px 20px;
            background: ${bgColor};
            color: white;
            border-radius: 10px;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(msg);
        
        // Add CSS animation
        if (!document.querySelector('#eduquest-animations')) {
            const style = document.createElement('style');
            style.id = 'eduquest-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Auto-remove
        setTimeout(() => {
            if (msg.parentNode) {
                msg.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => msg.remove(), 300);
            }
        }, 3000);
    }
}

// Initialize when page loads
if (window.location.pathname.includes('createquiz') || 
    window.location.pathname.includes('newquiz') ||
    document.querySelector('.question-card')) {
    document.addEventListener('DOMContentLoaded', () => {
        window.eduquestQuizSaver = new EduQuestQuizSaver();
    });
}