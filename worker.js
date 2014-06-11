var path = require("path");
var fs = require("fs");
var _ = require("lodash");
var fsTools = require("fs-tools");
var crypto = require("crypto");
var yaml = require("js-yaml");



var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
var charlen = chars.length;


function uid (length){
  if(!length) length = 32;
  var index, i, buf = crypto.randomBytes(length);
  var result = [];
  for(i = 0; i < length; i ++){
    index = (buf.readUInt8(i) % charlen);
    result.push(chars[index]);
  }
  return result.join('');
}

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

function buildAppYml(appYmlTemplate, context, callback){
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
  if((appYmlTemplate || "").trim().length > 0){
    var text;
    context.comment("Building app.yml from template");
    try{
      text = _.template(appYmlTemplate, {env: env});
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

function buildKeysYml(config, context, callback){
  if(!config.createKeysYml){
    return callback();
  }
  var keyFile = path.join(context.dataDir, "config", "keys.yml");
  if(fs.existsSync(keyFile)){
    context.comment("File keys.yml is exists already. Do nothing.");
    return callback();
  }
  context.comment("Generating keys.yml.");
  var keys = {
    cookie: [uid(), uid(), uid(), uid(), uid()],
    pepper: uid()
  };
  fs.writeFile(keyFile, yaml.safeDump(keys), callback);
}


module.exports = {
  init: function (config, context, done) {
    var config = config || {};
    var prepare = runCommand("prepare");
    var deploy = runCommand("deploy");
    done(null, {
      environment: runCommand("environment"),
      prepare: function(context, done){
        fsTools.remove(path.join(context.dataDir, "node_modules"), function(){
          buildAppYml(config.appYmlTemplate, context, function(err){
            if(err){
              return done(err);
            }
            buildKeysYml(config, context, function(err){
              if(err){
                return done(err);
              }
              prepare(context, done);
            });
          });
        });
      },
      test: runCommand("test"),
      deploy: function(context, done){
        fs.unlink(path.join(context.dataDir, "config", "keys.yml"), function(){
          buildAppYml(config.deploySameAppYml?config.appYmlTemplate:config.deploymentAppYmlTemplate, context, function(err){
            if(err){
              return done(err);
            }
            buildKeysYml(config, context, function(err){
              if(err){
                return done(err);
              }
              deploy(context, done);
            });
          });
        });
      },
      cleanup: runCommand("cleanup")
    })
  }
}
