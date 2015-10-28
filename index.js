var coffeescript = require('coffee-script');
var path = require('path');
var fs = require('fs');
var calculate = require('sse4_crc32').calculate;
var mkdirp = require("mkdirp");
var glob = require("glob");
var getDirName = require("path").dirname;
var debug = require('debug')('http');
var btoa = require('btoa');

var devFlag = false;
var cacheDirPath = process.cwd() + '/.cache';

function writeFile(path, contents, cb) {
    /*
        Create:
        - whole path for the file
        - write file
    */
    mkdirp(getDirName(path), function(err) {
        if (err) return cb(err);
        fs.writeFile(path, contents, cb);
    });
}

function clearCache(path) {
    /*
    Remove the cache from the changed file
    */
    var fileMatch = cacheDirPath + path + '*';
    try{
        debug('Removing files:', fileMatch);
        glob(fileMatch, [], function(er, files) {
            for (var i = 0; i < files.length; i++) {
                fs.unlink(files[i]);
                debug('unlinking:', files[i]);
            }
        });
    } catch(err){
        console.error('Something wen\'t sour. Please delete .cache-folder.', err);
    }
}


module.exports = function(builder) {
    builder.hook('before scripts', function(pkg, next) {
        var options = {
            bare: true
        };

        if (pkg.dev) {
            //For some reason dev-settings are not applied to all files.
            devFlag = true;
        }
        if (devFlag === true) {
            pkg.dev = devFlag;
            options.sourceMap = true;
        }

        // No scripts field in the component.json file
        if (pkg.config.scripts === undefined) return next();

        // Get all the coffee files from the scripts list
        var coffee = pkg.config.scripts.filter(function(file) {
            return path.extname(file) === '.coffee';
        });

        // No scripts
        if (coffee.length === 0) return next();

        coffee.forEach(function(file, i) {
            options.filename = pkg.path(file);

            var str = fs.readFileSync(options.filename, 'utf8');
            var hash = calculate(str);
            var hashFile = cacheDirPath + options.filename + '#' + hash + '.cache';
            var buildFile = cacheDirPath + options.filename + '.js.cache';
            var compiled = '';

            try {
                //See if the file has been compiled already
                // If yes, use the compiled content
                fs.openSync(hashFile, 'r');
                debug(hashFile, ' from cache');
                compiled = fs.readFileSync(buildFile, 'utf8');
            } catch (err) {
                //Else compile new content, create compiled cache-file and hash-file.
                console.log('Compiling: ', options.filename);    
                compiled = coffeescript.compile(str, options);
                if(compiled.v3SourceMap){
                    //Support for sourcemaps, whenever the doublicate content ticket is resolved
                    compiled =  compiled.js; // + "\n//# sourceMappingURL=data:application/json;base64," + (btoa(unescape(encodeURIComponent(compiled.v3SourceMap)))) + "\n//# sourceURL=coffeescript";
                }

                //Try to remove the cached files, if the hash does not comply
                clearCache(options.filename);
                debug('writing:', buildFile);
                writeFile(buildFile, compiled, 'utf8');
                writeFile(hashFile, '', 'utf8');
            }
            pkg.removeFile('scripts', file);
            pkg.addFile('scripts', file, compiled);
            // This duplicates the code in the built package, but needed to be able to require
            // modules without adding .coffee - a better solution is needed for production:
            pkg.addFile('scripts', file.replace('.coffee', '.js'), compiled);
        });

        next();
    });
};