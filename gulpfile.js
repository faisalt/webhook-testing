const gulp = require('gulp');



function deploy() {
  return gulp.src('index.html')
  .pipe(gulp.dest('/Applications/MAMP/htdocs/fef/'));
}



//Initial Build task
gulp.task('deploy', deploy);
