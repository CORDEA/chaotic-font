const {load, Font, Glyph} = require('opentype.js');
const {writeFile} = require('fs/promises');
const yargs = require('yargs');

class RandomizedGlyphs {
    constructor(glyphs, map) {
        this.glyphs = glyphs;
        this.map = map;
    }
}

class GlyphMap extends Map {
    forJson() {
        return {
            'glyphs': Array.from(this.entries()).map((e) => ({
                'from': e[0],
                'to': e[1]
            }))
        }
    }
}

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
    const map = new GlyphMap();
    for (let i = 0; i < glyphs.length; i++) {
        const source = glyphs.get(i);
        const r = glyphs.get(indices[i]);
        result.push(
            new Glyph({
                name: source.name,
                unicode: source.unicode,
                path: r.path,
                advanceWidth: r.advanceWidth
            })
        );
        map.set(source.name, r.name);
    }
    return new RandomizedGlyphs(result, map);
}

(async function () {
    const parser = yargs
        .usage('$0 <command> <font> [args]')
        .command('random <font>', 'Generate a randomized font', function (yargs) {
            return yargs
                .positional('font', {
                    type: 'string'
                });
        })
        .command('ascii <font>', 'Generate a font with randomized alphabet', function (yargs) {
            return yargs
                .option('char', {
                    alias: 'c'
                })
                .positional('font', {
                    type: 'string'
                });
        })
        .help();
    const argv = parser.argv;

    if (!argv.font) {
        parser.showHelp();
        return;
    }

    const source = await load(argv.font);
    if (argv._.includes('random')) {
        const glyphs = randomize(source.glyphs);
        const font = new Font({
            familyName: source.names.fontFamily.en,
            styleName: source.names.fontSubfamily.en,
            unitsPerEm: source.unitsPerEm,
            ascender: source.ascender,
            descender: source.descender,
            glyphs: glyphs.glyphs
        });
        font.download();
        const json = JSON.stringify(glyphs.map.forJson());
        await writeFile('glyphs.json', json);
    }
})();
