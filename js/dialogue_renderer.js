import { gameState, getCurrentUser } from './modules/dataManager.js';

/**
 * 这是我们的“对话渲染画师”。
 * 它接收当前对话的状态和需要操作的舞台元素，然后将一切完美地绘制出来。
 * @param {object} dialogueState - 包含当前故事、索引和场景信息的对象。
 * @param {object} elements - 包含所有需要操作的DOM元素的对象。
 * @param {function} onOptionClick - 当选项被点击时调用的回调函数。
 */
export function renderDialogue(dialogueState, elements, onOptionClick) {
    const { characterContainer, characterName, dialogueText, dialogueOptionsContainer } = elements;
    const currentNode = dialogueState.story.nodes[dialogueState.currentNodeId];
    if (!currentNode) return;

    // --- 检查是否需要显示大图 ---
    if (currentNode.displayImage) {
        // --- 模式一：显示大图 ---
        // 1. 隐藏角色相关元素
        characterContainer.style.display = 'none';
        characterName.style.display = 'none';
        characterContainer.innerHTML = ''; // 清空立绘，避免残留

        // 2. 显示图片容器并设置图片
        dialogueImageContainer.innerHTML = ''; // 清空上一张图片
        const img = document.createElement('img');
        img.src = currentNode.displayImage;
        dialogueImageContainer.appendChild(img);
        dialogueImageContainer.style.display = 'block';

        // 3. 渲染对话文本和清空选项
        dialogueText.innerText = currentNode.dialogue || ''; // 如果没有对话，显示空字符串
        dialogueOptionsContainer.innerHTML = '';

    } else {
        // --- 模式二：显示常规对话 (角色立绘) ---
        // 1. 隐藏图片容器并显示角色容器
        dialogueImageContainer.style.display = 'none';
        dialogueImageContainer.innerHTML = ''; // 清空图片
        characterContainer.style.display = 'flex'; // 或者 'block'，取决于你的CSS设置

        // 2. 渲染对话和说话人
        dialogueText.innerText = currentNode.dialogue;
        if (currentNode.speaker === '旁白') {
            characterName.style.display = 'none';
            characterContainer.innerHTML = '';
        } else {
            characterName.style.display = 'block';
            characterName.innerText = currentNode.speaker;
            const sceneCharacters = dialogueState.currentScene.map(c => c.id);
            const displayedCharacters = Array.from(characterContainer.children).map(img => img.dataset.characterId);

            // 移除场景中已不存在的角色
            displayedCharacters.forEach(id => {
                if (!sceneCharacters.includes(id)) {
                    characterContainer.querySelector(`[data-character-id="${id}"]`).remove();
                }
            });

            // 添加或更新场景中的角色
            dialogueState.currentScene.forEach(character => {
                let spriteImg = characterContainer.querySelector(`[data-character-id="${character.id}"]`);
                if (!spriteImg) {
                    spriteImg = document.createElement('img');
                    spriteImg.dataset.characterId = character.id;
                    spriteImg.src = character.sprite;
                    characterContainer.appendChild(spriteImg);
                }
                // 根据是否是说话人，切换 'dimmed' 状态
                spriteImg.classList.toggle('dimmed', character.id !== currentNode.speaker);
            });
        }
    }

    // --- 渲染选项 ---
    dialogueOptionsContainer.innerHTML = ''; // 先清空旧选项
    if (currentNode.options) {
        const currentUser = getCurrentUser();
        currentNode.options.forEach(option => {
            // --- 条件检查 ---
            let shouldShow = true; // 默认显示
            if (option.requiredValue && currentUser) {
                const { name, comparison, value } = option.requiredValue;
                const userValue = gameState.getValue(currentUser, name);

                switch (comparison) {
                    case 'greaterOrEqual':
                        if (userValue < value) shouldShow = false;
                        break;
                    case 'lessOrEqual':
                        if (userValue > value) shouldShow = false;
                        break;
                    case 'equal':
                        if (userValue !== value) shouldShow = false;
                        break;
                }
            }

            // --- 如果满足条件，则创建并显示按钮 ---
            if (shouldShow) {
                const button = document.createElement('button');
                button.className = 'dialogue-option';
                button.innerText = option.text;
                button.onclick = () => onOptionClick(option.targetNode);
                dialogueOptionsContainer.appendChild(button);
            }
        });
    }
}