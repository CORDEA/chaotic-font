const {load} = require('opentype.js');

function randomizedIndices(length) {
    const result = [];
    while (result.length < length) {
        const r = Math.floor(Math.random() * length);
        if (result.includes(r)) {
            continue;
        }
        result.push(r);
    }
    return result;
}

function randomize(glyphs) {
    const indices = randomizedIndices(glyphs.length);
    const result = [];
    for (let i = 0; i < glyphs.length; i++) {
        const source = glyphs.get(i);
        const r = glyphs.get(indices[i]);
        result.push(source);
    }
    return result;
}

(async function () {
    const source = await load('font.ttf');
    const glyphs = randomize(source.glyphs);
})();