import { gameState } from './dataManager.js';

/**
 * 这是我们的“对话渲染画师”。
 * 它接收当前对话的状态和需要操作的舞台元素，然后将一切完美地绘制出来。
 * @param {object} dialogueState - 包含当前故事、索引和场景信息的对象。
 * @param {object} elements - 包含所有需要操作的DOM元素的对象。
 * @param {function} onOptionClick - 当选项被点击时调用的回调函数。
 */
export function renderDialogue(dialogueState, elements, onOptionClick) {
    const { characterContainer, characterName, dialogueText, dialogueOptionsContainer, itemImageContainer } = elements;
    const currentNode = dialogueState.story.nodes[dialogueState.currentNodeId];
    if (!currentNode) return;

    if (currentNode.displayImage) {
        itemImageContainer.innerHTML = `<img src="${currentNode.displayImage}" alt="Displayed Item">`;
        itemImageContainer.style.display = 'flex';
    } else {
        itemImageContainer.innerHTML = '';
        itemImageContainer.style.display = 'none';
    }

    dialogueText.innerText = currentNode.dialogue;
    if (currentNode.speaker === '旁白') {
        characterName.style.display = 'none';
        characterContainer.innerHTML = '';
    } else {
        characterName.style.display = 'block';
        characterName.innerText = currentNode.speaker;
        const scene = dialogueState.currentScene;
        const speakerId = currentNode.speaker;

        // 1. 清理舞台
        characterContainer.innerHTML = '';
        characterContainer.className = 'character-container';

        // 2. 根据场景人数应用不同布局
        if (scene.length === 1) {
            // 单人：直接添加，CSS默认居中
            const character = scene[0];
            const spriteImg = document.createElement('img');
            spriteImg.src = character.sprite;
            characterContainer.appendChild(spriteImg);

        } else if (scene.length === 2) {
            // 双人：添加 'two-characters' 类，CSS将它们分布在两侧
            characterContainer.classList.add('two-characters');
            scene.forEach(character => {
                const spriteImg = document.createElement('img');
                spriteImg.src = character.sprite;
                // 非说话者变暗
                spriteImg.classList.toggle('dimmed', character.id !== speakerId);
                characterContainer.appendChild(spriteImg);
            });

        } else if (scene.length > 2) {
            // 多人：添加 'multi-characters' 类，并创建左右分组
            characterContainer.classList.add('multi-characters');

            const speakerGroup = document.createElement('div');
            speakerGroup.className = 'speaker-group';

            const otherGroup = document.createElement('div');
            otherGroup.className = 'other-group';

            scene.forEach(character => {
                const spriteImg = document.createElement('img');
                spriteImg.src = character.sprite;

                if (character.id === speakerId) {
                    // 说话者放入左侧分组
                    speakerGroup.appendChild(spriteImg);
                } else {
                    // 其他人放入右侧分组并变暗
                    spriteImg.classList.add('dimmed');
                    otherGroup.appendChild(spriteImg);
                }
            });

            characterContainer.appendChild(speakerGroup);
            characterContainer.appendChild(otherGroup);
        }
    }

    // --- 渲染选项 ---
    dialogueOptionsContainer.innerHTML = ''; // 先清空旧选项
    if (currentNode.options) {
        currentNode.options.forEach(option => {
            // --- 条件检查 ---
            let shouldShow = true; // 默认显示
            if (option.requiredValue) {
                const { name, comparison, value } = option.requiredValue;
                const userValue = gameState.getValue(name);

                switch (comparison) {
                    case 'greaterOrEqual':
                        if (userValue < value) shouldShow = false;
                        break;
                    case 'greater':
                        if (userValue <= value) shouldShow = false;
                        break;
                    case 'lessOrEqual':
                        if (userValue > value) shouldShow = false;
                        break;
                    case 'less':
                        if (userValue >= value) shouldShow = false;
                        break;
                    case 'equal':
                        if (userValue !== value) shouldShow = false;
                        break;
                    case 'notEqual':
                        if (userValue === value) shouldShow = false;
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