function fitStageIntoParentContainer() {
    const container = document.getElementById('container');

    // Make the container take up the full available size
    container.style.width = '100%';
    container.style.height = '100%';

    // Get current container dimensions
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // Calculate scale to fit both width and height (preserve aspect ratio)
    const scaleX = containerWidth / sceneWidth;
    const scaleY = containerHeight / sceneHeight;
    const scale = Math.min(scaleX, scaleY); // maintain aspect ratio

    // Set new size and scale
    stage.width(sceneWidth * scale);
    stage.height(sceneHeight * scale);
    stage.scale({x: scale, y: scale});
}

function createStage() {
    return new Konva.Stage({
        container: 'container',
        width: sceneWidth,
        height: sceneHeight,
    });
}
