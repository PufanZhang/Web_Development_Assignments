import { auth } from './modules/dataManager.js';

document.addEventListener('DOMContentLoaded', () => {
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
            }
        } else {
            console.log("【login.js】: 未检测到 token，请手动登录。");
        }
    }

    // 页面加载时立即尝试自动登录
    attemptAutoLogin();

    const loginButton = document.getElementById("login");
    const signupButton = document.getElementById("signup");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    async function loginHandler() {
        const username = usernameInput.value;
        const password = passwordInput.value;
        if (!username || !password) {
            alert("请输入完整信息");
            return;
        }

        // --- 核心改动在这里 ---
        try {
            // 1. 等待服务器返回完整的响应
            const response = await auth.login(username, password);
            console.log("【login.js】: 已收到来自服务器的响应:", response);

            // 2. 检查响应是否成功，并且真的包含了 token
            if (response.success && response.token) {

                // 3. 立刻！马上！在这里直接存储！
                localStorage.setItem("jwt_token", response.token);
                localStorage.setItem("user", username);

                console.log("【login.js】: Token 已成功写入 localStorage!");
                alert(response.message);

                // 4. 所有事情都做完后，再执行跳转
                console.log("【login.js】: 登录成功，准备跳转到 index.html...");
                window.location.href = 'index.html';

            } else {
                // 如果登录失败或响应里没有 token，就弹窗提示
                const message = response ? response.message : "登录失败，请重试。";
                alert(message);
                console.error("【login.js】: 登录失败或响应中缺少 token。", response);
            }

        } catch (error) {
            // 如果网络请求本身就出错了
            console.error("【login.js】: 登录过程中发生严重错误:", error);
            alert("登录请求失败，请检查网络连接或联系管理员。");
        }
    }

    async function signupHandler() {
        const username = usernameInput.value;
        const password = passwordInput.value;
        if (!username || !password) {
            alert("请输入完整信息");
            return;
        }

        // 注册逻辑可以保持类似，如果注册成功也返回 token 并自动登录
        const response = await auth.register(username, password);

        if (response && response.success) {
            alert(response.message);
        } else {
            alert(response ? response.message : "注册失败");
        }
    }

    loginButton.addEventListener('click', loginHandler);
    signupButton.addEventListener('click', signupHandler);
});