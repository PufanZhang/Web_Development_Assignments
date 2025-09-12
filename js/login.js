import { auth } from './game/modules/dataManager.js';
import { audioManager } from "./game/modules/audioManager.js";
import { VOLUME, LOGIN_MUSIC } from "./game/config.js";

document.addEventListener('DOMContentLoaded', () => {

    audioManager.init(VOLUME);
    audioManager.playMusic(LOGIN_MUSIC);

    // --- DOM 元素获取 ---
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const loginForm = document.getElementById('loginForm');
    const mainSubmitBtn = document.getElementById('mainSubmitBtn');
    const switchModeBtn = document.getElementById('switchModeBtn');
    const passwordToggleIcon = document.querySelector('.password-toggle');

    // --- 状态变量 ---
    let isLoginMode = true; // true 为登录模式, false 为注册模式

    function translateErrorMessage(englishMessage) {
        switch (englishMessage) {
            case "Username is already taken":
                return "该用户名已被占用，请换一个。";
            case "Incorrect password.":
                return "密码错误";
            case "Username not found.":
                return "该账户不存在，请先注册。"
            case "This account is already logged in elsewhere.":
                return "该账户已在别处登录，请勿重复登录。";
            case "Invalid or expired token.":
                return "登录凭证无效或已过期，请重新登录。";
            case "Could not create token.":
            case "Could not create new token.":
                return "服务器内部错误：无法创建用户凭证。";
            default:
                // 对于未知的后端错误，显示一个通用信息，并在控制台打印原始错误
                console.error("【login.js】: 未知的后端错误:", englishMessage);
                return "发生未知错误，请重试或联系管理员。";
        }
    }

    // --- 自动登录逻辑 ---
    async function attemptAutoLogin() {
        const token = localStorage.getItem("jwt_token");
        if (token) {
            console.log("【login.js】: 检测到 token，正在向服务器验证...");
            const response = await auth.loginWithToken(token);

            if (response.success && response.token) {
                console.log("【login.js】: Token 验证成功，自动登录...");
                localStorage.setItem("jwt_token", response.token);
                localStorage.setItem("user", response.playerData.username);
                window.location.href = 'index.html';
            } else {
                console.warn("【login.js】: 自动登录失败:", response.message);
                localStorage.removeItem("jwt_token");
                localStorage.removeItem("user");
                // 自动登录失败后，执行页面初始化
                initializePage();
            }
        } else {
            console.log("【login.js】: 未检测到 token，请手动登录。");
            // 无 token，执行页面初始化
            initializePage();
        }
    }

    // --- 核心登录/注册处理函数 ---
    async function handleFormSubmit(event) {
        event.preventDefault(); // 阻止表单默认提交行为

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        const validationError = validateForm(username, password);
        if (validationError) {
            showMessage(validationError, 'error');
            return;
        }

        setLoading(true);

        try {
            if (isLoginMode) {
                // --- 登录逻辑 ---
                console.log("【login.js】: 正在执行登录...");
                const response = await auth.login(username, password);
                console.log("【login.js】: 收到登录响应:", response);

                if (response && response.success && response.token) {
                    localStorage.setItem("jwt_token", response.token);
                    localStorage.setItem("user", username);
                    console.log("【login.js】: Token 已写入 localStorage!");
                    showMessage('登录成功!', 'success');
                    window.location.href = 'index.html';
                } else if (response && !response.success) {
                    // 登录失败，显示翻译后的中文错误信息
                    console.log(`【login.js】: ${isLoginMode ? '登录' : '注册'}过程中发生错误:`, response);
                    const message = response ? translateErrorMessage(response.message) : "登录失败，请重试。";
                    showMessage(message, 'error');
                    setTimeout(() => {
                        setLoading(false);
                    },500);
                }
            } else {
                // --- 注册逻辑 ---
                console.log("【login.js】: 正在执行注册...");
                const response = await auth.register(username, password);
                console.log("【login.js】: 收到注册响应:", response);

                if (response && response.success) {
                    showMessage('注册成功！请使用新账户登录。', 'success');
                    setTimeout(() => {
                        toggleMode(username, password);
                    }, 1000);
                } else {
                    const message = response ? translateErrorMessage(response.message) : "注册失败，请重试。";
                    showMessage(message, 'error');
                }
                setLoading(false);
            }
        } catch (error) {
            console.error(`【login.js】: ${isLoginMode ? '登录' : '注册'}过程中发生严重错误:`, error);
            showMessage(translateErrorMessage(error), 'error');
            setLoading(false);
        }
    }

    // --- UI 控制和效果函数 ---

    // 创建粒子效果
    function createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 8 + 's';
            particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
            particlesContainer.appendChild(particle);
        }
    }

    // 密码显示/隐藏切换
    function togglePasswordVisibility() {
        const toggleIcon = passwordToggleIcon;
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleIcon.textContent = '👁';
        }
    }

    // 显示消息
    function showMessage(message, type = 'error') {
        const errorEl = document.getElementById('errorMessage');
        const successEl = document.getElementById('successMessage');
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        const targetEl = type === 'error' ? errorEl : successEl;
        targetEl.textContent = message;
        targetEl.style.display = 'block';

        setTimeout(() => {
            targetEl.style.display = 'none';
        }, 3000);
    }

    // 设置加载状态
    function setLoading(isLoading) {
        if (isLoading) {
            mainSubmitBtn.classList.add('loading');
            mainSubmitBtn.textContent = isLoginMode ? '登录中...' : '注册中...';
            loginForm.style.pointerEvents = 'none';
        } else {
            mainSubmitBtn.classList.remove('loading');
            mainSubmitBtn.textContent = isLoginMode ? '登录游戏' : '注册新账户';
            loginForm.style.pointerEvents = 'auto';
        }
    }

    // 表单验证
    function validateForm(username, password) {
        if (username.length < 3) return '用户名至少需要3个字符';
        if (username.length > 20) return '用户名至多20个字符'
        if (password.length < 6) return '密码至少需要6个字符';
        return null;
    }

    // 切换登录/注册模式
    function toggleMode(prefillUsername = '', prefillPassword = '') {
        isLoginMode = !isLoginMode;

        const title = document.querySelector('.form-title');
        const subtitle = document.querySelector('.form-subtitle');

        if (isLoginMode) {
            title.textContent = '账户登录';
            subtitle.textContent = '欢迎回到游戏世界';
            mainSubmitBtn.textContent = '登录游戏';
            switchModeBtn.textContent = '注册新账户';
        } else {
            title.textContent = '注册账户';
            subtitle.textContent = '开启你的冒险之旅';
            mainSubmitBtn.textContent = '立即注册';
            switchModeBtn.textContent = '返回登录';
        }

        // 清空输入和消息
        usernameInput.value = prefillUsername;
        passwordInput.value = prefillPassword;
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('successMessage').style.display = 'none';
        if (prefillUsername && prefillPassword) {
            mainSubmitBtn.focus();
        } else {
            usernameInput.focus();
        }
    }

    // --- 页面初始化和事件绑定 ---
    function initializePage() {
        // 绑定核心表单提交事件
        loginForm.addEventListener('submit', handleFormSubmit);

        // 绑定切换模式按钮事件
        switchModeBtn.addEventListener('click', () => toggleMode());

        // 绑定密码可见性切换事件
        passwordToggleIcon.addEventListener('click', togglePasswordVisibility);

        // 创建粒子效果
        createParticles();

        // 自动聚焦到用户名输入框
        usernameInput.focus();

        // 添加输入框动画效果
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => input.parentElement.style.transform = 'scale(1.02)');
            input.addEventListener('blur', () => input.parentElement.style.transform = 'scale(1)');
        });

        // 键盘 Enter 键支持
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                mainSubmitBtn.click(); // 触发提交按钮的点击事件
            }
        });
    }

    // --- 启动逻辑 ---
    // 页面加载时首先尝试自动登录
    attemptAutoLogin();
});