const {load} = require('opentype.js');

function randomize(glyphs) {
    const result = [];
    for (let i = 0; i < glyphs.length; i++) {
        const source = glyphs.get(i);
        result.push(source);
    }
    return result;
}

(async function () {
    const source = await load('font.ttf');
    const glyphs = randomize(source.glyphs);
})();