
var numCurves = 5;
sc1 = {
	
	setup:function(){
	
		clock = new THREE.Clock( true );
		sc1.swirls = [];
		for(var i = 0 ; i < numCurves ; i++){
			var material = facingMat2.clone();//new THREE.MeshBasicMaterial( {map:texture} );//
			var swirl = makeSurface({
				surface:Curves[i+""],
				material:material,
				textureColor:texCol,
				textureAlpha:texAlpha});
			swirl.position.set( 0, 0, -5);
			// swirl.rotation.y=Math.PI;
			swirl.material.side = THREE.DoubleSide;
			// swirl.scale.multiplyScalar( 1 );
			// scene.add( swirl );
			sc1.swirls.push(swirl);
		}

		var sp = new THREE.Mesh(new THREE.SphereGeometry( 1),new THREE.MeshNormalMaterial(  ));
		sp.position.z = -5;
		// scene.add(sp);
		loaded = true;
		count = 0;
	},

	draw:function(){
		count+=.01;
		for(var i = 0 ; i < numCurves ; i++){
			sc1.swirls[i].offset((i*.3)+clock.getElapsedTime()*-.02);
			// sc1.swirls[i].setFade(count,1.0);
			// sc1.swirls[i].setCam(camera);
			sc1.swirls[i].update(clock.getElapsedTime());
		}
		console.log(count);
	}
};


makeSurface = function(params){
	var divisions = params.surface.divisions.split("_");
	var geometry = new THREE.ParametricGeometry( params.surface(), parseInt(divisions[1]), parseInt(divisions[2]) );
	var swirl = new THREE.Mesh( geometry, params.material===undefined?new THREE.MeshNormalMaterial(  ):params.material );
	// console.log(params.surface.animation);

	// swirl.material.side = THREE.DoubleSide;
	// swirl.material.uniforms['camMat'].value = camera.matrixWorld;
	swirl.material.depthTest = false;
	swirl.material.uniforms['textureColor'].value = texCol;
	swirl.material.uniforms['textureAlpha'].value = texAlpha;
	swirl.material.uniforms['fade'].value = 0;
	swirl.material.uniforms['power'].value = 1;
	swirl.animation = params.surface.animation
	swirl.inPoint = swirl.animation[0][0];
	swirl.outPoint = swirl.animation[swirl.animation.length-1][0];
	// console.log(swirl.outPoint);
	swirl.update = function(time){
		//is it playing, if not, hide it
		//find in and out points first
		if(time<swirl.inPoint || time>swirl.outPoint && swirl.visible){
   			 scene.remove( swirl );
		}
		else if(time>swirl.inPoint && time<swirl.outPoint){
			scene.add(swirl);
			var getLerp = swirl.findInOut(time);
			var value = Remap(getLerp[0],0,1,swirl.animation[getLerp[1]][1],swirl.animation[getLerp[2]][1]);
			this.setFade(value,1);
		}
	}

	swirl.findInOut = function(time){

		var tween = 0;
		var inPoint,outPoint;
		for(var i = 1 ; i < swirl.animation.length ; i++){

			var b = swirl.animation[i][0];
			var bVal = swirl.animation[i][1];

			var a = swirl.animation[i-1][0];
			var aVal = swirl.animation[i-1][a];

			if(time<b && time>a){
				tween = 1-((b-time)/(b-a));
				inPoint = i-1;
				outPoint = i;
			}
		}
		return [tween,inPoint,outPoint];
	}

	swirl.setCam = function(cam){
		this.material.uniforms['camMat'].value = cam.matrixWorld;
	}

	swirl.offset = function(offset){
		this.material.uniforms['offset'].value = offset;
	}

	swirl.setFade = function(fade,power){
		this.material.uniforms['fade'].value = fade;
		this.material.uniforms['power'].value = power;
	}
	// console.log(swirl);
	// console.log("fu");
	
	return swirl;
}
var Remap = function  (value,  from1,  to1,  from2,  to2) {
	return (value - from1) / (to1 - from1) * (to2 - from2) + from2;
}
