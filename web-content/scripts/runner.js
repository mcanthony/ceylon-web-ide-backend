//"use strict";

if (document.domain != "localhost") {
    document.domain = "ceylon-lang.org";
}

var clprinted = false;

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function(prefix, position) {
        position = position || 0;
        return this.indexOf(prefix, position) === position;
    }
}

if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function(searchString, position) {
        var subjectString = this.toString();
        if (position === undefined || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}

var loc = window.parent.location;
var repo = "http://" + loc.host + "/modules";

var ceylonVersion = "1.2.0";
var ceylonLang = "ceylon/language/" + ceylonVersion + "/ceylon.language-" + ceylonVersion;
var runnerVersion = "1.0.0";
var runner = "com/redhat/ceylon/ide/client/runner/" + runnerVersion + "/com.redhat.ceylon.ide.client.runner-" + runnerVersion;

console.log(repo);

require.config({
    baseUrl: "",
    paths: {
        com: repo + "/com",
        ceylon: "http://modules.ceylon-lang.org/repo/1/ceylon"
    },
    waitSeconds: 15
});

require([ceylonLang, runner],
    function(clang, runner) {
        console && console.log("ceylon.language module loaded");
        for (x in runner) {
            window[x] = runner[x];
        }
        clang.$_process().write = function (txt) {
            clprinted=true;
            printOutput(txt.string);
        };
        clang.$_process().writeLine = function (txt) {
            clprinted=true;
            printOutputLine(txt.string);
        };
        console && console.log("ceylon.language::print() patched");
        var outputReady = window.parent.outputReady;
        if (outputReady) outputReady();
    }
);

function clearLangModOutputState() {
    clprinted = false;
}

function hasLangModOutput() {
    return clprinted;
}

// Take a string containing the translated code for a Ceylon 
// module, extracts the meta data and parses it to get at the 
// dependencies and then pre-loads those dependencies using 
// rewritten paths that RequireJS will understand. It will 
// then evaluate the actual sources and finally execute the 
// "func()" that was passed. Quite a bit of jumping through 
// hoops to get this all to work
function loadModuleAsString(src, func, err) {
    delete window.ex$;
    delete window._CTM$;
    delete window.$CCMM$;
    var lines = src.split("\n");
    var metadata = lines[1];
    try {
        globalEval(metadata);
    } catch (ex) {
        if (err) {
            err("parsing", ex);
        }
    }
    if (window.$CCMM$) {
        var deps = window.$CCMM$()["$mod-deps"];
        if (deps) {
            var newdeps = rewriteDependencies(deps);
            if (newdeps.length > 0) {
                require(newdeps, function() {
                    evalAndRun(src, func, err);
                }, function(error) {
                    if (err) {
                        err("require", error);
                    }
                });
                return;
            }
        }
    }
    evalAndRun(src, func, err);
}

function evalAndRun(src, func, err) {
    try {
        globalEval(src);
    } catch (ex) {
        if (err) {
            err("parsing", ex);
        }
    }
    try {
        if (func) {
            func();
        }
    } catch (ex) {
        err("running", ex);
    }
}

function globalEval(src) {
    if (window.execScript) {
        window.execScript(src);
        return;
    }
    var fn = function() {
        window.eval.call(window,src);
    };
    fn();
}

function rewriteDependencies(deps) {
    var newdeps = [];
    for (var i=0; i < deps.length; i++) {
        var newdep = rewriteDependency(deps[i]);
        if (!newdep.startsWith("ceylon/language/")) {
            newdeps.push(newdep);
        }
    }
    return newdeps;
}

function rewriteDependency(dep) {
    var p = dep.indexOf("/");
    var name = dep.substring(0, p);
    var version = dep.substring(p + 1);
    var path = name.replace(".", "/");
    return path + "/" + version + "/" + name + "-" + version;
}

function openCanvasWindow() {
    return window.parent.openCanvasWindow();
}

function setOnStop(func) {
    window.parent.setOnStop(func);
}
