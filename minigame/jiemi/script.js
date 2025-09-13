const gameData = {
    // 4条线索（对应密码：2724）
    clues: [
        "线索1：刘小星在信息作战部队研发的高级病毒，是\"冰川行动\"成功的关键。根据唐梓回忆的行动流程：潜入→破解护盾→安装炸弹→撤离。这个关键技术应用在第几个步骤？",
        "线索2：病房旧报纸记载\"冰川行动\"持续了漫长岁月，最终瘫痪\"冰川号\"。请问冰川行动是多长时间前结束的？",
        "线索3：\"冰川行动\"十分惨烈，幸存者少之又少，请问有多少人幸存？",
        "线索4：刘小月的姐姐在哪只部队服役？（1.网络空间安全部队2.信息支援部队3.信息作战与网安部队4.信息作战部队）"
    ],
    // 每条线索对应的提示（基于G2解密前剧情）
    hints: [
        "病毒是用来破坏某些东西的",
        "你曾记得那张报纸上记载的时间大约是六七天前",
        "幸存者都已经出场，想想病房和花房里见过的人",
        "刘小月的姐姐是研发病毒的信息专家"
    ],
    correctPassword: "2724", // 正确密码
    currentClueIndex: 0,     // 当前显示的线索索引
    attemptsLeft: 3,         // 剩余尝试次数
    attempts: [],            // 尝试记录
    clueAnswers: ["", "", "", ""], // 存储每条线索的答案
    hintsGiven: [],          // 已给出提示的线索索引（确保不重复）
    maxHints: 2              // 最大提示次数
};

// DOM元素获取
const elements = {
    cluesSection: document.getElementById('clues-section'),
    clueCount: document.getElementById('clue-count'),
    currentClue: document.getElementById('current-clue'),
    prevClueBtn: document.getElementById('prev-clue-btn'), // 新增：上一条线索按钮
    nextClueBtn: document.getElementById('next-clue-btn'),
    clueAnswerInput: document.getElementById('clue-answer'),
    answersSummary: document.getElementById('answers-summary'),
    passwordSection: document.getElementById('password-section'),
    passwordDigits: document.querySelectorAll('.password-digit'),
    attemptsLeft: document.getElementById('attempts-left'),
    submitPassword: document.getElementById('submit-password'),
    clearPassword: document.getElementById('clear-password'),
    attemptsHistory: document.getElementById('attempts-history'),
    successScreen: document.getElementById('success-screen'),
    backToStory: document.getElementById('back-to-story'),
    failureScreen: document.getElementById('failure-screen'),
    continueStory: document.getElementById('continue-story'), // 新增：返回剧情按钮
    autoFillBtn: document.getElementById('auto-fill'),
    hintSection: document.getElementById('hint-section'),
    backToClue: document.getElementById('back-to-clue'),
    confirmHintBtn: document.getElementById('confirm-hint'),
    tryAgain: document.getElementById('try-again')
};

// 初始化游戏（页面加载后执行）
function initGame() {
    showCurrentClue();       // 显示第一条线索
    setupEventListeners();   // 绑定所有交互事件
    updateAnswersSummary();  // 初始化答案汇总框（空白状态）
}

// 显示当前线索
function showCurrentClue() {
    // 加载当前线索文本
    elements.currentClue.textContent = gameData.clues[gameData.currentClueIndex];
    // 更新线索计数（如：1/4）
    elements.clueCount.textContent = `${gameData.currentClueIndex + 1}/4`;
    // 回显已输入的线索答案
    elements.clueAnswerInput.value = gameData.clueAnswers[gameData.currentClueIndex];
    
    // 控制上一条线索按钮显示/隐藏
    if (gameData.currentClueIndex === 0) {
        elements.prevClueBtn.classList.add('hidden');
    } else {
        elements.prevClueBtn.classList.remove('hidden');
    }
    
    // 调整"下一条线索"按钮文本（最后一条线索时显示"解析密码"）
    if (gameData.currentClueIndex === gameData.clues.length - 1) {
        elements.nextClueBtn.textContent = '解析密码';
        elements.nextClueBtn.innerHTML = '解析密码 <i class="fa fa-arrow-right ml-1"></i>';
    } else {
        elements.nextClueBtn.textContent = '下一条线索';
        elements.nextClueBtn.innerHTML = '下一条线索 <i class="fa fa-arrow-right ml-1"></i>';
    }
    
    // 聚焦到线索答案输入框
    elements.clueAnswerInput.focus();
}

