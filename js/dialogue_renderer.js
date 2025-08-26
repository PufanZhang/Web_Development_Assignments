/**
 * 这是我们的“对话渲染画师”。
 * 它接收当前对话的状态和需要操作的舞台元素，然后将一切完美地绘制出来。
 * @param {object} dialogueState - 包含当前故事、索引和场景信息的对象。
 * @param {object} elements - 包含所有需要操作的DOM元素的对象。
 */
export function renderDialogue(dialogueState, elements) {
    const { characterContainer, characterName, dialogueText } = elements;

    const currentLine = dialogueState.story[dialogueState.currentIndex];
    if (!currentLine) return; // 如果没有对话内容，则不进行任何操作

    // 更新对话框文字
    dialogueText.innerText = currentLine.dialogue;

    // 根据是否为旁白，决定角色名和立绘的显示
    if (currentLine.speaker === '旁白') {
        characterName.style.display = 'none';
        characterContainer.innerHTML = ''; // 旁白时清空立绘舞台
    } else {
        // 是角色对话
        characterName.style.display = 'block';
        characterName.innerText = currentLine.speaker;

        // --- 智能地更新舞台立绘 ---
        const sceneCharacters = dialogueState.currentScene.map(c => c.id);
        const displayedCharacters = Array.from(characterContainer.children).map(img => img.dataset.characterId);

        // 1. 退场：移除不在新场景中的角色
        displayedCharacters.forEach(id => {
            if (!sceneCharacters.includes(id)) {
                characterContainer.querySelector(`[data-character-id="${id}"]`).remove();
            }
        });

        // 2. 登场 & 更新状态：处理需要出现在场景中的角色
        dialogueState.currentScene.forEach(character => {
            let spriteImg = characterContainer.querySelector(`[data-character-id="${character.id}"]`);

            if (!spriteImg) {
                spriteImg = document.createElement('img');
                spriteImg.dataset.characterId = character.id;
                spriteImg.src = character.sprite;
                characterContainer.appendChild(spriteImg);
            }

            // 3. 聚光灯：单人场景或说话者高亮
            if (dialogueState.currentScene.length === 1) {
                spriteImg.classList.remove('dimmed');
            } else {
                spriteImg.classList.toggle('dimmed', character.id !== currentLine.speaker);
            }
        });
    }
}