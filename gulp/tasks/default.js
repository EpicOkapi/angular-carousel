var gulp = require('gulp'),
    conf = require('../config');

gulp.task('default', ['build'], function(){
    $.watch(conf.paths.scripts, function(){
        gulp.start('scripts');
    });

    $.watch(conf.paths.styles, function(){
        gulp.start('styles');
    });
});
