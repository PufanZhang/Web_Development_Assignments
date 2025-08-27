const mapView = document.getElementById('map-view');

// 清理旧地图的函数
export function clearMap() {
    const mapElements = mapView.querySelectorAll('.map-element');
    mapElements.forEach(el => el.remove());
}

// 建造新地图的函数
export function buildMap(mapData) {
    const interactableObjects = [];
    const portals = [];
    const walls = mapData.walls || [];

    const createElement = (data, type) => {
        const element = document.createElement('div');
        element.id = data.id;
        // 统一添加map-element类名，并根据类型添加特定类名
        element.className = `map-element ${type}`;
        element.style.cssText = `
            left: ${data.x}px; top: ${data.y}px;
            width: ${data.width}px; height: ${data.height}px;
            background-image: url(${data.image || ''});
        `;
        mapView.appendChild(element);
        return element;
    };

    (mapData.objects || []).forEach(data => {
        const element = createElement(data, 'interactable-object');
        interactableObjects.push({ ...data, element, interacted: false });
    });

    (mapData.portals || []).forEach(data => {
        const element = createElement(data, 'portal');
        // 传送门也算是一种可交互物，但我们分开处理
        portals.push({ ...data, element });
    });

    // （调试用）绘制墙体
    walls.forEach(data => {
        const wallElement = document.createElement('div');
        wallElement.className = 'map-element wall';
        wallElement.style.cssText = `
            left: ${data.x}px; top: ${data.y}px;
            width: ${data.width}px; height: ${data.height}px;
        `;
        mapView.appendChild(wallElement);
    });

    return { interactableObjects, portals, walls };
}