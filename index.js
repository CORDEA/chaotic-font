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

class FilteredGlyphs {
    constructor(filtered, remaining) {
        this.filtered = filtered;
        this.remaining = remaining;
    }
}

function filteredGlyphs(glyphs, filter) {
    const source = [];
    const remaining = [];
    for (let i = 0; i < glyphs.length; i++) {
        const c = glyphs.get(i);
        if (filter(c)) {
            source.push(c);
            continue;
        }
        remaining.push(c);
    }
    return new FilteredGlyphs(source, remaining);
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

function randomize(glyphs, filter) {
    const g = filteredGlyphs(glyphs, filter);
    const filtered = g.filtered;
    const indices = randomizedIndices(filtered.length);
    const result = [];
    const map = new GlyphMap();
    for (let i = 0; i < filtered.length; i++) {
        const c = filtered[i];
        const r = filtered[indices[i]];
        result.push(generateGlyph(c, r));
        map.set(c.name, r.name);
    }
    result.push(...g.remaining);
    return new RandomizedGlyphs(result, map);
}

function fix(glyphs, filter, char) {
    const g = filteredGlyphs(glyphs, filter);
    const filtered = g.filtered;
    const r = filtered[filtered.findIndex((v) => v.name === char)];
    const result = [];
    for (let i = 0; i < filtered.length; i++) {
        const c = filtered[i];
        result.push(generateGlyph(c, r));
    }
    result.push(...g.remaining);
    return result;
}

function generateGlyph(source, path) {
    return new Glyph({
        name: source.name,
        unicode: source.unicode,
        path: path.path,
        advanceWidth: path.advanceWidth
    });
}

function outputFont(source, glyphs) {
    const font = new Font({
        familyName: source.names.fontFamily.en,
        styleName: source.names.fontSubfamily.en,
        unitsPerEm: source.unitsPerEm,
        ascender: source.ascender,
        descender: source.descender,
        glyphs: glyphs
    });
    font.download();
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
        .command('natural <font>', 'Generate a font with randomized letters [a-zA-Z0-9]', function (yargs) {
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
    let filter;
    if (argv._.includes('random')) {
        filter = (_) => true;
    } else {
        filter = (u) => {
            const c = u.unicode;
            return 0x30 <= c && c <= 0x39 || 0x41 <= c && c <= 0x5a || 0x61 <= c && c <= 0x7a;
        };
    }
    if (argv.char) {
        const glyphs = fix(source.glyphs, filter, argv.char);
        outputFont(source, glyphs);
    } else {
        const glyphs = randomize(source.glyphs, filter);
        outputFont(source, glyphs.glyphs);
        const json = JSON.stringify(glyphs.map.forJson());
        await writeFile('glyphs.json', json);
    }
})();
