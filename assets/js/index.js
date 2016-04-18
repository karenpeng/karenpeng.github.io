/**
 * @author dmarcos / http://github.com/dmarcos
 *
 * This controls allow to change the orientation of the camera using the mouse
 */

THREE.MouseControls = function ( object ) {

	var scope = this;
	var PI_2 = Math.PI / 2;
	var mouseQuat = {
		x: new THREE.Quaternion(),
		y: new THREE.Quaternion()
	};
	var object = object;
	var xVector = new THREE.Vector3( 1, 0, 0 );
	var yVector = new THREE.Vector3( 0, 1, 0 );

	var onMouseMove = function ( event ) {

		if ( scope.enabled === false ) return;

		var orientation = scope.orientation;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		orientation.y += movementX * 0.0025;
		orientation.x += movementY * 0.0025;

		orientation.x = Math.max( - PI_2, Math.min( PI_2, orientation.x ) );

	};

	this.enabled = true;

	this.orientation = {
		x: 0,
		y: 0,
	};

	this.update = function() {

		if ( this.enabled === false ) return;

		mouseQuat.x.setFromAxisAngle( xVector, this.orientation.x );
		mouseQuat.y.setFromAxisAngle( yVector, this.orientation.y );
		object.quaternion.copy( mouseQuat.y ).multiply( mouseQuat.x );
		return;

	};

	this.dispose = function() {

		document.removeEventListener( 'mousemove', onMouseMove, false );

	}

	document.addEventListener( 'mousemove', onMouseMove, false );

};

/**
 * @author renej
 * NURBS curve object
 *
 * Derives from Curve, overriding getPoint and getTangent.
 *
 * Implementation is based on (x, y [, z=0 [, w=1]]) control points with w=weight.
 *
 **/


/**************************************************************
 *	NURBS curve
 **************************************************************/

THREE.NURBSCurve = function ( degree, knots /* array of reals */, controlPoints /* array of Vector(2|3|4) */ ) {

	this.degree = degree;
	this.knots = knots;
	this.controlPoints = [];
	for ( var i = 0; i < controlPoints.length; ++ i ) {

		// ensure Vector4 for control points
		var point = controlPoints[ i ];
		this.controlPoints[ i ] = new THREE.Vector4( point.x, point.y, point.z, point.w );

	}

};


THREE.NURBSCurve.prototype = Object.create( THREE.Curve.prototype );
THREE.NURBSCurve.prototype.constructor = THREE.NURBSCurve;


THREE.NURBSCurve.prototype.getPoint = function ( t ) {

	var u = this.knots[ 0 ] + t * ( this.knots[ this.knots.length - 1 ] - this.knots[ 0 ] ); // linear mapping t->u

	// following results in (wx, wy, wz, w) homogeneous point
	var hpoint = THREE.NURBSUtils.calcBSplinePoint( this.degree, this.knots, this.controlPoints, u );

	if ( hpoint.w != 1.0 ) {

		// project to 3D space: (wx, wy, wz, w) -> (x, y, z, 1)
		hpoint.divideScalar( hpoint.w );

	}

	return new THREE.Vector3( hpoint.x, hpoint.y, hpoint.z );

};


THREE.NURBSCurve.prototype.getTangent = function ( t ) {

	var u = this.knots[ 0 ] + t * ( this.knots[ this.knots.length - 1 ] - this.knots[ 0 ] );
	var ders = THREE.NURBSUtils.calcNURBSDerivatives( this.degree, this.knots, this.controlPoints, u, 1 );
	var tangent = ders[ 1 ].clone();
	tangent.normalize();

	return tangent;

};


/**
 * @author renej
 * NURBS surface object
 *
 * Implementation is based on (x, y [, z=0 [, w=1]]) control points with w=weight.
 *
 **/


/**************************************************************
 *	NURBS surface
 **************************************************************/

THREE.NURBSSurface = function ( degree1, degree2, knots1, knots2 /* arrays of reals */, controlPoints /* array^2 of Vector(2|3|4) */ ) {

	this.degree1 = degree1;
	this.degree2 = degree2;
	this.knots1 = knots1;
	this.knots2 = knots2;
	this.controlPoints = [];

	var len1 = knots1.length - degree1 - 1;
	var len2 = knots2.length - degree2 - 1;

	// ensure Vector4 for control points
	for ( var i = 0; i < len1; ++ i ) {

		this.controlPoints[ i ] = [];
		for ( var j = 0; j < len2; ++ j ) {
			// console.log(controlPoints);
			// console.log(i);
			// console.log(j);
			// console.log(len1);
			// console.log(len2);
			var point = controlPoints[ i ][ j ];
			this.controlPoints[ i ][ j ] = new THREE.Vector4( point.x, point.y, point.z, point.w );

		}

	}

};


THREE.NURBSSurface.prototype = {

	constructor: THREE.NURBSSurface,

	getPoint: function ( t1, t2 ) {

		var u = this.knots1[ 0 ] + t1 * ( this.knots1[ this.knots1.length - 1 ] - this.knots1[ 0 ] ); // linear mapping t1->u
		var v = this.knots2[ 0 ] + t2 * ( this.knots2[ this.knots2.length - 1 ] - this.knots2[ 0 ] ); // linear mapping t2->u

		return THREE.NURBSUtils.calcSurfacePoint( this.degree1, this.degree2, this.knots1, this.knots2, this.controlPoints, u, v );

	}
};



/**
 * @author renej
 * NURBS utils
 *
 * See NURBSCurve and NURBSSurface.
 *
 **/


/**************************************************************
 *	NURBS Utils
 **************************************************************/

