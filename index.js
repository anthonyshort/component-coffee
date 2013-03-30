var coffeescript = require('coffee-script');
var path = require('path');
var fs = require('fs');

function hook(pkg, next) {

  // Get all the coffee files from the scripts list
  var coffee = pkg.conf.scripts.filter(function(file){
    return path.extname(file) === '.coffee';
  });

  // No scripts
  if( coffee.length === 0 ) return;

  coffee.forEach(function(file, i){
    fs.readFile(path.resolve(file), 'utf8', function(err, str){
      if(err) throw new Error(err.toString());
      var compiled = coffeescript.compile(str, { filename : file, bare: true });
      var filename = file.replace('.coffee', '.js');
      pkg.addFile('scripts', filename, compiled);
      if(i === ( coffee.length - 1 )) next();
    });
  });

  // Remove all coffee files and replace with JS extension
  pkg.conf.scripts = pkg.conf.scripts.map(function(file){
    return ( path.extname(file) === '.coffee' ) ? file.replace('.coffee', '.js') : file;
  });

}

module.exports = function(builder) {
  builder.hook('before scripts', hook);
};