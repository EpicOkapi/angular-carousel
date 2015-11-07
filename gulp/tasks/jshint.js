var gulp = require('gulp'),
    conf = require('../config');

gulp.task('jshint', function(){
    return gulp.src(conf.paths.scripts)
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'));
});
