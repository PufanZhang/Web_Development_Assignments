document.addEventListener('DOMContentLoaded', () => {

    const loginButton = document.getElementById("login");
    const signupButton = document.getElementById("signup");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    // --- 安全的哈希函数 ---
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        // 将计算出的哈希值转换为16进制字符串，方便存储
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function isUsernameAvailable(name) {
        const storedData = localStorage.getItem(name + "@login");
        return storedData == null;
    }

    // --- 注册逻辑 ---
    async function addUser() {
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!(username && password)) {
            alert("请输入完整信息");
            return;
        }

        if (isUsernameAvailable(username)) {
            // 不再存储明文密码，而是存储哈希值
            const hashedPassword = await hashPassword(password);
            localStorage.setItem(username + "@login", hashedPassword);

            const data = { address: "", v1: 0, achievements: "", tools: "" };
            localStorage.setItem(username + "@data", JSON.stringify(data));

            usernameInput.value = "";
            passwordInput.value = "";
            alert("用户注册成功");
        } else {
            alert("该用户名已被占用");
        }
    }

    // --- 登录逻辑 ---
    async function checkUser() {
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!(username && password)) {
            alert("请输入完整信息");
            return;
        }

        if (isUsernameAvailable(username)) {
            alert("该用户不存在");
            return;
        }

        const storedHash = localStorage.getItem(username + "@login");
        // 将用户输入的密码哈希后，再与存储的哈希值进行比对（更安全）
        const inputHash = await hashPassword(password);

        if (storedHash === inputHash) {
            localStorage.setItem("user", username);
            alert("登录成功！");
            window.location.href = 'index.html';
        } else {
            alert("密码错误");
        }
    }

    loginButton.addEventListener('click', checkUser);
    signupButton.addEventListener('click', addUser);
});