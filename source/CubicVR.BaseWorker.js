(function(global){

  function globalLogFunction(){
    global.postMessage({
      message: 'log',
      data: Array.prototype.slice.apply(arguments)
    });
  }

  var _base;

  var _listeners = {};
  
  var _modules = [];

  function onEvent(name, listener){
    if(!_listeners[name]){
      _listeners[name] = [];
    }
    _listeners[name].push(listener);
  }

  function offEvent(name, listener){
    var idx;
    var listeners = _listeners[name]
    if(listeners && listeners.length){
      idx = listeners.indexOf(listener);
      listeners.splice(idx, 1);
    }
  }

  function fireEvent(name, data){
    var listeners = _listeners[name];
    if(listeners){
      listeners = listeners.slice();
      while(listeners.length){
        listeners.pop()(data);
      }
    }
  }

  // class extension functions from http://www.lshift.net/blog/2006/08/03/subclassing-in-javascript-part-2
  function general_extend(superclass, constructor, prototype) {
    var withoutcon = function() {};
    withoutcon.prototype = superclass.prototype;
    constructor.prototype = new withoutcon();
    for (var k in prototype) {
      constructor.prototype[k] = prototype[k];
    }
    return constructor;
  }

  function extend(superclass, constructor_extend, prototype) {
    return general_extend(superclass, function() {
      superclass.apply(this);
      constructor_extend.apply(this, arguments);
    }, prototype);
  }

  _base = global.CubicVR = {
    registerModule: function(name, ctor){
      _modules.push({name: name, ctor: ctor});
    },

    extendClassGeneral: general_extend,

    extendClass: extend,

    waitForInit: function(callback){
      onEvent('start', callback);
    }
  };

  var BaseWorker = function(){

  };

  BaseWorker.prototype = {
    log: globalLogFunction,
    on: onEvent,
    off: offEvent,
    fire: fireEvent
  };

  global.addEventListener('message', function(e){
    var moduleName;
    var moduleCtor;
    if(e.message === 'init'){
      for(var i=0, l=_modules.length; i<l; ++i){
        moduleName = _modules[i].name;
        moduleCtor = _modules[i].ctor;
        _base[moduleName] = moduleCtor(_base);
      }
    }
  }, false);

}(this));