// Shaders that will be attached to our canvas
import fragmentSource from "./shaders/frg-shader3";
import vertexSource from "./utils/gl2vertex";
import BaseRender from "./utils/gl2base";
// Other utility functions
import Mouse from "./utils/mouse";
// Textures
import fontTexture from "../resources/textures/font1.png";

export default class Render extends BaseRender {
  constructor() {
    super();
    this.frame = 0;
    this.start = Date.now();
    this.mouse = new Mouse();
    this.umouse = [0.0, 0.0, 0.0, 0.0];
    this.tmouse = [0.0, 0.0, 0.0, 0.0];
    const mouse = this.mouse.pointer();
    this.init();
  }

  init = () => {
    this.createWebGL(vertexSource, fragmentSource);
    this.renderLoop();
  };
 
  // load texture part
  isPowerOf2 = value => {
    return (value & (value - 1)) == 0;
  };

  loadTexture = url => {
    let temp = new Image();
    this.gltex = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.gltex);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      temp
    );

    return new Promise((resolve, reject) => {
      let img = new Image();
      img.addEventListener("load", e => resolve(img));
      img.addEventListener("error", () => {
        reject(new Error(`Failed to load image's URL: ${url}`));
      });
      img.src = url;
    }).then(image => {
      console.log(image.src);

      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        image
      );

      this.gl.bindTexture(this.gl.TEXTURE_2D, this.gltex);

      if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
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

      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.uniform1i(this.iloc, 0);
      console.log("done");
    });
  };

  localUniforms = () => {
    this.ut = this.gl.getUniformLocation(this.program, "time");
    this.ms = this.gl.getUniformLocation(this.program, "mouse");

    this.tcal = this.gl.getAttribLocation(this.program, "a_texCoord");
    this.iloc = this.gl.getUniformLocation(this.program, "iChannel0");
    this.loadTexture(fontTexture);
  };

  localUpdates = () => {
    this.gl.uniform1f(this.ut, (Date.now() - this.start) / 1000);
    const mouse = this.mouse.pointer();
    this.umouse = [mouse.x, this.canvas.height - mouse.y, mouse.drag ? 1 : -1];
    const factor = 0.15;
    this.tmouse[0] =
      this.tmouse[0] - (this.tmouse[0] - this.umouse[0]) * factor;
    this.tmouse[1] =
      this.tmouse[1] - (this.tmouse[1] - this.umouse[1]) * factor;
    
    this.tmouse[2] =this.umouse[2];
    this.gl.uniform4fv(this.ms, this.tmouse);
  };

  renderLoop = () => {
    this.updateUniforms();
    this.animation = window.requestAnimationFrame(this.renderLoop);
  };
}