THREE.NURBSUtils = {

	/*
	Finds knot vector span.

	p : degree
	u : parametric value
	U : knot vector
	
	returns the span
	*/
	findSpan: function( p,  u,  U ) {

		var n = U.length - p - 1;

		if ( u >= U[ n ] ) {

			return n - 1;

		}

		if ( u <= U[ p ] ) {

			return p;

		}

		var low = p;
		var high = n;
		var mid = Math.floor( ( low + high ) / 2 );

		while ( u < U[ mid ] || u >= U[ mid + 1 ] ) {
		  
			if ( u < U[ mid ] ) {

				high = mid;

			} else {

				low = mid;

			}

			mid = Math.floor( ( low + high ) / 2 );

		}

		return mid;

	},
    
		
	/*
	Calculate basis functions. See The NURBS Book, page 70, algorithm A2.2
   
	span : span in which u lies
	u    : parametric point
	p    : degree
	U    : knot vector
	
	returns array[p+1] with basis functions values.
	*/
	calcBasisFunctions: function( span, u, p, U ) {

		var N = [];
		var left = [];
		var right = [];
		N[ 0 ] = 1.0;

		for ( var j = 1; j <= p; ++ j ) {
	   
			left[ j ] = u - U[ span + 1 - j ];
			right[ j ] = U[ span + j ] - u;

			var saved = 0.0;

			for ( var r = 0; r < j; ++ r ) {

				var rv = right[ r + 1 ];
				var lv = left[ j - r ];
				var temp = N[ r ] / ( rv + lv );
				N[ r ] = saved + rv * temp;
				saved = lv * temp;

			 }

			 N[ j ] = saved;

		 }

		 return N;

	},


	/*
	Calculate B-Spline curve points. See The NURBS Book, page 82, algorithm A3.1.
 
	p : degree of B-Spline
	U : knot vector
	P : control points (x, y, z, w)
	u : parametric point

	returns point for given u
	*/
	calcBSplinePoint: function( p, U, P, u ) {

		var span = this.findSpan( p, u, U );
		var N = this.calcBasisFunctions( span, u, p, U );
		var C = new THREE.Vector4( 0, 0, 0, 0 );

		for ( var j = 0; j <= p; ++ j ) {

			var point = P[ span - p + j ];
			var Nj = N[ j ];
			var wNj = point.w * Nj;
			C.x += point.x * wNj;
			C.y += point.y * wNj;
			C.z += point.z * wNj;
			C.w += point.w * Nj;

		}

		return C;

	},


	/*
	Calculate basis functions derivatives. See The NURBS Book, page 72, algorithm A2.3.

	span : span in which u lies
	u    : parametric point
	p    : degree
	n    : number of derivatives to calculate
	U    : knot vector

	returns array[n+1][p+1] with basis functions derivatives
	*/
	calcBasisFunctionDerivatives: function( span,  u,  p,  n,  U ) {

		var zeroArr = [];
		for ( var i = 0; i <= p; ++ i )
			zeroArr[ i ] = 0.0;

		var ders = [];
		for ( var i = 0; i <= n; ++ i )
			ders[ i ] = zeroArr.slice( 0 );

		var ndu = [];
		for ( var i = 0; i <= p; ++ i )
			ndu[ i ] = zeroArr.slice( 0 );

		ndu[ 0 ][ 0 ] = 1.0;

		var left = zeroArr.slice( 0 );
		var right = zeroArr.slice( 0 );

		for ( var j = 1; j <= p; ++ j ) {

			left[ j ] = u - U[ span + 1 - j ];
			right[ j ] = U[ span + j ] - u;

			var saved = 0.0;

			for ( var r = 0; r < j; ++ r ) {

				var rv = right[ r + 1 ];
				var lv = left[ j - r ];
				ndu[ j ][ r ] = rv + lv;

				var temp = ndu[ r ][ j - 1 ] / ndu[ j ][ r ];
				ndu[ r ][ j ] = saved + rv * temp;
				saved = lv * temp;

			}

			ndu[ j ][ j ] = saved;

		}

		for ( var j = 0; j <= p; ++ j ) {

			ders[ 0 ][ j ] = ndu[ j ][ p ];

		}

		for ( var r = 0; r <= p; ++ r ) {

			var s1 = 0;
			var s2 = 1;

			var a = [];
			for ( var i = 0; i <= p; ++ i ) {

				a[ i ] = zeroArr.slice( 0 );

			}
			a[ 0 ][ 0 ] = 1.0;

			for ( var k = 1; k <= n; ++ k ) {

				var d = 0.0;
				var rk = r - k;
				var pk = p - k;

				if ( r >= k ) {

					a[ s2 ][ 0 ] = a[ s1 ][ 0 ] / ndu[ pk + 1 ][ rk ];
					d = a[ s2 ][ 0 ] * ndu[ rk ][ pk ];

				}

				var j1 = ( rk >= - 1 ) ? 1 : - rk;
				var j2 = ( r - 1 <= pk ) ? k - 1 :  p - r;

				for ( var j = j1; j <= j2; ++ j ) {

					a[ s2 ][ j ] = ( a[ s1 ][ j ] - a[ s1 ][ j - 1 ] ) / ndu[ pk + 1 ][ rk + j ];
					d += a[ s2 ][ j ] * ndu[ rk + j ][ pk ];

				}

				if ( r <= pk ) {

					a[ s2 ][ k ] = - a[ s1 ][ k - 1 ] / ndu[ pk + 1 ][ r ];
					d += a[ s2 ][ k ] * ndu[ r ][ pk ];

				}

				ders[ k ][ r ] = d;

				var j = s1;
				s1 = s2;
				s2 = j;

			}

		}

		var r = p;

		for ( var k = 1; k <= n; ++ k ) {

			for ( var j = 0; j <= p; ++ j ) {

				ders[ k ][ j ] *= r;

			}
			r *= p - k;

		}

		return ders;

	},


	/*
		Calculate derivatives of a B-Spline. See The NURBS Book, page 93, algorithm A3.2.

		p  : degree
		U  : knot vector
		P  : control points
		u  : Parametric points
		nd : number of derivatives

		returns array[d+1] with derivatives
		*/
	calcBSplineDerivatives: function( p,  U,  P,  u,  nd ) {

		var du = nd < p ? nd : p;
		var CK = [];
		var span = this.findSpan( p, u, U );
		var nders = this.calcBasisFunctionDerivatives( span, u, p, du, U );
		var Pw = [];

		for ( var i = 0; i < P.length; ++ i ) {

			var point = P[ i ].clone();
			var w = point.w;

			point.x *= w;
			point.y *= w;
			point.z *= w;

			Pw[ i ] = point;

		}
		for ( var k = 0; k <= du; ++ k ) {

			var point = Pw[ span - p ].clone().multiplyScalar( nders[ k ][ 0 ] );

			for ( var j = 1; j <= p; ++ j ) {

				point.add( Pw[ span - p + j ].clone().multiplyScalar( nders[ k ][ j ] ) );

			}

			CK[ k ] = point;

		}

		for ( var k = du + 1; k <= nd + 1; ++ k ) {

			CK[ k ] = new THREE.Vector4( 0, 0, 0 );

		}

		return CK;

	},


	/*
	Calculate "K over I"

	returns k!/(i!(k-i)!)
	*/
	calcKoverI: function( k, i ) {

		var nom = 1;

		for ( var j = 2; j <= k; ++ j ) {

			nom *= j;

		}

		var denom = 1;

		for ( var j = 2; j <= i; ++ j ) {

			denom *= j;

		}

		for ( var j = 2; j <= k - i; ++ j ) {

			denom *= j;

		}

		return nom / denom;

	},


	/*
	Calculate derivatives (0-nd) of rational curve. See The NURBS Book, page 127, algorithm A4.2.

	Pders : result of function calcBSplineDerivatives

	returns array with derivatives for rational curve.
	*/
	calcRationalCurveDerivatives: function ( Pders ) {

		var nd = Pders.length;
		var Aders = [];
		var wders = [];

		for ( var i = 0; i < nd; ++ i ) {

			var point = Pders[ i ];
			Aders[ i ] = new THREE.Vector3( point.x, point.y, point.z );
			wders[ i ] = point.w;

		}

		var CK = [];

		for ( var k = 0; k < nd; ++ k ) {

			var v = Aders[ k ].clone();

			for ( var i = 1; i <= k; ++ i ) {

				v.sub( CK[ k - i ].clone().multiplyScalar( this.calcKoverI( k, i ) * wders[ i ] ) );

			}

			CK[ k ] = v.divideScalar( wders[ 0 ] );

		}

		return CK;

	},


	/*
	Calculate NURBS curve derivatives. See The NURBS Book, page 127, algorithm A4.2.

	p  : degree
	U  : knot vector
	P  : control points in homogeneous space
	u  : parametric points
	nd : number of derivatives

	returns array with derivatives.
	*/
	calcNURBSDerivatives: function( p,  U,  P,  u,  nd ) {

		var Pders = this.calcBSplineDerivatives( p, U, P, u, nd );
		return this.calcRationalCurveDerivatives( Pders );

	},


	/*
	Calculate rational B-Spline surface point. See The NURBS Book, page 134, algorithm A4.3.
 
	p1, p2 : degrees of B-Spline surface
	U1, U2 : knot vectors
	P      : control points (x, y, z, w)
	u, v   : parametric values

	returns point for given (u, v)
	*/
	calcSurfacePoint: function( p, q, U, V, P, u, v ) {

		var uspan = this.findSpan( p, u, U );
		var vspan = this.findSpan( q, v, V );
		var Nu = this.calcBasisFunctions( uspan, u, p, U );
		var Nv = this.calcBasisFunctions( vspan, v, q, V );
		var temp = [];

		for ( var l = 0; l <= q; ++ l ) {

			temp[ l ] = new THREE.Vector4( 0, 0, 0, 0 );
			for ( var k = 0; k <= p; ++ k ) {

				var point = P[ uspan - p + k ][ vspan - q + l ].clone();
				var w = point.w;
				point.x *= w;
				point.y *= w;
				point.z *= w;
				temp[ l ].add( point.multiplyScalar( Nu[ k ] ) );

			}

		}

		var Sw = new THREE.Vector4( 0, 0, 0, 0 );
		for ( var l = 0; l <= q; ++ l ) {

			Sw.add( temp[ l ].multiplyScalar( Nv[ l ] ) );

		}

		Sw.divideScalar( Sw.w );
		return new THREE.Vector3( Sw.x, Sw.y, Sw.z );

	}

};




/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.OBJLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;

};

