const fragmentShader = `#version 300 es
#if __VERSION__ < 130
#define TEXTURE2D texture2D
#else
#define TEXTURE2D texture
#endif

precision mediump float;
out vec4 fragColor;

uniform sampler2D iChannel0;
uniform sampler2D iChannel1;

uniform vec2 resolution;
uniform vec4 mouse;
uniform float time;
//uniform vec2 v_texcoord;

#define R           resolution
#define T           time
#define M           mouse

#define PI  3.14159265359
#define PI2 6.28318530718

#define MAX_DIST    75.
#define MIN_DIST    .001

float hash21(vec2 p){ return fract(sin(dot(p,vec2(26.34,45.32)))*4324.23); }
mat2 rot(float a){ return mat2(cos(a),sin(a),-sin(a),cos(a)); }

float vmax(vec3 p){ return max(max(p.x,p.y),p.z); }
float box(vec3 p, vec3 b)
{
	vec3 d = abs(p) - b;
	return length(max(d,vec3(0))) + vmax(min(d,vec3(0)));
}
//@iq
float cap( vec3 p, float h, float r )
{
  vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(h,r);
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

vec3 hit=vec3(0),hitPoint=vec3(0);
float g_hs,s_hs;
mat2 turn,ria,gia;

vec2 map(vec3 pos, float sg)
{
    pos.y-=2.25;

    vec2 res = vec2(1e5,0.);
    vec3 q = pos-vec3(0.,.75,0.);

    float amount = 16.;
    //@Shane polar rep
    float a = atan(q.z, q.x);
    float ia = floor(a/6.2831853*amount);
    ia = (ia + .5)/amount*6.2831853;
    //id cell and wave function
    float id = -mod(ia,.0);
    float cy = sin( id*4. + (T * .5) * PI) * .95;

    mat2 rxa = rot(ia);
    q.xz *= rxa;
    q.xy -= vec2(7.75,-cy);
  
    float hs = hash21(vec2(id,3.34));
    int pk = int(floor(hs*10.));

    //dice rotation
    vec3 dp = q;
    dp.yx*=turn;
    dp.zx*=turn;

    float d1 = box(dp,vec3(.425))-.15;
    if(d1<res.x)
    {
        res = vec2(d1,2.);
        hit=dp;
        g_hs=hs;
        ria=rxa;
    }

    float bse = cap(pos-vec3(-2.5, .0,-3) ,2.,2.5);
    bse=min(length( pos-vec3( 2.2,-.4, 3))-2.,bse);
    if(bse<res.x)
    {
        res=vec2(bse,3.);
    	hit=pos;
    }
    
    float flr = pos.y+2.5;
    if(flr<res.x)
    {
        res=vec2(flr,1.);
    	hit=pos;
    }
    
    return res;
}

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

vec2 marcher(vec3 ro, vec3 rd, int maxsteps, float sg){
	float d = 0.;
    float m = 0.;
    for(int i=0;i<maxsteps;i++){
    	vec2 ray = map(ro + rd * d, sg);
        if(ray.x<MIN_DIST*d||d>MAX_DIST) break;
        d += i<32 ? ray.x*.5 : ray.x;
        m  = ray.y;
    }
	return vec2(d,m);
}

// https://learnopengl.com/Advanced-Lighting/Gamma-Correction
vec3 decodeSRGB(vec3 screenRGB) { return pow(screenRGB, vec3(2.2)); }

// Tri-Planar blending function. GPU Gems 3 - Ryan Geiss:
vec3 tex3D(sampler2D t, in vec3 p, in vec3 n ){
    n = max(abs(n), MIN_DIST);
    n /= dot(n, vec3(1));
	vec3 tx = texture(t, p.yz).xyz;
    vec3 ty = texture(t, p.zx).xyz;
    vec3 tz = texture(t, p.xy).xyz;
    return mat3(tx*tx, ty*ty, tz*tz)*n;
    //return (tx*tx*n.x + ty*ty*n.y + tz*tz*n.z);
}

vec3 getDiceFace(int face, vec3 p)
{
    float cir = 0.;
    if(face==0) {
        cir = length(abs(p.yz)-.25);
    }
    if(face==1) {
        cir = length(p.zx);
        cir = min(length(abs(p.zx)-.25),cir);
    }
    if(face==2) {
        cir = length(p.xy-vec2(.25,.25));
        cir = min(length(p.xy+vec2(.25,.25)),cir);
    }
    if(face==3) {
        cir = length(p.xy-vec2(.25,.25));
        cir = min(length(p.xy+vec2(.25,.25)),cir);
        cir = min(length(abs(p.xy)-.25),cir);
    }
    if(face==4) {
        cir = length(abs(p.xz)-.25);
        cir = min(length(vec2(abs(p.x)-.25,p.z)),cir);
    }
    if(face==5) {
        cir = length(p.zy);
    }

    cir=smoothstep(.095,.0,cir);
    
    return vec3(1.-cir);
}
// based on bmp mapping from
// https://www.shadertoy.com/view/ld3yDn
vec3 doBumpMap( vec3 p, vec3 n, float bf, float per, int face){
    vec2 e = vec2(per*MIN_DIST, 0);   
    mat3 m = mat3( 
        getDiceFace(face, p - e.xyy), 
        getDiceFace(face, p - e.yxy), 
        getDiceFace(face, p - e.yyx)
    );
    // Converting to greyscale.
    vec3 g = vec3(0.299, 0.587, 0.114) * m; 
    g = (g - dot(getDiceFace(face, p), vec3(0.299, 0.587, 0.114)) )/e.x; g -= n*dot(n, g);  
    // return offset normal
    return normalize( n + g*bf );
}
vec4 FC = vec4(0.322,0.443,0.459,0.);
vec4 render(inout vec3 ro, inout vec3 rd, inout vec3 ref, bool last, inout float d, vec2 uv) {

    vec3 C = vec3(0);
    vec2 ray = marcher(ro,rd,164, 1.);

    hitPoint = hit;
    s_hs=g_hs;
    gia=ria;
    d = ray.x;
    float m = ray.y;
    float alpha = 0.;
    if(d<MAX_DIST)
    {
        vec3 p = ro + rd * d;
        vec3 n = normal(p,d);
        vec3 lpos =vec3(10,10,-5);
        vec3 l = normalize(lpos-p);
        
        vec3 h = vec3(.5);
        vec3 hp = hitPoint;
        vec3 cuv;
        int face;
        vec3 tn = n;
        if(m==2.){
            
            tn = n;
            tn.xz*=gia;

            tn.yx*=turn;
            tn.zx*=turn;
            //https://www.shadertoy.com/view/3sVBDd
            //finding the face of a cube using normal
            vec3 aN = abs(tn);
            ivec3 idF = ivec3(tn.x<-.25? 0 : 5, tn.y<-.25? 1 : 4, tn.z<-.25? 2 : 3);
            face = aN.x>.5? idF.x : aN.y>.5? idF.y : idF.z;
            
            // set coords
            if(face==0) cuv = hp.xyz;
            if(face==1) cuv = hp.xyz;
            if(face==2) cuv = hp.xyz;
            if(face==3) cuv = hp.xyz;
            if(face==4) cuv = hp.zyx;
            if(face==5) cuv = hp.xyz;
       
            // get bump map surface
            n=doBumpMap( cuv, n, 1., d, face);
        }

        float diff = clamp(dot(n,l),0.,1.);
        float fresnel = pow(clamp(1.+dot(rd, n), 0., 1.), 5.);
        fresnel = mix(.01, .7, fresnel);
        
        //soft shadows
        float shdw = 1.0;
        for( float t=.01; t < 22.; )
        {
            float h = map(p + l*t,0.).x;
            if( h<MIN_DIST ) { shdw = 0.; break; }
            shdw = min(shdw, 18.*h/t);
            t += h * .95;
            if( shdw<MIN_DIST || t>64. ) break;
        }
        // get diff + shadows
        diff = mix(diff,diff*shdw,1.-fresnel);
        // spec
        vec3 view = normalize(p - ro);
        vec3 ret = reflect(normalize(lpos), n);
        float spec =  0.5 * pow(max(dot(view, ret), 0.), (m==2.||m==4.)?24.:64.);
        
        // materials and reflections
        if(m==1.){
            vec2 f = fract(hitPoint.xz*.15)-.5;
            if(f.x*f.y>0.){
                h=decodeSRGB(texture(iChannel0,f*2.).rgb);
                ref = clamp(h-fresnel,vec3(0),vec3(1));
            }else{
                h= decodeSRGB(texture(iChannel1,f*2.).rgb);
                ref = (h*.2)-fresnel;
            }
            C = (diff*h)+ min(spec,shdw);
        }
        if(m==2.){
            // get dice face texture
            h = tex3D(iChannel0,cuv,tn).rgb;
            ref = h-fresnel;
            C = (diff*h);
        }
        if(m==3.){
            ref = vec3(.8)-fresnel;
            C = (diff*h)+ min(spec,shdw);
        }
        
        ro = p+n*.01;
        rd = reflect(rd,n);
    
    } else {
        C = FC.rgb;
        ref=vec3(.35);
    }

    C = mix(FC.rgb,C,  exp(-.000025*d*d*d));     
    return vec4(C,alpha);
}

void main()
{   
    turn = rot(T*55.*PI/180.);
    vec2 F = gl_FragCoord.xy;
    vec2 uv = (2.*F.xy-R.xy)/max(R.x,R.y);
    vec3 ro = vec3(0,0,14.);
    vec3 rd = normalize(vec3(uv,-1));
    
    //mouse
    float x = M.xy == vec2(0) ? .5 : .5-(M.y/R.y * .5 - .25) * PI;
    float y = M.xy == vec2(0) ? 0. : -(M.x/R.x * 2. - 1.) * PI;
    if(x<-.005)x=-.005;
    mat2 rx = rot(x);
    mat2 ry = rot(y+T*5.*PI/180.);
    
    ro.yz *= rx;
    rd.yz *= rx;
    ro.xz *= ry;
    rd.xz *= ry;
    
    vec3 C = vec3(0);
    vec3 ref=vec3(0), fil=vec3(1);
    float d =0.;
    float numBounces = 3.;
    for(float i=0.; i<numBounces; i++) {
        vec4 pass = render(ro, rd, ref, i==numBounces-1., d, uv);
        C += pass.rgb*fil;
        fil*=ref;
        // first bounce - get fog layer
        if(i==0.) FC = vec4(FC.rgb,exp(-.00002*d*d*d));
    }

    //layer fog in   
    C = mix(C,FC.rgb,1.-FC.w);
    // gamma
    C = pow(C, vec3(.4545));
    fragColor = vec4(C,1.0);
}
`;

export default fragmentShader;
