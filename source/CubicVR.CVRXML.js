
CubicVR.RegisterModule("CVRXML",function(base) {
  
  var undef = base.undef;
  var nop = function(){ };
  var enums = CubicVR.enums;
  var GLCore = base.GLCore;

  var MeshPool = [];


  function cubicvr_isMotion(node) {
    if (node === null) {
      return false;
    }

    return (node.getElementsByTagName("x").length || node.getElementsByTagName("y").length || node.getElementsByTagName("z").length || node.getElementsByTagName("fov").length);
  }


  function cubicvr_nodeToMotion(node, controllerId, motion) {
    var util = CubicVR.util;
    var c = [];
    c[0] = node.getElementsByTagName("x");
    c[1] = node.getElementsByTagName("y");
    c[2] = node.getElementsByTagName("z");
    c[3] = node.getElementsByTagName("fov");

    var etime, evalue, ein, eout, etcb;

    for (var k in c) {
      if (c.hasOwnProperty(k)) {
        if (c[k] !== undef) {
          if (c[k].length) {
            etime = c[k][0].getElementsByTagName("time");
            evalue = c[k][0].getElementsByTagName("value");
            ein = c[k][0].getElementsByTagName("in");
            eout = c[k][0].getElementsByTagName("out");
            etcb = c[k][0].getElementsByTagName("tcb");

            var time = null,
              value = null,
              tcb = null;

            var intype = null,
              outtype = null;

            if (ein.length) {
              intype = util.collectTextNode(ein[0]);
            }

            if (eout.length) {
              outtype = util.collectTextNode(eout[0]);
            }

            if (etime.length) {
              time = util.floatDelimArray(util.collectTextNode(etime[0]), " ");
            }

            if (evalue.length) {
              value = util.floatDelimArray(util.collectTextNode(evalue[0]), " ");
            }

            if (etcb.length) {
              tcb = util.floatDelimArray(util.collectTextNode(etcb[0]), " ");
            }


            if (time !== null && value !== null) {
              for (var i = 0, iMax = time.length; i < iMax; i++) {
                var mkey = motion.setKey(controllerId, k, time[i], value[i]);

                if (tcb) {
                  mkey.tension = tcb[i * 3];
                  mkey.continuity = tcb[i * 3 + 1];
                  mkey.bias = tcb[i * 3 + 2];
                }
              }
            }

            var in_beh = enums.envelope.behavior.CONSTANT;
            var out_beh = enums.envelope.behavior.CONSTANT;

            if (intype) {
              switch (intype) {
              case "reset":
                in_beh = enums.envelope.behavior.RESET;
                break;
              case "constant":
                in_beh = enums.envelope.behavior.CONSTANT;
                break;
              case "repeat":
                in_beh = enums.envelope.behavior.REPEAT;
                break;
              case "oscillate":
                in_beh = enums.envelope.behavior.OSCILLATE;
                break;
              case "offset":
                in_beh = enums.envelope.behavior.OFFSET;
                break;
              case "linear":
                in_beh = enums.envelope.behavior.LINEAR;
                break;
              }
            }

            if (outtype) {
              switch (outtype) {
              case "reset":
                out_beh = enums.envelope.behavior.RESET;
                break;
              case "constant":
                out_beh = enums.envelope.behavior.CONSTANT;
                break;
              case "repeat":
                out_beh = enums.envelope.behavior.REPEAT;
                break;
              case "oscillate":
                out_beh = enums.envelope.behavior.OSCILLATE;
                break;
              case "offset":
                out_beh = enums.envelope.behavior.OFFSET;
                break;
              case "linear":
                out_beh = enums.envelope.behavior.LINEAR;
                break;
              }
            }

            motion.setBehavior(controllerId, k, in_beh, out_beh);
          }
        }
      }
    }
  }
  
  function cubicvr_addTrianglePart(obj, mat, uvSet, melem) {
      var util = CubicVR.util;
      var seglist = null;
      var triangles = null;

      if (melem.getElementsByTagName("triangles").length) {
        triangles = util.intDelimArray(util.collectTextNode(melem.getElementsByTagName("triangles")[0]), " ");
      }

      if (!triangles) return;

      if (melem.getElementsByTagName("segments").length) {
        seglist = util.intDelimArray(util.collectTextNode(melem.getElementsByTagName("segments")[0]), " ");
      }

      if (seglist === null) {
        seglist = [0, parseInt((triangles.length) / 3, 10)];
      }

      var ofs = 0;

      obj.setFaceMaterial(mat);

      if (triangles.length) {
        for (p = 0, pMax = seglist.length; p < pMax; p += 2) {
          var currentSegment = seglist[p];
          var totalPts = seglist[p + 1] * 3;

          obj.setSegment(currentSegment);

          for (j = ofs, jMax = ofs + totalPts; j < jMax; j += 3) {
            var newFace = obj.addFace([triangles[j], triangles[j + 1], triangles[j + 2]]);
            if (uvSet) {
              obj.faces[newFace].setUV([uvSet[j], uvSet[j + 1], uvSet[j + 2]]);
            }
          }

          ofs += totalPts;
        }
      }
  }
  
  function cubicvr_getUVMapper(uvelem,mappers) {
    var util = CubicVR.util;
    var uvm = new CubicVR.UVMapper();
    var uvmType = null;
    var uvSet = null;

    if (uvelem.getElementsByTagName("type").length) {
      uvmType = uvelem.getElementsByTagName("type")[0].firstChild.nodeValue;

      switch (uvmType) {
      case "uv":
        break;
      case "planar":
        uvm.projection_mode = enums.uv.projection.PLANAR;
        break;
      case "cylindrical":
        uvm.projection_mode = enums.uv.projection.CYLINDRICAL;
        break;
      case "spherical":
        uvm.projection_mode = enums.uv.projection.SPHERICAL;
        break;
      case "cubic":
        uvm.projection_mode = enums.uv.projection.CUBIC;
        break;
      }
    }

    if (!uvmType) return null;

    if (uvmType === "uv") {
      if (uvelem.getElementsByTagName("uv").length) {
        var uvText = util.collectTextNode(uvelem.getElementsByTagName("uv")[0]);

        uvSet = uvText.split(" ");

        for (j = 0, jMax = uvSet.length; j < jMax; j++) {
          uvSet[j] = util.floatDelimArray(uvSet[j]);
        }
      }
    }

    if (uvelem.getElementsByTagName("axis").length) {
      var uvmAxis = uvelem.getElementsByTagName("axis")[0].firstChild.nodeValue;

      switch (uvmAxis) {
      case "x":
        uvm.projection_axis = enums.uv.axis.X;
        break;
      case "y":
        uvm.projection_axis = enums.uv.axis.Y;
        break;
      case "z":
        uvm.projection_axis = enums.uv.axis.Z;
        break;
      }

    }

    if (uvelem.getElementsByTagName("center").length) {
      uvm.center = util.floatDelimArray(uvelem.getElementsByTagName("center")[0].firstChild.nodeValue);
    }
    if (uvelem.getElementsByTagName("rotation").length) {
      uvm.rotation = util.floatDelimArray(uvelem.getElementsByTagName("rotation")[0].firstChild.nodeValue);
    }
    if (uvelem.getElementsByTagName("scale").length) {
      uvm.scale = util.floatDelimArray(uvelem.getElementsByTagName("scale")[0].firstChild.nodeValue);
    }

    if (uvelem.getElementsByTagName("wrap_w").length) {
      uvm.wrap_w_count = parseFloat(uvelem.getElementsByTagName("wrap_w")[0].firstChild.nodeValue);
    }

    if (uvelem.getElementsByTagName("wrap_h").length) {
      uvm.wrap_h_count = parseFloat(uvelem.getElementsByTagName("wrap_h")[0].firstChild.nodeValue);
    }

    if (uvmType !== "" && uvmType !== "uv") {
      return uvm; // object
    } else {
      return uvSet; // array
    }
  }
  

  function cubicvr_getMaterial(melem,prefix) {
    var util = CubicVR.util;
    var matName = (melem.getElementsByTagName("name").length) ? (melem.getElementsByTagName("name")[0].firstChild.nodeValue) : null;
    var mat = new CubicVR.Material(matName);

    if (melem.getElementsByTagName("alpha").length) {
      mat.opacity = parseFloat(melem.getElementsByTagName("alpha")[0].firstChild.nodeValue);
    }
    if (melem.getElementsByTagName("shininess").length) {
      mat.shininess = (parseFloat(melem.getElementsByTagName("shininess")[0].firstChild.nodeValue) / 100.0);
    }
    if (melem.getElementsByTagName("max_smooth").length) {
      mat.max_smooth = parseFloat(melem.getElementsByTagName("max_smooth")[0].firstChild.nodeValue);
    }

    if (melem.getElementsByTagName("color").length) {
      mat.color = util.floatDelimArray(melem.getElementsByTagName("color")[0].firstChild.nodeValue);
    }
    if (melem.getElementsByTagName("ambient").length) {
      mat.ambient = util.floatDelimArray(melem.getElementsByTagName("ambient")[0].firstChild.nodeValue);
    }
    if (melem.getElementsByTagName("diffuse").length) {
      mat.diffuse = util.floatDelimArray(melem.getElementsByTagName("diffuse")[0].firstChild.nodeValue);
    }
    if (melem.getElementsByTagName("specular").length) {
      mat.specular = util.floatDelimArray(melem.getElementsByTagName("specular")[0].firstChild.nodeValue);
    }
    if (melem.getElementsByTagName("texture").length) {
      texName = (prefix ? prefix : "") + melem.getElementsByTagName("texture")[0].firstChild.nodeValue;
      tex = (base.Textures_ref[texName] !== undef) ? base.Textures_obj[base.Textures_ref[texName]] : (new CubicVR.Texture(texName));
      mat.setTexture(tex, enums.texture.map.COLOR);
    }

    if (melem.getElementsByTagName("texture_luminosity").length) {
      texName = (prefix ? prefix : "") + melem.getElementsByTagName("texture_luminosity")[0].firstChild.nodeValue;
      tex = (base.Textures_ref[texName] !== undef) ? base.Textures_obj[base.Textures_ref[texName]] : (new CubicVR.Texture(texName));
      mat.setTexture(tex, enums.texture.map.AMBIENT);
    }

    if (melem.getElementsByTagName("texture_normal").length) {
      texName = (prefix ? prefix : "") + melem.getElementsByTagName("texture_normal")[0].firstChild.nodeValue;
      tex = (base.Textures_ref[texName] !== undef) ? base.Textures_obj[base.Textures_ref[texName]] : (new CubicVR.Texture(texName));
      mat.setTexture(tex, enums.texture.map.NORMAL);
    }

    if (melem.getElementsByTagName("texture_specular").length) {
      texName = (prefix ? prefix : "") + melem.getElementsByTagName("texture_specular")[0].firstChild.nodeValue;
      tex = (base.Textures_ref[texName] !== undef) ? base.Textures_obj[base.Textures_ref[texName]] : (new CubicVR.Texture(texName));
      mat.setTexture(tex, enums.texture.map.SPECULAR);
    }

    if (melem.getElementsByTagName("texture_bump").length) {
      texName = (prefix ? prefix : "") + melem.getElementsByTagName("texture_bump")[0].firstChild.nodeValue;
      tex = (base.Textures_ref[texName] !== undef) ? base.Textures_obj[base.Textures_ref[texName]] : (new CubicVR.Texture(texName));
      mat.setTexture(tex, enums.texture.map.BUMP);
    }

    if (melem.getElementsByTagName("texture_envsphere").length) {
      texName = (prefix ? prefix : "") + melem.getElementsByTagName("texture_envsphere")[0].firstChild.nodeValue;
      tex = (base.Textures_ref[texName] !== undef) ? base.Textures_obj[base.Textures_ref[texName]] : (new CubicVR.Texture(texName));
      mat.setTexture(tex, enums.texture.map.ENVSPHERE);
    }

    if (melem.getElementsByTagName("texture_alpha").length) {
      texName = (prefix ? prefix : "") + melem.getElementsByTagName("texture_alpha")[0].firstChild.nodeValue;
      tex = (base.Textures_ref[texName] !== undef) ? base.Textures_obj[base.Textures_ref[texName]] : (new CubicVR.Texture(texName));
      mat.setTexture(tex, enums.texture.map.ALPHA);
    }
    
    return mat;
  }
  
  function cubicvr_get2DPoints(pts_elem,force3d) {
    var util = CubicVR.util;
    var pts_str = util.collectTextNode(pts_elem);
    var pts = pts_str.split(" ");

    var texName, tex;

    for (i = 0, iMax = pts.length; i < iMax; i++) {
      pts[i] = pts[i].split(",");
      for (j = 0, jMax = pts[i].length; j < jMax; j++) {
        pts[i][j] = parseFloat(pts[i][j]);
      }
      if (force3d) {  // force z to 0, or add z
        pts[i][2] = 0;
      }
    }
    
    return pts;
  }
  
  
  function cubicvr_getTransform(telem) {     
    var util = CubicVR.util;
    
    if (!telem) return null;
    
    var result = {
      position: [0,0,0],
      rotation: [0,0,0],
      scale: [1,1,1]
    };

    var position, rotation, scale, tempNode;

    tempNode = telem.getElementsByTagName("position");
    if (tempNode.length) {
      position = tempNode[0];
    }

    tempNode = telem.getElementsByTagName("rotation");
    if (tempNode.length) {
      rotation = tempNode[0];
    }

    tempNode = telem.getElementsByTagName("scale");
    if (tempNode.length) {
      scale = tempNode[0];
    }

    if (position) result.position = util.floatDelimArray(util.collectTextNode(position));
    if (rotation) result.rotation = util.floatDelimArray(util.collectTextNode(rotation));
    if (scale) result.scale = util.floatDelimArray(util.collectTextNode(scale));

    if (position||rotation||scale) {
      return result;
    }
    
    return null;
  }

  function cubicvr_getStringNode(pelem, nodeName, default_value) {
    var util = CubicVR.util;
    var childNodes = pelem.getElementsByTagName(nodeName);
    
    if (!childNodes.length) return default_value;
    
    var str = util.collectTextNode(childNodes[0]);
    
    if (str) {
       return str;
    }
    
    return default_value;
  }


  function cubicvr_getFloatNode(pelem, nodeName, default_value) {
    var util = CubicVR.util;
    var str = cubicvr_getStringNode(pelem, nodeName);
    
    if (str) {
       var val = parseFloat(str);
       if (val != val) return default_value;
       return val;
    }
    
    return default_value;
  }

  function cubicvr_getIntNode(pelem, nodeName, default_value) {
    var util = CubicVR.util;
    var str = cubicvr_getStringNode(pelem, nodeName);
    
    if (str) {
       var val = parseInt(str,10);
       if (val != val) return default_value;
       return val;
    }
    
    return default_value;
  }


  function cubicvr_loadMesh(meshUrl, prefix) {
   if (MeshPool[meshUrl] !== undef) {
     return MeshPool[meshUrl];
   }

    var util = CubicVR.util;

    var i, j, p, iMax, jMax, pMax;

    var obj = new CubicVR.Mesh();
    var mesh = util.getXML(meshUrl);
    var pts_elem = mesh.getElementsByTagName("points");

    var pts_str = util.collectTextNode(pts_elem[0]);
    var pts = pts_str.split(" ");

    var texName, tex;

    for (i = 0, iMax = pts.length; i < iMax; i++) {
      pts[i] = pts[i].split(",");
      for (j = 0, jMax = pts[i].length; j < jMax; j++) {
        pts[i][j] = parseFloat(pts[i][j]);
      }
    }

    obj.addPoint(pts);

    var material_elem = mesh.getElementsByTagName("material");
    var mappers = [];

    for (i = 0, iMax = material_elem.length; i < iMax; i++) {
      var melem = material_elem[i];

      var mat = cubicvr_getMaterial(melem,prefix);

      var uvelem=null,uvm=null,uvSet=null;
      
      for (j = 0, jMax = melem.childNodes.length; j < jMax; j++) {
        uvelem = melem.childNodes[j];
        if (uvelem.tagName==='uvmapper') {
         uvm = cubicvr_getUVMapper(uvelem);
         if (uvm && !uvm.length) {
            mappers.push([uvm,mat]);
         } else {
            uvSet = uvm;           
         }
         break;
        }
      }
  
      var mpart = melem.getElementsByTagName("part");
      
      if (mpart.length) {
        var local_uvm = null;
        var muvelem = null;
        var ltrans = null;

        for (j = 0, jMax = mpart.length; j<jMax; j++) {
          var part = mpart[j];
          local_uvm = null;
          uvSet = null;
          
          muvelem = part.getElementsByTagName("uvmapper");
          
          if (muvelem.length) {
            uvelem = muvelem[0];
            local_uvm = cubicvr_getUVMapper(uvelem);

            if (melem.getElementsByTagName("triangles").length) {
              var face_start = obj.faces.length, face_end = face_start;
              if (local_uvm && !local_uvm.length) {
                cubicvr_addTrianglePart(obj,mat,null,part);
                face_end = obj.faces.length-1;
                obj.calcFaceNormals(face_start,face_end);
                local_uvm.apply(obj,mat,undef,face_start,face_end);
              } else if (local_uvm && local_uvm.length) {
                cubicvr_addTrianglePart(obj,mat,local_uvm,part);
              } else if (uvm && !uvm.length) {
                cubicvr_addTrianglePart(obj,mat,null,part);
                face_end = obj.faces.length-1;
                obj.calcFaceNormals(face_start,face_end);
                uvm.apply(obj,mat,undef,face_start,face_end);
              }
            }
          }
                
          if (part.getElementsByTagName("procedural").length) {
            muvelem = part.getElementsByTagName("uvmapper");
          
            if (muvelem.length) {
              uvelem = muvelem[0];
              local_uvm = cubicvr_getUVMapper(uvelem);
            }

            if (part.getElementsByTagName("transform")) {
              ltrans = cubicvr_getTransform(part.getElementsByTagName("transform")[0]);
            } else {
              ltrans = undef;
            }
            
            var trans = undef;
          
            var proc = part.getElementsByTagName("procedural")[0];
            
            var ptype = util.collectTextNode(proc.getElementsByTagName("type")[0]);
            
            if (ltrans) {
              trans = new CubicVR.Transform();
              trans.translate(ltrans.position);
              trans.pushMatrix();
              trans.rotate(ltrans.rotation);
              trans.pushMatrix();
              trans.scale(ltrans.scale);
            }

            if (!uvm) uvm = undef;
            
            var prim = {
              material: mat,
              uvmapper: uvm||local_uvm
            };
              
            if (ptype === "box" || ptype === "cube") {
              prim.size = cubicvr_getFloatNode(proc,"size");
              obj.booleanAdd(CubicVR.primitives.box(prim),trans);
            } else if (ptype === "sphere") {
              prim.radius = cubicvr_getFloatNode(proc,"radius");
              prim.lat = cubicvr_getIntNode(proc,"lat");
              prim.lon = cubicvr_getIntNode(proc,"lon");
              obj.booleanAdd(CubicVR.primitives.sphere(prim),trans);
            } else if (ptype === "cone") {
              prim.base = cubicvr_getFloatNode(proc,"base");
              prim.height = cubicvr_getFloatNode(proc,"height");
              prim.lon = cubicvr_getIntNode(proc,"lon");
              obj.booleanAdd(CubicVR.primitives.cone(prim),trans);
            } else if (ptype === "plane") {
              prim.size = cubicvr_getFloatNode(proc,"size");
              obj.booleanAdd(CubicVR.primitives.plane(prim),trans);
            } else if (ptype === "cylinder") {
              prim.radius = cubicvr_getFloatNode(proc,"radius");
              prim.height = cubicvr_getFloatNode(proc,"height");
              prim.lon = cubicvr_getIntNode(proc,"lon");
              obj.booleanAdd(CubicVR.primitives.cylinder(prim),trans);
            } else if (ptype === "torus") {
              prim.innerRadius = cubicvr_getFloatNode(proc,"innerRadius");
              prim.outerRadius = cubicvr_getFloatNode(proc,"outerRadius");
              prim.lat = cubicvr_getIntNode(proc,"lat");
              prim.lon = cubicvr_getIntNode(proc,"lon");
              obj.booleanAdd(CubicVR.primitives.torus(prim),trans);
            } else if (ptype === "lathe") {
              prim.points = cubicvr_get2DPoints(proc.getElementsByTagName("points")[0],true);
              prim.lon = cubicvr_getIntNode(proc,"lon");
              obj.booleanAdd(CubicVR.primitives.lathe(prim),trans);
            } else if (ptype === "polygon") {
            }        
          }
        }
      } else {
        cubicvr_addTrianglePart(obj,mat,uvSet,melem);
      }
    }

    obj.triangulateQuads();
    obj.calcNormals();

    for (i = 0, iMax = mappers.length; i < iMax; i++) {
      mappers[i][0].apply(obj, mappers[i][1]);
    }

    obj.compile();

    MeshPool[meshUrl] = obj;

    return obj;
  }




  function cubicvr_loadScene(sceneUrl, model_prefix, image_prefix) {
    var util = CubicVR.util;
    if (model_prefix === undef) {
      model_prefix = "";
    }
    if (image_prefix === undef) {
      image_prefix = "";
    }

    var obj = new CubicVR.Mesh();
    var scene = util.getXML(sceneUrl);

    var sceneOut = new CubicVR.Scene();

    var parentingSet = [];

    var sceneobjs = scene.getElementsByTagName("sceneobjects");

    var tempNode;

    var position, rotation, scale;

    //  var pts_str = util.collectTextNode(pts_elem[0]);
    for (var i = 0, iMax = sceneobjs[0].childNodes.length; i < iMax; i++) {
      var sobj = sceneobjs[0].childNodes[i];

      if (sobj.tagName === "sceneobject") {

        var name = "unnamed";
        var parent = "";
        var model = "";

        tempNode = sobj.getElementsByTagName("name");
        if (tempNode.length) {
          name = util.collectTextNode(tempNode[0]);
        }

        tempNode = sobj.getElementsByTagName("parent");
        if (tempNode.length) {
          parent = util.collectTextNode(tempNode[0]);
        }

        tempNode = sobj.getElementsByTagName("model");
        if (tempNode.length) {
          model = util.collectTextNode(tempNode[0]);
        }

        position = null;
        rotation = null;
        scale = null;

        tempNode = sobj.getElementsByTagName("position");
        if (tempNode.length) {
          position = tempNode[0];
        }

        tempNode = sobj.getElementsByTagName("rotation");
        if (tempNode.length) {
          rotation = tempNode[0];
        }

        tempNode = sobj.getElementsByTagName("scale");
        if (tempNode.length) {
          scale = tempNode[0];
        }

        obj = null;

        if (model !== "") {
          obj = cubicvr_loadMesh(model_prefix + model, image_prefix);
        }

        var sceneObject = new CubicVR.SceneObject(obj, name);

        if (cubicvr_isMotion(position)) {
          if (!sceneObject.motion) {
            sceneObject.motion = new CubicVR.Motion();
          }
          cubicvr_nodeToMotion(position, enums.motion.POS, sceneObject.motion);
        } else if (position) {
          sceneObject.position = util.floatDelimArray(util.collectTextNode(position));
        }

        if (cubicvr_isMotion(rotation)) {
          if (!sceneObject.motion) {
            sceneObject.motion = new CubicVR.Motion();
          }
          cubicvr_nodeToMotion(rotation, enums.motion.ROT, sceneObject.motion);
        } else {
          sceneObject.rotation = util.floatDelimArray(util.collectTextNode(rotation));
        }

        if (cubicvr_isMotion(scale)) {
          if (!sceneObject.motion) {
            sceneObject.motion = new CubicVR.Motion();
          }
          cubicvr_nodeToMotion(scale, enums.motion.SCL, sceneObject.motion);
        } else {
          sceneObject.scale = util.floatDelimArray(util.collectTextNode(scale));

        }

        sceneOut.bindSceneObject(sceneObject);

        if (parent !== "") {
          parentingSet.push([sceneObject, parent]);
        }
      }
    }

    for (var j in parentingSet) {
      if (parentingSet.hasOwnProperty(j)) {
        sceneOut.getSceneObject(parentingSet[j][1]).bindChild(parentingSet[j][0]);
      }
    }

    var camera = scene.getElementsByTagName("camera");

    if (camera.length) {
      position = null;
      rotation = null;

      var target = "";

      tempNode = camera[0].getElementsByTagName("name");

      var cam = sceneOut.camera;

      var fov = null;

      if (tempNode.length) {
        target = tempNode[0].firstChild.nodeValue;
      }

      tempNode = camera[0].getElementsByTagName("target");
      if (tempNode.length) {
        target = tempNode[0].firstChild.nodeValue;
      }

      if (target !== "") {
        cam.targetSceneObject = sceneOut.getSceneObject(target);
      }

      tempNode = camera[0].getElementsByTagName("position");
      if (tempNode.length) {
        position = tempNode[0];
      }

      tempNode = camera[0].getElementsByTagName("rotation");
      if (tempNode.length) {
        rotation = tempNode[0];
      }

      tempNode = camera[0].getElementsByTagName("fov");
      if (tempNode.length) {
        fov = tempNode[0];
      }

      if (cubicvr_isMotion(position)) {
        if (!cam.motion) {
          cam.motion = new CubicVR.Motion();
        }
        cubicvr_nodeToMotion(position, enums.motion.POS, cam.motion);
      } else if (position) {
        cam.position = util.floatDelimArray(position.firstChild.nodeValue);
      }

      if (cubicvr_isMotion(rotation)) {
        if (!cam.motion) {
          cam.motion = new CubicVR.Motion();
        }
        cubicvr_nodeToMotion(rotation, enums.motion.ROT, cam.motion);
      } else if (rotation) {
        cam.rotation = util.floatDelimArray(rotation.firstChild.nodeValue);
      }

      if (cubicvr_isMotion(fov)) {
        if (!cam.motion) {
          cam.motion = new CubicVR.Motion();
        }
        cubicvr_nodeToMotion(fov, enums.motion.FOV, cam.motion);
      } else if (fov) {
        cam.fov = parseFloat(fov.firstChild.nodeValue);
      }

    }


    return sceneOut;
  }
  
  
  var exports = {
    loadMesh: cubicvr_loadMesh,
    loadScene: cubicvr_loadScene
  };

  return exports;
  
});