THREE.OBJLoader.prototype = {

	constructor: THREE.OBJLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.XHRLoader( scope.manager );
		loader.setCrossOrigin( this.crossOrigin );
		loader.load( url, function ( text ) {

			onLoad( scope.parse( text ) );

		}, onProgress, onError );

	},

	setCrossOrigin: function ( value ) {

		this.crossOrigin = value;

	},

	parse: function ( text ) {

		console.time( 'OBJLoader' );

		var object, objects = [];
		var geometry, material;

		function parseVertexIndex( value ) {

			var index = parseInt( value );

			return ( index >= 0 ? index - 1 : index + vertices.length / 3 ) * 3;

		}

		function parseNormalIndex( value ) {

			var index = parseInt( value );

			return ( index >= 0 ? index - 1 : index + normals.length / 3 ) * 3;

		}

		function parseUVIndex( value ) {

			var index = parseInt( value );

			return ( index >= 0 ? index - 1 : index + uvs.length / 2 ) * 2;

		}

		function addVertex( a, b, c ) {

			geometry.vertices.push(
				vertices[ a ], vertices[ a + 1 ], vertices[ a + 2 ],
				vertices[ b ], vertices[ b + 1 ], vertices[ b + 2 ],
				vertices[ c ], vertices[ c + 1 ], vertices[ c + 2 ]
			);

		}

		function addNormal( a, b, c ) {

			geometry.normals.push(
				normals[ a ], normals[ a + 1 ], normals[ a + 2 ],
				normals[ b ], normals[ b + 1 ], normals[ b + 2 ],
				normals[ c ], normals[ c + 1 ], normals[ c + 2 ]
			);

		}

		function addUV( a, b, c ) {

			geometry.uvs.push(
				uvs[ a ], uvs[ a + 1 ],
				uvs[ b ], uvs[ b + 1 ],
				uvs[ c ], uvs[ c + 1 ]
			);

		}

		function addFace( a, b, c, d,  ua, ub, uc, ud, na, nb, nc, nd ) {

			var ia = parseVertexIndex( a );
			var ib = parseVertexIndex( b );
			var ic = parseVertexIndex( c );
			var id;

			if ( d === undefined ) {

				addVertex( ia, ib, ic );

			} else {

				id = parseVertexIndex( d );

				addVertex( ia, ib, id );
				addVertex( ib, ic, id );

			}

			if ( ua !== undefined ) {

				ia = parseUVIndex( ua );
				ib = parseUVIndex( ub );
				ic = parseUVIndex( uc );

				if ( d === undefined ) {

					addUV( ia, ib, ic );

				} else {

					id = parseUVIndex( ud );

					addUV( ia, ib, id );
					addUV( ib, ic, id );

				}

			}

			if ( na !== undefined ) {

				ia = parseNormalIndex( na );
				ib = parseNormalIndex( nb );
				ic = parseNormalIndex( nc );

				if ( d === undefined ) {

					addNormal( ia, ib, ic );

				} else {

					id = parseNormalIndex( nd );

					addNormal( ia, ib, id );
					addNormal( ib, ic, id );

				}

			}

		}

		// create mesh if no objects in text

		if ( /^o /gm.test( text ) === false ) {

			geometry = {
				vertices: [],
				normals: [],
				uvs: []
			};

			material = {
				name: ''
			};

			object = {
				name: '',
				geometry: geometry,
				material: material
			};

			objects.push( object );

		}

		var vertices = [];
		var normals = [];
		var uvs = [];

		// v float float float

		var vertex_pattern = /v( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;

		// vn float float float

		var normal_pattern = /vn( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;

		// vt float float

		var uv_pattern = /vt( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;

		// f vertex vertex vertex ...

		var face_pattern1 = /f( +-?\d+)( +-?\d+)( +-?\d+)( +-?\d+)?/;

		// f vertex/uv vertex/uv vertex/uv ...

		var face_pattern2 = /f( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))?/;

		// f vertex/uv/normal vertex/uv/normal vertex/uv/normal ...

		var face_pattern3 = /f( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))?/;

		// f vertex//normal vertex//normal vertex//normal ...

		var face_pattern4 = /f( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))?/;

		//

		var lines = text.split( '\n' );

		for ( var i = 0; i < lines.length; i ++ ) {

			var line = lines[ i ];
			line = line.trim();

			var result;

			if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

				continue;

			} else if ( ( result = vertex_pattern.exec( line ) ) !== null ) {

				// ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

				vertices.push(
					parseFloat( result[ 1 ] ),
					parseFloat( result[ 2 ] ),
					parseFloat( result[ 3 ] )
				);

			} else if ( ( result = normal_pattern.exec( line ) ) !== null ) {

				// ["vn 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

				normals.push(
					parseFloat( result[ 1 ] ),
					parseFloat( result[ 2 ] ),
					parseFloat( result[ 3 ] )
				);

			} else if ( ( result = uv_pattern.exec( line ) ) !== null ) {

				// ["vt 0.1 0.2", "0.1", "0.2"]

				uvs.push(
					parseFloat( result[ 1 ] ),
					parseFloat( result[ 2 ] )
				);

			} else if ( ( result = face_pattern1.exec( line ) ) !== null ) {

				// ["f 1 2 3", "1", "2", "3", undefined]

				addFace(
					result[ 1 ], result[ 2 ], result[ 3 ], result[ 4 ]
				);

			} else if ( ( result = face_pattern2.exec( line ) ) !== null ) {

				// ["f 1/1 2/2 3/3", " 1/1", "1", "1", " 2/2", "2", "2", " 3/3", "3", "3", undefined, undefined, undefined]

				addFace(
					result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ],
					result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ]
				);

			} else if ( ( result = face_pattern3.exec( line ) ) !== null ) {

				// ["f 1/1/1 2/2/2 3/3/3", " 1/1/1", "1", "1", "1", " 2/2/2", "2", "2", "2", " 3/3/3", "3", "3", "3", undefined, undefined, undefined, undefined]

				addFace(
					result[ 2 ], result[ 6 ], result[ 10 ], result[ 14 ],
					result[ 3 ], result[ 7 ], result[ 11 ], result[ 15 ],
					result[ 4 ], result[ 8 ], result[ 12 ], result[ 16 ]
				);

			} else if ( ( result = face_pattern4.exec( line ) ) !== null ) {

				// ["f 1//1 2//2 3//3", " 1//1", "1", "1", " 2//2", "2", "2", " 3//3", "3", "3", undefined, undefined, undefined]

				addFace(
					result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ],
					undefined, undefined, undefined, undefined,
					result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ]
				);

			} else if ( /^o /.test( line ) ) {

				geometry = {
					vertices: [],
					normals: [],
					uvs: []
				};

				material = {
					name: ''
				};

				object = {
					name: line.substring( 2 ).trim(),
					geometry: geometry,
					material: material
				};

				objects.push( object )

			} else if ( /^g /.test( line ) ) {

				// group

			} else if ( /^usemtl /.test( line ) ) {

				// material

				material.name = line.substring( 7 ).trim();

			} else if ( /^mtllib /.test( line ) ) {

				// mtl file

			} else if ( /^s /.test( line ) ) {

				// smooth shading

			} else {

				// console.log( "THREE.OBJLoader: Unhandled line " + line );

			}

		}

		var container = new THREE.Object3D();

		for ( var i = 0, l = objects.length; i < l; i ++ ) {

			object = objects[ i ];
			geometry = object.geometry;

			var buffergeometry = new THREE.BufferGeometry();

			buffergeometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( geometry.vertices ), 3 ) );

			if ( geometry.normals.length > 0 ) {

				buffergeometry.addAttribute( 'normal', new THREE.BufferAttribute( new Float32Array( geometry.normals ), 3 ) );

			}

			if ( geometry.uvs.length > 0 ) {

				buffergeometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( geometry.uvs ), 2 ) );

			}

			material = new THREE.MeshLambertMaterial();
			material.name = object.material.name;

			var mesh = new THREE.Mesh( buffergeometry, material );
			mesh.name = object.name;

			container.add( mesh );

		}

		console.timeEnd( 'OBJLoader' );

		return container;

	}

};

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
/*global THREE, console */

