

sc1 = {
	
	setup:function(){
		
		var sphGeo =  new THREE.PlaneGeometry( 6,6,1,1); new THREE.SphereGeometry(1,90,90);
		// var loader = new THREE.TextureLoader();
		// var texture = loader.load('img/burst.png');

		// texture.wrapS = THREE.RepeatWrapping;
		// texture.wrapT = THREE.RepeatWrapping;

		sphere1 = new THREE.Mesh(sphGeo, facingMat2);// new THREE.MeshBasicMaterial( {color:0xffffff, map:texture}));
		sphere1.material.side = THREE.DoubleSide;

		swirl.material = facingMat2;//new THREE.MeshNormalMaterial(  );
		swirl.material.color = new THREE.Color(1,0,0);
		swirl.position.z = -.2;
		scene.add(swirl);
		swirl.material.side = THREE.DoubleSide;
		console.log(swirl);
		plane = new THREE.Mesh(new THREE.PlaneGeometry( 2,2),toyMat);
		// sphere1.position.z = -3;

		plane.position.y=2;
		scene.add(sphere1);

		bb = new THREE.Object3D();
		for(var i = 0 ; i < 7 ; i++){
			var sp = sphere1.clone();
			sp.rotation.x = Math.random()*100;
			sp.rotation.y = Math.random()*100;
			sp.rotation.z = Math.random()*100;
			bb.add(sp);
		}

		scene.add(bb);

		scene.add(plane);
		sphere1.material.uniforms['camMat'].value = camera.matrixWorld;
		sphere1.material.depthTest = false;

		count=0;
		sphere1.material.uniforms['textureColor'].value = skyTexture;
		sphere1.material.uniforms['textureAlpha'].value = texture;

		swirl.material.uniforms['camMat'].value = camera.matrixWorld;
		swirl.material.depthTest = false;
		swirl.material.uniforms['textureColor'].value = skyTexture;
		swirl.material.uniforms['textureAlpha'].value = texture;
		bb.position.z = -3;
		loaded = true;
	},

	draw:function(){
		// if(count!=undefined)
			count+=.00051;
		bb.rotation.y=count;
		swirl.rotation.y=count*2;
		sphere1.material.uniforms['camMat'].value = camera.matrixWorld;
		sphere1.material.uniforms['offset'].value = count;
		swirl.material.uniforms['camMat'].value = camera.matrixWorld;
		swirl.material.uniforms['offset'].value = count;

		// sphere1.rotation.x=count;
		// count++;
		// plane.material.uniforms['time'].value=count*.01;
		// sphere1.material.uniforms['camPos'].value = camera.position;
		// camera.updateMatrixWorld();
		// sphere1.material.uniforms['camMat'].value = camera.matrixWorld;


	}
};
