

var noise = "\
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }\
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }\
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }\
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }\
float noise(vec3 P) {\
	vec3 i0 = mod289(floor(P)), i1 = mod289(i0 + vec3(1.0));\
	vec3 f0 = fract(P), f1 = f0 - vec3(1.0), f = fade(f0);\
	vec4 ix = vec4(i0.x, i1.x, i0.x, i1.x), iy = vec4(i0.yy, i1.yy);\
	vec4 iz0 = i0.zzzz, iz1 = i1.zzzz;\
	vec4 ixy = permute(permute(ix) + iy), ixy0 = permute(ixy + iz0), ixy1 = permute(ixy + iz1);\
	vec4 gx0 = ixy0 * (1.0 / 7.0), gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;\
	vec4 gx1 = ixy1 * (1.0 / 7.0), gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;\
	gx0 = fract(gx0); gx1 = fract(gx1);\
	vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0), sz0 = step(gz0, vec4(0.0));\
	vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1), sz1 = step(gz1, vec4(0.0));\
	gx0 -= sz0 * (step(0.0, gx0) - 0.5); gy0 -= sz0 * (step(0.0, gy0) - 0.5);\
	gx1 -= sz1 * (step(0.0, gx1) - 0.5); gy1 -= sz1 * (step(0.0, gy1) - 0.5);\
	vec3 g0 = vec3(gx0.x,gy0.x,gz0.x), g1 = vec3(gx0.y,gy0.y,gz0.y),\
		 g2 = vec3(gx0.z,gy0.z,gz0.z), g3 = vec3(gx0.w,gy0.w,gz0.w),\
		 g4 = vec3(gx1.x,gy1.x,gz1.x), g5 = vec3(gx1.y,gy1.y,gz1.y),\
		 g6 = vec3(gx1.z,gy1.z,gz1.z), g7 = vec3(gx1.w,gy1.w,gz1.w);\
	vec4 norm0 = taylorInvSqrt(vec4(dot(g0,g0), dot(g2,g2), dot(g1,g1), dot(g3,g3)));\
	vec4 norm1 = taylorInvSqrt(vec4(dot(g4,g4), dot(g6,g6), dot(g5,g5), dot(g7,g7)));\
	g0 *= norm0.x; g2 *= norm0.y; g1 *= norm0.z; g3 *= norm0.w;\
	g4 *= norm1.x; g6 *= norm1.y; g5 *= norm1.z; g7 *= norm1.w;\
vec4 nz = mix(vec4(dot(g0, vec3(f0.x, f0.y, f0.z)), dot(g1, vec3(f1.x, f0.y, f0.z)),\
				   dot(g2, vec3(f0.x, f1.y, f0.z)), dot(g3, vec3(f1.x, f1.y, f0.z))),\
			  vec4(dot(g4, vec3(f0.x, f0.y, f1.z)), dot(g5, vec3(f1.x, f0.y, f1.z)),\
				   dot(g6, vec3(f0.x, f1.y, f1.z)), dot(g7, vec3(f1.x, f1.y, f1.z))), f.z);\
	return 2.2 * mix(mix(nz.x,nz.z,f.y), mix(nz.y,nz.w,f.y), f.x);\
}\
float noise(vec2 P) { return noise(vec3(P, 0.0)); }\
float turbulence(vec3 P) {\
	float f = 0., s = 1.;\
for (int i = 0 ; i < 9 ; i++) {\
   f += abs(noise(s * P)) / s;\
   s *= 2.;\
   P = vec3(.866 * P.x + .5 * P.z, P.y, -.5 * P.x + .866 * P.z);\
}\
	return f;\
}\
";

var bumpVert = "\
	varying vec3 vecNormal;\
	varying vec3 pos;\
	void main() {\
		pos = (modelMatrix * vec4(position,1.0)).xyz;\
		vecNormal = normal;\
		gl_Position = projectionMatrix *\
		modelViewMatrix * vec4(position, 1.0 );\
	}\
";