( function () {

	function OrbitConstraint ( object ) {

		this.object = object;

		// "target" sets the location of focus, where the object orbits around
		// and where it pans with respect to.
		this.target = new THREE.Vector3();

		// Limits to how far you can dolly in and out ( PerspectiveCamera only )
		this.minDistance = 0;
		this.maxDistance = Infinity;

		// Limits to how far you can zoom in and out ( OrthographicCamera only )
		this.minZoom = 0;
		this.maxZoom = Infinity;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		// How far you can orbit horizontally, upper and lower limits.
		// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
		this.minAzimuthAngle = - Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians

		// Set to true to enable damping (inertia)
		// If damping is enabled, you must call controls.update() in your animation loop
		this.enableDamping = false;
		this.dampingFactor = 0.25;

		////////////
		// internals

		var scope = this;

		var EPS = 0.000001;

		// Current position in spherical coordinate system.
		var theta;
		var phi;

		// Pending changes
		var phiDelta = 0;
		var thetaDelta = 0;
		var scale = 1;
		var panOffset = new THREE.Vector3();
		var zoomChanged = false;

		// API

		this.getPolarAngle = function () {

			return phi;

		};

		this.getAzimuthalAngle = function () {

			return theta;

		};

		this.rotateLeft = function ( angle ) {

			thetaDelta -= angle;

		};

		this.rotateUp = function ( angle ) {

			phiDelta -= angle;

		};

		// pass in distance in world space to move left
		this.panLeft = function() {

			var v = new THREE.Vector3();

			return function panLeft ( distance ) {

				var te = this.object.matrix.elements;

				// get X column of matrix
				v.set( te[ 0 ], te[ 1 ], te[ 2 ] );
				v.multiplyScalar( - distance );

				panOffset.add( v );

			};

		}();

		// pass in distance in world space to move up
		this.panUp = function() {

			var v = new THREE.Vector3();

			return function panUp ( distance ) {

				var te = this.object.matrix.elements;

				// get Y column of matrix
				v.set( te[ 4 ], te[ 5 ], te[ 6 ] );
				v.multiplyScalar( distance );

				panOffset.add( v );

			};

		}();

		// pass in x,y of change desired in pixel space,
		// right and down are positive
		this.pan = function ( deltaX, deltaY, screenWidth, screenHeight ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				// perspective
				var position = scope.object.position;
				var offset = position.clone().sub( scope.target );
				var targetDistance = offset.length();

				// half of the fov is center to top of screen
				targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

				// we actually don't use screenWidth, since perspective camera is fixed to screen height
				scope.panLeft( 2 * deltaX * targetDistance / screenHeight );
				scope.panUp( 2 * deltaY * targetDistance / screenHeight );

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				// orthographic
				scope.panLeft( deltaX * ( scope.object.right - scope.object.left ) / screenWidth );
				scope.panUp( deltaY * ( scope.object.top - scope.object.bottom ) / screenHeight );

			} else {

				// camera neither orthographic or perspective
				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

			}

		};

		this.dollyIn = function ( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale /= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom * dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

			}

		};

		this.dollyOut = function ( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale *= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom / dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

			}

		};

		this.update = function() {

			var offset = new THREE.Vector3();

			// so camera.up is the orbit axis
			var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
			var quatInverse = quat.clone().inverse();

			var lastPosition = new THREE.Vector3();
			var lastQuaternion = new THREE.Quaternion();

			return function () {

				var position = this.object.position;

				offset.copy( position ).sub( this.target );

				// rotate offset to "y-axis-is-up" space
				offset.applyQuaternion( quat );

				// angle from z-axis around y-axis

				theta = Math.atan2( offset.x, offset.z );

				// angle from y-axis

				phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

				theta += thetaDelta;
				phi += phiDelta;

				// restrict theta to be between desired limits
				theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

				// restrict phi to be between desired limits
				phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

				// restrict phi to be betwee EPS and PI-EPS
				phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

				var radius = offset.length() * scale;

				// restrict radius to be between desired limits
				radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

				// move target to panned location
				this.target.add( panOffset );

				offset.x = radius * Math.sin( phi ) * Math.sin( theta );
				offset.y = radius * Math.cos( phi );
				offset.z = radius * Math.sin( phi ) * Math.cos( theta );

				// rotate offset back to "camera-up-vector-is-up" space
				offset.applyQuaternion( quatInverse );

				position.copy( this.target ).add( offset );

				this.object.lookAt( this.target );

				if ( this.enableDamping === true ) {

					thetaDelta *= ( 1 - this.dampingFactor );
					phiDelta *= ( 1 - this.dampingFactor );

				} else {

					thetaDelta = 0;
					phiDelta = 0;

				}

				scale = 1;
				panOffset.set( 0, 0, 0 );

				// update condition is:
				// min(camera displacement, camera rotation in radians)^2 > EPS
				// using small-angle approximation cos(x/2) = 1 - x^2 / 8

				if ( zoomChanged ||
					 lastPosition.distanceToSquared( this.object.position ) > EPS ||
				    8 * ( 1 - lastQuaternion.dot( this.object.quaternion ) ) > EPS ) {

					lastPosition.copy( this.object.position );
					lastQuaternion.copy( this.object.quaternion );
					zoomChanged = false;

					return true;

				}

				return false;

			};

		}();

	};


	// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
	// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
	// supported.
	//
	//    Orbit - left mouse / touch: one finger move
	//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
	//    Pan - right mouse, or arrow keys / touch: three finter swipe

	THREE.OrbitControls = function ( object, domElement ) {

		var constraint = new OrbitConstraint( object );

		this.domElement = ( domElement !== undefined ) ? domElement : document;

		// API

		Object.defineProperty( this, 'constraint', {

			get: function() {

				return constraint;

			}

		} );

		this.getPolarAngle = function () {

			return constraint.getPolarAngle();

		};

		this.getAzimuthalAngle = function () {

			return constraint.getAzimuthalAngle();

		};

		// Set to false to disable this control
		this.enabled = true;

		// center is old, deprecated; use "target" instead
		this.center = this.target;

		// This option actually enables dollying in and out; left as "zoom" for
		// backwards compatibility.
		// Set to false to disable zooming
		this.enableZoom = true;
		this.zoomSpeed = 1.0;

		// Set to false to disable rotating
		this.enableRotate = true;
		this.rotateSpeed = 1.0;

		// Set to false to disable panning
		this.enablePan = true;
		this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

		// Set to true to automatically rotate around the target
		// If auto-rotate is enabled, you must call controls.update() in your animation loop
		this.autoRotate = false;
		this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// Set to false to disable use of the keys
		this.enableKeys = true;

		// The four arrow keys
		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

		// Mouse buttons
		this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

		////////////
		// internals

		var scope = this;

		var rotateStart = new THREE.Vector2();
		var rotateEnd = new THREE.Vector2();
		var rotateDelta = new THREE.Vector2();

		var panStart = new THREE.Vector2();
		var panEnd = new THREE.Vector2();
		var panDelta = new THREE.Vector2();

		var dollyStart = new THREE.Vector2();
		var dollyEnd = new THREE.Vector2();
		var dollyDelta = new THREE.Vector2();

		var STATE = { NONE : - 1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

		var state = STATE.NONE;

		// for reset

		this.target0 = this.target.clone();
		this.position0 = this.object.position.clone();
		this.zoom0 = this.object.zoom;

		// events

		var changeEvent = { type: 'change' };
		var startEvent = { type: 'start' };
		var endEvent = { type: 'end' };

		// pass in x,y of change desired in pixel space,
		// right and down are positive
		function pan( deltaX, deltaY ) {

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			constraint.pan( deltaX, deltaY, element.clientWidth, element.clientHeight );

		}

		this.update = function () {

			if ( this.autoRotate && state === STATE.NONE ) {

				constraint.rotateLeft( getAutoRotationAngle() );

			}

			if ( constraint.update() === true ) {

				this.dispatchEvent( changeEvent );

			}

		};

		this.reset = function () {

			state = STATE.NONE;

			this.target.copy( this.target0 );
			this.object.position.copy( this.position0 );
			this.object.zoom = this.zoom0;

			this.object.updateProjectionMatrix();
			this.dispatchEvent( changeEvent );

			this.update();

		};

		function getAutoRotationAngle() {

			return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

		}

		function getZoomScale() {

			return Math.pow( 0.95, scope.zoomSpeed );

		}

		function onMouseDown( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			if ( event.button === scope.mouseButtons.ORBIT ) {

				if ( scope.enableRotate === false ) return;

				state = STATE.ROTATE;

				rotateStart.set( event.clientX, event.clientY );

			} else if ( event.button === scope.mouseButtons.ZOOM ) {

				if ( scope.enableZoom === false ) return;

				state = STATE.DOLLY;

				dollyStart.set( event.clientX, event.clientY );

			} else if ( event.button === scope.mouseButtons.PAN ) {

				if ( scope.enablePan === false ) return;

				state = STATE.PAN;

				panStart.set( event.clientX, event.clientY );

			}

			if ( state !== STATE.NONE ) {

				document.addEventListener( 'mousemove', onMouseMove, false );
				document.addEventListener( 'mouseup', onMouseUp, false );
				scope.dispatchEvent( startEvent );

			}

		}

		function onMouseMove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			if ( state === STATE.ROTATE ) {

				if ( scope.enableRotate === false ) return;

				rotateEnd.set( event.clientX, event.clientY );
				rotateDelta.subVectors( rotateEnd, rotateStart );

				// rotating across whole screen goes 360 degrees around
				constraint.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

				// rotating up and down along whole screen attempts to go 360, but limited to 180
				constraint.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

				rotateStart.copy( rotateEnd );

			} else if ( state === STATE.DOLLY ) {

				if ( scope.enableZoom === false ) return;

				dollyEnd.set( event.clientX, event.clientY );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {

					constraint.dollyIn( getZoomScale() );

				} else if ( dollyDelta.y < 0 ) {

					constraint.dollyOut( getZoomScale() );

				}

				dollyStart.copy( dollyEnd );

			} else if ( state === STATE.PAN ) {

				if ( scope.enablePan === false ) return;

				panEnd.set( event.clientX, event.clientY );
				panDelta.subVectors( panEnd, panStart );

				pan( panDelta.x, panDelta.y );

				panStart.copy( panEnd );

			}

			if ( state !== STATE.NONE ) scope.update();

		}

		function onMouseUp( /* event */ ) {

			if ( scope.enabled === false ) return;

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( endEvent );
			state = STATE.NONE;

		}

		function onMouseWheel( event ) {

			if ( scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE ) return;

			event.preventDefault();
			event.stopPropagation();

			var delta = 0;

			if ( event.wheelDelta !== undefined ) {

				// WebKit / Opera / Explorer 9

				delta = event.wheelDelta;

			} else if ( event.detail !== undefined ) {

				// Firefox

				delta = - event.detail;

			}

			if ( delta > 0 ) {

				constraint.dollyOut( getZoomScale() );

			} else if ( delta < 0 ) {

				constraint.dollyIn( getZoomScale() );

			}

			scope.update();
			scope.dispatchEvent( startEvent );
			scope.dispatchEvent( endEvent );

		}

		function onKeyDown( event ) {

			if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

			switch ( event.keyCode ) {

				case scope.keys.UP:
					pan( 0, scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.BOTTOM:
					pan( 0, - scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.LEFT:
					pan( scope.keyPanSpeed, 0 );
					scope.update();
					break;

				case scope.keys.RIGHT:
					pan( - scope.keyPanSpeed, 0 );
					scope.update();
					break;

			}

		}

		function touchstart( event ) {

			if ( scope.enabled === false ) return;

			switch ( event.touches.length ) {

				case 1:	// one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;

					state = STATE.TOUCH_ROTATE;

					rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					break;

				case 2:	// two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;

					state = STATE.TOUCH_DOLLY;

					var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
					var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
					var distance = Math.sqrt( dx * dx + dy * dy );
					dollyStart.set( 0, distance );
					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;

					state = STATE.TOUCH_PAN;

					panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					break;

				default:

					state = STATE.NONE;

			}

			if ( state !== STATE.NONE ) scope.dispatchEvent( startEvent );

		}

		function touchmove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();
			event.stopPropagation();

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			switch ( event.touches.length ) {

				case 1: // one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;
					if ( state !== STATE.TOUCH_ROTATE ) return;

					rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					rotateDelta.subVectors( rotateEnd, rotateStart );

					// rotating across whole screen goes 360 degrees around
					constraint.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
					// rotating up and down along whole screen attempts to go 360, but limited to 180
					constraint.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

					rotateStart.copy( rotateEnd );

					scope.update();
					break;

				case 2: // two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;
					if ( state !== STATE.TOUCH_DOLLY ) return;

					var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
					var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
					var distance = Math.sqrt( dx * dx + dy * dy );

					dollyEnd.set( 0, distance );
					dollyDelta.subVectors( dollyEnd, dollyStart );

					if ( dollyDelta.y > 0 ) {

						constraint.dollyOut( getZoomScale() );

					} else if ( dollyDelta.y < 0 ) {

						constraint.dollyIn( getZoomScale() );

					}

					dollyStart.copy( dollyEnd );

					scope.update();
					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;
					if ( state !== STATE.TOUCH_PAN ) return;

					panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					panDelta.subVectors( panEnd, panStart );

					pan( panDelta.x, panDelta.y );

					panStart.copy( panEnd );

					scope.update();
					break;

				default:

					state = STATE.NONE;

			}

		}

		function touchend( /* event */ ) {

			if ( scope.enabled === false ) return;

			scope.dispatchEvent( endEvent );
			state = STATE.NONE;

		}

		function contextmenu( event ) {

			event.preventDefault();

		}

		this.dispose = function() {

			this.domElement.removeEventListener( 'contextmenu', contextmenu, false );
			this.domElement.removeEventListener( 'mousedown', onMouseDown, false );
			this.domElement.removeEventListener( 'mousewheel', onMouseWheel, false );
			this.domElement.removeEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

			this.domElement.removeEventListener( 'touchstart', touchstart, false );
			this.domElement.removeEventListener( 'touchend', touchend, false );
			this.domElement.removeEventListener( 'touchmove', touchmove, false );

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );

			window.removeEventListener( 'keydown', onKeyDown, false );

		}

		this.domElement.addEventListener( 'contextmenu', contextmenu, false );

		this.domElement.addEventListener( 'mousedown', onMouseDown, false );
		this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
		this.domElement.addEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

		this.domElement.addEventListener( 'touchstart', touchstart, false );
		this.domElement.addEventListener( 'touchend', touchend, false );
		this.domElement.addEventListener( 'touchmove', touchmove, false );

		window.addEventListener( 'keydown', onKeyDown, false );

		// force an update at start
		this.update();

	};

	THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
	THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

	Object.defineProperties( THREE.OrbitControls.prototype, {

		object: {

			get: function () {

				return this.constraint.object;

			}

		},

		target: {

			get: function () {

				return this.constraint.target;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: target is now immutable. Use target.set() instead.' );
				this.constraint.target.copy( value );

			}

		},

		minDistance : {

			get: function () {

				return this.constraint.minDistance;

			},

			set: function ( value ) {

				this.constraint.minDistance = value;

			}

		},

		maxDistance : {

			get: function () {

				return this.constraint.maxDistance;

			},

			set: function ( value ) {

				this.constraint.maxDistance = value;

			}

		},

		minZoom : {

			get: function () {

				return this.constraint.minZoom;

			},

			set: function ( value ) {

				this.constraint.minZoom = value;

			}

		},

		maxZoom : {

			get: function () {

				return this.constraint.maxZoom;

			},

			set: function ( value ) {

				this.constraint.maxZoom = value;

			}

		},

		minPolarAngle : {

			get: function () {

				return this.constraint.minPolarAngle;

			},

			set: function ( value ) {

				this.constraint.minPolarAngle = value;

			}

		},

		maxPolarAngle : {

			get: function () {

				return this.constraint.maxPolarAngle;

			},

			set: function ( value ) {

				this.constraint.maxPolarAngle = value;

			}

		},

		minAzimuthAngle : {

			get: function () {

				return this.constraint.minAzimuthAngle;

			},

			set: function ( value ) {

				this.constraint.minAzimuthAngle = value;

			}

		},

		maxAzimuthAngle : {

			get: function () {

				return this.constraint.maxAzimuthAngle;

			},

			set: function ( value ) {

				this.constraint.maxAzimuthAngle = value;

			}

		},

		enableDamping : {

			get: function () {

				return this.constraint.enableDamping;

			},

			set: function ( value ) {

				this.constraint.enableDamping = value;

			}

		},

		dampingFactor : {

			get: function () {

				return this.constraint.dampingFactor;

			},

			set: function ( value ) {

				this.constraint.dampingFactor = value;

			}

		},

		// backward compatibility

		noZoom: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				return ! this.enableZoom;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				this.enableZoom = ! value;

			}

		},

		noRotate: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				return ! this.enableRotate;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				this.enableRotate = ! value;

			}

		},

		noPan: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				return ! this.enablePan;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				this.enablePan = ! value;

			}

		},

		noKeys: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				return ! this.enableKeys;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				this.enableKeys = ! value;

			}

		},

		staticMoving : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				return ! this.constraint.enableDamping;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				this.constraint.enableDamping = ! value;

			}

		},

		dynamicDampingFactor : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				return this.constraint.dampingFactor;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				this.constraint.dampingFactor = value;

			}

		}

	} );

}() );

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
var Curves = {};
Curves["0"] = function(){
var Curve_v01 = [[new THREE.Vector4(1.424353903,7.049533223,0.7622400506,1),
new THREE.Vector4(1.409736935,7.059722012,0.7466518118,1),
new THREE.Vector4(1.377309589,7.081616496,0.7141939137,1),
new THREE.Vector4(1.276928222,7.14262228,0.6279121192,1),
new THREE.Vector4(1.121098413,7.213401213,0.5140462688,1),
new THREE.Vector4(0.9066189889,7.266452516,0.3689983484,1),
new THREE.Vector4(0.6737666517,7.263015937,0.1992018014,1),
new THREE.Vector4(0.4685443608,7.148590667,-0.001431390323,1),
new THREE.Vector4(0.2446195695,6.744877036,-0.2467398717,1),
new THREE.Vector4(-0.01530479833,5.830926716,-0.5212387409,1),
new THREE.Vector4(-0.05568110613,4.49202249,-0.7458084502,1),
new THREE.Vector4(0.3272221711,3.316898113,-0.8340111683,1),
new THREE.Vector4(0.8378870594,2.753391899,-0.8078678145,1),
new THREE.Vector4(1.361031785,2.345768685,-0.6719532145,1),
new THREE.Vector4(2.069071781,1.321296085,-0.3646095215,1),
new THREE.Vector4(2.096553473,-1.21325859,0.1314345049,1),
new THREE.Vector4(1.18873752,-3.402234592,0.4386353795,1),
new THREE.Vector4(0.5422366476,-4.612949145,0.5153196088,1),
new THREE.Vector4(0.273228339,-5.247256795,0.4797441691,1),
new THREE.Vector4(0.1882683461,-5.61045456,0.4114009821,1),
new THREE.Vector4(0.1649549711,-5.859705337,0.3512192752,1),
new THREE.Vector4(0.1489688837,-6.038438227,0.3039248974,1),
new THREE.Vector4(0.1366702187,-6.158660009,0.2681692944,1),
new THREE.Vector4(0.1290623822,-6.22838446,0.2460972142,1),
new THREE.Vector4(0.1241377673,-6.275293149,0.2313149571,1),
new THREE.Vector4(0.12136275,-6.302517394,0.2227804046,1),
new THREE.Vector4(0.119688749,-6.3191868,0.2175626465,1),
],[new THREE.Vector4(0.6471192308,8.431388666,2.333960027,1),
new THREE.Vector4(0.6456899979,8.449557798,2.320796742,1),
new THREE.Vector4(0.6427837831,8.489620457,2.293369453,1),
new THREE.Vector4(0.6355557724,8.611085058,2.219799297,1),
new THREE.Vector4(0.6274878351,8.799300962,2.121645474,1),
new THREE.Vector4(0.6197375381,9.068189406,1.991957271,1),
new THREE.Vector4(0.6132844213,9.382741951,1.823265484,1),
new THREE.Vector4(0.6083439751,9.659393256,1.586206137,1),
new THREE.Vector4(0.6120785313,9.727427582,1.241828469,1),
new THREE.Vector4(0.6422727763,9.35457524,0.7653524094,1),
new THREE.Vector4(0.3184645129,8.043525736,0.1562368175,1),
new THREE.Vector4(-0.2908442253,5.481382245,-0.4216551813,1),
new THREE.Vector4(0.1689199219,3.188889541,-0.6871823181,1),
new THREE.Vector4(0.9458305112,2.397487919,-0.6333426129,1),
new THREE.Vector4(1.6012203,1.319249758,-0.1934626499,1),
new THREE.Vector4(0.9565781851,-1.566662758,0.7232586158,1),
new THREE.Vector4(-0.1718229005,-3.555222791,1.206242395,1),
new THREE.Vector4(-0.4116774273,-4.451898649,1.260183616,1),
new THREE.Vector4(-0.4557447933,-4.984360452,1.222043737,1),
new THREE.Vector4(-0.4829149597,-5.360375755,1.173136013,1),
new THREE.Vector4(-0.5022594741,-5.624007519,1.123974167,1),
new THREE.Vector4(-0.5170187282,-5.805488915,1.080519103,1),
new THREE.Vector4(-0.5284959536,-5.926635079,1.04617702,1),
new THREE.Vector4(-0.5358581713,-5.996674733,1.024582762,1),
new THREE.Vector4(-0.5407285034,-6.04368655,1.009961795,1),
new THREE.Vector4(-0.5435128484,-6.070929341,1.001460753,1),
new THREE.Vector4(-0.5452019355,-6.087600795,0.9962500597,1),
],[new THREE.Vector4(-0.2551867658,9.667149983,3.726015801,1),
new THREE.Vector4(-0.2618116094,9.684613408,3.715285722,1),
new THREE.Vector4(-0.2756589838,9.723334796,3.692846172,1),
new THREE.Vector4(-0.313071052,9.842689036,3.631623824,1),
new THREE.Vector4(-0.3626940318,10.04811735,3.550671894,1),
new THREE.Vector4(-0.4244664932,10.39132003,3.444640395,1),
new THREE.Vector4(-0.4926404319,10.86522974,3.292513962,1),
new THREE.Vector4(-0.5616913897,11.36891099,3.020189158,1),
new THREE.Vector4(-0.6029446236,11.57107598,2.504323875,1),
new THREE.Vector4(-0.5383877383,10.95549047,1.677496313,1),
new THREE.Vector4(-0.3205866505,9.30480987,0.7171983074,1),
new THREE.Vector4(-0.8286107614,5.905379008,-0.1708713167,1),
new THREE.Vector4(-0.07088806227,2.871742731,-0.5972447502,1),
new THREE.Vector4(0.8975504752,2.123669597,-0.565995464,1),
new THREE.Vector4(1.34801147,0.9824178222,0.01277058633,1),
new THREE.Vector4(0.5621722813,-1.368544785,1.057437269,1),
new THREE.Vector4(-0.5204849321,-2.938942109,1.665914702,1),
new THREE.Vector4(-1.111365958,-4.015154511,1.934853232,1),
new THREE.Vector4(-1.194310418,-4.680915623,1.976694115,1),
new THREE.Vector4(-1.202430105,-5.110048128,1.955059677,1),
new THREE.Vector4(-1.210396385,-5.392140886,1.915434935,1),
new THREE.Vector4(-1.219634492,-5.576819374,1.874005422,1),
new THREE.Vector4(-1.227858947,-5.698973799,1.84003134,1),
new THREE.Vector4(-1.233492526,-5.769294208,1.818290081,1),
new THREE.Vector4(-1.237299414,-5.816348396,1.803411821,1),
new THREE.Vector4(-1.239504457,-5.843560363,1.794702569,1),
new THREE.Vector4(-1.240852217,-5.86019279,1.789342799,1),
],];
var degree1_v01 =2;
var degree2_v01 =26;
var knots1_v01 = [0,0,0,1,1,1,];
var knots2_v01 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,];
var nurbsSurface_v01 = new THREE.NURBSSurface(degree1_v01, degree2_v01, knots1_v01, knots2_v01,Curve_v01);
return function(u, v) {return nurbsSurface_v01.getPoint(v,u);};
};
Curves["0"].animation = [[1,-1],[5,-0.1186609015],[32,0.1485736247],[36,1]];
Curves["0"].divisions = "|group2|_90_5_v05";Curves["1"] = function(){
var Curve_v01 = [[new THREE.Vector4(1.424353903,7.049533223,0.7622400506,1),
new THREE.Vector4(1.409736935,7.059722012,0.7466518118,1),
new THREE.Vector4(1.377309589,7.081616496,0.7141939137,1),
new THREE.Vector4(1.276928222,7.14262228,0.6279121192,1),
new THREE.Vector4(1.121098413,7.213401213,0.5140462688,1),
new THREE.Vector4(0.9066189889,7.266452516,0.3689983484,1),
new THREE.Vector4(0.6737666517,7.263015937,0.1992018014,1),
new THREE.Vector4(0.4685443608,7.148590667,-0.001431390323,1),
new THREE.Vector4(0.2446195695,6.744877036,-0.2467398717,1),
new THREE.Vector4(-0.01530479833,5.830926716,-0.5212387409,1),
new THREE.Vector4(-0.05568110613,4.49202249,-0.7458084502,1),
new THREE.Vector4(0.3272221711,3.316898113,-0.8340111683,1),
new THREE.Vector4(0.8378870594,2.753391899,-0.8078678145,1),
new THREE.Vector4(1.361031785,2.345768685,-0.6719532145,1),
new THREE.Vector4(2.069071781,1.321296085,-0.3646095215,1),
new THREE.Vector4(2.096553473,-1.21325859,0.1314345049,1),
new THREE.Vector4(1.18873752,-3.402234592,0.4386353795,1),
new THREE.Vector4(0.5422366476,-4.612949145,0.5153196088,1),
new THREE.Vector4(0.273228339,-5.247256795,0.4797441691,1),
new THREE.Vector4(0.1882683461,-5.61045456,0.4114009821,1),
new THREE.Vector4(0.1649549711,-5.859705337,0.3512192752,1),
new THREE.Vector4(0.1489688837,-6.038438227,0.3039248974,1),
new THREE.Vector4(0.1366702187,-6.158660009,0.2681692944,1),
new THREE.Vector4(0.1290623822,-6.22838446,0.2460972142,1),
new THREE.Vector4(0.1241377673,-6.275293149,0.2313149571,1),
new THREE.Vector4(0.12136275,-6.302517394,0.2227804046,1),
new THREE.Vector4(0.119688749,-6.3191868,0.2175626465,1),
],[new THREE.Vector4(0.6471192308,8.431388666,2.333960027,1),
new THREE.Vector4(0.6456899979,8.449557798,2.320796742,1),
new THREE.Vector4(0.6427837831,8.489620457,2.293369453,1),
new THREE.Vector4(0.6355557724,8.611085058,2.219799297,1),
new THREE.Vector4(0.6274878351,8.799300962,2.121645474,1),
new THREE.Vector4(0.6197375381,9.068189406,1.991957271,1),
new THREE.Vector4(0.6132844213,9.382741951,1.823265484,1),
new THREE.Vector4(0.6083439751,9.659393256,1.586206137,1),
new THREE.Vector4(0.6120785313,9.727427582,1.241828469,1),
new THREE.Vector4(0.6422727763,9.35457524,0.7653524094,1),
new THREE.Vector4(0.3184645129,8.043525736,0.1562368175,1),
new THREE.Vector4(-0.2908442253,5.481382245,-0.4216551813,1),
new THREE.Vector4(0.1689199219,3.188889541,-0.6871823181,1),
new THREE.Vector4(0.9458305112,2.397487919,-0.6333426129,1),
new THREE.Vector4(1.6012203,1.319249758,-0.1934626499,1),
new THREE.Vector4(0.9565781851,-1.566662758,0.7232586158,1),
new THREE.Vector4(-0.1718229005,-3.555222791,1.206242395,1),
new THREE.Vector4(-0.4116774273,-4.451898649,1.260183616,1),
new THREE.Vector4(-0.4557447933,-4.984360452,1.222043737,1),
new THREE.Vector4(-0.4829149597,-5.360375755,1.173136013,1),
new THREE.Vector4(-0.5022594741,-5.624007519,1.123974167,1),
new THREE.Vector4(-0.5170187282,-5.805488915,1.080519103,1),
new THREE.Vector4(-0.5284959536,-5.926635079,1.04617702,1),
new THREE.Vector4(-0.5358581713,-5.996674733,1.024582762,1),
new THREE.Vector4(-0.5407285034,-6.04368655,1.009961795,1),
new THREE.Vector4(-0.5435128484,-6.070929341,1.001460753,1),
new THREE.Vector4(-0.5452019355,-6.087600795,0.9962500597,1),
],[new THREE.Vector4(-0.2551867658,9.667149983,3.726015801,1),
new THREE.Vector4(-0.2618116094,9.684613408,3.715285722,1),
new THREE.Vector4(-0.2756589838,9.723334796,3.692846172,1),
new THREE.Vector4(-0.313071052,9.842689036,3.631623824,1),
new THREE.Vector4(-0.3626940318,10.04811735,3.550671894,1),
new THREE.Vector4(-0.4244664932,10.39132003,3.444640395,1),
new THREE.Vector4(-0.4926404319,10.86522974,3.292513962,1),
new THREE.Vector4(-0.5616913897,11.36891099,3.020189158,1),
new THREE.Vector4(-0.6029446236,11.57107598,2.504323875,1),
new THREE.Vector4(-0.5383877383,10.95549047,1.677496313,1),
new THREE.Vector4(-0.3205866505,9.30480987,0.7171983074,1),
new THREE.Vector4(-0.8286107614,5.905379008,-0.1708713167,1),
new THREE.Vector4(-0.07088806227,2.871742731,-0.5972447502,1),
new THREE.Vector4(0.8975504752,2.123669597,-0.565995464,1),
new THREE.Vector4(1.34801147,0.9824178222,0.01277058633,1),
new THREE.Vector4(0.5621722813,-1.368544785,1.057437269,1),
new THREE.Vector4(-0.5204849321,-2.938942109,1.665914702,1),
new THREE.Vector4(-1.111365958,-4.015154511,1.934853232,1),
new THREE.Vector4(-1.194310418,-4.680915623,1.976694115,1),
new THREE.Vector4(-1.202430105,-5.110048128,1.955059677,1),
new THREE.Vector4(-1.210396385,-5.392140886,1.915434935,1),
new THREE.Vector4(-1.219634492,-5.576819374,1.874005422,1),
new THREE.Vector4(-1.227858947,-5.698973799,1.84003134,1),
new THREE.Vector4(-1.233492526,-5.769294208,1.818290081,1),
new THREE.Vector4(-1.237299414,-5.816348396,1.803411821,1),
new THREE.Vector4(-1.239504457,-5.843560363,1.794702569,1),
new THREE.Vector4(-1.240852217,-5.86019279,1.789342799,1),
],];
var degree1_v01 =2;
var degree2_v01 =26;
var knots1_v01 = [0,0,0,1,1,1,];
var knots2_v01 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,];
var nurbsSurface_v01 = new THREE.NURBSSurface(degree1_v01, degree2_v01, knots1_v01, knots2_v01,Curve_v01);
return function(u, v) {return nurbsSurface_v01.getPoint(v,u);};
};
Curves["1"].animation = [[1,-1],[5,-0.1186609015],[32,0.1485736247],[36,1]];
Curves["1"].divisions = "|group2|_90_5_v04";Curves["2"] = function(){
var Curve_v01 = [[new THREE.Vector4(0.08257660911,4.090839779,0.3395213961,1),
new THREE.Vector4(0.08271018111,4.0866595,0.349043228,1),
new THREE.Vector4(0.08316319413,4.07803672,0.3690839872,1),
new THREE.Vector4(0.08546506455,4.055637282,0.4236894712,1),
new THREE.Vector4(0.08959832102,4.025895262,0.4967588039,1),
new THREE.Vector4(0.09452306622,3.985260617,0.5887046815,1),
new THREE.Vector4(0.097992301,3.930082993,0.6915718274,1),
new THREE.Vector4(0.09415353902,3.845413646,0.8025065071,1),
new THREE.Vector4(0.08055075097,3.70353112,0.9180357208,1),
new THREE.Vector4(0.070090581,3.462150852,1.031895031,1),
new THREE.Vector4(0.08358032241,3.056680114,1.137218898,1),
new THREE.Vector4(0.1049383439,2.383176873,1.264284133,1),
new THREE.Vector4(-0.04698559823,1.33332473,1.530852212,1),
new THREE.Vector4(-0.5817640264,-0.01239039471,2.220131885,1),
new THREE.Vector4(-0.8744092843,-0.7002332336,3.261987575,1),
new THREE.Vector4(-0.6656137658,-0.5633684933,3.879435472,1),
new THREE.Vector4(-0.3646577286,-0.355225208,4.28924978,1),
new THREE.Vector4(-0.1153223384,-0.2729792495,4.530793363,1),
new THREE.Vector4(0.02149960832,-0.27988045,4.673209852,1),
new THREE.Vector4(0.09759990837,-0.3147259543,4.775179273,1),
new THREE.Vector4(0.1521331088,-0.3490579608,4.846517421,1),
new THREE.Vector4(0.1896773885,-0.3776760774,4.897797293,1),
new THREE.Vector4(0.2128986046,-0.399811499,4.934580528,1),
new THREE.Vector4(0.2256898517,-0.4136461267,4.956642215,1),
new THREE.Vector4(0.2343708115,-0.4229734837,4.971283581,1),
new THREE.Vector4(0.2394478806,-0.4283811903,4.979691534,1),
new THREE.Vector4(0.2425660242,-0.4316955927,4.984813778,1),
],[new THREE.Vector4(0.1893203186,4.579711046,0.3869274001,1),
new THREE.Vector4(0.1885553851,4.579391714,0.3975369297,1),
new THREE.Vector4(0.1871950371,4.578862876,0.4201094049,1),
new THREE.Vector4(0.1844008559,4.578197137,0.4832437166,1),
new THREE.Vector4(0.1809507299,4.578689297,0.5726229944,1),
new THREE.Vector4(0.1727297383,4.580759718,0.6976105384,1),
new THREE.Vector4(0.1469232614,4.583178345,0.8644564644,1),
new THREE.Vector4(0.07298504298,4.58113244,1.093184113,1),
new THREE.Vector4(-0.1056616455,4.561401151,1.405676487,1),
new THREE.Vector4(-0.4668173665,4.491913839,1.80114129,1),
new THREE.Vector4(-1.050743584,4.280622815,2.188916189,1),
new THREE.Vector4(-1.890436501,3.539076887,2.474010744,1),
new THREE.Vector4(-2.606378415,2.136467526,2.68740134,1),
new THREE.Vector4(-2.617788117,0.5492008561,3.156493626,1),
new THREE.Vector4(-1.918839217,-0.6690436247,3.693805496,1),
new THREE.Vector4(-1.095105882,-0.7501814797,4.055078438,1),
new THREE.Vector4(-0.6053016255,-0.4946481835,4.412191555,1),
new THREE.Vector4(-0.3571754261,-0.3962317643,4.630547343,1),
new THREE.Vector4(-0.2095879353,-0.3855715301,4.76210515,1),
new THREE.Vector4(-0.1104265618,-0.4012615929,4.852782408,1),
new THREE.Vector4(-0.04605769925,-0.4269299138,4.918469937,1),
new THREE.Vector4(-0.005708771758,-0.4530767756,4.9669582,1),
new THREE.Vector4(0.01877272333,-0.4745796817,5.002290402,1),
new THREE.Vector4(0.03209245548,-0.4882469819,5.023899477,1),
new THREE.Vector4(0.04102632564,-0.4975526136,5.038417579,1),
new THREE.Vector4(0.04621131302,-0.5029821813,5.046820596,1),
new THREE.Vector4(0.0493881484,-0.5063170198,5.051957821,1),
],[new THREE.Vector4(0.21303381,4.762158427,0.1727238638,1),
new THREE.Vector4(0.2098176692,4.76316198,0.1794827606,1),
new THREE.Vector4(0.2030363607,4.76559976,0.1938142524,1),
new THREE.Vector4(0.1840745233,4.774467549,0.2340240634,1),
new THREE.Vector4(0.157208232,4.793636521,0.2911693675,1),
new THREE.Vector4(0.1185898748,4.828842271,0.3739161215,1),
new THREE.Vector4(0.0511104731,4.880973546,0.4912847575,1),
new THREE.Vector4(-0.1105745554,4.944912437,0.6653900566,1),
new THREE.Vector4(-0.5633055786,4.997551654,0.904683717,1),
new THREE.Vector4(-1.741473569,4.952340909,1.070094963,1),
new THREE.Vector4(-3.589016509,4.545257668,0.876912827,1),
new THREE.Vector4(-4.987879434,3.56997635,0.6478460704,1),
new THREE.Vector4(-5.546742189,2.103436551,0.7531592834,1),
new THREE.Vector4(-5.011890291,0.4101786534,1.444855192,1),
new THREE.Vector4(-3.135117579,-1.014925355,2.831687989,1),
new THREE.Vector4(-1.726694504,-1.051773848,3.80774083,1),
new THREE.Vector4(-1.07692946,-0.7558992151,4.392163438,1),
new THREE.Vector4(-0.6848992938,-0.5404248177,4.722895265,1),
new THREE.Vector4(-0.4550106613,-0.4652589085,4.873755511,1),
new THREE.Vector4(-0.3194453077,-0.457576252,4.961092178,1),
new THREE.Vector4(-0.2413781958,-0.4757882692,5.022349476,1),
new THREE.Vector4(-0.1976830318,-0.5007015856,5.068129946,1),
new THREE.Vector4(-0.1720511232,-0.5226332237,5.101164816,1),
new THREE.Vector4(-0.1584363,-0.5369626836,5.121335758,1),
new THREE.Vector4(-0.1494738603,-0.5468308327,5.134935472,1),
new THREE.Vector4(-0.1443357181,-0.5526300504,5.142824835,1),
new THREE.Vector4(-0.1412105346,-0.5562072611,5.147654301,1),
],];
var degree1_v01 =2;
var degree2_v01 =26;
var knots1_v01 = [0,0,0,1,1,1,];
var knots2_v01 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,];
var nurbsSurface_v01 = new THREE.NURBSSurface(degree1_v01, degree2_v01, knots1_v01, knots2_v01,Curve_v01);
return function(u, v) {return nurbsSurface_v01.getPoint(v,u);};
};
Curves["2"].animation = [[1,-1],[5,-0.1186609015],[32,0.1485736247],[36,1]];
Curves["2"].divisions = "|group3|_90_5_v02";Curves["3"] = function(){
var Curve_v01 = [[new THREE.Vector4(0.08257660911,4.090839779,0.3395213961,1),
new THREE.Vector4(0.08271018111,4.0866595,0.349043228,1),
new THREE.Vector4(0.08316319413,4.07803672,0.3690839872,1),
new THREE.Vector4(0.08546506455,4.055637282,0.4236894712,1),
new THREE.Vector4(0.08959832102,4.025895262,0.4967588039,1),
new THREE.Vector4(0.09452306622,3.985260617,0.5887046815,1),
new THREE.Vector4(0.097992301,3.930082993,0.6915718274,1),
new THREE.Vector4(0.09415353902,3.845413646,0.8025065071,1),
new THREE.Vector4(0.08055075097,3.70353112,0.9180357208,1),
new THREE.Vector4(0.070090581,3.462150852,1.031895031,1),
new THREE.Vector4(0.08358032241,3.056680114,1.137218898,1),
new THREE.Vector4(0.1049383439,2.383176873,1.264284133,1),
new THREE.Vector4(-0.04698559823,1.33332473,1.530852212,1),
new THREE.Vector4(-0.5817640264,-0.01239039471,2.220131885,1),
new THREE.Vector4(-0.8744092843,-0.7002332336,3.261987575,1),
new THREE.Vector4(-0.6656137658,-0.5633684933,3.879435472,1),
new THREE.Vector4(-0.3646577286,-0.355225208,4.28924978,1),
new THREE.Vector4(-0.1153223384,-0.2729792495,4.530793363,1),
new THREE.Vector4(0.02149960832,-0.27988045,4.673209852,1),
new THREE.Vector4(0.09759990837,-0.3147259543,4.775179273,1),
new THREE.Vector4(0.1521331088,-0.3490579608,4.846517421,1),
new THREE.Vector4(0.1896773885,-0.3776760774,4.897797293,1),
new THREE.Vector4(0.2128986046,-0.399811499,4.934580528,1),
new THREE.Vector4(0.2256898517,-0.4136461267,4.956642215,1),
new THREE.Vector4(0.2343708115,-0.4229734837,4.971283581,1),
new THREE.Vector4(0.2394478806,-0.4283811903,4.979691534,1),
new THREE.Vector4(0.2425660242,-0.4316955927,4.984813778,1),
],[new THREE.Vector4(0.1893203186,4.579711046,0.3869274001,1),
new THREE.Vector4(0.1885553851,4.579391714,0.3975369297,1),
new THREE.Vector4(0.1871950371,4.578862876,0.4201094049,1),
new THREE.Vector4(0.1844008559,4.578197137,0.4832437166,1),
new THREE.Vector4(0.1809507299,4.578689297,0.5726229944,1),
new THREE.Vector4(0.1727297383,4.580759718,0.6976105384,1),
new THREE.Vector4(0.1469232614,4.583178345,0.8644564644,1),
new THREE.Vector4(0.07298504298,4.58113244,1.093184113,1),
new THREE.Vector4(-0.1056616455,4.561401151,1.405676487,1),
new THREE.Vector4(-0.4668173665,4.491913839,1.80114129,1),
new THREE.Vector4(-1.050743584,4.280622815,2.188916189,1),
new THREE.Vector4(-1.890436501,3.539076887,2.474010744,1),
new THREE.Vector4(-2.606378415,2.136467526,2.68740134,1),
new THREE.Vector4(-2.617788117,0.5492008561,3.156493626,1),
new THREE.Vector4(-1.918839217,-0.6690436247,3.693805496,1),
new THREE.Vector4(-1.095105882,-0.7501814797,4.055078438,1),
new THREE.Vector4(-0.6053016255,-0.4946481835,4.412191555,1),
new THREE.Vector4(-0.3571754261,-0.3962317643,4.630547343,1),
new THREE.Vector4(-0.2095879353,-0.3855715301,4.76210515,1),
new THREE.Vector4(-0.1104265618,-0.4012615929,4.852782408,1),
new THREE.Vector4(-0.04605769925,-0.4269299138,4.918469937,1),
new THREE.Vector4(-0.005708771758,-0.4530767756,4.9669582,1),
new THREE.Vector4(0.01877272333,-0.4745796817,5.002290402,1),
new THREE.Vector4(0.03209245548,-0.4882469819,5.023899477,1),
new THREE.Vector4(0.04102632564,-0.4975526136,5.038417579,1),
new THREE.Vector4(0.04621131302,-0.5029821813,5.046820596,1),
new THREE.Vector4(0.0493881484,-0.5063170198,5.051957821,1),
],[new THREE.Vector4(0.21303381,4.762158427,0.1727238638,1),
new THREE.Vector4(0.2098176692,4.76316198,0.1794827606,1),
new THREE.Vector4(0.2030363607,4.76559976,0.1938142524,1),
new THREE.Vector4(0.1840745233,4.774467549,0.2340240634,1),
new THREE.Vector4(0.157208232,4.793636521,0.2911693675,1),
new THREE.Vector4(0.1185898748,4.828842271,0.3739161215,1),
new THREE.Vector4(0.0511104731,4.880973546,0.4912847575,1),
new THREE.Vector4(-0.1105745554,4.944912437,0.6653900566,1),
new THREE.Vector4(-0.5633055786,4.997551654,0.904683717,1),
new THREE.Vector4(-1.741473569,4.952340909,1.070094963,1),
new THREE.Vector4(-3.589016509,4.545257668,0.876912827,1),
new THREE.Vector4(-4.987879434,3.56997635,0.6478460704,1),
new THREE.Vector4(-5.546742189,2.103436551,0.7531592834,1),
new THREE.Vector4(-5.011890291,0.4101786534,1.444855192,1),
new THREE.Vector4(-3.135117579,-1.014925355,2.831687989,1),
new THREE.Vector4(-1.726694504,-1.051773848,3.80774083,1),
new THREE.Vector4(-1.07692946,-0.7558992151,4.392163438,1),
new THREE.Vector4(-0.6848992938,-0.5404248177,4.722895265,1),
new THREE.Vector4(-0.4550106613,-0.4652589085,4.873755511,1),
new THREE.Vector4(-0.3194453077,-0.457576252,4.961092178,1),
new THREE.Vector4(-0.2413781958,-0.4757882692,5.022349476,1),
new THREE.Vector4(-0.1976830318,-0.5007015856,5.068129946,1),
new THREE.Vector4(-0.1720511232,-0.5226332237,5.101164816,1),
new THREE.Vector4(-0.1584363,-0.5369626836,5.121335758,1),
new THREE.Vector4(-0.1494738603,-0.5468308327,5.134935472,1),
new THREE.Vector4(-0.1443357181,-0.5526300504,5.142824835,1),
new THREE.Vector4(-0.1412105346,-0.5562072611,5.147654301,1),
],];
var degree1_v01 =2;
var degree2_v01 =26;
var knots1_v01 = [0,0,0,1,1,1,];
var knots2_v01 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,];
var nurbsSurface_v01 = new THREE.NURBSSurface(degree1_v01, degree2_v01, knots1_v01, knots2_v01,Curve_v01);
return function(u, v) {return nurbsSurface_v01.getPoint(v,u);};
};
Curves["3"].animation = [[1,-1],[5,-0.1186609015],[32,0.1485736247],[36,1]];
Curves["3"].divisions = "|group3|_90_5_v03";Curves["4"] = function(){
var Curve_v01 = [[new THREE.Vector4(-3.798336746,3.333181645,-39.20703206,1),
new THREE.Vector4(-4.543009799,3.731974958,-38.42061969,1),
new THREE.Vector4(-5.680150509,4.743922047,-36.75393541,1),
new THREE.Vector4(-6.425856978,6.540380952,-34.12751812,1),
new THREE.Vector4(-6.01953931,8.264921498,-31.52396073,1),
new THREE.Vector4(-4.645311251,9.5151833,-29.11456454,1),
new THREE.Vector4(-2.630245618,10.00849983,-27.01989921,1),
new THREE.Vector4(-0.3748152302,9.61486717,-25.29581694,1),
new THREE.Vector4(1.719386424,8.360762878,-23.93183007,1),
new THREE.Vector4(3.312239055,6.407991068,-22.86008021,1),
new THREE.Vector4(4.169903574,4.015315679,-21.97160734,1),
new THREE.Vector4(4.188684533,1.491730908,-21.13616525,1),
new THREE.Vector4(3.398930394,-0.8508622415,-20.22228893,1),
new THREE.Vector4(1.952411159,-2.740109292,-19.1152958,1),
new THREE.Vector4(0.09722928157,-3.977720737,-17.73192159,1),
new THREE.Vector4(-1.856316042,-4.464583282,-16.03096606,1),
new THREE.Vector4(-3.576417265,-4.215422456,-14.01950715,1),
new THREE.Vector4(-4.754772988,-3.361548871,-11.75406112,1),
new THREE.Vector4(-5.152833456,-2.139697589,-9.335844357,1),
new THREE.Vector4(-4.644366204,-0.8652590462,-6.899415463,1),
new THREE.Vector4(-3.247481955,0.1101084787,-4.594693095,1),
new THREE.Vector4(-1.13832105,0.4533847971,-2.563664989,1),
new THREE.Vector4(1.360344227,-0.08933189057,-0.9147326767,1),
new THREE.Vector4(3.81884261,-1.637109101,0.3009221389,1),
new THREE.Vector4(5.766398007,-4.135207965,1.105869688,1),
new THREE.Vector4(6.568225443,-6.215054814,1.461217762,1),
new THREE.Vector4(6.779765905,-7.340997818,1.600936988,1),
],[new THREE.Vector4(-7.804676045,0.03629581,-40.6053548,1),
new THREE.Vector4(-9.224422419,0.382331687,-39.87961333,1),
new THREE.Vector4(-11.84475631,1.674115651,-38.16357011,1),
new THREE.Vector4(-14.70298702,4.971182311,-34.98267648,1),
new THREE.Vector4(-15.54391493,9.353944811,-31.31168421,1),
new THREE.Vector4(-13.86652108,13.90327611,-27.54144898,1),
new THREE.Vector4(-9.681662582,17.50896,-24.14428705,1),
new THREE.Vector4(-3.595497297,19.11811869,-21.56865377,1),
new THREE.Vector4(3.253571998,18.01258478,-20.12152024,1),
new THREE.Vector4(9.414389732,14.0394819,-19.87058766,1),
new THREE.Vector4(13.46101696,7.718113756,-20.59893041,1),
new THREE.Vector4(14.36526085,0.1720039242,-21.83377855,1),
new THREE.Vector4(11.79487199,-7.115665876,-22.95016886,1),
new THREE.Vector4(6.238757711,-12.66637821,-23.32536805,1),
new THREE.Vector4(-1.091635951,-15.3879021,-22.50061106,1),
new THREE.Vector4(-8.564641255,-14.8580738,-20.3013314,1),
new THREE.Vector4(-14.54643566,-11.42400765,-16.87910903,1),
new THREE.Vector4(-17.80930222,-6.089976185,-12.66399571,1),
new THREE.Vector4(-17.8117079,-0.2354721247,-8.244836819,1),
new THREE.Vector4(-14.7792386,4.744777664,-4.216512987,1),
new THREE.Vector4(-9.582250471,7.771779414,-1.03952367,1),
new THREE.Vector4(-3.466327312,8.298271921,1.051647229,1),
new THREE.Vector4(2.274368889,6.368438711,2.073845817,1),
new THREE.Vector4(6.589543235,2.529505711,2.257734087,1),
new THREE.Vector4(8.864736209,-2.358960885,1.966861369,1),
new THREE.Vector4(9.164765761,-5.723860948,1.707844635,1),
new THREE.Vector4(8.976191159,-7.340997818,1.600936988,1),
],];
var degree1_v01 =1;
var degree2_v01 =26;
var knots1_v01 = [0,0,1,1,];
var knots2_v01 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,];
var nurbsSurface_v01 = new THREE.NURBSSurface(degree1_v01, degree2_v01, knots1_v01, knots2_v01,Curve_v01);
return function(u, v) {return nurbsSurface_v01.getPoint(v,u);};
};
Curves["4"].animation = [[1,-1],[5,-0.1186609015],[32,0.1485736247],[36,1]];
Curves["4"].divisions = "|group4|_90_5_v06";

 var noise = function(ix, iy, iz) {

     var x = ix || 0;
     var y = iy || 0;
     var z = iz || 0;
      var X = Math.floor(x)&255, Y = Math.floor(y)&255, Z = Math.floor(z)&255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      var u = fade(x), v = fade(y), w = fade(z);
      var A = p[X  ]+Y, AA = p[A]+Z, AB = p[A+1]+Z,      // HASH COORDINATES OF
          B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;      // THE 8 CUBE CORNERS,
      return lerp(w, lerp(v, lerp(u, grad(p[AA  ], x  , y  , z   ),  // AND ADD
                                     grad(p[BA  ], x-1, y  , z   )), // BLENDED
                             lerp(u, grad(p[AB  ], x  , y-1, z   ),  // RESULTS
                                     grad(p[BB  ], x-1, y-1, z   ))),// FROM  8
                     lerp(v, lerp(u, grad(p[AA+1], x  , y  , z-1 ),  // CORNERS
                                     grad(p[BA+1], x-1, y  , z-1 )), // OF CUBE
                             lerp(u, grad(p[AB+1], x  , y-1, z-1 ),
                                     grad(p[BB+1], x-1, y-1, z-1 ))));
   };
   function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); };
   function lerp(t, a, b) { return a + t * (b - a); };
   function grad(hash, x, y, z) {
      var h = hash & 15;                      // CONVERT LO 4 BITS OF HASH CODE
      var u = h<8 ? x : y,                    // INTO 12 GRADIENT DIRECTIONS.
          v = h<4 ? y : h==12||h==14 ? x : z;
      return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
   };
   var p = [ 151,160,137,91,90,15,
   131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
   190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
   88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
   77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
   102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
   135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
   5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
   223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
   129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
   251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
   49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
   138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180 ];
   for (var i=0; i < 256 ; i++) p.push(p[i]);



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
(function(){
  var renderer = new THREE.WebGLRenderer({antialias: true});
  // Append the canvas element created by the renderer to document body element.
  document.body.appendChild(renderer.domElement);
  // Create a three.js scene.
  var scene = new THREE.Scene();
  var container = document.getElementById( 'webglCanvas' );
  // Create a three.js camera.
  var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
  // Apply VR headset positional data to camera.
  var controls = new THREE.OrbitControls( camera, container );
  var loader = new THREE.TextureLoader();
  var texCol = loader.load('img/sky_2.jpg', onTextureLoaded);
  var texAlpha = loader.load('img/paintStreak_02.png', onTextureLoaded);
  var checker = loader.load('img/checker.jpg', onTextureLoaded);
  var swirl;
  var loading = 0;
  var loaded = false;

  function onTextureLoaded(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    loading++;
    if(loading>1){
      // setupModel();
          sc1.setup();
    }
  }

  function setupModel(){
    var loader = new THREE.OBJLoader( manager );
    loader.load( '../obj/curveTest.obj', function ( object ) {
      // object.traverse( function ( child ) {
      //   if ( child instanceof THREE.Mesh ) {
      //     child.material.map = texture;
      //   }
      // } );
      object.material = new THREE.MeshBasicMaterial( );
      console.log("p888888999999");
      object.position.z = - 1;
      // scene.add( object );
      swirl = object.children[0];
      sc1.setup();
    } );
  }
  // print(noise(1,2,3));
  // Create a VR manager helper to enter and exit VR mode.
  var params = {
    hideButton: false, // Default: false.
    isUndistorted: false // Default: false.
  };

  var geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  var material = new THREE.MeshNormalMaterial();
  var cube = new THREE.Mesh(geometry, material);
  cube.position.z = -1;
  // scene.add(cube);
  var light = new THREE.DirectionalLight( 0xffffff, 3 );
  scene.add(light);
  var lastRender = 0;

  function animate(timestamp) {
    var delta = Math.min(timestamp - lastRender, 500);
    lastRender = timestamp;
    // Apply rotation to cube mesh
    cube.rotation.y += delta * 0.0006;
    // Update VR headset position and apply to camera.

    renderer.setClearColor( sceneSettings.bgColor, 1 );
    renderer.clear();
    controls.update();
    renderer.render( scene, camera );
    requestAnimationFrame(animate);
    if(loaded)
    sc1.draw(lastRender*.001);
  }
  animate(performance ? performance.now() : Date.now());
  function onKey(event) {
    if (event.keyCode == 90) { // z
      controls.resetSensor();
    }
  }
  window.addEventListener('keydown', onKey, true);
})();
