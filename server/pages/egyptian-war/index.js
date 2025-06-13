// Define virtual size for our scene
// The real size will be different to fit user's page
const sceneWidth = 1000;
const sceneHeight = 1000;

// Create stage and background layer
const stage = createStage();
stage.container().style.backgroundColor = "#e86e2d"

const drawLayer = new Konva.Layer();
stage.add(drawLayer);

// Title text
const text = new Konva.Text({x: stage.width() / 2, y: stage.height() / 2 - stage.height() * 0.2, text: 'EGYPTIAN WAR', fontSize: 40, fontFamily: 'Times New Roman', fill: 'black'});
drawLayer.add(text);

// display name input
const nameInput = new Konva.Text({x: stage.width() / 2, y: stage.height() / 2, text: "What should we call you?", fontSize: 18, fontFamily: "Times New Roman"})
drawLayer.add(nameInput);
const nameInputHandler = createInputHandler({
    x: stage.width() / 2 - 100,
    y: stage.height() / 2,
    defaultText: 'Enter your name',
    width: 200,
    layer: drawLayer
});
console.log("name: " + nameInputHandler.getValue());


// Initial fit
fitStageIntoParentContainer(sceneHeight, stage);
// Adapt the stage on window resize
window.addEventListener('resize', ()=>fitStageIntoParentContainer(sceneHeight, stage));
