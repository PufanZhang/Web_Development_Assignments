const mapView = document.getElementById('map-view');

// 清理旧地图的函数
export function clearMap() {
    const mapElements = mapView.querySelectorAll('.map-element');
    mapElements.forEach(el => el.remove());
}

// 建造新地图的函数
export function buildMap(mapData) {
    console.log('Building map with data:', mapData);
    const width = mapData.width || 800;
    const height = mapData.height || 600;
    mapView.style.width = `${width}px`;
    mapView.style.height = `${height}px`;
    const interactableObjects = [];
    const walls = mapData.walls || [];
    const wallThickness = 10;
    // 自动添加边界墙
    walls.push({ x: 0, y: -wallThickness, width: width, height: wallThickness });
    walls.push({ x: 0, y: height, width: width, height: wallThickness });
    walls.push({ x: -wallThickness, y: 0, width: wallThickness, height: height });
    walls.push({ x: width, y: 0, width: wallThickness, height: height });

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
    console.log(`walls:${walls}`);
    (mapData.walls || []).forEach(data => {
        const wallElement = document.createElement('div');
        wallElement.className = 'map-element wall';
        wallElement.style.left = `${data.x}px`;
        wallElement.style.top = `${data.y}px`;
        wallElement.style.width = `${data.width}px`;
        wallElement.style.height = `${data.height}px`;
        mapView.appendChild(wallElement);
    });

    return { interactableObjects, walls, width, height };
}