/**
 * Creates an interactive input field using Konva
 * @param {Object} options - Configuration options
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {string} options.defaultText - Default text to display
 * @param {number} options.width - Width of input field
 * @param {Konva.Layer} options.layer - Layer to add the input to
 * @returns {Object} Input field components and getValue function
 */
function createInputHandler({ x, y, defaultText = 'Enter your name', width = 200, layer }) {
    const input = new Konva.Text({
        x: x,
        y: y,
        text: defaultText,
        fontSize: 18,
        fontFamily: 'Arial',
        fill: 'black',
        width: width,
        padding: 10,
        align: 'center'
    });

    const inputBackground = new Konva.Rect({
        x: x,
        y: y,
        width: width,
        height: input.height(),
        fill: 'white',
        stroke: 'black',
        strokeWidth: 1
    });

    let isEditing = false;

    inputBackground.on('click', () => {
        if (!isEditing) {
            isEditing = true;
            const textarea = document.createElement('textarea');
            textarea.style.position = 'absolute';
            textarea.style.top = input.absolutePosition().y + 'px';
            textarea.style.left = input.absolutePosition().x + 'px';
            textarea.style.width = input.width() + 'px';
            textarea.style.height = input.height() + 'px';
            textarea.style.fontSize = input.fontSize() + 'px';
            textarea.style.border = 'none';
            textarea.style.padding = '10px';
            textarea.style.margin = '0px';
            textarea.style.overflow = 'hidden';
            textarea.style.background = 'white';
            textarea.value = input.text() === defaultText ? '' : input.text();
            
            document.body.appendChild(textarea);
            textarea.focus();

            textarea.addEventListener('blur', function() {
                input.text(textarea.value || defaultText);
                document.body.removeChild(textarea);
                isEditing = false;
                layer.draw();
            });
        }
    });

    // Add elements to the layer
    layer.add(inputBackground);
    layer.add(input);
    layer.draw();

    // Return object with components and getter
    return {
        input,
        background: inputBackground,
        getValue: () => input.text() === defaultText ? '' : input.text()
    };
}
