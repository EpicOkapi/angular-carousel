var gulp = require('gulp'),
    conf = require('../config');

gulp.task('styles', function(){

    return gulp.src(conf.paths.styles)
        .pipe($.header(conf.banner, { pkg: conf.pkg }))
        .pipe($.autoprefixer({
            browsers: ['last 2 version', 'ie 9']
        }))

        //Build regular version
        .pipe($.sass({
            errLogToConsole: true
        }))
        .on('error', $.sass.logError)
        .pipe(gulp.dest(conf.paths.dist))

        //Build minified version
        .pipe($.sass({
            errLogToConsole: true,
            outputStyle: 'compressed'
        }))
        .on('error', $.sass.logError)

        .pipe($.rename(conf.paths.filename + '.min.css'))
        .pipe(gulp.dest(conf.paths.dist));
});