// 更新答案汇总框（4个空白框，输入后显示对应答案）
function updateAnswersSummary() {
    elements.answersSummary.innerHTML = ''; // 清空现有内容
    
    gameData.clueAnswers.forEach((answer, index) => {
        const answerEl = document.createElement('div');
        // 样式控制：有答案时高亮，无答案时显示空白虚线框
        answerEl.className = `w-10 h-10 rounded flex items-center justify-center border transition-all ${
            answer ? 'bg-primary/10 text-primary border-primary/30' : 'bg-green-100 text-slate-400 border border-dashed border-primary/30'
        }`;
        answerEl.textContent = answer || ''; // 无答案时显示空白
        elements.answersSummary.appendChild(answerEl);
    });
}

// 绑定所有交互事件
function setupEventListeners() {
    // 1. 上一条线索按钮点击事件
    elements.prevClueBtn.addEventListener('click', () => {
        // 获取当前线索输入的答案（仅保留数字）
        const currentAnswer = elements.clueAnswerInput.value.replace(/[^0-9]/g, '');
        
        // 保存当前线索答案并更新汇总框
        if (currentAnswer) {
            gameData.clueAnswers[gameData.currentClueIndex] = currentAnswer;
            updateAnswersSummary();
        }
        
        // 切换到上一条线索
        if (gameData.currentClueIndex > 0) {
            gameData.currentClueIndex--;
            showCurrentClue();
        }
    });

    // 2. 下一条线索按钮点击事件
    elements.nextClueBtn.addEventListener('click', () => {
        // 获取当前线索输入的答案（仅保留数字）
        const currentAnswer = elements.clueAnswerInput.value.replace(/[^0-9]/g, '');
        
        // 验证：必须输入答案才能进入下一条线索
        if (!currentAnswer) {
            shakeElement(elements.clueAnswerInput); // 输入框抖动提示
            return;
        }
        
        // 保存当前线索答案并更新汇总框
        gameData.clueAnswers[gameData.currentClueIndex] = currentAnswer;
        updateAnswersSummary();
        
        // 切换到下一条线索，或进入密码输入界面
        if (gameData.currentClueIndex < gameData.clues.length - 1) {
            gameData.currentClueIndex++;
            showCurrentClue();
        } else {
            // 所有线索输入完成，切换到密码输入界面
            elements.cluesSection.classList.add('hidden');
            elements.passwordSection.classList.remove('hidden');
            elements.passwordDigits[0].focus(); // 聚焦到第一个密码框
        }
    });

    // 3. 线索答案输入框：仅允许输入数字
    elements.clueAnswerInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // 4. 密码输入框交互：自动跳转到下一个/上一个框
    elements.passwordDigits.forEach((digit, index) => {
        // 输入数字后自动跳转到下一个框
        digit.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, ''); // 仅允许数字
            if (e.target.value && index < elements.passwordDigits.length - 1) {
                elements.passwordDigits[index + 1].focus();
            }
        });
        
        // 按退格键时，若当前框为空则跳转到上一个框
        digit.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                elements.passwordDigits[index - 1].focus();
            }
        });
    });

    // 5. 清除密码按钮：清空所有密码框并聚焦到第一个
    elements.clearPassword.addEventListener('click', () => {
        elements.passwordDigits.forEach(digit => digit.value = '');
        elements.passwordDigits[0].focus();
    });

    // 6. 自动填充按钮：用已输入的线索答案填充密码框
    elements.autoFillBtn.addEventListener('click', () => {
        elements.passwordDigits.forEach((digit, index) => {
            digit.value = gameData.clueAnswers[index] || '';
        });
        
        // 聚焦到第一个空密码框
        const firstEmptyIndex = Array.from(elements.passwordDigits).findIndex(d => !d.value);
        if (firstEmptyIndex !== -1) {
            elements.passwordDigits[firstEmptyIndex].focus();
        }
    });

    // 7. 提交密码按钮：验证密码正确性
    elements.submitPassword.addEventListener('click', checkPassword);

    // 8. 键盘Enter键：线索页提交答案，密码页提交密码
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (!elements.cluesSection.classList.contains('hidden')) {
                elements.nextClueBtn.click(); // 线索页：触发"下一条线索"
            } else if (!elements.passwordSection.classList.contains('hidden')) {
                checkPassword(); // 密码页：触发"提交密码"
            }
        }
    });

    // 9. 成功后返回剧情
    elements.backToStory.addEventListener('click', Success);
    
    // 10. 失败后重试
    elements.tryAgain.addEventListener('click', returnToStory);
    
    // 11. 返回查看线索按钮 - 修复的问题在这里
    elements.backToClue.addEventListener('click', () => {
        // 隐藏密码区域，显示线索区域
        elements.passwordSection.classList.add('hidden');
        elements.cluesSection.classList.remove('hidden');
        
        // 跳转到第四条线索（索引为3）
        gameData.currentClueIndex = 3;
        // 刷新线索显示（关键步骤，否则不会更新内容）
        showCurrentClue();
    });
}

