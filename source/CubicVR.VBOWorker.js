importScripts('CubicVR.BaseWorker.js');

CubicVR.registerModule('VBOWorker', function(base){

  var VBOWorker = base.extendClassGeneral(base.BaseWorker,
    function() {
      this.log('VBOWorker Starting');
    },
    {

    });

  base.waitForInit(function(){
    var worker = new VBOWorker();
  });

  return VBOWorker;

});