const fragmentShader = `#version 300 es
#if __VERSION__ < 130
#define TEXTURE2D texture2D
#else
#define TEXTURE2D texture
#endif

precision mediump float;
out vec4 fragColor;

uniform sampler2D iChannel0;
uniform vec2 v_texCoord;

uniform vec2 resolution;
uniform vec4 mouse;
uniform float time;

#define R           resolution
#define T           time
#define M           mouse

#define PI  3.14159265359
#define PI2 6.28318530718

#define MIN_DIST .0001
#define MAX_DIST 90.

////////////////////////////////////////////////////////
// Fabrice Neyret https://www.shadertoy.com/view/llySRh
// text and font stuff
int CAPS=0;
#define spc  U.x-=.44;
#define CR(c) spc O+= char(U,c);
vec4 char(vec2 p, int c) {
    if (p.x<.0|| p.x>1. || p.y<0.|| p.y>1.) return vec4(0,0,0,1e5);
    vec2 uv = p/16. + fract( vec2(c, 15-c/16) / 16.);
	return textureGrad( iChannel0, uv.xy*vec2(1,-1) , dFdx(p/16.),dFdy(p/16.) );
}
// end text and font stuff
////////////////////////////////////////////////////////

float lsp(float begin, float end, float t) { return clamp((t - begin) / (end - begin), 0.0, 1.0); }
mat2 rot(float a) { return mat2(cos(a),sin(a),-sin(a),cos(a)); }
float hash21(vec2 p) { return fract(sin(dot(p,vec2(23.43,84.21)))*4832.3234); }

float box( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
//@iq
float dot2( in vec2 v ) { return dot(v,v); }
float ndot(vec2 a, vec2 b ) { return a.x*b.x - a.y*b.y; }
float sdHeart( in vec2 p )
{
    p.x = abs(p.x);

    if( p.y+p.x>1.0 )
        return sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
    return sqrt(min(dot2(p-vec2(0.00,1.00)),
                    dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
}
//@iq
float sdRBox( in vec2 p, in vec2 b, in vec4 r )
{
    r.xy = (p.x>0.0)?r.xy : r.zw;
    r.x  = (p.y>0.0)?r.x  : r.y;
    vec2 q = abs(p)-b+r.x;
    return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r.x;
}
//@iq
float sdRhombus( in vec2 p, in vec2 b ) 
{
    vec2 q = abs(p);
    float h = clamp((-2.0*ndot(q,b)+ndot(b,b))/dot(b,b),-1.0,1.0);
    float d = length( q - 0.5*b*vec2(1.0-h,1.0+h) );
    return d * sign( q.x*b.y + q.y*b.x - b.x*b.y );
}
vec3 hit,hitPoint,sto,gto;
vec2 gid,sid;
float tmod=0.,ga1,ga2,ga3,ga4;

const vec2 sc = vec2(.2), hsc = .5/sc; 
const float amt = 6.;
const float dbl = amt*2.;

vec2 map(vec3 p) {
    p.xy+=vec2(T,3.5);
    vec2 res = vec2(1e5,0);
    
    vec2 id = floor(p.xz*sc) + .5;    
    vec2 r = p.xz - id/sc;
    vec3 q = vec3(r.x,p.y,r.y);

    float rnd = hash21(id);
    float dir = mod(id.x+id.y,2.)<.5? -1. : 1.;
    if(rnd<.5) r.y *= -1.;
    
    vec2 d2 = vec2(length(r-hsc), length(r+hsc));  
    float crv = abs(min(d2.x,d2.y)-hsc.x);

    vec2 pp = d2.x<d2.y? vec2(r - hsc) : vec2(r + hsc);
    pp *= rot(T*.15*dir);
    
    float a = atan(pp.y, pp.x);
    float ai = floor(dir*a/PI*dbl);
    a = (floor(a/PI2*dbl) + .5)/dbl;
    float ws = mod(ai,dbl);

    vec2 qr = rot(-a*PI2)*pp; 
    qr.x -= hsc.x;

    //moving blocks
    vec3 npos = vec3(qr.x, p.y-1.5, qr.y);
    float blox = box(npos,vec3(.65,.75,.01));
    float blok = box(dir>0.?npos+vec3(0,0,.001):npos-vec3(0,0,.001),vec3(.65,.75,.01));
    if(blox<res.x) {
        res = vec2(blox,2.);
        if(rnd<.5^^dir>0.) npos.x*=-1.;
    	hit=npos;
        gid=id;
        gto=vec3(crv,ws,rnd);
    }
    if(blok<res.x) {
        res = vec2(blok,5.);
        //if(rnd<.5^^dir>0.) npos.x*=-1.;
    	hit=npos;
        gid=id;
        gto=vec3(crv,ws,rnd);
    }
    //truchet track
    vec3 tp = vec3(abs(crv)-.9,p.y,crv);
    float bx = box(tp+vec3(0,.25,0), vec3(.2, .75,1.));
    if(bx<res.x) {
        res = vec2(bx, 3.);
        hit=tp;
        gid=id;
        gto=vec3(crv,dir,rnd);
    }
    // floor
    float d9 = p.y + .25;
    if(d9<res.x) {
        res = vec2(d9,1.);
    	hit=p;
        gid=id;
        gto=vec3(crv,dir,rnd);
    }

    return res;
}

vec3 normal(vec3 p, float t)
{
    float e = MIN_DIST*t;
    vec2 h =vec2(1,-1)*.5773;
    vec3 n = h.xyy * map(p+h.xyy*e).x+
             h.yyx * map(p+h.yyx*e).x+
             h.yxy * map(p+h.yxy*e).x+
             h.xxx * map(p+h.xxx*e).x;
    return normalize(n);
}
/**
// Tetrahedron technique @Shane
vec3 normal(vec3 p, float t)
{
    const vec2 h = vec2(1.,-1.)*.5773;
    vec3 n = vec3(0);
    vec3[4] e4 = vec3[4](h.xyy, h.yyx, h.yxy, h.xxx);
    
    for(int i = min(0, iFrame); i<4; i++){
	    n += e4[i]*map(p + e4[i]*t*MIN_DIST).x;
        if(n.x>1e8) break; // Fake non-existing conditional break.
    }
    return normalize(n);
}
*/
vec4 FC = vec4(0.961,0.718,0.718,0.);

vec3 makeCard(vec3 p, float cardId)
{
    vec4 O;
    vec3 h = vec3(1.);
    float hs = hash21(vec2(cardId,8.));
    
    vec2 uv = p.xy+vec2(0,0);
    
    if(hs<.5){
        float ht = sdHeart((uv*2.)+vec2(0,.65));
        ht=smoothstep(.012,.01,ht);
        h = mix(h,vec3(1,0,0),ht);
    } else {
        float ht = sdRhombus((uv*2.),vec2(.5,.75));
        ht=smoothstep(.012,.01,ht);
        h = mix(h,vec3(0,0,0),ht);
    }
    cardId=mod(cardId,9.);
    float FontSize = .25;
    vec2 U = p.xy/FontSize;
    int ofs = 49;
    U.xy-=vec2(.725,1.5);
    CR(ofs+int(cardId));
    U*=-1.;
    U.xy-=vec2(1.925,3.);
    CR(ofs+int(cardId));

    float ck=smoothstep(.1,.7,O.x);
    h = mix(h,(hs<.5)?vec3(1,0,0):vec3(0),ck);
    
    float cf = sdRBox(uv.xy,vec2(.575,.675),vec4(.01));
    cf=abs(abs(cf)-.025)-.005;
    vec2 pt = vec2(.415,.5);
    float dts = min(length(uv.xy-pt)-.275,length(uv.xy+pt)-.275 ) ;
    float pts = min(length(uv.xy-pt)-.175,length(uv.xy+pt)-.175 ) ;
    pts=abs(abs(pts)-.025)-.005;
    cf=max(cf,-dts);
    
    cf=min(cf,pts);
    cf=smoothstep(.011,.01,cf);
    h = mix(h,vec3(.1),cf);
    
    return h;
}
vec3 makeBack(vec3 p)
{
    vec3 h;
    vec3 c = vec3(.59,0,0);
    vec2 uv = p.xy*vec2(.55,.7);
    float px = fwidth(R.x/PI);    
    float cf = sdRBox(uv.xy,vec2(.3,.45),vec4(.01));
    float pf=smoothstep(.01,.012,cf);
    uv*=10.;
    vec2 tuv = fract(uv)-.5;
    vec2 tid = floor(uv);
    float hs = hash21(tid);
    if(hs>.5) tuv.x*=-1.;

    vec2 d2 = vec2(length(tuv-.5), length(tuv+.5));
    vec2 gx = d2.x<d2.y? vec2(tuv-.5) : vec2(tuv+.5);

    float circle = length(gx)-.5;
    circle=abs(circle)-.05;
    circle=smoothstep(.03-px,px,circle);
    
    h = mix(h,vec3(1),circle);
    h = mix(h,vec3(1),pf);
    
    cf=abs(abs(cf)-.001)-.005;
    cf=smoothstep(.015,.012,cf);
    h = mix(h,c,cf);
    
    return h;
}

vec4 render(inout vec3 ro, inout vec3 rd, inout vec3 ref, bool last, inout float d) {

    vec3 C = vec3(0);
    float m = 0.;
    vec3 p = ro;
    for(int i=0;i<175;i++)
    {
        p = ro + rd * d;
        vec2 ray = map(p);
        if(abs(ray.x)<MIN_DIST*d||d>MAX_DIST)break;
        d += ray.x * .75;
        m  = ray.y;
    } 
    hitPoint = hit;
    sid = gid;
    sto = gto;
    
    float alpha = 0.;
    if(d<MAX_DIST)
    {
        vec3 n = normal(p,d);
        vec3 lpos =  vec3(0,4,0);
        vec3 l = normalize(lpos-p);

        float diff = clamp(dot(n,l),0.,1.);
        float fresnel = pow(clamp(1.+dot(rd, n), 0., 1.), 5.);
        fresnel = mix(.01, .7, fresnel);

        float shdw = 1.0;
        for( float t=.05; t < 16.; )
        {
            float h = map(p + l*t).x;
            if( h<MIN_DIST ) { shdw = 0.; break; }
            shdw = min(shdw, 16.*h/t);
            t += h * .95;
            if( shdw<MIN_DIST || t>32. ) break;
        }
        diff = mix(diff,diff*shdw,.75);

        vec3 view = normalize(p - ro);
        vec3 ret = reflect(normalize(lpos), n);
        float spec =  0.5 * pow(max(dot(view, ret), 0.), 14.);

        vec3 h = vec3(.5);
        
        if(m==1.) {
            hitPoint*=sc.xxx;

            vec3 h = vec3(0.3);
            vec2 y = fract(hitPoint.xz*12.)-.5;
            vec2 yy = fract(hitPoint.xz*6.)-.5;
            
            if(yy.x*yy.y>0.)h=vec3(0.969,0.969,0.969);
            
            float curve2 = smoothstep(.011,.01,abs(abs(abs(sto.x-1.25)-.075)-.075)-.025);
            float curve = smoothstep(.011,.01,abs(sto.x-1.25)-.3);
            float ht = (yy.x*yy.y>0.) ? 
                sdHeart((y*2.)+vec2(.0,.5)) : sdRhombus((y*2.),vec2(.5,.75));
    
            ht=smoothstep(.012,.01,ht);
            h = mix(h,(yy.x*yy.y>0.)?vec3(.05):vec3(.7,0,0),ht);
     
            float path = smoothstep(.011,.01,sto.x-1.);
            h=mix(h,vec3(.73),path);
            
            
            h=mix(h,vec3(.9),curve);
            h=mix(h,vec3(.5,.0,.0),curve2);
            
            C+=diff*h;
            ref = vec3(path*.35)-fresnel;
        }
        
        if(m==2.) {
            h=makeCard(hitPoint,sto.y);
            C+=h*diff+spec;
            ref = h-fresnel;
        }
        if(m==5.) {
            h=makeBack(hitPoint);
            C+=h*diff+spec;
            ref = h-fresnel;
        }
        if(m==3.) {
            h=vec3(.03);
            C+=h*diff+spec;
            ref = vec3(.075)-fresnel;
        }

        ro = p+n*MIN_DIST;
        rd = reflect(rd,n);
    
    }
    
    C = mix(FC.rgb,C,  exp(-(1e-6)*d*d*d)); 
    return vec4(C,alpha);
}

float zoom = 8.5;
void main()
{
    tmod = mod(T*.25, 10.);
    float t1 = lsp(4.0, 5.0, tmod);
    float t2 = lsp(9.0, 10.0, tmod);
    float t3 = lsp(1.0, 2.0, tmod);
    float t4 = lsp(6.0, 7.0, tmod);
    ga1 = ((t1-t2)*2.1)-1.1;
    ga2 = (t3-t4)*45.;
    //

    vec2 F = gl_FragCoord.xy;
    vec2 uv = (2.*F.xy-R.xy)/max(R.x,R.y);
    
    if(uv.x>ga1) zoom *= .65;
    
    vec3 ro = vec3(uv*zoom,-zoom);
    vec3 rd = vec3(0,0,1.);

    float x = M.xy == vec2(0) ? -45. : (M.x/R.x * 2. - 1.) * PI;
    mat2 rx = rot(-0.78539816339);
    mat2 ry = rot( (ga2*PI/180.));
    ro.yz *= rx;
    rd.yz *= rx;
    ro.xz *= ry;
    rd.xz *= ry;

    vec3 C = vec3(0);
    vec3 ref=vec3(0); 
    vec3 fil=vec3(1);
    
    float d =0.;
    float numBounces = 2.;
    
    for(float i=0.; i<numBounces; i++) {
        vec4 pass = render(ro, rd, ref, i==numBounces-1., d);
        C += pass.rgb*fil;
        fil*=ref;
        // first bounce get fog distance as alpha
        if(i==0.) FC = vec4(FC.rgb,exp(-(1e-5)*d*d*d));
    }
    
    C = mix(C,FC.rgb,1.-FC.w);
    if(uv.x+.002>ga1 && uv.x<ga1)C=vec3(1);
    C = clamp(C,vec3(.02),vec3(1));
    C = pow(C, vec3(.4545));
    
    fragColor = vec4(C,1.0);
}
`;

export default fragmentShader;
