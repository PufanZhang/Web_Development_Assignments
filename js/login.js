import { auth } from './modules/dataManager.js';

document.addEventListener('DOMContentLoaded', () => {

    const loginButton = document.getElementById("login");
    const signupButton = document.getElementById("signup");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const handleResponse = (response) => {
        alert(response.message);
        if (response.success && response.message.includes("注册")) {
            usernameInput.value = "";
            passwordInput.value = "";
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
        handleResponse(response);
    }

    async function signupHandler() {
        const username = usernameInput.value;
        const password = passwordInput.value;
        if (!username || !password) {
            alert("请输入完整信息");
            return;
        }
        const response = await auth.register(username, password);
        handleResponse(response);
    }

    loginButton.addEventListener('click', loginHandler);
    signupButton.addEventListener('click', signupHandler);
});