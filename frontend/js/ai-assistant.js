// ============================================
// AI ASSISTANT FUNCTIONALITY
// ============================================

const AI_ASSISTANT_API = 'http://localhost:3000/api/ai/assist';
let aiChatOpen = false;

// Initialize AI Assistant
function initAIAssistant() {
  const assistantBtn = document.getElementById('ai-assistant-btn');
  const chatInterface = document.getElementById('ai-chat-interface');
  const closeBtn = document.getElementById('ai-close-btn');
  const sendBtn = document.getElementById('ai-send-btn');
  const messageInput = document.getElementById('ai-message-input');
  const quickActions = document.querySelectorAll('.ai-quick-action');
  const chatMessages = document.getElementById('ai-chat-messages');
  
  // Toggle chat interface
  assistantBtn.addEventListener('click', () => {
    aiChatOpen = !aiChatOpen;
    chatInterface.classList.toggle('hidden');
    
    if (aiChatOpen) {
      chatInterface.style.display = 'flex';
      setTimeout(() => messageInput.focus(), 300);
    }
  });
  
  // Close chat
  closeBtn.addEventListener('click', () => {
    aiChatOpen = false;
    chatInterface.classList.add('hidden');
  });
  
  // Quick actions
  quickActions.forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const currentQuestion = getCurrentQuestionContext();
      
      let prompt = '';
      switch(action) {
        case 'generate_question':
          prompt = promptForQuestionGeneration(currentQuestion);
          break;
        case 'improve_question':
          prompt = promptForQuestionImprovement(currentQuestion);
          break;
        case 'suggest_answers':
          prompt = promptForAnswerSuggestions(currentQuestion);
          break;
        case 'check_difficulty':
          prompt = promptForDifficultyCheck(currentQuestion);
          break;
      }
      
      if (prompt) {
        addMessageToChat(prompt, 'user');
        await sendAIRequest(prompt, action, currentQuestion);
      }
    });
  });
  
  // Send message
  function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    addMessageToChat(message, 'user');
    messageInput.value = '';
    adjustTextareaHeight(messageInput);
    
    // Determine action based on message content
    const action = determineActionFromMessage(message);
    const context = getCurrentQuestionContext();
    
    sendAIRequest(message, action, context);
  }
  
  // Send button click
  sendBtn.addEventListener('click', sendMessage);
  
  // Enter key to send (Shift+Enter for new line)
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Auto-resize textarea
  messageInput.addEventListener('input', function() {
    adjustTextareaHeight(this);
  });
  
  // Load chat history from localStorage
  loadChatHistory();
}

// Helper function to get current question context
function getCurrentQuestionContext() {
  const activeQuestion = document.querySelector('.question-card:focus-within, .question-card:hover');
  if (activeQuestion) {
    const questionText = activeQuestion.querySelector('.question-text')?.value || '';
    const questionType = activeQuestion.querySelector('.question-type')?.textContent || '';
    const points = activeQuestion.querySelector('.points-input')?.value || '';
    
    return {
      questionText,
      questionType,
      points,
      subject: document.querySelector('select')?.value || 'Biology',
      topic: document.querySelector('input[placeholder*="Unit"]')?.value || ''
    };
  }
  
  return {
    subject: document.querySelector('select')?.value || 'Biology',
    topic: document.querySelector('input[placeholder*="Unit"]')?.value || ''
  };
}

// Determine AI action based on message content
function determineActionFromMessage(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('generate') || lowerMessage.includes('create') || lowerMessage.includes('make')) {
    return 'generate_question';
  } else if (lowerMessage.includes('improve') || lowerMessage.includes('better') || lowerMessage.includes('enhance')) {
    return 'improve_question';
  } else if (lowerMessage.includes('answer') || lowerMessage.includes('option') || lowerMessage.includes('distractor')) {
    return 'suggest_answers';
  } else if (lowerMessage.includes('difficult') || lowerMessage.includes('hard') || lowerMessage.includes('easy')) {
    return 'check_difficulty';
  } else if (lowerMessage.includes('explain') || lowerMessage.includes('what is') || lowerMessage.includes('how does')) {
    return 'explain_concept';
  }
  
  return 'general';
}

// Quick action prompts
function promptForQuestionGeneration(context) {
  if (context.questionText) {
    return `Generate a similar question to: "${context.questionText}" on topic: ${context.topic || 'current subject'}`;
  }
  return `Generate a ${context.questionType || 'multiple choice'} question about ${context.topic || context.subject || 'biology'}`;
}

