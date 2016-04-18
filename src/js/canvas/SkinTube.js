function skinTube(params){

	var args = params || {};
	this.radSegs = args.radSegs || 4;
	this.heightSegs = args.heightSegs || 100;

	this.mat = args.material || new THREE.MeshLambertMaterial({side:THREE.DoubleSide,color:0x999999,skinning:true,wireframe:false});
	
	

	this.skinTubes = [];
	this.skinParent = new THREE.Object3D();

	this.base = new THREE.Object3D();
    this.rot = new THREE.Object3D();
    this.Up = new THREE.Object3D();
    this.Up.position.y=10;
    this.base.add(this.rot);
    this.base.add(this.Up);
    this.rot.rotation.x=Math.PI/2;
    this.aim = new THREE.Object3D();

  
    this.makeGeo = function(){
    	this.geo = new THREE.CylinderGeometry(1,1,1,this.radSegs,this.heightSegs,true);
		this.cap = new THREE.SphereGeometry( 1, this.radSegs, 10, 0, Math.PI*2, 0, Math.PI/2 );
		for(var i = 0 ; i < this.cap.vertices.length ; i++){
			this.cap.vertices[i].y*=-1;
			this.cap.vertices[i].y-=.5;
		}
		for(var i = 0 ; i < this.cap.faces.length ; i++){
			var temp = this.cap.faces[i].a;
			this.cap.faces[i].a = this.cap.faces[i].c;
			this.cap.faces[i].c = temp;
		}

		this.cap2 = this.cap.clone();

		var mat = new THREE.Matrix4();
		mat.makeRotationX(Math.PI);
		for(var i = 0 ; i < this.cap2.vertices.length ; i++){
			this.cap2.vertices[i].applyMatrix4(mat);
		}
		for(var i = 0 ; i < this.cap2.faces.length ; i++){
			var temp = this.cap.faces[i].a;
			this.cap2.faces[i].a = this.cap.faces[i].c;
			this.cap2.faces[i].c = temp;
		}

		THREE.GeometryUtils.merge(this.geo,this.cap);
		THREE.GeometryUtils.merge(this.geo,this.cap2);
		this.geo.computeFaceNormals();
		this.geo.computeVertexNormals();

    };

    this.makeGeo();

	this.init = function(n,s){

		var amount = n || 1;

		for(var q = 0 ; q < amount ; q++){

	        this.geo.skinIndices = [];
	        this.geo.skinWeights = [];
	        this.geo.bones = [];

	        var capCount = 0;

	        var j = 0;
	        var tBone = 0;

	        for(var i = 0 ; i < this.geo.vertices.length ; i++){

	        	if(i<(this.radSegs*this.heightSegs)+this.radSegs+this.heightSegs){

		        	if(j%(this.radSegs+1)==0){
		        		j=0;
		        		tBone++;
		        	}

		        	if(j==0){
		        		var b = this.makeBone(tBone,this.geo.vertices[i].y)
		        		this.geo.bones.push(b);
		        	}

		            this.geo.skinIndices.push( new THREE.Vector4(tBone,0,0,0 ));
		            this.geo.skinWeights.push( new THREE.Vector4(1,0,0,0 ));

		            j++;

		        }
		        else if(capCount<this.cap.vertices.length+1){
		        	this.geo.skinIndices.push( new THREE.Vector4(tBone,0,0,0 ));
		            this.geo.skinWeights.push( new THREE.Vector4(1,0,0,0 ));
		            capCount++;
		        }
		        else{
		        	this.geo.skinIndices.push( new THREE.Vector4(1,0,0,0 ));
		            this.geo.skinWeights.push( new THREE.Vector4(1,0,0,0 ));
		        }

	        }

	        var tube = new THREE.SkinnedMesh(this.geo,this.mat,false);
	        this.skinParent.add(tube);
	        this.skinTubes.push(tube);
	        
	    }

	    return this.skinParent;

    };

    this.update = function(curve,index){

    	var i = index || 0;

    	vUp = new THREE.Vector3(0,-1,0);

    	for(var j = 0 ; j < this.skinTubes[i].children.length ; j++){


			var aVec =  curve.getPointAt(((j/this.skinTubes[i].children.length)*1));
			var vec = curve.getPointAt((j/this.skinTubes[i].children.length)*1+.0001);
			copyVec(this.base.position,vec);
			copyVec(this.aim.position,aVec);
			this.base.up = vUp;
			this.base.lookAt(this.aim.position);
			this.base.updateMatrixWorld();

			var q = this.rot.getWorldRotation();

			this.skinTubes[i].children[j].position.x = vec.x;
			this.skinTubes[i].children[j].position.y = vec.y;
			this.skinTubes[i].children[j].position.z = vec.z;
			this.skinTubes[i].children[j].rotation.x = q.x;
			this.skinTubes[i].children[j].rotation.y = q.y;
			this.skinTubes[i].children[j].rotation.z = q.z;
			
			vUp.setFromMatrixPosition(this.Up.matrixWorld);

		}
    };

    this.makeBone = function(num,pos){

    	var bone = {};

        bone.name="bone"+num;
        bone.pos = [0,pos,0];
        bone.rot = [0,0,0];
        bone.scl = [1,1,1];
        bone.rotq = [0,0,0,1];
        bone.parent = -1;

        return bone;

    }
}

function copyVec(a,b){
				a.x = b.x;
				a.y = b.y;
				a.z = b.z;
			}