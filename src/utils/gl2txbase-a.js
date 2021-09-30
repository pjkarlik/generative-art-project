/**
 * Base WebGL2 /GLSL Shader BoilerPlate
 * October 2021 | pjkarlik@gmail.com
 */

/* eslint no-console:0 */
const urlParams = new URLSearchParams(window.location.search);
const queryRez = urlParams.get("rez");
const rez = parseInt(queryRez, 10) || 1;

// helper functions
export const getWidth = () => {
  return ~~(document.documentElement.clientWidth, window.innerWidth || 0) / rez;
};
export const getHeight = () => {
  return (
    ~~(document.documentElement.clientHeight, window.innerHeight || 0) / rez
  );
};

// Render Class Object //
export default class BaseRender {
  constructor() {
    /**
      Setup for WebGL canvas and render context object
    */
    const width = (this.width = getWidth());
    const height = (this.height = getHeight());
    const canvas = (this.canvas = document.createElement("canvas"));
    canvas.id = "WebGLShader";
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);

    const gl = (this.gl = canvas.getContext("webgl2"));

    if (!gl) {
      console.warn("WebGL 2 is not available.");
      return;
    }

    // WebGl and WebGl2 Extension //
    this.gl.getExtension("OES_standard_derivatives");
    this.gl.getExtension("EXT_shader_texture_lod");
    this.gl.getExtension("OES_texture_float");
    this.gl.getExtension("WEBGL_color_buffer_float");
    this.gl.getExtension("OES_texture_float_linear");

    this.gl.viewport(0, 0, canvas.width, canvas.height);

    /**
      Resize browser handler / canvas resolution
     */
    window.addEventListener(
      "resize",
      () => {
        this.canvas.width = getWidth();
        this.canvas.height = getHeight();
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.resolution = new Float32Array([
          this.canvas.width,
          this.canvas.height,
        ]);
        this.gl.uniform2fv(
          this.gl.getUniformLocation(this.program, "resolution"),
          this.resolution
        );
        this.clearCanvas();
      },
      false
    );
  }

  /**
    Attach and compile shader
  */
  createShader = (type, source) => {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    const success = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
    if (!success) {
      console.log(this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return false;
    }
    return shader;
  };

  createWebGL = (vertexSource, fragmentSource, images) => {
    // Setup Vertext/Fragment Shader functions
    this.vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    this.fragmentShader = this.createShader(
      this.gl.FRAGMENT_SHADER,
      fragmentSource
    );
    // Setup Program and Attach Shader functions
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, this.vertexShader);
    this.gl.attachShader(this.program, this.fragmentShader);
    this.gl.linkProgram(this.program);
    this.gl.useProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.warn(
        "Unable to initialize the shader program: " +
          this.gl.getProgramInfoLog(this.program)
      );
      return null;
    }

    // Create and Bind buffer //
    const buffer = (this.buffer = this.gl.createBuffer());
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);

    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, -1, -1, 1, -1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    const vPosition = this.gl.getAttribLocation(this.program, "vPosition");

    this.gl.enableVertexAttribArray(vPosition);
    this.gl.vertexAttribPointer(
      vPosition,
      2, // size: 2 components per iteration
      this.gl.FLOAT, // type: the data is 32bit floats
      false, // normalize: don't normalize the data
      0, // stride: 0 = move forward size * sizeof(type) each iteration to get the next position
      0 // start at the beginning of the buffer
    );

    this.clearCanvas();

    this.importUniforms(images);
    this.localUniforms();
  };

  clearCanvas = () => {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  };

  /**
    Textures
  */

  isPowerOf2 = value => {
    return (value & (value - 1)) == 0;
  };

  getImage = (url) => {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.addEventListener("load", e => resolve(img));
      img.addEventListener("error", () => {
        reject(new Error(`Failed to load image's URL: ${url}`));
      });
      img.src = url;
    });
  };
  
  loadTexture = (textureList) => {
    const lockNames = [this.gl.TEXTURE0,this.gl.TEXTURE1,this.gl.TEXTURE2,this.gl.TEXTURE3];
    let promises = textureList.map(item => this.getImage(item));

    Promise.all(promises).then(images => {

      const amount = images.length;
      for (var ii = 0; ii < amount; ++ii) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        this.gl.texImage2D(
          this.gl.TEXTURE_2D,
          0,
          this.gl.RGBA,
          this.gl.RGBA,
          this.gl.UNSIGNED_BYTE,
          images[ii]
        );

        if (this.isPowerOf2(images[ii].width) && this.isPowerOf2(images[ii].height)) {
          this.gl.generateMipmap(this.gl.TEXTURE_2D);
        } else {
          this.gl.texParameteri(
            this.gl.TEXTURE_2D,
            this.gl.TEXTURE_WRAP_S,
            this.gl.CLAMP_TO_EDGE
          );
          this.gl.texParameteri(
            this.gl.TEXTURE_2D,
            this.gl.TEXTURE_WRAP_T,
            this.gl.CLAMP_TO_EDGE
          );
          this.gl.texParameteri(
            this.gl.TEXTURE_2D,
            this.gl.TEXTURE_MIN_FILTER,
            this.gl.NEAREST
          );
          this.gl.texParameteri(
            this.gl.TEXTURE_2D,
            this.gl.TEXTURE_MAG_FILTER,
            this.gl.NEAREST
          );
        }

        //const uniformLoc = this.gl.getUniformLocation(this.program, `iChannel${ii}`);
        this.gl.activeTexture(lockNames[ii]);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, `iChannel${ii}`), ii);
      }
    });

    console.log("done loading textures");
  };

  /**
    Adding shader uniforms
  */
  importUniforms = (images) => {
    this.width = getWidth();
    this.height = getHeight();
    this.resolution = new Float32Array([this.width, this.height]);
    this.gl.uniform2fv(
      this.gl.getUniformLocation(this.program, "resolution"),
      this.resolution
    );
    this.loadTexture(images);
  };

  /**
    Update shader uniforms
  */
  updateUniforms = () => {
    this.localUpdates();
    this.gl.drawArrays(
      this.gl.TRIANGLE_FAN, // primitiveType
      0, // Offset
      4 // Count
    );
  };

  localUpdates = () => {
    // Function to add local uniform updates
  };

  localUniforms = () => {
    // Function to add local uniform programs
  };
}