// 验证密码正确性
function checkPassword() {
    // 拼接输入的4位密码
    let enteredPassword = '';
    elements.passwordDigits.forEach(digit => enteredPassword += digit.value || '');
    
    // 验证：必须输入4位数字
    if (enteredPassword.length !== 4) {
        shakeInputFields(); // 密码框抖动提示
        return;
    }
    
    // 记录本次尝试并更新尝试历史
    gameData.attempts.push(enteredPassword);
    updateAttemptsHistory();
    
    // 密码正确：显示成功界面
    if (enteredPassword === gameData.correctPassword) {
        elements.passwordSection.classList.add('hidden');
        elements.successScreen.classList.remove('hidden');
        const result = { success: true };
        setTimeout(() => {
            window.parent.postMessage({ type: 'closeMinigame', result: result }, '*');
        }, 1500); // 1.5秒后关闭
    } 
    // 密码错误：处理剩余次数和提示
    else {
        gameData.attemptsLeft--;
        elements.attemptsLeft.textContent = gameData.attemptsLeft; // 更新剩余次数显示
        shakeInputFields(); // 密码框抖动提示
        
        // 找出所有做错的题目索引
        const wrongIndices = [];
        for (let i = 0; i < 4; i++) {
            if (enteredPassword[i] !== gameData.correctPassword[i]) {
                wrongIndices.push(i);
            }
        }
        
        // 告知用户哪些题目错了
        let errorMessage = `密码不正确！做错的题目是：`;
        wrongIndices.forEach(index => {
            errorMessage += ` 线索${index + 1}`;
        });
        errorMessage += `，请重新尝试。`;
        
        // 显示错误信息
        alert(errorMessage);
        
        // 清空密码框并聚焦到第一个
        elements.passwordDigits.forEach(digit => digit.value = '');
        elements.passwordDigits[0].focus();
        
        // 还有剩余次数且未超过最大提示次数：提示未给过提示的错题
        if (gameData.attemptsLeft > 0 && gameData.hintsGiven.length < gameData.maxHints) {
            // 过滤出未给过提示的错题
            const availableWrongIndices = wrongIndices.filter(
                index => !gameData.hintsGiven.includes(index)
            );
            
            // 如果有未提示过的错题，随机选择一个提示
            if (availableWrongIndices.length > 0) {
                const randomWrongIndex = availableWrongIndices[
                    Math.floor(Math.random() * availableWrongIndices.length)
                ];
                
                alert(`💡 线索${randomWrongIndex + 1}提示：${gameData.hints[randomWrongIndex]}`);
                gameData.hintsGiven.push(randomWrongIndex); // 记录已提示的线索索引
            }
        }
        
        // 无剩余次数：显示失败界面+所有线索提示和正确答案
        if (gameData.attemptsLeft === 0) {
            const failureHintEl = document.querySelector('#failure-screen p:nth-child(3)');
            if (failureHintEl) {
                // 拼接所有线索的提示信息和正确答案
                let allInfo = "正确密码是：" + gameData.correctPassword + "<br><br>";
                allInfo += "完整解析：<br>";
                gameData.clues.forEach((clue, index) => {
                    allInfo += `${index + 1}：${clue} → 答案是${gameData.correctPassword[index]}（${gameData.hints[index]}）<br><br>`;
                });
                allInfo += "现在，让我们回到剧情中继续探索...";
                failureHintEl.innerHTML = allInfo;
            }
            
            elements.passwordSection.classList.add('hidden');
            elements.failureScreen.classList.remove('hidden');
        }
    }
}

