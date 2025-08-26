login=document.getElementById("login");
signup=document.getElementById("signup");

//检查用户名是否已被占用 没被占用返回true 否则返回false
function isUserExisted(name){
    const storedData=localStorage.getItem(name+"@login");
    return storedData==null;
}

function addUser(){
    //获取用户键入的值
    const username=document.getElementById("username").value;
    const password=document.getElementById("password").value;
    let data={address:"",v1:0,achievements:"",tools:""};
    if(!(username&&password)){
        alert("请输入完整信息");
        return;
    }
    if(isUserExisted(username)){
        localStorage.setItem(username+"@login",password);
        localStorage.setItem(username+"@data",JSON.stringify(data));
        document.getElementById("username").value="";
        document.getElementById("password").value="";
        alert("用户注册成功");
    }
    else{
        alert("该用户名已被占用");
    }
}

//检查用户名和密码是否相一致
function checkUser(){
    const username=document.getElementById("username").value;
    const password=document.getElementById("password").value;
    const storedPassword=localStorage.getItem(username+"@login");
    let flag=false;
    if(!(username&&password)){
        alert("请输入完整信息");
        return;
    }
    if(isUserExisted(username)){
        alert("该用户不存在");
        return;
    }
    else flag=(storedPassword==password);
    if(flag){
        localStorage.setItem("user",username);
        alert("登录成功");
    }
    else alert("密码错误");
    return flag;
}

function init(){
    if(localStorage.getItem("user")==null) localStorage.setItem("user","default");
}

document.addEventListener('DOMContentLoaded',init);
login.addEventListener('click',checkUser);
signup.addEventListener('click',addUser);