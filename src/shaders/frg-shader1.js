const fragmentShader = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec2 resolution;
uniform vec4 mouse;
uniform float time;
uniform float zoom;
uniform float colorA;
uniform float colorB;

#define R           resolution
#define T           time
#define M           mouse

#define PI          3.14159265359
#define PI2         6.28318530718

#define MAX_DIST    30.00
#define MIN_DIST    0.001

vec2 hash2( vec2 p ){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }
float hash21(vec2 a) { return fract(sin(dot(a,vec2(21.23,41.232)))*41243.2323); }
mat2 rot(float a) { return mat2(cos(a),sin(a),-sin(a),cos(a)); }
//@iq sdf shapes	

float star(in vec2 p, in float r, in float rf)
{
    const vec2 k1 = vec2(0.809016994375, -0.587785252292);
    const vec2 k2 = vec2(-k1.x,k1.y);
    p.x = abs(p.x);
    p -= 2.0*max(dot(k1,p),0.0)*k1;
    p -= 2.0*max(dot(k2,p),0.0)*k2;
    p.x = abs(p.x);
    p.y -= r;
    vec2 ba = rf*vec2(-k1.y,k1.x) - vec2(0,1);
    float h = clamp( dot(p,ba)/dot(ba,ba), 0.0, r );
    return length(p-ba*h) * sign(p.y*ba.x-p.x*ba.y);
}
float opx(in float sdf, in float pz, in float h){
    vec2 w = vec2( sdf, abs(pz) - h );
  	return min(max(w.x, w.y), 0.) + length(max(w, 0.));
}
// globals
vec2 cellId,gid;
vec3 hit,hitPoint;
float tmod,ftime,glow;

// constants
const float size = 3.;
const float hlf = size*.5;
vec2 map(vec3 p, float sg){
    vec2 res = vec2(1e5,0.);
    p.y+=1.;
    p.xz+=T*.6;
    vec3 q = p, r = p;
    vec2 id = floor((q.xz+hlf)/size);
    r.xz=mod(r.xz+2.,4.)-2.;
    float fhs=0.;
    if(tmod<4.){
      	fhs = mod(id.y,2.);
        float mytime = (fhs>.5) ? ftime : -ftime;
        q.x += mytime;
    } else {
      	fhs = mod(id.x,2.);
        float mytime = (fhs>.5) ? ftime : -ftime;
        q.z += mytime;
    }
    
    
    vec2 did = floor((q.xz+hlf)/size);
    q.xz=mod(q.xz+hlf,size)-hlf;
    if(tmod<4.) did.x +=1.;
    
    q-=vec3(0,hlf*.45,0);

    float sbx1 = length(q)-(hlf*.25);
    
    float bxn = star(q.xz,hlf*.85,hlf*.4 );
    float bx1 = opx(bxn,q.y,.05);
    bx1=max(bx1,-(abs(sbx1)-.15));
    if(bx1<res.x) {
        res = vec2(bx1,2.);
        hit=q;
        gid=did;
    }    

    if(sbx1<res.x) {
        res = vec2(sbx1,3.);
        hit=q;
        gid=did;
    }    
    
    float gnd = p.y+.5;
    float lte = length(r-vec3(0,-.5,0))-.125;
    if(sg==1.)gnd=min(lte,gnd);
    if(gnd<res.x) {
        res = vec2(gnd,1.);
        hit=p;
    }
    if(sg==1.) glow += .001/(.00025+lte*lte);
    return res;
}

// Tetrahedron technique @iq
// https://www.iquilezles.org/www/articles/normalsSDF
vec3 normal(vec3 p, float t)
{
    float e = MIN_DIST*t;
    vec2 h =vec2(1,-1)*.5773;
    vec3 n = h.xyy * map(p+h.xyy*e,0.).x+
             h.yyx * map(p+h.yyx*e,0.).x+
             h.yxy * map(p+h.yxy*e,0.).x+
             h.xxx * map(p+h.xxx*e,0.).x;
    return normalize(n);
}

// reduced voronoi based off @iq
// https://www.shadertoy.com/view/ldl3W8
vec3 voronoi( in vec2 x){
    vec2 n = floor(x);
    vec2 f = fract(x);
	vec2 mg, mr;
    float md = 8.,ox = 0.;
    for( float j=-1.; j<=1.; j++ )
    for( float i=-1.; i<=1.; i++ )
    {
        vec2 g = vec2(i,j);
		vec2 o = hash2( n + g );
        vec2 r = g + o - f;
        float d = dot(r,r);
        if( d<md ){
            md = d;
            mr = r;
            mg = g;
        }
    }
    md = 8.;
    for( float j=-1.; j<=1.; j++ )
    for( float i=-1.; i<=1.; i++ )
    {
        vec2 g = mg + vec2(i,j);
		vec2 o = hash2( n + g );
        ox = o.x;
        vec2 r = g + o - f;
        vec2 mrr = mr-r;
        if( dot(mrr,mrr)>1e5 ) md = min( md, dot( .5*(mr+r), normalize(r-mr) ) );
    }
    return vec3(md,ox,mr.x);
}

vec3 vor3D(in vec3 p, in vec3 n ){
    n = max(abs(n), MIN_DIST);
    n /= dot(n, vec3(1));
	vec3 tx = voronoi(p.yz).xyz;
    vec3 ty = voronoi(p.zx).xyz;
    vec3 tz = voronoi(p.xy).xyz;
    return mat3(tx*tx, ty*ty, tz*tz)*n;
    //return (tx*tx*n.x + ty*ty*n.y + tz*tz*n.z);
}

