var path = require("path");
var fs = require("fs");

function runCommand(command) {
  return function(context, done){
    var file = path.join(context.dataDir, ".build", command);
    fs.exists(file, function(exists){
      if(exists){
        context.cmd(file, function(exitCode){
          if(exitCode != 0){
            return done(new Error("Exit code " + exitCode));
          }
          done();
        });
      }
      else{
        done();
      }
    });
  };
}
module.exports = {
  init: function (config, context, done) {
    var config = config || {}
    done(null, {
      environment: runCommand("environment"),
      prepare: runCommand("prepare"),
      test: runCommand("test"),
      deploy: runCommand("deploy"),
      cleanup: runCommand("cleanup")
    })
  }
}