//bump mapping from here:
//http://mrl.nyu.edu/~perlin/courses/fall2013/oct30/
//specular from here:
//http://www.sunandblackcat.com/tipFullView.php?l=eng&topicid=30

var bumpFrag = "\
	precision highp float;\
	varying vec3 vecNormal;\
	uniform vec3 directionalLightColor[MAX_DIR_LIGHTS];\
	uniform vec3 directionalLightDirection[MAX_DIR_LIGHTS];\
	uniform vec3 color;\
	uniform vec3 camPos;\
	varying vec3 pos;\
	uniform mat4 camMat;\
	void main(void) {\
		vec4 camNorm = vec4(vec3(vecNormal),0.) * camMat;\
		vec4 lgts = vec4(vec3(0.0),1.0);\
		vec3 spec = vec3(0.);\
		float mult = 61.;\
		float Noise = (noise(pos*mult))*.1;\
		float off = .000001;\
		float px = ((noise(vec3(mult*pos.x+off,mult*pos.y,mult*pos.z))*.3)-Noise);\
		float py = ((noise(vec3(mult*pos.x,mult*pos.y+off,mult*pos.z))*.3)-Noise);\
		float pz = ((noise(vec3(mult*pos.x,mult*pos.y,mult*pos.z+off))*.3)-Noise);\
		vec3 nNormal = normalize(vecNormal-vec3(px,py,pz));\
		float camNormal = 1.+-max(0.,dot( nNormal, normalize(camPos) ));\
		for(int i = 0 ; i < MAX_DIR_LIGHTS ; i++){\
			vec3 dir = directionalLightDirection[i];\
			lgts.rgb += pow(clamp(dot(dir,nNormal),0.,1.),2.) * directionalLightColor[i];\
			vec3 halfVec = normalize(directionalLightDirection[i]+normalize(vecNormal+camPos));\
			spec += pow(dot(halfVec,vecNormal),13.9)*.5*(1.+-Noise)*directionalLightColor[i];\
		}\
		vec3 rim = lgts.rgb * pow(camNormal,2.);\
		gl_FragColor = vec4(color*lgts.rgb+rim+spec, 1.0);\
	}\
";

noise+=bumpFrag;

var bumpMat = new THREE.ShaderMaterial({
	uniforms: THREE.UniformsUtils.merge([
		THREE.UniformsLib['lights'],
		{	
			camMat: {type: 'm4', value:new THREE.Matrix4()},
			camPos: {type: 'v3', value:new THREE.Vector3(0,0,0)},
			color: {type: 'v3', value:new THREE.Vector3(1,1,1)},
		}
	]),
	vertexShader: bumpVert,
	fragmentShader: noise,
	lights: true
});

var simpleVert = "\
	varying vec3 vecNormal;\
	varying vec2 vUv;\
	void main() {\
		vUv = uv;\
		vecNormal = normal;\
		gl_Position = projectionMatrix *\
		modelViewMatrix * vec4(position, 1.0 );\
	}\
";


var simpleFrag = "\
	precision highp float;\
	varying vec3 vecNormal;\
	uniform vec3 directionalLightColor[MAX_DIR_LIGHTS];\
	uniform vec3 directionalLightDirection[MAX_DIR_LIGHTS];\
	uniform float color;\
	void main(void) {\
		vec4 lgts = vec4(vec3(0.0),1.0);\
		for(int i = 0 ; i < MAX_DIR_LIGHTS ; i++){\
			vec3 dir = directionalLightDirection[i];\
			lgts.rgb += pow(clamp(dot(dir,vecNormal),0.,1.),2.) * directionalLightColor[i];\
		}\
		gl_FragColor = vec4(vec3(color)*lgts.rgb, 1.0);\
	}\
";

var simpleMat = new THREE.ShaderMaterial({
	uniforms: THREE.UniformsUtils.merge([
		THREE.UniformsLib['lights'],
		{
			color: {type: 'f', value: 1.0},
		}
	]),
	vertexShader: simpleVert,
	fragmentShader: simpleFrag,
	lights: true
});

