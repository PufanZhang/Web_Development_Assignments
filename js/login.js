import { auth } from './modules/dataManager.js';

document.addEventListener('DOMContentLoaded', () => {

    const loginButton = document.getElementById("login");
    const signupButton = document.getElementById("signup");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const handleResponse = (response, action) => {
        alert(response.message);
        if (response.success) {
            if (action === 'signup') {
                usernameInput.value = "";
                passwordInput.value = "";
            } else if (action === 'login') {
                // 登录成功，跳转到游戏世界！
                window.location.href = 'game.html';
            }
        }
    };

    async function loginHandler() {
        const username = usernameInput.value;
        const password = passwordInput.value;
        if (!username || !password) {
            alert("请输入完整信息");
            return;
        }
        const response = await auth.login(username, password);
        handleResponse(response, 'login'); // 传入动作类型
    }

    async function signupHandler() {
        const username = usernameInput.value;
        const password = passwordInput.value;
        if (!username || !password) {
            alert("请输入完整信息");
            return;
        }
        const response = await auth.register(username, password);
        handleResponse(response, 'signup'); // 传入动作类型
    }

    loginButton.addEventListener('click', loginHandler);
    signupButton.addEventListener('click', signupHandler);
});