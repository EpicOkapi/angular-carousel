var args = require('yargs').argv;

var src = './src',
    dist = './dist';

exports.paths = {
    src: src,
    dist: dist,
    scripts: [
        src + '/**/*.js'
    ],
    styles: [
        src + '/css/**/*.scss'
    ],
    filename: 'angular-carousel'
};

exports.pkg = require('../package.json');

exports.banner = [
    '/**',
    ' * <%= pkg.name %>',
    ' * @description <%= pkg.description %>',
    ' * @version v<%= pkg.version %>',
    ' * @link <%= pkg.homepage %>',
    ' * @author <%= pkg.author %>',
    ' * @license <%= pkg.license %>',
    ' * @build <%= new Date() %>',
    ' */',
    ''
].join('\n');