var shaderToy = "\
	varying vec2 vUv;\
	uniform float time;\
	void main(void)\
	{\
		vec2 p = vUv;\
		float x = p.x;\
		float y = p.y;\
		float mov0 = x+y+cos(sin(time)*2.0)*100.+sin(x/100.)*1000.;\
		float mov1 = y / 0.9 +  time;\
		float mov2 = x / 0.2;\
		float c1 = abs(sin(mov1+time)/2.+mov2/2.-mov1-mov2+time);\
		float c2 = abs(sin(c1+sin(mov0/1000.+time)+sin(y/40.+time)+sin((x+y)/100.)*3.));\
		float c3 = abs(sin(c2+cos(mov1+mov2+c2)+cos(mov2)+sin(x/1000.)));\
		gl_FragColor = vec4(c1,c2,c3,.1);	\
	}\
";


var facingVert = "\
	uniform vec3 viewVector;\
	varying vec2 vUv;\
	uniform float c;\
	uniform float p;\
	varying float intensity;\
	void main() \
	{\
	    vec3 vNormal = normalize( normalMatrix * normal );\
		vec3 vNormel = normalize( normalMatrix * viewVector );\
		intensity = pow( c - dot(vNormal, vNormel), .5 );\
		vUv = uv;\
	    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\
	}\
";


var facingFrag = "\
 	uniform vec3 glowColor;\
 	varying vec2 vUv;\
	varying float intensity;\
	uniform sampler2D textureColor;\
	uniform sampler2D textureAlpha;\
	void main() \
	{\
		vec4 tex = texture2D(textureColor, vUv*5.);\
		vec3 glow = glowColor * intensity;\
	    gl_FragColor = vec4( (1.0-glow)*tex.rgb,tex.a );\
	}\
";


var facingVert2 = "\
	varying vec3 vecNormal;\
	varying vec3 pos;\
	varying vec2 vUv;\
	varying vec3 wNormal;\
	uniform float switcher;\
	void main() {\
		vUv = uv;\
		pos = position;\
		vecNormal = normal;\
		wNormal = mat3(modelMatrix[0].xyz,modelMatrix[1].xyz,modelMatrix[2].xyz)*normal;\
		wNormal = normalize(wNormal);\
		gl_Position = projectionMatrix *\
		modelViewMatrix * vec4(position, 1.0 );\
	}\
";

// var facingFrag2 = "\
// 	precision highp float;\
// 	uniform mat4 camMat;\
// 	uniform mat4 camMatInverse;\
// 	varying vec3 wNormal;\
// 	varying vec2 vUv;\
// 	varying vec3 pos;\
// 	uniform sampler2D textureColor;\
// 	uniform sampler2D textureAlpha;\
// 	uniform float offset;\
// 	uniform float fade;\
// 	uniform float power;\
// 	void main(void) {\
// 		gl_FragColor = vec4(texture2D(textureColor,vec2(vUv.x+fade,vUv.y)).rgb,1.0);\
// 	}\
// ";
var facingFrag2 = "\
	precision highp float;\
	uniform mat4 camMat;\
	uniform mat4 camMatInverse;\
	varying vec3 wNormal;\
	varying vec2 vUv;\
	varying vec3 pos;\
	uniform sampler2D textureColor;\
	uniform sampler2D textureAlpha;\
	uniform float offset;\
	uniform float fade;\
	uniform float power;\
	void main(void) {\
		float fader = pow((1.0+(cos(   ( max(0.0,min(1.0,(fade+vUv.x))) * 3.1415*2.))  *-1.0))*.5,power)*2.;\
		vec4 texB = texture2D(textureColor, vUv);\
		vec4 tex = texture2D(textureColor, (texB.rg*.021)+vec2(vUv.x*.4+offset,vUv.y));\
		vec4 texA = texture2D(textureAlpha, vUv+(.05-tex.rg*.1));\
		vec4 camNorm = vec4(vec3(wNormal),0.) * camMat;\
		gl_FragColor = vec4(vec3(min(1.0,max(0.0,pow(camNorm.z,1.5))))*tex.rgb*texA.a*tex.a*fader, 1.0);\
	}\
";
//gl_FragColor = vec4(vec3(min(1.0,max(0.0,pow(camNorm.z,1.5))))*tex.rgb*texA.a*tex.a*fader, 1.0);\
/*
vec4 texB = texture2D(textureColor, vUv);\
		vec4 tex = texture2D(textureColor, (texB.rg*.021)+vec2(vUv.x*.4+offset,vUv.y));\
		vec4 texA = texture2D(textureAlpha, vUv+(.05-tex.rg*.1));\
		vec4 camNorm = vec4(vec3(wNormal),0.) * camMat;\
		float fader = pow((1.0+(cos(   ( max(0.0,min(1.0,(fade+vUv.x))) * 3.1415*2.))  *-1.0))*.5,power);\
 */
