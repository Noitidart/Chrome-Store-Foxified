const fs = require('fs');
const path = require('path');

// http://stackoverflow.com/a/32197381/1828637
function deleteFolderRecursive(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}

function writeFile(path, text) {
  ensureDirectoryExistence(path);
  fs.writeFileSync(path, text);
}

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}

module.exports = {
    deleteFolderRecursive: deleteFolderRecursive,
    writeFile: writeFile,
    readFile: readFile
};