function promptForQuestionImprovement(context) {
  if (context.questionText) {
    return `Improve this question: "${context.questionText}"`;
  }
  return 'How can I improve my quiz questions?';
}

function promptForAnswerSuggestions(context) {
  if (context.questionText) {
    return `Suggest answers for: "${context.questionText}"`;
  }
  return 'What are good answer options for my quiz?';
}

function promptForDifficultyCheck(context) {
  if (context.questionText) {
    return `Check difficulty of: "${context.questionText}"`;
  }
  return 'How do I assess question difficulty?';
}

// Add message to chat
function addMessageToChat(message, sender) {
  const chatMessages = document.getElementById('ai-chat-messages');
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ${sender}`;
  
  if (sender === 'user') {
    messageDiv.innerHTML = `
      <div class="flex flex-col items-end max-w-[85%] ml-auto">
        <div class="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-none px-4 py-3">
          <p class="font-medium">${escapeHtml(message)}</p>
        </div>
        <div class="text-xs text-slate-400 mt-1 mr-2">${timestamp}</div>
      </div>
    `;
  } else if (sender === 'assistant') {
    messageDiv.innerHTML = `
      <div class="inline-block bg-gradient-to-r from-purple-100 to-indigo-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
        <div class="ai-response-content">${formatAIResponse(message)}</div>
      </div>
      <div class="text-xs text-slate-400 mt-1 ml-2">${timestamp}</div>
    `;
  } else if (sender === 'typing') {
    messageDiv.innerHTML = `
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  }
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Save to chat history
  saveChatHistory();
}

// Format AI response with markdown-like styling
function formatAIResponse(text) {
  // Convert markdown-like formatting
  let formatted = escapeHtml(text);
  
  // Bold text
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Headers
  formatted = formatted.replace(/^(QUESTION:|OPTIONS:|CORRECT:|EXPLANATION:|DIFFICULTY:)/gm, '<strong class="text-purple-700">$1</strong>');
  
  // Lists
  formatted = formatted.replace(/^\d+\.\s+(.*)/gm, '<li>$1</li>');
  formatted = formatted.replace(/^-\s+(.*)/gm, '<li>$1</li>');
  
  // Line breaks
  formatted = formatted.replace(/\n/g, '<br>');
  
  // Wrap lists
  if (formatted.includes('<li>')) {
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul class="space-y-1 my-2 pl-4">$1</ul>');
  }
  
  return formatted;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Send request to AI backend
async function sendAIRequest(message, action, context) {
  // Show typing indicator
  addMessageToChat('', 'typing');
  
  try {
    const response = await fetch(AI_ASSISTANT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        action: action,
        context: JSON.stringify(context)
      })
    });
    
    // Remove typing indicator
    const chatMessages = document.getElementById('ai-chat-messages');
    const typingIndicator = chatMessages.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      addMessageToChat(data.response, 'assistant');
      
      // Check if response contains a question that could be added to quiz
      if (action === 'generate_question' && data.response.includes('QUESTION:')) {
        setTimeout(() => suggestAddingToQuiz(data.response), 1000);
      }
    } else {
      addMessageToChat(`Error: ${data.error || 'Unknown error'}`, 'assistant');
    }
    
  } catch (error) {
    console.error('AI Request failed:', error);
    
    // Remove typing indicator
    const chatMessages = document.getElementById('ai-chat-messages');
    const typingIndicator = chatMessages.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
    
    addMessageToChat(`Sorry, I encountered an error. Please check if the AI backend is running. Error: ${error.message}`, 'assistant');
  }
}

// Suggest adding generated question to quiz
function suggestAddingToQuiz(aiResponse) {
  const chatMessages = document.getElementById('ai-chat-messages');
  
  const suggestionDiv = document.createElement('div');
  suggestionDiv.className = 'ai-message ai-assistant mt-2';
  suggestionDiv.innerHTML = `
    <div class="inline-block bg-gradient-to-r from-emerald-100 to-green-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
      <p class="text-slate-800 font-medium mb-2">💡 <strong>Want to add this to your quiz?</strong></p>
      <button id="add-ai-question" class="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
        Add to Quiz
      </button>
      <button id="copy-ai-question" class="ml-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors">
        Copy Text
      </button>
    </div>
  `;
  
  chatMessages.appendChild(suggestionDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Add event listeners
  setTimeout(() => {
    const addBtn = document.getElementById('add-ai-question');
    const copyBtn = document.getElementById('copy-ai-question');
    
    if (addBtn) {
      addBtn.addEventListener('click', () => addAIQuestionToQuiz(aiResponse));
    }
    
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(aiResponse);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy Text', 2000);
      });
    }
  }, 100);
}

