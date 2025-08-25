document.addEventListener('DOMContentLoaded', () => {
    // 获取元素
    const gameContainer = document.getElementById('game-container');
    const characterName = document.getElementById('character-name');
    const dialogueText = document.getElementById('dialogue-text');

    const gameState = {
        story: [],
        currentIndex: -1,
        currentScene: []
    };

    function render() {
        // 获取我们的新舞台
        const characterContainer = document.getElementById('character-container');

        if (gameState.currentIndex < 0 || gameState.currentIndex >= gameState.story.length) {
            if (gameState.currentIndex >= gameState.story.length) {
                dialogueText.innerText = '(故事结束)';
                characterContainer.innerHTML = ''; // 故事结束，清空舞台
            }
            return;
        }

        const currentDialogue = gameState.story[gameState.currentIndex];
        if (currentDialogue.scene) {
            gameState.currentScene = currentDialogue.scene;
        }

        // 更新对话框文字
        dialogueText.innerText = currentDialogue.dialogue;

        // 如果是旁白
        if (currentDialogue.speaker === '旁白') {
            characterName.style.display = 'none';
            // 旁白时，让所有角色都退场
            characterContainer.innerHTML = '';
        } else {
            // 是角色对话
            characterName.style.display = 'block';
            characterName.innerText = currentDialogue.speaker;

            // 智能地更新舞台上的角色
            const sceneCharacters = gameState.currentScene.map(c => c.id);
            const displayedCharacters = Array.from(characterContainer.children).map(img => img.dataset.characterId);

            // 退场：移除不在新场景中的角色
            displayedCharacters.forEach(id => {
                if (!sceneCharacters.includes(id)) {
                    characterContainer.querySelector(`[data-character-id="${id}"]`).remove();
                }
            });

            // 登场 & 更新状态：处理需要出现在场景中的角色
            gameState.currentScene.forEach(character => {
                let spriteImg = characterContainer.querySelector(`[data-character-id="${character.id}"]`);

                if (!spriteImg) {
                    spriteImg = document.createElement('img');
                    spriteImg.dataset.characterId = character.id;
                    spriteImg.src = character.sprite;
                    characterContainer.appendChild(spriteImg);
                }

                // 如果当前场景只有一个角色，则不添加变暗效果
                if (gameState.currentScene.length === 1) {
                    spriteImg.classList.remove('dimmed');
                } else {
                    if (character.id === currentDialogue.speaker) {
                        spriteImg.classList.remove('dimmed');
                    } else {
                        spriteImg.classList.add('dimmed');
                    }
                }
            });
        }
    }

    function advanceDialogue() {
        gameState.currentIndex++;
        render();
    }

    async function initializeGame() {
        try {
            const response = await fetch('data/story.json');
            if (!response.ok) throw new Error('Story file not found!');
            gameState.story = await response.json();
            advanceDialogue();
        } catch (error) {
            console.error("在准备故事时出错了: ", error);
        }
    }

    gameContainer.addEventListener('click', () => {
        if (gameState.currentIndex < gameState.story.length) {
            advanceDialogue();
        }
    });

    initializeGame();
});