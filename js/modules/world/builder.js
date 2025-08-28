const mapView = document.getElementById('map-view');

// 清理旧地图的函数
export function clearMap() {
    const mapElements = mapView.querySelectorAll('.map-element');
    mapElements.forEach(el => el.remove());
}

// 建造新地图的函数
export function buildMap(mapData) {
    const interactableObjects = [];
    const walls = mapData.walls || [];

    const createElement = (data, type) => {
        const element = document.createElement('div');
        element.id = data.id;
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

    // （调试用）绘制墙体
    walls.forEach(data => {
        const wallElement = document.createElement('div');
        wallElement.className = 'map-element wall';
        wallElement.style.cssText = `
            left: ${data.x}px; top: ${data.y}px;
            width: ${data.width}px; height: ${data.height}px;
            background-color: rgba(255, 0, 0, 0.3);
        `;
        mapView.appendChild(wallElement);
    });

    return { interactableObjects, walls };
}