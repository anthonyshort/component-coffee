var coffeescript = require('coffee-script');
var path = require('path');
var fs = require('fs');

module.exports = function(builder) {
  builder.hook('before scripts', function(pkg, next) {

    // Get all the coffee files from the scripts list
    var coffee = pkg.conf.scripts.filter(function(file){
      return path.extname(file) === '.coffee';
    });

    // No scripts
    if( coffee.length === 0 ) return;

    coffee.forEach(function(file, i){
      fs.readFile(pkg.path(file), 'utf8', function(err, str){
        if(err) throw new Error(err.toString());
        var compiled = coffeescript.compile(str, { filename : file, bare: true });
        var filename = file.replace('.coffee', '.js');
        pkg.addFile('scripts', filename, compiled);
        pkg.removeFile('scripts', file);
        if(i === ( coffee.length - 1 )) next();
      });
    });

    // This is a bit of a hack because Component currently reloads
    // the conf from the file each time. When this gets fixed we can remove this
    builder.conf.scripts = builder.conf.scripts.map(function(file){
      return ( path.extname(file) === '.coffee' ) ? file.replace('.coffee', '.js') : file;
    });

  });
};