//		gl_FragColor = vec4((cos((fade+vUv.x)* 3.1415*2.)*-.5)+.5);\

//		gl_FragColor = vec4(vec3(min(1.0,max(0.0,pow(camNorm.z,1.5))))*tex.rgb*texA.a*tex.a*fader, 1.0);\

// var facingFrag2 = "\
// 	precision highp float;\
// 	uniform mat4 camMat;\
// 	uniform mat4 camMatInverse;\
// 	varying vec3 wNormal;\
// 	varying vec2 vUv;\
// 	varying vec3 pos;\
// 	uniform sampler2D textureColor;\
// 	uniform sampler2D textureAlpha;\
// 	uniform float offset;\
// 	void main(void) {\
// 		vec4 tex = texture2D(textureColor, vec2(vUv.x*.4+offset,vUv.y));\
// 		vec4 texA = texture2D(textureAlpha, vUv);\
// 		vec4 camNorm = vec4(vec3(wNormal),0.) * camMat;\
// 		gl_FragColor = vec4(pow(camNorm.z,1.5));\
// 	}\
// ";

var facingMat2 = new THREE.ShaderMaterial( 
	{
	    uniforms: 
		{ 
			offset:   { type: "f", value: 1.0 },
			fade:   { type: "f", value: 0.0 },
			power:   { type: "f", value: 1.0 },
			camMat: {type: 'm4', value:new THREE.Matrix4()},
			textureColor: { type: "t", value: THREE.ImageUtils.loadTexture( "img/box.png" ) },
			textureAlpha: { type: "t", value: THREE.ImageUtils.loadTexture( "img/box.png" ) }
		},
		vertexShader:   facingVert2,
		fragmentShader: facingFrag2,
		// side: THREE.DoubleSide,
		blending: THREE.AdditiveBlending,
		transparent: true
	}   
);

var facingMat = new THREE.ShaderMaterial( 
	{
	    uniforms: 
		{ 
			"c":   { type: "f", value: 1.0 },
			"p":   { type: "f", value: 1.4 },
			glowColor: { type: "c", value: new THREE.Color(0xffffff) },
			viewVector: { type: "v3", value: new THREE.Vector3(0,0,0) },
			textureColor: { type: "t", value: THREE.ImageUtils.loadTexture( "img/box.png" ) }
		},
		vertexShader:   facingVert,
		fragmentShader: facingFrag,
		// side: THREE.FrontSide,
		// blending: THREE.AdditiveBlending,
		transparent: true
	}   
);

// var facingMat = new THREE.ShaderMaterial({
// 	uniforms:{time:{type:'f',value:1.0}},//,viewVector:{type'v3',value:new THREE.Vector3(0,0,0))}},
// 	vertexShader: facingVert,
// 	fragmentShader: facingFrag,
// 	blending: THREE.NormalBlending,
//     depthTest: false,
//     transparent: true
// });

var toyMat = new THREE.ShaderMaterial({
	uniforms:{time:{type:'f',value:1.0}},
	vertexShader: simpleVert,
	fragmentShader: shaderToy,
	blending: THREE.NormalBlending,
    depthTest: false,
    transparent: true
});