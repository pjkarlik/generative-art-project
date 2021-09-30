// Shaders that will be attached to our canvas
import fragmentSource from "./shaders/frg-shader2";
import vertexSource from "./utils/gl2vertex";
import BaseRender from "./utils/gl2txbase";
// Other utility functions
import Mouse from "./utils/mouse";
// Textures
import woodTexture from "../resources/textures/metal.jpg";
import stoneTexture from "../resources/textures/whitetile.jpg";

const textureList = [stoneTexture,woodTexture];

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
    this.createWebGL(vertexSource, fragmentSource, textureList);
    this.renderLoop();
  };
 
  localUniforms = () => {
    this.ut = this.gl.getUniformLocation(this.program, "time");
    this.ms = this.gl.getUniformLocation(this.program, "mouse");
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
