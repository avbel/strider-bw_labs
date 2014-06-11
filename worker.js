var path = require("path");
var fs = require("fs");
var _ = require("lodash");
var fsTools = require("fs-tools");


function runCommand(command) {
  return function(context, done){
    var file = path.join(context.dataDir, ".build", command);
    fs.exists(file, function(exists){
      if(exists){
        context.comment("Executing custom script " + command);
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

function buildAppYml(config, context, callback){
  var configFile = path.join(context.dataDir, "config", "app.yml");
  var branch = (context.job.project.branches.filter(function(b){ return b.name == context.job.ref.branch;}))[0];
  var k, env = _.clone(process.env);
  if(branch){
    (branch.plugins || []).filter(function(p){ return p.id == "env";}).forEach(function(p){
       for(k in p.config){
          env[k] = p.config[k];
       }
    });
  }
  if((config.appYmlTemplate || "").trim().length > 0){
    var text;
    context.comment("Building app.yml from template");
    try{
      text = _.template(config.appYmlTemplate, {env: env});
    }
    catch(err){
      return callback(err);
    }
    fs.writeFile(configFile, text, callback);
  }
  else{
    if(fs.existsSync(configFile + ".sample") && !fs.existsSync(configFile)){
      context.comment("Creating app.yml from existing file app.yml.sample");
      return fsTools.copy(configFile + ".sample", configFile, callback);
    }
    callback();
  }
}


module.exports = {
  init: function (config, context, done) {
    var config = config || {};
    var prepare = runCommand("prepare");
    done(null, {
      environment: runCommand("environment"),
      prepare: function(context, done){
        fsTools.remove(path.join(context.dataDir, "node_modules"), function(){
          buildAppYml(config, context, function(err){
            if(err){
              return done(err);
            }
            prepare(context, done);
          });
        });
      },
      test: runCommand("test"),
      deploy: runCommand("deploy"),
      cleanup: runCommand("cleanup")
    })
  }
}
