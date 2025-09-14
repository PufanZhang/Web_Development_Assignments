import { achievements, gameState } from './modules/dataManager.js';

const endingContext = [
    "结局一 长空孤影\n" +
    "\n" +
    "        虽然你还是一头雾水，但是黑影不再给你说话的机会，\n" +
    "        而是果断地启动了她之前在你的战舰上植入的病毒——\n" +
    "        你突然被送入救生飞艇，从战舰中弹了出去，\n" +
    "        眼看着那个神秘的黑影驾驶着自己的飞船冲向毁灭。\n" +
    "        随着巨大的闪光，你看到敌人的防护罩真的开始塌缩了，\n" +
    "        无线电频道里刘小星也兴奋地汇报她成功追踪到了敌人的宇宙坐标。\n" +
    "        大家趁这个机会，把所有火力都集中到了传送门上，\n" +
    "        终于在大部队抵达之前摧毁了这扇危险的传送门。\n" +
    "        而行星发动机的及时启动，“火山行动”取得了圆满的成功，人类和智械的战局得到了根本的改变，\n" +
    "        人类不再处在被单方面威慑的被动情形，而是终于能势均力敌，在战争中打出一片局面了。\n" +
    "\n" +
    "        多年以后，你又回到了曾经的训练基地。\n" +
    "        这时曾经的元老陶晓光和老队长李海峰都因间谍罪锒铛入狱，你成为了新的教官迎接了新一届的学员。\n" +
    "        夕阳映红了猎猎的旌旗，新编入“黑影连”的飞行员们列队整齐的行进。\n" +
    "        他们肩负着无名神秘英雄的荣誉，即将振翅翱翔在前辈死别的长空。\n" +
    "        （完）",
    "结局二  与我仰春\n" +
    "\n" +
    "        “帮我种下一百朵红掌花，都种在朝阳的方向。”\n" +
    "        这句话如同最后一把钥匙，终于打开了你那尘封已久的记忆闸门。\n" +
    "        那在你心中周旋已久的轮廓，也终于浮出了她的面容——而这一切都要从冰川行动说起。\n" +
    "        原来，为众人所知的“冰川行动”，本身就是一个巨大的阴谋。\n" +
    "        你终于想起了当年参与“冰川行动”的全体成员，而刘小星亦在其中。\n" +
    "        你们特战队员进入冰川号飞船后，立刻被智械所捕获，成为了他们的实验样本。\n" +
    "        在那几年中，智械用你们的身体不停的做实验，意图将人类作为自己时空穿梭的载体。\n" +
    "        在那些艰难痛苦的日子中，是小星和你一起患难与共，你们逐渐把彼此视为家人，视为最珍视的人。\n" +
    "        你和小星每天彼此鼓劲，一同谋划逃出生天：你为她编制了海螺发带，她一次次鼓励你逃跑、反抗。\n" +
    "\n" +
    "        最后，在你们所有成员的共同谋划下，“冰川号”被成功爆破，你们本想乘坐逃生飞艇撤退回地球。\n" +
    "        但在临走时被智械发现，李海峰被智械进行了思维控制，送回地球成为了安插在人类中的卧底。\n" +
    "        刘小星牺牲自己将你推入救生舱，自己被智械带走去到了神秘的地方。\n" +
    "        “冰川号”爆炸时放出了七彩的光，这种光一瞬间内清除掉了所有人的记忆，脑中只剩下那耀眼的光……\n" +
    "        ——原来，那副黑影面具下的面容，正是多年后小星的模样！\n" +
    "        你还清晰地记得，在“冰川号”她把你推入逃生飞船的时候，\n" +
    "        说的也是这句“帮我种下一百朵红掌花，都种在朝阳的方向。”",
    "结局三 疑窦未消\n" +
    "\n" +
    "        虽然你还是一头雾水，但是黑影不再给你说话的机会，\n" +
    "        而是果断地启动了她之前在你的战舰上植入的病毒。\n" +
    "        “peng——”随着一声巨响，黑影自己从战舰中弹了出去。\n" +
    "\n" +
    "        【黑影】怎么会是我弹出来！哦天哪！是你解开绳索太快了，\n" +
    "        弹出程序还没来得及正确植入！不！唐梓，这一次，我还是没能救下你吗……\n" +
    "\n" +
    "        黑影的话被轰隆的引擎声掩盖，你听的不是很真切。\n" +
    "        但是你知道现在的重中之重是去传送门阻止智械的入侵。\n" +
    "        于是你驾驶战机向传送门冲过去，将黑影事先植入的病毒程序对接上，\n" +
    "        果然，防护罩逐渐消失，你立刻弹出，要在传送门上安装坐标探测器。\n" +
    "\n" +
    "        就在你安装完探测器不久，突然传送门发光，把你吸了进去，你随即昏迷。\n" +
    "        过了很久，你睁开眼睛，发现自己身处一个非常陌生的地方，\n" +
    "        身边全都是智械，你知道自己被敌人抓捕了。\n" +
    "        突然，你听到一个熟悉的声音“欢迎来到我们的世界。”\n" +
    "        你转过头，是两副熟悉的面孔——李海峰和陶晓光赫然出现在你面前。\n" +
    "        （完）"
];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem("jwt_token");

    if (!token) {
        alert("登录状态已过期，请重新登录。");
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }
    const playerData = await gameState.loadPlayerData();
    if (!playerData) {
        alert("无法恢复玩家会话，请重新登录。");
        window.location.href = 'login.html';
    }
    console.log("【achievement.js】: 玩家状态已恢复。欢迎回来, ", playerData.username);

    try {
        const endingId = window.playerDataCache.address.map;
        const endingIndex = parseInt(endingId.slice(-1)) - 1;

        if (endingIndex >= 0 && endingIndex < endingContext.length) {
            const endingText = endingContext[endingIndex];

            // 将结局文本中的换行符\n替换为HTML的<br>标签，并用<p>标签包裹
            const endingHtml = `<p>${endingText.replace(/\n/g, '<br>')}</p>`;

            // 找到标题元素，将结局文本插入到其后
            const titleElement = document.querySelector('.credits h1');
            if (titleElement) {
                titleElement.insertAdjacentHTML('afterend', endingHtml);
            } else {
                console.error("未找到用于插入结局文本的标题元素！");
            }
        } else {
            console.error("无效的结局ID: ", endingId);
        }
    } catch (e) {
        console.error("加载结局文本时出错: ", e);
    }

    const statsElement = document.querySelector('.stats');
    if (!statsElement) {
        console.error("未找到显示统计数据的元素！");
        return;
    }

    statsElement.textContent = '统计数据正在努力加载中...';

    try {
        const [formattedTime, achievementCounts] = await Promise.all([
            gameState.getFormattedPlaytime(),
            achievements.getCategoryCompletionCounts()
        ]);

        // 获取 memory 和 character 分类的完成数量，如果数据不存在就默认为 0
        const memoryCompleted = achievementCounts.memory || 0;
        const characterCompleted = achievementCounts.character || 0;
        const suspicionValue = gameState.getValue('suspicion');

        const line1 = `游戏时间：${formattedTime}　解锁人物数量：${characterCompleted}/4`;
        const line2 = `已收集记忆碎片：${memoryCompleted}/6　怀疑度最终值：${suspicionValue}%`;
        statsElement.innerHTML = `${line1}<br>${line2}`;
    } catch (error) {
        console.error("加载统计数据时发生错误:", error);
        statsElement.textContent = '统计数据加载失败 T_T';
    }
});

document.addEventListener('keydown', () => {
    window.location.href = 'index.html';
});

function logout() {
    const token = localStorage.getItem('jwt_token');
    if (token) {
        const data = {
            token: token,
            playerData: window.playerDataCache
        };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon('/api/player/logout', blob);
    }
}

window.addEventListener('beforeunload', logout);