// 更新尝试历史（显示之前输入的密码及对错状态）
function updateAttemptsHistory() {
    elements.attemptsHistory.innerHTML = ''; // 清空历史
    
    gameData.attempts.forEach(attempt => {
        const attemptEl = document.createElement('div');
        attemptEl.className = 'flex justify-between items-center p-2 bg-white rounded border border-green-100';
        
        // 尝试的密码（如：定位编码: 1234）
        const attemptText = document.createElement('span');
        attemptText.className = 'font-mono';
        attemptText.textContent = `定位编码: ${attempt}`;
        
        // 对错状态（✅/❌）
        const attemptStatus = document.createElement('span');
        if (attempt === gameData.correctPassword) {
            attemptStatus.className = 'text-primary';
            attemptStatus.innerHTML = '<i class="fa fa-check"></i> 正确';
        } else {
            attemptStatus.className = 'text-red-500';
            attemptStatus.innerHTML = '<i class="fa fa-times"></i> 错误';
        }
        
        attemptEl.appendChild(attemptText);
        attemptEl.appendChild(attemptStatus);
        elements.attemptsHistory.appendChild(attemptEl);
    });
    
    // 滚动到最新尝试记录
    elements.attemptsHistory.scrollTop = elements.attemptsHistory.scrollHeight;
}

// 密码框抖动动画（错误提示）
function shakeInputFields() {
    elements.passwordDigits.forEach(digit => {
        digit.classList.add('border-red-500', 'animate-shake');
        setTimeout(() => digit.classList.remove('border-red-500', 'animate-shake'), 500);
    });
}

// 单个元素抖动动画（如：线索输入框未填时）
function shakeElement(element) {
    element.classList.add('border-red-500', 'animate-shake');
    setTimeout(() => element.classList.remove('border-red-500', 'animate-shake'), 500);
}

// 注册抖动动画（全局生效）
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    .animate-shake { animation: shake 0.5s ease-in-out; }
`;
document.head.appendChild(shakeStyle);

// 返回正常剧情（替换重新开始功能）
function Success() {
    // 这里可以添加返回剧情的逻辑，例如：
    // 1. 隐藏游戏相关界面
    elements.successScreen.classList.add('hidden');
    elements.failureScreen.classList.add('hidden');
    elements.cluesSection.classList.add('hidden');
    elements.passwordSection.classList.add('hidden');
    const result = { success: true };
    window.parent.postMessage({ type: 'closeMinigame', result: result }, '*');
}
// 返回正常剧情（替换重新开始功能）
function returnToStory() {
    // 这里可以添加返回剧情的逻辑，例如：
    // 1. 隐藏游戏相关界面
    elements.successScreen.classList.add('hidden');
    elements.failureScreen.classList.add('hidden');
    elements.cluesSection.classList.add('hidden');
    elements.passwordSection.classList.add('hidden');
    const result = { success: false };
    window.parent.postMessage({ type: 'closeMinigame', result: result }, '*');
}

// 初始化游戏
initGame();