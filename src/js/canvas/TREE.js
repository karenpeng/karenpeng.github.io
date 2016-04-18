;(function() {
var core, objects_Params, objects_Branch, objects_Joint, utility_BuildUtil, utility_FindAndReport, utility_Utils, utility_Modify, utility_Boolean, utility_Surface, utility_Points, utility_Tubes, utility_threeExtension, app;
core = function (require) {
  /**
  * TREE is a hierarchical modeling tool
  * @author David Lobser
  * @version  .001
  * @class _TREE
  */
  var TREE = function (params) {
    THREE.Object3D.call(this);
    this.limbs = [];
    this.name = 0;
    this.nameArray = [];
    this.parts = [];
    this.defaultParams();
    this.makeUtils();
    this.self = this;
  };
  TREE.prototype = Object.create(THREE.Object3D.prototype);
  return TREE;
}({});
objects_Params = function () {
  var TREE = core;
  TREE.prototype.defaultParams = function () {
    this.params = {
      name: 0,
      jointScale: new THREE.Vector3(1, 1, 1),
      ballGeo: new THREE.SphereGeometry(1, 8, 6),
      jointGeo: new THREE.CylinderGeometry(1, 1, 1, 8, 1),
      material: new THREE.MeshLambertMaterial(),
      offset: 0,
      scalar: new THREE.Object3D(),
      rotator: new THREE.Object3D(),
      poser: new THREE.Object3D(),
      num: 100,
      tubeGeo: []
    };
  };
  return TREE;
}();
objects_Branch = function () {
  var TREE = core;
  TREE.prototype.branch = function (amt, obj, params) {
    //Create one branch, a collection of linked limbs
    var p = this.params;
    var parent = obj || this;
    var amount = amt || p.num;
    var countUp = 0;
    var joint = new TREE.Joint(parent.params);
    if (!parent.offset)
      parent.offset = 0;
    if (!parent.joint)
      parent.joint = 0;
    var offsetOffset = parent != undefined ? parent.offset + parent.limbs.length : 0;
    joint.offset = parent.joint + offsetOffset || 0;
    joint.offset2 = offsetOffset;
    joint.joint = countUp;
    joint.joints = amount - 1;
    joint.parentJoint = parent;
    joint.name = Math.floor(Math.random() * 1000000000);
    parent.limbs.push(joint);
    countUp++;
    //
    var keys = Object.keys(joint.params);
    var tempParams = {};
    for (var i = 0; i < keys.length; i++) {
      tempParams[keys[i]] = joint.params[keys[i]];
    }
    joint.params = tempParams;
    if (params) {
      var keys = Object.keys(params);
      for (var i = 0; i < keys.length; i++) {
        joint.params[keys[i]] = params[keys[i]];
      }
    }
    //
    if (parent != this) {
      joint._construct(parent.params.jointScale.y);
      parent.rotator.add(this.recursiveAdd(amount, countUp++, joint));
    } else {
      joint._construct();
      parent.add(this.recursiveAdd(amount, countUp++, joint));
    }
    return joint;
  };
  TREE.prototype.recursiveAdd = function (amt, counter, obj) {
    //helper function for branch
    var joint = new TREE.Joint(obj.params);
    joint.offset = obj.offset;
    joint.offset2 = obj.offset2;
    joint.parentJoint = obj.parentJoint;
    joint.name = obj.name;
    joint._construct();
    joint.joint = counter;
    obj.childJoint = joint;
    if (amt > 1)
      obj.rotator.add(joint);
    amt--;
    counter++;
    if (amt > 0) {
      this.recursiveAdd(amt, counter++, joint);
    }
    return obj;
  };
  TREE.prototype.generate = function (genome, Parent) {
    //e.g. genome = {joints:[15,3,2],divs:[2,3,1],angles:[.78,.05,.03],rads:[2,1,1]}
    var parent = parent || this;
    var g = this._generateFixedParams(genome);
    if (g.joints.length != g.divs.length || g.joints.length != g.angles.length || g.divs.length != g.angles.length) {
      alert('arrays must be the same length');
      return;
    }
    var tempRoot = new TREE.Joint(this.params);
    tempRoot._construct();
    tempRoot.name = '0';
    for (var i = 0; i < g.rads[0]; i++) {
      //for offsetting
      var altLength = tempRoot.params.jointScale.clone();
      altLength.y = g.length[0];
      altLength.x = altLength.z = g.width[0];
      var root = this.branch(g.joints[0], tempRoot, { jointScale: altLength });
      root.rotator.rotation.z = g.angles[0];
      root.rotator.rotation.y = i * (2 * Math.PI / g.rads[0]);
      this.recursiveBranch(g, 1, root);
      parent.add(root);
      parent.limbs.push(root);
    }
    this.makeDictionary();
  };
  TREE.prototype.recursiveBranch = function (genome, counter, joint) {
    //helper for generate
    var g = genome;
    var end = g.end[counter];
    if (end == -1)
      end = joint.joints + 1;
    var newBranch, kidJoint;
    //loop through all the joints in the current branch
    for (var i = g.start[counter]; i < end; i += g.divs[counter]) {
      //loop through the 'rads' - the number of branches from each joint
      for (var j = 0; j < g.rads[counter]; j++) {
        kidJoint = this.findJointOnBranch(joint, i);
        var altLength = kidJoint.params.jointScale.clone();
        altLength.y = g.length[counter];
        altLength.x = altLength.z = g.width[counter];
        newBranch = this.branch(g.joints[counter], kidJoint, { jointScale: altLength });
        newBranch.rotator.rotation.z = g.angles[counter];
        newBranch.rotator.rotation.y = j * (2 * Math.PI / g.rads[counter]);
      }
      if (counter < g.joints.length) {
        for (var k = 0; k < kidJoint.limbs.length; k++) {
          this.recursiveBranch(genome, counter + 1, kidJoint.limbs[k]);
        }
      }
    }
  };
  return TREE;
}();
objects_Joint = function () {
  var TREE = core;
  TREE.Joint = function (params) {
    //Each joint looks like this:
    //Joint(Object3D).children[0]=rotator(Object3D)
    //Joint(Object3D).children[0].children[0]=ballGeo(Mesh)
    //Joint(Object3D).children[0].children[0].children[0]=ballGeo(Mesh)
    //Joint(Object3D).children[0].children[1]=scalar(Object3D)
    //Joint(Object3D).children[0].children[1].children[0]=jointGeo(Mesh)
    //Joint(Object3D).children[0].children[2]=Joint(Object3D) (the next joint, if there is one)
    THREE.Object3D.call(this);
    this.params = params;
    this.limbs = [];
    this.parts = [];
    this.nameArray = [];
  };
  TREE.Joint.prototype = Object.create(THREE.Object3D.prototype);
  TREE.Joint.prototype._construct = function (off) {
    // the argument off refers to the offset in y 
    var p = this.params;
    this.ballMesh = new THREE.Mesh(p.ballGeo, p.material);
    this.ballMesh2 = new THREE.Mesh(p.ballGeo, p.material);
    this.jointMesh = new THREE.Mesh(p.jointGeo, p.material);
    this.ballMesh.scale = new THREE.Vector3(p.jointScale.x, p.jointScale.x, p.jointScale.x);
    this.jointMesh.position.y = 0.5;
    this.scalar = new THREE.Object3D();
    this.rotator = new THREE.Object3D();
    this.scalar.add(this.jointMesh);
    this.scalar.scale = p.jointScale;
    this.rotator.add(this.ballMesh);
    this.ballMesh2.position.y = p.jointScale.y / p.jointScale.x;
    this.ballMesh.add(this.ballMesh2);
    this.rotator.add(this.scalar);
    this.add(this.rotator);
    var offset = p.jointScale.y;
    if (off != undefined)
      var offset = off;
    this.position.y = offset;
  };
  return TREE;
}();
utility_BuildUtil = function () {
  var TREE = core;
  TREE.prototype._generateFixedParams = function (params) {
    //helper function for generate
    var counter = 0;
    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++) {
      if (counter < params[keys[i]].length) {
        counter = params[keys[i]].length;
      }
    }
    var amt = counter;
    var tempParams = this._generateDefaultParams(amt);
    keys = Object.keys(params);
    for (i = 0; i < keys.length; i++) {
      tempParams[keys[i]] = params[keys[i]];
      if (tempParams[keys[i]].length < amt) {
        for (var j = tempParams[keys[i]].length - 1; j < amt - 1; j++) {
          // console.log(keys[i]);
          if (keys[i] == 'end')
            tempParams[keys[i]].push(-1);
          else
            tempParams[keys[i]].push(tempParams[keys[i]][tempParams[keys[i]].length - 1]);
        }
      }
    }
    return tempParams;
  };
  TREE.prototype._generateDefaultParams = function (amt) {
    //helper function for generate
    var params = {
      joints: [],
      divs: [],
      start: [],
      angles: [],
      length: [],
      rads: [],
      width: [],
      end: []
    };
    for (var i = 0; i < amt; i++) {
      params.joints.push(5);
      params.divs.push(1);
      params.start.push(0);
      params.angles.push(1);
      params.length.push(5);
      params.rads.push(2);
      params.width.push(1);
      params.end.push(-1);
      if (i === 0) {
        params.rads[0] = 1;
        params.angles[0] = 0;
        params.joints[0] = 10;
      }
    }
    return params;
  };
  return TREE;
}();
utility_FindAndReport = function () {
  var TREE = core;
  TREE.prototype.findJointOnBranch = function (obj, num) {
    //Return a particular joint on a branch
    //where obj is the root 
    var returner;
    if (obj) {
      if (num > obj.joints + 1)
        num = obj.joints + 1;
      if (num > 0) {
        num--;
        returner = this.findJointOnBranch(obj.childJoint, num);
      } else {
        returner = obj;
      }
    } else
      console.warn('missing object');
    return returner;
  };
  TREE.prototype.FIND = function (selector, counter, branch) {
    return this.findJoint(selector);
  };
  TREE.prototype.findJoint = function (selector, counter, branch) {
    var root = branch || this;
    var count = counter || 0;
    var returner;
    //count up through items in selector; an array
    if (count < selector.length - 1) {
      //create an empty array that we'll fill up with the locations
      //of all the joints that have limbs
      var j = [];
      this._findLimbs(root, j);
      //make sure we're not going past the end of the array
      var c;
      if (selector[count] > j.length - 1) {
        c = j.length - 1;
      } else
        c = selector[count];
      //use the selected joint for the next recursion
      var joint = j[c];
      returner = this.findJoint(selector, count + 2, joint.limbs[selector[count + 1]]);
    } else {
      if (selector[count] == 'all') {
        for (var i = 1; i < root.joints + 1; i++) {
          returner = this.findJointOnBranch(root, i);
        }
      } else {
        returner = this.findJointOnBranch(root, selector[count]);
      }
    }
    return returner;
  };
  TREE.prototype.Move = function (selector, func, args) {
    return func(this.findJoint(selector), args);
  };
  TREE.prototype._findLimbs = function (branch, array) {
    //utility function
    //fills an array with a list of the joints that branch from a limb
    var returner;
    if (branch) {
      if (branch.limbs) {
        if (branch.limbs.length > 0) {
          array.push(branch);
        }
      }
      if (branch.childJoint !== undefined && branch.childJoint.name == branch.name) {
        returner = this._findLimbs(branch.childJoint, array);
      }
    }
    return returner;
  };
  TREE.prototype.report = function (array, obj) {
    //returns a one dimensional array with all root joints
    var arr = array || [];
    var joint = obj || this;
    for (var j = 0; j < joint.limbs.length; j++) {
      arr.push(joint.limbs[j]);
      var jarr = [];
      this._findLimbs(joint.limbs[j], jarr);
      for (var i = 0; i < jarr.length; i++) {
        this.report(arr, jarr[i]);
      }
    }
    return arr;
  };
  TREE.prototype.reportLayers = function (array, obj, count) {
    //makes a multi dimensional array where the first dimension
    //refers to the depth of the indexed branches
    var arr = array || [];
    //the first time through it creates an array
    var joint = obj || this;
    // and references the 0th joint
    var c = count + 1 || 0;
    // and starts the counter at 0
    var larr = [];
    for (var j = 0; j < joint.limbs.length; j++) {
      larr.push(joint.limbs[j]);
      var jarr = [];
      this._findLimbs(joint.limbs[j], jarr);
      for (var i = 0; i < jarr.length; i++) {
        this.reportLayers(arr, jarr[i], c);
      }
    }
    if (!arr[c]) {
      arr[c] = [];
      for (var i = 0; i < larr.length; i++) {
        arr[c].push(larr[i]);
      }
    } else {
      for (var i = 0; i < larr.length; i++) {
        arr[c].push(larr[i]);
      }
    }
    return arr;
  };
  TREE.prototype.makeDictionary = function (obj, Stack, StackArray, Pusher) {
    var joint = obj || this;
    var stack = Stack || [];
    var stackArray = StackArray || [];
    var pusher = Pusher || 0;
    stack.push(pusher);
    for (var i = 0; i < joint.limbs.length; i++) {
      stack.push(i);
      var jarr = [];
      this._findLimbs(joint.limbs[i], jarr);
      var tempStack = [];
      var t2 = [];
      for (var k = 0; k < stack.length; k++) {
        tempStack[k] = stack[k];
        t2[k] = stack[k];
      }
      stackArray.push(tempStack);
      t2.push('all');
      var t3 = this.makeList(t2);
      var t4 = t3;
      for (var k = 0; k < t4.length; k++) {
        var tempString = t4[k].toString();
        var tempJoint = this.findJoint(t4[k]);
        this.parts[tempString] = tempJoint;
        tempJoint.dictionaryName = tempString;
      }
      for (var j = 0; j < jarr.length; j++) {
        this.makeDictionary(jarr[j], tempStack, stackArray, j);
      }
      stack.pop();
    }
    stack.pop();
    return stackArray;
  };
  TREE.prototype.worldPositions = function (obj) {
    //returns the world positions of all the joints on a branch
    var arr = [];
    this.updateMatrixWorld();
    for (var i = 0; i <= obj.joints; i++) {
      var tempObj1 = this.findJointOnBranch(obj, i);
      tempObj = tempObj1;
      // tempObj1.updateMatrixWorld();
      // tempObj1.updateMatrix();
      if (tempObj1.ballMesh !== undefined)
        var tempObj = tempObj1.ballMesh;
      var vector = new THREE.Vector3();
      vector.setFromMatrixPosition(tempObj.matrixWorld);
      var vecScale = new THREE.Vector3();
      vecScale.setFromMatrixScale(tempObj.matrixWorld);
      var vec4 = new THREE.Vector4(vector.x, vector.y, vector.z, vecScale.z);
      arr.push(vec4);
      if (i == obj.joints) {
        vector.setFromMatrixPosition(tempObj1.ballMesh2.matrixWorld);
        var vec4 = new THREE.Vector4(vector.x, vector.y, vector.z, vecScale.z);
        arr.push(vec4);
      }
    }
    return arr;
  };
  TREE.prototype.worldPositionsArray = function (arr) {
    //good for working working with the output of tree.report()
    //which returns a one dimensional array of all joints
    var masterArray = [];
    for (var i = 0; i < arr.length; i++) {
      masterArray.push(this.worldPositions(arr[i]));
    }
    return masterArray;
  };
  TREE.prototype.worldPositionsMultiArray = function (arr) {
    //best for working with the output of reportLayers()
    //which returns a 2 dimensional array
    var masterArray = [];
    for (var i = 0; i < arr.length; i++) {
      var smallArray = [];
      for (var j = 0; j < arr[i].length; j++) {
        smallArray.push(this.worldPositions(arr[i][j]));
      }
      masterArray.push(smallArray);
    }
    return masterArray;
  };
  TREE.prototype.makeInfo = function (args) {
    var info = [];
    for (var i = 0; i < args.length; i += 2) {
      info.push(this.makeList(args[i]));
      info.push(args[i + 1]);
    }
    return info;
  };
  /**
  * Creates an array of individual addresses from an array specifying ranges
  * [0,0,[0,2]] -> [0,0,0],[0,0,1],[0,0,2]
  */
  TREE.prototype.makeList = function (range, Stack, StackArray, Index) {
    var stack = Stack || [];
    var stackArray = StackArray || [];
    var index = Index || 0;
    if (index < range.length) {
      var i = index;
      if (range[i] instanceof Array && i != range.length - 1) {
        for (var j = range[i][0]; j <= range[i][1]; j++) {
          stack.push(j);
          var tempStack = [];
          for (var k = 0; k < stack.length; k++) {
            tempStack[k] = stack[k];
          }
          this.makeList(range, tempStack, stackArray, i + 1);
          stack.pop();
        }
      } else if (range[i] == 'all' && index % 2 === 0 && index != range.length - 1 || range[i] == -1 && index % 2 === 0 && index != range.length - 1) {
        var tempStack = [];
        for (var k = 0; k < stack.length; k++) {
          tempStack[k] = stack[k];
        }
        tempStack.push(0);
        var jarr = [];
        this._findLimbs(this.findJoint(tempStack), jarr);
        for (var j = 0; j < jarr.length; j++) {
          stack.push(j);
          var tempStack = [];
          for (var k = 0; k < stack.length; k++) {
            tempStack[k] = stack[k];
          }
          this.makeList(range, tempStack, stackArray, i + 1);
          stack.pop();
        }
      } else if (range[i] == 'all' && index % 2 !== 0 && index !== range.length - 1 || range[i] == -1 && index % 2 !== 0 && index != range.length - 1) {
        var tempStack = [];
        for (var k = 0; k < stack.length; k++) {
          tempStack[k] = stack[k];
        }
        var jarr = [];
        this._findLimbs(this.findJoint(tempStack), jarr);
        var limbs = jarr[0].limbs;
        for (var j = 0; j < limbs.length; j++) {
          stack.push(j);
          var tempStack2 = [];
          for (var k = 0; k < stack.length; k++) {
            tempStack2[k] = stack[k];
          }
          this.makeList(range, tempStack2, stackArray, i + 1);
          stack.pop();
        }
      } else if (range[i] == -2 && index == range.length - 1 || range[i] == 'all' && index == range.length - 1 || range[i] == -1 && index == range.length - 1 || range[i] == -3 && index == range.length - 1) {
        var tempStack = [];
        for (var k = 0; k < stack.length; k++) {
          tempStack[k] = stack[k];
        }
        tempStack.push(0);
        var joints = this.findJoint(tempStack).joints;
        var min = 0;
        var max = joints + 1;
        if (range[i] == -2)
          min = 1;
        if (range[i] == -3)
          min = max - 1;
        for (var j = min; j < max; j++) {
          stack.push(j);
          var tempStack = [];
          for (var k = 0; k < stack.length; k++) {
            tempStack[k] = stack[k];
          }
          this.makeList(range, tempStack, stackArray, i + 1);
          stack.pop();
        }
      } else if (range[i] instanceof Array && index == range.length - 1) {
        var tempStack = [];
        for (var k = 0; k < stack.length; k++) {
          tempStack[k] = stack[k];
        }
        tempStack.push(0);
        var min = range[i][0];
        var max = range[i][1];
        var joints = this.findJoint(tempStack).joints;
        if (min > joints + 1)
          min = joints + 1;
        if (max > joints + 1)
          max = joints + 1;
        for (var j = min; j <= max; j++) {
          if (range[i] == -2)
            j++;
          stack.push(j);
          var tempStack = [];
          for (var k = 0; k < stack.length; k++) {
            tempStack[k] = stack[k];
          }
          this.makeList(range, tempStack, stackArray, i + 1);
          stack.pop();
        }
      } else {
        stack.push(range[i]);
        var tempStack = [];
        for (var k = 0; k < stack.length; k++) {
          tempStack[k] = stack[k];
        }
        this.makeList(range, tempStack, stackArray, i + 1);
        stack.pop();
      }
    } else {
      stackArray.push(stack);
    }
    return stackArray;
  };
  TREE.prototype.arrayStringName = function (arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i].name = arr[i].toString();
    }
  };
  return TREE;
}();
utility_Utils = function () {
  var TREE = core;
  TREE.prototype.makeUtils = function () {
    this.utils = {
      //JS
      extend: function (child, parent) {
        function TmpConst() {
        }
        TmpConst.prototype = parent.prototype;
        child.prototype = new TmpConst();
        child.prototype.constructor = child;
      },
      isUndef: function (thing) {
        return thing === void 0;
      },
      isDef: function (thing) {
        return !(thing === void 0);
      },
      arraysEqual: function (a, b) {
        if (a === b)
          return true;
        if (a === null || b === null)
          return false;
        if (a.length != b.length)
          return false;
        for (var i = 0; i < a.length; ++i) {
          if (a[i] !== b[i])
            return false;
        }
        return true;
      },
      cloneArray: function (src) {
        var dst = [];
        for (var i = 0; i < src.length; i++)
          if (src[i] instanceof Array)
            dst[i] = cloneArray(src[i]);
          else
            dst[i] = src[i];
        return dst;
      },
      arrayToString: function (a, level) {
        if (a.length == 0)
          return '[]';
        if (level === undefined)
          level = 0;
        var spacer = level == 0 ? ' ' : '';
        var str = '[' + spacer;
        for (var i = 0; i < a.length; i++)
          str += (a[i] instanceof Array ? arrayToString(a[i], level + 1) : a[i]) + spacer + (i < a.length - 1 ? ',' + spacer : ']');
        return str;
      },
      firstUndefinedArrayIndex: function (arr) {
        var n = 0;
        while (n < arr.length && isDef(arr[n]) && arr[n] !== null)
          n++;
        return n;
      },
      getIndex: function (arr, obj) {
        var i = arr.length;
        while (--i >= 0 && arr[i] !== obj);
        return i;
      },
      sample: function (arr, t) {
        t = max(0, min(0.999, t));
        var n = arr.length;
        if (n == 1)
          return arr[0];
        var i = floor((n - 1) * t);
        var f = (n - 1) * t - i;
        return lerp(f, arr[i], arr[i + 1]);
      },
      newZeroArray: function (size) {
        var dst = [];
        for (var i = 0; i < size; i++)
          dst.push(0);
        return dst;
      },
      findSyntaxError: function (code) {
        var error = [];
        var save_onerror = onerror;
        onerror = function (errorMsg, url, lineNumber) {
          error = [
            lineNumber,
            errorMsg.replace('Uncaught ', '')
          ];
        };
        var element = document.createElement('script');
        element.appendChild(document.createTextNode(code));
        document.body.appendChild(element);
        onerror = save_onerror;
        return error;
      },
      //THREE
      sphere: function (s, x, y) {
        var divX = x || 12;
        var divY = y || 12;
        return new THREE.Mesh(new THREE.SphereGeometry(s, x, y), new THREE.MeshLambertMaterial());
      },
      cube: function (x, y, z, X, Y, Z) {
        var lx = x || 1;
        var ly = y || 1;
        var lz = z || 1;
        var divX = X || 1;
        var divY = Y || 1;
        var divZ = Z || 1;
        return new THREE.Mesh(new THREE.BoxGeometry(lx, ly, lz, divX, divY, divZ), new THREE.MeshLambertMaterial());
      },
      color: function (r, g, b) {
        return new THREE.Color(r, g, b);
      },
      vec: function (x, y, z) {
        return new THREE.Vector3(x, y, z);
      },
      newVec: function (x, y, z) {
        return new THREE.Vector3(x, y, z);
      },
      zeroVec: function () {
        return new THREE.Vector3(0, 0, 0);
      },
      vecToString: function (v) {
        return '(' + v.x + ',' + v.y + ',' + v.z + ')';
      },
      //array to vec
      toVec: function (src) {
        switch (src.length) {
        default:
          return new THREE.Vector2(src[0], src[1]);
        case 3:
          return new THREE.Vector3(src[0], src[1], src[2]);
        case 4:
          return new THREE.Vector4(src[0], src[1], src[2], src[3]);
        }
      },
      //Math
      hexChar: function (n) {
        return String.fromCharCode((n < 10 ? 48 : 87) + n);
      },
      hex: function (n) {
        return this.hexChar(n >> 4) + this.hexChar(n & 15);
      },
      isNumeric: function (v) {
        return !isNaN(v);
      },
      roundedString: function (v, nDigits) {
        var nd = nDigits === undefined ? 2 : nDigits;
        if (typeof v == 'string')
          v = parseFloat(v);
        var p = nd <= 0 ? 1 : nd == 1 ? 10 : nd == 2 ? 100 : 1000;
        var str = '' + Math.floor(p * Math.abs(v) + 0.5) / p;
        if (nDigits !== undefined && nd > 0) {
          var i = str.indexOf('.');
          if (i < 0) {
            str += '.';
            i = str.length - 1;
          }
          while (str.length - i < nd + 1)
            str += '0';
        }
        return (v < 0 ? '-' : '') + str;
      },
      lineIntersectLine: function (va, vb, vc, vd) {
        var a = [
          va.x,
          va.y
        ];
        var b = [
          vb.x,
          vb.y
        ];
        var c = [
          vc.x,
          vc.y
        ];
        var d = [
          vd.x,
          vd.y
        ];
        function L(a) {
          return a[0] * A[0] + a[1] * A[1];
        }
        // FIRST MAKE SURE [c,d] CROSSES [a,b].
        var A = [
          b[1] - a[1],
          a[0] - b[0]
        ];
        var tb = L(b);
        var tc = L(c);
        var td = L(d);
        if (tc > tb == td > tb)
          return null;
        // THEN FIND THE POINT OF INTERSECTION p.
        var f = (tb - tc) / (td - tc);
        var p = [
          lerp(f, c[0], d[0]),
          lerp(f, c[1], d[1])
        ];
        // THEN MAKE SURE p LIES BETWEEN a AND b.
        A = [
          b[0] - a[0],
          b[1] - a[1]
        ];
        var tp = L(p);
        var ta = L(a);
        tb = L(b);
        var vec = new THREE.Vector3(p[0], p[1], 0);
        return tp >= ta && tp <= tb ? vec : null;
      },
      ik: function (len1, len2, footIn, aimIn) {
        var foot = footIn.clone();
        var aim = aimIn.clone();
        var cc = foot.dot(foot);
        var x = (1 + (len1 * len1 - len2 * len2) / cc) / 2;
        var y = foot.dot(aim) / cc;
        foot.multiplyScalar(y);
        aim.sub(foot);
        y = Math.sqrt(Math.max(0, len1 * len1 - cc * x * x) / aim.dot(aim));
        return new THREE.Vector3(x * footIn.x + y * aim.x, x * footIn.y + y * aim.y, x * footIn.z + y * aim.z);
      }
    };
  };
  return TREE;
}();
utility_Modify = function () {
  var TREE = core;
  TREE.prototype.passFunc = function (array, func, GPU) {
    var accelerated = GPU || false;
    for (var i = 0; i < array.length; i += 2) {
      for (var j = 0; j < array[i].length; j++) {
        var process = this.makeList(array[i][j]);
        for (var k = 0; k < process.length; k++) {
          if (accelerated) {
            array[i + 1].GPU = true;
            if (process[k].name === undefined)
              this.arrayStringName(process);
            func(this.boneDictionary[process[k].name], array[i + 1]);
          } else {
            this.Move(process[k], func, array[i + 1]);
          }
        }
      }
    }
  };
  TREE.prototype.applyFunc = function (array, func, GPU) {
    //same as passFunc but modified for new organization
    var accelerated = GPU || false;
    for (var i = 0; i < array.length; i += 2) {
      for (var j = 0; j < array[i].length; j++) {
        if (accelerated)
          array[i + 1].GPU = true;
        if (array[i][j].name === undefined) {
          this.arrayStringName(array[i]);
        }
        if (GPU) {
          func(this.boneDictionary[array[i][j].name], array[i + 1]);
        } else {
          func.apply(this, [
            this.parts[array[i][j].name],
            array[i + 1]
          ]);
        }
      }
    }
  };
  TREE.prototype.setGeo = function (obj, args) {
    //swap out the geometry for the specified joint
    var jointGeo = args.jointGeo || obj.params.jointGeo;
    var ballGeo = args.ballGeo || obj.params.ballGeo;
    var ballGeo2 = args.ballGeo2 || ballGeo;
    obj.ballMesh.geometry = ballGeo;
    obj.ballMesh2.geometry = ballGeo2;
    obj.jointMesh.geometry = jointGeo;
  };
  TREE.prototype.aimAt = function (obj, args) {
    //aims selected joints at a target in world space
    //ugly solution, runs slowly
    var target = args.target || new THREE.Vector3(0, 0, 0);
    var tempParent = obj.parent;
    THREE.SceneUtils.detach(obj, tempParent, scene);
    //*ergh
    obj.lookAt(target);
    obj.rotation.y += Math.PI / 2;
    obj.parent.updateMatrixWorld();
    THREE.SceneUtils.attach(obj, scene, tempParent);
  };
  TREE.prototype.axisRotate = function (obj, args) {
    if (!args)
      args = {};
    var axis = args.axis || new THREE.Vector3(0, 0, 1);
    var radians = args.radians || 0;
    var parent;
    if (!obj.parent) {
      parent = this;
    } else
      parent = obj.parent;
    var tempMatrix = new THREE.Matrix4();
    var inverse = new THREE.Matrix4();
    var multed = new THREE.Matrix4();
    var quat = new THREE.Quaternion();
    inverse.getInverse(parent.matrixWorld);
    tempMatrix.makeRotationAxis(axis, radians);
    multed.multiplyMatrices(inverse, tempMatrix);
    // r56
    quat.setFromRotationMatrix(multed);
    var rot = new THREE.Vector3(axis.x, axis.y, axis.z);
    rot.applyQuaternion(quat);
    obj.quaternion.setFromAxisAngle(rot, radians);
    obj.updateMatrixWorld();
  };
  TREE.prototype.setJointLength = function (obj, args) {
    var len = args.length || obj.scalar.scale.y;
    obj.scalar.children[0].scale.y = len / obj.scalar.scale.y;
    obj.scalar.children[0].position.y = len / obj.scalar.scale.y / 2;
    for (var i = 2; i < obj.rotator.children.length; i++) {
      obj.rotator.children[i].position.y = len;
    }
    obj.ballMesh2.position.y = len;
    obj.childJoint.position.y = len;
  };
  TREE.prototype.setJointWidth = function (obj, args) {
    var wid = args.width || obj.scalar.scale.y;
    obj.scalar.scale.x = wid;
    obj.scalar.scale.z = wid;
    obj.ballMesh.scale.x = wid;
    obj.ballMesh.scale.z = wid;
  };
  TREE.prototype.appendObj = function (obj, args) {
    //append geometry to selected joint
    if (!args)
      args = {};
    var appendage = new THREE.Object3D();
    if (args.obj)
      appendage = args.obj.clone();
    var rx, ry, rz, sc, scx, scy, scz, tx, ty, tz;
    sc = args.sc || 1;
    if (args.sc) {
      scx = scy = scz = args.sc;
    } else {
      scx = args.scx || 1;
      scy = args.scy || 1;
      scz = args.scz || 1;
    }
    rx = args.rx || 0;
    ry = args.ry || 0;
    rz = args.rz || 0;
    tx = args.tx || 0;
    ty = args.ty || 0;
    tz = args.tz || 0;
    appendage.position = new THREE.Vector3(tx, ty, tz);
    appendage.rotation = new THREE.Euler(rx, ry, rz);
    appendage.scale = new THREE.Vector3(scx, scy, scz);
    obj.rotator.add(appendage);
    obj.parts.push(appendage);
  };
  TREE.prototype.appendTree = function (args, obj) {
    if (typeof obj === 'undefined')
      obj = this;
    var newTree = this.generate(args, obj);
  };
  TREE.prototype.appendBranch = function (obj, args) {
    console.warn('deprecated, use appendTree()');
  };
  TREE.prototype.transform = function (obj, args) {
    if (obj) {
      // console.log(obj);
      var rx, ry, rz, sc, scx, scy, scz, tx, ty, tz, off, offMult, freq, jOff, jMult, jFreq, jFract, jOffset, offsetter, offsetter2, offsetter3, offsetter4, jointOff, scoff, sjoff, nMult, nOff, nFreq, nFract, sinScaleMult, sinScale, sinOff, offScale, offScaleMult, offScaleOff, rotator, nObjOff, GPU;
      if (args) {
        sc = args.sc || 1;
        if (args.sc) {
          scx = scy = scz = args.sc;
        } else {
          scx = args.scx || 1;
          scy = args.scy || 1;
          scz = args.scz || 1;
        }
        rx = args.rx || 0;
        ry = args.ry || 0;
        rz = args.rz || 0;
        tx = args.tx || 0;
        ty = args.ty || 0;
        tz = args.tz || 0;
        off = args.off || 0;
        offMult = args.offMult || 0;
        freq = args.freq || 0;
        jOff = args.jOff || 0;
        jMult = args.jMult || 0;
        jFreq = args.jFreq || 0;
        jFract = args.jFract * obj.joint || 1;
        nMult = args.nMult || 0;
        nFreq = args.nFreq || 0;
        nObjOff = args.nObjOff || 0;
        nOff = args.nOff || 1;
        nFract = args.nFract * obj.joint || 1;
        jOffset = args.jOffset || 0;
        offsetter = args.offsetter || 0;
        offsetter2 = args.offsetter2 || 0;
        offsetter3 = args.offsetter3 || 0;
        offsetter4 = args.offsetter4 || 0;
        sinScale = args.sinScale || 1;
        sinScaleMult = args.sinScaleMult || 1;
        sinOff = args.sinOff || 0;
        offScale = args.offScale || 0;
        offScaleMult = args.offScaleMult || 1;
        offScaleOff = args.offScaleOff || 0;
        rotator = args.rotator || false;
        GPU = args.GPU || false;
      } else {
        rx = ry = rz = tx = ty = tz = sinOff = 0;
        sc = scx = scy = scz = freq = jFreq = jFract = offScaleMult = 1;
        off = offMult = jOff = jMult = jOffset = offsetter = offsetter2 = sinScale = sinScaleMult = nMult = nFreq = nOff = nFract = offScale = offScaleOff = offsetter4 = nObjOff = 0;
        GPU = rotator = false;
      }
      var objOffset = obj.offset;
      var objOffsetter = offsetter;
      if (offsetter2) {
        objOffset = obj.offset2;
        objOffsetter = offsetter2;
      }
      if (offsetter3) {
        objOffset = obj.parentJoint.joint;
        objOffsetter = offsetter3;
      }
      if (offsetter4) {
        objOffset = obj.parentJoint.parentJoint.joint;
        objOffsetter = offsetter4;
      }
      if (jMult || jOff || jMult || offMult || offsetter || offsetter2 || nMult) {
        var off1 = jFract * Math.sin(jOffset * objOffset + jOff + (jFreq * obj.joint + 1)) * jMult;
        var off2 = Math.sin(off + freq * objOffset) * offMult;
        var off3 = objOffset * objOffsetter;
        var off4 = nFract * (noise(nOff + (nFreq * obj.joint + (objOffset + 1) * nObjOff)) * nMult);
        jointOff = off3 + off2 + off1 + off4;
      } else
        jointOff = 0;
      if (args.sinScale || args.sinScaleMult) {
        scoff = Math.sin(obj.joint * sinScale + sinOff) * sinScaleMult;
      } else
        scoff = 0;
      if (args.offScale || args.offScaleOff || args.offScaleMult)
        sjoff = Math.sin(obj.parentJoint.joint * offScale + offScaleOff) * offScaleMult;
      else
        sjoff = 0;
      scalar = sjoff + scoff;
      if (GPU) {
        obj.rotator = obj;
        obj.rotator.rotation = obj._rotation;
      }
      var rotOb = obj.rotator;
      if (rotator)
        rotOb = obj;
      if (args.rx !== undefined)
        rotOb.rotation.x = rx + jointOff;
      if (args.ry !== undefined)
        rotOb.rotation.y = ry + jointOff;
      if (args.rz !== undefined)
        rotOb.rotation.z = rz + jointOff;
      if (args.tx !== undefined)
        obj.rotator.position.x = tx + jointOff;
      if (args.ty !== undefined)
        obj.rotator.position.y = ty + jointOff;
      if (args.tz !== undefined)
        obj.rotator.position.z = tz + jointOff;
      if (args.sc || args.scx || args.scy || args.scz);
      obj.rotator.scale = new THREE.Vector3(scx, scy, scz).addScalar(scalar);
      return obj;
    } else
      console.log(obj);
  };
  TREE.prototype.setScale = function (sc) {
    this.scale.x = sc;
    this.scale.y = sc;
    this.scale.z = sc;
  };
  TREE.prototype.findTopParent = function (obj) {
    var re;
    if (obj.parent.parent)
      re = findTopParent(obj.parent);
    else {
      re = obj;
    }
    return re;
  };
  return TREE;
}();
utility_Boolean = function () {
  var TREE = core;
  TREE.prototype.prepGeo = function (a, b) {
    var geo = [];
    geo[0] = a.geometry.clone();
    geo[1] = b.geometry.clone();
    b.updateMatrixWorld();
    a.updateMatrixWorld();
    for (var j = 0; j < 2; j++) {
      var g = geo[j];
      for (var i = 0; i < g.vertices.length; i++) {
        if (j === 0)
          g.vertices[i].applyMatrix4(a.matrixWorld);
        else
          g.vertices[i].applyMatrix4(b.matrixWorld);
      }
    }
    var csGeo = [];
    csGeo[0] = THREE.CSG.toCSG(geo[0]);
    csGeo[1] = THREE.CSG.toCSG(geo[1]);
    return csGeo;
  };
  TREE.prototype.union = function (a, b) {
    var csGeo = this.prepGeo(a, b);
    var res = csGeo[0].union(csGeo[1]);
    var geometryThree = THREE.CSG.fromCSG(res);
    var mesh = new THREE.Mesh(geometryThree, a.material);
    return geometryThree;
  };
  TREE.prototype.subtract = function (a, b) {
    var csGeo = this.prepGeo(a, b);
    var res = csGeo[0].subtract(csGeo[1]);
    var geometryThree = THREE.CSG.fromCSG(res);
    var mesh = new THREE.Mesh(geometryThree, a.material);
    return geometryThree;
  };
  TREE.prototype.intersect = function (a, b) {
    var csGeo = this.prepGeo(a, b);
    var res = csGeo[0].intersect(csGeo[1]);
    var geometryThree = THREE.CSG.fromCSG(res);
    var mesh = new THREE.Mesh(geometryThree, a.material);
    return geometryThree;
  };
  TREE.prototype.booleanArray = function (arr, type) {
  };
  return TREE;
}();
utility_Surface = function () {
  var TREE = core;
  TREE.prototype.crossHatch = function (arr, divsx, divsy) {
    //returns a 2 dimensional array which define lattitude and logitude lines
    //based on a 2 dimensional array input which defines lattitude lines
    //ie - the result of tree.worldPositionsArray(tree.report());
    divsX = divsx || arr.length;
    divsY = divsy || divsX;
    //create Y curves (to the original X)
    //create a new set of interpolated X curves based on those
    var curvesX = [];
    var curvesY = [];
    var curvesX2 = [];
    var curvesY2 = [];
    var pointsY = [];
    var pointsX = [];
    for (var i = 0; i < arr.length; i++) {
      curvesX.push(new THREE.SplineCurve3(arr[i]));
    }
    for (var i = 0; i <= divsX; i++) {
      var tempPoints = [];
      for (var j = 0; j < curvesX.length; j++) {
        tempPoints.push(curvesX[j].getPointAt(i / divsX));
      }
      pointsY.push(tempPoints);
    }
    for (var i = 0; i < pointsY.length; i++) {
      curvesY.push(new THREE.SplineCurve3(pointsY[i]));
    }
    for (var i = 0; i <= divsY; i++) {
      var tempPoints = [];
      for (var j = 0; j < curvesY.length; j++) {
        tempPoints.push(curvesY[j].getPointAt(i / divsY));
      }
      pointsX.push(tempPoints);
    }
    for (var i = 0; i < pointsY.length; i++) {
      var temp = [];
      for (var j = 0; j < pointsY[i].length; j++) {
        temp.push(pointsY[i][j]);
      }
      this.averagePoints(temp);
      curvesY2.push(temp);
    }
    for (var i = 0; i < pointsX.length; i++) {
      var temp = [];
      for (var j = 0; j < pointsX[i].length; j++) {
        temp.push(pointsX[i][j]);
      }
      this.averagePoints(temp);
      curvesX2.push(temp);
    }
    var XY = [];
    XY.push(curvesY2);
    XY.push(curvesX2);
    return XY;
  };
  TREE.prototype.openSurface = function (points) {
    //points is a 2 dimensional array of vectors
    //generate a parametric surface where each vertex is the position of each joint
    function makeSheet(u, v) {
      var c = points;
      var tempU = Math.round(u * c.length);
      var tempV = Math.round(v * c[0].length);
      if (u * c.length > c.length - 1) {
        tempU = c.length - 1;
      }
      if (v * c[0].length > c[0].length - 1) {
        tempV = c[0].length - 1;
      }
      return c[tempU][tempV];
    }
    var geo = new THREE.ParametricGeometry(makeSheet, points.length, points[0].length);
    geo.computeVertexNormals();
    return geo;
  };
  TREE.prototype.solidify = function (geo, offset, w, h) {
    //works with parametric geometry
    //extrudes along the normals and stitches the edges
    var width = w || 10;
    var height = h || 10;
    var vertsize = geo.vertices.length;
    var facesize = geo.faces.length;
    var tempVerts = [];
    var tempFaces = [];
    for (var i = 0; i < vertsize; i++) {
      geo.vertices.push(geo.vertices[i].clone());
    }
    for (var i = 0; i < facesize; i++) {
      geo.faces.push(geo.faces[i].clone());
    }
    for (var i = facesize; i < geo.faces.length; i++) {
      geo.faces[i].a = geo.faces[i].a + vertsize;
      geo.faces[i].b = geo.faces[i].b + vertsize;
      geo.faces[i].c = geo.faces[i].c + vertsize;
      if (geo.vertices[geo.faces[i].a].off != true) {
        geo.vertices[geo.faces[i].a].sub(geo.faces[i].normal.multiplyScalar(offset));
        geo.vertices[geo.faces[i].a].off = true;
      }
      if (geo.vertices[geo.faces[i].b].off != true) {
        if (i == facesize)
          //don't know why I have to do this - looks messy
          geo.vertices[geo.faces[i].b].sub(geo.faces[i].normal.multiplyScalar(offset / offset));
        else
          geo.vertices[geo.faces[i].b].sub(geo.faces[i].normal.multiplyScalar(offset));
        geo.vertices[geo.faces[i].b].off = true;
      }
      if (geo.vertices[geo.faces[i].c].off != true) {
        if (i == facesize)
          geo.vertices[geo.faces[i].c].sub(geo.faces[i].normal.multiplyScalar(offset / offset));
        else
          geo.vertices[geo.faces[i].c].sub(geo.faces[i].normal.multiplyScalar(offset));
        geo.vertices[geo.faces[i].c].off = true;
      }
    }
    for (var i = 0; i < geo.vertices.length; i++) {
      if (i < width - 1) {
        var a = i;
        var b = i + 1;
        var c = i + vertsize;
        var d = i + 1 + vertsize;
        geo.faces.push(new THREE.Face3(a, b, c));
        geo.faces.push(new THREE.Face3(d, c, b));
      }
      if (i < height - 1) {
        var a = i * (width + 1);
        var b = (i + 1) * (width + 1);
        var c = i * (width + 1) + vertsize;
        var d = i * (width + 1) + (width + 1) + vertsize;
        geo.faces.push(new THREE.Face3(c, b, a));
        geo.faces.push(new THREE.Face3(b, c, d));
      }
    }
  };
  TREE.prototype.solidSurface = function (points, offset) {
    var w = points.length;
    var h = points[0].length;
    var off = offset || 1;
    var geometry;
    geometry = this.openSurface(points);
    this.solidify(geometry, off, w, h);
    geometry.mergeVertices();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    var mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }));
    return mesh;
  };
  TREE.prototype.splitShells = function (obj) {
    this.geo = obj.geometry.clone();
    this.selected = [];
    this.objFaceTable = [];
    for (var i = 0; i < this.geo.faces.length; i++) {
      this.objFaceTable[i] = [];
      this.objFaceTable[i].a = this.geo.faces[i].a;
      this.objFaceTable[i].b = this.geo.faces[i].b;
      this.objFaceTable[i].c = this.geo.faces[i].c;
    }
    this.fillSelect = function (FaceNum, count) {
      if (FaceNum === undefined) {
        var faceNum = this.findUnvisited();
      } else
        var faceNum = FaceNum;
      if (count === undefined)
        var count = 0;
      var sf = this.geo.faces[faceNum];
      sf.visited = true;
      this.faceTable[sf.b + ',' + sf.a] = true;
      this.faceTable[sf.c + ',' + sf.b] = true;
      this.faceTable[sf.a + ',' + sf.c] = true;
      var q = 0;
      this.selected[this.selected.length - 1].push(sf);
      for (var i = 0; i < this.geo.faces.length; i++) {
        if (!this.geo.faces[i].visited) {
          var f = this.geo.faces[i];
          if (this.faceTable[f.a + ',' + f.b] || this.faceTable[f.b + ',' + f.c] || this.faceTable[f.c + ',' + f.a]) {
            f.visited = true;
            this.faceTable[f.b + ',' + f.a] = true;
            this.faceTable[f.c + ',' + f.b] = true;
            this.faceTable[f.a + ',' + f.c] = true;
            this.selected[this.selected.length - 1].push(f);
            if (count < 12)
              this.fillSelect(i, ++count);
          }
        }
      }
    };
    this.findUnvisited = function () {
      var r = -1;
      for (var i = 0; i < this.geo.faces.length; i++) {
        if (!this.geo.faces[i].visited) {
          r = i;
          i = this.geo.faces.length;
        }
      }
      return r;
    };
    this.removeVisited = function () {
      var newFaces = [];
      for (var i = 0; i < this.geo.faces.length; i++) {
        if (!this.geo.faces[i].visited)
          newFaces.push(this.geo.faces[i]);
      }
      return newFaces;
    };
    while (this.findUnvisited(this.geo) > -1) {
      this.faceTable = [];
      this.geo.faces = this.removeVisited();
      this.selected.push([]);
      this.fillSelect();
    }
    var bb = this.selected;
    var returnObj = new THREE.Object3D();
    for (var i = 0; i < bb.length; i++) {
      var geo = new THREE.Geometry();
      for (var j = 0; j < bb[i].length; j++) {
        geo.vertices.push(obj.geometry.vertices[bb[i][j].a]);
        geo.vertices.push(obj.geometry.vertices[bb[i][j].b]);
        geo.vertices.push(obj.geometry.vertices[bb[i][j].c]);
        geo.faces.push(new THREE.Face3());
        geo.faces[geo.faces.length - 1].a = geo.vertices.length - 3;
        geo.faces[geo.faces.length - 1].b = geo.vertices.length - 2;
        geo.faces[geo.faces.length - 1].c = geo.vertices.length - 1;
      }
      geo.mergeVertices();
      geo.computeFaceNormals();
      geo.computeVertexNormals();
      returnObj.add(new THREE.Mesh(geo, obj.material));
    }
    return returnObj;
  };
  TREE.prototype.easyBalls = function (args) {
    if (!args)
      args = {};
    var array = args.array || [];
    var size = args.size || 100;
    var res = args.resolution || 100;
    var ballSize = args.ballSize || 1;
    var animated = args.animated ? true : false;
    var balls = this.metaBalls.init();
    this.metaBalls.effect.animate = animated;
    this.metaBalls.setSize(size);
    this.metaBalls.setResolution(res);
    this.metaBalls.ballSize = ballSize;
    if (!animated) {
      this.metaBalls.updateBalls(array);
      return this.metaBalls.generateGeo();
    } else
      return balls;
  };
  TREE.prototype.metaBalls = {
    /*
    			setup:
    				bls = tree.metaBalls.init();
    				tree.metaBalls.effect.animate=true;
    				tree.metaBalls.setSize(60);
    				tree.metaBalls.setResolution(70);
    				tree.metaBalls.ballSize = 5.25;
    				tree.metaBalls.updateBalls();
    				scene.add(bls);
    			draw:
    				tree.metaBalls.updateBalls();
    
    		 */
    holder: new THREE.Object3D(),
    resolution: 100,
    size: 500,
    effect: 0,
    box: 0,
    ballSize: 1,
    divisions: 1,
    init: function () {
      if (this.holder.children.length > 0) {
        for (var i = 0; i < this.holder.children.length; i++) {
          this.holder.remove(this.holder.children[0]);
        }
      }
      this.effect = new THREE.MarchingCubes(this.resolution, new THREE.MeshLambertMaterial({ color: 16777215 }), true, true);
      this.effect.scale.set(this.size, this.size, this.size);
      this.box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({
        color: 16777215,
        transparent: true,
        opacity: 0.2
      })), this.box.scale.set(this.size * 2, this.size * 2, this.size * 2);
      this.holder.add(this.effect);
      return this.holder;
    },
    showBox: function () {
      this.holder.add(this.box);
    },
    hideBox: function () {
      this.holder.remove(this.box);
    },
    setSize: function (val) {
      this.size = val;
      var size = this.size;
      this.effect.scale.set(size, size, size);
      this.box.scale.set(size * 2, size * 2, size * 2);
    },
    setResolution: function (val) {
      this.resolution = val;
      this.init();
    },
    updateBalls: function (arr) {
      var balls, ballArr, flatArray;
      if (arr === undefined) {
        var report = this.treeParent.report();
        ballArr = this.treeParent.worldPositionsArray(report);
        flatArray = [];
        for (var i = 0; i < ballArr.length; i++) {
          for (var j = 0; j < ballArr[i].length; j++) {
            flatArray.push(ballArr[i][j]);
          }
        }
      }
      balls = arr || flatArray;
      this.effect.reset();
      // fill the field with some metaballs
      var ballx, bally, ballz, subtract, strength;
      subtract = 10;
      strength = this.ballSize * 0.005;
      for (i = 0; i < balls.length; i++) {
        ballx = (balls[i].x + this.size) * (1 / this.size / 2);
        bally = (balls[i].y + this.size) * (1 / this.size / 2);
        ballz = (balls[i].z + this.size) * (1 / this.size / 2);
        this.effect.addBall(ballx, bally, ballz, strength, subtract);
      }
    },
    generateGeo: function () {
      var geo = this.effect.generateGeometry();
      geo.verticesNeedUpdate = true;
      for (var j = 0; j < this.divisions; j++) {
        for (var i = 0; i < geo.vertices.length; i++) {
          (geo.vertices[i].x *= this.size) + this.size / 2;
          (geo.vertices[i].y *= this.size) + this.size / 2;
          (geo.vertices[i].z *= this.size) + this.size / 2;
        }
      }
      geo.mergeVertices();
      var obj = new THREE.Mesh(geo, new THREE.MeshLambertMaterial());
      return obj;
    }
  };
  return TREE;
}();
utility_Points = function () {
  var TREE = core;
  TREE.prototype.averagePoints = function (arr, amt) {
    //A single array of vectors to be averaged
    amount = amt || 0.5;
    for (var i = 1; i < arr.length - 1; i++) {
      now = arr[i];
      prev = arr[i - 1];
      next = arr[i + 1];
      var lerped = prev.clone();
      lerped.lerp(next, 0.5);
      now.lerp(lerped, amount);
    }
  };
  TREE.prototype.averageVertices = function (geo, iterations) {
    //averages the vertices of a geometry
    var amount = 0.5;
    var iter = iterations || 1;
    this.makeNeighbors = function (geo) {
      this.faceTable = {};
      for (var i = 0; i < geo.faces.length; i++) {
        var sf = geo.faces[i];
        this.faceTable[sf.b + ',' + sf.a] = true;
        this.faceTable[sf.c + ',' + sf.b] = true;
        this.faceTable[sf.a + ',' + sf.c] = true;
      }
      for (var i = 0; i < geo.vertices.length; i++) {
        var vert = geo.vertices[i];
        if (vert.neighbors === undefined)
          vert.neighbors = [];
        for (var j = 0; j < geo.vertices.length; j++) {
          if (this.faceTable[i + ',' + j] || this.faceTable[j + ',' + i])
            if (!this.checkDupNeighbors(vert, geo.vertices[j]))
              vert.neighbors.push(geo.vertices[j]);
        }
      }
    };
    this.checkDupNeighbors = function (vert, vCheck) {
      var q = false;
      for (var i = 0; i < vert.neighbors.length; i++) {
        if (vert.neighbors[i].equals(vCheck)) {
          q = true;
          i = vert.neighbors.length;
        }
      }
      return q;
    };
    this.makeNeighbors(geo);
    for (var k = 0; k < iter; k++) {
      for (var i = 0; i < geo.vertices.length; i++) {
        if (geo.vertices[i].neighbors.length > 0) {
          var avg = [];
          for (var j = 0; j < geo.vertices[i].neighbors.length; j++) {
            avg.push(geo.vertices[i].neighbors[j].clone());
          }
          var avgVec = new THREE.Vector3();
          for (j = 0; j < avg.length; j++) {
            avgVec.x += avg[j].x;
            avgVec.y += avg[j].y;
            avgVec.z += avg[j].z;
          }
          avgVec.x /= geo.vertices[i].neighbors.length;
          avgVec.y /= geo.vertices[i].neighbors.length;
          avgVec.z /= geo.vertices[i].neighbors.length;
          geo.vertices[i].avgVec = avgVec;
        } else
          console.warn('geometry requires neighbors');
      }
      for (var i = 0; i < geo.vertices.length; i++) {
        if (geo.vertices[i].avgVec)
          geo.vertices[i].lerp(geo.vertices[i].avgVec, amount);
        geo.verticesNeedUpdate = true;
      }
    }
    geo.computeFaceNormals();
    geo.computeVertexNormals();
  };
  TREE.prototype.removeZeroLength = function (arr, Min) {
    var min = Min || 0.0001;
    var newArr = [];
    for (var i = 0; i < arr.length; i++) {
      var temp = [];
      for (var j = 1; j < arr[i].length; j++) {
        now = arr[i][j];
        prev = arr[i][j - 1];
        if (j == 1)
          temp.push(arr[i][j - 1]);
        var checker = new THREE.Vector3(prev.x - now.x, prev.y - now.y, prev.z - now.z);
        if (!(checker.length() < min)) {
          temp.push(now);
        }
      }
      if (temp.length > 1) {
        newArr.push(temp);
      }
    }
    return newArr;
  };
  TREE.prototype.mergeMeshes = function (obj) {
    //take an array of geo and merge it
    var arr = [];
    obj.traverse(function (t) {
      if (t.geometry) {
        arr.push(t);
      }
    });
    var geo = new THREE.Geometry();
    for (var i = 0; i < arr.length; i++) {
      arr[i].parent.updateMatrixWorld();
      var temp = arr[i].clone();
      temp.applyMatrix(arr[i].parent.matrixWorld);
      THREE.GeometryUtils.merge(geo, temp);
    }
    geo.computeFaceNormals();
    geo.computeVertexNormals();
    return geo;
  };
  TREE.prototype.wrapGeo = function (geoToProject, collisionSurface, maxDistance) {
    //projects a mesh (on the outside) onto the faces of an object on the inside
    //requires that the outer mesh totally surrounds the inner mesh
    //geoToProject is geometry
    //collisionSurface is a Mesh
    var geo = geoToProject;
    var obj = collisionSurface;
    var dist = maxDistance || 100;
    var v;
    for (var i = 0; i < geo.faces.length; i++) {
      for (var q = 0; q < 3; q++) {
        if (q === 0)
          v = geo.vertices[geo.faces[i].a];
        else if (q === 1)
          v = geo.vertices[geo.faces[i].b];
        else
          v = geo.vertices[geo.faces[i].c];
        var n = geo.faces[i].vertexNormals[q];
        n.multiplyScalar(-1);
        var p = new THREE.Raycaster(v, n);
        var d = p.intersectObject(obj, true);
        if (d.length > 0) {
          if (d[0].distance < dist) {
            p = d[0].point;
            v.x = p.x;
            v.y = p.y;
            v.z = p.z;
            geo.verticesNeedUpdate = true;
          }
        }
      }
    }
    geo.mergeVertices();
    geo.computeFaceNormals();
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, obj.material);
  };
  return TREE;
}();
utility_Tubes = function () {
  var TREE = core;
  TREE.prototype.tubes = function (arr, args) {
    //takes a 2 dimensional array of vector3
    //use this.worldPositionsArray(tree.report()) to make such an array
    /*
    	args: {
    	lengSeths:divs between ctrl points,
    	widthSegs:radial segments,
    	minWidth:minimum width,
    	width:radius,
    	func:function(t){return value of function gets applied as radius, t is distance along spline}}
    */
    if (!args)
      args = {};
    var width = args.width || 1;
    var minWidth = args.minWidth || 0;
    var seg = args.lengthSegs || 1;
    var wseg = args.widthSegs || 6;
    var func = args.func || function (t) {
      return 0;
    };
    var geoObj = new THREE.Object3D();
    for (var i = 0; i < arr.length; i++) {
      //Building a duplicate curve to offset curve parameterization issue
      var dataCurveArray = [];
      var addX = 0;
      for (var j = 0; j < arr[i].length; j++) {
        var vecW = arr[i][j].w || 1;
        var worldWide = vecW + func(j, arr[i].length);
        addX += vecW;
        if (worldWide < minWidth)
          worldWide = minWidth;
        dataCurveArray.push(new THREE.Vector3(worldWide, addX, 0));
      }
      var dataCurve = new THREE.SplineCurve3(dataCurveArray);
      var curve = new THREE.SplineCurve3(arr[i]);
      curve.data = arr[i];
      curve.dataCurve = dataCurve;
      var geo = new THREE.TubeGeometry2(curve, arr[i].length * seg, width, wseg);
      var tube = new THREE.Mesh(geo, this.params.material);
      geoObj.add(tube);
      this.params.tubeGeo.push(tube);
    }
    return geoObj;
  };
  TREE.prototype.makeTubes = function (args) {
    return this.tubes(this.worldPositionsArray(this.report()), args);
  };
  TREE.prototype.animateTubes = function (w, scene) {
    // Rebuilds tube geometry and deletes the old geo
    while (this.params.tubeGeo.length > 0) {
      var obj = this.params.tubeGeo.pop();
      obj.parent.remove(obj);
      obj.geometry.dispose();
      obj = null;
    }
    this.params.tubeGeo = [];
    scene.add(this.makeTubes(w));
  };
  return TREE;
}();
utility_threeExtension = function () {
  /**
  * @author WestLangley / https://github.com/WestLangley
  * @author zz85 / https://github.com/zz85
  * @author miningold / https://github.com/miningold
  *
  * Modified from the TorusKnotGeometry by @oosmoxiecode
  *
  * Creates a tube which extrudes along a 3d spline
  *
  * Uses parallel transport frames as described in
  * http://www.cs.indiana.edu/pub/techreports/TR425.pdf
  */
  THREE.TubeGeometry2 = function (path, segments, radius, radialSegments, closed) {
    THREE.Geometry.call(this);
    this.path = path;
    this.segments = segments || 64;
    this.radius = radius || 1;
    this.radialSegments = radialSegments || 8;
    this.closed = closed || false;
    this.grid = [];
    var scope = this, tangent, normal, binormal, numpoints = this.segments + 1, x, y, z, tx, ty, tz, u, v, cx, cy, pos, pos2 = new THREE.Vector3(), i, j, ip, jp, a, b, c, d, uva, uvb, uvc, uvd;
    var frames = new THREE.TubeGeometry.FrenetFrames(this.path, this.segments, this.closed), tangents = frames.tangents, normals = frames.normals, binormals = frames.binormals;
    // proxy internals
    this.tangents = tangents;
    this.normals = normals;
    this.binormals = binormals;
    function vert(x, y, z) {
      return scope.vertices.push(new THREE.Vector3(x, y, z)) - 1;
    }
    function unvert(x, y, z) {
      return scope.vertices.unshift(new THREE.Vector3(x, y, z));
    }
    // consruct the grid
    var divisor = numpoints / path.data.length;
    var tempGridi = [];
    var tempGridj = [];
    for (i = 0; i < numpoints; i++) {
      if (!this.grid[i])
        this.grid[i] = [];
      var tempGrid = [];
      var rad = 1;
      if (path.data && i >= 0) {
        rad = path.data[Math.floor(i / divisor)].w;
      }
      if (rad < radius)
        rad = radius;
      u = i / (numpoints - 1);
      pos = path.getPointAt(u);
      pos2 = path.dataCurve.getPointAt(u);
      rad = pos2.x;
      tangent = tangents[i];
      normal = normals[i];
      binormal = binormals[i];
      if (i == 0) {
        for (j = 0; j < this.radialSegments; j++) {
          v = j / this.radialSegments * 2 * Math.PI;
          cx = -this.radius * Math.cos(v) * 0;
          // TODO: Hack: Negating it so it faces outside.
          cy = this.radius * Math.sin(v) * 0;
          pos2.copy(pos);
          pos2.x += cx * normal.x + cy * binormal.x;
          pos2.y += cx * normal.y + cy * binormal.y;
          pos2.z += cx * normal.z + cy * binormal.z;
          this.grid[i][j] = vert(pos2.x, pos2.y, pos2.z);
        }
      }
      for (j = 0; j < this.radialSegments; j++) {
        v = j / this.radialSegments * 2 * Math.PI;
        cx = -this.radius * Math.cos(v) * rad;
        // TODO: Hack: Negating it so it faces outside.
        cy = this.radius * Math.sin(v) * rad;
        pos2.copy(pos);
        pos2.x += cx * normal.x + cy * binormal.x;
        pos2.y += cx * normal.y + cy * binormal.y;
        pos2.z += cx * normal.z + cy * binormal.z;
        tempGrid[j] = vert(pos2.x, pos2.y, pos2.z);
      }
      this.grid.push(tempGrid);
      var newTemp = [];
      if (i == numpoints - 1) {
        for (j = 0; j < this.radialSegments; j++) {
          v = j / this.radialSegments * 2 * Math.PI;
          cx = -this.radius * Math.cos(v) * 0;
          // TODO: Hack: Negating it so it faces outside.
          cy = this.radius * Math.sin(v) * 0;
          pos2.copy(pos);
          pos2.x += cx * normal.x + cy * binormal.x;
          pos2.y += cx * normal.y + cy * binormal.y;
          pos2.z += cx * normal.z + cy * binormal.z;
          newTemp[j] = vert(pos2.x, pos2.y, pos2.z);
        }
        this.grid.push(newTemp);
      }
    }
    // construct the mesh
    for (i = 0; i < this.segments + 2; i++) {
      for (j = 0; j < this.radialSegments; j++) {
        ip = this.closed ? (i + 1) % this.segments : i + 1;
        jp = (j + 1) % this.radialSegments;
        a = this.grid[i][j];
        // *** NOT NECESSARILY PLANAR ! ***
        b = this.grid[ip][j];
        c = this.grid[ip][jp];
        d = this.grid[i][jp];
        uva = new THREE.Vector2(i / this.segments + 2, j / this.radialSegments);
        uvb = new THREE.Vector2((i + 1) / this.segments + 2, j / this.radialSegments);
        uvc = new THREE.Vector2((i + 1) / this.segments + 2, (j + 1) / this.radialSegments);
        uvd = new THREE.Vector2(i / this.segments + 2, (j + 1) / this.radialSegments);
        this.faces.push(new THREE.Face3(a, b, d));
        this.faceVertexUvs[0].push([
          uva,
          uvb,
          uvd
        ]);
        this.faces.push(new THREE.Face3(b, c, d));
        this.faceVertexUvs[0].push([
          uvb.clone(),
          uvc,
          uvd.clone()
        ]);
      }
    }
    this.computeCentroids();
    this.computeFaceNormals();
    this.computeVertexNormals();
  };
  THREE.TubeGeometry2.prototype = Object.create(THREE.Geometry.prototype);
  // For computing of Frenet frames, exposing the tangents, normals and binormals the spline
  THREE.TubeGeometry2.FrenetFrames = function (path, segments, closed) {
    var tangent = new THREE.Vector3(), normal = new THREE.Vector3(), binormal = new THREE.Vector3(), tangents = [], normals = [], binormals = [], vec = new THREE.Vector3(), mat = new THREE.Matrix4(), numpoints = segments + 1, theta, epsilon = 0.0001, smallest, tx, ty, tz, i, u, v;
    // expose internals
    this.tangents = tangents;
    this.normals = normals;
    this.binormals = binormals;
    // compute the tangent vectors for each segment on the path
    for (i = 0; i < numpoints; i++) {
      u = i / (numpoints - 1);
      tangents[i] = path.getTangentAt(u);
      tangents[i].normalize();
    }
    initialNormal3();
    function initialNormal1(lastBinormal) {
      // fixed start binormal. Has dangers of 0 vectors
      normals[0] = new THREE.Vector3();
      binormals[0] = new THREE.Vector3();
      if (lastBinormal === undefined)
        lastBinormal = new THREE.Vector3(0, 0, 1);
      normals[0].crossVectors(lastBinormal, tangents[0]).normalize();
      binormals[0].crossVectors(tangents[0], normals[0]).normalize();
    }
    function initialNormal2() {
      // This uses the Frenet-Serret formula for deriving binormal
      var t2 = path.getTangentAt(epsilon);
      normals[0] = new THREE.Vector3().subVectors(t2, tangents[0]).normalize();
      binormals[0] = new THREE.Vector3().crossVectors(tangents[0], normals[0]);
      normals[0].crossVectors(binormals[0], tangents[0]).normalize();
      // last binormal x tangent
      binormals[0].crossVectors(tangents[0], normals[0]).normalize();
    }
    function initialNormal3() {
      // select an initial normal vector perpenicular to the first tangent vector,
      // and in the direction of the smallest tangent xyz component
      normals[0] = new THREE.Vector3();
      binormals[0] = new THREE.Vector3();
      smallest = Number.MAX_VALUE;
      tx = Math.abs(tangents[0].x);
      ty = Math.abs(tangents[0].y);
      tz = Math.abs(tangents[0].z);
      if (tx <= smallest) {
        smallest = tx;
        normal.set(1, 0, 0);
      }
      if (ty <= smallest) {
        smallest = ty;
        normal.set(0, 1, 0);
      }
      if (tz <= smallest) {
        normal.set(0, 0, 1);
      }
      vec.crossVectors(tangents[0], normal).normalize();
      normals[0].crossVectors(tangents[0], vec);
      binormals[0].crossVectors(tangents[0], normals[0]);
    }
    // compute the slowly-varying normal and binormal vectors for each segment on the path
    for (i = 1; i < numpoints; i++) {
      normals[i] = normals[i - 1].clone();
      binormals[i] = binormals[i - 1].clone();
      vec.crossVectors(tangents[i - 1], tangents[i]);
      if (vec.length() > epsilon) {
        vec.normalize();
        theta = Math.acos(THREE.Math.clamp(tangents[i - 1].dot(tangents[i]), -1, 1));
        // clamp for floating pt errors
        normals[i].applyMatrix4(mat.makeRotationAxis(vec, theta));
      }
      binormals[i].crossVectors(tangents[i], normals[i]);
    }
    // if the curve is closed, postprocess the vectors so the first and last normal vectors are the same
    if (closed) {
      theta = Math.acos(THREE.Math.clamp(normals[0].dot(normals[numpoints - 1]), -1, 1));
      theta /= numpoints - 1;
      if (tangents[0].dot(vec.crossVectors(normals[0], normals[numpoints - 1])) > 0) {
        theta = -theta;
      }
      for (i = 1; i < numpoints; i++) {
        // twist a little...
        normals[i].applyMatrix4(mat.makeRotationAxis(tangents[i], theta * i));
        binormals[i].crossVectors(tangents[i], normals[i]);
      }
    }
  };
  /**
  * @author alteredq / http://alteredqualia.com/
  *
  * Port of greggman's ThreeD version of marching cubes to Three.js
  * http://webglsamples.googlecode.com/hg/blob/blob.html
  */
  THREE.MarchingCubes = function (resolution, material, enableUvs, enableColors) {
    THREE.ImmediateRenderObject.call(this);
    this.material = material;
    this.animate = true;
    this.enableUvs = enableUvs !== undefined ? enableUvs : false;
    this.enableColors = enableColors !== undefined ? enableColors : false;
    // functions have to be object properties
    // prototype functions kill performance
    // (tested and it was 4x slower !!!)
    this.init = function (resolution) {
      this.resolution = resolution;
      // parameters
      this.isolation = 80;
      // size of field, 32 is pushing it in Javascript :)
      this.size = resolution;
      this.size2 = this.size * this.size;
      this.size3 = this.size2 * this.size;
      this.halfsize = this.size / 2;
      // deltas
      this.delta = 2 / this.size;
      this.yd = this.size;
      this.zd = this.size2;
      this.field = new Float32Array(this.size3);
      this.normal_cache = new Float32Array(this.size3 * 3);
      // temp buffers used in polygonize
      this.vlist = new Float32Array(12 * 3);
      this.nlist = new Float32Array(12 * 3);
      this.firstDraw = true;
      // immediate render mode simulator
      this.maxCount = 4096;
      // TODO: find the fastest size for this buffer
      this.count = 0;
      this.hasPositions = false;
      this.hasNormals = false;
      this.hasColors = false;
      this.hasUvs = false;
      this.positionArray = new Float32Array(this.maxCount * 3);
      this.normalArray = new Float32Array(this.maxCount * 3);
      if (this.enableUvs) {
        this.uvArray = new Float32Array(this.maxCount * 2);
      }
      if (this.enableColors) {
        this.colorArray = new Float32Array(this.maxCount * 3);
      }
    };
    ///////////////////////
    // Polygonization
    ///////////////////////
    this.lerp = function (a, b, t) {
      return a + (b - a) * t;
    };
    this.VIntX = function (q, pout, nout, offset, isol, x, y, z, valp1, valp2) {
      var mu = (isol - valp1) / (valp2 - valp1), nc = this.normal_cache;
      pout[offset] = x + mu * this.delta;
      pout[offset + 1] = y;
      pout[offset + 2] = z;
      nout[offset] = this.lerp(nc[q], nc[q + 3], mu);
      nout[offset + 1] = this.lerp(nc[q + 1], nc[q + 4], mu);
      nout[offset + 2] = this.lerp(nc[q + 2], nc[q + 5], mu);
    };
    this.VIntY = function (q, pout, nout, offset, isol, x, y, z, valp1, valp2) {
      var mu = (isol - valp1) / (valp2 - valp1), nc = this.normal_cache;
      pout[offset] = x;
      pout[offset + 1] = y + mu * this.delta;
      pout[offset + 2] = z;
      var q2 = q + this.yd * 3;
      nout[offset] = this.lerp(nc[q], nc[q2], mu);
      nout[offset + 1] = this.lerp(nc[q + 1], nc[q2 + 1], mu);
      nout[offset + 2] = this.lerp(nc[q + 2], nc[q2 + 2], mu);
    };
    this.VIntZ = function (q, pout, nout, offset, isol, x, y, z, valp1, valp2) {
      var mu = (isol - valp1) / (valp2 - valp1), nc = this.normal_cache;
      pout[offset] = x;
      pout[offset + 1] = y;
      pout[offset + 2] = z + mu * this.delta;
      var q2 = q + this.zd * 3;
      nout[offset] = this.lerp(nc[q], nc[q2], mu);
      nout[offset + 1] = this.lerp(nc[q + 1], nc[q2 + 1], mu);
      nout[offset + 2] = this.lerp(nc[q + 2], nc[q2 + 2], mu);
    };
    this.compNorm = function (q) {
      var q3 = q * 3;
      if (this.normal_cache[q3] === 0) {
        this.normal_cache[q3] = this.field[q - 1] - this.field[q + 1];
        this.normal_cache[q3 + 1] = this.field[q - this.yd] - this.field[q + this.yd];
        this.normal_cache[q3 + 2] = this.field[q - this.zd] - this.field[q + this.zd];
      }
    };
    // Returns total number of triangles. Fills triangles.
    // (this is where most of time is spent - it's inner work of O(n3) loop )
    this.polygonize = function (fx, fy, fz, q, isol, renderCallback) {
      // cache indices
      var q1 = q + 1, qy = q + this.yd, qz = q + this.zd, q1y = q1 + this.yd, q1z = q1 + this.zd, qyz = q + this.yd + this.zd, q1yz = q1 + this.yd + this.zd;
      var cubeindex = 0, field0 = this.field[q], field1 = this.field[q1], field2 = this.field[qy], field3 = this.field[q1y], field4 = this.field[qz], field5 = this.field[q1z], field6 = this.field[qyz], field7 = this.field[q1yz];
      if (field0 < isol)
        cubeindex |= 1;
      if (field1 < isol)
        cubeindex |= 2;
      if (field2 < isol)
        cubeindex |= 8;
      if (field3 < isol)
        cubeindex |= 4;
      if (field4 < isol)
        cubeindex |= 16;
      if (field5 < isol)
        cubeindex |= 32;
      if (field6 < isol)
        cubeindex |= 128;
      if (field7 < isol)
        cubeindex |= 64;
      // if cube is entirely in/out of the surface - bail, nothing to draw
      var bits = THREE.edgeTable[cubeindex];
      if (bits === 0)
        return 0;
      var d = this.delta, fx2 = fx + d, fy2 = fy + d, fz2 = fz + d;
      // top of the cube
      if (bits & 1) {
        this.compNorm(q);
        this.compNorm(q1);
        this.VIntX(q * 3, this.vlist, this.nlist, 0, isol, fx, fy, fz, field0, field1);
      }
      if (bits & 2) {
        this.compNorm(q1);
        this.compNorm(q1y);
        this.VIntY(q1 * 3, this.vlist, this.nlist, 3, isol, fx2, fy, fz, field1, field3);
      }
      if (bits & 4) {
        this.compNorm(qy);
        this.compNorm(q1y);
        this.VIntX(qy * 3, this.vlist, this.nlist, 6, isol, fx, fy2, fz, field2, field3);
      }
      if (bits & 8) {
        this.compNorm(q);
        this.compNorm(qy);
        this.VIntY(q * 3, this.vlist, this.nlist, 9, isol, fx, fy, fz, field0, field2);
      }
      // bottom of the cube
      if (bits & 16) {
        this.compNorm(qz);
        this.compNorm(q1z);
        this.VIntX(qz * 3, this.vlist, this.nlist, 12, isol, fx, fy, fz2, field4, field5);
      }
      if (bits & 32) {
        this.compNorm(q1z);
        this.compNorm(q1yz);
        this.VIntY(q1z * 3, this.vlist, this.nlist, 15, isol, fx2, fy, fz2, field5, field7);
      }
      if (bits & 64) {
        this.compNorm(qyz);
        this.compNorm(q1yz);
        this.VIntX(qyz * 3, this.vlist, this.nlist, 18, isol, fx, fy2, fz2, field6, field7);
      }
      if (bits & 128) {
        this.compNorm(qz);
        this.compNorm(qyz);
        this.VIntY(qz * 3, this.vlist, this.nlist, 21, isol, fx, fy, fz2, field4, field6);
      }
      // vertical lines of the cube
      if (bits & 256) {
        this.compNorm(q);
        this.compNorm(qz);
        this.VIntZ(q * 3, this.vlist, this.nlist, 24, isol, fx, fy, fz, field0, field4);
      }
      if (bits & 512) {
        this.compNorm(q1);
        this.compNorm(q1z);
        this.VIntZ(q1 * 3, this.vlist, this.nlist, 27, isol, fx2, fy, fz, field1, field5);
      }
      if (bits & 1024) {
        this.compNorm(q1y);
        this.compNorm(q1yz);
        this.VIntZ(q1y * 3, this.vlist, this.nlist, 30, isol, fx2, fy2, fz, field3, field7);
      }
      if (bits & 2048) {
        this.compNorm(qy);
        this.compNorm(qyz);
        this.VIntZ(qy * 3, this.vlist, this.nlist, 33, isol, fx, fy2, fz, field2, field6);
      }
      cubeindex <<= 4;
      // re-purpose cubeindex into an offset into triTable
      var o1, o2, o3, numtris = 0, i = 0;
      // here is where triangles are created
      while (THREE.triTable[cubeindex + i] != -1) {
        o1 = cubeindex + i;
        o2 = o1 + 1;
        o3 = o1 + 2;
        this.posnormtriv(this.vlist, this.nlist, 3 * THREE.triTable[o1], 3 * THREE.triTable[o2], 3 * THREE.triTable[o3], renderCallback);
        i += 3;
        numtris++;
      }
      return numtris;
    };
    /////////////////////////////////////
    // Immediate render mode simulator
    /////////////////////////////////////
    this.posnormtriv = function (pos, norm, o1, o2, o3, renderCallback) {
      var c = this.count * 3;
      // positions
      this.positionArray[c] = pos[o1];
      this.positionArray[c + 1] = pos[o1 + 1];
      this.positionArray[c + 2] = pos[o1 + 2];
      this.positionArray[c + 3] = pos[o2];
      this.positionArray[c + 4] = pos[o2 + 1];
      this.positionArray[c + 5] = pos[o2 + 2];
      this.positionArray[c + 6] = pos[o3];
      this.positionArray[c + 7] = pos[o3 + 1];
      this.positionArray[c + 8] = pos[o3 + 2];
      // normals
      this.normalArray[c] = norm[o1];
      this.normalArray[c + 1] = norm[o1 + 1];
      this.normalArray[c + 2] = norm[o1 + 2];
      this.normalArray[c + 3] = norm[o2];
      this.normalArray[c + 4] = norm[o2 + 1];
      this.normalArray[c + 5] = norm[o2 + 2];
      this.normalArray[c + 6] = norm[o3];
      this.normalArray[c + 7] = norm[o3 + 1];
      this.normalArray[c + 8] = norm[o3 + 2];
      // uvs
      if (this.enableUvs) {
        var d = this.count * 2;
        this.uvArray[d] = pos[o1];
        this.uvArray[d + 1] = pos[o1 + 2];
        this.uvArray[d + 2] = pos[o2];
        this.uvArray[d + 3] = pos[o2 + 2];
        this.uvArray[d + 4] = pos[o3];
        this.uvArray[d + 5] = pos[o3 + 2];
      }
      // colors
      if (this.enableColors) {
        this.colorArray[c] = pos[o1];
        this.colorArray[c + 1] = pos[o1 + 1];
        this.colorArray[c + 2] = pos[o1 + 2];
        this.colorArray[c + 3] = pos[o2];
        this.colorArray[c + 4] = pos[o2 + 1];
        this.colorArray[c + 5] = pos[o2 + 2];
        this.colorArray[c + 6] = pos[o3];
        this.colorArray[c + 7] = pos[o3 + 1];
        this.colorArray[c + 8] = pos[o3 + 2];
      }
      this.count += 3;
      if (this.count >= this.maxCount - 3) {
        this.hasPositions = true;
        this.hasNormals = true;
        if (this.enableUvs) {
          this.hasUvs = true;
        }
        if (this.enableColors) {
          this.hasColors = true;
        }
        renderCallback(this);
      }
    };
    this.begin = function () {
      this.count = 0;
      this.hasPositions = false;
      this.hasNormals = false;
      this.hasUvs = false;
      this.hasColors = false;
    };
    this.end = function (renderCallback) {
      if (this.count === 0)
        return;
      for (var i = this.count * 3; i < this.positionArray.length; i++)
        this.positionArray[i] = 0;
      this.hasPositions = true;
      this.hasNormals = true;
      if (this.enableUvs) {
        this.hasUvs = true;
      }
      if (this.enableColors) {
        this.hasColors = true;
      }
      renderCallback(this);
    };
    /////////////////////////////////////
    // Metaballs
    /////////////////////////////////////
    // Adds a reciprocal ball (nice and blobby) that, to be fast, fades to zero after
    // a fixed distance, determined by strength and subtract.
    this.addBall = function (ballx, bally, ballz, strength, subtract) {
      // Let's solve the equation to find the radius:
      // 1.0 / (0.000001 + radius^2) * strength - subtract = 0
      // strength / (radius^2) = subtract
      // strength = subtract * radius^2
      // radius^2 = strength / subtract
      // radius = sqrt(strength / subtract)
      var radius = this.size * Math.sqrt(strength / subtract), zs = ballz * this.size, ys = bally * this.size, xs = ballx * this.size;
      var min_z = Math.floor(zs - radius);
      if (min_z < 1)
        min_z = 1;
      var max_z = Math.floor(zs + radius);
      if (max_z > this.size - 1)
        max_z = this.size - 1;
      var min_y = Math.floor(ys - radius);
      if (min_y < 1)
        min_y = 1;
      var max_y = Math.floor(ys + radius);
      if (max_y > this.size - 1)
        max_y = this.size - 1;
      var min_x = Math.floor(xs - radius);
      if (min_x < 1)
        min_x = 1;
      var max_x = Math.floor(xs + radius);
      if (max_x > this.size - 1)
        max_x = this.size - 1;
      // Don't polygonize in the outer layer because normals aren't
      // well-defined there.
      var x, y, z, y_offset, z_offset, fx, fy, fz, fz2, fy2, val;
      for (z = min_z; z < max_z; z++) {
        z_offset = this.size2 * z, fz = z / this.size - ballz, fz2 = fz * fz;
        for (y = min_y; y < max_y; y++) {
          y_offset = z_offset + this.size * y;
          fy = y / this.size - bally;
          fy2 = fy * fy;
          for (x = min_x; x < max_x; x++) {
            fx = x / this.size - ballx;
            val = strength / (0.000001 + fx * fx + fy2 + fz2) - subtract;
            if (val > 0)
              this.field[y_offset + x] += val;
          }
        }
      }
    };
    this.addPlaneX = function (strength, subtract) {
      var x, y, z, xx, val, xdiv, cxy,
        // cache attribute lookups
        size = this.size, yd = this.yd, zd = this.zd, field = this.field, dist = size * Math.sqrt(strength / subtract);
      if (dist > size)
        dist = size;
      for (x = 0; x < dist; x++) {
        xdiv = x / size;
        xx = xdiv * xdiv;
        val = strength / (0.0001 + xx) - subtract;
        if (val > 0) {
          for (y = 0; y < size; y++) {
            cxy = x + y * yd;
            for (z = 0; z < size; z++) {
              field[zd * z + cxy] += val;
            }
          }
        }
      }
    };
    this.addPlaneY = function (strength, subtract) {
      var x, y, z, yy, val, ydiv, cy, cxy,
        // cache attribute lookups
        size = this.size, yd = this.yd, zd = this.zd, field = this.field, dist = size * Math.sqrt(strength / subtract);
      if (dist > size)
        dist = size;
      for (y = 0; y < dist; y++) {
        ydiv = y / size;
        yy = ydiv * ydiv;
        val = strength / (0.0001 + yy) - subtract;
        if (val > 0) {
          cy = y * yd;
          for (x = 0; x < size; x++) {
            cxy = cy + x;
            for (z = 0; z < size; z++)
              field[zd * z + cxy] += val;
          }
        }
      }
    };
    this.addPlaneZ = function (strength, subtract) {
      var x, y, z, zz, val, zdiv, cz, cyz,
        // cache attribute lookups
        size = this.size, yd = this.yd, zd = this.zd, field = this.field, dist = size * Math.sqrt(strength / subtract);
      if (dist > size)
        dist = size;
      for (z = 0; z < dist; z++) {
        zdiv = z / size;
        zz = zdiv * zdiv;
        val = strength / (0.0001 + zz) - subtract;
        if (val > 0) {
          cz = zd * z;
          for (y = 0; y < size; y++) {
            cyz = cz + y * yd;
            for (x = 0; x < size; x++)
              field[cyz + x] += val;
          }
        }
      }
    };
    /////////////////////////////////////
    // Updates
    /////////////////////////////////////
    this.reset = function () {
      var i;
      // wipe the normal cache
      for (i = 0; i < this.size3; i++) {
        this.normal_cache[i * 3] = 0;
        this.field[i] = 0;
      }
    };
    this.render = function (renderCallback) {
      this.begin();
      // Triangulate. Yeah, this is slow.
      if (this.animate) {
        var q, x, y, z, fx, fy, fz, y_offset, z_offset, smin2 = this.size - 2;
        for (z = 1; z < smin2; z++) {
          z_offset = this.size2 * z;
          fz = (z - this.halfsize) / this.halfsize;
          //+ 1
          for (y = 1; y < smin2; y++) {
            y_offset = z_offset + this.size * y;
            fy = (y - this.halfsize) / this.halfsize;
            //+ 1
            for (x = 1; x < smin2; x++) {
              fx = (x - this.halfsize) / this.halfsize;
              //+ 1
              q = y_offset + x;
              this.polygonize(fx, fy, fz, q, this.isolation, renderCallback);
            }
          }
        }
      }
      this.end(renderCallback);
    };
    this.generateGeometry = function () {
      var start = 0, geo = new THREE.Geometry();
      var normals = [];
      var geo_callback = function (object) {
        var i, x, y, z, vertex, normal, face, a, b, c, na, nb, nc, nfaces;
        for (i = 0; i < object.count; i++) {
          a = i * 3;
          b = a + 1;
          c = a + 2;
          x = object.positionArray[a];
          y = object.positionArray[b];
          z = object.positionArray[c];
          vertex = new THREE.Vector3(x, y, z);
          x = object.normalArray[a];
          y = object.normalArray[b];
          z = object.normalArray[c];
          normal = new THREE.Vector3(x, y, z);
          normal.normalize();
          geo.vertices.push(vertex);
          normals.push(normal);
        }
        nfaces = object.count / 3;
        for (i = 0; i < nfaces; i++) {
          a = (start + i) * 3;
          b = a + 1;
          c = a + 2;
          na = normals[a];
          nb = normals[b];
          nc = normals[c];
          face = new THREE.Face3(a, b, c, [
            na,
            nb,
            nc
          ]);
          geo.faces.push(face);
        }
        start += nfaces;
        object.count = 0;
      };
      this.render(geo_callback);
      // console.log( "generated " + geo.faces.length + " triangles" );
      return geo;
    };
    this.init(resolution);
  };
  THREE.MarchingCubes.prototype = Object.create(THREE.ImmediateRenderObject.prototype);
  /////////////////////////////////////
  // Marching cubes lookup tables
  /////////////////////////////////////
  // These tables are straight from Paul Bourke's page:
  // http://local.wasp.uwa.edu.au/~pbourke/geometry/polygonise/
  // who in turn got them from Cory Gene Bloyd.
  THREE.edgeTable = new Int32Array([
    0,
    265,
    515,
    778,
    1030,
    1295,
    1541,
    1804,
    2060,
    2309,
    2575,
    2822,
    3082,
    3331,
    3593,
    3840,
    400,
    153,
    915,
    666,
    1430,
    1183,
    1941,
    1692,
    2460,
    2197,
    2975,
    2710,
    3482,
    3219,
    3993,
    3728,
    560,
    825,
    51,
    314,
    1590,
    1855,
    1077,
    1340,
    2620,
    2869,
    2111,
    2358,
    3642,
    3891,
    3129,
    3376,
    928,
    681,
    419,
    170,
    1958,
    1711,
    1445,
    1196,
    2988,
    2725,
    2479,
    2214,
    4010,
    3747,
    3497,
    3232,
    1120,
    1385,
    1635,
    1898,
    102,
    367,
    613,
    876,
    3180,
    3429,
    3695,
    3942,
    2154,
    2403,
    2665,
    2912,
    1520,
    1273,
    2035,
    1786,
    502,
    255,
    1013,
    764,
    3580,
    3317,
    4095,
    3830,
    2554,
    2291,
    3065,
    2800,
    1616,
    1881,
    1107,
    1370,
    598,
    863,
    85,
    348,
    3676,
    3925,
    3167,
    3414,
    2650,
    2899,
    2137,
    2384,
    1984,
    1737,
    1475,
    1226,
    966,
    719,
    453,
    204,
    4044,
    3781,
    3535,
    3270,
    3018,
    2755,
    2505,
    2240,
    2240,
    2505,
    2755,
    3018,
    3270,
    3535,
    3781,
    4044,
    204,
    453,
    719,
    966,
    1226,
    1475,
    1737,
    1984,
    2384,
    2137,
    2899,
    2650,
    3414,
    3167,
    3925,
    3676,
    348,
    85,
    863,
    598,
    1370,
    1107,
    1881,
    1616,
    2800,
    3065,
    2291,
    2554,
    3830,
    4095,
    3317,
    3580,
    764,
    1013,
    255,
    502,
    1786,
    2035,
    1273,
    1520,
    2912,
    2665,
    2403,
    2154,
    3942,
    3695,
    3429,
    3180,
    876,
    613,
    367,
    102,
    1898,
    1635,
    1385,
    1120,
    3232,
    3497,
    3747,
    4010,
    2214,
    2479,
    2725,
    2988,
    1196,
    1445,
    1711,
    1958,
    170,
    419,
    681,
    928,
    3376,
    3129,
    3891,
    3642,
    2358,
    2111,
    2869,
    2620,
    1340,
    1077,
    1855,
    1590,
    314,
    51,
    825,
    560,
    3728,
    3993,
    3219,
    3482,
    2710,
    2975,
    2197,
    2460,
    1692,
    1941,
    1183,
    1430,
    666,
    915,
    153,
    400,
    3840,
    3593,
    3331,
    3082,
    2822,
    2575,
    2309,
    2060,
    1804,
    1541,
    1295,
    1030,
    778,
    515,
    265,
    0
  ]);
  THREE.triTable = new Int32Array([
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    8,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    1,
    9,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    8,
    3,
    9,
    8,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    2,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    8,
    3,
    1,
    2,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    2,
    10,
    0,
    2,
    9,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    8,
    3,
    2,
    10,
    8,
    10,
    9,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    11,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    11,
    2,
    8,
    11,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    9,
    0,
    2,
    3,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    11,
    2,
    1,
    9,
    11,
    9,
    8,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    10,
    1,
    11,
    10,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    10,
    1,
    0,
    8,
    10,
    8,
    11,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    9,
    0,
    3,
    11,
    9,
    11,
    10,
    9,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    8,
    10,
    10,
    8,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    7,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    3,
    0,
    7,
    3,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    1,
    9,
    8,
    4,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    1,
    9,
    4,
    7,
    1,
    7,
    3,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    2,
    10,
    8,
    4,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    4,
    7,
    3,
    0,
    4,
    1,
    2,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    2,
    10,
    9,
    0,
    2,
    8,
    4,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    10,
    9,
    2,
    9,
    7,
    2,
    7,
    3,
    7,
    9,
    4,
    -1,
    -1,
    -1,
    -1,
    8,
    4,
    7,
    3,
    11,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    11,
    4,
    7,
    11,
    2,
    4,
    2,
    0,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    0,
    1,
    8,
    4,
    7,
    2,
    3,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    7,
    11,
    9,
    4,
    11,
    9,
    11,
    2,
    9,
    2,
    1,
    -1,
    -1,
    -1,
    -1,
    3,
    10,
    1,
    3,
    11,
    10,
    7,
    8,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    11,
    10,
    1,
    4,
    11,
    1,
    0,
    4,
    7,
    11,
    4,
    -1,
    -1,
    -1,
    -1,
    4,
    7,
    8,
    9,
    0,
    11,
    9,
    11,
    10,
    11,
    0,
    3,
    -1,
    -1,
    -1,
    -1,
    4,
    7,
    11,
    4,
    11,
    9,
    9,
    11,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    5,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    5,
    4,
    0,
    8,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    5,
    4,
    1,
    5,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    8,
    5,
    4,
    8,
    3,
    5,
    3,
    1,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    2,
    10,
    9,
    5,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    0,
    8,
    1,
    2,
    10,
    4,
    9,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    5,
    2,
    10,
    5,
    4,
    2,
    4,
    0,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    10,
    5,
    3,
    2,
    5,
    3,
    5,
    4,
    3,
    4,
    8,
    -1,
    -1,
    -1,
    -1,
    9,
    5,
    4,
    2,
    3,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    11,
    2,
    0,
    8,
    11,
    4,
    9,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    5,
    4,
    0,
    1,
    5,
    2,
    3,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    1,
    5,
    2,
    5,
    8,
    2,
    8,
    11,
    4,
    8,
    5,
    -1,
    -1,
    -1,
    -1,
    10,
    3,
    11,
    10,
    1,
    3,
    9,
    5,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    9,
    5,
    0,
    8,
    1,
    8,
    10,
    1,
    8,
    11,
    10,
    -1,
    -1,
    -1,
    -1,
    5,
    4,
    0,
    5,
    0,
    11,
    5,
    11,
    10,
    11,
    0,
    3,
    -1,
    -1,
    -1,
    -1,
    5,
    4,
    8,
    5,
    8,
    10,
    10,
    8,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    7,
    8,
    5,
    7,
    9,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    3,
    0,
    9,
    5,
    3,
    5,
    7,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    7,
    8,
    0,
    1,
    7,
    1,
    5,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    5,
    3,
    3,
    5,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    7,
    8,
    9,
    5,
    7,
    10,
    1,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    10,
    1,
    2,
    9,
    5,
    0,
    5,
    3,
    0,
    5,
    7,
    3,
    -1,
    -1,
    -1,
    -1,
    8,
    0,
    2,
    8,
    2,
    5,
    8,
    5,
    7,
    10,
    5,
    2,
    -1,
    -1,
    -1,
    -1,
    2,
    10,
    5,
    2,
    5,
    3,
    3,
    5,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    7,
    9,
    5,
    7,
    8,
    9,
    3,
    11,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    5,
    7,
    9,
    7,
    2,
    9,
    2,
    0,
    2,
    7,
    11,
    -1,
    -1,
    -1,
    -1,
    2,
    3,
    11,
    0,
    1,
    8,
    1,
    7,
    8,
    1,
    5,
    7,
    -1,
    -1,
    -1,
    -1,
    11,
    2,
    1,
    11,
    1,
    7,
    7,
    1,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    5,
    8,
    8,
    5,
    7,
    10,
    1,
    3,
    10,
    3,
    11,
    -1,
    -1,
    -1,
    -1,
    5,
    7,
    0,
    5,
    0,
    9,
    7,
    11,
    0,
    1,
    0,
    10,
    11,
    10,
    0,
    -1,
    11,
    10,
    0,
    11,
    0,
    3,
    10,
    5,
    0,
    8,
    0,
    7,
    5,
    7,
    0,
    -1,
    11,
    10,
    5,
    7,
    11,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    10,
    6,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    8,
    3,
    5,
    10,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    0,
    1,
    5,
    10,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    8,
    3,
    1,
    9,
    8,
    5,
    10,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    6,
    5,
    2,
    6,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    6,
    5,
    1,
    2,
    6,
    3,
    0,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    6,
    5,
    9,
    0,
    6,
    0,
    2,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    5,
    9,
    8,
    5,
    8,
    2,
    5,
    2,
    6,
    3,
    2,
    8,
    -1,
    -1,
    -1,
    -1,
    2,
    3,
    11,
    10,
    6,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    11,
    0,
    8,
    11,
    2,
    0,
    10,
    6,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    1,
    9,
    2,
    3,
    11,
    5,
    10,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    5,
    10,
    6,
    1,
    9,
    2,
    9,
    11,
    2,
    9,
    8,
    11,
    -1,
    -1,
    -1,
    -1,
    6,
    3,
    11,
    6,
    5,
    3,
    5,
    1,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    8,
    11,
    0,
    11,
    5,
    0,
    5,
    1,
    5,
    11,
    6,
    -1,
    -1,
    -1,
    -1,
    3,
    11,
    6,
    0,
    3,
    6,
    0,
    6,
    5,
    0,
    5,
    9,
    -1,
    -1,
    -1,
    -1,
    6,
    5,
    9,
    6,
    9,
    11,
    11,
    9,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    5,
    10,
    6,
    4,
    7,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    3,
    0,
    4,
    7,
    3,
    6,
    5,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    9,
    0,
    5,
    10,
    6,
    8,
    4,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    10,
    6,
    5,
    1,
    9,
    7,
    1,
    7,
    3,
    7,
    9,
    4,
    -1,
    -1,
    -1,
    -1,
    6,
    1,
    2,
    6,
    5,
    1,
    4,
    7,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    2,
    5,
    5,
    2,
    6,
    3,
    0,
    4,
    3,
    4,
    7,
    -1,
    -1,
    -1,
    -1,
    8,
    4,
    7,
    9,
    0,
    5,
    0,
    6,
    5,
    0,
    2,
    6,
    -1,
    -1,
    -1,
    -1,
    7,
    3,
    9,
    7,
    9,
    4,
    3,
    2,
    9,
    5,
    9,
    6,
    2,
    6,
    9,
    -1,
    3,
    11,
    2,
    7,
    8,
    4,
    10,
    6,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    5,
    10,
    6,
    4,
    7,
    2,
    4,
    2,
    0,
    2,
    7,
    11,
    -1,
    -1,
    -1,
    -1,
    0,
    1,
    9,
    4,
    7,
    8,
    2,
    3,
    11,
    5,
    10,
    6,
    -1,
    -1,
    -1,
    -1,
    9,
    2,
    1,
    9,
    11,
    2,
    9,
    4,
    11,
    7,
    11,
    4,
    5,
    10,
    6,
    -1,
    8,
    4,
    7,
    3,
    11,
    5,
    3,
    5,
    1,
    5,
    11,
    6,
    -1,
    -1,
    -1,
    -1,
    5,
    1,
    11,
    5,
    11,
    6,
    1,
    0,
    11,
    7,
    11,
    4,
    0,
    4,
    11,
    -1,
    0,
    5,
    9,
    0,
    6,
    5,
    0,
    3,
    6,
    11,
    6,
    3,
    8,
    4,
    7,
    -1,
    6,
    5,
    9,
    6,
    9,
    11,
    4,
    7,
    9,
    7,
    11,
    9,
    -1,
    -1,
    -1,
    -1,
    10,
    4,
    9,
    6,
    4,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    10,
    6,
    4,
    9,
    10,
    0,
    8,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    10,
    0,
    1,
    10,
    6,
    0,
    6,
    4,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    8,
    3,
    1,
    8,
    1,
    6,
    8,
    6,
    4,
    6,
    1,
    10,
    -1,
    -1,
    -1,
    -1,
    1,
    4,
    9,
    1,
    2,
    4,
    2,
    6,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    0,
    8,
    1,
    2,
    9,
    2,
    4,
    9,
    2,
    6,
    4,
    -1,
    -1,
    -1,
    -1,
    0,
    2,
    4,
    4,
    2,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    8,
    3,
    2,
    8,
    2,
    4,
    4,
    2,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    10,
    4,
    9,
    10,
    6,
    4,
    11,
    2,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    8,
    2,
    2,
    8,
    11,
    4,
    9,
    10,
    4,
    10,
    6,
    -1,
    -1,
    -1,
    -1,
    3,
    11,
    2,
    0,
    1,
    6,
    0,
    6,
    4,
    6,
    1,
    10,
    -1,
    -1,
    -1,
    -1,
    6,
    4,
    1,
    6,
    1,
    10,
    4,
    8,
    1,
    2,
    1,
    11,
    8,
    11,
    1,
    -1,
    9,
    6,
    4,
    9,
    3,
    6,
    9,
    1,
    3,
    11,
    6,
    3,
    -1,
    -1,
    -1,
    -1,
    8,
    11,
    1,
    8,
    1,
    0,
    11,
    6,
    1,
    9,
    1,
    4,
    6,
    4,
    1,
    -1,
    3,
    11,
    6,
    3,
    6,
    0,
    0,
    6,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    6,
    4,
    8,
    11,
    6,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    7,
    10,
    6,
    7,
    8,
    10,
    8,
    9,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    7,
    3,
    0,
    10,
    7,
    0,
    9,
    10,
    6,
    7,
    10,
    -1,
    -1,
    -1,
    -1,
    10,
    6,
    7,
    1,
    10,
    7,
    1,
    7,
    8,
    1,
    8,
    0,
    -1,
    -1,
    -1,
    -1,
    10,
    6,
    7,
    10,
    7,
    1,
    1,
    7,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    2,
    6,
    1,
    6,
    8,
    1,
    8,
    9,
    8,
    6,
    7,
    -1,
    -1,
    -1,
    -1,
    2,
    6,
    9,
    2,
    9,
    1,
    6,
    7,
    9,
    0,
    9,
    3,
    7,
    3,
    9,
    -1,
    7,
    8,
    0,
    7,
    0,
    6,
    6,
    0,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    7,
    3,
    2,
    6,
    7,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    3,
    11,
    10,
    6,
    8,
    10,
    8,
    9,
    8,
    6,
    7,
    -1,
    -1,
    -1,
    -1,
    2,
    0,
    7,
    2,
    7,
    11,
    0,
    9,
    7,
    6,
    7,
    10,
    9,
    10,
    7,
    -1,
    1,
    8,
    0,
    1,
    7,
    8,
    1,
    10,
    7,
    6,
    7,
    10,
    2,
    3,
    11,
    -1,
    11,
    2,
    1,
    11,
    1,
    7,
    10,
    6,
    1,
    6,
    7,
    1,
    -1,
    -1,
    -1,
    -1,
    8,
    9,
    6,
    8,
    6,
    7,
    9,
    1,
    6,
    11,
    6,
    3,
    1,
    3,
    6,
    -1,
    0,
    9,
    1,
    11,
    6,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    7,
    8,
    0,
    7,
    0,
    6,
    3,
    11,
    0,
    11,
    6,
    0,
    -1,
    -1,
    -1,
    -1,
    7,
    11,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    7,
    6,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    0,
    8,
    11,
    7,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    1,
    9,
    11,
    7,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    8,
    1,
    9,
    8,
    3,
    1,
    11,
    7,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    10,
    1,
    2,
    6,
    11,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    2,
    10,
    3,
    0,
    8,
    6,
    11,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    9,
    0,
    2,
    10,
    9,
    6,
    11,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    6,
    11,
    7,
    2,
    10,
    3,
    10,
    8,
    3,
    10,
    9,
    8,
    -1,
    -1,
    -1,
    -1,
    7,
    2,
    3,
    6,
    2,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    7,
    0,
    8,
    7,
    6,
    0,
    6,
    2,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    7,
    6,
    2,
    3,
    7,
    0,
    1,
    9,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    6,
    2,
    1,
    8,
    6,
    1,
    9,
    8,
    8,
    7,
    6,
    -1,
    -1,
    -1,
    -1,
    10,
    7,
    6,
    10,
    1,
    7,
    1,
    3,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    10,
    7,
    6,
    1,
    7,
    10,
    1,
    8,
    7,
    1,
    0,
    8,
    -1,
    -1,
    -1,
    -1,
    0,
    3,
    7,
    0,
    7,
    10,
    0,
    10,
    9,
    6,
    10,
    7,
    -1,
    -1,
    -1,
    -1,
    7,
    6,
    10,
    7,
    10,
    8,
    8,
    10,
    9,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    6,
    8,
    4,
    11,
    8,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    6,
    11,
    3,
    0,
    6,
    0,
    4,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    8,
    6,
    11,
    8,
    4,
    6,
    9,
    0,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    4,
    6,
    9,
    6,
    3,
    9,
    3,
    1,
    11,
    3,
    6,
    -1,
    -1,
    -1,
    -1,
    6,
    8,
    4,
    6,
    11,
    8,
    2,
    10,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    2,
    10,
    3,
    0,
    11,
    0,
    6,
    11,
    0,
    4,
    6,
    -1,
    -1,
    -1,
    -1,
    4,
    11,
    8,
    4,
    6,
    11,
    0,
    2,
    9,
    2,
    10,
    9,
    -1,
    -1,
    -1,
    -1,
    10,
    9,
    3,
    10,
    3,
    2,
    9,
    4,
    3,
    11,
    3,
    6,
    4,
    6,
    3,
    -1,
    8,
    2,
    3,
    8,
    4,
    2,
    4,
    6,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    4,
    2,
    4,
    6,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    9,
    0,
    2,
    3,
    4,
    2,
    4,
    6,
    4,
    3,
    8,
    -1,
    -1,
    -1,
    -1,
    1,
    9,
    4,
    1,
    4,
    2,
    2,
    4,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    8,
    1,
    3,
    8,
    6,
    1,
    8,
    4,
    6,
    6,
    10,
    1,
    -1,
    -1,
    -1,
    -1,
    10,
    1,
    0,
    10,
    0,
    6,
    6,
    0,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    6,
    3,
    4,
    3,
    8,
    6,
    10,
    3,
    0,
    3,
    9,
    10,
    9,
    3,
    -1,
    10,
    9,
    4,
    6,
    10,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    9,
    5,
    7,
    6,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    8,
    3,
    4,
    9,
    5,
    11,
    7,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    5,
    0,
    1,
    5,
    4,
    0,
    7,
    6,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    11,
    7,
    6,
    8,
    3,
    4,
    3,
    5,
    4,
    3,
    1,
    5,
    -1,
    -1,
    -1,
    -1,
    9,
    5,
    4,
    10,
    1,
    2,
    7,
    6,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    6,
    11,
    7,
    1,
    2,
    10,
    0,
    8,
    3,
    4,
    9,
    5,
    -1,
    -1,
    -1,
    -1,
    7,
    6,
    11,
    5,
    4,
    10,
    4,
    2,
    10,
    4,
    0,
    2,
    -1,
    -1,
    -1,
    -1,
    3,
    4,
    8,
    3,
    5,
    4,
    3,
    2,
    5,
    10,
    5,
    2,
    11,
    7,
    6,
    -1,
    7,
    2,
    3,
    7,
    6,
    2,
    5,
    4,
    9,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    5,
    4,
    0,
    8,
    6,
    0,
    6,
    2,
    6,
    8,
    7,
    -1,
    -1,
    -1,
    -1,
    3,
    6,
    2,
    3,
    7,
    6,
    1,
    5,
    0,
    5,
    4,
    0,
    -1,
    -1,
    -1,
    -1,
    6,
    2,
    8,
    6,
    8,
    7,
    2,
    1,
    8,
    4,
    8,
    5,
    1,
    5,
    8,
    -1,
    9,
    5,
    4,
    10,
    1,
    6,
    1,
    7,
    6,
    1,
    3,
    7,
    -1,
    -1,
    -1,
    -1,
    1,
    6,
    10,
    1,
    7,
    6,
    1,
    0,
    7,
    8,
    7,
    0,
    9,
    5,
    4,
    -1,
    4,
    0,
    10,
    4,
    10,
    5,
    0,
    3,
    10,
    6,
    10,
    7,
    3,
    7,
    10,
    -1,
    7,
    6,
    10,
    7,
    10,
    8,
    5,
    4,
    10,
    4,
    8,
    10,
    -1,
    -1,
    -1,
    -1,
    6,
    9,
    5,
    6,
    11,
    9,
    11,
    8,
    9,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    6,
    11,
    0,
    6,
    3,
    0,
    5,
    6,
    0,
    9,
    5,
    -1,
    -1,
    -1,
    -1,
    0,
    11,
    8,
    0,
    5,
    11,
    0,
    1,
    5,
    5,
    6,
    11,
    -1,
    -1,
    -1,
    -1,
    6,
    11,
    3,
    6,
    3,
    5,
    5,
    3,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    2,
    10,
    9,
    5,
    11,
    9,
    11,
    8,
    11,
    5,
    6,
    -1,
    -1,
    -1,
    -1,
    0,
    11,
    3,
    0,
    6,
    11,
    0,
    9,
    6,
    5,
    6,
    9,
    1,
    2,
    10,
    -1,
    11,
    8,
    5,
    11,
    5,
    6,
    8,
    0,
    5,
    10,
    5,
    2,
    0,
    2,
    5,
    -1,
    6,
    11,
    3,
    6,
    3,
    5,
    2,
    10,
    3,
    10,
    5,
    3,
    -1,
    -1,
    -1,
    -1,
    5,
    8,
    9,
    5,
    2,
    8,
    5,
    6,
    2,
    3,
    8,
    2,
    -1,
    -1,
    -1,
    -1,
    9,
    5,
    6,
    9,
    6,
    0,
    0,
    6,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    5,
    8,
    1,
    8,
    0,
    5,
    6,
    8,
    3,
    8,
    2,
    6,
    2,
    8,
    -1,
    1,
    5,
    6,
    2,
    1,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    3,
    6,
    1,
    6,
    10,
    3,
    8,
    6,
    5,
    6,
    9,
    8,
    9,
    6,
    -1,
    10,
    1,
    0,
    10,
    0,
    6,
    9,
    5,
    0,
    5,
    6,
    0,
    -1,
    -1,
    -1,
    -1,
    0,
    3,
    8,
    5,
    6,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    10,
    5,
    6,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    11,
    5,
    10,
    7,
    5,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    11,
    5,
    10,
    11,
    7,
    5,
    8,
    3,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    5,
    11,
    7,
    5,
    10,
    11,
    1,
    9,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    10,
    7,
    5,
    10,
    11,
    7,
    9,
    8,
    1,
    8,
    3,
    1,
    -1,
    -1,
    -1,
    -1,
    11,
    1,
    2,
    11,
    7,
    1,
    7,
    5,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    8,
    3,
    1,
    2,
    7,
    1,
    7,
    5,
    7,
    2,
    11,
    -1,
    -1,
    -1,
    -1,
    9,
    7,
    5,
    9,
    2,
    7,
    9,
    0,
    2,
    2,
    11,
    7,
    -1,
    -1,
    -1,
    -1,
    7,
    5,
    2,
    7,
    2,
    11,
    5,
    9,
    2,
    3,
    2,
    8,
    9,
    8,
    2,
    -1,
    2,
    5,
    10,
    2,
    3,
    5,
    3,
    7,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    8,
    2,
    0,
    8,
    5,
    2,
    8,
    7,
    5,
    10,
    2,
    5,
    -1,
    -1,
    -1,
    -1,
    9,
    0,
    1,
    5,
    10,
    3,
    5,
    3,
    7,
    3,
    10,
    2,
    -1,
    -1,
    -1,
    -1,
    9,
    8,
    2,
    9,
    2,
    1,
    8,
    7,
    2,
    10,
    2,
    5,
    7,
    5,
    2,
    -1,
    1,
    3,
    5,
    3,
    7,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    8,
    7,
    0,
    7,
    1,
    1,
    7,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    0,
    3,
    9,
    3,
    5,
    5,
    3,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    8,
    7,
    5,
    9,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    5,
    8,
    4,
    5,
    10,
    8,
    10,
    11,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    5,
    0,
    4,
    5,
    11,
    0,
    5,
    10,
    11,
    11,
    3,
    0,
    -1,
    -1,
    -1,
    -1,
    0,
    1,
    9,
    8,
    4,
    10,
    8,
    10,
    11,
    10,
    4,
    5,
    -1,
    -1,
    -1,
    -1,
    10,
    11,
    4,
    10,
    4,
    5,
    11,
    3,
    4,
    9,
    4,
    1,
    3,
    1,
    4,
    -1,
    2,
    5,
    1,
    2,
    8,
    5,
    2,
    11,
    8,
    4,
    5,
    8,
    -1,
    -1,
    -1,
    -1,
    0,
    4,
    11,
    0,
    11,
    3,
    4,
    5,
    11,
    2,
    11,
    1,
    5,
    1,
    11,
    -1,
    0,
    2,
    5,
    0,
    5,
    9,
    2,
    11,
    5,
    4,
    5,
    8,
    11,
    8,
    5,
    -1,
    9,
    4,
    5,
    2,
    11,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    5,
    10,
    3,
    5,
    2,
    3,
    4,
    5,
    3,
    8,
    4,
    -1,
    -1,
    -1,
    -1,
    5,
    10,
    2,
    5,
    2,
    4,
    4,
    2,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    10,
    2,
    3,
    5,
    10,
    3,
    8,
    5,
    4,
    5,
    8,
    0,
    1,
    9,
    -1,
    5,
    10,
    2,
    5,
    2,
    4,
    1,
    9,
    2,
    9,
    4,
    2,
    -1,
    -1,
    -1,
    -1,
    8,
    4,
    5,
    8,
    5,
    3,
    3,
    5,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    4,
    5,
    1,
    0,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    8,
    4,
    5,
    8,
    5,
    3,
    9,
    0,
    5,
    0,
    3,
    5,
    -1,
    -1,
    -1,
    -1,
    9,
    4,
    5,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    11,
    7,
    4,
    9,
    11,
    9,
    10,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    8,
    3,
    4,
    9,
    7,
    9,
    11,
    7,
    9,
    10,
    11,
    -1,
    -1,
    -1,
    -1,
    1,
    10,
    11,
    1,
    11,
    4,
    1,
    4,
    0,
    7,
    4,
    11,
    -1,
    -1,
    -1,
    -1,
    3,
    1,
    4,
    3,
    4,
    8,
    1,
    10,
    4,
    7,
    4,
    11,
    10,
    11,
    4,
    -1,
    4,
    11,
    7,
    9,
    11,
    4,
    9,
    2,
    11,
    9,
    1,
    2,
    -1,
    -1,
    -1,
    -1,
    9,
    7,
    4,
    9,
    11,
    7,
    9,
    1,
    11,
    2,
    11,
    1,
    0,
    8,
    3,
    -1,
    11,
    7,
    4,
    11,
    4,
    2,
    2,
    4,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    11,
    7,
    4,
    11,
    4,
    2,
    8,
    3,
    4,
    3,
    2,
    4,
    -1,
    -1,
    -1,
    -1,
    2,
    9,
    10,
    2,
    7,
    9,
    2,
    3,
    7,
    7,
    4,
    9,
    -1,
    -1,
    -1,
    -1,
    9,
    10,
    7,
    9,
    7,
    4,
    10,
    2,
    7,
    8,
    7,
    0,
    2,
    0,
    7,
    -1,
    3,
    7,
    10,
    3,
    10,
    2,
    7,
    4,
    10,
    1,
    10,
    0,
    4,
    0,
    10,
    -1,
    1,
    10,
    2,
    8,
    7,
    4,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    9,
    1,
    4,
    1,
    7,
    7,
    1,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    9,
    1,
    4,
    1,
    7,
    0,
    8,
    1,
    8,
    7,
    1,
    -1,
    -1,
    -1,
    -1,
    4,
    0,
    3,
    7,
    4,
    3,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    4,
    8,
    7,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    10,
    8,
    10,
    11,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    0,
    9,
    3,
    9,
    11,
    11,
    9,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    1,
    10,
    0,
    10,
    8,
    8,
    10,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    1,
    10,
    11,
    3,
    10,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    2,
    11,
    1,
    11,
    9,
    9,
    11,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    0,
    9,
    3,
    9,
    11,
    1,
    2,
    9,
    2,
    11,
    9,
    -1,
    -1,
    -1,
    -1,
    0,
    2,
    11,
    8,
    0,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    3,
    2,
    11,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    3,
    8,
    2,
    8,
    10,
    10,
    8,
    9,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    9,
    10,
    2,
    0,
    9,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    3,
    8,
    2,
    8,
    10,
    0,
    1,
    8,
    1,
    10,
    8,
    -1,
    -1,
    -1,
    -1,
    1,
    10,
    2,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    1,
    3,
    8,
    9,
    1,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    9,
    1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    3,
    8,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1
  ]);
  return THREE;
}();
// requirejs.config({
//     // "baseUrl": "../../src",
//     "paths": {
//       // "app": "./src",
//       "THREE" : "../deps/three",
//     },
//     "shim": {
//       "THREE" : {
// 			 exports : "THREE"
// 		  },
//     }
// });
// Load the main app module to start the app
app = function (TREE) {
  
  window.TREE = TREE;
  return TREE;
}(core);
}());