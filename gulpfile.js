const through2 = require('through2');

var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var fs = require("fs");
var babelify = require("babelify");
var livereload = require("gulp-livereload");
var sass = require("gulp-sass")(require("sass"));
var sharp = require('sharp');

var handlebars = require("browserify-handlebars");

const merge = require('merge-stream');
var gm = require("gulp-gm");
var spritesmith = require('gulp.spritesmith');
var gulpif = require("gulp-if");
var argv = require("minimist")(process.argv.slice(2));
var rename = require("gulp-rename");

let imagemin;
async function loadImageMin() {
  const module = await import('gulp-imagemin');
  imagemin = module.default;
}


gulp.task('browserify', function (done) {
  browserify('./client/js/main.js', { standalone: "app", debug: true })
    .transform(handlebars).on("error", function (err) {
      console.log(err);
    })
    .transform(babelify)
    .bundle().on("error", function (err) {
      console.log(err);
    })
    .pipe(source('app.js').on("error", function (err) {
      console.log(err);
    }))
    .pipe(gulp.dest('./public/build/').on("error", function (err) {
      console.log(err);
    }))
    .on('end', done);
});


gulp.task('sass', function (done) {
  gulp.src('./client/scss/main.scss')
    .pipe(sass({
      outputStyle: 'compressed'
    }).on("error", function (err) {
      console.log(err);
    }))
    .pipe(gulp.dest('./public/build/').on("error", function (err) {
      console.log(err);
    }))
    .pipe(livereload().on("error", function (err) {
      console.log(err);
    }))
    .on('end', done);
});


gulp.task('unit tests', function (done) {
  browserify('./test/src/mainSpec.js', { standalone: 'app', debug: true })
    .transform(babelify)
    .bundle()
    .on('error', function (err) {
      console.log(err);
      this.emit('end');
    })
    .pipe(source('spec.js'))
    .on('error', function (err) {
      console.log(err);
    })
    .pipe(gulp.dest('./test/spec/'))
    .on('error', function (err) {
      console.log(err);
    })
    .on('end', done);
});


gulp.task("watch", function (done) {
  if (argv.production) {
    done();
    return;
  }
  gulp.watch("./client/js/*", gulp.series(["browserify"]));
  gulp.watch("./client/templates/*", gulp.series(["browserify"]));
  gulp.watch("./client/scss/*", gulp.series(["sass"]));
  gulp.watch("./client/*.html", gulp.series(["index"]));
  gulp.watch("./test/src/*", gulp.series(["unit tests"]));
  done();
});


gulp.task("index", function () {
  const indexHtml = gulp.src("./client/index.html")
    .pipe(gulp.dest("./public/"));

  const bootstrapCss = gulp.src("./client/css/bootstrap.css")
    .pipe(gulp.dest("./public/build"));

  return merge(indexHtml, bootstrapCss);
});

gulp.task('resize sm', function () {
  return loadImageMin().then(() => {
    if (fs.existsSync(__dirname + "/assets/cards/sm/monster/arachas1.png")) {
      console.log("skip generating sm images");
      return;
    }
    return gulp.src('./assets/original_cards/**/*.png')
      .pipe(gm(function (gmfile) {
        return gmfile.resize(null, 120);
      }))
      .pipe(imagemin())
      .pipe(gulp.dest('./assets/cards/sm/'));
  });
});

gulp.task('resize md', function () {
  return loadImageMin().then(() => {
    if (fs.existsSync(__dirname + "/assets/cards/md/monster/arachas1.png")) {
      console.log("skip generating md images");
      return;
    }
    return gulp.src('./assets/original_cards/**/*.png')
      .pipe(gm(function (gmfile) {
        return gmfile.resize(null, 284);
      }))
      .pipe(imagemin())
      .pipe(gulp.dest('./assets/cards/md/'));
  });
});

gulp.task('resize lg', function () {
  return loadImageMin().then(() => {
    if (fs.existsSync(__dirname + "/assets/cards/lg/monster/arachas1.png")) {
      console.log("skip generating lg images");
      return;
    }
    return gulp.src('./assets/original_cards/**/*.png')
      .pipe(gm(function (gmfile) {
        return gmfile.resize(null, 450);
      }))
      .pipe(imagemin())
      .pipe(gulp.dest('./assets/cards/lg/'));
  });
});

gulp.task("generate sprites", gulp.series("resize sm", "resize md", "resize lg", function () {
  if (fs.existsSync(__dirname + "/public/build/cards-lg-monster.png")) {
    console.log("skip sprite generation");
    return;
  }

  const sharpImages = new Promise((resolve, reject) => {
    gulp.src('./assets/cards/**/*.png')
      .pipe(through2.obj(function (file, _, cb) {
        if (file.isNull()) {
          return cb(null, file);
        }
        if (file.isStream()) {
          return cb(new PluginError('gulp-sharp', 'Streaming not supported'));
        }

        sharp(file.contents)
          .png({ compressionLevel: 9, adaptiveFiltering: true, force: true })
          .toBuffer()
          .then((data) => {
            file.contents = data;
            cb(null, file);
          })
          .catch((err) => {
            cb(new PluginError('gulp-sharp', err));
          });
      }))
      .pipe(rename({ extname: ".PNG" }))
      .pipe(gulp.dest('./temp_assets/cards/'))
      .on('end', resolve)
      .on('error', reject);
  });

  return sharpImages.then(() => {
    return gulp.src('./temp_assets/cards/**/*.PNG')
      .pipe(spritesmith({
        imgName: 'cards.png',
        cssName: 'cards.css',
        cssPath: '../../public/build/',
        padding: 0,
        cssOpts: {
          functions: false
        }
      }))
      .pipe(gulp.dest("./public/build/"));
  });
}));




gulp.task("default", gulp.series(["watch", "browserify", "sass", "unit tests", "index", "resize sm", "resize md", "resize lg", "generate sprites"], function (done) {
  done();
}));