vec3 glintz( vec3 lcol, vec3 hitPoint, vec3 n, vec3 rd, vec3 lpos) {
    vec3 mate;
    vec3 pos = hitPoint;
    
    vec3 h = normalize(lpos-rd);
    float nh = abs(dot(n,h)), nl = dot(n,lpos);
    vec3 light = lcol*max(.0,nl)*1.5;
    vec3 coord = pos*1.5, coord2 = coord;

    vec3 ww = fwidth(pos);
    vec3 glints=vec3(0);
    float pw,q,anisotropy;
    vec3 tcoord;
 
    //build layers
    for(int i = 0; i < 2;i++) {

        if( i==0 ) {
            anisotropy=.55;
            pw=R.x*.20;
            tcoord=coord;
        } else {
            anisotropy=.62;
            pw=R.x*.10;
            tcoord=coord2;
        }
        
        vec3 aniso = vec3(vor3D(tcoord*pw,n).yy, vor3D(tcoord.zyx*vec3(pw,-pw,-pw),n).y)*1.0-.5;
        if(i==0) {
            aniso -= n*dot(aniso,n);
            aniso /= min(1.,length(aniso));
        }

        float ah = abs(dot(h,aniso));
 
        if( i==0 ) {
            q = exp2((1.15-anisotropy)*2.5);
            nh = pow( nh, q*4.);
            nh *= pow( 1.-ah*anisotropy, 10.);
        } else {
            q = exp2((.1-anisotropy)*3.5);
            nh = pow( nh, q*.4);
            nh *= pow( 1.-ah*anisotropy, 150.);
        }     

        glints += 
        (lcol*nh*exp2(((i==0?1.25:1.)-anisotropy)*1.3))*smoothstep(.0,.5,nl);
    }

    float fresnel = pow(1.0 + dot(n,rd), 2.0);
    fresnel = mix( 0.0, 0.95, fresnel );

    return 
        mix(light*vec3(0.3), vec3(glow*.5), fresnel) +
        glints +
        lcol * .3;
}

void main()
{
    // precal
    tmod=mod(T,8.);
    ftime = fract(T*.25)*size;
    vec2 F = gl_FragCoord.xy;
    vec2 uv = (2.* F.xy-R.xy)/max(R.x,R.y);

    vec3 ro = vec3(0, 0, 5.75);
    vec3 rd = normalize(vec3(uv, -1.0));
    
    // mouse //
    float x = M.xy==vec2(0) ? -1.3 : -(1.3+(M.y/R.y*.25-.125)*PI);
    float y = M.xy==vec2(0) ? 0.26 : -(M.x/R.x*.5-.25)*PI;
    if(x>-.2) x=-.2;
    mat2 rx =rot(x);
    mat2 ry =rot(y);
    ro.zy*=rx;rd.zy*=rx;
    ro.xz*=ry;rd.xz*=ry;

    vec3 color = vec3(.0);
    float d = 0.0;
    float m = 0.0;
    
    vec3 n = vec3(0);
    vec3 p = vec3(0);
    // marcher
    for(int i=0;i<128;i++)
    {
        p = ro + rd * d;
        vec2 ray = map(p,1.);
        if(abs(ray.x)<MIN_DIST*d||d>MAX_DIST)break;
        d += i<64? ray.x*.5: ray.x;
        m  = ray.y;
    } 

    if (d < MAX_DIST) 
    {
        hitPoint=hit;
        cellId=gid;
        vec3 n = normal(p, d);
        vec3 lpos =vec3(9.*sin(T*2.3),5,5.*cos(T*2.3));
        vec3 l = normalize(lpos-p);

        float diff = clamp(dot(n,l),.05,1.);
        
        //shadows
        float shdw = 1.0;
        float t = .025;
        for( float i=.0; i<18.; i++)
        {
            float h = map(p + l*t,0.).x;
            if( h<MIN_DIST ) { shdw = 0.; break; }
            shdw = min(shdw, 14.*h/t);
            t += h *.9;
            if( shdw<MIN_DIST || t>32. ) break;
        }

        diff = mix(diff,diff*shdw,.75);

        vec3 h = vec3(.5);
        // materials
        // different variations based on hitPoint scale.
        if(m==1.) {
            vec3 hp = hitPoint*.25;
            float px=fwidth(hp.x);
            vec2 id = floor(hp.xz);
            vec2 f = fract(hp.xz)-.5;
            vec2 f2 = fract(hitPoint.xz*2.)-.5;

            h=(f2.x*f2.y>0.)?vec3(0.129,0.129,0.129):vec3(0.620,0.620,0.620);

            float chk = mod(id.y + id.x,2.) * 2. - 1.;
            float d2=length(f)-.35;
            d2=smoothstep(px,-px,d2);
            h=mix(h,chk>0.?
            glintz(vec3(0.969,0.800,0.431),hitPoint*.10, n, rd, l):
            glintz(vec3(0.941,0.941,0.941),hitPoint*.01, n, rd, l)
            ,d2);
        }

        if(m==2.){
            float ck = mod(cellId.y + cellId.x,2.) * 2. - 1.;
            vec3 lcol = ck>0.?vec3(0.286,0.886,0.992):vec3(0.961,0.655,0.000);
            h=glintz(lcol, ck>0.?hitPoint*.025:hitPoint*.5, n, rd, l);
        }

        if(m==3.){
            float ck = mod(cellId.y + cellId.x,2.) * 2. - 1.;
            float ff = .5+.5*sin(p.x*1.3) + .5*cos(p.y*1.3);
            vec3 lcol = vec3(ck>0.?.9:.05);
            h=glintz(lcol, hitPoint*.25, n, rd, l);
        }
        color = h*diff;
    }

    color = mix(vec3(.1),color,exp(-.00015*d*d*d));
    color+=clamp(glow,0.,.95);
    color=pow(color, vec3(.4545));
    // Output to screen
    fragColor = vec4(color,1.0);
}
`;

export default fragmentShader;