// Parse AI response and add to quiz
function addAIQuestionToQuiz(aiResponse) {
  try {
    // Extract question from response
    const questionMatch = aiResponse.match(/QUESTION:\s*(.*?)(?=OPTIONS:|CORRECT:|EXPLANATION:|DIFFICULTY:|$)/s);
    const optionsMatch = aiResponse.match(/OPTIONS:\s*(.*?)(?=CORRECT:|EXPLANATION:|DIFFICULTY:|$)/s);
    const correctMatch = aiResponse.match(/CORRECT:\s*([A-D])/);
    
    if (questionMatch) {
      const questionText = questionMatch[1].trim();
      
      // Create new question in quiz
      const newQuestionHTML = createQuestion('Multiple Choice');
      const questionsContainer = document.getElementById('questions-container');
      questionsContainer.insertAdjacentHTML('beforeend', newQuestionHTML);
      
      // Get the new question card
      const newQuestionCard = questionsContainer.lastElementChild;
      
      // Set the question text
      const questionTextarea = newQuestionCard.querySelector('.question-text');
      if (questionTextarea) {
        questionTextarea.value = questionText;
      }
      
      // Parse and set options if available
      if (optionsMatch) {
        const optionsText = optionsMatch[1];
        const optionMatches = optionsText.matchAll(/([A-D])\)\s*(.*?)(?=,\s*[A-D]\)|$)/g);
        const options = Array.from(optionMatches);
        
        const optionInputs = newQuestionCard.querySelectorAll('.question-content input[type="text"]');
        options.forEach((option, index) => {
          if (optionInputs[index]) {
            optionInputs[index].value = option[2].trim();
          }
        });
        
        // Set correct answer
        if (correctMatch && correctMatch[1]) {
          const correctIndex = correctMatch[1].charCodeAt(0) - 65; // A=0, B=1, etc.
          const radioButtons = newQuestionCard.querySelectorAll('.correct-radio');
          if (radioButtons[correctIndex]) {
            radioButtons[correctIndex].click();
          }
        }
      }
      
      // Attach event listeners
      attachQuestionEventListeners(newQuestionCard);
      
      // Update summary
      updateQuestionSummary();
      
      // Show success message
      addMessageToChat('✅ Question added to your quiz!', 'assistant');
    }
  } catch (error) {
    console.error('Failed to add AI question:', error);
    addMessageToChat('Sorry, I couldn\'t add the question automatically. Please copy and paste it manually.', 'assistant');
  }
}

// Auto-resize textarea
function adjustTextareaHeight(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Save chat history to localStorage
function saveChatHistory() {
  const chatMessages = document.getElementById('ai-chat-messages');
  const messages = [];
  
  chatMessages.querySelectorAll('.ai-message').forEach(msg => {
    if (!msg.querySelector('.typing-indicator')) {
      const isUser = msg.classList.contains('user');
      const content = isUser 
        ? msg.querySelector('p')?.textContent || ''
        : msg.querySelector('.ai-response-content')?.innerHTML || '';
      
      if (content) {
        messages.push({
          sender: isUser ? 'user' : 'assistant',
          content: isUser ? content : msg.querySelector('.ai-response-content')?.innerHTML || '',
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  localStorage.setItem('eduquest_ai_chat', JSON.stringify(messages.slice(-50))); // Keep last 50 messages
}

// Load chat history from localStorage
function loadChatHistory() {
  const saved = localStorage.getItem('eduquest_ai_chat');
  if (saved) {
    try {
      const messages = JSON.parse(saved);
      const chatMessages = document.getElementById('ai-chat-messages');
      
      // Clear welcome message
      chatMessages.innerHTML = '';
      
      messages.forEach(msg => {
        if (msg.sender === 'user') {
          addMessageToChat(msg.content, 'user');
        } else {
          // Create assistant message
          const messageDiv = document.createElement('div');
          messageDiv.className = 'ai-message ai-assistant';
          messageDiv.innerHTML = `
            <div class="inline-block bg-gradient-to-r from-purple-100 to-indigo-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
              <div class="ai-response-content">${msg.content}</div>
            </div>
            <div class="text-xs text-slate-400 mt-1 ml-2">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          `;
          chatMessages.appendChild(messageDiv);
        }
      });
      
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }
}

// Initialize AI Assistant when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initAIAssistant, 1000); // Slight delay to ensure other elements are loaded
});