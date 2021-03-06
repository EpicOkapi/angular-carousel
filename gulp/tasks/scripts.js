var gulp = require('gulp'),
    conf = require('../config');

gulp.task('scripts', ['jshint'], function(){

    return gulp.src(conf.paths.scripts)
        //Build the regular version
        .pipe($.concat(conf.paths.filename + '.js'))
        .pipe($.ngAnnotate())
        .pipe($.header(conf.banner, { pkg: conf.pkg }))

        //Save the regular version
        .pipe(gulp.dest(conf.paths.dist))

        //Build the uglified version
        .pipe($.uglify())

        //Save the uglified version
        .pipe($.rename(conf.paths.filename + '.min.js'))
        .pipe(gulp.dest(conf.paths.dist));
});
